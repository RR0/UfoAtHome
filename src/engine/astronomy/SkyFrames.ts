import { equatorialToHorizontal, type HorizontalPosition, type ObserverGeo } from "./CelestialPositions.js"

/**
 * Where the fixed planes of the sky stand, from where the witness is standing.
 *
 * Every star this project draws is placed one at a time, by its own right ascension and
 * declination. The Milky Way and the zodiacal light cannot be placed that way — they are not
 * objects but whole coordinate systems' worth of brightness, computed once in the frame they are
 * naturally still in (the plane of the Galaxy; the plane of the planets) and then TURNED to face
 * the witness. Turning them needs the frame itself, not a position, and that is what this hands
 * back: the directions the axes of those frames point in, in the witness's own sky.
 *
 * Done by putting each axis through the very same right-ascension-to-altitude transform the star
 * field uses, rather than by composing rotation matrices by hand. That is deliberate: the
 * precession, nutation and sidereal time that decide where the galactic plane cuts a 1954 horizon
 * are already solved inside that call, and a hand-built matrix would have to solve them again and
 * could only agree with the star field by luck. Three directions through one trusted door.
 */
export class SkyFrames {
  /**
   * The galactic frame, as right ascension and declination — the IAU 1958 definition carried to
   * J2000.
   *
   * Three axes rather than the usual two, because what is wanted here is a whole basis and deriving
   * the third by a cross product would quietly decide a handedness this code has no business
   * deciding. All three go through the same transform, so whatever the transform does to
   * orientation it does to all of them alike, and the frame that comes out the far side is
   * consistent with itself.
   */
  static readonly GALACTIC_CENTRE = { raHours: 266.40510 / 15, decDeg: -28.936175 }
  /** Galactic longitude 90, in the direction the disc turns. */
  static readonly GALACTIC_ROTATION = { raHours: 318.00448 / 15, decDeg: 48.32964 }
  static readonly GALACTIC_POLE = { raHours: 192.85948 / 15, decDeg: 27.12825 }

  /**
   * The pole of the ecliptic: right ascension eighteen hours, declination the complement of the
   * obliquity of the Earth's own axis.
   *
   * Only the pole, and not a full basis, because the dust cloud is symmetric about both the plane
   * of the ecliptic and the plane through the Sun perpendicular to it. Its other axis is the Sun's
   * own longitude, which changes daily and is read off the Sun's real position rather than stated
   * here.
   */
  static readonly ECLIPTIC_POLE = { raHours: 18, decDeg: 90 - 23.439291 }

  static galactic(date: Date, observer: ObserverGeo): { centre: HorizontalPosition; rotation: HorizontalPosition; pole: HorizontalPosition } {
    return {
      centre: SkyFrames.at(SkyFrames.GALACTIC_CENTRE, date, observer),
      rotation: SkyFrames.at(SkyFrames.GALACTIC_ROTATION, date, observer),
      pole: SkyFrames.at(SkyFrames.GALACTIC_POLE, date, observer)
    }
  }

  static eclipticPole(date: Date, observer: ObserverGeo): HorizontalPosition {
    return SkyFrames.at(SkyFrames.ECLIPTIC_POLE, date, observer)
  }

  /**
   * Refraction deliberately OFF, unlike the star field's own placement.
   *
   * A refracted sky is not a rotated sky: the air lifts a direction near the horizon by half a
   * degree and leaves the zenith alone, so three axes put through it come back no longer at right
   * angles to each other, and a basis that is not orthogonal is not a frame. The half degree it
   * costs is beneath noticing on an object tens of degrees wide — and the stars drawn ON that band
   * keep their own refraction, which is where it actually shows.
   */
  private static at(equatorial: { raHours: number; decDeg: number }, date: Date, observer: ObserverGeo): HorizontalPosition {
    return equatorialToHorizontal(equatorial.raHours, equatorial.decDeg, date, observer, false)
  }
}
