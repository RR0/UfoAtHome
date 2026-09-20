import type { GeoBounds } from "../GeoBounds.js"
import type { RoadProvider, RoadSurface, RoadWay } from "../RoadProvider.js"

export interface OverpassRoadProviderOptions {
  fetchImpl?: typeof fetch
  /** Where to send the query. Mainly for tests, and for a mirror when the main one is busy. */
  endpoint?: string
}

/** What Overpass answers with, reduced to the parts read here. */
interface OverpassResponse {
  elements?: {
    type?: string
    id?: number
    tags?: Record<string, string>
    geometry?: { lat: number; lon: number }[]
  }[]
}

/**
 * Today's road network, from OpenStreetMap through an Overpass endpoint.
 *
 * OSM is the only survey of roads that is free, worldwide, and readable straight from a browser.
 * What it is not is a survey of 1964: it says what is there now. So this provider reports itself
 * CONTEMPORARY, and everything downstream is built around that admission — see RoadProvider.
 *
 * Only ways somebody could drive are asked for. A town's footways and steps outnumber its roads
 * five to one (measured around Socorro: 589 footways against 133 residential and service roads),
 * and none of them is what a reader is looking for when they ask where the road went.
 */
export class OverpassRoadProvider implements RoadProvider {
  readonly attribution = "Roads © OpenStreetMap contributors, as surveyed today"
  readonly contemporary = true

  /** The ways asked for: everything a vehicle uses, and nothing a pedestrian does. */
  private static readonly DRIVABLE = [
    "motorway", "trunk", "primary", "secondary", "tertiary", "unclassified", "residential",
    "service", "track", "motorway_link", "trunk_link", "primary_link", "secondary_link", "tertiary_link"
  ]

  /**
   * What a road of each class is taken to be when OSM does not say — and it usually does not: of
   * 1149 ways around Socorro, 963 carry no `width` and no `surface` at all.
   *
   * These are carriageway widths, kerb to kerb, from the ordinary practice of the countries this
   * has to serve: a lane is about 3.5 m, a rural two-lane road about 7, a village street 5, a
   * service road or a ranch track one vehicle wide plus room to pass a fence post.
   */
  private static readonly WIDTH_M: Record<string, number> = {
    motorway: 11, trunk: 9, primary: 8, secondary: 7, tertiary: 6.5,
    unclassified: 5.5, residential: 5.5, service: 4, track: 3.5
  }
  private static readonly DEFAULT_WIDTH_M = 5

  private readonly fetchImpl: typeof fetch
  private readonly endpoint: string

  constructor(options: OverpassRoadProviderOptions = {}) {
    // fetch.bind(globalThis) — an unbound fetch loses the `this` it requires once called as a
    // field (see AwsTerrariumElevationProvider, which learned the same thing).
    this.fetchImpl = options.fetchImpl ?? fetch.bind(globalThis)
    this.endpoint = options.endpoint ?? "https://overpass-api.de/api/interpreter"
  }

  async getRoads(bounds: GeoBounds): Promise<RoadWay[]> {
    const box = `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`
    const query = `[out:json][timeout:30];way["highway"~"^(${OverpassRoadProvider.DRIVABLE.join("|")})$"](${box});out geom;`
    const response = await this.fetchImpl(`${this.endpoint}?data=${encodeURIComponent(query)}`)
    if (!response.ok) throw new Error(`Overpass refused (${response.status})`)
    const body = (await response.json()) as OverpassResponse
    const ways: RoadWay[] = []
    for (const element of body.elements ?? []) {
      const geometry = element.geometry
      const tags = element.tags
      if (!tags || !geometry || geometry.length < 2) continue
      ways.push({
        id: `osm-${element.id ?? ways.length}`,
        name: tags.name,
        surface: OverpassRoadProvider.surfaceOf(tags),
        widthM: OverpassRoadProvider.widthOf(tags),
        points: geometry.map(point => ({ lat: point.lat, lng: point.lon }))
      })
    }
    return ways
  }

  /** What OSM says, where it says anything; what the class implies otherwise — see WIDTH_M. */
  private static widthOf(tags: Record<string, string>): number {
    const stated = Number.parseFloat(tags.width ?? tags["est_width"] ?? "")
    if (Number.isFinite(stated) && stated > 0) return stated
    const lanes = Number.parseInt(tags.lanes ?? "", 10)
    if (Number.isFinite(lanes) && lanes > 0) return lanes * 3.5
    return OverpassRoadProvider.WIDTH_M[tags.highway] ?? OverpassRoadProvider.DEFAULT_WIDTH_M
  }

  /**
   * Paved unless something says otherwise. A `track` is the exception and the one that matters
   * here: the tag exists for exactly the kind of unsealed ranch road Zamora turned onto.
   */
  private static surfaceOf(tags: Record<string, string>): RoadSurface {
    const surface = tags.surface
    if (surface === "dirt" || surface === "earth" || surface === "mud") return "dirt"
    if (surface === "gravel" || surface === "fine_gravel" || surface === "compacted"
      || surface === "ground" || surface === "sand" || surface === "unpaved") return "gravel"
    if (surface) return "paved"
    return tags.highway === "track" ? "gravel" : "paved"
  }
}
