import { html, css } from "./sceneTemplate.js"
import { UfoElement, registerUfo, UFO_ELEMENT_NAME } from "./UfoElement.js"
import { SceneRenderer } from "../render3d/SceneRenderer.js"
import type { SceneAstronomy } from "../render3d/SceneRenderer.js"
import { loadStarCatalog } from "../render3d/StarCatalog.js"
import type { StarCatalog } from "../render3d/StarCatalog.js"
import {
  computeBodyMagnitude,
  computeBodyPosition,
  computeMoonPhase,
  sightingTimeToDate,
  TRACKED_PLANETS
} from "../engine/astronomy/CelestialPositions.js"
import type { ObserverGeo } from "../engine/astronomy/CelestialPositions.js"
import { resolveObserverPoseAt, resolveWeatherAt } from "../engine/model/Sighting.js"
import type { ObserverPose } from "../engine/model/ObserverTrack.js"
import type { Weather } from "../engine/model/Weather.js"
import type { SightingRecordingJson } from "../engine/persistence/sightingJson.js"
import { selectLocale } from "../i18n/locale.js"
import { WeatherAudio } from "../render3d/WeatherAudio.js"

registerUfo()

/** Display names for pickBodyAt's return keys — note "sun"/"moon" are lowercase (SceneRenderer's
 * own internal keys for those two) while planets are capitalized (CelestialBody values, used
 * verbatim as their own key) — deliberately not unified, since unifying casing would mean
 * SceneRenderer inventing a display-string convention it otherwise has no reason to know about. */
const BODY_NAMES: Record<string, { en: string; fr: string }> = {
  sun: { en: "Sun", fr: "Soleil" },
  moon: { en: "Moon", fr: "Lune" },
  Venus: { en: "Venus", fr: "Vénus" },
  Mars: { en: "Mars", fr: "Mars" },
  Jupiter: { en: "Jupiter", fr: "Jupiter" },
  Saturn: { en: "Saturn", fr: "Saturne" }
}
const BODY_TOOLTIP_SUPPORTED_LANGUAGES = ["en", "fr"]

/** Where the star catalog asset (see scripts/build-star-catalog.ts) is fetched from by default —
 * resolved relative to this module's own URL so it works both from this package's own demo and
 * once bundled/consumed by another site, without hardcoding a site-relative path. Overridable via
 * the star-catalog-src attribute for a consuming site that hosts its own copy. */
const DEFAULT_STAR_CATALOG_URL = new URL("../assets/stars-mag7.5.bin", import.meta.url).href

/** A neutral dusk-ish sky with no Moon/planets/stars, used when a sighting has no recorded
 * date+place to compute real astronomy from. */
const DEFAULT_ASTRONOMY: SceneAstronomy = {
  sun: { altitudeDeg: -3, azimuthDeg: 180, magnitude: -26.7 },
  moon: { altitudeDeg: -90, azimuthDeg: 0, phase: { phaseFraction: 0, illuminatedFraction: 0 }, magnitude: -12.7 },
  planets: []
}

/** Applied to the camera when a sighting has no resolvable observer pose at all (no
 * witnessTrack and no place[0]) — leaves heading undefined so setObserverPose doesn't snap the
 * camera to a default compass direction. */
const DEFAULT_OBSERVER_POSE: ObserverPose = { lat: 0, lng: 0, elevationM: 0, headingDeg: undefined, pitchDeg: 0, fovDeg: 60 }

