import { html, css } from "./template.js"
import { UfoElement, registerUfo } from "./UfoElement.js"
import { SceneElement, registerScene, SCENE_ELEMENT_NAME } from "./SceneElement.js"
import { Recorder } from "../engine/record/Recorder.js"
import { RafSamplingClock } from "../engine/record/SamplingClock.js"
import { createShape, moveShapeTo } from "../engine/shape/Shape.js"
import type { Appearance, Shape, ShapeBounds, ShapePresetId } from "../engine/shape/Shape.js"
import { ShapeHandles, ShapeGroup, MIN_SHAPE_SIZE } from "../engine/shape/ShapeHandles.js"
import type { HandleId } from "../engine/shape/ShapeHandles.js"
import type { SightingRecordingJson } from "../engine/persistence/sightingJson.js"
import { DEFAULT_WEATHER } from "../engine/model/Weather.js"
import type { PrecipitationType, Weather } from "../engine/model/Weather.js"
import type { People } from "../engine/model/People.js"
import { sightingDurationMs, sightingDurationBlockedReason, parseEdtfTime, formatEdtfTime } from "../engine/model/Sighting.js"
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

const ARROW_KEYS = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"])
/** Px per arrow-key press, for both moving and resizing the selected shape — see
 * moveOrResizeSelectedShape. Small enough for fine nudges, still visible in one press. */
const ARROW_KEY_STEP_PX = 4
const DEFAULT_SOURCE_ID = "ufo-1"
const PRESET_IDS: ShapePresetId[] = ["oval", "saucer", "triangle"]
const DEFAULT_APPEARANCE: Appearance = { presetId: "oval", color: "#39ff14", transparency: 0, haloScale: 1.5 }

/** Best-effort reverse mapping from a recorded/loaded shape back to a preset id, so the preset
 * buttons' pressed-state stays honest after scrubbing to or selecting a shape. Cosmetic only —
 * an unrecognized polygon (neither 3 nor 8 points) just leaves the current selection alone;
 * this never affects color/transparency/haloScale syncing. */
