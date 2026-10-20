import type { Surroundings, SurroundingsProvider, SurveyedBridge, SurveyedBuilding } from "../SurroundingsProvider.js"
import { SurroundingsUnavailableError } from "../SurroundingsProvider.js"
import { BuildingFootprints } from "../BuildingFootprints.js"
import { CanopyCrowns } from "../CanopyCrowns.js"
import { OverheadStructures } from "../OverheadStructures.js"
import type { HeightGrid, PlaceVectors } from "../OverheadStructures.js"
import { localMetersToGeo } from "../GeoProjection.js"
import { BuildingMaterials } from "../BuildingMaterials.js"
import { BuildingStyles } from "../BuildingStyles.js"
import { RoofShapes } from "../RoofShapes.js"
import type { RoofPhoto } from "../RoofShapes.js"
import { TopoBuildings } from "../TopoBuildings.js"
import { OsmStreetFurniture } from "./OsmStreetFurniture.js"
import { IgnGeoplatform } from "./IgnGeoplatform.js"
import type { IgnGeoplatformOptions, LidarGrids } from "./IgnGeoplatform.js"

/**
 * What both of the IGN's surveys know about a place, each for what it knows best: the trees from the laser, which no map draws; the buildings
 * from the map's outlines, which are separate houses where the laser sees one run of roof; the bridges and the lines from the map, with the
 * laser measuring the height of a deck and of a pylon where it can.
 *
 * Either survey failing is not the end: the trees without the map, or the buildings and structures without the laser, are what there is. Only
 * both failing is a failure. The laser's roofs stand in for the map's buildings where the map has none (a place it has not drawn).
 */
export class IgnLidarTopoSurroundingsProvider implements SurroundingsProvider {
  readonly id = "ign-lidar-topo"
  readonly name = "IGN LiDAR HD + BD TOPO"
  readonly attribution = "Canopy © IGN, LiDAR HD; buildings, bridges and lines © IGN, BD TOPO (Licence Ouverte 2.0), as surveyed on days the services do not give"
  readonly creditUrl = "https://geoservices.ign.fr/lidarhd"
  readonly contemporary = true

  /** How far past a bridge's ends its own square of laser reaches (see bridges), and how many bridges are asked for so at most. */
  private static readonly BRIDGE_MARGIN_M = 30
  private static readonly MAX_BRIDGE_WINDOWS = 8

  private readonly platform: IgnGeoplatform
  /** Where the public lamps, the traffic lights, the crossings and the signs come from, when asked for: the registry gives it, a test that fakes only the IGN does not. */
  private readonly furniture?: OsmStreetFurniture

  constructor(options: IgnGeoplatformOptions = {}, furniture?: OsmStreetFurniture) {
    this.platform = new IgnGeoplatform(options)
    this.furniture = furniture
  }

  covers(lat: number, lng: number): boolean {
    return IgnGeoplatform.covers(lat, lng)
  }

  later(centre: { lat: number, lng: number }, radiusM: number): Promise<Partial<Surroundings>> | undefined {
    return OsmStreetFurniture.later(this.furniture, centre, radiusM)
  }

