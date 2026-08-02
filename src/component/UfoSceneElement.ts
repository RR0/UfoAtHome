import { html, css } from "./sceneTemplate.js"
import { UfoPlayerElement, registerPlayer, PLAYER_ELEMENT_NAME } from "./UfoPlayerElement.js"
import { SceneRenderer } from "../render3d/SceneRenderer.js"
import { computeSunPosition } from "../engine/astronomy/SunPosition.js"
import type { SightingRecordingJson } from "../engine/persistence/sightingJson.js"

registerPlayer()

/** A neutral dusk-ish sky used when a sighting has no recorded date/place to compute real lighting from. */
const DEFAULT_ALTITUDE_DEG = -3

/**
 * Vanilla Web Component composing a 3D "decor" (sky/horizon/stars, see
 * SceneRenderer) behind a nested, transparent-background `<rr0-ufo-player>`
 * — the sighting's 2D shape stays a 2D overlay on top (see this project's
 * README: the shape is what the witness reported, possibly a
 * misidentification or optical effect, so it's deliberately never
 * "upgraded" to a 3D-interpreted object; only the surrounding environment,
 * which is independently computable from real astronomy, gets rendered in
 * 3D).
 *
 * This is the heaviest of the three bundles (pulls in Three.js) — pages
 * that only need playback should use `<rr0-ufo-player>` directly instead.
 *
 * Lighting is derived from the sighting's own `time`/`place` — see
 * engine/astronomy/SunPosition.ts. Only the sun's altitude is used for now
 * (sky darkness/color, star visibility), not azimuth: positioning where on
 * the horizon a sun/moon glow should sit would need the witness's viewing
 * direction, which isn't part of the data model yet.
 */
export class UfoSceneElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ["src"]
  }

  private readonly shadow: ShadowRoot
  private readonly sceneCanvas: HTMLCanvasElement
  private readonly playerElement: UfoPlayerElement
  private readonly sceneRenderer: SceneRenderer
  private resizeObserver?: ResizeObserver

  constructor() {
    super()
    this.shadow = this.attachShadow({ mode: "open" })
    const template = document.createElement("template")
    template.innerHTML = `<style>${css}</style>${html}`
    this.shadow.appendChild(template.content.cloneNode(true))

    this.sceneCanvas = this.shadow.getElementById("scene-canvas") as HTMLCanvasElement
    this.sceneRenderer = new SceneRenderer(this.sceneCanvas)

    // Created imperatively rather than left inline in the template markup — see
    // UfoRecorderElement's constructor for why (an inline tag parsed from
    // template.content.cloneNode(true) isn't upgraded to its class instance yet at this point).
    this.playerElement = document.createElement(PLAYER_ELEMENT_NAME) as UfoPlayerElement
    this.playerElement.classList.add("player-overlay")
    this.playerElement.style.setProperty("--ufo-canvas-background", "transparent")
    this.playerElement.style.setProperty("--ufo-canvas-border", "none")
    this.shadow.getElementById("player-slot")!.replaceWith(this.playerElement)
  }

  connectedCallback(): void {
    this.resizeToStage()
    this.updateLighting()

    // Keeps the 3D canvas' backing resolution matched to its actual displayed size (e.g. a
    // responsive page width change), since it has no fixed width/height attributes of its own.
    this.resizeObserver = new ResizeObserver(() => this.resizeToStage())
    this.resizeObserver.observe(this)

    const src = this.getAttribute("src")
    if (src) {
      void this.loadFromSrc(src)
    }
  }

  disconnectedCallback(): void {
    this.resizeObserver?.disconnect()
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
    return this.playerElement.sightingData
  }

  set sightingData(json: SightingRecordingJson) {
    this.playerElement.sightingData = json
    this.updateLighting()
  }

  private resizeToStage(): void {
    const rect = this.getBoundingClientRect()
    const width = Math.max(1, Math.round(rect.width))
    const height = Math.max(1, Math.round(rect.height))
    this.sceneCanvas.width = width
    this.sceneCanvas.height = height
    this.sceneRenderer.resize(width, height)
  }

  private updateLighting(): void {
    const { time, place } = this.playerElement.sighting.event
    const location = place?.[0]
    if (!time || !location || time.year === undefined || time.month === undefined || time.day === undefined) {
      this.sceneRenderer.setLighting({ altitudeDeg: DEFAULT_ALTITUDE_DEG })
      return
    }
    const sunPosition = computeSunPosition({
      lat: location.lat,
      lng: location.lng,
      year: time.year,
      month: time.month,
      day: time.day,
      hour: time.hour ?? 12,
      minute: time.minute ?? 0,
      second: time.second
    })
    this.sceneRenderer.setLighting({ altitudeDeg: sunPosition.altitudeDeg })
  }
}

export const SCENE_ELEMENT_NAME = "rr0-ufo-scene"

export function registerScene(): void {
  registerPlayer()
  if (!customElements.get(SCENE_ELEMENT_NAME)) {
    customElements.define(SCENE_ELEMENT_NAME, UfoSceneElement)
  }
}
