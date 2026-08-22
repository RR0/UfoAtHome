import type { SightingTime } from "../model/Sighting.js"

/**
 * Resolves a witness's wall-clock reading into a real UTC offset, using the named time zone's own
 * rules AT THE DATE OF THE SIGHTING — summer time included, and as it was then rather than as it is
 * now. That distinction is the whole reason this exists: France ran on UTC+1 in July 1965 (summer
 * time was only reintroduced in 1976) and runs on UTC+2 in July today; New Mexico was on UTC-7 on
 * 24 April 1964 and switched to -6 two days later. A recording that stated only "UTC+2" for
 * Valensole would render an hour of the wrong sky and read an hour of the wrong weather.
 *
 * The rules come from the platform's own IANA database, via Intl — no table shipped here, and no
 * table to go stale. What it cannot fix is a zone whose BOUNDARIES have moved: Montgomery, Alabama
 * is `America/Chicago`, which observed summer time in 1948 while Alabama did not. That is why the
 * zone is chosen by the witness rather than derived from the coordinates.
 */
export class TimeZones {
  /** Every IANA zone the platform knows, sorted. Empty on a platform without
   * `Intl.supportedValuesOf` (pre-2022), where the picker simply offers nothing and the plain
   * numeric offset carries on being the way to state a time zone. */
  available(): string[] {
    const supported = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf
    return supported ? [...supported.call(Intl, "timeZone")].sort() : []
  }

  /**
   * The offset, in hours ahead of UTC, that `zone` was on when its own clocks read `time`.
   *
   * Two passes, because the question is circular: which instant a wall-clock reading denotes
   * depends on the offset, and the offset depends on the instant. The first pass reads the offset
   * at the naive instant, the second at the corrected one — which lands on the right side of a
   * summer-time change for every reading except the one hour a year that genuinely denotes two
   * instants (or none). undefined for a zone the platform doesn't know, or a time with no date to
   * apply the rules of.
   */
  offsetHoursAt(zone: string, time: SightingTime): number | undefined {
    if (time.year === undefined) return undefined
    const naive = Date.UTC(time.year, (time.month ?? 1) - 1, time.day ?? 1, time.hour ?? 12, time.minute ?? 0, time.second ?? 0)
    const first = this.zoneOffsetHours(zone, new Date(naive))
    if (first === undefined) return undefined
    return this.zoneOffsetHours(zone, new Date(naive - first * 3_600_000)) ?? first
  }

  /** The zone's offset at a real instant, read off the platform's own formatter ("GMT+01:00"). */
  private zoneOffsetHours(zone: string, at: Date): number | undefined {
    let formatted: string
    try {
      formatted = new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "longOffset" })
        .formatToParts(at)
        .find(part => part.type === "timeZoneName")?.value ?? ""
    } catch {
      return undefined // not a zone this platform knows
    }
    // "GMT" alone means UTC; otherwise "GMT+05:30" / "GMT-03:00".
    const match = /^GMT(?:([+-])(\d{2}):(\d{2}))?$/.exec(formatted)
    if (!match) return undefined
    if (!match[1]) return 0
    return (match[1] === "-" ? -1 : 1) * (Number(match[2]) + Number(match[3]) / 60)
  }
}
