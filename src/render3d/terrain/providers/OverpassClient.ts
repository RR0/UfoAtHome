/** What Overpass answers with, reduced to the parts read by the callers. */
export interface OverpassResponse {
  elements?: {
    type?: string
    id?: number
    tags?: Record<string, string>
    lat?: number
    lon?: number
    geometry?: { lat: number; lon: number }[]
    /** The parts of a relation (a building with a courtyard is one), with the outline of each where the query asked for it. */
    members?: { type?: string, ref?: number, role?: string, geometry?: { lat: number; lon: number }[] }[]
  }[]
  /** What the answer is of: the day of the OpenStreetMap data behind it. */
  osm3s?: { timestamp_osm_base?: string }
}

export interface OverpassClientOptions {
  fetchImpl?: typeof fetch
  /** Where to send the query, in order. Mainly for tests, and for pointing at one instance only. */
  endpoints?: string[]
}

/**
 * Asks OpenStreetMap's Overpass instances politely: one request at a time for the whole page, several instances in turn, one retry for a busy
 * answer. Shared by everything of this project that reads OpenStreetMap (its roads, its street lamps), since the politeness is owed by the PAGE.
 */
export class OverpassClient {
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

  /**
   * OpenStreetMap France's own instance, which holds France and answers a page (CORS), asked first for a place in it: on 2026-10-19 the three
   * above hung or answered 500 all morning, and the lamps of every French scene came a minute late or never, while this one answered at once.
   */
  static readonly FRANCE_ENDPOINT = "https://overpass.openstreetmap.fr/api/interpreter"

  /** Metropolitan France and Corsica, as south, west, north, east: where FRANCE_ENDPOINT is asked first. */
  private static readonly FRANCE = { south: 41.3, west: -5.2, north: 51.1, east: 9.6 }

  /**
   * The instances to ask for this query, in order: the French one first when the box the query asks about (the first `(south,west,north,east)` in it,
   * which is how every query of this project says where it looks) is in France, the general ones after it; the general ones alone elsewhere.
   */
  static endpointsFor(query: string, general: readonly string[] = OverpassClient.ENDPOINTS): string[] {
    const box = /\((-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)\)/.exec(query)
    if (!box) return [...general]
    const [south, west, north, east] = box.slice(1).map(Number)
    const lat = (south + north) / 2
    const lng = (west + east) / 2
    const france = OverpassClient.FRANCE
    const inFrance = lat >= france.south && lat <= france.north && lng >= france.west && lng <= france.east
    return inFrance ? [OverpassClient.FRANCE_ENDPOINT, ...general.filter(endpoint => endpoint !== OverpassClient.FRANCE_ENDPOINT)] : [...general]
  }

  private readonly fetchImpl: typeof fetch
  /** The instances a test or a caller pointed this client at, in place of those chosen by place (see endpointsFor). */
  private readonly endpoints?: string[]

  constructor(options: OverpassClientOptions = {}) {
    // fetch.bind(globalThis) — an unbound fetch loses the `this` it requires once called as a
    // field (see AwsTerrariumElevationProvider, which learned the same thing).
    this.fetchImpl = options.fetchImpl ?? fetch.bind(globalThis)
    this.endpoints = options.endpoints
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
  /** How long an instance is waited for before the next one is asked: the queries ask for 25 s of the server's time, and the answer takes its way back. */
  private static readonly HANG_MS = 40000
  /** How long to wait before the one retry a busy or rate-limited answer gets. */
  private static readonly RETRY_MS = 4000

  /** Runs the query after whatever is already waiting, whoever asked for it. */
  query(query: string): Promise<OverpassResponse> {
    return this.queued(() => this.ask(query))
  }

  /** Runs `work` after whatever is already waiting, whoever asked for it — see queue. */
  private queued<T>(work: () => Promise<T>): Promise<T> {
    const run = OverpassClient.queue.then(work, work)
    // The chain must survive a failed link: a refusal for one scene is not a reason to stop
    // answering for the next.
    OverpassClient.queue = run.catch(() => undefined)
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
    for (const endpoint of this.endpoints ?? OverpassClient.endpointsFor(query)) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          // An instance that hangs is no answer: past the query's own timeout, it is let go and the next one asked.
          const response = await this.fetchImpl(`${endpoint}?data=${encodeURIComponent(query)}`, { signal: AbortSignal.timeout(OverpassClient.HANG_MS) })
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
        await new Promise(resolve => setTimeout(resolve, OverpassClient.RETRY_MS))
      }
    }
    throw last ?? new Error("No Overpass instance answered")
  }

}