/**
 * Vanilla Web Component rendering a 3D "decor" (sky/horizon/stars, see
 * SceneRenderer) — named generically (not "ufo-scene") because the decor
 * itself has nothing UFO-specific about it; it could back other kinds of
 * reconstructions later. For now it composes a nested, transparent-
 * background `<rr0-ufo>` on top for the common case (see this project's
 * README: the shape is what the witness reported, possibly a
 * misidentification or optical effect, so it's deliberately never
 * "upgraded" to a 3D-interpreted object; only the surrounding environment,
 * which is independently computable from real astronomy, gets rendered in
 * 3D). A fully generic (slot-based, any overlay content) version is a
 * natural follow-up, not done yet — see the README's roadmap.
 *
 * This is the heaviest of the three bundles (pulls in Three.js) — pages
 * that only need playback should use `<rr0-ufo>` directly instead.
 *
 * Astronomy (Sun/Moon/planet positions, real star catalog, sky color) is derived from the
 * sighting's own `time` plus the observer's pose at the current playback instant — see
 * engine/astronomy/CelestialPositions.ts and resolveObserverPoseAt (engine/model/Sighting.ts),
 * which prefers the sighting's `witnessTrack` and falls back to the legacy static `place[0]`.
 * Recomputed on every playback tick/seek (via the nested `<rr0-ufo>`'s own `timeupdate` event,
 * not a separate animation loop of its own), so the sky, and the camera's own heading/pitch/fov,
 * both follow the observer as they change over the sighting's timeline.
 */
