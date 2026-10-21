import { setupCloudEditor } from "./CloudEditor.js"
import type { BodyEditor } from "./BodyEditor.js"
import type { LaunchEditor } from "./LaunchEditor.js"
import type { BeamEditor } from "./BeamEditor.js"
import { AddMenu } from "./AddMenu.js"
import { SurroundingsPlanter } from "./SurroundingsPlanter.js"
import { MessageStyle } from "./MessageStyle.js"
import { SceneryDates } from "./SceneryDates.js"
import type { SurroundingsProvider } from "../render3d/terrain/SurroundingsProvider.js"
import { ParameterForm, ParameterTarget } from "./ParameterForm.js"
import { DecorParameterSets } from "../engine/model/DecorParameterSets.js"
import { DecorBase } from "../engine/model/DecorBase.js"
import type { DecorBaseContext } from "../engine/model/DecorBase.js"
import { DecorBaseParameterSets } from "../engine/model/DecorBaseParameterSets.js"
import { ElementList } from "./ElementList.js"
import type { ChoiceParameter, ParameterHolder } from "../engine/interpretation/Parameters.js"
import type { SightingFileEditor } from "./SightingFileEditor.js"
import type { JsonPath } from "./JsonPaths.js"
import { NumberFields } from "./NumberFields.js"
import type { BodyJson, BodyKeyframe } from "../engine/interpretation/Interpretation.js"
import { BLUR_RADIUS_UNIT } from "../render/CanvasRenderer.js"
import { SightingFetch, SightingFetchError } from "../engine/net/SightingFetch.js"
import { NARRATIVE_SOURCES } from "../engine/narrative/narrativeSources.js"
import { SightingAssessments } from "./SightingAssessments.js"
import { NarrativeError } from "../engine/narrative/NarrativeError.js"
import { DraftPatch } from "../engine/narrative/DraftPatch.js"
import { DraftRecording } from "../engine/narrative/DraftRecording.js"
import type { NarrativeDraft, NarrativeProvider } from "../engine/narrative/NarrativeProvider.js"
import type { Basis } from "../engine/persistence/Provenance.js"
import { html, css } from "./sightingEditorTemplate.js"
import { SightingSummary } from "./SightingSummary.js"
import type { SummaryEntry, SummaryGroup } from "./SightingSummary.js"
import { UfoElement, registerUfo } from "./UfoElement.js"
import { TimelineMarks } from "./TimelineMarks.js"
import type { TimelineMark } from "./TimelineMarks.js"
import { SceneElement, registerScene, SCENE_ELEMENT_NAME, SATELLITES_CHANGE_EVENT, FIREBALLS_CHANGE_EVENT } from "./SceneElement.js"
import type { SatellitePass } from "../engine/astronomy/SatellitePasses.js"
import { Recorder } from "../engine/record/Recorder.js"
import { RafSamplingClock } from "../engine/record/SamplingClock.js"
import { createShape, moveShapeTo } from "../engine/shape/Shape.js"
import { ApparentSize } from "../engine/shape/ApparentSize.js"
import { CaseFile } from "../engine/persistence/caseJson.js"
import { EdtfDateField } from "./EdtfDateField.js"
import { register as registerProviderSettings } from "./ProviderSettingsElement.js"
import type { ProviderSettingsElement } from "./ProviderSettingsElement.js"
import { ObserverProviders } from "../engine/observer/ObserverProviders.js"
import { register as registerPopoverPicker } from "./PopoverPickerElement.js"
import type { PopoverPickerElement, PickerNode } from "./PopoverPickerElement.js"
import { DATE_INPUT_ELEMENT_NAME, register as registerDateInput } from "./DateInputElement.js"
import { INPUT_FILE_ELEMENT_NAME, InputFileElement, register as registerInputFile, type InputFilePick } from "./InputFileElement.js"
import { DURATION_INPUT_ELEMENT_NAME, register as registerDurationInput } from "./DurationInputElement.js"
import type { DurationInputElement } from "./DurationInputElement.js"
import type { DateInputElement } from "./DateInputElement.js"
import type { SightingTime } from "../engine/model/Sighting.js"
import { ImageProjection } from "../engine/instrument/ImageProjection.js"
import { ObserverAge } from "../engine/model/ObserverAge.js"
import { INSTRUMENTS, Instruments } from "../engine/instrument/Instrument.js"
import type { Instrument, InstrumentCategory } from "../engine/instrument/Instrument.js"
import { LightRigs } from "../engine/model/LightRig.js"
import { DARK_SKY_LIMITING_MAGNITUDE, MeteorShowers } from "../engine/astronomy/MeteorShowers.js"
import { Comets } from "../engine/astronomy/Comets.js"
import { Filters } from "../engine/instrument/Filter.js"
import type { Filter } from "../engine/instrument/Filter.js"
import { LunarDisc } from "../engine/astronomy/LunarDisc.js"
import { RedMoon } from "../engine/astronomy/RedMoon.js"
import { SolarEclipse } from "../engine/astronomy/SolarEclipse.js"
import { Novae } from "../engine/astronomy/Novae.js"
import type { OutburstAppearance } from "../engine/astronomy/Novae.js"
import { Sporadics } from "../engine/astronomy/Sporadics.js"
import { Satellites } from "../engine/astronomy/Satellites.js"
import { ReentryArchive } from "../engine/astronomy/ReentryArchive.js"
import { FireballArchive } from "../engine/astronomy/FireballArchive.js"
import type { FireballSighting } from "../engine/astronomy/FireballArchive.js"
import type { ReentryCandidate } from "../engine/astronomy/ReentryArchive.js"
import { IceHalos } from "../engine/atmosphere/IceHalos.js"
import { Rainbows } from "../engine/atmosphere/Rainbows.js"
import type { BowForm } from "../engine/atmosphere/Rainbows.js"
import type { HaloForm } from "../engine/atmosphere/IceHalos.js"
import { computeBodyPosition, computeMoonPhase } from "../engine/astronomy/CelestialPositions.js"
import { NightSkyBrightness } from "../engine/atmosphere/NightSkyBrightness.js"
import { LIGHT_POLLUTION_SOURCES } from "../engine/atmosphere/lightPollutionSources.js"
import type { LightPollutionLookup, LightPollutionProvider } from "../engine/atmosphere/LightPollutionProvider.js"
import { LimitingMagnitude } from "../engine/instrument/LimitingMagnitude.js"
import { DEEP_STAR_CATALOG_MAGNITUDE_LIMIT } from "../render3d/StarCatalog.js"
import { visibleMagnitudeLimit } from "../render3d/skyColors.js"
import type { CometAppearance } from "../engine/astronomy/Comets.js"
import { SkyGlowVisibility } from "../engine/astronomy/SkyGlowVisibility.js"
import { resolveDecorPlacementAt } from "../engine/model/Decor.js"
import { SightingShapes } from "../engine/persistence/SightingShapes.js"
import { IdentityGuard, type IdentityFinding } from "../engine/persistence/IdentityGuard.js"
import type { Appearance, PolygonShape, Shape, ShapeBounds, ShapePresetId } from "../engine/shape/Shape.js"
import type { ShapeState } from "../engine/model/Keyframe.js"
import { ShapeHandles, ShapeGroup, MIN_SHAPE_SIZE, MIN_POLYGON_VERTICES } from "../engine/shape/ShapeHandles.js"
import type { HandleId, ResizeAxis } from "../engine/shape/ShapeHandles.js"
import type { SightingRecordingJson } from "../engine/persistence/sightingJson.js"
import { plainSightingJson } from "../engine/persistence/sightingJson.js"
import { DEFAULT_ICE_CRYSTAL_ALIGNMENT, DEFAULT_RARE_ICE_CRYSTALS } from "../engine/model/Weather.js"
import type { PrecipitationType, Weather } from "../engine/model/Weather.js"
import type { People } from "../engine/model/People.js"
import type { Account } from "../engine/model/Account.js"
import type { DecorObject } from "../engine/model/Decor.js"
import type { RecordingSource } from "../engine/model/RecordingSource.js"
import { sortedMilestones } from "../engine/model/Milestone.js"
import { DEFAULT_REFERENCE_FOV_DEG, DEFAULT_REFERENCE_OPACITY, REFERENCE_INLINE_WARNING_BYTES } from "../engine/model/Reference.js"
import type { PictureLandmark, ReferenceKind, SceneReference } from "../engine/model/Reference.js"
import type { InvestigatorTrace } from "../engine/model/Trace.js"
import type { KmlImportResult } from "../engine/interop/KmlImport.js"
import { PictureRegistration } from "../engine/reference/PictureRegistration.js"
import type { Vector3 } from "three"
import type { CanvasRenderer } from "../render/CanvasRenderer.js"
import type { PicturePoint } from "../engine/reference/PictureRegistration.js"
import { PanoramaxPictures } from "../engine/reference/PanoramaxPictures.js"
import type { StreetPicture } from "../engine/reference/PanoramaxPictures.js"
import {
  DEFAULT_BUILDING_FLOORS,
  defaultWindows,
  canHoldObserver,
  decorModelOf,
  DEFAULT_DECOR_MODEL
} from "../engine/model/Decor.js"
import {
  sightingDurationMs,
  sightingDurationBlockedReason,
  resolveSoundAt,
  resolveWeatherAt,
  resolveObserverPoseAt
} from "../engine/model/Sighting.js"
import { WeatherInference } from "../engine/weather/WeatherInference.js"
import type { WeatherInferenceResult } from "../engine/weather/WeatherInference.js"
import { defaultWeatherProvider } from "../engine/weather/defaultWeatherProvider.js"
import type { WeatherProvider } from "../engine/weather/WeatherProvider.js"
import { defaultPlaceProvider } from "../engine/place/defaultPlaceProvider.js"
import { PLACE_SOURCES } from "../engine/place/placeSources.js"
import { isRecordSource, WEATHER_SOURCES } from "../engine/weather/weatherSources.js"
import { UPPER_AIR_SOURCES } from "../engine/traffic/upperAirSources.js"
import { AIRCRAFT_SOURCES } from "../engine/traffic/aircraftSources.js"
import { SOUND_KINDS } from "../engine/model/Sound.js"
import type { SightingSound, SoundKind } from "../engine/model/Sound.js"
import { ELEVATION_SOURCES, IMAGERY_SOURCES } from "../render3d/terrain/terrainSources.js"
import { DECOR_MODEL_SOURCES } from "../render3d/decor/decorModelSources.js"
import { ModelPicker } from "./ModelPicker.js"
import type { ModelParameters } from "../engine/model/DecorTraits.js"
import { DecorTraits } from "../engine/model/DecorTraits.js"
import type { DecorModelEntry, DecorModelProvider } from "../render3d/decor/DecorModelProvider.js"
import { DecorSystem } from "../render3d/DecorSystem.js"
import { GroundElevation } from "../render3d/terrain/ElevationProvider.js"
import { TimeZones } from "../engine/time/TimeZones.js"
import { dataSourceById } from "../engine/source/DataSource.js"
import { FrozenDataPanel } from "./FrozenDataPanel.js"
import { SectionFilePanel } from "./SectionFilePanel.js"
import { FrozenGroups, RecordingSections, type FrozenData, type FrozenGroupName, type RecordingSectionName } from "../engine/model/FrozenData.js"
import { FrozenAnnexes } from "../render3d/terrain/frozen/FrozenAnnexes.js"
import type { FreezerSources } from "../render3d/terrain/frozen/TerrainFreezer.js"
import { defaultRailwayProvider, defaultRoadProvider, defaultWaterProvider } from "../render3d/terrain/defaultTerrainProviders.js"
import type { DataSource } from "../engine/source/DataSource.js"
import type { PlaceMatch, PlaceProvider } from "../engine/place/PlaceProvider.js"
import { sightingTimeToDate } from "../engine/astronomy/CelestialPositions.js"
import { HostLocale, selectLocale } from "../i18n/locale.js"
import { SaidTexts } from "../engine/model/SaidText.js"
import { SightingTags } from "./messages/TagNames.js"
import { TIME_ZONE_SOURCES } from "../engine/time/timeZoneSources.js"
import type { TimeZoneProvider } from "../engine/time/TimeZoneProvider.js"
import { loadSceneNames, loadSightingEditorMessages, loadTagNames, UFO_SUPPORTED_LANGUAGES } from "./messages/index.js"
import { SceneNaming } from "./messages/SceneNames.js"
import type { UfoLanguage } from "./messages/index.js"
import { sightingEditorMessages_en } from "./messages/SightingEditorMessages_en.js"
import type { SightingEditorMessages } from "./messages/SightingEditorMessages.js"
import { SummaryDescription } from "./SummaryDescription.js"

/** Hides nothing from a hit test: an occluded shape is still the author's to select, unlike a
 * reader's hover (see UfoElement.shapeAt's own default). */
const EMPTY_SOURCE_IDS: ReadonlySet<string> = new Set()

registerUfo()
registerScene()

const DEFAULT_SHAPE_SIZE = { width: 48, height: 28 }
/** How long a tuned sound keeps playing after the last edit to it — long enough to judge the
 * timbre against what was heard, short enough that a hum doesn't follow the observer around the
 * rest of the editor. Playback itself is unaffected: this only bounds the preview that plays while
 * paused (see UfoElement.previewSound). */
const SOUND_PREVIEW_MS = 2500

/** The least a body's frame spans on the canvas, px, so its handles stay apart — see bodyCanvasBounds. */
const MIN_BODY_FRAME_PX = 40

/** Where a new body stands along its shape's line of sight when the scene draws that shape at no
 * particular distance: close enough to be looked over before it is sent out to where it belongs,
 * which is how an author works (the user's own instruction). */
const DEFAULT_NEW_BODY_DISTANCE_M = 10

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

/** Sirius, and so the faintest threshold at which the word "star" still promises anything: under a
 * sky this bright, nothing in the catalogue clears it and the line says so instead of offering a
 * depth of minus three. */
const BRIGHTEST_STAR_MAGNITUDE = -1.46

/** How far a declared legal time zone may sit from its own longitude's solar time before the
 * recording is stating something no country has ever done. China's western edge, the widest real
 * case, is about 3 h — see updateUtcOffsetValidity on why this errs so far toward silence. */
const MAX_LEGAL_SOLAR_OFFSET_GAP_HOURS = 3
/** Mouse-drag-to-look sensitivity for the "landscape drag" — see beginCameraDrag. A full drag
 * across the canvas's own 640px internal width is ~130deg, a reasonable full sweep without being
 * so twitchy that fine-tuning a heading/pitch by hand becomes fiddly. */
const CAMERA_DRAG_DEG_PER_PX = 0.2
/** How far a decor object's heading turns per canvas pixel its rotation handle is dragged: a
 * heading wants the whole circle within a few drags, unlike the fine sweep of the view. */
const DECOR_ROTATE_DEG_PER_PX = 0.5
/** How far, in canvas pixels, a press may wander and still be a click rather than the start of a
 * drag of the view — a click on a decor object selects it, a drag turns the view. */
const CAMERA_DRAG_CLICK_TOLERANCE_PX = 3
/** How close two fields have to be to count as the same one, degrees. Only ever used to tell a
 * field NOBODY STATED — one this recorder wrote from an instrument's own optics — from one somebody
 * meant, so that changing the instrument may retune the first and must never touch the second. */
const SAME_FIELD_EPSILON_DEG = 0.01

/** A standing observer's eye height, the same 1.6 m SceneRenderer puts the camera at — what a pitch
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
const DEFAULT_APPEARANCE: Appearance = { presetId: "oval", color: "#39ff14", transparency: 0, haloScale: 1.5, blur: 0, brightness: 0 }

/** What the pointer is currently over on the canvas, as written to its own `data-cursor`
 * attribute — the canvas's contents are drawn, not DOM, so only script can hit-test them, but
 * every one of these names is turned into an actual cursor by a plain CSS rule (see
 * ufoTemplate's own canvas[data-cursor] block) rather than by assigning style.cursor here. */
/** What the canvas edits — see SightingEditorElement.canvasMode. */
type CanvasMode = "picture" | "shape" | "body" | "decor" | "scene"

/**
 * What a frame of handles on the picture edits. A body and a decor object are framed, sized and
 * turned the same way (see beginFrameDrag); they differ in what the numbers are written to, and in
 * what turning means: a body has a heading, a pitch and a roll, a decor object only a heading.
 */
interface FrameTarget {
  /** The frame on the canvas, in canvas pixels, when the thing is on the picture. */
  bounds(): ShapeBounds | undefined
  /** What it is sized at now, and how it is turned now, or nothing while it cannot be edited. */
  reading(): { sizeM: { widthM: number; lengthM: number; heightM: number }; attitude: { headingDeg: number; pitchDeg: number; rollDeg: number } } | undefined
  resize(sizeM: { widthM: number; lengthM: number; heightM: number }): void
  turnTo(attitude: { headingDeg: number; pitchDeg: number; rollDeg: number }): void
  /** Degrees of turn per canvas pixel dragged on the rotation handle. */
  rotateDegPerPx: number
}
type CanvasCursor = "record" | "select" | "move" | "vertex" | "pan" | "panning" | "landmark" | "rotate" | `resize-${ResizeAxis}`

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
/**
 * How far the Sun has to be down before the sky line bothers asking about the Milky Way and the
 * zodiacal light at all.
 *
 * The end of civil twilight. Above it there is no answer worth stating — a reader does not need
 * telling that a two-in-the-afternoon sighting had no Milky Way in it, and a line that said so on
 * every daylight case in an archive would be read past rather than read.
 */
const GLOW_QUESTION_LIVE_BELOW_DEG = -6

/**
 * How dark the sky has to have got, in magnitudes per square arcsecond, before "there was nothing to
 * see" stops being about the sky and starts being about where the two planes were standing.
 *
 * Twenty-one, one short of a natural dark sky: the brightest of the Milky Way is 21.0 and the best
 * of the zodiacal cone is brighter still, so a sky at 21 has already taken the band and left only
 * the cone. Under it the sentence blames the sky, over it the sentence blames the geometry, and both
 * are worth telling apart — one is an argument about the night, the other about the date.
 */
const GLOW_NEEDS_SKY_MAG_PER_ARCSEC2 = 21

/** Which way a press on the selected decor object carries it — see SightingEditorElement.decorMoveAxis. */
type DecorMoveAxis = "ground" | "east" | "north" | "up"

/** What a source picker needs to offer the recording's own file as a source (see SightingEditorElement.sourcePicker). */
interface FileChoice {
  /** The item of the Files group it links to. */
  item: string
  fromFile(): boolean
  setFromFile(fromFile: boolean): void
  label(): string
  where(): string
}

export class SightingEditorElement extends HTMLElement {
  private readonly shadow: ShadowRoot
  private readonly sceneElement: SceneElement
  private readonly ufoElement: UfoElement
  private readonly recordButton: HTMLButtonElement
  private readonly samplingRateInput: HTMLInputElement
  /** The kinds of shape the "+" of the shapes adds (see AddMenu): an oval or a polygon, which a shape keeps — another kind is another shape. */
  private shapeAddMenu!: AddMenu
  private readonly colorInput: HTMLInputElement
  private readonly transparencyInput: HTMLInputElement
  private readonly haloScaleInput: HTMLInputElement
  private readonly blurInput: HTMLInputElement
  private readonly brightnessInput: HTMLInputElement
  private readonly blurBoundOutput: HTMLElement
  private readonly sourceSelect: HTMLSelectElement
  private readonly shapeTitleInput: HTMLInputElement
  /** The observer's own reported size/distance for the selected shape — the pair that makes
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
  /**
   * Whether the number is what the author stated, and the zone only follows it — a typed offset — rather than the zone
   * deciding the number, which is what a zone picked or stated in a recording does. A date edit then moves the zone to
   * another that still reads the number, instead of letting the number drift with the old zone's rules.
   */
  private offsetIsAuthors = false
  /** The zone the place was last found to be in: what a typed offset is matched to first, since it is the zone the observer was most likely on. */
  private placeZone?: string
  /** The zone this element filled in itself, as opposed to one the author picked. Only its own
   * answer may be replaced when the place moves — what the author states outranks what a service
   * infers, the same rule the weather follows, and without this marker the two are
   * indistinguishable. In memory only: a saved file records the zone, not who chose it. */
  private autoFilledTimeZone?: string
  private readonly timeZones = new TimeZones()
  /** Three readings of one relation, apparent = f(real, distance) — see applyDistance for the
   * rule that keeps them in step, and sizeLock for which one a reader has pinned. */
  private readonly apparentWidthInput: HTMLInputElement
  private readonly realWidthInput: HTMLInputElement
  private readonly objectDistanceInput: HTMLInputElement
  private readonly sizeLockSelect: HTMLSelectElement
  private readonly apparentSizeOutput: HTMLElement
  /** Where the only meters a recording can honestly produce are shown — see refreshRealSize. */
  private readonly realSizeOutput: HTMLElement
  private readonly clearDistanceHypothesisButton: HTMLButtonElement
  /** Where the shape is drawn right now and on what basis — see refreshDepth. */
  private readonly depthBasisOutput: HTMLElement
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
  private readonly contextViewAccountButton: HTMLButtonElement
  /** The "Masks ▸" flyout's own container — rebuilt fresh (refreshContextMasksSubmenu) every time
   * the decor context menu opens, see DecorObject.occludesSourceIds's own doc comment. */
  private readonly contextMasksSubmenu: HTMLElement
  private readonly labelContextMasks: HTMLElement
  // External playback row — see the constructor's ufoElement.showToolbar comment for why this
  // recorder drives its own controls instead of the nested ufo's overlaid ones.
  private readonly playPauseButton: HTMLButtonElement
  private readonly seekInput: HTMLInputElement
  private readonly previousMarkButton: HTMLButtonElement
  private readonly nextMarkButton: HTMLButtonElement
  private readonly timelineMarks: TimelineMarks
  private readonly timeStartLabel: HTMLElement
  private readonly timeEndLabel: HTMLElement
  private readonly durationInput: HTMLInputElement
  /** Which way the account is drawn and edited: its shapes (2D) or its bodies (3D) — see syncBodiesShown. */
  private readonly accountViewSelect: HTMLSelectElement
  /** The duration, exact or as stated: its number always holds the length the simulation is played at. */
  private readonly durationElement: DurationInputElement
  private readonly exportButton: HTMLButtonElement
  /** The File group's account of the data frozen beside the recording, and what takes it at export. */
  private readonly frozenPanel: FrozenDataPanel
  /** The Files group's account of the recording's weather, kept inside it or beside it. */
  private readonly sectionFilePanel: SectionFilePanel
  /** The Files group's picker: the recording, then each annex (see refreshFileItems). */
  private readonly fileItemSelect: HTMLSelectElement
  /** Where a recording comes in: a file of the author's, or an address (see InputFileElement). */
  private readonly importInput: InputFileElement
  private readonly narrativeSourceRow: HTMLElement
  private readonly narrativeSettingsBox: HTMLElement
  /** The inputs the current provider's settings were rendered into, by setting id. */
  private narrativeSettingInputs = new Map<string, HTMLInputElement | HTMLSelectElement>()
  private readonly narrativeRememberInput: HTMLInputElement
  private readonly narrativeDraftButton: HTMLButtonElement
  private readonly narrativeStopButton: HTMLButtonElement
  private readonly narrativeStatus: HTMLElement
  private readonly narrativeReport: HTMLElement
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
  /** The degree sign after the heading field, with the compass point it names: "° (SSE)". */
  private readonly headingUnit: HTMLElement
  private readonly pitchInput: HTMLInputElement
  private readonly rollInput: HTMLInputElement
  private readonly swayInput: HTMLInputElement
  private readonly lightPollutionInput: HTMLInputElement
  private readonly lightPollutionStatusText: HTMLElement
  private readonly lightPollutionSourceRow: HTMLElement
  private readonly elevationInput: HTMLInputElement
  private readonly groundElevationOutput: HTMLElement
  /** The ground's own height above sea level at the current location, once it is known — what the
   * Altitude field is measured from (see applyGroundElevation). Undefined while it isn't known, and
   * then the field is a plain height above an unstated datum, exactly as it always was. */
  /**
   * Whether the weather SHOULD be read from records, as last decided — by the observer's own toggle,
   * or by what a loaded recording says (see syncWeatherOwnership). Deliberately distinct from the
   * checkbox's own state, which is this AND whether a lookup is possible at all: a sighting with no
   * date or no place shows it unchecked, because a ticked box there would claim a record is being
   * read when nothing has been asked. It ticks itself again the moment the sighting says enough,
   * without forgetting a observer who had turned it off.
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
  private startDate!: DateInputElement
  private endDate!: DateInputElement
  private readonly obsEndTimeInput: HTMLInputElement
  private readonly observerIdInput: HTMLInputElement
  private readonly observerTitleInput: HTMLInputElement
  private readonly observerLastNameInput: HTMLInputElement
  private readonly observerFirstNamesInput: HTMLInputElement
  private readonly observerAgeInput: HTMLInputElement
  private readonly observerOccupationInput: HTMLInputElement
  private readonly accountSourceSelect: HTMLSelectElement
  private readonly accountUrlInput: HTMLInputElement
  private readonly labelAccountUrl: HTMLElement
  private readonly accountFollowedUpSelect: HTMLSelectElement
  private readonly sightingIdInput: HTMLInputElement
  private readonly descriptionInput: HTMLTextAreaElement
  private readonly tagsInput: HTMLInputElement
  private readonly cloudEditor: ReturnType<typeof setupCloudEditor>
  /** The Bodies part, loaded the first time it is opened — see loadBodyEditor. */
  private bodyEditor?: BodyEditor
  private bodyEditorLoading?: Promise<BodyEditor>
  /** The Launches part, loaded the first time it is opened — see loadLaunchEditor. */
  private launchEditor?: LaunchEditor
  private launchEditorLoading?: Promise<LaunchEditor>
  /** The Beams part, loaded the first time it is opened — see loadBeamEditor. */
  private beamEditor?: BeamEditor
  private beamEditorLoading?: Promise<BeamEditor>
  /** The File group's text editor, loaded the first time the group is opened — see loadFileEditor. */
  private fileEditor?: SightingFileEditor
  private fileEditorLoading?: Promise<SightingFileEditor>
  private readonly fileEditorHost: HTMLElement
  private readonly fileNote: HTMLElement
  private readonly fileAsk: HTMLDialogElement
  private readonly identityAsk: HTMLDialogElement
  /** Waiting to put the form's changes into the text, and the text's into the form — see syncFileEditor. */
  private fileSyncTimer?: ReturnType<typeof setTimeout>
  private fileApplyTimer?: ReturnType<typeof setTimeout>
  /**
   * The recording's text as the history last saw it: what the form said when the last step was written into
   * the File group's editor, whose own history is the undo. Undefined until the author first touches the form
   * (see armHistory), and again on loading another recording.
   */
  private historySnapshot?: string
  private historyTimer?: ReturnType<typeof setTimeout>
  /** Set after an undo or a redo, until the next real edit: the form may spell the text it was given
   * differently, and writing that spelling back into the editor would be a new step, and end the redo. */
  private historyAnswering = false
  private readonly undoButton: HTMLButtonElement
  private readonly redoButton: HTMLButtonElement
  private readonly labelFileGroup: HTMLElement
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
  private readonly showNovaButton: HTMLButtonElement
  private readonly showSatelliteButton: HTMLButtonElement
  private readonly showFireballButton: HTMLButtonElement
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
  private readonly instrumentSelect: PopoverPickerElement
  private readonly filterSelect: HTMLSelectElement
  private readonly labelFilter: HTMLElement
  /** What that instrument was SET to. Each writes the pose at the playhead, exactly as the
   * heading and the pitch do, and each is disabled when the device leaves nothing to set — see
   * syncOpticsFromInstrument. */
  private readonly focalLengthInput: HTMLInputElement
  private readonly labelFocalLength: HTMLElement
  /** What field a fixed lens takes in, read beside its millimetres — see syncOpticsFromInstrument. */
  private readonly focalFovOutput: HTMLOutputElement
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
  private readonly labelBlur: HTMLElement
  private readonly labelBrightness: HTMLElement
  private readonly labelShapeTitle: HTMLElement
  private readonly labelUtcOffset: HTMLElement
  private readonly labelApparentWidth: HTMLElement
  private readonly labelRealWidth: HTMLElement
  private readonly labelObjectDistance: HTMLElement
  private readonly labelSizeLock: HTMLElement
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
  private readonly labelRoll: HTMLElement
  private readonly labelSway: HTMLElement
  private readonly labelLightPollution: HTMLElement
  private readonly labelElevation: HTMLElement
  private readonly labelObservationTime: HTMLElement
  private readonly labelObservationEndTime: HTMLElement
  private readonly labelObserverId: HTMLElement
  private readonly labelObserverTitle: HTMLElement
  private readonly labelObserverLastName: HTMLElement
  private readonly labelObserverFirstNames: HTMLElement
  private readonly labelObserverAge: HTMLElement
  private readonly labelObserverBirth: HTMLElement
  private birthDate!: DateInputElement
  private perceptionSettings!: ProviderSettingsElement
  /** What the birth field says now: the date input only reports it by event, never back. */
  private birth?: SightingTime
  private readonly labelObserverOccupation: HTMLElement
  private readonly labelAccountSource: HTMLElement
  private readonly labelAccountFollowedUp: HTMLElement
  private readonly labelSightingId: HTMLElement
  private readonly labelDescription: HTMLElement
  private readonly labelTags: HTMLElement
  private readonly labelImportFile: HTMLElement
  /**
   * Set by whoever holds this recording as a reading of another (see CaseEditorElement): it has no
   * shape of its own, and its bodies are all there is to see, even while the Shapes part is open.
   */
  get reading(): boolean {
    return this.isReading
  }

  set reading(reading: boolean) {
    this.isReading = reading
    this.syncBodiesShown()
  }

  private isReading = false
  /** The shapes a body of this recording can stand for when they are not its own: those of the account it reads. */
  accountShapeIds?: readonly string[]
  private readonly labelNarrativeSource: HTMLElement
  private readonly labelNarrativeRemember: HTMLElement
  private readonly groupTabs: HTMLButtonElement[]
  private readonly groupPanels: HTMLElement[]
  private readonly paramSummary: HTMLElement
  /** Rebuilt on a language change, since the labels it holds are the ones it was made with. */
  private paramSummaryBuilder: SightingSummary
  /** What the summary last rendered, so the rebuild can be skipped when nothing it shows has
   * changed. onSelectionOrTimeChanged — where the refresh hangs — also runs on every playhead
   * tick during playback, and a summary is 75 fields wide: reading them is cheap, replacing the
   * DOM sixty times a second while the author is trying to click one of the chips is not. */
  private paramSummarySignature = ""
  private readonly labelShapeGroup: HTMLElement
  private readonly labelTemporalGroup: HTMLElement
  private readonly labelLocationGroup: HTMLElement
  private readonly labelObservationGroup: HTMLElement
  private readonly labelObserverGroup: HTMLElement
  private readonly labelWeatherGroup: HTMLElement
  private readonly labelCloudCover: HTMLElement
  private readonly labelHighCloud: HTMLElement
  private readonly labelIceAlignment: HTMLElement
  private readonly labelRareIce: HTMLElement
  private readonly highCloudCoverInput: HTMLInputElement
  /** The one weather control no record can fill in — see Weather.iceCrystalAlignment. */
  private readonly iceCrystalAlignmentInput: HTMLInputElement
  /** Stated, never looked up, like the alignment — see Weather.rareIceCrystals. */
  private readonly rareIceCrystalsInput: HTMLInputElement
  private readonly labelCloudDarkness: HTMLElement
  private readonly labelCloudBase: HTMLElement
  private readonly labelPrecipitationType: HTMLElement
  private readonly labelPrecipitationIntensity: HTMLElement
  private readonly labelWindDirection: HTMLElement
  private readonly labelWindSpeed: HTMLElement
  private readonly labelStorm: HTMLElement
  private readonly labelCloudsGroup: HTMLElement
  private readonly labelShapesSubgroup: HTMLElement
  private readonly labelBodiesSubgroup: HTMLElement
  private readonly labelLaunchesSubgroup: HTMLElement
  private readonly labelBeamsSubgroup: HTMLElement
  private readonly labelPrecipitationGroup: HTMLElement
  private readonly labelWindGroup: HTMLElement
  /** The handles of a group's own parts (the weather's clouds, precipitation and wind) — a strip
   * inside the panel that works like the groups' strip, one part open at a time. */
  private readonly subgroupTabs: HTMLButtonElement[]
  private readonly labelWeatherInferred: HTMLElement
  /** Where the weather is read from: a record (ticks weatherInferredInput) or the recording's file (unticks it). */
  private readonly weatherProviderSelect: HTMLSelectElement
  private readonly weatherFileLink: HTMLButtonElement
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
  /** The picker of the decor objects, what acts on the selected one, and the adding of another (see ElementList). */
  private readonly decorList: ElementList
  /** The observers of the Observer group: this account's own, then the other observers the scene places (see refreshObserverList). */
  private readonly observerList: ElementList
  /** Which observer the Observer group shows: OBSERVER_PRINCIPAL for this account's own, else the id of an observer of the decor. */
  private observerShown = "principal"
  private static readonly OBSERVER_PRINCIPAL = "principal"
  /** The trees and buildings taken, by itself, from a survey of the place the author gives (see SurroundingsPlanter), whose code is loaded when first needed. */
  private readonly surroundings: SurroundingsPlanter
  /** The survey the scenery is taken from, when one is chosen for it; else the one that covers the place (see surroundingsSources). Mainly for tests. */
  surroundingsProvider?: SurroundingsProvider
  private readonly sceneryStatus: HTMLElement
  /** Which survey the scenery is taken from: one of the registry's (see SURROUNDINGS_SOURCES), or none. */
  private readonly scenerySource: HTMLSelectElement
  private readonly labelScenerySource: HTMLElement
  private readonly sceneryWarning: HTMLElement
  private readonly sceneryRadius: HTMLInputElement
  private readonly labelSceneryRadius: HTMLElement
  /** The id of the survey the author chose, "none" for none; undefined while they have not chosen, which is the registry's first. */
  private sceneryChoice?: string
  /** Which set of lamps the selected decor object carries — see LightRig.ts. Rebuilt for each
   * selection, since the rigs that make sense on a tree are not the ones that make sense on an
   * aircraft. */
  /** Which catalogue the 3D-model picker offers, and which the scene resolves a named model
   * through — chosen in Data sources like every other real-world source (see refreshSourceRows). */
  private decorModelProvider: DecorModelProvider = DECOR_MODEL_SOURCES[0].create()
  private readonly milestoneSelect: HTMLSelectElement
  private readonly milestoneLabelInput: HTMLInputElement
  private readonly milestoneNoteInput: HTMLInputElement
  private readonly addMilestoneButton: HTMLButtonElement
  private readonly deleteMilestoneButton: HTMLButtonElement
  private readonly goToMilestoneButton: HTMLButtonElement
  /** Which named moment the two fields are editing, by its own time — the only thing that
   * identifies one, since two moments can share a label and neither has an id. Undefined when the
   * recording names none. */
  private currentMilestoneT?: number
  /** The properties the selected object's kind publishes beyond placement and size — floors, windows, a bridge's railing —
   * drawn by the generic form (see DecorParameterSets), and which set it was last drawn for. */
  private readonly decorParameterForm: ParameterForm
  /** The base properties of the selected object (name, place, heading, colour, measures) and its state (lit, lamps, seat), drawn by the
   * generic form from DecorBaseParameterSets: built when an object is first selected, then only re-read. */
  private readonly decorBaseForm: ParameterForm
  private readonly decorStateForm: ParameterForm
  private readonly decorBaseHost: HTMLElement
  private readonly decorStateHost: HTMLElement
  private decorBaseShown = false
  private readonly decorParametersHost: HTMLElement
  private decorParametersShownFor?: string
  /** The Decor group's own handle in the tab strip — reuses the same "Decor" text as labelDecor
   * (the object-picker's own label), just on a different element, so no separate message key is
   * needed. */
  private readonly labelDecorGroup: HTMLElement
  private readonly labelMilestones: HTMLElement
  private readonly labelMilestoneLabel: HTMLElement
  private readonly labelMilestoneNote: HTMLElement

  private recorder?: Recorder
  private isRecording = false
  /** Matches the template's baked-in English defaults until (if ever) loadLocaleMessages()
   * resolves a better match — see its doc comment. */
  private messages: SightingEditorMessages = sightingEditorMessages_en
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
  /** The Pictures group — pictures of the place laid over the scene, see SceneReference. One set of
   * fields for whichever is selected, the same arrangement as the decor's. */
  private currentReferenceId?: string
  private readonly referenceSelect: HTMLSelectElement
  private readonly deleteReferenceButton: HTMLButtonElement
  private readonly referenceTitleInput: HTMLInputElement
  /** Where the selected picture is: embedded from a file of the author's, or at an address (see InputFileElement). */
  private readonly referenceSourceInput: InputFileElement
  private readonly referenceKindSelect: HTMLSelectElement
  private readonly referenceCreditInput: HTMLInputElement
  private readonly referenceCreditUrlInput: HTMLInputElement
  private readonly referenceTInput: HTMLInputElement
  private readonly referenceDrawingInput: HTMLInputElement
  private readonly referenceOpacityInput: HTMLInputElement
  private readonly referenceHeadingInput: HTMLInputElement
  private readonly referencePitchInput: HTMLInputElement
  private readonly referenceRollInput: HTMLInputElement
  private readonly referenceFovInput: HTMLInputElement
  private readonly referenceUsePoseButton: HTMLButtonElement
  private readonly referenceStatus: HTMLElement
  private readonly addReferenceButton: HTMLButtonElement
  /** Where the picture the "+" of the pictures adds comes from, picked in the menu it opens (see AddMenu). */
  private readonly referenceAddMenu: AddMenu
  private readonly referenceLandmarksSelect: HTMLSelectElement
  private readonly addReferenceLandmarkButton: HTMLButtonElement
  private readonly deleteReferenceLandmarkButton: HTMLButtonElement
  private readonly referenceLandmarkLabelInput: HTMLInputElement
  private readonly labelReferenceLandmarks: HTMLElement
  private readonly labelReferenceLandmarkLabel: HTMLElement
  private readonly referenceAdoptPoseButton: HTMLButtonElement
  /** Where investigator's lines are read from (see InputFileElement), shown by the "+" of the lines. */
  private readonly traceImportInput: InputFileElement
  private readonly traceSelect: HTMLSelectElement
  private readonly deleteTraceButton: HTMLButtonElement
  private readonly traceTitleInput: HTMLInputElement
  private readonly traceSourceInput: HTMLInputElement
  private readonly traceStatus: HTMLElement
  private readonly labelTraceImport: HTMLElement
  private readonly addTraceButton: HTMLButtonElement
  private readonly labelTraceTitle: HTMLElement
  private readonly labelTraceSource: HTMLElement
  private currentTraceId?: string
  private readonly referenceStreetSelect: HTMLSelectElement
  private readonly referenceStreetAddButton: HTMLButtonElement
  /** What the canvas last handed itself to — see canvasMode; kept so leaving a mode can undo
   * what entering it did (the cursor, click-to-play). */
  private lastCanvasMode: CanvasMode = "shape"
  /** A drag on the picture: turning it from a fixed start so nothing drifts (see cameraDragState),
   * or moving one end of one of its landmarks — see beginReferenceDrag. */
  private referenceDragState?:
    | { kind: "picture"; startPointer: { x: number; y: number }; startHeadingDeg: number; startPitchDeg: number; moved: boolean }
    | { kind: "anchor"; landmarkId: string; end: "picture" | "scene" }
  /** Naming a landmark is an explicit gesture: "Add a landmark" arms the next two clicks, the first
   * on the picture (kept here until the second), the second in the render — see nameLandmarkAt. */
  private armingLandmark = false
  private pendingLandmark?: PicturePoint
  private currentLandmarkId?: string
  private referenceFit?: { n: number; residualDeg: number }
  /** What the street-level lookup last found, in the order the dropdown shows. */
  private streetPictures: StreetPicture[] = []
  private readonly streetPictures$ = new PanoramaxPictures()
  /** Every field the selected picture is read from — listened to as one, like the sound's. */
  private readonly referenceFields: (HTMLInputElement | HTMLSelectElement)[]
  private readonly labelReferenceGroup: HTMLElement
  private readonly labelReferenceTitle: HTMLElement
  private readonly labelReferenceSrc: HTMLElement
  private readonly labelReferenceKind: HTMLElement
  private readonly labelReferenceCredit: HTMLElement
  private readonly labelReferenceCreditUrl: HTMLElement
  private readonly labelReferenceT: HTMLElement
  private readonly labelReferenceDrawing: HTMLElement
  private readonly labelReferenceOpacity: HTMLElement
  private readonly labelReferenceHeading: HTMLElement
  private readonly labelReferencePitch: HTMLElement
  private readonly labelReferenceRoll: HTMLElement
  private readonly labelReferenceFov: HTMLElement
  /** Which decor object the DECOR context menu (right-click on the 3D canvas, distinct from the
   * SHAPE context menu's own currentSourceId) currently targets — set by onContextMenu, read by
   * viewObserverAccount(). Only ever set while decorContextMenu is actually open. */
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
    | { kind: "body"; pointerAzimuthDeg: number; pointerAltitudeDeg: number; bodyAzimuthDeg: number; bodyAltitudeDeg: number }
    | { kind: "frame-resize"; target: FrameTarget; handle: Exclude<HandleId, "rotate">; centre: { x: number; y: number }; startPointer: { x: number; y: number }; startSizeM: { widthM: number; lengthM: number; heightM: number } }
    | { kind: "frame-rotate"; target: FrameTarget; startPointer: { x: number; y: number }; startAttitude: { headingDeg: number; pitchDeg: number; rollDeg: number } }
    | { kind: "decor-move"; id: string; startEastM: number; startNorthM: number; startGround: { x: number; z: number }; grabHeightM: number; axis: DecorMoveAxis; startAltitudeM: number; startNdcY: number; metresPerNdcY: number }
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
    /** Whether this drag started while the observer is inside a decor object (see
     * isObserverInsideDecor) — routes the drag into indoorLookYawDeg/PitchDeg + SceneElement.
     * setIndoorLook instead of observerTrack/updateObserver, since the outside observerTrack pose
     * is a different reference frame entirely (see SceneRenderer.setIndoorLook's own doc
     * comment) — checked once at drag-start rather than every pointermove so a drag that happens
     * to cross the moment observerSide gets cleared mid-drag doesn't switch targets partway. */
    insideDecor: boolean
    /** The decor object the press landed on, if any: a press that is released without moving is a
     * click on it and selects it; one that moves turns the view, as it does over bare sky or ground. */
    pressedDecorId?: string
    /** The body the press landed on, if any: released without moving, it is selected in the Bodies part of the Phenomenon group. */
    pressedBodyId?: string
    /** Whether the pointer has left the press point by more than a click's jitter. */
    moved?: boolean
  }

  /** Whatever the pointer was last hovering over the canvas (see updateHoverCursor) — remembered
   * only so endDrag can put it back: hover detection is deliberately frozen for a drag's whole
   * duration (the cursor must keep saying "resizing"/"rotating" even as the pointer wanders off
   * the handle it grabbed, which is exactly what dragging one does), so releasing needs the
   * pre-drag answer rather than a fresh hit test the pointer may not have moved to trigger. */
  private hoverCursor?: CanvasCursor

  /** How far the observer has turned their head from center while looking through a decor
   * object's window — mirrors cameraDragState's own startHeadingDeg/startPitchDeg role, just for
   * the indoor-look case (see SceneRenderer.setIndoorLook). Reset to 0 by syncIndoorLookReset
   * whenever the inhabited object/side changes. */
  private indoorLookYawDeg = 0
  private indoorLookPitchDeg = 0
  /** `${decor.id}:${observerSide}` of whichever decor object is currently inhabited, or undefined
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
      if (this.armingLandmark || this.pendingLandmark) this.disarmLandmark()
      if (!this.contextMenu.hidden) this.hideContextMenu()
      if (!this.decorContextMenu.hidden) this.hideDecorContextMenu()
    }
    if ((event.ctrlKey || event.metaKey) && !event.altKey && ["z", "y"].includes(event.key.toLowerCase())) {
      // The editor's own fields and the text editor keep their own undo: this is the recording's.
      const target = event.composedPath()[0]
      if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement) return
      if (target instanceof HTMLElement && (target.isContentEditable || target.closest(".cm-editor"))) return
      event.preventDefault()
      if (event.key.toLowerCase() === "y" || event.shiftKey) this.redo()
      else this.undo()
      return
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
      // The File group's text editor is a contenteditable, not one of those: its arrows and Delete are the text's.
      if (target instanceof HTMLElement && (target.isContentEditable || target.closest(".cm-editor"))) return
      if (ARROW_KEYS.has(event.key)) {
        this.moveOrResizeSelectedShapes(event)
      } else {
        // deleteShape() and deleteDecor() are the single entry points every deletion path
        // (this key, the toolbar button, the context menu) funnels through. What the key deletes is what the canvas is editing: the decor
        // object framed in the Environment group, the shapes elsewhere.
        if (this.canvasMode() === "decor") this.deleteDecor()
        else this.deleteShape()
      }
    }
  }
  private readonly handleDragPointerMove = (event: PointerEvent) => this.onDragPointerMove(event)
  /** Ends the drag; a press on a decor object that never moved was a click on it, and selects it —
   * here and not in endDrag, which also runs when a recording is loaded mid-press. */
  private readonly handleDragPointerUp = () => {
    const clicked = this.cameraDragState && !this.cameraDragState.moved ? this.cameraDragState.pressedDecorId : undefined
    const clickedBody = this.cameraDragState && !this.cameraDragState.moved ? this.cameraDragState.pressedBodyId : undefined
    this.endDrag()
    if (clickedBody !== undefined) this.showBody(clickedBody)
    if (clicked !== undefined) {
      this.selectDecor(clicked)
      this.revealDecorPanel()
    }
  }

  constructor() {
    super()
    this.shadow = this.attachShadow({ mode: "open" })
    const template = document.createElement("template")
    template.innerHTML = `<style>${css}</style>${html}`
    this.shadow.appendChild(template.content.cloneNode(true))
    // The dates are elements that make their own controls, and an element of a template that is not yet in a page is
    // not upgraded until it is: made now, since the controls are looked up below.
    customElements.upgrade(this.shadow)
    for (const date of this.shadow.querySelectorAll<DateInputElement>(DATE_INPUT_ELEMENT_NAME)) date.build()
    for (const duration of this.shadow.querySelectorAll<DurationInputElement>(DURATION_INPUT_ELEMENT_NAME)) duration.build()
    for (const input of this.shadow.querySelectorAll<InputFileElement>(INPUT_FILE_ELEMENT_NAME)) input.build()

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
    // The map of where the observer stood follows the RECORDING being edited, as it does in the player: open when the recording says so, or when
    // the observer went somewhere, closed otherwise. Opening or closing it here is the author stating it, and goes into the recording (see
    // observermapchange below), so that a reader is shown what the author left. Not forced open, as it once was for every recording: the one
    // being edited may have chosen not to have it.
    this.sceneElement.addEventListener("observermapchange", event => {
      this.ufoElement.sighting.observerMap = (event as CustomEvent<{ open: boolean }>).detail.open
      this.dispatchEvent(new CustomEvent("sightingchange"))
    })
    // The editor draws the angles it edits, never a observer's bodies over them — see
    // SceneElement.accountInTheRound.
    this.sceneElement.accountInTheRound = false
    this.ufoElement = this.sceneElement.ufoElement
    // A shape is lined up on the scene under the pointer: the scene holds still — see Stance.
    this.ufoElement.steadyObserver = true
    // A click on bare ground of the map puts the observer there, at the playhead — the same edit as
    // typing the two coordinates, and through the same path (see updateObserver).
    this.ufoElement.observerPlacing = true
    this.ufoElement.addEventListener("observerplace", event => {
      const { lat, lng } = (event as CustomEvent<{ lat: number; lng: number }>).detail
      // Six decimals is a tenth of a metre: finer than any click on a map can mean.
      this.latInput.value = String(Number(lat.toFixed(6)))
      this.lngInput.value = String(Number(lng.toFixed(6)))
      this.updateObserver()
    })
    // This canvas is used for drag-to-record shape placement instead — a plain click shouldn't
    // also toggle the nested player's playback (every recording drag ends in a native "click").
    this.ufoElement.enableClickToPlay = false
    // The nested ufo's own overlay toolbar sits on top of the canvas with a full-width seek bar —
    // that would intercept dragging/resizing a shape positioned near the bottom of the canvas.
    // This recorder drives its own external Play/Seek/Loop row (below, not overlapping) instead.
    this.ufoElement.showToolbar = false
    this.shadow.getElementById("ufo-slot")!.replaceWith(this.sceneElement)
    // The playback layer's toggles stand in a row of their own above the picture — see UfoElement.hostControls.
    this.ufoElement.hostControls(this.shadow.getElementById("scene-controls")!)

    this.recordButton = this.shadow.getElementById("record") as HTMLButtonElement
    this.samplingRateInput = this.shadow.getElementById("samplingRate") as HTMLInputElement
    this.colorInput = this.shadow.getElementById("color") as HTMLInputElement
    this.transparencyInput = this.shadow.getElementById("transparency") as HTMLInputElement
    this.haloScaleInput = this.shadow.getElementById("haloScale") as HTMLInputElement
    this.blurInput = this.shadow.getElementById("blur") as HTMLInputElement
    this.brightnessInput = this.shadow.getElementById("brightness") as HTMLInputElement
    this.blurBoundOutput = this.shadow.getElementById("blur-bound")!
    this.sourceSelect = this.shadow.getElementById("source") as HTMLSelectElement
    this.shapeTitleInput = this.shadow.getElementById("shapeTitle") as HTMLInputElement
    this.utcOffsetInput = this.shadow.getElementById("utcOffsetHours") as HTMLInputElement
    this.timeZoneSelect = this.shadow.getElementById("timeZone") as HTMLSelectElement
    this.apparentWidthInput = this.shadow.getElementById("apparentWidth") as HTMLInputElement
    this.realWidthInput = this.shadow.getElementById("realWidth") as HTMLInputElement
    this.objectDistanceInput = this.shadow.getElementById("objectDistance") as HTMLInputElement
    this.sizeLockSelect = this.shadow.getElementById("sizeLock") as HTMLSelectElement
    this.apparentSizeOutput = this.shadow.getElementById("apparent-size")!
    this.realSizeOutput = this.shadow.getElementById("real-size")!
    this.clearDistanceHypothesisButton = this.shadow.getElementById("clear-distance-hypothesis") as HTMLButtonElement
    this.depthBasisOutput = this.shadow.getElementById("depth-basis")!
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
    this.contextViewAccountButton = this.shadow.getElementById("context-view-account") as HTMLButtonElement
    this.contextMasksSubmenu = this.shadow.getElementById("context-masks-submenu")!
    this.labelContextMasks = this.shadow.getElementById("label-context-masks")!
    this.playPauseButton = this.shadow.getElementById("play-pause") as HTMLButtonElement
    this.seekInput = this.shadow.getElementById("seek") as HTMLInputElement
    this.previousMarkButton = this.shadow.getElementById("previous-mark") as HTMLButtonElement
    this.nextMarkButton = this.shadow.getElementById("next-mark") as HTMLButtonElement
    this.timelineMarks = new TimelineMarks(this.seekInput, this.shadow.getElementById("timeline-marks")!)
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
    this.accountViewSelect = this.shadow.getElementById("account-view") as HTMLSelectElement
    this.durationElement = this.shadow.querySelector<DurationInputElement>(DURATION_INPUT_ELEMENT_NAME)!
    this.durationInput = this.durationElement.input
    this.exportButton = this.shadow.getElementById("export") as HTMLButtonElement
    this.importInput = this.shadow.getElementById("import") as InputFileElement
    this.narrativeSourceRow = this.shadow.getElementById("narrative-source-row")!
    this.narrativeSettingsBox = this.shadow.getElementById("narrative-settings")!
    this.narrativeRememberInput = this.shadow.getElementById("narrativeRemember") as HTMLInputElement
    this.narrativeDraftButton = this.shadow.getElementById("narrative-draft") as HTMLButtonElement
    this.narrativeStopButton = this.shadow.getElementById("narrative-stop") as HTMLButtonElement
    this.narrativeStatus = this.shadow.getElementById("narrative-status")!
    this.narrativeReport = this.shadow.getElementById("narrative-report")!
    this.placeNameInput = this.shadow.getElementById("placeName") as HTMLInputElement
    this.searchPlaceButton = this.shadow.getElementById("search-place") as HTMLButtonElement
    this.placeMatchRow = this.shadow.getElementById("place-match-row")!
    this.placeMatchSelect = this.shadow.getElementById("placeMatch") as HTMLSelectElement
    this.placeStatusText = this.shadow.getElementById("place-status-text")!
    this.latInput = this.shadow.getElementById("lat") as HTMLInputElement
    this.lngInput = this.shadow.getElementById("lng") as HTMLInputElement
    this.headingInput = this.shadow.getElementById("heading") as HTMLInputElement
    this.headingUnit = this.shadow.getElementById("heading-unit") as HTMLElement
    this.pitchInput = this.shadow.getElementById("pitch") as HTMLInputElement
    this.rollInput = this.shadow.getElementById("roll") as HTMLInputElement
    this.swayInput = this.shadow.getElementById("sway") as HTMLInputElement
    this.lightPollutionInput = this.shadow.getElementById("lightPollution") as HTMLInputElement
    this.lightPollutionStatusText = this.shadow.getElementById("light-pollution-status-text")!
    this.lightPollutionSourceRow = this.shadow.getElementById("light-pollution-source-row")!
    this.elevationInput = this.shadow.getElementById("elevation") as HTMLInputElement
    this.groundElevationOutput = this.shadow.getElementById("ground-elevation")!
    this.obsTimeInput = this.shadow.getElementById("obs-time") as HTMLInputElement
    this.obsEndTimeInput = this.shadow.getElementById("obs-end-time") as HTMLInputElement
    this.observerIdInput = this.shadow.getElementById("observerId") as HTMLInputElement
    this.observerTitleInput = this.shadow.getElementById("observerTitle") as HTMLInputElement
    this.observerLastNameInput = this.shadow.getElementById("observerLastName") as HTMLInputElement
    this.observerFirstNamesInput = this.shadow.getElementById("observerFirstNames") as HTMLInputElement
    this.observerAgeInput = this.shadow.getElementById("observerAge") as HTMLInputElement
    this.observerOccupationInput = this.shadow.getElementById("observerOccupation") as HTMLInputElement
    this.accountSourceSelect = this.shadow.getElementById("accountSource") as HTMLSelectElement
    this.accountUrlInput = this.shadow.getElementById("accountUrl") as HTMLInputElement
    this.labelAccountUrl = this.shadow.getElementById("label-account-url")!
    this.accountFollowedUpSelect = this.shadow.getElementById("accountFollowedUp") as HTMLSelectElement
    this.sightingIdInput = this.shadow.getElementById("sightingId") as HTMLInputElement
    this.descriptionInput = this.shadow.getElementById("description") as HTMLTextAreaElement
    this.tagsInput = this.shadow.getElementById("tags") as HTMLInputElement
    this.cloudCoverInput = this.shadow.getElementById("cloudCover") as HTMLInputElement
    this.highCloudCoverInput = this.shadow.getElementById("highCloudCover") as HTMLInputElement
    this.iceCrystalAlignmentInput = this.shadow.getElementById("iceCrystalAlignment") as HTMLInputElement
    this.rareIceCrystalsInput = this.shadow.getElementById("rareIceCrystals") as HTMLInputElement
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
    this.showNovaButton = this.shadow.getElementById("show-nova") as HTMLButtonElement
    this.showSatelliteButton = this.shadow.getElementById("show-satellite") as HTMLButtonElement
    this.showFireballButton = this.shadow.getElementById("show-fireball") as HTMLButtonElement
    this.weatherSourceLink = this.shadow.getElementById("weather-source-link") as HTMLAnchorElement
    this.weatherFields = [
      this.cloudCoverInput,
      // Every input the weather is READ from has to be listed here, or editing it alone changes
      // nothing until some other weather field is touched — which reads as a control that does not
      // work, and cost a reader an evening deciding the halos were "constant".
      this.highCloudCoverInput,
      this.iceCrystalAlignmentInput,
      this.rareIceCrystalsInput,
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
    this.instrumentSelect = this.shadow.getElementById("instrument") as PopoverPickerElement
    this.filterSelect = this.shadow.getElementById("filter") as HTMLSelectElement
    this.labelFilter = this.shadow.getElementById("label-filter")!
    this.focalLengthInput = this.shadow.getElementById("focalLength") as HTMLInputElement
    this.labelFocalLength = this.shadow.getElementById("label-focal-length")!
    this.focalFovOutput = this.shadow.getElementById("focal-fov") as HTMLOutputElement
    this.unitFocalLength = this.shadow.getElementById("unit-focal-length")!
    this.labelFNumber = this.shadow.getElementById("label-f-number")!
    this.labelExposure = this.shadow.getElementById("label-exposure")!
    this.fNumberInput = this.shadow.getElementById("fNumber") as HTMLInputElement
    this.exposureInput = this.shadow.getElementById("exposureSeconds") as HTMLInputElement
    this.focusDistanceInput = this.shadow.getElementById("focusDistance") as HTMLInputElement
    this.labelFocusDistance = this.shadow.getElementById("label-focus-distance")!
    this.refreshInstrumentOptions()
    this.refreshFilterOptions()
    this.labelColor = this.shadow.getElementById("label-color")!
    this.labelTransparency = this.shadow.getElementById("label-transparency")!
    this.labelHalo = this.shadow.getElementById("label-halo")!
    this.labelBlur = this.shadow.getElementById("label-blur")!
    this.labelBrightness = this.shadow.getElementById("label-brightness")!
    this.labelShapeTitle = this.shadow.getElementById("label-shape-title")!
    this.labelUtcOffset = this.shadow.getElementById("label-utc-offset")!
    this.labelApparentWidth = this.shadow.getElementById("label-apparent-width")!
    this.labelRealWidth = this.shadow.getElementById("label-real-width")!
    this.labelObjectDistance = this.shadow.getElementById("label-object-distance")!
    this.labelSizeLock = this.shadow.getElementById("label-size-lock")!
    this.labelSamplingRate = this.shadow.getElementById("label-sampling-rate")!
    this.labelSoundGroup = this.shadow.getElementById("label-sound-group")!
    this.labelSoundKind = this.shadow.getElementById("label-sound-kind")!
    this.labelSoundVolume = this.shadow.getElementById("label-sound-volume")!
    this.labelSoundPitch = this.shadow.getElementById("label-sound-pitch")!
    this.labelSoundSrc = this.shadow.getElementById("label-sound-src")!
    this.labelReferenceGroup = this.shadow.getElementById("label-reference-group")!
    this.labelReferenceTitle = this.shadow.getElementById("label-reference-title")!
    this.labelReferenceSrc = this.shadow.getElementById("label-reference-src")!
    this.labelReferenceKind = this.shadow.getElementById("label-reference-kind")!
    this.labelReferenceCredit = this.shadow.getElementById("label-reference-credit")!
    this.labelReferenceCreditUrl = this.shadow.getElementById("label-reference-credit-url")!
    this.labelReferenceT = this.shadow.getElementById("label-reference-t")!
    this.labelReferenceDrawing = this.shadow.getElementById("label-reference-drawing")!
    this.labelReferenceOpacity = this.shadow.getElementById("label-reference-opacity")!
    this.labelReferenceHeading = this.shadow.getElementById("label-reference-heading")!
    this.labelReferencePitch = this.shadow.getElementById("label-reference-pitch")!
    this.labelReferenceRoll = this.shadow.getElementById("label-reference-roll")!
    this.labelReferenceFov = this.shadow.getElementById("label-reference-fov")!
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
    this.labelRoll = this.shadow.getElementById("label-roll")!
    this.labelSway = this.shadow.getElementById("label-sway")!
    this.labelLightPollution = this.shadow.getElementById("label-light-pollution")!
    this.labelElevation = this.shadow.getElementById("label-elevation")!
    this.labelObservationTime = this.shadow.getElementById("label-observation-time")!
    this.labelObservationEndTime = this.shadow.getElementById("label-observation-end-time")!
    this.labelObserverId = this.shadow.getElementById("label-observer-id")!
    this.labelObserverTitle = this.shadow.getElementById("label-observer-title")!
    this.labelObserverLastName = this.shadow.getElementById("label-observer-last-name")!
    this.labelObserverFirstNames = this.shadow.getElementById("label-observer-first-names")!
    this.labelObserverAge = this.shadow.getElementById("label-observer-age")!
    this.labelObserverBirth = this.shadow.getElementById("label-observer-birth")!
    this.labelObserverOccupation = this.shadow.getElementById("label-observer-occupation")!
    this.labelAccountSource = this.shadow.getElementById("label-account-source")!
    this.labelAccountFollowedUp = this.shadow.getElementById("label-account-followed-up")!
    this.labelSightingId = this.shadow.getElementById("label-sighting-id")!
    this.labelDescription = this.shadow.getElementById("label-description")!
    this.labelTags = this.shadow.getElementById("label-tags")!
    this.labelImportFile = this.shadow.getElementById("label-import-file")!
    this.labelNarrativeSource = this.shadow.getElementById("label-narrative-source")!
    this.labelNarrativeRemember = this.shadow.getElementById("label-narrative-remember")!
    this.labelShapeGroup = this.shadow.getElementById("label-shape-group")!
    this.labelTemporalGroup = this.shadow.getElementById("label-temporal-group")!
    this.labelFileGroup = this.shadow.getElementById("label-file-group")!
    this.fileEditorHost = this.shadow.getElementById("file-editor")!
    this.fileNote = this.shadow.getElementById("file-note")!
    this.frozenPanel = new FrozenDataPanel(this.shadow.getElementById("frozen-data")!, {
      sighting: () => this.ufoElement.sighting,
      documentUrl: () => this.sceneElement.documentUrl,
      sources: () => this.freezerSources(),
      upperAirHeard: () => this.sceneElement.upperAirHeard,
      changed: () => {
        this.touch()
        this.ufoElement.refresh()
        this.scheduleFileSync()
        this.refreshFileItems()
      },
      base: () => this.fileBase(),
      masterUrl: () => this.masterUrl(),
      download: (blob, fileName) => this.download(blob, fileName)
    })
    this.sectionFilePanel = new SectionFilePanel(this.shadow.getElementById("file-section")!, {
      sighting: () => this.ufoElement.sighting,
      documentUrl: () => this.sceneElement.documentUrl,
      base: () => this.fileBase(),
      masterUrl: () => this.masterUrl(),
      download: (blob, fileName) => this.download(blob, fileName),
      changed: name => {
        this.touch()
        this.ufoElement.refresh()
        if (name === "weather") {
          this.syncWeatherFromTimeline()
          this.syncWeatherSourceState()
        }
        if (name === "place") this.syncPlaceNameField()
        if (name === "lightPollution") {
          const figure = this.ufoElement.sighting.lightPollution
          this.lightPollutionInput.value = figure === undefined ? "" : String(figure)
          this.scheduleLightPollutionLookup()
        }
        this.scheduleFileSync()
        this.refreshFileItems()
      }
    })
    this.sectionFilePanel.localize(this.messages)
    this.fileItemSelect = this.shadow.getElementById("file-item") as HTMLSelectElement
    this.fileItemSelect.addEventListener("change", () => this.showFileItem(this.fileItemSelect.value))
    // In the language the editor starts in: the others come with their locale, if one is asked (see applyMessages).
    this.frozenPanel.localize(this.messages)
    this.refreshFileItems()
    this.fileAsk = this.shadow.getElementById("file-ask") as HTMLDialogElement
    this.identityAsk = this.shadow.getElementById("identity-ask") as HTMLDialogElement
    this.shadow.getElementById("identity-ask-keep")!.addEventListener("click", () => {
      this.closeIdentityAsk()
      void this.downloadJson()
    })
    this.shadow.getElementById("identity-ask-back")!.addEventListener("click", () => this.closeIdentityAsk())
    this.shadow.getElementById("identity-ask-initials")!.addEventListener("click", () => {
      this.closeIdentityAsk()
      this.writeNamesAsInitials()
    })
    // Escape answers it, and answers with the safe one: what was read goes back.
    this.fileAsk.addEventListener("cancel", event => {
      event.preventDefault()
      this.keepReadingWeather()
    })
    this.shadow.getElementById("file-ask-stop")!.addEventListener("click", () => this.stopReadingWeather())
    this.shadow.getElementById("file-ask-keep")!.addEventListener("click", () => this.keepReadingWeather())
    this.labelLocationGroup = this.shadow.getElementById("label-location-group")!
    this.labelObservationGroup = this.shadow.getElementById("label-observation-group")!
    this.labelObserverGroup = this.shadow.getElementById("label-observer-group")!
    this.labelWeatherGroup = this.shadow.getElementById("label-weather-group")!
    this.labelCloudCover = this.shadow.getElementById("label-cloud-cover")!
    this.labelHighCloud = this.shadow.getElementById("label-high-cloud")!
    this.labelIceAlignment = this.shadow.getElementById("label-ice-alignment")!
    this.labelRareIce = this.shadow.getElementById("label-rare-ice")!
    this.labelCloudDarkness = this.shadow.getElementById("label-cloud-darkness")!
    this.labelCloudBase = this.shadow.getElementById("label-cloud-base")!
    this.labelPrecipitationType = this.shadow.getElementById("label-precipitation-type")!
    this.labelPrecipitationIntensity = this.shadow.getElementById("label-precipitation-intensity")!
    this.labelWindDirection = this.shadow.getElementById("label-wind-direction")!
    this.labelWindSpeed = this.shadow.getElementById("label-wind-speed")!
    this.labelStorm = this.shadow.getElementById("label-storm")!
    this.labelCloudsGroup = this.shadow.getElementById("label-clouds-group")!
    this.labelShapesSubgroup = this.shadow.getElementById("label-shapes-subgroup")!
    this.labelBodiesSubgroup = this.shadow.getElementById("label-bodies-subgroup")!
    this.labelLaunchesSubgroup = this.shadow.getElementById("label-launches-subgroup")!
    this.labelBeamsSubgroup = this.shadow.getElementById("label-beams-subgroup")!
    this.labelPrecipitationGroup = this.shadow.getElementById("label-precipitation-group")!
    this.labelWindGroup = this.shadow.getElementById("label-wind-group")!
    this.labelWeatherInferred = this.shadow.getElementById("label-weather-inferred")!
    this.weatherProviderSelect = this.shadow.getElementById("weatherSource") as HTMLSelectElement
    this.weatherFileLink = this.shadow.getElementById("weather-file-link") as HTMLButtonElement
    this.labelInstrument = this.shadow.getElementById("label-instrument")!
    this.optionPrecipitationNone = this.shadow.getElementById("option-precipitation-none")!
    this.optionPrecipitationRain = this.shadow.getElementById("option-precipitation-rain")!
    this.optionPrecipitationSnow = this.shadow.getElementById("option-precipitation-snow")!
    this.optionPrecipitationHail = this.shadow.getElementById("option-precipitation-hail")!
    this.decorList = new ElementList({
      header: this.shadow.getElementById("decor-list-header")!,
      body: this.shadow.getElementById("decor-item")!,
      ids: { list: "decor", remove: "delete-decor", add: "add-decor-building", kinds: "decorKind", kind: value => `option-decor-${value}` },
      actions: [{ id: "look-at-decor", glyph: "🎯", onClick: () => this.lookAtDecor() }],
      onSelect: id => this.selectDecor(id),
      onAdd: kind => this.addDecor(kind as DecorObject["kind"]),
      onRemove: () => this.deleteDecor()
    })
    // In English until the language arrives, which says what they are called: the controls exist, and mean something, from the start.
    this.decorList.setKinds([
      { value: "building", label: "Building" }, { value: "tree", label: "Tree" }, { value: "shrub", label: "Shrub" }, { value: "bridge", label: "Bridge" },
      { value: "wire", label: "Overhead line" }, { value: "crop", label: "Crop row" }, { value: "terrace", label: "Terrace (restanque)" },
      { value: "mound", label: "Stone heap" }, { value: "wall", label: "Dry-stone wall" }, { value: "streetlight", label: "Streetlight" },
      { value: "trafficlight", label: "Traffic light" }, { value: "crossing", label: "Pedestrian crossing" }, { value: "roadsign", label: "Road sign" },
      { value: "vehicle", label: "Vehicle" }, { value: "aircraft", label: "Aircraft" }, { value: "entity", label: "Being" },
      { value: "observer", label: "Other observer", hidden: true }
    ])
    this.decorList.setLabels({ list: "Environment", remove: "Delete decor", add: "Add", empty: "No decor", actions: { "look-at-decor": "Look at it" } })
    this.observerList = new ElementList({
      header: this.shadow.getElementById("observer-list-header")!,
      body: this.shadow.getElementById("observer-item")!,
      ids: { list: "observer-pick", remove: "delete-observer", add: "add-decor-observer" },
      actions: [{ id: "look-at-observer", glyph: "🎯", onClick: () => this.lookAtDecor() }],
      onSelect: id => this.selectObserver(id),
      onAdd: () => this.addDecor("observer"),
      onRemove: () => this.deleteDecor()
    })
    this.observerList.setLabels({ list: "Observer", remove: "Delete observer", add: "Add observer", actions: { "look-at-observer": "Look at it" } })
    this.sceneryStatus = this.shadow.getElementById("scenery-status")!
    this.sceneryWarning = this.shadow.getElementById("scenery-warning")!
    this.scenerySource = this.shadow.getElementById("scenery-source") as HTMLSelectElement
    this.labelScenerySource = this.shadow.getElementById("label-scenery-source")!
    this.sceneryRadius = this.shadow.getElementById("scenery-radius") as HTMLInputElement
    this.labelSceneryRadius = this.shadow.getElementById("label-scenery-radius")!
    this.sceneryRadius.value = this.readSceneryRadius()
    this.surroundings = new SurroundingsPlanter(this.sceneryStatus, {
      decor: () => this.ufoElement.sighting.decor,
      setDecor: decor => this.setPlantedDecor(decor),
      kindName: kind => this.decorList.kindLabel(kind),
      cite: source => this.citeSource(source),
      busy: (on, label) => this.sceneElement.setBusy(on, label),
      track: () => this.ufoElement.sighting.observerTrack.toJSON().keyframes
        .map(keyframe => ({ lat: keyframe.pose.lat, lng: keyframe.pose.lng }))
        .filter((point): point is { lat: number, lng: number } => typeof point.lat === "number" && typeof point.lng === "number")
    }, sightingEditorMessages_en,
    async (lat, lng) => this.surroundingsProvider
      ? (this.surroundingsProvider.covers(lat, lng) ? this.surroundingsProvider : undefined)
      : (await import("../render3d/terrain/surroundingsSources.js")).SurroundingsSources.providerFor(this.sceneryChoice, lat, lng),
    { radiusM: Number(this.sceneryRadius.value) })
    // The first survey of the registry unless the author chose another, or none, which the browser remembers: asking sends the place to a
    // service, and that is the author's to allow.
    this.sceneryChoice = this.readSceneryChoice()
    this.surroundings.setEnabled(this.sceneryAsked())
    this.shadow.getElementById("scenery-file-link")!.addEventListener("click", () => this.openFileItem("decor"))
    this.scenerySource.addEventListener("change", () => {
      // The file: the scenery is what the recording says, and no survey is asked; the survey the browser remembers stays remembered.
      const fromFile = this.scenerySource.value === SightingEditorElement.FILE_SOURCE
      this.setDecorFromFile(fromFile)
      if (fromFile) {
        this.syncSceneryPicker()
        return
      }
      this.sceneryChoice = this.scenerySource.value
      this.writeSceneryChoice(this.sceneryChoice)
      this.surroundings.setEnabled(this.sceneryAsked())
      this.syncSceneryPicker()
      if (this.sceneryChoice === SightingEditorElement.NO_SCENERY) {
        // None: the scenery is the author's alone, so what a survey brought goes (and comes back with Undo); what they placed stays.
        this.surroundings.withdraw()
        return
      }
      // Another survey is another answer for the place the recording stands at: asked at once, and what the first brought is replaced.
      const standing = this.plantingCentre()
      if (standing) void this.surroundings.survey(standing.lat, standing.lng)
    })
    this.sceneryRadius.addEventListener("input", () => {
      const radius = Number(this.sceneryRadius.value)
      if (!Number.isFinite(radius) || radius < 20) return
      this.writeSceneryRadius(this.sceneryRadius.value)
      const standing = this.plantingCentre()
      this.surroundings.radiusChanged(radius, standing?.lat, standing?.lng)
    })
    void this.fillScenerySources()
    this.undoButton = this.shadow.getElementById("undo") as HTMLButtonElement
    this.redoButton = this.shadow.getElementById("redo") as HTMLButtonElement
    this.referenceSelect = this.shadow.getElementById("reference") as HTMLSelectElement
    this.deleteReferenceButton = this.shadow.getElementById("delete-reference") as HTMLButtonElement
    this.referenceTitleInput = this.shadow.getElementById("referenceTitle") as HTMLInputElement
    this.referenceSourceInput = this.shadow.getElementById("reference-source") as InputFileElement
    this.referenceKindSelect = this.shadow.getElementById("referenceKind") as HTMLSelectElement
    this.referenceCreditInput = this.shadow.getElementById("referenceCredit") as HTMLInputElement
    this.referenceCreditUrlInput = this.shadow.getElementById("referenceCreditUrl") as HTMLInputElement
    this.referenceTInput = this.shadow.getElementById("referenceT") as HTMLInputElement
    this.referenceDrawingInput = this.shadow.getElementById("referenceDrawing") as HTMLInputElement
    this.referenceOpacityInput = this.shadow.getElementById("referenceOpacity") as HTMLInputElement
    this.referenceHeadingInput = this.shadow.getElementById("referenceHeading") as HTMLInputElement
    this.referencePitchInput = this.shadow.getElementById("referencePitch") as HTMLInputElement
    this.referenceRollInput = this.shadow.getElementById("referenceRoll") as HTMLInputElement
    this.referenceFovInput = this.shadow.getElementById("referenceFov") as HTMLInputElement
    this.referenceUsePoseButton = this.shadow.getElementById("reference-use-pose") as HTMLButtonElement
    this.referenceStatus = this.shadow.getElementById("reference-status")!
    this.addReferenceButton = this.shadow.getElementById("add-reference") as HTMLButtonElement
    this.referenceAddMenu = new AddMenu(this.addReferenceButton, "reference-add-kind", kind => this.addReferenceOfKind(kind), kind => ({
      address: "reference-add-address", file: "reference-add-file-option", street: "reference-add-street"
    })[kind] ?? `reference-add-${kind}`)
    this.setReferenceAddKinds("From an address", "From a file", "Street-level pictures nearby")
    this.referenceLandmarksSelect = this.shadow.getElementById("reference-landmarks") as HTMLSelectElement
    this.addReferenceLandmarkButton = this.shadow.getElementById("add-reference-landmark") as HTMLButtonElement
    this.deleteReferenceLandmarkButton = this.shadow.getElementById("delete-reference-landmark") as HTMLButtonElement
    this.referenceLandmarkLabelInput = this.shadow.getElementById("referenceLandmarkLabel") as HTMLInputElement
    this.labelReferenceLandmarks = this.shadow.getElementById("label-reference-landmarks")!
    this.labelReferenceLandmarkLabel = this.shadow.getElementById("label-reference-landmark-label")!
    this.referenceAdoptPoseButton = this.shadow.getElementById("reference-adopt-pose") as HTMLButtonElement
    this.traceImportInput = this.shadow.getElementById("trace-import") as InputFileElement
    this.traceSelect = this.shadow.getElementById("trace") as HTMLSelectElement
    this.deleteTraceButton = this.shadow.getElementById("delete-trace") as HTMLButtonElement
    this.traceTitleInput = this.shadow.getElementById("traceTitle") as HTMLInputElement
    this.traceSourceInput = this.shadow.getElementById("traceSource") as HTMLInputElement
    this.traceStatus = this.shadow.getElementById("trace-status")!
    this.labelTraceImport = this.shadow.getElementById("label-trace-import")!
    this.addTraceButton = this.shadow.getElementById("add-trace") as HTMLButtonElement
    this.labelTraceTitle = this.shadow.getElementById("label-trace-title")!
    this.labelTraceSource = this.shadow.getElementById("label-trace-source")!
    this.referenceStreetSelect = this.shadow.getElementById("reference-street") as HTMLSelectElement
    this.referenceStreetAddButton = this.shadow.getElementById("reference-street-add") as HTMLButtonElement
    this.referenceFields = [
      this.referenceTitleInput, this.referenceKindSelect, this.referenceCreditInput,
      this.referenceCreditUrlInput, this.referenceTInput, this.referenceDrawingInput, this.referenceOpacityInput,
      this.referenceHeadingInput, this.referencePitchInput, this.referenceRollInput, this.referenceFovInput
    ]
    this.milestoneSelect = this.shadow.getElementById("milestone") as HTMLSelectElement
    this.milestoneLabelInput = this.shadow.getElementById("milestoneLabel") as HTMLInputElement
    this.milestoneNoteInput = this.shadow.getElementById("milestoneNote") as HTMLInputElement
    this.addMilestoneButton = this.shadow.getElementById("add-milestone") as HTMLButtonElement
    this.deleteMilestoneButton = this.shadow.getElementById("delete-milestone") as HTMLButtonElement
    this.goToMilestoneButton = this.shadow.getElementById("go-to-milestone") as HTMLButtonElement
    // The drop-down gives way to a window of pictures (see ModelPicker), over the same options.
    this.modelPicker = new ModelPicker(this.shadow, () => ({
      title: this.messages.modelPickerTitle, close: this.messages.modelPickerClose, choose: this.messages.modelPickerChoose,
      address: this.messages.decorModelAdvanced, addressUrl: this.messages.decorModelUrl, addressName: this.messages.decorModelTitle,
      addressAuthor: this.messages.decorModelAuthor, addressLicense: this.messages.decorModelLicense, addressSource: this.messages.decorModelSource,
      addressUse: this.messages.modelPickerUse, addressIncomplete: this.messages.modelPickerIncomplete
    }))
    this.decorParametersHost = this.shadow.getElementById("decor-parameters")!
    this.decorParameterForm = new ParameterForm(this.decorParametersHost, "en", "decorParam.")
    const decorValues = { said: () => this.said, writingLanguage: () => this.writingLanguage }
    this.decorBaseHost = this.shadow.getElementById("decor-base")!
    this.decorStateHost = this.shadow.getElementById("decor-state")!
    this.decorBaseForm = new ParameterForm(this.decorBaseHost, "en", "decorBase.", decorValues, (spec, select) => this.enhanceDecorModelChoice(spec, select))
    this.decorStateForm = new ParameterForm(this.decorStateHost, "en", "decorState.", decorValues)
    this.labelDecorGroup = this.shadow.getElementById("label-decor-group")!
    this.labelMilestones = this.shadow.getElementById("label-milestones")!
    this.labelMilestoneLabel = this.shadow.getElementById("label-milestone-label")!
    this.labelMilestoneNote = this.shadow.getElementById("label-milestone-note")!

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
    this.contextViewAccountButton.addEventListener("click", () => this.viewObserverAccount())
    // Syncs synchronously right after each call rather than waiting for the next "timeupdate" —
    // play()/toggleLoop() take effect immediately but the first actual frame/tick (what
    // "timeupdate" fires on) is scheduled via requestAnimationFrame, so without this the button's
    // own icon/aria-pressed would lag a frame behind what just happened. Mirrors how UfoElement's
    // own (hidden, here) internal toolbar already updates itself synchronously on click.
    this.playPauseButton.addEventListener("click", () => {
      // The play button is the editor's own, outside the scene, so the scene never sees this gesture:
      // its weather and engine sound have to be unlocked here (see SceneElement.resumeWeatherAudio),
      // or playing would be silent until some weather edit happened to do it.
      this.sceneElement.resumeWeatherAudio()
      this.ufoElement.togglePlayPause()
      this.syncPlaybackControls()
    })
    this.seekInput.addEventListener("input", () => (this.ufoElement.currentTime = this.timelineMarks.snap(Number(this.seekInput.value))))
    this.previousMarkButton.addEventListener("click", () => this.goToMark(this.timelineMarks.previous(this.ufoElement.currentTime)))
    this.nextMarkButton.addEventListener("click", () => this.goToMark(this.timelineMarks.next(this.ufoElement.currentTime)))
    this.recordButton.addEventListener("click", () => this.toggleRecording())
    this.deleteShapeButton.addEventListener("click", () => this.deleteShape())
    this.exportButton.addEventListener("click", () => this.exportJson())
    this.importInput.addEventListener("filepick", event => {
      const pick = (event as CustomEvent<InputFilePick>).detail
      if (pick.file) void this.importFromFile(pick.file)
      else void this.importFromUrl(pick.url)
    })
    this.accountSourceSelect.addEventListener("change", () => this.updateObserverMetadata())
    this.accountUrlInput.addEventListener("input", () => this.updateSourceUrl())
    this.accountFollowedUpSelect.addEventListener("change", () => this.updateObserverMetadata())
    // A value of the whole recording, not of a pose: a tripod stays a tripod. Blank is the default.
    this.swayInput.addEventListener("input", () => {
      this.ufoElement.sighting.sway = this.numberOrUndefined(this.swayInput.value)
      this.ufoElement.refresh()
    })
    // A value of the place, not of a pose: the towns do not move during an observation. Blank is a
    // natural sky.
    // Typed, it is the author's and no record replaces it; emptied, it is the atlas's to answer again.
    this.lightPollutionInput.addEventListener("input", () => {
      const sighting = this.ufoElement.sighting
      sighting.lightPollution = this.numberOrUndefined(this.lightPollutionInput.value)
      sighting.provenance.clear("lightPollution")
      this.lightPollutionLookup = undefined
      this.ufoElement.refresh()
      if (sighting.lightPollution === undefined) this.scheduleLightPollutionLookup()
      else this.syncLightPollutionStatus()
    })
    this.narrativeDraftButton.addEventListener("click", () => this.draftFromDescription())
    this.narrativeStopButton.addEventListener("click", () => this.narrativeAbort?.abort())
    this.narrativeRememberInput.addEventListener("change", () => this.rememberNarrativeSettings())
    // The provider picker (with its credit) and its settings are built in script, from the registry
    // and from the provider — see refreshSourceRows and renderNarrativeSettings. Done here and not
    // only in applyMessages, which never runs for an English reader (see loadLocaleMessages).
    this.renderNarrativeSettings()
    this.durationElement.addEventListener("durationchange", event => {
      const { seconds, text } = (event as CustomEvent<{ seconds: number | undefined, text: string | undefined }>).detail
      // What was stated, when it was not exact, goes beside the one length the simulation is played at.
      this.ufoElement.sighting.event.durationText = text
      this.ufoElement.durationSeconds = seconds
      // Keyframes placed against the previous length keep their own positions on the new one.
      if (this.ufoElement.sighting.timeline.hasSpan) this.ufoElement.sighting.timeline.setSpan((seconds ?? 0) * 1000)
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
    this.apparentWidthInput.addEventListener("input", () => this.typing(this.apparentWidthInput, () => this.onApparentWidthInput()))
    this.realWidthInput.addEventListener("input", () => this.typing(this.realWidthInput, () => this.onRealWidthInput()))
    this.objectDistanceInput.addEventListener("input", () => this.typing(this.objectDistanceInput, () => this.onDistanceInput()))
    this.sizeLockSelect.addEventListener("change", () => this.applySizeLock())
    this.clearDistanceHypothesisButton.addEventListener("click", () => this.clearDistanceHypothesis())
    this.undoButton.addEventListener("click", () => this.undo())
    this.redoButton.addEventListener("click", () => this.redo())
    this.referenceSelect.addEventListener("change", () => this.selectReference(this.referenceSelect.value))
    this.deleteReferenceButton.addEventListener("click", () => this.deleteReference())
    for (const field of this.referenceFields) field.addEventListener("input", () => this.updateReference())
    this.referenceUsePoseButton.addEventListener("click", () => this.useObserverPoseForReference())
    this.referenceSourceInput.addEventListener("filepick", event => void this.setReferenceSource((event as CustomEvent<InputFilePick>).detail))
    this.addReferenceLandmarkButton.addEventListener("click", () => this.armLandmark())
    this.deleteReferenceLandmarkButton.addEventListener("click", () => this.deleteLandmark())
    this.referenceLandmarksSelect.addEventListener("change", () => this.selectLandmark(this.referenceLandmarksSelect.value))
    this.referenceLandmarkLabelInput.addEventListener("input", () => this.updateLandmarkLabel())
    this.referenceAdoptPoseButton.addEventListener("click", () => this.adoptReferencePose())
    this.addTraceButton.addEventListener("click", () => {
      const row = this.shadow.getElementById("trace-import-row")!
      row.hidden = false
      if (this.traceImportInput.mode === "file") this.traceImportInput.openPicker()
      else this.traceImportInput.focus()
    })
    this.traceImportInput.addEventListener("filepick", event => void this.addTraces((event as CustomEvent<InputFilePick>).detail))
    this.traceSelect.addEventListener("change", () => this.selectTrace(this.traceSelect.value))
    this.deleteTraceButton.addEventListener("click", () => this.deleteTrace())
    this.traceTitleInput.addEventListener("input", () => this.writeTraceFields())
    this.traceSourceInput.addEventListener("input", () => this.writeTraceFields())
    this.referenceStreetAddButton.addEventListener("click", () => this.addStreetPicture())
    // The wheel changes the picture's field while it is being lined up — and only then, so that a
    // page scrolls as usual over a scene nobody is registering anything on.
    this.ufoElement.canvasElement.addEventListener("wheel", event => this.onReferenceWheel(event), { passive: false })
    this.ufoElement.canvasElement.addEventListener("wheel", event => this.onBodyWheel(event), { passive: false })
    this.addMilestoneButton.addEventListener("click", () => this.addMilestone())
    this.deleteMilestoneButton.addEventListener("click", () => this.deleteMilestone())
    this.goToMilestoneButton.addEventListener("click", () => {
      if (this.currentMilestoneT !== undefined) this.goToMark(this.currentMilestoneT)
    })
    this.milestoneSelect.addEventListener("change", () => this.selectMilestone(Number(this.milestoneSelect.value)))
    for (const input of [this.milestoneLabelInput, this.milestoneNoteInput]) {
      input.addEventListener("input", () => this.updateMilestone())
    }
    this.showMeteorButton.addEventListener("click", () => this.showNextMeteor())
    this.showCometButton.addEventListener("click", () => this.lookAtComet())
    this.showNovaButton.addEventListener("click", () => this.lookAtNova())
    this.showSatelliteButton.addEventListener("click", () => this.showNextSatellite())
    this.showFireballButton.addEventListener("click", () => this.showNextFireball())
    // The fireballs on record arrive after the line was first stated: the clause has news.
    this.sceneElement.addEventListener(FIREBALLS_CHANGE_EVENT, () => {
      this.skyCandidatesKey = undefined
      this.refreshSkyCandidates()
    })
    // The element sets arrive after the line was first stated, or turn out not to exist: either way
    // the satellite clause has something new to say.
    this.sceneElement.addEventListener(SATELLITES_CHANGE_EVENT, () => {
      this.skyCandidatesKey = undefined
      this.refreshSkyCandidates()
    })
    // The single funnel for "the recording changed, a consumer composing this element (e.g. a
    // live <rr0-scene> preview) should resync" — refresh() (called after every mutation: shape
    // edits, drag, observer/time edits, duration) always ends in a timeupdate on the *nested*
    // ufoElement, which is shadow-DOM-internal and wouldn't otherwise reach outside listeners
    // (UfoElement's timeupdate isn't `composed`). Re-dispatching our own event here is what makes
    // it visible to the outside without exposing the nested element itself.
    this.ufoElement.addEventListener("timeupdate", () => {
      this.onSelectionOrTimeChanged()
      this.syncPlaybackControls()
      this.scheduleFileSync()
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

    // An oval or a polygon is picked when the shape is added, and kept: another kind is another shape (delete this one, add that one).
    this.shapeAddMenu = new AddMenu(this.addShapeButton, "add-shape-kind", kind => {
      this.currentAppearance = { ...this.currentAppearance, presetId: kind as ShapePresetId }
      this.addShape()
    }, kind => `add-shape-${kind}`)
    this.shapeAddMenu.setKinds(PRESET_IDS.map(presetId => ({ value: presetId, label: presetId === "oval" ? "Oval" : "Polygon" })))
    this.colorInput.addEventListener("input", () => this.setAppearance({ color: this.colorInput.value }))
    this.transparencyInput.addEventListener("input", () =>
      this.setAppearance({ transparency: Number(this.transparencyInput.value) })
    )
    this.brightnessInput.addEventListener("input", () =>
      this.setAppearance({ brightness: Number(this.brightnessInput.value) })
    )
    this.blurInput.addEventListener("input", () => {
      this.setAppearance({ blur: Number(this.blurInput.value) })
      this.refreshBlurDistanceBound()
    })
    this.haloScaleInput.addEventListener("input", () =>
      this.setAppearance({ haloScale: Number(this.haloScaleInput.value) })
    )

    for (const input of [this.latInput, this.lngInput, this.headingInput, this.pitchInput, this.rollInput, this.elevationInput]) {
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
    this.headingInput.addEventListener("input", () => this.refreshHeadingPoint())
    this.headingInput.addEventListener("blur", () => this.sceneElement.setCompassForced(false))
    // A filter is a pose field like the aperture (see ObserverPose.filter): put on or taken off at
    // the playhead, and held until the next keyframe that says otherwise.
    this.filterSelect.addEventListener("change", () => this.updateObserver())
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
      this.retuneExposure(previous)
      SightingShapes.reproject(this.ufoElement.sighting, previous, fieldBefore)
      // The picture's own shape changes with it — a square 126 frame, a phone held upright — and
      // both the sky and the shapes drawn over it have to take it at the same moment.
      this.sceneElement.applyFrameFormat()
      this.refreshFilterOptions()
      this.syncOpticsFromInstrument()
      this.ufoElement.refresh()
      this.dispatchEvent(new CustomEvent("sightingchange"))
    })
    // Choosing how the account is drawn opens the part of the Phenomenon group that edits it.
    this.accountViewSelect.addEventListener("change", () => this.chooseAccountView(this.accountViewSelect.value === "bodies"))
    this.utcOffsetInput.addEventListener("input", () => this.updateUtcOffset())
    this.timeZoneSelect.addEventListener("change", () => {
      // Picked by hand: from here on it is the author's, and moving the place no longer touches it.
      this.autoFilledTimeZone = undefined
      this.updateTimeZone()
    })
    // The two dates say it the same way: see DateInputElement, which makes the picker, the text and the qualifier.
    const dateOf = (name: string): DateInputElement => this.shadow.querySelector<DateInputElement>(`${DATE_INPUT_ELEMENT_NAME}[name="${name}"]`)!
    this.startDate = dateOf("obs-time")
    this.endDate = dateOf("obs-end-time")
    this.birthDate = dateOf("observer-birth")
    // What bends this observer's perception is whatever the providers list: see ObserverProviders.
    this.perceptionSettings = this.shadow.getElementById("observerPerception") as ProviderSettingsElement
    this.perceptionSettings.providers = ObserverProviders.ALL
    this.perceptionSettings.labels = this.messages.observerPerception
    this.perceptionSettings.addEventListener("settingschange", () => this.updateObserverMetadata())
    this.startDate.messages = this.messages
    this.endDate.messages = this.messages
    this.birthDate.messages = this.messages
    // The picker says nothing through "datechange" while a segment is missing, so the weather has to hear of it here.
    for (const type of ["input", "change"]) {
      this.shadow.getElementById("obs-time-native")?.addEventListener(type, () => {
        this.syncWeatherSourceState()
        // Put back as it was, the field has nothing new to say, and the record forgotten meanwhile would never be asked again.
        if (this.weatherFromRecords && this.ufoElement.sighting.weatherSource === undefined && this.weatherInference.canInfer(this.ufoElement.sighting) && !this.startDateHalfEntered()) {
          this.scheduleWeatherLookup()
        }
      })
    }
    this.startDate.addEventListener("datechange", event => {
      const { time } = (event as CustomEvent<{ time: SightingTime | undefined }>).detail
      this.editDate(() => { this.ufoElement.sighting.event.time = time })
      this.syncAgeFromBirth(true)
    })
    // A birth date and an age then say one thing two ways: see syncAgeFromBirth / syncBirthFromAge.
    this.birthDate.addEventListener("datechange", event => {
      this.birth = (event as CustomEvent<{ time: SightingTime | undefined }>).detail.time
      this.syncAgeFromBirth(false)
      this.updateObserverMetadata()
    })
    this.observerAgeInput.addEventListener("input", () => this.syncBirthFromAge())
    this.endDate.addEventListener("datechange", event => {
      const { time } = (event as CustomEvent<{ time: SightingTime | undefined }>).detail
      this.editDate(() => { this.ufoElement.sighting.event.endTime = time })
    })
    for (const input of [
      this.observerIdInput,
      this.observerTitleInput,
      this.observerLastNameInput,
      this.observerFirstNamesInput,
      this.observerAgeInput,
      this.observerOccupationInput,
      this.sightingIdInput
    ]) {
      input.addEventListener("input", () => {
        this.updateObserverMetadata()
        this.observerList.rename(SightingEditorElement.OBSERVER_PRINCIPAL, this.principalObserverLabel())
      })
    }
    this.descriptionInput.addEventListener("input", () => {
      this.updateDescription()
      // The same keystrokes that write the account into the recording decide whether there is
      // anything to draft FROM it — see syncNarrativeEnabled.
      this.syncNarrativeEnabled()
    })
    this.tagsInput.addEventListener("input", () => this.updateTags())
    for (const input of this.weatherFields) {
      // The crystal alignment writes itself and only itself (see applyIceAlignmentAtPlayhead): it
      // is listed here because it IS a weather field and the whole point of that list is that no
      // weather field goes unlistened-to, but it must not go through the general path, which would
      // take the recording away from the record it was looked up from.
      if (input === this.iceCrystalAlignmentInput || input === this.rareIceCrystalsInput) {
        input.addEventListener("input", () => this.applyIceAlignmentAtPlayhead())
        continue
      }
      input.addEventListener("input", () => this.applyWeatherAtPlayhead())
    }
    for (const field of this.soundFields) {
      field.addEventListener("input", () => this.applySoundAtPlayhead())
    }
    this.weatherInferredInput.addEventListener("change", () => this.onWeatherInferredToggled())
    this.weatherProviderSelect.addEventListener("change", () => this.onWeatherProviderChosen())
    this.weatherFileLink.addEventListener("click", () => this.openFileItem("weather"))


    this.groupTabs = [...this.shadow.querySelectorAll<HTMLButtonElement>(".group-tab")]
    this.groupPanels = this.groupTabs.map(tab => this.shadow.getElementById(tab.getAttribute("aria-controls")!)!)
    for (const tab of this.groupTabs) {
      tab.addEventListener("click", () => this.toggleGroup(tab, !this.isGroupOpen(tab)))
    }
    this.subgroupTabs = [...this.shadow.querySelectorAll<HTMLButtonElement>(".subgroup-tab")]
    for (const tab of this.subgroupTabs) {
      tab.addEventListener("click", () => this.openSubgroup(tab))
    }
    // Every number field as wide as the values it takes, from its own bounds — see NumberFields.
    NumberFields.fit(this.shadow)
    this.paramSummary = this.shadow.getElementById("param-summary")!
    this.paramSummaryBuilder = new SightingSummary(this.messages, this.naming, this.said, this.tagNames, { messages: this.messages, locale: this.language })
    // One listener on the strip rather than one per chip: the chips are rebuilt from scratch on
    // every refresh, and re-binding 37 handlers each time is how a summary meant to be cheap stops
    // being cheap.
    this.paramSummary.addEventListener("click", event => this.onParamSummaryClick(event))
    // Shape is the group left open on load — of the eight it's the one whose every field changes
    // what the canvas right below it draws, so it's the one worth having open while looking at it.
    this.toggleGroup(this.groupTabs[this.groupPanels.findIndex(panel => panel.id === "group-shape")], true)
    this.fileEditorHost.addEventListener("focusout", () => this.leaveFileEditor())

    this.setRecordButtonLabel(false)
    // A new recording starts empty: no shape until one is added (+) or recorded. It used to start
    // with a green oval already placed, which every recording then had to delete once the last
    // shape could be deleted and a recording could hold only bodies.
    this.refreshSourceList()
    this.currentDecorId = this.ufoElement.sighting.decor[0]?.id
    this.refreshDecorList()
    this.currentReferenceId = this.ufoElement.sighting.references[0]?.id
    this.refreshReferenceList()
    this.currentTraceId = this.ufoElement.sighting.traces[0]?.id
    this.refreshTraceList()
    this.sceneElement.setCloudRendering("volume")
    this.cloudEditor = setupCloudEditor(this.shadow.getElementById("cloud-editor")!, this.sceneElement, (detachWeatherSource = true) => {
      if (!detachWeatherSource) return
      this.weatherFromRecords = false
      this.cancelWeatherLookup()
      this.ufoElement.sighting.weatherSource = undefined
      this.syncWeatherSourceState()
    }, (headingDeg, pitchDeg) => {
      this.headingInput.value = String(this.rounded(headingDeg))
      this.pitchInput.value = String(this.rounded(pitchDeg))
      this.updateObserver()
    }, selectLocale(HostLocale.preferencesFor(this), UFO_SUPPORTED_LANGUAGES) as UfoLanguage)
    this.currentMilestoneT = this.ufoElement.sighting.milestones[0]?.t
    this.refreshMilestoneList()
    this.onSelectionOrTimeChanged()
    // A brand-new recording starts with no duration at all — flags it as missing right away
    // rather than only once the user first touches a date/duration field.
    this.syncDurationField()
    // So the external playback row isn't blank/stale before the first timeupdate tick.
    this.syncPlaybackControls()
    this.refreshSourceRows()
    // Synchronously, with the English defaults: loadLocaleMessages() below is async, and an empty
    // qualifier picker on first paint would read as a control with nothing to offer.
    this.refreshTimeZoneOptions()
    // An empty editor has no date or place yet, so this only states what's missing — the lookup
    // itself starts the moment those fields say enough (see scheduleWeatherLookup's callers).
    this.syncWeatherSourceState()
    // Only when already in the page — see SightingElement's constructor for why.
    if (this.isConnected) void this.loadLocaleMessages()
  }

  /** `src` loads an existing recording straight into the editor, the same attribute every other
   * element in this package already takes — what makes a per-observation editor URL possible at
   * all (rr0.org's own editor page maps `?file=` onto it, so ufoathome.org/<path> opens that
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
    // The constructor could only read the browser's list if this editor was created before being put
    // anywhere; the page it now stands in may declare a language (see HostLocale).
    if (HostLocale.preferencesFor(this).join() !== this.preferences.join()) void this.loadLocaleMessages()
    // What the author does to the form, told from what the editor derives by itself: see `touched`.
    this.shadow.addEventListener("pointerdown", this.armHistory, true)
    this.shadow.addEventListener("keydown", this.armHistory as EventListener, true)
    for (const type of ["input", "change", "click", "keyup", "pointerup"]) this.shadow.addEventListener(type, this.scheduleHistoryRecord, true)
    this.shadow.addEventListener("input", this.touch, true)
    this.shadow.addEventListener("change", this.touch, true)
    this.shadow.addEventListener("keydown", this.touchByKey as EventListener, true)
    window.addEventListener("beforeunload", this.warnBeforeLeaving)
    const src = this.getAttribute("src")
    if (src) void this.importFromUrl(src)
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string): void {
    if (name === "src" && newValue && newValue !== oldValue && this.isConnected) {
      void this.importFromUrl(newValue)
    }
  }

  disconnectedCallback(): void {
    window.removeEventListener("beforeunload", this.warnBeforeLeaving)
    this.shadow.removeEventListener("pointerdown", this.armHistory, true)
    this.shadow.removeEventListener("keydown", this.armHistory as EventListener, true)
    for (const type of ["input", "change", "click", "keyup", "pointerup"]) this.shadow.removeEventListener(type, this.scheduleHistoryRecord, true)
    clearTimeout(this.historyTimer)
    this.shadow.removeEventListener("input", this.touch, true)
    this.shadow.removeEventListener("change", this.touch, true)
    this.shadow.removeEventListener("keydown", this.touchByKey as EventListener, true)
    this.cloudEditor.stopManipulation()
    document.removeEventListener("click", this.handleOutsideContextMenuClick)
    this.endDrag()
    // Moving the editor in the page disconnects it and connects it again within the same task: only an
    // editor still out of the page after that has gone, and its text editor must stop (its linter keeps
    // a timer that dispatches on the view, which fails once the window it measured against is closed).
    queueMicrotask(() => { if (!this.isConnected) this.releaseFileEditor() })
  }

  /** Frees the File group's text editor of an editor that left the page; it is made again when it is needed. */
  private releaseFileEditor(): void {
    this.fileEditor?.destroy()
    this.fileEditor = undefined
    this.fileEditorLoading = undefined
  }

  /** Preview preferences stay outside the saved observation. */
  setCloudRendering(mode: "surface" | "volume"): void { this.sceneElement.setCloudRendering(mode) }

  showWeatherEditor(): void {
    const index = this.groupPanels.findIndex(panel => panel.id === "group-weather")
    if (index >= 0) this.toggleGroup(this.groupTabs[index], true)
  }

  get sightingData(): SightingRecordingJson {
    return this.ufoElement.sightingData
  }

  set sightingData(json: SightingRecordingJson) {
    this.endDrag() // an in-progress drag references the OLD timeline's shape — don't let it
    // keep writing into the newly-loaded one
    this.ufoElement.sightingData = json
    // The scene takes the shape of the picture the recording was made in, as the shapes' own canvas just did: through the player alone it never heard
    // of the format, and a Roamer's frame was drawn over a sixteen-by-nine sky, every handle and every pick standing off by the difference.
    this.sceneElement.applyFrameFormat()
    this.cloudEditor.reset()
    this.bodyEditor?.sync()
    this.syncBodiesShown()
    // Resets to the first source actually present in the loaded data, not the hardcoded
    // default — a loaded recording using different source ids would otherwise have the next
    // appearance edit silently create a disconnected new "ufo-1" source instead of editing
    // anything visible.
    this.currentSourceId = this.ufoElement.sighting.timeline.sourceIds[0] ?? DEFAULT_SOURCE_ID
    this.selectedSourceIds = new Set([this.currentSourceId])
    this.refreshSourceList()
    this.currentDecorId = this.ufoElement.sighting.decor[0]?.id
    this.refreshDecorList()
    this.currentReferenceId = this.ufoElement.sighting.references[0]?.id
    this.refreshReferenceList()
    this.currentTraceId = this.ufoElement.sighting.traces[0]?.id
    this.refreshTraceList()
    this.currentMilestoneT = this.ufoElement.sighting.milestones[0]?.t
    this.refreshMilestoneList()
    this.onSelectionOrTimeChanged()
    this.syncDurationField()
    this.syncObservationTimeFields()
    this.syncObservationEndTimeFields()
    // After the two syncs above, which is what it reads to decide.
    this.chooseTimeInputMode()
    this.syncObserverMetadataFields()
    this.offsetIsAuthors = false
    this.refreshTimeZoneOptions()
    this.syncUtcOffsetField()
    this.syncPlaceNameField()
    this.syncGroundElevationField()
    // A recording that is loaded stands where it stands, and its scenery is its own: nothing is asked of the survey.
    const standing = this.plantingCentre()
    this.surroundings.placeLoaded(standing?.lat, standing?.lng)
    this.syncSceneryPicker()
    this.syncWeatherOwnership()
    this.frozenPanel.render()
    this.refreshFileItems()
    // Weather itself is resynced by onSelectionOrTimeChanged() above (syncWeatherFromTimeline) —
    // and SceneElement's own updateAstronomy() (driven by the sightingData assignment above,
    // which surfaces as a timeupdate) already resolves+applies it, unlike before this was a
    // keyframed track.
    this.markClean()
  }

  /** The recording as it was when it was loaded or last exported, to tell whether leaving would lose anything. */
  private baseline = ""
  /** Whether the author did anything to the form since: what tells an edit from what the editor itself derived (a weather, a zone). */
  private touched = false
  /**
   * Whether this editor warns a page that is being left with changes not exported. On, unless whoever holds it
   * (see CaseEditorElement) keeps that watch for the case it is a part of.
   */
  guardsLeaving = true

  /**
   * Whether the recording holds changes that were not exported: the author did something, and what the form states
   * is no longer what was loaded. Computed when asked, since a recording is large and an answer is wanted only
   * when something is about to be lost.
   */
  get dirty(): boolean {
    return this.touched && JSON.stringify(this.sightingData) !== this.baseline
  }

  /** Whether the author did anything to the form since the recording was loaded or exported — what the editor derives by itself does not count. */
  get edited(): boolean {
    return this.touched
  }

  /** Says the recording as it stands is the one that was loaded or exported: nothing to lose. */
  markClean(): void {
    if (this.applyingFileText) return
    this.baseline = JSON.stringify(this.sightingData)
    this.touched = false
    // The text's changed lines are changed from this: the recording as it was loaded or last exported.
    this.savedFileText = this.fileText()
    this.fileEditor?.markSaved()
  }

  /**
   * The text of the recording as it was when it was loaded or last exported, for the File group's changed lines. Used
   * once the author has done something: before that, the changed lines are changed from the text as the form spells it,
   * since what the editor derives by itself after a load (a weather, a zone) is no change of theirs.
   */
  private savedFileText?: string

  private readonly touch = (): void => {
    this.touched = true
  }

  /**
   * Undo and redo are the File group's text editor's own (see SightingFileEditor): the recording as text, kept in step
   * with the form, whose history is therefore the recording's. The editor is loaded the first time the author touches
   * anything, with the recording as it stood BEFORE that touch (taken on the press or the key, ahead of its effect), and
   * each change after is written into it as a step of its own: undoing is asking it to take back its last change, and
   * applying the text it then holds is what the File group already does for an author typing in it.
   */
  private readonly armHistory = (): void => {
    this.historySnapshot ??= this.fileText()
    // A change made while the text editor is still loading was due to be written when the quiet moment ended (see recordHistory), which found no editor and
    // gave up: it is written now, which is what made undo come late or never on a slow machine.
    if (this.fileEditor === undefined) void this.loadFileEditor().then(() => { this.recordHistory(); this.syncHistoryButtons() }, () => undefined)
  }

  private readonly scheduleHistoryRecord = (): void => {
    if (this.historySnapshot === undefined) return
    clearTimeout(this.historyTimer)
    this.historyTimer = setTimeout(() => this.recordHistory(), 350)
  }

  /** Writes what the form now says into the history, as one step — when it says something other than what the
   * history last saw, which is not the case after the text itself was applied (see applyFileText). */
  private recordHistory(): void {
    this.historyTimer = undefined
    const editor = this.fileEditor
    if (editor === undefined || this.historySnapshot === undefined) return
    const now = this.fileText()
    if (now === this.historySnapshot) return
    this.historySnapshot = now
    this.historyAnswering = false
    editor.replaceText(now, this.fileSyncActive())
    this.fileTextApplied = editor.text
    this.syncHistoryButtons()
  }

  /** Takes back the last change. */
  private undo(): void {
    this.stepHistory(editor => editor.undo(this.fileSyncActive()))
  }

  private redo(): void {
    this.stepHistory(editor => editor.redo(this.fileSyncActive()))
  }

  private stepHistory(step: (editor: SightingFileEditor) => boolean): void {
    // What was just done is written first, or it would be what the step takes back instead of what came before.
    if (this.historyTimer !== undefined) {
      clearTimeout(this.historyTimer)
      this.recordHistory()
    }
    const editor = this.fileEditor
    if (editor === undefined || this.isRecording || this.ufoElement.playbackState === "playing") return
    if (!step(editor)) return
    // At once, not after the half second an author's typing is given: a key pressed to undo is answered now.
    clearTimeout(this.fileApplyTimer)
    this.applyFileText(editor.text, true)
    this.historyAnswering = true
    this.syncHistoryButtons()
  }

  private syncHistoryButtons(): void {
    this.undoButton.disabled = !(this.fileEditor?.canUndo ?? false)
    this.redoButton.disabled = !(this.fileEditor?.canRedo ?? false)
  }

  /** Forgets what was edited: another recording was loaded, and what came before it is not its past. */
  private resetHistory(): void {
    clearTimeout(this.historyTimer)
    this.historyTimer = undefined
    this.historySnapshot = undefined
    this.historyAnswering = false
    this.fileEditor?.destroy()
    this.fileEditor = undefined
    this.fileTextApplied = undefined
    this.fileEditorLoading = undefined
    this.syncHistoryButtons()
    if (this.isGroupIdOpen("group-file")) void this.loadFileEditor().then(() => this.syncFileEditor(false), () => undefined)
  }

  /** Moving through the form by keyboard is no edit; deleting a shape from the picture is. */
  private readonly touchByKey = (event: KeyboardEvent): void => {
    if (event.key === "Delete" || event.key === "Backspace") this.touched = true
  }

  private readonly warnBeforeLeaving = (event: BeforeUnloadEvent): void => {
    if (!this.guardsLeaving || !this.dirty) return
    event.preventDefault()
    event.returnValue = ""
  }

  /**
   * Asks whoever holds this editor whether replacing the recording is allowed: the event is cancelable and carries
   * `proceed`, to call once the author has agreed, and whether this recording holds `dirty` changes. The holder may hold
   * more than this recording (a case), so it is told even when this one is clean. Unanswered, the replacement goes on
   * as it always did. Returns whether the replacement waits.
   */
  private holdLoad(proceed: () => void): boolean {
    return !this.dispatchEvent(new CustomEvent("beforeload", { detail: { proceed, dirty: this.dirty }, cancelable: true, bubbles: true, composed: true }))
  }

  /** Downloads the current recording as a standalone SightingRecordingJson file — a plain
   * Blob-and-anchor download, no server round-trip needed. Named from the observer reference
   * when known (e.g. "chiles-sighting.json"), falling back to a generic name otherwise. */
  private exportJson(): void {
    const findings = IdentityGuard.inspect(this.sightingData, this.loadedJson())
    if (findings.length === 0) {
      void this.downloadJson()
      return
    }
    this.askAboutIdentity(findings)
  }

  /** The recording as it was opened or last exported: what its author has already stood behind. */
  private loadedJson(): SightingRecordingJson | undefined {
    try {
      return this.baseline ? JSON.parse(this.baseline) as SightingRecordingJson : undefined
    } catch {
      return undefined
    }
  }

  /**
   * The recording names or locates somebody, and says so before it leaves: what was found, and three answers. Nothing is decided
   * for the author (the person may well have agreed, or published their own account): they are made to see it, once, at the one
   * moment the file leaves. Not a native dialog, for the reason `askAboutWeather` gives.
   */
  private askAboutIdentity(findings: IdentityFinding[]): void {
    const labels: Record<IdentityFinding["kind"], string> = {
      lastName: this.messages.identityLastName, firstNames: this.messages.identityFirstNames,
      nameInId: this.messages.identityNameInId, nameInText: this.messages.identityNameInText,
      address: this.messages.identityAddress, email: this.messages.identityEmail, phone: this.messages.identityPhone
    }
    this.shadow.getElementById("identity-ask-text")!.textContent = this.messages.identityAsk
    const list = this.shadow.getElementById("identity-ask-found")!
    list.replaceChildren(...findings.map(finding => {
      const item = document.createElement("li")
      item.textContent = labels[finding.kind].replaceAll("{value}", finding.found)
      return item
    }))
    // Initials can stand for a name; nobody's address or telephone number has any.
    const named = findings.some(finding => ["lastName", "firstNames", "nameInId", "nameInText"].includes(finding.kind))
    ;(this.shadow.getElementById("identity-ask-initials") as HTMLButtonElement).hidden = !named
    if (typeof this.identityAsk.showModal === "function") this.identityAsk.showModal()
    else this.identityAsk.setAttribute("open", "")
  }

  private closeIdentityAsk(): void {
    if (typeof this.identityAsk.close === "function") this.identityAsk.close()
    else this.identityAsk.removeAttribute("open")
  }

  /**
   * The names in the observer fields, in the identifiers and in the account being written, are written as initials. The file is NOT
   * saved by this: the author sees what became of it, and saves when it is as they mean it (and is asked again only about what is left,
   * an address say, which has no initials).
   */
  private writeNamesAsInitials(): void {
    const names = IdentityGuard.namesOf(this.sightingData)
    this.observerLastNameInput.value = IdentityGuard.withInitials(this.observerLastNameInput.value, names)
    this.observerFirstNamesInput.value = this.observerFirstNamesInput.value.split(",")
      .map(name => IdentityGuard.withInitials(name.trim(), names)).join(", ")
    this.observerIdInput.value = IdentityGuard.withInitials(this.observerIdInput.value, names, true)
    this.sightingIdInput.value = IdentityGuard.withInitials(this.sightingIdInput.value, names, true)
    this.descriptionInput.value = IdentityGuard.withInitials(this.descriptionInput.value, names)
    this.touch()
    this.updateObserverMetadata()
    this.descriptionInput.dispatchEvent(new Event("input"))
  }

  /**
   * Downloads the recording as a file, once its author has seen what it states. With the data it carries frozen (see FrozenDataPanel),
   * taken first where it has to be: then one zip, of the recording and its annexes as they are to stand beside each other.
   */
  private async downloadJson(): Promise<void> {
    const base = this.fileBase()
    let annexes = new Map<string, Uint8Array>()
    // At once when there is nothing to take or to carry: a recording with no place stands on no ground.
    if (this.frozenPanel.hasWork()) {
      this.exportButton.disabled = true
      try {
        annexes = await this.frozenPanel.prepare(base)
      } finally {
        this.exportButton.disabled = false
      }
    }
    const json = this.sightingData
    // What the recording keeps of its own text beside it is written there, and not inside it too.
    for (const name of RecordingSections.NAMES) {
      const section = this.sectionFilePanel.annex(name)
      if (!section) continue
      // Beside the recording, it goes into the archive; at an address of its own, it is read from there.
      if (!/^[a-z][a-z0-9+.-]*:/i.test(section.src)) annexes.set(section.src, section.bytes)
      for (const key of RecordingSections.KEYS[name]) delete (json as unknown as Record<string, unknown>)[key]
    }
    const fileName = `${base}.json`
    const text = JSON.stringify(json, null, 2)
    if (annexes.size === 0) {
      this.download(new Blob([text], { type: "application/json" }), fileName)
    } else {
      const { zipSync, strToU8 } = await import("fflate")
      const archive: Record<string, Uint8Array> = { [fileName]: strToU8(text) }
      for (const [path, bytes] of annexes) archive[path] = bytes
      // Stored, not deflated: the annexes are compressed already, each its own way.
      const zip = zipSync(archive, { level: 0 })
      this.download(new Blob([zip as BlobPart], { type: "application/zip" }), `${base}.zip`)
      this.showFileNote(this.messages.frozenExported.replaceAll("{count}", String(annexes.size)).replaceAll("{size}", FrozenDataPanel.size(zip.length)))
    }
    this.markClean()
  }

  /**
   * The recording's file name without `.json`, as it is saved, and as its annexes are named after it: the file it was read from, so that
   * it is saved under its own name beside the annexes it names, or else one made from its observer.
   */
  private fileBase(): string {
    const read = this.sceneElement.documentUrl?.split(/[?#]/)[0].split("/").pop()
    if (read?.endsWith(".json") && read.length > ".json".length) return decodeURIComponent(read.slice(0, -".json".length))
    return `${this.sightingData.observer?.id ?? "sighting"}-sighting`
  }

  /**
   * The Files group's picker, said again: the recording, by the file it was read from or is saved as, then each annex it carries frozen,
   * by where it is or that it is still to be taken. What was picked stays picked.
   */
  private refreshFileItems(): void {
    const select = this.fileItemSelect
    if (!select) return
    this.syncFilePickers()
    const picked = select.value || "recording"
    // What each holds: where it is, its source says.
    select.replaceChildren(
      new Option(this.messages.fileItemRecording, "recording"),
      ...RecordingSections.NAMES.map(name => new Option(this.sectionFilePanel.itemLabel(name), name)),
      ...FrozenGroups.NAMES.map(name => new Option(this.frozenPanel.itemLabel(name), name)))
    select.value = picked
    this.showFileItem(select.value)
  }

  /**
   * Shows the detail of one item of the Files group: the recording, its weather, or one of its annexes. The recording's text is under the
   * recording, and under an item kept inside it, with that item's section shown: its file is the recording's own.
   */
  private showFileItem(item: string): void {
    const annex = (FrozenGroups.NAMES as readonly string[]).includes(item)
    const part = (RecordingSections.NAMES as readonly string[]).includes(item) ? item as RecordingSectionName : undefined
    this.shadow.getElementById("file-recording")!.hidden = annex || part !== undefined
    this.shadow.getElementById("frozen-data")!.hidden = !annex
    this.shadow.getElementById("file-section")!.hidden = part === undefined
    // The item's frame unrolls from the picker of the files, as every list's does (see ElementList.glue).
    for (const id of ["file-recording", "frozen-data", "file-section"]) {
      const frame = this.shadow.getElementById(id)!
      if (!frame.hidden) ElementList.glue(frame)
    }
    if (annex) this.frozenPanel.show(item as FrozenGroupName)
    if (part) this.sectionFilePanel.show(part)
    const section: JsonPath | undefined = annex && this.frozenPanel.isInlineGroup(item as FrozenGroupName) ? ["frozen", item, "src"]
      : part && this.sectionFilePanel.isInline(part) ? SectionFilePanel.pathOf(part)
      : undefined
    this.fileEditorHost.hidden = (annex || part !== undefined) && section === undefined
    if (section && this.isGroupIdOpen("group-file")) {
      void this.loadFileEditor().then(editor => {
        this.syncFileEditor(false)
        editor.reveal(section)
      }, () => undefined)
    }
  }

  /** Whether a part of the recording is read from its file rather than asked of its source (see RecordingSections.fromFile). */
  private sectionFromFile(name: "place" | "lightPollution" | "decor"): boolean {
    return RecordingSections.fromFile(this.ufoElement.sighting.frozen, name)
  }

  /** The recording's own file, absolute: the address it was read from, or the file it is saved as. */
  private masterUrl(): string {
    return this.sceneElement.documentUrl ?? new URL(`${this.fileBase()}.json`, location.href).href
  }

  /** What the weather's picker links to when the weather is read from the file. */
  private weatherFileItemLabel(): string {
    return this.sectionFilePanel?.itemLabel("weather") ?? ""
  }

  private download(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = fileName
    link.click()
    URL.revokeObjectURL(url)
  }

  /** Where each frozen group is taken from: the sources chosen in the Position group, and the scene's own for the rest. */
  private freezerSources(): FreezerSources {
    const elevation = dataSourceById(ELEVATION_SOURCES, this.chosenSourceId.get("elevation"))
    return {
      elevation: elevation.create(),
      elevationCredit: elevation.credit,
      imagery: dataSourceById(IMAGERY_SOURCES, this.chosenSourceId.get("imagery")).id,
      roads: defaultRoadProvider(),
      water: defaultWaterProvider(),
      railways: defaultRailwayProvider()
    }
  }

  /** Loads a SightingRecordingJson from a user-picked local file — the counterpart to
   * exportJson(). Reads via FileReader (readAsText), not the File API's own newer .text() —
   * jsdom's File doesn't implement .text() (confirmed empirically), and FileReader is the more
   * broadly-supported option in real browsers too. The picker empties itself once it has said what
   * was picked, so that re-picking the exact same file (e.g. after fixing and re-saving it) is said again. */
  private async importFromFile(file: File): Promise<void> {
    // Not read yet when held: the picked file is read when the author agrees.
    if (this.holdLoad(() => void this.loadFile(file))) return
    await this.loadFile(file)
  }

  private async loadFile(file: File): Promise<void> {
    try {
      const bytes = new Uint8Array(await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as ArrayBuffer)
        reader.onerror = () => reject(reader.error)
        reader.readAsArrayBuffer(file)
      }))
      FrozenAnnexes.release()
      const text = await this.recordingText(bytes)
      const json = JSON.parse(text) as SightingRecordingJson
      if (CaseFile.isCase(json)) {
        if (this.offerCase(json, undefined)) return
        throw new Error("A case has no recording to edit here")
      }
      // A picked file has no address of its own: its relative addresses can only mean the page's.
      this.sceneElement.documentUrl = undefined
      this.sightingData = json
      this.resetHistory()
      this.dispatchEvent(new CustomEvent("recordingloaded", { bubbles: true, composed: true }))
      // The recording now open came from a file, not from the address still sitting in the field.
      this.importInput.url = ""
    } catch {
      window.alert(this.messages.importError)
    }
  }

  /**
   * The recording's text, from a file that is the recording itself or a zip of it and its annexes (what Save writes when the recording carries
   * frozen data). The annexes of a zip are held for the scene, at the addresses the recording names them by (see FrozenAnnexes).
   */
  private async recordingText(bytes: Uint8Array): Promise<string> {
    // "PK", the start of every zip.
    if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) return new TextDecoder().decode(bytes)
    const { unzipSync, strFromU8 } = await import("fflate")
    const files = unzipSync(bytes)
    const annex = /\.(relief|imagery|map)\.zip$|\.(roads|water|railways|upper-air|weather)\.json$/
    const name = Object.keys(files).find(path => path.endsWith(".json") && !annex.test(path))
    if (!name) throw new Error("No recording in this archive")
    const folder = name.includes("/") ? name.slice(0, name.lastIndexOf("/") + 1) : ""
    for (const [path, content] of Object.entries(files)) {
      if (path !== name && path.startsWith(folder)) FrozenAnnexes.hold(FrozenAnnexes.address(path.slice(folder.length), undefined), content)
    }
    const text = strFromU8(files[name])
    // What it keeps of its own text beside it is put back in it, as a player does (see SightingFetch.recording).
    const json = JSON.parse(text) as Record<string, unknown> & { frozen?: Record<string, { src?: string } | undefined> }
    let put = false
    for (const section of RecordingSections.NAMES) {
      const src = json.frozen?.[section]?.src
      const file = src !== undefined ? files[folder + src] : undefined
      if (!file) continue
      const kept = JSON.parse(strFromU8(file)) as Record<string, unknown>
      for (const key of RecordingSections.KEYS[section]) if (kept[key] !== undefined) json[key] = kept[key]
      put = true
    }
    return put ? JSON.stringify(json) : text
  }

  // -- A case, which this editor does not hold ---------------------------------------------------

  /**
   * Hands a case's `case.json` to whoever edits cases (see CaseEditorElement) — the `src` attribute and the
   * address and file fields may be given one. An editor of one recording holds no case, and says so
   * when nobody takes it.
   */
  private offerCase(json: unknown, url: string | undefined): boolean {
    return !this.dispatchEvent(new CustomEvent("caseloaded", { detail: { json, url }, bubbles: true, composed: true, cancelable: true }))
  }

  /** The shapes a body can stand for: those of the account the reading on show reads, or the recording's own. */
  private bodyShapeIds(): string[] {
    return this.accountShapeIds ? [...this.accountShapeIds] : this.ufoElement.sighting.timeline.sourceIds
  }

  /** What the page's own relative addresses (a model, a picture) are relative to: where the recording on show lives. */
  set documentUrl(url: string | undefined) {
    this.sceneElement.documentUrl = url
  }

  /** Loads a SightingRecordingJson fetched from a user-entered URL — same failure handling as
   * importFromFile(). Does nothing on an empty URL rather than firing a request at the page's own
   * origin. */
  /** `url` defaults to the Observation group's own "load from URL" field — explicit callers
   * (viewObserverAccount) pass a observer decor object's own sightingUrl instead. */
  /** Fetches a recording and loads it into the editor — shared by the "Load from URL" field and
   * by the `src` attribute above. Failure is reported to the user rather than thrown: a bad URL
   * in a shared link should leave a usable empty editor, not a broken page. */
  private async importFromUrl(url: string = this.importInput.url): Promise<void> {
    if (!url) return
    if (this.holdLoad(() => void this.loadUrl(url))) return
    await this.loadUrl(url)
  }

  private async loadUrl(url: string): Promise<void> {
    try {
      const fetched = await SightingFetch.recording(url)
      // A case is not a recording: whoever edits cases takes it (see offerCase).
      if (CaseFile.isCase(fetched)) {
        const address = new URL(url, location.href).href
        if (this.offerCase(fetched, address)) {
          this.importInput.url = address
          return
        }
        throw new Error("A case has no recording to edit here")
      }
      const json = fetched as SightingRecordingJson
      // Its annexes are beside it, not what the editor held for the last one.
      FrozenAnnexes.release()
      // What the models it names by `url` are relative to — see SceneElement.documentUrl.
      this.sceneElement.documentUrl = new URL(url, location.href).href
      this.sightingData = json
      this.resetHistory()
      // Says where the open recording came from, whichever way it was asked for: typed here, the
      // `src` attribute (a site's `?file=` link), or a observer's own file. Absolute, so the
      // address can be copied out of the field and still work, and so the field is a valid URL.
      this.importInput.url = new URL(url, location.href).href
      this.dispatchEvent(new CustomEvent("recordingloaded", { bubbles: true, composed: true }))
    } catch (error) {
      window.alert(this.importErrorFor(error))
    }
  }

  /**
   * Says what actually went wrong, where this used to say "couldn't load that recording" to every
   * one of five quite different problems.
   *
   * The one worth telling apart is CORS, because it is the only one whose fix is not the reader's:
   * the file is there, the address is right, and what has to change is a header on somebody else's
   * server. Answering "check the file or URL and try again" sent people to look at the two things
   * that were already correct. See SightingFetch for how far a browser lets a page work it out, and
   * why the wording hedges.
   */
  private importErrorFor(error: unknown): string {
    if (!(error instanceof SightingFetchError)) return this.messages.importError
    switch (error.kind) {
      case "cors":
        return this.messages.importErrorCors
      case "mixed-content":
        return this.messages.importErrorMixedContent
      case "unreachable":
        return this.messages.importErrorUnreachable
      case "status":
        return this.messages.importErrorStatus.replace("{status}", String(error.status ?? ""))
      case "malformed":
        return this.messages.importErrorMalformed
      default:
        return this.messages.importError
    }
  }


  /** Where a Claude key was kept before settings were each provider's own — read once, so nobody
   * retypes theirs, then cleared (see storedNarrativeSetting and rememberNarrativeSettings). */
  private static readonly NARRATIVE_KEY_STORAGE = "rr0-sighting-editor.narrative-key"

  /** And the workspace it named, the same way. */
  private static readonly NARRATIVE_SCOPE_STORAGE = "rr0-sighting-editor.narrative-workspace"

  /** Where the browser remembers which survey the author takes the scenery from, or that they take none (see readSceneryChoice). */
  private static readonly SCENERY_STORAGE = "rr0-sighting-editor.surroundings"
  /** And how far round the observer it is asked, in metres. */
  private static readonly SCENERY_RADIUS_STORAGE = "rr0-sighting-editor.surroundings-radius"
  /** What the choice says for "no survey": the scenery is the author's alone. */
  private static readonly NO_SCENERY = "none"

  /** Built once, up front: constructing one is free (its SDK and its client load on the first ask,
   * not here), and the panel has to know before any draft whether this reader needs a key at all —
   * see NarrativeProvider.needsCredential, and syncNarrativeEnabled. */
  private narrativeProvider: NarrativeProvider = NARRATIVE_SOURCES[0].create()

  /** Which registered provider drafts — what the stored settings are filed under. */
  private get narrativeSourceId(): string {
    return dataSourceById(NARRATIVE_SOURCES, this.chosenSourceId.get("narrative")).id
  }

  private narrativeAbort?: AbortController

  /**
   * Reads the account in the Description field and rewrites the rest of the recording from it.
   *
   * One direction only. The account is what the observer said and does not change; everything else
   * is what a reader makes of it, and pressing this says "make it again". So the draft never writes
   * `description` back — that would overwrite the very text it was asked to read — and every other
   * field it states is applied as stated.
   *
   * Fields the draft is silent about are left alone, which is not the same as a merge: it is the
   * account being silent. Coordinates geocoded by hand, an instrument chosen, decor placed — none
   * of that is in a account, and none of it is a reader's to lose because they reworded a
   * sentence.
   */
  private async draftFromDescription(): Promise<void> {
    const ask = this.descriptionInput.value.trim()
    if (ask === "" || this.narrativeAbort) return
    const abort = this.narrativeAbort = new AbortController()
    this.setNarrativeBusy(true)
    try {
      const draft = await this.narrativeProvider.draft({
        ask,
        current: this.sightingData,
        language: SightingEditorElement.LANGUAGE_NAMES[this.showerLanguage()],
        settings: this.narrativeSettingValues()
      }, abort.signal)
      this.applyNarrativeDraft(draft)
    } catch (error) {
      // A reader who pressed Stop knows what happened; saying it back to them is noise.
      const cancelled = error instanceof NarrativeError && error.kind === "cancelled"
      this.narrativeStatus.textContent = cancelled ? "" : this.narrativeErrorFor(error)
      this.narrativeStatus.classList.toggle("error", !cancelled)
    } finally {
      this.narrativeAbort = undefined
      this.setNarrativeBusy(false)
    }
  }

  private applyNarrativeDraft(draft: NarrativeDraft): void {
    // Stripped rather than trusted not to be there: the account is the one thing in the recording a
    // draft may never touch, and that has to hold whatever any provider decides to send back.
    // The offset goes the same way whenever a zone came with it. It is not account and not a
    // reading of one: it is what that zone's own rules give at that date, and this editor already
    // reads them out of the platform's IANA database (see applyTimeZoneOffset). A observer states
    // where they were; nobody states that France had no summer time in 1974.
    const { description, ...rest } = draft.recording
    void description
    const { utcOffsetHours, ...withoutOffset } = rest
    const recording = rest.timeZone ? withoutOffset : rest
    void utcOffsetHours
    const paths = DraftPatch.stated(recording)
    if (paths.length > 0) {
      // Applied to the PLAIN recording, never to what sightingData hands out: a value that already
      // carries a basis is written there as {value, basis, rationale}, and a patch descending into
      // that object would set a field of the wrapper instead of replacing it. Provenance belongs to
      // the file; patching is arithmetic on values.
      const before = this.ufoElement.sighting.provenance
      const base = plainSightingJson(this.ufoElement.sighting)
      this.sightingData = DraftPatch.apply(base, DraftRecording.loadable(recording), paths)
      // Loading a plain recording left the table empty. What was known before this draft is still
      // true of every value the draft did not touch — and stops being true, on its own, for the
      // ones it did: an entry expires when the value it was said about changes (ProvenanceEntry.of).
      this.ufoElement.sighting.provenance = before
      this.recordNarrativeProvenance(draft, paths)
      // And now the zone decides the offset, as it does after any date edit — a draft that brought
      // one has just changed the very two things the answer depends on.
      if (this.ufoElement.sighting.event.timeZone) {
        this.applyTimeZoneOffset()
      }
    }
    this.narrativeStatus.textContent = paths.length > 0
      ? this.messages.narrativeApplied.replace("{count}", String(paths.length))
      : this.messages.narrativeUnchanged
    this.narrativeStatus.classList.remove("error")
    this.showNarrativeReport(draft)
    this.syncNarrativeEnabled()
  }

  /**
   * Writes each claim's basis into the recording, so that the file itself says which of its values
   * the observer gave and which a reading supplied.
   *
   * Only for paths the draft actually wrote: a claim about a field that never made it in (the
   * account, which is stripped above) has nothing to be a basis of. And only where the value is not
   * simply the observer's own — a "stated" claim with nothing to add is the default, and writing it
   * would put noise in every file (see Provenance.set).
   */
  private recordNarrativeProvenance(draft: NarrativeDraft, written: string[]): void {
    const sighting = this.ufoElement.sighting
    const applied = new Set(written)
    for (const claim of draft.claims) {
      // A claim can name a leaf inside an array the patch wrote whole ("timeline.keyframes.0.…"),
      // so a path counts as written when the patch wrote it or wrote something it sits under.
      if (!applied.has(claim.path) && !written.some(path => claim.path.startsWith(`${path}.`))) {
        continue
      }
      sighting.provenance.set(claim.path, {
        basis: claim.basis,
        rationale: claim.rationale,
        of: SightingEditorElement.valueAt(
          plainSightingJson(this.ufoElement.sighting) as unknown as Record<string, unknown>, claim.path)
      })
    }
  }

  /** The value the recording currently holds at a dot-joined path, array indices included — what a
   * provenance entry is pinned to, so it expires when an author types over it. */
  private static valueAt(root: Record<string, unknown>, path: string): unknown {
    let at: unknown = root
    for (const step of path.split(".")) {
      if (typeof at !== "object" || at === null) {
        return undefined
      }
      at = (at as Record<string, unknown>)[step]
    }
    return at
  }

  /** What the draft says it read, how it got there, and what it could not settle. Rendered rather
   * than summarised: a quote is the evidence, and a count of quotes is not. */
  private showNarrativeReport(draft: NarrativeDraft): void {
    this.narrativeReport.replaceChildren()
    // Grouped by basis, worst first: what was guessed is what an author has to go and check, and
    // burying it among forty quoted values is how it stops being checked.
    for (const basis of ["assumed", "derived", "stated"] as const) {
      const claims = draft.claims.filter(claim => claim.basis === basis)
      if (claims.length === 0) {
        continue
      }
      this.narrativeReport.append(this.narrativeHeading(this.messages[BASIS_HEADINGS[basis]]))
      for (const claim of claims) {
        const row = document.createElement("div")
        row.className = `claim ${basis}`
        const path = document.createElement("code")
        path.textContent = claim.path
        // A quotation for a quotation, plain text for a piece of reasoning: an author skimming for
        // what was made up should not have to read to tell the two apart.
        const why = document.createElement(basis === "stated" ? "q" : "span")
        why.textContent = claim.rationale
        row.append(path, why)
        this.narrativeReport.append(row)
      }
    }
    if (draft.gaps.length > 0) {
      this.narrativeReport.append(this.narrativeHeading(this.messages.narrativeGaps))
      const list = document.createElement("ul")
      list.className = "gaps"
      for (const gap of draft.gaps) {
        const item = document.createElement("li")
        item.textContent = gap
        list.append(item)
      }
      this.narrativeReport.append(list)
    }
    this.narrativeReport.hidden = this.narrativeReport.childElementCount === 0
  }

  private narrativeHeading(text: string): HTMLElement {
    const heading = document.createElement("h4")
    heading.textContent = text
    return heading
  }

  private setNarrativeBusy(busy: boolean): void {
    this.descriptionInput.disabled = busy
    this.narrativeStopButton.hidden = !busy
    if (busy) {
      this.narrativeStatus.textContent = this.messages.narrativeWorking
      this.narrativeStatus.classList.remove("error")
    }
    this.syncNarrativeEnabled()
  }

  /**
   * Offers the button only when pressing it would do something, and says on the button itself what
   * is missing when it wouldn't.
   *
   * A button that silently does nothing is the worse of the two failures: a reader who typed an
   * account and forgot the key would press it, watch nothing happen, and have no way to tell a
   * missing field from a broken feature. The tooltip names the field, and names the SOURCE the key
   * is for, since "API key" alone leaves them to guess whose.
   */
  private syncNarrativeEnabled(): void {
    const source = dataSourceById(NARRATIVE_SOURCES, this.chosenSourceId.get("narrative")).name
    const missing = this.narrativeProvider.settings.find(setting =>
      setting.required && (this.narrativeSettingInputs.get(setting.id)?.value.trim() ?? "") === "")
    const missingAsk = this.descriptionInput.value.trim() === ""
    this.narrativeDraftButton.disabled = Boolean(this.narrativeAbort) || missing !== undefined || missingAsk
    this.narrativeDraftButton.title = missing
      ? this.messages.narrativeNeedsSetting
        .replace("{setting}", this.said.read(missing.label) ?? missing.id)
        .replace("{source}", source)
      : missingAsk ? this.messages.narrativeNeedsAsk : ""
    // A reader with nothing to keep is not offered to keep it.
    this.narrativeRememberInput.parentElement!.hidden =
      !this.narrativeProvider.settings.some(setting => setting.remembered === "credential")
    // Marked, never blocked: see NarrativeSetting.suspect.
    for (const setting of this.narrativeProvider.settings) {
      const input = this.narrativeSettingInputs.get(setting.id)
      if (!input || !setting.suspect) continue
      const typed = input.value.trim()
      const warning = typed === "" ? undefined : setting.suspect(typed)
      input.classList.toggle("invalid", warning !== undefined)
      input.title = warning ? this.said.read(warning) ?? "" : this.said.read(setting.hint) ?? ""
    }
  }

  /**
   * Builds the fields the current provider declares (see NarrativeSetting), in the reader's
   * language, with what was kept of them on this device. Rebuilt when the provider changes and on a
   * language change; values typed in the fields being replaced are carried over.
   */
  private renderNarrativeSettings(): void {
    const typed = this.narrativeSettingValues()
    this.narrativeSettingInputs = new Map()
    const fields = this.narrativeProvider.settings.map(setting => {
      const label = document.createElement("label")
      const text = document.createElement("span")
      text.textContent = this.said.read(setting.label) ?? setting.id
      let input: HTMLInputElement | HTMLSelectElement
      if (setting.kind === "choice") {
        input = document.createElement("select")
        for (const choice of setting.choices ?? []) {
          const option = document.createElement("option")
          option.value = choice.value
          option.textContent = this.said.read(choice.label) ?? choice.value
          input.appendChild(option)
        }
      } else {
        input = document.createElement("input")
        input.type = setting.kind === "secret" ? "password" : "text"
        input.autocomplete = "off"
        input.spellcheck = false
        input.placeholder = this.said.read(setting.placeholder) ?? ""
      }
      input.id = `narrative-${setting.id}`
      input.title = this.said.read(setting.hint) ?? ""
      const kept = typed[setting.id] ?? this.storedNarrativeSetting(setting.id)
      if (kept !== undefined) input.value = kept
      input.addEventListener(setting.kind === "choice" ? "change" : "input", () => {
        this.rememberNarrativeSettings()
        this.syncNarrativeEnabled()
      })
      this.narrativeSettingInputs.set(setting.id, input)
      label.append(text, document.createTextNode(" "), input)
      return label
    })
    this.narrativeSettingsBox.replaceChildren(...fields)
    // The box is ticked when a credential of this provider was kept: it says where the value came from.
    this.narrativeRememberInput.checked = this.narrativeProvider.settings.some(setting =>
      setting.remembered === "credential" && this.storedNarrativeSetting(setting.id) !== undefined)
    this.syncNarrativeEnabled()
  }

  /** What the reader gave each setting of the current provider, empty ones left out. */
  private narrativeSettingValues(): Record<string, string> {
    const values: Record<string, string> = {}
    for (const [id, input] of this.narrativeSettingInputs) {
      const value = input.value.trim()
      if (value !== "") values[id] = value
    }
    return values
  }

  private narrativeErrorFor(error: unknown): string {
    if (!(error instanceof NarrativeError)) return this.messages.narrativeErrorMalformed
    switch (error.kind) {
      case "rejected":
        // The service's own words, which name the field to fill — see NarrativeErrorKind.
        return this.messages.narrativeErrorRejected.replace("{detail}", error.detail ?? "")
      case "credential":
        return this.messages.narrativeErrorCredential
      case "rate-limited":
        return this.messages.narrativeErrorRateLimited
      case "refused":
        return this.messages.narrativeErrorRefused
      case "unreachable":
        return this.messages.narrativeErrorUnreachable
      default:
        return this.messages.narrativeErrorMalformed
    }
  }

  /**
   * Keeps the reader's settings in this browser, or stops keeping them.
   *
   * A preference (a model picked) is kept like any choice. A credential (a key, and the workspace
   * that is half of it) only when the reader ticks the box, which is off by default and never turned
   * on for them: localStorage is readable by anything else that ever runs on the same origin, and
   * the convenience of not retyping a key is not ours to trade for that on somebody's behalf.
   * Unticking it forgets the stored copies at once, which is what a reader who just changed their
   * mind about it means.
   */
  private rememberNarrativeSettings(): void {
    try {
      for (const setting of this.narrativeProvider.settings) {
        const key = this.narrativeStorageKey(setting.id)
        const value = this.narrativeSettingInputs.get(setting.id)?.value ?? ""
        const keep = setting.remembered === "preference"
          || (setting.remembered === "credential" && this.narrativeRememberInput.checked)
        if (keep && value !== "") {
          localStorage.setItem(key, value)
        } else {
          localStorage.removeItem(key)
        }
      }
      // Where a Claude key and workspace were kept before (see storedNarrativeSetting): what is
      // still wanted has just been written under its new name, so the old copies only ever stood
      // for a choice the reader may since have unmade.
      localStorage.removeItem(SightingEditorElement.NARRATIVE_KEY_STORAGE)
      localStorage.removeItem(SightingEditorElement.NARRATIVE_SCOPE_STORAGE)
    } catch {
      // Private browsing, a blocked origin, a full quota. Nothing to tell the reader: the values
      // still work for this session, which is all keeping them was ever offering to extend.
    }
  }

  private narrativeStorageKey(settingId: string): string {
    return `rr0-sighting-editor.narrative.${this.narrativeSourceId}.${settingId}`
  }

  /** A setting kept on this device, reading the two places a Claude key and workspace were kept
   * before settings were the provider's own, so that nobody has to type theirs again. */
  private storedNarrativeSetting(settingId: string): string | undefined {
    try {
      const stored = localStorage.getItem(this.narrativeStorageKey(settingId))
      if (stored !== null) return stored
      if (this.narrativeSourceId !== "claude") return undefined
      const legacy = settingId === "key" ? SightingEditorElement.NARRATIVE_KEY_STORAGE
        : settingId === "workspace" ? SightingEditorElement.NARRATIVE_SCOPE_STORAGE : undefined
      return (legacy && localStorage.getItem(legacy)) || undefined
    } catch {
      return undefined
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
    // Who answered is said in the sentence reporting the answer; the source itself is picked with the other data of the place, below.
    this.placeSourceRow.replaceChildren(document.createTextNode(`${this.messages.according} `),
      SightingEditorElement.creditLink(dataSourceById(PLACE_SOURCES, this.chosenSourceId.get("place"))))
    // The record is picked, and credited, above, with the file (see weatherProviderSelect), and the air aloft beside it.
    this.weatherSourceRow.replaceChildren()
    this.fillWeatherProvider()
    this.sourcePickers(this.shadow.getElementById("weather-source-rows")!, "weather-source-kind", "weather", [
      ["weather", this.messages.fileItemWeather, this.shadow.getElementById("weather-picker")!],
      ["upper-air", this.messages.frozenUpperAir, this.sourcePicker("upper-air", UPPER_AIR_SOURCES, () => undefined, this.groupChoice(["upperAir"]))]
    ])
    this.lightPollutionSourceRow.replaceChildren(document.createTextNode(`${this.messages.according} `),
      SightingEditorElement.creditLink(dataSourceById(LIGHT_POLLUTION_SOURCES, this.chosenSourceId.get("light-pollution"))))
    this.narrativeSourceRow.replaceChildren(
      this.sourcePicker("narrative", NARRATIVE_SOURCES, source => {
        const provider = this.narrativeProvider = source.create()
        this.renderNarrativeSettings()
        // Created in its own language: put it in the reader's, then show it again if still chosen.
        void provider.localize?.(this.language).then(() => {
          if (provider === this.narrativeProvider) this.renderNarrativeSettings()
        })
      })
    )
    // The data of the place, one kind at a time: which kind, then where it is read from (its source, or the recording's file).
    this.sourcePickers(this.terrainSourceRows, "source-kind", "location", [
      ["place", this.messages.fileItemPlace, this.sourcePicker("place", PLACE_SOURCES, source => {
        this.placeProvider = source.create()
        this.refreshSourceCredits()
      }, this.sectionChoice("place", () => this.schedulePlaceReverse()))],
      ["light-pollution", this.messages.fileItemLightPollution, this.sourcePicker("light-pollution", LIGHT_POLLUTION_SOURCES, source => {
        this.lightPollutionProvider = source.create()
        this.refreshSourceCredits()
        this.scheduleLightPollutionLookup()
      }, this.sectionChoice("lightPollution", () => this.scheduleLightPollutionLookup()))],
      ["elevation", this.messages.sourceElevation, this.sourcePicker("elevation", ELEVATION_SOURCES, () => this.applyTerrainSources(), this.groupChoice(["relief"]))],
      ["imagery", this.messages.sourceImagery, this.sourcePicker("imagery", IMAGERY_SOURCES, () => this.applyTerrainSources(), this.groupChoice(["imagery", "map"]))],
      ["roads", this.messages.frozenRoads, this.sourcePicker("roads", [SightingEditorElement.LIVE_ROADS], () => undefined, this.groupChoice(["roads"]))],
      ["water", this.messages.frozenWater, this.sourcePicker("water", [SightingEditorElement.LIVE_WATER], () => undefined, this.groupChoice(["water"]))],
      ["railways", this.messages.frozenRailways, this.sourcePicker("railways", [SightingEditorElement.LIVE_RAILWAYS], () => undefined, this.groupChoice(["railways"]))],
    ])
    this.sourcePickers(this.shadow.getElementById("decor-source-rows")!, "decor-source-kind", "decor", [
      ["scenery", this.messages.fileItemDecor, this.shadow.getElementById("scenery-picker")!],
      ["aircraft", this.messages.sourceAircraft, this.sourcePicker("aircraft", AIRCRAFT_SOURCES, () => this.applyAircraftSource())],
      ["decor-model", this.messages.decorModel, this.sourcePicker("decor-model", DECOR_MODEL_SOURCES, () => this.applyDecorModelSource())]
    ])
  }

  /** A picker over one registry, plus the attribution its licence requires as its own title and a
   * link beside it. Built in script rather than spelled out in the template because the options ARE
   * the registry: adding a second geocoder, or a third imagery tileset, must not also mean adding
   * markup and element ids for it. */
  private sourcePicker<T>(kind: string, sources: DataSource<T>[], apply: (source: DataSource<T>) => void, file?: FileChoice): DocumentFragment {
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
    // Data the recording can carry frozen is also read from its file: the annex of the Files group, taken at save when it is not yet.
    if (file) select.appendChild(new Option(this.messages.sourceFile, SightingEditorElement.FILE_SOURCE))
    const liveId = (): string => this.chosenSourceId.get(kind) ?? sources[0].id
    select.value = file?.fromFile() ? SightingEditorElement.FILE_SOURCE : liveId()
    const credit = document.createElement("a")
    credit.className = "source-credit"
    credit.target = "_blank"
    credit.rel = "noopener noreferrer"
    // Where the file is: a link to its item of the Files group.
    const shown = document.createElement("button")
    shown.type = "button"
    shown.className = "link source-file-link"
    shown.addEventListener("click", () => this.openFileItem(file!.item))
    const showCredit = (): void => {
      const fromFile = select.value === SightingEditorElement.FILE_SOURCE
      const source = dataSourceById(sources, fromFile ? liveId() : select.value)
      select.title = fromFile ? file!.where() : source.credit
      credit.hidden = fromFile
      credit.href = source.creditUrl
      // The licence's own wording is what has to be shown; the picker only names the service.
      credit.textContent = source.credit
      shown.hidden = !fromFile
      if (fromFile) {
        shown.textContent = file!.label()
        shown.title = file!.where()
      }
    }
    showCredit()
    select.addEventListener("change", () => {
      const fromFile = select.value === SightingEditorElement.FILE_SOURCE
      if (!fromFile) this.chosenSourceId.set(kind, select.value)
      file?.setFromFile(fromFile)
      showCredit()
      if (!fromFile) apply(dataSourceById(sources, select.value))
    })
    if (file) this.filePickers.set(kind, () => {
      select.value = file.fromFile() ? SightingEditorElement.FILE_SOURCE : liveId()
      showCredit()
    })
    fragment.append(select, document.createTextNode(" "), credit, shown)
    return fragment
  }

  /** A source picker's choice of the recording's files, for frozen groups of the ground (see FrozenData). */
  private groupChoice(groups: readonly FrozenGroupName[]): FileChoice {
    return {
      item: groups[0],
      fromFile: () => !this.frozenPanel.isLive(groups[0]),
      setFromFile: fromFile => { for (const group of groups) this.frozenPanel.setLive(group, !fromFile) },
      label: () => this.frozenPanel.itemLabel(groups[0]),
      where: () => this.frozenPanel.where(groups[0])
    }
  }

  /**
   * The same for a part of the recording's own text (see RecordingSections): read from the file, it is asked of nobody; asked of its
   * source, it is looked up again as the observer moves, and kept inside the recording.
   */
  private sectionChoice(name: "place" | "lightPollution", asked: () => void): FileChoice {
    return {
      item: name,
      fromFile: () => this.sectionFromFile(name),
      setFromFile: fromFile => {
        const frozen: FrozenData = { ...(this.ufoElement.sighting.frozen ?? {}) }
        if (fromFile) frozen[name] = frozen[name] ?? {}
        else delete frozen[name]
        this.ufoElement.sighting.frozen = FrozenGroups.isEmpty(frozen) ? undefined : frozen
        this.touch()
        this.scheduleFileSync()
        this.refreshFileItems()
        if (!fromFile) asked()
      },
      label: () => this.sectionFilePanel.itemLabel(name),
      where: () => this.sectionFilePanel.where(name)
    }
  }

  /** What a source picker offers to read the data from the recording's own files (see FrozenData). */
  private static readonly FILE_SOURCE = "file"

  /** The pickers that may read from the recording's files, each said again as the recording changes (see syncFilePickers). */
  private readonly filePickers = new Map<string, () => void>()

  /** Says again, in every picker that may read from the recording's files, whether it does. */
  private syncFilePickers(): void {
    for (const sync of this.filePickers.values()) sync()
  }

  /** Opens the Files group on one of its items. */
  private openFileItem(item: string): void {
    const tab = this.groupTabs.find(candidate => candidate.getAttribute("aria-controls") === "group-file")
    if (tab) this.toggleGroup(tab, true)
    this.fileItemSelect.value = item
    this.showFileItem(item)
  }

  /** The roads, the water and the railways are each asked of one source, which says which map it reads in which country. */
  private static readonly LIVE_ROADS: DataSource<undefined> = {
    id: "ign-osm", name: "IGN BD TOPO / OpenStreetMap", credit: "© IGN, BD TOPO (Licence Ouverte 2.0) in France; © OpenStreetMap contributors (ODbL) elsewhere",
    creditUrl: "https://www.openstreetmap.org/copyright", create: () => undefined
  }
  private static readonly LIVE_WATER: DataSource<undefined> = SightingEditorElement.LIVE_ROADS
  private static readonly LIVE_RAILWAYS: DataSource<undefined> = SightingEditorElement.LIVE_ROADS

  /**
   * One picker of the kind of data, then the picker of the kind picked (its source, or the recording's file) and its credit or its link:
   * a group asking for ten kinds of data shows one at a time, rather than ten rows of them.
   */
  private sourcePickers(container: HTMLElement, id: string, group: string, kinds: [kind: string, label: string, picker: Node][]): void {
    const label = document.createElement("label")
    const labelText = document.createElement("span")
    labelText.id = `label-${id}`
    labelText.textContent = this.messages.sourceKind
    const select = document.createElement("select")
    select.id = id
    const pickers = kinds.map(([kind, name, picker]) => {
      select.append(new Option(name, kind))
      const span = document.createElement("span")
      span.className = "source-picker"
      span.dataset.kind = kind
      span.append(picker)
      return span
    })
    select.value = this.sourceKindShown.get(group) ?? kinds[0][0]
    const show = (): void => {
      this.sourceKindShown.set(group, select.value)
      for (const span of pickers) span.hidden = span.dataset.kind !== select.value
    }
    select.addEventListener("change", show)
    show()
    label.append(labelText, document.createTextNode(" "), select)
    container.replaceChildren(label, ...pickers)
  }

  /** The kind of data whose source each group shows, by group: kept as the pickers are made again (a language changed). */
  private readonly sourceKindShown = new Map<string, string>()

  /** Who answered, by the credit its licence asks for. */
  private static creditLink(source: DataSource<unknown>): HTMLAnchorElement {
    const credit = document.createElement("a")
    credit.className = "source-credit"
    credit.target = "_blank"
    credit.rel = "noopener noreferrer"
    credit.href = source.creditUrl
    credit.textContent = source.credit
    return credit
  }

  /** The credits of the sentences that report what the place and the night sky's sources answered, as another source is picked. */
  private refreshSourceCredits(): void {
    this.placeSourceRow.replaceChildren(document.createTextNode(`${this.messages.according} `),
      SightingEditorElement.creditLink(dataSourceById(PLACE_SOURCES, this.chosenSourceId.get("place"))))
    this.lightPollutionSourceRow.replaceChildren(document.createTextNode(`${this.messages.according} `),
      SightingEditorElement.creditLink(dataSourceById(LIGHT_POLLUTION_SOURCES, this.chosenSourceId.get("light-pollution"))))
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

  /** The air traffic around the observer is read again from the source now chosen — see
   * SceneElement.setAircraftSource, and AircraftProvider on why it is a seam. */
  private applyAircraftSource(): void {
    this.sceneElement.setAircraftSource(dataSourceById(AIRCRAFT_SOURCES, this.chosenSourceId.get("aircraft")))
    this.ufoElement.refresh()
  }

  /** A different model catalogue means different options in the decor picker AND a different
   * answer for every id a recording already names — so both the editor's own copy and the scene's
   * are replaced, and what is on screen is rebuilt from the new one (see
   * SceneRenderer.setDecorModelProvider). */
  private applyDecorModelSource(): void {
    this.decorModelProvider = dataSourceById(DECOR_MODEL_SOURCES, this.chosenSourceId.get("decor-model")).create()
    this.sceneElement.setDecorModelProvider(this.decorModelProvider)
    // What the previous source offered is not what this one does.
    this.decorModelEntries = undefined
    this.refreshDecorModelOptions(this.ufoElement.sighting.decor.find(d => d.id === this.currentDecorId))
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
    // The place read from the file is asked of no geocoder.
    if (query === "" || this.sectionFromFile("place")) return
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
    // mistaken for the observer moving and answered with a reverse lookup of the name we just used.
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
    // Typed by hand, so it now describes whatever the observer means by it, not the coordinates —
    // and must not be replaced by a reverse lookup of them.
    this.namedCoordinates = undefined
    this.updateObserver()
  }

  /**
   * Re-derives the displayed place name from coordinates the observer has moved by hand — the same
   * relation the search reads the other way, so the two halves of the Location group can never
   * drift apart. A name left describing somewhere the sighting is no longer at is worse than no
   * name: the recording would state, in writing, that it happened there.
   *
   * Only when a name resolved from a search is actually on display: a name the observer typed
   * themselves is theirs (a farm, a stretch of road, whatever no gazetteer lists), and an empty
   * field is not a question anyone asked. That restraint is also what keeps this inside Nominatim's
   * usage policy, together with the debounce and the same-spot threshold.
   */
  private schedulePlaceReverse(): void {
    if (!this.namedCoordinates || this.sectionFromFile("place")) return
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
   * Asks which legal time zone the observer's own coordinates fall in, and picks it.
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
  /**
   * Whether the author has already said which clock the observation was on, so that a service must not answer for them: a zone they picked
   * (not one a lookup filled in), or a bare offset, which is how a recording states it without a zone (see SightingEvent.utcOffsetHours).
   * A recording stating 16:10 UTC at Gonesse must stay 16:10 UTC when the editor opens it, not become 16:10 in Paris, an hour of sky earlier.
   */
  private timeZoneIsStated(): boolean {
    const event = this.ufoElement.sighting.event
    if (event.timeZone) return event.timeZone !== this.autoFilledTimeZone
    return event.utcOffsetHours !== undefined
  }

  private scheduleTimeZoneLookup(): void {
    const lat = this.numberOrUndefined(this.latInput.value)
    const lng = this.numberOrUndefined(this.lngInput.value)
    if (lat === undefined || lng === undefined) return
    if (this.timeZoneIsStated()) return
    const previous = this.timeZoneLookedUpAt
    if (previous && Math.abs(lat - previous.lat) < SAME_PLACE_DEG && Math.abs(lng - previous.lng) < SAME_PLACE_DEG) return
    clearTimeout(this.timeZoneLookupTimer)
    this.timeZoneLookupTimer = setTimeout(() => void this.lookUpTimeZone(lat, lng), PLACE_REVERSE_DEBOUNCE_MS)
  }

  private async lookUpTimeZone(lat: number, lng: number): Promise<void> {
    this.timeZoneLookedUpAt = { lat, lng }
    const zone = await this.timeZoneProvider.zoneAt(lat, lng)
    this.placeZone = zone ?? undefined
    // Re-checked after the await, not only before it: the author may have picked one meanwhile, and
    // a service's answer must never win over a stated one.
    if (!zone || this.timeZoneIsStated()) return
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
    // The name is what this answers, and all it writes: not the pose at the playhead, which updateObserver would read off the fields again.
    const place = this.ufoElement.sighting.event.place?.[0] ?? { lat, lng }
    this.ufoElement.sighting.event.place = [{ lat: place.lat, lng: place.lng, name: this.stringOrUndefined(this.placeNameInput.value.trim()) }]
  }

  /** Writes the observer's lat/lng into the legacy `event.place` (kept in sync for any consumer
   * that only reads that field, e.g. an older `<rr0-scene>` build, always mirroring whichever edit
   * happened most recently regardless of when on the timeline it landed) — but records the real
   * pose as a `observerTrack` keyframe **at the current playhead position**, exactly like
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
   * entered". EVERY field counts there, the optics included: a observer who says nothing about
   * where they stood but does say the shutter was open ten seconds has stated something, and a
   * removal here would throw it away the moment it was typed. Bails out while playing, same
   * reasoning as setAppearance's identical guard: the playhead is a moving target during Play,
   * not a specific instant to keyframe. */
  private updateObserver(): void {
    this.refreshHeadingPoint()
    if (this.ufoElement.playbackState === "playing") return
    const lat = this.numberOrUndefined(this.latInput.value)
    const lng = this.numberOrUndefined(this.lngInput.value)
    const headingDeg = this.wrapDegrees(this.numberOrUndefined(this.headingInput.value), this.headingInput)
    // pitchDeg (unlike headingDeg) is never "unknown" — it's a required field on ObserverPose, so
    // an empty/invalid input just falls back to 0 (looking straight at the horizon) rather than
    // propagating NaN into the pose.
    const pitchDeg = this.numberOrUndefined(this.pitchInput.value) ?? 0
    const rollDeg = this.numberOrUndefined(this.rollInput.value) ?? 0
    // The FIELD states an altitude above sea level; ObserverPose.elevationM is a height above the
    // local ground (the terrain patch is built with the observer's own ground at y=0, see
    // TerrainMeshBuilder). Subtracting the ground's own height is the whole conversion — and while
    // that height isn't known the two coincide, which is exactly the behaviour this had before.
    // Never negative: a observer cannot be underneath the ground they are standing on.
    const altitudeM = this.numberOrUndefined(this.elevationInput.value) ?? this.groundElevationM ?? 0
    const elevationM = Math.max(0, altitudeM - (this.groundElevationM ?? 0))
    const event = this.ufoElement.sighting.event
    const observerTrack = this.ufoElement.sighting.observerTrack
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
    // "None" is only written down where it TAKES something off: after a filter, a pose that says
    // nothing would be held on under it. Anywhere else it is what every recording already says.
    const chosenFilter = this.filterSelect.value
    const filterBefore = Filters.byId(observerTrack.getLatestPoseAt(t - 1)?.filter)
    const filter = chosenFilter === Filters.NONE.id || chosenFilter === ""
      ? (filterBefore === Filters.NONE ? undefined : Filters.NONE.id)
      : chosenFilter
    // Not a pose field, and deliberately not keyframed: one observation was photographed one way
    // (see Sighting.exposureSeconds). Written straight onto the recording from here, since this is
    // the method every optics input reports to.
    const exposureSeconds = this.statedExposureSeconds(instrument)
    this.ufoElement.sighting.exposureSeconds =
      exposureSeconds === instrument.exposureSeconds ? undefined : exposureSeconds
    // Empty is not missing here, it is INFINITY — where a camera pointed at the sky is focused.
    const focusDistanceM = this.numberOrUndefined(this.focusDistanceInput.value)
    // Same distinction retuneFieldOfView draws, for the same reason: these fields are PREFILLED
    // from the instrument (see syncOpticsFromInstrument), so a value equal to the device's own is
    // one nobody stated, and only a departure from it is a observer talking. The focus distance has
    // no device default at all, so any value there is theirs.
    const opticsStated =
      Math.abs(fovDeg - Instruments.fieldOfViewDeg(instrument)) > 0.01 ||
      fNumber !== instrument.fNumber ||
      focusDistanceM !== undefined ||
      filter !== undefined
    const nothingSet =
      lat === undefined && lng === undefined && headingDeg === undefined && pitchDeg === 0 && rollDeg === 0 &&
      elevationM === 0 && !opticsStated
    if (nothingSet) {
      observerTrack.removeKeyframeAt(t)
    } else {
      observerTrack.addKeyframe(t, {
        lat,
        lng,
        elevationM,
        headingDeg,
        pitchDeg,
        // Written only when there IS one. Absent already means upright (see ObserverPose.rollDeg),
        // so storing a zero on every pose would add a field to every recording ever made to say
        // what saying nothing says — and would rewrite files that never mentioned it.
        rollDeg: rollDeg === 0 ? undefined : rollDeg,
        fovDeg,
        fNumber,
        focusDistanceM,
        filter
      })
    }
    // Where the author puts the observer is a question to the survey of the place: what stands round it (see SurroundingsPlanter).
    // The place the recording sets off from, as placeLoaded was told, and not the fields': they show the observer at the playhead,
    // kilometres down the road for one who drives, and a ground height answering after an undo there took that for another place.
    const standing = this.plantingCentre()
    this.surroundings.placeChanged(standing?.lat, standing?.lng)
    // Neither field affects the 2D shape canvas, so this refresh() is only for its side effect —
    // it's what makes this edit surface as a "timeupdate" (see the constructor's listener), the
    // signal a composed live preview (e.g. a <rr0-scene>) needs to resync.
    this.ufoElement.refresh()
    // Moving the observer moves which weather record describes them — see scheduleWeatherLookup.
    this.scheduleWeatherLookup()
    // ...and under a different sky — see lookUpLightPollution.
    this.scheduleLightPollutionLookup()
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

  /**
   * What a start or end date edited to a new value does to the recording: it is written, then
   * Duration is re-derived — a start/end edit can newly make it computable (or newly make it
   * ambiguous, see sightingDurationBlockedReason). What the date field itself does with text that does
   * not read yet is its own (see EdtfDateField).
   */
  /**
   * Carries a birth date over to the age then, against the observation date.
   *
   * Only a firm birth moves the age when the OBSERVATION date is corrected (`observationMoved`): a
   * birth worked back from an age is approximate, and the age was the author's statement — it must
   * not drift because a date beside it was fixed. Typing the birth always updates the age.
   */
  private syncAgeFromBirth(observationMoved: boolean): void {
    const birth = this.birth
    const at = this.ufoElement.sighting.event.time
    if (!birth || !at) return
    if (observationMoved && !ObserverAge.isFirm(birth)) return
    const age = ObserverAge.at(birth, at)
    if (age === undefined) return
    this.observerAgeInput.value = String(age)
    this.updateObserverMetadata()
  }

  /** Carries a typed age over to the birth date: kept when it already gives that age (a stated
   * birth is worth more than the year its age implies), otherwise replaced by the approximate year. */
  private syncBirthFromAge(): void {
    const at = this.ufoElement.sighting.event.time
    const age = this.numberOrUndefined(this.observerAgeInput.value)
    if (!at || age === undefined) return
    const birth = this.birth
    if (birth && ObserverAge.at(birth, at) === age) return
    const derived = ObserverAge.birthFor(age, at)
    if (!derived) return
    this.birthDate.setPrecise(false)
    this.birth = derived
    this.birthDate.time = derived
    this.updateObserverMetadata()
  }

  private editDate(assign: () => void): void {
    assign()
    this.dropDurationOutrankedByDates()
    // A zone's offset depends on the date it is asked about — see applyTimeZoneOffset.
    if (this.ufoElement.sighting.event.timeZone) this.applyTimeZoneOffset()
    this.ufoElement.refresh() // see updateObserver()'s comment — this is what surfaces the edit as a timeupdate
    this.refreshSceneryWarning()
    this.syncDurationField()
    this.scheduleWeatherLookup()
    // The year decides whether the atlas's sky is the observation's at all.
    this.scheduleLightPollutionLookup()
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
    this.ufoElement.sighting.event.durationText = undefined
    this.ufoElement.durationSeconds = undefined
  }

  /** Writes the sighting's reported observation-start time (event.time) from the EDTF text field. */
  /** Writes the observation's own legal time zone (event.utcOffsetHours) — what turns the
   * observer's wall-clock time into a real instant, and so which sky the scene renders. Empty
   * means unknown, falling back to approximating it from the longitude (see
   * SightingEvent.utcOffsetHours). Refreshes right away since every celestial body in the 3D
   * scene moves with it. */
  /** Fills the zone picker: a manual entry first (type the number yourself, what a recording could
   * always do), then every IANA zone the platform knows. Built in script — there are some four
   * hundred of them, and they are the platform's list, not ours.
   *
   * Built once: a zone's name is the same in every language, so a new recording or a new language
   * only renames the manual entry and selects again. Rebuilding four hundred options each time was
   * a third of what opening an editor cost. */
  private refreshTimeZoneOptions(): void {
    let manual = this.timeZoneSelect.options[0]
    if (!manual) {
      manual = document.createElement("option")
      manual.value = ""
      // Filled while out of the page: each option inserted into a shadow tree has the whole tree
      // searched for slots (jsdom does so literally), so four hundred of them cost four hundred
      // walks where a single re-insertion costs one.
      const parent = this.timeZoneSelect.parentNode
      const next = this.timeZoneSelect.nextSibling
      this.timeZoneSelect.remove()
      this.timeZoneSelect.replaceChildren(
        manual,
        ...this.timeZones.available().map(zone => {
          const option = document.createElement("option")
          option.value = zone
          option.textContent = zone
          return option
        })
      )
      parent?.insertBefore(this.timeZoneSelect, next)
    }
    manual.textContent = this.messages.timeZoneManual
    this.timeZoneSelect.value = this.zoneShown()
  }

  /** The zone to show: the recording's own, or, for one that only states an offset, the zone that reads it — shown, not written. */
  private zoneShown(): string {
    const event = this.ufoElement.sighting.event
    if (event.timeZone) return event.timeZone
    return event.utcOffsetHours === undefined ? "" : this.preferredZoneFor(event.utcOffsetHours) ?? ""
  }

  /**
   * What a time zone and an offset are, in this editor: ONE thing said two ways, kept in step both ways.
   *
   * - Picking a zone gives the offset: the zone's own rules at the observation's date.
   * - Typing an offset picks a zone: one whose clocks read that number then (see preferredZoneFor) — the zone the place
   *   was found in if it fits, else one that does.
   * - The only other state is "unknown": no zone, and so no number. A number that no zone reads on that day is not
   *   accepted, and says so, rather than standing with a zone nobody chose.
   */
  private updateTimeZone(): void {
    const event = this.ufoElement.sighting.event
    const zone = this.stringOrUndefined(this.timeZoneSelect.value)
    event.timeZone = zone
    // A zone picked decides the number from here on.
    this.offsetIsAuthors = false
    if (zone === undefined) {
      // Unknown: nothing decides a number, so there is none.
      event.utcOffsetHours = undefined
      this.syncUtcOffsetField()
      this.ufoElement.refresh()
      this.scheduleWeatherLookup()
      return
    }
    this.applyTimeZoneOffset()
  }

  /**
   * Re-derives `utcOffsetHours` from the chosen zone for the observation's OWN date — which is why
   * this runs again on every date edit, not just when the zone changes: the same zone gives a
   * different answer in January and July, and gave different answers in 1965 and today (see
   * TimeZones). A no-op while no zone is chosen.
   */
  private applyTimeZoneOffset(): void {
    const event = this.ufoElement.sighting.event
    if (this.offsetIsAuthors && event.utcOffsetHours !== undefined) {
      // The number is the author's: the zone moves to one that still reads it on this day.
      const zone = this.preferredZoneFor(event.utcOffsetHours)
      event.timeZone = zone
      this.timeZoneSelect.value = zone ?? ""
    } else {
      const derived = event.timeZone ? this.timeZones.offsetHoursAt(event.timeZone, this.timeZoneReference()) : undefined
      if (derived !== undefined) event.utcOffsetHours = derived
    }
    this.syncUtcOffsetField()
    this.ufoElement.refresh()
    this.scheduleWeatherLookup()
  }

  /** The day a zone's rules are asked about: the observation's own, or, with none stated, a winter day of this year. */
  private timeZoneReference(): SightingTime {
    const time = this.ufoElement.sighting.event.time
    return time?.year !== undefined ? time : { year: new Date().getFullYear(), month: 1, day: 1, hour: 12 }
  }

  /**
   * The zone to show for an offset: the one already chosen if it still reads that number, else the one the place was found
   * in, else a fixed-offset zone (`Etc/GMT-1` is UTC+1), else the first the platform lists. undefined when no zone reads it.
   */
  private preferredZoneFor(offset: number): string | undefined {
    const candidates = this.timeZones.zonesAt(offset, this.timeZoneReference())
    if (candidates.length === 0) return undefined
    const current = this.ufoElement.sighting.event.timeZone
    if (current && candidates.includes(current)) return current
    if (this.placeZone && candidates.includes(this.placeZone)) return this.placeZone
    // POSIX names the fixed zones the other way round: Etc/GMT-1 is one hour AHEAD of UTC.
    const fixed = Number.isInteger(offset) ? (offset === 0 ? "UTC" : `Etc/GMT${offset > 0 ? "-" : "+"}${Math.abs(offset)}`) : undefined
    if (fixed && candidates.includes(fixed)) return fixed
    return candidates[0]
  }

  /**
   * Typing an offset picks the zone that reads it. An empty field is "unknown". A number no zone reads on that day is
   * flagged and not written: there would be a number with no clock behind it.
   */
  private updateUtcOffset(): void {
    const event = this.ufoElement.sighting.event
    const typed = this.numberOrUndefined(this.utcOffsetInput.value)
    if (typed === undefined) {
      // Cleared: unknown again.
      event.utcOffsetHours = undefined
      event.timeZone = undefined
      this.autoFilledTimeZone = undefined
      this.timeZoneSelect.value = ""
    } else {
      const zone = this.preferredZoneFor(typed)
      if (zone === undefined) {
        this.utcOffsetInput.classList.add("invalid")
        this.utcOffsetInput.title = this.messages.utcOffsetNoZone
        return
      }
      event.utcOffsetHours = typed
      event.timeZone = zone
      this.offsetIsAuthors = true
      // Picked by the author's number: from here on it is theirs, and moving the place no longer touches it.
      this.autoFilledTimeZone = undefined
      this.timeZoneSelect.value = zone
    }
    this.updateUtcOffsetValidity()
    this.ufoElement.refresh()
    // The offset is what turns the observer's wall clock into a real instant, so it decides which
    // hour of record the sighting even falls in — an hour out is a different sky AND a different
    // weather row (see SightingEvent.utcOffsetHours).
    this.scheduleWeatherLookup()
  }

  /** Builds a People object from the 4 observer inputs and writes it (plus the sighting's own id) straight onto
   * the sighting — legal since Sighting.ts made these fields non-readonly for exactly this
   * purpose (see its own doc comment). firstNames is comma-separated free text, parsed exactly
   * like updateTags(). If every observer field ends up empty, `observer` is cleared to `undefined`
   * rather than storing an all-empty object — same "blank everything clears it" convention used
   * everywhere else in this file. */
  private updateObserverMetadata(): void {
    const sighting = this.ufoElement.sighting
    const firstNames = this.observerFirstNamesInput.value
      .split(",")
      .map(name => name.trim())
      .filter(name => name.length > 0)
    const observer: People = {
      id: this.stringOrUndefined(this.observerIdInput.value),
      title: this.stringOrUndefined(this.observerTitleInput.value),
      lastName: this.stringOrUndefined(this.observerLastNameInput.value),
      firstNames: firstNames.length > 0 ? firstNames : undefined
    }
    sighting.observer = Object.values(observer).some(value => value !== undefined) ? observer : undefined
    sighting.id = this.stringOrUndefined(this.sightingIdInput.value)
    this.updateAccount()
    this.ufoElement.refresh()
  }

  /**
   * Who saw it and how the account travelled — see Account.
   *
   * Written whole and dropped whole, the same as `observer` above: every field is independently
   * optional, and a account none of whose fields is set is not an empty account, it is a
   * recording that says nothing about its observers. Blank stays undefined rather than becoming 0,
   * because the methods reading this score "unknown" and "one" differently.
   */
  private updateAccount(): void {
    const sighting = this.ufoElement.sighting
    const followedUp = this.accountFollowedUpSelect.value
    const account: Account = {
      observerAgeYears: this.numberOrUndefined(this.observerAgeInput.value),
      observerBirth: this.birth,
      observerPerception: ObserverProviders.compact(this.perceptionSettings.values),
      observerOccupation: this.observerOccupationInput.value.trim() === ""
        ? undefined
        : this.said.write(sighting.account?.observerOccupation, this.observerOccupationInput.value, this.writingLanguage),
      source: (this.stringOrUndefined(this.accountSourceSelect.value) as Account["source"]),
      followedUp: followedUp === "" ? undefined : followedUp === "yes"
    }
    sighting.account = Object.values(account).some(value => value !== undefined) ? account : undefined
  }

  /** The address of the recording's first source (see RecordingSource): what a post, an article or a
   * report page is found at. Its other fields (title, authors, publication) are kept as they are,
   * and a source left with nothing but an emptied address is dropped. */
  private updateSourceUrl(): void {
    const sighting = this.ufoElement.sighting
    const url = this.accountUrlInput.value.trim()
    const [first, ...others] = sighting.sources ?? []
    const { url: _previous, ...rest } = first ?? {}
    void _previous
    const updated = url === "" ? rest : { ...rest, url }
    const sources = Object.keys(updated).length > 0 ? [updated, ...others] : others
    sighting.sources = sources.length > 0 ? sources : undefined
  }

  private updateDescription(): void {
    this.ufoElement.sighting.event.description =
      this.said.write(this.ufoElement.sighting.event.description, this.descriptionInput.value, this.writingLanguage)
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
      // Typed in the author's language, stored in English — see TagNames. An author writing
      // "atterrissage" and one writing "landing" have to end up with the same tag, or their two
      // recordings stop matching each other.
      .map(tag => this.tagNames.stored(tag))
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
    // owns their values (see syncWeatherSourceState), so an edit here is the observer's own
    // account, and no later lookup may overwrite it — the same guarantee unticking the box gives,
    // reached the other way round. Without this, a observer who described the weather BEFORE
    // stating the date and place watched it vanish the moment they typed them: the box, which is
    // unavailable until there is something to ask, ticked itself and the record replaced their
    // account. They had no way to prevent it, since the only control that could was disabled.
    if (this.weatherFromRecords) {
      this.weatherFromRecords = false
      this.cancelWeatherLookup()
      this.ufoElement.sighting.weatherSource = undefined
      this.syncWeatherSourceState()
    } else if (this.ufoElement.sighting.weatherSource !== undefined) {
      // Read from the file with the record it came from: changed, it is no longer that record's.
      this.ufoElement.sighting.weatherSource = undefined
      this.syncWeatherSourceState()
    }
    const weather: Weather = {
      ...resolveWeatherAt(this.ufoElement.sighting, this.ufoElement.currentTime),
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
   * which is exactly right for a observer overruling a cloud cover, and exactly wrong here. Nobody
   * measured what the crystals were doing, so stating it contradicts no record and must not discard
   * one; and rebuilding from the inputs would also throw away the fields a record fills that have no
   * control of their own, the lower decks among them.
   */
  private applyIceAlignmentAtPlayhead(): void {
    if (this.ufoElement.playbackState === "playing") return
    this.sceneElement.resumeWeatherAudio()
    const weather: Weather = {
      ...resolveWeatherAt(this.ufoElement.sighting, this.ufoElement.currentTime),
      iceCrystalAlignment: Number(this.iceCrystalAlignmentInput.value),
      rareIceCrystals: Number(this.rareIceCrystalsInput.value)
    }
    this.ufoElement.sighting.weatherTrack.addKeyframe(this.ufoElement.currentTime, weather)
    this.ufoElement.refresh()
  }

  /** Fills the kind dropdown from SOUND_KINDS, so a new timbre is one entry in that list and
   * nothing else — no markup, no per-option element id (same rule the data-source pickers follow,
   * see sourcePicker). Labels are set from the current messages here and retranslated by
   * applyMessages. */
  // ---- Pictures of the place — see SceneReference and the Pictures group of the template.

  private referenceLabel(reference: SceneReference): string {
    return this.said.read(reference.title) || reference.src.replace(/^data:.*$/, "…") || reference.id
  }

  /** Rebuilds the pictures dropdown and resyncs the fields from whichever is selected — after
   * add/delete/load, mirroring refreshDecorList's role for the decor. */
  private refreshReferenceList(): void {
    const references = this.ufoElement.sighting.references
    this.referenceSelect.innerHTML = ""
    for (const reference of references) {
      const option = document.createElement("option")
      option.value = reference.id
      option.textContent = this.referenceLabel(reference)
      this.referenceSelect.appendChild(option)
    }
    if (this.currentReferenceId !== undefined) this.referenceSelect.value = this.currentReferenceId
    this.syncReferenceFields()
  }

  private selectReference(id: string): void {
    this.currentReferenceId = id
    this.referenceSelect.value = id
    this.disarmLandmark()
    this.currentLandmarkId = undefined
    this.referenceFit = undefined
    this.syncReferenceFields()
  }

  private syncReferenceFields(): void {
    const reference = this.ufoElement.sighting.references.find(candidate => candidate.id === this.currentReferenceId)
    const hasSelection = reference !== undefined
    ElementList.showPresence(this.shadow.getElementById("reference-row")!, this.shadow.getElementById("reference-item")!, hasSelection)
    this.deleteReferenceButton.disabled = !hasSelection
    this.referenceUsePoseButton.disabled = !hasSelection
    for (const field of [this.referenceSelect, ...this.referenceFields]) field.disabled = !hasSelection
    this.referenceSourceInput.disabled = !hasSelection
    this.refreshLandmarkList()
    this.syncCanvasMode()
    if (!reference) {
      this.referenceStatus.textContent = ""
      return
    }
    this.referenceTitleInput.value = this.said.read(reference.title) ?? ""
    // A picture embedded in the recording is megabytes of base64: shown as what it is, not typed over.
    const embedded = reference.src.startsWith("data:")
    this.referenceSourceInput.url = embedded ? "" : reference.src
    this.referenceSourceInput.mode = embedded ? "file" : "url"
    this.referenceKindSelect.value = reference.kind
    this.referenceCreditInput.value = reference.credit ?? ""
    this.referenceCreditUrlInput.value = reference.creditUrl ?? ""
    this.referenceTInput.value = reference.t === undefined ? "" : String(reference.t / 1000)
    this.referenceDrawingInput.checked = reference.drawing === true
    this.referenceOpacityInput.value = String(reference.opacity)
    this.referenceHeadingInput.value = String(reference.registration.headingDeg)
    this.referencePitchInput.value = String(reference.registration.pitchDeg)
    this.referenceRollInput.value = String(reference.registration.rollDeg ?? 0)
    this.referenceFovInput.value = String(reference.registration.fovDeg)
    this.syncReferenceStatus(reference)
  }

  private syncReferenceStatus(reference: SceneReference): void {
    if (this.canvasMode() === "picture") {
      this.syncRegisterStatus()
      return
    }
    if (reference.src.startsWith("data:")) {
      const kb = Math.round((reference.src.length * 3) / 4 / 1024)
      this.referenceStatus.textContent = reference.src.length > REFERENCE_INLINE_WARNING_BYTES
        ? this.messages.referenceEmbedded.replace("{kb}", String(kb))
        : ""
      return
    }
    this.referenceStatus.textContent = this.sceneElement.referenceFailedToLoad(reference.src) ? this.messages.referenceUnreachable : ""
  }

  /** Writes the fields back onto the selected picture — the whole array replaced, as the decor's
   * is, so that whoever holds the previous one sees a change. */
  private updateReference(): void {
    if (this.currentReferenceId === undefined) return
    const sighting = this.ufoElement.sighting
    const headingDeg = this.wrapDegrees(Number(this.referenceHeadingInput.value), this.referenceHeadingInput) ?? 0
    const seconds = this.referenceTInput.value.trim() === "" ? undefined : Number(this.referenceTInput.value)
    sighting.references = sighting.references.map(reference => {
      if (reference.id !== this.currentReferenceId) return reference
      const src = reference.src
      const registration = {
        headingDeg,
        pitchDeg: Number(this.referencePitchInput.value) || 0,
        rollDeg: Number(this.referenceRollInput.value) || undefined,
        fovDeg: Math.min(179, Math.max(1, Number(this.referenceFovInput.value) || DEFAULT_REFERENCE_FOV_DEG))
      }
      const old = reference.registration
      const registered = registration.headingDeg !== old.headingDeg || registration.pitchDeg !== old.pitchDeg ||
        registration.rollDeg !== old.rollDeg || registration.fovDeg !== old.fovDeg
      return {
        ...reference,
        kind: this.referenceKindSelect.value as ReferenceKind,
        src,
        title: this.said.write(reference.title, this.referenceTitleInput.value, this.writingLanguage),
        credit: this.stringOrUndefined(this.referenceCreditInput.value),
        creditUrl: this.stringOrUndefined(this.referenceCreditUrlInput.value),
        t: seconds === undefined || Number.isNaN(seconds) ? undefined : Math.round(seconds * 1000),
        drawing: this.referenceDrawingInput.checked || undefined,
        opacity: Number(this.referenceOpacityInput.value),
        registration,
        // Lining a picture up is done from where the observer stands at the playhead, so that is the
        // point it now holds for — see SceneReference.from. A title or a credit changes nothing.
        from: registered ? this.observerPositionNow() ?? reference.from : reference.from
      }
    })
    const current = sighting.references.find(reference => reference.id === this.currentReferenceId)!
    this.referenceSelect.options[this.referenceSelect.selectedIndex]!.textContent = this.referenceLabel(current)
    this.syncReferenceStatus(current)
    this.ufoElement.refresh()
  }

  /** A picture from the observer's own spot most often looks where they looked: the pose at the
   * playhead, copied into the registration as a starting point for lining it up. */
  private useObserverPoseForReference(): void {
    const pose = resolveObserverPoseAt(this.ufoElement.sighting, this.ufoElement.currentTime)
    if (!pose) return
    this.referenceHeadingInput.value = String(this.rounded(pose.headingDeg ?? 0))
    this.referencePitchInput.value = String(this.rounded(pose.pitchDeg))
    this.referenceRollInput.value = String(this.rounded(pose.rollDeg ?? 0))
    this.referenceFovInput.value = String(this.rounded(pose.fovDeg))
    this.updateReference()
  }

  /** Where the observer stands at the playhead, when the recording says. */
  private observerPositionNow(): { lat: number; lng: number } | undefined {
    const pose = resolveObserverPoseAt(this.ufoElement.sighting, this.ufoElement.currentTime)
    return pose?.lat !== undefined && pose.lng !== undefined ? { lat: pose.lat, lng: pose.lng } : undefined
  }

  private addReference(src: string, title?: string, overrides: Partial<SceneReference> = {}): void {
    const sighting = this.ufoElement.sighting
    const pose = resolveObserverPoseAt(this.ufoElement.sighting, this.ufoElement.currentTime)
    const id = `picture-${sighting.references.length + 1}`
    const reference: SceneReference = {
      id,
      kind: "photo",
      src,
      title: title ? this.said.write(undefined, title, this.writingLanguage) : undefined,
      opacity: DEFAULT_REFERENCE_OPACITY,
      // Where the observer looks at the playhead: the likeliest guess for a picture of what they saw.
      registration: { headingDeg: pose?.headingDeg ?? 0, pitchDeg: pose?.pitchDeg ?? 0, fovDeg: DEFAULT_REFERENCE_FOV_DEG },
      from: this.observerPositionNow(),
      ...overrides
    }
    sighting.references = [...sighting.references, reference]
    this.currentReferenceId = id
    this.refreshReferenceList()
    this.ufoElement.refresh()
  }

  /** An empty picture whose address the author then types — no native prompt, which a sandboxed
   * embed answers with nothing. */
  private addReferenceFromAddress(): void {
    this.addReference("")
    this.referenceSourceInput.mode = "url"
    this.referenceSourceInput.focus()
  }

  /** A picture from the author's own disk, embedded in the recording as a data: URL — see
   * SceneReference.src for the trade, and referenceEmbedded for what the author is told of it. */
  private addReferenceFromFile(): void {
    this.addReference("")
    this.referenceSourceInput.mode = "file"
    this.referenceSourceInput.openPicker()
  }

  /**
   * The selected picture taken from where its source now says: a file of the author's is embedded as a data: URL, an address is the
   * picture's address. A picture still untitled is named after its file.
   */
  private async setReferenceSource(pick: InputFilePick): Promise<void> {
    const id = this.currentReferenceId
    if (id === undefined) return
    let src: string
    if (pick.file) {
      const file = pick.file
      src = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(file)
      })
    } else {
      src = pick.url
    }
    const sighting = this.ufoElement.sighting
    sighting.references = sighting.references.map(reference => reference.id !== id ? reference : {
      ...reference, src,
      title: reference.title ?? (pick.file ? this.said.write(undefined, pick.file.name.replace(/\.[^.]+$/, ""), this.writingLanguage) : undefined)
    })
    this.touch()
    this.refreshReferenceList()
    this.ufoElement.refresh()
  }

  // ---- Lining a picture up on the scene — see PictureRegistration and PictureLandmark.

  private currentReference(): SceneReference | undefined {
    return this.ufoElement.sighting.references.find(reference => reference.id === this.currentReferenceId)
  }

  private currentLandmarks(): PictureLandmark[] {
    return this.currentReference()?.landmarks ?? []
  }

  /** Replaces the selected picture's landmarks whole — the same "new array, never mutated in
   * place" rule as every other list of the recording. */
  private writeLandmarks(landmarks: PictureLandmark[]): void {
    const sighting = this.ufoElement.sighting
    sighting.references = sighting.references.map(reference =>
      reference.id === this.currentReferenceId ? { ...reference, landmarks: landmarks.length > 0 ? landmarks : undefined } : reference)
  }

  /**
   * What the pointer finds on the canvas in picture mode, in order: a landmark's own end, to move
   * it; the picture, to turn it; anywhere else, the scene, to turn the observer. Naming a landmark is not a click on the picture but an armed
   * gesture (see armLandmark), so that a click nobody meant creates nothing.
   */
  private beginReferenceDrag(startPointer: { x: number; y: number }): void {
    const reference = this.currentReference()
    if (!reference) return
    if (this.armingLandmark || this.pendingLandmark) {
      this.nameLandmarkAt(startPointer)
      return
    }
    const anchor = this.landmarkEndAt(startPointer)
    if (anchor) {
      this.selectLandmark(anchor.landmarkId)
      this.referenceDragState = { kind: "anchor", ...anchor }
      this.setCanvasCursor("landmark")
      this.startDragListening()
      return
    }
    // Outside the picture the scene is still the scene: grabbing sky or ground there turns the
    // observer, as it does in every other group. Only the picture itself, and its landmarks, are
    // this group's to move.
    const aspect = this.sceneElement.referenceAspect(reference.id)
    const onPicture = aspect !== undefined
      && PictureRegistration.picturePointOf(this.directionAtCanvasPoint(startPointer), reference.registration, aspect) !== undefined
    if (!onPicture) {
      this.beginCameraDrag(startPointer)
      return
    }
    this.referenceDragState = {
      kind: "picture",
      startPointer,
      startHeadingDeg: reference.registration.headingDeg,
      startPitchDeg: reference.registration.pitchDeg,
      moved: false
    }
    this.setCanvasCursor("panning")
    this.startDragListening()
  }

  /** Within a handle's reach of a landmark's ring (on the picture) or dot (in the render). */
  private landmarkEndAt(point: { x: number; y: number }): { landmarkId: string; end: "picture" | "scene" } | undefined {
    const reference = this.currentReference()
    const aspect = reference ? this.sceneElement.referenceAspect(reference.id) : undefined
    if (!reference || aspect === undefined) return undefined
    const reach = 8
    for (const landmark of this.currentLandmarks()) {
      const ring = this.canvasPointOfDirection(PictureRegistration.worldDirectionOf(landmark.picture, reference.registration, aspect))
      if (ring && Math.hypot(ring.x - point.x, ring.y - point.y) <= reach) return { landmarkId: landmark.id, end: "picture" }
      const dot = this.canvasPointOfDirection(PictureRegistration.worldDirection(landmark.scene))
      if (dot && Math.hypot(dot.x - point.x, dot.y - point.y) <= reach) return { landmarkId: landmark.id, end: "scene" }
    }
    return undefined
  }

  /** Turns the picture with the pointer, or carries one end of a landmark under it. The picture
   * is turned from the fixed start of the drag (see onCameraDragPointerMove for why); a landmark's
   * end simply follows, and the picture is refitted to it when the pointer is released, not
   * while it moves — a picture refitted under a moving ring runs away from the pointer. */
  private onReferenceDragPointerMove(event: PointerEvent): void {
    const state = this.referenceDragState
    const point = this.canvasPointFromEvent(event)
    if (!state || !point) return
    if (state.kind === "anchor") {
      this.moveLandmarkEnd(state.landmarkId, state.end, point)
      return
    }
    const dx = point.x - state.startPointer.x
    const dy = point.y - state.startPointer.y
    if (!state.moved && Math.hypot(dx, dy) < 3) return
    state.moved = true
    const degPerPx = this.currentFovDeg() / this.ufoElement.canvasElement.height
    this.referenceHeadingInput.value = String(this.rounded(state.startHeadingDeg + dx * degPerPx))
    this.referencePitchInput.value = String(this.rounded(Math.max(-90, Math.min(90, state.startPitchDeg - dy * degPerPx))))
    this.updateReference()
  }

  private moveLandmarkEnd(landmarkId: string, end: "picture" | "scene", point: { x: number; y: number }): void {
    const reference = this.currentReference()
    const aspect = reference ? this.sceneElement.referenceAspect(reference.id) : undefined
    if (!reference || aspect === undefined) return
    const direction = this.directionAtCanvasPoint(point)
    this.writeLandmarks(this.currentLandmarks().map(landmark => {
      if (landmark.id !== landmarkId) return landmark
      if (end === "scene") return { ...landmark, scene: PictureRegistration.aimOf(direction) }
      const picture = PictureRegistration.picturePointOf(direction, reference.registration, aspect)
      return picture ? { ...landmark, picture } : landmark
    }))
    this.ufoElement.refresh()
  }

  private endReferenceDrag(): void {
    const state = this.referenceDragState
    this.referenceDragState = undefined
    this.setCanvasCursor(this.canvasMode() === "picture" ? "pan" : this.hoverCursor)
    document.removeEventListener("pointermove", this.handleDragPointerMove)
    document.removeEventListener("pointerup", this.handleDragPointerUp)
    if (state?.kind === "anchor") this.fitReferenceToLandmarks()
  }

  private onReferenceWheel(event: WheelEvent): void {
    if (this.canvasMode() !== "picture") return
    event.preventDefault()
    const fov = Number(this.referenceFovInput.value) || DEFAULT_REFERENCE_FOV_DEG
    // A notch is a twentieth: fine enough to line a horizon up, quick enough to cross the range.
    const next = Math.min(179, Math.max(1, fov * Math.exp(Math.sign(event.deltaY) * 0.05)))
    this.referenceFovInput.value = String(this.rounded(next))
    this.updateReference()
  }

  /** The world direction a canvas point names — through the instrument's own projection. */
  private directionAtCanvasPoint(point: { x: number; y: number }) {
    const canvas = this.ufoElement.canvasElement
    return this.sceneElement.directionAt((point.x / canvas.width) * 2 - 1, -((point.y / canvas.height) * 2 - 1))
  }

  /** "Add a landmark": the next click names a detail on the picture, the one after names the
   * same detail in the render. Said on the canvas itself, where the eyes are. */
  private armLandmark(): void {
    if (!this.currentReference()) return
    this.armingLandmark = true
    this.pendingLandmark = undefined
    this.setCanvasCursor("landmark")
    this.syncRegisterStatus()
    this.ufoElement.refresh()
  }

  private disarmLandmark(): void {
    this.armingLandmark = false
    this.pendingLandmark = undefined
    if (this.canvasMode() === "picture") {
      this.setCanvasCursor("pan")
      this.syncRegisterStatus()
    }
    this.ufoElement.refresh()
  }

  /**
   * One of the two armed clicks: the first must land on the picture and is kept until the second,
   * which lands anywhere in the render. Together they are a landmark — appended to the picture's
   * own, selected, and fitted at once (see fitReferenceToLandmarks): a landmark that does not fit
   * is seen as the picture failing to land on it, which is what a reader needs to notice it.
   */
  private nameLandmarkAt(point: { x: number; y: number }): void {
    const reference = this.currentReference()
    if (!reference) return
    const direction = this.directionAtCanvasPoint(point)
    if (!this.pendingLandmark) {
      const aspect = this.sceneElement.referenceAspect(reference.id)
      if (aspect === undefined) {
        this.referenceStatus.textContent = this.messages.referenceNotLoaded
        return
      }
      const picturePoint = PictureRegistration.picturePointOf(direction, reference.registration, aspect)
      if (!picturePoint) {
        this.referenceStatus.textContent = this.messages.referenceLandmarkOffPicture
        return
      }
      this.pendingLandmark = picturePoint
      this.syncRegisterStatus()
      this.ufoElement.refresh()
      return
    }
    const landmarks = this.currentLandmarks()
    const id = this.nextLandmarkId(landmarks)
    this.writeLandmarks([...landmarks, { id, picture: this.pendingLandmark, scene: PictureRegistration.aimOf(direction) }])
    this.armingLandmark = false
    this.pendingLandmark = undefined
    this.currentLandmarkId = id
    this.setCanvasCursor("pan")
    this.fitReferenceToLandmarks()
  }

  private nextLandmarkId(landmarks: PictureLandmark[]): string {
    let n = landmarks.length + 1
    while (landmarks.some(landmark => landmark.id === `landmark-${n}`)) n++
    return `landmark-${n}`
  }

  private fitReferenceToLandmarks(): void {
    const reference = this.currentReference()
    const aspect = reference ? this.sceneElement.referenceAspect(reference.id) : undefined
    if (!reference || aspect === undefined) return
    const landmarks = this.currentLandmarks()
    const fit = PictureRegistration.solve(landmarks, aspect, reference.registration.fovDeg)
    if (fit) {
      this.referenceFit = { n: landmarks.length, residualDeg: fit.residualDeg }
      this.referenceHeadingInput.value = String(this.rounded(fit.registration.headingDeg))
      this.referencePitchInput.value = String(this.rounded(fit.registration.pitchDeg))
      this.referenceRollInput.value = String(this.rounded(fit.registration.rollDeg ?? 0))
      this.referenceFovInput.value = String(this.rounded(fit.registration.fovDeg))
      this.updateReference()
    } else {
      this.referenceFit = undefined
    }
    this.refreshLandmarkList()
    this.syncRegisterStatus()
    this.ufoElement.refresh()
  }

  /** How far one landmark still is from fitting, degrees, under the picture's current registration. */
  private landmarkResidualDeg(landmark: PictureLandmark, reference: SceneReference, aspect: number): number {
    const onPicture = PictureRegistration.worldDirectionOf(landmark.picture, reference.registration, aspect)
    return (onPicture.angleTo(PictureRegistration.worldDirection(landmark.scene)) * 180) / Math.PI
  }

  /** "1 · Arbre masquant · 0,4°": the row a landmark has in the list, and the label it has on the
   * canvas is the same words without the residual. */
  private landmarkLabel(landmark: PictureLandmark, index: number): string {
    const name = this.said.read(landmark.label)
    return name ? `${index + 1} · ${name}` : String(index + 1)
  }

  private refreshLandmarkList(): void {
    const reference = this.currentReference()
    const landmarks = this.currentLandmarks()
    const aspect = reference ? this.sceneElement.referenceAspect(reference.id) : undefined
    this.referenceLandmarksSelect.innerHTML = ""
    for (const [index, landmark] of landmarks.entries()) {
      const option = document.createElement("option")
      option.value = landmark.id
      const residual = reference && aspect !== undefined ? ` · ${this.landmarkResidualDeg(landmark, reference, aspect).toFixed(1)}°` : ""
      option.textContent = this.landmarkLabel(landmark, index) + residual
      this.referenceLandmarksSelect.appendChild(option)
    }
    if (this.currentLandmarkId !== undefined && !landmarks.some(landmark => landmark.id === this.currentLandmarkId)) this.currentLandmarkId = undefined
    if (this.currentLandmarkId !== undefined) this.referenceLandmarksSelect.value = this.currentLandmarkId
    const current = landmarks.find(landmark => landmark.id === this.currentLandmarkId)
    ElementList.showPresence(this.shadow.getElementById("reference-landmark-row")!, this.shadow.getElementById("reference-landmark-item")!, landmarks.length > 0)
    this.referenceLandmarksSelect.disabled = landmarks.length === 0
    this.deleteReferenceLandmarkButton.disabled = current === undefined
    this.referenceLandmarkLabelInput.disabled = current === undefined
    if (this.shadow.activeElement !== this.referenceLandmarkLabelInput) this.referenceLandmarkLabelInput.value = this.said.read(current?.label) ?? ""
  }

  /** The same selection in the list and on the canvas — see paintPictureOverlay. */
  private selectLandmark(id: string): void {
    this.currentLandmarkId = id
    this.refreshLandmarkList()
    this.ufoElement.refresh()
  }

  private updateLandmarkLabel(): void {
    const current = this.currentLandmarkId
    if (current === undefined) return
    this.writeLandmarks(this.currentLandmarks().map(landmark =>
      landmark.id === current ? { ...landmark, label: this.said.write(landmark.label, this.referenceLandmarkLabelInput.value, this.writingLanguage) } : landmark))
    const option = this.referenceLandmarksSelect.options[this.referenceLandmarksSelect.selectedIndex]
    const landmarks = this.currentLandmarks()
    const index = landmarks.findIndex(landmark => landmark.id === current)
    const reference = this.currentReference()
    const aspect = reference ? this.sceneElement.referenceAspect(reference.id) : undefined
    if (option && index >= 0) {
      const residual = reference && aspect !== undefined ? ` · ${this.landmarkResidualDeg(landmarks[index]!, reference, aspect).toFixed(1)}°` : ""
      option.textContent = this.landmarkLabel(landmarks[index]!, index) + residual
    }
    this.ufoElement.refresh()
  }

  private deleteLandmark(): void {
    const current = this.currentLandmarkId
    if (current === undefined) return
    const remaining = this.currentLandmarks().filter(landmark => landmark.id !== current)
    this.writeLandmarks(remaining)
    this.currentLandmarkId = remaining[remaining.length - 1]?.id
    this.fitReferenceToLandmarks()
  }

  /** What the next click does, said under the fields and on the canvas (see paintPictureOverlay). */
  private landmarkHint(): string | undefined {
    const n = this.currentLandmarks().length + 1
    if (this.pendingLandmark) return this.messages.referenceLandmarkScene.replace("{n}", String(n))
    if (this.armingLandmark) return this.messages.referenceLandmarkPicture.replace("{n}", String(n))
    return undefined
  }

  private syncRegisterStatus(): void {
    const hint = this.landmarkHint()
    if (hint) {
      this.referenceStatus.textContent = hint
    } else if (this.referenceFit) {
      this.referenceStatus.textContent = this.messages.referenceLandmarksFit.replace("{n}", String(this.referenceFit.n)).replace("{deg}", this.referenceFit.residualDeg.toFixed(1))
    } else {
      this.referenceStatus.textContent = this.messages.referenceRegisterHint
    }
  }

  /** A canvas pixel for a world direction, or undefined behind the observer. */
  private canvasPointOfDirection(direction: Vector3): { x: number; y: number } | undefined {
    const ndc = this.sceneElement.screenPointOf(direction)
    if (!ndc) return undefined
    const canvas = this.ufoElement.canvasElement
    return { x: ((ndc.ndcX + 1) / 2) * canvas.width, y: ((1 - ndc.ndcY) / 2) * canvas.height }
  }

  /**
   * What the canvas shows of the picture it is editing: its frame as the scene projects it, and
   * every landmark named on it — the ring where the landmark is on the picture, under the current
   * registration, and the dot where the author said it is in the render, numbered or named as in
   * the list, the selected one bolder — and, while a landmark is being named, what the next click
   * does. Painted by the playback layer at every frame (see UfoElement.overlayPainter), so it
   * turns with the observer.
   */
  private readonly paintPictureOverlay = (renderer: CanvasRenderer): void => {
    const reference = this.currentReference()
    if (!reference) return
    const aspect = this.sceneElement.referenceAspect(reference.id)
    if (aspect === undefined) return
    const { registration } = reference
    const corners = [{ u: 0, v: 0 }, { u: 1, v: 0 }, { u: 1, v: 1 }, { u: 0, v: 1 }]
      .map(corner => this.canvasPointOfDirection(PictureRegistration.worldDirectionOf(corner, registration, aspect)))
    const landmarks = this.currentLandmarks().map((landmark, index) => ({
      picture: this.canvasPointOfDirection(PictureRegistration.worldDirectionOf(landmark.picture, registration, aspect)),
      scene: this.canvasPointOfDirection(PictureRegistration.worldDirection(landmark.scene)),
      label: this.landmarkLabel(landmark, index),
      selected: landmark.id === this.currentLandmarkId,
      residualDeg: this.landmarkResidualDeg(landmark, reference, aspect) as number | undefined
    }))
    if (this.pendingLandmark) {
      landmarks.push({
        picture: this.canvasPointOfDirection(PictureRegistration.worldDirectionOf(this.pendingLandmark, registration, aspect)),
        scene: undefined,
        label: String(this.currentLandmarks().length + 1),
        selected: true,
        residualDeg: undefined
      })
    }
    renderer.paintPictureFrame(
      corners.every(corner => corner !== undefined) ? (corners as { x: number; y: number }[]) : undefined,
      landmarks.filter((landmark): landmark is typeof landmark & { picture: { x: number; y: number } } => landmark.picture !== undefined),
      this.landmarkHint()
    )
  }

  /**
   * Makes the picture's registration the observer's own pose at the playhead — as a MEASUREMENT,
   * which is what a heading read off a picture that fits the relief is, where the heading typed
   * in the Observer group is the observer's word. The recording says so: each angle written gets a
   * "derived" basis naming the picture and how well it fitted (see Provenance).
   */
  private adoptReferencePose(): void {
    const reference = this.currentReference()
    if (!reference) return
    const { headingDeg, pitchDeg, rollDeg } = reference.registration
    this.headingInput.value = String(this.rounded(headingDeg))
    this.pitchInput.value = String(this.rounded(pitchDeg))
    this.rollInput.value = String(this.rounded(rollDeg ?? 0))
    this.updateObserver()
    const t = this.ufoElement.currentTime
    const index = this.ufoElement.sighting.observerTrack.toJSON().keyframes.findIndex(keyframe => keyframe.t === t)
    if (index < 0) return
    const rationale = this.messages.referenceAdoptRationale
      .replace("{title}", this.referenceLabel(reference))
      .replace("{n}", String(this.currentLandmarks().length))
      .replace("{deg}", (this.referenceFit?.residualDeg ?? 0).toFixed(1))
    const values: [string, number][] = [["headingDeg", headingDeg], ["pitchDeg", pitchDeg], ["rollDeg", rollDeg ?? 0]]
    for (const [field, value] of values) {
      this.ufoElement.sighting.provenance.set(`observerTrack.keyframes.${index}.pose.${field}`, { basis: "derived", rationale, of: this.rounded(value) })
    }
  }

  // ---- Street-level pictures taken near the spot — see PanoramaxPictures.

  /** Nowhere to look around without a place: the lookup waits for the Location group's own
   * latitude and longitude. */
  private syncStreetSearchAvailability(): void {
    const located = this.numberOrUndefined(this.latInput.value) !== undefined && this.numberOrUndefined(this.lngInput.value) !== undefined
    this.referenceAddMenu.setDisabled("street", located ? undefined : this.messages.referenceStreetNoPlace)
  }

  /** The kinds of picture the "+" offers, as the reader's language calls them, the street pictures kept greyed while there is no place. */
  private setReferenceAddKinds(address: string, file: string, street: string): void {
    const located = this.numberOrUndefined(this.latInput?.value ?? "") !== undefined && this.numberOrUndefined(this.lngInput?.value ?? "") !== undefined
    this.referenceAddMenu.setKinds([
      { value: "address", label: address }, { value: "file", label: file },
      { value: "street", label: street, ...(located ? {} : { disabledReason: this.messages?.referenceStreetNoPlace ?? "" }) }
    ])
  }

  /** The "+" of the pictures adds one from where its menu says: an address typed next, a file of the author's, or a
   * street-level picture near the spot, looked up first and then picked. */
  private addReferenceOfKind(kind: string): void {
    switch (kind) {
      case "file": this.addReferenceFromFile(); break
      case "street": void this.searchStreetPictures(); break
      default: this.addReferenceFromAddress()
    }
  }

  private async searchStreetPictures(): Promise<void> {
    const pose = resolveObserverPoseAt(this.ufoElement.sighting, 0)
    const lat = pose?.lat ?? this.numberOrUndefined(this.latInput.value)
    const lng = pose?.lng ?? this.numberOrUndefined(this.lngInput.value)
    if (lat === undefined || lng === undefined) return
    const radiusM = 300
    this.referenceStatus.textContent = this.messages.referenceStreetSearching
    this.addReferenceButton.disabled = true
    try {
      this.streetPictures = await this.streetPictures$.nearby(lat, lng, radiusM)
    } catch {
      this.streetPictures = []
      this.referenceStatus.textContent = this.messages.referenceStreetFailed
      this.addReferenceButton.disabled = false
      return
    }
    this.addReferenceButton.disabled = false
    this.referenceStreetSelect.innerHTML = ""
    for (const [index, picture] of this.streetPictures.entries()) {
      const option = document.createElement("option")
      option.value = String(index)
      option.textContent = this.streetPictureLabel(picture, this.messages.referenceStreetItem)
      this.referenceStreetSelect.appendChild(option)
    }
    const any = this.streetPictures.length > 0
    this.referenceStreetSelect.hidden = !any
    this.referenceStreetAddButton.hidden = !any
    this.referenceStatus.textContent = any ? "" : this.messages.referenceStreetNone.replace("{m}", String(radiusM))
  }

  private streetPictureLabel(picture: StreetPicture, pattern: string): string {
    return pattern
      .replace("{distance}", String(Math.round(picture.distanceM)))
      .replace("{bearing}", String(Math.round(picture.bearingDeg)))
      .replace("{date}", picture.takenAt.slice(0, 10))
      .replace("{panorama}", picture.panorama ? this.messages.referenceStreetPanorama : "")
  }

  /** A street-level picture comes registered: it says which way it looked. Its field, when it is
   * not a full turn, is the ordinary guess until somebody lines it up. */
  private addStreetPicture(): void {
    const picture = this.streetPictures[Number(this.referenceStreetSelect.value)]
    if (!picture) return
    this.addReference(picture.src, this.streetPictureLabel(picture, this.messages.referenceStreetTitle), {
      kind: picture.panorama ? "panorama" : "photo",
      credit: picture.credit,
      creditUrl: picture.creditUrl,
      registration: { headingDeg: picture.azimuthDeg ?? 0, pitchDeg: 0, fovDeg: DEFAULT_REFERENCE_FOV_DEG }
    })
  }

  // ---- What an investigator drew over the place — see InvestigatorTrace and the Pictures group.

  private traceLabel(trace: InvestigatorTrace): string {
    const kind = trace.kind === "point" ? this.messages.traceKindPoint : trace.kind === "line" ? this.messages.traceKindLine : this.messages.traceKindPolygon
    const name = this.said.read(trace.title)
    return name ? `${name} (${kind})` : `${trace.id} (${kind})`
  }

  private refreshTraceList(): void {
    const traces = this.ufoElement.sighting.traces
    this.traceSelect.innerHTML = ""
    for (const trace of traces) {
      const option = document.createElement("option")
      option.value = trace.id
      option.textContent = this.traceLabel(trace)
      this.traceSelect.appendChild(option)
    }
    if (!traces.some(trace => trace.id === this.currentTraceId)) this.currentTraceId = traces[0]?.id
    if (this.currentTraceId !== undefined) this.traceSelect.value = this.currentTraceId
    this.syncTraceFields()
  }

  private selectTrace(id: string): void {
    this.currentTraceId = id
    this.syncTraceFields()
  }

  private syncTraceFields(): void {
    const trace = this.ufoElement.sighting.traces.find(candidate => candidate.id === this.currentTraceId)
    const hasSelection = trace !== undefined
    ElementList.showPresence(this.shadow.getElementById("trace-row")!, this.shadow.getElementById("trace-item")!, hasSelection)
    for (const field of [this.traceSelect, this.deleteTraceButton, this.traceTitleInput, this.traceSourceInput]) field.disabled = !hasSelection
    this.traceTitleInput.value = this.said.read(trace?.title) ?? ""
    this.traceSourceInput.value = this.said.read(trace?.source) ?? ""
  }

  private writeTraceFields(): void {
    const sighting = this.ufoElement.sighting
    if (this.currentTraceId === undefined) return
    sighting.traces = sighting.traces.map(trace => trace.id !== this.currentTraceId ? trace : {
      ...trace,
      title: this.said.write(trace.title, this.traceTitleInput.value, this.writingLanguage),
      source: this.said.write(trace.source, this.traceSourceInput.value, this.writingLanguage)
    })
    // Not refreshTraceList: rebuilding the options on every keystroke would move the caret's own
    // row under the author's hand. The label catches up on the next refresh.
    const option = Array.from(this.traceSelect.options).find(candidate => candidate.value === this.currentTraceId)
    const trace = sighting.traces.find(candidate => candidate.id === this.currentTraceId)
    if (option && trace) option.textContent = this.traceLabel(trace)
    this.ufoElement.refresh()
  }

  /**
   * Reads a Google Earth file the author chose and adds what it draws — see KmlImport. Each trace is
   * credited to the file it came from until the author says better, because a line without an
   * author is an illustration; the reader module is loaded here, not with the editor, as most
   * recordings never import one.
   */
  private async addTraces(pick: InputFilePick): Promise<void> {
    const name = pick.file?.name ?? decodeURIComponent(pick.url!.split("/").pop() ?? pick.url!)
    let result: KmlImportResult
    try {
      const { KmlImport } = await import("../engine/interop/KmlImport.js")
      result = await KmlImport.fromBytes(await InputFileElement.bytesOf(pick))
    } catch {
      this.traceStatus.textContent = this.messages.traceFailed
      return
    }
    if (result.traces.length === 0) {
      this.traceStatus.textContent = this.messages.traceNone
      return
    }
    const sighting = this.ufoElement.sighting
    const taken = new Set(sighting.traces.map(trace => trace.id))
    let next = 1
    const source = this.said.write(undefined, result.documentName ?? name, this.writingLanguage)
    const added = result.traces.map(trace => {
      while (taken.has(`trace-${next}`)) next++
      const id = `trace-${next}`
      taken.add(id)
      return {
        ...trace,
        id,
        title: trace.title === undefined ? undefined : this.said.write(undefined, trace.title as string, this.writingLanguage),
        source
      } satisfies InvestigatorTrace
    })
    sighting.traces = [...sighting.traces, ...added]
    this.currentTraceId = added[0].id
    this.refreshTraceList()
    const left = result.skipped.length > 0 ? ` ${this.messages.traceSkipped.replace("{what}", result.skipped.join(", "))}` : ""
    this.traceStatus.textContent = this.messages.traceImported.replace("{n}", String(added.length)).replace("{name}", name) + left
    this.ufoElement.refresh()
  }

  private deleteTrace(): void {
    if (this.currentTraceId === undefined) return
    const sighting = this.ufoElement.sighting
    sighting.traces = sighting.traces.filter(trace => trace.id !== this.currentTraceId)
    this.currentTraceId = sighting.traces[0]?.id
    this.refreshTraceList()
    this.ufoElement.refresh()
  }

  private deleteReference(): void {
    if (this.currentReferenceId === undefined) return
    const sighting = this.ufoElement.sighting
    sighting.references = sighting.references.filter(reference => reference.id !== this.currentReferenceId)
    this.currentReferenceId = sighting.references[0]?.id
    this.refreshReferenceList()
    this.ufoElement.refresh()
  }

  private buildSoundKindOptions(): void {
    for (const kind of SOUND_KINDS) {
      const option = document.createElement("option")
      option.value = kind
      option.textContent = this.soundKindLabel(kind, this.messages)
      this.soundKindOptions.set(kind, option)
      this.soundKindSelect.appendChild(option)
    }
  }

  private soundKindLabel(kind: SoundKind, messages: SightingEditorMessages): string {
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

  /** Lets the observer hear what they are describing while they tune it — an input event on a
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
   * back to the observer. Unchecking keeps the values exactly as they are — a real record is the
   * best starting point a correction can have — but drops the claim that they were measured, and
   * with it any right of a later lookup to overwrite them (see Sighting.weatherSource). */
  /** A record picked as where the weather comes from is asked (the box ticked); the file picked keeps what the file says (the box unticked). */
  private onWeatherProviderChosen(): void {
    const fromFile = this.weatherProviderSelect.value === SightingEditorElement.FILE_SOURCE
    if (!fromFile) {
      const source = dataSourceById(WEATHER_SOURCES, this.weatherProviderSelect.value)
      if (source.id !== this.chosenSourceId.get("weather")) {
        this.chosenSourceId.set("weather", source.id)
        this.weatherInference = new WeatherInference(source.create())
      }
    }
    this.setWeatherFromFile(fromFile)
    if (this.weatherInferredInput.checked === !fromFile) return
    this.weatherInferredInput.checked = !fromFile
    // Read from the file, the weather stays what the file says, the record it came from named with it: it is only no longer asked again.
    this.keepWeatherSource = fromFile
    try {
      this.weatherInferredInput.dispatchEvent(new Event("change"))
    } finally {
      this.keepWeatherSource = false
    }
  }

  /** Set while the weather is put in the file's hands by its picker, which keeps the record it came from named (see onWeatherInferredToggled). */
  private keepWeatherSource = false

  /** Says in the recording whether its weather is read from its file (`frozen.weather`) or asked of a record again as the date or the place change. */
  private setWeatherFromFile(fromFile: boolean): void {
    const sighting = this.ufoElement.sighting
    if (RecordingSections.fromFile(sighting.frozen, "weather") === fromFile) return
    const frozen: FrozenData = { ...(sighting.frozen ?? {}) }
    if (fromFile) frozen.weather = { ...(frozen.weather ?? {}), live: undefined }
    else delete frozen.weather
    if (frozen.weather && frozen.weather.live === undefined) delete frozen.weather.live
    sighting.frozen = FrozenGroups.isEmpty(frozen) ? undefined : frozen
    this.touch()
    this.scheduleFileSync()
    this.refreshFileItems()
  }

  /** The weather's picker, as the box under it says: its records, then the file. */
  private fillWeatherProvider(): void {
    this.weatherProviderSelect.replaceChildren(
      ...WEATHER_SOURCES.map(source => {
        const option = new Option(source.name, source.id)
        option.title = source.credit
        return option
      }),
      new Option(this.messages.sourceFile, SightingEditorElement.FILE_SOURCE))
    this.syncWeatherProvider()
  }

  private syncWeatherProvider(): void {
    const fromFile = !this.weatherInferredInput.checked
    this.weatherProviderSelect.value = fromFile ? SightingEditorElement.FILE_SOURCE : dataSourceById(WEATHER_SOURCES, this.chosenSourceId.get("weather")).id
    this.weatherProviderSelect.disabled = this.weatherInferredInput.disabled
    this.weatherProviderSelect.title = this.weatherInferredInput.title
    const record = dataSourceById(WEATHER_SOURCES, this.chosenSourceId.get("weather"))
    const credit = this.shadow.getElementById("weather-credit") as HTMLAnchorElement
    credit.hidden = fromFile
    credit.href = record.creditUrl
    credit.textContent = record.credit
    this.weatherFileLink.hidden = !fromFile
    if (fromFile) {
      this.weatherFileLink.textContent = this.weatherFileItemLabel()
      this.weatherFileLink.title = this.sectionFilePanel?.where("weather") ?? ""
    }
  }

  private onWeatherInferredToggled(): void {
    this.weatherFromRecords = this.weatherInferredInput.checked
    this.setWeatherFromFile(!this.weatherFromRecords)
    if (this.weatherFromRecords) {
      this.scheduleWeatherLookup(true)
    } else {
      this.cancelWeatherLookup()
      if (!this.keepWeatherSource) this.ufoElement.sighting.weatherSource = undefined
      this.syncWeatherSourceState()
    }
  }

  /** Coalesces the burst of edits a single date or coordinate produces into one lookup — see
   * WEATHER_LOOKUP_DEBOUNCE_MS. A no-op while the observer owns these fields: their account is
   * never re-derived behind their back. */
  private scheduleWeatherLookup(asked = false): void {
    if (!this.weatherFromRecords || this.pendingWeatherEdit !== undefined) return
    // A weather the report itself gives (a station's, named and linked) is no lookup's to redo behind the author's back: loading
    // the recording sets its time zone, its duration, its place, and each of these asked, and the reanalysis replaced it. Only when
    // the author ticks the box (`asked`).
    const source = this.ufoElement.sighting.weatherSource
    if (!asked && source !== undefined && !isRecordSource(source)) return
    clearTimeout(this.weatherLookupTimer)
    this.weatherLookupTimer = setTimeout(() => void this.inferWeather(), WEATHER_LOOKUP_DEBOUNCE_MS)
  }

  /** Drops a pending lookup AND disowns any answer already in flight (see inferWeather's token) —
   * needed wherever the question itself stops applying: the observer has taken the fields back, or
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
    // A newer edit already asked a newer question, or the observer took the fields back mid-flight.
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
   * first keyframe and the weather appears frozen for the whole observation. That is what a observer
   * sees as "the weather never changes"; nothing about the lookup itself is wrong.
   *
   * Cheap to re-run: the provider answers an identical query from its own cache, so this costs no
   * request. Only ever for a track the record owns — a observer's own account is never re-derived.
   */
  private ensureWeatherTrackSpan(): void {
    const source = this.ufoElement.sighting.weatherSource
    // Only for a track a lookup wrote: a weather the report itself gives (a station's, named and linked) is no lookup's to redo, and
    // was replaced by the reanalysis's the moment the clock changed length — loading the recording was enough.
    if (!this.weatherFromRecords || source === undefined || !isRecordSource(source)) return
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
      // And while the recording is PLAYING, whatever owns them. applyWeatherAtPlayhead refuses to
      // write then — the playhead is a moving target, and syncWeatherFromTimeline would overwrite
      // the very field being dragged on the next tick — but nothing said so: the slider moved, the
      // sky did not, and the value snapped back. A control that cannot be acted on has to look
      // like one, which is the same rule the appearance fields already follow.
      field.disabled =
        (inferred && source !== undefined && field !== this.iceCrystalAlignmentInput && field !== this.rareIceCrystalsInput) ||
        this.ufoElement.playbackState === "playing"
      if (this.ufoElement.playbackState === "playing") {
        field.title = this.messages.weatherWhilePlaying
      } else if (field.title === this.messages.weatherWhilePlaying) {
        field.title = ""
      }
    }
    // With no date or no place stated, there is no question to ask a record — so the control that
    // asks it is unavailable AND unticked, because a ticked box would say the weather below comes
    // from a record when nothing has been asked for it. What used to be printed as a status line
    // ("a full date and a place are needed") is its tooltip instead: an explanation of why a
    // control is unavailable belongs ON that control, not in the space reserved for what a record
    // answered. The requirement itself is WeatherInference's own (canInfer), never re-decided here;
    // the box ticks itself again as soon as one can be asked, unless the observer has turned it off.
    const canLookUp = this.weatherInference.canInfer(this.ufoElement.sighting) && !this.startDateHalfEntered()
    // The question having gone (the date or the place was taken away), the answer it got goes with it: a
    // source left standing named a request for a date nobody states any more, was saved with the recording,
    // and hid the reason the box is unavailable. The values stay, unlocked, as the observer's own start.
    // Only a lookup's own source: a station the report names was never asked for (see scheduleWeatherLookup).
    if (!canLookUp && source !== undefined && isRecordSource(source)) {
      this.cancelWeatherLookup()
      this.weatherLookupResult = undefined
      this.ufoElement.sighting.weatherSource = undefined
      this.syncWeatherSourceState()
      return
    }
    this.weatherInferredInput.disabled = !canLookUp
    this.weatherInferredInput.checked = canLookUp && this.weatherFromRecords
    const inferredTitle = canLookUp ? this.messages.weatherInferredTitle : this.messages.weatherNeedsDateAndPlace
    this.weatherInferredInput.title = inferredTitle
    this.labelWeatherInferred.title = inferredTitle
    this.syncWeatherProvider()
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
    const status = !canLookUp ? this.weatherUnavailableMessage() : inferred ? this.weatherStatusMessage() : ""
    this.weatherSourceText.textContent = status === "" ? "" : `${status} `
    // The picker names which record answered, or is being asked; with nothing asked and nothing
    // answered it would be a credit for data nobody produced.
    this.weatherSourceRow.hidden = status === "" || !canLookUp
  }

  /** Whether the date's picker has a segment (day, month, year, hour) taken out and not yet put back. The field writes nothing
   * for that, deliberately (see EdtfDateField.writeFromPicker: an empty text would erase the date between a day and its hour), so
   * the recording still states the last whole date; but a lookup must not be asked about a date the reader can see is not whole. */
  private startDateHalfEntered(): boolean {
    const picker = this.shadow.getElementById("obs-time-native") as HTMLInputElement | null
    return picker?.validity.badInput === true
  }

  /** Why the records cannot be asked at all, on the line beside the greyed box: a tooltip alone left the
   * box looking merely broken. Names what is lacking, the date, the place, or both. */
  private weatherUnavailableMessage(): string {
    const missing = this.weatherInference.missingOf(this.ufoElement.sighting)
    if (this.startDateHalfEntered()) missing.date = true
    if (missing.date && missing.place) return this.messages.weatherNeedsDateAndPlace
    return missing.date ? this.messages.weatherNeedsDate : this.messages.weatherNeedsPlace
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
   * file must replay identically offline and years later), the observer when it has weather but no
   * source, and the record again for a file with no weather at all, which is what makes an
   * imported case pick up its real conditions the moment it states a date and a place. */
  private syncWeatherOwnership(): void {
    const sighting = this.ufoElement.sighting
    // Anything the previous recording had in flight is about a different sighting now — a question about its weather included.
    this.cancelWeatherLookup()
    this.pendingWeatherEdit = undefined
    this.closeFileAsk()
    this.weatherLookupResult = undefined
    this.weatherFromRecords = !RecordingSections.fromFile(sighting.frozen, "weather") &&
      (sighting.weatherSource !== undefined || sighting.weatherTrack.allKeyframes.length === 0)
    this.syncWeatherSourceState()
    if (this.weatherFromRecords && sighting.weatherSource === undefined) {
      this.scheduleWeatherLookup()
    }
    // The night sky's figure the same way: whatever was asked about the previous recording is
    // forgotten, and this one's is asked for if the atlas may give it.
    this.lightPollutionToken++
    this.lightPollutionLookup = undefined
    this.scheduleLightPollutionLookup()
  }

  /** The record the night sky's figure is read from — see LIGHT_POLLUTION_SOURCES. */
  private lightPollutionProvider: LightPollutionProvider = LIGHT_POLLUTION_SOURCES[0].create()
  private lightPollutionTimer?: ReturnType<typeof setTimeout>
  /** Disowns an answer about a place or a recording that is no longer the one on display. */
  private lightPollutionToken = 0
  /** What the atlas last answered, or "pending" while it is being asked, or "too-early" when it was
   * not asked because the observation predates it; undefined when the figure is the author's. */
  private lightPollutionLookup?: LightPollutionLookup | { status: "pending" } | { status: "too-early"; year: number }

  /**
   * Whether the figure on display is one the atlas may replace: none at all, or one it gave. A figure
   * the author typed, or one a file states without saying it was derived, is theirs and never
   * re-derived behind their back — the same rule as the weather (see Sighting.weatherSource).
   */
  private lightPollutionFromRecord(): boolean {
    const sighting = this.ufoElement.sighting
    // Read from the file: the atlas is not asked.
    if (this.sectionFromFile("lightPollution")) return false
    if (sighting.lightPollution === undefined) return true
    const entry = sighting.provenance.at("lightPollution")
    return entry?.basis === "derived" && (entry.of === undefined || entry.of === sighting.lightPollution)
  }

  /** Coalesces the burst of edits one move of the observer produces into one lookup. */
  private scheduleLightPollutionLookup(): void {
    clearTimeout(this.lightPollutionTimer)
    if (!this.lightPollutionFromRecord()) {
      this.lightPollutionLookup = undefined
      this.syncLightPollutionStatus()
      return
    }
    this.lightPollutionTimer = setTimeout(() => void this.lookUpLightPollution(), WEATHER_LOOKUP_DEBOUNCE_MS)
  }

  /**
   * Reads the night sky of the observer's place from the atlas, and writes it into the recording as
   * a DERIVED value with the atlas named in its rationale — so that a saved file carries the figure
   * and its source, and replays the same years later without asking anyone (Sighting.lightPollution).
   *
   * NOT for an observation older than the atlas. Artificial light has only grown, so the atlas's sky
   * over a sighting of 1964 is a sky brighter than the one seen, and a reconstruction must never make
   * a sky brighter than it was: the figure is left to the author, and the line says why.
   */
  private async lookUpLightPollution(): Promise<void> {
    if (!this.lightPollutionFromRecord()) return
    const sighting = this.ufoElement.sighting
    const place = sighting.event.place?.[0]
    const token = ++this.lightPollutionToken
    const provider = this.lightPollutionProvider
    const year = sighting.event.time?.year
    const forget = (): void => {
      if (sighting.lightPollution !== undefined) {
        sighting.lightPollution = undefined
        sighting.provenance.clear("lightPollution")
        this.lightPollutionInput.value = ""
        this.ufoElement.refresh()
      }
    }
    // No year, no era: the atlas's sky may be decades too bright for it, so nothing is asked yet.
    if (!place || place.lat === undefined || place.lng === undefined || year === undefined) {
      this.lightPollutionLookup = undefined
      this.syncLightPollutionStatus()
      return
    }
    if (year < provider.year) {
      forget()
      this.lightPollutionLookup = { status: "too-early", year }
      this.syncLightPollutionStatus()
      return
    }
    this.lightPollutionLookup = { status: "pending" }
    this.syncLightPollutionStatus()
    const lookup = await provider.lookUp(place.lat, place.lng)
    if (token !== this.lightPollutionToken || !this.lightPollutionFromRecord()) return
    this.lightPollutionLookup = lookup
    if (lookup.status === "found") {
      sighting.lightPollution = lookup.lightPollution
      sighting.provenance.set("lightPollution", {
        basis: "derived",
        rationale: `${provider.citation}, at ${lookup.lat.toFixed(4)}, ${lookup.lng.toFixed(4)}: ` +
          `${Math.round(lookup.artificialMcdPerM2 * 1000)} µcd/m² artificial over the natural 171`,
        of: lookup.lightPollution
      })
      this.lightPollutionInput.value = String(lookup.lightPollution)
      this.ufoElement.refresh()
    } else if (lookup.status === "natural") {
      forget()
    }
    // "outside" and "failed" leave whatever was there: nothing new is known.
    this.syncLightPollutionStatus()
  }

  /** The line beside the figure: where it came from while the atlas owns it, nothing once it is the author's. */
  private syncLightPollutionStatus(): void {
    const lookup = this.lightPollutionLookup
    const messages = this.messages
    let text = ""
    switch (lookup?.status) {
      case "pending":
        text = messages.lightPollutionLookingUp
        break
      case "found":
        text = messages.lightPollutionFound.replace("{artificial}", Math.round(lookup.artificialMcdPerM2 * 1000).toLocaleString(this.language))
        break
      case "natural":
        text = messages.lightPollutionNatural
        break
      case "outside":
        text = messages.lightPollutionOutside
        break
      case "failed":
        text = messages.lightPollutionFailed
        break
      case "too-early":
        text = messages.lightPollutionTooEarly
          .replace("{atlasYear}", String(this.lightPollutionProvider.year))
          .replace("{year}", String(lookup.year))
        break
    }
    this.lightPollutionStatusText.textContent = text === "" ? "" : `${text} `
    // The picker is the credit, so it stands only beside something the atlas actually answered.
    this.lightPollutionSourceRow.hidden = !(lookup?.status === "found" || lookup?.status === "natural" || lookup?.status === "outside")
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
    const active = this.shadow.activeElement
    if (active !== this.durationInput && active !== this.durationElement.textField) {
      const event = this.ufoElement.sighting.event
      const durationMs = sightingDurationMs(event)
      // As stated when it was not exact; the one length the simulation is played at beside it.
      this.durationElement.set(durationMs !== undefined ? durationMs / 1000 : undefined, event.durationText)
    }
    this.updateDurationValidity()
  }

  /** Duration has no sane default (unlike every other field in this toolbar) — real playback
   * pacing needs *some* notion of the observation's length, so an empty value is visibly flagged
   * as missing rather than just left blank. Clears automatically the moment a value exists,
   * whether typed directly or derived from start/end dates. When start/end are both given but too
   * imprecise/mismatched to derive an exact duration from (see sightingDurationBlockedReason), the
   * field's title explains why instead of leaving the observer to guess. */
  private updateDurationValidity(): void {
    const missing = this.durationInput.value === ""
    // Marked missing, not marked WRONG. input.invalid's red box says a value was typed badly, and
    // nothing was typed here at all — see the two marks' own comment in the stylesheet. Solid rather
    // than dashed because this is the one blank the reconstruction cannot be computed around.
    this.durationInput.classList.toggle("missing-required", missing)
    // The Moment tab has to follow: it is the only mark a reader sees while that panel is closed.
    this.markUnansweredQuestions()
    this.durationInput.setAttribute("aria-invalid", String(missing))
    const blockedReason = sightingDurationBlockedReason(this.ufoElement.sighting.event)
    this.durationElement.title = blockedReason === "imprecise" ? this.messages.durationImprecise : ""
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
    this.seekInput.max = String(this.ufoElement.seekableDuration)
    // Skips the field while it's focused — same "don't fight active input" reasoning as
    // syncDurationField/syncObserverFromTimeline.
    if (this.shadow.activeElement !== this.seekInput) {
      this.seekInput.value = String(this.ufoElement.currentTime)
    }
    this.timeStartLabel.textContent = this.ufoElement.positionLabel
    this.timeEndLabel.textContent = this.ufoElement.durationLabel
    this.syncTimeDisplaySwitch()
    for (const [button, text] of [[this.previousMarkButton, this.messages.previousKeyframe], [this.nextMarkButton, this.messages.nextKeyframe]] as const) {
      button.title = text
      button.setAttribute("aria-label", text)
    }
    this.refreshTimelineMarks()
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
  /**
   * Picks the mode a freshly loaded recording opens in: the picker whenever both stated times are
   * full instants, the text field otherwise.
   *
   * The picker is the default because a reconstruction needs a full instant to compute a sky at
   * all — of the nine recordings that exist, eight state one to the minute. It is not the only
   * mode because the corpus those recordings are made FROM says otherwise: of 241 case files, 43%
   * state a bare year and 17% a date with a time.
   *
   * Only on load. After that the mode is the author's, and re-deciding it under them mid-edit is
   * how a half-typed year would snap the field away.
   */
  private chooseTimeInputMode(): void {
    const event = this.ufoElement.sighting.event
    // Each date opens the way it can be said: precise (the picker) for an exact full instant, EDTF (the text) for anything less or in doubt. Its own toggle changes that after.
    this.startDate.setPrecise(EdtfDateField.opensPrecise(event.time))
    this.endDate.setPrecise(EdtfDateField.opensPrecise(event.endTime))
  }

  private syncObservationTimeFields(): void {
    this.startDate.time = this.ufoElement.sighting.event.time
  }

  /** Resyncs the observation-end date/time field from a freshly loaded sighting — same role and
   * timing as syncObservationTimeFields(), for event.endTime instead of event.time. */
  private syncObservationEndTimeFields(): void {
    this.endDate.time = this.ufoElement.sighting.event.endTime
  }

  /** Resyncs observer/case/description/tags from a freshly loaded sighting — same role as
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
   * correction: the recording states the observer's clock, and this cannot know better than the
   * observer. Rendered with the same `.invalid` styling as an unparseable date.
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
   * observation date, not a per-instant keyframe (the observerTrack's poses carry coordinates only,
   * deliberately: a observer who moves is still at the same named place). */
  /**
   * Looks up the ground's own height above sea level at the current location, and re-anchors the
   * Altitude field to it: the field's floor becomes the ground (a observer in the Alps cannot be at
   * 0 m, and an editor that offers it invites a recording that says so), and a observer who was
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
    // The pose is unchanged, and not written again: it keeps a height above the ground, which the field now shows measured from
    // the sea, the same height. Written back through updateObserver, the whole pose was read off the fields at the playhead, rounded,
    // as a keyframe nobody typed — and after an undo, a change of the recording that the history did not hold.
  }

  /** Shows `heightAboveGroundM` as what it is in the world: an altitude above sea level, floored at
   * the ground the observer is standing on. */
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

  private syncObserverMetadataFields(): void {
    const sighting = this.ufoElement.sighting
    this.observerIdInput.value = sighting.observer?.id ?? ""
    this.observerTitleInput.value = sighting.observer?.title ?? ""
    this.observerLastNameInput.value = sighting.observer?.lastName ?? ""
    this.observerFirstNamesInput.value = sighting.observer?.firstNames?.join(", ") ?? ""
    this.observerList.rename(SightingEditorElement.OBSERVER_PRINCIPAL, this.principalObserverLabel())
    this.sightingIdInput.value = sighting.id ?? ""
    this.observerAgeInput.value = sighting.account?.observerAgeYears?.toString() ?? ""
    this.birthDate.setPrecise(EdtfDateField.opensPreciseDate(sighting.account?.observerBirth))
    this.perceptionSettings.values = sighting.account?.observerPerception ?? {}
    this.birth = sighting.account?.observerBirth
    this.birthDate.time = this.birth
    this.observerOccupationInput.value = this.said.read(sighting.account?.observerOccupation) ?? ""
    this.accountSourceSelect.value = sighting.account?.source ?? ""
    this.accountUrlInput.value = sighting.sources?.[0]?.url ?? ""
    this.accountFollowedUpSelect.value =
      sighting.account?.followedUp === undefined ? "" : sighting.account.followedUp ? "yes" : "no"
    this.descriptionInput.value = this.said.read(sighting.event.description) ?? ""
    this.showTags()
    this.instrumentSelect.value = sighting.instrument.id
    this.swayInput.value = sighting.sway?.toString() ?? ""
    this.lightPollutionInput.value = sighting.lightPollution?.toString() ?? ""
  }

  /** Keeps the weather toolbar honest as the playhead moves or a different keyframe region is
   * scrubbed to — same role/timing and the same playing-state bailout as syncObserverFromTimeline
   * (merely scrubbing must never itself write a keyframe). Reads resolveWeatherAt (interpolated,
   * not hold-last) so the fields reflect what a observer would actually have reported *between* two
   * weather keyframes, matching what SceneElement itself renders at that instant — it already
   * falls back through the legacy static sighting.weather, then DEFAULT_WEATHER, when the track
   * has no keyframes at all yet (e.g. a sighting loaded from older data, or before the very first
   * weather edit).
   *
   * Skips whichever field currently has focus — same "don't fight active typing/dragging"
   * reasoning as syncObserverFromTimeline's own doc comment. */
  private syncWeatherFromTimeline(): void {
    this.cloudEditor?.sync()
    if (this.ufoElement.playbackState === "playing") return
    const weather = resolveWeatherAt(this.ufoElement.sighting, this.ufoElement.currentTime)
    const active = this.shadow.activeElement
    if (active !== this.cloudCoverInput) this.cloudCoverInput.value = String(weather.cloudCover)
    if (active !== this.highCloudCoverInput) this.highCloudCoverInput.value = String(weather.highCloudCover ?? 0)
    if (active !== this.iceCrystalAlignmentInput) {
      this.iceCrystalAlignmentInput.value = String(weather.iceCrystalAlignment ?? DEFAULT_ICE_CRYSTAL_ALIGNMENT)
    }
    if (active !== this.rareIceCrystalsInput) {
      this.rareIceCrystalsInput.value = String(weather.rareIceCrystals ?? DEFAULT_RARE_ICE_CRYSTALS)
    }
    if (active !== this.cloudDarknessInput) this.cloudDarknessInput.value = String(weather.cloudDarkness)
    if (active !== this.cloudBaseInput) this.cloudBaseInput.value = weather.cloudBaseM === undefined ? "" : String(weather.cloudBaseM)
    if (active !== this.precipitationTypeSelect) this.precipitationTypeSelect.value = weather.precipitationType
    if (active !== this.precipitationIntensityInput) {
      this.precipitationIntensityInput.value = String(weather.precipitationIntensity)
    }
    // To the fields' own steps (a degree, half a metre per second): between two hourly rows the
    // track holds a blend to sixteen decimals, which is not a thing to show in a field for typing.
    if (active !== this.windDirectionInput) this.windDirectionInput.value = String(Math.round(weather.windDirectionDeg))
    if (active !== this.windSpeedInput) this.windSpeedInput.value = String(Math.round(weather.windSpeed * 2) / 2)
    if (active !== this.stormInput) this.stormInput.checked = weather.storm
  }

  /** Keeps the lat/lng/heading/pitch fields honest as the playhead moves or a different keyframe
   * region is scrubbed to — same role and the same playing-state bailout as
   * syncAppearanceFromTimeline (merely scrubbing must never itself write a keyframe). Reads
   * getInterpolatedPoseAt (not hold-last) so the fields reflect what a observer would see *between*
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
    this.syncStreetSearchAvailability()
    const sighting = this.ufoElement.sighting
    const pose = sighting.observerTrack.getInterpolatedPoseAt(this.ufoElement.currentTime)
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
    this.refreshHeadingPoint()
    if (active !== this.pitchInput) {
      this.pitchInput.value = String(this.rounded(pose?.pitchDeg ?? 0))
      this.rollInput.value = String(this.rounded(pose?.rollDeg ?? 0))
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
    // While actively recording, a toolbar change only seeds the *next* take (unchanged,
    // pre-existing behavior) — the in-flight shapePrototype stays frozen for this take's
    // duration. While playing, the playhead is a moving target, not a specific instant to
    // edit — editing here would just get stomped by the next timeupdate-driven resync.
    if (this.isRecording || this.ufoElement.playbackState === "playing") return
    // With no shape yet, it is the next one's appearance (+ or a recording): a colour picked in an
    // empty recording is not a shape drawn.
    if (!this.ufoElement.sighting.timeline.sourceIds.includes(this.currentSourceId)) return
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
    this.commitShapes(t, [{ sourceId: this.currentSourceId, shape }])
    this.ufoElement.refresh()
  }

  /** `changingPreset` (only ever false from setAppearance's own color/transparency/haloScale
   * inputs, never a preset-button click) skips createShape entirely and just overlays the new
   * appearance fields onto `preserve` as-is — real bug this fixes: createShape ALWAYS rebuilds
   * kind/points fresh from SHAPE_PRESETS[presetId], so a plain color edit on a polygon that had
   * been custom-reshaped (vertices dragged/added/deleted via ShapeHandles, see
   * SightingEditorElement.addVertexAtContextMenu/deleteVertexAtContextMenu/onDragPointerMove's
   * "vertex" case) silently snapped it back to that preset's own default starting geometry every
   * time, discarding the edit. A real preset-button click (changingPreset=true) still rebuilds via
   * createShape as before — that IS meant to replace kind/points — carrying forward angle/title/
   * selected from whatever shape was already there either way, so switching presets can't
   * silently erase an existing rotation or title. */
  private buildAppearanceShape(bounds: ShapeBounds, preserve?: Shape, changingPreset = true): Shape {
    if (preserve && !changingPreset) {
      return {
        ...preserve,
        color: this.currentAppearance.color,
        transparency: this.currentAppearance.transparency,
        haloScale: this.currentAppearance.haloScale,
        blur: this.currentAppearance.blur,
        brightness: this.currentAppearance.brightness
      }
    }
    const shape = createShape(bounds, this.currentAppearance)
    return preserve ? { ...shape, angle: preserve.angle, title: preserve.title, selected: preserve.selected } : shape
  }

  /** Runs everything that depends on {currentSourceId, currentTime}: resyncs the appearance
   * toolbar and drives the canvas-native selection highlight on the nested ufo element. */
  private isGroupOpen(tab: HTMLButtonElement): boolean {
    return tab.getAttribute("aria-expanded") === "true"
  }

  /**
   * Opens one group and closes every other one.
   *
   * Exclusive rather than a free-for-all of independent toggles, and that's the whole point of the
   * strip: eight panels open at once is the 1210px-tall form this replaced, with the render pushed
   * below the fold and the impact of an edit invisible at the moment it's made. One open panel
   * (the tallest, Location, is 180px once Decor is split out of it) keeps the canvas on screen on
   * a laptop and within one scroll of it on a phone. Comparing two groups isn't lost — what's set
   * everywhere else stays readable in the summary under the render, which is why that summary is
   * what makes this restriction affordable.
   */
  private toggleGroup(tab: HTMLButtonElement, open: boolean): void {
    this.cloudEditor?.stopManipulation()
    for (const [index, candidate] of this.groupTabs.entries()) {
      const nowOpen = candidate === tab && open
      candidate.setAttribute("aria-expanded", String(nowOpen))
      this.groupPanels[index].hidden = !nowOpen
    }
    if (open && tab.getAttribute("aria-controls") === "group-decor") {
      const listed = this.decorList.value
      if (listed !== "" && listed !== this.currentDecorId) this.selectDecor(listed)
    }
    if (open && tab.getAttribute("aria-controls") === "group-observer" && this.observerShown !== SightingEditorElement.OBSERVER_PRINCIPAL) this.selectDecor(this.observerShown)
    // What the parts of the Sky group say they can do depends on the place, which another group may just have given; and the part open
    // is built the first time the group opens.
    if (open && tab.getAttribute("aria-controls") === "group-weather") this.syncSkyParts()
    this.placeDecorItem()
    this.syncCanvasMode()
    this.refreshTimelineMarks()
    if (open && tab.getAttribute("aria-controls") === "group-file") {
      void this.loadFileEditor().then(() => {
        this.syncFileEditor(false)
        this.showFileItem(this.fileItemSelect.value)
      }, () => this.showFileNote(this.messages.importError, "error"))
    }
  }

  /**
   * The recording as text, in an editor loaded the first time the File group is opened: a chunk of
   * its own, since CodeMirror is the heaviest thing this component could carry and most authors
   * never leave the form (see SightingFileEditor, and loadBodyEditor for the same arrangement).
   */
  private loadFileEditor(): Promise<SightingFileEditor> {
    this.fileEditorLoading ??= (async () => {
      this.showFileNote(this.messages.fileLoading)
      try {
        const { SightingFileEditor } = await import("./SightingFileEditor.js")
        // What it starts from is the recording as it stood before the first touch, when there was one (see armHistory).
        this.historySnapshot ??= this.fileText()
        this.fileTextApplied = this.historySnapshot
        this.fileEditor = new SightingFileEditor(this.fileEditorHost, this.historySnapshot, text => this.onFileTextEdited(text),
          this.messages.fileEditorLabel, {
            baseline: this.touched ? this.savedFileText : this.fileText(), phrases: this.messages.fileSearchPhrases, caretMoved: path => this.onFileCaret(path)
          })
        return this.fileEditor
      } catch (error) {
        // Not remembered: opening the group again is a second try.
        this.fileEditorLoading = undefined
        throw error
      } finally {
        this.showFileNote(undefined)
      }
    })()
    return this.fileEditorLoading
  }

  /** Whether the text is on show: the only time the text and the picture follow each other, and the only time anything is worked out for it. */
  private fileSyncActive(): boolean {
    return this.fileEditor !== undefined && this.isGroupIdOpen("group-file")
  }

  /** What the File group's caret or selection is in, framed on the picture: a decor object or a shape. */
  private fileFocus?: "decor" | "shape"
  private caretTimer?: ReturnType<typeof setTimeout>
  /** Set while the picture is being told what the text's caret is in, so that it does not tell the text. */
  private followingCaret = false

  /** The author moved the caret in the text: the picture follows, once it has stopped for a moment. */
  private onFileCaret(path: JsonPath): void {
    clearTimeout(this.caretTimer)
    this.caretTimer = setTimeout(() => this.focusFromFile(path), 120)
  }

  private focusFromFile(path: JsonPath): void {
    if (!this.fileSyncActive()) return
    const sighting = this.ufoElement.sighting
    this.followingCaret = true
    try {
      const decor = path[0] === "decor" && typeof path[1] === "number" ? sighting.decor[path[1]] : undefined
      if (decor !== undefined) {
        this.fileFocus = "decor"
        this.selectDecor(decor.id)
        return
      }
      const shape = path[0] === "timeline" && path[1] === "keyframes" && typeof path[2] === "number" && path[3] === "shapes" && typeof path[4] === "number"
        ? sighting.timeline.allKeyframes[path[2]]?.shapes[path[4]] : undefined
      if (shape !== undefined) {
        this.fileFocus = "shape"
        this.selectUnit(shape.sourceId)
        this.syncCanvasMode()
        this.ufoElement.refresh()
        return
      }
      this.fileFocus = undefined
      this.syncCanvasMode()
      this.ufoElement.refresh()
    } finally {
      this.followingCaret = false
    }
  }

  /** What the picture selected is shown in the text, when the text is on show: its lines selected and scrolled into view. */
  private showInFile(path: JsonPath | undefined): void {
    if (this.followingCaret || path === undefined || !this.fileSyncActive()) return
    this.fileEditor!.reveal(path)
  }

  /** Where a body of the interpretation is in the text, read off the text itself (the model keeps it apart from the recording's own). */
  private bodyPath(id: string): JsonPath | undefined {
    try {
      const bodies = (JSON.parse(this.fileEditor!.text) as { interpretation?: { bodies?: Array<{ id?: string }> } }).interpretation?.bodies ?? []
      const index = bodies.findIndex(body => body.id === id)
      return index >= 0 ? ["interpretation", "bodies", index] : undefined
    } catch {
      return undefined
    }
  }

  /** Where a shape first stands in the text: the first keyframe that has it. */
  private shapePath(sourceId: string): JsonPath | undefined {
    const keyframes = this.ufoElement.sighting.timeline.allKeyframes
    for (const [k, keyframe] of keyframes.entries()) {
      const j = keyframe.shapes.findIndex(state => state.sourceId === sourceId)
      if (j >= 0) return ["timeline", "keyframes", k, "shapes", j]
    }
    return undefined
  }

  private showFileNote(text: string | undefined, kind: "info" | "error" = "info"): void {
    MessageStyle.show(this.fileNote, text, kind)
  }

  /** What the file would be if saved now — the same text Export writes. */
  private fileText(): string {
    return JSON.stringify(this.sightingData, null, 2)
  }

  /**
   * Form to text. Held back while the author is typing in the text (the form is then following the
   * text, and rewriting it under their caret would undo what they are doing), and spaced out
   * otherwise: every frame of playback ends here, and a recording is hundreds of lines.
   */
  private scheduleFileSync(): void {
    if (this.fileEditor === undefined || this.fileSyncTimer !== undefined || !this.isGroupIdOpen("group-file")) return
    this.fileSyncTimer = setTimeout(() => {
      this.fileSyncTimer = undefined
      this.syncFileEditor()
    }, 250)
  }

  /** `show`: whether to show where the text changed — not when it is being brought up to date as it opens, or respelled after the author's typing, which are no edit of the picture's or the form's. */
  private syncFileEditor(show = true): void {
    const editor = this.fileEditor
    if (editor === undefined || !this.isGroupIdOpen("group-file") || editor.focused) return
    // After an undo or a redo the text holds what the history gave back, and the form is what that text made: rewriting
    // the text in the form's spelling would be a new step in the history, and end the redo.
    if (this.historyAnswering) return
    // A text left broken is the author's draft, not stale: the form has nothing to say about it.
    try {
      JSON.parse(editor.text)
    } catch {
      return
    }
    editor.replaceText(this.fileText(), show)
    this.fileTextApplied = editor.text
  }

  /** Text to form: a text that parses is the recording, a text that does not is left alone (the
   * editor marks the line) and the form keeps the last recording that was valid. */
  private onFileTextEdited(text: string): void {
    // What was typed in the text is already a step of the text editor's own history: the buttons say so now,
    // not only when the form is next touched (which is when they used to be told, so Undo stayed grey).
    this.syncHistoryButtons()
    clearTimeout(this.fileApplyTimer)
    this.fileApplyTimer = setTimeout(() => this.applyFileText(text), 500)
  }

  /** `history`: the text is one an undo or a redo gave back, which is no edit of the author's to ask about (see stepHistory). */
  private applyFileText(text: string, history = false): void {
    this.fileApplyTimer = undefined
    let json: unknown
    try {
      json = JSON.parse(text)
    } catch {
      return
    }
    if (typeof json !== "object" || json === null || Array.isArray(json)) return
    if (JSON.stringify(json) === JSON.stringify(this.sightingData)) return
    const playhead = this.ufoElement.currentTime
    // The weather is the author's edit when the TEXT's weather is not what the text said the last time it was in step with the
    // form: compared with the form's own, it differed for reasons that were not theirs (a lookup answered while they typed,
    // a figure the form spells another way), and each of those asked what they meant by an edit of something else.
    const weatherEdited = !history && this.fileTextApplied !== undefined
      && JSON.stringify((json as SightingRecordingJson).weatherTrack) !== JSON.stringify(SightingEditorElement.weatherOf(this.fileTextApplied))
    const previousWeather = { track: this.sightingData.weatherTrack, source: this.sightingData.weatherSource }
    // The text edited is not a recording loaded: what the recording was when it was loaded or exported stays what the
    // changes are changed from, and the author has done something.
    this.applyingFileText = true
    try {
      this.sightingData = json as SightingRecordingJson
      this.touched = true
      this.ufoElement.currentTime = playhead
      // A weather the author wrote in the text, where it is read dynamically from a record: that is theirs to say they mean (see
      // askAboutWeather) — the lookup must not give the record's back in its place, which is what happened to a cloud cover
      // edited in the text a moment after it was applied. Where no record owns it, it is theirs without asking.
      if (weatherEdited && !this.restoringWeather && this.weatherFromRecords) {
        const source = this.ufoElement.sighting.weatherSource
        if (source === undefined) {
          this.weatherFromRecords = false
          this.cancelWeatherLookup()
          this.syncWeatherSourceState()
        } else if (WEATHER_SOURCES.some(known => known.id === source.id)) {
          this.askAboutWeather(previousWeather, source.name ?? source.id)
        }
      }
      this.showFileNote(undefined)
      // The history already holds this text (it is what typing in it, or an undo, made): not a change to write in.
      this.historySnapshot = this.fileText()
    } catch {
      this.showFileNote(this.messages.importErrorMalformed, "error")
      this.fileTextApplied = text
    } finally {
      this.applyingFileText = false
    }
  }

  /** What the text last in step with the recording said, to tell what the author changed in it. */
  private fileTextApplied?: string

  private static weatherOf(text: string): unknown {
    try {
      return (JSON.parse(text) as SightingRecordingJson).weatherTrack
    } catch {
      return undefined
    }
  }

  /** What the weather was before an edit of the text that touched a record's, while the author has not said what they mean by it. */
  private pendingWeatherEdit?: { track: SightingRecordingJson["weatherTrack"], source: SightingRecordingJson["weatherSource"] }
  private restoringWeather = false

  /**
   * The text was edited where the weather is read dynamically from a record: said, so that the author knows what they did, not
   * assumed either way. The edit stands meanwhile, and no lookup runs over it. Not a dialog (see the editor's rule on native ones,
   * which return false in a pane): a line above the text with its two answers, which the text goes on being edited under.
   */
  private askAboutWeather(previous: NonNullable<typeof this.pendingWeatherEdit>, source: string): void {
    this.cancelWeatherLookup()
    this.pendingWeatherEdit = previous
    this.shadow.getElementById("file-ask-text")!.textContent = this.messages.weatherEditedAsk.replaceAll("{source}", source)
    this.shadow.getElementById("file-ask-stop")!.textContent = this.messages.weatherEditedStop
    this.shadow.getElementById("file-ask-keep")!.textContent = this.messages.weatherEditedKeep
    // As the share dialog is opened (see SightingElement.share): where there is no modal, it is shown all the same.
    if (typeof this.fileAsk.showModal === "function") this.fileAsk.showModal()
    else this.fileAsk.setAttribute("open", "")
  }

  private closeFileAsk(): void {
    if (typeof this.fileAsk.close === "function") this.fileAsk.close()
    else this.fileAsk.removeAttribute("open")
  }

  /** The author means it: the weather is theirs, no longer read from the record. */
  private stopReadingWeather(): void {
    this.pendingWeatherEdit = undefined
    this.closeFileAsk()
    this.weatherFromRecords = false
    this.cancelWeatherLookup()
    this.ufoElement.sighting.weatherSource = undefined
    this.syncWeatherSourceState()
    this.ufoElement.refresh()
    this.syncFileEditor(false)
  }

  /** The record keeps the weather: what was edited goes back to what was read. */
  private keepReadingWeather(): void {
    const previous = this.pendingWeatherEdit
    this.pendingWeatherEdit = undefined
    this.closeFileAsk()
    if (previous === undefined) return
    this.restoringWeather = true
    try {
      this.applyFileText(JSON.stringify({ ...this.sightingData, weatherTrack: previous.track, weatherSource: previous.source }))
    } finally {
      this.restoringWeather = false
    }
    this.syncFileEditor(false)
  }

  /** Set while the text the author edited is made the recording, which is not a recording loaded (see markClean). */
  private applyingFileText = false

  /** Leaving the text: what was typed is applied at once, and the text takes the form's own
   * spelling of it (key order, what the model drops), so that it never disagrees with Export. */
  private leaveFileEditor(): void {
    const editor = this.fileEditor
    if (editor === undefined) return
    if (this.fileApplyTimer !== undefined) {
      clearTimeout(this.fileApplyTimer)
      this.applyFileText(editor.text)
    }
    setTimeout(() => this.syncFileEditor(false), 0)
  }

  /**
   * The marks under the playback bar: the keyframes of what the open group edits — the selected
   * shapes, the observer, the weather, the sound — or of all of them when the group edits none of
   * these, and the named moments always.
   *
   * The open group's own and not every track's: an author in the Weather group going back to change
   * a keyframe wants the weather's, and a bar ticked for every shape's every keyframe would bury them.
   */
  private refreshTimelineMarks(): void {
    const sighting = this.ufoElement.sighting
    const keyframes = (label: string, times: Iterable<number>): TimelineMark[] =>
      [...times].map(t => ({ t, kind: "keyframe" as const, label: `${this.messages.keyframeMark} (${label})` }))
    const shapes = (selectedOnly: boolean) => keyframes(this.messages.shapesTrack, sighting.timeline.allKeyframes
      .filter(keyframe => !selectedOnly || keyframe.shapes.some(state => this.selectedSourceIds.has(state.sourceId)))
      .map(keyframe => keyframe.t))
    const observer = () => keyframes(this.messages.observerTrack, sighting.observerTrack.allKeyframes.map(keyframe => keyframe.t))
    const weather = () => keyframes(this.messages.weatherTrack, sighting.weatherTrack.allKeyframes.map(keyframe => keyframe.t))
    const sound = () => keyframes(this.messages.soundTrack, sighting.soundTrack.allKeyframes.map(keyframe => keyframe.t))
    const marks: TimelineMark[] =
      this.isGroupIdOpen("group-shape") ? shapes(true)
      : this.isGroupIdOpen("group-observer") || this.isGroupIdOpen("group-location") ? observer()
      : this.isGroupIdOpen("group-weather") ? weather()
      : this.isGroupIdOpen("group-sound") ? sound()
      : [...shapes(false), ...observer(), ...weather(), ...sound()]
    for (const milestone of sighting.milestones) {
      marks.push({ t: milestone.t, kind: "milestone", label: this.said.read(milestone.label) ?? "" })
    }
    this.timelineMarks.show(marks, this.ufoElement.seekableDuration)
  }

  /**
   * Moves the playhead to `seconds` since the beginning of the recording: where an interview's passage says the observation was at that moment.
   * The player counts in milliseconds.
   */
  seekTo(seconds: number): void {
    this.goToMark(seconds * 1000)
  }

  /** Brings the render into view, for a caller that has just moved the playhead from elsewhere on the page (an interview's link to a moment). */
  showRender(): void {
    this.sceneElement.scrollIntoView?.({ block: "center", behavior: "smooth" })
  }

  private goToMark(t: number | undefined): void {
    if (t === undefined) return
    this.ufoElement.currentTime = t
    this.syncPlaybackControls()
  }

  private isGroupIdOpen(id: string): boolean {
    const tab = this.groupTabs.find(candidate => candidate.getAttribute("aria-controls") === id)
    return tab !== undefined && this.isGroupOpen(tab)
  }

  /**
   * What the canvas edits: what the open group describes.
   *
   * The canvas is one surface under eight groups of fields, and a drag on it has to mean one
   * thing. It means the picture while the Pictures group is open and a picture is selected (turn
   * it, change its field, name its landmarks — see beginReferenceDrag), the phenomenon's shapes
   * while the Phenomenon group is open (their handles, their moves), and otherwise the scene
   * itself: a click on a shape or a decor object still goes to its panel, since that is how a
   * thing on the canvas is reached, but moving it is done from that panel, and the rest of the
   * canvas is the landscape to turn the observer with. Before this, every mode was on at once and
   * the picture, once handed the canvas, kept it.
   */
  private canvasMode(): CanvasMode {
    if (this.isGroupIdOpen("group-reference") && this.currentReferenceId !== undefined) return "picture"
    // The File group has no panel of its own to edit what it shows, but it follows the text's caret to the picture
    // (see focusFromFile) and the picture's selection to the text (see showInFile): what the caret is in is framed
    // there as in its own group, and carried the same way.
    if (this.isGroupIdOpen("group-file")) {
      if (this.fileFocus === "decor" && this.editableDecor() !== undefined) return "decor"
      if (this.fileFocus === "shape" && this.selectedSourceIds.size > 0) return "shape"
      return "scene"
    }
    // The Bodies part of the group moves the bodies (see beginBodyDrag); the Shapes part the shapes.
    if (this.isGroupIdOpen("group-shape") && this.shadow.getElementById("shape-bodies")?.hidden === false) return "body"
    // The Sky group edits fields only: nothing on the picture is moved from there.
    if (this.isGroupIdOpen("group-weather") && (this.shadow.getElementById("sky-launches")?.hidden === false || this.shadow.getElementById("sky-beams")?.hidden === false)) return "scene"
    if (this.isGroupIdOpen("group-shape")) return "shape"
    // The Environment group frames the object it has selected, as the Bodies part does a body.
    if (this.isGroupIdOpen("group-decor") && this.editableDecor() !== undefined) return "decor"
    return "scene"
  }

  private syncCanvasMode(): void {
    const mode = this.canvasMode()
    const pictureNow = mode === "picture"
    const pictureBefore = this.lastCanvasMode === "picture"
    const changed = mode !== this.lastCanvasMode
    this.lastCanvasMode = mode
    // What is selected on the canvas is what the canvas edits: the shapes' handles in their own
    // group, the picture's frame and landmarks in its own, nothing elsewhere.
    this.ufoElement.selectionShown = mode === "shape"
    this.ufoElement.overlayPainter = pictureNow ? this.paintPictureOverlay : mode === "body" ? this.paintBodyOverlay : mode === "decor" ? this.paintDecorOverlay : undefined
    // Only what is painted over the picture changes with the mode, not the world in it (see UfoElement.repaintOverlay).
    if (changed) this.ufoElement.repaintOverlay()
    // Click-to-play is off for the whole editor already (see the constructor): the canvas is for
    // editing here, whichever mode it is in.
    if (pictureNow !== pictureBefore) this.setCanvasCursor(pictureNow ? "pan" : this.hoverCursor)
    if (!pictureNow && (this.armingLandmark || this.pendingLandmark)) this.disarmLandmark()
    const reference = this.currentReference()
    if (reference) this.syncReferenceStatus(reference)
    this.syncStreetSearchAvailability()
    this.syncBodiesShown()
  }

  /**
   * Draws the observer's bodies, with the shapes beside them as outlines — the player's comparison
   * (see SceneElement.compareAccount), so what the observer drew stays in view and the body is
   * read against it — everywhere but in the Shapes part of the Phenomenon group. There the shapes
   * are drawn in full and alone: their colour, halo and brilliance are what that part edits, and a
   * body over them would hide the very thing being edited (see SceneElement.accountInTheRound).
   * Drawn only in the Bodies part at first, an airliner vanished as soon as another group was
   * opened, which read as an edit not kept.
   * Re-read after every edit of a body, and after a recording is loaded, since the scene holds the
   * interpretation it was last handed.
   */
  private syncBodiesShown(): void {
    // A reading of an account has no shape of its own to protect: its bodies are all there is to see.
    const editingShapes = this.isGroupIdOpen("group-shape") && this.shadow.getElementById("shape-shapes")?.hidden === false
    const shown = !editingShapes || this.isReading
    const interpretation = shown ? this.ufoElement.sighting.interpretation : undefined
    this.sceneElement.compareAccount = interpretation !== undefined
    if (this.sceneElement.interpretation !== interpretation) this.sceneElement.interpretation = interpretation
    // The selector says what is shown, and a reading has no shapes to choose between.
    this.accountViewSelect.value = interpretation !== undefined ? "bodies" : "shapes"
    this.syncSkyParts()
    this.shadow.getElementById("account-view-row")!.hidden = this.isReading
  }

  /**
   * The parts of the Sky group, read again for the recording as it is now: the one open is built the first time it is shown (a chunk of its
   * own each), and what it shows refreshed.
   */
  private syncSkyParts(): void {
    if (!this.isGroupIdOpen("group-weather")) return
    if (this.shadow.getElementById("sky-beams")?.hidden === false) void this.loadBeamEditor().then(editor => editor.refresh())
    if (this.shadow.getElementById("sky-launches")?.hidden === false) void this.loadLaunchEditor().then(editor => editor.refresh())
  }

  /**
   * Draws and edits the account as its shapes (the angles the observer drew) or as its bodies (what they said those were,
   * in 3D): opens the part of the Phenomenon group that does, and the render follows it.
   */
  private chooseAccountView(bodies: boolean): void {
    const group = this.groupTabs.find(candidate => candidate.getAttribute("aria-controls") === "group-shape")
    if (group) this.toggleGroup(group, true)
    const part = this.subgroupTabs.find(candidate => candidate.getAttribute("aria-controls") === (bodies ? "shape-bodies" : "shape-shapes"))
    if (part) this.openSubgroup(part)
  }

  /** One part of a group open at a time, among the handles of the same strip — the groups' own
   * rule (see toggleGroup), for the same reason, one level down. Never closes the last one: a
   * part's handle is a place to go, not a switch, since a group with every part folded away
   * would be an empty frame. */
  private openSubgroup(tab: HTMLButtonElement): void {
    this.cloudEditor?.stopManipulation()
    const strip = tab.parentElement!
    for (const candidate of this.subgroupTabs) {
      if (candidate.parentElement !== strip) continue
      const open = candidate === tab
      candidate.setAttribute("aria-expanded", String(open))
      this.shadow.getElementById(candidate.getAttribute("aria-controls")!)!.hidden = !open
    }
    // The shapes it offers to stand for may have been renamed, added or deleted meanwhile.
    if (tab.getAttribute("aria-controls") === "shape-bodies") void this.loadBodyEditor().then(editor => editor.sync())
    if (tab.getAttribute("aria-controls") === "sky-launches") void this.loadLaunchEditor().then(editor => editor.sync())
    if (tab.getAttribute("aria-controls") === "sky-beams") void this.loadBeamEditor().then(editor => editor.sync())
    // What the canvas edits follows the part (see canvasMode), and with it whether bodies are drawn.
    this.syncCanvasMode()
  }

  /** Opens the part of a group a control stands in, when it stands in one — so that a summary chip
   * for the wind lands on a visible field rather than on one folded under another part's handle. */
  private revealSubgroupOf(control: Element): void {
    const part = control.closest(".subgroup-panel")
    const tab = part && this.subgroupTabs.find(candidate => candidate.getAttribute("aria-controls") === part.id)
    if (tab) this.openSubgroup(tab)
  }

  /** The panel a group tab opens, read off the tab itself ("group-shape" → "shape") rather than
   * kept in a list of its own. A hand-kept list fell behind when the Pictures tab came in before
   * Phenomenon: every index from there on named the wrong panel, and the Phenomenon's unanswered
   * questions were counted on Pictures, which asks for nothing. Used to mark a tab holding an
   * unanswered question — see QUESTION_FIELDS. */
  private panelOf(tab: HTMLButtonElement): string {
    return (tab.getAttribute("aria-controls") ?? "").replace(/^group-/, "")
  }

  private panelIndex(panel: string): number {
    return this.groupTabs.findIndex(tab => this.panelOf(tab) === panel)
  }

  /**
   * Rebuilds the strip of what this recording states, under the render.
   *
   * Read off the Sighting through SightingSummary, the same class `<rr0-sighting>` shows the
   * same recording with. An earlier version of this derived itself from the editor's own form —
   * cheaper, and translated for free, since the markup already pairs a label with a value and a
   * unit — but a player has no form, so showing the summary there meant either a second
   * implementation free to disagree with this one, or this one moving to the model. It moved.
   *
   * What it costs, and it is worth writing down: the summary now states only what the FILE holds.
   * The sampling rate is gone from it, and so is the "from weather records" tickbox — the first
   * is a property of the act of recording rather than of the sighting, and the second is said
   * better by the marks on the nine values that record supplied.
   */
  private refreshParamSummary(): void {
    const entries = this.paramSummaryBuilder.entriesFor(this.ufoElement.sighting, this.ufoElement.currentTime, {
      decorId: this.currentDecorId,
      // A chip naming a decor object opens that object here, so the list of them is worth its
      // room; under a player it would be a wall of chips leading nowhere. See SummaryContext.
      decorPicker: true,
      // The shapes and the bodies are what the recording is about: each chip is a way into its own part.
      phenomena: true,
      // The one thing the file can't tell the summary: a pose's elevationM is height above the
      // GROUND, and this toolbar's "Altitude" field is height above sea level. See SummaryContext.
      // Zero rather than undefined when no terrain has resolved yet, because that is exactly what
      // the field itself then shows (see syncElevationField's own `ground ?? 0`) — a chip is a way
      // back to a field, so it has to say what that field says.
      groundElevationM: this.groundElevationM ?? 0,
      roadGradeDeg: this.sceneElement.roadGradeDeg
    })
    // "Altitude 220 m" and "Altitude 0 m" side by side are the observer's own height above the sea
    // and a building's — two different assertions under one word, which is fine inside a panel
    // that names its subject and misleading on a strip that doesn't.
    //
    // Containment is what tells them apart. A group describing a sub-element — the observer, one
    // decor object — puts its chips inside a chip of its own bearing its name, so a Heading in a
    // box saying Environment needs nothing further to say which heading it is. An earlier version
    // prefixed the label instead ("Environment · Heading") whenever one was shared across groups;
    // every such collision was with one of these two, so the box replaced that mechanism outright
    // rather than joining it. A collision between two FLAT groups would need answering again, and
    // there is currently no pair of them that can produce one.
    const chips = entries.map(entry => ({ ...entry, panel: this.summaryPanelIndex(entry.group) }))
    const signature = chips.map(chip => `${chip.field}=${chip.label}=${chip.value}${chip.unit}${chip.full ?? ""}${chip.fromSource ? "*" : ""}`).join("|")
    if (signature === this.paramSummarySignature) {
      return
    }
    this.paramSummarySignature = signature
    this.paramChips = chips
    this.renderParamSummary()
    // What the recording says has changed, so what an assessor makes of it has too. Fired and not
    // awaited: an assessment arrives after the strip rather than holding it up, and re-renders it
    // when it does.
    void this.runAssessments()
  }

  /** The chips of what the recording states, as of the last change — the assessment's own arrive
   * separately and later (see runAssessments), and both are drawn by renderParamSummary. */
  private paramChips: (SummaryEntry & { panel: number })[] = []

  /** Draws the strip from what is currently known: the recording's own chips, then whatever the
   * assessors have most recently concluded. */
  private renderParamSummary(): void {
    const nested = SightingEditorElement.NESTED_GROUPS
    // The summary emits its groups in one run each (see SightingSummary.entriesFor's fixed call
    // order), so a nest opens when a run of one starts and closes when it ends — no sorting, and
    // no second pass to gather scattered members. The assessment's chips come last, which is both
    // its own run and the right place to read them: what is made of the recording, after it.
    const strip: HTMLElement[] = []
    let openNest: { group: SummaryGroup, element: HTMLElement } | undefined
    for (const chip of [...this.paramChips, ...this.assessmentChips]) {
      if (openNest && openNest.group !== chip.group) {
        openNest = undefined
      }
      if (nested.includes(chip.group) && !openNest) {
        const box = document.createElement("span")
        box.className = "param-nest"
        box.dataset.group = chip.group
        const name = document.createElement("span")
        name.className = "param-nest-label"
        // Named by its GROUP, never by where its chips lead — the two are different things, and an
        // assessment chip that sends a reader to the Observer panel still belongs in a box saying
        // Assessment. An assessment is not a group of fields, so its name is its own message.
        name.textContent = chip.group === "assessment"
          ? this.messages.assessmentGroup
          : chip.group === "summary" ? this.messages.summaryGroup
          // The tab's LABEL, not the whole button: a tab also carries its count of unanswered
          // questions (see badgeOn), and reading the button whole named a nest "Observer3".
          : SightingEditorElement.tabLabel(this.groupTabs[this.summaryPanelIndex(chip.group)])
        box.append(name)
        openNest = { group: chip.group, element: box }
        strip.push(box)
      }
      const button = this.paramChip(chip)
      if (openNest) {
        openNest.element.append(button)
      } else {
        strip.push(button)
      }
    }
    this.paramSummary.replaceChildren(...strip)
    this.syncDescription()
  }

  /** The whole description on show in place of the chips, while one has been opened from its chip. */
  private openDescription: string | undefined

  private syncDescription(): void {
    if (this.openDescription !== undefined && !this.paramChips.some(chip => chip.full === this.openDescription)) {
      this.openDescription = undefined
    }
    SummaryDescription.sync(this.paramSummary, this.openDescription, this.messages.summaryDescription,
      this.messages.closeDescription, () => {
        this.openDescription = undefined
        this.syncDescription()
      })
  }

  /** Which summary groups describe a sub-element rather than the observation itself, and so read
   * as a chip holding chips: the observer who gave the account, and whichever decor object is
   * being worked on (or, with none selected, the list of them). */
  private static readonly NESTED_GROUPS: SummaryGroup[] = ["summary", "observation", "observer", "location", "temporal", "weather", "sound", "decor", "phenomenon", "assessment"]

  /** The tab a summary group leads to: by position for the groups that predate the Pictures tab, and by the panel it controls for the Phenomenon. */
  private summaryPanelIndex(group: SummaryGroup): number {
    // By the panel's own name, not by a place in a list: the tabs are reordered as the editor is.
    return this.panelIndex(group === "phenomenon" ? "shape" : group)
  }

  /**
   * Which fields would answer each of the coverage assessor's questions, and which panel holds
   * them — what an unanswered one marks, so that a need shows where it can be met.
   *
   * Two of the ten have no field to name: an apparent size and a place in the sky are DRAWN, on
   * the canvas, from the shape's own handles. Those mark their panel's tab alone, which is enough
   * to send a reader to the right place — and every question marks its tab anyway, so a need is
   * visible without opening all eight panels to hunt for it.
   */
  private static readonly QUESTION_FIELDS: Record<string, { panel: string, fields: string[] }> = {
    when: { panel: "temporal", fields: ["obs-time", "obs-time-native"] },
    where: { panel: "location", fields: ["lat", "lng"] },
    facing: { panel: "location", fields: ["heading"] },
    "apparent-size": { panel: "shape", fields: [] },
    "sky-position": { panel: "shape", fields: [] },
    "how-long": { panel: "temporal", fields: ["durationSeconds", "obs-end-time", "obs-end-time-native"] },
    appearance: { panel: "shape", fields: ["shapeTitle", "color"] },
    movement: { panel: "shape", fields: [] },
    sound: { panel: "sound", fields: ["soundKind"] },
    conditions: { panel: "weather", fields: ["cloudCover"] }
  }

  /** Chips for what the assessors made of the recording, kept between renders because they arrive
   * after it — see runAssessments. */
  private assessmentChips: (SummaryEntry & { panel: number })[] = []

  /** Drops a result that resolved after the recording it described was already replaced. */
  private assessmentToken = 0

  /**
   * Asks every registered assessor what it makes of the recording, and puts each answer on the
   * strip inside the Assessment nest.
   *
   * The reading itself is shared with the player (see SightingAssessments) — an assessment is a
   * fact about the observation, so it says the same thing in both, and only what a chip DOES
   * differs: here it leads to the panel the reading is about, and the questions nothing answered
   * mark the fields that would answer them.
   */
  private async runAssessments(): Promise<void> {
    const token = ++this.assessmentToken
    const reading = await new SightingAssessments(this.messages).read(this.ufoElement.sighting)
    // Nothing to draw into once the editor has left the page (or the page itself is gone, as it is when
    // a test file ends while a reading is still under way).
    if (token !== this.assessmentToken || !this.isConnected) return
    this.assessmentChips = reading.entries.map(entry => ({
      ...entry,
      // The group this reading is about, so the chip leads somewhere: a figure a reader cannot act
      // on is a figure they stop reading. -1 for a reading about the recording as a whole.
      panel: this.panelIndex(entry.about ?? "")
    }))
    this.markUnansweredQuestions(reading.unanswered)
    this.renderParamSummary()
  }

  /** What a tab is CALLED, without the count it may also be carrying. */
  private static tabLabel(tab: HTMLElement): string {
    return (tab.querySelector<HTMLElement>("span:not(.tab-badge)") ?? tab).textContent!.trim()
  }

  /** The count of what a panel still has no answer for, on its own tab — created on first use, so
   * the template stays one line per tab and nothing has to be kept in step with it. */
  private static badgeOn(tab: HTMLElement): HTMLElement {
    const existing = tab.querySelector<HTMLElement>(".tab-badge")
    if (existing) return existing
    const badge = document.createElement("span")
    badge.className = "tab-badge"
    badge.hidden = true
    tab.append(badge)
    return badge
  }

  /** The last assessment's unanswered questions, kept so the marks can be laid again when the one
   * REQUIRED field changes without the assessment having re-run — see updateDurationValidity. */
  private unansweredQuestions = new Set<string>()

  /**
   * Marks the fields that would answer a question nothing in the recording does, and counts the
   * marks on each panel's own tab.
   *
   * Not `invalid`: a gap is not a mistake, and a red border would say the author typed something
   * wrong where in fact the observer said nothing.
   *
   * The count is the number of MARKS, not of unanswered questions, and the order below follows from
   * that: mark first, count after. Counting questions instead put badges on panels where a reader
   * would find nothing marked at all — a question answered by drawing, or one whose field already
   * holds an accepted default, has nothing to point at. The complete tally lives on the coverage
   * figure in the strip, which is where a number without a place on screen belongs.
   */
  private markUnansweredQuestions(unanswered: Set<string> = this.unansweredQuestions): void {
    this.unansweredQuestions = unanswered
    // Which fields to dash, decided before anything is counted — because the count IS the number of
    // marks, and computing it from the questions instead produced badges pointing at panels where
    // nothing was marked at all.
    const dashed = new Set<string>()
    for (const id of unanswered) {
      const question = SightingEditorElement.QUESTION_FIELDS[id]
      if (!question) continue
      // One gap, one mark. A question answerable through more than one field — a length stated as a
      // duration or as an end time — says its absence once, in the strongest hand it has.
      if (question.fields.some(field => this.shadow.getElementById(field)?.classList.contains("missing-required"))) {
        continue
      }
      for (const id of question.fields) {
        const field = this.shadow.getElementById(id) as HTMLInputElement | HTMLSelectElement | null
        // Hidden: a moment is typed either as a native picker or as EDTF text and only one of the
        // pair is on screen. Filled: "0" cloud cover and "none" for sound are accepted answers, and
        // outlining a filled field tells a reader to fill in what is filled.
        if (field && !field.hidden && field.value === "") dashed.add(id)
      }
    }
    for (const [id, question] of Object.entries(SightingEditorElement.QUESTION_FIELDS)) {
      void question
      for (const fieldId of SightingEditorElement.QUESTION_FIELDS[id].fields) {
        const field = this.shadow.getElementById(fieldId)
        if (!field) continue
        const wanted = dashed.has(fieldId) && !field.classList.contains("missing-required")
        field.classList.toggle("wanted", wanted)
        if (wanted || field.title === this.messages.questionUnanswered) {
          field.title = wanted ? this.messages.questionUnanswered : ""
        }
      }
    }
    // The count is exactly what a reader will find marked once the panel is open — nothing more,
    // which is what makes it worth trusting. A question answered by DRAWING (an apparent size, a
    // place in the sky) or already carrying an accepted default has no mark, so it is not counted
    // here; the coverage figure on the strip is where the complete tally lives.
    const markedPerPanel = new Map<string, number>()
    let requiredPanel: string | undefined
    for (const [id, question] of Object.entries(SightingEditorElement.QUESTION_FIELDS)) {
      void id
      for (const fieldId of question.fields) {
        const field = this.shadow.getElementById(fieldId)
        if (!field) continue
        const required = field.classList.contains("missing-required")
        if (!required && !field.classList.contains("wanted")) continue
        if (required) requiredPanel = question.panel
        markedPerPanel.set(question.panel, (markedPerPanel.get(question.panel) ?? 0) + 1)
      }
    }
    for (const tab of this.groupTabs) {
      const panel = this.panelOf(tab)
      const count = markedPerPanel.get(panel) ?? 0
      const required = panel === requiredPanel
      const badge = SightingEditorElement.badgeOn(tab)
      badge.hidden = count === 0
      badge.textContent = String(count)
      badge.classList.toggle("optional", !required)
      tab.title = count === 0
        ? ""
        : required ? this.messages.durationRequired : this.messages.questionsUnanswered.replace("{count}", String(count))
    }
  }

  private paramChip(chip: SummaryEntry & { panel: number }): HTMLButtonElement {
    const button = document.createElement("button")
    button.type = "button"
    button.className = chip.fromSource ? "param-chip from-source" : "param-chip"
    button.dataset.panel = String(chip.panel)
    button.dataset.field = chip.field
    const label = document.createElement("span")
    label.className = "param-chip-label"
    label.textContent = `${chip.label} `
    button.append(label)
    if (chip.color !== undefined) {
      const swatch = document.createElement("span")
      swatch.className = "param-chip-swatch"
      swatch.style.background = chip.color
      button.append(swatch)
    }
    const value = document.createElement("span")
    value.className = "param-chip-value"
    value.textContent = chip.unit === "" ? chip.value : `${chip.value} ${chip.unit}`
    button.append(value)
    return button
  }

  /** A chip is a way back to its own field: opens the group holding it, then puts the caret in it,
   * pre-selected — the summary is where you notice a value is wrong, so the click that says so
   * should leave you able to type the right one. */
  private onParamSummaryClick(event: Event): void {
    const chip = (event.target as HTMLElement).closest<HTMLElement>(".param-chip")
    if (chip === undefined || chip === null) {
      return
    }
    // The description's chip opens the whole text rather than a field.
    if (chip.dataset.field === "description") {
      this.openDescription = this.paramChips.find(candidate => candidate.field === "description")?.full
      this.syncDescription()
      return
    }
    // An assessment chip names no panel: it is what was made OF the fields, not one of them, so
    // there is nowhere for a click to go. It stays a chip for the look of the strip and does
    // nothing (see the cursor rule its nest carries).
    const panelIndex = Number(chip.dataset.panel)
    if (panelIndex < 0) {
      return
    }
    const panel = this.groupPanels[panelIndex]
    this.toggleGroup(this.groupTabs[panelIndex], true)
    // A decor object the summary listed rather than one of its fields (see
    // SightingSummary.addDecor): there is no control to focus, so the click selects that object,
    // which is what makes its own fields appear in the panel just opened.
    const field = chip.dataset.field!
    // A shape or a body the summary listed: the click opens its own part of the Phenomenon panel and
    // selects it, which is what makes its own fields appear there.
    if (field.startsWith("shape:")) {
      this.selectedSourceIds = new Set([field.slice("shape:".length)])
      this.revealShapePanel()
      this.ufoElement.refresh()
      return
    }
    if (field.startsWith("body:")) {
      const tab = this.subgroupTabs.find(candidate => candidate.getAttribute("aria-controls") === "shape-bodies")
      if (tab) this.openSubgroup(tab)
      void this.loadBodyEditor().then(editor => editor.show(field.slice("body:".length)))
      return
    }
    if (field.startsWith("decor:")) {
      this.currentDecorId = field.slice("decor:".length)
      this.refreshDecorList()
      this.decorList.focus()
      return
    }
    // Looked up by id on the shadow root rather than through a selector: the field ids come from
    // the model, and building a selector out of them means CSS.escape, which isn't there in every
    // environment this component is exercised in.
    const control = this.shadow.getElementById(field)
    if (control === null || !panel.contains(control)) {
      return
    }
    // Focus is what actually has to happen, and it brings the field into view by itself; centring
    // it is a nicety, called as one so that an environment without scrollIntoView still lands the
    // caret rather than throwing on the way there.
    this.revealSubgroupOf(control)
    control.focus()
    if (control instanceof HTMLInputElement && control.type !== "checkbox" && control.type !== "color" && control.type !== "range") {
      control.select()
    }
    control.scrollIntoView?.({ block: "center" })
  }

  private onSelectionOrTimeChanged(): void {
    if (this.shadow.getElementById("shape-bodies")?.hidden === false) this.bodyEditor?.syncKeyframe()
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
    this.syncDecorBaseFromTimeline()
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
    this.refreshBlurDistanceBound()
    this.refreshSkyCandidates()
    // The date decides which devices are offered — see refreshInstrumentOptions.
    this.refreshInstrumentOptions()
    this.refreshFilterOptions()
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
      selectedKnownCount === 0
    // Last, so it reads the fields every sync above has just rewritten rather than their previous
    // values. This is the one place worth hanging it from: every edit path in this toolbar ends in
    // a refresh() that comes back through here, including the ones that write fields the author
    // never touched (a place lookup filling latitude/longitude, a weather record filling nine
    // more) — which are exactly the values the summary exists to surface.
    this.refreshParamSummary()
  }

  /** Until a shape has been added there is nothing for these fields to describe: only the "add shape"
   * button stands, the rest (name, appearance, size, record) appears with the first shape. */
  private updateShapeToolbarVisibility(): void {
    const none = this.ufoElement.sighting.timeline.sourceIds.length === 0
    const row = this.shadow.getElementById("shape-row")
    if (row) ElementList.showPresence(row, this.shadow.getElementById("shape-item") ?? undefined, !none)
  }

  /** When more than one shape is selected, the appearance fields (Name/Color/Transparency/Halo/
   * source dropdown/preset buttons) only make sense for a single shape — rather than showing one
   * arbitrary member's values as if they applied to the whole selection, they're disabled with a
   * title explaining why, the same disabled/title-explain convention the context menu already
   * uses. syncAppearanceFromTimeline() itself early-returns in this state instead of writing
   * possibly-misleading values into disabled fields. */
  private updateAppearanceFieldsDisabledState(): void {
    this.updateShapeToolbarVisibility()
    const multiple = this.selectedSourceIds.size > 1
    const title = multiple ? this.messages.multipleShapesSelected : ""
    for (const input of [
      this.shapeTitleInput,
      this.colorInput,
      this.transparencyInput,
      this.haloScaleInput,
      this.blurInput,
      this.brightnessInput,
      this.apparentWidthInput,
      this.realWidthInput,
      this.objectDistanceInput,
      this.sizeLockSelect,
      this.clearDistanceHypothesisButton,
      this.sourceSelect,
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
      haloScale: shape.haloScale,
      blur: shape.blur ?? 0,
      brightness: shape.brightness ?? 0
    }
    this.colorInput.value = this.currentAppearance.color
    this.transparencyInput.value = String(this.currentAppearance.transparency)
    this.haloScaleInput.value = String(this.currentAppearance.haloScale)
    this.blurInput.value = String(this.currentAppearance.blur)
    this.brightnessInput.value = String(this.currentAppearance.brightness)
    // Skips the field while it's focused — same reasoning as syncObserverFromTimeline's lat/lng
    // skip: this same edit path re-syncs on every keystroke (input -> refresh() -> timeupdate),
    // which would otherwise stomp whatever the user is actively typing.
    if (this.shadow.activeElement !== this.shapeTitleInput) {
      this.shapeTitleInput.value = this.said.read(shape.title) ?? ""
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
    this.commitShapes(t, [{ sourceId: this.currentSourceId, shape: { ...shape, title: this.said.write(shape.title, this.shapeTitleInput.value, this.writingLanguage) } }])
    this.ufoElement.refresh()
    this.refreshSourceList() // keeps the dropdown's own label live as the user types
    this.updateShapeTitleValidity()
  }

  /** Which of the three readings a reader has pinned — see applyDistance. */
  private sizeLock: "none" | "apparent" | "real" | "distance" = "none"

  /**
   * The rule that keeps apparent width, real width and distance in step.
   *
   * They are three readings of one relation, apparent = f(real, distance), and only one of them is
   * the recording's: the apparent width (BaseShape.angular). The real width is derived from it,
   * and the distance is where the scene DRAWS the shape — a hypothesis, never a statement (see
   * PhenomenonDepth). So editing any one has to move exactly one other, and which one is what the
   * hold says. With nothing held the real width is what a thing keeps: moving it further makes it
   * look smaller (the distance moves the apparent width), and either width moves the other at the
   * distance it stands (the shape is resized on the canvas, which is what "try a size at a
   * distance" always did). Holding the apparent width is the other reading of a distance edit:
   * the shape looks the same and is stood elsewhere, which is what asking what the decor would
   * hide of it needs.
   */
  private onApparentWidthInput(): void {
    const deg = this.numberOrUndefined(this.apparentWidthInput.value)
    if (deg === undefined || deg <= 0 || this.selectedSourceIds.size !== 1) return
    if (this.sizeLock === "real") {
      const realM = this.numberOrUndefined(this.realWidthInput.value)
      if (realM !== undefined && realM > 0) {
        this.sceneElement.setDistanceHypothesis(this.currentSourceId, ApparentSize.distanceMAt(realM, deg))
      }
    }
    this.applyApparentWidth(deg)
  }

  private onRealWidthInput(): void {
    const realM = this.numberOrUndefined(this.realWidthInput.value)
    if (realM === undefined || realM <= 0 || this.selectedSourceIds.size !== 1) return
    if (this.sizeLock === "apparent") {
      const deg = this.currentApparentWidthDeg()
      if (deg !== undefined && deg > 0) {
        this.sceneElement.setDistanceHypothesis(this.currentSourceId, ApparentSize.distanceMAt(realM, deg))
        this.refreshDepth()
      }
      return
    }
    const distanceM = this.currentDistanceM()
    if (distanceM !== undefined && distanceM > 0) {
      this.applyApparentWidth(ApparentSize.angularWidthDeg({ sizeM: realM, distanceM }))
    }
  }

  private onDistanceInput(): void {
    const distanceM = this.numberOrUndefined(this.objectDistanceInput.value)
    if (distanceM === undefined || distanceM <= 0) return
    this.applyDistance(distanceM)
  }

  /** Stands the selected shape at `distanceM` — and, unless the apparent width is held, resizes it
   * on the canvas to what its real width subtends from there. */
  private applyDistance(distanceM: number): void {
    if (this.selectedSourceIds.size !== 1) return
    if (this.sizeLock !== "apparent") {
      const realM = this.numberOrUndefined(this.realWidthInput.value)
      if (realM !== undefined && realM > 0) {
        this.applyApparentWidth(ApparentSize.angularWidthDeg({ sizeM: realM, distanceM }))
      }
    }
    this.sceneElement.setDistanceHypothesis(this.currentSourceId, distanceM)
    this.refreshDepth()
  }

  /** Pins one reading: its field stops taking input, and the other two trade against each other. */
  private applySizeLock(): void {
    this.sizeLock = this.sizeLockSelect.value as typeof this.sizeLock
    this.apparentWidthInput.readOnly = this.sizeLock === "apparent"
    this.realWidthInput.readOnly = this.sizeLock === "real"
    this.objectDistanceInput.readOnly = this.sizeLock === "distance"
  }

  /** The selected shape's own apparent width, degrees, as the recording states it. */
  private currentApparentWidthDeg(): number | undefined {
    const shape = this.ufoElement.sighting.timeline.getInterpolatedShapeAt(this.ufoElement.currentTime, this.currentSourceId)
    if (!shape) return undefined
    return shape.angular?.widthDeg ?? this.currentProjection().pxToDeg(shape.bounds.width)
  }

  /** How far the selected shape is drawn right now, whatever decided it — see PhenomenonDepth. */
  private currentDistanceM(): number | undefined {
    return this.sceneElement.depthOf(this.currentSourceId)?.distanceM
  }

  /**
   * Resizes the selected shape on the canvas to subtend `widthDeg` — about its own centre (its
   * position is where the observer saw it, and has nothing to do with how big it was) and keeping
   * its aspect ratio (the width is one measurement; the outline's proportions are a separate
   * observation this must not overwrite). The angle is what the recording keeps; the metres that
   * led to it are forgotten the moment they have been applied, because they were never an
   * observation — the observer inferred the distance, then inferred the size from it.
   */
  private applyApparentWidth(widthDeg: number): void {
    const timeline = this.ufoElement.sighting.timeline
    const t = this.ufoElement.currentTime
    const shape = timeline.getInterpolatedShapeAt(t, this.currentSourceId)
    if (!shape) return
    const projection = this.currentProjection()
    const width = projection.degToPx(widthDeg)
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
    this.commitShapes(t, [{ sourceId: this.currentSourceId, shape: resized }])
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
   * account; saying so leaves the reader to judge, which is this project's whole posture.
   */
  /** The filters, named in the reader's language: the registry is the options, as for the instruments. */
  private refreshFilterOptions(): void {
    const names: Record<string, string> = {
      [Filters.NONE.id]: this.messages.filterNone,
      [Filters.SOLAR_VISUAL.id]: this.messages.filterSolarVisual,
      [Filters.SOLAR_PHOTO.id]: this.messages.filterSolarPhoto
    }
    const label = (filter: Filter): string => names[filter.id] ?? filter.name
    const built = [...this.filterSelect.options].map(option => option.textContent)
    // Built when the words change, not every tick: replacing the options of a select that is open closes it.
    if (built.length !== Filters.ALL.length || Filters.ALL.some((filter, i) => built[i] !== label(filter))) {
      const selected = this.filterSelect.value || Filters.NONE.id
      this.filterSelect.replaceChildren()
      for (const filter of Filters.ALL) {
        const option = document.createElement("option")
        option.value = filter.id
        option.textContent = label(filter)
        this.filterSelect.appendChild(option)
      }
      this.filterSelect.value = selected
    }
    // Which filters fit is the instrument's: the others stay listed, greyed, with the reason.
    const instrument = this.ufoElement?.sighting?.instrument
    for (const option of this.filterSelect.options) {
      const usable = !instrument || Filters.usableWith(Filters.byId(option.value), instrument)
      option.disabled = !usable
      option.title = usable ? "" : this.messages.filterNotForInstrument
    }
  }

  private refreshInstrumentOptions(): void {
    const sighting = this.ufoElement.sighting
    const year = sighting.event.time?.year
    const current = sighting.instrument
    const headings: Record<InstrumentCategory, string> = {
      eye: this.messages.instrumentCategoryEye,
      camera: this.messages.instrumentCategoryCamera,
      dslr: this.messages.instrumentCategoryDslr,
      phone: this.messages.instrumentCategoryPhone,
      binoculars: this.messages.instrumentCategoryBinoculars,
      telescope: this.messages.instrumentCategoryTelescope
    }
    // Nothing is hidden for its date: what existed and what did not are both listed, the second
    // greyed with the reason, so a reader sees the whole catalogue and why a choice is out of reach.
    // The recording's own instrument stays takable even out of its period: dropping it would
    // silently re-instrument an account, so it is said to be out of period instead.
    const choice = (instrument: Instrument): PickerNode => {
      const name = this.naming.instrument(instrument)
      const gap = Instruments.unavailability(instrument, year)
      if (!gap) return { id: instrument.id, label: name }
      const reason = (gap.kind === "before" ? this.messages.instrumentNotYetOnSale : this.messages.instrumentNoLongerOnSale)
        .replace("{year}", String(year))
        .replace("{from}", String(gap.from))
        .replace("{to}", String(gap.to))
      return instrument.id === current.id
        ? { id: instrument.id, label: this.messages.instrumentOutOfPeriod.replace("{name}", name), hint: reason }
        : { id: instrument.id, label: name, disabledReason: reason }
    }
    this.instrumentSelect.choices = Instruments.CATEGORIES.map(category => ({
      label: headings[category],
      children: INSTRUMENTS.filter(instrument => instrument.category === category).map(choice)
    })).filter(group => group.children.length > 0)
    this.instrumentSelect.value = this.instrumentSelect.value || current.id
  }

  /**
   * A shutter speed as photography writes it — "1/250" rather than "0.004".
   *
   * Not decoration: a observer's own account of a photograph says "a five-second exposure" or "a
   * five-hundredth", and a field that answers in thousandths of a second is a field nobody can
   * check against what they were told. Long poses stay decimal, because that is how those are said
   * too.
   */
  private static exposureText(seconds: number): string {
    if (seconds >= 1) return String(Math.round(seconds * 100) / 100)
    return `1/${Math.round(1 / seconds)}`
  }

  /**
   * What the field says the shutter did, as long as the device could do it.
   *
   * A camera is not a wish: a phone's night mode stops at ten seconds and an Instamatic had exactly
   * one speed, so a pose typed past what the device offered is not a account this recording can
   * hold — it would put a trail in the picture that the camera named on the same recording could
   * never have drawn. The value is brought back inside the device's own range, and the field then
   * shows what the recording holds (see syncOpticsFromInstrument, which rewrites it as soon as the
   * observer leaves the field): the correction is visible rather than announced, the same way the
   * focal length shows the millimetres a field really works out to.
   *
   * A device with no range at all is one with nothing to set — its own single speed stands.
   */
  private statedExposureSeconds(instrument: Instrument): number | undefined {
    const stated = SightingEditorElement.exposureSeconds(this.exposureInput.value)
    const range = instrument.exposureRangeSeconds
    if (!range) return instrument.exposureSeconds ?? stated
    if (stated === undefined) return undefined
    return Math.min(range.max, Math.max(range.min, stated))
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
   * ninetieth of a second and refuse to be touched. A observer's account is not improved by
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
    // not a device setting at all, it is how much of their surroundings the observer took in.
    this.focalLengthInput.disabled = frame !== undefined && frame.focalRangeMm === undefined
    // One field for two things (see the label above), so its bounds are the ones it is showing:
    // a lens's own millimetres, or a field of view, which cannot reach a half-turn. Without this an
    // eye was offered a field of 1810°.
    this.focalLengthInput.min = String(frame ? frame.focalRangeMm?.minMm ?? 1 : 1)
    this.focalLengthInput.max = String(frame ? frame.focalRangeMm?.maxMm ?? 2000 : 179)
    NumberFields.fit(this.focalLengthInput.parentElement ?? this.shadow)
    // A device that fixes its lens leaves nothing to type, but what it takes in is still worth
    // reading: the field it gives, beside the millimetres it is stated in.
    this.focalFovOutput.textContent = frame && fovDeg !== undefined
      ? this.messages.fieldOfViewReadout.replace("{deg}", this.plain(fovDeg, fovDeg < 10 ? 1 : 0))
      : ""

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

    const exposure = sighting.exposure
    if (this.exposureInput !== this.shadow.activeElement) {
      // What is shown IS what the recording holds — including a pose brought back inside the
      // device's own range (see statedExposureSeconds).
      this.exposureInput.value = exposure === undefined ? "" : SightingEditorElement.exposureText(exposure)
    }
    this.setRowVisible(this.exposureInput, instrument.exposureSeconds !== undefined)
    this.exposureInput.disabled = instrument.exposureRangeSeconds === undefined

    // Only ever askable of something that can be focused at all, which is to say something with a
    // lens and a diaphragm: an eye is not focused BY the observer, and its depth of field is not
    // what a reconstruction turns on.
    if (this.focusDistanceInput !== this.shadow.activeElement) {
      this.focusDistanceInput.value = pose?.focusDistanceM === undefined ? "" : String(pose.focusDistanceM)
    }
    this.setRowVisible(this.focusDistanceInput, frame !== undefined && instrument.fNumber !== undefined)
    if (this.filterSelect !== this.shadow.activeElement) this.filterSelect.value = Filters.byId(pose?.filter).id
  }

  /**
   * Moves every pose whose field was never really stated onto the new instrument's own field.
   *
   * The rule, and it is the whole reason this is not a blanket overwrite: a field that still reads
   * as the OLD instrument's is one nobody chose — this recorder wrote it from that instrument's
   * optics — so it follows the change. Any other value was meant by somebody (a zoom, binoculars,
   * a hand-authored file), and a picker must not quietly edit a account. Same distinction the
   * weather fields draw between a looked-up reading and a observer's own declaration.
   */
  private retuneFieldOfView(previous: Instrument): void {
    const sighting = this.ufoElement.sighting
    const was = Instruments.fieldOfViewDeg(previous)
    const now = Instruments.fieldOfViewDeg(sighting.instrument)
    for (const keyframe of [...sighting.observerTrack.allKeyframes]) {
      if (Math.abs(keyframe.pose.fovDeg - was) > SAME_FIELD_EPSILON_DEG) continue
      sighting.observerTrack.addKeyframe(keyframe.t, { ...keyframe.pose, fovDeg: now })
    }
  }

  /**
   * Moves the shutter onto the new device, the same way the field of view moves.
   *
   * Two cases, and the distinction is the one this file draws everywhere: a speed that still reads
   * as the OLD device's own is one nobody stated, so it simply follows — a recording that never
   * mentioned a shutter must not end up claiming the previous camera's. A speed somebody DID state
   * is kept, but held to what the new device could do: a ten-minute pose typed on an SLR does not
   * survive a switch to a phone that stops at ten seconds, and a camera with no range at all (an
   * Instamatic, an eye) leaves nothing to state.
   */
  private retuneExposure(previous: Instrument): void {
    const sighting = this.ufoElement.sighting
    const stated = sighting.exposureSeconds
    const range = sighting.instrument.exposureRangeSeconds
    if (stated === undefined || stated === previous.exposureSeconds || !range) {
      sighting.exposureSeconds = undefined
      return
    }
    sighting.exposureSeconds = Math.min(range.max, Math.max(range.min, stated))
  }

  /** The field of view the observer's own pose declares at the current playhead, falling back to
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
      if (!this.hasFocus(this.apparentWidthInput)) this.apparentWidthInput.value = ""
      this.refreshRealSize()
      return
    }
    const degrees = shape.angular?.widthDeg ?? this.currentProjection().pxToDeg(shape.bounds.width)
    const moons = ApparentSize.inMoons(degrees)
    // The field is a number, so it takes a plain one; the Moons are a sentence, and follow the
    // reader's own locale (a comma in French) like every other number a browser formats.
    if (!this.hasFocus(this.apparentWidthInput)) this.apparentWidthInput.value = this.plain(degrees, degrees < 1 ? 2 : 1)
    this.apparentSizeOutput.textContent = this.messages.apparentSize
      .replace("{moons}", moons.toLocaleString(undefined, { maximumFractionDigits: moons < 10 ? 1 : 0 }))
    this.refreshRealSize()
  }

  /** Whether `input` is the field whose own typing is being applied right now — the one field a
   * sync must not overwrite, or the digits would change under the reader's fingers. Typing, and
   * not focus: a field keeps the focus while the pointer goes on to resize the shape on the canvas,
   * and a focused field that never updated was a reading that lied for as long as it was looked
   * at. */
  private hasFocus(input: HTMLElement): boolean {
    return this.typingIn === input
  }

  /** The field whose input event is being handled — see hasFocus. */
  private typingIn?: HTMLElement

  /** Runs one field's own input handling with that field protected from the syncs it triggers. */
  private typing(input: HTMLElement, apply: () => void): void {
    this.typingIn = input
    try {
      apply()
    } finally {
      this.typingIn = undefined
    }
  }

  /** A number for a number field: a point, never a locale's comma, at the given precision. */
  private plain(value: number, digits: number): string {
    return String(Number(value.toFixed(digits)))
  }

  /**
   * Says what the recording can actually establish about the object's real width — and, far more
   * often, that it cannot establish anything.
   *
   * This is the other half of dropping stored sizes (see BaseShape.angular). A account states an
   * angle; meters only ever follow from the object being seen to cross something whose distance is
   * known, which is an inequality, not a measurement — so what shows here is a range, a one-sided
   * bound, or an honest "unknown". A observer alone under an empty night sky has crossed nothing,
   * and no amount of confidence in their "about a hundred feet" changes that.
   *
   * Blank for a multiple selection, like the apparent size above it: a range belongs to one object.
   */
  /**
   * What the stated blur is worth as a distance, through the instrument the recording names.
   *
   * The depth of field this scene draws runs one way: the recording states a lens, and the world
   * is blurred by how far each thing stands. It deliberately leaves the observer's own object
   * sharp, because that object's distance is the very unknown a reconstruction is about. A blur
   * the observer STATED runs the same geometry backwards and bounds it — which DepthOfField's own
   * doc comment called for before there was anything to state it with: "an object photographed as
   * a blur, in a picture whose horizon is sharp, was CLOSE".
   *
   * Only for a lens focused at infinity, which is where a camera pointed at the sky sits and is
   * also the only case with ONE answer: a lens focused at 40 m blurs a thing at 20 as much as a
   * thing at 90, and printing either would be choosing. And only for an instrument with a frame:
   * an eye's pupil is an aperture in name only here, with no film for a circle of confusion to
   * land on. In both other cases this says why it cannot say, rather than nothing.
   */
  private refreshBlurDistanceBound(): void {
    const blur = this.currentAppearance.blur
    if (blur <= 0 || this.selectedSourceIds.size !== 1) {
      this.blurBoundOutput.textContent = ""
      return
    }
    const instrument = this.ufoElement.sighting.instrument
    const frame = instrument.frame
    if (!frame) {
      this.blurBoundOutput.textContent = this.messages.blurBoundNoInstrument
      return
    }
    // Read off the POSE, not off the three optics fields. Those hold whatever is being typed into
    // them, committed or not — a focal length keyed in and not yet applied made this state a bound
    // for a lens the recording did not have, and the field then snapped back to the old value with
    // the bound left standing. The pose is what the file says.
    const pose = resolveObserverPoseAt(this.ufoElement.sighting, this.ufoElement.currentTime)
    const focusM = pose?.focusDistanceM
    if (focusM !== undefined) {
      this.blurBoundOutput.textContent = this.messages.blurBoundNotAtInfinity.replace("{focus}", this.meters(focusM))
      return
    }
    const focalLengthMm = (pose ? Instruments.focalLengthMmFor(instrument, pose.fovDeg) : undefined) ?? frame.focalLengthMm
    const fNumber = pose?.fNumber ?? instrument.fNumber
    if (fNumber === undefined || focalLengthMm <= 0) {
      this.blurBoundOutput.textContent = ""
      return
    }
    // The drawn blur is a radius in canvas pixels; a circle of confusion is a diameter in
    // millimetres on the frame. Both conversions, in that order — the same pixels-to-frame scale
    // DepthOfFieldPass uses for the world it blurs, so the two readings of one lens agree.
    const canvasHeightPx = this.ufoElement.canvasElement.height
    if (canvasHeightPx <= 0) return
    const circleMm = ((2 * BLUR_RADIUS_UNIT * blur) / canvasHeightPx) * frame.heightMm
    // c = f² / (N·d) rearranged. Focused at infinity, the disc is the aperture's own image and
    // grows without limit as the object comes closer, so this inverts cleanly.
    const subjectM = (focalLengthMm * focalLengthMm) / (fNumber * circleMm) / 1000
    this.blurBoundOutput.textContent = this.messages.blurBound.replace("{max}", this.meters(subjectM))
  }

  private refreshRealSize(): void {
    this.refreshDepth()
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
    // The field above shows what the DRAWING distance implies; this line says what the scene
    // ESTABLISHES. The two are different things, and when they disagree the reader is told so
    // rather than left to notice a number outside its own bounds.
    const shownM = this.numberOrUndefined(this.realWidthInput.value)
    const outside =
      shownM !== undefined && ((minM !== undefined && shownM < minM) || (maxM !== undefined && shownM > maxM))
        ? this.messages.realSizeOutside
        : ""
    if (minM !== undefined && maxM !== undefined) {
      const here = this.sceneElement.distanceRangeAt(sourceId, this.ufoElement.currentTime)
      const distance =
        here.minM === undefined || here.maxM === undefined
          ? ""
          : this.messages.realDistanceHere.replace("{min}", this.meters(here.minM)).replace("{max}", this.meters(here.maxM))
      this.realSizeOutput.textContent =
        this.messages.realSizeBetween.replace("{min}", this.meters(minM)).replace("{max}", this.meters(maxM)) + distance + outside
      return
    }
    this.realSizeOutput.textContent =
      (minM !== undefined
        ? this.messages.realSizeAtLeast.replace("{min}", this.meters(minM))
        : this.messages.realSizeAtMost.replace("{max}", this.meters(maxM!))) + outside
  }

  /** A length in meters at the precision it is actually known to — two decimals under a meter, one
   * up to ten, none beyond. A bound derived from a raycast against a hangar is not a millimeter
   * measurement, and printing it as one would claim a precision the inequality never had. Decimal
   * separator follows the reader's own locale, like every other number a browser formats. */
  /** A number with a fixed number of decimals, in the reader's own notation — which in French is a
   * comma. Written out rather than reached for with toFixed, because toFixed always produces a
   * point and a French line reading "2.5×" beside "6,6/h" is the kind of wart that makes a page
   * read as machine output. */
  private decimal(value: number, digits: number): string {
    return value.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })
  }

  private clearDistanceHypothesis(): void {
    if (this.selectedSourceIds.size !== 1) return
    this.sceneElement.setDistanceHypothesis(this.currentSourceId, undefined)
    this.refreshDepth()
  }

  /**
   * Where a new body starts (see BodyEditor.addBody), at the playhead: standing for the selected
   * shape, in its direction (the one it states, else the one the observer faced), at the distance
   * the scene draws it and as big as its apparent width is there; or, with no shape drawn at this
   * instant, where the observer is looking. When that line of sight goes into the ground before that
   * distance, the body stands on the ground at that distance: placed in the air along it, it was
   * under the relief and nothing of it showed (a craft in the hollow at Socorro).
   */
  private newBodyStart(): { sourceId?: string, label?: string, keyframe: BodyKeyframe } | undefined {
    const sourceId = this.currentSourceId
    const t = this.ufoElement.currentTime
    const shape = sourceId === undefined ? undefined : this.ufoElement.sighting.timeline.getInterpolatedShapeAt(t, sourceId)
    // To the decimetre, the centimetre and the hundredth of a degree: a starting point typed into a
    // file, not a float's last bits.
    const round = (value: number, decimals: number) => Number(value.toFixed(decimals))
    const aim = shape?.aim ?? { azimuthDeg: Number(this.headingInput.value) || 0, altitudeDeg: Number(this.pitchInput.value) || 0 }
    const drawnAtM = (shape ? this.sceneElement.depthOf(sourceId)?.distanceM : undefined) ?? DEFAULT_NEW_BODY_DISTANCE_M
    const groundM = this.sceneElement.groundAlong(aim.azimuthDeg, aim.altitudeDeg, t)
    const onGround = groundM !== undefined && groundM < drawnAtM
    const distanceM = round(drawnAtM, 1)
    const widthDeg = shape?.angular?.widthDeg
    const heightDeg = shape?.angular?.heightDeg
    const sizeM = widthDeg !== undefined && heightDeg !== undefined && widthDeg > 0 && heightDeg > 0
      ? { widthM: round(ApparentSize.sizeMAt(distanceM, widthDeg), 2), lengthM: round(ApparentSize.sizeMAt(distanceM, widthDeg), 2), heightM: round(ApparentSize.sizeMAt(distanceM, heightDeg), 2) }
      : undefined
    const direction = { azimuthDeg: round(aim.azimuthDeg, 2), altitudeDeg: round(aim.altitudeDeg, 2) }
    // On the ground at that distance, not where the line first meets it: that can be the slope
    // under the observer's own feet, fifteen metres off, which made an 11 cm body (see BodyKeyframe).
    const keyframe: BodyKeyframe = { t, ...direction, distanceM, ...(onGround ? { onGround: true } : {}), ...(sizeM ? { sizeM } : {}) }
    return shape
      ? { sourceId, label: this.shapeLabel(sourceId), keyframe }
      : { keyframe }
  }

  /**
   * The Bodies part of the Phenomenon group, fetched and built the first time it is opened: a
   * chunk of its own, since most authors draw shapes and never open it (see BodyEditor).
   */
  private loadBodyEditor(): Promise<BodyEditor> {
    this.bodyEditorLoading ??= import("./BodyEditor.js").then(({ BodyEditor }) => {
      this.bodyEditor = new BodyEditor(this.shadow.getElementById("body-editor")!, {
        sighting: () => this.ufoElement.sighting,
        said: () => this.said,
        writingLanguage: () => this.writingLanguage,
        modelProvider: () => this.decorModelProvider,
        modelPicker: () => this.modelPicker,
        shapes: () => this.bodyShapeIds().map(id => ({ id, label: this.shapeLabel(id) })),
        changed: () => {
          this.ufoElement.refresh()
          this.refreshParamSummary()
          this.syncBodiesShown()
        },
        newBodyStart: () => this.newBodyStart(),
        lookAt: body => this.lookAtBody(body),
        currentTime: () => this.ufoElement.currentTime,
        seekTo: t => { this.ufoElement.currentTime = t },
        readingOf: (body, t) => this.sceneElement.bodyReading(body, t),
        groundAlong: (azimuthDeg, altitudeDeg, t) => this.sceneElement.groundAlong(azimuthDeg, altitudeDeg, t)
      }, this.language)
      return this.bodyEditor
    })
    return this.bodyEditorLoading
  }

  /**
   * The Beams part of the Sky group, fetched and built the first time it is opened: a chunk of its own, since a recording has a beam only
   * when somebody has put one in (see BeamEditor).
   */
  private loadBeamEditor(): Promise<BeamEditor> {
    this.beamEditorLoading ??= import("./BeamEditor.js").then(({ BeamEditor }) => {
      this.beamEditor = new BeamEditor(this.shadow.getElementById("beam-editor")!, {
        sighting: () => this.ufoElement.sighting,
        said: () => this.said,
        writingLanguage: () => this.writingLanguage,
        changed: () => {
          this.ufoElement.refresh()
          this.refreshParamSummary()
          this.sceneElement.redrawSky()
        }
      }, this.language)
      return this.beamEditor
    })
    return this.beamEditorLoading
  }

  /**
   * The Launches part of the Sky group, fetched and built the first time it is opened: a chunk
   * of its own, since a recording has a launch only when somebody has put one in (see LaunchEditor).
   */
  private loadLaunchEditor(): Promise<LaunchEditor> {
    this.launchEditorLoading ??= import("./LaunchEditor.js").then(({ LaunchEditor }) => {
      this.launchEditor = new LaunchEditor(this.shadow.getElementById("launch-editor")!, {
        sighting: () => this.ufoElement.sighting,
        said: () => this.said,
        writingLanguage: () => this.writingLanguage,
        changed: () => {
          this.ufoElement.refresh()
          this.refreshParamSummary()
          this.sceneElement.redrawSky()
        }
      }, this.language)
      return this.launchEditor
    })
    return this.launchEditorLoading
  }

  /** Turns the observer towards a body — see BodyEditorHost.lookAt, and lookAtDecor for the decor's. */
  private lookAtBody(body: BodyJson): void {
    const direction = this.sceneElement.directionToBody(body, this.ufoElement.currentTime)
    if (!direction) return
    this.headingInput.value = String(Math.round(direction.azimuthDeg * 10) / 10)
    this.pitchInput.value = String(Math.round(direction.altitudeDeg * 10) / 10)
    this.updateObserver()
  }

  /**
   * Says where the selected shape is drawn and why, and fills the distance and real-width fields
   * from it — so an edit starts from where the thing already stands.
   */
  private refreshDepth(): void {
    const depth = this.selectedSourceIds.size === 1 ? this.sceneElement.depthOf(this.currentSourceId) : undefined
    if (!depth) {
      this.depthBasisOutput.textContent = ""
      if (!this.hasFocus(this.objectDistanceInput)) this.objectDistanceInput.value = ""
      if (!this.hasFocus(this.realWidthInput)) this.realWidthInput.value = ""
      return
    }
    const m = this.meters(depth.distanceM)
    if (!this.hasFocus(this.objectDistanceInput)) {
      this.objectDistanceInput.value = this.plain(depth.distanceM, depth.distanceM < 10 ? 1 : 0)
    }
    const deg = this.currentApparentWidthDeg()
    if (!this.hasFocus(this.realWidthInput)) {
      const realM = deg === undefined || deg <= 0 ? undefined : ApparentSize.sizeMAt(depth.distanceM, deg)
      this.realWidthInput.value = realM === undefined ? "" : this.plain(realM, realM < 1 ? 2 : realM < 10 ? 1 : 0)
    }
    this.clearDistanceHypothesisButton.hidden = depth.basis !== "hypothesis"
    const message = {
      stated: this.messages.depthStated,
      hypothesis: this.messages.depthHypothesis,
      derived: this.messages.depthDerived,
      bounded: this.messages.depthBounded,
      conventional: this.messages.depthConventional
    }[depth.basis]
    this.depthBasisOutput.textContent = message.replace("{m}", m)
  }

  /**
   * The one way this editor writes shapes into the timeline.
   *
   * Every gesture moves a BOX — that is what the pointer has — and a box only says "so many pixels
   * from wherever the observer faced". The recording's own statement is the DIRECTION (BaseShape.aim),
   * which the scene stands the shape along; it used to be filled in only on save, so between two
   * saves a shape dragged across the canvas stood in the scene where it had been and its handles
   * went where the pointer took them. Written here, at the instant the box changes, from the same
   * arithmetic the save uses (see SightingShapes.aimOf), so the two never disagree for longer than
   * one frame.
   */
  private commitShapes(t: number, shapes: ShapeState[]): void {
    const sighting = this.ufoElement.sighting
    // The angle too, for the same reason as the direction: a handle drag moves the box, and the
    // recording's own statement of size (BaseShape.angular) used to be re-derived from it only on
    // save — so between two saves the scene stood a resized shape at the distance its OLD angle
    // implied, and the apparent-width field went on reading the old angle under new handles.
    const projection = ImageProjection.of(sighting.instrument, ApparentSize.CANVAS_HEIGHT_PX, SightingShapes.fovOf(sighting, t))
    // The seek bar spans the whole declared observation while nothing is recorded; a keyframe placed
    // on it is a position IN that observation, so the recording keeps its length instead of ending
    // (and being stretched) at this keyframe — see Timeline.setSpan.
    const seekable = this.ufoElement.seekableDuration
    if (seekable > sighting.timeline.duration) sighting.timeline.setSpan(seekable)
    sighting.timeline.addKeyframe(
      t,
      shapes.map(state => {
        const aim = SightingShapes.aimOf(sighting, t, state.shape.bounds)
        const angular = projection.ofBounds(state.shape.bounds)
        // No direction to state (the pose has no heading yet) means no direction at all: keeping the
        // one the shape carried would stand it in the scene where it WAS while its box, handles
        // and every later read follow the pointer.
        const { aim: _stale, ...rest } = state.shape
        return { ...state, shape: aim ? { ...rest, aim, angular } : { ...rest, angular } }
      })
    )
  }

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
    const missing = this.selectedSourceIds.size === 1 && this.ufoElement.sighting.timeline.sourceIds.length > 0 && this.shapeTitleInput.value === ""
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
   * that surface is end-user-facing (a real rr0.org sighting page), where a observer who never
   * named a shape shouldn't have one invented for them; this method's own generated fallback is
   * only ever shown inside this editor's own authoring UI. */
  private shapeLabel(sourceId: string): string {
    const shape = this.ufoElement.sighting.timeline.getInterpolatedShapeAt(this.ufoElement.currentTime, sourceId)
    const title = this.said.read(shape?.title)
    if (title) return title
    const match = /^ufo-(\d+)$/.exec(sourceId)
    return match ? `${this.messages.shape} ${match[1]}` : sourceId
  }

  /** Creates a genuinely new, independent shape/source, staggered diagonally away from
   * existing ones so it's immediately visible/distinguishable rather than stacked exactly on
   * top of an existing shape. */
  private addShape(): void {
    if (this.isRecording) return
    const timeline = this.ufoElement.sighting.timeline
    // The first shape of an empty recording takes the id that was waiting for it ("ufo-1").
    if (timeline.sourceIds.length > 0 || this.currentSourceId === undefined) {
      const taken = new Set([...timeline.sourceIds, this.currentSourceId])
      let n = taken.size + 1
      while (taken.has(`ufo-${n}`)) n++
      this.currentSourceId = `ufo-${n}`
    }
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
   * (mirrors addShape()'s own "pick the next one" logic). The last one can go too: a recording
   * may hold only bodies, and one with no shape left is in the state one loaded without any
   * starts in (see removeShapes). Disabled while recording (deleteShapeButton.disabled, set in
   * toggleRecording()) for the same reason addShapeButton is: deleting the very source the
   * recorder is actively writing keyframes into would be pulling the rug out from under it.
   *
   * The single entry point for every way to delete a shape — the toolbar button, the context
   * menu's own Delete item, and the Delete/Backspace key. None of them asks first: the deletion is a change
   * to the recording like any other, and undo (see undo) puts it back. */
  private deleteShape(): void {
    if (this.isRecording || this.ufoElement.playbackState === "playing") return
    const timeline = this.ufoElement.sighting.timeline
    const toDelete = timeline.sourceIds.filter(id => this.selectedSourceIds.has(id))
    if (toDelete.length === 0) return // nothing real to delete
    // Not asked first: the deletion is a change to the recording like any other, and undo (see undo) puts it back.
    this.removeShapes(toDelete)
  }

  /** The deletion itself, once confirmed — see deleteShape, which is the only caller. */
  private removeShapes(toDelete: string[]): void {
    const timeline = this.ufoElement.sighting.timeline
    for (const sourceId of toDelete) timeline.removeSource(sourceId)
    // With the last one gone, the recording is where one loaded without any shape starts: the
    // default id, not yet drawn — a recording may hold only bodies (see BodyEditor).
    this.currentSourceId = timeline.sourceIds[0] ?? DEFAULT_SOURCE_ID
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
    // The id waiting for a first shape is not a shape: an empty recording lists none.
    const ids = timeline.sourceIds.length > 0 ? [...new Set([...timeline.sourceIds, this.currentSourceId])] : []
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
   * observer types one into the Name field. */
  private decorLabel(decor: DecorObject): string {
    const title = this.said.read(decor.title)
    if (title) return title
    const sameKind = this.ufoElement.sighting.decor.filter(d => d.kind === decor.kind)
    const index = sameKind.indexOf(decor) + 1
    const kindLabel = this.decorList.kindLabel(decor.kind)
    return `${kindLabel} ${index}`
  }

  /** Creates a new decor object, staggered along the east axis by how many decor objects already
   * exist so a run of "Add" clicks doesn't stack everything at the same spot — same "immediately
   * visible/distinguishable" reasoning as addShape's own diagonal offset. `kind` defaults to
   * whatever's picked in decorKindSelect (addDecorBuildingButton, the Location group's "Add
   * decor" button — every kind but "other observer" is added this way now that building is no
   * longer hidden from that dropdown); addDecorObserverButton (in the Observer group) instead calls
   * this with an explicit "observer" kind, skipping the dropdown entirely since a observer has
   * nothing else to pick beforehand. northM is positive (north, +15) rather than negative:
   * a fresh recording's camera starts at rotation.y=0, looking toward -Z — the same direction
   * heading 0 ("facing north") points, per this project's own azimuth convention (see
   * GeoProjection.ts) — so a newly added decor object should land in front of that default view,
   * not behind it where the observer would have to turn around just to see what they just added.
   * Always reassigns sighting.decor to a new array (never mutates the existing one in place) —
   * see SceneRenderer.setDecor's own doc comment on why that reference-equality check depends on
   * it. */
  private addDecor(kind: DecorObject["kind"] = (this.decorList.pickedKind ?? "building") as DecorObject["kind"]): void {
    this.observerAdded = kind === "observer"
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
      // editable, and none of it is account (see the Decor group's own doc): this is a
      // hypothesis about what the observer might have been looking at.
      ...(kind === "aircraft" ? this.defaultAircraft() : {}),
      // A traffic light is its lamps and their cycle (see TrafficSignals); a sign starts as a stop, the one everybody can name.
      ...(kind === "trafficlight" ? { lights: LightRigs.byId("traffic-signal")?.create() } : {}),
      ...(kind === "roadsign" ? { sign: { face: "stop" as const } } : {}),
      // Only a building has floors at all — see DecorObject.floors's own doc comment.
      ...(kind === "building" ? { floors: DEFAULT_BUILDING_FLOORS } : {}),
      // undefined (spread as a no-op) for a kind with no windows at all — see defaultWindows.
      windows: defaultWindows(kind)
    }
    sighting.decor = [...sighting.decor, decor]
    this.currentDecorId = decor.id
    this.refreshDecorList()
    this.ufoElement.refresh()
    if (kind !== "building") void this.adoptDefaultModel(decor.id, kind)
  }

  /** The survey the author chose, or "none"; undefined when they have chosen nothing, which is the first of the registry. */
  private readSceneryChoice(): string | undefined {
    try {
      return localStorage.getItem(SightingEditorElement.SCENERY_STORAGE) ?? undefined
    } catch {
      return undefined
    }
  }

  /** The radius the browser remembers, in metres as the field says it: the default where it remembers none. */
  private readSceneryRadius(): string {
    try {
      const stored = Number(localStorage.getItem(SightingEditorElement.SCENERY_RADIUS_STORAGE))
      if (Number.isFinite(stored) && stored >= 20 && stored <= 3000) return String(stored)
    } catch {
      // No storage: the default.
    }
    return "100"
  }

  private writeSceneryRadius(radius: string): void {
    try {
      localStorage.setItem(SightingEditorElement.SCENERY_RADIUS_STORAGE, radius)
    } catch {
      // No storage: the radius holds for this page.
    }
  }

  private writeSceneryChoice(choice: string): void {
    try {
      localStorage.setItem(SightingEditorElement.SCENERY_STORAGE, choice)
    } catch {
      // No storage (a private window, blocked site data): the choice holds for this page and is not remembered.
    }
  }

  /**
   * Offers what the registry has to choose among, once it is loaded (a chunk of its own, started with the editor and not waited for): "None",
   * which leaves the scenery to the author, and each survey by its name, the credit it requires as the tooltip of its option. A survey added to the
   * registry is offered here without anything else being touched.
   */
  private async fillScenerySources(): Promise<void> {
    const { SURROUNDINGS_SOURCES, SurroundingsSources } = await import("../render3d/terrain/surroundingsSources.js")
    // The editor can be gone (a test torn down, a page left) while the chunk loads: there is nothing to fill, and no document to make options with.
    if (!this.isConnected) return
    const none = document.createElement("option")
    none.value = SightingEditorElement.NO_SCENERY
    none.id = "option-scenery-none"
    none.textContent = this.messages.surveySourceNone
    const options = SURROUNDINGS_SOURCES.map(source => {
      const option = document.createElement("option")
      option.value = source.id
      option.textContent = source.name
      option.title = source.credit
      return option
    })
    const file = new Option(this.messages.sourceFile, SightingEditorElement.FILE_SOURCE)
    file.id = "option-scenery-file"
    this.scenerySource.replaceChildren(none, ...options, file)
    this.surveyIds = SURROUNDINGS_SOURCES.map(source => source.id)
    this.defaultSurveyId = SurroundingsSources.DEFAULT_ID
    this.syncSceneryPicker()
  }

  /** The surveys the scenery picker offers, once its registry is loaded, and the one taken when none was chosen. */
  private surveyIds?: string[]
  private defaultSurveyId?: string

  /** Whether a survey is asked for the scenery: one chosen, and the scenery not read from the recording's file. */
  private sceneryAsked(): boolean {
    return this.sceneryChoice !== SightingEditorElement.NO_SCENERY && !this.sectionFromFile("decor")
  }

  /** The scenery picker as the recording and the browser say: the file, or the survey remembered (or none). */
  private syncSceneryPicker(): void {
    const fromFile = this.sectionFromFile("decor")
    if (this.surveyIds) {
      this.scenerySource.value = fromFile ? SightingEditorElement.FILE_SOURCE
        : this.sceneryChoice === SightingEditorElement.NO_SCENERY ? SightingEditorElement.NO_SCENERY
        : this.surveyIds.includes(this.sceneryChoice ?? "") ? this.sceneryChoice! : this.defaultSurveyId ?? this.surveyIds[0]
    }
    this.surroundings.setEnabled(this.sceneryAsked())
    ;(this.shadow.getElementById("scenery-radius-row") as HTMLElement).hidden = fromFile || this.sceneryChoice === SightingEditorElement.NO_SCENERY
    const link = this.shadow.getElementById("scenery-file-link")!
    link.hidden = !fromFile
    if (fromFile) {
      link.textContent = this.sectionFilePanel.itemLabel("decor")
      link.title = this.sectionFilePanel.where("decor")
    }
  }

  /** Says in the recording whether its scenery is read from its file (`frozen.decor`) or taken again from a survey as the observer moves. */
  private setDecorFromFile(fromFile: boolean): void {
    const sighting = this.ufoElement.sighting
    if (this.sectionFromFile("decor") === fromFile) return
    const frozen: FrozenData = { ...(sighting.frozen ?? {}) }
    if (fromFile) frozen.decor = frozen.decor ?? {}
    else delete frozen.decor
    sighting.frozen = FrozenGroups.isEmpty(frozen) ? undefined : frozen
    this.touch()
    this.scheduleFileSync()
    this.refreshFileItems()
  }

  /**
   * Where the trees of the area are looked for: where the observer stood at the start, which is what decor is measured
   * from (see DecorObject.eastM), or else the recording's own place. None while the recording has neither.
   */
  private plantingCentre(): { lat: number, lng: number } | undefined {
    const sighting = this.ufoElement.sighting
    const pose = sighting.observerTrack.getInterpolatedPoseAt(0)
    const place = sighting.event.place?.[0]
    const lat = pose?.lat ?? place?.lat
    const lng = pose?.lng ?? place?.lng
    return typeof lat === "number" && typeof lng === "number" ? { lat, lng } : undefined
  }

  /** Puts the decor the planting made in place of the recording's, as every other edit of the decor does: a new array. */
  private setPlantedDecor(decor: DecorObject[]): void {
    this.ufoElement.sighting.decor = decor
    if (!decor.some(object => object.id === this.currentDecorId)) this.currentDecorId = decor[0]?.id
    this.refreshDecorList()
    this.ufoElement.refresh()
    // The planting answers after the click that asked for it: it is written into the history here, as the form's edits are.
    this.scheduleHistoryRecord()
  }

  /**
   * Warns when the scenery taken from surveys is later than the observation, and says by how much: the survey's day is on each object (see
   * DecorObject.surveyedOn), the observation's in the recording, and either can change after the planting (the date edited, a recording loaded).
   */
  private refreshSceneryWarning(): void {
    const sighting = this.ufoElement?.sighting
    const late = sighting ? SceneryDates.anachronism(sighting.decor, sighting.event.time) : undefined
    this.sceneryWarning.hidden = late === undefined
    this.sceneryWarning.textContent = late ? this.messages.surveyWarning.replace("{survey}", late.survey).replace("{observation}", late.observation) : ""
  }

  /** Says where something the recording was made from came from, once. */
  private citeSource(source: RecordingSource): void {
    const sighting = this.ufoElement.sighting
    if ((sighting.sources ?? []).some(existing => existing.url === source.url)) return
    sighting.sources = [...(sighting.sources ?? []), source]
  }

  /**
   * Whatever is added to the scene starts as the catalogue's first model for its kind (a person, an
   * airliner, a car, a tree, a street lamp) at that model's own size, rather than as the built-in
   * marker; the picker beside it then offers the others of the kind. A building is left to its
   * built-in shape, which is the one that states floors and windows. Nothing is lost by it, since
   * "no model" stays the first option of the picker, and a model already stated (by a choice made
   * while the catalogue answered) is never overwritten. An unreachable catalogue leaves the
   * built-in shape, as everywhere else.
   */
  private async adoptDefaultModel(id: string, kind: DecorObject["kind"]): Promise<void> {
    const entry = (await this.decorModelProvider.entries(kind).catch(() => []))[0]
    if (!entry) return
    const added = this.ufoElement.sighting.decor.find(d => d.id === id)
    if (!added || added.model || added.sizeM) return
    this.ufoElement.sighting.decor = this.ufoElement.sighting.decor.map(d =>
      d.id === id ? { ...d, model: { id: entry.id }, sizeM: entry.sizeM } : d)
    if (this.currentDecorId === id) this.syncDecorVisibility()
    this.refreshDecorList()
    this.ufoElement.refresh()
  }

  /**
   * A straight, level pass in front of the observer — an airliner at 1500 m, a kilometre out,
   * crossing four kilometres of sky over the recording's own length.
   *
   * Lower and nearer than a first attempt at cruising altitude and four kilometres out, which was
   * just as real and completely unusable: 35 m of aeroplane at 5.8 km is four pixels, so it read as
   * a speck nobody could tell from a stuck pixel. This is an aircraft on approach, which is both
   * honest and the case a observer is actually near enough to describe. Every number of it is
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
    const kindLabel = this.decorList.kindLabel(kind)
    return `${kindLabel} ${sameKindCount + 1}`
  }

  /** Removes the currently selected decor object, then falls back to whichever one is now first
   * (or none at all — unlike deleteShape, a sighting with zero decor is the normal, common case,
   * not a state nothing else is built to handle). */
  private deleteDecor(): void {
    const sighting = this.ufoElement.sighting
    const going = sighting.decor.find(d => d.id === this.currentDecorId)
    if (going === undefined) return
    // The bin, the Delete key and the Backspace key all end here. Not asked first: undo puts it back.
    this.removeDecor(going.id)
  }

  /** The deletion itself, once confirmed — see deleteDecor, which is the only caller. */
  private removeDecor(id: string): void {
    const sighting = this.ufoElement.sighting
    sighting.decor = sighting.decor.filter(d => d.id !== id)
    if (this.currentDecorId === id) this.currentDecorId = sighting.decor[0]?.id
    this.refreshDecorList()
    this.ufoElement.refresh()
  }

  /** Also syncs decorSelect's own displayed value — a no-op when called from that same select's
   * "change" listener (its value is already `id` by then), but load-bearing for any other caller
   * (e.g. onPointerDown's own decor-click selection) that changes currentDecorId without the
   * dropdown itself having been touched. */
  private selectDecor(id: string): void {
    this.currentDecorId = id
    // With the text on show, what is selected is framed on the picture as in its own group (see canvasMode).
    if (this.isGroupIdOpen("group-file")) this.fileFocus = "decor"
    this.decorList.show(id)
    this.syncDecorFields()
    this.syncCanvasMode()
    // The frame of handles is drawn round the selected object: moving the selection moves it, which
    // syncCanvasMode alone does not repaint while the canvas stays in the same mode.
    if (this.canvasMode() === "decor") this.ufoElement.refresh()
    const index = this.ufoElement.sighting.decor.findIndex(candidate => candidate.id === id)
    if (index >= 0) this.showInFile(["decor", index])
  }

  /**
   * Writes what the fields that are not the form's back onto the selected decor object: the address of the
   * recording an observer has of their own, and the model the picker and the address block state — replacing the whole
   * decor array with a new one (not mutating the existing entry in place) for the same setDecor reference-equality
   * reason as addDecor. `extra` is what an edit that comes with it changes at the same time (the size a catalogue model
   * is, when it is picked).
   *
   * The other properties — name, place, heading, colour, measures, the lamp switch, the rig, where the observer sits — are
   * written by the generic form, one at a time (see commitDecorBase), so that editing one never restates the others.
   */
  private updateDecor(extra: Partial<DecorObject> = {}): void {
    if (this.currentDecorId === undefined) return
    const sighting = this.ufoElement.sighting
    sighting.decor = sighting.decor.map(d => d.id !== this.currentDecorId ? d
      : { ...d, ...extra })
    this.syncDecorVisibility()
    this.ufoElement.refresh()
  }

  /**
   * What the catalogue offers for the kind of the selected object, kept so that the form can say it at once (see decorBaseContext): asked
   * once per kind and answered from the provider's own cache. An unreachable catalogue leaves the built-in shape as the only choice.
   */
  private decorModelEntries?: { kind: DecorObject["kind"], entries: DecorModelEntry[] }

  private refreshDecorModelOptions(decor: DecorObject | undefined): void {
    if (!decor || this.decorModelEntries?.kind === decor.kind) return
    const kind = decor.kind
    void this.decorModelProvider.entries(kind).catch(() => []).then(entries => {
      this.decorModelEntries = { kind, entries }
      if (this.isConnected) this.decorBaseForm.sync()
    })
  }

  /** The catalogue entry of the model an object is DRAWN as, which is where its published settings are — the one it names, or else
   * the one its kind is drawn as when it names none (a tree is drawn as one of the catalogue's, whoever never chose it). */
  private drawnEntry?: DecorModelEntry
  private drawnEntryAsked?: string

  /**
   * What the model the object is drawn as publishes (see ModelParameters): its settings and its traits. Asked of the catalogue once for
   * each model, then answered from what came; until it has come there is nothing to offer, and the form is drawn again when it does.
   * A model at an address publishes nothing: nothing says what is in the file.
   */
  private publishedParametersOf(decor: DecorObject): ModelParameters | undefined {
    const ref = decorModelOf(decor)
    if (!ref?.id || ref.url !== undefined) return undefined
    if (this.drawnEntry?.id === ref.id) return this.drawnEntry.parameters
    if (this.drawnEntryAsked !== ref.id) {
      this.drawnEntryAsked = ref.id
      const id = ref.id
      void this.decorModelProvider.entry(id).catch(() => undefined).then(entry => {
        if (this.drawnEntryAsked !== id || !entry) return
        this.drawnEntry = entry
        if (this.isConnected) this.syncDecorVisibility()
      })
    }
    return undefined
  }

  /** The window that shows the 3D models as pictures, for the decor's picker and the bodies'. */
  private readonly modelPicker: ModelPicker

  /**
   * Turns the choice of model into a window of pictures (see ModelPicker), over the same options, and lets it name a model by an address as well.
   * The picker sets the select and says "change"; the form writes on "input".
   */
  private enhanceDecorModelChoice(spec: ChoiceParameter, select: HTMLSelectElement): void {
    if (spec.key !== "model.id") return
    select.addEventListener("change", () => select.dispatchEvent(new Event("input", { bubbles: true })))
    this.modelPicker.enhance(select, async id => {
      const decor = this.ufoElement.sighting.decor.find(d => d.id === this.currentDecorId)
      // "No model" is the kind's default model where it has one, and else its built-in shape.
      const modelId = id !== "" ? id : decor ? DEFAULT_DECOR_MODEL[decor.kind]?.id : undefined
      if (modelId !== undefined) return this.decorModelProvider.entry(modelId).then(entry => entry && { url: entry.url, headingOffsetDeg: entry.headingOffsetDeg })
      return decor === undefined ? undefined : { decorKind: decor.kind }
    }, {
      current: () => {
        const model = this.ufoElement.sighting.decor.find(d => d.id === this.currentDecorId)?.model
        return model?.url === undefined ? undefined : {
          url: model.url, title: model.credit?.title ?? "", author: model.credit?.author ?? "",
          license: model.credit?.license ?? "", source: model.credit?.sourceUrl ?? ""
        }
      },
      // A typed address wins over the catalogue (see DecorModelRef) and carries what credit has been typed beside it: an incomplete one is stored
      // as typed and simply isn't DRAWN until it is complete (see SceneRenderer.loadDecorModel), which is what makes the missing field visible.
      apply: address => this.commitDecorBase(view => {
        const title = this.stringOrUndefined(address.title)
        const license = this.stringOrUndefined(address.license)
        view.model = {
          url: address.url,
          credit: title !== undefined && license !== undefined ? { title, license, author: this.stringOrUndefined(address.author), sourceUrl: this.stringOrUndefined(address.source) } : undefined
        }
      }, "model")
    })
  }

  /**
   * Picking a model from the catalogue states it, and — only when nothing else does — states how big the thing it depicts really is.
   *
   * A catalogue entry can carry the real object's measurements (see DecorModelEntry.sizeM): a 1964 Catalina is 5.4 m of car whoever draws it.
   * Adopting that when the recording says nothing is strictly better than the built-in shape's own arbitrary 4.35, and it is sourced rather
   * than invented. It never overwrites a size the recording already states — an observer who measured their own car outranks a catalogue
   * describing a similar one — but a size that is exactly the previous model's own follows the new model (a woman is not drawn at the farmer's height).
   */
  private async adoptCatalogueSize(before: DecorObject, id: string | undefined): Promise<void> {
    const [previous, entry] = await Promise.all([
      before.model?.id ? this.decorModelProvider.entry(before.model.id).catch(() => undefined) : undefined,
      id ? this.decorModelProvider.entry(id).catch(() => undefined) : undefined
    ])
    const decor = this.ufoElement.sighting.decor.find(d => d.id === before.id)
    if (!decor || decor.model?.id !== id || !entry?.sizeM) return
    const sizeIsPrevious = decor.sizeM !== undefined && previous?.sizeM !== undefined
      && decor.sizeM.widthM === previous.sizeM.widthM && decor.sizeM.lengthM === previous.sizeM.lengthM && decor.sizeM.heightM === previous.sizeM.heightM
    if (decor.sizeM && !sizeIsPrevious) return
    // Only the axes the catalogue measured are stated; the others keep what they had.
    const sizeM = { ...decor.sizeM, ...Object.fromEntries(Object.entries(entry.sizeM).filter(([, measured]) => measured !== undefined).map(([axis, measured]) => [axis, this.roundedMeters(measured as number)])) }
    this.updateDecor({ sizeM })
  }

  /** Meters to the centimetre, so a field never reads 4.349999904632568 — a size is measured with
   * a tape, not to a float's last bit. */
  private roundedMeters(value: number): number {
    return Math.round(value * 100) / 100
  }

  /**
   * Names the instant the playhead is on.
   *
   * At the playhead and nowhere else: naming a moment is something a reader does WHILE looking at
   * it, and a moment created at t=0 for them to drag afterwards would be a different gesture. An
   * instant already named is selected rather than named twice — the label is what changes, not the
   * time.
   */
  private addMilestone(): void {
    const t = Math.round(this.ufoElement.currentTime)
    const sighting = this.ufoElement.sighting
    const existing = sighting.milestones.find(milestone => milestone.t === t)
    if (!existing) {
      sighting.milestones = sortedMilestones([...sighting.milestones, { t, label: this.nextMilestoneLabel() }])
    }
    this.currentMilestoneT = t
    this.refreshMilestoneList()
    this.ufoElement.refresh()
  }

  /** A, B, C… — the letters the case sketches themselves use, and the first one this recording has
   * not used yet. Falls back to the count once the alphabet runs out, which no account has. */
  private nextMilestoneLabel(): string {
    const used = new Set(this.ufoElement.sighting.milestones.map(milestone => milestone.label))
    for (let i = 0; i < 26; i++) {
      const letter = String.fromCharCode(65 + i)
      if (!used.has(letter)) return letter
    }
    return String(this.ufoElement.sighting.milestones.length + 1)
  }

  private deleteMilestone(): void {
    const t = this.currentMilestoneT
    if (t === undefined) return
    const sighting = this.ufoElement.sighting
    const going = sighting.milestones.find(milestone => milestone.t === t)
    if (!going) return
    sighting.milestones = sighting.milestones.filter(milestone => milestone.t !== going.t)
    this.currentMilestoneT = sighting.milestones[0]?.t
    this.refreshMilestoneList()
    this.ufoElement.refresh()
  }

  /** Selecting a moment moves the playhead to it: what a reader wants next after picking one out
   * of a list is to see it. */
  private selectMilestone(t: number): void {
    this.currentMilestoneT = t
    this.syncMilestoneFields()
    this.goToMark(t)
  }

  private updateMilestone(): void {
    const t = this.currentMilestoneT
    if (t === undefined) return
    const sighting = this.ufoElement.sighting
    sighting.milestones = sighting.milestones.map(milestone =>
      milestone.t === t
        ? {
          ...milestone,
          label: this.said.write(milestone.label, this.milestoneLabelInput.value, this.writingLanguage) ?? "",
          note: this.said.write(milestone.note, this.milestoneNoteInput.value, this.writingLanguage)
        }
        : milestone
    )
    this.refreshMilestoneList()
    this.ufoElement.refresh()
  }

  /** Rebuilds the picker from the recording, each option naming the moment and when it happens —
   * a list of bare letters would be unreadable the moment there are more than three. */
  private refreshMilestoneList(): void {
    const milestones = sortedMilestones(this.ufoElement.sighting.milestones)
    if (!milestones.some(milestone => milestone.t === this.currentMilestoneT)) this.currentMilestoneT = milestones[0]?.t
    this.milestoneSelect.replaceChildren(
      ...milestones.map(milestone => {
        const option = document.createElement("option")
        option.value = String(milestone.t)
        option.textContent = `${this.said.read(milestone.label) ?? ""} — ${this.formatSeconds(milestone.t)}`
        option.title = this.said.read(milestone.note) ?? ""
        return option
      })
    )
    if (this.currentMilestoneT !== undefined) this.milestoneSelect.value = String(this.currentMilestoneT)
    this.syncMilestoneFields()
  }

  /** Seconds to a tenth — enough to tell two moments apart without pretending the account was
   * timed to the millisecond. */
  private formatSeconds(t: number): string {
    return `${(t / 1000).toFixed(1)} s`
  }

  private syncMilestoneFields(): void {
    const current = this.ufoElement.sighting.milestones.find(milestone => milestone.t === this.currentMilestoneT)
    const has = current !== undefined
    ElementList.showPresence(this.shadow.getElementById("milestone-row")!, this.shadow.getElementById("milestone-item")!, has)
    for (const control of [this.milestoneSelect, this.goToMilestoneButton, this.deleteMilestoneButton]) control.disabled = !has
    this.milestoneLabelInput.value = this.said.read(current?.label) ?? ""
    this.milestoneNoteInput.value = this.said.read(current?.note) ?? ""
  }

  /** Rebuilds the decor dropdown's own option list and resyncs the East/North/Heading/Lit fields
   * from whichever decor object is now selected — called after add/delete/load, mirroring
   * refreshSourceList()'s role for shapes. Disables the field row entirely (rather than leaving
   * stale values editable) whenever there's no decor to edit at all. */
  private refreshDecorList(): void {
    // The other observers are listed in the Observer group, not here (see refreshObserverList).
    this.decorList.setItems(this.ufoElement.sighting.decor.filter(object => object.kind !== "observer")
      .map(object => ({ id: object.id, label: this.decorLabel(object) })), this.currentDecorId)
    this.syncDecorFields()
    this.syncCanvasMode()
    this.refreshSceneryWarning()
    this.refreshObserverList()
  }

  /**
   * The observers of the Observer group: this account's own first, then the other observers the scene places. One that has just been
   * added is the one shown; this account's own is shown when the one shown is gone.
   */
  private refreshObserverList(): void {
    const principal = SightingEditorElement.OBSERVER_PRINCIPAL
    const others = this.ufoElement.sighting.decor.filter(object => object.kind === "observer")
    if (this.currentDecorId !== undefined && others.some(other => other.id === this.currentDecorId) && this.observerAdded) this.observerShown = this.currentDecorId
    this.observerAdded = false
    if (!others.some(other => other.id === this.observerShown)) this.observerShown = principal
    this.observerList.setItems([{ id: principal, label: this.principalObserverLabel() }, ...others.map(other => ({ id: other.id, label: this.decorLabel(other) }))], this.observerShown)
    const another = this.observerShown !== principal
    this.observerList.setRemoveEnabled(another)
    this.observerList.setActionEnabled("look-at-observer", another)
    this.placeDecorItem()
  }

  /** This account's own observer, in the list of the Observer group: their name as the fields say it, and that they are this account's. */
  private principalObserverLabel(): string {
    const name = [this.observerTitleInput.value, this.observerFirstNamesInput.value, this.observerLastNameInput.value].map(part => part.trim()).filter(Boolean).join(" ")
    return name === "" ? this.messages.principalObserver : `${name} (${this.messages.principalObserver.toLowerCase()})`
  }

  /** An observer was added from the Observer group: the next refresh shows it there. */
  private observerAdded = false

  private selectObserver(id: string): void {
    this.observerShown = id
    if (id !== SightingEditorElement.OBSERVER_PRINCIPAL) this.selectDecor(id)
    this.refreshObserverList()
  }

  /**
   * The frame of the decor object picked stands in the Environment group, except while the Observer group shows another observer:
   * its fields are then that observer's, and move into the Observer group's frame, in place of this account's own observer's.
   */
  private placeDecorItem(): void {
    const item = this.shadow.getElementById("decor-item")
    const host = this.shadow.getElementById("observer-decor-host")
    const principalFields = this.shadow.getElementById("observer-principal")
    if (!item || !host || !principalFields) return
    const another = this.observerShown !== SightingEditorElement.OBSERVER_PRINCIPAL
    principalFields.hidden = another
    if (another && this.isGroupIdOpen("group-observer")) {
      if (item.parentElement !== host) host.append(item)
      item.hidden = false
      return
    }
    if (item.parentElement === host) this.shadow.getElementById("decor-list-header")!.after(item)
    item.hidden = this.decorList.value === ""
  }

  private syncDecorFields(): void {
    this.syncDecorVisibility()
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

  /**
   * Draws the base properties of the selected object and its state (see DecorBaseParameterSets), written back as they are typed,
   * each on its own (see commitDecorBase). Built once, when there is first an object to edit, and then only re-read: the
   * fields that do not apply to this object (a colour for a model, a lamp switch for a house) are left out by the form itself,
   * from what the object says it has (see decorBaseContext).
   */
  /** The object the base fields were last shown for: see showDecorBase. */
  private decorBaseShownFor?: string

  private showDecorBase(decor: DecorObject | undefined): void {
    this.decorBaseHost.hidden = decor === undefined
    this.decorStateHost.hidden = decor === undefined
    if (!decor) {
      this.decorBaseForm.clear()
      this.decorStateForm.clear()
      this.decorBaseShown = false
      this.decorBaseShownFor = undefined
      return
    }
    // Another object than the one on show: nothing being typed is its own, and every field is read again from it.
    const another = this.decorBaseShownFor !== decor.id
    this.decorBaseShownFor = decor.id
    if (this.decorBaseShown) {
      this.decorBaseForm.sync(another)
      this.decorStateForm.sync(another)
      return
    }
    this.decorBaseShown = true
    const target = () => new ParameterTarget(
      () => {
        const current = this.ufoElement.sighting.decor.find(candidate => candidate.id === this.currentDecorId)
        return current ? DecorBase.viewOf(current, this.ufoElement.currentTime, this.sceneElement.sunAltitudeDeg) as unknown as ParameterHolder : undefined
      },
      (apply, spec) => this.commitDecorBase(apply, spec.key),
      () => this.decorBaseContext()
    )
    this.decorBaseForm.show(DecorBaseParameterSets.BASE, target(), () => undefined)
    this.decorStateForm.show(DecorBaseParameterSets.STATE, target(), () => undefined)
  }

  /** What the form of the base properties needs of the object it edits, and of this editor. */
  private decorBaseContext(): DecorBaseContext | undefined {
    const decor = this.ufoElement.sighting.decor.find(candidate => candidate.id === this.currentDecorId)
    if (!decor) return undefined
    const traits = DecorTraits.of(decor, this.publishedParametersOf(decor))
    return {
      kind: decor.kind,
      natural: DecorSystem.naturalSize(decor.kind, decor.floors),
      traits: { color: traits.color, lit: traits.lit, headlights: traits.headlights, lights: traits.lights, observerSide: traits.observerSide },
      lightRigs: DecorTraits.rigsFor(decor.kind, this.publishedParametersOf(decor)).map(rig => ({ value: rig.id, label: this.naming.lightRig(rig) })),
      seats: DecorBaseParameterSets.seatsFor(decor.kind),
      models: (this.decorModelEntries?.kind === decor.kind ? this.decorModelEntries.entries : []).map(entry => ({ value: entry.id, label: entry.name })),
      defaultModelId: DEFAULT_DECOR_MODEL[decor.kind]?.id
    }
  }

  /**
   * Writes an edit of ONE base property of the selected object (see DecorBase.apply): `change` changes the view of the object
   * at the playhead, and what that field means for the object is written — a place as a keyframe of its track when it moves,
   * the lamp switch as a keyframe of its own at this instant (never while playing: scrubbing must not write one), and so on. The
   * decor array is replaced by a new one, not mutated, for the same setDecor reference-equality reason as addDecor.
   */
  private commitDecorBase(change: (view: ParameterHolder) => void, key: string): void {
    const decor = this.ufoElement.sighting.decor.find(candidate => candidate.id === this.currentDecorId)
    if (!decor) return
    if ((key === "lit" || key === "headlights") && this.ufoElement.playbackState === "playing") return
    const t = this.ufoElement.currentTime
    const view = DecorBase.viewOf(decor, t, this.sceneElement.sunAltitudeDeg)
    change(view as unknown as ParameterHolder)
    const sighting = this.ufoElement.sighting
    sighting.decor = sighting.decor.map(candidate => candidate.id === decor.id ? DecorBase.apply(candidate, view, key, t) : candidate)
    if (key === "model.id") void this.adoptCatalogueSize(decor, view.model?.id)
    const edited = sighting.decor.find(candidate => candidate.id === decor.id)!
    if (key === "title") this.decorList.rename(edited.id, this.decorLabel(edited))
    this.syncDecorVisibility()
    this.ufoElement.refresh()
    // The lamps are built into the object's group, which the scene rebuilds when the array's own identity changes.
    if (key === "lightRig") this.dispatchEvent(new CustomEvent("sightingchange"))
  }

  /**
   * Keeps the fields honest as the playhead moves — needed the moment decor could move: an aircraft is somewhere different at
   * every instant, and a form frozen on where it was at t=0 says the wrong thing for the whole rest of the recording. Not while
   * playing: that is when nothing is being edited and the fields are not read.
   */
  private syncDecorBaseFromTimeline(): void {
    if (this.ufoElement.playbackState === "playing" || !this.decorBaseShown) return
    this.decorBaseForm.sync()
    this.decorStateForm.sync()
  }

  /**
   * Draws the properties the selected object's kind publishes (see DecorParameterSets), written back as they
   * are typed. Drawn again only when what is on show is not what applies — another object, or the same one
   * now drawn as a model, which has no windows of the built-in shape — and otherwise only re-read, so that a
   * field being typed in is never drawn from under the caret.
   *
   * An edit replaces the object by an edited copy of itself in a new decor array, as every other decor edit
   * does (see updateDecor), and reads the object again for each one: the form never holds a copy that
   * another field has since changed.
   */
  private showDecorParameters(decor: DecorObject | undefined): void {
    const set = decor ? DecorParameterSets.of(decor, this.publishedParametersOf(decor)) : undefined
    if (!decor || !set) {
      this.decorParametersShownFor = undefined
      this.decorParameterForm.clear()
      this.decorParametersHost.hidden = true
      return
    }
    this.decorParametersHost.hidden = false
    const signature = `${decor.id}|${set.kind}|${set.parameters.map(spec => spec.key).join(",")}`
    if (signature === this.decorParametersShownFor) {
      this.decorParameterForm.sync()
      return
    }
    this.decorParametersShownFor = signature
    const id = decor.id
    const target = new ParameterTarget(
      () => this.ufoElement.sighting.decor.find(candidate => candidate.id === id) as unknown as ParameterHolder | undefined,
      apply => {
        const sighting = this.ufoElement.sighting
        sighting.decor = sighting.decor.map(candidate => {
          if (candidate.id !== id) return candidate
          const draft = structuredClone(candidate)
          apply(draft as unknown as ParameterHolder)
          return draft
        })
      })
    this.decorParameterForm.show(set, target, () => {
      this.syncDecorVisibility()
      this.ufoElement.refresh()
    })
  }

  /** Called wherever the kind-dependent rows are re-gated: what applies to the object may have changed. */
  private syncDecorParameterVisibility(): void {
    this.showDecorParameters(this.ufoElement.sighting.decor.find(d => d.id === this.currentDecorId))
  }

  /**
   * Shows what applies to the selected object and draws the fields of its properties (see showDecorBase): with no object,
   * the fieldset shows only the Add row below (see the template's comment on why that row is forced onto its own line) —
   * the picker, the delete button and every property are hidden entirely rather than left visible but disabled, so a blank
   * recording does not present a wall of inert fields with nothing to edit yet. Never touches a field's value: safe to
   * call after every keystroke.
   */
  private syncDecorVisibility(): void {
    const decor = this.ufoElement.sighting.decor.find(d => d.id === this.currentDecorId)
    this.refreshDecorModelOptions(decor)
    this.showDecorBase(decor)
    // The properties its kind publishes (floors, windows, a bridge's railing…) are drawn by the generic form.
    this.syncDecorParameterVisibility()
  }

  /**
   * Turns the observer to face the selected decor object, at the playhead's own instant.
   *
   * Placing something by typing three numbers and then hunting for it by dragging the sky is
   * unreasonable at any distance, and impossible for an aircraft: five kilometres away it is a
   * couple of pixels somewhere in a sixty-degree field. This aims straight at it.
   *
   * Goes through the same heading/pitch fields a drag does (see onCameraDragPointerMove), so it
   * keyframes the pose exactly as any other look would — turning to watch something IS part of what
   * the observer did, not a camera convenience layered on top.
   */
  /**
   * Jumps to the next meteor and turns the observer to face it.
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

  /** What the sky line was last stated from — see refreshSkyCandidates. */
  private skyCandidatesKey?: string

  /** The re-entries on record, shared by every editor of the page — see reentryClause. */
  private static readonly reentryArchive = new ReentryArchive()
  /** What was last asked of it, and its answer once it came. */
  private reentries?: { key: string; status: "loading" | "ready" | "unavailable"; candidates?: ReentryCandidate[] }

  /** How far down the brightness ranking the ☄ button has walked. Reset whenever the sky changes,
   * so a reader who edits the date is offered that night's best example rather than resuming at
   * rank seven of a shower that is no longer running. */
  private meteorRank = 0

  /** The language every label in this element is in (see loadLocaleMessages) — what dates, lists
   * and the recording's own texts are written in. */
  private showerLanguage(): UfoLanguage {
    return this.language
  }

  /** What the catalogues' entries (a shower, a comet, an instrument…) and the compass points are
   * called in that language — English until its names have arrived with its messages. */
  private naming = new SceneNaming()

  /** The language a draft's gaps are to be written in, as a language model is asked for it. */
  private static readonly LANGUAGE_NAMES: Record<UfoLanguage, string> = { en: "English", fr: "French", es: "Spanish", it: "Italian" }

  /**
   * Reads the text an author wrote into the recording — see SaidText.
   *
   * The editor shows ONE language of it, the reader's own, and writing back touches only that one
   * (SaidTexts.write): an editor open in French must not delete the English a co-author wrote, and
   * it certainly cannot translate what it was just handed. Which also means this editor is how a
   * translation gets added — open the file in the other language and type.
   */
  private said = new SaidTexts(["en"])

  /** Names tags for this author, and reads back what they type — see TagNames. English until the
   * dictionary is loaded, which is what an English author keeps. */
  private tagNames = new SightingTags({})

  /** The language this author is writing in — the same one the interface is in, since that is the
   * language they asked for. Its own key in every field they type into. */
  private get writingLanguage(): string {
    return this.showerLanguage()
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
    // Everything below is about the observation's START — its date, its place, the weather and the
    // instrument at time zero — and nothing about the playhead, yet this is reached from every
    // timeupdate, sixty times a second while the recording plays. The glow clause alone integrates
    // two lines of sight through the Galaxy and the zodiacal dust, 25 ms on a dark sky: it was half
    // of every frame of a three-hour observation, and the answer never changed. Restated only when
    // one of its inputs does.
    const key = JSON.stringify([
      date?.getTime(), place?.lat, place?.lng, this.groundElevationM, sighting.instrumentId, sighting.exposureSeconds, sighting.lightPollution,
      resolveWeatherAt(sighting, 0), this.messages.skyLine, this.meteorRankFor,
      this.sceneElement.satelliteState.status, this.satelliteSpanMs(), this.sceneElement.fireballState.status
    ])
    if (key === this.skyCandidatesKey) return
    this.skyCandidatesKey = key
    if (!date || !place || place.lat === undefined || place.lng === undefined) {
      this.showMeteorButton.hidden = true
      this.showCometButton.hidden = true
      this.showNovaButton.hidden = true
      this.showSatelliteButton.hidden = true
      this.showFireballButton.hidden = true
      this.skyCandidatesOutput.textContent = this.messages.skyLine.replace("{parts}", this.messages.skyUnknown)
      return
    }
    const observer = { lat: place.lat, lng: place.lng, elevationM: this.groundElevationM ?? 0 }
    const parts = [
      this.starsClause(date, observer),
      this.showerClause(date, observer),
      this.cometClause(date, observer),
      this.novaClause(date, observer),
      this.eclipseClause(date, observer),
      this.moonClause(date, observer),
      this.satelliteClause(date, observer),
      this.reentryClause(date, observer),
      this.fireballClause(date, observer),
      this.opticsClause(date, observer),
      this.rainbowClause(date, observer),
      this.glowClause(date, observer)
    ].filter(part => part !== undefined)
    this.skyCandidatesOutput.textContent = this.messages.skyLine.replace("{parts}", parts.join(" · "))
  }

  /**
   * How many magnitudes past a naked eye this recording's own optics reach — zero for the eye every
   * account before instruments existed here was written with.
   *
   * Read at t=0 rather than along the timeline, because this line describes the sky of the
   * observation as a whole; the scene itself asks the same question per instant, where a zoom being
   * turned really does move the answer (see SceneElement).
   */
  private instrumentGain(): number {
    const sighting = this.ufoElement.sighting
    return LimitingMagnitude.gainFor(sighting.instrument, {
      fNumber: resolveObserverPoseAt(sighting, 0)?.fNumber,
      fieldOfViewDeg: SightingShapes.fovOf(sighting, 0),
      exposureSeconds: sighting.exposure
    })
  }

  /**
   * How deep that sky went — the threshold every other clause on this line is settled against, said
   * out loud instead of being left implicit.
   *
   * It exists because the number was invisible and instrument-dependent at the same time, which is
   * the worst combination: an author who switched from the eye to an Instamatic watched two thirds
   * of the stars leave the scene with nothing anywhere saying why. The clause names the device and
   * the eye's own figure side by side, so the difference is the reading rather than the surprise.
   *
   * And it states where the DATA stops. Past magnitude 9 there is nothing more to draw, however
   * deep the lens went — a limit of what this project ships (and of HYG itself, see
   * DEEP_STAR_CATALOG_MAGNITUDE_LIMIT) rather than of the photograph, and the kind of thing a
   * reconstruction owes the reader.
   */
  private starsClause(date: Date, observer: { lat: number; lng: number; elevationM: number }): string | undefined {
    const sunAltitudeDeg = computeBodyPosition("Sun", date, observer).altitudeDeg
    const gain = this.instrumentGain()
    const skyLoss = this.skyLossAt(date, observer)
    const limit = visibleMagnitudeLimit(sunAltitudeDeg, gain, skyLoss)
    const magnitude = (value: number): string => value.toLocaleString(undefined, { maximumFractionDigits: 1 })
    // Below the brightest star there is no star left to promise, and "down to magnitude -3" says
    // the opposite of what it means to a reader.
    if (limit < BRIGHTEST_STAR_MAGNITUDE) return this.messages.skyStarsNone
    const instrument = this.ufoElement.sighting.instrument
    const stated =
      Math.abs(gain) < 0.1
        ? this.messages.skyStarsEye.replace("{limit}", magnitude(limit))
        : (gain > 0 ? this.messages.skyStarsDeeper : this.messages.skyStarsShallower)
            .replace("{limit}", magnitude(limit))
            .replace("{device}", this.naming.instrument(instrument))
            .replace("{gain}", magnitude(Math.abs(gain)))
            .replace("{eye}", magnitude(visibleMagnitudeLimit(sunAltitudeDeg, 0, skyLoss)))
    // Said only when it bites, and then always: past this the scene is drawing every star it has and
    // the photograph held more.
    return limit <= DEEP_STAR_CATALOG_MAGNITUDE_LIMIT
      ? stated
      : stated + this.messages.skyStarsCatalogue.replace("{catalogue}", magnitude(DEEP_STAR_CATALOG_MAGNITUDE_LIMIT))
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
      return this.messages.skyShowerBelowHorizon.replace("{name}", this.naming.shower(best.entry.shower))
    }
    // Only offered when there is genuinely one to show.
    this.showMeteorButton.hidden = !this.sceneElement.meteorByRank(0)
    return this.messages.skyShowerActive
      .replace("{name}", this.naming.shower(best.entry.shower))
      .replace("{altitude}", String(Math.round(best.position.altitudeDeg)))
      .replace("{bearing}", this.naming.towards(best.position.azimuthDeg))
      .replace("{rate}", best.rate.toLocaleString(undefined, { maximumFractionDigits: best.rate < 10 ? 1 : 0 }))
      .replace("{sporadic}", sporadic)
  }

  /**
   * The comet standing in that sky, if one was bright enough to be worth naming.
   *
   * Silent below naked-eye brightness, and that is the useful filter: every apparition in the
   * catalog was a naked-eye comet at its best, but its window runs two hundred days either side of
   * perihelion and for most of that it was a telescopic smudge. A magnitude-eleven comet is a fact
   * about an observatory, not a candidate for what a observer saw.
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
   * The nova or supernova shining in that sky, if one was bright enough for the naked eye.
   *
   * The brightest only, as for the comets: two overlap now and then, but never two that an eye would
   * have noticed at once. Silent below naked-eye brightness for the comets' reason, and silent
   * outside the recorded light curve, which is Novae's own rule: before the first record the star
   * may already have been rising, and nobody can say how bright.
   */
  private novaClause(date: Date, observer: { lat: number; lng: number; elevationM: number }): string | undefined {
    const nova = Novae.brightestAt(date, observer)
    if (!nova || nova.magnitude > DARK_SKY_LIMITING_MAGNITUDE) {
      this.showNovaButton.hidden = true
      return undefined
    }
    this.showNovaButton.hidden = nova.position.altitudeDeg <= 0
    return this.novaText(nova)
  }

  /**
   * Whether the Moon crossed the Sun from here that day — worked out, never declared (see SolarEclipse).
   * One line for the whole event, at its peak or at the start of totality: what plays is drawn instant
   * by instant from the same positions.
   */
  private eclipseClause(date: Date, observer: { lat: number; lng: number; elevationM: number }): string | undefined {
    const eclipse = SolarEclipse.around(date, observer)
    if (!eclipse || eclipse.peakAltitudeDeg <= 0) return undefined
    const sun = computeBodyPosition("Sun", eclipse.peak, observer)
    const where = (template: string) => template
      .replace("{altitude}", String(Math.round(sun.altitudeDeg)))
      .replace("{bearing}", this.naming.towards(sun.azimuthDeg))
    if (eclipse.totality) {
      const minutes = Math.floor(eclipse.totality.seconds / 60)
      const seconds = Math.round(eclipse.totality.seconds % 60)
      return where(this.messages.skyEclipseTotal)
        .replace("{time}", this.observerClock(eclipse.totality.begin))
        .replace("{duration}", `${minutes} min ${seconds} s`)
    }
    return where(this.messages.skyEclipsePartial)
      .replace("{percent}", String(Math.round(eclipse.obscuration * 100)))
      .replace("{time}", this.observerClock(eclipse.peak).replace(/:\d\d$/, ""))
  }

  /**
   * What is true of a full Moon that has a name in the lore, and only that: how far it is and so how
   * wide (the "supermoon", and its opposite), and which lunation it is (the "lune rousse"). Neither
   * says anything of the Moon's size on the horizon, which is the same as overhead.
   */
  private moonClause(date: Date, observer: { lat: number; lng: number; elevationM: number }): string | undefined {
    const position = computeBodyPosition("Moon", date, observer)
    if (position.altitudeDeg <= 0 || computeMoonPhase(date).illuminatedFraction < 0.97) return undefined
    const parts: string[] = []
    const distance = LunarDisc.distanceKm(date, observer)
    const relative = LunarDisc.relativeToMean(LunarDisc.radiusAtKm(distance))
    const sized = distance <= LunarDisc.SUPERMOON_DISTANCE_KM ? this.messages.skySupermoon
      : distance >= LunarDisc.MICROMOON_DISTANCE_KM ? this.messages.skyMicromoon : undefined
    if (sized) {
      parts.push(sized
        .replace("{distance}", (Math.round(distance / 100) * 100).toLocaleString(this.showerLanguage()))
        .replace("{diameter}", this.decimal(LunarDisc.radiusAtKm(distance) * 2, 3))
        .replace("{percent}", String(Math.round(Math.abs(relative) * 100))))
    }
    if (RedMoon.isIn(date)) {
      parts.push(this.messages.skyRedMoon
        .replace("{altitude}", String(Math.round(position.altitudeDeg)))
        .replace("{bearing}", this.naming.towards(position.azimuthDeg)))
    }
    return parts.length > 0 ? parts.join(" · ") : undefined
  }

  private novaText(nova: OutburstAppearance): string {
    const template = nova.position.altitudeDeg <= 0 ? this.messages.skyNovaBelowHorizon : this.messages.skyNova
    return template
      .replace("{name}", this.naming.nova(nova.outburst))
      .replace("{magnitude}", nova.magnitude.toLocaleString(undefined, { maximumFractionDigits: 1 }))
      .replace("{altitude}", String(Math.round(nova.position.altitudeDeg)))
      .replace("{bearing}", this.naming.towards(nova.position.azimuthDeg))
  }

  /**
   * Whether anything in orbit could have been seen from there — see Satellites.ts.
   *
   * Two questions, kept apart, because merging them is how this got written wrong the first time.
   * WAS IT LIT is geometry: where the Earth's shadow stood, which by day is behind the observer so
   * that everything above them is in sunlight. COULD IT BE PICKED OUT is contrast, and it is
   * settled here against the same visibleMagnitudeLimit the star field is drawn by — the identical
   * rule that lets Ikeya-Seki be drawn beside the Sun and leaves an ordinary comet out of it.
   *
   * That split is what makes a daylight Iridium flare sayable. At magnitude -8 it beat a daylit sky,
   * and people really did watch them at noon; a satellite does not need a dark observer, it needs to
   * be brighter than the sky it stands in.
   *
   * WHICH satellite is said only where the element sets of that date exist (since February 2021,
   * see realSatelliteClause); before that, an individual pass is placed by hand like an aircraft,
   * and this states the window, not the object.
   */
  private satelliteClause(date: Date, observer: { lat: number; lng: number; elevationM: number }): string | undefined {
    const sky = Satellites.visibilityAt(date, observer)
    const real = this.realSatelliteClause(sky.lowOrbitLit || sky.sunAltitudeDeg >= 0)
    if (real !== undefined) return real
    this.showSatelliteButton.hidden = true
    if (!sky.anythingInOrbit) {
      // Only worth saying against a sky somebody could have seen anything in at all.
      return sky.sunAltitudeDeg < 0 ? this.messages.skySatellitesNotYet : undefined
    }
    const magnitudeLimit = visibleMagnitudeLimit(sky.sunAltitudeDeg, this.instrumentGain(), this.skyLossAt(date, observer))
    const bright = sky.classes.filter(entry => entry.peakMagnitude <= magnitudeLimit)
    const named = this.listed(bright.map(entry => this.naming.satelliteClass(entry)))
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
   * The re-entries on record that could have been in this sky — see ReentryArchive.
   *
   * Asked for once per date, span and place, and stated when the answer arrives: the archive is a
   * file per year, fetched for the year of the recording only. A sighting of it on record is always
   * stated, since somebody saw it; a prediction or a bare decay day only after dusk, since they say
   * no more than that it fell somewhere inside the window, and in daylight nobody would have seen it.
   * At most three are named, the most precise first.
   */
  private reentryClause(date: Date, observer: { lat: number; lng: number; elevationM: number }): string | undefined {
    const start = date.getTime()
    const end = start + this.satelliteSpanMs()
    const key = [start, end, observer.lat.toFixed(3), observer.lng.toFixed(3)].join()
    if (this.reentries?.key !== key) {
      const asked: NonNullable<SightingEditorElement["reentries"]> = { key, status: "loading" }
      this.reentries = asked
      void SightingEditorElement.reentryArchive.candidates(start, end, observer).then(candidates => {
        asked.status = candidates ? "ready" : "unavailable"
        asked.candidates = candidates
        if (this.reentries !== asked) return
        this.skyCandidatesKey = undefined
        this.refreshSkyCandidates()
      })
      return undefined
    }
    if (this.reentries.status !== "ready") return undefined
    const dark = Satellites.visibilityAt(date, observer).sunAltitudeDeg < -6
    const shown = (this.reentries.candidates ?? []).filter(candidate => candidate.record.precision === "minute" || dark)
    if (shown.length === 0) return undefined
    const named = shown.slice(0, 3).map(candidate => this.reentryText(candidate))
    if (shown.length > 3) named.push(this.messages.skyReentriesMore.replace("{count}", String(shown.length - 3)))
    // Semicolons rather than a list's "and": each item is a clause with commas of its own.
    return this.messages.skyReentries.replace("{list}", named.join("; "))
  }

  private reentryText(candidate: ReentryCandidate): string {
    const { record } = candidate
    const name = record.cosparId ? `${record.name} (${record.cosparId})` : record.name
    const when = new Date(candidate.timeMs)
    if (record.precision === "day") {
      const day = when.toLocaleDateString(this.showerLanguage(), { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
      return this.messages.skyReentryDay.replace("{name}", name).replace("{date}", day)
    }
    const time = this.observerClock(when).replace(/:\d\d$/, "")
    if (record.precision === "hours") {
      return this.messages.skyReentryPredicted.replace("{name}", name).replace("{time}", time)
        .replace("{hours}", (record.uncertaintyHours ?? 0).toLocaleString(this.showerLanguage()))
    }
    const offset = candidate.offsetMinutes ? this.messages.skyReentryOffset.replace("{minutes}", String(candidate.offsetMinutes)) : ""
    if (record.seenFrom && candidate.seenKm !== undefined) {
      return this.messages.skyReentrySeen.replace("{name}", name).replace("{time}", time).replace("{place}", record.seenFrom)
        .replace("{distance}", String(Math.round(candidate.seenKm / 10) * 10)) + offset
    }
    return this.messages.skyReentryObserved.replace("{name}", name).replace("{time}", time) + offset
  }

  /**
   * Which satellites really crossed that sky, when the archive has element sets for the date — see
   * TleArchive and SatellitePasses.
   *
   * Undefined when it has nothing to add to what Satellites.ts states from the shadow alone: no
   * element sets for that date (before 2021, or unreachable), still loading, or a sky whose low orbit
   * was in shadow, where the shadow clause is already the stronger statement. `lit` says whether
   * the orbit was lit at the start at all.
   *
   * Visible means brighter than the limit of the sky at the pass's own peak, with this recording's
   * instrument: the same rule as every star, applied to a moving point.
   */
  private realSatelliteClause(lit: boolean): string | undefined {
    const state = this.sceneElement.satelliteState
    if (state.status !== "ready") return undefined
    if (state.coverage?.every(coverage => coverage.status !== "covered")) {
      this.showSatelliteButton.hidden = true
      return state.coverage.some(coverage => coverage.status === "gap") ? this.messages.skySatelliteElementsGap : undefined
    }
    const visible = this.visibleSatellitePasses()
    const reachable = visible.filter(pass => this.passTimelineMs(pass) <= this.ufoElement.seekableDuration)
    this.showSatelliteButton.hidden = reachable.length === 0
    if (visible.length === 0) return lit ? this.messages.skySatellitePassesNone : undefined
    const brightest = visible[0]
    const peak = brightest.peak
    const template = visible.length === 1 ? this.messages.skySatellitePassesOne : this.messages.skySatellitePasses
    const sentence = template
      .replace("{count}", String(visible.length))
      .replace("{name}", peak.object.name)
      .replace("{magnitude}", peak.magnitude!.toLocaleString(undefined, { maximumFractionDigits: 1 }))
      .replace("{altitude}", String(Math.round(peak.altitudeDeg)))
      .replace("{bearing}", this.naming.towards(peak.azimuthDeg))
      .replace("{time}", this.observerClock(peak.date))
    const train = this.starlinkTrain(visible)
    return train ? `${sentence}, ${train}` : sentence
  }

  /**
   * The passes of this observation bright enough to be seen, brightest first. A pass with no known
   * brightness is left out: it may well have been visible, and saying so would be a guess.
   */
  private visibleSatellitePasses(): SatellitePass[] {
    const gain = this.instrumentGain()
    const observer = this.observerAtStart()
    return this.sceneElement.satellitePassesDuring(this.satelliteSpanMs())
      .filter(pass => {
        const magnitude = pass.peak.magnitude
        if (magnitude === undefined) return false
        const sun = computeBodyPosition("Sun", pass.peak.date, observer)
        return magnitude <= visibleMagnitudeLimit(sun.altitudeDeg, gain, this.skyLossAt(pass.peak.date, observer))
      })
      .sort((a, b) => a.peak.magnitude! - b.peak.magnitude!)
  }

  /** A group of Starlinks still close to their launch, which fly low and in a line: the train. */
  private starlinkTrain(passes: SatellitePass[]): string | undefined {
    const byLaunch = new Map<string, number>()
    for (const pass of passes) {
      const { kind, launch } = pass.peak.object
      if (kind !== "starlink" || !launch) continue
      const days = (pass.peak.date.getTime() - Date.parse(`${launch}T00:00:00Z`)) / 86_400_000
      if (days > 60) continue
      byLaunch.set(launch, (byLaunch.get(launch) ?? 0) + 1)
    }
    const [launch, count] = [...byLaunch.entries()].sort((a, b) => b[1] - a[1])[0] ?? []
    if (!launch || !count || count < 3) return undefined
    const date = new Date(`${launch}T00:00:00Z`).toLocaleDateString(this.showerLanguage(), { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
    return this.messages.skySatelliteTrain.replace("{count}", String(count)).replace("{date}", date)
  }

  /** How much of the observation the passes are looked for in: the declared duration, or what the
   * timeline reaches if that is longer. */
  private satelliteSpanMs(): number {
    const declared = (this.ufoElement.sighting.event.durationSeconds ?? 0) * 1000
    return Math.max(declared, this.ufoElement.seekableDuration)
  }

  private observerAtStart(): { lat: number; lng: number; elevationM: number } {
    const place = this.ufoElement.sighting.event.place?.[0]
    const pose = resolveObserverPoseAt(this.ufoElement.sighting, 0)
    return { lat: pose?.lat ?? place?.lat ?? 0, lng: pose?.lng ?? place?.lng ?? 0, elevationM: this.groundElevationM ?? 0 }
  }

  /** Where a pass's peak falls on the timeline — the same offset from the start the scene uses. */
  private passTimelineMs(pass: SatellitePass): number {
    const sighting = this.ufoElement.sighting
    const start = sightingTimeToDate(sighting.event.time ?? {}, this.observerAtStart().lng, sighting.event.utcOffsetHours)
    return start ? pass.peak.date.getTime() - start.getTime() : Infinity
  }

  /** An instant on the observer's own clock, which is what the rest of this recording is written in. */
  private observerClock(date: Date): string {
    const sighting = this.ufoElement.sighting
    const offsetHours = sighting.event.utcOffsetHours ?? Math.round(this.observerAtStart().lng / 15)
    return new Date(date.getTime() + offsetHours * 3_600_000)
      .toLocaleTimeString(this.showerLanguage(), { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "UTC" })
  }

  /**
   * Seeks to the next brightest satellite the timeline reaches, at its peak, and turns the observer
   * to it — the meteor button's behaviour, for the same reason: a satellite is somewhere for a
   * minute, not for the whole recording.
   */
  private showNextSatellite(): void {
    const reachable = this.visibleSatellitePasses().filter(pass => this.passTimelineMs(pass) <= this.ufoElement.seekableDuration)
    if (reachable.length === 0) return
    const ranking = reachable.map(pass => `${pass.object.norad}@${pass.peak.date.getTime()}`).join()
    if (ranking !== this.satelliteRankFor) {
      this.satelliteRankFor = ranking
      this.satelliteRank = 0
    }
    const pass = reachable[this.satelliteRank++ % reachable.length]
    if (this.ufoElement.playbackState === "playing") this.ufoElement.togglePlayPause()
    this.ufoElement.currentTime = this.passTimelineMs(pass)
    this.headingInput.value = String(Math.round(pass.peak.azimuthDeg * 10) / 10)
    this.pitchInput.value = String(Math.round(pass.peak.altitudeDeg * 10) / 10)
    this.updateObserver()
  }

  private satelliteRankFor?: string
  private satelliteRank = 0

  /**
   * The fireballs a camera network recorded during this observation that were striking from here —
   * above the horizon and brighter than STRIKING_MAGNITUDE at their peak — brightest first. See
   * FireballArchive; loaded by the scene, which draws them.
   */
  private strikingFireballs(date: Date, observer: { lat: number; lng: number; elevationM: number }): FireballSighting[] {
    return this.sceneElement.fireballState.records
      .map(record => FireballArchive.seenFrom(record, { lat: observer.lat, lng: observer.lng, heightM: observer.elevationM }))
      .filter((seen): seen is FireballSighting => seen !== undefined && seen.magnitude <= FireballArchive.STRIKING_MAGNITUDE)
      .filter(seen => seen.record.t >= date.getTime())
      .sort((a, b) => a.magnitude - b.magnitude)
  }

  /** Where a fireball's peak falls on the timeline: its start, plus how far along it peaked. */
  private fireballTimelineMs(seen: FireballSighting, date: Date): number {
    const { record } = seen
    const span = record.from[2] - record.to[2]
    const f = Math.abs(span) < 1e-6 ? 0.5 : Math.min(1, Math.max(0, (record.from[2] - record.peakHeightKm) / span))
    return record.t - date.getTime() + f * record.durationS * 1000
  }

  /**
   * The fireballs on record during the observation — see strikingFireballs. Silent when there were
   * none, or the archive does not reach that date: the network covers some skies and not others, so
   * its silence is no statement.
   */
  private fireballClause(date: Date, observer: { lat: number; lng: number; elevationM: number }): string | undefined {
    const seen = this.sceneElement.fireballState.status === "ready" ? this.strikingFireballs(date, observer) : []
    this.showFireballButton.hidden = !seen.some(fireball => this.fireballTimelineMs(fireball, date) <= this.ufoElement.seekableDuration)
    if (seen.length === 0) return undefined
    const brightest = seen[0]
    const template = seen.length === 1 ? this.messages.skyFireballsOne : this.messages.skyFireballs
    return template
      .replace("{count}", String(seen.length))
      .replace("{magnitude}", brightest.magnitude.toLocaleString(this.showerLanguage(), { maximumFractionDigits: 1 }))
      .replace("{time}", this.observerClock(new Date(brightest.record.t)))
      .replace("{altitude}", String(Math.round(brightest.peak.altitudeDeg)))
      .replace("{bearing}", this.naming.towards(brightest.peak.azimuthDeg))
      .replace("{distance}", String(Math.round(brightest.peak.distanceKm / 10) * 10))
      .replace("{stations}", String(brightest.record.stations ?? 2))
  }

  /** Seeks to the next brightest fireball the timeline reaches, at its peak, and turns the observer
   * to it — the satellite button's behaviour. */
  private showNextFireball(): void {
    const sighting = this.ufoElement.sighting
    const place = sighting.event.place?.[0]
    const time = sighting.event.time
    if (!place || place.lng === undefined || !time) return
    const date = sightingTimeToDate(time, place.lng, sighting.event.utcOffsetHours)
    if (!date) return
    const reachable = this.strikingFireballs(date, this.observerAtStart())
      .filter(fireball => this.fireballTimelineMs(fireball, date) <= this.ufoElement.seekableDuration)
    if (reachable.length === 0) return
    const fireball = reachable[this.fireballRank++ % reachable.length]
    if (this.ufoElement.playbackState === "playing") this.ufoElement.togglePlayPause()
    this.ufoElement.currentTime = this.fireballTimelineMs(fireball, date)
    this.headingInput.value = String(Math.round(fireball.peak.azimuthDeg * 10) / 10)
    this.pitchInput.value = String(Math.round(fireball.peak.altitudeDeg * 10) / 10)
    this.updateObserver()
  }

  private fireballRank = 0

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
   * The two diffuse glows a dark sky has in it — see SkyGlowVisibility.
   *
   * THE ZODIACAL LIGHT IS WHY THIS IS HERE. It is a leaning cone of light standing where the Sun
   * went down, with no edge, no motion, and no name that a first-time observer has for it; it is
   * gone before midnight; and the manuals have been listing it as a source of reports for as long as
   * there have been manuals. A report of a strange glow in the west an hour after sunset deserves to
   * be told whether that was the sky's own.
   *
   * SILENT BY DAY, and only by day. The rule sits between the ice line's (always speak, because
   * nobody can tell by looking whether there was cirrus at eight kilometres) and the bow's (speak
   * only when it rained, because everybody knows whether it rained). Nobody can tell from a case
   * file whether the galactic plane was standing up that night — so once the Sun is far enough down
   * for the question to be live, it gets answered either way, and the negative answers name what was
   * in the way rather than just saying no.
   */
  private glowClause(date: Date, observer: { lat: number; lng: number; elevationM: number }): string | undefined {
    const sun = computeBodyPosition("Sun", date, observer)
    // Civil twilight not yet over: there is no sky here to have a glow in, and saying so on every
    // daylight sighting in the archive would be noise.
    if (sun.altitudeDeg > GLOW_QUESTION_LIVE_BELOW_DEG) return undefined
    const seen = this.glows.assess(date, observer, this.ufoElement.sighting.lightPollution)
    const stated: string[] = []
    if (seen.milkyWay) {
      stated.push(
        this.messages.skyGlowBand
          .replace("{contrast}", this.decimal(seen.milkyWay.contrast, 1))
          .replace("{altitude}", String(Math.round(seen.milkyWay.altitudeDeg)))
          .replace("{bearing}", this.naming.towards(seen.milkyWay.azimuthDeg))
      )
    }
    if (seen.zodiacal) {
      // The cone standing over the sunset, or the band running on round the rest of the ecliptic:
      // the same dust, but only the first is a sight anybody reports, and calling the second one a
      // cone would be describing something that was not there.
      const isCone = seen.zodiacal.sunSeparationDeg <= SkyGlowVisibility.CONE_SEPARATION_DEG
      stated.push(
        (isCone ? this.messages.skyGlowCone : this.messages.skyGlowZodiacalBand)
          .replace("{contrast}", this.decimal(seen.zodiacal.contrast, 1))
          .replace("{altitude}", String(Math.round(seen.zodiacal.altitudeDeg)))
          .replace("{bearing}", this.naming.towards(seen.zodiacal.azimuthDeg))
          .replace("{elongation}", String(Math.round(seen.zodiacal.sunSeparationDeg)))
      )
    }
    if (stated.length > 0) return this.listed(stated)
    const sky = this.decimal(seen.darkestSkyMagPerArcsec2, 1)
    // Which of them was in the way, and the order matters: a sky the Moon is holding up is a sky
    // that would have been dark enough otherwise, and that is the more useful thing to know.
    const moon = computeBodyPosition("Moon", date, observer)
    const skyIsTheProblem = seen.darkestSkyMagPerArcsec2 < GLOW_NEEDS_SKY_MAG_PER_ARCSEC2
    // The towns and the Moon both hold a sky up; the one named is the one that put more light in it,
    // at the zenith where both are known. A Moon just risen under a city's glow is not the reason.
    const lightPollution = this.ufoElement.sighting.lightPollution
    const moonlight = NightSkyBrightness.scatteringAt(90 - moon.altitudeDeg) *
      NightSkyBrightness.moonOutput(NightSkyBrightness.phaseAngleOf(computeMoonPhase(date).illuminatedFraction), moon.altitudeDeg) *
      NightSkyBrightness.scatteredFraction(90)
    const townsOutshineMoon = NightSkyBrightness.artificialZenithNanolamberts(lightPollution) > moonlight
    if (skyIsTheProblem && moon.altitudeDeg > 0 && !townsOutshineMoon) {
      const lit = Math.round(computeMoonPhase(date).illuminatedFraction * 100)
      return this.messages.skyGlowMoon.replace("{lit}", String(lit)).replace("{sky}", sky)
    }
    // The same question asked of the twilight: the towns are named when they put more light in the
    // sky than what is left of the Sun's (see Sighting.lightPollution).
    const townsOutshineTwilight =
      NightSkyBrightness.artificialZenithNanolamberts(lightPollution) > NightSkyBrightness.twilightExcessNanolamberts(sun.altitudeDeg)
    if (skyIsTheProblem && townsOutshineMoon && townsOutshineTwilight) {
      return this.messages.skyGlowTowns.replace("{sky}", sky)
    }
    if (skyIsTheProblem) return this.messages.skyGlowTwilight.replace("{sky}", sky)
    return this.messages.skyGlowNothingUp.replace("{sky}", sky)
  }

  /**
   * What the Moon and the towns took off the faintest star an eye could see then and there — see
   * NightSkyBrightness.starLossMagnitudes. The same figure the scene draws its stars by.
   */
  private skyLossAt(date: Date, observer: { lat: number; lng: number; elevationM: number }): number {
    const sun = computeBodyPosition("Sun", date, observer)
    const moon = computeBodyPosition("Moon", date, observer)
    return NightSkyBrightness.starLossMagnitudes(sun.altitudeDeg, {
      phaseAngleDeg: NightSkyBrightness.phaseAngleOf(computeMoonPhase(date).illuminatedFraction),
      altitudeDeg: moon.altitudeDeg
    }, this.ufoElement.sighting.lightPollution)
  }

  /** One sweep of the sky, kept between restatements: it holds nothing about a date or a place, and
   * building a new one on every keystroke would throw away the anchor it works out on first use. */
  private readonly glows = new SkyGlowVisibility()

  /**
   * Names one bow, with the radius it stands at and how high its top reached.
   *
   * The height is the number worth having, and it is the one a observer's account can be checked
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
    const name = this.naming.comet(comet.apparition)
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
      .replace("{bearing}", this.naming.towards(comet.position.azimuthDeg))
      .replace("{tail}", String(Math.round(comet.tailLengthDeg ?? 0)))
      .replace("{elongation}", String(Math.round(comet.elongationDeg)))
  }

  /**
   * Turns the observer to face the comet.
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

  /** Turns the observer to face the nova, the comet's way: no seek, no pause, it shone all night. */
  private lookAtNova(): void {
    const sighting = this.ufoElement.sighting
    const place = sighting.event.place?.[0]
    const time = sighting.event.time
    if (!place || place.lat === undefined || place.lng === undefined || time?.year === undefined) return
    const date = sightingTimeToDate(time, place.lng, sighting.event.utcOffsetHours)
    if (!date) return
    const nova = Novae.brightestAt(date, { lat: place.lat, lng: place.lng, elevationM: this.groundElevationM ?? 0 })
    if (!nova) return
    this.headingInput.value = String(this.rounded(nova.position.azimuthDeg))
    this.pitchInput.value = String(this.rounded(nova.position.altitudeDeg))
    this.updateObserver()
  }

  /** Names the compass point the heading field holds, beside its degree sign, in the reader's own
   * letters (SSO in French). Only the sign when the heading is unknown: no point is better than a
   * made-up north. */
  private refreshHeadingPoint(): void {
    const headingDeg = this.numberOrUndefined(this.headingInput.value)
    this.headingUnit.textContent = headingDeg === undefined ? "°" : `° (${this.naming.point(headingDeg)})`
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
    // Nothing to aim at: the object is exactly where the observer stands.
    if (horizontalM === 0 && altitudeM === 0) return
    const headingDeg = (Math.atan2(eastM, northM) * 180) / Math.PI
    const pitchDeg = (Math.atan2(altitudeM - EYE_HEIGHT_M, horizontalM) * 180) / Math.PI
    this.headingInput.value = String(Math.round(headingDeg * 10) / 10)
    this.pitchInput.value = String(Math.round(pitchDeg * 10) / 10)
    this.updateObserver()
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
   * `<rr0-ufo>`'s own approach.
   *
   * ONE decision for the interface, the tag names, the language the recording's texts are read in
   * (said) and the one they are written back in (writingLanguage). Those were three: the messages
   * decided here at construction, `said` cached on first read (in the constructor too), and the
   * writing language re-read from the page on every keystroke. An editor created by
   * `document.createElement` and then put in a `lang="en"` page therefore read and showed the
   * French account, and wrote what the author typed over it under "en". Read again on connection
   * (see connectedCallback), nowhere else. */
  private async loadLocaleMessages(): Promise<void> {
    const token = ++this.localeToken
    const preferences = HostLocale.preferencesFor(this)
    this.preferences = preferences
    const language = selectLocale(preferences, UFO_SUPPORTED_LANGUAGES) as UfoLanguage
    // The provider's own settings too, alongside: applyMessages renders them.
    const localizing = this.narrativeProvider.localize?.(language)
    const [messages, tagNames, sceneNames] = language === "en"
      ? [sightingEditorMessages_en, {}, undefined]
      : await Promise.all([loadSightingEditorMessages(language), loadTagNames(language), loadSceneNames(language)])
    await localizing
    // Superseded by a later decision (the editor was connected while this one was loading).
    if (token !== this.localeToken) return
    const changed = language !== this.language
    this.language = language
    this.naming = new SceneNaming(sceneNames)
    this.said = new SaidTexts(preferences)
    // Before the messages, because applyMessages rebuilds the summary with it — see TagNames.
    this.tagNames = new SightingTags(tagNames)
    if (messages !== this.messages) {
      this.applyMessages(messages)
    } else {
      // Same interface language, but perhaps a longer list behind it ("en", then "es"): the
      // summary reads the recording's texts through the new one.
      this.paramSummaryBuilder = new SightingSummary(messages, this.naming, this.said, this.tagNames, { messages, locale: this.language })
      this.refreshParamSummary()
    }
    // Every field and list showing the recording's own texts showed them through the previous
    // decision, and would write them back under the new one: show them again. (A recording loaded
    // before this resolved is showing its tags in English, at the very least.)
    if (changed) this.showSaidTexts()
    else this.showTags()
  }

  /** The reader's languages as loadLocaleMessages last read them — what connectedCallback compares
   * against to tell whether being put somewhere changed the answer. */
  private preferences: readonly string[] = []

  /** The language the interface is in, as loadLocaleMessages last decided it. */
  private language: UfoLanguage = "en"

  /** Drops a language decision that resolved after a later one was taken. */
  private localeToken = 0

  /** Refills whatever shows a SaidText — the same refreshes a newly loaded recording gets (see
   * sightingData), which are the ones that read through `said`. */
  private showSaidTexts(): void {
    this.refreshSourceList()
    this.refreshDecorList()
    this.refreshReferenceList()
    this.refreshMilestoneList()
    this.onSelectionOrTimeChanged()
    this.syncObserverMetadataFields()
  }

  /** The recording's tags in the author's own words, in the field they edit them in — stored in
   * English, shown translated where a translation exists (see TagNames). */
  private showTags(): void {
    this.tagsInput.value = this.ufoElement.sighting.event.tags?.map(tag => this.tagNames.name(tag)).join(", ") ?? ""
  }

  private applyMessages(messages: SightingEditorMessages): void {
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
    this.shapeAddMenu.setKinds([{ value: "oval", label: messages.oval }, { value: "polygon", label: messages.polygon }])
    this.contextAddVertexButton.textContent = messages.addVertex
    this.contextDeleteVertexButton.textContent = messages.deleteVertex
    this.labelColor.textContent = messages.color
    this.labelTransparency.textContent = messages.transparency
    this.labelHalo.textContent = messages.halo
    this.labelBlur.textContent = messages.blur
    this.labelBrightness.textContent = messages.brightness
    this.sourceSelect.setAttribute("aria-label", messages.shape)
    this.shadow.getElementById("shape-empty")!.textContent = messages.emptyShapes
    this.labelShapeTitle.textContent = messages.shapeTitle
    this.labelUtcOffset.textContent = messages.utcOffset
    this.utcOffsetInput.placeholder = messages.utcOffsetPlaceholder
    this.labelApparentWidth.textContent = messages.apparentWidth
    this.labelRealWidth.textContent = messages.realWidth
    this.labelObjectDistance.textContent = messages.distance
    this.labelSizeLock.textContent = messages.sizeLock
    for (const [id, text] of [
      ["option-lock-none", messages.lockNone],
      ["option-lock-apparent", messages.lockApparent],
      ["option-lock-real", messages.lockReal],
      ["option-lock-distance", messages.lockDistance]
    ] as const) {
      this.shadow.getElementById(id)!.textContent = text
    }
    this.clearDistanceHypothesisButton.textContent = messages.clearDistanceHypothesis
    this.clearDistanceHypothesisButton.title = messages.clearDistanceHypothesisTitle
    // The read-back is a formatted sentence, not a static label — re-rendered rather than
    // assigned, so switching language refreshes the numbers already shown.
    this.refreshApparentSize()
    this.labelSamplingRate.textContent = messages.samplingRate
    this.labelDuration.textContent = messages.duration
    this.shadow.getElementById("label-account-view")!.textContent = messages.accountView
    this.accountViewSelect.options[0].textContent = messages.accountView2d
    this.accountViewSelect.options[1].textContent = messages.accountView3d
    this.accountViewSelect.title = messages.accountViewHint
    this.durationInput.placeholder = messages.durationPlaceholder
    this.durationElement.messages = messages
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
    this.frozenPanel.localize(messages)
    this.sectionFilePanel.localize(messages)
    this.shadow.getElementById("observer-identity-hint")!.textContent = messages.identityHint
    this.shadow.getElementById("identity-ask-initials")!.textContent = messages.identityInitials
    this.shadow.getElementById("identity-ask-keep")!.textContent = messages.identityKeep
    this.shadow.getElementById("identity-ask-back")!.textContent = messages.identityBack
    this.labelImportFile.textContent = messages.importFile
    this.importInput.placeholder = messages.importUrlPlaceholder
    for (const input of this.shadow.querySelectorAll<InputFileElement>(INPUT_FILE_ELEMENT_NAME)) input.messages = messages
    this.labelObserverAge.textContent = messages.observerAge
    this.labelObserverBirth.textContent = messages.observerBirth
    this.perceptionSettings.labels = messages.observerPerception
    this.labelObserverOccupation.textContent = messages.observerOccupation
    this.labelAccountSource.textContent = messages.accountSource
    this.labelAccountUrl.textContent = messages.accountUrl
    this.labelAccountFollowedUp.textContent = messages.accountFollowedUp
    for (const [id, text] of [
      ["option-source-unknown", messages.accountSourceUnknown],
      ["option-source-on-site", messages.accountSourceOnSite],
      ["option-source-interview", messages.accountSourceInterview],
      ["option-source-telephone", messages.accountSourceTelephone],
      ["option-source-questionnaire", messages.accountSourceQuestionnaire],
      ["option-source-letter", messages.accountSourceLetter],
      ["option-source-social-media", messages.accountSourceSocialMedia],
      ["option-source-press", messages.accountSourcePress],
      ["option-followed-unknown", messages.accountUnknown],
      ["option-followed-yes", messages.accountYes],
      ["option-followed-no", messages.accountNo]
    ] as const) {
      const option = this.shadow.getElementById(id)
      if (option) option.textContent = text
    }
    this.labelNarrativeSource.textContent = messages.narrativeSource
    this.renderNarrativeSettings()
    this.labelNarrativeRemember.textContent = messages.narrativeRemember
    this.narrativeStopButton.textContent = messages.narrativeStop
    this.narrativeDraftButton.textContent = messages.narrativeDraft
    this.descriptionInput.placeholder = messages.narrativePlaceholder
    // The tooltip is built from these too, so it has to be said again in the new language.
    this.syncNarrativeEnabled()
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
    this.labelRoll.textContent = messages.roll
    this.labelSway.textContent = messages.sway
    this.swayInput.title = messages.swayTitle
    this.labelLightPollution.textContent = messages.lightPollution
    this.lightPollutionInput.title = messages.lightPollutionTitle
    this.syncLightPollutionStatus()
    this.labelElevation.textContent = messages.elevation
    this.labelObservationTime.textContent = messages.observationTime
    this.labelObservationEndTime.textContent = messages.observationEndTime
    this.obsTimeInput.placeholder = messages.edtfPlaceholder
    this.startDate.hint = messages.observationTimeHint
    this.obsEndTimeInput.placeholder = messages.edtfPlaceholder
    this.endDate.hint = messages.observationEndTimeHint
    this.shapeAddMenu.panel.setAttribute("aria-label", messages.presetsGroupLabel)
    this.labelDecorGroup.textContent = messages.decor
    this.decorList.setKinds([
      { value: "building", label: messages.decorBuilding }, { value: "tree", label: messages.decorTree }, { value: "shrub", label: messages.decorShrub },
      { value: "bridge", label: messages.decorBridge }, { value: "wire", label: messages.decorWire }, { value: "crop", label: messages.decorCrop },
      { value: "terrace", label: messages.decorTerrace }, { value: "mound", label: messages.decorMound }, { value: "wall", label: messages.decorWall },
      { value: "streetlight", label: messages.decorStreetlight }, { value: "trafficlight", label: messages.decorTrafficLight },
      { value: "crossing", label: messages.decorCrossing }, { value: "roadsign", label: messages.decorRoadSign }, { value: "vehicle", label: messages.decorVehicle },
      { value: "aircraft", label: messages.decorAircraft }, { value: "entity", label: messages.decorEntity },
      // Added from its own button (the Observer group's): not offered here, but still named, for the label of one that is there.
      { value: "observer", label: messages.decorObserver, hidden: true }
    ])
    this.decorList.setLabels({ list: messages.decor, remove: messages.deleteDecor, add: messages.addDecor, empty: messages.emptyDecor, actions: { "look-at-decor": messages.lookAtDecor } })
    this.showMeteorButton.title = messages.showMeteor
    this.showMeteorButton.setAttribute("aria-label", messages.showMeteor)
    this.showCometButton.title = messages.showComet
    this.showCometButton.setAttribute("aria-label", messages.showComet)
    this.showNovaButton.title = messages.showNova
    this.showNovaButton.setAttribute("aria-label", messages.showNova)
    this.showSatelliteButton.title = messages.showSatellite
    this.showSatelliteButton.setAttribute("aria-label", messages.showSatellite)
    this.showFireballButton.title = messages.showFireball
    this.showFireballButton.setAttribute("aria-label", messages.showFireball)
    this.undoButton.title = messages.undo
    this.undoButton.setAttribute("aria-label", messages.undo)
    this.redoButton.title = messages.redo
    this.redoButton.setAttribute("aria-label", messages.redo)
    this.contextViewAccountButton.textContent = messages.viewAccount
    // The arrow is appended here, not part of the translated string — see SightingEditorMessages.
    // masks's own doc comment.
    this.labelContextMasks.textContent = `${messages.masks} ▸`
    this.observerList.setLabels({ list: messages.observerGroup, remove: messages.deleteObserver, add: messages.addObserver,
      actions: { "look-at-observer": messages.lookAtDecor } })
    this.refreshObserverList()
    this.surroundings.setMessages(messages)
    this.labelScenerySource.textContent = messages.surveySource
    this.labelSceneryRadius.textContent = messages.surveyRadius
    this.sceneryRadius.title = messages.surveyRadiusTitle
    this.scenerySource.title = messages.surveySourceTitle
    const noScenery = this.shadow.getElementById("option-scenery-none")
    if (noScenery) noScenery.textContent = messages.surveySourceNone
    this.sceneryStatus.setAttribute("aria-label", messages.surveyLabel)
    this.refreshSceneryWarning()
    this.labelMilestones.textContent = messages.milestones
    this.labelMilestoneLabel.textContent = messages.milestoneLabel
    this.labelMilestoneNote.textContent = messages.milestoneNote
    this.shadow.getElementById("milestone-empty")!.textContent = messages.emptyMilestones
    for (const [button, text] of [[this.addMilestoneButton, messages.addMilestone], [this.goToMilestoneButton, messages.goToMilestone], [this.deleteMilestoneButton, messages.deleteMilestone]] as const) {
      button.title = text
      button.setAttribute("aria-label", text)
    }
    this.decorParameterForm.setLanguage(this.language)
    this.decorBaseForm.setLanguage(this.language)
    this.decorStateForm.setLanguage(this.language)
    this.refreshDecorList() // decor option labels embed decorKindSelect's own text, just updated above
    this.labelObserverId.textContent = messages.observerId
    this.labelObserverTitle.textContent = messages.observerTitle
    this.labelObserverLastName.textContent = messages.observerLastName
    this.labelObserverFirstNames.textContent = messages.observerFirstNames
    this.observerFirstNamesInput.placeholder = messages.tagsPlaceholder
    this.labelSightingId.textContent = messages.sightingId
    this.labelDescription.textContent = messages.description
    this.labelTags.textContent = messages.tags
    this.tagsInput.placeholder = messages.tagsPlaceholder
    this.labelShapeGroup.textContent = messages.shapeGroup
    this.labelShapesSubgroup.textContent = messages.shapesSubgroup
    this.labelBodiesSubgroup.textContent = messages.bodiesSubgroup
    this.labelLaunchesSubgroup.textContent = messages.launchesSubgroup
    this.labelBeamsSubgroup.textContent = messages.beamsSubgroup
    for (const group of ["location", "decor", "weather"]) {
      const button = this.shadow.getElementById(`${group}-settings-button`)
      button?.setAttribute("title", messages.dataSources)
      button?.setAttribute("aria-label", messages.dataSources)
      const title = this.shadow.getElementById(`label-${group}-settings`)
      if (title) title.textContent = messages.dataSources
    }
    this.bodyEditor?.setLanguage(this.language)
    void this.launchEditor?.setLanguage(this.language)
    void this.beamEditor?.setLanguage(this.language)
    this.labelTemporalGroup.textContent = messages.temporalGroup
    this.labelFileGroup.textContent = messages.fileGroup
    this.labelLocationGroup.textContent = messages.locationGroup
    this.labelObservationGroup.textContent = messages.observationGroup
    this.labelObserverGroup.textContent = messages.observerTab
    // The group's own handle now carries the caption that used to stand inside it, so the one
    // message serves both and "Circumstances" — which never named what the group actually holds —
    // is gone.
    this.labelWeatherGroup.textContent = messages.sky
    this.startDate.messages = messages
    this.endDate.messages = messages
    this.birthDate.messages = messages
    // The chips hold translated labels, so they are rebuilt with the new ones — and the signature
    // check lets that happen without a diff, since every label changed.
    this.paramSummaryBuilder = new SightingSummary(messages, this.naming, this.said, this.tagNames, { messages, locale: this.language })
    this.refreshParamSummary()
    this.labelCloudCover.textContent = messages.cloudCover
    this.labelHighCloud.textContent = messages.highCloudCover
    this.labelIceAlignment.textContent = messages.iceCrystalAlignment
    this.labelRareIce.textContent = messages.rareIceCrystals
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
    this.labelCloudsGroup.textContent = messages.cloudsGroup
    this.labelPrecipitationGroup.textContent = messages.precipitationGroup
    this.labelWindGroup.textContent = messages.windGroup
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
    this.labelReferenceGroup.textContent = messages.referenceGroup
    this.referenceSelect.setAttribute("aria-label", messages.reference)
    this.shadow.getElementById("reference-empty")!.textContent = messages.emptyReferences
    this.shadow.getElementById("reference-landmark-empty")!.textContent = messages.emptyReferenceLandmarks
    this.shadow.getElementById("trace-empty")!.textContent = messages.emptyTraces
    this.labelReferenceTitle.textContent = messages.referenceTitle
    this.labelReferenceSrc.textContent = messages.referenceSrc
    this.referenceSourceInput.placeholder = messages.referenceSrcPlaceholder
    this.labelReferenceKind.textContent = messages.referenceKind
    this.referenceKindSelect.querySelector<HTMLOptionElement>("#reference-kind-photo")!.textContent = messages.referencePhoto
    this.referenceKindSelect.querySelector<HTMLOptionElement>("#reference-kind-panorama")!.textContent = messages.referencePanorama
    this.labelReferenceCredit.textContent = messages.referenceCredit
    this.labelReferenceCreditUrl.textContent = messages.referenceCreditUrl
    this.labelReferenceT.textContent = messages.referenceT
    this.labelReferenceDrawing.textContent = messages.referenceDrawing
    this.labelReferenceOpacity.textContent = messages.referenceOpacity
    this.labelReferenceHeading.textContent = messages.referenceHeading
    this.labelReferencePitch.textContent = messages.referencePitch
    this.labelReferenceRoll.textContent = messages.referenceRoll
    this.labelReferenceFov.textContent = messages.referenceFov
    this.referenceUsePoseButton.textContent = messages.referenceUsePose
    // Where the picture to add comes from, picked before the "+" that adds it (see the Pictures group's template).
    this.setReferenceAddKinds(messages.addReferenceUrl, messages.addReferenceFile, messages.referenceStreetSearch)
    this.addReferenceButton.title = messages.addReference
    this.addReferenceButton.setAttribute("aria-label", messages.addReference)
    this.referenceAddMenu.panel.setAttribute("aria-label", messages.addReference)
    this.deleteReferenceButton.title = messages.deleteReference
    this.deleteReferenceButton.setAttribute("aria-label", messages.deleteReference)
    this.labelReferenceLandmarks.textContent = messages.referenceLandmarks
    this.addReferenceLandmarkButton.title = messages.addReferenceLandmark
    this.addReferenceLandmarkButton.setAttribute("aria-label", messages.addReferenceLandmark)
    this.deleteReferenceLandmarkButton.title = messages.deleteReferenceLandmark
    this.deleteReferenceLandmarkButton.setAttribute("aria-label", messages.deleteReferenceLandmark)
    this.labelReferenceLandmarkLabel.textContent = messages.referenceLandmarkLabel
    this.referenceLandmarkLabelInput.placeholder = messages.referenceLandmarkLabelPlaceholder
    this.referenceAdoptPoseButton.textContent = messages.referenceAdoptPose
    this.labelTraceImport.textContent = messages.traceImport
    this.traceSelect.setAttribute("aria-label", messages.trace)
    this.addTraceButton.title = messages.traceImport
    this.addTraceButton.setAttribute("aria-label", messages.traceImport)
    this.labelTraceTitle.textContent = messages.traceTitle
    this.labelTraceSource.textContent = messages.traceSource
    this.deleteTraceButton.title = messages.deleteTrace
    this.deleteTraceButton.setAttribute("aria-label", messages.deleteTrace)
    this.refreshTraceList()
    this.referenceStreetAddButton.textContent = messages.referenceStreetAdd
    for (const [kind, option] of this.soundKindOptions) option.textContent = this.soundKindLabel(kind, messages)
    this.labelInstrument.textContent = messages.instrument
    this.labelFilter.textContent = messages.filter
    this.refreshFilterOptions()
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
    const mode = this.canvasMode()
    if (mode === "picture") {
      if (this.ufoElement.playbackState !== "playing") this.beginReferenceDrag(point)
      return
    }
    if (mode === "body") {
      if (this.ufoElement.playbackState === "playing") return
      if (!this.beginBodyHandleDrag(point) && !this.beginBodyDrag(event)) {
        // Not the selected body's own to grab: what the tooltip names there is what a click on it selects, another body or the
        // scenery, where the press used to do nothing but turn the view — and once a craft was selected, nothing else could be.
        const ndc = this.decorMoveAxis(event) === "ground" ? this.ndcOf(event) : undefined
        const target = ndc ? this.sceneElement.pickAt(ndc.x, ndc.y) : undefined
        this.beginCameraDrag(point, target?.kind === "decor" ? target.id : undefined, target?.kind === "body" ? target.id : undefined)
      }
      return
    }
    // A key held down with the press (Shift, Ctrl, Alt, Cmd) says "not the scenery": the press then turns the view, as over bare ground,
    // whatever stands under it — which is what lets the view be turned from over a forest, where every press lands on a tree.
    const moveAxis = this.decorMoveAxis(event)
    if (mode === "decor" && moveAxis && this.ufoElement.playbackState !== "playing" && this.beginDecorDrag(event, point, moveAxis)) return
    const timeline = this.ufoElement.sighting.timeline
    const t = this.ufoElement.currentTime
    const playing = this.ufoElement.playbackState === "playing"
    // Handles and moves are the Phenomenon group's own — see canvasMode.
    const shapeMode = mode === "shape"

    if (!shapeMode) {
      // Nothing to grab: a click still finds what is under it, below.
    } else if (this.selectedSourceIds.size > 1) {
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

    // The PICTURE, not the instant: a pose long enough draws the object all along its path, and a
    // click on the streak that answered "nothing there" fell straight through to dragging the
    // landscape — which is exactly what an object with a ten-second pose did (see
    // UfoElement.shapeAt). Nothing is excluded: an occluded shape is still the author's to select.
    const hit = this.ufoElement.shapeAt(point.x, point.y, EMPTY_SOURCE_IDS)
    if (!hit) {
      // No shape under the pointer — try a decor object next (a plain click, not the right-click
      // context menu's own pickDecorAt call) so clicking a building/tree/vehicle in the 3D scene
      // selects it in the Decor fieldset, the same way clicking a shape selects it in the Shape
      // one. Only reached once a shape hit is already ruled out, matching the same "shape wins"
      // precedent as SceneElement's own hover tooltip (a shape is painted on top of decor, so it
      // should win a click there too).
      // What a click selects is what the tooltip names (see SceneElement.pickAt): a craft on its platform is the craft, where the
      // platform under it was what the click used to find.
      const targetNdc = moveAxis === "ground" ? this.ndcOf(event) : undefined
      const target = targetNdc ? this.sceneElement.pickAt(targetNdc.x, targetNdc.y) : undefined
      if (target?.kind === "body" && target.id !== undefined) {
        if (playing) this.showBody(target.id)
        else this.beginCameraDrag(point, undefined, target.id)
        return
      }
      const decorId = target?.kind === "decor" ? target.id : undefined
      if (decorId !== undefined) {
        // A tree line or a building fills much of the lower view, and the view has to turn from over
        // it too: the press starts the same drag as over bare ground, and only a press released
        // without moving is taken as the click that selects it (see endDrag) — and opens the
        // Environment group, where the object is framed and carried, as a click on a shape opens its own.
        if (playing) {
          this.selectDecor(decorId)
          this.revealDecorPanel()
        } else this.beginCameraDrag(point, decorId)
        return
      }
      // Nothing at all under the pointer to select/move — the "landscape" itself becomes the drag
      // target instead of this being a no-op, letting a observer set their own heading/pitch by
      // dragging the sky/ground the same way they'd drag a shape. Selection is left untouched.
      if (!playing) this.beginCameraDrag(point)
      return
    }
    // Whatever the click then does to the selection, it lands you on the panel that describes what
    // you clicked — the summary strip no longer carries a shape's appearance, so the shape itself
    // is the way to its own fields. The same move the Environment panel has always made when a
    // building is clicked (see selectDecor).
    this.revealShapePanel()
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
    // From another group, the click has done its work: it landed on the shape's own panel, where
    // the next one moves it (see canvasMode).
    if (playing || !shapeMode) return
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

  /** Opens the Bodies part of the Phenomenon group on a body clicked on the picture — the same move the summary's chip makes. */
  private showBody(id: string): void {
    // With the text on show, the body is shown there, where it is written, as a decor object or a shape is: the group stays.
    if (this.fileSyncActive()) {
      this.showInFile(this.bodyPath(id))
      return
    }
    this.revealShapePanel()
    const tab = this.subgroupTabs.find(candidate => candidate.getAttribute("aria-controls") === "shape-bodies")
    if (tab) this.openSubgroup(tab)
    void this.loadBodyEditor().then(editor => editor.show(id))
  }

  /** Opens the Environment panel, where the decor object just clicked is framed and edited — idempotent,
   * as revealShapePanel is, and found by the panel it controls for the same reason. */
  private revealDecorPanel(): void {
    // The text is open: what was clicked is framed where it is, and its text shown (see showInFile), not its panel.
    if (this.fileSyncActive()) {
      this.fileFocus = "decor"
      this.syncCanvasMode()
      return
    }
    const tab = this.groupTabs.find(candidate => candidate.getAttribute("aria-controls") === "group-decor")
    if (tab) this.toggleGroup(tab, true)
  }

  /** Opens the Phenomenon panel, whichever one is open — idempotent, so a click on a shape while
   * it is already open changes nothing. Found by the panel it controls rather than by its index on
   * the strip: the strip's order is markup, and an index would go quietly wrong the day a group is
   * inserted before it. */
  private revealShapePanel(): void {
    if (this.fileSyncActive()) {
      this.fileFocus = "shape"
      this.syncCanvasMode()
      return
    }
    const tab = this.groupTabs.find(candidate => candidate.getAttribute("aria-controls") === "group-shape")
    if (tab) {
      this.toggleGroup(tab, true)
    }
    // A shape is picked on the image: its fields are in the Shapes part, not under the bodies.
    const shapes = this.subgroupTabs.find(candidate => candidate.getAttribute("aria-controls") === "shape-shapes")
    if (shapes) this.openSubgroup(shapes)
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
    if (this.isGroupIdOpen("group-file")) this.fileFocus = "shape"
    this.refreshSourceList()
    this.onSelectionOrTimeChanged()
    this.showInFile(this.shapePath(sourceId))
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
   * a observer right-clicking the sky shouldn't see the page's ordinary menu either), but only
   * shows ours when there's an actual shape to act on. */
  /** Right-clicking a 2D shape opens the SHAPE menu (group/ungroup/reorder/delete); right-clicking
   * a observer decor object — which lives in the 3D scene BEHIND the 2D canvas, not on it — opens
   * the separate DECOR menu instead (currently just "view account"). Both start from the same
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
    const hit = hitVertex
      ? { sourceId: this.currentSourceId, shape: selectedShape! }
      : this.ufoElement.shapeAt(point.x, point.y, EMPTY_SOURCE_IDS)
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
    // Every kind, not just "observer" (this menu's original and, until now, only reason to open —
    // see showDecorContextMenu's own doc comment) — the "Masks" flyout applies just as much to a
    // building/tree/streetlight/vehicle as to another observer marker.
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
    // Disabled only while recording or playing now: the last shape may go (see deleteShape).
    this.contextDeleteButton.title = ""

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

  /** composedPath(), not event.target, for the same reason SightingElement's own info-panel
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
   * separate menu from the SHAPE one rather than folding a observer-only item into it. */
  private showDecorContextMenu(clientX: number, clientY: number, decor: DecorObject): void {
    this.contextMenuDecorId = decor.id
    this.decorContextMenu.style.left = `${clientX}px`
    this.decorContextMenu.style.top = `${clientY}px`
    this.decorContextMenu.hidden = false
    this.contextViewAccountButton.disabled = !decor.sightingUrl
    this.contextViewAccountButton.title = decor.sightingUrl ? "" : this.messages.noObserverRecording
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
    const sourceIds = [...this.ufoElement.sighting.timeline.sourceIds]
    const bodies = this.ufoElement.sighting.interpretation?.bodies ?? []
    if (sourceIds.length === 0 && bodies.length === 0) {
      const none = document.createElement("span")
      none.className = "submenu-empty"
      none.textContent = this.messages.masksNone
      this.contextMasksSubmenu.appendChild(none)
    }
    for (const sourceId of sourceIds) {
      const label = document.createElement("label")
      const checkbox = document.createElement("input")
      checkbox.type = "checkbox"
      checkbox.checked = decor.occludesSourceIds?.includes(sourceId) ?? false
      checkbox.addEventListener("change", () => this.updateDecorOccludesShape(decor.id, sourceId, checkbox.checked))
      label.appendChild(checkbox)
      label.appendChild(document.createTextNode(this.shapeLabel(sourceId)))
      this.contextMasksSubmenu.appendChild(label)
    }
    // A body is placed in the scene, so whether this object stands in front of it is not a choice but a fact of where each stands: told, not ticked.
    for (const body of bodies) {
      const share = this.sceneElement.bodyMaskedBy(body.id, decor.id)
      if (share === undefined) continue
      const row = document.createElement("span")
      row.className = "submenu-empty submenu-fact"
      const name = this.said.read(body.title) ?? body.id
      const m = this.messages
      row.textContent = `${name} — ${share >= 0.995 ? m.masksBodyFully : share > 0.005 ? m.masksBodyPartly.replace("{share}", String(Math.round(share * 100))) : m.masksBodyNot}`
      this.contextMasksSubmenu.appendChild(row)
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

  /** Loads the right-clicked observer's own sighting.json — replacing this recording entirely,
   * same as typing its URL into the Observation group's "load from URL" field and clicking Load
   * (see importFromUrl, reused here with an explicit url rather than reading importUrlInput). */
  private viewObserverAccount(): void {
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
    this.commitShapes(t, [{ sourceId: this.currentSourceId, shape: updated }])
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
    this.commitShapes(t, [{ sourceId: this.currentSourceId, shape: updated }])
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
  /** Where a pointer event stands on the picture, in normalised device coordinates. */
  private ndcOf(event: MouseEvent): { x: number; y: number } | undefined {
    const rect = this.ufoElement.canvasElement.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return undefined
    return { x: ((event.clientX - rect.left) / rect.width) * 2 - 1, y: -(((event.clientY - rect.top) / rect.height) * 2 - 1) }
  }

  /** The direction from the observer a point of the picture names, as an azimuth and an elevation
   * (the scene's axes: x east, y up, z south). */
  private skyDirectionOf(event: MouseEvent): { azimuthDeg: number; altitudeDeg: number } | undefined {
    const ndc = this.ndcOf(event)
    if (!ndc) return undefined
    const d = this.sceneElement.directionAt(ndc.x, ndc.y)
    return {
      azimuthDeg: ((Math.atan2(d.x, -d.z) * 180) / Math.PI + 360) % 360,
      altitudeDeg: (Math.asin(Math.max(-1, Math.min(1, d.y))) * 180) / Math.PI
    }
  }

  /**
   * Grabs the body under the pointer, if one is there: it is put on show in the Bodies part, and
   * moving the pointer moves it (see onBodyDragPointerMove). What the drag keeps is where it was
   * grabbed: the body moves by as much as the pointer turns, rather than jumping its middle under
   * the pointer. False when there is no body there to grab.
   */
  private beginBodyDrag(event: PointerEvent): boolean {
    const ndc = this.ndcOf(event)
    const editor = this.bodyEditor
    const id = ndc && editor ? this.sceneElement.pickPlacedBodyAt(ndc.x, ndc.y) : undefined
    if (!id || !editor) return false
    editor.show(id)
    const reading = editor.readingNow()
    const pointer = this.skyDirectionOf(event)
    if (!reading || !pointer) return false
    this.dragState = {
      kind: "body",
      pointerAzimuthDeg: pointer.azimuthDeg,
      pointerAltitudeDeg: pointer.altitudeDeg,
      bodyAzimuthDeg: reading.azimuthDeg,
      bodyAltitudeDeg: reading.altitudeDeg
    }
    this.setCanvasCursor("move")
    this.startDragListening()
    return true
  }

  private onBodyDragPointerMove(event: PointerEvent): void {
    const drag = this.dragState
    if (drag?.kind !== "body") return
    const pointer = this.skyDirectionOf(event)
    if (!pointer) return
    // The shorter way round: across north, 359° to 1° is two degrees, not 358.
    const turn = ((pointer.azimuthDeg - drag.pointerAzimuthDeg + 540) % 360) - 180
    this.bodyEditor?.dragTo(drag.bodyAzimuthDeg + turn, drag.bodyAltitudeDeg + pointer.altitudeDeg - drag.pointerAltitudeDeg)
  }

  /** The frame the body on show covers on the canvas, in canvas pixels — what its handles are
   * drawn round (see paintBodyOverlay) and hit-tested against. */
  private bodyCanvasBounds(): ShapeBounds | undefined {
    const id = this.bodyEditor?.currentBodyId
    return this.canvasBoundsOf(id === undefined ? undefined : this.sceneElement.bodyScreenBox(id))
  }

  /** A frame on the picture (normalised device coordinates) as canvas pixels, never smaller than a
   * few handles across. */
  private canvasBoundsOf(box: { minX: number, minY: number, maxX: number, maxY: number } | undefined): ShapeBounds | undefined {
    if (!box) return undefined
    const canvas = this.ufoElement.canvasElement
    // Never smaller than a few handles across: a craft a hundred metres off is a few pixels, and
    // its eight handles laid over each other grabbed the bottom one for a corner.
    const width = Math.max(MIN_BODY_FRAME_PX, ((box.maxX - box.minX) / 2) * canvas.width)
    const height = Math.max(MIN_BODY_FRAME_PX, ((box.maxY - box.minY) / 2) * canvas.height)
    const centreX = ((box.minX + box.maxX) / 2 + 1) / 2 * canvas.width
    const centreY = (1 - (box.minY + box.maxY) / 2) / 2 * canvas.height
    return { x: centreX - width / 2, y: centreY - height / 2, width, height }
  }

  /** The body on show, framed with the shapes' own handles: corners to size it as a whole, sides to
   * stretch it level, top and bottom to raise it, the stem to turn it. */
  private readonly paintBodyOverlay = (renderer: CanvasRenderer): void => {
    const bounds = this.bodyCanvasBounds()
    if (bounds) renderer.paintGroupHandles(bounds)
  }

  /**
   * Grabs a handle of the body on show, if the press is on one: a corner sizes it as a whole, a
   * side stretches it level (width and length), the top or bottom raises it, each by how much
   * further from its middle the pointer goes; the rotation handle turns it about the vertical as
   * the pointer goes left or right, as the landscape turns under a drag (see beginCameraDrag), and
   * with Shift held pitches it as the pointer goes up or down and rolls it as it goes sideways.
   */
  private beginFrameDrag(target: FrameTarget, point: { x: number; y: number }): boolean {
    const bounds = target.bounds()
    const reading = target.reading()
    if (!bounds || !reading) return false
    const handle = ShapeHandles.hitTestHandle({ bounds, angle: 0 }, point)
    if (!handle) return false
    if (handle === "rotate") {
      this.dragState = { kind: "frame-rotate", target, startPointer: point, startAttitude: { ...reading.attitude } }
    } else {
      const centre = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }
      this.dragState = { kind: "frame-resize", target, handle, centre, startPointer: point, startSizeM: { ...reading.sizeM } }
    }
    this.setCanvasCursor(this.cursorForHandle(handle, 0))
    this.startDragListening()
    return true
  }

  private beginBodyHandleDrag(point: { x: number; y: number }): boolean {
    return this.beginFrameDrag(this.bodyFrame, point)
  }

  private onFrameDragPointerMove(event: PointerEvent): void {
    const drag = this.dragState
    const point = this.canvasPointFromEvent(event)
    if (!point || !drag) return
    if (drag.kind === "frame-rotate") {
      // From the attitude it was grabbed at, every move: pressing or letting go of Shift mid-drag
      // switches axes without the thing jumping by what the other axis had been given.
      const dx = (point.x - drag.startPointer.x) * drag.target.rotateDegPerPx
      const dy = (drag.startPointer.y - point.y) * drag.target.rotateDegPerPx
      const start = drag.startAttitude
      drag.target.turnTo(event.shiftKey
        ? { headingDeg: start.headingDeg, pitchDeg: start.pitchDeg + dy, rollDeg: start.rollDeg + dx }
        : { headingDeg: start.headingDeg + dx, pitchDeg: start.pitchDeg, rollDeg: start.rollDeg })
      return
    }
    if (drag.kind !== "frame-resize") return
    const { centre, startPointer, startSizeM, handle } = drag
    const ratio = (now: number, then: number) => Math.max(0.05, Math.abs(now) / Math.max(1, Math.abs(then)))
    const horizontal = handle === "e" || handle === "w"
    const vertical = handle === "n" || handle === "s"
    const factor = horizontal ? ratio(point.x - centre.x, startPointer.x - centre.x)
      : vertical ? ratio(point.y - centre.y, startPointer.y - centre.y)
      : ratio(Math.hypot(point.x - centre.x, point.y - centre.y), Math.hypot(startPointer.x - centre.x, startPointer.y - centre.y))
    drag.target.resize({
      widthM: vertical ? startSizeM.widthM : startSizeM.widthM * factor,
      lengthM: vertical ? startSizeM.lengthM : startSizeM.lengthM * factor,
      heightM: horizontal ? startSizeM.heightM : startSizeM.heightM * factor
    })
  }

  /** The body on show, as a frame to size and turn. */
  private readonly bodyFrame: FrameTarget = {
    bounds: () => this.bodyCanvasBounds(),
    reading: () => this.bodyEditor?.readingNow(),
    resize: sizeM => this.bodyEditor?.resize(sizeM),
    turnTo: attitude => this.bodyEditor?.turnTo(attitude),
    rotateDegPerPx: CAMERA_DRAG_DEG_PER_PX
  }

  /** The selected decor object, as a frame to size and turn. Its sizes are what the fields state, or
   * else what it is drawn at; it turns about the vertical only, so a pitch or a roll is dropped. */
  private readonly decorFrame: FrameTarget = {
    bounds: () => this.decorCanvasBounds(),
    reading: () => this.decorReading(),
    resize: sizeM => this.commitDecorBase(view => {
      Object.assign(view, { sizeM: { widthM: this.roundedMeters(sizeM.widthM), lengthM: this.roundedMeters(sizeM.lengthM), heightM: this.roundedMeters(sizeM.heightM) } })
    }, "sizeM.widthM"),
    turnTo: attitude => this.commitDecorBase(view => {
      view.headingDeg = this.rounded(((attitude.headingDeg % 360) + 360) % 360)
    }, "headingDeg"),
    rotateDegPerPx: DECOR_ROTATE_DEG_PER_PX
  }

  /** The selected object as the frame reads it: the sizes it states, or else those it is drawn at (a size none states is a metre). */
  private decorReading(): { sizeM: { widthM: number, lengthM: number, heightM: number }, attitude: { headingDeg: number, pitchDeg: number, rollDeg: number } } | undefined {
    const decor = this.editableDecor()
    if (decor === undefined) return undefined
    const natural = DecorSystem.naturalSize(decor.kind, decor.floors)
    return {
      sizeM: { widthM: decor.sizeM?.widthM ?? natural.widthM ?? 1, lengthM: decor.sizeM?.lengthM ?? natural.lengthM ?? 1, heightM: decor.sizeM?.heightM ?? natural.heightM ?? 1 },
      attitude: { headingDeg: DecorBase.viewOf(decor, this.ufoElement.currentTime).headingDeg, pitchDeg: 0, rollDeg: 0 }
    }
  }

  /** The wheel over a body takes it nearer or further, a tenth a notch; elsewhere it does what it
   * did (see onReferenceWheel). */
  private onBodyWheel(event: WheelEvent): void {
    if (this.canvasMode() !== "body" || this.ufoElement.playbackState === "playing") return
    const ndc = this.ndcOf(event)
    const editor = this.bodyEditor
    const id = ndc && editor ? this.sceneElement.pickPlacedBodyAt(ndc.x, ndc.y) : undefined
    if (!id || !editor) return
    event.preventDefault()
    editor.show(id)
    editor.scaleDistance(Math.exp(Math.sign(event.deltaY) * 0.1))
  }

  /** The selected decor object, when the mouse may handle it: not while the observer is inside it,
   * where the picture is its inside. */
  private editableDecor(): DecorObject | undefined {
    const decor = this.ufoElement.sighting.decor.find(d => d.id === this.currentDecorId)
    return decor && decor.observerSide === undefined ? decor : undefined
  }

  /** The frame the selected decor object covers on the canvas, in canvas pixels. */
  private decorCanvasBounds(): ShapeBounds | undefined {
    const decor = this.editableDecor()
    return decor ? this.canvasBoundsOf(this.sceneElement.decorScreenBox(decor.id)) : undefined
  }

  /** The selected decor object framed with the shapes' own handles, as a body is: corners to size
   * it as a whole, sides to stretch it level, top and bottom to raise it, the stem to turn it. */
  private readonly paintDecorOverlay = (renderer: CanvasRenderer): void => {
    const bounds = this.decorCanvasBounds()
    if (bounds) renderer.paintGroupHandles(bounds)
  }

  /** What a size field states, or else what the object is drawn at (its placeholder). */
  /**
   * Whether a press at this point takes the selected decor object, to carry it: on the object itself, or
   * anywhere in the frame drawn round it that no other object covers. The frame is what the author sees as "the
   * object", and a tree is a thin trunk and a cone inside it: a press in its corner finds the ground behind, which
   * is itself an object here (a terrace), and used to turn the view instead of carrying the tree. Another object
   * in front of it (a nearer tree) still takes the press, as it would be selected by it.
   */
  /**
   * What a press does to the selected decor object, from the key held with it: nothing held carries it
   * over the ground; Shift only east-west, Alt only north-south, Ctrl only up and down; Cmd (or two keys
   * at once) is not for the object at all, the press then turns the view as over bare ground — which is
   * also what lets the view be turned from over a forest, where every press lands on a tree.
   */
  private decorMoveAxis(event: { shiftKey: boolean, ctrlKey: boolean, altKey: boolean, metaKey: boolean }): DecorMoveAxis | undefined {
    if (event.metaKey) return undefined
    const held = [event.shiftKey, event.altKey, event.ctrlKey].filter(Boolean).length
    if (held > 1) return undefined
    if (event.shiftKey) return "east"
    if (event.altKey) return "north"
    if (event.ctrlKey) return "up"
    return "ground"
  }

  private grabsDecor(event: PointerEvent, point: { x: number, y: number }, decor: DecorObject): boolean {
    const picked = this.pickDecorAt(event)
    if (picked === decor.id) return true
    const frame = this.decorCanvasBounds()
    const inFrame = frame !== undefined && point.x >= frame.x && point.x <= frame.x + frame.width && point.y >= frame.y && point.y <= frame.y + frame.height
    if (!inFrame) return false
    return picked === undefined || this.ufoElement.sighting.decor.find(candidate => candidate.id === picked)?.kind === "terrace"
  }

  /**
   * Starts a manipulation of the selected decor object when the press is on it: a handle sizes or
   * turns it (see beginFrameDrag), the object itself is carried across the ground. A press anywhere
   * else is not taken (false), and turns the view or selects as it always did — which is also why
   * only the SELECTED object is carried: a tree line must still let the view be turned from over it.
   */
  private beginDecorDrag(event: PointerEvent, point: { x: number; y: number }, axis: DecorMoveAxis): boolean {
    const decor = this.editableDecor()
    if (!decor) return false
    if (this.beginFrameDrag(this.decorFrame, point)) return true
    // A shape is painted over the scenery: a press on one in front of the selected object is for the shape, as the pointer says.
    if (this.ufoElement.shapeAt(point.x, point.y, EMPTY_SOURCE_IDS)) return false
    if (!this.grabsDecor(event, point, decor)) return false
    const ndc = this.ndcOf(event)
    const start = DecorBase.viewOf(decor, this.ufoElement.currentTime)
    const grabHeightM = ndc ? this.sceneElement.decorGrabHeightAt?.(decor.id, ndc.x, ndc.y) ?? 0 : 0
    const ground = ndc && this.sceneElement.decorGroundPointAt(decor.id, ndc.x, ndc.y, grabHeightM)
    if (!ndc || !ground) return false
    this.dragState = {
      kind: "decor-move", id: decor.id, startGround: ground, grabHeightM, axis,
      startAltitudeM: start.altitudeM, startNdcY: ndc.y,
      metresPerNdcY: this.sceneElement.decorMetresPerNdcY?.(decor.id) ?? 0,
      startEastM: start.eastM, startNorthM: start.northM
    }
    this.setCanvasCursor("move")
    this.startDragListening()
    return true
  }

  private onDecorMovePointerMove(event: PointerEvent): void {
    const drag = this.dragState
    if (drag?.kind !== "decor-move") return
    const ndc = this.ndcOf(event)
    if (!ndc) return
    const ground = this.sceneElement.decorGroundPointAt(drag.id, ndc.x, ndc.y, drag.grabHeightM)
    if (!ground && drag.axis !== "up") return
    // x is east and z is south: the ground moved by the pointer, from where it was grabbed.
    this.commitDecorBase(view => {
      if (ground && (drag.axis === "ground" || drag.axis === "east")) view.eastM = this.roundedMeters(drag.startEastM + ground.x - drag.startGround.x)
      if (ground && (drag.axis === "ground" || drag.axis === "north")) view.northM = this.roundedMeters(drag.startNorthM - (ground.z - drag.startGround.z))
      if (drag.axis === "up") view.altitudeM = this.roundedMeters(drag.startAltitudeM + (ndc.y - drag.startNdcY) * drag.metresPerNdcY)
    }, "eastM")
  }

  private beginCameraDrag(startPointer: { x: number; y: number }, pressedDecorId?: string, pressedBodyId?: string): void {
    const insideDecor = this.isObserverInsideDecor()
    this.cameraDragState = {
      pressedDecorId,
      pressedBodyId,
      moved: false,
      startPointer,
      startHeadingDeg: insideDecor ? this.indoorLookYawDeg : (this.numberOrUndefined(this.headingInput.value) ?? 0),
      startPitchDeg: insideDecor ? this.indoorLookPitchDeg : (this.numberOrUndefined(this.pitchInput.value) ?? 0),
      insideDecor
    }
    // The compass reads the OUTSIDE observerTrack heading — meaningless while looking around
    // inside a decor object (a different reference frame, see SceneRenderer.setIndoorLook), so
    // it's only forced visible for an outside drag.
    if (!insideDecor) this.sceneElement.setCompassForced(true)
    // The only drag whose cursor differs from the hover cursor that led to it: hovering empty
    // canvas offers the landscape to grab ("pan"), pressing actually closes the hand on it.
    this.setCanvasCursor("panning")
    this.startDragListening()
  }

  /** Whether the recording observer is currently positioned inside a decor object — see
   * DecorObject.observerSide's own doc comment. Mirrors SceneRenderer.updateDecorAnchoring's own
   * `inhabited` lookup exactly (same canHoldObserver gate) so this always agrees with which view
   * is actually being rendered. */
  private isObserverInsideDecor(): boolean {
    return this.ufoElement.sighting.decor.some(d => d.observerSide !== undefined && canHoldObserver(d.kind))
  }

  /** Resets indoorLookYawDeg/PitchDeg (and pushes the reset into SceneRenderer) whenever which
   * decor object/side is inhabited changes — a different window, or no longer inside one at all,
   * should always start centered rather than carrying over wherever the observer last happened to
   * be looking through a DIFFERENT window. Called every tick from onSelectionOrTimeChanged, same
   * "cheap enough not to need a dedicated dedup trigger" reasoning as syncDecorLitFromTimeline —
   * the string comparison below is what actually dedupes, so most ticks are a no-op. */
  private syncIndoorLookReset(): void {
    const inhabited = this.ufoElement.sighting.decor.find(d => d.observerSide !== undefined && canHoldObserver(d.kind))
    const key = inhabited ? `${inhabited.id}:${inhabited.observerSide}` : undefined
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
    if (this.referenceDragState) {
      this.onReferenceDragPointerMove(event)
      return
    }
    if (this.dragState?.kind === "body") {
      this.onBodyDragPointerMove(event)
      return
    }
    if (this.dragState?.kind === "frame-resize" || this.dragState?.kind === "frame-rotate") {
      this.onFrameDragPointerMove(event)
      return
    }
    if (this.dragState?.kind === "decor-move") {
      this.onDecorMovePointerMove(event)
      return
    }
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
      this.commitShapes(t, shapes)
    } else if (this.dragState.kind === "group-resize") {
      const { group, handle } = this.dragState
      this.commitShapes(t, group.resize(handle, point))
    } else if (this.dragState.kind === "group-rotate") {
      const { group, startPointer } = this.dragState
      this.commitShapes(t, group.rotate(point, startPointer))
    } else if (this.dragState.kind === "vertex") {
      const { sourceId, original, vertexIndex } = this.dragState
      const shape = ShapeHandles.moveVertex(original, vertexIndex, point)
      this.commitShapes(t, [{ sourceId, shape }])
    } else {
      const { kind, sourceId, original, handle } = this.dragState
      const shape = kind === "resize" ? ShapeHandles.resizeShape(original, handle, point) : ShapeHandles.rotateShape(original, point)
      this.commitShapes(t, [{ sourceId, shape }])
    }
    this.ufoElement.refresh()
  }

  private onCameraDragPointerMove(event: PointerEvent): void {
    if (!this.cameraDragState) return
    const point = this.canvasPointFromEvent(event)
    if (!point) return
    const { startPointer, startHeadingDeg, startPitchDeg, insideDecor } = this.cameraDragState
    // A click's own jitter must not turn the view, or clicking a building would nudge the heading.
    if (!this.cameraDragState.moved) {
      if (Math.hypot(point.x - startPointer.x, point.y - startPointer.y) < CAMERA_DRAG_CLICK_TOLERANCE_PX) return
      this.cameraDragState.moved = true
    }
    // Computed from the fixed drag-start reference every time, not incrementally frame-to-frame —
    // see cameraDragState's own doc comment on why (avoids drift and misbehaving at the 360->0
    // heading wrap). Left/right drags the view right/left (a "grab the sky and pan it" feel);
    // up/down looks up/down, matching pitchDeg's own "positive = above horizontal" convention.
    const headingDeg = startHeadingDeg + (point.x - startPointer.x) * CAMERA_DRAG_DEG_PER_PX
    const pitchDeg = Math.max(-90, Math.min(90, startPitchDeg - (point.y - startPointer.y) * CAMERA_DRAG_DEG_PER_PX))
    if (insideDecor) {
      // Never touches observerTrack/updateObserver — a different reference frame entirely (the
      // observer's real OUTSIDE recorded gaze), see SceneRenderer.setIndoorLook's own doc comment.
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
    if (this.referenceDragState) {
      this.endReferenceDrag()
      return
    }
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
    const t = this.ufoElement.currentTime
    const members = this.selectedMembers()
    if (members.length === 0) return
    event.preventDefault() // arrow keys otherwise scroll the page
    if (members.length === 1) {
      const { sourceId, shape } = members[0]
      // Writes straight through, spreading the original shape's appearance fields unchanged —
      // same reasoning as onDragPointerMove's own identical comment.
      this.commitShapes(t, [{ sourceId, shape: { ...shape, bounds: this.nudgeBounds(shape.bounds, event) } }])
    } else {
      const group = new ShapeGroup(members)
      const target = this.nudgeBounds(group.bounds(), event)
      this.commitShapes(t, group.scaleTo(target))
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
    const mode = this.canvasMode()
    const timeline = this.ufoElement.sighting.timeline
    const t = this.ufoElement.currentTime
    const editable = this.ufoElement.playbackState !== "playing"
    if (mode === "picture") return editable ? "pan" : undefined
    if (mode === "body") {
      const bounds = editable ? this.bodyCanvasBounds() : undefined
      const handle = bounds && ShapeHandles.hitTestHandle({ bounds, angle: 0 }, point)
      if (handle) return this.cursorForHandle(handle, 0)
      const ndc = this.ndcOf(event)
      const over = ndc && this.bodyEditor ? this.sceneElement.pickPlacedBodyAt(ndc.x, ndc.y) : undefined
      return editable && over ? "move" : editable ? "pan" : undefined
    }
    if (mode === "decor" && editable && this.decorMoveAxis(event)) {
      const bounds = this.decorCanvasBounds()
      const handle = bounds && ShapeHandles.hitTestHandle({ bounds, angle: 0 }, point)
      if (handle) return this.cursorForHandle(handle, 0)
      const selected = this.editableDecor()
      if (selected && !this.ufoElement.shapeAt(point.x, point.y, EMPTY_SOURCE_IDS) && this.grabsDecor(event, point, selected)) return "move"
    }
    const shapeMode = mode === "shape"
    if (editable && shapeMode) {
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
    if (timeline.hitTest(t, point.x, point.y)) return editable && shapeMode ? "move" : "select"
    // Over decor the view still turns by dragging (see the canvas's pointerdown), and a click still
    // selects it: the hand says the first, as it does over bare ground.
    if (this.pickDecorAt(event) !== undefined) return editable ? "pan" : "select"
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

/** Which message heads each group of the draft report — see showNarrativeReport. */
const BASIS_HEADINGS = {
  stated: "narrativeStated",
  derived: "narrativeDerived",
  assumed: "narrativeAssumed"
} as const satisfies Record<Basis, keyof SightingEditorMessages>

export const ELEMENT_NAME = "rr0-sighting-editor"

/**
 * What this element was called until 0.42.0, still registered and still working.
 *
 * "Recorder" had stopped describing it. Recording — the button and its sampling rate — is one
 * control among some fifty, and everything else in the project already called this thing an
 * editor: the page is "the editor", the button says Export, the documentation page is "create an
 * observation". It was also the last tag still carrying "ufo" as its subject, next to the
 * <rr0-sighting> it edits.
 *
 * Kept because pages were loading it under this name before the new one existed, and a rename
 * that breaks them punishes whoever used the thing early.
 */
export const LEGACY_ELEMENT_NAME = "rr0-ufo-recorder"

/** Only so that the legacy name has a constructor of its own to be defined with: customElements
 * refuses the same class twice, and there is nothing to add. */
class LegacyRecorderElement extends SightingEditorElement {
}

export function register(): void {
  registerDateInput()
  registerInputFile()
  registerPopoverPicker()
  registerProviderSettings()
  registerDurationInput()
  registerUfo()
  if (!customElements.get(ELEMENT_NAME)) {
    customElements.define(ELEMENT_NAME, SightingEditorElement)
  }
  if (!customElements.get(LEGACY_ELEMENT_NAME)) {
    customElements.define(LEGACY_ELEMENT_NAME, LegacyRecorderElement)
  }
}
