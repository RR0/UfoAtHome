import type { Instrument } from "./Instrument.js"

/**
 * Binoculars, as Stellarium's Oculars plugin lists them (`default_ocular.ini`, `[ocular]` entries
 * flagged `binoculars=true`): magnification, aperture (from the model's own name) and the TRUE
 * field they show, which is how the plugin stores it for binoculars.
 */
interface BinocularsModel {
  id: string
  name: string
  magnification: number
  apertureMm: number
  /** The sky they take in, degrees across. */
  trueFieldDeg: number
  /** First year they could have been in a observer's hands, when the model names its decade; otherwise approximate (the plugin gives none). */
  fromYear?: number
}

/**
 * A telescope, as the plugin's `[telescope]` list gives it: aperture and focal length. The photo
 * lenses of that same list are not repeated here, since they are the focal range of the digital
 * SLRs (see DigitalSlrs).
 */
interface TelescopeModel {
  id: string
  name: string
  apertureMm: number
  focalLengthMm: number
  /** First year on sale; approximate (the plugin gives none), and absent for a generic telescope. */
  fromYear?: number
}

/**
 * What a observer looked THROUGH without recording it: binoculars and telescopes.
 *
 * Two things change for the account, and neither is decoration. The FIELD shrinks to a few degrees
 * (an object that filled a tenth of the sky fills the whole view), and the aperture gathers light,
 * so a point the eye could not hold is held (see LimitingMagnitude.graspOf). Nothing here has a
 * shutter, so the picture is an eye's: no exposure, no film curve.
 */
export class VisualAids {
  /** The eyepiece a telescope entry starts with: the plugin's 26 mm Plossl of 52 degrees. Its field
   * stop is `2·f·tan(afov/2)`, and with the telescope's focal length it gives the true field the
   * same way a sensor of that size would. A different eyepiece or a Barlow is a different effective
   * focal length on the same stop, which is why a telescope's focal can be turned (see RANGE). */
  static readonly DEFAULT_EYEPIECE_MM = 26
  static readonly DEFAULT_APPARENT_FIELD_DEG = 52
  static readonly FIELD_STOP_MM = 2 * VisualAids.DEFAULT_EYEPIECE_MM * Math.tan((VisualAids.DEFAULT_APPARENT_FIELD_DEG * Math.PI) / 360)

  /** From a 40 mm eyepiece behind the 0.63 reducer to a 6 mm one behind the 3x Barlow, the extremes
   * of the plugin's own eyepiece and lens lists, as multiples of the telescope's focal length. */
  static readonly RANGE = { min: (26 / 40) * 0.63, max: (26 / 6) * 3 }

  static readonly BINOCULARS: readonly BinocularsModel[] = [
    { id: "binoculars-zeiss-6x30", name: "Carl Zeiss 6x30", magnification: 6, apertureMm: 30, trueFieldDeg: 5, fromYear: 1960 },
    { id: "binoculars-zeiss-dialyt-10x40", name: "Carl Zeiss Dialyt 10x40 B T*", magnification: 10, apertureMm: 40, trueFieldDeg: 6.3, fromYear: 1975 },
    { id: "binoculars-jenoptem-10x50", name: "Jenoptem 10x50 W", magnification: 10, apertureMm: 50, trueFieldDeg: 7.3, fromYear: 1960 },
    { id: "binoculars-swarovski-7x50-habicht", name: "Swarovski 7x50 SL Habicht", magnification: 7, apertureMm: 50, trueFieldDeg: 6.6, fromYear: 1960 },
    { id: "binoculars-swarovski-7x50-slc", name: "Swarovski 7x50 SLC", magnification: 7, apertureMm: 50, trueFieldDeg: 7.1, fromYear: 1990 },
    { id: "binoculars-nikon-10x42-edg", name: "Nikon 10x42 EDG", magnification: 10, apertureMm: 42, trueFieldDeg: 6.5, fromYear: 2011 },
    { id: "binoculars-canon-15x50-is", name: "Canon 15x50 IS All Weather", magnification: 15, apertureMm: 50, trueFieldDeg: 4.5, fromYear: 2008 },
    { id: "binoculars-celestron-15x70", name: "Celestron 15x70 SkyMaster", magnification: 15, apertureMm: 70, trueFieldDeg: 4.4, fromYear: 1990 },
    { id: "binoculars-miyauchi-25x141", name: "Miyauchi BR-141 Galaxy 45 25x141", magnification: 25, apertureMm: 141, trueFieldDeg: 2.6, fromYear: 2000 }
  ]

