import { html, css } from "./sceneTemplate.js"
import { SightingFetch } from "../engine/net/SightingFetch.js"
import { UfoElement, registerUfo, UFO_ELEMENT_NAME } from "./UfoElement.js"
import { SceneRenderer } from "../render3d/SceneRenderer.js"
import type { TerrainProviders } from "../render3d/terrain/defaultTerrainProviders.js"
import type { SceneAstronomy, SceneComet } from "../render3d/SceneRenderer.js"
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
import type { Sighting } from "../engine/model/Sighting.js"
import type { ObserverPose } from "../engine/model/ObserverTrack.js"
import type { Weather } from "../engine/model/Weather.js"
import type { DecorKind } from "../engine/model/Decor.js"
import type { SightingRecordingJson } from "../engine/persistence/sightingJson.js"
import { HostLocale, selectLocale } from "../i18n/locale.js"
import { WeatherAudio } from "../render3d/WeatherAudio.js"
import { Comets } from "../engine/astronomy/Comets.js"
import { BRIGHT_COMETS } from "../engine/astronomy/cometCatalog.js"
import { MeteorShowers } from "../engine/astronomy/MeteorShowers.js"
import { MeteorFall } from "../engine/astronomy/MeteorFall.js"
import { Sporadics } from "../engine/astronomy/Sporadics.js"
import { SizeEstimate } from "../engine/shape/SizeEstimate.js"
import type { MeterRange } from "../engine/shape/SizeEstimate.js"
import { ApparentSize } from "../engine/shape/ApparentSize.js"
import { Instruments } from "../engine/instrument/Instrument.js"
import { ImageProjection } from "../engine/instrument/ImageProjection.js"
import { SightingShapes } from "../engine/persistence/SightingShapes.js"
import { SkyDrift } from "../engine/astronomy/SkyDrift.js"
import { ExposureSampling } from "../engine/model/ExposureSampling.js"

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

/**
 * What a star's tooltip says, and why it says three things rather than one.
 *
 * A name alone identifies without explaining. What makes a bright point a candidate for a
 * misidentification is how bright it was and how low it stood — a witness reporting a light near
 * the horizon has been answered the moment they read "Venus, magnitude -4, 8 degrees up", and not
 * at all by a bare name.
 */
const STAR_TOOLTIP: Record<string, string> = {
  en: "{name} — mag {mag}, {alt}° above the horizon",
  fr: "{name} — mag {mag}, {alt}° au-dessus de l'horizon"
}

/**
 * The same sentence for a star standing BELOW the horizontal, which is not the contradiction it
 * looks like.
 *
 * The sky is built a little under the level of the eye on purpose, and for a witness who is high up
 * that patch is genuinely in view: from a DC-3 at 1500 m the horizon has dropped 1.24°, so a star
 * at −0.6° is above it and plainly visible. Saying "−1° above the horizon" of it was simply the
 * wrong words for a real sight — it reads as a fault in the tool, and it buries the one fact that
 * explains the geometry, which is that the witness was looking DOWN at it.
 *
 * A star the ground actually hides is a different matter and never reaches this point at all: see
 * SceneRenderer.groundHides.
 */
const STAR_TOOLTIP_BELOW: Record<string, string> = {
  en: "{name} — mag {mag}, {alt}° below the horizontal",
  fr: "{name} — mag {mag}, {alt}° sous l'horizontale"
}

/** How SceneRenderer keys a comet's own body mesh — see its buildComet. Kept here beside the names
 * it is used with rather than exported from the renderer, which has no interest in what the rest of
 * the key means. */
const COMET_KEY_PREFIX = "comet:"

/** Fallback hover-tooltip label for an untitled decor object — a coarse "what is this" (unlike an
 * untitled SHAPE's tooltip, which shows nothing at all — see UfoElement.handlePointerMove's own
 * doc comment on why a raw sourceId is too internal to surface) is still genuinely useful here: a
 * building/tree/streetlight/vehicle's kind is meaningful, human-facing information on its own,
 * not an authoring-only implementation detail. decor.title wins when given (same precedence as
 * UfoRecorderElement's own decorLabel, which additionally numbers same-kind objects for its
 * editing dropdown — this tooltip has no such numbering need, standalone `<rr0-scene>` has no
 * dropdown to number against anyway). */
