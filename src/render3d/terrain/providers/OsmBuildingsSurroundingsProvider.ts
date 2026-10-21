import type { DecorFacade, DecorRoof } from "../../../engine/model/Decor.js"
import type { Surroundings, SurroundingsProvider, SurveyedBuilding } from "../SurroundingsProvider.js"
import { SurroundingsUnavailableError } from "../SurroundingsProvider.js"
import { BuildingMaterials } from "../BuildingMaterials.js"
import { BuildingStyles } from "../BuildingStyles.js"
import { OsmBuildingTags } from "../OsmBuildingTags.js"
import { TopoBuildings } from "../TopoBuildings.js"
import type { VectorFeature } from "../OverheadStructures.js"
import { OverpassClient } from "./OverpassClient.js"
import type { OverpassClientOptions, OverpassResponse } from "./OverpassClient.js"
import { OsmStreetFurniture } from "./OsmStreetFurniture.js"

type OverpassElement = NonNullable<OverpassResponse["elements"]>[number]

/**
 * The buildings round a place anywhere in the world, from the outlines OpenStreetMap's volunteers drew.
 *
 * The one survey that is not a country's: its coverage is as good as the volunteers' (a Belgian town counts 4 600 buildings in a square kilometre and
 * a half, a village of the American West a handful), its heights and roofs are only where somebody wrote them (`height`, `building:levels`,
 * `roof:shape`, `roof:colour`, `building:colour`, `building:material`), and it has nothing of the trees: a laser or a canopy model does that, and
 * this provider says so by giving none. What a building says of itself is drawn (a gabled roof of slate, a brick wall); what it does not is the scene's
 * ordinary building: two storeys, a flat roof, a pale plaster.
 *
 * Outlines go through the same reading as the French map's (TopoBuildings): a rectangle for what is nearly one, rectangles cut along the sides of
 * what is not. Asked of the same public Overpass instances as the roads and the furniture of the streets, one request at a time for the page (see OverpassClient).
 */
export class OsmBuildingsSurroundingsProvider implements SurroundingsProvider {
  readonly id = "osm-buildings"
  readonly name = "OpenStreetMap buildings"
  readonly attribution = "Buildings © OpenStreetMap contributors (ODbL), as drawn on the day of the data, which a recording is not"
  readonly creditUrl = "https://www.openstreetmap.org/copyright"
  readonly contemporary = true

  /** More than this and the answer is megabytes of a town's outlines: the farthest are left to a survey that has a laser. */
  static readonly MAX_RADIUS_M = 1500
  private static readonly MIN_AREA_M2 = 12
  private static readonly MAX_BUILDINGS = 300

  private readonly client: OverpassClient
  private readonly furniture?: OsmStreetFurniture

  constructor(options: OverpassClientOptions = {}, furniture?: OsmStreetFurniture) {
    this.client = new OverpassClient(options)
    this.furniture = furniture
  }

  /** Everywhere: the survey cannot tell a place with no building from one nobody has drawn, and says nothing of either. */
  covers(): boolean {
    return true
  }

  later(centre: { lat: number, lng: number }, radiusM: number): Promise<Partial<Surroundings>> | undefined {
    return OsmStreetFurniture.later(this.furniture, centre, radiusM)
  }

  async getSurroundings(centre: { lat: number, lng: number }, radiusM: number): Promise<Surroundings> {
    const radius = Math.min(radiusM, OsmBuildingsSurroundingsProvider.MAX_RADIUS_M)
    let answer: OverpassResponse
    try {
      answer = await this.client.query(
        `[out:json][timeout:30];(way["building"](around:${radius},${centre.lat},${centre.lng});relation["building"]["type"="multipolygon"](around:${radius},${centre.lat},${centre.lng}););out geom;`)
    } catch (error) {
      throw new SurroundingsUnavailableError("unreachable", error instanceof Error ? error.message : String(error))
    }
    const furniture = await this.furniture?.near(centre, radiusM)
    const day = (answer.osm3s?.timestamp_osm_base ?? "").slice(0, 10)
    return {
      trees: [],
      buildings: BuildingMaterials.fit(BuildingStyles.fit(OsmBuildingsSurroundingsProvider.buildings(answer, centre, radius))),
      bridges: [],
      lines: [],
      ...furniture,
      dates: { ...(/^\d{4}-\d{2}-\d{2}$/.test(day) ? { map: day } : {}), ...(OsmStreetFurniture.found(furniture) ? { lamps: OsmStreetFurniture.today() } : {}) }
    }
  }

