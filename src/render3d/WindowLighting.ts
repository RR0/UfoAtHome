/**
 * How many of the windows of a town are lit, by the hour on the clock and by how dark it is.
 *
 * A window is lit when somebody is up behind it, so the share of lit windows follows the share of people who are awake, which the French
 * time-use survey (INSEE, Enquête Emploi du temps 2009-2010) gives in the points this uses:
 *
 * - the median bedtime of couples is 22h30 to 22h45 (22h40 for the longest and shortest synchronised nights), and the median rising time
 *   6h50 to 8h00 (about 7h00): half of the people are asleep at 22h40, half are up at 7h;
 * - "between 1h00 and 6h00, nine people in ten are asleep" (Rauch, Inégalités sociales et désynchronisation du sommeil au sein des couples,
 *   Économie et statistique 522-523, 2021, from the same survey).
 *
 * Between those points the survey does not publish the curve, so it is drawn as the two moments being spread normally round their medians: going
 * to bed, with a spread of 1h12 (which puts 97% of people asleep at 1h, within the "nine in ten"), and rising, with one of 42 minutes (which keeps nine in ten asleep until 6h, as the survey has it). That spread
 * is an assumption, as are the other two numbers below: that two in a hundred are up at any hour of the night (a night shift, a baby, a
 * sleepless one), and that when everybody is up half of the windows of a town are lit (there are windows nobody is behind, and rooms at the back). The
 * hour is that of the clock, which a recording states with its offset from UTC (summer time included), not the Sun's: a town is not up by the Sun.
 *
 * By day none is seen as lit whatever the hour, because the Sun makes a lit window invisible: the share is that of the hour times how dark it is.
 */
export class WindowLighting {
  /** The median bedtime and rising time of the survey, as hours of the clock, and how far people are spread round them (assumed). */
  static readonly MEDIAN_BEDTIME = 22 + 40 / 60
  static readonly MEDIAN_RISING = 7
  private static readonly BEDTIME_SPREAD_H = 1.2
  private static readonly RISING_SPREAD_H = 0.7
  /** The share of people up at any hour of the night, whatever the median says (assumed). */
  static readonly ALWAYS_UP = 0.02
  /** The share of windows lit when everybody is up (assumed). */
  static readonly LIT_WHEN_ALL_UP = 0.5
  /** What it is taken to be where the hour of the clock is not known: a little under the mean of an evening. */
  static readonly UNKNOWN_HOUR = 0.16
  /** The Sun's altitude at which lit windows begin to be told from the day, and the one at which they show in full: dusk, and the end of twilight. */
  static readonly DUSK_DEG = -1
  static readonly NIGHT_DEG = -9

  /** The share of people awake at this hour of the clock (0 up to 24, wrapped), from the medians of the survey. */
  static awakeAt(clockHour: number): number {
    const hour = ((clockHour % 24) + 24) % 24
    // Those who have gone to bed by now (after midnight is the same evening's bedtime, a day on), and have not yet got up.
    const bedtimes = WindowLighting.normal(((hour < 12 ? hour + 24 : hour) - WindowLighting.MEDIAN_BEDTIME) / WindowLighting.BEDTIME_SPREAD_H)
    const risen = WindowLighting.normal((hour - WindowLighting.MEDIAN_RISING) / WindowLighting.RISING_SPREAD_H)
    // In the evening the morning is still to come: nobody has risen from this night's sleep yet.
    const asleep = bedtimes * (hour < 12 ? 1 - risen : 1)
    return Math.max(WindowLighting.ALWAYS_UP, 1 - asleep)
  }

  /** The share of windows lit at this hour (0 up to 24, fractions allowed). */
  static shareAt(clockHour: number | undefined): number {
    if (clockHour === undefined || !Number.isFinite(clockHour)) return WindowLighting.UNKNOWN_HOUR
    return WindowLighting.LIT_WHEN_ALL_UP * WindowLighting.awakeAt(clockHour)
  }

  /** 0 by day, 1 once the twilight is over, a ramp between. */
  static darknessAt(sunAltitudeDeg: number): number {
    return Math.max(0, Math.min(1, (WindowLighting.DUSK_DEG - sunAltitudeDeg) / (WindowLighting.DUSK_DEG - WindowLighting.NIGHT_DEG)))
  }

  /** The share of windows lit at this hour of the clock under a Sun at this altitude. */
  static share(sunAltitudeDeg: number, clockHour: number | undefined): number {
    return WindowLighting.darknessAt(sunAltitudeDeg) * WindowLighting.shareAt(clockHour)
  }

  /** The standard normal distribution function (Abramowitz and Stegun 7.1.26, an error under 1.5e-7). */
  private static normal(z: number): number {
    const x = Math.abs(z) / Math.SQRT2
    const t = 1 / (1 + 0.3275911 * x)
    const erf = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x)
    return z >= 0 ? 0.5 * (1 + erf) : 0.5 * (1 - erf)
  }
}
