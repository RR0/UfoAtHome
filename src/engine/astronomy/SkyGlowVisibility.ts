import { MilkyWay } from "./MilkyWay.js"
import { ZodiacalLight } from "./ZodiacalLight.js"
import { SkyFrames } from "./SkyFrames.js"
import { computeBodyPosition, computeMoonPhase, type HorizontalPosition, type ObserverGeo } from "./CelestialPositions.js"
import { NightSkyBrightness } from "../atmosphere/NightSkyBrightness.js"
import { SurfaceBrightness } from "./SurfaceBrightness.js"

/** What one of the two glows was worth, at the best place in the sky it had. */
export interface GlowSighting {
  /** How many times the sky's own brightness it added there. Under about a fifth, nobody sees it. */
  contrast: number
  /** Where its best patch stood. */
  altitudeDeg: number
  azimuthDeg: number
  /** Its own surface brightness there, in magnitudes per square arcsecond. */
  magPerArcsec2: number
  /** How far round from the Sun it stood. For the zodiacal light this is the whole difference
   * between the two sights it can be: a leaning CONE close in, which is the one witnesses report,
   * and the faint BAND that runs on round the rest of the ecliptic, which nobody has ever mistaken
   * for anything because nobody notices it. */
  sunSeparationDeg: number
  /** And what the sky it stood on was worth, in the same unit — the number that decides everything. */
  skyMagPerArcsec2: number
}

/**
 * Whether a witness standing there, then, could have seen the Milky Way or the zodiacal light —
 * and if not, which of the four things that hide them was in the way.
 *
 * The renderer draws both onto a whole sky and lets a reader look; this answers the same question in
 * one sentence, for the line in the editor that states what else was up there. Same models, same
 * anchors, same sky brightness: two ways of saying one thing, never two models of it.
 *
 * WHY IT IS WORTH SAYING AT ALL, for the zodiacal light especially: it is a cone of light with no
 * edge, standing where the Sun set, gone an hour later, and unfamiliar enough that people who see it
 * for the first time reach for other explanations. That is a candidate. And the negative answers are
 * as useful as the positive ones — a report of a strange glow in the west on a night the Moon was
 * up and full is a report of something else, and this says so.
 *
 * Coarse on purpose. The sky is swept every few degrees rather than mapped, because the answer
 * wanted is "was there one, how strong, and roughly where", not a picture — and a sweep this size
 * costs a couple of milliseconds, which a line that is restated on every keystroke of an edit has
 * to care about.
 */
export class SkyGlowVisibility {
  /**
   * The sweep is done twice: once coarsely over the whole sky to find where each glow is, and then
   * finely around each answer to find how strong it really is there.
   *
   * BOTH FASTER AND SHARPER than one even sweep, which is unusual enough to say why. A single
   * five-degree sweep costs thirteen hundred lines of sight and still lands its samples arbitrarily
   * with respect to the one sharp feature either model has — the dark rift, a couple of degrees
   * wide, straight down the middle of the brightest part of the band. Sampling ten degrees apart and
   * then two degrees apart around the winner costs half as much and puts its fine samples exactly
   * where the answer is.
   */
  private static readonly COARSE_STEP_DEG = 10
  private static readonly FINE_STEP_DEG = 2
  private static readonly FINE_SPAN_DEG = 10
  /** Below this the sweep does not look: the air has taken most of it and the ground is usually in
   * the way. */
  private static readonly LOWEST_DEG = 5

  /**
   * How much brighter than its background a diffuse glow has to be before an eye finds it.
   *
   * Half again, and it is anchored on the one fact everybody who has looked knows: the brightest
   * cloud of the Milky Way is 21.0 magnitudes a square arcsecond, and the Milky Way is lost from a
   * sky of 21.0. That is a contrast of one — so half of one is already a generous threshold, and
   * generous is the right side to err on, since this line's job is to say what was POSSIBLE and not
   * to decide for a reader what somebody noticed.
   *
   * It was a fifth before it was measured against anything, and a fifth announced the Milky Way on
   * a night three days past full Moon, which is a night nobody has ever seen it.
   */
  static readonly THRESHOLD_CONTRAST = 0.5

