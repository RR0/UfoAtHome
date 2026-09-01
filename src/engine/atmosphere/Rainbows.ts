import { WaterRefraction } from "./WaterDrop.js"

/**
 * The bows falling water puts opposite the Sun — where they stand, when they can stand at all, and
 * what it takes for a witness to have seen one.
 *
 * This family belongs beside the halos as an explanation, and for the opposite reason. A halo is a
 * sight most people have never knowingly seen; a rainbow is the one everybody has, which is exactly
 * why the sightings it accounts for are not the ordinary ones. What gets reported is a bow with
 * something wrong with it: a fragment of one standing in a clear patch of sky with no rain visible
 * anywhere near the witness, a piece of colour hanging beside a low Sun, a bow at NIGHT under a full
 * Moon — which is the same physics on a source four hundred thousand times fainter, comes out white
 * to the eye rather than coloured, and is reported by people who have no idea such a thing exists.
 *
 * EVERYTHING HERE IS DERIVED. Forty-two is not a constant of this file: it is what falls out of the
 * refractive index of water and the number of times the light bounced around inside a drop. For a
 * ray that crossed p chords, the deviation is stationary — which is what makes a bow a bow — where
 *
 *   cos²i = (n² − 1) / (p² − 1)
 *
 * and p = 2 gives 42 degrees, p = 3 gives 51 with the colours the other way up, and p = 4 and 5 give
 * the two bows that stand round the SUN instead, where nobody can see them. Change the index and
 * every number below moves together, which is the test that this is physics and not decoration.
 *
 * WHAT THIS FILE IS FOR, since the scene does not draw from it. What a reader sees is traced ray by
 * ray through drops (RainbowSky), which is the only way to get the relative brightnesses right and
 * the dark band between the bows for free. This keeps the closed forms, and its job is to DISAGREE:
 * two derivations of one piece of physics agreeing is evidence, while one number shared between the
 * sentence and the picture would only be a habit. That check earned its place in the ice family,
 * where it caught a wrong sundog separation that had been shipped.
 */
export interface BowForm {
  id: "primary" | "secondary"
  /** How far from the point opposite the Sun the bow stands, degrees — the radius a witness would
   * measure. */
  radiusDeg: number
  /** Where its red and its violet edges are. The separation IS the colour, and it is nearly two
   * degrees for the primary against a halo's two thirds of one, which is why a bow is the more
   * colourful sight by far even though water disperses light no more strongly than ice. */
  redRadiusDeg: number
  violetRadiusDeg: number
  /** How high its top stood above the witness's horizon, degrees. Negative means the whole bow was
   * below it — see formsAt. */
  topAltitudeDeg: number
}

export class Rainbows {
  /** The refractive index of water at the red and blue ends of what an eye responds to — the two
   * measured numbers this whole file is built from. */
  static get WATER_INDEX_RED(): number {
    return WaterRefraction.indexAt(WaterRefraction.RED_NM)
  }

  static get WATER_INDEX_BLUE(): number {
    return WaterRefraction.indexAt(WaterRefraction.BLUE_NM)
  }

  /**
   * How far from the antisolar point a bow of p chords stands, degrees.
   *
   * The deviation of a ray through a sphere has a stationary point — an angle it cannot be bent
   * past, where rays from a whole range of impact parameters emerge together. That pile-up is the
   * bow, and its sharp edge is the fact that no ray goes beyond it, which is also why the sky is
   * dark on the far side of the primary and bright inside it.
   */
  static radiusDeg(chords: number, refractiveIndex: number): number {
    const cosineSquared = (refractiveIndex * refractiveIndex - 1) / (chords * chords - 1)
    if (cosineSquared < 0 || cosineSquared > 1) return Number.NaN
    const incidence = Math.acos(Math.sqrt(cosineSquared))
    const refracted = Math.asin(Math.sin(incidence) / refractiveIndex)
    const deviation = 2 * (incidence - refracted) + (chords - 1) * (Math.PI - 2 * refracted)
    const turn = 2 * Math.PI
    let scattering = deviation % turn
    if (scattering < 0) scattering += turn
    if (scattering > Math.PI) scattering = turn - scattering
    // Measured from the point opposite the source, which is where a witness's own shadow points and
    // the only landmark a bow is ever described against.
    return 180 - (scattering * 180) / Math.PI
  }

  /** The bright one, from light that bounced once inside the drop: red outside, violet inside. */
  static primary(): BowForm {
    return Rainbows.bowOf("primary", 2, 0)
  }

  /** The fainter one further out, from light that bounced twice: its colours run the other way, and
   * it is the extra bounce that costs it most of its light. */
  static secondary(): BowForm {
    return Rainbows.bowOf("secondary", 3, 0)
  }

