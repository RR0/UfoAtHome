import { EyeAdaptation } from "../engine/atmosphere/EyeAdaptation.js"

/** A light of this colour and luminance as the scene draws it — relative to the eye's semi-saturation,
 * as the scene's own photometry has it (see ScatteredSky.relativeOfLuminance). */
export type LuminanceDisplay = (linearRgb: readonly [number, number, number], luminanceCdM2: number) => readonly [number, number, number]

/**
 * What something that gives out light looks like on screen — a flame, a glowing body, the glow the
 * air makes round the Moon.
 */
export class Photometry {
  /**
   * The colour the physics or the account gives, at the brightness the scene's photometry gives that
   * many candela per square metre.
   *
   * The photometry is asked about a WHITE of that luminance and not about the colour itself,
   * because what it answers is what a light of that brightness looks like to an eye adapted to this
   * sky — and at night that is nearly white whatever went in. Handing it Chiles's deep blue came
   * back as a white sliver, which is the one thing his drawing is not. So the scene decides how
   * bright, and the witness — or the diffraction that coloured a corona's rings — decides what
   * colour.
   */
  static shown(colour: readonly [number, number, number], luminanceCdM2: number, display?: LuminanceDisplay): [number, number, number] {
    const white = display ? display([1, 1, 1], luminanceCdM2) : Photometry.withoutPhotometry([1, 1, 1], luminanceCdM2)
    const brightness = EyeAdaptation.respond(Photometry.luminanceOf(white))
    const peak = Math.max(colour[0], colour[1], colour[2]) || 1
    const hue: [number, number, number] = [colour[0] / peak, colour[1] / peak, colour[2] / peak]
    // The frame's last pass keeps a colour's chromaticity and gives it the response to its
    // luminance; so the light drawn is the one whose response is this hue at that brightness.
    const luminance = Photometry.luminanceOf(hue)
    if (!(luminance > 0) || !(brightness > 0)) return [0, 0, 0]
    const scale = EyeAdaptation.relativeOfResponse(luminance * brightness) / luminance
    return [hue[0] * scale, hue[1] * scale, hue[2] * scale]
  }

  /** How far up the scale of what can be shown a light already is, 0 to 1: the eye's response to it. */
  static response(relative: readonly [number, number, number]): number {
    return EyeAdaptation.respond(Photometry.luminanceOf(relative))
  }

  /** When the scene has no photometry to ask (no scattered sky on this device): the light whose
   * response grows with the luminance and saturates, against a daylight-ish ten thousand. */
  static withoutPhotometry(rgb: readonly [number, number, number], luminanceCdM2: number): readonly [number, number, number] {
    const relative = EyeAdaptation.relativeOfResponse(luminanceCdM2 / (luminanceCdM2 + 1e4))
    return [rgb[0] * relative, rgb[1] * relative, rgb[2] * relative]
  }

  /** The luminance of a linear colour. */
  static luminanceOf(rgb: readonly [number, number, number]): number {
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]
  }
}
