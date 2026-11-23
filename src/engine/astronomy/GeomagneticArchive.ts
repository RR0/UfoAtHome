import type { AuroraJson } from "../../modules/sky-events/auroras/Aurora.js"

/**
 * The planetary index of geomagnetic activity as the GFZ archived it, fetched by year from the copy built by scripts/build-kp-archive.ts
 * (the GFZ's own service sends no CORS header): Kp every three hours since 1932, and from 1985 Hp60 every hour, the same scale without
 * Kp's ceiling at 9, which the great storms go past.
 *
 * Either is a measurement: how disturbed the field was, from the magnetometers of thirteen observatories. What it implies of the aurora (where
 * the oval stood, how bright its arcs were) is not, and is said so (see AuroralOval). A night with an aurora under cloud at every
 * observatory is in it all the same: the field does not care for the weather.
 */
export class GeomagneticArchive {
  static readonly FIRST_YEAR = 1932
  /** The id the aurora it implies is given: one of the archive, not one the recording states. */
  static readonly AURORA_ID = "gfz-kp"

  private readonly fetchImpl: typeof fetch
  private readonly baseUrls: string[]
  private readonly years = new Map<number, Promise<{ stepMs: number, values: number[] } | undefined>>()

  constructor(options: { fetchImpl?: typeof fetch, baseUrls?: string[] } = {}) {
    this.fetchImpl = options.fetchImpl ?? fetch.bind(globalThis)
    this.baseUrls = options.baseUrls ?? GeomagneticArchive.defaultBaseUrls()
  }

  /** Beside the page first (this site, a dev server), ufoathome.org otherwise. */
  static defaultBaseUrls(): string[] {
    const urls: string[] = []
    if (typeof location !== "undefined" && /^https?:$/.test(location.protocol)) urls.push(new URL("/kp/", location.href).href)
    const site = "https://ufoathome.org/kp/"
    if (!urls.includes(site)) urls.push(site)
    return urls
  }

  static mayCover(ms: number): boolean {
    return new Date(ms).getUTCFullYear() >= GeomagneticArchive.FIRST_YEAR
  }

  /**
   * The index at every hour (Hp60) or three (Kp) from the value before `startMs` to the one after `endMs`, as instants (ms UTC): undefined
   * when the archive cannot be reached or holds none of it, which is not the same answer as a quiet field.
   */
  async between(startMs: number, endMs: number): Promise<{ t: number, kp: number }[] | undefined> {
    if (!GeomagneticArchive.mayCover(endMs)) return undefined
    const keys: { t: number, kp: number }[] = []
    const first = new Date(startMs).getUTCFullYear(), last = new Date(endMs).getUTCFullYear()
    for (let year = first; year <= last; year++) {
      const archived = await this.yearOf(year)
      if (!archived) continue
      const { stepMs, values } = archived
      const yearStart = Date.UTC(year, 0, 1)
      // From the value before the start to the one after the end: each stated at the middle of its span, for a line joining two to be fair
      // to both.
      const from = Math.max(0, Math.floor((startMs - yearStart) / stepMs) - 1)
      const to = Math.min(values.length - 1, Math.ceil((endMs - yearStart) / stepMs))
      for (let i = from; i <= to; i++) if (values[i] >= 0) keys.push({ t: yearStart + i * stepMs + stepMs / 2, kp: values[i] / 3 })
    }
    return keys.length > 0 ? keys : undefined
  }

  /** The aurora that Kp implies over a recording that starts at `startMs`: its activity at instants of the recording. */
  static asAurora(keys: readonly { t: number, kp: number }[], startMs: number): AuroraJson {
    return { id: GeomagneticArchive.AURORA_ID, activity: keys.map(key => ({ t: key.t - startMs, kp: key.kp })) }
  }

  private yearOf(year: number): Promise<{ stepMs: number, values: number[] } | undefined> {
    let archived = this.years.get(year)
    if (!archived) {
      archived = (async () => {
        if (year < GeomagneticArchive.FIRST_YEAR) return undefined
        for (const base of this.baseUrls) {
          try {
            const response = await this.fetchImpl(new URL(`${year}.json`, base).href)
            if (!response.ok) continue
            const file = (await response.json()) as { stepHours: number, values: number[] }
            return { stepMs: file.stepHours * 3_600_000, values: file.values }
          } catch {
            // The next one, then.
          }
        }
        return undefined
      })()
      this.years.set(year, archived)
    }
    return archived
  }
}