  async getSurroundings(centre: { lat: number, lng: number }, radiusM: number): Promise<Surroundings> {
    if (!this.covers(centre.lat, centre.lng)) throw new SurroundingsUnavailableError("no-coverage", "The IGN's surveys cover France only")
    const radius = IgnGeoplatform.radius(radiusM)
    const [laser, map, photo, furniture, laserDay, photoDay] = await Promise.allSettled([this.platform.lidar(centre, radius), this.platform.vectors(centre, radius, true), this.platform.photo(centre, radius), this.furniture?.near(centre, radiusM) ?? Promise.resolve(undefined), this.platform.laserDate(centre), this.platform.photoDate(centre)])
    const laserRadius = IgnGeoplatform.lidarRadius(radius)
    if (laser.status === "rejected" && map.status === "rejected") throw laser.reason
    const grids = laser.status === "fulfilled" ? laser.value : undefined
    const vectors = map.status === "fulfilled" ? map.value : undefined
    // The laser says it has not flown here and the map has drawn nothing: the place is outside what the IGN surveys (a corner of the box that says France holds
    // a part of Belgium), and that is said as it is, which lets another survey answer.
    const nothingDrawn = vectors !== undefined && vectors.buildings.length === 0 && vectors.bridges.length === 0 && vectors.lines.length === 0
    if (laser.status === "rejected" && laser.reason instanceof SurroundingsUnavailableError && laser.reason.reason === "no-coverage" && nothingDrawn) throw laser.reason
    return {
      trees: grids ? new CanopyCrowns(grids.heights, grids.vegetation, grids.size, grids.size).trees({ metresPerPixel: grids.metresPerPixel, radiusM: laserRadius }) : [],
      buildings: this.roofed(this.buildings(grids, vectors, centre, radius), grids, photo.status === "fulfilled" ? photo.value : undefined),
      bridges: vectors ? await this.bridges(vectors, centre, radius, grids?.structures, laserRadius) : [],
      lines: vectors ? OverheadStructures.lines(vectors, centre, radius, grids?.structures) : [],
      ...(furniture.status === "fulfilled" ? furniture.value : {}),
      dates: {
        ...(laser.status === "fulfilled" && laserDay.status === "fulfilled" && laserDay.value ? { laser: laserDay.value } : {}),
        ...(photo.status === "fulfilled" && photoDay.status === "fulfilled" && photoDay.value ? { photo: photoDay.value } : {}),
        ...(vectors?.mapDate ? { map: vectors.mapDate } : {}),
        ...(furniture.status === "fulfilled" && OsmStreetFurniture.found(furniture.value) ? { lamps: OsmStreetFurniture.today() } : {})
      }
    }
  }

  /**
   * The bridges, each measured by the laser: those beyond the laser's square (it is asked for 150 m round a place, a survey reaches 400) are asked
   * for again in a square of their own. WHY: the RD548 over the RN2 at Silly-le-Long, 1.7 km along the observer's road, was drawn with the 4 m deck of
   * a bridge nothing measured, two metres under the road it carries and under its banks, where the laser has it 6.1 m over the road below.
   */
  private async bridges(vectors: PlaceVectors, centre: { lat: number, lng: number }, radius: number, grid: HeightGrid | undefined, laserRadius: number): Promise<SurveyedBridge[]> {
    const found = OverheadStructures.bridges(vectors, centre, radius, grid)
    let asked = 0
    return Promise.all(found.map(async bridge => {
      if (grid !== undefined && Math.hypot(bridge.eastM, bridge.northM) + bridge.lengthM / 2 <= laserRadius) return bridge
      const reach = bridge.lengthM / 2 + IgnLidarTopoSurroundingsProvider.BRIDGE_MARGIN_M
      if (asked++ >= IgnLidarTopoSurroundingsProvider.MAX_BRIDGE_WINDOWS) return bridge
      const at = localMetersToGeo(bridge.eastM, -bridge.northM, centre.lat, centre.lng)
      try {
        const own = await this.platform.lidar(at, reach)
        const measured = OverheadStructures.bridges(vectors, at, reach, own.structures)
          .sort((a, b) => Math.hypot(a.eastM, a.northM) - Math.hypot(b.eastM, b.northM))[0]
        if (!measured || Math.hypot(measured.eastM, measured.northM) > bridge.lengthM / 2) return bridge
        return { ...measured, eastM: OverheadStructures.tenth(measured.eastM + bridge.eastM), northM: OverheadStructures.tenth(measured.northM + bridge.northM) }
      } catch {
        return bridge
      }
    }))
  }

  /** The roofs the laser and the photograph show (the laser only where it flew, which for a building farther than it was asked is nowhere), and a church's where they do not. */
  private roofed(buildings: SurveyedBuilding[], grids: LidarGrids | undefined, photo: RoofPhoto | undefined): SurveyedBuilding[] {
    return BuildingMaterials.fit(BuildingStyles.fit(RoofShapes.fit(buildings, grids, photo)))
  }

  private buildings(grids: LidarGrids | undefined, vectors: PlaceVectors | undefined, centre: { lat: number, lng: number }, radius: number) {
    const drawn = vectors ? TopoBuildings.buildings(vectors.buildings, centre, radius, undefined, undefined, vectors.zones) : []
    const found = drawn.length > 0 || grids === undefined
      ? drawn
      : new BuildingFootprints(grids.heights, grids.building, grids.size, grids.size).buildings({ metresPerPixel: grids.metresPerPixel, radiusM: IgnGeoplatform.lidarRadius(radius), maxBuildings: 300 })
    // Named by the map either way: a roof the laser saw is the town hall all the same.
    return vectors ? TopoBuildings.named(found, vectors.zones, centre) : found
  }
}
