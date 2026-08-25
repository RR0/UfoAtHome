import { equatorialToHorizontal } from "./CelestialPositions.js"
import type { ObserverGeo } from "./CelestialPositions.js"

/**
 * The annual meteor showers, and what one of them would really have looked like from a given place
 * on a given night.
 *
 * This is the one candidate explanation whose record is COMPLETE for every case this project will
 * ever reconstruct. Aircraft are traceable from about 2013, satellites from 1957 — but showers
 * recur every year on the same dates, so the Perseids of 1948 are the Perseids of today. A sighting
 * in mid-August, or mid-November, or the night of 13 December, is a sighting during a shower, and
 * that is a fact about the sky rather than an opinion about the witness.
 *
 * It cuts both ways, which is what makes it worth having: a radiant BELOW THE HORIZON is a shower
 * that cannot have produced anything at all, and saying so is as useful as saying the opposite.
 */
export interface MeteorShower {
  /** Stable id, what a case file would name. */
  id: string
  /** The IAU three-letter designation. */
  code: string
  /** The shower's name in each language a page can be read in — the same "translate the label, keep
   * the identifier" rule the decor kinds follow (see SceneElement's DECOR_KIND_NAMES). A French
   * page saying "Perseids" in the middle of a French sentence is the wart this avoids. */
  name: { en: string; fr: string }
  /** The radiant's position at the shower's peak, J2000 — right ascension in HOURS (the unit
   * equatorialToHorizontal takes) and declination in degrees. The radiant drifts by roughly a
   * degree a day across the activity period; storing its peak position is a simplification worth
   * naming, and it is well under the precision any of this is used at. */
  radiantRaHours: number
  radiantDecDeg: number
  /** Activity window and peak as month/day: a shower is a date in the year, not a date in history.
   * A window may cross the new year — the Quadrantids run from 28 December — which is why every
   * comparison below goes through the wrap-aware helper rather than comparing day numbers. */
  start: MonthDay
  peak: MonthDay
  end: MonthDay
  /** Zenithal hourly rate at the peak: how many a single observer would see per hour with the
   * radiant overhead under a perfectly dark sky. Nobody ever observes under those conditions —
   * see observedRatePerHour, which is the number that means something. */
  peakZhr: number
  /** Atmospheric entry speed in km/s — what makes a trail fast and short or slow and stately, and
   * the one figure that distinguishes the showers to the eye rather than on paper. */
  velocityKmS: number
  /** Population index: how much more numerous the faint meteors are than the bright ones. What
   * turns a zenithal rate into a real one under a real sky. */
  populationIndex: number
}

export interface MonthDay {
  month: number
  day: number
}

/** A shower that was running on a given date, with the strength it had reached by then. */
export interface ActiveShower {
  shower: MeteorShower
  /** The zenithal rate on that date rather than at the peak — see MeteorShowers.zhrOn. */
  zhr: number
  /** 0 at the edges of the activity window, 1 on the night of the peak. */
  nearness: number
}

/**
 * The IMO working list, which is where these figures come from and what a page should credit.
 *
 * Two honest caveats, both of which an author must weigh before leaning on a number here. Rates
 * VARY between years, sometimes enormously — the Draconids and the Leonids have produced storms
 * hundreds of times these averages, and the Taurids have swarm years — so a case that turns on the
 * rate needs that year checked, not this table. And the ZHR is an average over many observers and
 * many years, not a prediction for one night.
 */