  static readonly TELESCOPES: readonly TelescopeModel[] = [
    { id: "telescope-generic-60-700", name: "Telescope 60/700", apertureMm: 60, focalLengthMm: 700 },
    { id: "telescope-generic-60-1000", name: "Telescope 60/1000", apertureMm: 60, focalLengthMm: 1000 },
    { id: "telescope-celestron-onyx-80edf", name: "Celestron Onyx 80EDF", apertureMm: 80, focalLengthMm: 500, fromYear: 2010 },
    { id: "telescope-celestron-c5", name: "Celestron C5 f/10", apertureMm: 125, focalLengthMm: 1250, fromYear: 1970 },
    { id: "telescope-celestron-c8", name: "Celestron C8 f/10", apertureMm: 203, focalLengthMm: 2032, fromYear: 1970 },
    { id: "telescope-celestron-c11", name: "Celestron C11 f/10", apertureMm: 280, focalLengthMm: 2800, fromYear: 1970 },
    { id: "telescope-celestron-c14", name: "Celestron C14 f/11", apertureMm: 355.6, focalLengthMm: 3910, fromYear: 1970 },
    { id: "telescope-meade-etx-80", name: "Meade ETX 80 f/5", apertureMm: 80, focalLengthMm: 400, fromYear: 1996 },
    { id: "telescope-meade-etx-90", name: "Meade ETX 90 f/13.8", apertureMm: 90, focalLengthMm: 1242, fromYear: 1996 },
    { id: "telescope-meade-etx-125", name: "Meade ETX 125 f/15", apertureMm: 127, focalLengthMm: 1900, fromYear: 1996 },
    { id: "telescope-meade-lx200-8", name: "Meade LX200 8 in f/10", apertureMm: 200, focalLengthMm: 2000, fromYear: 1992 },
    { id: "telescope-meade-lx200-10", name: "Meade LX200 10 in f/10", apertureMm: 250, focalLengthMm: 2500, fromYear: 1992 },
    { id: "telescope-meade-lx200-12", name: "Meade LX200 12 in f/10", apertureMm: 305, focalLengthMm: 3048, fromYear: 1992 },
    { id: "telescope-meade-lx200-14", name: "Meade LX200 14 in f/10", apertureMm: 355, focalLengthMm: 3556, fromYear: 1992 },
    { id: "telescope-meade-lx200-16", name: "Meade LX200 16 in f/10", apertureMm: 406, focalLengthMm: 4064, fromYear: 1992 }
  ]

  static instruments(): Instrument[] {
    const binoculars: Instrument[] = VisualAids.BINOCULARS.map(model => ({
      id: model.id,
      name: model.name,
      // At a few degrees across the two projections cannot be told apart.
      projection: "rectilinear",
      visualAid: { apertureMm: model.apertureMm, magnification: model.magnification, trueFieldDeg: model.trueFieldDeg },
      ...(model.fromYear !== undefined ? { years: { from: model.fromYear } } : {})
    }))
    const stop = VisualAids.FIELD_STOP_MM
    const telescopes: Instrument[] = VisualAids.TELESCOPES.map(model => ({
      id: model.id,
      name: model.name,
      projection: "rectilinear",
      // The field stop is round; the picture is letterboxed to the scene's own shape, with the true
      // field as its height, so that a recording's angles mean the same here as everywhere else.
      frame: {
        widthMm: (stop * 16) / 9,
        heightMm: stop,
        focalLengthMm: model.focalLengthMm,
        focalRangeMm: { minMm: model.focalLengthMm * VisualAids.RANGE.min, maxMm: model.focalLengthMm * VisualAids.RANGE.max }
      },
      visualAid: { apertureMm: model.apertureMm, eyepieceFocalMm: VisualAids.DEFAULT_EYEPIECE_MM },
      ...(model.fromYear !== undefined ? { years: { from: model.fromYear } } : {})
    }))
    return [...binoculars, ...telescopes]
  }

  static names(): Record<string, string> {
    return Object.fromEntries(VisualAids.instruments().map(instrument => [instrument.id, instrument.name]))
  }
}
