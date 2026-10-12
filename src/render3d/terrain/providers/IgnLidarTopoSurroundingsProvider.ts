import type { Surroundings, SurroundingsProvider } from "../SurroundingsProvider.js"
import { SurroundingsUnavailableError } from "../SurroundingsProvider.js"
import { BuildingFootprints } from "../BuildingFootprints.js"
import { CanopyCrowns } from "../CanopyCrowns.js"
import { OverheadStructures } from "../OverheadStructures.js"
import type { PlaceVectors } from "../OverheadStructures.js"
import { TopoBuildings } from "../TopoBuildings.js"
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

  private readonly platform: IgnGeoplatform

  constructor(options: IgnGeoplatformOptions = {}) {
    this.platform = new IgnGeoplatform(options)
  }

  covers(lat: number, lng: number): boolean {
    return IgnGeoplatform.covers(lat, lng)
  }

  async getSurroundings(centre: { lat: number, lng: number }, radiusM: number): Promise<Surroundings> {
    if (!this.covers(centre.lat, centre.lng)) throw new SurroundingsUnavailableError("no-coverage", "The IGN's surveys cover France only")
    const radius = IgnGeoplatform.radius(radiusM)
    const [laser, map] = await Promise.allSettled([this.platform.lidar(centre, radius), this.platform.vectors(centre, radius, true)])
    if (laser.status === "rejected" && map.status === "rejected") throw laser.reason
    const grids = laser.status === "fulfilled" ? laser.value : undefined
    const vectors = map.status === "fulfilled" ? map.value : undefined
    return {
      trees: grids ? new CanopyCrowns(grids.heights, grids.vegetation, grids.size, grids.size).trees({ metresPerPixel: grids.metresPerPixel, radiusM: radius }) : [],
      buildings: this.buildings(grids, vectors, centre, radius),
      bridges: vectors ? OverheadStructures.bridges(vectors, centre, radius, grids?.structures) : [],
      lines: vectors ? OverheadStructures.lines(vectors, centre, radius, grids?.structures) : []
    }
  }

  private buildings(grids: LidarGrids | undefined, vectors: PlaceVectors | undefined, centre: { lat: number, lng: number }, radius: number) {
    const drawn = vectors ? TopoBuildings.buildings(vectors.buildings, centre, radius) : []
    const found = drawn.length > 0 || grids === undefined
      ? drawn
      : new BuildingFootprints(grids.heights, grids.building, grids.size, grids.size).buildings({ metresPerPixel: grids.metresPerPixel, radiusM: radius })
    // Named by the map either way: a roof the laser saw is the town hall all the same.
    return vectors ? TopoBuildings.named(found, vectors.zones, centre) : found
  }
}
