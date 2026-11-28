import type { RecordingMedium } from "./Instrument.js"

/** What records a picture, as far as its answer to light goes (see RecordingMedium.kind). */
export type MediumKind = RecordingMedium["kind"]

/**
 * How much light a film or a sensor takes from a surface, and what the picture makes of it: the arithmetic the renderer finishes a recorded
 * picture with (see SceneRenderer.applyMedium and `recorded` in colorSpace.ts), in one place so that a reckoning made outside a frame (what
 * lighting a body would have needed to show on a photograph) is the one the picture shows.
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

  /**
   * What a picture shows of a surface that first marks it, of the white of the picture: what a negative's speed point prints at (see
   * FIRST_MARK), a hundredth of the white, some 26 of a screen's 255 once encoded. The same threshold for every medium, so that a slide and
   * a sensor are judged by what they show and not by a speed point of their own: a sensor's straight line reaches it some four stops under a
   * middle grey, a negative's toe three and a half, a slide's steeper one only two and a half (the narrow latitude slides are known for).
   */
  static readonly FIRST_MARK_RESPONSE = FilmExposure.response("negative", FilmExposure.FIRST_MARK)

  /** What a picture shows as burnt out, of its white: the shoulder of a film's curve, a sensor near full. */
  static readonly BURNT_OUT = 0.9

  /** The exposure a surface of luminance `luminanceCdM2` gives the film, in middle greys. `transmittance` is what a filter in front lets through. */
  static middleGreys(luminanceCdM2: number, seconds: number, iso: number, fNumber: number, transmittance = 1): number {
    return 0.065 * luminanceCdM2 * seconds * iso * transmittance / (fNumber * fNumber)
  }

  /** The luminance that gives the film `middleGreys` (see middleGreys), cd/m². */
  static luminanceFor(middleGreys: number, seconds: number, iso: number, fNumber: number, transmittance = 1): number {
    return middleGreys * fNumber * fNumber / (0.065 * seconds * iso * transmittance)
  }

  /**
   * How light a picture recorded on `kind` shows an exposure of `h` middle greys, 0 to 1, a middle grey at 0.18: a negative printed and a
   * slide are logistic in the logarithm of the exposure (a toe, a straight line, a shoulder), the slide's steeper; a sensor's is straight
   * and then stops. The CPU twin of `recorded` in colorSpace.ts, which a test holds to it. A phone's own development of a night (see
   * PhoneDevelopment) depends on the whole frame and is not here: its sensor's line is the most it records before that lift.
   */
  static response(kind: MediumKind, h: number): number {
    const exposure = Math.max(h, 0)
    if (kind === "sensor") return Math.min(1, 0.18 * exposure)
    const power = exposure ** FilmExposure.gammaOf(kind)
    return power / (power + (1 / 0.18 - 1))
  }

  /** The exposure, in middle greys, that a picture recorded on `kind` shows at `response` (see response). */
  static exposureFor(kind: MediumKind, response: number): number {
    const r = Math.min(Math.max(response, 1e-9), 1 - 1e-9)
    if (kind === "sensor") return r / 0.18
    return (r * (1 / 0.18 - 1) / (1 - r)) ** (1 / FilmExposure.gammaOf(kind))
  }

  /** A printed negative's curve (see response). */
  static negativeResponse(h: number): number {
    return FilmExposure.response("negative", h)
  }

  /** The exposure a printed negative shows at `response` (see exposureFor). */
  static negativeExposureFor(response: number): number {
    return FilmExposure.exposureFor("negative", response)
  }

  /** How steep a film's curve is: a slide's contrast is higher than a negative printed. */
  private static gammaOf(kind: Exclude<MediumKind, "sensor">): number {
    return kind === "slide" ? 1.8 : 1.2
  }
}
