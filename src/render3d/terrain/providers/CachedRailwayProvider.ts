import type { GeoBounds } from "../GeoBounds.js"
import type { RailwayLine, RailwayProvider } from "../RailwayProvider.js"

/** What is kept of an answer on disk: the answer, and the day it was given, to tell an old one. */
interface StoredRailways {
  savedAt: number
  lines: RailwayLine[]
}

/**
 * A railway provider that answers a square of ground it has already been asked about from what it said then, as CachedWaterProvider does for the
 * water: for the page, and on disk for MAX_AGE_MS. Outside France the live source is Overpass, free and donated, and it is not always there: on the
 * night this was written every instance of it timed out or answered 500 for hours. So this holds up without it:
 *
 * - a square inside one already answered for this page is answered from that one (a driving observer's next patch asks for a box a few hundred
 *   metres along, inside the first);
 * - an answer older than a month is still kept, and given when the live source fails: last month's tracks are better than none, and they are the
 *   same tracks;
 * - after a failure, the live source is not asked again for RETRY_AFTER_MS, whatever the square: a drive builds a patch every hundred and fifty
 *   metres, and each would have queued a query of two minutes behind the last at a service that is down.
 *
 * A failure is not kept on disk: a service that did not answer may answer the next time.
 */
export class CachedRailwayProvider implements RailwayProvider {
  /** Not "ufoathome…": the site's worker clears every cache of that name it does not know (see sw.js). */
  static readonly CACHE_NAME = "rr0-railways"
  static readonly MAX_AGE_MS = 30 * 24 * 3600 * 1000
  /** Raised when what an answer holds changes, so that one kept before is asked again. */
  static readonly FORMAT = 1
  /** How many answers are kept on disk, the oldest going first. */
  static readonly MAX_STORED = 400
  /** How long the live source is let be after it failed. */
  static readonly RETRY_AFTER_MS = 5 * 60 * 1000

  /** Every answer of this page, by key, with the box it is of: shared, since a scene builds its providers anew. */
  private static readonly asked = new Map<string, { bounds: GeoBounds, answer: Promise<RailwayLine[]> }>()
  /** When the live source last failed, for this page. */
  private static failedAt = -Infinity

  constructor(private readonly railways: RailwayProvider, private readonly now: () => number = Date.now) {}

  get attribution(): string {
    return this.railways.attribution
  }

  get contemporary(): boolean {
    return this.railways.contemporary
  }

  async getRailways(bounds: GeoBounds): Promise<RailwayLine[]> {
    const key = CachedRailwayProvider.key(bounds)
    let held = CachedRailwayProvider.asked.get(key) ?? CachedRailwayProvider.containing(bounds)
    if (held === undefined) {
      const answer = this.recalled(key, bounds)
      held = { bounds, answer }
      CachedRailwayProvider.asked.set(key, held)
      answer.catch(() => CachedRailwayProvider.asked.delete(key))
    }
    // A copy: what is given is the asker's to change.
    return structuredClone(await held.answer)
  }

  /** Forgets what this page was told and that the live source failed, not what is on disk. For tests. */
  static forget(): void {
    CachedRailwayProvider.asked.clear()
    CachedRailwayProvider.failedAt = -Infinity
  }

  /** The box to about a metre (five decimals of a degree): a patch built again for the same place asks for the same box. */
  static key(bounds: GeoBounds): string {
    return `v${CachedRailwayProvider.FORMAT}/${[bounds.north, bounds.south, bounds.east, bounds.west].map(value => value.toFixed(5)).join("/")}`
  }

  /** An answer of this page for a box that holds this one whole. */
  private static containing(bounds: GeoBounds): { bounds: GeoBounds, answer: Promise<RailwayLine[]> } | undefined {
    for (const held of CachedRailwayProvider.asked.values()) {
      const box = held.bounds
      if (box.north >= bounds.north && box.south <= bounds.south && box.east >= bounds.east && box.west <= bounds.west) return held
    }
    return undefined
  }

  private async recalled(key: string, bounds: GeoBounds): Promise<RailwayLine[]> {
    const cache = await CachedRailwayProvider.openCache()
    const request = CachedRailwayProvider.request(key)
    let stale: RailwayLine[] | undefined
    if (cache) {
      try {
        const stored = await cache.match(request)
        if (stored) {
          const { savedAt, lines } = await stored.json() as StoredRailways
          if (Array.isArray(lines)) {
            if (this.now() - savedAt < CachedRailwayProvider.MAX_AGE_MS) return lines
            stale = lines
          }
        }
      } catch {
        // An entry that cannot be read is as good as none.
      }
    }
    if (this.now() - CachedRailwayProvider.failedAt < CachedRailwayProvider.RETRY_AFTER_MS) {
      if (stale) return stale
      throw new Error("The railway survey failed a moment ago: not asked again yet")
    }
    let lines: RailwayLine[]
    try {
      lines = await this.railways.getRailways(bounds)
    } catch (error) {
      CachedRailwayProvider.failedAt = this.now()
      if (stale) return stale
      throw error
    }
    if (cache) void CachedRailwayProvider.store(cache, request, { savedAt: this.now(), lines })
    return lines
  }

  private static async store(cache: Cache, request: Request, stored: StoredRailways): Promise<void> {
    try {
      // Put again under its key, so a refreshed answer is the newest and not the first to go.
      await cache.delete(request)
      await cache.put(request, new Response(JSON.stringify(stored), { headers: { "Content-Type": "application/json" } }))
      // The keys come back in the order they were written: the oldest go first.
      const keys = await cache.keys()
      for (const old of keys.slice(0, Math.max(0, keys.length - CachedRailwayProvider.MAX_STORED))) await cache.delete(old)
    } catch {
      // Out of room, or a private window: the answer is still the page's.
    }
  }

  /** Where the browser keeps a cache and lets this page open one; nowhere else (a test, a private window). */
  private static async openCache(): Promise<Cache | undefined> {
    try {
      return typeof caches === "undefined" ? undefined : await caches.open(CachedRailwayProvider.CACHE_NAME)
    } catch {
      return undefined
    }
  }

  /** A key as the Cache API wants one: a URL of this page's own origin that nothing serves. */
  private static request(key: string): Request {
    const origin = typeof location === "undefined" ? "http://localhost" : location.origin
    return new Request(`${origin}/__railways__/${encodeURIComponent(key)}`)
  }
}
