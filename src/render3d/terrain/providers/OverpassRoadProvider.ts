import type { GeoBounds } from "../GeoBounds.js"
import type { RoadProvider, RoadSurface, RoadWay } from "../RoadProvider.js"

export interface OverpassRoadProviderOptions {
  fetchImpl?: typeof fetch
  /** Where to send the query, in order. Mainly for tests, and for pointing at one instance only. */
  endpoints?: string[]
}

/** What Overpass answers with, reduced to the parts read here. */
export interface OverpassResponse {
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

  /**
   * The instances asked, in order.
   *
   * Several, because one is a single point of failure in the most literal way: the main instance
   * stopped accepting connections from the address this was written on partway through a day of
   * asking, and every scene lost its roads at once. They are independent servers run by different
   * people over the same data, so the second answers what the first will not.
   */
  private static readonly ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter"
  ]

  private readonly fetchImpl: typeof fetch
  private readonly endpoints: string[]

  constructor(options: OverpassRoadProviderOptions = {}) {
    // fetch.bind(globalThis) — an unbound fetch loses the `this` it requires once called as a
    // field (see AwsTerrariumElevationProvider, which learned the same thing).
    this.fetchImpl = options.fetchImpl ?? fetch.bind(globalThis)
    this.endpoints = options.endpoints ?? OverpassRoadProvider.ENDPOINTS
  }

  /**
   * One request at a time, for everybody.
   *
   * Overpass is free, donated, and it says so: a page holding several scenes fired one query per
   * scene the moment it loaded, and the service answered 429 and 504 — rightly. The queue is
   * static because the politeness is owed by the PAGE, not by a provider instance, and a page makes
   * one instance per scene.
   */
  private static queue: Promise<unknown> = Promise.resolve()
  /** How long to wait before the one retry a busy or rate-limited answer gets. */
  private static readonly RETRY_MS = 4000

  async getRoads(bounds: GeoBounds): Promise<RoadWay[]> {
    const box = `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`
    const query = `[out:json][timeout:30];way["highway"~"^(${OverpassRoadProvider.DRIVABLE.join("|")})$"](${box});out geom;`
    return this.waysFrom(await this.queued(() => this.ask(query)))
  }

  /** One Overpass answer as roads — exposed so a build step can read an answer fetched by other
   * means (see scripts/build-road-archive.ts). */
  waysFrom(body: OverpassResponse): RoadWay[] {
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

  /** Runs `work` after whatever is already waiting, whoever asked for it — see queue. */
  private queued<T>(work: () => Promise<T>): Promise<T> {
    const run = OverpassRoadProvider.queue.then(work, work)
    // The chain must survive a failed link: a refusal for one scene is not a reason to stop
    // answering for the next.
    OverpassRoadProvider.queue = run.catch(() => undefined)
    return run
  }

  /**
   * One query, with one retry.
   *
   * 429 is "you are asking too often" and 504 is "I am busy right now": both are answered by
   * waiting, and both were seen on the first page that asked. Anything else is a real refusal and
   * is passed on as one, for the caller to turn into a scene with no roads.
   */
  private async ask(query: string): Promise<OverpassResponse> {
    let last: Error | undefined
    for (const endpoint of this.endpoints) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const response = await this.fetchImpl(`${endpoint}?data=${encodeURIComponent(query)}`)
          if (response.ok) return (await response.json()) as OverpassResponse
          last = new Error(`${new URL(endpoint).host} refused (${response.status})`)
          if (response.status !== 429 && response.status !== 504) break
        } catch (error) {
          // Not answering at all — down, or refusing this address's connections outright, which is
          // what a day of asking earns. The next instance is a different server run by different
          // people, so it is worth asking; waiting first is not.
          last = new Error(`${new URL(endpoint).host} unreachable (${String(error)})`)
          break
        }
        await new Promise(resolve => setTimeout(resolve, OverpassRoadProvider.RETRY_MS))
      }
    }
    throw last ?? new Error("No Overpass instance answered")
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
