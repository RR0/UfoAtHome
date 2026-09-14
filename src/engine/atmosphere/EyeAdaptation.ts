import { VisibleSpectrum } from "./Spectrum.js"

export type DisplayRgb = [number, number, number]

/**
 * What an eye makes of a sky it has adapted to — the step between a luminance in candelas per square
 * metre and a colour on a screen.
 *
 * A physical sky spans ten million to one between noon and midnight, and a screen spans a few
 * hundred. Neither end can simply be scaled onto the other: shown linearly, the night would be black
 * and a Moon-lit landscape invisible, which is not what a witness standing in it saw. An eye ADAPTS,
 * and it does so only partly — a night sky looks darker than a day sky to a fully dark-adapted
 * observer, just nowhere near ten million times darker. Three things, then:
 *
 * - A PHOTORECEPTOR RESPONSE, R = Y^n / (Y^n + σ^n): the Naka-Rushton form that cone and rod
 *   responses follow, compressive, saturating, with the exponent n below one as measured for cones.
 * - An ADAPTATION STATE: σ, the luminance at which the response is half its maximum, follows the
 *   luminance the eye is adapted to, σ = K·La^m. With m = 1 adaptation would be complete and every sky
 *   would look equally bright; with m = 0 there would be none. K and m are not chosen but solved, from
 *   the two ends of the range: see the two anchors below.
 * - THE PURKINJE SHIFT: below a few candelas the rods take over from the cones. They see no colour,
 *   and they are most sensitive to blue-green, which is why a moonlit landscape looks grey-blue and a
 *   red flower goes black before its leaves do. The luminance fed to the response blends toward the
 *   SCOTOPIC luminance as adaptation falls — the blend weight is Krawczyk, Myszkowski and Seidel
 *   (2005), "Perceptual effects in real-time tone mapping" — and the colour toward a night blue.
 *
 * A camera does none of this: it has no rods and no adaptation but the exposure it was given. This is
 * the eye's model, used for a witness's view.
 */
export class EyeAdaptation {
  /** The compressive exponent of the response, in the range measured for primate cones. */
  static readonly RESPONSE_EXPONENT = 0.74

  /**
   * The first anchor: a clear zenith at 3 000 cd/m², seen by an eye adapted to it, is shown at a
   * linear display luminance of 0.42 — what this scene's colour table gave a day zenith before the
   * sky was scattered, so that everything lit by lights calibrated against that table keeps its place.
   */
  static readonly DAYLIGHT_ANCHOR_CD_M2 = 3000
  static readonly DAYLIGHT_ANCHOR_RESPONSE = 0.42

  /**
   * The second: a natural moonless zenith, 22 magnitudes per square arcsecond, is shown at 0.006 —
   * a little darker than the colour table left the night (0.01), which under a 91 % Moon still read as
   * a light blue sky to the reader who judged it.
   *
   * The first version anchored the day alone and chose m = 0.7 for the rest, and a reader looking at
   * Chiles-Whitted under a 91 % Moon asked why the night was light grey: measured on the screen, every
   * night sky came out two to four times brighter than before. With both ends pinned, m is whatever
   * joins them (0.61), and every sky in between — a moonlit one included — falls where the physics
   * puts it relative to those two.
   */
  static readonly NIGHT_ANCHOR_CD_M2 = 1.72e-4
  static readonly NIGHT_ANCHOR_RESPONSE = 0.006

  /** σ at an anchor adapted to itself: R = 1 / (1 + (σ/Y)^n), so σ = Y·(1/R − 1)^(1/n). */
  private static anchoredSemiSaturation(luminance: number, response: number): number {
    return luminance * (1 / response - 1) ** (1 / EyeAdaptation.RESPONSE_EXPONENT)
  }

