/**
 * The re-entries on record, fetched by year from the archive built by
 * scripts/build-reentry-catalog.ts, and which of them could have been the light somebody saw.
 *
 * A re-entry is one of the few misidentifications that is DATED: something came down, and somebody
 * wrote when. How precisely is the whole question, and every record says it:
 *
 * - `minute`: CORDS (since 2000) has the time somebody actually saw it come down, and where from.
 * - `hours`: CORDS's prediction, with the uncertainty Aerospace stated for it — the object made
 *   several orbits inside that window and came down on one of them, anywhere along it.
 * - `day`: the SATCAT's decay date (since 1957), and nothing finer.
 *
 * WHAT IS NEVER CLAIMED: that a re-entry crossed this observer's sky. Only a `minute` record seen
 * from near here says it could have; the others say it fell inside the window, somewhere on Earth.
 * The one thing a coarse record does settle is the negative: an orbit's track never strays more
 * than its inclination from the equator, so a place further from it than a re-entry can be seen
 * from never had it overhead, whatever the time.
 */

/** One re-entry on record, as the archive stores it. */
export interface ReentryRecord {
  /** The catalogue's name — "SL-12 R/B", "STARLINK-4456". */
  name: string
  cosparId?: string
  norad?: number
  type: "payload" | "rocket" | "debris" | "unknown"
  /** UTC, as precise as `precision` says: "2025-02-19T03:45Z", "1968-03-04". */
  time: string
  precision: "minute" | "hours" | "day"
  /** For a prediction: how far either side of `time` it could have come down. */
  uncertaintyHours?: number
  /** For a sighting on record: where it was seen from, and that place's coordinates. */
  seenFrom?: string
  seenLat?: number
  seenLng?: number
  /** The plane of its last orbit — see the build script on why this column, and only it, is used. */
  inclinationDeg?: number
  source: "cords" | "satcat"
}

/** A record that could have been in this sky, and what is known of how near it came. */
export interface ReentryCandidate {
  record: ReentryRecord
  /** When it came down, ms UTC: the time on record, the middle of its window for `hours`, noon for `day`. */
  timeMs: number
  /** Minutes between the time on record and the observation, 0 when it falls inside it. Only for `minute`. */
  offsetMinutes?: number
  /** For a sighting on record: how far from this observer it was seen, km. */
  seenKm?: number
}

interface ArchiveIndex {
  credit: string
  years: string[]
}

export interface ReentryArchiveOptions {
  fetchImpl?: typeof fetch
  indexUrls?: string[]
}

export const UFOATHOME_REENTRY_INDEX_URL = "https://ufoathome.org/reentries/index.json"

export class ReentryArchive {
  /** How far a time on record may be from the stated hour, either side: accounts are wrong about the
   * hour, and the time zone of a report is a common slip. */
  static readonly MINUTE_SLACK_MS = 60 * 60_000
  /** The same slack for a prediction's window, and for a day's. */
  static readonly WINDOW_SLACK_MS = 60 * 60_000
  /** How far a burning re-entry can be seen from, km: its pieces at 80 km clear the horizon out to
   * about 1000 km, and a sighting on record is a town, not the track. */
  static readonly VISIBLE_KM = 1500
  /** The same reach, as degrees of latitude past an orbit's inclination. */
  static readonly VISIBLE_DEG = ReentryArchive.VISIBLE_KM / 111.2
  private static readonly EARTH_RADIUS_KM = 6371

  private readonly fetchImpl: typeof fetch
  private readonly indexUrls: string[]
  private index?: Promise<{ index: ArchiveIndex; base: string } | undefined>
  private readonly years = new Map<string, Promise<ReentryRecord[]>>()

  constructor(options: ReentryArchiveOptions = {}) {
    this.fetchImpl = options.fetchImpl ?? fetch.bind(globalThis)
    this.indexUrls = options.indexUrls ?? ReentryArchive.defaultIndexUrls()
  }

  /** Beside the page first (this site, a dev server), ufoathome.org otherwise — as the orbital elements. */
  static defaultIndexUrls(): string[] {
    const urls: string[] = []
    if (typeof location !== "undefined" && /^https?:$/.test(location.protocol)) {
      urls.push(new URL("/reentries/index.json", location.href).href)
    }
    if (!urls.includes(UFOATHOME_REENTRY_INDEX_URL)) urls.push(UFOATHOME_REENTRY_INDEX_URL)
    return urls
  }

