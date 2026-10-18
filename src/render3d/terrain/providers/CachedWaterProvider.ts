import type { GeoBounds } from "../GeoBounds.js"
import type { WaterProvider, WaterSurface } from "../WaterProvider.js"

/** What is kept of an answer on disk: the answer, and the day it was given, to tell an old one. */
interface StoredWater {
  savedAt: number
  surfaces: WaterSurface[]
}

/**
 * A water provider that answers a square of ground it has already been asked about from what it said then, as CachedSurroundingsProvider does for
 * the scenery: for the page (a patch rebuilt for the same place, a scene opened twice) and on disk for MAX_AGE_MS (the next visit, and a visit
 * without a network). Outside France the live source is Overpass, free and donated, and the water of a place does not change in a month.
 *
 * A failure is not kept: a service that did not answer may answer the next time.
 */
export class CachedWaterProvider implements WaterProvider {
  /** Not "ufoathome…": the site's worker clears every cache of that name it does not know (see sw.js). */
  static readonly CACHE_NAME = "rr0-water"
  static readonly MAX_AGE_MS = 30 * 24 * 3600 * 1000
  /** Raised when what an answer holds changes, so that one kept before is asked again. */
  static readonly FORMAT = 1
  /** How many answers are kept on disk, the oldest going first. */
  static readonly MAX_STORED = 400

  /** Every answer of this page, by key: shared, since a scene builds its providers anew. */
  private static readonly asked = new Map<string, Promise<WaterSurface[]>>()

  constructor(private readonly water: WaterProvider) {}

  get attribution(): string {
    return this.water.attribution
  }

  async getWater(bounds: GeoBounds): Promise<WaterSurface[]> {
    const key = CachedWaterProvider.key(bounds)
    let answer = CachedWaterProvider.asked.get(key)
    if (answer === undefined) {
      answer = this.recalled(key, bounds)
      CachedWaterProvider.asked.set(key, answer)
      answer.catch(() => CachedWaterProvider.asked.delete(key))
    }
    // A copy: what is given is the asker's to change.
    return structuredClone(await answer)
  }

  /** Forgets what this page was told, not what is on disk. For tests. */
  static forget(): void {
    CachedWaterProvider.asked.clear()
  }

  /** The box to about a metre (five decimals of a degree): a patch built again for the same place asks for the same box. */
  static key(bounds: GeoBounds): string {
    return `v${CachedWaterProvider.FORMAT}/${[bounds.north, bounds.south, bounds.east, bounds.west].map(value => value.toFixed(5)).join("/")}`
  }

  private async recalled(key: string, bounds: GeoBounds): Promise<WaterSurface[]> {
    const cache = await CachedWaterProvider.openCache()
    const request = CachedWaterProvider.request(key)
    if (cache) {
      try {
        const stored = await cache.match(request)
        if (stored) {
          const { savedAt, surfaces } = await stored.json() as StoredWater
          if (Date.now() - savedAt < CachedWaterProvider.MAX_AGE_MS && Array.isArray(surfaces)) return surfaces
          await cache.delete(request)
        }
      } catch {
        // An entry that cannot be read is as good as none.
      }
    }
    const surfaces = await this.water.getWater(bounds)
    if (cache) void CachedWaterProvider.store(cache, request, surfaces)
    return surfaces
  }

  private static async store(cache: Cache, request: Request, surfaces: WaterSurface[]): Promise<void> {
    try {
      const stored: StoredWater = { savedAt: Date.now(), surfaces }
      await cache.put(request, new Response(JSON.stringify(stored), { headers: { "Content-Type": "application/json" } }))
      // The keys come back in the order they were written: the oldest go first.
      const keys = await cache.keys()
      for (const old of keys.slice(0, Math.max(0, keys.length - CachedWaterProvider.MAX_STORED))) await cache.delete(old)
    } catch {
      // Out of room, or a private window: the answer is still the page's.
    }
  }

  /** Where the browser keeps a cache and lets this page open one; nowhere else (a test, a private window). */
  private static async openCache(): Promise<Cache | undefined> {
    try {
      return typeof caches === "undefined" ? undefined : await caches.open(CachedWaterProvider.CACHE_NAME)
    } catch {
      return undefined
    }
  }

  /** A key as the Cache API wants one: a URL of this page's own origin that nothing serves. */
  private static request(key: string): Request {
    const origin = typeof location === "undefined" ? "http://localhost" : location.origin
    return new Request(`${origin}/__water__/${encodeURIComponent(key)}`)
  }
}
