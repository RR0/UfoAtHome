import { html, css } from "./template.js"
import { UfoElement, registerUfo, UFO_ELEMENT_NAME } from "./UfoElement.js"
import { Recorder } from "../engine/record/Recorder.js"
import { RafSamplingClock } from "../engine/record/SamplingClock.js"
import { createShape, moveShapeTo } from "../engine/shape/Shape.js"
import type { Appearance, ShapeBounds, ShapePresetId } from "../engine/shape/Shape.js"
import type { SightingRecordingJson } from "../engine/persistence/sightingJson.js"

registerUfo()

const DEFAULT_SHAPE_SIZE = { width: 48, height: 28 }
const DEFAULT_SOURCE_ID = "ufo-1"
const PRESET_IDS: ShapePresetId[] = ["oval", "saucer", "triangle"]
const DEFAULT_APPEARANCE: Appearance = { presetId: "oval", color: "#39ff14", transparency: 0, haloScale: 1.5 }

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

  private recorder?: Recorder
  private isRecording = false
  private currentAppearance: Appearance = { ...DEFAULT_APPEARANCE }

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

    this.ufoElement.canvasElement.addEventListener("pointerdown", event => this.onPointerDown(event))
    this.ufoElement.canvasElement.addEventListener("pointermove", event => this.onPointerMove(event))
    this.recordButton.addEventListener("click", () => this.toggleRecording())

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
    this.renderPreview()
  }

  get sightingData(): SightingRecordingJson {
    return this.ufoElement.sightingData
  }

  set sightingData(json: SightingRecordingJson) {
    this.ufoElement.sightingData = json
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
    if (!this.isRecording) {
      this.renderPreview()
    }
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

  private renderPreview(): void {
    const canvas = this.ufoElement.canvasElement
    this.ufoElement.renderer.clear(canvas.width, canvas.height)
    this.ufoElement.renderer.paintShape(this.buildPrototype())
  }

  private toggleRecording(): void {
    const canvas = this.ufoElement.canvasElement
    if (this.isRecording) {
      this.recorder?.stop()
      this.isRecording = false
      this.recordButton.textContent = "Record"
      canvas.style.cursor = ""
      canvas.style.touchAction = ""
      this.ufoElement.refresh()
    } else {
      this.recorder = new Recorder(this.ufoElement.sighting.timeline, new RafSamplingClock(this.samplingRate))
      this.recorder.start(DEFAULT_SOURCE_ID, this.buildPrototype())
      this.isRecording = true
      this.recordButton.textContent = "Stop"
      canvas.style.cursor = "crosshair"
      canvas.style.touchAction = "none"
    }
  }

  private onPointerDown(event: PointerEvent): void {
    if (!this.isRecording) return
    this.onPointerMove(event)
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
}

export const ELEMENT_NAME = "rr0-ufo-recorder"

export function register(): void {
  registerUfo()
  if (!customElements.get(ELEMENT_NAME)) {
    customElements.define(ELEMENT_NAME, UfoRecorderElement)
  }
}