  /** Who the records come from, once the index is loaded. */
  async credit(): Promise<string | undefined> {
    return (await this.loadIndex())?.index.credit
  }

  /**
   * The re-entries that could have been in the sky of `observer` between `startMs` and `endMs`,
   * sorted most telling first: a sighting on record, then a prediction, then a day.
   * Undefined when the archive cannot be reached at all — not the same answer as none.
   */
  async candidates(startMs: number, endMs: number, observer: { lat: number; lng: number }): Promise<ReentryCandidate[] | undefined> {
    const loaded = await this.loadIndex()
    if (!loaded) return undefined
    const years = new Set<string>()
    for (const ms of [startMs - ReentryArchive.DAY_MS, endMs + ReentryArchive.DAY_MS]) years.add(String(new Date(ms).getUTCFullYear()))
    const records = (await Promise.all([...years].filter(year => loaded.index.years.includes(year))
      .map(year => this.yearOf(year, loaded.base)))).flat()
    return ReentryArchive.match(records, startMs, endMs, observer)
  }

  private static readonly DAY_MS = 86_400_000

  /** The records of `records` that could have been in that sky — see `candidates`. Pure. */
  static match(records: readonly ReentryRecord[], startMs: number, endMs: number, observer: { lat: number; lng: number }): ReentryCandidate[] {
    const found: ReentryCandidate[] = []
    for (const record of records) {
      // Never overhead: its track does not come within sight of this latitude.
      if (record.inclinationDeg !== undefined && Math.abs(observer.lat) > record.inclinationDeg + ReentryArchive.VISIBLE_DEG) continue
      const time = Date.parse(record.precision === "day" ? `${record.time}T00:00Z` : record.time)
      if (!Number.isFinite(time)) continue
      if (record.precision === "minute") {
        const offset = time < startMs ? startMs - time : time > endMs ? time - endMs : 0
        if (offset > ReentryArchive.MINUTE_SLACK_MS) continue
        let seenKm: number | undefined
        if (record.seenLat !== undefined && record.seenLng !== undefined) {
          seenKm = ReentryArchive.distanceKm(observer.lat, observer.lng, record.seenLat, record.seenLng)
          if (seenKm > ReentryArchive.VISIBLE_KM) continue
        }
        found.push({ record, timeMs: time, offsetMinutes: Math.round(offset / 60_000), seenKm })
      } else {
        const half = record.precision === "day" ? ReentryArchive.DAY_MS / 2 : (record.uncertaintyHours ?? 0) * 3_600_000
        const centre = record.precision === "day" ? time + half : time
        const slack = ReentryArchive.WINDOW_SLACK_MS
        if (centre + half + slack < startMs || centre - half - slack > endMs) continue
        found.push({ record, timeMs: centre })
      }
    }
    const rank = { minute: 0, hours: 1, day: 2 } as const
    return found.sort((a, b) => rank[a.record.precision] - rank[b.record.precision] ||
      (a.record.uncertaintyHours ?? 0) - (b.record.uncertaintyHours ?? 0) || a.timeMs - b.timeMs)
  }

  /** Great-circle distance, km. */
  static distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const rad = Math.PI / 180
    const a = Math.sin(lat1 * rad) * Math.sin(lat2 * rad) + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.cos((lng2 - lng1) * rad)
    return ReentryArchive.EARTH_RADIUS_KM * Math.acos(Math.max(-1, Math.min(1, a)))
  }

  private loadIndex(): Promise<{ index: ArchiveIndex; base: string } | undefined> {
    this.index ??= (async () => {
      for (const url of this.indexUrls) {
        try {
          const response = await this.fetchImpl(url)
          if (response.ok) return { index: await response.json() as ArchiveIndex, base: url }
        } catch {
          // The next one, then.
        }
      }
      return undefined
    })()
    return this.index
  }

  private yearOf(year: string, base: string): Promise<ReentryRecord[]> {
    let records = this.years.get(year)
    if (!records) {
      records = this.fetchImpl(new URL(`${year}.json`, base).href)
        .then(response => response.ok ? response.json() as Promise<ReentryRecord[]> : [])
        .catch(() => [])
      this.years.set(year, records)
    }
    return records
  }
}