const DECOR_KIND_NAMES: Record<DecorKind, { en: string; fr: string }> = {
  building: { en: "Building", fr: "Bâtiment" },
  tree: { en: "Tree", fr: "Arbre" },
  streetlight: { en: "Streetlight", fr: "Lampadaire" },
  vehicle: { en: "Vehicle", fr: "Véhicule" },
  witness: { en: "Witness", fr: "Témoin" },
  aircraft: { en: "Aircraft", fr: "Aéronef" }
}

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
    return ["src", "star-catalog-src", "show-compass"]
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
  private readonly hoverTooltip: HTMLElement
  private resizeObserver?: ResizeObserver
  /** One accumulating estimate per shape — see sizeRangeOf. Keyed by sourceId, and dropped whole
   * whenever a different recording is loaded (see sizeEstimatesFor). */
  private readonly sizeEstimates = new Map<string, SizeEstimate>()
  /** Which Sighting the estimates above were accumulated against. Tracked by identity rather than
   * cleared from this element's own `sightingData` setter, because that setter is not the only way
   * in: UfoRecorderElement composes this element but delegates its own sightingData straight to the
   * nested `<rr0-ufo>`, so a recording loaded through the recorder never passes through here at
   * all. Keying on the instance catches every path — loading a file replaces the Sighting (see
   * UfoElement's own setter), and a stale estimate carried across recordings is worse than none:
   * bounds only ever tighten, so one wrong crossing from a previous case would poison the next. */
  private sizeEstimatesFor?: Sighting
  /** The sighting the meteor fall was worked out for, so it is scheduled once per recording rather
   * than every tick — the schedule is deterministic (see MeteorFall) and must not be re-drawn
   * underneath a paused scene or a long exposure. */
  /** What the standing meteor schedule was built from — see meteorInputsOf. A string, never the
   * Sighting itself: the recorder edits ONE instance in place. */
  private meteorScheduleFor?: string
  private lastTimeMs = 0
  private starCatalog?: StarCatalog
  /** Owned here, not by SceneRenderer — the renderer stays audio-agnostic (see its own
   * onLightningFlash callback param), this is the one place that already orchestrates a non-
   * rendering side effect alongside pure rendering (see the terrain-attribution label above). */
  private readonly weatherAudio = new WeatherAudio()

  /**
   * Keeps the scene's own weather moving while the recording is not playing — set by the editor
   * that composes this element, never by a replay. See syncAnimationsToPlayback.
   */
  private animateWhilePausedValue = false

  set animateWhilePaused(animate: boolean) {
    if (animate === this.animateWhilePausedValue) return
    this.animateWhilePausedValue = animate
    this.syncAnimationsToPlayback()
  }

  get animateWhilePaused(): boolean {
    return this.animateWhilePausedValue
  }
  private thunderTimeoutId?: number

  /** Bound once so document.removeEventListener (disconnectedCallback) can actually find it. */
  private readonly handleFullscreenChange = () => this.resizeToStage()

  /** Identifies whatever's under the pointer — a celestial body, a decor object, or (checked
   * first) a visible UFO shape — and shows/moves/hides a text label next to it — an on-demand
   * identification aid, not a rendering change (see pickBodyAt's own doc comment on why body
   * hit-testing uses a bigger invisible area than the real, true-to-scale visible disc). Also
   * reveals the compass labels (see setCompassHovered) for as long as the pointer stays over the
   * canvas — same on-demand spirit, so neither overlay competes for attention with the scene
   * itself the rest of the time. Listens on the nested `<rr0-ufo>`'s own canvas (not the 3D
   * scene-canvas directly) since that transparent overlay always sits on top and would otherwise
   * swallow every pointer event before the 3D layer ever saw them.
   *
   * A visible (non-occluded) shape, if the pointer is over one, wins over both a body and decor —
   * it's painted on top of everything else here (same visual stacking the occlusion feature
   * relies on), so whatever's behind it isn't what the pointer is actually hovering. That shape's
   * own name (if it has one) is UfoElement's own tooltip's job, not this one's — this method just
   * steps aside (hides its own tooltip) rather than duplicating that lookup. */
  private readonly handlePointerMove = (event: PointerEvent) => {
    this.sceneRenderer.setCompassHovered(true)
    const canvas = this.ufoElement.canvasElement
    const rect = canvas.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return
    const canvasX = ((event.clientX - rect.left) / rect.width) * canvas.width
    const canvasY = ((event.clientY - rect.top) / rect.height) * canvas.height
    if (this.ufoElement.hasVisibleShapeAt(canvasX, canvasY)) {
      this.hoverTooltip.hidden = true
      return
    }
    const ndcX = ((event.clientX - rect.left) / rect.width) * 2 - 1
    const ndcY = -(((event.clientY - rect.top) / rect.height) * 2 - 1)
    const language = selectLocale(HostLocale.preferencesFor(this), BODY_TOOLTIP_SUPPORTED_LANGUAGES) as "en" | "fr"
    const bodyKey = this.sceneRenderer.pickBodyAt(ndcX, ndcY)
    if (bodyKey) {
      this.showHoverTooltip(event, this.bodyName(bodyKey, language))
      return
    }
    const decorId = this.sceneRenderer.pickDecorAt(ndcX, ndcY)
    const decor = decorId ? this.ufoElement.sighting.decor.find(d => d.id === decorId) : undefined
    if (decor) {
      this.showHoverTooltip(event, decor.title || DECOR_KIND_NAMES[decor.kind][language])
      return
    }
    // Last of the four, and deliberately: a shape is painted over everything, a planet is a better
    // answer than the star behind it, and a building stands between the witness and the whole sky.
    // A star is what is left when nothing nearer is under the pointer.
    const star = this.sceneRenderer.pickStarAt(ndcX, ndcY)
    if (star) {
      // toLocaleString with the page's own locale, like every other number this project prints —
      // a French page writes 0,03 and not 0.03. Two decimals below magnitude 1 and one above, the
      // same rule the apparent-size readout already applies to degrees, and here for the same
      // reason: a single decimal printed the four brightest stars as "mag 0,0" and "mag -0", which
      // read like a field that failed to fill rather than like Vega, the star the whole scale was
      // originally anchored on.
      const magnitude = star.star.mag
      const altitudeDeg = star.altitudeDeg
      const template = (altitudeDeg < 0 ? STAR_TOOLTIP_BELOW : STAR_TOOLTIP)[language]!
      this.showHoverTooltip(event, template
        .replace("{name}", star.star.name[language])
        .replace("{mag}", magnitude.toLocaleString(undefined, { maximumFractionDigits: Math.abs(magnitude) < 1 ? 2 : 1 }))
        .replace("{alt}", String(Math.round(Math.abs(altitudeDeg)))))
      return
    }
    this.hoverTooltip.hidden = true
  }

  /** What to call the thing under the pointer. The comets are not in BODY_NAMES because there are
   * two dozen of them and they carry their own names in the catalog — a comet is a dated event
   * rather than a fixed body, which is also why the key names the apparition. */
  private bodyName(bodyKey: string, language: "en" | "fr"): string {
    const cometId = bodyKey.startsWith(COMET_KEY_PREFIX) ? bodyKey.slice(COMET_KEY_PREFIX.length) : undefined
    const comet = cometId ? BRIGHT_COMETS.find(apparition => apparition.id === cometId) : undefined
    return comet?.name[language] ?? BODY_NAMES[bodyKey]?.[language] ?? bodyKey
  }

  private showHoverTooltip(event: PointerEvent, text: string): void {
    this.hoverTooltip.textContent = text
    this.hoverTooltip.hidden = false
    // Positioned relative to #stage (the tooltip's own offsetParent), not the page — clientX/Y are
    // page-relative, so subtracting the stage's own origin converts them to that local frame.
    const stageRect = this.stageElement.getBoundingClientRect()
    this.hoverTooltip.style.left = `${event.clientX - stageRect.left + 12}px`
    this.hoverTooltip.style.top = `${event.clientY - stageRect.top + 12}px`
  }

  private readonly handlePointerLeave = () => {
    this.hoverTooltip.hidden = true
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
    this.syncAnimationsToPlayback()
    this.updateAstronomy(this.lastTimeMs)
    this.updateUfoOcclusion(this.lastTimeMs)
  }

  /**
   * Makes the weather follow the player: rain falls, clouds drift, lightning strikes and the beds
   * are heard only while the observation's own clock is running. Pause a replay and it is one
   * frozen instant of a sighting — weather still going on over it would be the reader's own room,
   * not the witness's evening.
   *
   * Driven from timeupdate rather than from a playback-state event of its own because every
   * transition already produces one: a play tick, a seek, and pause's own forced repaint all funnel
   * through the nested player's single onFrame sink.
   */
  private syncAnimationsToPlayback(): void {
    // "Running" is not quite "playing", and the difference is what an editor needs. The rule above
    // is about a REPLAY: a reader paused on one instant of somebody's sighting, over which weather
    // still going on would be the reader's own room. It says nothing about an author who is at
    // that moment STATING the weather — for them a frozen sky is a preview of nothing, and there
    // is often no way out of it either, since a recording with no duration yet cannot be played at
    // all. So the recorder asks for the scene to keep moving (see animateWhilePaused), and the
    // sound follows the picture rather than diverging from it: what turned this up was hearing
    // rain fall over a still image.
    const running = this.ufoElement.playbackState === "playing" || this.animateWhilePaused
    this.sceneRenderer.setAnimationsRunning(running)
    this.weatherAudio.setPaused(!running)
    // A thunderclap is deliberately delayed by the distance sound travels (see
    // handleLightningFlash); one still in flight belongs to a flash that is no longer happening.
    if (!running) clearTimeout(this.thunderTimeoutId)
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
    this.hoverTooltip = this.shadow.getElementById("hover-tooltip")!

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
  }

  /** Forces the compass labels visible independent of pointer hover — see
   * SceneRenderer.setCompassForced's own doc comment. `UfoRecorderElement` calls this from the
   * heading input's own focus/blur, a direct method rather than another observed attribute since
   * it's meant to change far more often (every focus/blur) than `show-compass`'s one-time setup. */
  setCompassForced(forced: boolean): void {
    this.sceneRenderer.setCompassForced(forced)
  }

  /** Passthrough to SceneRenderer.setIndoorLook — see its own doc comment. `UfoRecorderElement`
   * calls this from its camera-drag handling instead of updateObserver()/witnessTrack whenever
   * the witness is currently inside a decor object. */
  setIndoorLook(yawDeg: number, pitchDeg: number): void {
    this.sceneRenderer.setIndoorLook(yawDeg, pitchDeg)
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
    this.sightingData = (await SightingFetch.json(url)) as SightingRecordingJson
  }

  get sightingData(): SightingRecordingJson {
    return this.ufoElement.sightingData
  }

  set sightingData(json: SightingRecordingJson) {
    this.ufoElement.sightingData = json
    // A loaded recording may have been made through something with a format of its own.
    this.applyFrameFormat()
    this.lastTimeMs = 0
    // Also resolves+applies weather at t=0 — see updateAstronomy's own doc comment.
    this.updateAstronomy(0)
  }

  /** Undefined until a real, location-accurate terrain relief patch has finished its async build
   * (see SceneRenderer.setTerrainOrigin) — exposed for a composing wrapper's own on-demand credit
   * display (see SightingElement's info panel) rather than this element painting a permanent
   * corner label itself; a real-time pull (not push/cached) since it can resolve at any time. */
  get currentTerrainAttribution(): string | undefined {
    return this.sceneRenderer.currentTerrainAttribution
  }

  /** Relays a change of terrain source through to the renderer — see its setTerrainProviders.
   * Same "expose the nested renderer to a composing wrapper" arrangement as the getters above. */
  setTerrainProviders(providers: TerrainProviders): void {
    this.sceneRenderer.setTerrainProviders(providers)
  }

  /**
   * Gives the rendered frame the shape of the picture this recording was made in — the same format
   * the shape canvas takes (see UfoElement.applyFrameFormat), so the sky and the shapes drawn over
   * it are one picture rather than two.
   *
   * Letterboxed rather than stretched, which is what the frame box already did for fullscreen: a
   * square 126 frame or a phone held upright leaves the stage's own space unused to either side,
   * and that emptiness is honest — it is sky the device never recorded.
   *
   * Public because a composing editor changes the instrument from outside (see
   * UfoRecorderElement's instrument picker) and the frame has to follow at that moment; everything
   * else that changes it goes through this element's own load path.
   */
  applyFrameFormat(): void {
    const instrument = this.ufoElement.sighting.instrument
    const height = ApparentSize.CANVAS_HEIGHT_PX
    const width = Instruments.frameWidthPx(instrument, height)
    // The ResizeObserver on this very element then resizes the 3D canvas and its camera's aspect,
    // so nothing else has to be told.
    this.frameElement.style.setProperty("--frame-aspect", `${width} / ${height}`)
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
    this.applySceneAt(t)
    // How long the shutter was open, and therefore how many instants this frame is: a photograph is
    // everything that crossed the frame while it was, and over a pose of any length the thing that
    // crosses it is the SKY — the Earth turns under it and every star draws its arc (see SkyDrift).
    // The shape's own trail is drawn by <rr0-ufo> on its own canvas and starts far sooner (a
    // fiftieth of a second is enough to smear a moving object); the sky needs a pose long enough to
    // move a whole pixel, which is tens of seconds.
    const exposureSeconds = this.exposureSeconds()
    const degPerPixel = this.degreesPerPixelAt(t)
    // Two demands, and the pose is drawn at the coarser: what the SKY did (SkyDrift) and what the
    // scene standing against it did — an aircraft crossing the frame, a strobe flashing while it
    // crosses (ExposureSampling). The second is the whole point of the Gennevilliers photograph:
    // the sky drifts one pixel in ten seconds and would ask for two instants, while the aeroplane
    // that made the picture crosses hundreds and flashes ten times.
    const sky = SkyDrift.instants(exposureSeconds, degPerPixel)
    const instants = Math.max(
      sky,
      ExposureSampling.instants(
        this.ufoElement.sighting.decor,
        resolveObserverPoseAt(this.ufoElement.sighting, t)?.elevationM ?? 0,
        t,
        exposureSeconds,
        degPerPixel
      )
    )
    if (instants <= 1) {
      this.sceneRenderer.setExposure(1)
      return
    }
    const exposureMs = exposureSeconds * 1000
    // Same convention as the shape's own accumulation: the shutter opens AT the stated instant and
    // stays open, so a photograph timed at t holds what happened from t onward.
    //
    // What sampling instants cannot catch, said out loud: anything SHORTER than the gap between two
    // of them — a meteor of half a second in a ten-minute pose — is drawn only if an instant happens
    // to land on it, where real film would have caught every one. The decor lights already solve
    // exactly this for a strobe by integrating the lit fraction of an interval rather than asking
    // "is it on?" (see LightRig's lightOnFractionBetween); the sky has no equivalent yet, and until
    // it does a long pose under a shower under-reports the meteors it would really hold.
    this.sceneRenderer.setExposure(instants, instant =>
      this.applySceneAt(t + (exposureMs * instant) / instants, {
        // The sky is restated only on the instants the SKY asks for, which is what makes a
        // scene-driven pose affordable at all: restating it costs about 8 ms and moving the decor
        // costs a twentieth of one, and a pose sampled 300 times for an aeroplane must not rebuild
        // 300 skies to draw a drift of four pixels.
        sky: Math.floor((instant * sky) / instants) !== Math.floor(((instant - 1) * sky) / instants),
        stepMs: exposureMs / instants
      })
    )
  }

  /** How long this recording says the shutter was open — its own setting, or the device's when it
   * has only one (an Instamatic's ninetieth). Zero for an eye, which has no shutter to leave a
   * trail with. One value for the whole observation: see Sighting.exposureSeconds. */
  private exposureSeconds(): number {
    return this.ufoElement.sighting.exposure ?? 0
  }

  /** The scale of the image, in degrees of sky per pixel — what turns the sky's drift into a length
   * on the picture. Taken from the drawing buffer's own height and the field being rendered, so a
   * narrow lens (where a trail is longest) and a wide eye each get their own answer. */
  private degreesPerPixelAt(t: number): number {
    const height = this.sceneCanvas.height
    if (height <= 0) return 0
    return SightingShapes.fovOf(this.ufoElement.sighting, t) / height
  }

  /** Everything the scene has to be told to stand at one instant — the whole of what this element
   * pushes into the renderer. Called once for an ordinary frame, and once per instant of a pose long
   * enough that the sky itself moved across it (see updateAstronomy). */
  private applySceneAt(t: number, instant?: { sky: boolean; stepMs: number }): void {
    const sighting = this.ufoElement.sighting
    // Resolved here (not left to the sightingData setter's one-time call, or an explicit nudge on
    // edit) since weather is now itself keyframed over time — see Sighting.resolveWeatherAt. Cheap
    // even every tick: setWeather/SceneRenderer.setWeather both dedupe on actual field values, not
    // just call frequency (see SceneRenderer.setWeather's own doc comment).
    this.setWeather(resolveWeatherAt(sighting, t))
    // Pushed every tick like the pose and the weather, and for the same reason: the recording it
    // describes can be swapped or edited under this element at any moment, and an instrument left
    // over from the previous one would render the whole scene through the wrong optics (see
    // Instrument.ts). Cheap — SceneRenderer.setInstrument stores two numbers.
    this.sceneRenderer.setInstrument(sighting.instrument)
    this.updateMeteorShower(sighting, t)
    this.sceneRenderer.setDecor(sighting.decor)
    const pose = resolveObserverPoseAt(sighting, t)
    this.sceneRenderer.setObserverPose(pose ?? DEFAULT_OBSERVER_POSE)
    this.sceneRenderer.setLensOptics(this.lensOpticsAt(t))
    // Keeps decor anchored to its own real-world spot rather than sliding along with a moving
    // witness — see SceneRenderer.updateDecorAnchoring's own doc comment. The reference pose is
    // always the recording's own t=0, regardless of what t is being rendered right now.
    this.sceneRenderer.updateDecorAnchoring(resolveObserverPoseAt(sighting, 0), pose, t)
    // A streetlight/vehicle's own lit state can change mid-recording (a photocell at dusk, a
    // driver's headlights) — see Decor.ts's own resolveDecorLitAt.
    this.sceneRenderer.updateDecorLitState(t, instant?.stepMs ?? 0)
    // Raw pose's own lat/lng (possibly undefined), never the astronomy fallback below — a real
    // terrain patch must only ever build from a real recorded location, never (0,0).
    this.sceneRenderer.setTerrainOrigin(pose?.lat, pose?.lng)

    // Everything above moves with the instant and costs almost nothing; the sky below costs about
    // 8 ms to restate, and an instant that only carries an aeroplane a few pixels further has no
    // reason to pay for it — see updateAstronomy, which says which instants the sky itself asks for.
    if (instant && !instant.sky) return

    const lat = pose?.lat ?? DEFAULT_OBSERVER_POSE.lat!
    const lng = pose?.lng ?? DEFAULT_OBSERVER_POSE.lng!
    const startDate = sightingTimeToDate(sighting.event.time ?? {}, lng, sighting.event.utcOffsetHours)
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
      // Recomputed every tick like the planets, and for the same reason: it moves with the date,
      // and near a close approach it moves fast enough to matter within a single recording. Cheap —
      // in all but a couple of dozen months of the last century there is no comet to compute at all
      // (see Comets.aroundDate).
      comet: this.cometAt(date, observer),
      stars: this.starCatalog ? { catalog: this.starCatalog, date, observer } : undefined,
      // The same date and place again, and deliberately not folded into `stars`: the Milky Way and
      // the zodiacal light need no catalog to arrive first (see SceneAstronomy.frame).
      frame: { date, observer }
    })
  }

  /**
   * The brightest comet standing in that sky, if any was — in the form the renderer wants it.
   *
   * The brightest rather than a list: two apparitions overlap only in the odd year (1957, 1970),
   * and a scene showing both would be stating that a witness could have confused either, which is a
   * conclusion rather than a fact. The one that was actually conspicuous is the one to draw.
   *
   * Nothing is filtered on here — not the horizon, not the twilight. Whether the comet was
   * observable is the renderer's own visibility rule, applied to every body in this sky alike, and
   * the readout in the recorder says so in words.
   */
  private cometAt(date: Date, observer: ObserverGeo): SceneComet | undefined {
    const appearance = Comets.brightestAt(date, observer)
    if (!appearance) return undefined
    return {
      id: appearance.apparition.id,
      position: appearance.position,
      tailEnd: appearance.tailEnd,
      magnitude: appearance.magnitude
    }
  }

  /** Hides a UFO shape exactly where a decor object (building, tree...) sits directly between
   * the camera and it — the shape is painted on the nested `<rr0-ufo>`'s own 2D canvas overlay,
   * entirely outside this element's 3D scene, so the GPU depth buffer that occludes decor against
   * itself has no way to occlude a shape it doesn't know exists (see SceneRenderer.
   * isScreenPointOccluded's own doc comment for the full reasoning, and the near-identical
   * problem/fix for the Sun's own lens-flare overlay, isSunOccluded). Reads each currently-visible
   * shape straight off the timeline — the same interpolated position the nested `<rr0-ufo>` is
   * about to paint — converts its bounds center from the fixed 640x360 canvas drawing space to
   * NDC, and raycasts. */
  private updateUfoOcclusion(t: number): void {
    const sighting = this.ufoElement.sighting
    if (sighting !== this.sizeEstimatesFor) {
      this.sizeEstimates.clear()
      this.sizeEstimatesFor = sighting
    }
    const timeline = sighting.timeline
    const canvas = this.ufoElement.canvasElement
    const occluded = new Set<string>()
    for (const sourceId of timeline.sourceIds) {
      const shape = timeline.getInterpolatedShapeAt(t, sourceId)
      if (!shape) continue
      const ndcX = ((shape.bounds.x + shape.bounds.width / 2) / canvas.width) * 2 - 1
      const ndcY = -(((shape.bounds.y + shape.bounds.height / 2) / canvas.height) * 2 - 1)
      if (this.sceneRenderer.isScreenPointOccluded(ndcX, ndcY, sourceId, shape.behindCloud)) occluded.add(sourceId)
      // The same ray, asked the other question: not "is it hidden" but "by what, and how far
      // away". Free to ask here (the camera and the decor are already posed for exactly this
      // instant, which is the only state in which the answer is meaningful) and accumulated across
      // every instant the playhead visits — see SizeEstimate, and sizeRangeOf's own comment on why
      // that accumulation is the honest shape for this.
      const widthDeg = shape.angular?.widthDeg ?? this.projectionAt(t).pxToDeg(shape.bounds.width)
      this.sizeEstimateOf(sourceId).add(widthDeg, this.sceneRenderer.decorDistancesAt(ndcX, ndcY, sourceId))
    }
    this.ufoElement.setOccludedSourceIds(occluded)
  }

  /**
   * How wide this shape's object really was, in meters, as far as anything in the scene has been
   * able to establish — empty ranges included, which is the usual answer and the correct one.
   *
   * Accumulated from the instants the playhead has actually visited rather than scanned ahead: a
   * crossing only means anything with the camera, the witness's own position and the decor all
   * posed for that exact instant, which is the state render() puts them in and nothing else does.
   * Playing a recording through therefore establishes everything it can establish; scrubbing
   * establishes what was scrubbed past. Bounds only ever tighten, so nothing is lost by arriving
   * at them gradually.
   */
  sizeRangeOf(sourceId: string): MeterRange {
    return this.sizeEstimateOf(sourceId).sizeRange
  }

  /** How far that object must have been at time `t`, read back from its established size through
   * the angle it subtends then — see SizeEstimate.distanceRangeAt. Empty whenever the size is. */
  distanceRangeAt(sourceId: string, t: number): MeterRange {
    const shape = this.ufoElement.sighting.timeline.getInterpolatedShapeAt(t, sourceId)
    if (!shape) return {}
    const widthDeg = shape.angular?.widthDeg ?? this.projectionAt(t).pxToDeg(shape.bounds.width)
    return this.sizeEstimateOf(sourceId).distanceRangeAt(widthDeg)
  }

  /** Whether what the recording states about this object cannot all be true at once — see
   * SizeEstimate.contradictory. */
  sizeContradictory(sourceId: string): boolean {
    return this.sizeEstimateOf(sourceId).contradictory
  }

  /**
   * Works out which shower was falling, and drops it into the sky.
   *
   * Scheduled ONCE per recording rather than per tick, for the reason MeteorFall exists: the fall
   * has to be the same sky every time the recording is played, so that pausing freezes it and a
   * long exposure can integrate it without meteors appearing out of the sampling itself.
   *
   * Everything about it is a fact of the date and the place — no lookup, no network, and no
   * coverage floor, which is what makes a shower the one candidate explanation available for every
   * case this project reconstructs. When no shower is running, or its radiant has not risen, the
   * sky simply stays empty.
   */
  private updateMeteorShower(sighting: Sighting, t: number): void {
    this.ensureMeteorSchedule(sighting)
    this.sceneRenderer.updateMeteors(t)
  }

  /**
   * Rebuilds the fall whenever anything it was computed FROM has moved.
   *
   * This used to compare the Sighting by identity, which quietly meant "never": the recorder edits
   * one instance in place, so typing a date, locating a place or setting a duration left the very
   * first schedule standing — and the first one is computed before any of those exist, so it is
   * empty. The readout, which recomputes from the shower tables directly, would then announce a
   * hundred and forty-six meteors an hour over a sky that had none, and the button offering to show
   * one stayed hidden because there was genuinely nothing to show. Every "je ne vois rien" came
   * through here.
   *
   * Called from the render path AND from nextMeteor, so the answer is current whichever asks first:
   * the toolbar refreshing its sky line does not depend on having been run after the scene.
   */
  private ensureMeteorSchedule(sighting: Sighting): void {
    const inputs = this.meteorInputsOf(sighting)
    if (inputs === this.meteorScheduleFor) return
    this.meteorScheduleFor = inputs
    this.scheduleMeteors(sighting)
  }

  /** Everything scheduleMeteors actually reads, as one comparable value. Anything added to the
   * scheduling below has to be added here too, or editing it will silently leave the old sky up. */
  private meteorInputsOf(sighting: Sighting): string {
    const place = sighting.event.place?.[0]
    const time = sighting.event.time
    return JSON.stringify([
      place?.lat,
      place?.lng,
      time?.year,
      time?.month,
      time?.day,
      time?.hour,
      time?.minute,
      sighting.event.utcOffsetHours,
      sighting.event.durationSeconds,
      sighting.timeline.duration
    ])
  }

  /**
   * Works out what falls during this recording — the shower, if one is running, and the sporadic
   * background, which is always.
   *
   * Both go into ONE list, because a witness does not see two skies. The shower's meteors radiate
   * from its radiant; each sporadic carries its own (see MeteorFall.scheduleSporadic), and the
   * renderer reads whichever applies.
   *
   * The sporadics are what makes a night with no shower stop rendering as an empty sky. Most
   * showers, most nights, are weaker than the background they fall against.
   */
  private scheduleMeteors(sighting: Sighting): void {
    const place = sighting.event.place?.[0]
    const time = sighting.event.time
    const date = place?.lat !== undefined && place.lng !== undefined && time?.year !== undefined
      ? sightingTimeToDate(time, place.lng, sighting.event.utcOffsetHours)
      : undefined
    if (!date || place?.lat === undefined || place.lng === undefined) {
      this.sceneRenderer.setMeteorShower([], 0, 0)
      return
    }
    const observer = { lat: place.lat, lng: place.lng, elevationM: 0 }
    const durationMs = (sighting.event.durationSeconds ?? 0) * 1000 || sighting.timeline.duration || 20_000
    // Seeded from the observation itself, so the same recording always drops the same meteors and
    // two different ones never share a sky by accident.
    const seed = Math.round(date.getTime() / 1000) + Math.round(place.lat * 1000)
    const sporadics = Sporadics.schedule({
      ratePerHour: Sporadics.observedRatePerHour(Sporadics.apexPosition(date, observer).altitudeDeg),
      durationMs,
      velocityKmS: Sporadics.TYPICAL_VELOCITY_KM_S,
      seed
    })
    const best = MeteorShowers.activeAt(date)
      .map(entry => {
        const position = MeteorShowers.radiantPosition(entry.shower, date, observer)
        return { entry, position, rate: MeteorShowers.observedRatePerHour(entry.zhr, position.altitudeDeg, entry.shower.populationIndex) }
      })
      .sort((a, b) => b.rate - a.rate)[0]
    if (!best || best.rate <= 0) {
      this.sceneRenderer.setMeteorShower(sporadics, 0, 0)
      return
    }
    const shower = MeteorFall.schedule({
      ratePerHour: best.rate,
      durationMs,
      velocityKmS: best.entry.shower.velocityKmS,
      // Offset from the sporadics' seed so the two populations are independent draws rather than
      // the same meteors twice over.
      seed: seed + 1
    })
    this.sceneRenderer.setMeteorShower([...shower, ...sporadics], best.position.altitudeDeg, best.position.azimuthDeg)
  }

  /**
   * The rank-th brightest meteor the playhead can be moved to, and where in the sky to look for
   * it — what a control offering to show one needs, and the whole difference between stating that
   * a shower was running and letting anybody actually see it.
   *
   * Ranked rather than chronological, and reachable-only; both reasons are in the body. Pure: the
   * same rank always gives the same answer, so a toolbar can ask for rank 0 just to find out
   * whether to offer the control at all.
   *
   * Wraps, so a reader who reaches the faintest goes round again rather than being told there is
   * nothing.
   */
  meteorByRank(rank: number): { t: number; altitudeDeg: number; azimuthDeg: number } | undefined {
    // Asked by the toolbar, which may well run before the scene next paints: schedule on demand
    // rather than answer "no meteors" from a sky that simply has not been worked out yet.
    this.ensureMeteorSchedule(this.ufoElement.sighting)
    // Only what the playhead can actually be moved to. The fall covers the DECLARED observation,
    // which is routinely far longer than what was recorded of it — a five-minute sighting with
    // forty seconds of drawn track puts most of its meteors beyond the end of the timeline, and
    // seeking to one of those clamps to the last frame, where nothing is burning. The sky itself
    // is left alone: those meteors really did fall, after the recording stops.
    const reachable = [...this.sceneRenderer.meteorSchedule]
      .filter(meteor => meteor.t + meteor.durationMs <= this.ufoElement.seekableDuration)
      // Brightest first. Chronological order sounds like the natural one and is the wrong one
      // here: brightness is a cubed draw, so most of a shower is close to the threshold of being
      // seen at all, and walking the night in order opens on whatever happened to fall first —
      // which, measured, was one at brightness 0.007, three times dimmer than the stars around it.
      // The sky is untouched; only the order the examples are offered in. A control that says
      // "show me one" owes the reader one they can see.
      .sort((a, b) => b.brightness - a.brightness)
    if (reachable.length === 0) return undefined
    const meteor = reachable[rank % reachable.length]
    const where = this.sceneRenderer.meteorMidpoint(meteor)
    if (!where) return undefined
    // Mid-flight, where the streak is longest and brightest rather than just appearing.
    return { t: Math.round(meteor.t + meteor.durationMs * 0.45), ...where }
  }

  /**
   * The lens this recording was made through, as the depth-of-field pass needs it — or undefined
   * where the question does not arise.
   *
   * It arises only for a device that has BOTH a frame and a diaphragm: without a frame there is no
   * focal length to work from (a camera nobody identified), and without a diaphragm nothing is ever
   * out of focus in this model (an eye, a phone). Anything else would be guessing at a blur.
   */
  private lensOpticsAt(t: number):
    | { focalLengthMm: number; fNumber: number; focusDistance: number; frameHeightMm: number }
    | undefined {
    const sighting = this.ufoElement.sighting
    const instrument = sighting.instrument
    const frame = instrument.frame
    const pose = resolveObserverPoseAt(sighting, t)
    const fNumber = pose?.fNumber ?? instrument.fNumber
    if (!frame || fNumber === undefined) return undefined
    const focalLengthMm = Instruments.focalLengthMmFor(instrument, SightingShapes.fovOf(sighting, t))
    if (focalLengthMm === undefined) return undefined
    return {
      focalLengthMm,
      fNumber,
      // Zero says "at infinity", which is what an unstated focus means — see ObserverPose.
      focusDistance: pose?.focusDistanceM ?? 0,
      frameHeightMm: frame.heightMm
    }
  }

  /** How this recording's own instrument turns an angle into a pixel at time `t` — rebuilt per call
   * rather than cached, since both the instrument and the pose's field of view can change under it
   * and a stale projection is a silently wrong size. */
  private projectionAt(t: number): ImageProjection {
    const sighting = this.ufoElement.sighting
    return ImageProjection.of(sighting.instrument, ApparentSize.CANVAS_HEIGHT_PX, SightingShapes.fovOf(sighting, t))
  }

  private sizeEstimateOf(sourceId: string): SizeEstimate {
    let estimate = this.sizeEstimates.get(sourceId)
    if (!estimate) {
      estimate = new SizeEstimate()
      this.sizeEstimates.set(sourceId, estimate)
    }
    return estimate
  }

}

export const SCENE_ELEMENT_NAME = "rr0-scene"

export function registerScene(): void {
  registerUfo()
  if (!customElements.get(SCENE_ELEMENT_NAME)) {
    customElements.define(SCENE_ELEMENT_NAME, SceneElement)
  }
}
