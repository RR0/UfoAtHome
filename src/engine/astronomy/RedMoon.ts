import * as Astronomy from "astronomy-engine"

/**
 * The "lune rousse" of French country lore: the lunation that begins with the first new Moon after
 * Easter, so in April or May, and its full Moon above all.
 *
 * The name is old and its stories are mostly not true — it is not the Moon that burns the young
 * leaves, it is a clear spring night, which radiates the day's warmth away and frosts whatever it
 * touches whether or not a Moon is up to light it — but what the name rests on is, and is what this
 * is for. A spring full Moon stands opposite a Sun that is already high, so it rides LOW (at 49° north
 * its noon is 25° up in early May, against 65° in December), and a low Moon is seen through a long
 * path of air, which takes out its blue and leaves it orange-red. Nothing about it is bigger, nor
 * brighter, than any other full Moon; and its colour is the air's.
 */
export class RedMoon {
  /** Gregorian Easter Sunday, the "anonymous" algorithm (Meeus, Astronomical Algorithms, ch. 8), as a UTC date at noon. */
  static easter(year: number): Date {
    const a = year % 19
    const b = Math.floor(year / 100)
    const c = year % 100
    const d = Math.floor(b / 4)
    const e = b % 4
    const f = Math.floor((b + 8) / 25)
    const g = Math.floor((b - f + 1) / 3)
    const h = (19 * a + b - d - g + 15) % 30
    const i = Math.floor(c / 4)
    const k = c % 4
    const l = (32 + 2 * e + 2 * i - h - k) % 7
    const m = Math.floor((a + 11 * h + 22 * l) / 451)
    const month = Math.floor((h + l - 7 * m + 114) / 31)
    const day = ((h + l - 7 * m + 114) % 31) + 1
    return new Date(Date.UTC(year, month - 1, day, 12))
  }

  /**
   * The lunation of this year's "lune rousse": from the first new Moon after Easter to the next, with
   * its full Moon. Only defined for the Gregorian calendar, which is to say from 1583 — Easter before
   * it was computed by another rule (the Julian one) and the lore, as we have it, is French.
   */
  static lunation(year: number): { begin: Date; full: Date; end: Date } | undefined {
    if (year < 1583) return undefined
    const easter = RedMoon.easter(year)
    const begin = Astronomy.SearchMoonPhase(0, easter, 40)
    if (!begin) return undefined
    const full = Astronomy.SearchMoonPhase(180, begin.date, 20)
    const end = Astronomy.SearchMoonPhase(0, new Date(begin.date.getTime() + 86_400_000), 40)
    if (!full || !end) return undefined
    return { begin: begin.date, full: full.date, end: end.date }
  }

  /** Whether this date falls within that lunation. */
  static isIn(date: Date): boolean {
    const lunation = RedMoon.lunation(date.getUTCFullYear())
    return lunation !== undefined && date >= lunation.begin && date < lunation.end
  }
}
