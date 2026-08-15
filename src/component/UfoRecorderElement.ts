import { html, css } from "./template.js"
import { UfoElement, registerUfo } from "./UfoElement.js"
import { SceneElement, registerScene, SCENE_ELEMENT_NAME } from "./SceneElement.js"
import { Recorder } from "../engine/record/Recorder.js"
import { RafSamplingClock } from "../engine/record/SamplingClock.js"
import { createShape, moveShapeTo } from "../engine/shape/Shape.js"
import { ApparentSize } from "../engine/shape/ApparentSize.js"
import type { Appearance, PolygonShape, Shape, ShapeBounds, ShapePresetId } from "../engine/shape/Shape.js"
import { ShapeHandles, ShapeGroup, MIN_SHAPE_SIZE, MIN_POLYGON_VERTICES } from "../engine/shape/ShapeHandles.js"
import type { HandleId, ResizeAxis } from "../engine/shape/ShapeHandles.js"
import type { SightingRecordingJson } from "../engine/persistence/sightingJson.js"
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
  resolveWeatherAt,
  resolveObserverPoseAt
} from "../engine/model/Sighting.js"
import type { SightingTime } from "../engine/model/Sighting.js"
import { selectLocale } from "../i18n/locale.js"
import { loadUfoRecorderMessages, UFO_SUPPORTED_LANGUAGES } from "./messages/index.js"
import type { UfoLanguage } from "./messages/index.js"
import { ufoRecorderMessages_en } from "./messages/UfoRecorderMessages_en.js"
import type { UfoRecorderMessages } from "./messages/UfoRecorderMessages.js"

registerUfo()
registerScene()

const DEFAULT_SHAPE_SIZE = { width: 48, height: 28 }
/** Mouse-drag-to-look sensitivity for the "landscape drag" — see beginCameraDrag. A full drag
 * across the canvas's own 640px internal width is ~130deg, a reasonable full sweep without being
 * so twitchy that fine-tuning a heading/pitch by hand becomes fiddly. */
const CAMERA_DRAG_DEG_PER_PX = 0.2
/** The vertical field of view every pose this recorder writes declares — matching
 * ObserverPose.fovDeg's own default. Also what the apparent-size math projects through whenever a
 * recording has no pose of its own yet (see currentFovDeg), so the two can never disagree. */
