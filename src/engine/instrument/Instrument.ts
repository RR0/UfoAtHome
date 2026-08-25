/**
 * What the observation was made THROUGH — an eye, a camera, a camcorder — and, for now, the one
 * property of it that changes the geometry of every recorded shape: how an angle becomes a pixel.
 *
 * This exists because "the witness saw it" and "the witness filmed it" are not the same claim, and
 * the difference is not decoration. A camera lens really does map a direction to the sensor as
 * `tan θ`, which stretches everything away from the axis — a building 33 degrees off-centre is
 * rendered 42% wider than the angle it subtends. That is *correct* for a photograph and *wrong* for
 * an eye, which perceives an angle as an angle wherever it falls in the visual field. Rendering
 * every sighting through a camera lens, as this project did until now, silently turned every naked
 * eye witness into a photographer.
 *
 * A recording states angles (see BaseShape.angular) and nothing else about size, which is precisely
 * what makes an instrument swappable: the same testimony can be projected through any of them. Had
 * it still stored pixels, changing instrument would have meant nothing.
 *
 * Later slices add the rest of what an instrument determines — depth of field (whose blur puts real
 * bounds on distance, exactly as decor occlusion does), exposure and shutter (a long pose turns a
 * moving light into a streak, and a blinking one into a dashed streak), sensor resolution. Each is
 * a field here, and each preset below is where a real device's values would go.
 */
export type ProjectionKind =
  /** Image radius proportional to the angle off-axis: `r = f·θ`. An angle occupies the same number
   * of pixels wherever it falls, which is what an eye does and what makes a screen ruler mean
   * something. Slight tangential stretch of `θ/sin θ` remains — 6% at 33 degrees, against the
   * rectilinear's 42% — and no flat image can do better than trade one distortion for another. */
  | "equidistant"
  /** Image radius proportional to the tangent: `r = f·tan θ`. What a pinhole and every ordinary
   * camera lens produce. Straight lines stay straight, and everything off-axis is stretched by
   * `sec²θ` — the wide-angle look. Exact only for a viewer whose eye sits at the projection centre,
   * i.e. about half an image-width from the screen, which nobody does. */
  | "rectilinear"

export interface Instrument {
  /** Stable id — what a case file names, and what an unknown value falls back from. */
  id: string
  /** Short name for the picker, and what a page shows to say how the sighting was recorded. */
  name: string
  /** How this instrument maps a direction onto its image. */
  projection: ProjectionKind
}

/** Every instrument a recording can declare having been made through. Deliberately two entries and
 * generic: a catalogue of real dated devices (a Kodak Instamatic, a given phone) is *data* of this
 * same shape, added when a case file needs one, not a different model. */
export const INSTRUMENTS: Instrument[] = [
  {
    id: "eye",
    name: "Naked eye",
    projection: "equidistant"
  },
  {
    id: "rectilinear-lens",
    name: "Camera, rectilinear lens",
    projection: "rectilinear"
  }
]

export class Instruments {
  /** The instrument a recording that says nothing is assumed to have used. An eye: every sighting
   * in this project's own files is one, and a witness who filmed says so. */
  static get default(): Instrument {
    return INSTRUMENTS[0]
  }

  /** Looks one up by id, falling back to the default rather than to nothing — an old file, a
   * hand-edited id, a preset since renamed all resolve to the eye, which is the safe assumption. */
  static byId(id: string | undefined): Instrument {
    return INSTRUMENTS.find(instrument => instrument.id === id) ?? this.default
  }
}
