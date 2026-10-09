/**
 * What is held in front of an instrument: a neutral-density filter that takes light out of every
 * direction alike.
 *
 * The one that matters here is a SOLAR filter, which is the only way anyone looks at the Sun before it
 * is a crescent in a sky gone dark: the bare Sun is a million times too bright to look at, and past
 * a few tenths of it covered is still so, which is why a partial eclipse is watched through
 * eclipse glasses or a film over the lens, and why a sky drawn without one shows a crescent Sun as
 * a dazzle. Everything seen through one is dimmed by the same factor — the sky goes black and the
 * Sun is left alone, which is what it looks like.
 *
 * Stated as an optical density, as the products are: a transmittance of 10^-OD, a light cut by a
 * factor of ten for each unit.
 */
export interface Filter {
  /** Stable id — what a recording names, and what an unknown value falls back from (to none). */
  id: string
  /** Name for the picker, in English; the other languages are in the editor's messages, keyed by `id`. */
  name: string
  /** −log₁₀ of the visible light let through. 0 is no filter. */
  opticalDensity: number
}

export class Filters {
  static readonly NONE: Filter = { id: "none", name: "No filter", opticalDensity: 0 }

  /**
   * Eclipse glasses and the safety film sold for looking at the Sun by eye (ISO 12312-2 asks for
   * at least OD 4.6 in the visible; the usual products are OD 5): the Sun through them is a pale
   * orange disc on black.
   */
  static readonly SOLAR_VISUAL: Filter = { id: "solar-visual", name: "Solar filter for the eye (OD 5)", opticalDensity: 5 }

  /**
   * The lighter film made for photographing the Sun through a lens (OD 3.8, as Baader's AstroSolar
   * photographic film): too bright to look at with, bright enough to expose a short shutter on.
   */
  static readonly SOLAR_PHOTO: Filter = { id: "solar-photo", name: "Solar film for a camera (OD 3.8)", opticalDensity: 3.8 }

  static readonly ALL: readonly Filter[] = [Filters.NONE, Filters.SOLAR_VISUAL, Filters.SOLAR_PHOTO]

  /** The filter of this id; none for an absent or unknown one — a recording from the future must still open. */
  static byId(id: string | undefined): Filter {
    return Filters.ALL.find(filter => filter.id === id) ?? Filters.NONE
  }

  /** Share of the light let through, 0..1. */
  static transmittance(filter: Filter): number {
    return 10 ** -filter.opticalDensity
  }

  /** The same as magnitudes of dimming: 2.5 per unit of density. */
  static magnitudes(filter: Filter): number {
    return 2.5 * filter.opticalDensity
  }
}