const WITNESS_FOV_DEG = 60

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
   * its on-screen size computable instead of eyeballed (see ApparentSize/updatePhysicalExtent).
   * apparentSizeOutput reads back what they actually produce. */
  private readonly utcOffsetInput: HTMLInputElement
  private readonly objectSizeInput: HTMLInputElement
  private readonly objectDistanceInput: HTMLInputElement
  private readonly apparentSizeOutput: HTMLElement
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
  private readonly latInput: HTMLInputElement
  private readonly lngInput: HTMLInputElement
  private readonly headingInput: HTMLInputElement
  private readonly pitchInput: HTMLInputElement
  private readonly elevationInput: HTMLInputElement
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
  // View preferences, not sighting data — unlike stormInput/weather's other fields, neither is
  // read by getWeather()/restored from a loaded sighting; they just directly set SceneElement's
  // own lens-flare-brightness/lens-flare-intensity attributes. Kept as two independent continuous
  // dials (brightness in Circumstances, camera/video-device artifact strength in Witness — whether
  // and how strongly the witness happened to be looking through a camera/video device, which is
  // what actually produces lens-flare artifacts) rather than one — see SceneRenderer.
  // setDazzleIntensity/setLensFlareArtifactIntensity's own doc comments on why: comparing the
  // *same* reported brightness naked-eye (cameraDeviceInput at 0) against how a camera would have
  // captured it (above 0) only works if brightness itself doesn't also change when the artifact
  // strength changes.
  private readonly lensFlareBrightnessInput: HTMLInputElement
  private readonly cameraDeviceInput: HTMLInputElement
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
  private readonly labelCloudDarkness: HTMLElement
  private readonly labelCloudBase: HTMLElement
  private readonly labelPrecipitationType: HTMLElement
  private readonly labelPrecipitationIntensity: HTMLElement
  private readonly labelWindDirection: HTMLElement
  private readonly labelWindSpeed: HTMLElement
  private readonly labelStorm: HTMLElement
  private readonly labelLensFlareBrightness: HTMLElement
  private readonly labelCameraDevice: HTMLElement
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
      // event.composedPath()[0] (not event.target, which retargets across shadow boundaries, and
      // not document.activeElement, which doesn't resolve into open shadow roots consistently
      // enough to trust here) is always the true originating element regardless of shadow
      // nesting — arrow/delete keys must reach a focused lat/lng/heading/pitch/duration/
      // source-select control untouched (moving the text cursor, nudging a number input's own
      // value, deleting a character, navigating the dropdown), not get hijacked into
      // moving/deleting the selected shape.
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
    this.objectSizeInput = this.shadow.getElementById("objectSize") as HTMLInputElement
    this.objectDistanceInput = this.shadow.getElementById("objectDistance") as HTMLInputElement
    this.apparentSizeOutput = this.shadow.getElementById("apparent-size")!
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
    this.loopButton = this.shadow.getElementById("loop") as HTMLButtonElement
    this.durationInput = this.shadow.getElementById("durationSeconds") as HTMLInputElement
    this.exportButton = this.shadow.getElementById("export") as HTMLButtonElement
    this.importFileInput = this.shadow.getElementById("import-file") as HTMLInputElement
    this.importUrlInput = this.shadow.getElementById("import-url") as HTMLInputElement
    this.importUrlButton = this.shadow.getElementById("import-url-button") as HTMLButtonElement
    this.latInput = this.shadow.getElementById("lat") as HTMLInputElement
    this.lngInput = this.shadow.getElementById("lng") as HTMLInputElement
    this.headingInput = this.shadow.getElementById("heading") as HTMLInputElement
    this.pitchInput = this.shadow.getElementById("pitch") as HTMLInputElement
    this.elevationInput = this.shadow.getElementById("elevation") as HTMLInputElement
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
    this.cloudDarknessInput = this.shadow.getElementById("cloudDarkness") as HTMLInputElement
    this.cloudBaseInput = this.shadow.getElementById("cloudBase") as HTMLInputElement
    this.precipitationTypeSelect = this.shadow.getElementById("precipitationType") as HTMLSelectElement
    this.precipitationIntensityInput = this.shadow.getElementById("precipitationIntensity") as HTMLInputElement
    this.windDirectionInput = this.shadow.getElementById("windDirection") as HTMLInputElement
    this.windSpeedInput = this.shadow.getElementById("windSpeed") as HTMLInputElement
    this.stormInput = this.shadow.getElementById("storm") as HTMLInputElement
    this.lensFlareBrightnessInput = this.shadow.getElementById("lensFlareBrightness") as HTMLInputElement
    this.cameraDeviceInput = this.shadow.getElementById("cameraDevice") as HTMLInputElement
    this.labelColor = this.shadow.getElementById("label-color")!
    this.labelTransparency = this.shadow.getElementById("label-transparency")!
    this.labelHalo = this.shadow.getElementById("label-halo")!
    this.labelShape = this.shadow.getElementById("label-shape")!
    this.labelShapeTitle = this.shadow.getElementById("label-shape-title")!
    this.labelUtcOffset = this.shadow.getElementById("label-utc-offset")!
    this.labelObjectSize = this.shadow.getElementById("label-object-size")!
    this.labelObjectDistance = this.shadow.getElementById("label-object-distance")!
    this.labelSamplingRate = this.shadow.getElementById("label-sampling-rate")!
    this.labelDuration = this.shadow.getElementById("label-duration")!
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
    this.labelCloudDarkness = this.shadow.getElementById("label-cloud-darkness")!
    this.labelCloudBase = this.shadow.getElementById("label-cloud-base")!
    this.labelPrecipitationType = this.shadow.getElementById("label-precipitation-type")!
    this.labelPrecipitationIntensity = this.shadow.getElementById("label-precipitation-intensity")!
    this.labelWindDirection = this.shadow.getElementById("label-wind-direction")!
    this.labelWindSpeed = this.shadow.getElementById("label-wind-speed")!
    this.labelStorm = this.shadow.getElementById("label-storm")!
    this.labelLensFlareBrightness = this.shadow.getElementById("label-lens-flare-brightness")!
    this.labelCameraDevice = this.shadow.getElementById("label-camera-device")!
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
    this.optionDecorWitness = this.shadow.getElementById("option-decor-witness")!

    this.ufoElement.canvasElement.addEventListener("pointerdown", event => this.onPointerDown(event))
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
    })
    // Same plain-click-collapses-to-one-shape semantics as clicking directly on canvas — see
    // selectUnit's own doc comment (also picks up the picked shape's group, if any; selectUnit
    // itself already resyncs the toolbar, no separate onSelectionOrTimeChanged() call needed).
    this.sourceSelect.addEventListener("change", () => this.selectUnit(this.sourceSelect.value))
    this.shapeTitleInput.addEventListener("input", () => this.updateShapeTitle())
    for (const input of [this.objectSizeInput, this.objectDistanceInput]) {
      input.addEventListener("input", () => this.updatePhysicalExtent())
    }
    this.addDecorWitnessButton.addEventListener("click", () => this.addDecor("witness"))
    this.addDecorBuildingButton.addEventListener("click", () => this.addDecor())
    this.deleteDecorButton.addEventListener("click", () => this.deleteDecor())
    this.decorSelect.addEventListener("change", () => this.selectDecor(this.decorSelect.value))
    for (const input of [
      this.decorTitleInput,
      this.decorEastInput,
      this.decorNorthInput,
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
    document.addEventListener("keydown", this.handleKeyDown)

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
    // Reading the heading off the compass is the whole point of editing this field — showing the
    // labels only requires the mouse to *also* be hovering the canvas (see SceneRenderer's own
    // hover-only default) would make the one moment they're most needed the one moment they're
    // easiest to miss. Independent of hover, see SceneElement.setCompassForced's own doc comment.
    this.headingInput.addEventListener("focus", () => this.sceneElement.setCompassForced(true))
    this.headingInput.addEventListener("blur", () => this.sceneElement.setCompassForced(false))
    this.lensFlareBrightnessInput.addEventListener("input", () =>
      this.sceneElement.setAttribute("lens-flare-brightness", this.lensFlareBrightnessInput.value)
    )
    this.cameraDeviceInput.addEventListener("input", () =>
      this.sceneElement.setAttribute("lens-flare-intensity", this.cameraDeviceInput.value)
    )
    this.utcOffsetInput.addEventListener("input", () => this.updateUtcOffset())
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
    for (const input of [
      this.cloudCoverInput,
      this.cloudDarknessInput,
      this.cloudBaseInput,
      this.precipitationTypeSelect,
      this.precipitationIntensityInput,
      this.windDirectionInput,
      this.windSpeedInput,
      this.stormInput
    ]) {
      input.addEventListener("input", () => this.applyWeatherAtPlayhead())
    }

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
    const src = this.getAttribute("src")
    if (src) void this.importFromUrl(src)
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string): void {
    if (name === "src" && newValue && newValue !== oldValue && this.isConnected) {
      void this.importFromUrl(newValue)
    }
  }

  disconnectedCallback(): void {
    document.removeEventListener("keydown", this.handleKeyDown)
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
    // Ground level unless stated — but stated it must be able to be: it decides which part of the
    // sky the witness is even inside (see SceneRenderer.celestialGroup), and writing 0 here
    // unconditionally, as this did, silently flattened an aircraft's own cruising altitude the
    // first time anything else in this panel was touched.
    const elevationM = this.numberOrUndefined(this.elevationInput.value) ?? 0
    const event = this.ufoElement.sighting.event
    const witnessTrack = this.ufoElement.sighting.witnessTrack
    const t = this.ufoElement.currentTime

    event.place = lat !== undefined && lng !== undefined ? [{ lat, lng }] : undefined

    const nothingSet = lat === undefined && lng === undefined && headingDeg === undefined && pitchDeg === 0 && elevationM === 0
    if (nothingSet) {
      witnessTrack.removeKeyframeAt(t)
    } else {
      witnessTrack.addKeyframe(t, { lat, lng, elevationM, headingDeg, pitchDeg, fovDeg: WITNESS_FOV_DEG })
    }
    // Neither field affects the 2D shape canvas, so this refresh() is only for its side effect —
    // it's what makes this edit surface as a "timeupdate" (see the constructor's listener), the
    // signal a composed live preview (e.g. a <rr0-scene>) needs to resync.
    this.ufoElement.refresh()
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
    this.ufoElement.refresh() // see updateObserver()'s comment — this is what surfaces the edit as a timeupdate
    this.syncDurationField()
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
  private updateUtcOffset(): void {
    this.ufoElement.sighting.event.utcOffsetHours = this.numberOrUndefined(this.utcOffsetInput.value)
    this.ufoElement.refresh()
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
    const weather: Weather = {
      cloudCover: Number(this.cloudCoverInput.value),
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
    if (active !== this.headingInput) {
      this.headingInput.value = pose?.headingDeg !== undefined ? String(pose.headingDeg) : ""
    }
    if (active !== this.pitchInput) {
      this.pitchInput.value = String(pose?.pitchDeg ?? 0)
    }
    if (active !== this.elevationInput) {
      this.elevationInput.value = String(pose?.elevationM ?? 0)
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
    this.syncDecorLitFromTimeline()
    this.syncIndoorLookReset()
    this.updateAppearanceFieldsDisabledState()
    // Called unconditionally (not nested inside syncAppearanceFromTimeline's own early-return
    // branches) so switching to a multi-selection or away from any selection always re-evaluates
    // — its own missing/selectedSourceIds.size===1 guard is what actually clears a stale red
    // border left over from whatever single shape was selected before.
    this.updateShapeTitleValidity()
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
    // Same focused-field skip as the title above, for the same reason.
    if (this.shadow.activeElement !== this.objectSizeInput) {
      this.objectSizeInput.value = shape.physical ? String(Number(shape.physical.sizeM.toFixed(2))) : ""
    }
    if (this.shadow.activeElement !== this.objectDistanceInput) {
      this.objectDistanceInput.value = shape.physical ? String(Number(shape.physical.distanceM.toFixed(2))) : ""
    }
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
   * Resizes the selected shape to the size a real object of the reported width, at the reported
   * distance, ACTUALLY looks — the whole point of the Real size / Distance pair. Apparent size is
   * the one quantity a testimony gives that can be checked arithmetically, and drawing it by eye
   * gets it wrong by a factor of five to ten, so this exists to stop it being drawn by eye at all.
   *
   * Resizes about the shape's own center (its position is where the witness saw it, and has
   * nothing to do with how big it was) and keeps its aspect ratio (the reported width is one
   * measurement; the outline's proportions are a separate observation this must not overwrite).
   * The pair is stored on the shape as well as applied (see BaseShape.physical), so the case file
   * documents where its size came from. Both fields empty clears it back to a plain eyeballed
   * shape; a half-filled pair is simply not enough to compute anything and leaves the shape alone.
   */
  private updatePhysicalExtent(): void {
    const timeline = this.ufoElement.sighting.timeline
    const t = this.ufoElement.currentTime
    const shape = timeline.getInterpolatedShapeAt(t, this.currentSourceId)
    if (!shape) return
    const sizeM = this.numberOrUndefined(this.objectSizeInput.value)
    const distanceM = this.numberOrUndefined(this.objectDistanceInput.value)
    if (sizeM === undefined && distanceM === undefined) {
      timeline.addKeyframe(t, [{ sourceId: this.currentSourceId, shape: { ...shape, physical: undefined } }])
      this.ufoElement.refresh()
      this.refreshApparentSize()
      return
    }
    if (sizeM === undefined || distanceM === undefined || sizeM <= 0 || distanceM <= 0) {
      this.refreshApparentSize()
      return
    }
    const physical = { sizeM, distanceM }
    const canvas = this.ufoElement.canvasElement
    const width = ApparentSize.widthPx(physical, canvas.height, this.currentFovDeg())
    const height = shape.bounds.height * (shape.bounds.width === 0 ? 1 : width / shape.bounds.width)
    const bounds = {
      x: shape.bounds.x + (shape.bounds.width - width) / 2,
      y: shape.bounds.y + (shape.bounds.height - height) / 2,
      width,
      height
    }
    const resized = shape.kind === "oval" ? { ...shape, bounds, physical } : { ...shape, bounds, physical, points: this.scalePoints(shape, bounds) }
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

  /** The field of view the witness's own pose declares at the current playhead — what the
   * apparent-size math must project through, rather than a fixed 60 degrees, so a recording that
   * ever records a different fov stays self-consistent. */
  private currentFovDeg(): number {
    return resolveObserverPoseAt(this.ufoElement.sighting, this.ufoElement.currentTime)?.fovDeg ?? WITNESS_FOV_DEG
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
    const canvas = this.ufoElement.canvasElement
    const degrees = ApparentSize.pxToDeg(shape.bounds.width, canvas.height, this.currentFovDeg())
    const moons = ApparentSize.inMoons(degrees)
    // Decimal separator follows the reader's own locale (a comma in French), like every other
    // number a browser formats — the surrounding wording comes from this.messages, but a number
    // isn't something to translate by hand.
    this.apparentSizeOutput.textContent = this.messages.apparentSize
      .replace("{deg}", degrees.toLocaleString(undefined, { maximumFractionDigits: degrees < 1 ? 2 : 1 }))
      .replace("{moons}", moons.toLocaleString(undefined, { maximumFractionDigits: moons < 10 ? 1 : 0 }))
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
      return {
        ...d,
        title: this.stringOrUndefined(this.decorTitleInput.value),
        eastM: Number(this.decorEastInput.value),
        northM: Number(this.decorNorthInput.value),
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
      this.decorWitnessSideSelect
    ]) {
      input.disabled = !hasSelection
    }
    this.decorTitleInput.value = decor?.title ?? ""
    this.decorEastInput.value = String(decor?.eastM ?? 0)
    this.decorNorthInput.value = String(decor?.northM ?? 0)
    this.decorHeadingInput.value = String(decor?.headingDeg ?? 0)
    this.decorLitInput.checked = decor ? resolveDecorLitAt(decor, this.ufoElement.currentTime) : false
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
    this.setRowVisible(this.decorLitInput, hasSelection)
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
    this.labelLensFlareBrightness.textContent = messages.lensFlareBrightness
    this.labelCameraDevice.textContent = messages.cameraDevice
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
    this.headingInput.value = String(headingDeg)
    this.pitchInput.value = String(pitchDeg)
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
