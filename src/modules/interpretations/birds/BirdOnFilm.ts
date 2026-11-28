import { FilmExposure } from "../../../engine/instrument/FilmExposure.js"
import { BirdSpecies } from "./BirdSpecies.js"

/** What lighting a bird's under side would have needed to show on a photograph, at one film speed. */
export interface BirdOnFilmAt {
  iso: number
  /** The light from below, lux, that first marks the negative (FilmExposure.FIRST_MARK): under it the bird is not on the picture at all. */
  luxToMark: number
  /** The light from below, lux, that burns its under side out on the print (FilmExposure.BURNT_OUT). */
  luxToBurnOut: number
}

/**
 * Whether a flock lit from below could have made a photograph: the light from below its belly needs, at each film speed, to mark the
 * negative and to burn out on the print, as the renderer exposes it (see FilmExposure, LightFromBelow).
 *
 * Its belly is taken facing straight down and the camera following it, which is the most a bird can give a film: one banking, seen side on,
 * or smeared across the frame by a camera that does not follow, gives less. So a lighting under these figures is one under which no bird
 * of that kind shows; one over them, one under which it may.
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

  /** The lighting `species` needs at each of `isos`, through a shutter of `seconds` at `fNumber`. */
  static sweep(species: BirdSpecies, seconds: number, fNumber: number, isos: readonly number[]): BirdOnFilmAt[] {
    const albedo = BirdOnFilm.underAlbedo(species)
    const burnt = FilmExposure.negativeExposureFor(FilmExposure.BURNT_OUT)
    return isos.map(iso => ({
      iso,
      luxToMark: FilmExposure.luxFromBelowFor(FilmExposure.FIRST_MARK, albedo, seconds, iso, fNumber),
      luxToBurnOut: FilmExposure.luxFromBelowFor(burnt, albedo, seconds, iso, fNumber)
    }))
  }
}
