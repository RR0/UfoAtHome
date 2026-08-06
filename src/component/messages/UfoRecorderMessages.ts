/** Contract for `<rr0-ufo-recorder>`'s user-visible label strings — implemented per language
 * under this directory (`UfoRecorderMessages_en.ts`, `UfoRecorderMessages_fr.ts`) and loaded
 * via `loadUfoRecorderMessages`. */
export interface UfoRecorderMessages {
  oval: string
  saucer: string
  triangle: string
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
}