export const METEOR_SHOWERS: MeteorShower[] = [
  { id: "quadrantids", code: "QUA", name: { en: "Quadrantids", fr: "Quadrantides" }, radiantRaHours: 15.33, radiantDecDeg: 49.7, start: { month: 12, day: 28 }, peak: { month: 1, day: 3 }, end: { month: 1, day: 12 }, peakZhr: 110, velocityKmS: 41, populationIndex: 2.1 },
  { id: "lyrids", code: "LYR", name: { en: "April Lyrids", fr: "Lyrides d'avril" }, radiantRaHours: 18.13, radiantDecDeg: 33.3, start: { month: 4, day: 16 }, peak: { month: 4, day: 22 }, end: { month: 4, day: 25 }, peakZhr: 18, velocityKmS: 49, populationIndex: 2.1 },
  { id: "eta-aquariids", code: "ETA", name: { en: "eta Aquariids", fr: "Êta Aquarides" }, radiantRaHours: 22.53, radiantDecDeg: -1, start: { month: 4, day: 19 }, peak: { month: 5, day: 6 }, end: { month: 5, day: 28 }, peakZhr: 50, velocityKmS: 66, populationIndex: 2.4 },
  { id: "alpha-capricornids", code: "CAP", name: { en: "alpha Capricornids", fr: "Alpha Capricornides" }, radiantRaHours: 20.47, radiantDecDeg: -9.2, start: { month: 7, day: 3 }, peak: { month: 7, day: 30 }, end: { month: 8, day: 15 }, peakZhr: 5, velocityKmS: 23, populationIndex: 2.5 },
  { id: "southern-delta-aquariids", code: "SDA", name: { en: "Southern delta Aquariids", fr: "Delta Aquarides du Sud" }, radiantRaHours: 22.67, radiantDecDeg: -16.4, start: { month: 7, day: 12 }, peak: { month: 7, day: 30 }, end: { month: 8, day: 23 }, peakZhr: 25, velocityKmS: 41, populationIndex: 3.2 },
  { id: "perseids", code: "PER", name: { en: "Perseids", fr: "Perséides" }, radiantRaHours: 3.22, radiantDecDeg: 58, start: { month: 7, day: 17 }, peak: { month: 8, day: 12 }, end: { month: 8, day: 24 }, peakZhr: 100, velocityKmS: 59, populationIndex: 2.2 },
  { id: "southern-taurids", code: "STA", name: { en: "Southern Taurids", fr: "Taurides du Sud" }, radiantRaHours: 3.47, radiantDecDeg: 13, start: { month: 9, day: 10 }, peak: { month: 10, day: 10 }, end: { month: 11, day: 20 }, peakZhr: 5, velocityKmS: 27, populationIndex: 2.3 },
  { id: "draconids", code: "DRA", name: { en: "October Draconids", fr: "Draconides d'octobre" }, radiantRaHours: 17.47, radiantDecDeg: 54, start: { month: 10, day: 6 }, peak: { month: 10, day: 8 }, end: { month: 10, day: 10 }, peakZhr: 10, velocityKmS: 20, populationIndex: 2.6 },
  { id: "orionids", code: "ORI", name: { en: "Orionids", fr: "Orionides" }, radiantRaHours: 6.35, radiantDecDeg: 15.6, start: { month: 10, day: 2 }, peak: { month: 10, day: 21 }, end: { month: 11, day: 7 }, peakZhr: 20, velocityKmS: 66, populationIndex: 2.5 },
  { id: "northern-taurids", code: "NTA", name: { en: "Northern Taurids", fr: "Taurides du Nord" }, radiantRaHours: 3.87, radiantDecDeg: 22, start: { month: 10, day: 20 }, peak: { month: 11, day: 12 }, end: { month: 12, day: 10 }, peakZhr: 5, velocityKmS: 29, populationIndex: 2.3 },
  { id: "leonids", code: "LEO", name: { en: "Leonids", fr: "Léonides" }, radiantRaHours: 10.13, radiantDecDeg: 21.6, start: { month: 11, day: 6 }, peak: { month: 11, day: 17 }, end: { month: 11, day: 30 }, peakZhr: 15, velocityKmS: 71, populationIndex: 2.5 },
  { id: "geminids", code: "GEM", name: { en: "Geminids", fr: "Géminides" }, radiantRaHours: 7.47, radiantDecDeg: 32.3, start: { month: 12, day: 4 }, peak: { month: 12, day: 14 }, end: { month: 12, day: 17 }, peakZhr: 150, velocityKmS: 35, populationIndex: 2.6 },
  { id: "ursids", code: "URS", name: { en: "Ursids", fr: "Ursides" }, radiantRaHours: 14.47, radiantDecDeg: 75.3, start: { month: 12, day: 17 }, peak: { month: 12, day: 22 }, end: { month: 12, day: 26 }, peakZhr: 10, velocityKmS: 33, populationIndex: 3 }
]

/** A naked-eye limiting magnitude for a genuinely dark, moonless country sky — the reference the
 * zenithal rate is defined against, and what observedRatePerHour falls back to when nothing better
 * is known. A suburban sky is nearer 5, a city one nearer 4, and each magnitude lost cuts the rate
 * by the population index. */