  /** Under this much of the sky it stood on, the zodiacal light is the band that circles the whole
   * ecliptic rather than the cone standing over the sunset — a different sight, and only the second
   * one is ever reported as anything. */
  static readonly CONE_SEPARATION_DEG = 60

  private readonly galaxy = new MilkyWay()
  private readonly dust = new ZodiacalLight()

  /**
   * Sweeps the sky above the witness and keeps, for each glow, the patch that stood out most
   * against the sky it was on.
   *
   * The best CONTRAST and not the brightest patch, which are not the same question and where they
   * differ the contrast is the one that decides what was seen: the foot of the zodiacal cone is by
   * far the brightest thing either model puts in the sky, and it stands in the brightest part of a
   * twilit sky, so it is often not the part a witness would have picked out.
   */
  assess(date: Date, observer: ObserverGeo): {
    milkyWay?: GlowSighting
    zodiacal?: GlowSighting
    /** The faintest the sky got anywhere the sweep looked — what a witness had to work against at
     * best. It is what says WHY, when the answer is that there was nothing to see: past 21 or so it
     * is the sky that was in the way, and under it something else was. */
    darkestSkyMagPerArcsec2: number
  } {
    const sun = computeBodyPosition("Sun", date, observer)
    const moonPosition = computeBodyPosition("Moon", date, observer)
    const moon = {
      altitudeDeg: moonPosition.altitudeDeg,
      phaseAngleDeg: NightSkyBrightness.phaseAngleOf(computeMoonPhase(date).illuminatedFraction)
    }
    const axes = SkyFrames.galactic(date, observer)
    const centre = SkyGlowVisibility.unit(axes.centre)
    const rotation = SkyGlowVisibility.unit(axes.rotation)
    const pole = SkyGlowVisibility.unit(axes.pole)
    const eclipticPole = SkyGlowVisibility.unit(SkyFrames.eclipticPole(date, observer))
    const sunDirection = SkyGlowVisibility.unit(sun)
    const moonDirection = SkyGlowVisibility.unit(moonPosition)
    // The Sun's own longitude on the ecliptic: itself, less the part sticking out of that plane.
    const sunLongitude = SkyGlowVisibility.normalize(
      SkyGlowVisibility.reject(sunDirection, eclipticPole)
    )

    let milkyWay: GlowSighting | undefined
    let zodiacal: GlowSighting | undefined
    let darkestSkyMagPerArcsec2 = 0

    const at = (altitudeDeg: number, azimuthDeg: number): void => {
      const look = SkyGlowVisibility.unit({ altitudeDeg, azimuthDeg })
      const fromSun = SkyGlowVisibility.between(look, sunDirection)
      const skyMag = NightSkyBrightness.magPerArcsec2(
        { altitudeDeg: sun.altitudeDeg, separationDeg: fromSun },
        { ...moon, separationDeg: SkyGlowVisibility.between(look, moonDirection) },
        altitudeDeg
      )
      if (skyMag > darkestSkyMagPerArcsec2) darkestSkyMagPerArcsec2 = skyMag
      const skyS10 = SurfaceBrightness.fromMagPerArcsec2(skyMag)
      // The same magnitudes the shader takes out of a glow standing in that much air.
      const through =
        10 **
        (-0.4 * NightSkyBrightness.EXTINCTION_PER_AIR_MASS * (NightSkyBrightness.airMass(altitudeDeg) - 1))

      const bandS10 =
        this.galaxy.surfaceBrightnessS10(
          (Math.atan2(SkyGlowVisibility.dot(look, rotation), SkyGlowVisibility.dot(look, centre)) * 180) / Math.PI,
          (Math.asin(Math.max(-1, Math.min(1, SkyGlowVisibility.dot(look, pole)))) * 180) / Math.PI
        ) * through
      milkyWay = SkyGlowVisibility.better(milkyWay, bandS10, skyS10, skyMag, altitudeDeg, azimuthDeg, fromSun)

      const sine = Math.max(-1, Math.min(1, SkyGlowVisibility.dot(look, eclipticPole)))
      const inPlane = SkyGlowVisibility.normalize(SkyGlowVisibility.reject(look, eclipticPole))
      const coneS10 =
        this.dust.surfaceBrightnessS10(
          SkyGlowVisibility.between(inPlane, sunLongitude),
          (Math.asin(sine) * 180) / Math.PI
        ) * through
      zodiacal = SkyGlowVisibility.better(zodiacal, coneS10, skyS10, skyMag, altitudeDeg, azimuthDeg, fromSun)
    }

    for (let altitudeDeg = SkyGlowVisibility.LOWEST_DEG; altitudeDeg <= 90; altitudeDeg += SkyGlowVisibility.COARSE_STEP_DEG) {
      for (let azimuthDeg = 0; azimuthDeg < 360; azimuthDeg += SkyGlowVisibility.COARSE_STEP_DEG) at(altitudeDeg, azimuthDeg)
    }
    // Round two, over the patch each glow won — and over BOTH patches for both glows, since the
    // sweep cannot tell them apart as it goes and they are sometimes the same patch of sky anyway.
    for (const found of [milkyWay, zodiacal]) {
      if (!found) continue
      const span = SkyGlowVisibility.FINE_SPAN_DEG
      const step = SkyGlowVisibility.FINE_STEP_DEG
      for (let altitudeDeg = found.altitudeDeg - span; altitudeDeg <= found.altitudeDeg + span; altitudeDeg += step) {
        if (altitudeDeg < SkyGlowVisibility.LOWEST_DEG || altitudeDeg > 90) continue
        for (let azimuthDeg = found.azimuthDeg - span; azimuthDeg <= found.azimuthDeg + span; azimuthDeg += step) {
          at(altitudeDeg, (azimuthDeg + 360) % 360)
        }
      }
    }
    return {
      milkyWay: milkyWay && milkyWay.contrast >= SkyGlowVisibility.THRESHOLD_CONTRAST ? milkyWay : undefined,
      zodiacal: zodiacal && zodiacal.contrast >= SkyGlowVisibility.THRESHOLD_CONTRAST ? zodiacal : undefined,
      darkestSkyMagPerArcsec2
    }
  }

