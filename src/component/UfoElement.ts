import { html, css } from "./ufoTemplate.js"
import { Sighting, sightingDurationMs, sightingTimeToMs } from "../engine/model/Sighting.js"
import type { SightingTime } from "../engine/model/Sighting.js"
import { Player } from "../engine/playback/Player.js"
import { CanvasRenderer } from "../render/CanvasRenderer.js"
import { fromSightingJson, toSightingJson } from "../engine/persistence/sightingJson.js"
import type { SightingRecordingJson } from "../engine/persistence/sightingJson.js"
import type { Shape } from "../engine/shape/Shape.js"

/**
 * Vanilla Web Component (no framework/library) for read-only playback of a
 * recorded sighting — canvas + Play/Pause/seek only, no recording or
 * appearance-editing UI. This is the lightweight bundle meant for embedding
 * in real site pages (e.g. an rr0.org case dossier): a page that only needs
 * to *play* a sighting shouldn't have to download the Recorder engine,
 * SamplingClock, or appearance toolbar — see UfoRecorderElement, which
 * composes this element (as a nested `<rr0-ufo>` in its own shadow DOM) for
 * the authoring/editing experience instead of duplicating the canvas/
 * playback machinery. SceneElement (`<rr0-scene>`) composes it too, for the
 * 3D-decor variant.
 *
 * All wiring happens in the constructor rather than connectedCallback: this
 * element only needs its own shadow DOM to exist (not to be connected to a
 * live document), which is exactly what lets UfoRecorderElement/SceneElement
 * rely on `document.createElement(UFO_ELEMENT_NAME)` — synchronous
 * construction for an already-defined custom element — to get a
 * fully-usable instance (`canvasElement`/`renderer`/`sighting` all ready)
 * immediately, with no dependency on connection/upgrade timing. Only the
 * `src` attribute's auto-fetch is inherently attribute/connection
 * dependent, so that alone stays in connectedCallback/attributeChangedCallback.
 */
