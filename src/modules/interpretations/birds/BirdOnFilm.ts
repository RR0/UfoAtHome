import { LitSurfaceOnPicture, type LitSurfaceAt, type PictureSettings } from "../../../engine/instrument/LitSurfaceOnPicture.js"
import { BirdSpecies } from "./BirdSpecies.js"

/** What lighting a bird's under side would have needed to show on a photograph, at one film speed (see LitSurfaceOnPicture). */
export type BirdOnFilmAt = LitSurfaceAt

/**
 * Whether a flock lit from below could have made a photograph: a bird's belly as a lit surface (see LitSurfaceOnPicture), of the albedo of
 * the colour it is drawn with there, facing the town's light square as LightFromBelow lights it.
 */
export class BirdOnFilm {
  /** The share of light its under side sends back: the linear luminance of the colour it is drawn with there (see BirdSpecies.colourOf). */
  static underAlbedo(species: BirdSpecies): number {
    const hex = BirdSpecies.colourOf(species, "underColor").replace("#", "")
    const channel = (k: number) => {
      const c = parseInt(hex.slice(2 * k, 2 * k + 2), 16) / 255
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    }
    return 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2)
  }

  /** The lighting `species` needs at each of `isos`, on a picture taken as `settings` says (a negative when it does not say). */
  static sweep(species: BirdSpecies, seconds: number, fNumber: number, isos: readonly number[], settings: Partial<Omit<PictureSettings, "iso" | "seconds" | "fNumber">> = {}): BirdOnFilmAt[] {
    return LitSurfaceOnPicture.sweep(BirdOnFilm.underAlbedo(species), { seconds, fNumber, medium: settings.medium ?? "negative", transmittance: settings.transmittance }, isos)
  }
}