function presetIdForShape(shape: Shape): ShapePresetId | undefined {
  if (shape.kind === "oval") return "oval"
  if (shape.points.length === 3) return "triangle"
  if (shape.points.length === 8) return "saucer"
  return undefined
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
  private readonly colorInput: HTMLInputElement
  private readonly transparencyInput: HTMLInputElement
  private readonly haloScaleInput: HTMLInputElement
  private readonly sourceSelect: HTMLSelectElement
  private readonly shapeTitleInput: HTMLInputElement
  private readonly addShapeButton: HTMLButtonElement
  private readonly deleteShapeButton: HTMLButtonElement
  private readonly contextMenu: HTMLElement
  private readonly contextGroupButton: HTMLButtonElement
  private readonly contextUngroupButton: HTMLButtonElement
  private readonly contextBringToFrontButton: HTMLButtonElement
  private readonly contextSendToBackButton: HTMLButtonElement
  private readonly contextDeleteButton: HTMLButtonElement
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
  private readonly precipitationTypeSelect: HTMLSelectElement
  private readonly precipitationIntensityInput: HTMLInputElement
  private readonly windDirectionInput: HTMLInputElement
  private readonly windSpeedInput: HTMLInputElement
  private readonly stormInput: HTMLInputElement
  private readonly labelColor: HTMLElement
  private readonly labelTransparency: HTMLElement
  private readonly labelHalo: HTMLElement
  private readonly labelShape: HTMLElement
  private readonly labelShapeTitle: HTMLElement
  private readonly labelSamplingRate: HTMLElement
  private readonly labelDuration: HTMLElement
  private readonly labelLatitude: HTMLElement
  private readonly labelLongitude: HTMLElement
  private readonly labelHeading: HTMLElement
  private readonly labelPitch: HTMLElement
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
  private readonly labelWitnessGroup: HTMLElement
  private readonly labelCircumstancesGroup: HTMLElement
  private readonly labelCloudCover: HTMLElement
  private readonly labelCloudDarkness: HTMLElement
  private readonly labelPrecipitationType: HTMLElement
  private readonly labelPrecipitationIntensity: HTMLElement
  private readonly labelWindDirection: HTMLElement
  private readonly labelWindSpeed: HTMLElement
  private readonly labelStorm: HTMLElement
  private readonly optionPrecipitationNone: HTMLElement
  private readonly optionPrecipitationRain: HTMLElement
  private readonly optionPrecipitationSnow: HTMLElement
  private readonly optionPrecipitationHail: HTMLElement

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

  /** Set while the user is dragging the selection's body (move), a single shape's own handle
   * (resize/rotate — only reachable when exactly one shape is selected), or the shared bounding
   * box of a multi-selection ("group-resize"/"group-rotate", both handled via a ShapeGroup
   * instance so the member list doesn't need re-passing on every pointermove) — see
   * beginDrag/onDragPointerMove/endDrag. Mutually exclusive with cameraDragState (a pointerdown
   * either hits something or it doesn't), so both share the same document-level
   * pointermove/pointerup listeners. */
  private dragState?:
    | { kind: "move"; sources: Array<{ sourceId: string; original: Shape }>; startPointer: { x: number; y: number } }
    | { kind: "resize" | "rotate"; sourceId: string; original: Shape; handle: HandleId; startPointer: { x: number; y: number } }
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
  }

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
    this.presetButtons = {
      oval: this.shadow.getElementById("preset-oval") as HTMLButtonElement,
      saucer: this.shadow.getElementById("preset-saucer") as HTMLButtonElement,
      triangle: this.shadow.getElementById("preset-triangle") as HTMLButtonElement
    }
    this.colorInput = this.shadow.getElementById("color") as HTMLInputElement
    this.transparencyInput = this.shadow.getElementById("transparency") as HTMLInputElement
    this.haloScaleInput = this.shadow.getElementById("haloScale") as HTMLInputElement
    this.sourceSelect = this.shadow.getElementById("source") as HTMLSelectElement
    this.shapeTitleInput = this.shadow.getElementById("shapeTitle") as HTMLInputElement
    this.addShapeButton = this.shadow.getElementById("add-shape") as HTMLButtonElement
    this.deleteShapeButton = this.shadow.getElementById("delete-shape") as HTMLButtonElement
    this.contextMenu = this.shadow.getElementById("context-menu")!
    this.contextGroupButton = this.shadow.getElementById("context-group") as HTMLButtonElement
    this.contextUngroupButton = this.shadow.getElementById("context-ungroup") as HTMLButtonElement
    this.contextBringToFrontButton = this.shadow.getElementById("context-bring-to-front") as HTMLButtonElement
    this.contextSendToBackButton = this.shadow.getElementById("context-send-to-back") as HTMLButtonElement
    this.contextDeleteButton = this.shadow.getElementById("context-delete") as HTMLButtonElement
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
    this.precipitationTypeSelect = this.shadow.getElementById("precipitationType") as HTMLSelectElement
    this.precipitationIntensityInput = this.shadow.getElementById("precipitationIntensity") as HTMLInputElement
    this.windDirectionInput = this.shadow.getElementById("windDirection") as HTMLInputElement
    this.windSpeedInput = this.shadow.getElementById("windSpeed") as HTMLInputElement
    this.stormInput = this.shadow.getElementById("storm") as HTMLInputElement
    this.labelColor = this.shadow.getElementById("label-color")!
    this.labelTransparency = this.shadow.getElementById("label-transparency")!
    this.labelHalo = this.shadow.getElementById("label-halo")!
    this.labelShape = this.shadow.getElementById("label-shape")!
    this.labelShapeTitle = this.shadow.getElementById("label-shape-title")!
    this.labelSamplingRate = this.shadow.getElementById("label-sampling-rate")!
    this.labelDuration = this.shadow.getElementById("label-duration")!
    this.labelLatitude = this.shadow.getElementById("label-lat")!
    this.labelLongitude = this.shadow.getElementById("label-lng")!
    this.labelHeading = this.shadow.getElementById("label-heading")!
    this.labelPitch = this.shadow.getElementById("label-pitch")!
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
    this.labelWitnessGroup = this.shadow.getElementById("label-witness-group")!
    this.labelCircumstancesGroup = this.shadow.getElementById("label-circumstances-group")!
    this.labelCloudCover = this.shadow.getElementById("label-cloud-cover")!
    this.labelCloudDarkness = this.shadow.getElementById("label-cloud-darkness")!
    this.labelPrecipitationType = this.shadow.getElementById("label-precipitation-type")!
    this.labelPrecipitationIntensity = this.shadow.getElementById("label-precipitation-intensity")!
    this.labelWindDirection = this.shadow.getElementById("label-wind-direction")!
    this.labelWindSpeed = this.shadow.getElementById("label-wind-speed")!
    this.labelStorm = this.shadow.getElementById("label-storm")!
    this.optionPrecipitationNone = this.shadow.getElementById("option-precipitation-none")!
    this.optionPrecipitationRain = this.shadow.getElementById("option-precipitation-rain")!
    this.optionPrecipitationSnow = this.shadow.getElementById("option-precipitation-snow")!
    this.optionPrecipitationHail = this.shadow.getElementById("option-precipitation-hail")!

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

    for (const input of [this.latInput, this.lngInput, this.headingInput, this.pitchInput]) {
      input.addEventListener("input", () => this.updateObserver())
    }
    // Reading the heading off the compass is the whole point of editing this field — showing the
    // labels only requires the mouse to *also* be hovering the canvas (see SceneRenderer's own
    // hover-only default) would make the one moment they're most needed the one moment they're
    // easiest to miss. Independent of hover, see SceneElement.setCompassForced's own doc comment.
    this.headingInput.addEventListener("focus", () => this.sceneElement.setCompassForced(true))
    this.headingInput.addEventListener("blur", () => this.sceneElement.setCompassForced(false))
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
      this.precipitationTypeSelect,
      this.precipitationIntensityInput,
      this.windDirectionInput,
      this.windSpeedInput,
      this.stormInput
    ]) {
      input.addEventListener("input", () => this.updateWeather())
    }

    this.updatePresetButtons()
    this.setRecordButtonLabel(false)
    // Places a real, immediately selectable keyframe from the start (rather than a
    // disconnected canvas-only preview) — otherwise the very first shape shown couldn't be
    // clicked/selected, since click-to-select hit-tests against the Timeline, not the canvas.
    this.applyAppearanceAtPlayhead()
    this.refreshSourceList()
    this.onSelectionOrTimeChanged()
    // A brand-new recording starts with no duration at all — flags it as missing right away
    // rather than only once the user first touches a date/duration field.
    this.syncDurationField()
    // So the external playback row isn't blank/stale before the first timeupdate tick.
    this.syncPlaybackControls()
    void this.loadLocaleMessages()
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
    this.onSelectionOrTimeChanged()
    this.syncDurationField()
    this.syncObservationTimeFields()
    this.syncObservationEndTimeFields()
    this.syncWitnessMetadataFields()
    this.syncWeatherFromSighting()
    this.sceneElement.setWeather(this.ufoElement.sighting.weather)
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
  private async importFromUrl(): Promise<void> {
    const url = this.importUrlInput.value.trim()
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
    const event = this.ufoElement.sighting.event
    const witnessTrack = this.ufoElement.sighting.witnessTrack
    const t = this.ufoElement.currentTime

    event.place = lat !== undefined && lng !== undefined ? [{ lat, lng }] : undefined

    const nothingSet = lat === undefined && lng === undefined && headingDeg === undefined && pitchDeg === 0
    if (nothingSet) {
      witnessTrack.removeKeyframeAt(t)
    } else {
      witnessTrack.addKeyframe(t, { lat, lng, elevationM: 0, headingDeg, pitchDeg, fovDeg: 60 })
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

  /** Writes the sighting's reported weather condition — unlike updateObserver()/
   * updateObservationTime(), this is a single flat object reassigned wholesale on every edit
   * (see Weather.ts/Sighting.ts's own doc comments on why weather is static per-sighting, not
   * keyframed), and every field always has a real default (0/none/false — a checkbox/select/range
   * never has an "empty" state the way a number input does), so there's no "blank everything to
   * clear it" case to handle the way updateObservationTime()/updateObserver() have.
   * `sceneElement.setWeather()` is called explicitly (not left to refresh()'s own timeupdate,
   * unlike observer pose) since weather isn't read from within SceneElement.updateAstronomy()'s own
   * per-tick path — see SceneElement.setWeather's own doc comment. */
  private updateWeather(): void {
    // Unlocks weather audio right here — this input event IS a real user gesture, exactly what
    // AudioContext.resume() requires (see SceneElement.resumeWeatherAudio/WeatherAudio.resume).
    this.sceneElement.resumeWeatherAudio()
    const sighting = this.ufoElement.sighting
    const weather: Weather = {
      cloudCover: Number(this.cloudCoverInput.value),
      cloudDarkness: Number(this.cloudDarknessInput.value),
      precipitationType: this.precipitationTypeSelect.value as PrecipitationType,
      precipitationIntensity: Number(this.precipitationIntensityInput.value),
      windDirectionDeg: this.wrapDegrees(this.numberOrUndefined(this.windDirectionInput.value), this.windDirectionInput) ?? 0,
      windSpeed: Number(this.windSpeedInput.value),
      storm: this.stormInput.checked
    }
    sighting.weather = weather
    this.sceneElement.setWeather(weather)
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

  /** Resyncs the weather toolbar from a freshly loaded sighting — same role
   * syncObservationTimeFields plays for the observation-time fields, and for the same reason:
   * weather is static per-sighting, not a per-instant keyframe, so this only needs to run once on
   * load, never on every tick. Absent weather (older recordings, or one never edited) resets every
   * field to DEFAULT_WEATHER's own values rather than leaving stale values from whatever was
   * previously loaded. */
  private syncWeatherFromSighting(): void {
    const weather = this.ufoElement.sighting.weather ?? DEFAULT_WEATHER
    this.cloudCoverInput.value = String(weather.cloudCover)
    this.cloudDarknessInput.value = String(weather.cloudDarkness)
    this.precipitationTypeSelect.value = weather.precipitationType
    this.precipitationIntensityInput.value = String(weather.precipitationIntensity)
    this.windDirectionInput.value = String(weather.windDirectionDeg)
    this.windSpeedInput.value = String(weather.windSpeed)
    this.stormInput.checked = weather.storm
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
  }

  /** The UFO's appearance (shape preset, color, transparency, halo) used for the next recording. */
  get appearance(): Appearance {
    return { ...this.currentAppearance }
  }

  set appearance(appearance: Partial<Appearance>) {
    this.setAppearance(appearance)
  }

  private setAppearance(appearance: Partial<Appearance>): void {
    this.currentAppearance = { ...this.currentAppearance, ...appearance }
    this.updatePresetButtons()
    // While actively recording, a toolbar change only seeds the *next* take (unchanged,
    // pre-existing behavior) — the in-flight shapePrototype stays frozen for this take's
    // duration. While playing, the playhead is a moving target, not a specific instant to
    // edit — editing here would just get stomped by the next timeupdate-driven resync.
    if (this.isRecording || this.ufoElement.playbackState === "playing") return
    this.applyAppearanceAtPlayhead()
  }

  /** Writes (or updates) a keyframe for the current source at the exact instant the seek bar
   * is scrubbed to, so a post-hoc appearance edit — not just a live recording sample —
   * actually persists into the timeline. `bounds` lets addShape() stagger a brand-new
   * shape's starting position instead of stacking it on an existing one. */
  private applyAppearanceAtPlayhead(bounds?: ShapeBounds): void {
    const timeline = this.ufoElement.sighting.timeline
    const t = this.ufoElement.currentTime
    const existing = timeline.getInterpolatedShapeAt(t, this.currentSourceId)
    const shape = this.buildAppearanceShape(bounds ?? existing?.bounds ?? this.defaultBounds(), existing)
    timeline.addKeyframe(t, [{ sourceId: this.currentSourceId, shape }])
    this.ufoElement.refresh()
  }

  /** Rebuilds via createShape (not by patching `preserve` in place) so a preset-button change
   * correctly swaps kind/points too, not just color/transparency/haloScale — while still
   * carrying forward angle/title/selected from whatever shape was already there, so an
   * appearance-only edit can't silently erase an existing rotation or title. */
  private buildAppearanceShape(bounds: ShapeBounds, preserve?: Shape): Shape {
    const shape = createShape(bounds, this.currentAppearance)
    return preserve ? { ...shape, angle: preserve.angle, title: preserve.title, selected: preserve.selected } : shape
  }

  /** Runs everything that depends on {currentSourceId, currentTime}: resyncs the appearance
   * toolbar and drives the canvas-native selection highlight on the nested ufo element. */
  private onSelectionOrTimeChanged(): void {
    this.syncAppearanceFromTimeline()
    this.syncObserverFromTimeline()
    this.updateAppearanceFieldsDisabledState()
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
      presetId: presetIdForShape(shape) ?? this.currentAppearance.presetId,
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
  }

  /** A shape/source's display label — its title if one's been given (at the current playhead),
   * falling back to the raw sourceId (e.g. "ufo-2") otherwise. Used for the source dropdown and
   * the delete-confirmation prompt; NOT used for the on-canvas hover tooltip (UfoElement.ts),
   * which deliberately shows nothing rather than a meaningless internal id for untitled shapes. */
  private shapeLabel(sourceId: string): string {
    const shape = this.ufoElement.sighting.timeline.getInterpolatedShapeAt(this.ufoElement.currentTime, sourceId)
    return shape?.title || sourceId
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
    this.refreshSourceList()
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
      canvas.style.cursor = ""
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
      canvas.style.cursor = "crosshair"
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
    this.messages = messages
    this.presetButtons.oval.textContent = messages.oval
    this.presetButtons.saucer.textContent = messages.saucer
    this.presetButtons.triangle.textContent = messages.triangle
    this.labelColor.textContent = messages.color
    this.labelTransparency.textContent = messages.transparency
    this.labelHalo.textContent = messages.halo
    this.labelShape.textContent = messages.shape
    this.labelShapeTitle.textContent = messages.shapeTitle
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
    this.labelObservationTime.textContent = messages.observationTime
    this.labelObservationEndTime.textContent = messages.observationEndTime
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
    this.labelWitnessGroup.textContent = messages.witnessGroup
    this.labelCircumstancesGroup.textContent = messages.circumstancesGroup
    this.labelCloudCover.textContent = messages.cloudCover
    this.labelCloudDarkness.textContent = messages.cloudDarkness
    this.labelPrecipitationType.textContent = messages.precipitationType
    this.optionPrecipitationNone.textContent = messages.precipitationNone
    this.optionPrecipitationRain.textContent = messages.precipitationRain
    this.optionPrecipitationSnow.textContent = messages.precipitationSnow
    this.optionPrecipitationHail.textContent = messages.precipitationHail
    this.labelPrecipitationIntensity.textContent = messages.precipitationIntensity
    this.labelWindDirection.textContent = messages.windDirection
    this.labelWindSpeed.textContent = messages.windSpeed
    this.labelStorm.textContent = messages.storm
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
      const members = [...this.selectedSourceIds]
        .map(sourceId => ({ sourceId, shape: timeline.getInterpolatedShapeAt(t, sourceId) }))
        .filter((member): member is { sourceId: string; shape: Shape } => !!member.shape)
      const group = new ShapeGroup(members)
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
      const handle = selected && ShapeHandles.hitTestHandle(selected, point)
      if (selected && handle) {
        if (playing) return // don't fight the player's per-frame repaint
        this.beginDrag(handle === "rotate" ? "rotate" : "resize", this.currentSourceId, selected, point, handle)
        return
      }
    }

    const hit = timeline.hitTest(t, point.x, point.y)
    if (!hit) {
      // Nothing under the pointer to select/move — the "landscape" itself becomes the drag
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
  private onContextMenu(event: MouseEvent): void {
    event.preventDefault()
    if (this.isRecording || this.ufoElement.playbackState === "playing") return
    const point = this.canvasPointFromEvent(event)
    if (!point) return
    const timeline = this.ufoElement.sighting.timeline
    const hit = timeline.hitTest(this.ufoElement.currentTime, point.x, point.y)
    if (!hit) return
    // Same "don't collapse an already-selected member" rule as onPointerDown, so right-clicking a
    // shape that's part of the current multi-selection opens the menu for the whole selection.
    if (!this.selectedSourceIds.has(hit.sourceId)) this.selectUnit(hit.sourceId)
    this.currentSourceId = hit.sourceId
    this.showContextMenu(event.clientX, event.clientY)
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
    document.addEventListener("click", this.handleOutsideContextMenuClick)
  }

  private hideContextMenu(): void {
    this.contextMenu.hidden = true
    document.removeEventListener("click", this.handleOutsideContextMenuClick)
  }

  /** composedPath(), not event.target, for the same reason EyewitnessElement's own info-panel
   * outside-click handler uses it: target gets retargeted to the shadow host from outside this
   * element's own shadow boundary, losing the inside/outside distinction this needs. Registered
   * only while the menu is actually open (showContextMenu/hideContextMenu), not for this
   * element's whole lifetime. */
  private readonly handleOutsideContextMenuClick = (event: MouseEvent): void => {
    if (!event.composedPath().includes(this.contextMenu)) this.hideContextMenu()
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
    this.cameraDragState = {
      startPointer,
      startHeadingDeg: this.numberOrUndefined(this.headingInput.value) ?? 0,
      startPitchDeg: this.numberOrUndefined(this.pitchInput.value) ?? 0
    }
    this.sceneElement.setCompassForced(true)
    this.startDragListening()
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
    const { startPointer, startHeadingDeg, startPitchDeg } = this.cameraDragState
    // Computed from the fixed drag-start reference every time, not incrementally frame-to-frame —
    // see cameraDragState's own doc comment on why (avoids drift and misbehaving at the 360->0
    // heading wrap). Left/right drags the view right/left (a "grab the sky and pan it" feel);
    // up/down looks up/down, matching pitchDeg's own "positive = above horizontal" convention.
    const headingDeg = startHeadingDeg + (point.x - startPointer.x) * CAMERA_DRAG_DEG_PER_PX
    const pitchDeg = Math.max(-90, Math.min(90, startPitchDeg - (point.y - startPointer.y) * CAMERA_DRAG_DEG_PER_PX))
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
    if (this.cameraDragState) this.sceneElement.setCompassForced(false)
    this.dragState = undefined
    this.cameraDragState = undefined
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
    const members = [...this.selectedSourceIds]
      .map(sourceId => ({ sourceId, shape: timeline.getInterpolatedShapeAt(t, sourceId) }))
      .filter((member): member is { sourceId: string; shape: Shape } => !!member.shape)
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

  private onPointerMove(event: PointerEvent): void {
    if (!this.isRecording) return
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
