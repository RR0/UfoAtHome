import { html, css } from "./ufoTemplate.js"
import { Sighting } from "../engine/model/Sighting.js"
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
  private readonly seekInput: HTMLInputElement

  private currentSighting: Sighting = Sighting.create()
  private player: Player

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
    this.seekInput = this.shadow.getElementById("seek") as HTMLInputElement

    this.playButton.addEventListener("click", () => this.player.play())
    this.pauseButton.addEventListener("click", () => this.player.pause())
    this.seekInput.addEventListener("input", () => this.player.seek(Number(this.seekInput.value)))

    this.player = new Player(this.currentSighting.timeline, (t, shapesBySource) => this.onFrame(t, shapesBySource))
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
    this.player = new Player(this.currentSighting.timeline, (t, shapesBySource) => this.onFrame(t, shapesBySource))
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
}

export const UFO_ELEMENT_NAME = "rr0-ufo"

export function registerUfo(): void {
  if (!customElements.get(UFO_ELEMENT_NAME)) {
    customElements.define(UFO_ELEMENT_NAME, UfoElement)
  }
}
