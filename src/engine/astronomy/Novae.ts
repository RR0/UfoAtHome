import { HorizontalFrame } from "./CelestialPositions.js"
import type { HorizontalPosition, ObserverGeo } from "./CelestialPositions.js"
import { STELLAR_OUTBURSTS } from "./novaCatalog.js"
import type { StellarOutburst } from "./novaCatalog.js"

/**
 * The novae and supernovae, and what one of them looked like from a given place on a given night.
 *
 * The third of the dated candidates, after the meteor showers and the comets, and the simplest of
 * them: a new star does not move. It stands at a fixed right ascension and declination, so where it
 * was in the observer's sky is the same arithmetic as for any star in the catalogue, precession
 * included — which matters, since SN 1006 stood 14° from where its J2000 coordinates would put it
 * in that year's sky.
 *
 * What changes is its brightness, and here the division is the comets' own:
 *
 * - WHERE it was is known, to an arcsecond: the remnant or the old nova is still there.
 * - HOW BRIGHT it was is a light curve out of the catalog, interpolated in magnitude between its
 *   dated points and SILENT OUTSIDE THEM. Before the first point nobody had looked, or nobody had
 *   written it down, and a star that would have been bright enough to see is not drawn on a night
 *   no record covers: the rise of most novae took a day or two that nobody watched. After the last
 *   point the catalogue has nothing, and neither does this.
 *
 * How good each curve is varies by two orders of magnitude, from the AAVSO's daily bins for a 1975
 * nova to three chronicled dates for 1181, and each catalog entry says which it is (see
 * scripts/build-nova-catalog.ts). A novice reading "magnitude -6" for SN 1054 is owed the source.
 *
 * NOT MODELLED: colour. A nova near its peak is white; weeks later its light is dominated by
 * hydrogen-alpha and reads pinkish through a telescope, but by then it is too faint for the eye to
 * see colour in. Tycho did record his star turning from white to yellow and red, and that is in his
 * record rather than in this one.
 */
export interface OutburstAppearance {
  outburst: StellarOutburst
  /** Where it stood in the observer's own sky. */
  position: HorizontalPosition
  /** Interpolated apparent visual magnitude. */
  magnitude: number
}

export class Novae {
  /** The Julian day of 1970-01-01T00:00Z, which turns a Date's milliseconds into a Julian day. */
  private static readonly UNIX_EPOCH_JD = 2440587.5

  /** The outbursts whose curve covers that instant — almost always none. */
  static aroundDate(date: Date): StellarOutburst[] {
    const julianDay = this.julianDayOf(date)
    return STELLAR_OUTBURSTS.filter(outburst => this.magnitudeAt(outburst, julianDay) !== undefined)
  }

  /**
   * Every outburst in that sky, brightest first, and without regard to whether it had risen: a
   * reader is owed "SN 1987A was there, below the horizon" rather than silence, and a caller that
   * wants only what could be seen checks the altitude and the sky's own limit itself.
   */
  static appearancesAt(date: Date, observer: ObserverGeo): OutburstAppearance[] {
    const julianDay = this.julianDayOf(date)
    const appearances: OutburstAppearance[] = []
    for (const outburst of STELLAR_OUTBURSTS) {
      const magnitude = this.magnitudeAt(outburst, julianDay)
      if (magnitude === undefined) continue
      appearances.push({ outburst, position: HorizontalFrame.ofJ2000(outburst.raHours, outburst.decDeg, date, observer), magnitude })
    }
    return appearances.sort((a, b) => a.magnitude - b.magnitude)
  }

  static brightestAt(date: Date, observer: ObserverGeo): OutburstAppearance | undefined {
    return this.appearancesAt(date, observer)[0]
  }

  static byId(id: string): StellarOutburst | undefined {
    return STELLAR_OUTBURSTS.find(outburst => outburst.id === id)
  }

  /**
   * The visual magnitude on that Julian day, or undefined where the curve says nothing.
   *
   * Linear in MAGNITUDE between points, which is linear in the logarithm of the flux: a nova's
   * decline and a supernova's radioactive tail are both close to straight lines on that scale, and
   * a linear interpolation of the flux itself would bow every segment toward the brighter end.
   */
  static magnitudeAt(outburst: StellarOutburst, julianDay: number): number | undefined {
    const curve = outburst.lightCurve
    const days = julianDay - outburst.startJd
    if (curve.length === 0 || days < curve[0][0] || days > curve[curve.length - 1][0]) return undefined
    let upper = 1
    while (upper < curve.length - 1 && curve[upper][0] < days) upper++
    const [fromDays, fromMagnitude] = curve[upper - 1] ?? curve[0]
    const [toDays, toMagnitude] = curve[upper] ?? curve[0]
    if (toDays === fromDays) return fromMagnitude
    const fraction = Math.min(1, Math.max(0, (days - fromDays) / (toDays - fromDays)))
    return fromMagnitude + fraction * (toMagnitude - fromMagnitude)
  }

  /** The Julian day in Universal Time. A light curve is dated to a fraction of a day at best, so the
   * minute of delta-T that the comets take into account is below anything here. */
  static julianDayOf(date: Date): number {
    return date.getTime() / 86400000 + this.UNIX_EPOCH_JD
  }
}
