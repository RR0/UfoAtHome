import { html, css } from "./template.js"
import { UfoElement, registerUfo } from "./UfoElement.js"
import { SceneElement, registerScene, SCENE_ELEMENT_NAME } from "./SceneElement.js"
import { Recorder } from "../engine/record/Recorder.js"
import { RafSamplingClock } from "../engine/record/SamplingClock.js"
import { createShape, moveShapeTo } from "../engine/shape/Shape.js"
import type { Appearance, Shape, ShapeBounds, ShapePresetId } from "../engine/shape/Shape.js"
import { hitTestHandle, resizeShape, rotateShape } from "../engine/shape/ShapeHandles.js"
import type { HandleId } from "../engine/shape/ShapeHandles.js"
import type { SightingRecordingJson } from "../engine/persistence/sightingJson.js"
import { selectLocale } from "../i18n/locale.js"
import { loadUfoRecorderMessages, UFO_SUPPORTED_LANGUAGES } from "./messages/index.js"
import type { UfoLanguage } from "./messages/index.js"
import { ufoRecorderMessages_en } from "./messages/UfoRecorderMessages_en.js"
import type { UfoRecorderMessages } from "./messages/UfoRecorderMessages.js"

registerUfo()
registerScene()

const DEFAULT_SHAPE_SIZE = { width: 48, height: 28 }
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
  private readonly addShapeButton: HTMLButtonElement
  private readonly durationInput: HTMLInputElement
  private readonly exportButton: HTMLButtonElement
  private readonly latInput: HTMLInputElement
  private readonly lngInput: HTMLInputElement
  private readonly headingInput: HTMLInputElement
  private readonly pitchInput: HTMLInputElement
  private readonly obsYearInput: HTMLInputElement
  private readonly obsMonthInput: HTMLInputElement
  private readonly obsDayInput: HTMLInputElement
  private readonly obsHourInput: HTMLInputElement
  private readonly obsMinuteInput: HTMLInputElement
  private readonly labelColor: HTMLElement
  private readonly labelTransparency: HTMLElement
  private readonly labelHalo: HTMLElement
  private readonly labelShape: HTMLElement
  private readonly labelSamplingRate: HTMLElement
  private readonly labelDuration: HTMLElement
  private readonly labelLatitude: HTMLElement
  private readonly labelLongitude: HTMLElement
  private readonly labelHeading: HTMLElement
  private readonly labelPitch: HTMLElement
  private readonly labelObservationTime: HTMLElement

  private recorder?: Recorder
  private isRecording = false
  /** Matches the template's baked-in English defaults until (if ever) loadLocaleMessages()
   * resolves a better match — see its doc comment. */
  private messages: UfoRecorderMessages = ufoRecorderMessages_en
  private currentAppearance: Appearance = { ...DEFAULT_APPEARANCE }
  /** Which source/shape the appearance toolbar and Record button currently target. */
  private currentSourceId: string = DEFAULT_SOURCE_ID

  /** Set while the user is dragging the selected shape's body (move) or one of its handles
   * (resize/rotate) — see beginDrag/onDragPointerMove/endDrag. */
  private dragState?: {
    kind: "move" | "resize" | "rotate"
    sourceId: string
    original: Shape
    handle?: HandleId
    startPointer: { x: number; y: number } // only used by "move"; resize/rotate recompute
    // directly from the current pointer each time, so they have no drift/hysteresis
  }

  /** Bound once so document.removeEventListener (disconnectedCallback/endDrag) can actually
   * find them. */
  private readonly handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape" && this.isRecording) {
      // Otherwise the only way to stop is moving the pointer to the Stop button — and since
      // recording samples the latest pointer position at every tick, that walk itself gets
      // recorded as trailing motion toward the button. Escape stops in place, no side trip.
      this.toggleRecording()
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
    this.addShapeButton = this.shadow.getElementById("add-shape") as HTMLButtonElement
    this.durationInput = this.shadow.getElementById("durationSeconds") as HTMLInputElement
    this.exportButton = this.shadow.getElementById("export") as HTMLButtonElement
    this.latInput = this.shadow.getElementById("lat") as HTMLInputElement
    this.lngInput = this.shadow.getElementById("lng") as HTMLInputElement
    this.headingInput = this.shadow.getElementById("heading") as HTMLInputElement
    this.pitchInput = this.shadow.getElementById("pitch") as HTMLInputElement
    this.obsYearInput = this.shadow.getElementById("obs-year") as HTMLInputElement
    this.obsMonthInput = this.shadow.getElementById("obs-month") as HTMLInputElement
    this.obsDayInput = this.shadow.getElementById("obs-day") as HTMLInputElement
    this.obsHourInput = this.shadow.getElementById("obs-hour") as HTMLInputElement
    this.obsMinuteInput = this.shadow.getElementById("obs-minute") as HTMLInputElement
    this.labelColor = this.shadow.getElementById("label-color")!
    this.labelTransparency = this.shadow.getElementById("label-transparency")!
    this.labelHalo = this.shadow.getElementById("label-halo")!
    this.labelShape = this.shadow.getElementById("label-shape")!
    this.labelSamplingRate = this.shadow.getElementById("label-sampling-rate")!
    this.labelDuration = this.shadow.getElementById("label-duration")!
    this.labelLatitude = this.shadow.getElementById("label-lat")!
    this.labelLongitude = this.shadow.getElementById("label-lng")!
    this.labelHeading = this.shadow.getElementById("label-heading")!
    this.labelPitch = this.shadow.getElementById("label-pitch")!
    this.labelObservationTime = this.shadow.getElementById("label-observation-time")!

    this.ufoElement.canvasElement.addEventListener("pointerdown", event => this.onPointerDown(event))
    this.ufoElement.canvasElement.addEventListener("pointermove", event => this.onPointerMove(event))
    this.recordButton.addEventListener("click", () => this.toggleRecording())
    this.addShapeButton.addEventListener("click", () => this.addShape())
    this.exportButton.addEventListener("click", () => this.exportJson())
    this.durationInput.addEventListener("input", () => {
      this.ufoElement.durationSeconds = this.durationInput.value === "" ? undefined : Number(this.durationInput.value)
      this.ufoElement.refresh() // otherwise the seek bar's max (seekableDuration) only updates on the next tick
    })
    this.sourceSelect.addEventListener("change", () => {
      this.currentSourceId = this.sourceSelect.value
      this.onSelectionOrTimeChanged()
    })
    // The single funnel for "the recording changed, a consumer composing this element (e.g. a
    // live <rr0-scene> preview) should resync" — refresh() (called after every mutation: shape
    // edits, drag, observer/time edits, duration) always ends in a timeupdate on the *nested*
    // ufoElement, which is shadow-DOM-internal and wouldn't otherwise reach outside listeners
    // (UfoElement's timeupdate isn't `composed`). Re-dispatching our own event here is what makes
    // it visible to the outside without exposing the nested element itself.
    this.ufoElement.addEventListener("timeupdate", () => {
      this.onSelectionOrTimeChanged()
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
    for (const input of [this.obsYearInput, this.obsMonthInput, this.obsDayInput, this.obsHourInput, this.obsMinuteInput]) {
      input.addEventListener("input", () => this.updateObservationTime())
    }

    this.updatePresetButtons()
    this.setRecordButtonLabel(false)
    // Places a real, immediately selectable keyframe from the start (rather than a
    // disconnected canvas-only preview) — otherwise the very first shape shown couldn't be
    // clicked/selected, since click-to-select hit-tests against the Timeline, not the canvas.
    this.applyAppearanceAtPlayhead()
    this.refreshSourceList()
    this.onSelectionOrTimeChanged()
    void this.loadLocaleMessages()
  }

  disconnectedCallback(): void {
    document.removeEventListener("keydown", this.handleKeyDown)
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
    this.refreshSourceList()
    this.onSelectionOrTimeChanged()
    this.durationInput.value = this.ufoElement.durationSeconds !== undefined ? String(this.ufoElement.durationSeconds) : ""
    this.syncObserverAndTimeFields()
  }

  /** Downloads the current recording as a standalone SightingRecordingJson file — a plain
   * Blob-and-anchor download, no server round-trip needed. Named from the witness reference
   * when known (e.g. "chiles-sighting.json"), falling back to a generic name otherwise. */
  private exportJson(): void {
    const json = this.sightingData
    const fileName = `${json.witnessId ?? "sighting"}-sighting.json`
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = fileName
    link.click()
    URL.revokeObjectURL(url)
  }

  private numberOrUndefined(value: string): number | undefined {
    return value === "" ? undefined : Number(value)
  }

  /** Writes the witness's lat/lng into the legacy `event.place` (kept in sync for any consumer
   * that only reads that field, e.g. an older `<rr0-scene>` build) — but writes a single t=0
   * `observerTrack` keyframe (what the current renderer actually prefers — see
   * resolveObserverPoseAt) as soon as *any* of lat/lng/heading/pitch is set, not only once lat and
   * lng are both filled in. Heading/pitch/date-time are meant to be tweakable independently while
   * authoring — gating the whole pose behind "lat and lng both present" silently discarded a
   * heading/pitch edit made before a location was entered, which looked like those fields simply
   * didn't work. `resolveObserverPoseAt`'s consumers (SceneElement) already know how to render a
   * pose with lat/lng left undefined — see its own fallback for astronomy without a location yet.
   * Clearing every field removes the keyframe entirely, rather than leaving a stale, all-default
   * pose around with no trace of it left in the UI. */
  private updateObserver(): void {
    const lat = this.numberOrUndefined(this.latInput.value)
    const lng = this.numberOrUndefined(this.lngInput.value)
    const headingDeg = this.numberOrUndefined(this.headingInput.value)
    // pitchDeg (unlike headingDeg) is never "unknown" — it's a required field on ObserverPose, so
    // an empty/invalid input just falls back to 0 (looking straight at the horizon) rather than
    // propagating NaN into the pose.
    const pitchDeg = this.numberOrUndefined(this.pitchInput.value) ?? 0
    const event = this.ufoElement.sighting.event
    const observerTrack = this.ufoElement.sighting.observerTrack

    event.place = lat !== undefined && lng !== undefined ? [{ lat, lng }] : undefined

    const nothingSet = lat === undefined && lng === undefined && headingDeg === undefined && pitchDeg === 0
    if (nothingSet) {
      observerTrack.clear()
    } else {
      observerTrack.addKeyframe(0, { lat, lng, elevationM: 0, headingDeg, pitchDeg, fovDeg: 60 })
    }
    // Neither field affects the 2D shape canvas, so this refresh() is only for its side effect —
    // it's what makes this edit surface as a "timeupdate" (see the constructor's listener), the
    // signal a composed live preview (e.g. a <rr0-scene>) needs to resync.
    this.ufoElement.refresh()
  }

  /** Writes the sighting's reported observation-start time (event.time) — every field is
   * independently optional, matching SightingTime itself; leaving every field blank clears
   * event.time entirely rather than storing an all-undefined object. */
  private updateObservationTime(): void {
    const year = this.numberOrUndefined(this.obsYearInput.value)
    const month = this.numberOrUndefined(this.obsMonthInput.value)
    const day = this.numberOrUndefined(this.obsDayInput.value)
    const hour = this.numberOrUndefined(this.obsHourInput.value)
    const minute = this.numberOrUndefined(this.obsMinuteInput.value)
    const event = this.ufoElement.sighting.event
    event.time =
      year === undefined && month === undefined && day === undefined && hour === undefined && minute === undefined
        ? undefined
        : { year, month, day, hour, minute }
    this.ufoElement.refresh() // see updateObserver()'s comment — this is what surfaces the edit as a timeupdate
  }

  /** Resyncs the observer/time fields from a freshly loaded sighting (sightingData setter) —
   * same role durationInput's own sync line already plays just above this call site. */
  private syncObserverAndTimeFields(): void {
    const event = this.ufoElement.sighting.event
    const location = event.place?.[0]
    this.latInput.value = location ? String(location.lat) : ""
    this.lngInput.value = location ? String(location.lng) : ""
    const pose = this.ufoElement.sighting.observerTrack.getLatestPoseAt(0)
    this.headingInput.value = pose?.headingDeg !== undefined ? String(pose.headingDeg) : ""
    this.pitchInput.value = String(pose?.pitchDeg ?? 0)
    this.obsYearInput.value = event.time?.year !== undefined ? String(event.time.year) : ""
    this.obsMonthInput.value = event.time?.month !== undefined ? String(event.time.month) : ""
    this.obsDayInput.value = event.time?.day !== undefined ? String(event.time.day) : ""
    this.obsHourInput.value = event.time?.hour !== undefined ? String(event.time.hour) : ""
    this.obsMinuteInput.value = event.time?.minute !== undefined ? String(event.time.minute) : ""
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
    this.ufoElement.selectedSourceId = this.currentSourceId
  }

  /** Keeps the toolbar honest when the playhead or selected source changes, so touching one
   * slider can't clobber the others with stale values. Deliberately bypasses setAppearance —
   * merely scrubbing/selecting must never itself trigger a Timeline write. */
  private syncAppearanceFromTimeline(): void {
    if (this.ufoElement.playbackState === "playing") return
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
    this.applyAppearanceAtPlayhead(this.offsetDefaultBounds(timeline.sourceIds.length))
    this.refreshSourceList()
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
      option.textContent = id
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
    this.labelSamplingRate.textContent = messages.samplingRate
    this.labelDuration.textContent = messages.duration
    this.durationInput.placeholder = messages.durationPlaceholder
    this.addShapeButton.textContent = messages.addShape
    this.exportButton.textContent = messages.export
    this.labelLatitude.textContent = messages.latitude
    this.labelLongitude.textContent = messages.longitude
    this.labelHeading.textContent = messages.heading
    this.headingInput.placeholder = messages.headingPlaceholder
    this.labelPitch.textContent = messages.pitch
    this.labelObservationTime.textContent = messages.observationTime
    this.obsYearInput.placeholder = messages.yearPlaceholder
    this.obsMonthInput.placeholder = messages.monthPlaceholder
    this.obsDayInput.placeholder = messages.dayPlaceholder
    this.obsHourInput.placeholder = messages.hourPlaceholder
    this.obsMinuteInput.placeholder = messages.minutePlaceholder
    this.setRecordButtonLabel(this.isRecording)
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
    const selected = timeline.getInterpolatedShapeAt(t, this.currentSourceId)
    const handle = selected && hitTestHandle(selected, point)
    const playing = this.ufoElement.playbackState === "playing"
    if (selected && handle) {
      if (playing) return // don't fight the player's per-frame repaint
      this.beginDrag(handle === "rotate" ? "rotate" : "resize", this.currentSourceId, selected, point, handle)
      return
    }
    const hit = timeline.hitTest(t, point.x, point.y)
    if (!hit) return // clicking empty canvas is a no-op — keeps the previous selection
    if (hit.sourceId !== this.currentSourceId) {
      this.currentSourceId = hit.sourceId
      this.refreshSourceList()
      this.onSelectionOrTimeChanged()
    }
    if (playing) return
    // Covers both "just click" (a zero-delta move below, harmlessly rewriting identical
    // bounds) and click-and-drag-to-move in one gesture — clicking any shape (not just the
    // already-selected one) selects it above, then this starts moving it immediately.
    this.beginDrag("move", hit.sourceId, hit.shape, point)
  }

  private beginDrag(
    kind: "move" | "resize" | "rotate",
    sourceId: string,
    original: Shape,
    startPointer: { x: number; y: number },
    handle?: HandleId
  ): void {
    this.dragState = { kind, sourceId, original, handle, startPointer }
    // Document-level (not canvas-level, and not Element.setPointerCapture) so the drag ends
    // correctly even if the pointer leaves the canvas or window before release, without
    // depending on setPointerCapture's availability.
    document.addEventListener("pointermove", this.handleDragPointerMove)
    document.addEventListener("pointerup", this.handleDragPointerUp)
  }

  private onDragPointerMove(event: PointerEvent): void {
    if (!this.dragState) return
    const point = this.canvasPointFromEvent(event)
    if (!point) return
    const { kind, sourceId, original, handle, startPointer } = this.dragState
    const shape: Shape =
      kind === "move"
        ? {
            ...original,
            bounds: {
              ...original.bounds,
              x: original.bounds.x + (point.x - startPointer.x),
              y: original.bounds.y + (point.y - startPointer.y)
            }
          }
        : kind === "resize"
          ? resizeShape(original, handle!, point)
          : rotateShape(original, point)
    // Writes straight through, spreading the original shape's appearance fields unchanged —
    // never routes through applyAppearanceAtPlayhead/buildAppearanceShape, so a
    // move/resize/rotate can't accidentally touch color/transparency/halo/preset.
    this.ufoElement.sighting.timeline.addKeyframe(this.ufoElement.currentTime, [{ sourceId, shape }])
    this.ufoElement.refresh()
  }

  private endDrag(): void {
    if (!this.dragState) return
    this.dragState = undefined
    document.removeEventListener("pointermove", this.handleDragPointerMove)
    document.removeEventListener("pointerup", this.handleDragPointerUp)
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
