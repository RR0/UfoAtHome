import { html, css } from "./template.js"
import { Sighting } from "../engine/model/Sighting.js"
import { Recorder } from "../engine/record/Recorder.js"
import { RafSamplingClock } from "../engine/record/SamplingClock.js"
import { Player } from "../engine/playback/Player.js"
import { CanvasRenderer } from "../render/CanvasRenderer.js"
import { fromSightingJson, toSightingJson } from "../engine/persistence/sightingJson.js"
import type { SightingRecordingJson } from "../engine/persistence/sightingJson.js"
import { createOval, moveShapeTo } from "../engine/shape/Shape.js"
import type { Shape } from "../engine/shape/Shape.js"

const DEFAULT_SHAPE_SIZE = { width: 48, height: 28 }
const DEFAULT_SOURCE_ID = "ufo-1"

export type UfoRecorderMode = "record" | "playback"

/**
 * Vanilla Web Component (no framework/library) wrapping the record/playback
 * engine. Follows the site's existing widget pattern (see
 * cms/src/time/DualRangeComponent.mjs): shadow DOM, template-literal
 * html/css, guarded customElements.define via register().
 */
export class UfoRecorderElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ["mode", "sampling-rate"]
  }

  private readonly shadow: ShadowRoot
  private canvas!: HTMLCanvasElement
  private renderer!: CanvasRenderer
  private recordButton!: HTMLButtonElement
  private playButton!: HTMLButtonElement
  private pauseButton!: HTMLButtonElement
  private samplingRateInput!: HTMLInputElement
  private seekInput!: HTMLInputElement

  private sighting: Sighting = Sighting.create()
  private recorder?: Recorder
  private player?: Player
  private isRecording = false

  constructor() {
    super()
    this.shadow = this.attachShadow({ mode: "open" })
    const template = document.createElement("template")
    template.innerHTML = `<style>${css}</style>${html}`
    this.shadow.appendChild(template.content.cloneNode(true))
  }

  connectedCallback(): void {
    this.canvas = this.shadow.getElementById("canvas") as HTMLCanvasElement
    this.renderer = new CanvasRenderer(this.canvas.getContext("2d")!)
    this.recordButton = this.shadow.getElementById("record") as HTMLButtonElement
    this.playButton = this.shadow.getElementById("play") as HTMLButtonElement
    this.pauseButton = this.shadow.getElementById("pause") as HTMLButtonElement
    this.samplingRateInput = this.shadow.getElementById("samplingRate") as HTMLInputElement
    this.seekInput = this.shadow.getElementById("seek") as HTMLInputElement

    this.canvas.addEventListener("pointerdown", event => this.onPointerDown(event))
    this.canvas.addEventListener("pointermove", event => this.onPointerMove(event))
    this.canvas.addEventListener("pointerup", () => this.onPointerUp())
    this.recordButton.addEventListener("click", () => this.toggleRecording())
    this.playButton.addEventListener("click", () => this.play())
    this.pauseButton.addEventListener("click", () => this.player?.pause())
    this.seekInput.addEventListener("input", () => this.player?.seek(Number(this.seekInput.value)))

    this.player = new Player(this.sighting.timeline, (t, shapesBySource) => this.onFrame(t, shapesBySource))
    this.paintCurrentFrame()
  }

  attributeChangedCallback(_name: string, _oldValue: string, _newValue: string): void {
    // "mode" and "sampling-rate" are read on demand (toggleRecording/play), nothing to react to eagerly.
  }

  get sightingData(): SightingRecordingJson {
    return toSightingJson(this.sighting)
  }

  set sightingData(json: SightingRecordingJson) {
    this.sighting = fromSightingJson(json)
    this.player = new Player(this.sighting.timeline, (t, shapesBySource) => this.onFrame(t, shapesBySource))
    this.seekInput.max = String(this.sighting.timeline.duration)
    this.paintCurrentFrame()
  }

  private get samplingRate(): number {
    return Number(this.samplingRateInput?.value ?? this.getAttribute("sampling-rate") ?? 100)
  }

  private toggleRecording(): void {
    if (this.isRecording) {
      this.recorder?.stop()
      this.isRecording = false
      this.recordButton.textContent = "Record"
      this.seekInput.max = String(this.sighting.timeline.duration)
    } else {
      this.recorder = new Recorder(this.sighting.timeline, new RafSamplingClock(this.samplingRate))
      const prototype = createOval({
        x: this.canvas.width / 2 - DEFAULT_SHAPE_SIZE.width / 2,
        y: this.canvas.height / 2 - DEFAULT_SHAPE_SIZE.height / 2,
        width: DEFAULT_SHAPE_SIZE.width,
        height: DEFAULT_SHAPE_SIZE.height
      })
      this.recorder.start(DEFAULT_SOURCE_ID, prototype)
      this.isRecording = true
      this.recordButton.textContent = "Stop"
    }
  }

  private play(): void {
    this.player?.play()
  }

  private onPointerDown(event: PointerEvent): void {
    if (!this.isRecording) return
    this.onPointerMove(event)
  }

  private onPointerMove(event: PointerEvent): void {
    if (!this.isRecording) return
    const rect = this.canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    this.recorder?.onPointerMove(x, y)
    this.renderer.clear(this.canvas.width, this.canvas.height)
    this.renderer.paintShape(
      moveShapeTo(
        createOval({ x: 0, y: 0, width: DEFAULT_SHAPE_SIZE.width, height: DEFAULT_SHAPE_SIZE.height }),
        x,
        y
      )
    )
  }

  private onPointerUp(): void {
    // Recording keeps running (clock still ticking) until the Record/Stop button is pressed again;
    // lifting the pointer just stops feeding new positions.
  }

  private onFrame(t: number, shapesBySource: Map<string, Shape>): void {
    this.renderer.clear(this.canvas.width, this.canvas.height)
    for (const shape of shapesBySource.values()) {
      this.renderer.paintShape(shape)
    }
    this.seekInput.value = String(t)
  }

  private paintCurrentFrame(): void {
    this.seekInput.max = String(this.sighting.timeline.duration)
    this.player?.seek(0)
  }
}

export const ELEMENT_NAME = "rr0-ufo-recorder"

export function register(): void {
  if (!customElements.get(ELEMENT_NAME)) {
    customElements.define(ELEMENT_NAME, UfoRecorderElement)
  }
}
