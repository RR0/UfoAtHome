import { html, css } from "./ufoTemplate.js"
import { Sighting, sightingDurationMs, sightingTimeToMs } from "../engine/model/Sighting.js"
import type { SightingTime } from "../engine/model/Sighting.js"
import { Player } from "../engine/playback/Player.js"
import { CanvasRenderer } from "../render/CanvasRenderer.js"
import { fromSightingJson, toSightingJson } from "../engine/persistence/sightingJson.js"
import type { SightingRecordingJson } from "../engine/persistence/sightingJson.js"
import type { Shape } from "../engine/shape/Shape.js"
import { selectLocale } from "../i18n/locale.js"
import { loadUfoMessages, UFO_SUPPORTED_LANGUAGES } from "./messages/index.js"
import type { UfoLanguage } from "./messages/index.js"
import { ufoMessages_en } from "./messages/UfoMessages_en.js"
import type { UfoMessages } from "./messages/UfoMessages.js"

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
  private readonly stageElement: HTMLElement
  private readonly canvas: HTMLCanvasElement
  private readonly canvasRenderer: CanvasRenderer
  private readonly toolbar: HTMLElement
  private readonly playPauseButton: HTMLButtonElement
  private readonly loopButton: HTMLButtonElement
  private readonly fullscreenButton: HTMLButtonElement
  private readonly seekInput: HTMLInputElement
  private readonly timeStartLabel: HTMLElement
  private readonly timeEndLabel: HTMLElement

  private currentSighting: Sighting = Sighting.create()
  private player: Player
  private loopEnabled = true

  /** Set to false by composing elements that need the canvas's own click for something else
   * instead of toggling playback — see UfoRecorderElement, which uses pointerdown/pointermove on
   * this same canvas to place shapes while recording. */
  enableClickToPlay = true
  /** The element the fullscreen button requests fullscreen on — defaults to this component's own
   * stage. SceneElement overrides this to its own (outer) stage, since fullscreening just the
   * nested <rr0-ufo>'s stage would hide the 3D backdrop canvas (a sibling outside it). */
  fullscreenTarget: HTMLElement
  /** Matches the template's baked-in English defaults until (if ever) loadLocaleMessages()
   * resolves a better match — see its doc comment. */
  private messages: UfoMessages = ufoMessages_en

  /** The sighting's real reported duration/start, cached by updateTimeLabels() so onFrame doesn't
   * recompute them every animation frame — see formatPosition, which turns a `Timeline` position
   * (ms since recording start) into what's actually displayed. */
  private realDurationMs: number | undefined
  private realStartMs: number | undefined

  /** Bound once so document.removeEventListener (disconnectedCallback) can actually find it. */
  private readonly handleFullscreenChange = () => this.updateFullscreenButton()

  constructor() {
    super()
    this.shadow = this.attachShadow({ mode: "open" })
    const template = document.createElement("template")
    template.innerHTML = `<style>${css}</style>${html}`
    this.shadow.appendChild(template.content.cloneNode(true))

    this.stageElement = this.shadow.getElementById("stage")!
    this.canvas = this.shadow.getElementById("canvas") as HTMLCanvasElement
    this.canvasRenderer = new CanvasRenderer(this.canvas.getContext("2d")!)
    this.toolbar = this.shadow.getElementById("toolbar")!
    this.playPauseButton = this.shadow.getElementById("play-pause") as HTMLButtonElement
    this.loopButton = this.shadow.getElementById("loop") as HTMLButtonElement
    this.fullscreenButton = this.shadow.getElementById("fullscreen") as HTMLButtonElement
    this.seekInput = this.shadow.getElementById("seek") as HTMLInputElement
    this.timeStartLabel = this.shadow.getElementById("time-start")!
    this.timeEndLabel = this.shadow.getElementById("time-end")!
    this.fullscreenTarget = this.stageElement

    this.playPauseButton.addEventListener("click", () => this.togglePlayPause())
    this.loopButton.addEventListener("click", () => this.toggleLoop())
    this.fullscreenButton.addEventListener("click", () => this.toggleFullscreen())
    this.seekInput.addEventListener("input", () => this.player.seek(Number(this.seekInput.value)))
    this.canvas.addEventListener("click", () => {
      if (this.enableClickToPlay) this.togglePlayPause()
    })
    document.addEventListener("fullscreenchange", this.handleFullscreenChange)

    this.player = this.createPlayer()
    this.updateTimeLabels()
    this.updatePlayPauseButton()
    this.updateFullscreenButton()
    this.refresh()
    void this.loadLocaleMessages()
  }

  connectedCallback(): void {
    const src = this.getAttribute("src")
    if (src) {
      void this.loadFromSrc(src)
    }
  }

  disconnectedCallback(): void {
    document.removeEventListener("fullscreenchange", this.handleFullscreenChange)
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
    this.updatePlayPauseButton()
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
    this.timeStartLabel.textContent = this.formatPosition(t)
    // Catches the player stopping on its own (reaching the end without loop), not just clicks —
    // safe to read playbackState here since Player.play() flips it before painting the last frame.
    this.updatePlayPauseButton()
  }

  private createPlayer(): Player {
    const player = new Player(this.currentSighting.timeline, (t, shapesBySource) => this.onFrame(t, shapesBySource))
    player.loop = this.loopEnabled
    return player
  }

  private togglePlayPause(): void {
    if (this.player.playbackState === "playing") {
      this.player.pause()
    } else {
      this.player.play()
    }
    this.updatePlayPauseButton()
  }

  private updatePlayPauseButton(): void {
    const isPlaying = this.player.playbackState === "playing"
    this.playPauseButton.textContent = isPlaying ? "⏸" : "▶"
    this.playPauseButton.title = isPlaying ? this.messages.pause : this.messages.play
    this.playPauseButton.setAttribute("aria-label", isPlaying ? this.messages.pause : this.messages.play)
    // Auto-hides the toolbar while playing (reappears on hover/focus — see the CSS) so it doesn't
    // sit over the scene the whole time; always shown while paused/stopped, since that's when the
    // user is most likely to want it (e.g. right after it stopped, or to scrub before playing).
    this.toolbar.classList.toggle("auto-hide", isPlaying)
    this.fullscreenButton.classList.toggle("auto-hide", isPlaying)
  }

  private toggleLoop(): void {
    this.loopEnabled = !this.loopEnabled
    this.loopButton.setAttribute("aria-pressed", String(this.loopEnabled))
    this.player.loop = this.loopEnabled
  }

  private toggleFullscreen(): void {
    if (document.fullscreenElement) {
      void document.exitFullscreen()
    } else {
      // Logged (not silently swallowed): the most common real-world rejection reasons — an
      // embedding <iframe> missing allow="fullscreen", or a Permissions-Policy header disabling
      // it — give no other visible symptom otherwise.
      this.fullscreenTarget.requestFullscreen().catch(err => {
        console.error("<rr0-ufo>: requestFullscreen() failed —", err)
      })
    }
  }

  private updateFullscreenButton(): void {
    const isFullscreen = document.fullscreenElement === this.fullscreenTarget
    this.fullscreenButton.title = isFullscreen ? this.messages.exitFullscreen : this.messages.fullscreen
    this.fullscreenButton.setAttribute("aria-label", this.fullscreenButton.title)
  }

  /**
   * Auto-detects the visitor's preferred UI language from `navigator.languages`, falling back to
   * English (already baked into the template) when none of their preferences are supported —
   * see selectLocale. There is deliberately no language-picker UI: this is the only mechanism.
   */
  private async loadLocaleMessages(): Promise<void> {
    const language = selectLocale(navigator.languages, UFO_SUPPORTED_LANGUAGES) as UfoLanguage
    if (language === "en") return
    this.applyMessages(await loadUfoMessages(language))
  }

  private applyMessages(messages: UfoMessages): void {
    this.messages = messages
    this.timeStartLabel.title = messages.currentPosition
    this.timeEndLabel.title = messages.duration
    this.loopButton.title = messages.autoReplay
    this.loopButton.setAttribute("aria-label", messages.autoReplay)
    this.updatePlayPauseButton()
    this.updateFullscreenButton()
  }

  /**
   * Caches the sighting's real-world reported duration/start (see sightingDurationMs) and sets
   * the player's playback rate and the seek bar's end label from them, rather than from
   * `timeline.duration` (how long the recording itself took to author).
   */
  private updateTimeLabels(): void {
    const event = this.currentSighting.event
    const durationMs = sightingDurationMs(event)
    this.realDurationMs = durationMs !== undefined && durationMs > 0 ? durationMs : undefined
    this.realStartMs = event.time ? sightingTimeToMs(event.time) : undefined

    this.player.playbackRate =
      this.realDurationMs !== undefined ? this.currentSighting.timeline.duration / this.realDurationMs : 1

    this.timeEndLabel.textContent = this.formatEndOfTimeline()
    this.timeStartLabel.textContent = this.formatPosition(this.player.time)
  }

  /**
   * Turns a `Timeline` position (ms since recording start, i.e. what Player deals in) into what's
   * actually displayed: a real clock time (e.g. "02:47") when a real start/duration are both
   * known, an elapsed real duration ("0:00" based) when only the duration is known, or the
   * recording's own elapsed time when neither is known — see updateTimeLabels.
   */
  private formatPosition(t: number): string {
    if (this.realDurationMs === undefined) return formatElapsed(t)
    const timelineDuration = this.currentSighting.timeline.duration
    const realElapsedMs = timelineDuration > 0 ? (t / timelineDuration) * this.realDurationMs : 0
    return this.realStartMs !== undefined
      ? formatClockTime(msToTimeOfDay(this.realStartMs + realElapsedMs))
      : formatElapsed(realElapsedMs)
  }

  /**
   * The fixed end-of-timeline label — always the *full* real declared duration (clock time or
   * elapsed), or the recording's own length when no real duration is known. Unlike
   * formatPosition, doesn't scale by `timeline.duration`: a single-keyframe/static recording
   * (timeline.duration === 0) still has a full declared real duration to show as its end.
   */
  private formatEndOfTimeline(): string {
    if (this.realDurationMs === undefined) return formatElapsed(this.currentSighting.timeline.duration)
    return this.realStartMs !== undefined
      ? formatClockTime(msToTimeOfDay(this.realStartMs + this.realDurationMs))
      : formatElapsed(this.realDurationMs)
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
