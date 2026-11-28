/**
 * How much light a film takes from a surface, and what it makes of it: the arithmetic the renderer finishes a recorded picture with (see
 * SceneRenderer.applyMedium and `recorded` in colorSpace.ts), in one place so that a reckoning made outside a frame (what lighting a bird
 * would have needed to mark a negative) is the one the picture shows.
 *
 * The exposure at the film is ISO 12232's H = q L t / N², q = 0.65 for the lens's transmission and fall-off, and a middle grey needs
 * 10 / ISO lux-seconds of it: so H in middle greys is 0.065 L t ISO / N².
 */
export class FilmExposure {
  /**
   * The exposure that first marks a negative, in middle greys: ISO 6's speed point, the 0.8 / ISO lux-seconds that give a density of 0.1
   * over the film's fog, against a middle grey's 10 / ISO. Below it, nothing a print shows.
   */
  static readonly FIRST_MARK = 0.08

  /** What a negative printed shows as burnt out, of the white of the print: the shoulder of its curve (see negativeResponse). */
  static readonly BURNT_OUT = 0.9

  /** The exposure a surface of luminance `luminanceCdM2` gives the film, in middle greys. `transmittance` is what a filter in front lets through. */
  static middleGreys(luminanceCdM2: number, seconds: number, iso: number, fNumber: number, transmittance = 1): number {
    return 0.065 * luminanceCdM2 * seconds * iso * transmittance / (fNumber * fNumber)
  }

  /** The luminance that gives the film `middleGreys` (see middleGreys), cd/m². */
  static luminanceFor(middleGreys: number, seconds: number, iso: number, fNumber: number): number {
    return middleGreys * fNumber * fNumber / (0.065 * seconds * iso)
  }

  /**
   * How light a printed negative shows an exposure of `h` middle greys, 0 to 1: logistic in the logarithm of the exposure, a toe, a straight
   * line and a shoulder, with a middle grey at 0.18. The CPU twin of `recorded` in colorSpace.ts for a negative, which a test holds to it.
   */
  static negativeResponse(h: number): number {
    const power = Math.max(h, 0) ** 1.2
    return power / (power + (1 / 0.18 - 1))
  }

  /** The exposure, in middle greys, that a printed negative shows at `response` (see negativeResponse). */
  static negativeExposureFor(response: number): number {
    const r = Math.min(Math.max(response, 1e-9), 1 - 1e-9)
    return (r * (1 / 0.18 - 1) / (1 - r)) ** (1 / 1.2)
  }

  /**
   * The irradiance from below, lux, under which a matt surface facing down of albedo `albedo` reaches `middleGreys` on the film: its
   * luminance is albedo × E / π, as LightFromBelow lights it.
   */
  static luxFromBelowFor(middleGreys: number, albedo: number, seconds: number, iso: number, fNumber: number): number {
    return FilmExposure.luminanceFor(middleGreys, seconds, iso, fNumber) * Math.PI / Math.max(albedo, 1e-9)
  }
}
