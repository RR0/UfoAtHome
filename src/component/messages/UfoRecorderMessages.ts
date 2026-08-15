/** Contract for `<rr0-ufo-recorder>`'s user-visible label strings — implemented per language
 * under this directory (`UfoRecorderMessages_en.ts`, `UfoRecorderMessages_fr.ts`) and loaded
 * via `loadUfoRecorderMessages`. */
export interface UfoRecorderMessages {
  oval: string
  /** The "Polygon" preset button — a plain quad, the starting point for a freeform shape (see
   * Shape.ts's own createCustomPolygon doc comment). */
  polygon: string
  /** Right-click menu item, only enabled for a single polygon selection — see
   * UfoRecorderElement.addVertexAtContextMenu. */
  addVertex: string
  /** Right-click menu item, only enabled when the click landed on a real vertex of a single
   * polygon selection with more than MIN_POLYGON_VERTICES points — see
   * UfoRecorderElement.deleteVertexAtContextMenu. */
  deleteVertex: string
  /** addVertex/deleteVertex's own disabled title when the selection isn't a single polygon shape
   * (an oval, a multi-selection, or nothing selected at all). */
  notAPolygon: string
  /** deleteVertex's own disabled title when the polygon is already down to MIN_POLYGON_VERTICES
   * points — removing one more would stop being a real shape. */
  tooFewVertices: string
  color: string
  transparency: string
  halo: string
  shape: string
  shapeTitle: string
  /** The object's real reported width, in meters — one half of what makes an apparent size
   * computable rather than guessed (see ApparentSize). */
  objectSize: string
  /** How far the object was from the witness, in meters — the other half. */
  objectDistance: string
  /** Read-back of what Real size / Distance actually produce on screen. {deg} is the apparent
   * width in degrees, {moons} the same width counted in full Moons — the comparison a reader
   * can picture, and the quickest way to catch an object drawn ten times too big. */
  apparentSize: string
  /** objectSize/objectDistance's own placeholders — both say "as reported", the whole point
   * being that these are the witness's numbers, not the drawing's. */
  /** The observation's own legal time zone — see SightingEvent.utcOffsetHours. */
  utcOffset: string
  /** utcOffset's placeholder: left empty, the time zone is approximated from the longitude. */
  utcOffsetPlaceholder: string
  objectSizePlaceholder: string
  objectDistancePlaceholder: string
  addShape: string
  deleteShape: string
  /** The external Play/Pause/Loop row's own labels — see UfoRecorderElement's
   * syncPlaybackControls(). Copied verbatim from UfoMessages (UfoElement's own overlay toolbar,
   * hidden here in favor of this external row) for consistent wording. */
  play: string
  pause: string
  noDuration: string
  autoReplay: string
  group: string
  ungroup: string
  bringToFront: string
  sendToBack: string
  contextMenuDelete: string
  /** `{name}` gets replaced with the shape's own display label — its title if one's been given,
   * else its raw sourceId (e.g. "ufo-1") — see deleteShape()/shapeLabel(). */
  confirmDeleteShape: string
  /** `{count}` gets replaced with the number of selected shapes — the multi-select counterpart of
   * confirmDeleteShape, used whenever more than one shape is selected at once. */
  confirmDeleteShapes: string
  /** Explains, via the disabled context-menu items' own title, why front/back/delete are all
   * disabled together — see showContextMenu(). */
  onlyOneShape: string
  /** Bring to front's own disabled title when the selected shape is already frontmost. */
  alreadyAtFront: string
  /** Send to back's own disabled title when the selected shape is already backmost. */
  alreadyAtBack: string
  /** Group's own disabled title when fewer than 2 shapes are selected. */
  needTwoShapesToGroup: string
  /** Ungroup's own disabled title when the selected shape isn't part of a group. */
  notGrouped: string
  /** Disabled title on the Name/Color/Transparency/Halo/source-dropdown/preset fields whenever
   * more than one shape is selected — see updateAppearanceFieldsDisabledState(). */
  multipleShapesSelected: string
  /** Kept short: it shares its row with the Record button (see template's .record-row), and a
   * long label pushed that row's own width past what the toolbar could give it. */
  /** Height of the cloud layer's base above the ground — see Weather.cloudBaseM. */
  cloudBase: string
  /** How high above the ground the witness was — see ObserverPose.elevationM. */
  elevation: string
  samplingRate: string
  duration: string
  durationPlaceholder: string
  /** Duration field title/tooltip when start+end are both given but too imprecise/mismatched to
   * derive an exact duration from — see sightingDurationBlockedReason. */
  durationImprecise: string
  export: string
  importFile: string
  importUrl: string
  importUrlPlaceholder: string
  importButton: string
  importError: string
  record: string
  stop: string
  latitude: string
  longitude: string
  heading: string
  headingPlaceholder: string
  pitch: string
  observationTime: string
  observationEndTime: string
  /** Custom-validity message shown when an observation start/end field's text doesn't match
   * EDTF_TIME_PATTERN — see UfoRecorderElement.applyEdtfTimeInput. */
  edtfInvalid: string
  /** Shared placeholder for both the start and end EDTF text fields. */
  edtfPlaceholder: string
  /** `title` tooltip spelling out EDTF syntax by example, shown on the observation-start field. */
  observationTimeHint: string
  /** Same as observationTimeHint but for the observation-end field (its own example time). */
  observationEndTimeHint: string
  /** aria-label on the Oval/Polygon preset button group. */
  presetsGroupLabel: string
  witnessId: string
  witnessDirName: string
  witnessTitle: string
  witnessLastName: string
  witnessFirstNames: string
  caseId: string
  description: string
  tags: string
  tagsPlaceholder: string
  weather: string
  shapeGroup: string
  temporalGroup: string
  locationGroup: string
  observationGroup: string
  witnessGroup: string
  circumstancesGroup: string
  cloudCover: string
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
  /** How bright the Sun's dazzle reads, independent of whether the lens-flare artifacts (below)
   * are shown — see SceneRenderer.setDazzleIntensity's own doc comment. A view preference, not
   * sighting weather data (see UfoRecorderElement's lensFlareBrightnessInput field). */
  lensFlareBrightness: string
  /** Sets how strongly the optional procedural sun lens-flare artifacts show, framed as "how much
   * was the witness looking through a camera/video device" since that's physically what produces
   * them (a naked eye never sees lens-flare artifacts) — see LensFlareEffect.ts's own doc comment
   * on why it's opt-in. A view preference, not sighting weather data (see UfoRecorderElement's
   * cameraDeviceInput field). */
  cameraDevice: string
  /** Label on the dropdown listing the sighting's own decor objects — the Decor group itself no
   * longer has its own summary/heading (its fields now live inside Location/Witness instead, see
   * UfoRecorderElement's addDecorWitnessButton/addDecorBuildingButton doc comments). */
  decor: string
  decorBuilding: string
  decorTree: string
  decorStreetlight: string
  decorVehicle: string
  decorWitness: string
  /** The accessible name/tooltip for the "+" button that adds a new decor object of whichever
   * kind decorKindSelect currently shows — placed right before that dropdown ("[+] [Kind ▾]"), a
   * plain "+" glyph rather than this text (see UfoRecorderElement.addDecorBuildingButton), so
   * it's deliberately just "Add", not "Add decor" — the adjacent dropdown already says what's
   * being added. */
  addDecor: string
  deleteDecor: string
  decorEast: string
  decorNorth: string
  decorHeading: string
  decorLit: string
  decorTitle: string
  decorSightingUrl: string
  /** Right-click menu item on a witness decor object that has a sightingUrl — loads that
   * recording (see UfoRecorderElement.viewWitnessTestimony). */
  viewTestimony: string
  /** viewTestimony's own disabled title when the right-clicked witness has no sightingUrl set. */
  noWitnessRecording: string
  /** Decor context menu's "Masks ▸" flyout trigger — the arrow itself is appended in code, not
   * part of this translated string (see UfoRecorderElement.applyMessages). Its submenu lists every
   * shape/source as a checkbox (see DecorObject.occludesSourceIds), which needs no translation of
   * its own since each entry is just that shape's own name/sourceId. */
  masks: string
  /** Button in the Witness group that adds a new "other witness" decor object (see
   * UfoRecorderElement's addDecorWitnessButton) — distinct from decorWitness, that dropdown
   * option's own (now-hidden) label. */
  addWitness: string
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
