import { html, css } from "./template.js"
import { UfoElement, registerUfo } from "./UfoElement.js"
import { SceneElement, registerScene, SCENE_ELEMENT_NAME } from "./SceneElement.js"
import { Recorder } from "../engine/record/Recorder.js"
import { RafSamplingClock } from "../engine/record/SamplingClock.js"
import { createShape, moveShapeTo } from "../engine/shape/Shape.js"
import { ApparentSize } from "../engine/shape/ApparentSize.js"
import { ImageProjection } from "../engine/instrument/ImageProjection.js"
import { Instruments } from "../engine/instrument/Instrument.js"
import type { Instrument } from "../engine/instrument/Instrument.js"
import { LightRigs } from "../engine/model/LightRig.js"
import { DARK_SKY_LIMITING_MAGNITUDE, MeteorShowers } from "../engine/astronomy/MeteorShowers.js"
import { Comets } from "../engine/astronomy/Comets.js"
import { Sporadics } from "../engine/astronomy/Sporadics.js"
import { Satellites } from "../engine/astronomy/Satellites.js"
import { IceHalos } from "../engine/atmosphere/IceHalos.js"
import { Rainbows } from "../engine/atmosphere/Rainbows.js"
import type { BowForm } from "../engine/atmosphere/Rainbows.js"
import type { HaloForm } from "../engine/atmosphere/IceHalos.js"
import { computeBodyPosition, computeMoonPhase } from "../engine/astronomy/CelestialPositions.js"
import { visibleMagnitudeLimit } from "../render3d/skyColors.js"
import type { CometAppearance } from "../engine/astronomy/Comets.js"
import { Compass } from "../engine/astronomy/Compass.js"
import { resolveDecorPlacementAt } from "../engine/model/Decor.js"
import { SightingShapes } from "../engine/persistence/SightingShapes.js"
import type { Appearance, PolygonShape, Shape, ShapeBounds, ShapePresetId } from "../engine/shape/Shape.js"
import { ShapeHandles, ShapeGroup, MIN_SHAPE_SIZE, MIN_POLYGON_VERTICES } from "../engine/shape/ShapeHandles.js"
import type { HandleId, ResizeAxis } from "../engine/shape/ShapeHandles.js"
import type { SightingRecordingJson } from "../engine/persistence/sightingJson.js"
import { DEFAULT_ICE_CRYSTAL_ALIGNMENT } from "../engine/model/Weather.js"
import type { PrecipitationType, Weather } from "../engine/model/Weather.js"
import type { People } from "../engine/model/People.js"
import type { DecorObject, DecorSide } from "../engine/model/Decor.js"
import {
  resolveDecorLitAt,
  DECOR_SIDES,
  DEFAULT_BUILDING_FLOORS,
  FIXED_WINDOW_MIN_OPACITY_PERCENT,
  defaultWindows,
  decorSidesFor,
  witnessSidesFor,
  hasWindows,
  isWindowOpenable,
  canHoldWitness
} from "../engine/model/Decor.js"
import {
  sightingDurationMs,
  sightingDurationBlockedReason,
  parseEdtfTime,
  formatEdtfTime,
  resolveSoundAt,
  resolveWeatherAt,
  resolveObserverPoseAt
} from "../engine/model/Sighting.js"
import type { SightingTime } from "../engine/model/Sighting.js"
import { WeatherInference } from "../engine/weather/WeatherInference.js"
import type { WeatherInferenceResult } from "../engine/weather/WeatherInference.js"
import { defaultWeatherProvider } from "../engine/weather/defaultWeatherProvider.js"
import type { WeatherProvider } from "../engine/weather/WeatherProvider.js"
import { defaultPlaceProvider } from "../engine/place/defaultPlaceProvider.js"
import { PLACE_SOURCES } from "../engine/place/placeSources.js"
import { WEATHER_SOURCES } from "../engine/weather/weatherSources.js"
import { SOUND_KINDS } from "../engine/model/Sound.js"
import type { SightingSound, SoundKind } from "../engine/model/Sound.js"
import { ELEVATION_SOURCES, IMAGERY_SOURCES } from "../render3d/terrain/terrainSources.js"
import { GroundElevation } from "../render3d/terrain/ElevationProvider.js"
import { TimeZones } from "../engine/time/TimeZones.js"
import { dataSourceById } from "../engine/source/DataSource.js"
import type { DataSource } from "../engine/source/DataSource.js"
import type { PlaceMatch, PlaceProvider } from "../engine/place/PlaceProvider.js"
import { sightingTimeToDate } from "../engine/astronomy/CelestialPositions.js"
import { selectLocale } from "../i18n/locale.js"
import { TIME_ZONE_SOURCES } from "../engine/time/timeZoneSources.js"
import type { TimeZoneProvider } from "../engine/time/TimeZoneProvider.js"
import { loadUfoRecorderMessages, UFO_SUPPORTED_LANGUAGES } from "./messages/index.js"
import type { UfoLanguage } from "./messages/index.js"
import { ufoRecorderMessages_en } from "./messages/UfoRecorderMessages_en.js"
import type { UfoRecorderMessages } from "./messages/UfoRecorderMessages.js"

registerUfo()
registerScene()

const DEFAULT_SHAPE_SIZE = { width: 48, height: 28 }
/** How long a tuned sound keeps playing after the last edit to it — long enough to judge the
 * timbre against what was heard, short enough that a hum doesn't follow the witness around the
 * rest of the editor. Playback itself is unaffected: this only bounds the preview that plays while
 * paused (see UfoElement.previewSound). */
const SOUND_PREVIEW_MS = 2500

/** How long a date/place edit must settle before the weather record is looked up again. Long
 * enough that typing a latitude digit by digit is one request, not six — the values it asks about
 * only become meaningful once the field is finished anyway. */
const WEATHER_LOOKUP_DEBOUNCE_MS = 600

/** How long a coordinate edit must settle before the place name is re-derived from it. Longer than
 * the weather's: this one asks Nominatim, which asks not to be polled (see its provider), and a
 * latitude typed digit by digit passes through several perfectly real places on the way. */
const PLACE_REVERSE_DEBOUNCE_MS = 900

/** Below this, a coordinate change is the same spot — the ~11 m a fourth decimal of latitude buys,
 * which is finer than any place name is. Keeps a re-render or a rounding write from asking again. */
const SAME_PLACE_DEG = 0.0002

/** Same restraint as the reverse lookup, and for the same reason: a latitude typed digit by digit
 * would otherwise fetch a tile per keystroke. */
const GROUND_ELEVATION_DEBOUNCE_MS = 900

/** How far a declared legal time zone may sit from its own longitude's solar time before the
 * recording is stating something no country has ever done. China's western edge, the widest real
 * case, is about 3 h — see updateUtcOffsetValidity on why this errs so far toward silence. */
const MAX_LEGAL_SOLAR_OFFSET_GAP_HOURS = 3
/** Mouse-drag-to-look sensitivity for the "landscape drag" — see beginCameraDrag. A full drag
 * across the canvas's own 640px internal width is ~130deg, a reasonable full sweep without being
 * so twitchy that fine-tuning a heading/pitch by hand becomes fiddly. */
const CAMERA_DRAG_DEG_PER_PX = 0.2
/** How close two fields have to be to count as the same one, degrees. Only ever used to tell a
 * field NOBODY STATED — one this recorder wrote from an instrument's own optics — from one somebody
 * meant, so that changing the instrument may retune the first and must never touch the second. */
const SAME_FIELD_EPSILON_DEG = 0.01

/** A standing witness's eye height, the same 1.6 m SceneRenderer puts the camera at — what a pitch
 * towards a decor object has to be measured FROM (see lookAtDecor). */
const EYE_HEIGHT_M = 1.6

/** Half the length of the pass a freshly added aircraft flies, and the speed it flies it at —
 * 250 m/s is 900 km/h, an airliner's cruise. Together they give the crossing its own real duration
 * (32 s over 8 km), independent of how long the recording happens to be. */
const AIRCRAFT_PASS_HALF_LENGTH_M = 2000
const AIRCRAFT_CRUISE_M_PER_S = 250

const ARROW_KEYS = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"])
/** Px per arrow-key press, for both moving and resizing the selected shape — see
 * moveOrResizeSelectedShape. Small enough for fine nudges, still visible in one press. */
const ARROW_KEY_STEP_PX = 4
const DEFAULT_SOURCE_ID = "ufo-1"
const PRESET_IDS: ShapePresetId[] = ["oval", "polygon"]
const DEFAULT_APPEARANCE: Appearance = { presetId: "oval", color: "#39ff14", transparency: 0, haloScale: 1.5 }

/** What the pointer is currently over on the canvas, as written to its own `data-cursor`
 * attribute — the canvas's contents are drawn, not DOM, so only script can hit-test them, but
 * every one of these names is turned into an actual cursor by a plain CSS rule (see
 * ufoTemplate's own canvas[data-cursor] block) rather than by assigning style.cursor here. */
type CanvasCursor = "record" | "select" | "move" | "vertex" | "pan" | "panning" | "rotate" | `resize-${ResizeAxis}`

/** Best-effort reverse mapping from a recorded/loaded shape back to a preset id, so the preset
 * buttons' pressed-state stays honest after scrubbing to or selecting a shape. Every polygon —
 * whether freshly created from the "Polygon" preset, reshaped via vertex editing, or loaded from
 * older data that still has the former fixed "Saucer"/"Triangle" presets' own 8/3-point geometry
 * — maps to "polygon" now that those presets are gone; this never affects color/transparency/
 * haloScale syncing, only which preset button highlights. */
function presetIdForShape(shape: Shape): ShapePresetId {
  return shape.kind === "oval" ? "oval" : "polygon"
}

/**
 * Vanilla Web Component (no framework/library) for authoring a sighting
 * recording: shape/appearance toolbar + drag-to-record, composing a nested
 * `<rr0-scene>` (see SceneElement) for the canvas — not a bare `<rr0-ufo>` —
 * so the shape being drawn is always seen against the sighting's own real
 * sky (computed live from whatever lat/lng/heading/date-time this editor's
 * own toolbar currently holds). This element already carries the heavier
 * authoring-only code (Recorder engine, SamplingClock, appearance toolbar),
 * so absorbing `<rr0-scene>`'s own three.js/astronomy-engine weight on top
 * is a deliberate, accepted trade-off — a page that only needs to *play* a
 * sighting (the common case: an rr0.org case dossier) should still embed
 * the much lighter `<rr0-ufo>` (or `<rr0-scene>` alone) directly, never this.
 *
 * `this.ufoElement` is the nested `<rr0-scene>`'s OWN `ufoElement` (reached
 * through, not a separate instance) — every existing shape-editing call site
 * below (canvas/pointer handling, timeline access, appearance painting)
 * keeps working unchanged, and since it's the exact same UfoElement/Sighting
 * instance the nested SceneElement itself reads from on every `timeupdate`,
 * an observer/time/appearance edit here reaches the sky with no separate
 * sync step needed.
 *
 * All wiring happens in the constructor (this element has no attribute/
 * connection dependency). The nested scene element is created via
 * `document.createElement` rather than left inline in the template markup —
 * see the comment at that call site for why an inline tag wouldn't be
 * upgraded yet at construction time.
 */
export class UfoRecorderElement extends HTMLElement {
  private readonly shadow: ShadowRoot
  private readonly sceneElement: SceneElement
  private readonly ufoElement: UfoElement
  private readonly recordButton: HTMLButtonElement
  private readonly samplingRateInput: HTMLInputElement
  private readonly presetButtons: Record<ShapePresetId, HTMLButtonElement>
  private readonly presetsGroup: HTMLElement
  private readonly colorInput: HTMLInputElement
  private readonly transparencyInput: HTMLInputElement
  private readonly haloScaleInput: HTMLInputElement
  private readonly sourceSelect: HTMLSelectElement
  private readonly shapeTitleInput: HTMLInputElement
  /** The witness's own reported size/distance for the selected shape — the pair that makes
   * its on-screen size computable instead of eyeballed (see ApparentSize/applySizeHypothesis).
   * apparentSizeOutput reads back what they actually produce. */
  private readonly utcOffsetInput: HTMLInputElement
  private readonly timeZoneSelect: HTMLSelectElement
  /** Which service is asked what legal zone a place falls in — see TimeZoneProvider. */
  private readonly timeZoneProvider: TimeZoneProvider = TIME_ZONE_SOURCES[0].create()
  private timeZoneLookupTimer?: ReturnType<typeof setTimeout>
  /** The coordinates the last zone lookup was made for, so moving within the same spot doesn't
   * ask again — same guard as schedulePlaceReverse's own namedCoordinates. */
  private timeZoneLookedUpAt?: { lat: number; lng: number }
  /** The zone this element filled in itself, as opposed to one the author picked. Only its own
   * answer may be replaced when the place moves — what the author states outranks what a service
   * infers, the same rule the weather follows, and without this marker the two are
   * indistinguishable. In memory only: a saved file records the zone, not who chose it. */
  private autoFilledTimeZone?: string
  private readonly timeZones = new TimeZones()
  private readonly objectSizeInput: HTMLInputElement
  private readonly objectDistanceInput: HTMLInputElement
  private readonly apparentSizeOutput: HTMLElement
  /** Where the only meters a recording can honestly produce are shown — see refreshRealSize. */
  private readonly realSizeOutput: HTMLElement
  private readonly addShapeButton: HTMLButtonElement
  private readonly deleteShapeButton: HTMLButtonElement
  private readonly contextMenu: HTMLElement
  private readonly contextGroupButton: HTMLButtonElement
  private readonly contextUngroupButton: HTMLButtonElement
  private readonly contextBringToFrontButton: HTMLButtonElement
  private readonly contextSendToBackButton: HTMLButtonElement
  private readonly contextDeleteButton: HTMLButtonElement
  private readonly contextAddVertexButton: HTMLButtonElement
  private readonly contextDeleteVertexButton: HTMLButtonElement
  private readonly decorContextMenu: HTMLElement
  private readonly contextViewTestimonyButton: HTMLButtonElement
  /** The "Masks ▸" flyout's own container — rebuilt fresh (refreshContextMasksSubmenu) every time
   * the decor context menu opens, see DecorObject.occludesSourceIds's own doc comment. */
  private readonly contextMasksSubmenu: HTMLElement
  private readonly labelContextMasks: HTMLElement
  // External playback row — see the constructor's ufoElement.showToolbar comment for why this
  // recorder drives its own controls instead of the nested ufo's overlaid ones.
  private readonly playPauseButton: HTMLButtonElement
  private readonly seekInput: HTMLInputElement
  private readonly timeStartLabel: HTMLElement
  private readonly timeEndLabel: HTMLElement
  private readonly loopButton: HTMLButtonElement
  private readonly durationInput: HTMLInputElement
  private readonly exportButton: HTMLButtonElement
  private readonly importFileInput: HTMLInputElement
  private readonly importUrlInput: HTMLInputElement
  private readonly importUrlButton: HTMLButtonElement
  private readonly placeNameInput: HTMLInputElement
  private readonly searchPlaceButton: HTMLButtonElement
  private readonly placeMatchRow: HTMLElement
  private readonly placeMatchSelect: HTMLSelectElement
  private readonly placeStatusText: HTMLElement
  /** Swappable for tests and for any embedder wanting a different geocoder — the element itself
   * only ever names the interface, same as for weather and terrain. */
  private placeProvider: PlaceProvider = defaultPlaceProvider()
  /** The candidates the last search returned, in the order the picker lists them. */
  private placeMatches: PlaceMatch[] = []
  /** Bumped per search so a slow answer to an old name can never land on a newer one. Shared with
   * the reverse lookup, which asks the same question the other way round. */
  private placeSearchToken = 0
  private placeReverseTimer?: ReturnType<typeof setTimeout>
  /** The coordinates the displayed name is known to describe — what tells a real move apart from
   * this element writing back the coordinates it just resolved (see applyPlaceMatch). */
  private namedCoordinates?: { lat: number; lng: number }
  private readonly latInput: HTMLInputElement
  private readonly lngInput: HTMLInputElement
  private readonly headingInput: HTMLInputElement
  private readonly pitchInput: HTMLInputElement
  private readonly elevationInput: HTMLInputElement
  private readonly groundElevationOutput: HTMLElement
  /** The ground's own height above sea level at the current location, once it is known — what the
   * Altitude field is measured from (see applyGroundElevation). Undefined while it isn't known, and
   * then the field is a plain height above an unstated datum, exactly as it always was. */
  /**
   * Whether the weather SHOULD be read from records, as last decided — by the witness's own toggle,
   * or by what a loaded recording says (see syncWeatherOwnership). Deliberately distinct from the
   * checkbox's own state, which is this AND whether a lookup is possible at all: a sighting with no
   * date or no place shows it unchecked, because a ticked box there would claim a record is being
   * read when nothing has been asked. It ticks itself again the moment the sighting says enough,
   * without forgetting a witness who had turned it off.
   */
  private weatherFromRecords = true
  private groundElevationM?: number
  /** The coordinates groundElevationM was resolved for — the ground under a place doesn't move, so
   * it is asked once per place rather than on every observer edit. See scheduleGroundElevation for
   * the loop this ends. */
  private groundElevationFor?: { lat: number; lng: number }
  private groundElevationTimer?: ReturnType<typeof setTimeout>
  private groundElevationToken = 0
  private readonly obsTimeInput: HTMLInputElement
  private readonly obsEndTimeInput: HTMLInputElement
  private readonly witnessIdInput: HTMLInputElement
  private readonly witnessDirNameInput: HTMLInputElement
  private readonly witnessTitleInput: HTMLInputElement
  private readonly witnessLastNameInput: HTMLInputElement
  private readonly witnessFirstNamesInput: HTMLInputElement
  private readonly caseIdInput: HTMLInputElement
  private readonly descriptionInput: HTMLTextAreaElement
  private readonly tagsInput: HTMLInputElement
  private readonly cloudCoverInput: HTMLInputElement
  private readonly cloudDarknessInput: HTMLInputElement
  private readonly cloudBaseInput: HTMLInputElement
  private readonly precipitationTypeSelect: HTMLSelectElement
  private readonly precipitationIntensityInput: HTMLInputElement
  private readonly windDirectionInput: HTMLInputElement
  private readonly windSpeedInput: HTMLInputElement
  private readonly stormInput: HTMLInputElement
  private readonly weatherInferredInput: HTMLInputElement
  private readonly weatherSourceText: HTMLElement
  /** What else was in that sky — see refreshSkyCandidates. */
  private readonly skyCandidatesOutput: HTMLElement
  private readonly showMeteorButton: HTMLButtonElement
  private readonly showCometButton: HTMLButtonElement
  private readonly weatherSourceLink: HTMLAnchorElement
  /** Every field the weather record itself provides — the ones locked while it does, and the ones
   * whose edits write a keyframe while it doesn't. */
  private readonly weatherFields: (HTMLInputElement | HTMLSelectElement)[]
  /** Swappable for tests and for any embedder wanting a different record — the element itself only
   * ever names the interface, same as SceneRenderer does for terrain. Rebuilds the inference so a
   * provider set after construction is the one actually used. */
  private weatherInference = new WeatherInference(defaultWeatherProvider())
  private weatherLookupTimer?: ReturnType<typeof setTimeout>
  /** Bumped per lookup so a slow answer to an old date can never land on a newer one. */
  private weatherLookupToken = 0
  private weatherLookupPending = false
  /** The last answer, kept so the status line can be re-rendered (on a language change, on a
   * playhead move) without asking the record again. */
  private weatherLookupResult?: WeatherInferenceResult
  /** The seekable span the current weather track was laid out against — see
   * ensureWeatherTrackSpan for the freeze this catches. */
  private weatherTrackSpan?: number
  private readonly soundKindSelect: HTMLSelectElement
  private readonly soundVolumeInput: HTMLInputElement
  private readonly soundPitchInput: HTMLInputElement
  private readonly soundPitchValue: HTMLElement
  private readonly soundSrcInput: HTMLInputElement
  /** Every field the sighting's sound is read from — listened to as one, exactly like
   * weatherFields. */
  private readonly soundFields: (HTMLInputElement | HTMLSelectElement)[]
  /** The kind dropdown's options, kept so applyMessages can retranslate them: they're built from
   * SOUND_KINDS in script (see buildSoundKindOptions), not from markup with per-option ids. */
  private readonly soundKindOptions = new Map<SoundKind, HTMLOptionElement>()
  private soundPreviewTimer?: ReturnType<typeof setTimeout>
  /** Which instrument the sighting was made through — sighting data, not a view preference, and the
   * one control here that changes the geometry of every shape (see Instrument.ts). */
  private readonly instrumentSelect: HTMLSelectElement
  /** What that instrument was SET to. Each writes the pose at the playhead, exactly as the
   * heading and the pitch do, and each is disabled when the device leaves nothing to set — see
   * syncOpticsFromInstrument. */
  private readonly focalLengthInput: HTMLInputElement
  private readonly labelFocalLength: HTMLElement
  private readonly unitFocalLength: HTMLElement
  private readonly labelFNumber: HTMLElement
  private readonly labelExposure: HTMLElement
  private readonly labelFocusDistance: HTMLElement
  private readonly fNumberInput: HTMLInputElement
  private readonly exposureInput: HTMLInputElement
  private readonly focusDistanceInput: HTMLInputElement
  private readonly labelColor: HTMLElement
  private readonly labelTransparency: HTMLElement
  private readonly labelHalo: HTMLElement
  private readonly labelShape: HTMLElement
  private readonly labelShapeTitle: HTMLElement
  private readonly labelUtcOffset: HTMLElement
  private readonly labelObjectSize: HTMLElement
  private readonly labelObjectDistance: HTMLElement
  private readonly labelSamplingRate: HTMLElement
  private readonly labelDuration: HTMLElement
  private readonly placeSourceRow: HTMLElement
  private readonly weatherSourceRow: HTMLElement
  private readonly terrainSourceRows: HTMLElement
  /** Which entry of each registry is live — held here rather than read back off the pickers so
   * rebuilding the rows (a language change) can restore the selection. */
  private readonly chosenSourceId = new Map<string, string>()
  private readonly labelPlaceName: HTMLElement
  private readonly labelPlaceMatch: HTMLElement
  private readonly labelLatitude: HTMLElement
  private readonly labelLongitude: HTMLElement
  private readonly labelHeading: HTMLElement
  private readonly labelPitch: HTMLElement
  private readonly labelElevation: HTMLElement
  private readonly labelObservationTime: HTMLElement
  private readonly labelObservationEndTime: HTMLElement
  private readonly labelWitnessId: HTMLElement
  private readonly labelWitnessDirName: HTMLElement
  private readonly labelWitnessTitle: HTMLElement
  private readonly labelWitnessLastName: HTMLElement
  private readonly labelWitnessFirstNames: HTMLElement
  private readonly labelCaseId: HTMLElement
  private readonly labelDescription: HTMLElement
  private readonly labelTags: HTMLElement
  private readonly labelWeather: HTMLElement
  private readonly labelImportFile: HTMLElement
  private readonly labelImportUrl: HTMLElement
  private readonly labelShapeGroup: HTMLElement
  private readonly labelTemporalGroup: HTMLElement
  private readonly labelLocationGroup: HTMLElement
  private readonly labelObservationGroup: HTMLElement
  private readonly labelWitnessGroup: HTMLElement
  private readonly labelCircumstancesGroup: HTMLElement
  private readonly labelCloudCover: HTMLElement
  private readonly labelHighCloud: HTMLElement
  private readonly labelIceAlignment: HTMLElement
  private readonly highCloudCoverInput: HTMLInputElement
  /** The one weather control no record can fill in — see Weather.iceCrystalAlignment. */
  private readonly iceCrystalAlignmentInput: HTMLInputElement
  private readonly labelCloudDarkness: HTMLElement
  private readonly labelCloudBase: HTMLElement
  private readonly labelPrecipitationType: HTMLElement
  private readonly labelPrecipitationIntensity: HTMLElement
  private readonly labelWindDirection: HTMLElement
  private readonly labelWindSpeed: HTMLElement
  private readonly labelStorm: HTMLElement
  private readonly labelWeatherInferred: HTMLElement
  private readonly labelSoundGroup: HTMLElement
  private readonly labelSoundKind: HTMLElement
  private readonly labelSoundVolume: HTMLElement
  private readonly labelSoundPitch: HTMLElement
  private readonly labelSoundSrc: HTMLElement
  private readonly labelInstrument: HTMLElement
  private readonly optionPrecipitationNone: HTMLElement
  private readonly optionPrecipitationRain: HTMLElement
  private readonly optionPrecipitationSnow: HTMLElement
  private readonly optionPrecipitationHail: HTMLElement
  private readonly decorKindSelect: HTMLSelectElement
  private readonly addDecorWitnessButton: HTMLButtonElement
  /** A plain "+" glyph (its accessible name/tooltip is "Add decor", not "Add building" — see
   * template's own comment on this rename) that adds whatever kind decorKindSelect currently
   * shows, building included now that it's no longer hidden from that dropdown — the ONLY way to
   * add a building/tree/streetlight/vehicle. Only "other witness" still gets its own dedicated
   * button (addDecorWitnessButton) and stays hidden from the dropdown, since a witness has no
   * other fields to configure via it beforehand. */
  private readonly addDecorBuildingButton: HTMLButtonElement
  private readonly deleteDecorButton: HTMLButtonElement
  private readonly decorSelect: HTMLSelectElement
  private readonly decorTitleInput: HTMLInputElement
  private readonly decorEastInput: HTMLInputElement
  private readonly decorNorthInput: HTMLInputElement
  private readonly decorHeadingInput: HTMLInputElement
  private readonly decorLitInput: HTMLInputElement
  /** Which set of lamps the selected decor object carries — see LightRig.ts. Rebuilt for each
   * selection, since the rigs that make sense on a tree are not the ones that make sense on an
   * aircraft. */
  private readonly decorLightRigSelect: HTMLSelectElement
  private readonly lookAtDecorButton: HTMLButtonElement
  private readonly decorAltitudeInput: HTMLInputElement
  private readonly labelDecorAltitude: HTMLElement
  private readonly decorSightingUrlInput: HTMLInputElement
  private readonly decorFloorsInput: HTMLInputElement
  private readonly decorOccupiedFloorInput: HTMLInputElement
  private readonly decorWitnessSideSelect: HTMLSelectElement
  /** One 0-100 opacity number input per DecorSide (empty = no window at all on that side), keyed
   * the same way as DecorObject.windows itself — see syncDecorFields/updateDecorWindows, which
   * iterate DECOR_SIDES rather than one branch per side. Each input's own `min` is raised to
   * FIXED_WINDOW_MIN_OPACITY_PERCENT per isWindowOpenable (e.g. a vehicle's front/behind windshield/
   * rear window are fixed — see syncDecorVisibility). */
  private readonly decorWindowInputs: Record<DecorSide, HTMLInputElement>
  private readonly labelDecorSide: Record<DecorSide, HTMLElement>
  private readonly optionWitnessSide: Record<DecorSide, HTMLOptionElement>
  private readonly labelDecor: HTMLElement
  /** The <legend> of the fieldset wrapping every decor-object field (Add through Occupied floor)
   * inside the Location group — reuses the same "Decor" text as labelDecor (the object-picker's
   * own label), just on a different element, so no separate message key is needed. */
  private readonly labelDecorFieldset: HTMLElement
  private readonly labelDecorTitle: HTMLElement
  private readonly labelDecorEast: HTMLElement
  private readonly labelDecorNorth: HTMLElement
  private readonly labelDecorHeading: HTMLElement
  private readonly labelDecorLit: HTMLElement
  private readonly labelDecorSightingUrl: HTMLElement
  private readonly labelDecorFloors: HTMLElement
  private readonly labelDecorOccupiedFloor: HTMLElement
  private readonly labelDecorWitnessSide: HTMLElement
  private readonly labelDecorWindows: HTMLElement
  private readonly optionWitnessSideNone: HTMLOptionElement
  private readonly optionDecorBuilding: HTMLElement
  private readonly optionDecorTree: HTMLElement
  private readonly optionDecorStreetlight: HTMLElement
  private readonly optionDecorVehicle: HTMLElement
  private readonly optionDecorAircraft: HTMLElement
  private readonly labelDecorLights: HTMLElement
  private readonly optionDecorWitness: HTMLElement

  private recorder?: Recorder
  private isRecording = false
  /** Matches the template's baked-in English defaults until (if ever) loadLocaleMessages()
   * resolves a better match — see its doc comment. */
  private messages: UfoRecorderMessages = ufoRecorderMessages_en
  private currentAppearance: Appearance = { ...DEFAULT_APPEARANCE }
  /** Which source/shape the appearance toolbar (Name/Color/Transparency/Halo/source dropdown) and
   * Record button currently target — the selection "anchor"/last-interacted shape. Always a member
   * of selectedSourceIds. */
  private currentSourceId: string = DEFAULT_SOURCE_ID
  /** The full active multi-selection — always a non-empty superset containing currentSourceId
   * (shift-clicking away the last remaining member is a no-op, mirroring deleteShape()'s own
   * "always keep at least one shape" convention, so this never needs to go empty/undefined). A
   * size of 1 is the plain single-shape case every pre-existing code path already handled;
   * size > 1 is what selectUnit/toggleUnitSelection below add. */
  private selectedSourceIds: Set<string> = new Set([DEFAULT_SOURCE_ID])
  /** Which decor object the Decor group's East/North/Heading/Lit fields currently target —
   * undefined whenever the sighting has no decor at all yet. Unlike currentSourceId, this is
   * allowed to be empty: a recording with zero decor objects is the common case (decor is opt-in
   * scenery, not something every sighting needs), unlike currentSourceId which always has at
   * least one shape. */
  private currentDecorId?: string
  /** Which decor object the DECOR context menu (right-click on the 3D canvas, distinct from the
   * SHAPE context menu's own currentSourceId) currently targets — set by onContextMenu, read by
   * viewWitnessTestimony(). Only ever set while decorContextMenu is actually open. */
  private contextMenuDecorId?: string
  /** The canvas-space point the SHAPE context menu was opened at — read by
   * addVertexAtContextMenu/deleteVertexAtContextMenu (both take canvas-space points, same as
   * every other ShapeHandles vertex method, and convert to the shape's own local frame
   * internally). Only meaningful while contextMenu is actually open on a single polygon
   * selection. */
  private contextMenuPoint?: { x: number; y: number }

  /** Set while the user is dragging the selection's body (move), a single shape's own handle
   * (resize/rotate/vertex — only reachable when exactly one shape is selected; "vertex" further
   * only when that shape is a polygon, see ShapeHandles.hitTestVertex), or the shared bounding
   * box of a multi-selection ("group-resize"/"group-rotate", both handled via a ShapeGroup
   * instance so the member list doesn't need re-passing on every pointermove) — see
   * beginDrag/onDragPointerMove/endDrag. Mutually exclusive with cameraDragState (a pointerdown
   * either hits something or it doesn't), so both share the same document-level
   * pointermove/pointerup listeners. */
  private dragState?:
    | { kind: "move"; sources: Array<{ sourceId: string; original: Shape }>; startPointer: { x: number; y: number } }
    | { kind: "resize" | "rotate"; sourceId: string; original: Shape; handle: HandleId; startPointer: { x: number; y: number } }
    | { kind: "vertex"; sourceId: string; original: PolygonShape; vertexIndex: number }
    | { kind: "group-resize"; group: ShapeGroup; handle: Exclude<HandleId, "rotate"> }
    | { kind: "group-rotate"; group: ShapeGroup; startPointer: { x: number; y: number } }

  /** Set while the user drags empty canvas (no shape under the pointer) — the "landscape" itself
   * becomes the drag target, changing the observer's own heading/pitch instead of a shape's
   * bounds. See beginCameraDrag/onCameraDragPointerMove/endDrag. startHeadingDeg/startPitchDeg are
   * captured once at drag start (not recomputed incrementally frame-to-frame) so the total
   * pointer displacement from startPointer always maps to the same absolute heading/pitch — an
   * incremental approach would compound floating-point drift and, worse, misbehave right at the
   * heading's own 360->0 wrap point. */
  private cameraDragState?: {
    startPointer: { x: number; y: number }
    startHeadingDeg: number
    startPitchDeg: number
    /** Whether this drag started while the witness is inside a decor object (see
     * isWitnessInsideDecor) — routes the drag into indoorLookYawDeg/PitchDeg + SceneElement.
     * setIndoorLook instead of witnessTrack/updateObserver, since the outside witnessTrack pose
     * is a different reference frame entirely (see SceneRenderer.setIndoorLook's own doc
     * comment) — checked once at drag-start rather than every pointermove so a drag that happens
     * to cross the moment witnessSide gets cleared mid-drag doesn't switch targets partway. */
    insideDecor: boolean
  }

  /** Whatever the pointer was last hovering over the canvas (see updateHoverCursor) — remembered
   * only so endDrag can put it back: hover detection is deliberately frozen for a drag's whole
   * duration (the cursor must keep saying "resizing"/"rotating" even as the pointer wanders off
   * the handle it grabbed, which is exactly what dragging one does), so releasing needs the
   * pre-drag answer rather than a fresh hit test the pointer may not have moved to trigger. */
  private hoverCursor?: CanvasCursor

  /** How far the witness has turned their head from center while looking through a decor
   * object's window — mirrors cameraDragState's own startHeadingDeg/startPitchDeg role, just for
   * the indoor-look case (see SceneRenderer.setIndoorLook). Reset to 0 by syncIndoorLookReset
   * whenever the inhabited object/side changes. */
  private indoorLookYawDeg = 0
  private indoorLookPitchDeg = 0
  /** `${decor.id}:${witnessSide}` of whichever decor object is currently inhabited, or undefined
   * — compared against on every syncIndoorLookReset tick purely to detect a CHANGE (a different
   * object, a different side, or no longer inhabited at all) worth resetting indoorLookYawDeg/
   * PitchDeg for; the value itself is never read for anything else. */
  private lastInhabitedKey?: string

