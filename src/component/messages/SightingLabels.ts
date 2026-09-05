/** The field labels and value names that describe a Sighting itself — everything the
 * parameter summary needs to say what a recording states, and nothing about the editor
 * that produced it. Split out of UfoRecorderMessages so that `<rr0-eyewitness>` can show
 * the same summary without pulling in the recorder's other ~140 strings (1.7 KB against
 * 10.6 KB), and so that "Cloud cover" is written down exactly once. */
export interface SightingLabels {
  color: string
  transparency: string
  halo: string
  /** How indistinct the witness said the object's edges were — see BaseShape.blur. */
  blur: string
  /** How dazzling the witness said it was — see BaseShape.brightness. */
  brightness: string
  shapeTitle: string
  /** objectSize/objectDistance's own placeholders — both say "as reported", the whole point
   * being that these are the witness's numbers, not the drawing's. */
  /** The observation's own legal time zone — see SightingEvent.utcOffsetHours. */
  utcOffset: string
  /** Kept short: it shares its row with the Record button (see template's .record-row), and a
   * long label pushed that row's own width past what the toolbar could give it. */
  /** Height of the cloud layer's base above the ground — see Weather.cloudBaseM. */
  cloudBase: string
  /** How high above the ground the witness was — see ObserverPose.elevationM. */
  elevation: string
  /** What the same pose field is called when the terrain's own height there isn't known, and the
   * altitude above sea level therefore can't be stated — see SummaryContext.groundElevationM. */
  heightAboveGround: string
  duration: string
  /** Label of the place-NAME field the Location group now leads with — testimony names a place,
   * it doesn't give coordinates (see engine/place/PlaceProvider.ts). */
  placeName: string
  latitude: string
  longitude: string
  heading: string
  pitch: string
  /** How far the instrument was tilted about its own line of sight — see ObserverPose.rollDeg. */
  roll: string
  observationTime: string
  observationEndTime: string
  witnessId: string
  witnessTitle: string
  witnessLastName: string
  witnessFirstNames: string
  caseId: string
  tags: string
  cloudCover: string
  /** The high, icy deck — distinct from the total cover, because it is the one ingredient the ice
   * halos need rather than a measure of how much sky was hidden. */
  highCloudCover: string
  cloudDarkness: string
  precipitationType: string
  precipitationNone: string
  precipitationRain: string
  precipitationSnow: string
  precipitationHail: string
  precipitationIntensity: string
  windDirection: string
  windSpeed: string
  storm: string
  /** Which timbre the witness described, and the five values SOUND_KINDS offers — "none" being a
   * reported silence, not "unknown" (see Sound.ts). */
  soundKind: string
  soundNone: string
  soundHum: string
  soundWhistle: string
  soundRumble: string
  soundCrackle: string
  /** How loud it was — relative to what the witness could describe, never a dB figure. */
  soundVolume: string
  /** How deep or how sharp, shown alongside its own value in Hz. */
  soundPitch: string
  /** Label of the field naming an actual audio recording of the sound, when one exists. */
  soundSrc: string
  /** The decor kind added by the "+" button beside it — an aircraft crossing the sky is decor like
   * any other, just decor with a trajectory. */
  decorAircraft: string
  /** Which set of lamps the selected decor object carries — see LightRig.ts. */
  decorLights: string
  /** How high above the witness the decor object sits. Zero for anything standing on the ground,
   * which is all ordinary scenery; an aircraft is the reason it exists. Setting it on an object
   * that has no trajectory gives it one, of a single instant — see UfoRecorderElement.updateDecor. */
  decorAltitude: string
  /** The lens's focal length, in millimetres — shown for anything with a frame, and read-only when
   * the device's lens does not zoom. */
  focalLength: string
  /** What the same control says for an EYE, which has no focal length: how much of their
   * surroundings the witness took in, in degrees. */
  fieldOfView: string
  /** How far the lens was stopped down. Absent from the interface entirely for a device with no
   * diaphragm at all — an eye, a phone. */
  aperture: string
  /** How long the shutter stayed open, in seconds. */
  exposure: string
  /** How far away the lens was focused. Left empty it means at infinity, which is where a camera
   * pointed at the sky is — and what decides whether a sharp photograph bounds the object's
   * distance (see DepthOfField.ts). */
  focusDistance: string
  /** The label on the control for how steadily the crystals were falling. */
  iceCrystalAlignment: string
  /** The empty entry of that picker: an object with no lamps at all, which is most scenery. */
  decorLightsNone: string
  /** What the observation was made THROUGH — see Instrument.ts. Sighting data, unlike the view
   * above: it changes the geometry of every shape, so it belongs in the file. */
  instrument: string
  /**
   * The group of everything standing around the witness, and the dropdown listing it.
   *
   * "Environment", not "Decor": what goes in here is buildings, trees, streetlights, vehicles,
   * aircraft and OTHER WITNESSES — the things that hid the object, that bound its distance by being
   * crossed, and that a viewpoint can be moved to. "Decor" named it as scenery, as though it were
   * there to dress the picture, when it is the half of the reconstruction that can put a number on
   * a metre.
   */
  decor: string
  decorBuilding: string
  decorTree: string
  decorStreetlight: string
  decorVehicle: string
  decorWitness: string
  decorEast: string
  decorNorth: string
  decorHeading: string
  decorLit: string
  decorTitle: string
  /** Number of upper stories a building decor object has (see DecorObject.floors) — shown only
   * for kind "building". */
  decorFloors: string
  /** Which floor of a building the recording witness is on (see DecorObject.occupiedFloor) —
   * shown only for kind "building" once decorWitnessSide is set. */
  decorOccupiedFloor: string
  /** Which side of the selected decor object the recording witness is positioned at, if inside it
   * at all — the select field's own label (see DecorObject.witnessSide). */
  decorWitnessSide: string
  /** decorWitnessSide's own "not inside this object" option — the field's default/empty value. */
  decorWitnessSideNone: string
  /** Heading above the 4 per-side window-opacity inputs (see DecorObject.windows). */
  decorWindows: string
  /** Shared by the window-opacity input labels AND decorWitnessSide's own non-empty options —
   * both are the same DecorSide concept (relative to the object's own heading, not a compass
   * direction), so one set of labels covers both. */
  decorSideFront: string
  decorSideBehind: string
  decorSideLeft: string
  decorSideRight: string
  /** Vehicle-only DecorSide corners — a car's left/right side has 2 windows/seats each
   * (front-door, rear-door), not 1 — see DecorSide's own doc comment. Shown instead of
   * decorSideLeft/decorSideRight for that kind (see UfoRecorderElement.syncDecorVisibility). */
  decorSideFrontLeft: string
  decorSideFrontRight: string
  decorSideBehindLeft: string
  decorSideBehindRight: string
}
