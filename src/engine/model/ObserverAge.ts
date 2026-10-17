import type { SightingTime } from "./Sighting.js"

/**
 * The arithmetic between an observer's birth date and the age they had on the day of the
 * observation, which an account states one way or the other: a 1974 report says "he was 43", a
 * civil record says "born 14 March 1931".
 *
 * Each can stand in for the other only as far as the dates are precise, which is why neither
 * function pretends otherwise: an age worked from a year-only birth is the year difference (it may
 * be one too many, and the birth is then said to be approximate), and a birth worked back from an
 * age is only a year, marked approximate, never a day nobody gave.
 */
export class ObserverAge {
  /** The age in whole years on the day, or undefined when either date has no year to subtract.
   * Months and days settle whether the birthday had come yet, but only when BOTH sides state them:
   * otherwise the birthday is taken as already passed, the year difference. */
  static at(birth: SightingTime, observation: SightingTime): number | undefined {
    if (birth.year === undefined || observation.year === undefined) return undefined
    let age = observation.year - birth.year
    const known = (a?: number, b?: number): a is number => a !== undefined && b !== undefined
    if (known(birth.month, observation.month)) {
      const before =
        observation.month! < birth.month! ||
        (observation.month === birth.month && known(birth.day, observation.day) && observation.day! < birth.day!)
      if (before) age--
    }
    return age >= 0 ? age : undefined
  }

  /** The birth an age implies: the year, and approximate — the observation year minus the age, or
   * one less if the birthday had not come. */
  static birthFor(age: number, observation: SightingTime): SightingTime | undefined {
    if (observation.year === undefined) return undefined
    const year = observation.year - age
    return { year, raw: `${String(year).padStart(4, "0")}~` }
  }

  /** Whether a birth is a statement in its own right (precise, or at least not marked uncertain or
   * approximate) rather than one worked back from an age: only the first should drag the age with
   * it when the observation date is corrected. */
  static isFirm(birth: SightingTime): boolean {
    return !/[?~%]/.test(birth.raw ?? "")
  }
}
