import * as Astronomy from "astronomy-engine"
import type { HorizontalPosition, ObserverGeo } from "./CelestialPositions.js"

/**
 * How much of the Sun the Moon hides, from one place at one instant — worked out from the two
 * bodies' own topocentric positions and distances, and from nothing else: no eclipse is ever listed
 * or declared, so any observation whose date and place line the two up shows it.
 *
 * Topocentric is the point. The Moon is close enough for the observer's place on the Earth to move
 * it by up to a degree against the Sun, which is two of its own diameters: seen from the centre of
 * the Earth the same instant would be no eclipse at all, or a different one.
 */
export interface SolarEclipseView {
  /** Angular radius of the Sun's disc as seen from here, in degrees (0.2625 in July to 0.2712 in January). */
  sunRadiusDeg: number
  /** Angular radius of the Moon's disc as seen from here, in degrees (0.245 at apogee to 0.2795 at perigee). */
  moonRadiusDeg: number
  /** Angle between the two discs' centres, in degrees. */
  separationDeg: number
  /** Share of the Sun's disc AREA that the Moon hides, 0..1 — what governs the light that arrives. */
  obscuration: number
  /** Share of the Sun's DIAMETER covered, 0..1 and beyond: above 1 the Moon's disc is wider than the Sun's and totality lasts. */
  magnitude: number
}

export class SolarEclipse {
  private static readonly SUN_RADIUS_KM = 695_700
  private static readonly MOON_RADIUS_KM = 1737.4
  private static readonly AU_KM = 149_597_870.7
  /** Beyond this, with both radii at their largest, the discs cannot touch: nothing to compute. */
  static readonly MAX_SEPARATION_DEG = 0.6

  /**
   * What the corona itself adds to the daylight once the disc is hidden: about the light of a full
   * Moon, 1.5 millionths of the Sun's. The beam never falls below it, however total the eclipse.
   */
  static readonly CORONA_LIGHT = 1.5e-6
  /**
   * What the sky keeps at totality, as a share of its ordinary light: a ten-thousandth. A sky lit by
   * the Sun's beam alone would go to the millionth, and it does not, because the Moon's shadow is a
   * couple of hundred kilometres across and the air beyond its edge, lit as usual, scatters light
   * into it from all round the horizon. Photometry of totality skies (Winkler et al. on this very
   * eclipse of 1999) puts the zenith between a thousandth and a hundred-thousandth of a midday
   * sky's, the horizon brighter; this takes a value in that range (SUPPOSED). The glow's colour, the
   * orange ring on the horizon, is not drawn yet.
   */
  static readonly UMBRA_SKY_LIGHT = 1e-4

  /** Share of the Sun's beam that reaches the observer: what the Moon leaves of the disc, plus the corona. */
  static beamFraction(view: SolarEclipseView | undefined): number {
    if (!view) return 1
    return Math.max(1 - view.obscuration, SolarEclipse.CORONA_LIGHT)
  }

  /** Share of the sky's ordinary daylight that remains: the beam's share, but never less than what the air outside the shadow sends in. */
  static skyFraction(view: SolarEclipseView | undefined): number {
    if (!view) return 1
    return Math.max(1 - view.obscuration, SolarEclipse.UMBRA_SKY_LIGHT)
  }

  /** The angle between two directions given as altitude and azimuth, in degrees — cheap enough to ask before the ephemeris is. */
  static separationOf(a: HorizontalPosition, b: HorizontalPosition): number {
    const rad = Math.PI / 180
    const h = Math.sin(((b.altitudeDeg - a.altitudeDeg) * rad) / 2) ** 2
      + Math.cos(a.altitudeDeg * rad) * Math.cos(b.altitudeDeg * rad) * Math.sin(((b.azimuthDeg - a.azimuthDeg) * rad) / 2) ** 2
    return (2 * Math.asin(Math.min(1, Math.sqrt(h))) * 180) / Math.PI
  }

  /** The Moon's disc against the Sun's from this place, or undefined when they are too far apart to touch. */
  static viewAt(date: Date, observer: ObserverGeo): SolarEclipseView | undefined {
    const place = new Astronomy.Observer(observer.lat, observer.lng, observer.elevationM)
    // Of date, with aberration: the same call computeBodyPosition makes, so the discs drawn and the
    // overlap computed here are the same two discs.
    const sun = Astronomy.Equator(Astronomy.Body.Sun, date, place, true, true)
    const moon = Astronomy.Equator(Astronomy.Body.Moon, date, place, true, true)
    const separationDeg = SolarEclipse.equatorialSeparationOf(sun, moon)
    if (separationDeg > SolarEclipse.MAX_SEPARATION_DEG) return undefined
    const sunRadiusDeg = SolarEclipse.radiusDeg(SolarEclipse.SUN_RADIUS_KM, sun.dist)
    const moonRadiusDeg = SolarEclipse.radiusDeg(SolarEclipse.MOON_RADIUS_KM, moon.dist)
    if (separationDeg >= sunRadiusDeg + moonRadiusDeg) return undefined
    return {
      sunRadiusDeg,
      moonRadiusDeg,
      separationDeg,
      obscuration: SolarEclipse.overlap(sunRadiusDeg, moonRadiusDeg, separationDeg),
      magnitude: (sunRadiusDeg + moonRadiusDeg - separationDeg) / (2 * sunRadiusDeg)
    }
  }

  /** Share of the area of a disc of radius `sun` that a disc of radius `moon`, `separation` away, covers. */
  static overlap(sun: number, moon: number, separation: number): number {
    if (separation >= sun + moon) return 0
    if (separation <= Math.abs(sun - moon)) return moon >= sun ? 1 : (moon / sun) ** 2
    // Two circles' lens: each circular segment is its sector less its triangle.
    const a = Math.acos((separation * separation + sun * sun - moon * moon) / (2 * separation * sun))
    const b = Math.acos((separation * separation + moon * moon - sun * sun) / (2 * separation * moon))
    const lens = sun * sun * (a - Math.sin(2 * a) / 2) + moon * moon * (b - Math.sin(2 * b) / 2)
    return lens / (Math.PI * sun * sun)
  }

  private static radiusDeg(radiusKm: number, distanceAu: number): number {
    return (Math.asin(radiusKm / (distanceAu * SolarEclipse.AU_KM)) * 180) / Math.PI
  }

  private static equatorialSeparationOf(a: Astronomy.EquatorialCoordinates, b: Astronomy.EquatorialCoordinates): number {
    const rad = Math.PI / 180
    const ra1 = a.ra * 15 * rad
    const ra2 = b.ra * 15 * rad
    const dec1 = a.dec * rad
    const dec2 = b.dec * rad
    // The haversine form, since the angle is a fraction of a degree and the cosine of it is not
    // a number one can take an arccosine of without losing what is being measured.
    const h = Math.sin((dec2 - dec1) / 2) ** 2 + Math.cos(dec1) * Math.cos(dec2) * Math.sin((ra2 - ra1) / 2) ** 2
    return (2 * Math.asin(Math.min(1, Math.sqrt(h))) * 180) / Math.PI
  }
}
