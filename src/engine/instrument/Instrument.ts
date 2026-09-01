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

/**
 * The image a device actually makes: the piece of film or silicon it exposes, and the lens standing
 * in front of it.
 *
 * Two millimetres and one more decide everything a format is. The ratio of the first two IS the
 * shape of the picture — a square from a 126 cartridge, a tall rectangle from a phone held upright —
 * and dividing them by the third gives the field it takes in. Both are facts about a real device
 * that can be looked up and argued with, which is why this is stated in millimetres rather than as
 * an angle somebody chose.
 *
 * AS THE DEVICE IS HELD, which is why holding a phone upright is a different entry rather than a
 * flag: the sensor is the same silicon either way, but what was photographed is not the same
 * picture, and the frame a witness's photograph has is part of the record.
 */
export interface InstrumentFrame {
  /** The exposed image's width and height, millimetres, as held. */
  widthMm: number
  heightMm: number
  /** The lens's focal length, millimetres — the setting a fixed lens is stuck at, and where a zoom
   * sits until a recording says otherwise. */
  focalLengthMm: number
  /** What a zoom can be turned to. Absent means the lens does not zoom, and a reader may read its
   * focal but not set it. */
  focalRangeMm?: { minMm: number; maxMm: number }
}

/**
 * When a device of this kind could have been in a witness's hands.
 *
 * A dated catalogue, in the same spirit as the satellite classes: it lets the picker offer what
 * existed and refuse what did not, which is one more of the negative statements this project is
 * made of. Nobody photographed anything with a telephone in 1964.
 */
export interface InstrumentYears {
  from: number
  to?: number
}

