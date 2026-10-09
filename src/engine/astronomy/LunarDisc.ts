import * as Astronomy from "astronomy-engine"
import type { ObserverGeo } from "./CelestialPositions.js"

/**
 * The size the Moon really has in the sky, which is not constant: its orbit is an ellipse, and from
 * perigee to apogee its distance goes from about 357 000 km to 406 000 km, so its disc from 0.559° to
 * 0.490° across — the 14 % that "a supermoon" is made of, and all of it. The Moon next to the horizon
 * is no bigger than the Moon overhead (a camera measures the same disc): the larger look it has is a
 * trick of the mind, and not drawn.
 *
 * Distance is the observer's own, topocentric: a Moon on the horizon is a whole Earth radius (6%)
 * farther than a Moon at the zenith, and so a little SMALLER there, which is the opposite of what
 * people say of it.
 */
export class LunarDisc {
  private static readonly MOON_RADIUS_KM = 1737.4
  private static readonly AU_KM = 149_597_870.7
  /** The disc at the Moon's mean distance (384 400 km): 0.518° across. */
  static readonly MEAN_RADIUS_DEG = (Math.asin(LunarDisc.MOON_RADIUS_KM / 384_400) * 180) / Math.PI
  /**
   * A full Moon this close to perigee is what is called a supermoon: within 90 % of the way from the
   * mean distance to the perigee's, the usual definition (Nolle, 1979) — here, a distance under
   * 361 800 km.
   */
  static readonly SUPERMOON_DISTANCE_KM = 361_800
  /** The far end of it, the same distance as measured from the other side of the mean — a "micromoon". */
  static readonly MICROMOON_DISTANCE_KM = 405_000

  /** The Moon's distance from this place, kilometres. */
  static distanceKm(date: Date, observer: ObserverGeo): number {
    const place = new Astronomy.Observer(observer.lat, observer.lng, observer.elevationM)
    return Astronomy.Equator(Astronomy.Body.Moon, date, place, true, true).dist * LunarDisc.AU_KM
  }

  /** Angular radius of the Moon's disc from this place, degrees. */
  static apparentRadiusDeg(date: Date, observer: ObserverGeo): number {
    return LunarDisc.radiusAtKm(LunarDisc.distanceKm(date, observer))
  }

  static radiusAtKm(distanceKm: number): number {
    return (Math.asin(LunarDisc.MOON_RADIUS_KM / distanceKm) * 180) / Math.PI
  }

  /** How much wider than at its mean distance a disc of this radius is: +0.08 is 8 % wider. */
  static relativeToMean(radiusDeg: number): number {
    return radiusDeg / LunarDisc.MEAN_RADIUS_DEG - 1
  }
}
