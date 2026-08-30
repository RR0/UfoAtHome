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
  /**
   * How many straight blades close down its aperture, if it has an aperture at all.
   *
   * This is what puts a STAR on a bright light, and it is the reason the Sun looks different in
   * every photograph of it. Light passing an aperture is diffracted by its EDGES, so each straight
   * blade throws a pair of spikes at right angles to itself: an even number of blades has opposite
   * blades parallel, their spikes fall on top of one another, and the count is N; an odd number has
   * none parallel and the count is 2N. A round aperture has no straight edge anywhere and throws no
   * spikes at all, only a round glow — which is why a phone photograph of the Sun is a disc with a
   * halo and an SLR photograph at f/16 is a starburst.
   *
   * Absent means there is no aperture with edges: the naked eye, and any lens shot wide open where
   * the blades have swung clear of the beam. An eye is round, and the faint rays people do see
   * around a bright light come from the lens's own suture lines and the film of tears, which are
   * not straight edges and do not make a clean star. Drawing a six-pointed star for a witness who
   * simply looked up says they were holding a camera.
   */
  apertureBlades?: number
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
    projection: "rectilinear",
    // Six is the commonest count on ordinary lenses, and it gives the six-spiked Sun that everybody
    // recognises from a photograph. A real dated device would state its own.
    apertureBlades: 6
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

  /**
   * How many spikes a bright light grows when seen through that instrument — zero for anything
   * without straight-edged blades in front of it.
   *
   * Derived, not listed: an even blade count gives that many spikes because opposite blades are
   * parallel and their pairs of spikes coincide; an odd count gives twice as many because none of
   * them do. Six blades, six spikes; five blades, ten. The eye gets none.
   */
  static starPointsOf(instrument: Instrument): number {
    const blades = instrument.apertureBlades
    if (blades === undefined || blades < 3) return 0
    return blades % 2 === 0 ? blades : blades * 2
  }
}