export const DARK_SKY_LIMITING_MAGNITUDE = 6.5

export class MeteorShowers {
  /**
   * Which showers were running on this date, and how strong each had become.
   *
   * The date's YEAR is ignored on purpose: a shower is a position in the Earth's orbit, so it
   * recurs. That is exactly what makes this the one candidate with complete historical coverage.
   */
  static activeAt(date: Date): ActiveShower[] {
    return METEOR_SHOWERS.flatMap(shower => {
      const nearness = this.nearness(shower, date)
      return nearness <= 0 ? [] : [{ shower, zhr: shower.peakZhr * nearness, nearness }]
    })
  }

  /**
   * How far into its activity the shower had come, from 0 at either edge of the window to 1 on the
   * night of the peak.
   *
   * A straight ramp on each side. The real profile is a good deal sharper than that — most showers
   * put the bulk of their activity into a night or two — so this OVERSTATES the rate away from the
   * peak, which is the safe direction for a candidate explanation: it never quietly rules a shower
   * out. Named here rather than buried so it can be sharpened when a case needs it to be.
   */
  static nearness(shower: MeteorShower, date: Date): number {
    const day = this.dayOfYear(date)
    const start = this.dayOfYear(this.asDate(shower.start))
    const peak = this.dayOfYear(this.asDate(shower.peak))
    const end = this.dayOfYear(this.asDate(shower.end))
    const sincePeak = this.wrappedDelta(day, peak)
    const beforePeak = this.wrappedDelta(peak, start)
    const afterPeak = this.wrappedDelta(end, peak)
    if (sincePeak < 0) return sincePeak < -beforePeak ? 0 : 1 + sincePeak / beforePeak
    if (sincePeak > 0) return sincePeak > afterPeak ? 0 : 1 - sincePeak / afterPeak
    return 1
  }

  /**
   * How many a real observer would actually have seen per hour — the number worth quoting, and
   * usually a small fraction of the zenithal rate.
   *
   * `HR = ZHR · sin(h) / r^(6.5 − lm)`, the standard correction: the sine of the radiant's altitude
   * (a radiant halfway up the sky yields half the meteors, one on the horizon none at all), and the
   * population index raised to however many magnitudes of sky the observer has lost to moonlight,
   * cloud, or town.
   *
   * Returns 0 for a radiant at or below the horizon, which is a statement in its own right: a
   * shower whose radiant had not risen cannot be what anybody saw.
   */
  static observedRatePerHour(zhr: number, radiantAltitudeDeg: number, populationIndex: number, limitingMagnitude = DARK_SKY_LIMITING_MAGNITUDE): number {
    if (radiantAltitudeDeg <= 0) return 0
    const lost = DARK_SKY_LIMITING_MAGNITUDE - limitingMagnitude
    return (zhr * Math.sin((radiantAltitudeDeg * Math.PI) / 180)) / Math.pow(populationIndex, lost)
  }

  /** Where a shower's radiant stood in the observer's own sky — altitude and azimuth, through the
   * same conversion every other body in this scene goes through. */
  static radiantPosition(shower: MeteorShower, date: Date, observer: ObserverGeo) {
    return equatorialToHorizontal(shower.radiantRaHours, shower.radiantDecDeg, date, observer)
  }

  /** Day of the year, 1 to 366, in UTC. */
  private static dayOfYear(date: Date): number {
    const start = Date.UTC(date.getUTCFullYear(), 0, 1)
    return Math.floor((Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - start) / 86_400_000) + 1
  }

  /** A month/day placed in a non-leap year, purely to be turned into a day number. */
  private static asDate(when: MonthDay): Date {
    return new Date(Date.UTC(2001, when.month - 1, when.day))
  }

  /** Days from `from` to `to`, taking the shorter way round the year — so 2 January is three days
   * after 30 December, not three hundred and sixty-two before it. Without this every window that
   * crosses the new year (the Quadrantids, the Ursids' tail) would read as spanning the whole year
   * backwards. */
  private static wrappedDelta(to: number, from: number): number {
    const raw = to - from
    if (raw > 182) return raw - 365
    if (raw < -182) return raw + 365
    return raw
  }
}
