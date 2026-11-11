import { parseEdtfTime, type SightingTime } from "./Sighting.js"

/**
 * How much of time a date said as far as it is said covers: "1976-07" is the whole of July, "1976-06/1976-07" June and July. Wall-clock
 * times, in milliseconds as if they were UTC: what is compared is how dates are said, not instants of a given zone.
 */
export class TimeSpan {
  /** The first instant `time` covers. */
  static earliestOf(time: SightingTime): number {
    return Date.UTC(time.year ?? 0, (time.month ?? 1) - 1, time.day ?? 1, time.hour ?? 0, time.minute ?? 0, time.second ?? 0)
  }

  /** The last instant `time` covers: "1976-07" ends with the last minute of the 31st of July. */
  static latestOf(time: SightingTime): number {
    const year = time.year ?? 9999
    if (time.month === undefined) return Date.UTC(year + 1, 0, 1) - 1
    if (time.day === undefined) return Date.UTC(year, time.month, 1) - 1
    if (time.hour === undefined) return Date.UTC(year, time.month - 1, time.day + 1) - 1
    if (time.minute === undefined) return Date.UTC(year, time.month - 1, time.day, time.hour + 1) - 1
    return Date.UTC(year, time.month - 1, time.day, time.hour, time.minute + 1) - 1
  }

  /** The first and last minutes of an EDTF interval "start/end", each end as wide as it is said; undefined when neither end reads. */
  static boundsOf(interval: string): { min: SightingTime, max: SightingTime } | undefined {
    const [start, end] = interval.split("/")
    const from = start ? parseEdtfTime(start) : undefined
    const to = end ? parseEdtfTime(end) : undefined
    if (!from || !to) return undefined
    return { min: TimeSpan.timeAt(TimeSpan.earliestOf(from)), max: TimeSpan.timeAt(TimeSpan.latestOf(to) - 59_999) }
  }

  /** A wall-clock instant as a full time, to the minute. */
  static timeAt(ms: number): SightingTime {
    const date = new Date(ms)
    return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate(), hour: date.getUTCHours(), minute: date.getUTCMinutes() }
  }
}
