import { FilmExposure, type MediumKind } from "./FilmExposure.js"
import type { Instrument } from "./Instrument.js"

/** How a picture was taken, as far as the light it took goes. */
export interface PictureSettings {
  /** The shutter, seconds. */
  seconds: number
  fNumber: number
  /** The film's or the sensor's speed, ISO. */
  iso: number
  medium: MediumKind
  /** What a filter in front lets through, 0 to 1. 1 when absent. */
  transmittance?: number
}

/** What lighting a surface would have needed to show on a picture taken at one speed. */
export interface LitSurfaceAt {
  iso: number
  /** The illuminance on its lit face, lux, that first shows on the picture (FilmExposure.FIRST_MARK_RESPONSE): under it, it is not there. */
  luxToMark: number
  /** The illuminance that burns it out on the picture (FilmExposure.BURNT_OUT). */
  luxToBurnOut: number
}

/**
 * Whether a body lit by something else (a town's glow, a street lamp, the Moon, a searchlight) could have shown on a photograph, and how
 * bright: a matt surface of albedo ρ facing a light that gives it E lux has a luminance of ρ E / π, which the picture records as the
 * renderer does (see FilmExposure). A bird's belly over a town, a balloon under a street lamp, a drone in a searchlight's beam: the same
 * reckoning, with the albedo of what faces the light.
 *
 * The surface is taken facing its light square and the camera following it, which is the most it can give a picture: one turned away,
 * or smeared across the frame by a camera that does not follow, gives less. A lighting under these figures is one under which nothing of
 * that albedo shows; one over them, one under which it may.
 */
export class LitSurfaceOnPicture {
  /** The illuminance, lux, under which a matt surface of `albedo` shows at `response` of the picture's white (see FilmExposure.response). */
  static luxFor(response: number, albedo: number, settings: PictureSettings): number {
    const exposure = FilmExposure.exposureFor(settings.medium, response)
    const luminance = FilmExposure.luminanceFor(exposure, settings.seconds, settings.iso, settings.fNumber, settings.transmittance ?? 1)
    return luminance * Math.PI / Math.max(albedo, 1e-9)
  }

  /** What a matt surface of `albedo` shows of the picture's white under `lux` (see FilmExposure.response). */
  static responseAt(lux: number, albedo: number, settings: PictureSettings): number {
    const luminance = albedo * lux / Math.PI
    return FilmExposure.response(settings.medium, FilmExposure.middleGreys(luminance, settings.seconds, settings.iso, settings.fNumber, settings.transmittance ?? 1))
  }

  /** The lighting a surface of `albedo` needs to show, and to burn out, at each of `isos`, everything else as `settings` has it. */
  static sweep(albedo: number, settings: Omit<PictureSettings, "iso">, isos: readonly number[]): LitSurfaceAt[] {
    return isos.map(iso => ({
      iso,
      luxToMark: LitSurfaceOnPicture.luxFor(FilmExposure.FIRST_MARK_RESPONSE, albedo, { ...settings, iso }),
      luxToBurnOut: LitSurfaceOnPicture.luxFor(FilmExposure.BURNT_OUT, albedo, { ...settings, iso })
    }))
  }

  /**
   * The settings of a picture taken through `instrument`, with what the recording states over its own (a shutter, a speed, an aperture);
   * undefined for an instrument that records nothing (an eye) or one without a shutter or an aperture to reckon with.
   */
  static settingsOf(instrument: Instrument, stated: { seconds?: number, iso?: number, fNumber?: number } = {}): PictureSettings | undefined {
    const medium = instrument.medium
    const seconds = stated.seconds ?? instrument.exposureSeconds
    const fNumber = stated.fNumber ?? instrument.fNumber
    if (!medium || seconds === undefined || fNumber === undefined) return undefined
    return { seconds, fNumber, iso: stated.iso ?? medium.iso, medium: medium.kind }
  }
}