  /** The m of σ = K·La^m, joining the two anchors. */
  static get ADAPTATION_EXPONENT(): number {
    const day = EyeAdaptation.anchoredSemiSaturation(EyeAdaptation.DAYLIGHT_ANCHOR_CD_M2, EyeAdaptation.DAYLIGHT_ANCHOR_RESPONSE)
    const night = EyeAdaptation.anchoredSemiSaturation(EyeAdaptation.NIGHT_ANCHOR_CD_M2, EyeAdaptation.NIGHT_ANCHOR_RESPONSE)
    return Math.log(day / night) / Math.log(EyeAdaptation.DAYLIGHT_ANCHOR_CD_M2 / EyeAdaptation.NIGHT_ANCHOR_CD_M2)
  }

  /** Krawczyk et al.: the rods' share of vision at an adaptation luminance, σ = 0.04 / (0.04 + La). */
  static readonly ROD_HALF_LUMINANCE_CD_M2 = 0.04

  /**
   * The colour scotopic vision is shown in, as linear sRGB of unit luminance: halfway between white and
   * the night blue (chromaticity 0.25, 0.25) Thompson, Shirley and Ferwerda (2002) used for it. A
   * convention for what reads as night on a screen, not a measurement — rods see no colour at all.
   * Krawczyk's own tint was tried first and, once its luminance was divided out, was so nearly neutral
   * that moonlit skies came out grey; Thompson's full blue then made every night "very blue".
   */
  static readonly SCOTOPIC_TINT: DisplayRgb = [0.853, 0.995, 1.483]

  /** The K of σ = K·La^m, from the daylight anchor once m is known. */
  static get SEMI_SATURATION_SCALE(): number {
    const day = EyeAdaptation.anchoredSemiSaturation(EyeAdaptation.DAYLIGHT_ANCHOR_CD_M2, EyeAdaptation.DAYLIGHT_ANCHOR_RESPONSE)
    return day / EyeAdaptation.DAYLIGHT_ANCHOR_CD_M2 ** EyeAdaptation.ADAPTATION_EXPONENT
  }

  static rodShare(adaptingLuminance: number): number {
    return EyeAdaptation.ROD_HALF_LUMINANCE_CD_M2 / (EyeAdaptation.ROD_HALF_LUMINANCE_CD_M2 + Math.max(adaptingLuminance, 0))
  }

  static semiSaturation(adaptingLuminance: number): number {
    return EyeAdaptation.SEMI_SATURATION_SCALE * Math.max(adaptingLuminance, 1e-9) ** EyeAdaptation.ADAPTATION_EXPONENT
  }

  /** The response to a luminance, 0 to 1, for an eye adapted to `adaptingLuminance`. */
  static response(luminance: number, adaptingLuminance: number): number {
    const n = EyeAdaptation.RESPONSE_EXPONENT
    const y = Math.max(luminance, 0) ** n
    return y / (y + EyeAdaptation.semiSaturation(adaptingLuminance) ** n)
  }

  /**
   * A colour on the screen, linear, for light of tristimulus `xyz` (cd/m²) and scotopic luminance
   * `scotopic`, seen by an eye adapted to `adaptingLuminance`.
   */
  static displayOf(
    xyz: readonly [number, number, number],
    scotopic: number,
    adaptingLuminance: number,
    rods = EyeAdaptation.rodShare(adaptingLuminance)
  ): DisplayRgb {
    const luminance = (1 - rods) * xyz[1] + rods * scotopic
    const response = EyeAdaptation.response(luminance, adaptingLuminance)
    const [r, g, b] = VisibleSpectrum.linearSrgbOf(xyz)
    const photopic = Math.max(xyz[1], 1e-12)
    const tint = EyeAdaptation.SCOTOPIC_TINT
    const tintLuminance = 0.2126 * tint[0] + 0.7152 * tint[1] + 0.0722 * tint[2]
    const channel = (value: number, tinted: number) => Math.max(0, ((1 - rods) * value) / photopic + (rods * tinted) / tintLuminance) * response
    return [channel(r, tint[0]), channel(g, tint[1]), channel(b, tint[2])]
  }
}