  /** Bound once so document.removeEventListener (disconnectedCallback/endDrag) can actually
   * find them. */
  private readonly handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      if (this.isRecording) {
        // Otherwise the only way to stop is moving the pointer to the Stop button — and since
        // recording samples the latest pointer position at every tick, that walk itself gets
        // recorded as trailing motion toward the button. Escape stops in place, no side trip.
        this.toggleRecording()
      }
      if (!this.contextMenu.hidden) this.hideContextMenu()
      if (!this.decorContextMenu.hidden) this.hideDecorContextMenu()
    }
    if (ARROW_KEYS.has(event.key) || event.key === "Delete" || event.key === "Backspace") {
      // Which of the EDITOR'S OWN controls the key came from — this listener is scoped to the
      // editor (see the constructor), so a field elsewhere on the page never gets here in the first
      // place. Arrow/delete keys must reach a focused lat/lng/heading/pitch/duration/source-select
      // control untouched (moving the text cursor, nudging a number input's own value, deleting a
      // character, navigating the dropdown), not get hijacked into moving/deleting the shape.
      //
      // composedPath()[0] rather than event.target, which retargets across shadow boundaries: the
      // editor's own fields live in its shadow root, so target would be the host for every one of
      // them. (composedPath stops at a CLOSED shadow root, but the editor's is open and so is every
      // element it nests.)
      const target = event.composedPath()[0]
      if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement) return
      if (ARROW_KEYS.has(event.key)) {
        this.moveOrResizeSelectedShapes(event)
      } else {
        // deleteShape() itself is the single confirm()-gated entry point every deletion path
        // (this key, the toolbar button, the context menu) funnels through — see its own doc
        // comment for why that matters.
        this.deleteShape()
      }
    }
  }
  private readonly handleDragPointerMove = (event: PointerEvent) => this.onDragPointerMove(event)
  private readonly handleDragPointerUp = () => this.endDrag()

  constructor() {
    super()
    this.shadow = this.attachShadow({ mode: "open" })
    const template = document.createElement("template")
    template.innerHTML = `<style>${css}</style>${html}`
    this.shadow.appendChild(template.content.cloneNode(true))

    // Created imperatively (not left inline in the template markup) and inserted via
    // document.createElement, which — for an already-defined custom element — synchronously
    // runs its constructor and returns a fully-upgraded instance. An inline <rr0-scene> tag
    // parsed from `template.content.cloneNode(true)` would NOT be upgraded yet at this point:
    // elements from an inert <template> only upgrade once connected to a live document, which
    // happens later (when this recorder itself is inserted), so canvasElement/renderer/sighting
    // would still be undefined here.
    this.sceneElement = document.createElement(SCENE_ELEMENT_NAME) as SceneElement
    // N/NE/E/SE/S/SO/O/NO reference labels on the horizon — useful while authoring a heading, not
    // meaningful in the plain playback case, so this is opt-in on SceneElement rather than always on.
    this.sceneElement.setAttribute("show-compass", "")
    this.ufoElement = this.sceneElement.ufoElement
    // This canvas is used for drag-to-record shape placement instead — a plain click shouldn't
    // also toggle the nested player's playback (every recording drag ends in a native "click").
    this.ufoElement.enableClickToPlay = false
    // The nested ufo's own overlay toolbar sits on top of the canvas with a full-width seek bar —
    // that would intercept dragging/resizing a shape positioned near the bottom of the canvas.
    // This recorder drives its own external Play/Seek/Loop row (below, not overlapping) instead.
    this.ufoElement.showToolbar = false
    this.shadow.getElementById("ufo-slot")!.replaceWith(this.sceneElement)

    this.recordButton = this.shadow.getElementById("record") as HTMLButtonElement
    this.samplingRateInput = this.shadow.getElementById("samplingRate") as HTMLInputElement
    this.presetsGroup = this.shadow.getElementById("presets-group")!
    this.presetButtons = {
      oval: this.shadow.getElementById("preset-oval") as HTMLButtonElement,
      polygon: this.shadow.getElementById("preset-polygon") as HTMLButtonElement
    }
    this.colorInput = this.shadow.getElementById("color") as HTMLInputElement
    this.transparencyInput = this.shadow.getElementById("transparency") as HTMLInputElement
    this.haloScaleInput = this.shadow.getElementById("haloScale") as HTMLInputElement
    this.sourceSelect = this.shadow.getElementById("source") as HTMLSelectElement
    this.shapeTitleInput = this.shadow.getElementById("shapeTitle") as HTMLInputElement
    this.utcOffsetInput = this.shadow.getElementById("utcOffsetHours") as HTMLInputElement
    this.timeZoneSelect = this.shadow.getElementById("timeZone") as HTMLSelectElement
    this.objectSizeInput = this.shadow.getElementById("objectSize") as HTMLInputElement
    this.objectDistanceInput = this.shadow.getElementById("objectDistance") as HTMLInputElement
    this.apparentSizeOutput = this.shadow.getElementById("apparent-size")!
    this.realSizeOutput = this.shadow.getElementById("real-size")!
    this.addShapeButton = this.shadow.getElementById("add-shape") as HTMLButtonElement
    this.deleteShapeButton = this.shadow.getElementById("delete-shape") as HTMLButtonElement
    this.contextMenu = this.shadow.getElementById("context-menu")!
    this.contextGroupButton = this.shadow.getElementById("context-group") as HTMLButtonElement
    this.contextUngroupButton = this.shadow.getElementById("context-ungroup") as HTMLButtonElement
    this.contextBringToFrontButton = this.shadow.getElementById("context-bring-to-front") as HTMLButtonElement
    this.contextSendToBackButton = this.shadow.getElementById("context-send-to-back") as HTMLButtonElement
    this.contextDeleteButton = this.shadow.getElementById("context-delete") as HTMLButtonElement
    this.contextAddVertexButton = this.shadow.getElementById("context-add-vertex") as HTMLButtonElement
    this.contextDeleteVertexButton = this.shadow.getElementById("context-delete-vertex") as HTMLButtonElement
    this.decorContextMenu = this.shadow.getElementById("decor-context-menu")!
    this.contextViewTestimonyButton = this.shadow.getElementById("context-view-testimony") as HTMLButtonElement
    this.contextMasksSubmenu = this.shadow.getElementById("context-masks-submenu")!
    this.labelContextMasks = this.shadow.getElementById("label-context-masks")!
    this.playPauseButton = this.shadow.getElementById("play-pause") as HTMLButtonElement
    this.seekInput = this.shadow.getElementById("seek") as HTMLInputElement
    this.timeStartLabel = this.shadow.getElementById("time-start")!
    this.timeEndLabel = this.shadow.getElementById("time-end")!
    for (const label of [this.timeStartLabel, this.timeEndLabel]) {
      label.addEventListener("click", () => this.switchTimeDisplay())
      label.addEventListener("keydown", event => {
        if (event.key !== "Enter" && event.key !== " ") return
        event.preventDefault()
        this.switchTimeDisplay()
      })
    }
    this.loopButton = this.shadow.getElementById("loop") as HTMLButtonElement
    this.durationInput = this.shadow.getElementById("durationSeconds") as HTMLInputElement
    this.exportButton = this.shadow.getElementById("export") as HTMLButtonElement
    this.importFileInput = this.shadow.getElementById("import-file") as HTMLInputElement
    this.importUrlInput = this.shadow.getElementById("import-url") as HTMLInputElement
    this.importUrlButton = this.shadow.getElementById("import-url-button") as HTMLButtonElement
    this.placeNameInput = this.shadow.getElementById("placeName") as HTMLInputElement
    this.searchPlaceButton = this.shadow.getElementById("search-place") as HTMLButtonElement
    this.placeMatchRow = this.shadow.getElementById("place-match-row")!
    this.placeMatchSelect = this.shadow.getElementById("placeMatch") as HTMLSelectElement
    this.placeStatusText = this.shadow.getElementById("place-status-text")!
    this.latInput = this.shadow.getElementById("lat") as HTMLInputElement
    this.lngInput = this.shadow.getElementById("lng") as HTMLInputElement
    this.headingInput = this.shadow.getElementById("heading") as HTMLInputElement
    this.pitchInput = this.shadow.getElementById("pitch") as HTMLInputElement
    this.elevationInput = this.shadow.getElementById("elevation") as HTMLInputElement
    this.groundElevationOutput = this.shadow.getElementById("ground-elevation")!
    this.obsTimeInput = this.shadow.getElementById("obs-time") as HTMLInputElement
    this.obsEndTimeInput = this.shadow.getElementById("obs-end-time") as HTMLInputElement
    this.witnessIdInput = this.shadow.getElementById("witnessId") as HTMLInputElement
    this.witnessDirNameInput = this.shadow.getElementById("witnessDirName") as HTMLInputElement
    this.witnessTitleInput = this.shadow.getElementById("witnessTitle") as HTMLInputElement
    this.witnessLastNameInput = this.shadow.getElementById("witnessLastName") as HTMLInputElement
    this.witnessFirstNamesInput = this.shadow.getElementById("witnessFirstNames") as HTMLInputElement
    this.caseIdInput = this.shadow.getElementById("caseId") as HTMLInputElement
    this.descriptionInput = this.shadow.getElementById("description") as HTMLTextAreaElement
    this.tagsInput = this.shadow.getElementById("tags") as HTMLInputElement
    this.cloudCoverInput = this.shadow.getElementById("cloudCover") as HTMLInputElement
    this.highCloudCoverInput = this.shadow.getElementById("highCloudCover") as HTMLInputElement
    this.iceCrystalAlignmentInput = this.shadow.getElementById("iceCrystalAlignment") as HTMLInputElement
    this.cloudDarknessInput = this.shadow.getElementById("cloudDarkness") as HTMLInputElement
    this.cloudBaseInput = this.shadow.getElementById("cloudBase") as HTMLInputElement
    this.precipitationTypeSelect = this.shadow.getElementById("precipitationType") as HTMLSelectElement
    this.precipitationIntensityInput = this.shadow.getElementById("precipitationIntensity") as HTMLInputElement
    this.windDirectionInput = this.shadow.getElementById("windDirection") as HTMLInputElement
    this.windSpeedInput = this.shadow.getElementById("windSpeed") as HTMLInputElement
    this.stormInput = this.shadow.getElementById("storm") as HTMLInputElement
    this.weatherInferredInput = this.shadow.getElementById("weatherInferred") as HTMLInputElement
    this.weatherSourceText = this.shadow.getElementById("weather-source-text")!
    this.skyCandidatesOutput = this.shadow.getElementById("sky-candidates")!
    this.showMeteorButton = this.shadow.getElementById("show-meteor") as HTMLButtonElement
    this.showCometButton = this.shadow.getElementById("show-comet") as HTMLButtonElement
    this.weatherSourceLink = this.shadow.getElementById("weather-source-link") as HTMLAnchorElement
    this.weatherFields = [
      this.cloudCoverInput,
      // Every input the weather is READ from has to be listed here, or editing it alone changes
      // nothing until some other weather field is touched — which reads as a control that does not
      // work, and cost a reader an evening deciding the halos were "constant".
      this.highCloudCoverInput,
      this.iceCrystalAlignmentInput,
      this.cloudDarknessInput,
      this.cloudBaseInput,
      this.precipitationTypeSelect,
      this.precipitationIntensityInput,
      this.windDirectionInput,
      this.windSpeedInput,
      this.stormInput
    ]
    this.soundKindSelect = this.shadow.getElementById("soundKind") as HTMLSelectElement
    this.soundVolumeInput = this.shadow.getElementById("soundVolume") as HTMLInputElement
    this.soundPitchInput = this.shadow.getElementById("soundPitch") as HTMLInputElement
    this.soundPitchValue = this.shadow.getElementById("sound-pitch-value")!
    this.soundSrcInput = this.shadow.getElementById("soundSrc") as HTMLInputElement
    this.soundFields = [this.soundKindSelect, this.soundVolumeInput, this.soundPitchInput, this.soundSrcInput]
    this.buildSoundKindOptions()
    this.instrumentSelect = this.shadow.getElementById("instrument") as HTMLSelectElement
    this.focalLengthInput = this.shadow.getElementById("focalLength") as HTMLInputElement
    this.labelFocalLength = this.shadow.getElementById("label-focal-length")!
    this.unitFocalLength = this.shadow.getElementById("unit-focal-length")!
    this.labelFNumber = this.shadow.getElementById("label-f-number")!
    this.labelExposure = this.shadow.getElementById("label-exposure")!
    this.fNumberInput = this.shadow.getElementById("fNumber") as HTMLInputElement
    this.exposureInput = this.shadow.getElementById("exposureSeconds") as HTMLInputElement
    this.focusDistanceInput = this.shadow.getElementById("focusDistance") as HTMLInputElement
    this.labelFocusDistance = this.shadow.getElementById("label-focus-distance")!
    this.refreshInstrumentOptions()
    this.labelColor = this.shadow.getElementById("label-color")!
    this.labelTransparency = this.shadow.getElementById("label-transparency")!
    this.labelHalo = this.shadow.getElementById("label-halo")!
    this.labelShape = this.shadow.getElementById("label-shape")!
    this.labelShapeTitle = this.shadow.getElementById("label-shape-title")!
    this.labelUtcOffset = this.shadow.getElementById("label-utc-offset")!
    this.labelObjectSize = this.shadow.getElementById("label-object-size")!
    this.labelObjectDistance = this.shadow.getElementById("label-object-distance")!
    this.labelSamplingRate = this.shadow.getElementById("label-sampling-rate")!
    this.labelSoundGroup = this.shadow.getElementById("label-sound-group")!
    this.labelSoundKind = this.shadow.getElementById("label-sound-kind")!
    this.labelSoundVolume = this.shadow.getElementById("label-sound-volume")!
    this.labelSoundPitch = this.shadow.getElementById("label-sound-pitch")!
    this.labelSoundSrc = this.shadow.getElementById("label-sound-src")!
    this.labelDuration = this.shadow.getElementById("label-duration")!
    this.placeSourceRow = this.shadow.getElementById("place-source-row")!
    this.weatherSourceRow = this.shadow.getElementById("weather-source-row")!
    this.terrainSourceRows = this.shadow.getElementById("terrain-source-rows")!
    this.labelPlaceName = this.shadow.getElementById("label-place-name")!
    this.labelPlaceMatch = this.shadow.getElementById("label-place-match")!
    this.labelLatitude = this.shadow.getElementById("label-lat")!
    this.labelLongitude = this.shadow.getElementById("label-lng")!
    this.labelHeading = this.shadow.getElementById("label-heading")!
    this.labelPitch = this.shadow.getElementById("label-pitch")!
    this.labelElevation = this.shadow.getElementById("label-elevation")!
    this.labelObservationTime = this.shadow.getElementById("label-observation-time")!
    this.labelObservationEndTime = this.shadow.getElementById("label-observation-end-time")!
    this.labelWitnessId = this.shadow.getElementById("label-witness-id")!
    this.labelWitnessDirName = this.shadow.getElementById("label-witness-dir-name")!
    this.labelWitnessTitle = this.shadow.getElementById("label-witness-title")!
    this.labelWitnessLastName = this.shadow.getElementById("label-witness-last-name")!
    this.labelWitnessFirstNames = this.shadow.getElementById("label-witness-first-names")!
    this.labelCaseId = this.shadow.getElementById("label-case-id")!
    this.labelDescription = this.shadow.getElementById("label-description")!
    this.labelTags = this.shadow.getElementById("label-tags")!
    this.labelWeather = this.shadow.getElementById("label-weather")!
    this.labelImportFile = this.shadow.getElementById("label-import-file")!
    this.labelImportUrl = this.shadow.getElementById("label-import-url")!
    this.labelShapeGroup = this.shadow.getElementById("label-shape-group")!
    this.labelTemporalGroup = this.shadow.getElementById("label-temporal-group")!
    this.labelLocationGroup = this.shadow.getElementById("label-location-group")!
    this.labelObservationGroup = this.shadow.getElementById("label-observation-group")!
    this.labelWitnessGroup = this.shadow.getElementById("label-witness-group")!
    this.labelCircumstancesGroup = this.shadow.getElementById("label-circumstances-group")!
    this.labelCloudCover = this.shadow.getElementById("label-cloud-cover")!
    this.labelHighCloud = this.shadow.getElementById("label-high-cloud")!
    this.labelIceAlignment = this.shadow.getElementById("label-ice-alignment")!
    this.labelCloudDarkness = this.shadow.getElementById("label-cloud-darkness")!
    this.labelCloudBase = this.shadow.getElementById("label-cloud-base")!
    this.labelPrecipitationType = this.shadow.getElementById("label-precipitation-type")!
    this.labelPrecipitationIntensity = this.shadow.getElementById("label-precipitation-intensity")!
    this.labelWindDirection = this.shadow.getElementById("label-wind-direction")!
    this.labelWindSpeed = this.shadow.getElementById("label-wind-speed")!
    this.labelStorm = this.shadow.getElementById("label-storm")!
    this.labelWeatherInferred = this.shadow.getElementById("label-weather-inferred")!
    this.labelInstrument = this.shadow.getElementById("label-instrument")!
    this.optionPrecipitationNone = this.shadow.getElementById("option-precipitation-none")!
    this.optionPrecipitationRain = this.shadow.getElementById("option-precipitation-rain")!
    this.optionPrecipitationSnow = this.shadow.getElementById("option-precipitation-snow")!
    this.optionPrecipitationHail = this.shadow.getElementById("option-precipitation-hail")!
    this.decorKindSelect = this.shadow.getElementById("decorKind") as HTMLSelectElement
    this.addDecorWitnessButton = this.shadow.getElementById("add-decor-witness") as HTMLButtonElement
    this.addDecorBuildingButton = this.shadow.getElementById("add-decor-building") as HTMLButtonElement
    this.deleteDecorButton = this.shadow.getElementById("delete-decor") as HTMLButtonElement
    this.decorSelect = this.shadow.getElementById("decor") as HTMLSelectElement
    this.decorTitleInput = this.shadow.getElementById("decorTitle") as HTMLInputElement
    this.decorEastInput = this.shadow.getElementById("decorEast") as HTMLInputElement
    this.decorNorthInput = this.shadow.getElementById("decorNorth") as HTMLInputElement
    this.decorHeadingInput = this.shadow.getElementById("decorHeading") as HTMLInputElement
    this.decorLitInput = this.shadow.getElementById("decorLit") as HTMLInputElement
    this.decorLightRigSelect = this.shadow.getElementById("decorLightRig") as HTMLSelectElement
    this.lookAtDecorButton = this.shadow.getElementById("look-at-decor") as HTMLButtonElement
    this.decorAltitudeInput = this.shadow.getElementById("decorAltitude") as HTMLInputElement
    this.labelDecorAltitude = this.shadow.getElementById("label-decor-altitude")!
    this.decorSightingUrlInput = this.shadow.getElementById("decorSightingUrl") as HTMLInputElement
    this.decorFloorsInput = this.shadow.getElementById("decorFloors") as HTMLInputElement
    this.decorOccupiedFloorInput = this.shadow.getElementById("decorOccupiedFloor") as HTMLInputElement
    this.decorWitnessSideSelect = this.shadow.getElementById("decorWitnessSide") as HTMLSelectElement
    this.decorWindowInputs = {
      front: this.shadow.getElementById("decorWindowFront") as HTMLInputElement,
      behind: this.shadow.getElementById("decorWindowBehind") as HTMLInputElement,
      left: this.shadow.getElementById("decorWindowLeft") as HTMLInputElement,
      right: this.shadow.getElementById("decorWindowRight") as HTMLInputElement,
      "front-left": this.shadow.getElementById("decorWindowFrontLeft") as HTMLInputElement,
      "front-right": this.shadow.getElementById("decorWindowFrontRight") as HTMLInputElement,
      "behind-left": this.shadow.getElementById("decorWindowBehindLeft") as HTMLInputElement,
      "behind-right": this.shadow.getElementById("decorWindowBehindRight") as HTMLInputElement
    }
    this.labelDecorSide = {
      front: this.shadow.getElementById("label-decor-window-front")!,
      behind: this.shadow.getElementById("label-decor-window-behind")!,
      left: this.shadow.getElementById("label-decor-window-left")!,
      right: this.shadow.getElementById("label-decor-window-right")!,
      "front-left": this.shadow.getElementById("label-decor-window-front-left")!,
      "front-right": this.shadow.getElementById("label-decor-window-front-right")!,
      "behind-left": this.shadow.getElementById("label-decor-window-behind-left")!,
      "behind-right": this.shadow.getElementById("label-decor-window-behind-right")!
    }
    this.optionWitnessSide = {
      front: this.shadow.getElementById("option-witness-side-front") as HTMLOptionElement,
      behind: this.shadow.getElementById("option-witness-side-behind") as HTMLOptionElement,
      left: this.shadow.getElementById("option-witness-side-left") as HTMLOptionElement,
      right: this.shadow.getElementById("option-witness-side-right") as HTMLOptionElement,
      "front-left": this.shadow.getElementById("option-witness-side-front-left") as HTMLOptionElement,
      "front-right": this.shadow.getElementById("option-witness-side-front-right") as HTMLOptionElement,
      "behind-left": this.shadow.getElementById("option-witness-side-behind-left") as HTMLOptionElement,
      "behind-right": this.shadow.getElementById("option-witness-side-behind-right") as HTMLOptionElement
    }
    this.optionWitnessSideNone = this.shadow.getElementById("option-witness-side-none") as HTMLOptionElement
    this.labelDecor = this.shadow.getElementById("label-decor")!
    this.labelDecorFieldset = this.shadow.getElementById("label-decor-fieldset")!
    this.labelDecorTitle = this.shadow.getElementById("label-decor-title")!
    this.labelDecorEast = this.shadow.getElementById("label-decor-east")!
    this.labelDecorNorth = this.shadow.getElementById("label-decor-north")!
    this.labelDecorHeading = this.shadow.getElementById("label-decor-heading")!
    this.labelDecorLit = this.shadow.getElementById("label-decor-lit")!
    this.labelDecorSightingUrl = this.shadow.getElementById("label-decor-sighting-url")!
    this.labelDecorFloors = this.shadow.getElementById("label-decor-floors")!
    this.labelDecorOccupiedFloor = this.shadow.getElementById("label-decor-occupied-floor")!
    this.labelDecorWitnessSide = this.shadow.getElementById("label-decor-witness-side")!
    this.labelDecorWindows = this.shadow.getElementById("label-decor-windows")!
    this.optionDecorBuilding = this.shadow.getElementById("option-decor-building")!
    this.optionDecorTree = this.shadow.getElementById("option-decor-tree")!
    this.optionDecorStreetlight = this.shadow.getElementById("option-decor-streetlight")!
    this.optionDecorVehicle = this.shadow.getElementById("option-decor-vehicle")!
    this.optionDecorAircraft = this.shadow.getElementById("option-decor-aircraft")!
    this.labelDecorLights = this.shadow.getElementById("label-decor-lights")!
    this.optionDecorWitness = this.shadow.getElementById("option-decor-witness")!

    this.ufoElement.canvasElement.addEventListener("pointerdown", event => {
      // Touching the canvas is working in the editor, so the editor takes the focus — which is what
      // its own keydown listener needs to see anything at all, the canvas itself taking none. Also
      // the right thing on its own terms: it takes focus away from whatever field the author was
      // typing in, exactly as clicking anything else would.
      this.focus({ preventScroll: true })
      this.onPointerDown(event)
    })
    this.ufoElement.canvasElement.addEventListener("pointermove", event => this.onPointerMove(event))
    this.ufoElement.canvasElement.addEventListener("contextmenu", event => this.onContextMenu(event))
    this.contextGroupButton.addEventListener("click", () => this.groupSelected())
    this.contextUngroupButton.addEventListener("click", () => this.ungroupSelected())
    this.contextBringToFrontButton.addEventListener("click", () => this.bringSelectedToFront())
    this.contextSendToBackButton.addEventListener("click", () => this.sendSelectedToBack())
    this.contextDeleteButton.addEventListener("click", () => {
      this.hideContextMenu()
      this.deleteShape()
    })
    this.contextAddVertexButton.addEventListener("click", () => this.addVertexAtContextMenu())
    this.contextDeleteVertexButton.addEventListener("click", () => this.deleteVertexAtContextMenu())
    this.contextViewTestimonyButton.addEventListener("click", () => this.viewWitnessTestimony())
    // Syncs synchronously right after each call rather than waiting for the next "timeupdate" —
    // play()/toggleLoop() take effect immediately but the first actual frame/tick (what
    // "timeupdate" fires on) is scheduled via requestAnimationFrame, so without this the button's
    // own icon/aria-pressed would lag a frame behind what just happened. Mirrors how UfoElement's
    // own (hidden, here) internal toolbar already updates itself synchronously on click.
    this.playPauseButton.addEventListener("click", () => {
      this.ufoElement.togglePlayPause()
      this.syncPlaybackControls()
    })
    this.loopButton.addEventListener("click", () => {
      this.ufoElement.toggleLoop()
      this.syncPlaybackControls()
    })
    this.seekInput.addEventListener("input", () => (this.ufoElement.currentTime = Number(this.seekInput.value)))
    this.recordButton.addEventListener("click", () => this.toggleRecording())
    this.addShapeButton.addEventListener("click", () => this.addShape())
    this.deleteShapeButton.addEventListener("click", () => this.deleteShape())
    this.exportButton.addEventListener("click", () => this.exportJson())
    this.importFileInput.addEventListener("change", () => this.importFromFile())
    this.importUrlButton.addEventListener("click", () => this.importFromUrl())
    this.durationInput.addEventListener("input", () => {
      this.ufoElement.durationSeconds = this.durationInput.value === "" ? undefined : Number(this.durationInput.value)
      this.ufoElement.refresh() // otherwise the seek bar's max (seekableDuration) only updates on the next tick
      this.updateDurationValidity()
      // A longer observation spans more hours of record, so its weather is a different (possibly
      // multi-keyframe) answer — see WeatherInference.sampleTimes.
      this.scheduleWeatherLookup()
    })
    // Same plain-click-collapses-to-one-shape semantics as clicking directly on canvas — see
    // selectUnit's own doc comment (also picks up the picked shape's group, if any; selectUnit
    // itself already resyncs the toolbar, no separate onSelectionOrTimeChanged() call needed).
    this.sourceSelect.addEventListener("change", () => this.selectUnit(this.sourceSelect.value))
    this.shapeTitleInput.addEventListener("input", () => this.updateShapeTitle())
    for (const input of [this.objectSizeInput, this.objectDistanceInput]) {
      input.addEventListener("input", () => this.applySizeHypothesis())
    }
    this.addDecorWitnessButton.addEventListener("click", () => this.addDecor("witness"))
    this.addDecorBuildingButton.addEventListener("click", () => this.addDecor())
    this.deleteDecorButton.addEventListener("click", () => this.deleteDecor())
    this.decorSelect.addEventListener("change", () => this.selectDecor(this.decorSelect.value))
    for (const input of [
      this.decorTitleInput,
      this.decorEastInput,
      this.decorNorthInput,
      this.decorAltitudeInput,
      this.decorHeadingInput,
      this.decorSightingUrlInput,
      this.decorFloorsInput,
      this.decorOccupiedFloorInput
    ]) {
      input.addEventListener("input", () => this.updateDecor())
    }
    this.decorWitnessSideSelect.addEventListener("change", () => this.updateDecor())
    for (const side of DECOR_SIDES) {
      this.decorWindowInputs[side].addEventListener("input", () => this.updateDecorWindows())
    }
    // Lit is keyframed over time (see Decor.ts's own resolveDecorLitAt/litKeyframes), unlike the
    // rest of a decor object's fields — a distinct write path (updateDecorLit) is what actually
    // records it at the current playhead, same "at the current instant" idiom as
    // applyWeatherAtPlayhead/updateObserver.
    this.decorLitInput.addEventListener("input", () => this.updateDecorLit())
    this.decorLightRigSelect.addEventListener("change", () => this.updateDecorLightRig())
    this.lookAtDecorButton.addEventListener("click", () => this.lookAtDecor())
    this.showMeteorButton.addEventListener("click", () => this.showNextMeteor())
    this.showCometButton.addEventListener("click", () => this.lookAtComet())
    // The single funnel for "the recording changed, a consumer composing this element (e.g. a
    // live <rr0-scene> preview) should resync" — refresh() (called after every mutation: shape
    // edits, drag, observer/time edits, duration) always ends in a timeupdate on the *nested*
    // ufoElement, which is shadow-DOM-internal and wouldn't otherwise reach outside listeners
    // (UfoElement's timeupdate isn't `composed`). Re-dispatching our own event here is what makes
    // it visible to the outside without exposing the nested element itself.
    this.ufoElement.addEventListener("timeupdate", () => {
      this.onSelectionOrTimeChanged()
      this.syncPlaybackControls()
      this.dispatchEvent(new CustomEvent("sightingchange"))
    })
    // On the editor itself, NEVER on document. A keydown only reaches this if it was dispatched
    // inside the editor, which is the only place its shortcuts mean anything — an editor embedded
    // in a real page shares that page with other forms, and Backspace in a site's own search box is
    // not a request to delete the shape being edited.
    //
    // Guarding a document-level listener by inspecting the event's target instead is what this used
    // to do, and it cannot be made to work: a field inside a CLOSED shadow root (rr0.org's own
    // <rr0-search> is one) never appears in composedPath() at all — the path stops at the host, the
    // "is it an input?" test sees a custom element, and the delete goes through. Scope is the fix;
    // the target test below stays only for the editor's OWN fields.
    //
    // Never removed: a listener on the element dies with it, and removing it in
    // disconnectedCallback (as this did) meant an editor moved in the DOM lost its shortcuts for
    // good, since it is only ever attached here in the constructor.
    this.addEventListener("keydown", this.handleKeyDown)

    for (const presetId of PRESET_IDS) {
      this.presetButtons[presetId].addEventListener("click", () => this.setAppearance({ presetId }))
    }
    this.colorInput.addEventListener("input", () => this.setAppearance({ color: this.colorInput.value }))
    this.transparencyInput.addEventListener("input", () =>
      this.setAppearance({ transparency: Number(this.transparencyInput.value) })
    )
    this.haloScaleInput.addEventListener("input", () =>
      this.setAppearance({ haloScale: Number(this.haloScaleInput.value) })
    )

    for (const input of [this.latInput, this.lngInput, this.headingInput, this.pitchInput, this.elevationInput]) {
      input.addEventListener("input", () => this.updateObserver())
    }
    // The optics are pose fields like the rest — see ObserverPose.fNumber's own doc comment — so
    // they keyframe through the very same path.
    for (const input of [this.focalLengthInput, this.fNumberInput, this.exposureInput, this.focusDistanceInput]) {
      input.addEventListener("input", () => this.updateObserver())
    }
    this.searchPlaceButton.addEventListener("click", () => void this.searchPlace())
    // Enter in the name field runs the same search — the reflex in any search box, and the reason
    // the field isn't inside a <form> that would try to submit the page instead.
    this.placeNameInput.addEventListener("keydown", event => {
      if (event.key !== "Enter") return
      event.preventDefault()
      void this.searchPlace()
    })
    this.placeMatchSelect.addEventListener("change", () => this.applyPlaceMatch(this.placeMatchSelect.selectedIndex))
    // Retyping the name makes the previous candidates stale — they described a different search.
    this.placeNameInput.addEventListener("input", () => this.updatePlaceName())
    // Reading the heading off the compass is the whole point of editing this field — showing the
    // labels only requires the mouse to *also* be hovering the canvas (see SceneRenderer's own
    // hover-only default) would make the one moment they're most needed the one moment they're
    // easiest to miss. Independent of hover, see SceneElement.setCompassForced's own doc comment.
    this.headingInput.addEventListener("focus", () => this.sceneElement.setCompassForced(true))
    this.headingInput.addEventListener("blur", () => this.sceneElement.setCompassForced(false))
    this.instrumentSelect.addEventListener("change", () => {
      const previous = this.ufoElement.sighting.instrument
      this.ufoElement.sighting.instrumentId = this.instrumentSelect.value
      // Not just a resize: every stated angle now lands at a different place AND a different size
      // on the image, and a shape drawn in several parts comes apart unless both follow — see
      // SightingShapes.reproject.
      // Captured BEFORE the field is retuned, since the shapes on screen were drawn under it.
      const fieldBefore = new Map(
        this.ufoElement.sighting.timeline.allKeyframes.map(keyframe => [
          keyframe.t,
          SightingShapes.fovOf(this.ufoElement.sighting, keyframe.t)
        ])
      )
      this.retuneFieldOfView(previous)
      SightingShapes.reproject(this.ufoElement.sighting, previous, fieldBefore)
      // The picture's own shape changes with it — a square 126 frame, a phone held upright — and
      // both the sky and the shapes drawn over it have to take it at the same moment.
      this.sceneElement.applyFrameFormat()
      this.syncOpticsFromInstrument()
      this.ufoElement.refresh()
      this.dispatchEvent(new CustomEvent("sightingchange"))
    })
    this.utcOffsetInput.addEventListener("input", () => this.updateUtcOffset())
    this.timeZoneSelect.addEventListener("change", () => {
      // Picked by hand: from here on it is the author's, and moving the place no longer touches it.
      this.autoFilledTimeZone = undefined
      this.updateTimeZone()
    })
    this.obsTimeInput.addEventListener("input", () => this.updateObservationTime())
    this.obsEndTimeInput.addEventListener("input", () => this.updateObservationEndTime())
    this.obsTimeInput.addEventListener("blur", () => this.validateEdtfTimeInput(this.obsTimeInput))
    this.obsEndTimeInput.addEventListener("blur", () => this.validateEdtfTimeInput(this.obsEndTimeInput))
    for (const input of [
      this.witnessIdInput,
      this.witnessDirNameInput,
      this.witnessTitleInput,
      this.witnessLastNameInput,
      this.witnessFirstNamesInput,
      this.caseIdInput
    ]) {
      input.addEventListener("input", () => this.updateWitnessMetadata())
    }
    this.descriptionInput.addEventListener("input", () => this.updateDescription())
    this.tagsInput.addEventListener("input", () => this.updateTags())
    for (const input of this.weatherFields) {
      // The crystal alignment writes itself and only itself (see applyIceAlignmentAtPlayhead): it
      // is listed here because it IS a weather field and the whole point of that list is that no
      // weather field goes unlistened-to, but it must not go through the general path, which would
      // take the recording away from the record it was looked up from.
      if (input === this.iceCrystalAlignmentInput) {
        input.addEventListener("input", () => this.applyIceAlignmentAtPlayhead())
        continue
      }
      input.addEventListener("input", () => this.applyWeatherAtPlayhead())
    }
    for (const field of this.soundFields) {
      field.addEventListener("input", () => this.applySoundAtPlayhead())
    }
    this.weatherInferredInput.addEventListener("change", () => this.onWeatherInferredToggled())

    this.updatePresetButtons()
    this.setRecordButtonLabel(false)
    // Places a real, immediately selectable keyframe from the start (rather than a
    // disconnected canvas-only preview) — otherwise the very first shape shown couldn't be
    // clicked/selected, since click-to-select hit-tests against the Timeline, not the canvas.
    this.applyAppearanceAtPlayhead()
    // Named right away too, same as every shape addShape() creates afterward (see its own doc
    // comment) — this very first one is the one case that doesn't go through addShape() at all,
    // so it needs the same fill done explicitly here. updateShapeTitle() refreshes the source
    // list itself, so no separate call is needed right after.
    this.shapeTitleInput.value = this.shapeLabel(this.currentSourceId)
    this.updateShapeTitle()
    this.currentDecorId = this.ufoElement.sighting.decor[0]?.id
    this.refreshDecorList()
    this.onSelectionOrTimeChanged()
    // A brand-new recording starts with no duration at all — flags it as missing right away
    // rather than only once the user first touches a date/duration field.
    this.syncDurationField()
    // So the external playback row isn't blank/stale before the first timeupdate tick.
    this.syncPlaybackControls()
    this.refreshSourceRows()
    this.refreshTimeZoneOptions()
    // An empty editor has no date or place yet, so this only states what's missing — the lookup
    // itself starts the moment those fields say enough (see scheduleWeatherLookup's callers).
    this.syncWeatherSourceState()
    void this.loadLocaleMessages()
  }

  /** `src` loads an existing recording straight into the editor, the same attribute every other
   * element in this package already takes — what makes a per-observation editor URL possible at
   * all (rr0.org's own editor page maps `?sighting=` onto it, so ufoathome.org/<path> opens that
   * observation for editing rather than an empty canvas). */
  static get observedAttributes(): string[] {
    return ["src"]
  }

  connectedCallback(): void {
    // Focusable so that it can BE the thing focus is inside — the canvas takes no focus of its own,
    // so without this, clicking a shape and pressing Delete would send the key to <body> and never
    // reach the keydown listener, which is scoped to this element. -1 rather than 0: not a tab stop
    // of the surrounding page, since every control that deserves one is already inside.
    //
    // Here and not in the constructor: a custom element may not touch its own attributes before it
    // is connected, and `tabIndex` is an attribute. Respects one already set by the page.
    if (!this.hasAttribute("tabindex")) this.tabIndex = -1
    const src = this.getAttribute("src")
    if (src) void this.importFromUrl(src)
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string): void {
    if (name === "src" && newValue && newValue !== oldValue && this.isConnected) {
      void this.importFromUrl(newValue)
    }
  }

  disconnectedCallback(): void {
    document.removeEventListener("click", this.handleOutsideContextMenuClick)
    this.endDrag()
  }

  get sightingData(): SightingRecordingJson {
    return this.ufoElement.sightingData
  }

  set sightingData(json: SightingRecordingJson) {
    this.endDrag() // an in-progress drag references the OLD timeline's shape — don't let it
    // keep writing into the newly-loaded one
    this.ufoElement.sightingData = json
    // Resets to the first source actually present in the loaded data, not the hardcoded
    // default — a loaded recording using different source ids would otherwise have the next
    // appearance edit silently create a disconnected new "ufo-1" source instead of editing
    // anything visible.
    this.currentSourceId = this.ufoElement.sighting.timeline.sourceIds[0] ?? DEFAULT_SOURCE_ID
    this.selectedSourceIds = new Set([this.currentSourceId])
    this.refreshSourceList()
    this.currentDecorId = this.ufoElement.sighting.decor[0]?.id
    this.refreshDecorList()
    this.onSelectionOrTimeChanged()
    this.syncDurationField()
    this.syncObservationTimeFields()
    this.syncObservationEndTimeFields()
    this.syncWitnessMetadataFields()
    this.refreshTimeZoneOptions()
    this.utcOffsetInput.readOnly = this.ufoElement.sighting.event.timeZone !== undefined
    this.syncUtcOffsetField()
    this.syncPlaceNameField()
    this.syncGroundElevationField()
    this.syncWeatherOwnership()
    // Weather itself is resynced by onSelectionOrTimeChanged() above (syncWeatherFromTimeline) —
    // and SceneElement's own updateAstronomy() (driven by the sightingData assignment above,
    // which surfaces as a timeupdate) already resolves+applies it, unlike before this was a
    // keyframed track.
  }

  /** Downloads the current recording as a standalone SightingRecordingJson file — a plain
   * Blob-and-anchor download, no server round-trip needed. Named from the witness reference
   * when known (e.g. "chiles-sighting.json"), falling back to a generic name otherwise. */
  private exportJson(): void {
    const json = this.sightingData
    const fileName = `${json.witness?.id ?? "sighting"}-sighting.json`
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = fileName
    link.click()
    URL.revokeObjectURL(url)
  }

  /** Loads a SightingRecordingJson from a user-picked local file — the counterpart to
   * exportJson(). Reads via FileReader (readAsText), not the File API's own newer .text() —
   * jsdom's File doesn't implement .text() (confirmed empirically), and FileReader is the more
   * broadly-supported option in real browsers too. Resets the input's value afterward so
   * re-picking the exact same file (e.g. after fixing and re-saving it) still fires a fresh
   * "change" event. */
  private async importFromFile(): Promise<void> {
    const file = this.importFileInput.files?.[0]
    if (!file) return
    try {
      const text = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => reject(reader.error)
        reader.readAsText(file)
      })
      this.sightingData = JSON.parse(text) as SightingRecordingJson
    } catch {
      window.alert(this.messages.importError)
    } finally {
      this.importFileInput.value = ""
    }
  }

  /** Loads a SightingRecordingJson fetched from a user-entered URL — same failure handling as
   * importFromFile(). Does nothing on an empty URL rather than firing a request at the page's own
   * origin. */
  /** `url` defaults to the Observation group's own "load from URL" field — explicit callers
   * (viewWitnessTestimony) pass a witness decor object's own sightingUrl instead. */
  /** Fetches a recording and loads it into the editor — shared by the "Load from URL" field and
   * by the `src` attribute above. Failure is reported to the user rather than thrown: a bad URL
   * in a shared link should leave a usable empty editor, not a broken page. */
  private async importFromUrl(url: string = this.importUrlInput.value.trim()): Promise<void> {
    if (!url) return
    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      this.sightingData = (await response.json()) as SightingRecordingJson
    } catch {
      window.alert(this.messages.importError)
    }
  }

  private numberOrUndefined(value: string): number | undefined {
    return value === "" ? undefined : Number(value)
  }

  private stringOrUndefined(value: string): string | undefined {
    return value === "" ? undefined : value
  }

  /** A compass direction loops rather than clamps — reaching 360 (via the spinner's own max, or by
   * typing) is the same direction as 0, not an out-of-range value to get stuck at. Normalizes into
   * [0, 360) and reflects the wrapped value back into `input` itself (so typing/spinning past 360
   * visibly resets to 0, not silently storing 0 while still displaying 360). Shared by the heading
   * and wind-direction fields — both are plain compass directions with identical wrap behavior. */
  private wrapDegrees(degrees: number | undefined, input: HTMLInputElement): number | undefined {
    if (degrees === undefined) return undefined
    const wrapped = ((degrees % 360) + 360) % 360
    if (String(wrapped) !== input.value) {
      input.value = String(wrapped)
    }
    return wrapped
  }

  /**
   * Rebuilds the Data sources group: one row per kind of real-world data this editor pulls in, each
   * a picker over that kind's registry plus the attribution its licence requires (see
   * engine/source/DataSource.ts on why those are one control and not two).
   *
   * Built in script rather than spelled out in the template because the rows ARE the registries:
   * adding a second geocoder, or a third imagery tileset, must not also mean adding markup and
   * four more element ids for it. Re-run on a language change, which is why the live choice is
   * held in chosenSourceId rather than read back off pickers this is about to replace.
   */
  private refreshSourceRows(): void {
    this.placeSourceRow.replaceChildren(
      document.createTextNode(`${this.messages.according} `),
      this.sourcePicker("place", PLACE_SOURCES, source => {
        this.placeProvider = source.create()
      })
    )
    this.weatherSourceRow.replaceChildren(
      this.sourcePicker("weather", WEATHER_SOURCES, source => {
        this.weatherInference = new WeatherInference(source.create())
        // The values on screen came from the previous record — ask the new one for its own.
        this.scheduleWeatherLookup()
      })
    )
    this.terrainSourceRows.replaceChildren(
      this.labelledPicker("elevation", this.messages.sourceElevation, ELEVATION_SOURCES, () => this.applyTerrainSources()),
      this.labelledPicker("imagery", this.messages.sourceImagery, IMAGERY_SOURCES, () => this.applyTerrainSources())
    )
  }

  /** A picker over one registry, plus the attribution its licence requires as its own title and a
   * link beside it. Built in script rather than spelled out in the template because the options ARE
   * the registry: adding a second geocoder, or a third imagery tileset, must not also mean adding
   * markup and element ids for it. */
  private sourcePicker<T>(kind: string, sources: DataSource<T>[], apply: (source: DataSource<T>) => void): DocumentFragment {
    const fragment = document.createDocumentFragment()
    const select = document.createElement("select")
    select.id = `${kind}Source`
    for (const source of sources) {
      const option = document.createElement("option")
      option.value = source.id
      option.textContent = source.name
      option.title = source.credit
      select.appendChild(option)
    }
    select.value = this.chosenSourceId.get(kind) ?? sources[0].id
    const credit = document.createElement("a")
    credit.className = "source-credit"
    credit.target = "_blank"
    credit.rel = "noopener noreferrer"
    const showCredit = (): void => {
      const source = dataSourceById(sources, select.value)
      select.title = source.credit
      credit.href = source.creditUrl
      // The licence's own wording is what has to be shown; the picker only names the service.
      credit.textContent = source.credit
    }
    showCredit()
    select.addEventListener("change", () => {
      this.chosenSourceId.set(kind, select.value)
      showCredit()
      apply(dataSourceById(sources, select.value))
    })
    fragment.append(select, document.createTextNode(" "), credit)
    return fragment
  }

  /** The same picker with a label in front, for the two sources that have no sentence to sit in. */
  private labelledPicker<T>(kind: string, label: string, sources: DataSource<T>[], apply: () => void): HTMLElement {
    const labelElement = document.createElement("label")
    const labelText = document.createElement("span")
    labelText.textContent = label
    labelElement.append(labelText, this.sourcePicker(kind, sources, apply))
    return labelElement
  }

  /** Elevation and imagery are chosen separately but reach the renderer as one pair — see
   * SceneRenderer.setTerrainProviders, which drops the patch already built so the next frame
   * rebuilds it from whichever pair is now live. */
  private applyTerrainSources(): void {
    this.sceneElement.setTerrainProviders({
      elevation: dataSourceById(ELEVATION_SOURCES, this.chosenSourceId.get("elevation")).create(),
      imagery: dataSourceById(IMAGERY_SOURCES, this.chosenSourceId.get("imagery")).create()
    })
    // The rebuild itself only happens on the scene's next tick (setTerrainOrigin is called from
    // SceneElement.updateAstronomy), and a scene sitting paused at t=0 has no next tick — so
    // without this the new source took effect at some arbitrary later moment, or never. Same
    // "surface the edit as a timeupdate" idiom every other editor change here uses.
    this.ufoElement.refresh()
  }

  /** The reader's OWN preferred language for place names — navigator's, not this editor's own
   * en/fr: a geocoder can name a place in far more languages than this UI is translated into, and
   * a Spanish reader wants "Londres" whichever of the two the labels are in. */
  private get placeSearchLanguage(): string | undefined {
    return navigator.languages?.[0]
  }

  /** Swaps the geocoder behind the place-name field — the element itself only ever names the
   * PlaceProvider interface (see defaultPlaceProvider's own doc comment), so an embedder with a
   * national gazetteer, or a test with canned answers, substitutes one here. */
  set placeSearchProvider(provider: PlaceProvider) {
    this.placeProvider = provider
  }

  /** Looks the typed place name up and offers what came back. Runs only on Enter or the button,
   * never per keystroke — see NominatimPlaceProvider's own doc comment on why. The first (best)
   * candidate is applied straight away so the common unambiguous case needs no second gesture;
   * the picker stays there for the cases that need it. */
  private async searchPlace(): Promise<void> {
    const query = this.placeNameInput.value.trim()
    if (query === "") return
    const token = ++this.placeSearchToken
    this.placeStatusText.textContent = this.messages.placeSearching
    let matches: PlaceMatch[]
    try {
      matches = await this.placeProvider.search(query, { language: this.placeSearchLanguage })
    } catch {
      if (token !== this.placeSearchToken) return
      this.placeStatusText.textContent = this.messages.placeSearchFailed
      return
    }
    // A newer search already asked a newer question.
    if (token !== this.placeSearchToken) return
    this.placeMatches = matches
    this.refreshPlaceMatches()
    if (matches.length > 0) this.applyPlaceMatch(0)
  }

  /** Fills the candidate picker and says how many names matched. The credit for the data lives in
   * the Data sources group, where it doubles as the picker that chose this geocoder — see
   * refreshSourceRows. */
  private refreshPlaceMatches(): void {
    this.placeMatchSelect.replaceChildren(
      ...this.placeMatches.map(match => {
        const option = document.createElement("option")
        option.textContent = match.name
        // The list is narrow and a qualified name is long — the full one stays reachable on hover.
        option.title = match.name
        return option
      })
    )
    this.placeMatchRow.hidden = this.placeMatches.length === 0
    const found = this.placeMatches.length === 1 ? this.messages.placeMatchFound : this.messages.placeMatchesFound
    this.placeStatusText.textContent =
      this.placeMatches.length === 0 ? this.messages.placeNotFound : `${this.placeMatches.length} ${found} `
    // "2 places found according to [Nominatim]" — attached to the count, so it only appears once
    // there is an answer to attribute. Which geocoder answered is part of the answer.
    this.placeSourceRow.hidden = this.placeMatches.length === 0
  }

  /** Writes a candidate's coordinates into the Latitude/Longitude fields and its own qualified
   * name back into the name field — the coordinates came from THAT place, and leaving a vaguer
   * "Valensole" beside them would claim a precision the typed name never had. Goes through
   * updateObserver() like any manual edit, so it keyframes the pose and re-asks the weather record
   * exactly the same way. */
  private applyPlaceMatch(index: number): void {
    const match = this.placeMatches[index]
    if (!match) return
    this.placeMatchSelect.selectedIndex = index
    this.placeNameInput.value = match.name
    this.placeNameInput.title = match.name
    this.latInput.value = String(match.lat)
    this.lngInput.value = String(match.lng)
    // Recorded before updateObserver() runs, so the coordinate change this is about to make isn't
    // mistaken for the witness moving and answered with a reverse lookup of the name we just used.
    this.namedCoordinates = { lat: match.lat, lng: match.lng }
    this.updateObserver()
  }

  /** A hand-typed name is stored as-is: a recording may well name a place no geocoder knows, and
   * the name is worth keeping either way. Retyping drops the previous search's candidates, which
   * answered a different question. */
  private updatePlaceName(): void {
    this.placeMatches = []
    this.placeMatchRow.hidden = true
    this.placeStatusText.textContent = ""
    this.placeSourceRow.hidden = true
    this.placeNameInput.title = this.placeNameInput.value
    // Typed by hand, so it now describes whatever the witness means by it, not the coordinates —
    // and must not be replaced by a reverse lookup of them.
    this.namedCoordinates = undefined
    this.updateObserver()
  }

  /**
   * Re-derives the displayed place name from coordinates the witness has moved by hand — the same
   * relation the search reads the other way, so the two halves of the Location group can never
   * drift apart. A name left describing somewhere the sighting is no longer at is worse than no
   * name: the recording would state, in writing, that it happened there.
   *
   * Only when a name resolved from a search is actually on display: a name the witness typed
   * themselves is theirs (a farm, a stretch of road, whatever no gazetteer lists), and an empty
   * field is not a question anyone asked. That restraint is also what keeps this inside Nominatim's
   * usage policy, together with the debounce and the same-spot threshold.
   */
  private schedulePlaceReverse(): void {
    if (!this.namedCoordinates) return
    const lat = this.numberOrUndefined(this.latInput.value)
    const lng = this.numberOrUndefined(this.lngInput.value)
    if (lat === undefined || lng === undefined) return
    if (Math.abs(lat - this.namedCoordinates.lat) < SAME_PLACE_DEG && Math.abs(lng - this.namedCoordinates.lng) < SAME_PLACE_DEG) {
      return
    }
    clearTimeout(this.placeReverseTimer)
    this.placeReverseTimer = setTimeout(() => void this.reversePlace(lat, lng), PLACE_REVERSE_DEBOUNCE_MS)
  }

  /**
   * Asks which legal time zone the witness's own coordinates fall in, and picks it.
   *
   * A place decides a zone — nobody states "Europe/Paris" by hand when they have already said
   * Valensole — and until now the picker sat on "manual" while the offset had to be typed. What is
   * looked up is the zone's IDENTIFIER and nothing else: the offset for the observation's own date
   * is then worked out from that zone's own historical rules (see TimeZones.offsetHoursAt), which
   * is the only way a 1965 sighting comes out at +1 rather than at whatever France is doing this
   * week.
   *
   * Never overwrites a zone already chosen — the same rule the weather follows: what the author
   * has stated outranks what a service would infer. Debounced, and skipped for a move too small to
   * change the answer.
   */
  private scheduleTimeZoneLookup(): void {
    const lat = this.numberOrUndefined(this.latInput.value)
    const lng = this.numberOrUndefined(this.lngInput.value)
    if (lat === undefined || lng === undefined) return
    const stated = this.ufoElement.sighting.event.timeZone
    if (stated && stated !== this.autoFilledTimeZone) return
    const previous = this.timeZoneLookedUpAt
    if (previous && Math.abs(lat - previous.lat) < SAME_PLACE_DEG && Math.abs(lng - previous.lng) < SAME_PLACE_DEG) return
    clearTimeout(this.timeZoneLookupTimer)
    this.timeZoneLookupTimer = setTimeout(() => void this.lookUpTimeZone(lat, lng), PLACE_REVERSE_DEBOUNCE_MS)
  }

  private async lookUpTimeZone(lat: number, lng: number): Promise<void> {
    this.timeZoneLookedUpAt = { lat, lng }
    const zone = await this.timeZoneProvider.zoneAt(lat, lng)
    // Re-checked after the await, not only before it: the author may have picked one meanwhile, and
    // a service's answer must never win over a stated one.
    const stated = this.ufoElement.sighting.event.timeZone
    if (!zone || (stated && stated !== this.autoFilledTimeZone)) return
    if (!this.timeZones.available().includes(zone)) return
    this.autoFilledTimeZone = zone
    this.timeZoneSelect.value = zone
    this.updateTimeZone()
    this.dispatchEvent(new CustomEvent("sightingchange"))
  }

  private async reversePlace(lat: number, lng: number): Promise<void> {
    const token = ++this.placeSearchToken
    let match: PlaceMatch | undefined
    try {
      match = await this.placeProvider.reverse(lat, lng, { language: this.placeSearchLanguage })
    } catch {
      return // the name on screen stays as it was; nothing here is worth an error message
    }
    if (token !== this.placeSearchToken) return
    this.namedCoordinates = { lat, lng }
    this.placeNameInput.value = match?.name ?? ""
    this.placeNameInput.title = match?.name ?? ""
    // Candidates from an earlier search answered a different question, and the picker would
    // otherwise still be offering the place we have just moved away from.
    this.placeMatches = []
    this.placeMatchRow.hidden = true
    this.placeStatusText.textContent = match ? "" : this.messages.placeNotFound
    this.placeSourceRow.hidden = !match
    this.updateObserver()
  }

  /** Writes the witness's lat/lng into the legacy `event.place` (kept in sync for any consumer
   * that only reads that field, e.g. an older `<rr0-scene>` build, always mirroring whichever edit
   * happened most recently regardless of when on the timeline it landed) — but records the real
   * pose as a `witnessTrack` keyframe **at the current playhead position**, exactly like
   * applyAppearanceAtPlayhead()/onDragPointerMove() already do for the UFO's own shape. This is
   * what lets an observer move/re-orient over the course of a recording (position, pitch, heading
   * all independently keyframed over time) instead of only ever describing one fixed vantage
   * point — see ObserverTrack.getInterpolatedPoseAt, already consumed live during playback by
   * SceneElement.updateAstronomy on every timeupdate tick, so a second+ keyframe here starts
   * animating the scene immediately, no separate "enable" step needed.
   *
   * Heading/pitch/date-time are meant to be tweakable independently while authoring — gating the
   * whole pose behind "lat and lng both present" would silently discard a heading/pitch edit made
   * before a location was entered, which looked like those fields simply didn't work.
   * `resolveObserverPoseAt`'s consumers already know how to render a pose with lat/lng left
   * undefined — see its own fallback for astronomy without a location yet.
   *
   * Blanking every field removes just the keyframe at *this* instant (removeKeyframeAt), not the
   * observer's whole recorded path — mirrors "no edit recorded here", not "erase everything ever
   * entered". Bails out while playing, same reasoning as setAppearance's identical guard: the
   * playhead is a moving target during Play, not a specific instant to keyframe. */
  private updateObserver(): void {
    if (this.ufoElement.playbackState === "playing") return
    const lat = this.numberOrUndefined(this.latInput.value)
    const lng = this.numberOrUndefined(this.lngInput.value)
    const headingDeg = this.wrapDegrees(this.numberOrUndefined(this.headingInput.value), this.headingInput)
    // pitchDeg (unlike headingDeg) is never "unknown" — it's a required field on ObserverPose, so
    // an empty/invalid input just falls back to 0 (looking straight at the horizon) rather than
    // propagating NaN into the pose.
    const pitchDeg = this.numberOrUndefined(this.pitchInput.value) ?? 0
    // The FIELD states an altitude above sea level; ObserverPose.elevationM is a height above the
    // local ground (the terrain patch is built with the observer's own ground at y=0, see
    // TerrainMeshBuilder). Subtracting the ground's own height is the whole conversion — and while
    // that height isn't known the two coincide, which is exactly the behaviour this had before.
    // Never negative: a witness cannot be underneath the ground they are standing on.
    const altitudeM = this.numberOrUndefined(this.elevationInput.value) ?? this.groundElevationM ?? 0
    const elevationM = Math.max(0, altitudeM - (this.groundElevationM ?? 0))
    const event = this.ufoElement.sighting.event
    const witnessTrack = this.ufoElement.sighting.witnessTrack
    const t = this.ufoElement.currentTime

    const name = this.stringOrUndefined(this.placeNameInput.value.trim())
    event.place = lat !== undefined && lng !== undefined ? [{ lat, lng, name }] : undefined

    const instrument = this.ufoElement.sighting.instrument
    // A focal length is only ever another way of writing the field, which is what the pose keeps
    // and what every projection here is anchored on (see Instruments.focalLengthMmFor). For an eye
    // the same input states the field in degrees directly, since an eye has no focal length.
    const stated = this.numberOrUndefined(this.focalLengthInput.value)
    const fovDeg =
      (instrument.frame && stated !== undefined
        ? Instruments.fieldOfViewDegAt(instrument, stated)
        : stated) ?? this.currentFovDeg()
    const fNumber = this.numberOrUndefined(this.fNumberInput.value)
    const exposureSeconds = UfoRecorderElement.exposureSeconds(this.exposureInput.value)
    // Empty is not missing here, it is INFINITY — where a camera pointed at the sky is focused.
    const focusDistanceM = this.numberOrUndefined(this.focusDistanceInput.value)
    const nothingSet = lat === undefined && lng === undefined && headingDeg === undefined && pitchDeg === 0 && elevationM === 0
    if (nothingSet) {
      witnessTrack.removeKeyframeAt(t)
    } else {
      witnessTrack.addKeyframe(t, {
        lat,
        lng,
        elevationM,
        headingDeg,
        pitchDeg,
        fovDeg,
        fNumber,
        exposureSeconds,
        focusDistanceM
      })
    }
    // Neither field affects the 2D shape canvas, so this refresh() is only for its side effect —
    // it's what makes this edit surface as a "timeupdate" (see the constructor's listener), the
    // signal a composed live preview (e.g. a <rr0-scene>) needs to resync.
    this.ufoElement.refresh()
    // Moving the witness moves which weather record describes them — see scheduleWeatherLookup.
    this.scheduleWeatherLookup()
    // ...and moves them out of the place whose name is on display — see schedulePlaceReverse.
    this.schedulePlaceReverse()
    // ...and into a different country's clocks, which is what the observation's own hour is read
    // against — see scheduleTimeZoneLookup.
    this.scheduleTimeZoneLookup()
    // ...and onto ground of a different height, which is what Altitude is measured from.
    this.scheduleGroundElevation()
    // ...and can make a previously plausible time zone impossible: the offset is stated once, the
    // place can be re-stated at any time, and it is that pairing this checks.
    this.updateUtcOffsetValidity()
  }

  /** Parses `input`'s EDTF text and hands the result to `assign` on every keystroke — empty
   * clears the field entirely (valid, "not specified"); text that fails EDTF_TIME_PATTERN leaves
   * the sighting's previous value untouched (never overwritten with garbage mid-typing) but does
   * NOT mark the field invalid here — see validateEdtfTimeInput for why that's deferred to blur.
   * Whenever the text IS valid (or empty), any invalid flag from a previous blur is cleared
   * immediately rather than waiting for another blur, so fixing a typo doesn't stay red while
   * you're actively correcting it. Either way that data changes, refresh()es and re-derives
   * Duration, since a start/end edit can newly make it computable (or newly make it ambiguous —
   * see sightingDurationBlockedReason). */
  private applyEdtfTimeInput(input: HTMLInputElement, assign: (time: SightingTime | undefined) => void): void {
    const value = input.value.trim()
    if (value === "") {
      assign(undefined)
    } else {
      const parsed = parseEdtfTime(value)
      if (!parsed) return // leave the sighting's previous value untouched until this becomes valid
      assign(parsed)
    }
    input.setCustomValidity("")
    input.classList.remove("invalid")
    this.dropDurationOutrankedByDates()
    // A zone's offset depends on the date it is asked about — see applyTimeZoneOffset.
    if (this.ufoElement.sighting.event.timeZone) this.applyTimeZoneOffset()
    this.ufoElement.refresh() // see updateObserver()'s comment — this is what surfaces the edit as a timeupdate
    this.syncDurationField()
    this.scheduleWeatherLookup()
  }

  /**
   * Lets a start/end edit actually take effect on Duration, by clearing an explicit
   * `durationSeconds` the moment the two dates can state the length themselves.
   *
   * The two are alternatives for saying one thing (see SightingEvent.endTime), and
   * sightingDurationMs gives `durationSeconds` precedence — so without this, editing "Observation
   * end" on any recording that carries one did *nothing at all*, silently: the field kept showing
   * the old number, and the whole observation kept its old length. Every published case file
   * carries a durationSeconds, so that was every case file. Making the more recent edit win is
   * both what anyone typing into a date field expects and symmetric with the reverse (typing a
   * duration afterwards sets durationSeconds again, and takes precedence again).
   *
   * Only when the pair really does yield an exact length: dates too imprecise to subtract (see
   * sightingDurationBlockedReason) must not wipe a good explicit duration and leave the recording
   * with no length at all.
   */
  private dropDurationOutrankedByDates(): void {
    const event = this.ufoElement.sighting.event
    if (event.durationSeconds === undefined) return
    if (sightingDurationMs({ ...event, durationSeconds: undefined }) === undefined) return
    this.ufoElement.durationSeconds = undefined
  }

  /** Diagnoses `input`'s EDTF text as invalid only now, on blur — never while the witness is
   * still mid-typing (see applyEdtfTimeInput's own doc comment: a live "you're wrong" on every
   * character of e.g. "1965-07-01T05:00" is both illegible against the shared `.invalid` styling
   * and just distracting). Blur only fires once the field was actually focused, so a field the
   * witness never touched can never end up flagged. A no-op when the text is empty or already
   * valid (applyEdtfTimeInput already cleared the flag in that case). */
  private validateEdtfTimeInput(input: HTMLInputElement): void {
    const value = input.value.trim()
    if (value === "" || parseEdtfTime(value)) return
    input.setCustomValidity(this.messages.edtfInvalid)
    input.classList.add("invalid")
  }

  /** Writes the sighting's reported observation-start time (event.time) from the EDTF text field. */
  /** Writes the observation's own legal time zone (event.utcOffsetHours) — what turns the
   * witness's wall-clock time into a real instant, and so which sky the scene renders. Empty
   * means unknown, falling back to approximating it from the longitude (see
   * SightingEvent.utcOffsetHours). Refreshes right away since every celestial body in the 3D
   * scene moves with it. */
  /** Fills the zone picker: a manual entry first (type the number yourself, what a recording could
   * always do), then every IANA zone the platform knows. Built in script — there are some four
   * hundred of them, and they are the platform's list, not ours. */
  private refreshTimeZoneOptions(): void {
    const manual = document.createElement("option")
    manual.value = ""
    manual.textContent = this.messages.timeZoneManual
    this.timeZoneSelect.replaceChildren(
      manual,
      ...this.timeZones.available().map(zone => {
        const option = document.createElement("option")
        option.value = zone
        option.textContent = zone
        return option
      })
    )
    this.timeZoneSelect.value = this.ufoElement.sighting.event.timeZone ?? ""
  }

  /** Picking a zone hands the offset over to that zone's own rules; picking the manual entry hands
   * it back to the witness, keeping whatever number the zone last produced as their starting
   * point. */
  private updateTimeZone(): void {
    const zone = this.stringOrUndefined(this.timeZoneSelect.value)
    this.ufoElement.sighting.event.timeZone = zone
    this.applyTimeZoneOffset()
  }

  /**
   * Re-derives `utcOffsetHours` from the chosen zone for the observation's OWN date — which is why
   * this runs again on every date edit, not just when the zone changes: the same zone gives a
   * different answer in January and July, and gave different answers in 1965 and today (see
   * TimeZones). A no-op while the offset is the witness's to state.
   */
  private applyTimeZoneOffset(): void {
    const event = this.ufoElement.sighting.event
    const derived = event.timeZone && event.time ? this.timeZones.offsetHoursAt(event.timeZone, event.time) : undefined
    if (derived !== undefined) event.utcOffsetHours = derived
    // Read-only, not disabled: the number is still the thing that matters and still worth reading,
    // it just isn't the witness's to type while a zone is deciding it.
    this.utcOffsetInput.readOnly = event.timeZone !== undefined
    this.syncUtcOffsetField()
    this.ufoElement.refresh()
    this.scheduleWeatherLookup()
  }

  private updateUtcOffset(): void {
    this.ufoElement.sighting.event.utcOffsetHours = this.numberOrUndefined(this.utcOffsetInput.value)
    this.updateUtcOffsetValidity()
    this.ufoElement.refresh()
    // The offset is what turns the witness's wall clock into a real instant, so it decides which
    // hour of record the sighting even falls in — an hour out is a different sky AND a different
    // weather row (see SightingEvent.utcOffsetHours).
    this.scheduleWeatherLookup()
  }

  private updateObservationTime(): void {
    this.applyEdtfTimeInput(this.obsTimeInput, time => {
      this.ufoElement.sighting.event.time = time
    })
  }

  /** Writes the sighting's reported observation-end time (event.endTime) from the EDTF text
   * field. See SightingEvent.endTime's own doc comment: durationSeconds takes precedence over
   * this when both are set. */
  private updateObservationEndTime(): void {
    this.applyEdtfTimeInput(this.obsEndTimeInput, time => {
      this.ufoElement.sighting.event.endTime = time
    })
  }

  /** Builds a People object from the 5 witness inputs and writes it (plus caseId) straight onto
   * the sighting — legal since Sighting.ts made these fields non-readonly for exactly this
   * purpose (see its own doc comment). firstNames is comma-separated free text, parsed exactly
   * like updateTags(). If every witness field ends up empty, `witness` is cleared to `undefined`
   * rather than storing an all-empty object — same "blank everything clears it" convention used
   * everywhere else in this file. */
  private updateWitnessMetadata(): void {
    const sighting = this.ufoElement.sighting
    const firstNames = this.witnessFirstNamesInput.value
      .split(",")
      .map(name => name.trim())
      .filter(name => name.length > 0)
    const witness: People = {
      id: this.stringOrUndefined(this.witnessIdInput.value),
      dirName: this.stringOrUndefined(this.witnessDirNameInput.value),
      title: this.stringOrUndefined(this.witnessTitleInput.value),
      lastName: this.stringOrUndefined(this.witnessLastNameInput.value),
      firstNames: firstNames.length > 0 ? firstNames : undefined
    }
    sighting.witness = Object.values(witness).some(value => value !== undefined) ? witness : undefined
    sighting.caseId = this.stringOrUndefined(this.caseIdInput.value)
    this.ufoElement.refresh()
  }

  private updateDescription(): void {
    this.ufoElement.sighting.event.description = this.stringOrUndefined(this.descriptionInput.value)
    this.ufoElement.refresh()
  }

  /** Comma-separated free text, same low-tech input as every other field here (no tag-chip
   * widget) — trims each entry and drops empties, e.g. "ufo, , night  " -> ["ufo", "night"].
   * An empty result clears the field to undefined rather than storing []. */
  private updateTags(): void {
    const tags = this.tagsInput.value
      .split(",")
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0)
    this.ufoElement.sighting.event.tags = tags.length > 0 ? tags : undefined
    this.ufoElement.refresh()
  }

  /** Writes the sighting's reported weather condition at the current playhead as a keyframe — same
   * keyframed-track pattern as updateObserver() now that weather is itself a track (see
   * WeatherTrack.ts/Sighting.resolveWeatherAt), replacing the flat whole-sighting reassignment this
   * used to be. Unlike updateObserver(), there's no "nothing set, remove the keyframe instead"
   * case: every weather field always has a real default (0/none/false — none of these inputs has
   * an "empty" state the way a number input does), so every edit is a real keyframe. Bails out
   * while playing, same reasoning as updateObserver's identical guard. `sceneElement.setWeather()`
   * is no longer called explicitly here (unlike before) — refresh()'s own timeupdate now resolves
   * and applies weather at this instant the same way it already does for observer pose, see
   * SceneElement.updateAstronomy. */
  private applyWeatherAtPlayhead(): void {
    if (this.ufoElement.playbackState === "playing") return
    // Unlocks weather audio right here — this input event IS a real user gesture, exactly what
    // AudioContext.resume() requires (see SceneElement.resumeWeatherAudio/WeatherAudio.resume).
    this.sceneElement.resumeWeatherAudio()
    // Typing into these fields IS taking them back. They are only ever editable when no record
    // owns their values (see syncWeatherSourceState), so an edit here is the witness's own
    // account, and no later lookup may overwrite it — the same guarantee unticking the box gives,
    // reached the other way round. Without this, a witness who described the weather BEFORE
    // stating the date and place watched it vanish the moment they typed them: the box, which is
    // unavailable until there is something to ask, ticked itself and the record replaced their
    // account. They had no way to prevent it, since the only control that could was disabled.
    if (this.weatherFromRecords) {
      this.weatherFromRecords = false
      this.cancelWeatherLookup()
      this.ufoElement.sighting.weatherSource = undefined
      this.syncWeatherSourceState()
    }
    const weather: Weather = {
      cloudCover: Number(this.cloudCoverInput.value),
      highCloudCover: Number(this.highCloudCoverInput.value),
      // Hand-authored, the cover slider IS the lower deck: it is what a reader means by "cloud",
      // and the ice has its own control beside it.
      lowerCloudCover: Number(this.cloudCoverInput.value),
      cloudDarkness: Number(this.cloudDarknessInput.value),
      cloudBaseM: this.numberOrUndefined(this.cloudBaseInput.value),
      precipitationType: this.precipitationTypeSelect.value as PrecipitationType,
      precipitationIntensity: Number(this.precipitationIntensityInput.value),
      windDirectionDeg: this.wrapDegrees(this.numberOrUndefined(this.windDirectionInput.value), this.windDirectionInput) ?? 0,
      windSpeed: Number(this.windSpeedInput.value),
      storm: this.stormInput.checked
    }
    this.ufoElement.sighting.weatherTrack.addKeyframe(this.ufoElement.currentTime, weather)
    // Surfaces the edit as a timeupdate (see updateObserver()'s identical comment) — what makes
    // SceneElement.updateAstronomy() re-resolve and apply weather at this instant.
    this.ufoElement.refresh()
  }

  /**
   * Writes the crystal alignment, and nothing else, into the weather at the playhead.
   *
   * Deliberately not applyWeatherAtPlayhead. That one rebuilds the whole weather from the visible
   * inputs and, in doing so, takes the recording away from whatever record it was looked up from —
   * which is exactly right for a witness overruling a cloud cover, and exactly wrong here. Nobody
   * measured what the crystals were doing, so stating it contradicts no record and must not discard
   * one; and rebuilding from the inputs would also throw away the fields a record fills that have no
   * control of their own, the lower decks among them.
   */
  private applyIceAlignmentAtPlayhead(): void {
    if (this.ufoElement.playbackState === "playing") return
    this.sceneElement.resumeWeatherAudio()
    const weather: Weather = {
      ...resolveWeatherAt(this.ufoElement.sighting, this.ufoElement.currentTime),
      iceCrystalAlignment: Number(this.iceCrystalAlignmentInput.value)
    }
    this.ufoElement.sighting.weatherTrack.addKeyframe(this.ufoElement.currentTime, weather)
    this.ufoElement.refresh()
  }

  /** Fills the kind dropdown from SOUND_KINDS, so a new timbre is one entry in that list and
   * nothing else — no markup, no per-option element id (same rule the data-source pickers follow,
   * see sourcePicker). Labels are set from the current messages here and retranslated by
   * applyMessages. */
  private buildSoundKindOptions(): void {
    for (const kind of SOUND_KINDS) {
      const option = document.createElement("option")
      option.value = kind
      option.textContent = this.soundKindLabel(kind, this.messages)
      this.soundKindOptions.set(kind, option)
      this.soundKindSelect.appendChild(option)
    }
  }

  private soundKindLabel(kind: SoundKind, messages: UfoRecorderMessages): string {
    switch (kind) {
      case "hum":
        return messages.soundHum
      case "whistle":
        return messages.soundWhistle
      case "rumble":
        return messages.soundRumble
      case "crackle":
        return messages.soundCrackle
      default:
        return messages.soundNone
    }
  }

  /**
   * Writes what the sighting sounded like at the current playhead as a keyframe — the same
   * keyframed-track pattern as applyWeatherAtPlayhead/updateObserver, on the same clock as the
   * shapes, which is what lets a craft be recorded silent on the ground and heard only from the
   * instant it lifted off: keyframe "none" at the start, a hum at that instant.
   *
   * Like weather and unlike updateObserver, there's no "nothing set, remove the keyframe" case —
   * every field here always holds a real value, and "none" is itself a statement (see Sound.ts).
   * Bails out while playing, same reasoning as every other edit path.
   */
  private applySoundAtPlayhead(): void {
    if (this.ufoElement.playbackState === "playing") return
    const sound = this.readSound()
    this.ufoElement.sighting.soundTrack.addKeyframe(this.ufoElement.currentTime, sound)
    this.updateSoundPitchReadout(sound.pitchHz)
    this.updateSoundFieldsDisabledState(sound)
    this.ufoElement.refresh()
    // AFTER refresh(), never before: refresh() paints a frame, and painting while paused is
    // exactly what silences any sound (see UfoElement.onFrame) — previewing first would be
    // switched off by the very repaint this edit triggers.
    this.previewSound(sound)
  }

  /** Lets the witness hear what they are describing while they tune it — an input event on a
   * sound field IS the user gesture an AudioContext needs. Bounded by its own timer so a hum
   * doesn't outlive the edit that started it (see SOUND_PREVIEW_MS). */
  private previewSound(sound: SightingSound): void {
    clearTimeout(this.soundPreviewTimer)
    this.ufoElement.previewSound(sound)
    this.soundPreviewTimer = setTimeout(() => this.ufoElement.stopSoundPreview(), SOUND_PREVIEW_MS)
  }

  private readSound(): SightingSound {
    return {
      kind: this.soundKindSelect.value as SoundKind,
      volume: Number(this.soundVolumeInput.value),
      pitchHz: Number(this.soundPitchInput.value),
      // A blank field is no recording at all, not an empty URL to try to fetch.
      src: this.soundSrcInput.value.trim() || undefined
    }
  }

  /** Keeps the sound fields honest as the playhead moves or a different keyframe region is
   * scrubbed to — same role, same playing-state bailout and same skip-the-focused-field rule as
   * syncWeatherFromTimeline (see syncObserverFromTimeline's doc comment for what that rule is
   * there to prevent). */
  private syncSoundFromTimeline(): void {
    if (this.ufoElement.playbackState === "playing") return
    const sound = resolveSoundAt(this.ufoElement.sighting, this.ufoElement.currentTime)
    const active = this.shadow.activeElement
    if (active !== this.soundKindSelect) this.soundKindSelect.value = sound.kind
    if (active !== this.soundVolumeInput) this.soundVolumeInput.value = String(sound.volume)
    if (active !== this.soundPitchInput) this.soundPitchInput.value = String(sound.pitchHz)
    if (active !== this.soundSrcInput) this.soundSrcInput.value = sound.src ?? ""
    this.updateSoundPitchReadout(sound.pitchHz)
    this.updateSoundFieldsDisabledState(sound)
  }

  /** The pitch slider says nothing on its own — this is what makes it readable as the frequency
   * it actually sets, the same role apparent-size plays for the size/distance pair. */
  private updateSoundPitchReadout(pitchHz: number): void {
    this.soundPitchValue.textContent = `${Math.round(pitchHz)} Hz`
  }

  /** Greys out what this sound genuinely has no use for: everything but the kind when nothing was
   * heard, and the pitch when a real recording carries its own (see SightingSound.src). Plain
   * `disabled`, with the UA's own "unavailable" styling — unlike the weather fields, which are
   * locked because they were looked up and deliberately keep looking editable-but-read-only. */
  private updateSoundFieldsDisabledState(sound: SightingSound): void {
    const silent = sound.kind === "none" && !sound.src
    this.soundVolumeInput.disabled = silent
    this.soundSrcInput.disabled = silent
    this.soundPitchInput.disabled = silent || sound.src !== undefined
  }

  /** Swaps the record consulted for inferred weather — the element itself only ever names the
   * WeatherProvider interface (see defaultWeatherProvider's own doc comment), so an embedder with
   * a national archive, or a test with a canned response, substitutes one here. */
  set weatherProvider(provider: WeatherProvider) {
    this.weatherInference = new WeatherInference(provider)
    this.scheduleWeatherLookup()
  }

  /** Checked hands the Circumstances fields to the meteorological record; unchecked hands them
   * back to the witness. Unchecking keeps the values exactly as they are — a real record is the
   * best starting point a correction can have — but drops the claim that they were measured, and
   * with it any right of a later lookup to overwrite them (see Sighting.weatherSource). */
  private onWeatherInferredToggled(): void {
    this.weatherFromRecords = this.weatherInferredInput.checked
    if (this.weatherFromRecords) {
      this.scheduleWeatherLookup()
    } else {
      this.cancelWeatherLookup()
      this.ufoElement.sighting.weatherSource = undefined
      this.syncWeatherSourceState()
    }
  }

  /** Coalesces the burst of edits a single date or coordinate produces into one lookup — see
   * WEATHER_LOOKUP_DEBOUNCE_MS. A no-op while the witness owns these fields: their account is
   * never re-derived behind their back. */
  private scheduleWeatherLookup(): void {
    if (!this.weatherFromRecords) return
    clearTimeout(this.weatherLookupTimer)
    this.weatherLookupTimer = setTimeout(() => void this.inferWeather(), WEATHER_LOOKUP_DEBOUNCE_MS)
  }

  /** Drops a pending lookup AND disowns any answer already in flight (see inferWeather's token) —
   * needed wherever the question itself stops applying: the witness has taken the fields back, or
   * a whole different recording has just been loaded over the one that asked. Without it, an
   * answer about the previous sighting lands on the new one seconds later. */
  private cancelWeatherLookup(): void {
    clearTimeout(this.weatherLookupTimer)
    this.weatherLookupToken++
    this.weatherLookupPending = false
  }

  /** Asks the record what the weather was at this sighting's own date, time and place, and writes
   * the answer into its weatherTrack. Everything that isn't a successful lookup — no date yet, no
   * record that far back, no network — leaves the fields UNLOCKED and says why: locking is what
   * this editor does when it has a measurement to show, never a way to refuse an answer it
   * couldn't produce. */
  private async inferWeather(): Promise<void> {
    if (!this.weatherFromRecords) return
    const token = ++this.weatherLookupToken
    this.weatherLookupPending = true
    this.syncWeatherSourceState()
    const result = await this.weatherInference.infer(this.ufoElement.sighting)
    // A newer edit already asked a newer question, or the witness took the fields back mid-flight.
    if (token !== this.weatherLookupToken || !this.weatherFromRecords) return
    this.weatherLookupPending = false
    this.weatherLookupResult = result
    if (result.status === "inferred") {
      this.weatherInference.applyTo(this.ufoElement.sighting, result)
      this.weatherTrackSpan = this.ufoElement.seekableDuration
      // Same role as everywhere else in this file: surfacing the edit as a timeupdate is what
      // makes the composed <rr0-scene> re-resolve and re-render the weather at this instant.
      this.ufoElement.refresh()
      this.syncWeatherFromTimeline()
    } else {
      this.ufoElement.sighting.weatherSource = undefined
    }
    this.syncWeatherSourceState()
  }

  /**
   * Re-derives the weather track when the clock it was laid out against has changed underneath it.
   *
   * A WeatherTrack keyframe is timed on the recording's own playback clock, and that clock CHANGES
   * LENGTH as authoring proceeds: with nothing drawn yet it spans the observation's whole declared
   * duration (Player.durationOverrideMs), and the moment a first shape is recorded it becomes the
   * recording's own — often a few seconds. A fifteen-hour track laid out over 54 000 000 ms then
   * sits entirely past the end of a 6 000 ms seek bar, so every position on it resolves to the
   * first keyframe and the weather appears frozen for the whole observation. That is what a witness
   * sees as "the weather never changes"; nothing about the lookup itself is wrong.
   *
   * Cheap to re-run: the provider answers an identical query from its own cache, so this costs no
   * request. Only ever for a track the record owns — a witness's own account is never re-derived.
   */
  private ensureWeatherTrackSpan(): void {
    if (!this.weatherFromRecords || this.ufoElement.sighting.weatherSource === undefined) return
    const span = this.ufoElement.seekableDuration
    if (this.weatherTrackSpan === undefined || span === this.weatherTrackSpan) return
    // Claimed before the lookup runs, so a span that keeps changing (a recording in progress)
    // re-schedules the debounced lookup rather than queueing one per tick.
    this.weatherTrackSpan = span
    this.scheduleWeatherLookup()
  }

  /** Locks (or releases) the weather fields and states where their values came from. Locked only
   * while a real source is attached: see inferWeather's own doc comment. */
  private syncWeatherSourceState(): void {
    const source = this.ufoElement.sighting.weatherSource
    const inferred = this.weatherFromRecords
    for (const field of this.weatherFields) {
      // Every field but one. What the crystals were doing eight kilometres up is in no reanalysis
      // and in no station log; locking that slider because ERA5 answered about the CLOUDS would be
      // claiming a measurement that does not exist, and would leave a reader unable to try the
      // display the record cannot decide (see Weather.iceCrystalAlignment).
      field.disabled = inferred && source !== undefined && field !== this.iceCrystalAlignmentInput
    }
    // With no date or no place stated, there is no question to ask a record — so the control that
    // asks it is unavailable AND unticked, because a ticked box would say the weather below comes
    // from a record when nothing has been asked for it. What used to be printed as a status line
    // ("a full date and a place are needed") is its tooltip instead: an explanation of why a
    // control is unavailable belongs ON that control, not in the space reserved for what a record
    // answered. The requirement itself is WeatherInference's own (canInfer), never re-decided here;
    // the box ticks itself again as soon as one can be asked, unless the witness has turned it off.
    const canLookUp = this.weatherInference.canInfer(this.ufoElement.sighting)
    this.weatherInferredInput.disabled = !canLookUp
    this.weatherInferredInput.checked = canLookUp && this.weatherFromRecords
    const inferredTitle = canLookUp ? this.messages.weatherInferredTitle : this.messages.weatherNeedsDateAndPlace
    this.weatherInferredInput.title = inferredTitle
    this.labelWeatherInferred.title = inferredTitle
    const sourced = inferred && source !== undefined
    // "From [ERA5 (Open-Meteo)] © Copernicus/ECMWF, 2026-08-21 15:30 UTC" — the record that
    // answered is named by a picker, not a static line, for the same reason the geocoder is (see
    // sourcePicker): which record answered is part of the answer. The instant carries the link,
    // because it points at the exact request that produced these values, not at a home page.
    this.weatherSourceLink.hidden = !sourced
    if (sourced) {
      this.weatherSourceRow.hidden = false
      // No lead-in word: the checkbox right above already says "from weather records", and the
      // picker naming the record read as a second "from" immediately after it.
      this.weatherSourceText.textContent = ""
      this.weatherSourceLink.href = source!.url
      this.weatherSourceLink.textContent = this.observationInstantLabel()
      return
    }
    const status = inferred ? this.weatherStatusMessage() : ""
    this.weatherSourceText.textContent = status === "" ? "" : `${status} `
    // The picker names which record answered, or is being asked; with nothing asked and nothing
    // answered it would be a credit for data nobody produced.
    this.weatherSourceRow.hidden = status === ""
  }

  /** What the record had to say, for the line next to the picker — empty when nothing was asked.
   * "Asked, and there is no such record" and "the question couldn't be put" stay different
   * sentences (see Sighting.weatherSource); "nothing to ask yet" is no longer one of them at all,
   * since it describes the sighting rather than the record and now lives on the disabled control's
   * own tooltip (see syncWeatherSourceState). */
  private weatherStatusMessage(): string {
    if (this.weatherLookupPending) return this.messages.weatherLookingUp
    switch (this.weatherLookupResult?.status) {
      case "unavailable":
        return this.messages.weatherNoRecord
      case "failed":
        return this.messages.weatherLookupFailed
      default:
        return ""
    }
  }

  /** ", 1965-07-01 04:00 UTC" — the instant the shown values describe, stated back so a wrong time
   * zone (the one thing a longitude cannot guess, see SightingEvent.utcOffsetHours) is visible
   * here rather than only in the rendered sky. Empty when there's no date to state. */
  private observationInstantLabel(): string {
    const event = this.ufoElement.sighting.event
    const instant = event.time && sightingTimeToDate(event.time, event.place?.[0]?.lng ?? 0, event.utcOffsetHours)
    return instant ? `, ${instant.toISOString().slice(0, 16).replace("T", " ")} UTC` : ""
  }

  /** Decides, for a freshly loaded recording, who owns its weather: the record when the file names
   * one (its keyframes came from there, and are kept as-is rather than looked up again — a case
   * file must replay identically offline and years later), the witness when it has weather but no
   * source, and the record again for a file with no weather at all, which is what makes an
   * imported case pick up its real conditions the moment it states a date and a place. */
  private syncWeatherOwnership(): void {
    const sighting = this.ufoElement.sighting
    // Anything the previous recording had in flight is about a different sighting now.
    this.cancelWeatherLookup()
    this.weatherLookupResult = undefined
    this.weatherFromRecords = sighting.weatherSource !== undefined || sighting.weatherTrack.allKeyframes.length === 0
    this.syncWeatherSourceState()
    if (this.weatherFromRecords && sighting.weatherSource === undefined) {
      this.scheduleWeatherLookup()
    }
  }

  /** Auto-fills Duration from the observation's start/end dates when no explicit duration has
   * been typed — reads sightingDurationMs(event), which already prefers an explicit
   * event.durationSeconds over the endTime-minus-time fallback, so this doesn't duplicate that
   * precedence itself. Skips writing the field while it's focused, same "don't fight active
   * typing" reasoning as syncObserverFromTimeline's lat/lng skip — called on every keystroke of
   * this same field (via its own "input" listener) as well as from date-field edits and on load.
   * updateDurationValidity() always runs regardless of focus, since that only reads the field's
   * current value rather than overwriting it. */
  private syncDurationField(): void {
    if (this.shadow.activeElement !== this.durationInput) {
      const durationMs = sightingDurationMs(this.ufoElement.sighting.event)
      this.durationInput.value = durationMs !== undefined ? String(durationMs / 1000) : ""
    }
    this.updateDurationValidity()
  }

  /** Duration has no sane default (unlike every other field in this toolbar) — real playback
   * pacing needs *some* notion of the observation's length, so an empty value is visibly flagged
   * as missing rather than just left blank. Clears automatically the moment a value exists,
   * whether typed directly or derived from start/end dates. When start/end are both given but too
   * imprecise/mismatched to derive an exact duration from (see sightingDurationBlockedReason), the
   * field's title explains why instead of leaving the witness to guess. */
  private updateDurationValidity(): void {
    const missing = this.durationInput.value === ""
    this.durationInput.classList.toggle("invalid", missing)
    this.durationInput.setAttribute("aria-invalid", String(missing))
    const blockedReason = sightingDurationBlockedReason(this.ufoElement.sighting.event)
    this.durationInput.title = blockedReason === "imprecise" ? this.messages.durationImprecise : ""
  }

  /** Keeps the external Play/Pause/Seek/Loop row (see the constructor's ufoElement.showToolbar
   * comment) honest as playback ticks or the timeline changes — mirrors what UfoElement's own
   * (hidden, here) internal toolbar does for itself via updatePlayPauseButton()/refresh(), just
   * reading its state through the small public API added for this instead of duplicating its
   * logic. The two time labels specifically read ufoElement.positionLabel/durationLabel (already-
   * computed text) rather than formatting currentTime/seekableDuration directly — those are raw
   * TIMELINE-position units that advance at playbackRate× real speed, not real milliseconds (see
   * positionLabel's own doc comment for the bug this avoids: a naive mm:ss of the raw values once
   * genuinely showed the wrong total and ticked at the wrong real-time speed whenever the declared
   * duration didn't match the raw recording length — normally the case). */
  private syncPlaybackControls(): void {
    // Runs on every timeupdate, which is exactly when the seekable span can have changed.
    this.ensureWeatherTrackSpan()
    const isPlaying = this.ufoElement.playbackState === "playing"
    const hasDuration = this.ufoElement.seekableDuration > 0
    this.playPauseButton.textContent = isPlaying ? "⏸" : "▶"
    this.playPauseButton.disabled = !hasDuration
    const label = !hasDuration ? this.messages.noDuration : isPlaying ? this.messages.pause : this.messages.play
    this.playPauseButton.title = label
    this.playPauseButton.setAttribute("aria-label", label)
    this.loopButton.setAttribute("aria-pressed", String(this.ufoElement.autoReplayEnabled))
    this.seekInput.max = String(this.ufoElement.seekableDuration)
    // Skips the field while it's focused — same "don't fight active input" reasoning as
    // syncDurationField/syncObserverFromTimeline.
    if (this.shadow.activeElement !== this.seekInput) {
      this.seekInput.value = String(this.ufoElement.currentTime)
    }
    this.timeStartLabel.textContent = this.ufoElement.positionLabel
    this.timeEndLabel.textContent = this.ufoElement.durationLabel
    this.syncTimeDisplaySwitch()
  }

  /**
   * Makes this toolbar's own two counters switch between clock time and elapsed time, exactly as
   * the nested element's do.
   *
   * The state lives in <rr0-ufo> and is only read here. Both toolbars show the same two values —
   * these labels are literally its own formatted text — so a second copy of "which reading am I
   * displaying" would be one copy too many, and the first thing to drift.
   */
  /** Switches, then repaints these labels straight away: syncPlaybackControls is driven by
   * timeupdate, which does not fire while the recording is stopped — and a counter that only
   * changed once playback resumed would read as a click that did nothing. */
  private switchTimeDisplay(): void {
    this.ufoElement.toggleTimeDisplay()
    this.timeStartLabel.textContent = this.ufoElement.positionLabel
    this.timeEndLabel.textContent = this.ufoElement.durationLabel
    this.syncTimeDisplaySwitch()
  }

  private syncTimeDisplaySwitch(): void {
    const canSwitch = this.ufoElement.canSwitchTimeDisplay
    const hint = this.ufoElement.showingClockTime ? this.messages.switchToElapsed : this.messages.switchToClockTime
    for (const [label, what] of [
      [this.timeStartLabel, this.messages.currentPosition],
      [this.timeEndLabel, this.messages.duration]
    ] as const) {
      label.title = canSwitch ? `${what} — ${hint}` : what
      label.classList.toggle("switchable", canSwitch)
      if (canSwitch) {
        label.setAttribute("role", "button")
        label.setAttribute("tabindex", "0")
      } else {
        label.removeAttribute("role")
        label.removeAttribute("tabindex")
      }
    }
  }

  /** Resyncs the observation date/time fields from a freshly loaded sighting (sightingData
   * setter) — same role syncDurationField() plays just above this call site. event.time is
   * sighting-wide metadata, not a per-instant keyframe like the observer's own pose (see
   * syncObserverFromTimeline for that), so this only needs to run once on load. */
  private syncObservationTimeFields(): void {
    const time = this.ufoElement.sighting.event.time
    this.obsTimeInput.value = time ? formatEdtfTime(time) : ""
    this.obsTimeInput.setCustomValidity("")
    this.obsTimeInput.classList.remove("invalid")
  }

  /** Resyncs the observation-end date/time field from a freshly loaded sighting — same role and
   * timing as syncObservationTimeFields(), for event.endTime instead of event.time. */
  private syncObservationEndTimeFields(): void {
    const endTime = this.ufoElement.sighting.event.endTime
    this.obsEndTimeInput.value = endTime ? formatEdtfTime(endTime) : ""
    this.obsEndTimeInput.setCustomValidity("")
    this.obsEndTimeInput.classList.remove("invalid")
  }

  /** Resyncs witness/case/description/tags from a freshly loaded sighting — same role as
   * syncObservationTimeFields(): these are sighting-wide metadata, not per-instant keyframes, so
   * this only needs to run once on load. */
  /** Resyncs the time-zone field from a freshly loaded recording — sighting-wide metadata like the
   * observation date, so once on load. It had no resync at all, which meant loading a recording
   * left the PREVIOUS one's offset sitting in the field: the number shown described a sighting the
   * editor was no longer holding, and the one silently in force was invisible. */
  private syncUtcOffsetField(): void {
    const offset = this.ufoElement.sighting.event.utcOffsetHours
    this.utcOffsetInput.value = offset === undefined ? "" : String(offset)
    this.updateUtcOffsetValidity()
  }

  /**
   * Flags a declared time zone that cannot belong to the declared longitude — the failure that
   * renders midnight over Nanterre and gives no clue why, since the sky and the weather both
   * quietly obey it (an hour of offset is an hour of Earth's rotation, and a different row of the
   * weather record).
   *
   * Deliberately a wide net rather than a precise one: legal time genuinely departs from solar
   * time, sometimes by hours (all of China runs on UTC+8, so its western edge sits ~3 h off), and
   * the historical rules are worse still — this must never cry wolf at a correct
   * "France on UTC+1 in 1965" or "Alabama on UTC-6 in 1948". Only an offset no country has ever
   * placed on that meridian is flagged, and even then as a warning on the field, never as a
   * correction: the recording states the witness's clock, and this cannot know better than the
   * witness. Rendered with the same `.invalid` styling as an unparseable date.
   */
  private updateUtcOffsetValidity(): void {
    const declared = this.ufoElement.sighting.event.utcOffsetHours
    const lng = this.ufoElement.sighting.event.place?.[0]?.lng
    const solar = lng === undefined ? undefined : Math.round(lng / 15)
    const implausible = declared !== undefined && solar !== undefined && Math.abs(declared - solar) > MAX_LEGAL_SOLAR_OFFSET_GAP_HOURS
    this.utcOffsetInput.classList.toggle("invalid", implausible)
    this.utcOffsetInput.title = implausible
      ? this.messages.utcOffsetImplausible.replace("{solar}", solar! >= 0 ? `+${solar}` : String(solar))
      : ""
  }

  /** Restores the place name from a freshly loaded recording — sighting-wide metadata, like the
   * observation date, not a per-instant keyframe (the witnessTrack's poses carry coordinates only,
   * deliberately: a witness who moves is still at the same named place). */
  /**
   * Looks up the ground's own height above sea level at the current location, and re-anchors the
   * Altitude field to it: the field's floor becomes the ground (a witness in the Alps cannot be at
   * 0 m, and an editor that offers it invites a recording that says so), and a witness who was
   * standing on that ground reads their real altitude rather than a zero.
   *
   * The stored pose is untouched by the move: ObserverPose.elevationM stays a height above the
   * local ground — the terrain patch is built with the observer's own ground at y=0 — so all this
   * changes is which number the field shows for the same recording.
   */
  private scheduleGroundElevation(): void {
    const lat = this.numberOrUndefined(this.latInput.value)
    const lng = this.numberOrUndefined(this.lngInput.value)
    if (lat === undefined || lng === undefined) return
    // Already answered for this place, so don't ask again — and, decisively, don't ask again in
    // response to the write-back that same answer triggers. applyGroundElevation ends by calling
    // updateObserver (the field's meaning has changed, so the pose must agree with it), and
    // updateObserver schedules a ground lookup: the two called each other about once a second, for
    // as long as the editor was open, and each turn ALSO re-asked the weather record and the
    // geocoder. That is the "the UI refreshes every second" the user reported, and it was hammering
    // three public services to re-derive values that never changed. Same tolerance as the reverse
    // geocoder's own (see SAME_PLACE_DEG): ~11 m, well under a terrain sample.
    if (this.groundElevationFor && this.isSamePlace(this.groundElevationFor, lat, lng)) return
    clearTimeout(this.groundElevationTimer)
    this.groundElevationTimer = setTimeout(() => void this.applyGroundElevation(lat, lng), GROUND_ELEVATION_DEBOUNCE_MS)
  }

  /** Whether a pair of coordinates names the same spot as `place`, within the tolerance a
   * hand-typed decimal deserves — see SAME_PLACE_DEG. */
  private isSamePlace(place: { lat: number; lng: number }, lat: number, lng: number): boolean {
    return Math.abs(place.lat - lat) < SAME_PLACE_DEG && Math.abs(place.lng - lng) < SAME_PLACE_DEG
  }

  private async applyGroundElevation(lat: number, lng: number): Promise<void> {
    const token = ++this.groundElevationToken
    const source = dataSourceById(ELEVATION_SOURCES, this.chosenSourceId.get("elevation"))
    const ground = await new GroundElevation(source.create()).at(lat, lng)
    if (token !== this.groundElevationToken || ground === undefined) return
    this.groundElevationFor = { lat, lng }
    const heightAboveGround = Math.max(0, (this.numberOrUndefined(this.elevationInput.value) ?? 0) - (this.groundElevationM ?? 0))
    this.groundElevationM = Math.round(ground)
    this.syncElevationField(heightAboveGround)
    // The pose itself is unchanged, but the number in the field now means something different —
    // write it back so the two can't disagree.
    this.updateObserver()
  }

  /** Shows `heightAboveGroundM` as what it is in the world: an altitude above sea level, floored at
   * the ground the witness is standing on. */
  private syncElevationField(heightAboveGroundM: number): void {
    const ground = this.groundElevationM
    this.elevationInput.value = String(Math.round((ground ?? 0) + heightAboveGroundM))
    this.elevationInput.min = ground === undefined ? "" : String(ground)
    this.elevationInput.title = ground === undefined ? "" : this.messages.altitudeAboveSeaLevel
    this.groundElevationOutput.textContent =
      ground === undefined ? "" : this.messages.groundAt.replace("{m}", String(ground))
  }

  /** A freshly loaded recording is somewhere else: until its own ground height resolves, the
   * Altitude field is a plain height above the local ground again, rather than one measured from a
   * sea level the previous sighting's mountains defined. */
  private syncGroundElevationField(): void {
    this.groundElevationToken++
    clearTimeout(this.groundElevationTimer)
    this.groundElevationM = undefined
    this.groundElevationFor = undefined
    this.syncElevationField(resolveObserverPoseAt(this.ufoElement.sighting, 0)?.elevationM ?? 0)
    this.scheduleGroundElevation()
  }

  private syncPlaceNameField(): void {
    const place = this.ufoElement.sighting.event.place?.[0]
    const name = place?.name ?? ""
    this.placeNameInput.value = name
    this.placeNameInput.title = name
    // A loaded recording's name already describes its own coordinates — that pairing is what the
    // file states, and re-deriving it would only replace the author's wording with a gazetteer's.
    this.namedCoordinates = place && name ? { lat: place.lat, lng: place.lng } : undefined
    this.placeMatches = []
    this.placeMatchRow.hidden = true
    this.placeStatusText.textContent = ""
  }

  private syncWitnessMetadataFields(): void {
    const sighting = this.ufoElement.sighting
    this.witnessIdInput.value = sighting.witness?.id ?? ""
    this.witnessDirNameInput.value = sighting.witness?.dirName ?? ""
    this.witnessTitleInput.value = sighting.witness?.title ?? ""
    this.witnessLastNameInput.value = sighting.witness?.lastName ?? ""
    this.witnessFirstNamesInput.value = sighting.witness?.firstNames?.join(", ") ?? ""
    this.caseIdInput.value = sighting.caseId ?? ""
    this.descriptionInput.value = sighting.event.description ?? ""
    this.tagsInput.value = sighting.event.tags?.join(", ") ?? ""
    this.instrumentSelect.value = sighting.instrument.id
  }

  /** Keeps the weather toolbar honest as the playhead moves or a different keyframe region is
   * scrubbed to — same role/timing and the same playing-state bailout as syncObserverFromTimeline
   * (merely scrubbing must never itself write a keyframe). Reads resolveWeatherAt (interpolated,
   * not hold-last) so the fields reflect what a witness would actually have reported *between* two
   * weather keyframes, matching what SceneElement itself renders at that instant — it already
   * falls back through the legacy static sighting.weather, then DEFAULT_WEATHER, when the track
   * has no keyframes at all yet (e.g. a sighting loaded from older data, or before the very first
   * weather edit).
   *
   * Skips whichever field currently has focus — same "don't fight active typing/dragging"
   * reasoning as syncObserverFromTimeline's own doc comment. */
  private syncWeatherFromTimeline(): void {
    if (this.ufoElement.playbackState === "playing") return
    const weather = resolveWeatherAt(this.ufoElement.sighting, this.ufoElement.currentTime)
    const active = this.shadow.activeElement
    if (active !== this.cloudCoverInput) this.cloudCoverInput.value = String(weather.cloudCover)
    if (active !== this.highCloudCoverInput) this.highCloudCoverInput.value = String(weather.highCloudCover ?? 0)
    if (active !== this.iceCrystalAlignmentInput) {
      this.iceCrystalAlignmentInput.value = String(weather.iceCrystalAlignment ?? DEFAULT_ICE_CRYSTAL_ALIGNMENT)
    }
    if (active !== this.cloudDarknessInput) this.cloudDarknessInput.value = String(weather.cloudDarkness)
    if (active !== this.cloudBaseInput) this.cloudBaseInput.value = weather.cloudBaseM === undefined ? "" : String(weather.cloudBaseM)
    if (active !== this.precipitationTypeSelect) this.precipitationTypeSelect.value = weather.precipitationType
    if (active !== this.precipitationIntensityInput) {
      this.precipitationIntensityInput.value = String(weather.precipitationIntensity)
    }
    if (active !== this.windDirectionInput) this.windDirectionInput.value = String(weather.windDirectionDeg)
    if (active !== this.windSpeedInput) this.windSpeedInput.value = String(weather.windSpeed)
    if (active !== this.stormInput) this.stormInput.checked = weather.storm
  }

  /** Keeps the lat/lng/heading/pitch fields honest as the playhead moves or a different keyframe
   * region is scrubbed to — same role and the same playing-state bailout as
   * syncAppearanceFromTimeline (merely scrubbing must never itself write a keyframe). Reads
   * getInterpolatedPoseAt (not hold-last) so the fields reflect what a witness would see *between*
   * two observer keyframes, matching what SceneElement itself renders at that instant. Falls back
   * to the legacy static event.place when the track has no keyframes at all yet (e.g. a sighting
   * loaded from older data, or before the very first observer edit), mirroring
   * resolveObserverPoseAt's own precedence.
   *
   * Skips whichever field currently has focus: updateObserver() itself triggers this same resync
   * synchronously on every keystroke (input -> addKeyframe -> refresh() -> timeupdate), and
   * overwriting the field being typed into with its own just-parsed round-tripped value (e.g.
   * "43." -> Number -> 43 -> "43") silently ate the decimal point on every keystroke, making it
   * impossible to ever type a fractional lat/lng. The field the user is actively editing is always
   * exactly what they typed; only the *other*, not-currently-focused fields need resyncing here. */
  private syncObserverFromTimeline(): void {
    if (this.ufoElement.playbackState === "playing") return
    const sighting = this.ufoElement.sighting
    const pose = sighting.witnessTrack.getInterpolatedPoseAt(this.ufoElement.currentTime)
    const location = sighting.event.place?.[0]
    const active = this.shadow.activeElement
    if (active !== this.latInput) {
      this.latInput.value = pose?.lat !== undefined ? String(pose.lat) : location ? String(location.lat) : ""
    }
    if (active !== this.lngInput) {
      this.lngInput.value = pose?.lng !== undefined ? String(pose.lng) : location ? String(location.lng) : ""
    }
    // Rounded for exactly the reason the decor's own fields are (see rounded()): a gaze read back
    // from an interpolated trajectory is a float, and printing it raw fills the field with sixteen
    // digits — "312.7835073245701" in a box asking for degrees.
    if (active !== this.headingInput) {
      this.headingInput.value = pose?.headingDeg !== undefined ? String(this.rounded(pose.headingDeg)) : ""
    }
    if (active !== this.pitchInput) {
      this.pitchInput.value = String(this.rounded(pose?.pitchDeg ?? 0))
    }
    if (active !== this.elevationInput) {
      // The pose stores a height above the local ground; the field shows an altitude above sea
      // level — see syncElevationField.
      this.syncElevationField(pose?.elevationM ?? 0)
    }
  }

  /** The UFO's appearance (shape preset, color, transparency, halo) used for the next recording. */
  get appearance(): Appearance {
    return { ...this.currentAppearance }
  }

  set appearance(appearance: Partial<Appearance>) {
    this.setAppearance(appearance)
  }

  private setAppearance(appearance: Partial<Appearance>): void {
    // A preset button click sets `presetId` — that's the one case actually meant to swap the
    // shape's own kind/geometry (see buildAppearanceShape's own doc comment on why this matters).
    const changingPreset = "presetId" in appearance
    this.currentAppearance = { ...this.currentAppearance, ...appearance }
    this.updatePresetButtons()
    // While actively recording, a toolbar change only seeds the *next* take (unchanged,
    // pre-existing behavior) — the in-flight shapePrototype stays frozen for this take's
    // duration. While playing, the playhead is a moving target, not a specific instant to
    // edit — editing here would just get stomped by the next timeupdate-driven resync.
    if (this.isRecording || this.ufoElement.playbackState === "playing") return
    this.applyAppearanceAtPlayhead(undefined, changingPreset)
  }

  /** Writes (or updates) a keyframe for the current source at the exact instant the seek bar
   * is scrubbed to, so a post-hoc appearance edit — not just a live recording sample —
   * actually persists into the timeline. `bounds` lets addShape() stagger a brand-new
   * shape's starting position instead of stacking it on an existing one. `changingPreset`
   * defaults to true (full rebuild) since every other caller (initial keyframe, addShape) has no
   * existing shape to preserve geometry from anyway — see buildAppearanceShape. */
  private applyAppearanceAtPlayhead(bounds?: ShapeBounds, changingPreset = true): void {
    const timeline = this.ufoElement.sighting.timeline
    const t = this.ufoElement.currentTime
    const existing = timeline.getInterpolatedShapeAt(t, this.currentSourceId)
    const shape = this.buildAppearanceShape(bounds ?? existing?.bounds ?? this.defaultBounds(), existing, changingPreset)
    timeline.addKeyframe(t, [{ sourceId: this.currentSourceId, shape }])
    this.ufoElement.refresh()
  }

  /** `changingPreset` (only ever false from setAppearance's own color/transparency/haloScale
   * inputs, never a preset-button click) skips createShape entirely and just overlays the new
   * appearance fields onto `preserve` as-is — real bug this fixes: createShape ALWAYS rebuilds
   * kind/points fresh from SHAPE_PRESETS[presetId], so a plain color edit on a polygon that had
   * been custom-reshaped (vertices dragged/added/deleted via ShapeHandles, see
   * UfoRecorderElement.addVertexAtContextMenu/deleteVertexAtContextMenu/onDragPointerMove's
   * "vertex" case) silently snapped it back to that preset's own default starting geometry every
   * time, discarding the edit. A real preset-button click (changingPreset=true) still rebuilds via
   * createShape as before — that IS meant to replace kind/points — carrying forward angle/title/
   * selected from whatever shape was already there either way, so switching presets can't
   * silently erase an existing rotation or title. */
  private buildAppearanceShape(bounds: ShapeBounds, preserve?: Shape, changingPreset = true): Shape {
    if (preserve && !changingPreset) {
      return { ...preserve, color: this.currentAppearance.color, transparency: this.currentAppearance.transparency, haloScale: this.currentAppearance.haloScale }
    }
    const shape = createShape(bounds, this.currentAppearance)
    return preserve ? { ...shape, angle: preserve.angle, title: preserve.title, selected: preserve.selected } : shape
  }

  /** Runs everything that depends on {currentSourceId, currentTime}: resyncs the appearance
   * toolbar and drives the canvas-native selection highlight on the nested ufo element. */
  private onSelectionOrTimeChanged(): void {
    this.syncAppearanceFromTimeline()
    this.syncObserverFromTimeline()
    this.syncWeatherFromTimeline()
    // Whether a record CAN be asked is a property of the sighting's own date and place, so it has
    // to be re-read whenever either changes — and every edit path here ends in a refresh(), which
    // is what brings us back through this. Nothing else was recomputing it, so blanking a place
    // left the "from weather records" control enabled and ticked over a sighting that no longer
    // said where it happened. Costs a couple of comparisons: canInfer asks nothing of the network.
    this.syncWeatherSourceState()
    this.syncSoundFromTimeline()
    this.syncDecorLitFromTimeline()
    this.syncDecorPlacementFromTimeline()
    this.syncIndoorLookReset()
    this.updateAppearanceFieldsDisabledState()
    // Called unconditionally (not nested inside syncAppearanceFromTimeline's own early-return
    // branches) so switching to a multi-selection or away from any selection always re-evaluates
    // — its own missing/selectedSourceIds.size===1 guard is what actually clears a stale red
    // border left over from whatever single shape was selected before.
    this.updateShapeTitleValidity()
    // Also unconditional, and for a different reason from the line above: syncAppearanceFromTimeline
    // bows out while the recording is playing (nothing there may write the timeline mid-playback),
    // but the size estimate is exactly what playing the recording BUILDS — every instant the
    // playhead visits can tighten it (see SceneElement.sizeRangeOf). Refreshed from here so the
    // author watches it narrow as the object goes behind the first building.
    this.refreshRealSize()
    this.refreshSkyCandidates()
    // The date decides which devices are offered — see refreshInstrumentOptions.
    this.refreshInstrumentOptions()
    this.syncOpticsFromInstrument()
    this.ufoElement.selectedSourceIds = this.selectedSourceIds
    // Disabled once deleting the whole selection would leave nothing behind (a recording always
    // needs at least one shape — see deleteShape()'s own doc comment), for a source that's only a
    // not-yet-drawn placeholder (see addShape's own fallback), or while playing (the playhead is a
    // moving target, same reason every other edit path is blocked then) — and never re-enabled
    // mid-recording even if this happens to run then (the isRecording branch of toggleRecording()
    // already disables it, this is just a second guard so that branch's own disabling can never
    // get silently overridden here).
    const sourceIds = this.ufoElement.sighting.timeline.sourceIds
    const selectedKnownCount = sourceIds.filter(id => this.selectedSourceIds.has(id)).length
    this.deleteShapeButton.disabled =
      this.isRecording ||
      this.ufoElement.playbackState === "playing" ||
      selectedKnownCount === 0 ||
      sourceIds.length - selectedKnownCount < 1
  }

  /** When more than one shape is selected, the appearance fields (Name/Color/Transparency/Halo/
   * source dropdown/preset buttons) only make sense for a single shape — rather than showing one
   * arbitrary member's values as if they applied to the whole selection, they're disabled with a
   * title explaining why, the same disabled/title-explain convention the context menu already
   * uses. syncAppearanceFromTimeline() itself early-returns in this state instead of writing
   * possibly-misleading values into disabled fields. */
  private updateAppearanceFieldsDisabledState(): void {
    const multiple = this.selectedSourceIds.size > 1
    const title = multiple ? this.messages.multipleShapesSelected : ""
    for (const input of [
      this.shapeTitleInput,
      this.colorInput,
      this.transparencyInput,
      this.haloScaleInput,
      this.objectSizeInput,
      this.objectDistanceInput,
      this.sourceSelect,
      ...Object.values(this.presetButtons)
    ]) {
      input.disabled = multiple
      input.title = title
    }
  }

  /** Keeps the toolbar honest when the playhead or selected source changes, so touching one
   * slider can't clobber the others with stale values. Deliberately bypasses setAppearance —
   * merely scrubbing/selecting must never itself trigger a Timeline write. */
  private syncAppearanceFromTimeline(): void {
    if (this.ufoElement.playbackState === "playing") return
    // Multiple shapes selected: no single set of values to show — updateAppearanceFieldsDisabledState
    // (called alongside this from onSelectionOrTimeChanged) disables the fields instead.
    if (this.selectedSourceIds.size > 1) return
    const shape = this.ufoElement.sighting.timeline.getInterpolatedShapeAt(
      this.ufoElement.currentTime,
      this.currentSourceId
    )
    if (!shape) return
    this.currentAppearance = {
      presetId: presetIdForShape(shape),
      color: shape.color,
      transparency: shape.transparency,
      haloScale: shape.haloScale
    }
    this.updatePresetButtons()
    this.colorInput.value = this.currentAppearance.color
    this.transparencyInput.value = String(this.currentAppearance.transparency)
    this.haloScaleInput.value = String(this.currentAppearance.haloScale)
    // Skips the field while it's focused — same reasoning as syncObserverFromTimeline's lat/lng
    // skip: this same edit path re-syncs on every keystroke (input -> refresh() -> timeupdate),
    // which would otherwise stomp whatever the user is actively typing.
    if (this.shadow.activeElement !== this.shapeTitleInput) {
      this.shapeTitleInput.value = shape.title ?? ""
    }
    // The size/distance pair is deliberately NOT re-read from the shape here, unlike every other
    // field above: it isn't one of the shape's properties any more (see BaseShape.angular). It is
    // a working hypothesis the author typed — "suppose it was 30 m at 500 m" — and leaving it
    // standing across a change of selection is what lets the same hypothesis be tried on the
    // several shapes of one object.
    this.refreshApparentSize()
  }

  /** Writes the Name field straight onto the shape at the current playhead — a plain
   * spread-and-overwrite like onDragPointerMove's bounds edits, not buildAppearanceShape (which
   * would also rebuild kind/points from the current preset, overkill for a single string field). */
  private updateShapeTitle(): void {
    const timeline = this.ufoElement.sighting.timeline
    const t = this.ufoElement.currentTime
    const shape = timeline.getInterpolatedShapeAt(t, this.currentSourceId)
    if (!shape) return
    timeline.addKeyframe(t, [{ sourceId: this.currentSourceId, shape: { ...shape, title: this.stringOrUndefined(this.shapeTitleInput.value) } }])
    this.ufoElement.refresh()
    this.refreshSourceList() // keeps the dropdown's own label live as the user types
    this.updateShapeTitleValidity()
  }

  /**
   * Resizes the selected shape to the size a real object of that width, at that distance, ACTUALLY
   * looks — an authoring aid, and nothing more.
   *
   * Drawing an apparent size by eye gets it wrong by a factor of five to ten, and a witness who
   * says "it was about the size of a car, maybe ninety meters off" has given something far more
   * usable than a freehand drag. So the pair is a way to GET to the right angle on the canvas.
   *
   * What it is not, any more, is something the recording keeps. The shape ends up with the angular
   * extent this implies (see BaseShape.angular) and the meters are forgotten the moment they have
   * been applied — because they were never an observation: the witness inferred the distance, then
   * inferred the size from it, and a file that stored the pair would be recording that arithmetic
   * as if it were the sighting. Real meters come back only where the scene can establish them (see
   * SizeEstimate), which is what the readout underneath these fields shows.
   *
   * Resizes about the shape's own center (its position is where the witness saw it, and has
   * nothing to do with how big it was) and keeps its aspect ratio (the width is one measurement;
   * the outline's proportions are a separate observation this must not overwrite). A half-filled
   * pair is simply not enough to compute anything and leaves the shape alone.
   */
  private applySizeHypothesis(): void {
    const timeline = this.ufoElement.sighting.timeline
    const t = this.ufoElement.currentTime
    const shape = timeline.getInterpolatedShapeAt(t, this.currentSourceId)
    if (!shape) return
    const sizeM = this.numberOrUndefined(this.objectSizeInput.value)
    const distanceM = this.numberOrUndefined(this.objectDistanceInput.value)
    if (sizeM === undefined || distanceM === undefined || sizeM <= 0 || distanceM <= 0) {
      this.refreshApparentSize()
      return
    }
    const projection = this.currentProjection()
    const width = projection.widthPx({ sizeM, distanceM })
    const height = shape.bounds.height * (shape.bounds.width === 0 ? 1 : width / shape.bounds.width)
    const bounds = {
      x: shape.bounds.x + (shape.bounds.width - width) / 2,
      y: shape.bounds.y + (shape.bounds.height - height) / 2,
      width,
      height
    }
    const angular = projection.ofBounds(bounds)
    const resized =
      shape.kind === "oval"
        ? { ...shape, bounds, angular }
        : { ...shape, bounds, angular, points: this.scalePoints(shape, bounds) }
    timeline.addKeyframe(t, [{ sourceId: this.currentSourceId, shape: resized }])
    this.ufoElement.refresh()
    this.refreshApparentSize()
  }

  /** Rescales a polygon's own points to a new bounds, exactly as ShapeHandles.resizeShape does
   * for a handle drag — a physically-computed resize must reshape the outline the same way a
   * manual one does, or the points would keep the old bounds' scale and drift off the shape. */
  private scalePoints(shape: PolygonShape, bounds: ShapeBounds): ReadonlyArray<{ x: number; y: number }> {
    const scaleX = shape.bounds.width === 0 ? 1 : bounds.width / shape.bounds.width
    const scaleY = shape.bounds.height === 0 ? 1 : bounds.height / shape.bounds.height
    return shape.points.map(point => ({ x: point.x * scaleX, y: point.y * scaleY }))
  }

  /**
   * Offers the devices that existed when the sighting happened, and nothing else.
   *
   * Options ARE the registry, exactly as the source pickers are (see sourcePicker): adding a real
   * dated camera must never also mean adding markup and an element id for it. What the date adds is
   * a refusal — nobody photographed anything with a telephone in 1964 — which is the same kind of
   * negative statement the satellite line makes, and as useful.
   *
   * A device the recording ALREADY names is always offered even when its own dates exclude it, and
   * said to be out of its period rather than dropped. Dropping it would silently re-instrument a
   * testimony; saying so leaves the reader to judge, which is this project's whole posture.
   */
  private refreshInstrumentOptions(): void {
    const sighting = this.ufoElement.sighting
    const year = sighting.event.time?.year
    const available = Instruments.availableAt(year)
    const current = sighting.instrument
    const offered = available.includes(current) ? available : [...available, current]
    const selected = this.instrumentSelect.value || current.id
    this.instrumentSelect.replaceChildren()
    for (const instrument of offered) {
      const option = document.createElement("option")
      option.value = instrument.id
      const name = instrument.name[this.showerLanguage()]
      option.textContent = available.includes(instrument)
        ? name
        : this.messages.instrumentOutOfPeriod.replace("{name}", name)
      this.instrumentSelect.appendChild(option)
    }
    this.instrumentSelect.value = offered.some(instrument => instrument.id === selected) ? selected : current.id
  }

  /**
   * A shutter speed as photography writes it — "1/250" rather than "0.004".
   *
   * Not decoration: a witness's own account of a photograph says "a five-second exposure" or "a
   * five-hundredth", and a field that answers in thousandths of a second is a field nobody can
   * check against what they were told. Long poses stay decimal, because that is how those are said
   * too.
   */
  private static exposureText(seconds: number): string {
    if (seconds >= 1) return String(Math.round(seconds * 100) / 100)
    return `1/${Math.round(1 / seconds)}`
  }

  /** The inverse, accepting either way of writing it. */
  private static exposureSeconds(text: string): number | undefined {
    const trimmed = text.trim()
    if (!trimmed) return undefined
    const fraction = /^(\d*\.?\d+)\s*\/\s*(\d*\.?\d+)$/.exec(trimmed)
    if (fraction) {
      const over = Number(fraction[1])
      const under = Number(fraction[2])
      return under > 0 ? over / under : undefined
    }
    const value = Number(trimmed)
    return Number.isFinite(value) && value > 0 ? value : undefined
  }

  /**
   * Shows what the device is set to, and lets a reader set only what the device could set.
   *
   * READ-ONLY IS THE COMMON CASE, and saying so is the point: an Instamatic's owner had one
   * aperture, one shutter speed and one focal length, so the three fields show 43 mm, f/11 and a
   * ninetieth of a second and refuse to be touched. A witness's testimony is not improved by
   * offering them settings their camera never had.
   *
   * The focal length is shown in millimetres for anything with a frame and in DEGREES for an eye,
   * which has no focal length — one value underneath (ObserverPose.fovDeg), two ways of writing it.
   */
  private syncOpticsFromInstrument(): void {
    const sighting = this.ufoElement.sighting
    const instrument = sighting.instrument
    const pose = resolveObserverPoseAt(sighting, this.ufoElement.currentTime)
    const frame = instrument.frame
    const fovDeg = pose?.fovDeg ?? Instruments.fieldOfViewDeg(instrument)

    const focal = frame ? Instruments.focalLengthMmFor(instrument, fovDeg) : fovDeg
    if (this.focalLengthInput !== this.shadow.activeElement) {
      this.focalLengthInput.value = focal === undefined ? "" : String(Math.round(focal * 10) / 10)
    }
    this.unitFocalLength.textContent = frame ? this.messages.unitMillimetres : this.messages.unitDegrees
    this.labelFocalLength.textContent = frame ? this.messages.focalLength : this.messages.fieldOfView
    // A fixed lens may be read but not set. An eye's field is always the reader's to state: it is
    // not a device setting at all, it is how much of their surroundings the witness took in.
    this.focalLengthInput.disabled = frame !== undefined && frame.focalRangeMm === undefined
    this.focalLengthInput.min = String(frame?.focalRangeMm?.minMm ?? 1)
    this.focalLengthInput.max = String(frame?.focalRangeMm?.maxMm ?? 2000)

    const fNumber = pose?.fNumber ?? instrument.fNumber
    if (this.fNumberInput !== this.shadow.activeElement) {
      this.fNumberInput.value = fNumber === undefined ? "" : String(fNumber)
    }
    // Nothing to show at all for a device with no diaphragm: an eye, and a phone whose one opening
    // is round and fixed.
    this.setRowVisible(this.fNumberInput, instrument.fNumber !== undefined)
    this.fNumberInput.disabled = instrument.fNumberRange === undefined
    this.fNumberInput.min = String(instrument.fNumberRange?.min ?? 0.7)
    this.fNumberInput.max = String(instrument.fNumberRange?.max ?? 64)

    const exposure = pose?.exposureSeconds ?? instrument.exposureSeconds
    if (this.exposureInput !== this.shadow.activeElement) {
      this.exposureInput.value = exposure === undefined ? "" : UfoRecorderElement.exposureText(exposure)
    }
    this.setRowVisible(this.exposureInput, instrument.exposureSeconds !== undefined)
    this.exposureInput.disabled = instrument.exposureRangeSeconds === undefined

    // Only ever askable of something that can be focused at all, which is to say something with a
    // lens and a diaphragm: an eye is not focused BY the witness, and its depth of field is not
    // what a reconstruction turns on.
    if (this.focusDistanceInput !== this.shadow.activeElement) {
      this.focusDistanceInput.value = pose?.focusDistanceM === undefined ? "" : String(pose.focusDistanceM)
    }
    this.setRowVisible(this.focusDistanceInput, frame !== undefined && instrument.fNumber !== undefined)
  }

  /**
   * Moves every pose whose field was never really stated onto the new instrument's own field.
   *
   * The rule, and it is the whole reason this is not a blanket overwrite: a field that still reads
   * as the OLD instrument's is one nobody chose — this recorder wrote it from that instrument's
   * optics — so it follows the change. Any other value was meant by somebody (a zoom, binoculars,
   * a hand-authored file), and a picker must not quietly edit a testimony. Same distinction the
   * weather fields draw between a looked-up reading and a witness's own declaration.
   */
  private retuneFieldOfView(previous: Instrument): void {
    const sighting = this.ufoElement.sighting
    const was = Instruments.fieldOfViewDeg(previous)
    const now = Instruments.fieldOfViewDeg(sighting.instrument)
    for (const keyframe of [...sighting.witnessTrack.allKeyframes]) {
      if (Math.abs(keyframe.pose.fovDeg - was) > SAME_FIELD_EPSILON_DEG) continue
      sighting.witnessTrack.addKeyframe(keyframe.t, { ...keyframe.pose, fovDeg: now })
    }
  }

  /** The field of view the witness's own pose declares at the current playhead, falling back to
   * whatever the INSTRUMENT takes in — what the apparent-size math must project through, rather
   * than a fixed sixty degrees, so a recording that states a different field (a zoom, a pair of
   * binoculars) stays self-consistent. */
  private currentFovDeg(): number {
    const sighting = this.ufoElement.sighting
    return (
      resolveObserverPoseAt(sighting, this.ufoElement.currentTime)?.fovDeg ??
      Instruments.fieldOfViewDeg(sighting.instrument)
    )
  }

  /** How this recording's own instrument turns an angle into a pixel at the playhead — an eye and a
   * camera lens do not agree, and every size the toolbar shows or applies has to go through the one
   * the file declares (see Instrument.ts). */
  private currentProjection(): ImageProjection {
    return ImageProjection.of(this.ufoElement.sighting.instrument, this.ufoElement.canvasElement.height, this.currentFovDeg())
  }

  /** Reads back what the selected shape actually subtends on screen — always from its real
   * `bounds`, never from the size/distance fields, so it stays honest for a shape drawn purely by
   * eye (the common case, and the one that most needs telling that it spans 19 degrees, i.e. 37
   * full Moons). Blank when there's no single shape to describe. */
  private refreshApparentSize(): void {
    const shape =
      this.selectedSourceIds.size === 1
        ? this.ufoElement.sighting.timeline.getInterpolatedShapeAt(this.ufoElement.currentTime, this.currentSourceId)
        : undefined
    if (!shape) {
      this.apparentSizeOutput.textContent = ""
      return
    }
    const degrees = this.currentProjection().pxToDeg(shape.bounds.width)
    const moons = ApparentSize.inMoons(degrees)
    // Decimal separator follows the reader's own locale (a comma in French), like every other
    // number a browser formats — the surrounding wording comes from this.messages, but a number
    // isn't something to translate by hand.
    this.apparentSizeOutput.textContent = this.messages.apparentSize
      .replace("{deg}", degrees.toLocaleString(undefined, { maximumFractionDigits: degrees < 1 ? 2 : 1 }))
      .replace("{moons}", moons.toLocaleString(undefined, { maximumFractionDigits: moons < 10 ? 1 : 0 }))
    this.refreshRealSize()
  }

  /**
   * Says what the recording can actually establish about the object's real width — and, far more
   * often, that it cannot establish anything.
   *
   * This is the other half of dropping stored sizes (see BaseShape.angular). A testimony states an
   * angle; meters only ever follow from the object being seen to cross something whose distance is
   * known, which is an inequality, not a measurement — so what shows here is a range, a one-sided
   * bound, or an honest "unknown". A witness alone under an empty night sky has crossed nothing,
   * and no amount of confidence in their "about a hundred feet" changes that.
   *
   * Blank for a multiple selection, like the apparent size above it: a range belongs to one object.
   */
  private refreshRealSize(): void {
    if (this.selectedSourceIds.size !== 1) {
      this.realSizeOutput.textContent = ""
      return
    }
    const sourceId = this.currentSourceId
    if (this.sceneElement.sizeContradictory(sourceId)) {
      this.realSizeOutput.textContent = this.messages.realSizeContradiction
      return
    }
    const { minM, maxM } = this.sceneElement.sizeRangeOf(sourceId)
    if (minM === undefined && maxM === undefined) {
      this.realSizeOutput.textContent = this.messages.realSizeUnknown
      return
    }
    if (minM !== undefined && maxM !== undefined) {
      const here = this.sceneElement.distanceRangeAt(sourceId, this.ufoElement.currentTime)
      const distance =
        here.minM === undefined || here.maxM === undefined
          ? ""
          : this.messages.realDistanceHere.replace("{min}", this.meters(here.minM)).replace("{max}", this.meters(here.maxM))
      this.realSizeOutput.textContent =
        this.messages.realSizeBetween.replace("{min}", this.meters(minM)).replace("{max}", this.meters(maxM)) + distance
      return
    }
    this.realSizeOutput.textContent =
      minM !== undefined
        ? this.messages.realSizeAtLeast.replace("{min}", this.meters(minM))
        : this.messages.realSizeAtMost.replace("{max}", this.meters(maxM!))
  }

  /** A length in meters at the precision it is actually known to — two decimals under a meter, one
   * up to ten, none beyond. A bound derived from a raycast against a hangar is not a millimeter
   * measurement, and printing it as one would claim a precision the inequality never had. Decimal
   * separator follows the reader's own locale, like every other number a browser formats. */
  private meters(value: number): string {
    const digits = value < 1 ? 2 : value < 10 ? 1 : 0
    return value.toLocaleString(undefined, { maximumFractionDigits: digits })
  }

  /** Name is mandatory for a shape too, same reasoning and same "flagged, not blocked"
   * convention as DecorObject's own updateDecorTitleValidity — addShape() always fills it with a
   * real generated label from the start (see shapeLabel), so an empty field here only ever means
   * it was cleared afterward. shapeLabel()'s own fallback then derives a display label back from
   * the sourceId for the dropdown/delete-confirmation, but UfoElement's own on-canvas tooltip
   * shows nothing at all for an untitled shape (deliberately — see its own doc comment on why no
   * generated label is surfaced there), which is exactly the silently-degraded state this flag
   * steers away from. Not raised at all while multiple shapes are selected — the field is already
   * disabled then (see updateAppearanceFieldsDisabledState), showing blank because
   * there's no single value to display, not because anything's actually missing. */
  private updateShapeTitleValidity(): void {
    const missing = this.selectedSourceIds.size === 1 && this.shapeTitleInput.value === ""
    this.shapeTitleInput.classList.toggle("invalid", missing)
    this.shapeTitleInput.setAttribute("aria-invalid", String(missing))
  }

  /** A shape/source's display label — its title if one's been given (at the current playhead),
   * else derived straight from its own sourceId ("ufo-3" -> "Shape 3") rather than showing that
   * raw id. This is the exact same label addShape() auto-fills a fresh shape's title with (see
   * its own doc comment) — one formula, not two independently-tracked numbering schemes, so a
   * cleared title falls back to reading the identical text it started with instead of visibly
   * jumping to a different-looking generated name. Using the sourceId's own number (not a
   * recount of how many shapes currently exist) also means deleting an earlier shape can never
   * shift a later, unrelated one's label — a plain count would drift the moment sourceIds and
   * display numbers disagree after any deletion. Only a sourceId that doesn't follow this
   * project's own "ufo-N" convention (hand-written data, an older import predating it) falls back
   * to the raw sourceId itself, same as before. Used for the source dropdown and the
   * delete-confirmation prompt; NOT used for the on-canvas hover tooltip (UfoElement.ts), which
   * deliberately shows nothing rather than any generated label for a genuinely title-less shape —
   * that surface is end-user-facing (a real rr0.org sighting page), where a witness who never
   * named a shape shouldn't have one invented for them; this method's own generated fallback is
   * only ever shown inside this recorder's own authoring UI. */
  private shapeLabel(sourceId: string): string {
    const shape = this.ufoElement.sighting.timeline.getInterpolatedShapeAt(this.ufoElement.currentTime, sourceId)
    if (shape?.title) return shape.title
    const match = /^ufo-(\d+)$/.exec(sourceId)
    return match ? `${this.messages.shape} ${match[1]}` : sourceId
  }

  /** Creates a genuinely new, independent shape/source, staggered diagonally away from
   * existing ones so it's immediately visible/distinguishable rather than stacked exactly on
   * top of an existing shape. */
  private addShape(): void {
    if (this.isRecording) return
    const timeline = this.ufoElement.sighting.timeline
    const taken = new Set([...timeline.sourceIds, this.currentSourceId])
    let n = taken.size + 1
    while (taken.has(`ufo-${n}`)) n++
    this.currentSourceId = `ufo-${n}`
    this.selectedSourceIds = new Set([this.currentSourceId])
    this.applyAppearanceAtPlayhead(this.offsetDefaultBounds(timeline.sourceIds.length))
    // Filled with a real generated name from the start — same "never leave Name empty by
    // default" fix as DecorObject's addDecor(), and for the same reason: an untitled shape left
    // UfoElement's own on-canvas hover tooltip showing nothing at all, and the dropdown/delete-
    // confirmation prompt falling back to an internal-looking sourceId ("ufo-2") instead of a
    // real name. shapeLabel() itself derives this from currentSourceId (title is still unset at
    // this point, so it falls straight through to the "ufo-N" -> "Shape N" branch) — the same
    // formula shapeLabel() falls back to later if the title is ever cleared again, see its own
    // doc comment on why that matters. updateShapeTitle() both writes it and refreshes the
    // dropdown, so no separate refreshSourceList() call is needed here.
    this.shapeTitleInput.value = this.shapeLabel(this.currentSourceId)
    this.updateShapeTitle()
  }

  /** Removes the selected shape/source entirely — every keyframe it appears in across the
   * whole recording, not just at the playhead — then falls back to the next remaining source
   * (mirrors addShape()'s own "pick the next one" logic). Refuses to remove the last shape: a
   * recording always needs at least one, and emptying it out would fall back to the same
   * not-yet-drawn placeholder state as a brand-new recording, which nothing else in this element
   * is built to re-enter once construction's own initial keyframe (see the constructor) has
   * already been written. Disabled while recording (deleteShapeButton.disabled, set in
   * toggleRecording()) for the same reason addShapeButton is: deleting the very source the
   * recorder is actively writing keyframes into would be pulling the rug out from under it.
   *
   * The single entry point for every way to delete a shape — the toolbar button, the context
   * menu's own Delete item, and the Delete/Backspace key — precisely so the confirmation below
   * can't drift into being asked for some paths and not others. */
  private deleteShape(): void {
    if (this.isRecording || this.ufoElement.playbackState === "playing") return
    const timeline = this.ufoElement.sighting.timeline
    const toDelete = timeline.sourceIds.filter(id => this.selectedSourceIds.has(id))
    if (toDelete.length === 0) return // nothing real to delete
    if (timeline.sourceIds.length - toDelete.length < 1) return // always keep at least one shape
    const confirmed =
      toDelete.length === 1
        ? window.confirm(this.messages.confirmDeleteShape.replace("{name}", this.shapeLabel(toDelete[0])))
        : window.confirm(this.messages.confirmDeleteShapes.replace("{count}", String(toDelete.length)))
    if (!confirmed) return
    for (const sourceId of toDelete) timeline.removeSource(sourceId)
    this.currentSourceId = timeline.sourceIds[0]
    this.selectedSourceIds = new Set([this.currentSourceId])
    this.refreshSourceList()
    // Triggers a timeupdate on the nested ufo, which onSelectionOrTimeChanged() (its listener,
    // wired in the constructor) uses to resync the appearance toolbar/canvas selection/delete
    // button state to the new currentSourceId — same idiom addShape() and every drag path use,
    // rather than duplicating that resync here.
    this.ufoElement.refresh()
  }

  /** Staggers each successive new shape diagonally by `index` (the count of shapes that
   * already exist) so it doesn't start stacked exactly on an existing one. */
  private offsetDefaultBounds(index: number): ShapeBounds {
    const bounds = this.defaultBounds()
    const step = 24
    return { ...bounds, x: bounds.x + index * step, y: bounds.y + index * step }
  }

  private refreshSourceList(): void {
    const timeline = this.ufoElement.sighting.timeline
    const ids = [...new Set([...timeline.sourceIds, this.currentSourceId])]
    this.sourceSelect.innerHTML = ""
    for (const id of ids) {
      const option = document.createElement("option")
      option.value = id
      option.textContent = this.shapeLabel(id)
      this.sourceSelect.appendChild(option)
    }
    this.sourceSelect.value = this.currentSourceId
  }

  /** Human-readable label for the decor dropdown — a capitalized kind plus its 1-based position
   * among decor of the same kind (e.g. "Building 1", "Tree 2"), since decor objects have no
   * name/title field of their own (unlike shapeLabel's shape.title, decor is scenery, not
   * individually identified). */
  /** decor.title wins when given (same "shape?.title || sourceId" precedence as shapeLabel) —
   * falls back to a generic "{kind} {n}" label, since decor has no name of its own until the
   * witness types one into the Name field. */
  private decorLabel(decor: DecorObject): string {
    if (decor.title) return decor.title
    const sameKind = this.ufoElement.sighting.decor.filter(d => d.kind === decor.kind)
    const index = sameKind.indexOf(decor) + 1
    const kindLabel = this.decorKindSelect.querySelector<HTMLOptionElement>(`option[value="${decor.kind}"]`)?.textContent ?? decor.kind
    return `${kindLabel} ${index}`
  }

  /** Creates a new decor object, staggered along the east axis by how many decor objects already
   * exist so a run of "Add" clicks doesn't stack everything at the same spot — same "immediately
   * visible/distinguishable" reasoning as addShape's own diagonal offset. `kind` defaults to
   * whatever's picked in decorKindSelect (addDecorBuildingButton, the Location group's "Add
   * decor" button — every kind but "other witness" is added this way now that building is no
   * longer hidden from that dropdown); addDecorWitnessButton (in the Witness group) instead calls
   * this with an explicit "witness" kind, skipping the dropdown entirely since a witness has
   * nothing else to pick beforehand. northM is positive (north, +15) rather than negative:
   * a fresh recording's camera starts at rotation.y=0, looking toward -Z — the same direction
   * heading 0 ("facing north") points, per this project's own azimuth convention (see
   * GeoProjection.ts) — so a newly added decor object should land in front of that default view,
   * not behind it where the witness would have to turn around just to see what they just added.
   * Always reassigns sighting.decor to a new array (never mutates the existing one in place) —
   * see SceneRenderer.setDecor's own doc comment on why that reference-equality check depends on
   * it. */
  private addDecor(kind: DecorObject["kind"] = this.decorKindSelect.value as DecorObject["kind"]): void {
    const sighting = this.ufoElement.sighting
    const n = sighting.decor.length + 1
    const decor: DecorObject = {
      id: `decor-${n}`,
      kind,
      // Filled with the same "{kind} {n}" label decorLabel() would otherwise only ever compute
      // on demand for display — see this field's own doc comment on why an empty title is no
      // longer treated as a normal, silently-defaulted state (Name is mandatory now, flagged
      // invalid if cleared — see updateDecorTitleValidity). Writing a real value here means the
      // recorder dropdown, the decor context menu's "Masks" flyout, and SceneElement's own hover
      // tooltip all read the exact same persisted name from day one, instead of three separate
      // fallback computations that could drift (the tooltip's own fallback never included the
      // number, which is what prompted this).
      title: this.nextDecorLabel(kind),
      eastM: 8 * sighting.decor.length,
      northM: 15,
      headingDeg: 0,
      lit: false,
      // An aircraft placed 15 m away on the ground would just look broken. It starts as what it
      // actually is: a crossing, at a cruising altitude, with the lights an airliner is required
      // to carry — which is the whole reason to have one in a scene. Every number of it is then
      // editable, and none of it is testimony (see the Decor group's own doc): this is a
      // hypothesis about what the witness might have been looking at.
      ...(kind === "aircraft" ? this.defaultAircraft() : {}),
      // Only a building has floors at all — see DecorObject.floors's own doc comment.
      ...(kind === "building" ? { floors: DEFAULT_BUILDING_FLOORS } : {}),
      // undefined (spread as a no-op) for a kind with no windows at all — see defaultWindows.
      windows: defaultWindows(kind)
    }
    sighting.decor = [...sighting.decor, decor]
    this.currentDecorId = decor.id
    this.refreshDecorList()
    this.ufoElement.refresh()
  }

  /**
   * A straight, level pass in front of the witness — an airliner at 1500 m, a kilometre out,
   * crossing four kilometres of sky over the recording's own length.
   *
   * Lower and nearer than a first attempt at cruising altitude and four kilometres out, which was
   * just as real and completely unusable: 35 m of aeroplane at 5.8 km is four pixels, so it read as
   * a speck nobody could tell from a stuck pixel. This is an aircraft on approach, which is both
   * honest and the case a witness is actually near enough to describe. Every number of it is
   * editable, at any instant of the pass.
   *
   * What matters most is that it MOVES: a flash rate with no motion draws all its dots in one spot.
   */
  private defaultAircraft(): Partial<DecorObject> {
    // Timed from how fast an aeroplane actually flies, NOT from the recording's own length. Tying
    // it to the recording meant an empty one — no stated duration, no keyframes — fell back to a
    // second, and the aircraft crossed four kilometres of sky in that second: fourteen thousand
    // km/h, out of frame before anyone saw it. A pass has its own real duration, and a recording
    // shorter than it simply shows part of it.
    const crossingM = 2 * AIRCRAFT_PASS_HALF_LENGTH_M
    const durationMs = Math.round((crossingM / AIRCRAFT_CRUISE_M_PER_S) * 1000)
    return {
      lights: LightRigs.byId("airliner")?.create(),
      track: [
        { t: 0, eastM: -AIRCRAFT_PASS_HALF_LENGTH_M, northM: 1000, altitudeM: 1500, headingDeg: 90 },
        { t: durationMs, eastM: AIRCRAFT_PASS_HALF_LENGTH_M, northM: 1000, altitudeM: 1500, headingDeg: 90 }
      ]
    }
  }

  /** The "{kind} {n}" label a freshly added decor object of this kind starts with — same
   * numbering decorLabel() computes for display (n = how many same-kind objects already exist,
   * +1), just computed BEFORE insertion here since decorLabel() itself locates the object by
   * indexOf within the already-updated array. Shares decorKindSelect's own translated option text
   * with decorLabel so the two can never disagree. */
  private nextDecorLabel(kind: DecorObject["kind"]): string {
    const sameKindCount = this.ufoElement.sighting.decor.filter(d => d.kind === kind).length
    const kindLabel = this.decorKindSelect.querySelector<HTMLOptionElement>(`option[value="${kind}"]`)?.textContent ?? kind
    return `${kindLabel} ${sameKindCount + 1}`
  }

  /** Removes the currently selected decor object, then falls back to whichever one is now first
   * (or none at all — unlike deleteShape, a sighting with zero decor is the normal, common case,
   * not a state nothing else is built to handle). */
  private deleteDecor(): void {
    if (this.currentDecorId === undefined) return
    const sighting = this.ufoElement.sighting
    sighting.decor = sighting.decor.filter(d => d.id !== this.currentDecorId)
    this.currentDecorId = sighting.decor[0]?.id
    this.refreshDecorList()
    this.ufoElement.refresh()
  }

  /** Also syncs decorSelect's own displayed value — a no-op when called from that same select's
   * "change" listener (its value is already `id` by then), but load-bearing for any other caller
   * (e.g. onPointerDown's own decor-click selection) that changes currentDecorId without the
   * dropdown itself having been touched. */
  private selectDecor(id: string): void {
    this.currentDecorId = id
    this.decorSelect.value = id
    this.syncDecorFields()
  }

  /** Writes the East/North/Heading/Name/URL/Floors/Occupied-floor/Witness-location fields back
   * onto the currently selected decor object — "spread and overwrite one field" style, same as
   * onDragPointerMove's shape-bounds edits (see that method's own doc comment) — replacing the
   * whole decor array with a new one (not mutating the existing entry in place) for the same
   * setDecor reference-equality reason as addDecor. `lit` is deliberately NOT touched here — see
   * updateDecorLit, its own dedicated write path now that it's keyframed over time rather than a
   * plain static field; `windowsOpen` isn't touched here either — see updateDecorWindows, its own
   * dedicated write path for that nested record. Resyncs visibility (not values — see
   * syncDecorVisibility's own doc comment on why not the fuller syncDecorFields) since a
   * floors/witness-location edit can change which rows apply.
   *
   * witnessSide/floors/occupiedFloor are only ever WRITTEN when the current object's own kind
   * actually supports them (canHoldWitness/kind==="building") — never just whatever the shared
   * input elements happen to currently display. Those inputs are reused across every decor object
   * (there's one <select>/<input> in the toolbar, not one per object), and syncDecorFields fills
   * them with a fallback value (e.g. floors defaults to DEFAULT_BUILDING_FLOORS) purely for
   * DISPLAY even when the selected object has no such field at all — a real bug this comment
   * replaced: editing e.g. a vehicle's heading right after a building was selected silently wrote
   * that building's leftover `floors` value onto the vehicle too, since the input's .value hadn't
   * changed even though it no longer applied. */
  private updateDecor(): void {
    if (this.currentDecorId === undefined) return
    const sighting = this.ufoElement.sighting
    const headingDeg = this.wrapDegrees(Number(this.decorHeadingInput.value), this.decorHeadingInput) ?? 0
    const witnessSideValue = this.decorWitnessSideSelect.value
    sighting.decor = sighting.decor.map(d => {
      if (d.id !== this.currentDecorId) return d
      const witnessSide = canHoldWitness(d.kind) && witnessSideValue !== "" ? (witnessSideValue as DecorSide) : undefined
      const eastM = Number(this.decorEastInput.value)
      const northM = Number(this.decorNorthInput.value)
      const altitudeM = Number(this.decorAltitudeInput.value)
      // An object that moves is edited AT THE PLAYHEAD, like everything else keyframed here: the
      // fields showed its placement at this instant (see syncDecorFields), so writing them back
      // has to land at this instant too. Giving a still object an altitude starts a trajectory of
      // a single keyframe — which is exactly what "it sits up there" means, and saves inventing a
      // second way to say the same thing.
      const track = d.track ?? (altitudeM !== 0 ? [] : undefined)
      if (track) {
        const t = this.ufoElement.currentTime
        const keyframe = { t, eastM, northM, altitudeM, headingDeg }
        const kept = track.filter(existing => existing.t !== t)
        return { ...d, title: this.stringOrUndefined(this.decorTitleInput.value), track: [...kept, keyframe].sort((a, b) => a.t - b.t), sightingUrl: this.stringOrUndefined(this.decorSightingUrlInput.value), witnessSide, floors: d.kind === "building" ? Number(this.decorFloorsInput.value) : undefined, occupiedFloor: d.kind === "building" ? Number(this.decorOccupiedFloorInput.value) : undefined }
      }
      return {
        ...d,
        title: this.stringOrUndefined(this.decorTitleInput.value),
        eastM,
        northM,
        headingDeg,
        sightingUrl: this.stringOrUndefined(this.decorSightingUrlInput.value),
        witnessSide,
        floors: d.kind === "building" ? Number(this.decorFloorsInput.value) : undefined,
        // Written whenever it's a building, not gated on witnessSide too (unlike witnessSide
        // itself) — see syncDecorVisibility's own doc comment on why the field is shown that
        // early: picking a floor is part of configuring the building, before or after a location
        // is chosen, not locked behind having picked one first.
        occupiedFloor: d.kind === "building" ? Number(this.decorOccupiedFloorInput.value) : undefined
      }
    })
    this.decorSelect.options[this.decorSelect.selectedIndex]!.textContent = this.decorLabel(sighting.decor.find(d => d.id === this.currentDecorId)!)
    this.syncDecorVisibility()
    this.updateDecorTitleValidity()
    this.ufoElement.refresh()
  }

  /** Name is mandatory once a decor object exists — addDecor() always fills it with a real
   * generated label from the start (see its own doc comment), so an empty field here only ever
   * means the witness/recorder cleared it afterward, which decorLabel()'s own fallback then
   * papers back over with a plain, unnumbered kind name wherever it's displayed (the dropdown,
   * the "Masks" flyout, SceneElement's own hover tooltip) — exactly the ambiguous "Lampadaire"
   * vs. "Lampadaire 1" mismatch this flag exists to steer away from. Same "flagged, not blocked"
   * convention as Duration (see updateDurationValidity) — nothing here prevents saving/exporting
   * with a blank title, it's just made visibly wrong so it doesn't happen by accident. */
  private updateDecorTitleValidity(): void {
    const missing = this.currentDecorId !== undefined && this.decorTitleInput.value === ""
    this.decorTitleInput.classList.toggle("invalid", missing)
    this.decorTitleInput.setAttribute("aria-invalid", String(missing))
  }

  /** Writes the 4 per-side opacity inputs back onto the currently selected decor object's windows
   * record — its own write path (not folded into updateDecor) for the same reason lit has its own
   * updateDecorLit: a nested record, not a set of flat fields, and each side maps 1:1 to a
   * DecorSide key rather than a named property. Not keyframed (unlike lit) — see
   * DecorObject.windows's own doc comment on why. An empty input means no window at all on that
   * side (omitted from the record — JSON.stringify already drops an explicit `undefined` value,
   * so no extra filtering is needed here). A non-openable side's value is clamped up to
   * FIXED_WINDOW_MIN_OPACITY_PERCENT regardless of what's typed — the input's own `min` attribute
   * (set in syncDecorVisibility) already steers native spinner/slider interaction there, this is
   * the belt-and-suspenders guarantee for direct typing/paste. */
  private updateDecorWindows(): void {
    if (this.currentDecorId === undefined) return
    const sighting = this.ufoElement.sighting
    sighting.decor = sighting.decor.map(d => {
      if (d.id !== this.currentDecorId) return d
      const windows: Partial<Record<DecorSide, number>> = {}
      for (const side of DECOR_SIDES) {
        const input = this.decorWindowInputs[side]
        if (input.value === "") continue
        const min = isWindowOpenable(d.kind, side) ? 0 : FIXED_WINDOW_MIN_OPACITY_PERCENT
        const clamped = Math.max(min, Math.min(100, Number(input.value)))
        windows[side] = clamped
        // Reflects the clamp back into the field itself — leaving it showing whatever was typed
        // (e.g. "50" on a fixed vehicle windshield) while the actual stored value silently became
        // 90 read as a real bug during testing: the spinner's own up/down arrows then jumped
        // around a value the field wasn't even displaying.
        if (String(clamped) !== input.value) input.value = String(clamped)
      }
      return { ...d, windows }
    })
    this.ufoElement.refresh()
  }

  /** Records the Lit checkbox at the current playhead as a litKeyframes entry — same "at the
   * current instant" idiom as applyWeatherAtPlayhead/updateObserver, and the same playing-state
   * bailout (merely scrubbing/playing must never itself write a keyframe). Replaces any existing
   * keyframe at exactly this instant rather than accumulating duplicates (same "re-recording the
   * same instant overwrites, doesn't pile up" behavior ObserverTrack.addKeyframe gives for free —
   * this is the plain-array equivalent, since a single boolean doesn't warrant a full Track
   * class, see litKeyframes' own doc comment). */
  private updateDecorLit(): void {
    if (this.currentDecorId === undefined) return
    if (this.ufoElement.playbackState === "playing") return
    const sighting = this.ufoElement.sighting
    const t = this.ufoElement.currentTime
    const lit = this.decorLitInput.checked
    sighting.decor = sighting.decor.map(d => {
      if (d.id !== this.currentDecorId) return d
      const litKeyframes = [...(d.litKeyframes ?? []).filter(k => k.t !== t), { t, lit }].sort((a, b) => a.t - b.t)
      return { ...d, litKeyframes }
    })
    this.ufoElement.refresh()
  }

  /** Rebuilds the decor dropdown's own option list and resyncs the East/North/Heading/Lit fields
   * from whichever decor object is now selected — called after add/delete/load, mirroring
   * refreshSourceList()'s role for shapes. Disables the field row entirely (rather than leaving
   * stale values editable) whenever there's no decor to edit at all. */
  private refreshDecorList(): void {
    const decor = this.ufoElement.sighting.decor
    this.decorSelect.innerHTML = ""
    for (const object of decor) {
      const option = document.createElement("option")
      option.value = object.id
      option.textContent = this.decorLabel(object)
      this.decorSelect.appendChild(option)
    }
    if (this.currentDecorId !== undefined) this.decorSelect.value = this.currentDecorId
    this.syncDecorFields()
  }

  private syncDecorFields(): void {
    const decor = this.ufoElement.sighting.decor.find(d => d.id === this.currentDecorId)
    const hasSelection = decor !== undefined
    this.deleteDecorButton.disabled = !hasSelection
    for (const input of [
      this.decorSelect,
      this.decorTitleInput,
      this.decorEastInput,
      this.decorNorthInput,
      this.decorHeadingInput,
      this.decorLitInput,
      this.decorSightingUrlInput,
      this.decorFloorsInput,
      this.decorOccupiedFloorInput,
      this.decorWitnessSideSelect,
      this.decorLightRigSelect,
      this.decorAltitudeInput,
      this.lookAtDecorButton
    ]) {
      input.disabled = !hasSelection
    }
    this.decorTitleInput.value = decor?.title ?? ""
    // Where the object actually IS at the playhead, not the static fields it may never use. An
    // object with a trajectory (an aircraft, a passing car) is somewhere quite else than the
    // eastM/northM it was created with, and a form showing those reads as a plain lie: "15 m north"
    // beside an aeroplane three kilometres up. Same principle as every other keyframed field in
    // this toolbar — the weather, the lit state, the witness's own pose all show the instant.
    this.showDecorPlacement(decor)
    this.decorLitInput.checked = decor ? resolveDecorLitAt(decor, this.ufoElement.currentTime) : false
    this.refreshDecorLightRigOptions(decor)
    this.decorSightingUrlInput.value = decor?.sightingUrl ?? ""
    this.decorFloorsInput.value = String(decor?.floors ?? DEFAULT_BUILDING_FLOORS)
    this.decorOccupiedFloorInput.value = String(decor?.occupiedFloor ?? 0)
    this.decorWitnessSideSelect.value = decor?.witnessSide ?? ""
    for (const side of DECOR_SIDES) {
      const opacity = decor?.windows?.[side]
      this.decorWindowInputs[side].value = opacity === undefined ? "" : String(opacity)
    }
    this.syncDecorVisibility()
    this.updateDecorTitleValidity()
  }

  /** Hides `field`'s whole row (its wrapping `<label>`, so its text goes with it — falls back to
   * `field` itself for the one row that isn't wrapped in a `<label>`, the "Windows" group
   * heading) rather than just disabling it — a building's Occupied floor row, or a tree's whole
   * Windows group, isn't merely irrelevant right now, it's a field that doesn't apply to this
   * kind at all and would be confusing left visible-but-grayed-out. */
  private setRowVisible(field: HTMLElement, visible: boolean): void {
    const row = field.closest("label") ?? field
    ;(row as HTMLElement).hidden = !visible
  }

  /** Shows/hides/enables the kind-dependent decor rows (Windows, Witness location, Floors,
   * Occupied floor) per hasWindows/isWindowOpenable/canHoldWitness — deliberately never touches
   * any input's own .value/.checked, only .hidden/.disabled/.max, so it's safe to call after
   * every keystroke from updateDecor/updateDecorWindows without the same bug lat/lng's own live
   * resync once hit (overwriting a field the user is actively typing into on every input event —
   * see this project's own memory notes). syncDecorFields (the fuller value-resync, only ever
   * called on an actual selection change, never mid-typing) calls this too rather than
   * duplicating the gating logic. */
  private syncDecorVisibility(): void {
    const decor = this.ufoElement.sighting.decor.find(d => d.id === this.currentDecorId)
    const hasSelection = decor !== undefined
    const kind = decor?.kind
    // With no decor at all, the fieldset shows only the Add row below (see template.ts's own
    // comment on why that row is forced onto its own line) — the picker/delete button and every
    // core property row are hidden entirely rather than left visible-but-disabled, so a blank
    // recording doesn't present a wall of inert fields with nothing to edit yet.
    this.setRowVisible(this.decorSelect, hasSelection)
    this.setRowVisible(this.deleteDecorButton, hasSelection)
    this.setRowVisible(this.decorTitleInput, hasSelection)
    this.setRowVisible(this.decorEastInput, hasSelection)
    this.setRowVisible(this.decorNorthInput, hasSelection)
    this.setRowVisible(this.decorHeadingInput, hasSelection)
    // Lit is the legacy single switch (a streetlamp, a car's headlights). An aircraft's lamps are a
    // rig of their own (see LightRig.ts), so the checkbox would sit there doing nothing at all —
    // which is exactly how it was read.
    this.setRowVisible(this.decorLitInput, hasSelection && decor?.kind !== "aircraft")
    const showWindows = hasSelection && kind !== undefined && hasWindows(kind)
    this.setRowVisible(this.labelDecorWindows, showWindows)
    // Which of the 8 DecorSide values actually apply to this kind — a building shows plain
    // Left/Right, a vehicle shows its own 4 door corners instead (see decorSidesFor's own doc
    // comment); every side outside that set stays hidden regardless of showWindows, even though
    // its own input keeps getting value-synced elsewhere (syncDecorFields) so a stale value never
    // lingers if the row becomes visible again for a differently-kinded decor object later.
    const applicableSides = kind !== undefined ? decorSidesFor(kind) : []
    for (const side of DECOR_SIDES) {
      // Empty (no window at all) is always valid regardless of kind; only how far the opacity can
      // go toward 0 (fully open) needs a per-side, per-kind gate (a vehicle's front/behind
      // windshield/rear window are fixed — see isWindowOpenable's own doc comment) — raising the
      // input's own `min` rather than disabling it outright, so a fixed side can still be set to
      // "closed" (100) or left empty (no window), just never opened.
      this.decorWindowInputs[side].disabled = !hasSelection
      this.decorWindowInputs[side].min = String(kind !== undefined && isWindowOpenable(kind, side) ? 0 : FIXED_WINDOW_MIN_OPACITY_PERCENT)
      this.setRowVisible(this.decorWindowInputs[side], showWindows && applicableSides.includes(side))
    }
    const showWitnessSide = hasSelection && kind !== undefined && canHoldWitness(kind)
    this.setRowVisible(this.decorWitnessSideSelect, showWitnessSide)
    // Which of the 8 DecorSide values are valid SEATS for this kind (a subset of applicableSides
    // — see witnessSidesFor's own doc comment: a vehicle's occupant sits at one of its 4 doors,
    // never "at the windshield", even though the windshield itself is a valid WINDOW side above).
    const seatSides = kind !== undefined ? witnessSidesFor(kind) : []
    for (const side of DECOR_SIDES) {
      this.optionWitnessSide[side].hidden = !seatSides.includes(side)
    }
    // Shown together, both as soon as the decor object is a building — occupiedFloor doesn't wait
    // on witnessSide being set first (a building's own floor count is part of specifying it, same
    // as picking which floor the witness would be on if/when they're placed inside), even though
    // DecorSystem only actually USES occupiedFloor once witnessSide is also set (see its own doc
    // comment) — pre-setting it here just means it's already right the moment a location IS set.
    const showFloors = hasSelection && kind === "building"
    this.setRowVisible(this.decorFloorsInput, showFloors)
    this.setRowVisible(this.decorOccupiedFloorInput, showFloors)
    this.decorOccupiedFloorInput.max = String(decor?.floors ?? DEFAULT_BUILDING_FLOORS)
  }

  /**
   * Turns the witness to face the selected decor object, at the playhead's own instant.
   *
   * Placing something by typing three numbers and then hunting for it by dragging the sky is
   * unreasonable at any distance, and impossible for an aircraft: five kilometres away it is a
   * couple of pixels somewhere in a sixty-degree field. This aims straight at it.
   *
   * Goes through the same heading/pitch fields a drag does (see onCameraDragPointerMove), so it
   * keyframes the pose exactly as any other look would — turning to watch something IS part of what
   * the witness did, not a camera convenience layered on top.
   */
  /** Writes where the object stands at the playhead into the four placement fields. Skips any the
   * user is currently typing in, the same "don't fight active interaction" rule the rest of this
   * toolbar follows. */
  private showDecorPlacement(decor: DecorObject | undefined): void {
    const placement = decor ? resolveDecorPlacementAt(decor, this.ufoElement.currentTime) : undefined
    const values: [HTMLInputElement, number][] = [
      [this.decorEastInput, placement?.eastM ?? 0],
      [this.decorNorthInput, placement?.northM ?? 0],
      [this.decorAltitudeInput, placement?.altitudeM ?? 0],
      [this.decorHeadingInput, placement?.headingDeg ?? 0]
    ]
    for (const [input, value] of values) {
      if (this.shadow.activeElement === input) continue
      input.value = String(this.rounded(value))
    }
  }

  /**
   * Keeps those fields honest as the playhead moves — the same role, timing and playing-state
   * bailout as syncDecorLitFromTimeline beside it.
   *
   * Needed the moment decor could move: an aircraft is somewhere different at every instant, and a
   * form frozen on where it was at t=0 says the wrong thing for the whole rest of the recording.
   */
  private syncDecorPlacementFromTimeline(): void {
    if (this.ufoElement.playbackState === "playing") return
    this.showDecorPlacement(this.ufoElement.sighting.decor.find(object => object.id === this.currentDecorId))
  }

  /**
   * Jumps to the next meteor and turns the witness to face it.
   *
   * The half of the feature that was missing. Knowing a shower was running is a fact; a streak that
   * lasts a second, somewhere in sixty degrees of sky, at one instant of a recording, is not
   * something anybody finds by hand — and one that cannot be found may as well not be rendered.
   *
   * Seeks FIRST and aims afterwards, in that order and never the other way: the direction of gaze
   * is keyframed, so aiming at one instant aims at that instant only.
   *
   * And it STOPS the playback before seeking. A meteor is lit for about half a second: jumping to
   * one while the recording keeps running lands on it and leaves it behind within a frame or two of
   * the click, which looks exactly like nothing having happened at all — the button appears broken
   * even though it aimed perfectly. Held on the paused instant, the streak simply stays there to be
   * looked at, which is the whole point of a button that says "show me one".
   */
  private showNextMeteor(): void {
    const next = this.sceneElement.meteorByRank(this.meteorRank++)
    if (!next) return
    if (this.ufoElement.playbackState === "playing") this.ufoElement.togglePlayPause()
    this.ufoElement.currentTime = next.t
    this.headingInput.value = String(Math.round(next.azimuthDeg * 10) / 10)
    this.pitchInput.value = String(Math.round(next.altitudeDeg * 10) / 10)
    this.updateObserver()
  }

  /** Puts the ☄ button back to the best example whenever the sky it is offering examples FROM has
   * changed. Compared on the answer rather than on the inputs: two different dates can perfectly
   * well give the same shower at the same rate, and that is the same sky to walk through. */
  private resetMeteorRankIfSkyChanged(): void {
    const brightest = this.sceneElement.meteorByRank(0)
    const sky = brightest ? `${brightest.t}` : ""
    if (sky === this.meteorRankFor) return
    this.meteorRankFor = sky
    this.meteorRank = 0
  }

  private meteorRankFor?: string

  /** How far down the brightness ranking the ☄ button has walked. Reset whenever the sky changes,
   * so a reader who edits the date is offered that night's best example rather than resuming at
   * rank seven of a shower that is no longer running. */
  private meteorRank = 0

  /** Which of a shower's own names to use — the reader's, resolved the same way every other label
   * in this element is. */
  private showerLanguage(): "en" | "fr" {
    return selectLocale(navigator.languages, ["en", "fr"]) as "en" | "fr"
  }

  /**
   * States what else was in that patch of sky, worked out from the date and the place alone.
   *
   * Two candidates now, and they compose into one line rather than two: a meteor shower, whose
   * record is complete because a shower is a position in the Earth's own orbit, and a naked-eye
   * comet, whose orbit is a solved problem for as far back as anybody wrote a report. Neither needs
   * a lookup, a key, or a coverage floor that begins in 1957.
   *
   * Read-only, and deliberately so. It says what was there; whether it explains the sighting is the
   * reader's conclusion and never the file's claim. An author who wants to put either INTO a
   * reconstruction still does it by hand, the same way an aircraft is placed by hand.
   *
   * The strongest things it can say are the negative ones: a radiant below the horizon is a shower
   * that cannot have produced anything, and a comet below the horizon, or inside the Sun's glare, is
   * one nobody standing here saw whatever its magnitude on paper.
   */
  private refreshSkyCandidates(): void {
    this.resetMeteorRankIfSkyChanged()
    const sighting = this.ufoElement.sighting
    const place = sighting.event.place?.[0]
    const time = sighting.event.time
    // Undefined when the stated time cannot be resolved at all — the same "we couldn't ask" rather
    // than "there was nothing" distinction the weather makes.
    const date =
      place && place.lat !== undefined && place.lng !== undefined && time?.year !== undefined
        ? sightingTimeToDate(time, place.lng, sighting.event.utcOffsetHours)
        : undefined
    if (!date || !place || place.lat === undefined || place.lng === undefined) {
      this.showMeteorButton.hidden = true
      this.showCometButton.hidden = true
      this.skyCandidatesOutput.textContent = this.messages.skyLine.replace("{parts}", this.messages.skyUnknown)
      return
    }
    const observer = { lat: place.lat, lng: place.lng, elevationM: this.groundElevationM ?? 0 }
    const parts = [
      this.showerClause(date, observer),
      this.cometClause(date, observer),
      this.satelliteClause(date, observer),
      this.opticsClause(date, observer),
      this.rainbowClause(date, observer)
    ].filter(part => part !== undefined)
    this.skyCandidatesOutput.textContent = this.messages.skyLine.replace("{parts}", parts.join(" · "))
  }

  /** The strongest shower running, and what it would really have produced — or the fact that none
   * was. Also decides whether the meteor button has anything to offer. */
  private showerClause(date: Date, observer: { lat: number; lng: number; elevationM: number }): string {
    // Always stated, because it is always there: the sporadic background falls on every night of
    // the year, and most showers on most nights are weaker than it. A line naming only the shower
    // would put the smaller of the two numbers in front of the reader.
    const sporadic = Sporadics.observedRatePerHour(Sporadics.apexPosition(date, observer).altitudeDeg).toLocaleString(undefined, {
      maximumFractionDigits: 1
    })
    const active = MeteorShowers.activeAt(date)
    if (active.length === 0) {
      this.showMeteorButton.hidden = !this.sceneElement.meteorByRank(0)
      return this.messages.skyNothingActive.replace("{sporadic}", sporadic)
    }
    // The strongest shower running, by what would ACTUALLY have been seen rather than by its
    // reputation: a famous shower with its radiant near the horizon yields less than a modest one
    // overhead, and that is the whole point of the correction.
    const best = active
      .map(entry => {
        const position = MeteorShowers.radiantPosition(entry.shower, date, observer)
        return { entry, position, rate: MeteorShowers.observedRatePerHour(entry.zhr, position.altitudeDeg, entry.shower.populationIndex) }
      })
      .sort((a, b) => b.rate - a.rate)[0]
    if (best.rate <= 0) {
      // The shower produced nothing, but the sky is not empty — the background is still falling, and
      // the button still has something to show.
      this.showMeteorButton.hidden = !this.sceneElement.meteorByRank(0)
      return this.messages.skyShowerBelowHorizon.replace("{name}", best.entry.shower.name[this.showerLanguage()])
    }
    // Only offered when there is genuinely one to show.
    this.showMeteorButton.hidden = !this.sceneElement.meteorByRank(0)
    return this.messages.skyShowerActive
      .replace("{name}", best.entry.shower.name[this.showerLanguage()])
      .replace("{altitude}", String(Math.round(best.position.altitudeDeg)))
      .replace("{bearing}", Compass.towards(best.position.azimuthDeg, this.showerLanguage()))
      .replace("{rate}", best.rate.toLocaleString(undefined, { maximumFractionDigits: best.rate < 10 ? 1 : 0 }))
      .replace("{sporadic}", sporadic)
  }

  /**
   * The comet standing in that sky, if one was bright enough to be worth naming.
   *
   * Silent below naked-eye brightness, and that is the useful filter: every apparition in the
   * catalog was a naked-eye comet at its best, but its window runs two hundred days either side of
   * perihelion and for most of that it was a telescopic smudge. A magnitude-eleven comet is a fact
   * about an observatory, not a candidate for what a witness saw.
   */
  private cometClause(date: Date, observer: { lat: number; lng: number; elevationM: number }): string | undefined {
    const comet = Comets.brightestAt(date, observer)
    if (!comet || comet.magnitude > DARK_SKY_LIMITING_MAGNITUDE) {
      this.showCometButton.hidden = true
      return undefined
    }
    // Worth pointing at only when there is somewhere to point: a comet that has not risen is aimed
    // at by looking into the ground.
    this.showCometButton.hidden = comet.position.altitudeDeg <= 0
    return this.cometText(comet)
  }

  /**
   * Whether anything in orbit could have been seen from there — see Satellites.ts.
   *
   * Two questions, kept apart, because merging them is how this got written wrong the first time.
   * WAS IT LIT is geometry: where the Earth's shadow stood, which by day is behind the witness so
   * that everything above them is in sunlight. COULD IT BE PICKED OUT is contrast, and it is
   * settled here against the same visibleMagnitudeLimit the star field is drawn by — the identical
   * rule that lets Ikeya-Seki be drawn beside the Sun and leaves an ordinary comet out of it.
   *
   * That split is what makes a daylight Iridium flare sayable. At magnitude -8 it beat a daylit sky,
   * and people really did watch them at noon; a satellite does not need a dark observer, it needs to
   * be brighter than the sky it stands in.
   *
   * What the clause never says is WHICH satellite. Historical orbital elements cannot be obtained
   * (see Satellites.ts), so an individual pass is placed by hand like an aircraft — this states the
   * window, not the object.
   */
  private satelliteClause(date: Date, observer: { lat: number; lng: number; elevationM: number }): string | undefined {
    const sky = Satellites.visibilityAt(date, observer)
    if (!sky.anythingInOrbit) {
      // Only worth saying against a sky somebody could have seen anything in at all.
      return sky.sunAltitudeDeg < 0 ? this.messages.skySatellitesNotYet : undefined
    }
    const magnitudeLimit = visibleMagnitudeLimit(sky.sunAltitudeDeg)
    const bright = sky.classes.filter(entry => entry.peakMagnitude <= magnitudeLimit)
    const named = this.listed(bright.map(entry => entry.name[this.showerLanguage()]))
    if (sky.sunAltitudeDeg >= 0) {
      // By day the geometry is never the limit — the sky is. Silent unless something up there beat
      // it, since "a satellite was lit and invisible" describes every daylit hour ever recorded.
      if (bright.length === 0) return undefined
      const daylight = bright.length === 1 ? this.messages.skySatellitesDaylightOne : this.messages.skySatellitesDaylight
      return daylight.replace("{eras}", named)
    }
    const height = Math.round(sky.shadowHeightKm).toLocaleString()
    // Present for every date past the first launch, which this branch already is.
    const count = (sky.trackedObjects ?? 0).toLocaleString()
    const filled = (template: string): string => template.replace("{height}", height).replace("{count}", count)
    if (!sky.lowOrbitLit) return filled(this.messages.skySatellitesShadowed)
    if (bright.length === 0) return filled(this.messages.skySatellitesLit)
    return filled(this.messages.skySatellitesLitWith).replace("{eras}", named)
  }

  /**
   * What ice crystals could have put beside the Sun or the Moon — see IceHalos.ts.
   *
   * Stated whether or not the scene draws anything, and that is the whole reason it exists. The
   * display is silent when an ingredient is missing, and a reader who has just moved the ice-cloud
   * slider to its maximum and seen nothing has no way to tell an empty sky from a broken one. This
   * says which ingredient is absent.
   *
   * Silent only when there is no lit source at all: a halo is the source's own light bent through
   * crystals, so with the Sun and the Moon both down there is nothing to say.
   */
  private opticsClause(date: Date, observer: { lat: number; lng: number; elevationM: number }): string | undefined {
    const weather = resolveWeatherAt(this.ufoElement.sighting, 0)
    const sun = computeBodyPosition("Sun", date, observer)
    const moon = computeBodyPosition("Moon", date, observer)
    // The ice is still in sunlight after the ground is not, so the source is whichever of the two
    // the DECK can still see — the same choice the renderer makes, and for the same reason (see
    // SceneRenderer.buildIceHalos). Deciding it differently here is how a line ends up describing
    // the Moon's display while the scene draws the Sun's.
    const lit = IceHalos.deckLitUntilDeg(IceHalos.DECK_HEIGHT_M)
    const bySun = sun.altitudeDeg > -lit
    const source = bySun ? sun : moon
    if (source.altitudeDeg <= -lit) return undefined
    const ice = weather.highCloudCover
    if (ice === undefined || ice <= 0) return this.messages.skyOpticsNoIce
    // The same reading the renderer takes (see SceneRenderer.buildIceHalos).
    if (IceHalos.strength(ice, weather.lowerCloudCover ?? weather.cloudCover, source.altitudeDeg, lit) <= 0) {
      return this.messages.skyOpticsHidden
    }
    const named = bySun ? this.messages.skyOpticsSun : this.messages.skyOpticsMoon
    const forms = this.listed(IceHalos.formsAt(source.altitudeDeg, lit).map(form => this.opticsFormName(form)))
    const alignment = weather.iceCrystalAlignment ?? DEFAULT_ICE_CRYSTAL_ALIGNMENT
    return (
      this.messages.skyOpticsPossible.replace("{forms}", forms).replace("{source}", named) +
      this.messages.skyOpticsAlignment.replace("{alignment}", String(Math.round(alignment * 100)))
    )
  }

  /**
   * What falling water could have put opposite the Sun or the Moon — see Rainbows.ts.
   *
   * SILENT UNLESS IT WAS RAINING, which is the opposite rule to the ice line's and the right one for
   * each. Nobody can tell by looking whether there was ice cloud eight kilometres up, so that line
   * has to say so; everybody knows whether it was raining, so a "no rain, no rainbow" on every clear
   * sky would be noise. Once there IS rain the question becomes live, and the negative answers are
   * the interesting ones: a Sun too high for any bow to clear the horizon rules out a midday report
   * outright, and an unbroken deck rules out the rest.
   */
  private rainbowClause(date: Date, observer: { lat: number; lng: number; elevationM: number }): string | undefined {
    const weather = resolveWeatherAt(this.ufoElement.sighting, 0)
    if (weather.precipitationType !== "rain" || weather.precipitationIntensity <= 0) return undefined
    const sun = computeBodyPosition("Sun", date, observer)
    const moon = computeBodyPosition("Moon", date, observer)
    const bySun = sun.altitudeDeg > 0
    const source = bySun ? sun : moon
    // A bow is the source's own light bent back: with both down there was nothing to bend.
    if (source.altitudeDeg <= 0) return this.messages.skyBowNoSource
    // The same reading the renderer takes (see SceneRenderer.buildRainbow).
    const blocking = weather.lowerCloudCover ?? weather.cloudCover
    if (Rainbows.strength(weather.precipitationIntensity, blocking, source.altitudeDeg) <= 0) {
      return this.messages.skyBowHidden
    }
    const forms = Rainbows.formsAt(source.altitudeDeg)
    if (forms.length === 0) {
      return this.messages.skyBowSourceTooHigh
        .replace("{altitude}", String(Math.round(source.altitudeDeg)))
        .replace("{radius}", String(Math.round(Rainbows.primary().radiusDeg)))
    }
    const named = this.listed(forms.map(bow => this.bowFormName(bow)))
    if (bySun) return this.messages.skyBowPossible.replace("{forms}", named)
    const lit = Math.round(computeMoonPhase(date).illuminatedFraction * 100)
    return this.messages.skyBowMoon.replace("{forms}", named).replace("{lit}", String(lit))
  }

  /**
   * Names one bow, with the radius it stands at and how high its top reached.
   *
   * The height is the number worth having, and it is the one a witness's account can be checked
   * against: a bow's top is its radius minus the source's altitude, so an account of a HIGH bow is
   * an account of a low Sun, whatever hour the file claims.
   */
  private bowFormName(bow: BowForm): string {
    const template = bow.id === "primary" ? this.messages.skyBowPrimary : this.messages.skyBowSecondary
    return template
      .replace("{radius}", String(Math.round(bow.radiusDeg)))
      .replace("{top}", String(Math.round(bow.topAltitudeDeg)))
  }

  /**
   * Names one form of the display, with the angle it stands at where it has one.
   *
   * The angles are IceHalos's, derived from the refractive index of ice, and they are NOT the
   * numbers the scene draws from: the scene traces light through crystals and finds out for itself
   * (HaloSky). Two derivations of the same physics that have to agree is a check; one number shared
   * between the sentence and the picture would only be a habit.
   */
  private opticsFormName(form: HaloForm): string {
    const round = (value: number | undefined): string => String(Math.round(value ?? 0))
    switch (form.id) {
      case "halo22":
        return this.messages.skyOpticsHalo22.replace("{angle}", round(form.angleDeg))
      case "halo46":
        return this.messages.skyOpticsHalo46.replace("{angle}", round(form.angleDeg))
      case "parhelia":
        return this.messages.skyOpticsParhelia.replace("{angle}", round(form.angleDeg))
      case "tangentArc":
        return this.messages.skyOpticsTangentArc
      case "parhelicCircle":
        return this.messages.skyOpticsParhelicCircle
      case "circumzenithal":
        return this.messages.skyOpticsCircumzenithal.replace("{angle}", round(form.angleDeg))
      case "circumhorizontal":
        return this.messages.skyOpticsCircumhorizontal
      case "pillar":
        return this.messages.skyOpticsPillar
    }
  }

  /** A list said the way a sentence says it rather than the way an array prints it — the reader's
   * own language decides whether that is "a, b and c" or "a, b et c". */
  private listed(items: string[]): string {
    const formatter = new Intl.ListFormat(this.showerLanguage(), { style: "long", type: "conjunction" })
    return formatter.format(items)
  }

  private cometText(comet: CometAppearance): string {
    const name = comet.apparition.name[this.showerLanguage()]
    const magnitude = comet.magnitude.toLocaleString(undefined, { maximumFractionDigits: 1 })
    if (comet.position.altitudeDeg <= 0) {
      return this.messages.skyCometBelowHorizon.replace("{name}", name).replace("{magnitude}", magnitude)
    }
    const template =
      comet.elongationDeg < Comets.TWILIGHT_ELONGATION_DEG
        ? this.messages.skyCometInDaylight
        : comet.tailLengthDeg === undefined
          ? this.messages.skyCometNoTail
          : this.messages.skyComet
    return template
      .replace("{name}", name)
      .replace("{magnitude}", magnitude)
      .replace("{altitude}", String(Math.round(comet.position.altitudeDeg)))
      .replace("{bearing}", Compass.towards(comet.position.azimuthDeg, this.showerLanguage()))
      .replace("{tail}", String(Math.round(comet.tailLengthDeg ?? 0)))
      .replace("{elongation}", String(Math.round(comet.elongationDeg)))
  }

  /**
   * Turns the witness to face the comet.
   *
   * No seeking, unlike the meteor button, and no pausing either: a comet was there for the whole
   * recording and for weeks either side, so there is no instant to be caught at. The same aim the
   * decor's own button performs, through the same keyframed gaze fields.
   */
  private lookAtComet(): void {
    const sighting = this.ufoElement.sighting
    const place = sighting.event.place?.[0]
    const time = sighting.event.time
    if (!place || place.lat === undefined || place.lng === undefined || time?.year === undefined) return
    const date = sightingTimeToDate(time, place.lng, sighting.event.utcOffsetHours)
    if (!date) return
    const comet = Comets.brightestAt(date, { lat: place.lat, lng: place.lng, elevationM: this.groundElevationM ?? 0 })
    if (!comet) return
    this.headingInput.value = String(this.rounded(comet.position.azimuthDeg))
    this.pitchInput.value = String(this.rounded(comet.position.altitudeDeg))
    this.updateObserver()
  }

  /** One decimal, so a placement or a gaze read back from an interpolated trajectory — or written
   * by a drag — doesn't fill the field with sixteen digits of floating point. A tenth of a degree
   * is roughly one pixel across this canvas, so nothing visible is lost. */
  private rounded(value: number): number {
    return Math.round(value * 10) / 10
  }

  private lookAtDecor(): void {
    const decor = this.ufoElement.sighting.decor.find(object => object.id === this.currentDecorId)
    if (!decor) return
    const { eastM, northM, altitudeM } = resolveDecorPlacementAt(decor, this.ufoElement.currentTime)
    const horizontalM = Math.hypot(eastM, northM)
    // Nothing to aim at: the object is exactly where the witness stands.
    if (horizontalM === 0 && altitudeM === 0) return
    const headingDeg = (Math.atan2(eastM, northM) * 180) / Math.PI
    const pitchDeg = (Math.atan2(altitudeM - EYE_HEIGHT_M, horizontalM) * 180) / Math.PI
    this.headingInput.value = String(Math.round(headingDeg * 10) / 10)
    this.pitchInput.value = String(Math.round(pitchDeg * 10) / 10)
    this.updateObserver()
  }

  /** Offers the rigs that make sense on this object's kind, plus "none" — see LightRigs.forKind.
   * Selects whichever rig the object's own lamps came from, matched by their ids, so reopening a
   * saved recording shows what it actually carries rather than resetting the picker. */
  private refreshDecorLightRigOptions(decor: DecorObject | undefined): void {
    const rigs = decor ? LightRigs.forKind(decor.kind) : []
    const none = document.createElement("option")
    none.value = ""
    none.textContent = this.messages.decorLightsNone
    this.decorLightRigSelect.replaceChildren(
      none,
      ...rigs.map(rig => {
        const option = document.createElement("option")
        option.value = rig.id
        option.textContent = rig.name
        return option
      })
    )
    const carried = decor?.lights?.map(light => light.id).join() ?? ""
    this.decorLightRigSelect.value = rigs.find(rig => rig.create().map(l => l.id).join() === carried)?.id ?? ""
  }

  /** Fits the chosen rig to the selected object, or strips its lamps for "none".
   *
   * Replaces the whole decor array rather than mutating in place: the lamps are built INTO the
   * object's 3D group (see DecorSystem.addLights), so the scene has to rebuild it, and it only
   * does that when the array's own identity changes (see SceneRenderer.setDecor). */
  private updateDecorLightRig(): void {
    const sighting = this.ufoElement.sighting
    const decor = sighting.decor.find(object => object.id === this.currentDecorId)
    if (!decor) return
    const rig = LightRigs.byId(this.decorLightRigSelect.value)
    sighting.decor = sighting.decor.map(object =>
      object.id === decor.id ? { ...object, lights: rig ? rig.create() : undefined } : object
    )
    this.ufoElement.refresh()
    this.dispatchEvent(new CustomEvent("sightingchange"))
  }

  /** Keeps the Lit checkbox honest as the playhead moves or a different keyframe region is
   * scrubbed to — same role/timing and the same playing-state bailout as
   * syncWeatherFromTimeline/syncObserverFromTimeline. Skips while focused, same "don't fight
   * active interaction" reasoning (a checkbox doesn't have in-progress typed text to clobber, but
   * an active toggle mid-click could otherwise flicker back to its pre-click state here). */
  private syncDecorLitFromTimeline(): void {
    if (this.ufoElement.playbackState === "playing") return
    if (this.shadow.activeElement === this.decorLitInput) return
    const decor = this.ufoElement.sighting.decor.find(d => d.id === this.currentDecorId)
    if (!decor) return
    this.decorLitInput.checked = resolveDecorLitAt(decor, this.ufoElement.currentTime)
  }

  private updatePresetButtons(): void {
    for (const presetId of PRESET_IDS) {
      this.presetButtons[presetId]?.setAttribute(
        "aria-pressed",
        String(presetId === this.currentAppearance.presetId)
      )
    }
  }

  private get samplingRate(): number {
    return Number(this.samplingRateInput.value)
  }

  private buildPrototype(bounds = this.defaultBounds()) {
    return createShape(bounds, this.currentAppearance)
  }

  private defaultBounds(): ShapeBounds {
    const canvas = this.ufoElement.canvasElement
    return {
      x: canvas.width / 2 - DEFAULT_SHAPE_SIZE.width / 2,
      y: canvas.height / 2 - DEFAULT_SHAPE_SIZE.height / 2,
      width: DEFAULT_SHAPE_SIZE.width,
      height: DEFAULT_SHAPE_SIZE.height
    }
  }

  private toggleRecording(): void {
    this.endDrag()
    const canvas = this.ufoElement.canvasElement
    if (this.isRecording) {
      this.recorder?.stop()
      this.isRecording = false
      this.setRecordButtonLabel(false)
      this.setCanvasCursor(undefined)
      canvas.style.touchAction = ""
      this.sourceSelect.disabled = false
      this.addShapeButton.disabled = false
      this.ufoElement.refresh()
      this.refreshSourceList()
    } else {
      this.recorder = new Recorder(this.ufoElement.sighting.timeline, new RafSamplingClock(this.samplingRate))
      this.recorder.start(this.currentSourceId, this.buildPrototype())
      this.isRecording = true
      this.setRecordButtonLabel(true)
      this.setCanvasCursor("record")
      canvas.style.touchAction = "none"
      // Prevents switching/adding a shape mid-drag from leaving the toolbar pointing at a
      // different shape than the one actually being recorded into.
      this.sourceSelect.disabled = true
      this.addShapeButton.disabled = true
      this.deleteShapeButton.disabled = true
    }
  }

  /** Mirrors the nested ufo's own Play/Pause glyph convention (plain Unicode, no icon-asset
   * system) — a red record dot while idle, a stop square while recording. */
  private setRecordButtonLabel(recording: boolean): void {
    this.recordButton.textContent = recording ? "⏹" : "⏺"
    const label = recording ? this.messages.stop : this.messages.record
    this.recordButton.title = label
    this.recordButton.setAttribute("aria-label", label)
  }

  /** Auto-detects the visitor's preferred UI language from `navigator.languages`, falling back
   * to English (already baked into the template) when none of their preferences are
   * supported — see selectLocale. There is deliberately no language-picker UI, matching
   * `<rr0-ufo>`'s own approach. */
  private async loadLocaleMessages(): Promise<void> {
    const language = selectLocale(navigator.languages, UFO_SUPPORTED_LANGUAGES) as UfoLanguage
    if (language === "en") return
    this.applyMessages(await loadUfoRecorderMessages(language))
  }

  private applyMessages(messages: UfoRecorderMessages): void {
    // The constructor's very first shape gets its auto-generated title (see shapeLabel/
    // shapeTitleInput's own doc comments) synchronously, before this async locale load can ever
    // resolve — English's baked-in default, same as every other label here, EXCEPT this one gets
    // written straight into persisted shape data rather than just a DOM label's own .textContent,
    // so it can't be corrected the same simple way everything else below is. Detected by
    // comparing against what the OLD (pre-switch) messages.shape would have produced — not by
    // reusing shapeLabel() itself, which would just read the already-stale stored title right
    // back rather than recomputing a fresh default — and only ever touches DEFAULT_SOURCE_ID's
    // own title, exactly right after construction: any shape added later goes through addShape(),
    // which only ever runs from a real user click, long after this locale load has settled.
    if (this.currentSourceId === DEFAULT_SOURCE_ID && this.shapeTitleInput.value === `${this.messages.shape} 1`) {
      this.messages = messages
      this.shapeTitleInput.value = `${this.messages.shape} 1`
      this.updateShapeTitle()
    } else {
      this.messages = messages
    }
    this.presetButtons.oval.textContent = messages.oval
    this.presetButtons.polygon.textContent = messages.polygon
    this.contextAddVertexButton.textContent = messages.addVertex
    this.contextDeleteVertexButton.textContent = messages.deleteVertex
    this.labelColor.textContent = messages.color
    this.labelTransparency.textContent = messages.transparency
    this.labelHalo.textContent = messages.halo
    this.labelShape.textContent = messages.shape
    this.labelShapeTitle.textContent = messages.shapeTitle
    this.labelUtcOffset.textContent = messages.utcOffset
    this.utcOffsetInput.placeholder = messages.utcOffsetPlaceholder
    this.labelObjectSize.textContent = messages.objectSize
    this.labelObjectDistance.textContent = messages.objectDistance
    this.objectSizeInput.placeholder = messages.objectSizePlaceholder
    this.objectDistanceInput.placeholder = messages.objectDistancePlaceholder
    // The read-back is a formatted sentence, not a static label — re-rendered rather than
    // assigned, so switching language refreshes the numbers already shown.
    this.refreshApparentSize()
    this.labelSamplingRate.textContent = messages.samplingRate
    this.labelDuration.textContent = messages.duration
    this.durationInput.placeholder = messages.durationPlaceholder
    this.addShapeButton.title = messages.addShape
    this.addShapeButton.setAttribute("aria-label", messages.addShape)
    this.deleteShapeButton.title = messages.deleteShape
    this.deleteShapeButton.setAttribute("aria-label", messages.deleteShape)
    this.contextGroupButton.textContent = messages.group
    this.contextUngroupButton.textContent = messages.ungroup
    this.contextBringToFrontButton.textContent = messages.bringToFront
    this.contextSendToBackButton.textContent = messages.sendToBack
    this.contextDeleteButton.textContent = messages.contextMenuDelete
    this.exportButton.textContent = messages.export
    this.labelImportFile.textContent = messages.importFile
    this.labelImportUrl.textContent = messages.importUrl
    this.importUrlInput.placeholder = messages.importUrlPlaceholder
    this.importUrlButton.textContent = messages.importButton
    // Rebuilt rather than relabelled: the connector and every label live inside DOM this builds.
    this.refreshSourceRows()
    this.refreshTimeZoneOptions()
    this.labelPlaceName.textContent = messages.placeName
    this.placeNameInput.placeholder = messages.placeNamePlaceholder
    this.searchPlaceButton.textContent = messages.searchPlace
    this.labelPlaceMatch.textContent = messages.placeMatch
    this.labelLatitude.textContent = messages.latitude
    this.labelLongitude.textContent = messages.longitude
    this.labelHeading.textContent = messages.heading
    this.headingInput.placeholder = messages.headingPlaceholder
    this.labelPitch.textContent = messages.pitch
    this.labelElevation.textContent = messages.elevation
    this.labelObservationTime.textContent = messages.observationTime
    this.labelObservationEndTime.textContent = messages.observationEndTime
    this.obsTimeInput.placeholder = messages.edtfPlaceholder
    this.obsTimeInput.title = messages.observationTimeHint
    this.obsEndTimeInput.placeholder = messages.edtfPlaceholder
    this.obsEndTimeInput.title = messages.observationEndTimeHint
    this.presetsGroup.setAttribute("aria-label", messages.presetsGroupLabel)
    this.labelDecor.textContent = messages.decor
    this.labelDecorFieldset.textContent = messages.decor
    this.optionDecorBuilding.textContent = messages.decorBuilding
    this.optionDecorTree.textContent = messages.decorTree
    this.optionDecorStreetlight.textContent = messages.decorStreetlight
    this.optionDecorVehicle.textContent = messages.decorVehicle
    this.optionDecorAircraft.textContent = messages.decorAircraft
    this.labelDecorLights.textContent = messages.decorLights
    this.labelDecorAltitude.textContent = messages.decorAltitude
    this.showMeteorButton.title = messages.showMeteor
    this.showMeteorButton.setAttribute("aria-label", messages.showMeteor)
    this.showCometButton.title = messages.showComet
    this.showCometButton.setAttribute("aria-label", messages.showComet)
    this.lookAtDecorButton.title = messages.lookAtDecor
    this.lookAtDecorButton.setAttribute("aria-label", messages.lookAtDecor)
    this.optionDecorWitness.textContent = messages.decorWitness
    this.deleteDecorButton.title = messages.deleteDecor
    this.deleteDecorButton.setAttribute("aria-label", messages.deleteDecor)
    this.labelDecorTitle.textContent = messages.decorTitle
    this.labelDecorEast.textContent = messages.decorEast
    this.labelDecorNorth.textContent = messages.decorNorth
    this.labelDecorHeading.textContent = messages.decorHeading
    this.labelDecorLit.textContent = messages.decorLit
    this.labelDecorSightingUrl.textContent = messages.decorSightingUrl
    this.contextViewTestimonyButton.textContent = messages.viewTestimony
    // The arrow is appended here, not part of the translated string — see UfoRecorderMessages.
    // masks's own doc comment.
    this.labelContextMasks.textContent = `${messages.masks} ▸`
    this.addDecorWitnessButton.textContent = messages.addWitness
    // The visible glyph itself is a plain "+" (baked into the template, not translated — see
    // addDecorBuildingButton's own field doc comment) since the adjacent Kind dropdown already
    // says what's being added; messages.addDecor still drives the accessible name/tooltip so a
    // screen reader (or a sighted hover) gets a real word, not just a symbol.
    this.addDecorBuildingButton.title = messages.addDecor
    this.addDecorBuildingButton.setAttribute("aria-label", messages.addDecor)
    this.labelDecorFloors.textContent = messages.decorFloors
    this.labelDecorOccupiedFloor.textContent = messages.decorOccupiedFloor
    this.labelDecorWitnessSide.textContent = messages.decorWitnessSide
    this.labelDecorWindows.textContent = messages.decorWindows
    this.optionWitnessSideNone.textContent = messages.decorWitnessSideNone
    const decorSideMessages: Record<DecorSide, string> = {
      front: messages.decorSideFront,
      behind: messages.decorSideBehind,
      left: messages.decorSideLeft,
      right: messages.decorSideRight,
      "front-left": messages.decorSideFrontLeft,
      "front-right": messages.decorSideFrontRight,
      "behind-left": messages.decorSideBehindLeft,
      "behind-right": messages.decorSideBehindRight
    }
    for (const side of DECOR_SIDES) {
      this.labelDecorSide[side].textContent = decorSideMessages[side]
      this.optionWitnessSide[side].textContent = decorSideMessages[side]
    }
    this.refreshDecorList() // decor option labels embed decorKindSelect's own text, just updated above
    this.labelWitnessId.textContent = messages.witnessId
    this.labelWitnessDirName.textContent = messages.witnessDirName
    this.labelWitnessTitle.textContent = messages.witnessTitle
    this.labelWitnessLastName.textContent = messages.witnessLastName
    this.labelWitnessFirstNames.textContent = messages.witnessFirstNames
    this.witnessFirstNamesInput.placeholder = messages.tagsPlaceholder
    this.labelCaseId.textContent = messages.caseId
    this.labelDescription.textContent = messages.description
    this.labelTags.textContent = messages.tags
    this.tagsInput.placeholder = messages.tagsPlaceholder
    this.labelWeather.textContent = messages.weather
    this.labelShapeGroup.textContent = messages.shapeGroup
    this.labelTemporalGroup.textContent = messages.temporalGroup
    this.labelLocationGroup.textContent = messages.locationGroup
    this.labelObservationGroup.textContent = messages.observationGroup
    this.labelWitnessGroup.textContent = messages.witnessGroup
    this.labelCircumstancesGroup.textContent = messages.circumstancesGroup
    this.labelCloudCover.textContent = messages.cloudCover
    this.labelHighCloud.textContent = messages.highCloudCover
    this.labelIceAlignment.textContent = messages.iceCrystalAlignment
    this.labelFNumber.textContent = messages.aperture
    this.labelExposure.textContent = messages.exposure
    this.labelFocusDistance.textContent = messages.focusDistance
    // The focal row's own label and unit depend on the instrument, not only on the language.
    this.syncOpticsFromInstrument()
    this.labelCloudDarkness.textContent = messages.cloudDarkness
    this.labelCloudBase.textContent = messages.cloudBase
    this.labelPrecipitationType.textContent = messages.precipitationType
    this.optionPrecipitationNone.textContent = messages.precipitationNone
    this.optionPrecipitationRain.textContent = messages.precipitationRain
    this.optionPrecipitationSnow.textContent = messages.precipitationSnow
    this.optionPrecipitationHail.textContent = messages.precipitationHail
    this.labelPrecipitationIntensity.textContent = messages.precipitationIntensity
    this.labelWindDirection.textContent = messages.windDirection
    this.labelWindSpeed.textContent = messages.windSpeed
    this.labelStorm.textContent = messages.storm
    this.labelWeatherInferred.textContent = messages.weatherInferred
    // Its own title is set by syncWeatherSourceState below, not here: which of the two messages it
    // carries depends on whether a lookup is possible at all.
    // Re-renders the source/status line, whose text is half messages and half live data.
    this.syncWeatherSourceState()
    this.labelSoundGroup.textContent = messages.soundGroup
    this.labelSoundKind.textContent = messages.soundKind
    this.labelSoundVolume.textContent = messages.soundVolume
    this.labelSoundPitch.textContent = messages.soundPitch
    this.labelSoundSrc.textContent = messages.soundSrc
    this.soundSrcInput.placeholder = messages.soundSrcPlaceholder
    for (const [kind, option] of this.soundKindOptions) option.textContent = this.soundKindLabel(kind, messages)
    this.labelInstrument.textContent = messages.instrument
    this.loopButton.title = messages.autoReplay
    this.loopButton.setAttribute("aria-label", messages.autoReplay)
    this.setRecordButtonLabel(this.isRecording)
    // Refreshes the Play/Pause button's own title/aria-label, which depends on this.messages.
    this.syncPlaybackControls()
  }

  private onPointerDown(event: PointerEvent): void {
    if (this.isRecording) {
      this.onPointerMove(event)
      return
    }
    const point = this.canvasPointFromEvent(event)
    if (!point) return
    const timeline = this.ufoElement.sighting.timeline
    const t = this.ufoElement.currentTime
    const playing = this.ufoElement.playbackState === "playing"

    if (this.selectedSourceIds.size > 1) {
      const group = new ShapeGroup(this.selectedMembers())
      const handle = ShapeHandles.hitTestHandle({ bounds: group.bounds(), angle: 0 }, point)
      if (handle === "rotate") {
        if (playing) return // don't fight the player's per-frame repaint
        this.dragState = { kind: "group-rotate", group, startPointer: point }
        this.startDragListening()
        return
      }
      if (handle) {
        if (playing) return // don't fight the player's per-frame repaint
        this.dragState = { kind: "group-resize", group, handle: handle as Exclude<HandleId, "rotate"> }
        this.startDragListening()
        return
      }
    } else {
      const selected = timeline.getInterpolatedShapeAt(t, this.currentSourceId)
      // Vertex handles are checked before the bbox ones: they're drawn on top (see
      // CanvasRenderer.paintSelectionHandles) and a polygon corner can sit close enough to a bbox
      // handle (e.g. a rectangle-derived "Polygon" preset, whose corners start exactly ON the bbox
      // corners) that whichever is checked first would otherwise always win.
      const vertexIndex = selected?.kind === "polygon" ? ShapeHandles.hitTestVertex(selected, point) : undefined
      if (selected?.kind === "polygon" && vertexIndex !== undefined) {
        if (playing) return // don't fight the player's per-frame repaint
        this.dragState = { kind: "vertex", sourceId: this.currentSourceId, original: selected, vertexIndex }
        this.startDragListening()
        return
      }
      const handle = selected && ShapeHandles.hitTestHandle(selected, point)
      if (selected && handle) {
        if (playing) return // don't fight the player's per-frame repaint
        this.beginDrag(handle === "rotate" ? "rotate" : "resize", this.currentSourceId, selected, point, handle)
        return
      }
    }

    const hit = timeline.hitTest(t, point.x, point.y)
    if (!hit) {
      // No shape under the pointer — try a decor object next (a plain click, not the right-click
      // context menu's own pickDecorAt call) so clicking a building/tree/vehicle in the 3D scene
      // selects it in the Decor fieldset, the same way clicking a shape selects it in the Shape
      // one. Only reached once a shape hit is already ruled out, matching the same "shape wins"
      // precedent as SceneElement's own hover tooltip (a shape is painted on top of decor, so it
      // should win a click there too).
      const decorId = this.pickDecorAt(event)
      if (decorId !== undefined) {
        this.selectDecor(decorId)
        return
      }
      // Nothing at all under the pointer to select/move — the "landscape" itself becomes the drag
      // target instead of this being a no-op, letting a witness set their own heading/pitch by
      // dragging the sky/ground the same way they'd drag a shape. Selection is left untouched.
      if (!playing) this.beginCameraDrag(point)
      return
    }
    if (event.shiftKey) {
      this.toggleUnitSelection(hit.sourceId)
    } else if (!this.selectedSourceIds.has(hit.sourceId)) {
      // Only collapses the selection when the clicked shape wasn't already part of it — clicking
      // (and dragging) a shape that's already in the current multi-selection keeps the whole
      // selection intact instead, which is what makes "drag an existing multi-selection" reachable
      // at all (Figma/PowerPoint-style: every mousedown on a member of the selection moves the
      // whole group, not just that one shape).
      this.selectUnit(hit.sourceId)
    }
    if (playing) return
    // Covers both "just click" (a zero-delta move below, harmlessly rewriting identical bounds)
    // and click-and-drag-to-move in one gesture, for the whole current selection at once — a
    // single selected shape is just the size-1 case of the same "sources" array.
    const sources = [...this.selectedSourceIds].map(sourceId => ({
      sourceId,
      original: sourceId === hit.sourceId ? hit.shape : (timeline.getInterpolatedShapeAt(t, sourceId) ?? hit.shape)
    }))
    this.dragState = { kind: "move", sources, startPointer: point }
    this.startDragListening()
  }

  /** Every currently-selected shape as it stands at the playhead, ready to hand to ShapeGroup —
   * sources whose shape isn't defined at this instant (not yet born, or already gone) drop out
   * rather than being carried along as holes. Shared by the pointer-drag, hover-cursor and
   * arrow-key paths, which all need exactly this list. */
  private selectedMembers(): Array<{ sourceId: string; shape: Shape }> {
    const timeline = this.ufoElement.sighting.timeline
    const t = this.ufoElement.currentTime
    return [...this.selectedSourceIds]
      .map(sourceId => ({ sourceId, shape: timeline.getInterpolatedShapeAt(t, sourceId) }))
      .filter((member): member is { sourceId: string; shape: Shape } => !!member.shape)
  }

  /** Plain-click selection semantics: replaces the whole selection with sourceId's "unit" — its
   * group's full member list if it's grouped (see Timeline.groupMembers), so clicking any single
   * grouped shape re-selects the whole group at once, or just [sourceId] if it isn't grouped. */
  private selectUnit(sourceId: string): void {
    const unit = this.ufoElement.sighting.timeline.groupMembers(sourceId) ?? [sourceId]
    if (unit.length === this.selectedSourceIds.size && unit.every(id => this.selectedSourceIds.has(id)) && sourceId === this.currentSourceId) {
      return // already exactly this selection — avoid a redundant resync
    }
    this.selectedSourceIds = new Set(unit)
    this.currentSourceId = sourceId
    this.refreshSourceList()
    this.onSelectionOrTimeChanged()
  }

  /** Shift-click selection semantics: toggles sourceId's whole "unit" (see selectUnit) in or out
   * of the current selection as one block — shift-clicking any single grouped shape adds/removes
   * the entire group, never leaving it half-selected. No-op if removing would empty the selection
   * entirely (mirrors deleteShape()'s own "always keep at least one shape" rule — see
   * selectedSourceIds's own doc comment). */
  private toggleUnitSelection(sourceId: string): void {
    const timeline = this.ufoElement.sighting.timeline
    const unit = timeline.groupMembers(sourceId) ?? [sourceId]
    const unitFullySelected = unit.every(id => this.selectedSourceIds.has(id))
    if (unitFullySelected) {
      if (unit.length >= this.selectedSourceIds.size) return // would empty the selection
      for (const id of unit) this.selectedSourceIds.delete(id)
      if (!this.selectedSourceIds.has(this.currentSourceId)) {
        // Reassigns to the frontmost remaining selected id — deterministic, and consistent with
        // hitTest's own "topmost wins" convention elsewhere in this file.
        const order = timeline.sourceIds
        this.currentSourceId = [...this.selectedSourceIds].sort((a, b) => order.indexOf(a) - order.indexOf(b)).pop()!
      }
    } else {
      for (const id of unit) this.selectedSourceIds.add(id)
      this.currentSourceId = sourceId
    }
    this.refreshSourceList()
    this.onSelectionOrTimeChanged()
  }

  /** Right-click brings up a small menu (front/back/delete) for whichever shape is under the
   * pointer — selecting it first, same as a left click would, so all 3 actions below act on
   * the shape the menu was actually opened for rather than some unrelated prior selection.
   * Suppresses the browser's own native context menu unconditionally (even over empty canvas —
   * a witness right-clicking the sky shouldn't see the page's ordinary menu either), but only
   * shows ours when there's an actual shape to act on. */
  /** Right-clicking a 2D shape opens the SHAPE menu (group/ungroup/reorder/delete); right-clicking
   * a witness decor object — which lives in the 3D scene BEHIND the 2D canvas, not on it — opens
   * the separate DECOR menu instead (currently just "view testimony"). Both start from the same
   * contextmenu event on the 2D canvas since that transparent overlay always sits on top and
   * would otherwise swallow the event before the 3D layer underneath ever saw it (same reasoning
   * as SceneElement's own handlePointerMove). Neither menu can ever be open at the same time as
   * the other's own picked target, so closing both up front (harmless no-op if already hidden)
   * keeps a fast second right-click from ever showing two menus at once. */
  private onContextMenu(event: MouseEvent): void {
    event.preventDefault()
    if (this.isRecording || this.ufoElement.playbackState === "playing") return
    this.hideContextMenu()
    this.hideDecorContextMenu()
    const point = this.canvasPointFromEvent(event)
    if (!point) return
    const timeline = this.ufoElement.sighting.timeline
    const t = this.ufoElement.currentTime
    // Checked before the plain bounds-based hitTest below: a polygon vertex often sits exactly ON
    // (or, after real display/canvas-scale rounding, a hair outside) the shape's own bounding box
    // — e.g. every corner of the default "Polygon" preset — where hitTest's box-inclusion check
    // has zero margin for error. hitTestVertex's own generous circular tolerance is what makes
    // right-clicking a vertex to delete it actually work reliably at the shape's own edges/
    // corners, not just its interior. Only checked against the current single selection, same
    // scope onPointerDown's own vertex-hit-testing already has (you select a polygon before you
    // can grab one of its handles, vertex or otherwise).
    const selectedShape = this.selectedSourceIds.size === 1 ? timeline.getInterpolatedShapeAt(t, this.currentSourceId) : undefined
    const hitVertex = selectedShape?.kind === "polygon" && ShapeHandles.hitTestVertex(selectedShape, point) !== undefined
    const hit = hitVertex ? { sourceId: this.currentSourceId, shape: selectedShape! } : timeline.hitTest(t, point.x, point.y)
    if (hit) {
      // Same "don't collapse an already-selected member" rule as onPointerDown, so right-clicking
      // a shape that's part of the current multi-selection opens the menu for the whole selection.
      if (!this.selectedSourceIds.has(hit.sourceId)) this.selectUnit(hit.sourceId)
      this.currentSourceId = hit.sourceId
      this.contextMenuPoint = point
      this.showContextMenu(event.clientX, event.clientY)
      return
    }
    const decorId = this.pickDecorAt(event)
    const decor = decorId ? this.ufoElement.sighting.decor.find(d => d.id === decorId) : undefined
    // Every kind, not just "witness" (this menu's original and, until now, only reason to open —
    // see showDecorContextMenu's own doc comment) — the "Masks" flyout applies just as much to a
    // building/tree/streetlight/vehicle as to another witness marker.
    if (decor) this.showDecorContextMenu(event.clientX, event.clientY, decor)
  }

  /** Converts a pointer event's page position to normalized device coordinates (each in [-1,1],
   * as SceneRenderer.pickDecorAt expects) and picks against the 3D scene — same conversion
   * SceneElement's own handlePointerMove uses for pickBodyAt, duplicated rather than shared since
   * that one lives on a different element (SceneElement, not this one) reading its own canvas. */
  private pickDecorAt(event: MouseEvent): string | undefined {
    const canvas = this.ufoElement.canvasElement
    const rect = canvas.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return undefined
    const ndcX = ((event.clientX - rect.left) / rect.width) * 2 - 1
    const ndcY = -(((event.clientY - rect.top) / rect.height) * 2 - 1)
    return this.sceneElement.pickDecorAt(ndcX, ndcY)
  }

  private showContextMenu(clientX: number, clientY: number): void {
    this.contextMenu.style.left = `${clientX}px`
    this.contextMenu.style.top = `${clientY}px`
    this.contextMenu.hidden = false
    // Front/back reordering is meaningless with nothing else to reorder the selection against —
    // disabled when the selection already spans every known shape (checked first: trivially both
    // frontmost and backmost then, but "nothing else to reorder against" is the more useful
    // explanation than "already at the front"). Otherwise, each is disabled specifically when the
    // whole selection already occupies that end of the z-order — a no-op reorder, same reasoning
    // as the single-shape case this generalizes. Delete mirrors the toolbar button's own disabled
    // state (see onSelectionOrTimeChanged) — recording/playing already block the menu from opening
    // at all (see onContextMenu), so these are the only cases that matter here; otherwise clicking
    // a disabled-in-spirit item would silently do nothing (each handler still refuses either way)
    // with no visible explanation why.
    const sourceIds = this.ufoElement.sighting.timeline.sourceIds
    const selected = sourceIds.filter(id => this.selectedSourceIds.has(id))
    const nothingToReorderAgainst = sourceIds.length <= selected.length
    const isFrontmost = selected.length > 0 && sourceIds.slice(sourceIds.length - selected.length).every(id => this.selectedSourceIds.has(id))
    const isBackmost = selected.length > 0 && sourceIds.slice(0, selected.length).every(id => this.selectedSourceIds.has(id))
    this.contextBringToFrontButton.disabled = nothingToReorderAgainst || isFrontmost
    this.contextSendToBackButton.disabled = nothingToReorderAgainst || isBackmost
    this.contextBringToFrontButton.title = nothingToReorderAgainst ? this.messages.onlyOneShape : isFrontmost ? this.messages.alreadyAtFront : ""
    this.contextSendToBackButton.title = nothingToReorderAgainst ? this.messages.onlyOneShape : isBackmost ? this.messages.alreadyAtBack : ""

    this.contextGroupButton.disabled = this.selectedSourceIds.size < 2
    this.contextGroupButton.title = this.contextGroupButton.disabled ? this.messages.needTwoShapesToGroup : ""
    const grouped = this.ufoElement.sighting.timeline.groupMembers(this.currentSourceId) !== undefined
    this.contextUngroupButton.disabled = !grouped
    this.contextUngroupButton.title = grouped ? "" : this.messages.notGrouped

    this.contextDeleteButton.disabled = this.deleteShapeButton.disabled
    this.contextDeleteButton.title = this.contextDeleteButton.disabled ? this.messages.onlyOneShape : ""

    // Add/delete vertex only ever make sense for a single polygon selection — an oval has no
    // points at all, and a multi-selection has no single outline to edit. Delete further needs
    // the right-click to have actually landed near a real vertex (see contextMenuPoint's own doc
    // comment) and enough points left that removing one wouldn't drop below MIN_POLYGON_VERTICES.
    const currentShape = this.ufoElement.sighting.timeline.getInterpolatedShapeAt(this.ufoElement.currentTime, this.currentSourceId)
    const isSinglePolygon = this.selectedSourceIds.size === 1 && currentShape?.kind === "polygon"
    this.contextAddVertexButton.disabled = !isSinglePolygon
    this.contextAddVertexButton.title = isSinglePolygon ? "" : this.messages.notAPolygon
    const nearestVertex =
      isSinglePolygon && this.contextMenuPoint ? ShapeHandles.hitTestVertex(currentShape, this.contextMenuPoint) : undefined
    const tooFewVertices = isSinglePolygon && currentShape.points.length <= MIN_POLYGON_VERTICES
    this.contextDeleteVertexButton.disabled = !isSinglePolygon || nearestVertex === undefined || tooFewVertices
    this.contextDeleteVertexButton.title = !isSinglePolygon ? this.messages.notAPolygon : tooFewVertices ? this.messages.tooFewVertices : ""

    document.addEventListener("click", this.handleOutsideContextMenuClick)
  }

  private hideContextMenu(): void {
    this.contextMenu.hidden = true
    this.contextMenuPoint = undefined
    document.removeEventListener("click", this.handleOutsideContextMenuClick)
  }

  /** composedPath(), not event.target, for the same reason EyewitnessElement's own info-panel
   * outside-click handler uses it: target gets retargeted to the shadow host from outside this
   * element's own shadow boundary, losing the inside/outside distinction this needs. Registered
   * only while a menu is actually open (showContextMenu/showDecorContextMenu/hideContextMenu/
   * hideDecorContextMenu) — shared by both menus since only one is ever open at once (see
   * onContextMenu's own doc comment), so there's nothing to gain from two separate listeners. */
  private readonly handleOutsideContextMenuClick = (event: MouseEvent): void => {
    if (event.composedPath().includes(this.contextMenu) || event.composedPath().includes(this.decorContextMenu)) return
    this.hideContextMenu()
    this.hideDecorContextMenu()
  }

  /** The DECOR menu's own show/hide — see onContextMenu's own doc comment for why this is a
   * separate menu from the SHAPE one rather than folding a witness-only item into it. */
  private showDecorContextMenu(clientX: number, clientY: number, decor: DecorObject): void {
    this.contextMenuDecorId = decor.id
    this.decorContextMenu.style.left = `${clientX}px`
    this.decorContextMenu.style.top = `${clientY}px`
    this.decorContextMenu.hidden = false
    this.contextViewTestimonyButton.disabled = !decor.sightingUrl
    this.contextViewTestimonyButton.title = decor.sightingUrl ? "" : this.messages.noWitnessRecording
    this.refreshContextMasksSubmenu(decor)
    document.addEventListener("click", this.handleOutsideContextMenuClick)
  }

  private hideDecorContextMenu(): void {
    this.decorContextMenu.hidden = true
    this.contextMenuDecorId = undefined
    document.removeEventListener("click", this.handleOutsideContextMenuClick)
  }

  /** Rebuilds the "Masks" flyout with one checkbox per shape/source currently in the recording
   * (see Timeline.sourceIds), checked for whichever this decor object already occludes (see
   * DecorObject.occludesSourceIds's own doc comment for why this is per-shape rather than a single
   * flag). Rebuilt fresh on every menu open rather than kept incrementally in sync — the shape list
   * can change (add/delete/rename) between one open and the next, and this menu is only ever open
   * a moment at a time, so there's nothing to gain from a more incremental update. */
  private refreshContextMasksSubmenu(decor: DecorObject): void {
    this.contextMasksSubmenu.innerHTML = ""
    for (const sourceId of this.ufoElement.sighting.timeline.sourceIds) {
      const label = document.createElement("label")
      const checkbox = document.createElement("input")
      checkbox.type = "checkbox"
      checkbox.checked = decor.occludesSourceIds?.includes(sourceId) ?? false
      checkbox.addEventListener("change", () => this.updateDecorOccludesShape(decor.id, sourceId, checkbox.checked))
      label.appendChild(checkbox)
      label.appendChild(document.createTextNode(this.shapeLabel(sourceId)))
      this.contextMasksSubmenu.appendChild(label)
    }
  }

  /** Toggles whether decor object `decorId` occludes shape `sourceId` — see
   * DecorObject.occludesSourceIds's own doc comment. Reached only from the decor context menu's
   * "Masks" flyout (refreshContextMasksSubmenu); deliberately does NOT hide the menu afterward
   * (unlike every other decor-context-menu item), so more than one shape can be toggled in a
   * single open without the menu closing and having to be reopened between each click. */
  private updateDecorOccludesShape(decorId: string, sourceId: string, occludes: boolean): void {
    const sighting = this.ufoElement.sighting
    sighting.decor = sighting.decor.map(d => {
      if (d.id !== decorId) return d
      const next = occludes
        ? [...new Set([...(d.occludesSourceIds ?? []), sourceId])]
        : (d.occludesSourceIds ?? []).filter(id => id !== sourceId)
      return { ...d, occludesSourceIds: next.length > 0 ? next : undefined }
    })
    this.ufoElement.refresh()
  }

  /** Loads the right-clicked witness's own sighting.json — replacing this recording entirely,
   * same as typing its URL into the Observation group's "load from URL" field and clicking Load
   * (see importFromUrl, reused here with an explicit url rather than reading importUrlInput). */
  private viewWitnessTestimony(): void {
    const decor = this.ufoElement.sighting.decor.find(d => d.id === this.contextMenuDecorId)
    this.hideDecorContextMenu()
    if (decor?.sightingUrl) void this.importFromUrl(decor.sightingUrl)
  }

  /** Right-click "Add vertex" — inserts a new point on whichever edge of the current single
   * polygon selection is nearest to where the menu was opened (see ShapeHandles.insertVertexNear),
   * splitting the outline at that spot. Reads contextMenuPoint before hideContextMenu() clears it. */
  private addVertexAtContextMenu(): void {
    const point = this.contextMenuPoint
    this.hideContextMenu()
    if (!point) return
    const t = this.ufoElement.currentTime
    const shape = this.ufoElement.sighting.timeline.getInterpolatedShapeAt(t, this.currentSourceId)
    if (shape?.kind !== "polygon") return
    const updated = ShapeHandles.insertVertexNear(shape, point)
    this.ufoElement.sighting.timeline.addKeyframe(t, [{ sourceId: this.currentSourceId, shape: updated }])
    this.ufoElement.refresh()
  }

  /** Right-click "Delete vertex" — removes whichever vertex the menu was opened nearest to.
   * Re-derives the hit here (rather than caching an index found by showContextMenu) since that's
   * cheap and keeps a single source of truth; the menu's own disabled state already guarantees a
   * real hit existed when this became clickable at all. */
  private deleteVertexAtContextMenu(): void {
    const point = this.contextMenuPoint
    this.hideContextMenu()
    if (!point) return
    const t = this.ufoElement.currentTime
    const shape = this.ufoElement.sighting.timeline.getInterpolatedShapeAt(t, this.currentSourceId)
    if (shape?.kind !== "polygon") return
    const vertexIndex = ShapeHandles.hitTestVertex(shape, point)
    if (vertexIndex === undefined) return
    const updated = ShapeHandles.deleteVertex(shape, vertexIndex)
    this.ufoElement.sighting.timeline.addKeyframe(t, [{ sourceId: this.currentSourceId, shape: updated }])
    this.ufoElement.refresh()
  }

  /** Brings the whole selection to the front as a block, preserving the selected shapes' own
   * relative order — iterating them in their CURRENT z-order and bringing each to the front in
   * turn does this correctly, since Timeline.bringToFront always appends to the very end. */
  private bringSelectedToFront(): void {
    const timeline = this.ufoElement.sighting.timeline
    for (const sourceId of timeline.sourceIds.filter(id => this.selectedSourceIds.has(id))) {
      timeline.bringToFront(sourceId)
    }
    this.hideContextMenu()
    this.ufoElement.refresh()
  }

  /** Sends the whole selection to the back as a block, preserving relative order — the mirror of
   * bringSelectedToFront: iterating in REVERSE current z-order and prepending each in turn. */
  private sendSelectedToBack(): void {
    const timeline = this.ufoElement.sighting.timeline
    for (const sourceId of timeline.sourceIds.filter(id => this.selectedSourceIds.has(id)).reverse()) {
      timeline.sendToBack(sourceId)
    }
    this.hideContextMenu()
    this.ufoElement.refresh()
  }

  private groupSelected(): void {
    if (this.selectedSourceIds.size < 2) return
    this.ufoElement.sighting.timeline.group([...this.selectedSourceIds])
    this.hideContextMenu()
    this.ufoElement.refresh()
  }

  /** Collapses the selection down to just the anchor shape once ungrouped — without this, the
   * canvas looks completely unchanged (still every former member outlined + one shared group-bbox
   * handle overlay, since that rendering only checks selectedSourceIds.size, not whether they're
   * still a real Timeline group), so clicking Ungroup would have no visible effect at all. */
  private ungroupSelected(): void {
    this.ufoElement.sighting.timeline.ungroup(this.currentSourceId)
    this.selectedSourceIds = new Set([this.currentSourceId])
    this.hideContextMenu()
    this.ufoElement.refresh()
  }

  /** Starts a single-shape resize/rotate drag — only reachable when exactly one shape is
   * selected (a multi-selection's resize instead goes through the "group-resize" dragState kind,
   * started directly in onPointerDown). */
  private beginDrag(kind: "resize" | "rotate", sourceId: string, original: Shape, startPointer: { x: number; y: number }, handle: HandleId): void {
    this.dragState = { kind, sourceId, original, handle, startPointer }
    this.startDragListening()
  }

  /** Starts dragging the "landscape" (empty canvas, no shape under the pointer) to set the
   * observer's own heading/pitch — the mouse-drag equivalent of typing into the Orientation/Tilt
   * fields, so it goes through the exact same wrap/write/guard logic as those (updateObserver),
   * just fed computed values instead of parsing input.value strings. Also forces the compass
   * visible for the duration, same reasoning as the heading input's own focus/blur (see
   * SceneElement.setCompassForced): reading the heading off the compass is the point of dragging
   * to set it. */
  private beginCameraDrag(startPointer: { x: number; y: number }): void {
    const insideDecor = this.isWitnessInsideDecor()
    this.cameraDragState = {
      startPointer,
      startHeadingDeg: insideDecor ? this.indoorLookYawDeg : (this.numberOrUndefined(this.headingInput.value) ?? 0),
      startPitchDeg: insideDecor ? this.indoorLookPitchDeg : (this.numberOrUndefined(this.pitchInput.value) ?? 0),
      insideDecor
    }
    // The compass reads the OUTSIDE witnessTrack heading — meaningless while looking around
    // inside a decor object (a different reference frame, see SceneRenderer.setIndoorLook), so
    // it's only forced visible for an outside drag.
    if (!insideDecor) this.sceneElement.setCompassForced(true)
    // The only drag whose cursor differs from the hover cursor that led to it: hovering empty
    // canvas offers the landscape to grab ("pan"), pressing actually closes the hand on it.
    this.setCanvasCursor("panning")
    this.startDragListening()
  }

  /** Whether the recording witness is currently positioned inside a decor object — see
   * DecorObject.witnessSide's own doc comment. Mirrors SceneRenderer.updateDecorAnchoring's own
   * `inhabited` lookup exactly (same canHoldWitness gate) so this always agrees with which view
   * is actually being rendered. */
  private isWitnessInsideDecor(): boolean {
    return this.ufoElement.sighting.decor.some(d => d.witnessSide !== undefined && canHoldWitness(d.kind))
  }

  /** Resets indoorLookYawDeg/PitchDeg (and pushes the reset into SceneRenderer) whenever which
   * decor object/side is inhabited changes — a different window, or no longer inside one at all,
   * should always start centered rather than carrying over wherever the witness last happened to
   * be looking through a DIFFERENT window. Called every tick from onSelectionOrTimeChanged, same
   * "cheap enough not to need a dedicated dedup trigger" reasoning as syncDecorLitFromTimeline —
   * the string comparison below is what actually dedupes, so most ticks are a no-op. */
  private syncIndoorLookReset(): void {
    const inhabited = this.ufoElement.sighting.decor.find(d => d.witnessSide !== undefined && canHoldWitness(d.kind))
    const key = inhabited ? `${inhabited.id}:${inhabited.witnessSide}` : undefined
    if (key === this.lastInhabitedKey) return
    this.lastInhabitedKey = key
    this.indoorLookYawDeg = 0
    this.indoorLookPitchDeg = 0
    this.sceneElement.setIndoorLook(0, 0)
  }

  /** Shared by beginDrag/beginCameraDrag — document-level (not canvas-level, and not
   * Element.setPointerCapture) so a drag ends correctly even if the pointer leaves the canvas or
   * window before release, without depending on setPointerCapture's availability. */
  private startDragListening(): void {
    document.addEventListener("pointermove", this.handleDragPointerMove)
    document.addEventListener("pointerup", this.handleDragPointerUp)
  }

  private onDragPointerMove(event: PointerEvent): void {
    if (this.cameraDragState) {
      this.onCameraDragPointerMove(event)
      return
    }
    if (!this.dragState) return
    const point = this.canvasPointFromEvent(event)
    if (!point) return
    const t = this.ufoElement.currentTime
    // Writes straight through, spreading each original shape's appearance fields unchanged —
    // never routes through applyAppearanceAtPlayhead/buildAppearanceShape, so a
    // move/resize/rotate can't accidentally touch color/transparency/halo/preset.
    if (this.dragState.kind === "move") {
      const { sources, startPointer } = this.dragState
      const dx = point.x - startPointer.x
      const dy = point.y - startPointer.y
      const shapes = sources.map(({ sourceId, original }) => ({
        sourceId,
        shape: { ...original, bounds: { ...original.bounds, x: original.bounds.x + dx, y: original.bounds.y + dy } }
      }))
      this.ufoElement.sighting.timeline.addKeyframe(t, shapes)
    } else if (this.dragState.kind === "group-resize") {
      const { group, handle } = this.dragState
      this.ufoElement.sighting.timeline.addKeyframe(t, group.resize(handle, point))
    } else if (this.dragState.kind === "group-rotate") {
      const { group, startPointer } = this.dragState
      this.ufoElement.sighting.timeline.addKeyframe(t, group.rotate(point, startPointer))
    } else if (this.dragState.kind === "vertex") {
      const { sourceId, original, vertexIndex } = this.dragState
      const shape = ShapeHandles.moveVertex(original, vertexIndex, point)
      this.ufoElement.sighting.timeline.addKeyframe(t, [{ sourceId, shape }])
    } else {
      const { kind, sourceId, original, handle } = this.dragState
      const shape = kind === "resize" ? ShapeHandles.resizeShape(original, handle, point) : ShapeHandles.rotateShape(original, point)
      this.ufoElement.sighting.timeline.addKeyframe(t, [{ sourceId, shape }])
    }
    this.ufoElement.refresh()
  }

  private onCameraDragPointerMove(event: PointerEvent): void {
    if (!this.cameraDragState) return
    const point = this.canvasPointFromEvent(event)
    if (!point) return
    const { startPointer, startHeadingDeg, startPitchDeg, insideDecor } = this.cameraDragState
    // Computed from the fixed drag-start reference every time, not incrementally frame-to-frame —
    // see cameraDragState's own doc comment on why (avoids drift and misbehaving at the 360->0
    // heading wrap). Left/right drags the view right/left (a "grab the sky and pan it" feel);
    // up/down looks up/down, matching pitchDeg's own "positive = above horizontal" convention.
    const headingDeg = startHeadingDeg + (point.x - startPointer.x) * CAMERA_DRAG_DEG_PER_PX
    const pitchDeg = Math.max(-90, Math.min(90, startPitchDeg - (point.y - startPointer.y) * CAMERA_DRAG_DEG_PER_PX))
    if (insideDecor) {
      // Never touches witnessTrack/updateObserver — a different reference frame entirely (the
      // witness's real OUTSIDE recorded gaze), see SceneRenderer.setIndoorLook's own doc comment.
      this.indoorLookYawDeg = headingDeg
      this.indoorLookPitchDeg = pitchDeg
      this.sceneElement.setIndoorLook(headingDeg, pitchDeg)
      // setIndoorLook only stores the new offset — SceneRenderer.updateDecorAnchoring is what
      // actually applies it to camera.rotation, and that only runs from the next tick
      // (SceneElement.updateAstronomy, via this same refresh()). Without this call the drag would
      // silently update indoorLookYawDeg/PitchDeg but the camera itself would never visibly turn
      // until some UNRELATED tick happened to fire later — the real bug this fixes (found by
      // testing the drag end-to-end rather than just setIndoorLook in isolation).
      this.ufoElement.refresh()
      return
    }
    // Feeds the same field-parsing path updateObserver() already uses for typed input —
    // wrapDegrees() (called from within updateObserver) both normalizes headingDeg into [0,360)
    // and reflects that back into headingInput.value, so an unwrapped/out-of-range intermediate
    // value here (e.g. 372, or -15) is exactly as valid an input as anything a user could type.
    // A tenth of a degree is about a pixel across this canvas, and the drag recomputes from its own
    // fixed start reference every move (see above), so rounding what is shown cannot accumulate.
    this.headingInput.value = String(this.rounded(headingDeg))
    this.pitchInput.value = String(this.rounded(pitchDeg))
    this.updateObserver()
  }

  private endDrag(): void {
    if (!this.dragState && !this.cameraDragState) return
    if (this.cameraDragState && !this.cameraDragState.insideDecor) this.sceneElement.setCompassForced(false)
    this.dragState = undefined
    this.cameraDragState = undefined
    // Back to whatever the pointer was over before the drag started (see hoverCursor) — the next
    // real pointermove re-tests it properly, but a release with no move at all must not leave the
    // drag's own cursor behind (a grabbing hand over a landscape nobody is dragging any more).
    this.setCanvasCursor(this.hoverCursor)
    document.removeEventListener("pointermove", this.handleDragPointerMove)
    document.removeEventListener("pointerup", this.handleDragPointerUp)
  }

  /** Arrow keys nudge the selected shape's position; Shift+arrow resizes it instead — the
   * keyboard equivalent of dragging the body vs. a resize handle. Resize is center-anchored (grows/
   * shrinks both edges equally) rather than keeping one edge fixed: with no handle actually being
   * dragged there's no natural "which edge stays put" to mirror, and growing from the center reads
   * as the more predictable default for a symmetric shape. Same guards as every other shape edit
   * (no-op while recording or playing) and writes through addKeyframe at the current playhead,
   * exactly like a pointer drag would. */
  /** Applies the same plain-move or shift-resize delta this method already computes for one
   * shape's bounds to a whole ShapeBounds — shared by the single-shape and group-nudge branches
   * below (the group branch applies it to the group's own shared bbox, then scales every member
   * to match, via ShapeGroup — see moveOrResizeSelectedShapes). */
  private nudgeBounds(bounds: ShapeBounds, event: KeyboardEvent): ShapeBounds {
    const next: ShapeBounds = { ...bounds }
    if (event.shiftKey) {
      switch (event.key) {
        case "ArrowLeft":
          next.width = Math.max(MIN_SHAPE_SIZE, next.width - ARROW_KEY_STEP_PX)
          break
        case "ArrowRight":
          next.width += ARROW_KEY_STEP_PX
          break
        case "ArrowUp":
          next.height = Math.max(MIN_SHAPE_SIZE, next.height - ARROW_KEY_STEP_PX)
          break
        case "ArrowDown":
          next.height += ARROW_KEY_STEP_PX
          break
      }
      next.x -= (next.width - bounds.width) / 2
      next.y -= (next.height - bounds.height) / 2
    } else {
      switch (event.key) {
        case "ArrowLeft":
          next.x -= ARROW_KEY_STEP_PX
          break
        case "ArrowRight":
          next.x += ARROW_KEY_STEP_PX
          break
        case "ArrowUp":
          next.y -= ARROW_KEY_STEP_PX
          break
        case "ArrowDown":
          next.y += ARROW_KEY_STEP_PX
          break
      }
    }
    return next
  }

  /** Arrow keys nudge the selection's position; Shift+arrow resizes it instead — the keyboard
   * equivalent of dragging the body vs. a resize handle. Resize is center-anchored (grows/shrinks
   * both edges equally) rather than keeping one edge fixed: with no handle actually being dragged
   * there's no natural "which edge stays put" to mirror, and growing from the center reads as the
   * more predictable default for a symmetric shape (or, for a multi-selection, the group as a
   * whole). Same guards as every other shape edit (no-op while recording or playing) and writes
   * through addKeyframe at the current playhead, exactly like a pointer drag would. A single
   * selected shape is just the size-1 case of the same group-bounds math. */
  private moveOrResizeSelectedShapes(event: KeyboardEvent): void {
    if (this.isRecording || this.ufoElement.playbackState === "playing") return
    const timeline = this.ufoElement.sighting.timeline
    const t = this.ufoElement.currentTime
    const members = this.selectedMembers()
    if (members.length === 0) return
    event.preventDefault() // arrow keys otherwise scroll the page
    if (members.length === 1) {
      const { sourceId, shape } = members[0]
      // Writes straight through, spreading the original shape's appearance fields unchanged —
      // same reasoning as onDragPointerMove's own identical comment.
      timeline.addKeyframe(t, [{ sourceId, shape: { ...shape, bounds: this.nudgeBounds(shape.bounds, event) } }])
    } else {
      const group = new ShapeGroup(members)
      const target = this.nudgeBounds(group.bounds(), event)
      timeline.addKeyframe(t, group.scaleTo(target))
    }
    this.ufoElement.refresh()
  }

  /** Points the canvas's own `data-cursor` at whatever the pointer is over, so the cursor itself
   * advertises what a press would do there (move a shape, resize/rotate it, drag a vertex, pan
   * the view, ...) before the user commits to it. The stylesheet owns the actual cursor shapes —
   * this only ever names the target (see CanvasCursor). Skipped while recording (the whole canvas
   * is a drawing surface then, cursor already set once by toggleRecording) and for a drag's whole
   * duration (see hoverCursor). */
  private updateHoverCursor(event: PointerEvent): void {
    if (this.isRecording || this.dragState || this.cameraDragState) return
    this.hoverCursor = this.hoverCursorAt(event)
    this.setCanvasCursor(this.hoverCursor)
  }

  /**
   * What a pointerdown at this event's position would actually start — deliberately mirrors
   * onPointerDown's own hit-testing order and guards step for step (group handles before single-
   * shape ones, vertices before the bounding box they sit on, shapes before decor, decor before
   * the landscape behind it), since a cursor that promises an interaction the press then doesn't
   * deliver is worse than no cursor at all. While playing, every edit is refused (onPointerDown
   * returns early) and only selection remains, hence "select" rather than move/resize/rotate.
   */
  private hoverCursorAt(event: PointerEvent): CanvasCursor | undefined {
    const point = this.canvasPointFromEvent(event)
    if (!point) return undefined
    const timeline = this.ufoElement.sighting.timeline
    const t = this.ufoElement.currentTime
    const editable = this.ufoElement.playbackState !== "playing"
    if (editable) {
      if (this.selectedSourceIds.size > 1) {
        const handle = ShapeHandles.hitTestHandle({ bounds: new ShapeGroup(this.selectedMembers()).bounds(), angle: 0 }, point)
        // The group's own bounding box is never rotated (see ShapeHandles.groupBoundsFor), so its
        // handles resize along plain screen axes whatever its members' individual angles are.
        if (handle) return this.cursorForHandle(handle, 0)
      } else {
        const selected = timeline.getInterpolatedShapeAt(t, this.currentSourceId)
        if (selected?.kind === "polygon" && ShapeHandles.hitTestVertex(selected, point) !== undefined) return "vertex"
        const handle = selected && ShapeHandles.hitTestHandle(selected, point)
        if (selected && handle) return this.cursorForHandle(handle, selected.angle)
      }
    }
    if (timeline.hitTest(t, point.x, point.y)) return editable ? "move" : "select"
    if (this.pickDecorAt(event) !== undefined) return "select"
    return editable ? "pan" : undefined
  }

  private cursorForHandle(handle: HandleId, angle: number): CanvasCursor {
    return handle === "rotate" ? "rotate" : `resize-${ShapeHandles.resizeAxisFor(handle, angle)}`
  }

  /** Writes (or clears) the canvas's `data-cursor` — the single place this component touches the
   * cursor at all, so every cursor it can show is declared in one CSS block rather than scattered
   * across inline styles. */
  private setCanvasCursor(cursor: CanvasCursor | undefined): void {
    const canvas = this.ufoElement.canvasElement
    if (cursor) canvas.dataset.cursor = cursor
    else delete canvas.dataset.cursor
  }

  private onPointerMove(event: PointerEvent): void {
    if (!this.isRecording) {
      this.updateHoverCursor(event)
      return
    }
    const canvas = this.ufoElement.canvasElement
    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    this.recorder?.onPointerMove(x, y)
    this.ufoElement.renderer.clear(canvas.width, canvas.height)
    this.ufoElement.renderer.paintShape(
      moveShapeTo(this.buildPrototype({ x: 0, y: 0, width: DEFAULT_SHAPE_SIZE.width, height: DEFAULT_SHAPE_SIZE.height }), x, y)
    )
  }

  /** Converts a pointer event's CSS-pixel position into the canvas's fixed internal 640x360
   * drawing space (where Shape.bounds/hitTest/hitTestHandle operate), correcting for the
   * canvas being displayed responsively at a different CSS size — unlike onPointerMove's
   * recording-drag math above, which doesn't correct for this (pre-existing, left as is). */
  private canvasPointFromEvent(event: MouseEvent): { x: number; y: number } | undefined {
    const canvas = this.ufoElement.canvasElement
    const rect = canvas.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return undefined
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height
    }
  }
}

export const ELEMENT_NAME = "rr0-ufo-recorder"

export function register(): void {
  registerUfo()
  if (!customElements.get(ELEMENT_NAME)) {
    customElements.define(ELEMENT_NAME, UfoRecorderElement)
  }
}