export class SceneElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ["src", "star-catalog-src", "show-compass", "lens-flare-intensity", "lens-flare-brightness"]
  }

  private readonly shadow: ShadowRoot
  private readonly stageElement: HTMLElement
  private readonly frameElement: HTMLElement
  private readonly sceneCanvas: HTMLCanvasElement
  /** Exposed (not private) so a composing wrapper — e.g. UfoRecorderElement, which nests a
   * `<rr0-scene>` instead of a bare `<rr0-ufo>` so the sky renders live behind the shape being
   * authored — can reach through to the same UfoElement instance this element already drives,
   * rather than needing a separate sightingData-relay to keep two copies in sync. Same
   * "expose the nested element to a composing wrapper" precedent as UfoElement's own
   * sighting/canvasElement/renderer getters. */
  readonly ufoElement: UfoElement
  private readonly sceneRenderer: SceneRenderer
  private readonly bodyTooltip: HTMLElement
  private resizeObserver?: ResizeObserver
  private lastTimeMs = 0
  private starCatalog?: StarCatalog
  /** Owned here, not by SceneRenderer — the renderer stays audio-agnostic (see its own
   * onLightningFlash callback param), this is the one place that already orchestrates a non-
   * rendering side effect alongside pure rendering (see the terrain-attribution label above). */
  private readonly weatherAudio = new WeatherAudio()
  private thunderTimeoutId?: number

  /** Bound once so document.removeEventListener (disconnectedCallback) can actually find it. */
  private readonly handleFullscreenChange = () => this.resizeToStage()

  /** Identifies whatever celestial body (if any) is under the pointer and shows/moves/hides a
   * text label next to it — an on-demand identification aid, not a rendering change (see
   * pickBodyAt's own doc comment on why hit-testing uses a bigger invisible area than the real,
   * true-to-scale visible disc). Also reveals the compass labels (see setCompassHovered) for as
   * long as the pointer stays over the canvas — same on-demand spirit, so neither overlay competes
   * for attention with the scene itself the rest of the time. Listens on the nested `<rr0-ufo>`'s
   * own canvas (not the 3D scene-canvas directly) since that transparent overlay always sits on top
   * and would otherwise swallow every pointer event before the 3D layer ever saw them. */
  private readonly handlePointerMove = (event: PointerEvent) => {
    this.sceneRenderer.setCompassHovered(true)
    const canvas = this.ufoElement.canvasElement
    const rect = canvas.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return
    const ndcX = ((event.clientX - rect.left) / rect.width) * 2 - 1
    const ndcY = -(((event.clientY - rect.top) / rect.height) * 2 - 1)
    const bodyKey = this.sceneRenderer.pickBodyAt(ndcX, ndcY)
    if (!bodyKey) {
      this.bodyTooltip.hidden = true
      return
    }
    const language = selectLocale(navigator.languages, BODY_TOOLTIP_SUPPORTED_LANGUAGES) as "en" | "fr"
    this.bodyTooltip.textContent = BODY_NAMES[bodyKey]?.[language] ?? bodyKey
    this.bodyTooltip.hidden = false
    // Positioned relative to #stage (the tooltip's own offsetParent), not the page — clientX/Y are
    // page-relative, so subtracting the stage's own origin converts them to that local frame.
    const stageRect = this.stageElement.getBoundingClientRect()
    this.bodyTooltip.style.left = `${event.clientX - stageRect.left + 12}px`
    this.bodyTooltip.style.top = `${event.clientY - stageRect.top + 12}px`
  }

  private readonly handlePointerLeave = () => {
    this.bodyTooltip.hidden = true
    this.sceneRenderer.setCompassHovered(false)
  }

  /** SceneRenderer's onLightningFlash fires the instant the visual flash starts — the thunder
   * delay (simulating distance: sound travels far slower than light) is applied here, not in the
   * renderer or WeatherAudio itself, keeping that timing decision at the one layer that already
   * owns both the flash event and the audio object. A plain setTimeout (not the renderer's own RAF
   * loop) is fine here: this is a one-off real-world delay, not per-frame animation state. */
  private readonly handleLightningFlash = () => {
    clearTimeout(this.thunderTimeoutId)
    const delayMs = (0.5 + Math.random() * 3.5) * 1000
    this.thunderTimeoutId = window.setTimeout(() => this.weatherAudio.playThunder(), delayMs)
  }

  /** Unlocks weather audio on the very first interaction with the scene — needed even for a
   * read-only `<rr0-scene>` embed with no editing UI at all (e.g. a published case page whose
   * sighting.json already sets rain/wind), which has no "weather control" to hang resume() off of
   * the way UfoRecorderElement's own updateWeather() does. Re-applies the current weather right
   * after resuming, since any setWeather() call made *before* this (e.g. from the sightingData
   * setter at load) was itself a no-op audio-wise while the context didn't exist yet — otherwise a
   * scene loaded with rain already set would render visible rain but never actually start the
   * sound until weather changed again, which it might never do. */
  private readonly handleFirstInteraction = () => {
    this.weatherAudio.resume()
    this.setWeather(resolveWeatherAt(this.ufoElement.sighting, this.lastTimeMs))
  }

  /** Reuses the nested <rr0-ufo>'s own playback clock (it already dispatches this on every
   * Player tick and every seek, mirroring <video>'s timeupdate) instead of running a second,
   * separate animation loop just for astronomy. */
  private readonly handleTimeUpdate = (event: Event) => {
    this.lastTimeMs = (event as CustomEvent<{ time: number }>).detail.time
    this.updateAstronomy(this.lastTimeMs)
  }

  constructor() {
    super()
    this.shadow = this.attachShadow({ mode: "open" })
    const template = document.createElement("template")
    template.innerHTML = `<style>${css}</style>${html}`
    this.shadow.appendChild(template.content.cloneNode(true))

    this.stageElement = this.shadow.getElementById("stage")!
    // The aspect-ratio-constrained box that actually gets rendered into — distinct from #stage,
    // which is what goes browser-fullscreen and gets forced to fill the whole viewport
    // regardless of aspect ratio (see sceneTemplate.ts's `.stage:fullscreen .frame` rule).
    // Resizing must track *this* element's box, not #stage's or the host's own.
    this.frameElement = this.shadow.getElementById("frame")!
    this.sceneCanvas = this.shadow.getElementById("scene-canvas") as HTMLCanvasElement
    this.sceneRenderer = new SceneRenderer(this.sceneCanvas, undefined, this.handleLightningFlash)
    this.bodyTooltip = this.shadow.getElementById("body-tooltip")!

    // Created imperatively rather than left inline in the template markup — see
    // UfoRecorderElement's constructor for why (an inline tag parsed from
    // template.content.cloneNode(true) isn't upgraded to its class instance yet at this point).
    this.ufoElement = document.createElement(UFO_ELEMENT_NAME) as UfoElement
    this.ufoElement.classList.add("ufo-overlay")
    this.ufoElement.style.setProperty("--ufo-canvas-background", "transparent")
    this.ufoElement.style.setProperty("--ufo-canvas-border", "none")
    // Otherwise the nested <rr0-ufo>'s own fullscreen button would fullscreen just its own stage
    // (its transparent overlay canvas + toolbar), hiding the 3D backdrop — a sibling outside it.
    this.ufoElement.fullscreenTarget = this.stageElement
    this.shadow.getElementById("ufo-slot")!.replaceWith(this.ufoElement)
    this.ufoElement.addEventListener("timeupdate", this.handleTimeUpdate)
    this.ufoElement.canvasElement.addEventListener("pointermove", this.handlePointerMove)
    this.ufoElement.canvasElement.addEventListener("pointerleave", this.handlePointerLeave)
    this.ufoElement.canvasElement.addEventListener("pointerdown", this.handleFirstInteraction, { once: true })
  }

  connectedCallback(): void {
    this.resizeToStage()
    this.updateAstronomy(this.lastTimeMs)
    void this.loadStars()

    // Keeps the 3D canvas' backing resolution matched to its actual displayed size (e.g. a
    // responsive page width change, or entering/exiting fullscreen) — observing #frame (not the
    // host element) is what actually changes size in both cases; the host's own layout box
    // doesn't necessarily change just because a shadow-DOM-nested descendant goes fullscreen.
    this.resizeObserver = new ResizeObserver(() => this.resizeToStage())
    this.resizeObserver.observe(this.frameElement)
    // Belt-and-suspenders: ResizeObserver timing around fullscreen transitions is inconsistent
    // across browsers (some fire a frame late, or with an intermediate size mid-transition) —
    // explicitly reacting to fullscreenchange too removes any doubt. Same event UfoElement
    // already listens to for its own button icon sync.
    document.addEventListener("fullscreenchange", this.handleFullscreenChange)

    const src = this.getAttribute("src")
    if (src) {
      void this.loadFromSrc(src)
    }
  }

  disconnectedCallback(): void {
    this.resizeObserver?.disconnect()
    document.removeEventListener("fullscreenchange", this.handleFullscreenChange)
    // Otherwise the twinkle animation loop (a continuous requestAnimationFrame chain, unlike the
    // one-shot renders before it) keeps running forever into a detached canvas after unmount.
    this.sceneRenderer.stopTwinkle()
    clearTimeout(this.thunderTimeoutId)
    this.weatherAudio.dispose()
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string): void {
    if (name === "src" && newValue && newValue !== oldValue && this.isConnected) {
      void this.loadFromSrc(newValue)
    }
    if (name === "star-catalog-src" && newValue !== oldValue && this.isConnected) {
      void this.loadStars()
    }
    if (name === "show-compass" && newValue !== oldValue) {
      this.sceneRenderer.setShowCompass(this.hasAttribute("show-compass"))
    }
    if (name === "lens-flare-intensity" && newValue !== oldValue) {
      // How strongly the camera-lens artifacts show around the Sun's always-on dazzle — see
      // SceneRenderer.setLensFlareArtifactIntensity's own doc comment on why this is independent
      // of lens-flare-brightness (comparing the same reported brightness naked-eye vs. as a camera
      // would have captured it). Absent/unparseable defaults to 0 — no artifacts, matching the
      // slider's own default.
      const parsed = newValue === null ? NaN : parseFloat(newValue)
      this.sceneRenderer.setLensFlareArtifactIntensity(Number.isFinite(parsed) ? parsed : 0)
    }
    if (name === "lens-flare-brightness" && newValue !== oldValue) {
      // Absent/unparseable defaults to 1 — SceneRenderer's own tuned baseline look. `|| 1` here
      // would be wrong: parseFloat("0") is the legitimate number 0, which is falsy, so `0 || 1`
      // silently becomes 1 — exactly the reported bug (dragging the slider to 0 still showed the
      // default brightness). Number.isFinite is what actually distinguishes "genuinely 0" from
      // "absent/NaN".
      const parsed = newValue === null ? NaN : parseFloat(newValue)
      this.sceneRenderer.setDazzleIntensity(Number.isFinite(parsed) ? parsed : 1)
    }
  }

  /** Forces the compass labels visible independent of pointer hover — see
   * SceneRenderer.setCompassForced's own doc comment. `UfoRecorderElement` calls this from the
   * heading input's own focus/blur, a direct method rather than another observed attribute since
   * it's meant to change far more often (every focus/blur) than `show-compass`'s one-time setup. */
  setCompassForced(forced: boolean): void {
    this.sceneRenderer.setCompassForced(forced)
  }

  /** Applies a weather condition to both the visual renderer and the ambient/wind audio — called
   * every tick from updateAstronomy() (weather is now itself resolved per-instant from a keyframe
   * track, see Sighting.resolveWeatherAt, same as observer pose) as well as once explicitly from
   * handleFirstInteraction (to re-apply whatever's current the moment audio unlocks). Callers
   * always pass an already-resolved Weather — resolveWeatherAt itself never returns undefined, it
   * falls all the way through to DEFAULT_WEATHER — so this takes a required Weather, not an
   * optional one to default here. */
  setWeather(weather: Weather): void {
    this.sceneRenderer.setWeather(weather)
    this.weatherAudio.setAmbient(weather.precipitationType, weather.precipitationIntensity, weather.windSpeed)
  }

  /** Finds which decor object (if any) sits under normalized device coordinates — a thin
   * passthrough to SceneRenderer.pickDecorAt, same "expose one method, not the whole renderer"
   * convention as setWeather/currentTerrainAttribution above. Used by UfoRecorderElement's own
   * right-click handler (see its onContextMenu) to offer "view this witness's testimony". */
  pickDecorAt(ndcX: number, ndcY: number): string | undefined {
    return this.sceneRenderer.pickDecorAt(ndcX, ndcY)
  }

  /** Unlocks weather audio — see WeatherAudio.resume's own doc comment on why this needs a real
   * user gesture. UfoRecorderElement calls this from its own weather toolbar's first interaction
   * (handleFirstInteraction covers the other case: a read-only embed with no editing UI at all). */
  resumeWeatherAudio(): void {
    this.weatherAudio.resume()
  }

  /** Fetches a SightingRecordingJson from `url` and loads it — what the `src` attribute uses. */
  async loadFromSrc(url: string): Promise<void> {
    const response = await fetch(url)
    this.sightingData = (await response.json()) as SightingRecordingJson
  }

  get sightingData(): SightingRecordingJson {
    return this.ufoElement.sightingData
  }

  set sightingData(json: SightingRecordingJson) {
    this.ufoElement.sightingData = json
    this.lastTimeMs = 0
    // Also resolves+applies weather at t=0 — see updateAstronomy's own doc comment.
    this.updateAstronomy(0)
  }

  /** Undefined until a real, location-accurate terrain relief patch has finished its async build
   * (see SceneRenderer.setTerrainOrigin) — exposed for a composing wrapper's own on-demand credit
   * display (see EyewitnessElement's info panel) rather than this element painting a permanent
   * corner label itself; a real-time pull (not push/cached) since it can resolve at any time. */
  get currentTerrainAttribution(): string | undefined {
    return this.sceneRenderer.currentTerrainAttribution
  }

  private resizeToStage(): void {
    const rect = this.frameElement.getBoundingClientRect()
    const width = Math.max(1, Math.round(rect.width))
    const height = Math.max(1, Math.round(rect.height))
    this.sceneCanvas.width = width
    this.sceneCanvas.height = height
    this.sceneRenderer.resize(width, height)
  }

  /** Fetches the star catalog asset once (or again, if star-catalog-src changes) — rendering
   * proceeds without stars until this resolves, then repaints at the current playback position. */
  private async loadStars(): Promise<void> {
    const url = this.getAttribute("star-catalog-src") ?? DEFAULT_STAR_CATALOG_URL
    this.starCatalog = await loadStarCatalog(url)
    this.updateAstronomy(this.lastTimeMs)
  }

  /** Resolves the observer's pose and, whenever *any* date/time information is known (even just an
   * hour, with no date at all — see sightingTimeToDate's own reference-date fallback), real Sun/
   * Moon/planet/star positions at playback instant `t` (milliseconds since the recording started —
   * added on top of the sighting's own recorded start time, so a multi-minute sighting's sky can
   * itself advance during playback). Falls back to a neutral DEFAULT_ASTRONOMY sky only when
   * there's nothing at all to compute from. Partial information renders a "good enough" preview
   * rather than nothing: a known time but no real lat/lng yet (e.g. mid-authoring in
   * `<rr0-ufo-recorder>`, where the witness's heading/time might be set before their location is)
   * still renders real astronomy, using DEFAULT_OBSERVER_POSE's lat/lng (0,0) purely as a
   * *rendering* fallback — this is never written back into the sighting's own data, it just means
   * a date/time or heading edit gives live visual feedback before a location is entered. The
   * observer's own heading/pitch/fov always applies to the camera regardless, since that part
   * doesn't need a date or a location either. */
  private updateAstronomy(t: number): void {
    const sighting = this.ufoElement.sighting
    // Resolved here (not left to the sightingData setter's one-time call, or an explicit nudge on
    // edit) since weather is now itself keyframed over time — see Sighting.resolveWeatherAt. Cheap
    // even every tick: setWeather/SceneRenderer.setWeather both dedupe on actual field values, not
    // just call frequency (see SceneRenderer.setWeather's own doc comment).
    this.setWeather(resolveWeatherAt(sighting, t))
    this.sceneRenderer.setDecor(sighting.decor)
    const pose = resolveObserverPoseAt(sighting, t)
    this.sceneRenderer.setObserverPose(pose ?? DEFAULT_OBSERVER_POSE)
    // Keeps decor anchored to its own real-world spot rather than sliding along with a moving
    // witness — see SceneRenderer.updateDecorAnchoring's own doc comment. The reference pose is
    // always the recording's own t=0, regardless of what t is being rendered right now.
    this.sceneRenderer.updateDecorAnchoring(resolveObserverPoseAt(sighting, 0), pose)
    // A streetlight/vehicle's own lit state can change mid-recording (a photocell at dusk, a
    // driver's headlights) — see Decor.ts's own resolveDecorLitAt.
    this.sceneRenderer.updateDecorLitState(t)
    // Raw pose's own lat/lng (possibly undefined), never the astronomy fallback below — a real
    // terrain patch must only ever build from a real recorded location, never (0,0).
    this.sceneRenderer.setTerrainOrigin(pose?.lat, pose?.lng)

    const lat = pose?.lat ?? DEFAULT_OBSERVER_POSE.lat!
    const lng = pose?.lng ?? DEFAULT_OBSERVER_POSE.lng!
    const startDate = sightingTimeToDate(sighting.event.time ?? {}, lng)
    if (!startDate) {
      this.sceneRenderer.setAstronomy(DEFAULT_ASTRONOMY)
      return
    }

    const date = new Date(startDate.getTime() + t)
    const observer: ObserverGeo = { lat, lng, elevationM: pose?.elevationM ?? 0 }
    const sun = { ...computeBodyPosition("Sun", date, observer), magnitude: computeBodyMagnitude("Sun", date) }
    const moon = {
      ...computeBodyPosition("Moon", date, observer),
      phase: computeMoonPhase(date),
      magnitude: computeBodyMagnitude("Moon", date)
    }
    const planets = TRACKED_PLANETS.map(body => ({
      body,
      position: computeBodyPosition(body, date, observer),
      magnitude: computeBodyMagnitude(body, date)
    }))

    this.sceneRenderer.setAstronomy({
      sun,
      moon,
      planets,
      stars: this.starCatalog ? { catalog: this.starCatalog, date, observer } : undefined
    })
  }

}

export const SCENE_ELEMENT_NAME = "rr0-scene"

export function registerScene(): void {
  registerUfo()
  if (!customElements.get(SCENE_ELEMENT_NAME)) {
    customElements.define(SCENE_ELEMENT_NAME, SceneElement)
  }
}