  /** One Overpass answer as buildings, the nearest first: exposed for the build steps that freeze an answer. */
  static buildings(answer: OverpassResponse, centre: { lat: number, lng: number }, radiusM: number): SurveyedBuilding[] {
    const found: SurveyedBuilding[] = []
    for (const element of answer.elements ?? []) {
      const rings = OsmBuildingsSurroundingsProvider.ringsOf(element)
      if (rings.length === 0) continue
      const tags = element.tags ?? {}
      const levels = OsmBuildingTags.levels(tags["building:levels"])
      const height = OsmBuildingTags.height(tags.height)
      const feature: VectorFeature = {
        geometry: { type: "Polygon", coordinates: rings },
        properties: { ...(height ? { hauteur: height } : {}), ...(levels ? { nombre_d_etages: levels } : {}) }
      }
      for (const building of TopoBuildings.buildings([feature], centre, radiusM, OsmBuildingsSurroundingsProvider.MIN_AREA_M2, 50)) {
        found.push(OsmBuildingsSurroundingsProvider.described(building, tags, height !== undefined))
      }
    }
    found.sort((a, b) => Math.hypot(a.eastM, a.northM) - Math.hypot(b.eastM, b.northM))
    return found.slice(0, OsmBuildingsSurroundingsProvider.MAX_BUILDINGS)
  }

  /** The outlines of a way (one ring) or of a relation (its closed outer parts), as longitude and latitude, the way a GeoJSON polygon has them. */
  private static ringsOf(element: OverpassElement): [number, number][][] {
    const ring = (points: { lat: number, lon: number }[] | undefined): [number, number][] | undefined => {
      if (!points || points.length < 4) return undefined
      const closed = points.map(point => [point.lon, point.lat] as [number, number])
      const first = closed[0]
      const last = closed[closed.length - 1]
      return first[0] === last[0] && first[1] === last[1] ? closed : undefined
    }
    if (element.type === "way") {
      const one = ring(element.geometry)
      return one ? [one] : []
    }
    // A relation: the outer rings, the first of which is the outline; each outer part alone is a building of its own, since OSM does not say how they join.
    const outers = (element.members ?? []).filter(member => member.role === "outer").map(member => ring(member.geometry)).filter((one): one is [number, number][] => one !== undefined)
    return outers.slice(0, 1)
  }

  /** What the tags say of the building, added to its measures: its name, its walls, its roof, its colours. */
  private static described(building: SurveyedBuilding, tags: Record<string, string>, heightStated: boolean): SurveyedBuilding {
    const wallMaterial = OsmBuildingTags.wallMaterial(tags["building:material"])
    const roofMaterial = OsmBuildingTags.roofMaterial(tags["roof:material"])
    const wallColour = OsmBuildingTags.colour(tags["building:colour"])
    const roofColour = OsmBuildingTags.colour(tags["roof:colour"]) ?? BuildingMaterials.roofColor(roofMaterial)
    const shape = OsmBuildingTags.roofShape(tags["roof:shape"])
    const facade: DecorFacade | undefined = wallColour ? { color: wallColour } : undefined
    let roof: DecorRoof | undefined
    let heightM = building.heightM
    if (shape === "gable" || shape === "hip" || shape === "dome") {
      // How far the ridge stands above the eaves: what the tag says, else a pitch of about thirty degrees over the shorter side.
      const stated = OsmBuildingTags.height(tags["roof:height"])
      const riseM = Math.round((stated ?? Math.min(5, Math.max(1.5, 0.29 * Math.min(building.widthM, building.lengthM)))) * 10) / 10
      // A height the tag states is to the ridge; one that comes from the levels is the walls', and the roof is on top of them.
      if (!heightStated) heightM = Math.round((building.heightM + riseM) * 10) / 10
      roof = { shape, riseM, ...(tags["roof:orientation"] === "across" ? { ridge: "depth" as const } : {}), ...(roofColour ? { color: roofColour } : {}) }
    } else if (shape === "flat" || roofColour) {
      roof = { shape: "flat", riseM: 0, ...(roofColour ? { color: roofColour } : {}) }
    }
    // What the volunteer says it is, else what its height says (see BuildingStyles.ofMap): a church, a castle, a house of 1850.
    const { style, builtYear } = BuildingStyles.ofOsm(tags)
    return {
      ...building,
      heightM,
      ...(style ? { style } : {}),
      ...(builtYear !== undefined ? { builtYear } : {}),
      ...(tags.name ? { name: tags.name } : {}),
      ...(wallMaterial ? { wallMaterial } : {}),
      ...(roofMaterial ? { roofMaterial } : {}),
      ...(facade ? { facade } : {}),
      ...(roof ? { roof } : {})
    }
  }
}
