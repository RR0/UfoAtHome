/** How a light of this colour and luminance looks on screen, as the scene's own photometry has it
 * (see ScatteredSky.displayOfLuminance). */
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
    const brightness = 0.2126 * white[0] + 0.7152 * white[1] + 0.0722 * white[2]
    const peak = Math.max(colour[0], colour[1], colour[2]) || 1
    return [(colour[0] / peak) * brightness, (colour[1] / peak) * brightness, (colour[2] / peak) * brightness]
  }

  /** When the scene has no photometry to ask (no scattered sky on this device): the colour at a
   * brightness that grows with the luminance and saturates, against a daylight-ish ten thousand. */
  static withoutPhotometry(rgb: readonly [number, number, number], luminanceCdM2: number): readonly [number, number, number] {
    const response = luminanceCdM2 / (luminanceCdM2 + 1e4)
    return [rgb[0] * response, rgb[1] * response, rgb[2] * response]
  }

  /** The luminance of a linear colour. */
  static luminanceOf(rgb: readonly [number, number, number]): number {
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]
  }
}
