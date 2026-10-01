import type { GeoPoint, ReentryJson, SkyPoint } from "../interpretation/Reentry.js"
import { ReentrySighting } from "../interpretation/Reentry.js"

/**
 * The fireballs a camera network actually recorded, fetched by month from the archive built by
 * scripts/build-fireball-archive.ts: the Global Meteor Network's triangulated trajectories since
 * December 2018, those of absolute magnitude -3 or brighter.
 *
 * Unlike the meteors the scene computes from a shower's rate (see MeteorFall), these are EVENTS:
 * one bolide, at one instant, along one measured path. Seen from anywhere it was above the horizon,
 * it is drawn where and when it really burned, as bright as its distance makes it — the same
 * geometry as a re-entry (see ReentrySighting), a few seconds instead of a few minutes.
 *
 * The record is what one network saw. A fireball under cloud at every camera, or over a stretch of
 * the world it does not cover, is not in it, so its absence says nothing.
 */

/** One fireball as the archive stores it. */
export interface FireballRecord {
  /** The network's own trajectory id. */
  id: string
  /** When it began, ms UTC. */
  t: number
  /** Where it began and ended: [lat, lng, height km]. */
  from: [number, number, number]
  to: [number, number, number]
  durationS: number
  /** Its peak brightness at 100 km — absolute magnitude. */
  peakMagnitude: number
  peakHeightKm: number
  /** How many stations triangulated it. */
  stations?: number
}

/** A fireball as one observer could have seen it. */
export interface FireballSighting {
  record: FireballRecord
  /** Where its brightest point stood in this sky. */
  peak: SkyPoint
  /** Its apparent magnitude there, before air and cloud. */
  magnitude: number
}

interface ArchiveIndex {
  credit: string
  from: string
  to: string
  months: string[]
}

export interface FireballArchiveOptions {
  fetchImpl?: typeof fetch
  indexUrls?: string[]
}

export const UFOATHOME_FIREBALL_INDEX_URL = "https://ufoathome.org/fireballs/index.json"

export class FireballArchive {
  /** The first month the archive holds, known without asking it: nothing is fetched for an
   * earlier date, which is nearly every recording this project reconstructs. */
  static readonly FIRST_MONTH = "2018-12"
  /** The faintest it is worth stating as a fireball somebody saw: brighter than any star but Sirius. */
  static readonly STRIKING_MAGNITUDE = -1
  /** A fireball's colour, unknown from the record: the bluish white of most. */
  static readonly COLOR = "#eef2ff"
  /** Its short-lived tail, seconds. */
  static readonly TRAIN_S = 0.3

  private readonly fetchImpl: typeof fetch
  private readonly indexUrls: string[]
  private index?: Promise<{ index: ArchiveIndex; base: string } | undefined>
  private readonly months = new Map<string, Promise<FireballRecord[]>>()

  constructor(options: FireballArchiveOptions = {}) {
    this.fetchImpl = options.fetchImpl ?? fetch.bind(globalThis)
    this.indexUrls = options.indexUrls ?? FireballArchive.defaultIndexUrls()
  }

  /** Beside the page first (this site, a dev server), ufoathome.org otherwise. */
  static defaultIndexUrls(): string[] {
    const urls: string[] = []
    if (typeof location !== "undefined" && /^https?:$/.test(location.protocol)) {
      urls.push(new URL("/fireballs/index.json", location.href).href)
    }
    if (!urls.includes(UFOATHOME_FIREBALL_INDEX_URL)) urls.push(UFOATHOME_FIREBALL_INDEX_URL)
    return urls
  }

  /** Whether the archive could hold that instant at all — without fetching anything. */
  static mayCover(ms: number): boolean {
    return new Date(ms).toISOString().slice(0, 7) >= FireballArchive.FIRST_MONTH
  }

  /** Who the records come from, once the index is loaded. */
  async credit(): Promise<string | undefined> {
    return (await this.loadIndex())?.index.credit
  }

  /**
   * The fireballs on record that began between `startMs` and `endMs`. Undefined when the archive
   * cannot be reached, or does not cover those dates: not the same answer as none.
   */
  async between(startMs: number, endMs: number): Promise<FireballRecord[] | undefined> {
    if (!FireballArchive.mayCover(endMs)) return undefined
    const loaded = await this.loadIndex()
    if (!loaded) return undefined
    const months = new Set([new Date(startMs).toISOString().slice(0, 7), new Date(endMs).toISOString().slice(0, 7)])
    if (![...months].some(month => month >= loaded.index.from && month <= loaded.index.to)) return undefined
    const records = (await Promise.all([...months].filter(month => loaded.index.months.includes(month))
      .map(month => this.monthOf(month, loaded.base)))).flat()
    return records.filter(record => record.t >= startMs && record.t <= endMs)
  }

  /**
   * How `record` looked from `observer`: its peak, where it was brightest along its path, and its
   * apparent magnitude there. Undefined when that point was under their horizon.
   */
  static seenFrom(record: FireballRecord, observer: GeoPoint): FireballSighting | undefined {
    const f = FireballArchive.peakFraction(record)
    const at: GeoPoint = {
      lat: record.from[0] + (record.to[0] - record.from[0]) * f,
      lng: record.from[1] + (record.to[1] - record.from[1]) * f,
      heightM: record.peakHeightKm * 1000
    }
    const peak = ReentrySighting.seenFrom(observer, at)
    if (peak.altitudeDeg < 0) return undefined
    return { record, peak, magnitude: record.peakMagnitude + 5 * Math.log10(peak.distanceKm / ReentrySighting.STANDARD_DISTANCE_KM) }
  }

  /**
   * A fireball as the scene draws it: a re-entry of one piece, along its measured path, at its own
   * instant of the recording that starts at `startMs`. Its brightness is its peak all along, eased
   * in and out: the network gives the peak, not the light curve.
   */
  static asReentry(record: FireballRecord, startMs: number): ReentryJson {
    const t = record.t - startMs
    const end = t + Math.max(record.durationS, 0.1) * 1000
    return {
      id: `gmn-${record.id}`,
      track: [
        { t, lat: record.from[0], lng: record.from[1], altitudeKm: record.from[2] },
        { t: end, lat: record.to[0], lng: record.to[1], altitudeKm: record.to[2] }
      ],
      fragments: [{ absoluteMagnitude: record.peakMagnitude, color: FireballArchive.COLOR, trainS: FireballArchive.TRAIN_S }]
    }
  }

  /** Where along its path it peaked, 0 to 1, from the peak's height between the two ends. */
  private static peakFraction(record: FireballRecord): number {
    const span = record.from[2] - record.to[2]
    if (Math.abs(span) < 1e-6) return 0.5
    return Math.min(1, Math.max(0, (record.from[2] - record.peakHeightKm) / span))
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

  private monthOf(month: string, base: string): Promise<FireballRecord[]> {
    let records = this.months.get(month)
    if (!records) {
      records = this.fetchImpl(new URL(`${month}.json`, base).href)
        .then(response => response.ok ? response.json() as Promise<FireballRecord[]> : [])
        .catch(() => [])
      this.months.set(month, records)
    }
    return records
  }
}