export interface Instrument {
  /** Stable id — what a case file names, and what an unknown value falls back from. */
  id: string
  /** Short name for the picker, and what a page shows to say how the sighting was recorded — in
   * every language this project speaks, exactly as the satellite classes and the meteor showers
   * are named (see satelliteCatalog.ts). A catalogue entry is DATA, and data that only exists in
   * English puts English into a French page. */
  name: { en: string; fr: string }
  /** How this instrument maps a direction onto its image. */
  projection: ProjectionKind
  /**
   * The picture it makes, if it makes one at all.
   *
   * ABSENT FOR AN EYE, and that absence is the honest statement rather than a gap: an eye has no
   * rectangle. It is also absent for a camera whose device is not known — a case that says "he
   * photographed it" and no more — where claiming a format would be inventing evidence. Both fall
   * back to the shape this project draws its own scene in (see Instruments.UNAIDED_ASPECT).
   */
  frame?: InstrumentFrame
  /** When such a device existed. Absent means the question does not arise: an eye, or a camera
   * stated so generically that no date bounds it. */
  years?: InstrumentYears
  /**
   * How far the lens is stopped down — the f-number — and how far it can be, if at all.
   *
   * Two things follow from it, and both are visible. The DEPTH OF FIELD: a wide opening puts a
   * narrow slice of distance in focus, which is a real bound on how far away something stood, since
   * a photograph that shows it sharp says it was inside that slice. And the STAR: the blades only
   * stand in the beam once the lens is stopped down, so a lens shot wide open has no straight edge
   * anywhere and throws none, whatever its blade count says.
   *
   * Absent on anything with no diaphragm at all — an eye, and a phone, whose opening is fixed and
   * round (which is why a phone's Sun is a plain disc).
   */
  fNumber?: number
  fNumberRange?: { min: number; max: number }
  /**
   * How long the shutter stays open, seconds, and what it can be set to.
   *
   * The parameter behind the classic UFO photograph: a long pose does not freeze a moving light, it
   * ACCUMULATES it into a streak — and a blinking one into a dashed streak, which is how an
   * aircraft's strobe signs its own picture.
   */
  exposureSeconds?: number
  exposureRangeSeconds?: { min: number; max: number }
  /**
   * How strongly this device's own glass throws the ghosts, streaks and veils that a photograph of
   * a bright light shows around it, and a witness's account of one does not.
   *
   * ZERO IS AN EYE, and it is the whole reason this is stated rather than inferred: those artefacts
   * are made by reflections between the surfaces of a LENS, so what decides them is whether the
   * sighting went through glass — not how bright the light was, and not a reader's taste. Every
   * camera here carries the same one until a real device states its own, which is what the number
   * of its elements and the age of its coatings would settle; the star is already derived
   * separately, from the blades (see starPointsOf).
   */
  flare?: number
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
    name: { en: "Naked eye", fr: "Œil nu" },
    flare: 0,
    projection: "equidistant"
  },
  {
    id: "rectilinear-lens",
    name: { en: "Camera, unknown device", fr: "Appareil, modèle inconnu" },
    projection: "rectilinear",
    // An ordinary daylight snapshot's settings, and adjustable, since nothing about an unnamed
    // camera says they were not.
    fNumber: 8,
    fNumberRange: { min: 2, max: 22 },
    exposureSeconds: 1 / 250,
    exposureRangeSeconds: { min: 1 / 1000, max: 8 },
    // Six is the commonest count on ordinary lenses, and it gives the six-spiked Sun that everybody
    // recognises from a photograph. No frame and no dates: this is the entry for a case that says
    // "he photographed it" and nothing more, and claiming a format for it would be inventing
    // evidence. The entries below are the ones that DO know what they were.
    apertureBlades: 6
  },
  {
    // The camera of the snapshot era, and a square one — which is the clearest demonstration that a
    // format is not decoration: the same sighting photographed on 126 film comes back in a frame
    // that is neither the scene's 16:9 nor a phone's tall rectangle. 28 x 28 mm of image behind a
    // 43 mm lens (the Instamatic 100's own), so 36 degrees of field each way.
    id: "instamatic-126",
    name: { en: "Instamatic, 126 film", fr: "Instamatic, film 126" },
    projection: "rectilinear",
    frame: { widthMm: 28, heightMm: 28, focalLengthMm: 43 },
    // Everything about this camera is fixed, which is the point of it: one aperture, one shutter
    // speed, one focal length. A witness holding one had nothing to set and nothing to get wrong.
    fNumber: 11,
    exposureSeconds: 1 / 90,
    // The line ran from 1963 to 1988, and it is what most people photographing anything in the
    // sixties and seventies were holding.
    years: { from: 1963, to: 1988 },
    apertureBlades: 5
  },
  {
    // The serious camera of the same decades: 36 x 24 mm behind the 50 mm lens that came on the
    // body, giving the narrow 27-degree vertical field that is why a photographed light so often
    // has nothing recognisable beside it in the frame.
    id: "slr-35mm-50",
    name: { en: "35 mm SLR, 50 mm lens", fr: "Reflex 35 mm, objectif 50 mm" },
    projection: "rectilinear",
    frame: { widthMm: 36, heightMm: 24, focalLengthMm: 50 },
    // The one device here where a witness chose: a fast normal lens stopping down to f/16, and a
    // shutter from a thousandth to a long pose on B.
    fNumber: 8,
    fNumberRange: { min: 2, max: 16 },
    exposureSeconds: 1 / 250,
    exposureRangeSeconds: { min: 1 / 1000, max: 30 },
    // Dated from the Nikon F, which is when an SLR became an object an ordinary witness might own.
    years: { from: 1959 },
    apertureBlades: 6
  },
  {
    // The lens a photographed light is most often taken with, and the one entry here that ZOOMS: a
    // 70-210 mm on the same 36 x 24 frame, so its field runs from 19 degrees down to 6.5. It is also
    // the reason a distant aircraft can fill a frame — and the reason a hand-held shot at 210 mm
    // shakes.
    id: "slr-35mm-zoom",
    name: { en: "35 mm SLR, 70-210 mm zoom", fr: "Reflex 35 mm, zoom 70-210 mm" },
    projection: "rectilinear",
    frame: { widthMm: 36, heightMm: 24, focalLengthMm: 135, focalRangeMm: { minMm: 70, maxMm: 210 } },
    fNumber: 8,
    fNumberRange: { min: 4, max: 22 },
    exposureSeconds: 1 / 250,
    exposureRangeSeconds: { min: 1 / 1000, max: 30 },
    // Zooms of the period commonly had more blades than a prime.
    apertureBlades: 8,
    years: { from: 1975 }
  },
  {
    // A modern phone's main camera, landscape: about 7.6 x 5.7 mm of sensor behind a 5.7 mm lens —
    // the "26 mm equivalent" everybody quotes, which is 67 degrees across.
    id: "phone-landscape",
    name: { en: "Phone, held sideways", fr: "Téléphone, tenu couché" },
    projection: "rectilinear",
    frame: { widthMm: 7.6, heightMm: 5.7, focalLengthMm: 5.7 },
    // No diaphragm at all: the opening is fixed and round, which is why the star is absent and why
    // its depth of field is so deep that almost everything comes out sharp. The exposure is the
    // phone's own to choose, from a daylight thousandth to a night-mode ten seconds.
    exposureSeconds: 1 / 120,
    exposureRangeSeconds: { min: 1 / 8000, max: 10 },
    // Dated from the first phone camera anybody would bother pointing at the sky.
    years: { from: 2007 },
    // A phone's aperture is fixed and round: no blades, and so no star on a bright light — which is
    // one way to tell a phone's photograph of the Sun from an SLR's.
    apertureBlades: undefined
  },
  {
    // The same silicon, held the way people actually hold a phone. The picture is TALLER than it is
    // wide — 67 degrees up and down against 53 across — and a witness who filmed a light rising had
    // rather more sky above it and rather less horizon than the landscape entry would draw.
    id: "phone-portrait",
    name: { en: "Phone, held upright", fr: "Téléphone, tenu debout" },
    projection: "rectilinear",
    frame: { widthMm: 5.7, heightMm: 7.6, focalLengthMm: 5.7 },
    // No diaphragm at all: the opening is fixed and round, which is why the star is absent and why
    // its depth of field is so deep that almost everything comes out sharp. The exposure is the
    // phone's own to choose, from a daylight thousandth to a night-mode ten seconds.
    exposureSeconds: 1 / 120,
    exposureRangeSeconds: { min: 1 / 8000, max: 10 },
    years: { from: 2007 },
    apertureBlades: undefined
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
   * The vertical field this project draws an UNAIDED witness through, degrees.
   *
   * A choice, and the one place it is now stated. A human field is about 130 degrees tall and 200
   * wide; this shows the middle of it, which is the part where acuity is real (past thirty degrees
   * off-axis it has already fallen tenfold) and about as much as a flat picture can carry — the
   * equidistant resampling this project draws an eye with tops out near 78 degrees vertical on a
   * 16:9 frame before its own source would need a cubemap.
   *
   * It is a DEFAULT, not a law: a recording states its own field per keyframe (ObserverPose.fovDeg),
   * which is what a witness with binoculars, or a camera zooming, actually needs.
   */
  static readonly UNAIDED_FIELD_DEG = 60

  /** The shape this project draws its own scene in, for anything with no frame of its own — an eye,
   * or a camera nobody identified. */
  static readonly UNAIDED_ASPECT = 16 / 9

  /**
   * The vertical field an instrument takes in, degrees — `2·atan(h / 2f)` for anything with a frame,
   * and the unaided field for anything without one.
   *
   * VERTICAL because that is the axis every projection in this project is anchored on (see
   * ImageProjection: the image's full height spans exactly the field). Which is also why holding a
   * phone upright genuinely changes this rather than merely rotating the picture.
   */
  static fieldOfViewDeg(instrument: Instrument): number {
    const frame = instrument.frame
    if (!frame) return Instruments.UNAIDED_FIELD_DEG
    return (2 * Math.atan(frame.heightMm / (2 * frame.focalLengthMm)) * 180) / Math.PI
  }

  /** How wide its picture is against its height. */
  static aspectOf(instrument: Instrument): number {
    const frame = instrument.frame
    return frame ? frame.widthMm / frame.heightMm : Instruments.UNAIDED_ASPECT
  }

  /**
   * How wide the drawing space is for that instrument, in the fixed pixels every shape's bounds are
   * expressed in.
   *
   * THE HEIGHT IS THE INVARIANT, and that is what keeps a change of instrument from moving anything
   * vertically: the image's full height is exactly the field (see ImageProjection), so holding it
   * fixed means one degree is the same number of pixels before and after, and only how much sky
   * stands to the sides changes. A square frame is 360 wide, a phone held upright 270, an eye 640.
   */
  static frameWidthPx(instrument: Instrument, heightPx: number): number {
    return Math.round(heightPx * Instruments.aspectOf(instrument))
  }

  /**
   * Every instrument that existed in that year — what a picker should offer, and the reason to date
   * the catalogue at all.
   *
   * Only ever narrows a CHOICE. A file that names a device its own date says could not have existed
   * still resolves to it (see byId): the record is the record, and this project reports what a file
   * claims rather than silently correcting it.
   */
  static availableAt(year: number | undefined): Instrument[] {
    if (year === undefined) return INSTRUMENTS
    return INSTRUMENTS.filter(
      instrument =>
        !instrument.years || (year >= instrument.years.from && (instrument.years.to === undefined || year <= instrument.years.to))
    )
  }

  /**
   * The vertical field a lens of that focal length takes in on that instrument's frame, degrees.
   *
   * The same `2·atan(h/2f)` fieldOfViewDeg uses, with the focal a recording states rather than the
   * one the device sits at — which is what a zoom IS. Undefined for anything with no frame: there
   * is no focal length to set on an eye.
   */
  static fieldOfViewDegAt(instrument: Instrument, focalLengthMm: number): number | undefined {
    const frame = instrument.frame
    if (!frame || focalLengthMm <= 0) return undefined
    return (2 * Math.atan(frame.heightMm / (2 * focalLengthMm)) * 180) / Math.PI
  }

  /**
   * The exact inverse: what focal length a stated field of view means on that instrument.
   *
   * A recording keeps the FIELD (ObserverPose.fovDeg) rather than the focal, because a field is
   * what an eye and a lens have in common and what every projection here is anchored on. Millimetres
   * are how a photographer says it, so the editor shows those and converts here — one value, two
   * ways of writing it, and no second source of truth.
   */
  static focalLengthMmFor(instrument: Instrument, fieldOfViewDeg: number): number | undefined {
    const frame = instrument.frame
    if (!frame || fieldOfViewDeg <= 0 || fieldOfViewDeg >= 180) return undefined
    return frame.heightMm / (2 * Math.tan((fieldOfViewDeg * Math.PI) / 360))
  }

  /**
   * How far the diaphragm's blades actually stand in the beam, 0 to 1 — and so how much of a star
   * they throw.
   *
   * A lens WIDE OPEN has swung its blades clear: the opening is the round barrel itself, there is no
   * straight edge left to diffract at, and the same lens that starbursts at f/16 gives a plain round
   * blob at f/2. Stated as the fraction of the way from wide open to fully stopped down, so a device
   * with no diaphragm at all (a phone, an eye) never gets one and a fixed-aperture box camera gets
   * whatever its one aperture gives.
   */
  static bladesShowing(instrument: Instrument, fNumber: number | undefined): number {
    const set = fNumber ?? instrument.fNumber
    if (set === undefined || instrument.apertureBlades === undefined) return 0
    const range = instrument.fNumberRange
    if (!range) return 1
    if (range.max <= range.min) return 1
    return Math.max(0, Math.min(1, (set - range.min) / (range.max - range.min)))
  }

  /** What a lens throws when nothing about the device says otherwise — see Instrument.flare. */
  static readonly LENS_FLARE_ARTIFACTS = 1

  /**
   * How strongly the lens-flare artefacts show for that instrument — the device's own value, or a
   * lens's ordinary share, or nothing at all for something with no glass in it.
   *
   * This replaced a slider. How much flare a photograph carries is not a preference: it is whether
   * the witness was holding a camera, which the instrument already says.
   */
  static flareArtifactsOf(instrument: Instrument): number {
    return instrument.flare ?? Instruments.LENS_FLARE_ARTIFACTS
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
