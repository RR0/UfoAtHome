import { html, css } from "./template.js"
import { UfoElement, registerUfo, UFO_ELEMENT_NAME } from "./UfoElement.js"
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
 * `<rr0-ufo>` (see UfoElement) for the actual canvas/playback instead of
 * duplicating it — a page that only needs to *play* a sighting (the common
 * case: an rr0.org case dossier) should embed `<rr0-ufo>` directly and
 * never download this authoring-only code (Recorder engine, SamplingClock,
 * appearance toolbar).
 *
 * All wiring happens in the constructor (this element has no attribute/
 * connection dependency). The nested ufo element is created via
 * `document.createElement` rather than left inline in the template markup —
 * see the comment at that call site for why an inline tag wouldn't be
 * upgraded yet at construction time.
 */
export class UfoRecorderElement extends HTMLElement {
  private readonly shadow: ShadowRoot
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
  private readonly labelColor: HTMLElement
  private readonly labelTransparency: HTMLElement
  private readonly labelHalo: HTMLElement
  private readonly labelShape: HTMLElement
  private readonly labelSamplingRate: HTMLElement
  private readonly labelDuration: HTMLElement

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
    // runs its constructor and returns a fully-upgraded instance. An inline <rr0-ufo> tag
    // parsed from `template.content.cloneNode(true)` would NOT be upgraded yet at this point:
    // elements from an inert <template> only upgrade once connected to a live document, which
    // happens later (when this recorder itself is inserted), so canvasElement/renderer/sighting
    // would still be undefined here.
    this.ufoElement = document.createElement(UFO_ELEMENT_NAME) as UfoElement
    // This canvas is used for drag-to-record shape placement instead — a plain click shouldn't
    // also toggle the nested player's playback (every recording drag ends in a native "click").
    this.ufoElement.enableClickToPlay = false
    this.shadow.getElementById("ufo-slot")!.replaceWith(this.ufoElement)

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
    this.labelColor = this.shadow.getElementById("label-color")!
    this.labelTransparency = this.shadow.getElementById("label-transparency")!
    this.labelHalo = this.shadow.getElementById("label-halo")!
    this.labelShape = this.shadow.getElementById("label-shape")!
    this.labelSamplingRate = this.shadow.getElementById("label-sampling-rate")!
    this.labelDuration = this.shadow.getElementById("label-duration")!

    this.ufoElement.canvasElement.addEventListener("pointerdown", event => this.onPointerDown(event))
    this.ufoElement.canvasElement.addEventListener("pointermove", event => this.onPointerMove(event))
    this.recordButton.addEventListener("click", () => this.toggleRecording())
    this.addShapeButton.addEventListener("click", () => this.addShape())
    this.exportButton.addEventListener("click", () => this.exportJson())
    this.durationInput.addEventListener("input", () => {
      this.ufoElement.durationSeconds = this.durationInput.value === "" ? undefined : Number(this.durationInput.value)
    })
    this.sourceSelect.addEventListener("change", () => {
      this.currentSourceId = this.sourceSelect.value
      this.onSelectionOrTimeChanged()
    })
    this.ufoElement.addEventListener("timeupdate", () => this.onSelectionOrTimeChanged())
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
