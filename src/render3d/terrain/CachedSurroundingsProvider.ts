import type { Surroundings, SurroundingsProvider } from "./SurroundingsProvider.js"

/** What is kept of an answer on disk: the answer, and the day it was given, to tell an old one. */
interface StoredSurroundings {
  savedAt: number
  surroundings: Surroundings
}

/**
 * A survey that answers a place it has already been asked about from what it said then, instead of asking the services again.
 *
 * A survey is slow and heavy: the IGN's, along the road a driving observer took, is a dozen places of six requests each and a minute of waiting, which an
 * author met again every time the place was asked about anew (a radius widened and narrowed back, an undo, the page opened the next day). Nothing kept
 * it: the services are another site's, which the site's worker leaves alone, and their answers are not ones a browser keeps.
 *
 * What is kept is the answer itself, the trees and the buildings already found in the laser grids (see CanopyCrowns, BuildingFootprints), not the
 * grids: kilobytes rather than megabytes, and none of the work to do again. Kept twice:
 *
 * - for the page, shared by every survey made of the same source, a question being asked while it is still on its way being the same question;
 * - on disk (the Cache API, where the browser has one) for MAX_AGE_MS, so that the next visit, and a visit without a network, has it too. A survey is
 *   of some day years ago (see SurveyDates), and a month changes nothing of it.
 *
 * A failure is not kept: a service that did not answer may answer the next time.
 */
export class CachedSurroundingsProvider implements SurroundingsProvider {
  /** Not "ufoathome…": the site's worker clears every cache of that name it does not know (see sw.js). */
  static readonly CACHE_NAME = "rr0-surroundings"
  static readonly MAX_AGE_MS = 30 * 24 * 3600 * 1000
  /**
   * What an answer holds, as a number raised when a survey starts to say more than it did: an answer kept before it does not say it, and is not
   * kept for a month more. 2: the traffic lights, crossings and signs of the streets. 3: what kind of building each is (a church, an old
   * one), and the walls and roofs of that kind.
   */
  static readonly FORMAT = 3
  /** How many answers are kept on disk, the oldest going first: a few hundred places, a few megabytes. */
  static readonly MAX_STORED = 400

  /** Every answer of this page, by key (see key): shared, since the editor builds a new survey every time it asks. */
  private static readonly asked = new Map<string, Promise<Surroundings>>()

  constructor(private readonly survey: SurroundingsProvider) {}

  get id(): string { return this.survey.id }
  get name(): string { return this.survey.name }
  get attribution(): string { return this.survey.attribution }
  get creditUrl(): string { return this.survey.creditUrl }
  get contemporary(): boolean { return this.survey.contemporary }

  covers(lat: number, lng: number): boolean {
    return this.survey.covers(lat, lng)
  }

  async getSurroundings(centre: { lat: number, lng: number }, radiusM: number): Promise<Surroundings> {
    const key = CachedSurroundingsProvider.key(this.survey.id, centre, radiusM)
    let answer = CachedSurroundingsProvider.asked.get(key)
    if (answer === undefined) {
      answer = this.recalled(key, centre, radiusM)
      CachedSurroundingsProvider.asked.set(key, answer)
      answer.catch(() => CachedSurroundingsProvider.asked.delete(key))
    }
    // A copy: what is given is the asker's to change, and the next one asks for what the survey said.
    return structuredClone(await answer)
  }

  /** Forgets what this page was told, not what is on disk. For tests. */
  static forget(): void {
    CachedSurroundingsProvider.asked.clear()
  }

  /**
   * The survey, the place to about a metre (five decimals of a degree) and the radius: a place typed again or read back from a file is the same place,
   * and a radius is part of the question.
   */
  static key(id: string, centre: { lat: number, lng: number }, radiusM: number): string {
    return `${id}/v${CachedSurroundingsProvider.FORMAT}/${centre.lat.toFixed(5)}/${centre.lng.toFixed(5)}/${Math.round(radiusM)}`
  }

  /** What the disk remembers of this question if it is recent enough, else what the survey says now, written down. */
  private async recalled(key: string, centre: { lat: number, lng: number }, radiusM: number): Promise<Surroundings> {
    const cache = await CachedSurroundingsProvider.openCache()
    const request = CachedSurroundingsProvider.request(key)
    if (cache) {
      try {
        const stored = await cache.match(request)
        if (stored) {
          const { savedAt, surroundings } = await stored.json() as StoredSurroundings
          if (Date.now() - savedAt < CachedSurroundingsProvider.MAX_AGE_MS) return surroundings
          await cache.delete(request)
        }
      } catch {
        // An entry that cannot be read is as good as none.
      }
    }
    const surroundings = await this.survey.getSurroundings(centre, radiusM)
    // A survey a part of which did not answer in time is not what the place has: it is not written down, and the next question asks again.
    if (surroundings.incomplete) {
      CachedSurroundingsProvider.asked.delete(key)
      return surroundings
    }
    if (cache) void CachedSurroundingsProvider.store(cache, request, surroundings)
    return surroundings
  }

  private static async store(cache: Cache, request: Request, surroundings: Surroundings): Promise<void> {
    try {
      const stored: StoredSurroundings = { savedAt: Date.now(), surroundings }
      await cache.put(request, new Response(JSON.stringify(stored), { headers: { "Content-Type": "application/json" } }))
      // The keys come back in the order they were written: the oldest go first.
      const keys = await cache.keys()
      for (const old of keys.slice(0, Math.max(0, keys.length - CachedSurroundingsProvider.MAX_STORED))) await cache.delete(old)
    } catch {
      // Out of room, or a private window: the answer is still the page's.
    }
  }

  /** Where the browser keeps a cache, and where it lets this page open one; nowhere else (a test, a private window). */
  private static async openCache(): Promise<Cache | undefined> {
    try {
      return typeof caches === "undefined" ? undefined : await caches.open(CachedSurroundingsProvider.CACHE_NAME)
    } catch {
      return undefined
    }
  }

  /** A key as the Cache API wants one: a URL, of this page's own origin, that nothing serves. */
  private static request(key: string): Request {
    const origin = typeof location === "undefined" ? "http://localhost" : location.origin
    return new Request(`${origin}/__surroundings__/${encodeURIComponent(key)}`)
  }
}