export class UfoElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ["src"]
  }

  private readonly shadow: ShadowRoot
  private readonly canvas: HTMLCanvasElement
  private readonly canvasRenderer: CanvasRenderer
  private readonly playButton: HTMLButtonElement
  private readonly pauseButton: HTMLButtonElement
  private readonly loopButton: HTMLButtonElement
  private readonly seekInput: HTMLInputElement
  private readonly timeStartLabel: HTMLElement
  private readonly timeEndLabel: HTMLElement

  private currentSighting: Sighting = Sighting.create()
  private player: Player
  private loopEnabled = true

  constructor() {
    super()
    this.shadow = this.attachShadow({ mode: "open" })
    const template = document.createElement("template")
    template.innerHTML = `<style>${css}</style>${html}`
    this.shadow.appendChild(template.content.cloneNode(true))

    this.canvas = this.shadow.getElementById("canvas") as HTMLCanvasElement
    this.canvasRenderer = new CanvasRenderer(this.canvas.getContext("2d")!)
    this.playButton = this.shadow.getElementById("play") as HTMLButtonElement
    this.pauseButton = this.shadow.getElementById("pause") as HTMLButtonElement
    this.loopButton = this.shadow.getElementById("loop") as HTMLButtonElement
    this.seekInput = this.shadow.getElementById("seek") as HTMLInputElement
    this.timeStartLabel = this.shadow.getElementById("time-start")!
    this.timeEndLabel = this.shadow.getElementById("time-end")!

    this.playButton.addEventListener("click", () => this.player.play())
    this.pauseButton.addEventListener("click", () => this.player.pause())
    this.loopButton.addEventListener("click", () => this.toggleLoop())
    this.seekInput.addEventListener("input", () => this.player.seek(Number(this.seekInput.value)))

    this.player = this.createPlayer()
    this.updateTimeLabels()
    this.refresh()
  }

  connectedCallback(): void {
    const src = this.getAttribute("src")
    if (src) {
      void this.loadFromSrc(src)
    }
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string): void {
    if (name === "src" && newValue && newValue !== oldValue && this.isConnected) {
      void this.loadFromSrc(newValue)
    }
  }

  /** Fetches a SightingRecordingJson from `url` and loads it — what the `src` attribute uses. */
  async loadFromSrc(url: string): Promise<void> {
    const response = await fetch(url)
    this.sightingData = (await response.json()) as SightingRecordingJson
  }

  get sightingData(): SightingRecordingJson {
    return toSightingJson(this.currentSighting)
  }

  set sightingData(json: SightingRecordingJson) {
    this.currentSighting = fromSightingJson(json)
    this.player = this.createPlayer()
    this.updateTimeLabels()
    this.refresh()
  }

  /**
   * The live Sighting/Timeline, exposed so UfoRecorderElement/SceneElement
   * (which compose this element) can add keyframes to it directly as it
   * records, or read its time/place for lighting.
   */
  get sighting(): Sighting {
    return this.currentSighting
  }

  /** Exposed so UfoRecorderElement can paint a live drag preview on the same canvas. */
  get canvasElement(): HTMLCanvasElement {
    return this.canvas
  }

  get renderer(): CanvasRenderer {
    return this.canvasRenderer
  }

  /**
   * Re-reads the timeline's duration into the seek slider and repaints the
   * current frame — call after externally mutating `sighting.timeline`
   * (e.g. UfoRecorderElement adding keyframes while recording).
   */
  refresh(): void {
    this.seekInput.max = String(this.currentSighting.timeline.duration)
    this.player.seek(this.player.time)
  }

  private onFrame(t: number, shapesBySource: Map<string, Shape>): void {
    this.canvasRenderer.clear(this.canvas.width, this.canvas.height)
    for (const shape of shapesBySource.values()) {
      this.canvasRenderer.paintShape(shape)
    }
    this.seekInput.value = String(t)
  }

  private createPlayer(): Player {
    const player = new Player(this.currentSighting.timeline, (t, shapesBySource) => this.onFrame(t, shapesBySource))
    player.loop = this.loopEnabled
    return player
  }

  private toggleLoop(): void {
    this.loopEnabled = !this.loopEnabled
    this.loopButton.setAttribute("aria-pressed", String(this.loopEnabled))
    this.player.loop = this.loopEnabled
  }

  /**
   * Sets the seek bar's start/end labels and the player's playback rate from the sighting's
   * real-world reported duration (see sightingDurationMs) rather than `timeline.duration` (how
   * long the recording itself took to author). With a known start clock time, the labels show
   * real times (e.g. "02:45" → "02:50"); with only a duration/no anchor, they show "0:00" →
   * the real duration; with neither, they fall back to "0:00" → the recording's own length.
   */
  private updateTimeLabels(): void {
    const event = this.currentSighting.event
    const durationMs = sightingDurationMs(event)
    const startMs = event.time ? sightingTimeToMs(event.time) : undefined

    this.player.playbackRate =
      durationMs !== undefined && durationMs > 0 ? this.currentSighting.timeline.duration / durationMs : 1

    if (startMs !== undefined && durationMs !== undefined) {
      this.timeStartLabel.textContent = formatClockTime(event.time!)
      this.timeEndLabel.textContent = formatClockTime(msToTimeOfDay(startMs + durationMs))
    } else {
      this.timeStartLabel.textContent = "0:00"
      this.timeEndLabel.textContent = formatElapsed(durationMs ?? this.currentSighting.timeline.duration)
    }
  }
}

function msToTimeOfDay(ms: number): SightingTime {
  const date = new Date(ms)
  return { hour: date.getUTCHours(), minute: date.getUTCMinutes(), second: date.getUTCSeconds() }
}

function formatClockTime(time: SightingTime): string {
  if (time.hour === undefined) return "0:00"
  const pad = (n: number) => String(n).padStart(2, "0")
  // A truthy check (not `!== undefined`): a computed end time always has a `second` field (even
  // when it's exactly 0, e.g. a whole-minute duration), which shouldn't force ":00" onto a
  // display otherwise matching the source data's minute-level precision.
  return time.second
    ? `${pad(time.hour)}:${pad(time.minute ?? 0)}:${pad(time.second)}`
    : `${pad(time.hour)}:${pad(time.minute ?? 0)}`
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.round(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, "0")}`
}

export const UFO_ELEMENT_NAME = "rr0-ufo"

export function registerUfo(): void {
  if (!customElements.get(UFO_ELEMENT_NAME)) {
    customElements.define(UFO_ELEMENT_NAME, UfoElement)
  }
}