  private static better(
    best: GlowSighting | undefined,
    glowS10: number,
    skyS10: number,
    skyMagPerArcsec2: number,
    altitudeDeg: number,
    azimuthDeg: number,
    sunSeparationDeg: number
  ): GlowSighting | undefined {
    const contrast = glowS10 / skyS10
    if (best && best.contrast >= contrast) return best
    return {
      contrast,
      altitudeDeg,
      azimuthDeg,
      magPerArcsec2: SurfaceBrightness.toMagPerArcsec2(glowS10),
      skyMagPerArcsec2,
      sunSeparationDeg
    }
  }

  private static unit(position: HorizontalPosition): [number, number, number] {
    const altitude = (position.altitudeDeg * Math.PI) / 180
    const azimuth = (position.azimuthDeg * Math.PI) / 180
    const flat = Math.cos(altitude)
    return [flat * Math.sin(azimuth), Math.sin(altitude), -flat * Math.cos(azimuth)]
  }

  private static dot(a: [number, number, number], b: [number, number, number]): number {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
  }

  private static between(a: [number, number, number], b: [number, number, number]): number {
    return (Math.acos(Math.max(-1, Math.min(1, SkyGlowVisibility.dot(a, b)))) * 180) / Math.PI
  }

  /** What is left of a direction once the part along an axis is taken out of it. */
  private static reject(of: [number, number, number], axis: [number, number, number]): [number, number, number] {
    const along = SkyGlowVisibility.dot(of, axis)
    return [of[0] - along * axis[0], of[1] - along * axis[1], of[2] - along * axis[2]]
  }

  private static normalize(vector: [number, number, number]): [number, number, number] {
    const length = Math.hypot(...vector) || 1
    return [vector[0] / length, vector[1] / length, vector[2] / length]
  }
}
