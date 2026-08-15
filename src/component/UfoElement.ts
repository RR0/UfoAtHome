import { html, css } from "./ufoTemplate.js"
import { Sighting, sightingDurationMs, sightingTimeToMs } from "../engine/model/Sighting.js"
import type { SightingTime } from "../engine/model/Sighting.js"
import { Player } from "../engine/playback/Player.js"
import type { PlaybackState } from "../engine/playback/Player.js"
import { CanvasRenderer } from "../render/CanvasRenderer.js"
import { fromSightingJson, toSightingJson } from "../engine/persistence/sightingJson.js"
import type { SightingRecordingJson } from "../engine/persistence/sightingJson.js"
import type { Shape } from "../engine/shape/Shape.js"
import { ShapeHandles } from "../engine/shape/ShapeHandles.js"
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
const EMPTY_SELECTION: ReadonlySet<string> = new Set()

export class UfoElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ["src"]
  }

  private readonly shadow: ShadowRoot
  private readonly stageElement: HTMLElement
  private readonly canvas: HTMLCanvasElement
  private readonly canvasRenderer: CanvasRenderer
  private readonly tooltip: HTMLElement
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
  private highlightedSourceIds: Set<string> = new Set()
  /** Sources a composing SceneElement has determined sit directly behind a decor object right
   * now (see SceneRenderer.isScreenPointOccluded) — skipped entirely on the next paint, not
   * faded, matching how a real object disappearing behind a building looks. Stays empty (no
   * effect) for a bare `<rr0-ufo>`/`<rr0-ufo-recorder>` embed with no 3D decor to occlude
   * against. */
  private occludedSourceIds: ReadonlySet<string> = EMPTY_SELECTION

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

  /** Identifies whatever VISIBLE shape (if any) is under the pointer and shows/moves/hides a text
   * label next to it, but only when that shape actually has a title — an untitled shape's raw
   * sourceId (e.g. "ufo-2") is an internal authoring detail, not something an end-user-facing
   * tooltip should ever surface (contrast UfoRecorderElement's own shapeLabel(), which deliberately
   * does fall back to the sourceId for its own source-picker dropdown). Mirrors SceneElement's
   * near-identical hoverTooltip/handlePointerMove for celestial bodies/decor. Excludes
   * occludedSourceIds from the hit test (see Timeline.hitTest's own doc comment) — a shape hidden
   * behind decor isn't visually there for the pointer to be hovering, so its name shouldn't surface
   * either; SceneElement's own handlePointerMove instead shows whatever decor actually occludes it
   * there (see its hasVisibleShapeAt check). */
  private readonly handlePointerMove = (event: PointerEvent): void => {
    const point = this.canvasPointFromEvent(event)
    const hit = point && this.currentSighting.timeline.hitTest(this.currentTime, point.x, point.y, this.occludedSourceIds)
    if (!hit?.shape.title) {
      this.tooltip.hidden = true
      return
    }
    this.tooltip.textContent = hit.shape.title
    this.tooltip.hidden = false
    // Positioned relative to #stage (the tooltip's own offsetParent), not the page — clientX/Y
    // are page-relative, so subtracting the stage's own origin converts them to that local frame.
    const stageRect = this.stageElement.getBoundingClientRect()
    this.tooltip.style.left = `${event.clientX - stageRect.left + 12}px`
    this.tooltip.style.top = `${event.clientY - stageRect.top + 12}px`
  }

  private readonly handlePointerLeave = (): void => {
    this.tooltip.hidden = true
  }

  constructor() {
    super()
    this.shadow = this.attachShadow({ mode: "open" })
    const template = document.createElement("template")
    template.innerHTML = `<style>${css}</style>${html}`
    this.shadow.appendChild(template.content.cloneNode(true))

    this.stageElement = this.shadow.getElementById("stage")!
    this.canvas = this.shadow.getElementById("canvas") as HTMLCanvasElement
    this.canvasRenderer = new CanvasRenderer(this.canvas.getContext("2d")!)
    this.tooltip = this.shadow.getElementById("tooltip")!
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
    this.canvas.addEventListener("pointermove", this.handlePointerMove)
    this.canvas.addEventListener("pointerleave", this.handlePointerLeave)
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
    // Without this, switching sightings mid-playback (e.g. EyewitnessElement's witness picker)
    // orphans the old Player: its requestAnimationFrame loop was never cancelled, so it keeps
    // ticking in the background — calling this same onFrame with the *old* timeline's positions
    // and fighting the new player for the canvas/seek bar/labels. Symptom: after switching
    // witnesses mid-play, clicking to pause only pauses the new player while the old one keeps
    // looping underneath it, which looks exactly like "pause resets to the start" since the old
    // player's loop keeps repainting frame 0 onward.
    this.player.stop()
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

  /** Exposed so UfoRecorderElement can write an appearance edit at the exact instant the
   * (already-visible) seek bar is currently scrubbed to. */
  get currentTime(): number {
    return this.player.time
  }

  /** Exposed so a composing element with its own external scrub control (see UfoRecorderElement,
   * which hides this element's own overlay toolbar and drives an external one instead) can seek
   * without reaching into the private `player`. */
  set currentTime(t: number) {
    this.player.seek(t)
  }

  /** Exposed for the same reason as the `currentTime` setter — an external seek control needs the
   * same range (`0..seekableDuration`) the internal seek `<input>` itself uses (see `refresh()`). */
  get seekableDuration(): number {
    return this.player.seekableDuration
  }

  /** Exposed for the same reason as the `currentTime` setter — an external Auto-replay button
   * needs to read/reflect the current loop state. Named to avoid colliding with the private
   * `loopEnabled` field this mirrors. */
  get autoReplayEnabled(): boolean {
    return this.loopEnabled
  }

  /** The already-computed, human-readable elapsed-position/total-duration text this element's own
   * (possibly hidden, see showToolbar) time labels show — exposed so a composing element's
   * external playback row (see UfoRecorderElement) can display the same text instead of re-
   * deriving it. This is NOT just a convenience: `currentTime`/`seekableDuration` are `Player`'s
   * own TIMELINE-position units, which advance at `playbackRate`× real wall-clock speed — that
   * rate is exactly `timelineDuration / realDurationMs` (see updateTimeLabels), so it's almost
   * never 1. Formatting those raw values directly as if they were real milliseconds shows a
   * duration that doesn't match the declared real observation length and ticks at the wrong
   * real-time speed. `formatPosition`/`formatEndOfTimeline` already do this scaling correctly;
   * reading their last-computed output is simpler and safer than duplicating that math
   * externally. */
  get positionLabel(): string {
    return this.timeStartLabel.textContent ?? ""
  }

  get durationLabel(): string {
    return this.timeEndLabel.textContent ?? ""
  }

  /** Hides this element's own overlaid play/seek/loop bar — set by a composing element that
   * drives an external playback UI of its own instead (see UfoRecorderElement, which needs the
   * bottom of the canvas free for dragging/resizing shapes; the overlay's seek `<input>` is
   * `flex: 1` and would otherwise intercept nearly the full width of that area). Only `.toolbar`
   * is affected — the fullscreen button (top-right corner) is unrelated and stays as-is. */
  set showToolbar(show: boolean) {
    this.toolbar.classList.toggle("hidden", !show)
  }

  /** Exposed so UfoRecorderElement can avoid editing/resyncing appearance while actively
   * playing, when the playhead is a moving target rather than a specific instant. */
  get playbackState(): PlaybackState {
    return this.player.playbackState
  }

  get selectedSourceIds(): ReadonlySet<string> {
    return this.highlightedSourceIds
  }

  /** The sighting's reported real-world duration in seconds (event.durationSeconds) — takes
   * precedence over endTime/time when computing playback speed (see sightingDurationMs).
   * Exposed so UfoRecorderElement can offer a duration input in its own editor UI, patching
   * just this field rather than reconstructing the whole Sighting/Timeline via sightingData. */
  get durationSeconds(): number | undefined {
    return this.currentSighting.event.durationSeconds
  }

  set durationSeconds(seconds: number | undefined) {
    this.currentSighting.event.durationSeconds = seconds
    this.updateTimeLabels()
    // updateTimeLabels() alone doesn't touch the seek bar's own range — without this, the
    // slider stayed capped at timeline.duration (e.g. 0 on a still-empty recording) even
    // though a longer real duration is now known and seekable (see Player.seekableDuration).
    this.refresh()
    // Declaring a real duration (or clearing one back to nothing recorded) changes
    // seekableDuration, which is what decides whether Play is even enabled — see
    // updatePlayPauseButton().
    this.updatePlayPauseButton()
  }

  /** Exposed so UfoRecorderElement can visually flag the shape(s) currently selected in its own
   * editor UI, reusing CanvasRenderer's existing selection-handle rendering — purely a
   * paint-time hint, never persisted (Shape.selected is never written by any Timeline/JSON
   * code path, so this can't leak into a saved sighting). A single selected id gets the same
   * per-shape handle treatment as before; multiple ids get individual outlines plus one shared
   * group-bbox handle overlay — see onFrame. */
  set selectedSourceIds(ids: ReadonlySet<string> | Iterable<string>) {
    const next = new Set(ids)
    const unchanged =
      next.size === this.highlightedSourceIds.size && [...next].every(id => this.highlightedSourceIds.has(id))
    if (unchanged) return
    this.highlightedSourceIds = next
    this.refresh()
  }

  /** Called by a composing SceneElement on every playback tick/seek with whichever sources are
   * currently occluded by decor — see its own updateUfoOcclusion. Deduped the same way as
   * selectedSourceIds above so a steady "still occluded"/"still visible" state doesn't force a
   * repaint every single frame. */
  setOccludedSourceIds(ids: ReadonlySet<string>): void {
    const unchanged =
      ids.size === this.occludedSourceIds.size && [...ids].every(id => this.occludedSourceIds.has(id))
    if (unchanged) return
    this.occludedSourceIds = ids
    this.refresh()
  }

  /** True when a currently-visible (non-occluded) shape — titled or not — sits at (x, y) in this
   * element's own fixed 640x360 canvas drawing space, at the current playhead. Exposed so a
   * composing SceneElement's own hover tooltip (handlePointerMove) can check this first before
   * falling through to a celestial body or decor object's name — the shape overlay sits visually
   * on top of the 3D scene, so whenever a visible shape is there, it (not whatever's behind it) is
   * what the pointer is actually hovering; this element's own tooltip already handles that case
   * (title-only, see handlePointerMove's own doc comment). */
  hasVisibleShapeAt(x: number, y: number): boolean {
    return this.currentSighting.timeline.hitTest(this.currentTime, x, y, this.occludedSourceIds) !== undefined
  }

  /**
   * Re-reads the timeline's duration into the seek slider and repaints the
   * current frame — call after externally mutating `sighting.timeline`
   * (e.g. UfoRecorderElement adding keyframes while recording).
   */
  refresh(): void {
    this.seekInput.max = String(this.player.seekableDuration)
    this.player.seek(this.player.time)
  }

  /** Converts a pointer event's CSS-pixel position into the canvas's fixed internal 640x360
   * drawing space (where Shape.bounds/Timeline.hitTest operate), correcting for the canvas being
   * displayed responsively at a different CSS size. Mirrors UfoRecorderElement's own identical
   * (but private-to-that-class) canvasPointFromEvent — this is the only other call site. */
  private canvasPointFromEvent(event: PointerEvent): { x: number; y: number } | undefined {
    const rect = this.canvas.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return undefined
    return {
      x: ((event.clientX - rect.left) / rect.width) * this.canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * this.canvas.height
    }
  }

  private onFrame(t: number, shapesBySource: Map<string, Shape>): void {
    this.canvasRenderer.clear(this.canvas.width, this.canvas.height)
    // Selection handles are an editing affordance — hidden while actively playing, matching
    // the toolbar's own auto-hide-while-playing convention.
    const selectedIds = this.playbackState !== "playing" ? this.highlightedSourceIds : EMPTY_SELECTION
    for (const [sourceId, shape] of shapesBySource) {
      if (this.occludedSourceIds.has(sourceId)) continue
      const isSelected = selectedIds.has(sourceId)
      if (isSelected && selectedIds.size === 1) {
        this.canvasRenderer.paintShape({ ...shape, selected: true })
      } else {
        this.canvasRenderer.paintShape(shape)
        if (isSelected) this.canvasRenderer.paintMemberOutline(shape)
      }
    }
    if (selectedIds.size > 1) {
      const bounds = ShapeHandles.groupBoundsFor(
        [...shapesBySource].filter(([sourceId]) => selectedIds.has(sourceId)).map(([, shape]) => shape.bounds)
      )
      this.canvasRenderer.paintGroupHandles(bounds)
    }
    this.seekInput.value = String(t)
    this.timeStartLabel.textContent = this.formatPosition(t)
    // Catches the player stopping on its own (reaching the end without loop), not just clicks —
    // safe to read playbackState here since Player.play() flips it before painting the last frame.
    this.updatePlayPauseButton()
    // Mirrors <video>'s own timeupdate event/semantics — fires on every playback tick AND every
    // seek, since both funnel through this one onFrame sink. Lets UfoRecorderElement know when
    // to resync its appearance toolbar to whatever's at the current playhead.
    this.dispatchEvent(new CustomEvent("timeupdate", { detail: { time: t } }))
  }

  private createPlayer(): Player {
    const player = new Player(this.currentSighting.timeline, (t, shapesBySource) => this.onFrame(t, shapesBySource))
    player.loop = this.loopEnabled
    return player
  }

  /** Public (not just used by this element's own overlay button) so a composing element's
   * external Play/Pause control — see UfoRecorderElement/showToolbar — can trigger exactly this
   * same guarded behavior instead of reimplementing it. */
  togglePlayPause(): void {
    // Nothing to play — the button is already disabled for this case, but the canvas's own
    // click-to-play (enableClickToPlay) has no native "disabled" state of its own, so this guard
    // is what actually stops it there.
    if (this.player.seekableDuration <= 0) return
    if (this.player.playbackState === "playing") {
      this.player.pause()
      // pause() doesn't itself trigger a repaint — force one so the selection highlight
      // (hidden while playing) reappears immediately instead of staying hidden until some
      // unrelated repaint happens to occur.
      this.refresh()
    } else {
      this.player.play()
    }
    this.updatePlayPauseButton()
  }

  private updatePlayPauseButton(): void {
    const isPlaying = this.player.playbackState === "playing"
    this.playPauseButton.textContent = isPlaying ? "⏸" : "▶"
    // Nothing to play with zero observation duration (no declared duration and nothing recorded
    // yet) — disabled rather than silently doing nothing on click, which otherwise briefly
    // flickers into "playing" and straight back out again every time (see Player.play()'s
    // immediate-stop branch when seekableDuration is 0). The title/label explain *why* it's
    // disabled instead of just showing a stale "Play" that gives no hint anything's wrong.
    const hasDuration = this.player.seekableDuration > 0
    this.playPauseButton.disabled = !hasDuration
    const label = !hasDuration ? this.messages.noDuration : isPlaying ? this.messages.pause : this.messages.play
    this.playPauseButton.title = label
    this.playPauseButton.setAttribute("aria-label", label)
    // Auto-hides the toolbar while playing (reappears on hover/focus — see the CSS) so it doesn't
    // sit over the scene the whole time; always shown while paused/stopped, since that's when the
    // user is most likely to want it (e.g. right after it stopped, or to scrub before playing).
    this.toolbar.classList.toggle("auto-hide", isPlaying)
    this.fullscreenButton.classList.toggle("auto-hide", isPlaying)
  }

  /** Public for the same reason as togglePlayPause — see its own doc comment. */
  toggleLoop(): void {
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

    const timelineDuration = this.currentSighting.timeline.duration
    // Only stretches when there's actually some raw recorded motion to stretch (preserves the
    // original "quick drag, auto-stretched" behavior exactly). When timelineDuration is 0 —
    // nothing recorded yet, e.g. a duration was just declared before any motion was placed —
    // dividing by realDurationMs would give playbackRate 0, freezing Play the instant it's
    // pressed; falling back to 1 (real-time pace) instead lets it actually advance.
    this.player.playbackRate =
      this.realDurationMs !== undefined && timelineDuration > 0 ? timelineDuration / this.realDurationMs : 1
    // Lets an editor scrub to and place a keyframe anywhere across the full real declared
    // duration before anything's been recorded there yet (see Player.seekableDuration's own doc
    // comment) — but ONLY while there's nothing recorded to stretch, the exact same condition
    // playbackRate uses just above, and for the same reason: once motion exists, the stretch
    // already maps the timeline's whole [0, timelineDuration] range onto the full real duration,
    // so every real instant is reachable within it and extending the range beyond only adds
    // positions with two conflicting meanings. Extending it anyway is what made a real
    // observation's clock run FORWARDS to the declared end at t=timelineDuration and then jump
    // BACKWARDS for the rest of the bar (Socorro on rr0.org: 17:50:20 at 30% of the bar, then
    // 17:50:07 just after, the same 20 seconds shown twice with the object frozen throughout) —
    // formatPosition reads t <= timelineDuration as stretched timeline-ms and anything beyond as
    // raw real-ms, two different time bases on one slider.
    this.player.durationOverrideMs = timelineDuration > 0 ? 0 : (this.realDurationMs ?? 0)

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
    // Only rescales within what's actually been recorded so far (the original "stretch a
    // finished recording to match its real reported length" behavior). Beyond that — scrubbed
    // into not-yet-recorded territory, made reachable by Player.durationOverrideMs — there's no
    // recorded pacing to stretch, so t is already a real-ms position (1 timeline-ms == 1 real-ms
    // is the natural default until real recorded data establishes a different scale).
    const realElapsedMs = timelineDuration > 0 && t <= timelineDuration ? (t / timelineDuration) * this.realDurationMs : t
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