  private static bowOf(id: "primary" | "secondary", chords: number, sourceAltitudeDeg: number): BowForm {
    const red = Rainbows.radiusDeg(chords, Rainbows.WATER_INDEX_RED)
    const violet = Rainbows.radiusDeg(chords, Rainbows.WATER_INDEX_BLUE)
    const radiusDeg = (red + violet) / 2
    return {
      id,
      radiusDeg,
      redRadiusDeg: red,
      violetRadiusDeg: violet,
      // The centre of a bow is the antisolar point, which is exactly as far BELOW the horizon as the
      // source is above it. So the top of the bow stands at the radius minus the source's altitude,
      // and the bow sinks as the Sun climbs — the whole reason a rainbow is a morning and evening
      // sight and cannot be a midday one.
      topAltitudeDeg: radiusDeg - sourceAltitudeDeg
    }
  }

  /**
   * The dark band between the two bows, which is not a shadow of anything.
   *
   * No ray that has bounced once inside a drop can leave beyond the primary's angle, and none that
   * has bounced twice can leave inside the secondary's, so the sky between them receives neither.
   * It was named for Alexander of Aphrodisias, who wrote it down around AD 200, and it is the
   * easiest part of the whole sight to check against a photograph.
   */
  static alexandersBandDeg(): { fromDeg: number; toDeg: number } {
    return { fromDeg: Rainbows.primary().redRadiusDeg, toDeg: Rainbows.secondary().redRadiusDeg }
  }

  /**
   * Which bows could have stood above the witness's own horizon, with the source that high.
   *
   * The strong statement here is the negative one, and it is a real test of a report: with the Sun
   * above 42 degrees there is no primary bow to be seen from the ground AT ALL, whatever the rain is
   * doing — which rules out every midday rainbow at a summer latitude. A witness ABOVE the rain (an
   * aircraft, a cliff over a shower, a waterfall's spray) is the exception that proves it: they see
   * the part of the circle that a ground witness has the ground in front of, and a complete circular
   * rainbow is a real and regularly photographed sight from an aeroplane.
   */
  static formsAt(sourceAltitudeDeg: number): BowForm[] {
    if (sourceAltitudeDeg < 0) return []
    return [Rainbows.bowOf("primary", 2, sourceAltitudeDeg), Rainbows.bowOf("secondary", 3, sourceAltitudeDeg)].filter(
      bow => bow.topAltitudeDeg > 0
    )
  }

  /** The Moon at its brightest, magnitude — what a full one gives. */
  static readonly FULL_MOON_MAGNITUDE = -12.7

  /**
   * How much of a full Moon's light a Moon of that magnitude gives, 0 to 1.
   *
   * Why a moonbow needs a full Moon, in one line. The phase costs far more light than people expect:
   * a half Moon is not half as bright but a TWELFTH as bright, because the illuminated half is seen
   * at a grazing angle and its shadows fill it. A bow that is barely at the threshold of being seen
   * under a full Moon is therefore simply not there a week later, and every account of one is dated
   * within a day or two of full — which makes this a real test of a night-time report rather than a
   * refinement of its brightness.
   */
  static moonlightShare(magnitude: number): number {
    return Math.min(1, 10 ** (-0.4 * (magnitude - Rainbows.FULL_MOON_MAGNITUDE)))
  }

  /**
   * How strongly a bow could have shown, 0 to 1, given the sky that was over the witness.
   *
   * Two ingredients, and unlike the ice family BOTH of them are in the record. There has to be water
   * falling, which is the reported precipitation; and the source has to reach it, which is what an
   * unbroken deck of cloud prevents. That is the whole of the famous condition — a shower on one
   * side and the Sun breaking through on the other — and it is why a rainbow is a sight of BROKEN
   * weather rather than of rain.
   *
   * MONOTONIC in each, deliberately. It would be easy to write a curve that peaked at half cover on
   * the reasoning that a bow needs both cloud and clear sky, and it would be wrong twice over: the
   * cloud that makes the rain need not be the cloud between the witness and the Sun, and a curve
   * that falls back to nothing at the setting a reader would most naturally reach for is how the ice
   * family's first strength function came to hand back zero for the classic halo sky.
   *
   * What the record does not hold is where the shower stood — a bow is drawn by the drops in that
   * one direction, and "it was raining at the station" is not "it was raining forty-two degrees from
   * the antisolar point". So this says the ingredients were there, not that a bow was seen; whether
   * the witness saw one is, as ever, the reader's conclusion.
   */
  static strength(rainIntensity: number, cloudCover: number, sourceAltitudeDeg: number): number {
    if (sourceAltitudeDeg <= 0) return 0
    const drops = Math.max(0, Math.min(1, rainIntensity))
    const throughTheCloud = Math.max(0, 1 - Math.max(0, Math.min(1, cloudCover)))
    return drops * throughTheCloud
  }
}
