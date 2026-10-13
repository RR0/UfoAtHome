/**
 * How many of the windows of a town are lit, by the hour on the clock and by how dark it is.
 *
 * People light a window when they are up and at home: all the evening, fewer at midnight, almost none at three in the morning (the
 * few that are, are a bathroom, a night shift, a baby), then more as people get up. The shares below are of the order a town's lit windows
 * show from a street at those hours; they are a plausible habit, not a measure, and the hour is that of the clock, which a recording states with its
 * offset from UTC (summer time included), not the Sun's: a town is not up by the Sun.
 *
 * By day none is seen as lit whatever the hour, because the Sun makes a lit window invisible: the share is that of the hour times how dark it is.
 */
export class WindowLighting {
  /** The share of windows lit at each whole hour of the clock, from midnight: evening peak, night trough, a morning rise. */
  private static readonly BY_HOUR = [0.2, 0.12, 0.07, 0.05, 0.05, 0.1, 0.25, 0.3, 0.2, 0.1, 0.08, 0.08, 0.08, 0.08, 0.08, 0.1, 0.15, 0.3, 0.42, 0.5, 0.52, 0.5, 0.4, 0.28]
  /** What it is taken to be where the hour of the clock is not known: a little under the mean of an evening. */
  static readonly UNKNOWN_HOUR = 0.16
  /** The Sun's altitude at which lit windows begin to be told from the day, and the one at which they show in full: dusk, and the end of twilight. */
  static readonly DUSK_DEG = -1
  static readonly NIGHT_DEG = -9

  /** The share of windows lit at this hour (0 up to 24, fractions allowed), interpolated between the hours. */
  static shareAt(clockHour: number | undefined): number {
    if (clockHour === undefined || !Number.isFinite(clockHour)) return WindowLighting.UNKNOWN_HOUR
    const hour = ((clockHour % 24) + 24) % 24
    const before = Math.floor(hour)
    const fraction = hour - before
    const shares = WindowLighting.BY_HOUR
    return shares[before] + (shares[(before + 1) % 24] - shares[before]) * fraction
  }

  /** 0 by day, 1 once the twilight is over, a ramp between. */
  static darknessAt(sunAltitudeDeg: number): number {
    return Math.max(0, Math.min(1, (WindowLighting.DUSK_DEG - sunAltitudeDeg) / (WindowLighting.DUSK_DEG - WindowLighting.NIGHT_DEG)))
  }

  /** The share of windows lit at this hour of the clock under a Sun at this altitude. */
  static share(sunAltitudeDeg: number, clockHour: number | undefined): number {
    return WindowLighting.darknessAt(sunAltitudeDeg) * WindowLighting.shareAt(clockHour)
  }
}
