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
  decorKind: string
  /** Label on the dropdown listing the sighting's own decor objects — the Decor group itself no
   * longer has its own summary/heading (its fields now live inside Location/Witness instead, see
   * UfoRecorderElement's addDecorWitnessButton/addDecorBuildingButton doc comments). */
  decor: string
  decorBuilding: string
  decorTree: string
  decorStreetlight: string
  decorVehicle: string
  decorWitness: string
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
  /** Button in the Witness group that adds a new "other witness" decor object (see
   * UfoRecorderElement's addDecorWitnessButton) — distinct from decorWitness, that dropdown
   * option's own (now-hidden) label. */
  addWitness: string
  /** Button in the Location group that adds a new building decor object — see addWitness's own
   * doc comment for why this is a separate key from decorBuilding. */
  addBuilding: string
}
