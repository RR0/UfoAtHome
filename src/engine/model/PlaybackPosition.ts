import { DurationText } from "./DurationText.js"
import type { SightingTime } from "./Sighting.js"

/** A time of day, with its date when it was given: what is said during an observation ("2:33", "2026-08-11T02:33:15"). */
export interface ClockTime {
  hour: number
  minute: number
  second: number
  date?: { year: number, month: number, day: number }
}

/**
 * Where a recording opens, as a link or an attribute says it: two things that are not the same, and are said by two names.
 *
 * - a LENGTH of time from the start of the observation, `d=90`: seconds, minutes and seconds (`1:30`), hours (`1:02:03`), units (`1m30s`,
 *   `2h`), or an ISO 8601 duration (`PT1M30S`) — durations in general, as the editor takes them (see DurationText);
 * - a TIME said during the observation, `t=02:33:15` (its local time) or with the day, `t=2026-08-11T02:33:15`: the moment itself, which
 *   the recording's own start puts at a number of seconds (see {@link elapsedSince}).
 *
 * Nothing here is a free function of the page: the component and the page both ask this, so that a link and the attribute it becomes mean the
 * same thing. What it cannot read it says nothing of (`undefined`), and the recording opens at its start.
 */
export class PlaybackPosition {

  private static readonly PLAIN = /^\d+(?:[.,]\d+)?$/
  private static readonly COLONS = /^(?:(\d+):)?(\d{1,2}):(\d{1,2}(?:[.,]\d+)?)$/
  private static readonly UNITS = /^(?:(\d+(?:[.,]\d+)?)h)?(?:(\d+(?:[.,]\d+)?)m)?(?:(\d+(?:[.,]\d+)?)s)?$/i
  private static readonly CLOCK = /^(?:(\d{4})-(\d{2})-(\d{2})[T ])?T?(\d{1,2}):(\d{2})(?::(\d{2}(?:[.,]\d+)?))?$/

  private static num(text: string | undefined): number {
    return text === undefined ? 0 : Number(text.replace(",", "."))
  }

  /** A length of time, in seconds, never negative; undefined for what is not one. */
  static delta(text: string | null | undefined): number | undefined {
    const said = (text ?? "").trim()
    if (said === "") return undefined
    if (PlaybackPosition.PLAIN.test(said)) return PlaybackPosition.num(said)
    const colons = PlaybackPosition.COLONS.exec(said)
    if (colons) {
      const [, hours, minutes, seconds] = colons
      if (Number(minutes) >= 60 || PlaybackPosition.num(seconds) >= 60) return undefined
      return PlaybackPosition.num(hours) * 3600 + Number(minutes) * 60 + PlaybackPosition.num(seconds)
    }
    const units = PlaybackPosition.UNITS.exec(said)
    if (units && (units[1] !== undefined || units[2] !== undefined || units[3] !== undefined)) {
      return PlaybackPosition.num(units[1]) * 3600 + PlaybackPosition.num(units[2]) * 60 + PlaybackPosition.num(units[3])
    }
    return /^P/i.test(said) ? DurationText.seconds(said.toUpperCase()) : undefined
  }

  /**
   * Whether a text says a time of day rather than a length: it has hours and minutes with a colon, and may have the day before. This is how
   * `t=125` (seconds, as links shared before the two were told apart say it) is told from `t=02:33`.
   */
  static isClock(text: string | null | undefined): boolean {
    return PlaybackPosition.clock(text) !== undefined
  }

  /** A time said during the observation; undefined for what is not one (an hour of 24 or more, minutes of 60 or more). */
  static clock(text: string | null | undefined): ClockTime | undefined {
    const match = PlaybackPosition.CLOCK.exec((text ?? "").trim())
    if (!match) return undefined
    const [, year, month, day, hour, minute, second] = match
    const clock: ClockTime = { hour: Number(hour), minute: Number(minute), second: PlaybackPosition.num(second) }
    if (clock.hour >= 24 || clock.minute >= 60 || clock.second >= 60) return undefined
    if (year !== undefined) {
      const date = { year: Number(year), month: Number(month), day: Number(day) }
      if (date.month < 1 || date.month > 12 || date.day < 1 || date.day > 31) return undefined
      clock.date = date
    }
    return clock
  }

  /**
   * How many seconds after the start of the observation a time said during it is, in the same local time: undefined when the start does not say
   * its hour and minute (a time of day is then no distance from anything), or its day, for a time given with its day.
   *
   * Without a day, the observation's: a time earlier than its start by half a day or more is the next day's (an observation begun at 23:50 and a
   * time of 00:05), and any other time before the start is the start, since nothing was recorded before it.
   */
  static elapsedSince(start: SightingTime | undefined, clock: ClockTime): number | undefined {
    if (!start || start.hour === undefined || start.minute === undefined) return undefined
    const startOfDay = start.hour * 3600 + start.minute * 60 + (start.second ?? 0)
    const clockOfDay = clock.hour * 3600 + clock.minute * 60 + clock.second
    if (clock.date) {
      if (start.year === undefined || start.month === undefined || start.day === undefined) return undefined
      const said = Date.UTC(clock.date.year, clock.date.month - 1, clock.date.day) / 1000 + clockOfDay
      const began = Date.UTC(start.year, start.month - 1, start.day) / 1000 + startOfDay
      return Math.max(0, said - began)
    }
    let difference = clockOfDay - startOfDay
    if (difference <= -43200) difference += 86400
    return Math.max(0, difference)
  }
}
