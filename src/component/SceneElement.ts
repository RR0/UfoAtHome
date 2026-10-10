import { RoadGrade } from "../engine/place/RoadGrade.js"
import { VehicleAudio } from "../audio/VehicleAudio.js"
import { VehicleHearing } from "../engine/place/VehicleHearing.js"
import { resolveCloudLayers } from "../engine/model/CloudLayer.js"
import type { CloudRendering } from "../render3d/LayeredCloudSystem.js"
import { cloudOffsetAt, cloudPrerollAt } from "../render3d/CloudMotion.js"
import { html, css } from "./sceneTemplate.js"
import { SightingFetch } from "../engine/net/SightingFetch.js"
import { UfoElement, registerUfo, UFO_ELEMENT_NAME, OBSERVER_MAP_ATTRIBUTE, MILESTONES_ATTRIBUTE } from "./UfoElement.js"
import { SceneRenderer } from "../render3d/SceneRenderer.js"
import { SeekPreview } from "./SeekPreview.js"
import type { PreviewableScene } from "./SeekPreview.js"
import type { TerrainProviders } from "../render3d/terrain/defaultTerrainProviders.js"
import type { DecorModelProvider } from "../render3d/decor/DecorModelProvider.js"
import type { DecorModelCredit } from "../engine/model/Decor.js"
import type { DecorSunlight, SceneAstronomy, SceneComet, SceneNova } from "../render3d/SceneRenderer.js"
import { StarCatalogs, STAR_CATALOG_MAGNITUDE_LIMIT, DEEP_STAR_CATALOG_MAGNITUDE_LIMIT } from "../render3d/StarCatalog.js"
import type { StarCatalogTier } from "../render3d/StarCatalog.js"
import type { StarCatalog } from "../render3d/StarCatalog.js"
import {
  computeBodyMagnitude,
  computeBodyPosition,
  computeMoonPhase,
  sightingTimeToDate,
  TRACKED_PLANETS
} from "../engine/astronomy/CelestialPositions.js"
import type { ObserverGeo } from "../engine/astronomy/CelestialPositions.js"
import { LunarLimb } from "../engine/astronomy/LunarLimb.js"
import type { LimbProfile, LunarRelief } from "../engine/astronomy/LunarLimb.js"
import { LunarReliefLoader } from "../engine/astronomy/LunarReliefLoader.js"
import { Filters } from "../engine/instrument/Filter.js"
import { LunarDisc } from "../engine/astronomy/LunarDisc.js"
import { SolarEclipse } from "../engine/astronomy/SolarEclipse.js"
import { geoToLocalMeters } from "../render3d/terrain/GeoProjection.js"
import { resolveActualWeatherAt, resolveObserverPoseAt, resolveWeatherAt } from "../engine/model/Sighting.js"
import { Gait } from "../engine/place/Gait.js"
import type { Sighting } from "../engine/model/Sighting.js"
import type { ObserverPose } from "../engine/model/ObserverTrack.js"
import type { Weather } from "../engine/model/Weather.js"
import type { DecorKind } from "../engine/model/Decor.js"
import type { SightingRecordingJson } from "../engine/persistence/sightingJson.js"
import { HostLocale, selectLocale } from "../i18n/locale.js"
import { loadSceneNames, UFO_SUPPORTED_LANGUAGES } from "./messages/index.js"
import type { UfoLanguage } from "./messages/index.js"
import { SceneNaming } from "./messages/SceneNames.js"
import { SceneCredits } from "./SceneCredits.js"
import { SaidTexts } from "../engine/model/SaidText.js"
import type { InvestigatorTrace } from "../engine/model/Trace.js"
import { WeatherAudio } from "../render3d/WeatherAudio.js"
import { Comets } from "../engine/astronomy/Comets.js"
import { BRIGHT_COMETS } from "../engine/astronomy/cometCatalog.js"
import { Novae } from "../engine/astronomy/Novae.js"
import { MeteorShowers } from "../engine/astronomy/MeteorShowers.js"
import { MeteorFall } from "../engine/astronomy/MeteorFall.js"
import { Sporadics } from "../engine/astronomy/Sporadics.js"
import { LightningSchedule } from "../engine/weather/LightningSchedule.js"
import type { LightningFlash } from "../engine/weather/LightningSchedule.js"
import { TleArchive } from "../engine/astronomy/TleArchive.js"
import type { TleCoverage, TleSnapshot } from "../engine/astronomy/TleArchive.js"
import type { SatellitePass, SatellitePasses } from "../engine/astronomy/SatellitePasses.js"
import type { SceneSatellite } from "../render3d/SatelliteField.js"
import { SizeEstimate } from "../engine/shape/SizeEstimate.js"
import type { MeterRange } from "../engine/shape/SizeEstimate.js"
import { ApparentSize } from "../engine/shape/ApparentSize.js"
import { Instruments } from "../engine/instrument/Instrument.js"
import { LimitingMagnitude } from "../engine/instrument/LimitingMagnitude.js"
import { visibleMagnitudeLimit } from "../render3d/skyColors.js"
import { ImageProjection } from "../engine/instrument/ImageProjection.js"
import { SightingShapes } from "../engine/persistence/SightingShapes.js"
import { SkyDrift } from "../engine/astronomy/SkyDrift.js"
import { ExposureSampling } from "../engine/model/ExposureSampling.js"
import { ShapeDistance } from "../engine/shape/ShapeDistance.js"
import { PhenomenonDepth } from "../engine/shape/PhenomenonDepth.js"
import type { ResolvedDepth } from "../engine/shape/PhenomenonDepth.js"
import type { Shape } from "../engine/shape/Shape.js"
import { PhenomenonSystem } from "../render3d/PhenomenonSystem.js"
import type { PlacedPhenomenon } from "../render3d/PhenomenonSystem.js"
import { Vector3 } from "three"
import { BodyPlacement } from "../engine/interpretation/BodyPlacement.js"
import { ReentrySighting } from "../engine/interpretation/Reentry.js"
import type { ReentryJson } from "../engine/interpretation/Reentry.js"
import { AIRCRAFT_SOURCES } from "../engine/traffic/aircraftSources.js"
import type { AircraftProvider } from "../engine/traffic/AircraftProvider.js"
import { AircraftSighting } from "../engine/traffic/AircraftSighting.js"
import { AircraftLighting } from "../engine/traffic/AircraftLighting.js"
import type { AircraftModel } from "../engine/traffic/AircraftModels.js"
import type { AircraftDescription, AircraftPoint, AircraftTrack } from "../engine/traffic/AircraftProvider.js"
import type { TrafficInfo } from "../engine/traffic/TrafficInfo.js"
import type { ContrailTrail } from "../engine/traffic/AircraftContrails.js"
import type { UpperAirProvider, UpperAirSample, UpperAirSource } from "../engine/traffic/UpperAirProvider.js"
import { TrafficIds } from "../engine/traffic/TrafficIds.js"
import type { TrafficDecorSet } from "../engine/traffic/TrafficDecor.js"
import type { DecorObject } from "../engine/model/Decor.js"
import { resolveDecorSeatAt } from "../engine/model/Decor.js"
import type { DataSource } from "../engine/source/DataSource.js"
import { FireballArchive } from "../engine/astronomy/FireballArchive.js"
import type { FireballRecord } from "../engine/astronomy/FireballArchive.js"
import type { BodyState } from "../engine/interpretation/BodyPlacement.js"
import { BodyConfrontation } from "../engine/interpretation/BodyConfrontation.js"
import type { ConfrontationReading } from "../engine/interpretation/BodyConfrontation.js"
import type { BodyAppearance, BodyAttitude, BodyJson, BodySize, InterpretationJson } from "../engine/interpretation/Interpretation.js"

registerUfo()

/** Display names for pickBodyAt's return keys — note "sun"/"moon" are lowercase (SceneRenderer's
 * own internal keys for those two) while planets are capitalized (CelestialBody values, used
 * verbatim as their own key) — deliberately not unified, since unifying casing would mean
 * SceneRenderer inventing a display-string convention it otherwise has no reason to know about.
 * English: every other language's are in its SceneNames (see loadSceneNames). */
const BODY_NAMES: Record<string, string> = {
  sun: "Sun",
  moon: "Moon",
  Venus: "Venus",
  Mars: "Mars",
  Jupiter: "Jupiter",
  Saturn: "Saturn"
}

/**
 * What a star's tooltip says, and why it says three things rather than one.
 *
 * A name alone identifies without explaining. What makes a bright point a candidate for a
 * misidentification is how bright it was and how low it stood — a observer reporting a light near
 * the horizon has been answered the moment they read "Venus, magnitude -4, 8 degrees up", and not
 * at all by a bare name.
 */
const STAR_TOOLTIP = "{name} — mag {mag}, {alt}° above the horizon"

/**
 * The same sentence for a star standing BELOW the horizontal, which is not the contradiction it
 * looks like.
 *
 * The sky is built a little under the level of the eye on purpose, and for a observer who is high up
 * that patch is genuinely in view: from a DC-3 at 1500 m the horizon has dropped 1.24°, so a star
 * at −0.6° is above it and plainly visible. Saying "−1° above the horizon" of it was simply the
 * wrong words for a real sight — it reads as a fault in the tool, and it buries the one fact that
 * explains the geometry, which is that the observer was looking DOWN at it.
 *
 * A star the ground actually hides is a different matter and never reaches this point at all: see
 * SceneRenderer.groundHides.
 */
/** A satellite under the pointer: its catalogue name, how bright, how high. The height in
 * kilometres, not the altitude in degrees, because the height is what tells a Starlink still
 * raising its orbit from one on station. */
const SATELLITE_TOOLTIP = "{name} — satellite, mag {mag}, {height} km up"

/** Fired by a scene when the element sets of its recording have arrived, or turned out not to exist. */
export const SATELLITES_CHANGE_EVENT = "satellites-change"
/** Fired by a scene when the fireballs on record for its recording have arrived — see fireballState. */
export const FIREBALLS_CHANGE_EVENT = "fireballs-change"
/** Fired by a scene when the air traffic recorded around its observer for its recording has arrived — see aircraftState. */
export const AIRCRAFT_CHANGE_EVENT = "aircraft-change"
/** Fired whenever what the interpretation on show says against the account changes — see
 * SceneElement.confrontation. */
export const CONFRONTATION_EVENT = "rr0-confrontation"

/** The module of what draws the aircraft of a record, as it is once loaded. */
type TrafficRuntime = typeof import("./trafficRuntime.js")

/** What the player's picture controls say: the whole, and for several pictures each one's own view. */
interface ReferenceViewDetail {
  shown: boolean
  opacity: number
  views?: Record<string, { shown: boolean, opacity: number }>
}

export type SatelliteStatus = "none" | "loading" | "outside" | "unavailable" | "ready"

const STAR_TOOLTIP_BELOW = "{name} — mag {mag}, {alt}° below the horizontal"

/** The credits button's label — English, like BODY_NAMES. */
const CREDITS_LABEL = "Credits"

/** How SceneRenderer keys a comet's own body mesh — see its buildComet. Kept here beside the names
 * it is used with rather than exported from the renderer, which has no interest in what the rest of
 * the key means. */
const COMET_KEY_PREFIX = "comet:"
/** The same, for a nova's — see SceneRenderer.buildNovae. */
const NOVA_KEY_PREFIX = "nova:"

/** Fallback hover-tooltip label for an untitled decor object — a coarse "what is this" (unlike an
 * untitled SHAPE's tooltip, which shows nothing at all — see UfoElement.handlePointerMove's own
 * doc comment on why a raw sourceId is too internal to surface) is still genuinely useful here: a
 * building/tree/streetlight/vehicle's kind is meaningful, human-facing information on its own,
 * not an authoring-only implementation detail. decor.title wins when given (same precedence as
 * SightingEditorElement's own decorLabel, which additionally numbers same-kind objects for its
 * editing dropdown — this tooltip has no such numbering need, standalone `<rr0-scene>` has no
 * dropdown to number against anyway). English, like BODY_NAMES. */
const DECOR_KIND_NAMES: Record<DecorKind, string> = {
  building: "Building",
  tree: "Tree",
  shrub: "Shrub",
  bridge: "Bridge",
  wire: "Overhead line",
  crop: "Crop row",
  mound: "Stone heap",
  streetlight: "Streetlight",
  vehicle: "Vehicle",
  observer: "Observer",
  aircraft: "Aircraft",
  // Not "creature" and not "alien": the account says a being was there and says nothing about what
  // it was, which is the whole of what this project is willing to assert.
  entity: "Being"
}

/** Where the star catalog asset (see scripts/build-star-catalog.ts) is fetched from by default —
 * resolved relative to this module's own URL so it works both from this package's own demo and
 * once bundled/consumed by another site, without hardcoding a site-relative path. Overridable via
 * the star-catalog-src attribute for a consuming site that hosts its own copy. */
/** The Moon's limb relief, built from NASA's LOLA shape map by scripts/build-lunar-limb.ts. */
const DEFAULT_LUNAR_RELIEF_URL = new URL("../assets/lunar-relief.bin.gz", import.meta.url).href
const DEFAULT_STAR_CATALOG_URL = new URL("../assets/stars-mag7.5.bin", import.meta.url).href

/** And where the deep tier is — the stars between magnitude 7.5 and 9, which only a recording made
 * through optics that reach past 7.5 ever asks for (see StarCatalogs.upTo). 900 kB, emitted beside
 * the base asset and downloaded by nobody else. Overridable the same way. */
const DEFAULT_DEEP_STAR_CATALOG_URL = new URL("../assets/stars-mag7.5-9.bin", import.meta.url).href

/** The Sun far enough down that nothing it does can lower the threshold further — where
 * visibleMagnitudeLimit flattens, and so the deepest this recording could ever be asked to draw. */
const DARKEST_SKY_SUN_ALTITUDE_DEG = -18

/** A neutral dusk-ish sky with no Moon/planets/stars, used when a sighting has no recorded
 * date+place to compute real astronomy from. */
const DEFAULT_ASTRONOMY: SceneAstronomy = {
  sun: { altitudeDeg: -3, azimuthDeg: 180, magnitude: -26.7 },
  moon: { altitudeDeg: -90, azimuthDeg: 0, phase: { phaseFraction: 0, illuminatedFraction: 0 }, magnitude: -12.7 },
  planets: []
}

/** Applied to the camera when a sighting has no resolvable observer pose at all (no
 * observerTrack and no place[0]) — leaves heading undefined so setObserverPose doesn't snap the
 * camera to a default compass direction. */
const DEFAULT_OBSERVER_POSE: ObserverPose = { lat: 0, lng: 0, elevationM: 0, headingDeg: undefined, pitchDeg: 0, fovDeg: 60 }

/** A body at one instant, as the editor shows it — see SceneElement.bodyReading. */
export interface BodyReading {
  azimuthDeg: number
  altitudeDeg: number
  distanceM: number
  eastM: number
  northM: number
  aboveGroundM: number
  sizeM: BodySize
  attitude: Required<BodyAttitude>
  appearance: Required<BodyAppearance>
}

/**
 * Vanilla Web Component rendering a 3D "decor" (sky/horizon/stars, see
 * SceneRenderer) — named generically (not "ufo-scene") because the decor
 * itself has nothing UFO-specific about it; it could back other kinds of
 * reconstructions later. For now it composes a nested, transparent-
 * background `<rr0-ufo>` on top for the common case (see this project's
 * README: the shape is what the observer reported, possibly a
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
 * which prefers the sighting's `observerTrack` and falls back to the legacy static `place[0]`.
 * Recomputed on every playback tick/seek (via the nested `<rr0-ufo>`'s own `timeupdate` event,
 * not a separate animation loop of its own), so the sky, and the camera's own heading/pitch/fov,
 * both follow the observer as they change over the sighting's timeline.
 */
export class SceneElement extends HTMLElement {
  private creditsButton!: HTMLButtonElement

  /**
   * Whether this scene shows its credits behind its own button — true alone, false inside an
   * element that lists them in a panel of its own (`<rr0-sighting>`'s info panel).
   */
  set ownCredits(own: boolean) {
    this.creditsButton.hidden = !own
  }

  static get observedAttributes(): string[] {
    return ["src", "star-catalog-src", "deep-star-catalog-src", "show-compass", "max-pixel-ratio", OBSERVER_MAP_ATTRIBUTE, MILESTONES_ATTRIBUTE]
  }

  private readonly shadow: ShadowRoot
  private readonly stageElement: HTMLElement
  private readonly frameElement: HTMLElement
  private readonly sceneCanvas: HTMLCanvasElement
  /** The sentence under the loader's spinner — English until the reader's names arrive. */
  private readonly loaderNote: HTMLElement
  /** The one above the spinner: what the picture is not. */
  private readonly loaderNotVideo: HTMLElement
  /** Exposed (not private) so a composing wrapper — e.g. SightingEditorElement, which nests a
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
   * in: SightingEditorElement composes this element but delegates its own sightingData straight to the
   * nested `<rr0-ufo>`, so a recording loaded through the editor never passes through here at
   * all. Keying on the instance catches every path — loading a file replaces the Sighting (see
   * UfoElement's own setter), and a stale estimate carried across recordings is worse than none:
   * bounds only ever tighten, so one wrong crossing from a previous case would poison the next. */
  private sizeEstimatesFor?: Sighting
  /** A distance a reader is trying a phenomenon at, by sourceId — see PhenomenonDepth's
   * "hypothesis" and setDistanceHypothesis. Never part of the recording; dropped with the
   * estimates when another recording is loaded. */
  private readonly distanceHypotheses = new Map<string, number>()
  /** How far each phenomenon was last drawn, and why — see depthOf. */
  private depths = new Map<string, ResolvedDepth>()
  private readonly directionScratch = new Vector3()
  /** The sighting the meteor fall was worked out for, so it is scheduled once per recording rather
   * than every tick — the schedule is deterministic (see MeteorFall) and must not be re-drawn
   * underneath a paused scene or a long exposure. */
  /** What the standing meteor schedule was built from — see meteorInputsOf. A string, never the
   * Sighting itself: the editor edits ONE instance in place. */
  private meteorScheduleFor?: string
  /** What the lightning schedule was last worked out from — see ensureLightningSchedule. */
  private lightningScheduleFor?: string
  private lightningFlashes: LightningFlash[] = []
  /** The recording time the last ordinary frame was drawn at, to tell which flashes playback has just
   * crossed. */
  private lastLightningT?: number
  private lastTimeMs = 0
  /** The interpretation whose bodies stand in the scene, if one does — see `interpretation`. */
  private interpretationShown?: InterpretationJson
  /** What its bodies say against the account at the instant on show — see `confrontation`. */
  private confrontationReadings: ConfrontationReading[] = []
  private confrontationSignature = ""
  /** Whether the account is shown beside the interpretation, and measured against it — see
   * `compareAccount`. */
  private comparing = false
  /** Whether a recording is drawn the way its observer gave it — see `accountInTheRound`. */
  private inTheRound = true
  /** What the sky now standing was computed from — see applySceneAt. */
  private lastSkyKey?: string
  private starCatalog?: StarCatalog
  /** Which loadStars() call is the current one — see loadStars on why the last ASK wins rather than
   * the last arrival. */
  private starCatalogRequest = 0

  /** One archive for every scene on the page, so two embedded recordings of the same week share
   * the weeks they fetched. */
  private static readonly tleArchive = new TleArchive()
  /** The observation start the satellites below were loaded for, as a comparable value. */
  private satellitesFor?: string
  private satelliteRequest = 0
  private satelliteStatus: SatelliteStatus = "none"
  private satellites?: { snapshot: TleSnapshot; passes: SatellitePasses }
  private satellitePassesMemo?: { key: string; passes: SatellitePass[] }
  /** One archive of recorded fireballs for every scene on the page — see FireballArchive. */
  private static readonly fireballArchive = new FireballArchive()
  /** The fireballs on record during this recording, for the start and span they were asked for:
   * `records` once they came (empty for none), absent while loading or when nothing could be asked. */
  private fireballs?: { key: string; status: "loading" | "ready" | "outside" | "unavailable"; records?: FireballRecord[]; reentries: ReentryJson[] }
  /** One provider per source for every scene on the page, so two embedded recordings of the same hour
   * share the tiles they fetched. */
  private static readonly aircraftProviders = new Map<string, AircraftProvider>()
  /** How far before a recording the record of air traffic is asked for: the time the sound of an aircraft a hundred kilometres off takes to arrive, near enough. */
  private static readonly SOUND_LOOKBACK_MS = 300_000
  private static readonly NO_CONTRAILS: readonly ContrailTrail[] = []
  private static readonly upperAirProviders = new Map<string, UpperAirProvider>()
  private static readonly NO_PRESENCE: ReadonlyMap<string, { fromMs: number; untilMs: number }> = new Map()
  /** Where the air traffic is read from — see AircraftProvider. The editor's picker changes it. */
  private aircraftSource: DataSource<AircraftProvider> = AIRCRAFT_SOURCES[0]
  /** The air traffic recorded around the observer during this recording, for the source, window and place it was asked for. */
  /** What draws, labels and hears the aircraft of a record: brought in on the first aircraft found, and never by a scene that has none —
   * see trafficRuntime. Shared by every scene of the page once it has come. */
  private static trafficRuntimeLoading?: Promise<TrafficRuntime>
  private static trafficRuntime?: TrafficRuntime
  private static loadTrafficRuntime(): Promise<TrafficRuntime> {
    SceneElement.trafficRuntimeLoading ??= import("./trafficRuntime.js").then(runtime => (SceneElement.trafficRuntime = runtime))
    SceneElement.trafficRuntimeLoading.catch(() => { SceneElement.trafficRuntimeLoading = undefined })
    return SceneElement.trafficRuntimeLoading
  }
  private traffic?: { key: string; status: "loading" | "ready" | "outside" | "unavailable"; set?: TrafficDecorSet; startMs?: number; observer?: { lat: number; lng: number }; tracks?: AircraftTrack[]; models?: Map<string, AircraftModel>; descriptions?: Map<string, AircraftDescription>; audible?: Set<string>; air?: UpperAirSample[]; airSource?: UpperAirSource; contrails?: ContrailTrail[] }
  /** Where the Sun stood at the last restatement of the sky, from the observer: what the aircraft are lit by, each from its own place. */
  private lastSun?: { altitudeDeg: number; azimuthDeg: number }
  /** The decor the recording states plus the traffic, rebuilt only when either changes: the renderer
   * rebuilds every group when the list it is given is not the one it had. */
  private decorMemo?: { base: DecorObject[]; traffic: DecorObject[]; merged: DecorObject[] }
  private seatedMemo?: { base: DecorObject[]; seats: string; seated: DecorObject[] }
  /** How faint the catalogue now loaded goes — what ensureStarsDeepEnough compares this recording's
   * own optics against. Zero until the first load, which is "nothing loaded" rather than a depth. */
  private starCatalogDepth = 0
  /** Owned here, not by SceneRenderer — the renderer stays audio-agnostic (see its own
   * onLightningFlash callback param), this is the one place that already orchestrates a non-
   * rendering side effect alongside pure rendering (see the terrain-attribution label above). */
  private readonly weatherAudio = new WeatherAudio()
  /** The vehicles the observer hears — see VehicleHearing and VehicleAudio. */
  private readonly vehicleAudio = new VehicleAudio()
  /** The sound of the aircraft of a record, once there are any: its code comes with them (see trafficRuntime). */
  private aircraftAudio?: InstanceType<TrafficRuntime["AircraftAudio"]>
  private readonly vehicleHearing = new VehicleHearing()

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
    const naming = this.naming
    const names = naming.names
    const bodyKey = this.sceneRenderer.pickBodyAt(ndcX, ndcY)
    if (bodyKey) {
      this.showHoverTooltip(event, this.bodyName(bodyKey))
      return
    }
    // What the account says was there — a craft, a being, a person — by the name the interpretation gives it.
    const standing = this.interpretationShown ? this.sceneRenderer.pickInterpretationBodyAt(ndcX, ndcY) : undefined
    const standingBody = standing ? this.interpretationShown?.bodies.find(body => body.id === standing) : undefined
    const standingName = standingBody
      ? this.said.read(standingBody.title) || (standingBody.model.id === "figure" ? naming.decorKind("entity", DECOR_KIND_NAMES.entity) : undefined)
      : undefined
    if (standingName) {
      this.showHoverTooltip(event, standingName)
      return
    }
    const decorId = this.sceneRenderer.pickDecorAt(ndcX, ndcY)
    const decor = decorId ? this.ufoElement.sighting.decor.find(d => d.id === decorId) : undefined
    if (decor) {
      this.showHoverTooltip(event, this.said.read(decor.title) || naming.decorKind(decor.kind, DECOR_KIND_NAMES[decor.kind]))
      return
    }
    // Last of the four, and deliberately: a shape is painted over everything, a planet is a better
    // answer than the star behind it, and a building stands between the observer and the whole sky.
    // A star is what is left when nothing nearer is under the pointer.
    // Before the stars: a satellite crossing in front of a star is the moving light the reader is
    // most likely pointing at.
    // An aircraft of the record of air traffic: moving, and a candidate for what was seen.
    const traffic = this.trafficTooltipAt(ndcX, ndcY)
    if (traffic) {
      this.showHoverTooltip(event, traffic)
      return
    }
    const satellite = this.sceneRenderer.pickSatelliteAt(ndcX, ndcY)
    if (satellite) {
      this.showHoverTooltip(event, (names?.satelliteTooltip ?? SATELLITE_TOOLTIP)
        .replace("{name}", satellite.name)
        .replace("{mag}", satellite.magnitude.toLocaleString(undefined, { maximumFractionDigits: 1 }))
        .replace("{height}", Math.round(satellite.heightKm).toLocaleString()))
      return
    }
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
      const template = altitudeDeg < 0
        ? names?.starTooltipBelow ?? STAR_TOOLTIP_BELOW
        : names?.starTooltip ?? STAR_TOOLTIP
      this.showHoverTooltip(event, template
        .replace("{name}", naming.star(star.star))
        .replace("{mag}", magnitude.toLocaleString(undefined, { maximumFractionDigits: Math.abs(magnitude) < 1 ? 2 : 1 }))
        .replace("{alt}", String(Math.round(Math.abs(altitudeDeg)))))
      return
    }
    this.hoverTooltip.hidden = true
  }

  /** What to call the thing under the pointer. The comets are not in BODY_NAMES because there are
   * two dozen of them and they carry their own names in the catalog — a comet is a dated event
   * rather than a fixed body, which is also why the key names the apparition. */
  private bodyName(bodyKey: string): string {
    const cometId = bodyKey.startsWith(COMET_KEY_PREFIX) ? bodyKey.slice(COMET_KEY_PREFIX.length) : undefined
    const comet = cometId ? BRIGHT_COMETS.find(apparition => apparition.id === cometId) : undefined
    if (comet) return this.naming.comet(comet)
    const nova = bodyKey.startsWith(NOVA_KEY_PREFIX) ? Novae.byId(bodyKey.slice(NOVA_KEY_PREFIX.length)) : undefined
    if (nova) return this.naming.nova(nova)
    const english = BODY_NAMES[bodyKey]
    return english === undefined ? bodyKey : this.naming.body(bodyKey, english)
  }

  /**
   * What this reader calls the things in the scene — English (the catalogues' own names, and the
   * code's) until their language's names have arrived, and for good when they read English.
   *
   * The lookups it serves are synchronous (a hover tooltip, a compass label drawn into a frame), so
   * the names are asked for as soon as the language is known (see loadSceneNames, on connection) and
   * kept; whatever showed English meanwhile is redone when they land.
   */
  get naming(): SceneNaming {
    return this.sceneNaming
  }

  private sceneNaming = new SceneNaming()

  /** The language sceneNaming was last asked for — so that a reconnection deciding the same one does
   * not fetch again, and a decision overtaken by a later one is dropped. */
  private namesLanguage: UfoLanguage = "en"

  private async loadSceneNames(): Promise<void> {
    const language = selectLocale(HostLocale.preferencesFor(this), UFO_SUPPORTED_LANGUAGES) as UfoLanguage
    if (language === this.namesLanguage) return
    this.namesLanguage = language
    const names = await loadSceneNames(language)
    if (language !== this.namesLanguage) return
    this.applySceneNaming(new SceneNaming(names))
  }

  /**
   * The two sentences of the loader, each letter in a span of its own so that they light up one after
   * the other, left to right, the second sentence picking up where the first ends. Words stay whole
   * (an inline block each) so that a narrow picture wraps between them, and the sentence is read out
   * once, as a label, rather than letter by letter.
   */
  private renderLoaderText(notAVideo: string, simulation: string): void {
    let index = 0
    const fill = (element: HTMLElement, text: string): void => {
      element.setAttribute("aria-label", text)
      element.replaceChildren()
      text.split(" ").forEach((word, position) => {
        if (position > 0) element.append(" ")
        const wordElement = document.createElement("span")
        wordElement.className = "scene-loader-word"
        wordElement.setAttribute("aria-hidden", "true")
        for (const letter of word) {
          const span = document.createElement("span")
          span.className = "scene-loader-letter"
          span.style.setProperty("--i", String(index++))
          span.textContent = letter
          wordElement.append(span)
        }
        element.append(wordElement)
        index++
      })
    }
    fill(this.loaderNotVideo, notAVideo)
    index += 6
    fill(this.loaderNote, simulation)
  }

  private applySceneNaming(naming: SceneNaming): void {
    this.sceneNaming = naming
    const creditsLabel = naming.names?.credits ?? CREDITS_LABEL
    this.creditsButton.title = creditsLabel
    this.creditsButton.setAttribute("aria-label", creditsLabel)
    if (naming.names) this.renderLoaderText(naming.names.notAVideo, naming.names.isASimulation)
    this.sceneRenderer.setCompassPoints(naming.names?.compassPoints)
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

  /** A flash has just started on screen: its thunder follows after the time sound takes to cover
   * the distance it struck at (see LightningSchedule.thunderDelayMs). Applied here, where both the
   * flash and the audio are known; a plain timeout, since it is one delay and not per-frame state,
   * and cleared by a pause like everything else still in flight. */
  private handleLightningFlash(flash: LightningFlash): void {
    clearTimeout(this.thunderTimeoutId)
    this.thunderTimeoutId = window.setTimeout(() => this.weatherAudio.playThunder(), LightningSchedule.thunderDelayMs(flash))
  }

  /** Unlocks weather audio on the very first interaction with the scene, anywhere in it — needed even for a
   * read-only `<rr0-scene>` embed with no editing UI at all (e.g. a published case page whose
   * sighting.json already sets rain/wind), which has no "weather control" to hang resume() off of
   * the way SightingEditorElement's own updateWeather() does. Re-applies the current weather right
   * after resuming, since any setWeather() call made *before* this (e.g. from the sightingData
   * setter at load) was itself a no-op audio-wise while the context didn't exist yet — otherwise a
   * scene loaded with rain already set would render visible rain but never actually start the
   * sound until weather changed again, which it might never do. */
  private readonly handleFirstInteraction = () => {
    this.weatherAudio.resume()
    this.vehicleAudio.resume()
    this.aircraftAudio?.resume()
    if (this.interacted) return
    this.interacted = true
    this.setWeather(resolveActualWeatherAt(this.ufoElement.sighting, this.lastTimeMs))
  }

  private interacted = false

  /** The player's volume and mute button over every sound this scene plays: the weather, the vehicles, the aircraft. */
  private applyLevel(): void {
    const level = this.ufoElement.level
    this.weatherAudio.setLevel(level)
    this.vehicleAudio.setLevel(level)
    this.aircraftAudio?.setLevel(level)
  }

  /**
   * A gesture anywhere on the page counts while the recording plays: a replay that starts on its own (the player's page, from the
   * button that loads it, which is outside this element) must not stay silent until the reader happens to press inside the scene. Not
   * for one that is paused, which is not asking for any sound: a page of many scenes does not open them all on the first click.
   */
  private readonly handlePageGesture = () => {
    if (this.ufoElement.playbackState === "playing") this.handleFirstInteraction()
  }

  /** The reader has already pressed something on this page, which lets sound start without another gesture where the browser says so (sticky user activation). */
  private unlockIfAlreadyActivated(): void {
    if (this.interacted) return
    if ((navigator as { userActivation?: { hasBeenActive: boolean } }).userActivation?.hasBeenActive) this.handleFirstInteraction()
  }

  private static readonly GESTURES = ["pointerdown", "pointerup", "touchend", "click", "keydown"]

  /** Reuses the nested <rr0-ufo>'s own playback clock (it already dispatches this on every
   * Player tick and every seek, mirroring <video>'s timeupdate) instead of running a second,
   * separate animation loop just for astronomy. */
  private readonly handleTimeUpdate = (event: Event) => {
    this.lastTimeMs = (event as CustomEvent<{ time: number }>).detail.time
    this.syncAnimationsToPlayback()
    this.updateAstronomy(this.lastTimeMs)
    // One drawn frame per tick of playback, once everything the tick restated is in: the setters
    // above only mark the frame dirty (see SceneRenderer.render). A seek while paused is drawn by
    // the renderer's own one-shot frame request instead, so that a drag's many seeks per frame
    // still cost one drawing.
    if (this.ufoElement.playbackState === "playing") this.sceneRenderer.frame(performance.now())
  }

  /**
   * Makes the weather follow the player: rain falls, clouds drift, lightning strikes and the beds
   * are heard only while the observation's own clock is running. Pause a replay and it is one
   * frozen instant of a sighting — weather still going on over it would be the reader's own room,
   * not the observer's evening.
   *
   * Driven from timeupdate rather than from a playback-state event of its own because every
   * transition already produces one: a play tick, a seek, and pause's own forced repaint all funnel
   * through the nested player's single onFrame sink.
   */
  private syncAnimationsToPlayback(): void {
    // Paused is paused, in the editor as anywhere: the picture, the weather and the sound all stop
    // with the clock. An editor once kept the weather moving over a paused recording so that an
    // author stating it could see it, and that is not the observation: a sky that moves while no
    // time passes is wrong, and it kept the editor redrawing, and its graphics card busy, for as
    // long as the page was open. Playing is how the weather is seen to move.
    const playing = this.ufoElement.playbackState === "playing"
    // While playing, the player's own tick is the frame clock (see handleTimeUpdate) and the
    // renderer runs no loop beside it.
    this.sceneRenderer.setAnimationsRunning(playing, playing)
    this.weatherAudio.setPaused(!playing)
    this.vehicleAudio.setPaused(!playing)
    this.aircraftAudio?.setPaused(!playing)
    if (playing) this.unlockIfAlreadyActivated()
    // A thunderclap is deliberately delayed by the distance sound travels (see
    // handleLightningFlash); one still in flight belongs to a flash that is no longer happening.
    if (!playing) clearTimeout(this.thunderTimeoutId)
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
    this.sceneRenderer = new SceneRenderer(this.sceneCanvas)
    const loader = this.shadow.getElementById("scene-loader")!
    this.loaderNote = this.shadow.getElementById("scene-loader-note")!
    this.loaderNotVideo = this.shadow.getElementById("scene-loader-not-video")!
    this.renderLoaderText("This is not a video", "It is a real-time simulation.")
    this.sceneRenderer.onFirstFrameHold = holding => {
      loader.hidden = !holding
      // The sentence saying what this is not (a video) has the picture to itself while it waits: the
      // account's first moment would be printed over it, both centred, and neither could be read.
      this.ufoElement.captionHeld = holding
      // And the clock: the observation does not begin behind the loader.
      this.ufoElement.holdClock(holding)
    }
    this.hoverTooltip = this.shadow.getElementById("hover-tooltip")!

    // Created imperatively rather than left inline in the template markup — see
    // SightingEditorElement's constructor for why (an inline tag parsed from
    // template.content.cloneNode(true) isn't upgraded to its class instance yet at this point).
    this.ufoElement = document.createElement(UFO_ELEMENT_NAME) as UfoElement
    this.ufoElement.classList.add("ufo-overlay")
    // The phenomena stand in the scene below, not on the overlay — see UfoElement.paintsShapes.
    this.ufoElement.paintsShapes = false
    // Attributes set before this element upgraded are already on it — attributeChangedCallback has
    // not fired for them, since the nested player did not exist yet.
    this.forwardPlayerAttributes()
    // The map is drawn by the nested player, but only this element can turn a view: it owns the 3D.
    this.ufoElement.addEventListener("lookat", event => this.lookToward((event as CustomEvent).detail))
    this.ufoElement.style.setProperty("--ufo-canvas-background", "transparent")
    this.ufoElement.style.setProperty("--ufo-canvas-border", "none")
    // Otherwise the nested <rr0-ufo>'s own fullscreen button would fullscreen just its own stage
    // (its transparent overlay canvas + toolbar), hiding the 3D backdrop — a sibling outside it.
    this.ufoElement.fullscreenTarget = this.stageElement
    this.shadow.getElementById("ufo-slot")!.replaceWith(this.ufoElement)
    // The credits: this element lists them behind its own button (see ownCredits), so the map
    // never prints its licence over the ground.
    this.ufoElement.creditShownExternally = true
    this.creditsButton = this.shadow.getElementById("credits-button") as HTMLButtonElement
    const creditsPanel = this.shadow.getElementById("credits-panel")!
    const creditsList = this.shadow.getElementById("credits-list")!
    creditsPanel.addEventListener("beforetoggle", event => {
      if ((event as ToggleEvent).newState === "open") SceneCredits.fill(creditsList, this)
    })
    // English until the reader's names arrive — see naming.
    this.creditsButton.title = CREDITS_LABEL
    this.creditsButton.setAttribute("aria-label", CREDITS_LABEL)
    this.sceneRenderer.onMapSubjectBounds = bounds => this.ufoElement.setMapSubjectBounds(bounds)
    this.ufoElement.addEventListener("timeupdate", this.handleTimeUpdate)
    this.ufoElement.seekPreviewPainter = (t, canvas) => this.seekPreviewOf(canvas).paint(t, canvas)
    // The weather is heard through this element, the button that silences it is the player's.
    this.ufoElement.addEventListener("mutedchange", () => this.applyLevel())
    // What the player's sound button must also answer for: the van's engine, the rain and the wind (see UfoElement.ambientSound).
    this.ufoElement.ambientSound = sighting => sighting.vehicle !== undefined
      || sighting.decor.some(decor => decor.engine !== undefined)
      || sighting.weatherTrack.allKeyframes.some(frame => frame.weather.precipitationType !== "none" || frame.weather.windSpeed > 1)
    this.ufoElement.addEventListener("referenceview", event => this.applyReferenceView((event as CustomEvent<ReferenceViewDetail>).detail))
    this.ufoElement.addEventListener("traceview", event => this.sceneRenderer.setTracesShown((event as CustomEvent<{ shown: boolean }>).detail.shown))
    this.ufoElement.canvasElement.addEventListener("pointermove", this.handlePointerMove)
    this.ufoElement.canvasElement.addEventListener("pointerleave", this.handlePointerLeave)
    // On the element itself and while capturing, so any press inside it counts: the play button
    // of the playback bar above all, which is how a reader starts a replay, and which a listener on
    // the canvas alone never heard. A storm replayed from its own button was silent. Events from the
    // shadow trees inside are composed and reach this element retargeted.
    // Kept, not removed after the first: a phone counts only a touch's END (or a click) as the gesture
    // that unlocks sound, and unlocks it again after an interruption — see AudioUnlock.
    for (const type of SceneElement.GESTURES) {
      this.addEventListener(type, this.handleFirstInteraction, true)
    }
  }

  /**
   * Which of a recording's languages this reader reads — see SaidText.
   *
   * Built on demand and cached, not at construction: it reads the nearest `[lang]` ancestor, and
   * an element still being upgraded has none yet. Dropped on connection, so that moving this
   * element into a section that declares another language is honoured.
   */
  private get said(): SaidTexts {
    return this.saidTexts ??= new SaidTexts(HostLocale.preferencesFor(this))
  }

  private saidTexts?: SaidTexts

  /** The names of the investigator's lines in this reader's language, held until the traces or the
   * language change so that the renderer is handed the same map every tick. */
  private traceLabelsFor?: { traces: unknown; language: string; labels: ReadonlyMap<string, string> }

  private traceLabels(traces: InvestigatorTrace[]): ReadonlyMap<string, string> {
    const language = HostLocale.preferencesFor(this).join()
    if (this.traceLabelsFor?.traces !== traces || this.traceLabelsFor.language !== language) {
      const labels = new Map<string, string>()
      for (const trace of traces) {
        const name = this.said.read(trace.title)
        if (name) labels.set(trace.id, name)
      }
      this.traceLabelsFor = { traces, language, labels }
    }
    return this.traceLabelsFor.labels
  }

  connectedCallback(): void {
    this.saidTexts = undefined
    void this.loadSceneNames()
    this.sceneRenderer.restoreContext()
    this.resizeToStage()
    this.updateAstronomy(this.lastTimeMs)
    void this.loadStars()

    // Keeps the 3D canvas' backing resolution matched to its actual displayed size (e.g. a
    // responsive page width change, or entering/exiting fullscreen) — observing #frame (not the
    // host element) is what actually changes size in both cases; the host's own layout box
    // doesn't necessarily change just because a shadow-DOM-nested descendant goes fullscreen.
    this.resizeObserver = new ResizeObserver(() => this.resizeToStage())
    this.resizeObserver.observe(this.frameElement)
    this.watchVisibility()
    // Belt-and-suspenders: ResizeObserver timing around fullscreen transitions is inconsistent
    // across browsers (some fire a frame late, or with an intermediate size mid-transition) —
    // explicitly reacting to fullscreenchange too removes any doubt. Same event UfoElement
    // already listens to for its own button icon sync.
    document.addEventListener("fullscreenchange", this.handleFullscreenChange)
    for (const type of SceneElement.GESTURES) document.addEventListener(type, this.handlePageGesture, true)

    const src = this.getAttribute("src")
    if (src) {
      void this.loadFromSrc(src)
    }
  }

  /**
   * Suspends the scene while it is out of the reader's sight (scrolled past, in a closed panel, in a
   * hidden tab of the page) and wakes it when it comes back: nothing is drawn or computed for a
   * picture nobody sees, which is most of what an open editor or a long catalogue page cost.
   * Playback is paused, not just hidden: a replay going on behind the reader's back is a clock
   * running for nobody, with its sound still on. It stays paused when the scene returns, the way the
   * catalogue's own cards do (see DemosPage); the play button is where it starts again.
   *
   * A margin around the viewport, so that the first frame is drawn before the scene arrives rather
   * than after.
   */
  private watchVisibility(): void {
    this.visibilityObserver?.disconnect()
    if (typeof IntersectionObserver === "undefined") return
    this.visibilityObserver = new IntersectionObserver(entries => {
      const visible = entries[entries.length - 1].isIntersecting
      if (visible) {
        this.sceneRenderer.resume()
        return
      }
      this.ufoElement.pause()
      this.sceneRenderer.suspend()
    }, { rootMargin: "100px" })
    this.visibilityObserver.observe(this)
  }

  private visibilityObserver?: IntersectionObserver

  disconnectedCallback(): void {
    this.visibilityObserver?.disconnect()
    this.resizeObserver?.disconnect()
    document.removeEventListener("fullscreenchange", this.handleFullscreenChange)
    for (const type of SceneElement.GESTURES) document.removeEventListener(type, this.handlePageGesture, true)
    // Otherwise the twinkle animation loop (a continuous requestAnimationFrame chain, unlike the
    // one-shot renders before it) keeps running forever into a detached canvas after unmount.
    this.sceneRenderer.stopTwinkle()
    clearTimeout(this.thunderTimeoutId)
    this.weatherAudio.dispose()
    this.vehicleAudio.dispose()
    this.aircraftAudio?.dispose()
    this.seekPreview?.dispose()
    this.seekPreview = undefined
    // The graphics context goes back to the browser once it is clear this element is not merely
    // being moved (a move is a disconnection and a reconnection in the same task) — see
    // SceneRenderer.releaseContext.
    queueMicrotask(() => {
      if (!this.isConnected) this.sceneRenderer.releaseContext()
    })
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string): void {
    if (name === "src" && newValue && newValue !== oldValue && this.isConnected) {
      void this.loadFromSrc(newValue)
    }
    if ((name === "star-catalog-src" || name === "deep-star-catalog-src") && newValue !== oldValue && this.isConnected) {
      void this.loadStars()
    }
    if (name === "show-compass" && newValue !== oldValue) {
      this.sceneRenderer.setShowCompass(this.hasAttribute("show-compass"))
    }
    // How many device pixels per CSS pixel at most — the display's own when absent. The scene
    // adapts below it while its frames are late; see SceneRenderer.setMaxPixelRatio.
    if (name === "max-pixel-ratio" && newValue !== oldValue) {
      const ratio = Number(newValue)
      this.sceneRenderer.setMaxPixelRatio(Number.isFinite(ratio) && ratio > 0 ? ratio : Math.min(window.devicePixelRatio || 1, 2))
    }
    if ((name === OBSERVER_MAP_ATTRIBUTE || name === MILESTONES_ATTRIBUTE) && newValue !== oldValue) {
      this.forwardPlayerAttributes()
    }
  }

  /** Passes the page's own instructions about the player's overlays down to the `<rr0-ufo>` that
   * owns them — they live on the nested player's stage, but a page embedding this element has never
   * heard of that player and writes the tag it actually wrote. Same for `<rr0-sighting>` above. */
  private forwardPlayerAttributes(): void {
    for (const attribute of [OBSERVER_MAP_ATTRIBUTE, MILESTONES_ATTRIBUTE]) {
      // The value too, not only the presence: `show-observer-map="false"` says something.
      const value = this.getAttribute(attribute)
      if (value === null) this.ufoElement.removeAttribute(attribute)
      else this.ufoElement.setAttribute(attribute, value)
    }
  }

  /** Forces the compass labels visible independent of pointer hover — see
   * SceneRenderer.setCompassForced's own doc comment. `SightingEditorElement` calls this from the
   * heading input's own focus/blur, a direct method rather than another observed attribute since
   * it's meant to change far more often (every focus/blur) than `show-compass`'s one-time setup. */
  setCompassForced(forced: boolean): void {
    this.sceneRenderer.setCompassForced(forced)
  }

  /**
   * Turns the view until a place on the observer's map is in front of the reader.
   *
   * A look-around, never an edit: what the observer stated they faced stays exactly as recorded, and
   * this is added on top of it (see SceneRenderer.setLookOffset). Clicking the observer's own dot
   * puts it back — "show me what he was looking at" is the one thing a reader can want that has no
   * bearing of its own.
   *
   * Level with the horizon rather than aimed down at the ground: everything the map carries is a
   * thing standing ON that ground, a few metres tall at most and tens or hundreds of metres away,
   * so the angle down to its feet is a fraction of a degree and pitching by it would only tilt the
   * horizon for no gain.
   */
  private lookToward(detail: { kind: string; lat: number; lng: number }): void {
    const pose = resolveObserverPoseAt(this.ufoElement.sighting, this.lastTimeMs)
    if (detail.kind === "observer" || pose?.lat === undefined || pose.lng === undefined || pose.headingDeg === undefined) {
      this.setLookOffset(0, 0)
      return
    }
    const { x, z } = geoToLocalMeters(detail.lat, detail.lng, pose.lat, pose.lng)
    if (Math.hypot(x, z) < 1) return this.setLookOffset(0, 0)
    // Local metres are east and SOUTH-positive (see GeoProjection), so north is -z — the same
    // conversion setObserverPose's own heading uses, read the other way round.
    const bearingDeg = (((Math.atan2(x, -z) * 180) / Math.PI) + 360) % 360
    this.setLookOffset(((((bearingDeg - pose.headingDeg) % 360) + 540) % 360) - 180, -pose.pitchDeg)
  }

  /** Turns the 3D view and the overlay painted on it together — one is the observer's field of view
   * and the other is what they saw in it, so they cannot be aimed separately. */
  private setLookOffset(yawDeg: number, pitchDeg: number): void {
    this.sceneRenderer.setLookOffset(yawDeg, pitchDeg)
    this.ufoElement.setLookOffset(yawDeg, pitchDeg)
    // The scene repaints from its own tick; asking for the pose again is what makes the turn happen
    // now rather than at whatever the next one would have been.
    this.updateAstronomy(this.lastTimeMs)
  }

  /** Passthrough to SceneRenderer.setIndoorLook — see its own doc comment. `SightingEditorElement`
   * calls this from its camera-drag handling instead of updateObserver()/observerTrack whenever
   * the observer is currently inside a decor object. */
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
  /** Rendering preference only; the cloud model remains on the weather timeline. */
  setCloudRendering(mode: CloudRendering): void {
    this.sceneRenderer.setCloudRendering(mode)
  }

  setWeather(weather: Weather): void {
    this.sceneRenderer.setWeather(weather)
    this.weatherAudio.setAmbient(weather.precipitationType, weather.precipitationIntensity * (weather.precipitationAmount ?? 1), weather.windSpeed)
  }

  /** Optional editing tools share the renderer's actual projection and cloud density. */
  pickCloudAt(ndcX: number, ndcY: number) {
    return this.sceneRenderer.pickCloudAt(ndcX, ndcY)
  }

  cloudDirectionAt(ndcX: number, ndcY: number) {
    return this.sceneRenderer.cloudDirectionAt(ndcX, ndcY)
  }

  /** Finds which decor object (if any) sits under normalized device coordinates — a thin
   * passthrough to SceneRenderer.pickDecorAt, same "expose one method, not the whole renderer"
   * convention as setWeather/currentTerrainAttribution above. Used by SightingEditorElement's own
   * right-click handler (see its onContextMenu) to offer "view this observer's account". */
  pickDecorAt(ndcX: number, ndcY: number): string | undefined {
    return this.sceneRenderer.pickDecorAt(ndcX, ndcY)
  }

  /** The rectangle a decor object covers on the picture — see SceneRenderer.decorScreenBox. */
  decorScreenBox(id: string): { minX: number, minY: number, maxX: number, maxY: number } | undefined {
    return this.sceneRenderer.decorScreenBox(id)
  }

  /** Where a point of the picture meets the ground the decor object stands on — see
   * SceneRenderer.decorGroundPointAt. */
  decorGroundPointAt(id: string, ndcX: number, ndcY: number): { x: number, z: number } | undefined {
    return this.sceneRenderer.decorGroundPointAt(id, ndcX, ndcY)
  }

  /** The rectangle a body covers on the picture — see SceneRenderer.bodyScreenBox. */
  bodyScreenBox(id: string): { minX: number, minY: number, maxX: number, maxY: number } | undefined {
    return this.sceneRenderer.bodyScreenBox(id)
  }

  /** Which of the interpretation's bodies stands under a point of the picture — see
   * SceneRenderer.pickPlacedBodyAt. */
  pickPlacedBodyAt(ndcX: number, ndcY: number): string | undefined {
    return this.sceneRenderer.pickPlacedBodyAt(ndcX, ndcY)
  }

  /** Unlocks weather audio — see WeatherAudio.resume's own doc comment on why this needs a real
   * user gesture. SightingEditorElement calls this from its own weather toolbar's first interaction
   * (handleFirstInteraction covers the other case: a read-only embed with no editing UI at all). */
  resumeWeatherAudio(): void {
    this.weatherAudio.resume()
    this.vehicleAudio.resume()
    this.aircraftAudio?.resume()
  }

  /** Fetches a SightingRecordingJson from `url` and loads it — what the `src` attribute uses. */
  async loadFromSrc(url: string): Promise<void> {
    const fetching = SightingFetch.json(url)
    this.holdForNewScene(fetching)
    const json = (await fetching) as SightingRecordingJson
    this.documentUrl = new URL(url, location.href).href
    this.sightingData = json
  }

  /**
   * Shows the loader, and keeps the frame on screen, until the recording about to be set is drawn
   * whole — see SceneRenderer.holdForNewScene. For loading a new recording, never for an edit of
   * the one on show: an edit is seen as it is made.
   */
  holdForNewScene(arrival?: Promise<unknown>): void {
    this.sceneRenderer.holdForNewScene(arrival)
  }

  /** Where the recording on show was read from, which the addresses it states (a model's `url`) are
   * relative to — see SceneRenderer.documentUrl. Set it BEFORE `sightingData` when loading from an
   * address by any other way than `src`; loading a recording does not change it. */
  get documentUrl(): string | undefined {
    return this.sceneRenderer.documentUrl
  }

  set documentUrl(url: string | undefined) {
    this.sceneRenderer.documentUrl = url
  }

  get sightingData(): SightingRecordingJson {
    return this.ufoElement.sightingData
  }

  set sightingData(json: SightingRecordingJson) {
    this.ufoElement.sightingData = json
    this.seekPreview?.recordingChanged(json)
    // An interpretation is OF one recording: another one's bodies have nothing to stand for here.
    // What the new one starts as is its observer's own account of what it was, if they gave one.
    this.interpretationShown = this.inTheRound ? this.ufoElement.sighting.interpretation : undefined
    this.syncAccountHidden()
    // A loaded recording may have been made through something with a format of its own.
    this.applyFrameFormat()
    this.lastTimeMs = 0
    // A recording is a new set of shaders (its clouds, its optics, its stars): compiled off the
    // thread before the first frame rather than on it, so a page mounting scenes as it scrolls
    // keeps scrolling — see SceneRenderer.compileNextFrameOffThread.
    this.sceneRenderer.compileNextFrameOffThread()
    // Also resolves+applies weather at t=0 — see updateAstronomy's own doc comment.
    this.updateAstronomy(0)
  }

  /** The picture over the seek bar's pointer, drawn by a second scene — see SeekPreview. Built the
   * first time it is asked for. */
  private seekPreview?: SeekPreview

  private seekPreviewOf(canvas: HTMLCanvasElement): SeekPreview {
    // The preview has the picture's own proportions, whatever the recording's format is.
    const aspect = this.sceneCanvas.width > 0 && this.sceneCanvas.height > 0 ? this.sceneCanvas.width / this.sceneCanvas.height : 16 / 9
    const height = Math.round(canvas.width / aspect)
    if (canvas.height !== height) canvas.height = height
    return this.seekPreview ??= new SeekPreview(this as unknown as PreviewableScene, () => document.createElement(SCENE_ELEMENT_NAME) as unknown as PreviewableScene)
  }

  /** Puts the scene at an instant of the recording, for whoever draws it from a second scene — see
   * SeekPreview. The frame itself is asked for by snapshotTo. */
  showAt(t: number): void {
    this.ufoElement.currentTime = t
    this.framesAtAsk = this.sceneRenderer.framesDrawn
  }

  private framesAtAsk = 0

  /** Draws the scene into `target` if a frame has been drawn since showAt, and says whether it was.
   * Copied in the very task the frame is drawn in: the drawing buffer is not kept past it. */
  snapshotTo(target: HTMLCanvasElement): boolean {
    this.sceneRenderer.frame(performance.now())
    if (this.sceneRenderer.framesDrawn === this.framesAtAsk) return false
    const context = target.getContext("2d")
    if (!context) return false
    context.drawImage(this.sceneCanvas, 0, 0, target.width, target.height)
    return true
  }

  /** A loaded picture's width over its height, undefined until it has arrived — see
   * SceneRenderer.referenceAspect. */
  referenceAspect(id: string): number | undefined {
    return this.sceneRenderer.referenceAspect(id)
  }

  /** Where a world direction lands on the picture, in normalised device coordinates, or undefined
   * behind the camera — see SceneRenderer.screenPointOf. */
  screenPointOf(direction: Vector3): { ndcX: number; ndcY: number } | undefined {
    return this.sceneRenderer.screenPointOf(direction)
  }

  /** The world direction a point of the picture names, in normalised device coordinates (-1..1,
   * +y up) — see SceneRenderer.directionAt. */
  directionAt(ndcX: number, ndcY: number): Vector3 {
    return this.sceneRenderer.directionAt(ndcX, ndcY)
  }

  /** Whether a picture's bytes could not be had — what the editor tells its author. */
  referenceFailedToLoad(src: string): boolean {
    return this.sceneRenderer.referenceFailedToLoad(src)
  }

  /** What the reader wants of the pictures of the place — the player's own toggle and slider,
   * applied to every picture the recording carries (see SceneReference and UfoElement). */
  private applyReferenceView(view: ReferenceViewDetail): void {
    this.sceneRenderer.setReferencesShown(view.shown)
    for (const reference of this.ufoElement.sighting.references) {
      // With several pictures each has its own view: one hidden is one drawn at no opacity.
      const own = view.views?.[reference.id]
      this.sceneRenderer.setReferenceView(reference.id, { opacity: own ? (own.shown ? own.opacity : 0) : view.opacity })
    }
  }

  /** Undefined until a real, location-accurate terrain relief patch has finished its async build
   * (see SceneRenderer.setTerrainOrigin) — exposed for a composing wrapper's own on-demand credit
   * display (see SightingElement's info panel) rather than this element painting a permanent
   * corner label itself; a real-time pull (not push/cached) since it can resolve at any time. */
  get currentTerrainAttribution(): string | undefined {
    return this.sceneRenderer.currentTerrainAttribution
  }

  /** The same, for the roads laid on that patch — and it is owed for more than a licence: it is
   * where a reader is told that those roads are a survey of TODAY and not of the day the account
   * is about (see RoadProvider.contemporary). Undefined while none has been drawn. */
  get currentRoadAttribution(): string | undefined {
    return this.sceneRenderer.currentRoadAttribution
  }

  /** Relays a change of terrain source through to the renderer — see its setTerrainProviders.
   * Same "expose the nested renderer to a composing wrapper" arrangement as the getters above. */
  setTerrainProviders(providers: TerrainProviders): void {
    this.sceneRenderer.setTerrainProviders(providers)
  }

  /** Relays a change of 3D-model catalogue through to the renderer — see its
   * setDecorModelProvider. Same arrangement as setTerrainProviders above. */
  setDecorModelProvider(provider: DecorModelProvider): void {
    this.sceneRenderer.setDecorModelProvider(provider)
  }

  /** The credit of every 3D model currently showing in the decor — see
   * SceneRenderer.currentDecorModelCredits, and DataSource on why a credit that isn't displayed
   * isn't a licence. */
  get decorModelCredits(): DecorModelCredit[] {
    // Once each: forty aircraft drawn with one A320 model are one credit, not forty lines of it.
    const once = new Map(this.sceneRenderer.currentDecorModelCredits.map(credit => [`${credit.title}|${credit.author ?? ""}|${credit.license}|${credit.sourceUrl ?? ""}`, credit]))
    return [...once.values()]
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
   * SightingEditorElement's instrument picker) and the frame has to follow at that moment; everything
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

  /**
   * Fetches the star catalog asset once (or again, if either src attribute changes) — rendering
   * proceeds without stars until this resolves, then repaints at the current playback position.
   *
   * WHICH TIER depends on the recording's own optics, not on the sky it is drawn under: the deep
   * one is asked for whenever this instrument could reach past the base cut on the darkest night it
   * could have (see needsDeepStars). Deliberately not "past the cut under THIS sky", which would
   * fetch 900 kB somewhere in the middle of a dusk and rebuild the whole star field as the Sun went
   * down.
   */
  private async loadStars(): Promise<void> {
    const tiers: StarCatalogTier[] = [
      {
        magnitudeLimit: STAR_CATALOG_MAGNITUDE_LIMIT,
        url: this.getAttribute("star-catalog-src") ?? DEFAULT_STAR_CATALOG_URL
      },
      {
        magnitudeLimit: DEEP_STAR_CATALOG_MAGNITUDE_LIMIT,
        url: this.getAttribute("deep-star-catalog-src") ?? DEFAULT_DEEP_STAR_CATALOG_URL
      }
    ]
    const reach = this.instrumentReach()
    // A second call can overtake a first (an instrument changed while the deep tier was in flight),
    // and the one that lands must be the one that asked last rather than the one that finished
    // last.
    const asked = ++this.starCatalogRequest
    // Set BEFORE awaiting: the per-tick check below would otherwise fire again on every frame drawn
    // while the 900 kB is in flight, and each of those would start another one.
    this.starCatalogDepth = reach > STAR_CATALOG_MAGNITUDE_LIMIT ? DEEP_STAR_CATALOG_MAGNITUDE_LIMIT : STAR_CATALOG_MAGNITUDE_LIMIT
    const catalog = await StarCatalogs.upTo(tiers, reach)
    if (asked !== this.starCatalogRequest) return
    this.starCatalog = catalog
    // Three tiers of stars are three programs this context has not compiled yet.
    this.sceneRenderer.compileNextFrameOffThread()
    this.updateAstronomy(this.lastTimeMs)
  }

  /**
   * Fetches the deeper tier the moment this recording starts needing one — a loaded file, an
   * instrument picked in the editor, a shutter opened from a two-hundred-and-fiftieth to twenty
   * seconds.
   *
   * Checked here, on every astronomy tick, rather than hooked onto each of those events: they are
   * three different code paths in two elements, and a recording that quietly draws the eye's own
   * stars through an f/2 lens looks exactly like a recording that has nothing more to draw. Cheap,
   * and it cannot loop — the depth only ever grows, and it stops at the deepest tier there is.
   */
  private ensureStarsDeepEnough(): void {
    if (!this.starCatalog || this.starCatalogDepth >= DEEP_STAR_CATALOG_MAGNITUDE_LIMIT) return
    if (this.instrumentReach() <= this.starCatalogDepth) return
    void this.loadStars()
  }

  /**
   * The faintest magnitude this recording's own optics could ever record, over the whole night.
   *
   * Asked against the DARKEST sky rather than the current one, because it decides which catalogue
   * files to fetch: the answer must not change as the Sun sets, or a scene would pull 900 kB
   * somewhere in the middle of a dusk and rebuild its whole star field mid-playback. An eye's own
   * 6.5 never reaches the base cut, which is why every sighting made before instruments existed
   * here still loads 400 kB and nothing more.
   */
  private instrumentReach(): number {
    const sighting = this.ufoElement.sighting
    const gain = LimitingMagnitude.gainFor(sighting.instrument, {
      fNumber: resolveObserverPoseAt(sighting, 0)?.fNumber,
      fieldOfViewDeg: SightingShapes.fovOf(sighting, 0),
      exposureSeconds: sighting.exposure
    })
    return visibleMagnitudeLimit(DARKEST_SKY_SUN_ALTITUDE_DEG, gain)
  }

  /** Resolves the observer's pose and, whenever *any* date/time information is known (even just an
   * hour, with no date at all — see sightingTimeToDate's own reference-date fallback), real Sun/
   * Moon/planet/star positions at playback instant `t` (milliseconds since the recording started —
   * added on top of the sighting's own recorded start time, so a multi-minute sighting's sky can
   * itself advance during playback). Falls back to a neutral DEFAULT_ASTRONOMY sky only when
   * there's nothing at all to compute from. Partial information renders a "good enough" preview
   * rather than nothing: a known time but no real lat/lng yet (e.g. mid-authoring in
   * `<rr0-sighting-editor>`, where the observer's heading/time might be set before their location is)
   * still renders real astronomy, using DEFAULT_OBSERVER_POSE's lat/lng (0,0) purely as a
   * *rendering* fallback — this is never written back into the sighting's own data, it just means
   * a date/time or heading edit gives live visual feedback before a location is entered. The
   * observer's own heading/pitch/fov always applies to the camera regardless, since that part
   * doesn't need a date or a location either. */
  private updateAstronomy(t: number): void {
    this.ensureStarsDeepEnough()
    this.applySceneAt(t)
    // How long the shutter was open, and therefore how many instants this frame is: a photograph is
    // everything that crossed the frame while it was, and over a pose of any length the thing that
    // crosses it is the SKY — the Earth turns under it and every star draws its arc (see SkyDrift).
    // The shape's own trail is drawn by <rr0-ufo> on its own canvas and starts far sooner (a
    // fiftieth of a second is enough to smear a moving object); the sky needs a pose long enough to
    // move a whole pixel, which is tens of seconds.
    // The pose BEHIND the instant, ending on it — see ExposureSampling.windowEndingAt.
    const window = ExposureSampling.windowEndingAt(t, this.exposureSeconds())
    const exposureSeconds = window.seconds
    const degPerPixel = this.degreesPerPixelAt(t)
    // Two demands, and the pose is drawn at the coarser: what the SKY did (SkyDrift) and what the
    // scene standing against it did — an aircraft crossing the frame, a strobe flashing while it
    // crosses (ExposureSampling). The second is the whole point of the Gennevilliers photograph:
    // the sky drifts one pixel in ten seconds and would ask for two instants, while the aeroplane
    // that made the picture crosses hundreds and flashes ten times.
    const sky = SkyDrift.instants(exposureSeconds, degPerPixel)
    // Three demands now, and the pose is drawn at the coarsest: what the SKY did, what the scene
    // standing against it did, and what the observer's own phenomenon did — which used to have its
    // own streak on the overlay and is now drawn in this scene like everything else, so its travel
    // has to be sampled here too (see UfoElement.exposureTimes for how it is counted).
    const instants = Math.max(
      sky,
      this.ufoElement.exposureTimes(t).length,
      ExposureSampling.instants(
        this.decorWithTraffic(this.ufoElement.sighting),
        resolveObserverPoseAt(this.ufoElement.sighting, t)?.elevationM ?? 0,
        window.fromMs,
        exposureSeconds,
        degPerPixel
      )
    )
    if (instants <= 1) {
      this.sceneRenderer.setExposure(1)
      return
    }
    // Same convention as the shape's own accumulation (see UfoElement.exposureTimes): from the
    // shutter's opening to the instant itself, that last one included.
    //
    // What sampling instants cannot catch, said out loud: anything SHORTER than the gap between two
    // of them — a meteor of half a second in a ten-minute pose — is drawn only if an instant happens
    // to land on it, where real film would have caught every one. The decor lights already solve
    // exactly this for a strobe by integrating the lit fraction of an interval rather than asking
    // "is it on?" (see LightRig's lightOnFractionBetween); the sky has no equivalent yet, and until
    // it does a long pose under a shower under-reports the meteors it would really hold.
    this.sceneRenderer.setExposure(instants, instant =>
      this.applySceneAt(window.fromMs + (window.ms * instant) / (instants - 1), {
        // The sky is restated only on the instants the SKY asks for, which is what makes a
        // scene-driven pose affordable at all: restating it costs about 8 ms and moving the decor
        // costs a twentieth of one, and a pose sampled 300 times for an aeroplane must not rebuild
        // 300 skies to draw a drift of four pixels.
        sky: Math.floor((instant * sky) / instants) !== Math.floor(((instant - 1) * sky) / instants),
        stepMs: window.ms / instants
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

  /** The grade of the road under the observer at `t`, in degrees, uphill positive — see RoadGrade. */
  roadGradeAt(sighting: Sighting, t: number): number {
    return sighting.observerTrack.allKeyframes.length < 2 ? 0 : RoadGrade.at(sighting, t, this.sceneRenderer.bodyGround)
  }

  /** The grade of the road at the instant on show: what the summary's Tilt adds to the pose's own. */
  get roadGradeDeg(): number {
    return this.roadGradeAt(this.ufoElement.sighting, this.ufoElement.currentTime)
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
    this.setWeather(resolveActualWeatherAt(sighting, t))
    // Pushed every tick like the pose and the weather, and for the same reason: the recording it
    // describes can be swapped or edited under this element at any moment, and an instrument left
    // over from the previous one would render the whole scene through the wrong optics (see
    // Instrument.ts). Cheap — SceneRenderer.setInstrument stores two numbers.
    this.sceneRenderer.setInstrument(sighting.instrument)
    // The towns' glow at this place, if the recording states one: the sky it brightens is restated
    // by the setAstronomy below, and the stars with it.
    this.sceneRenderer.setLightPollution(sighting.lightPollution)
    // Heard at the instant shown, not at each instant of a pose being developed.
    if (!instant) this.vehicleAudio.setVoices(this.vehicleHearing.at(sighting, t))
    if (!instant) this.pushAircraftSound(sighting, t)
    this.updateMeteorShower(sighting, t)
    this.updateLightning(sighting, t, instant !== undefined)
    this.sceneRenderer.setDecor(this.seatedDecor(this.decorWithTraffic(sighting), t))
    this.sceneRenderer.setDecorPresence(this.traffic?.set?.presence ?? SceneElement.NO_PRESENCE)
    this.sceneRenderer.setDecorSunlight(this.trafficSunlight(t))
    this.sceneRenderer.setContrails(this.traffic?.contrails ?? SceneElement.NO_CONTRAILS)
    this.sceneRenderer.setContrailSunlight(this.contrailSunlight(t))
    const pose = resolveObserverPoseAt(sighting, t)
    // Where the observer is, so a picture taken from somewhere else fades — see SceneReference.from.
    this.sceneRenderer.setReferences(sighting.references,
      pose?.lat !== undefined && pose.lng !== undefined ? { lat: pose.lat, lng: pose.lng } : undefined)
    const cloudOrigin = resolveObserverPoseAt(sighting, 0)
    const initialWeather = resolveWeatherAt(sighting, 0)
    // A record knows how much of the sky each layer covered, not where: its clouds are drifted along
    // the day by its wind (see CloudPreroll). A layer holding clouds somebody placed is left where
    // they put them, which is the same time zero as the instances' own positions.
    const cloudStart = sightingTimeToDate(sighting.event.time ?? {}, pose?.lng ?? DEFAULT_OBSERVER_POSE.lng!, sighting.event.utcOffsetHours)
    const preroll = sighting.weatherSource !== undefined && cloudStart ? cloudPrerollAt(cloudStart) : undefined
    const layerOffsets = Object.fromEntries(resolveCloudLayers(resolveWeatherAt(sighting, t)).map(layer =>
      [layer.id, cloudOffsetAt(t, sighting.weatherTrack, initialWeather, cloudOrigin, pose, layer.id,
        layer.instances?.length ? undefined : preroll)]))
    this.sceneRenderer.setCloudOffset(cloudOffsetAt(t, sighting.weatherTrack, initialWeather, cloudOrigin, pose, undefined, preroll), layerOffsets)
    // The view is raised by the grade of the road being driven (see RoadGrade): the file says where they looked in the
    // vehicle's frame, and a climb tilts that whole frame.
    this.sceneRenderer.setObserverPose(pose ? { ...pose, pitchDeg: pose.pitchDeg + this.roadGradeAt(sighting, t) } : DEFAULT_OBSERVER_POSE)
    this.sceneRenderer.setLensOptics(this.lensOpticsAt(t))
    // What that instrument could actually have RECORDED, which is a second thing entirely from how
    // it maps an angle: an Instamatic's ninetieth of a second reaches two magnitudes short of the
    // observer holding it, and the same tripod at f/2 for twenty seconds reaches three past them.
    // Pushed every tick like the rest, since the aperture is a pose field and a zoom moves under it.
    this.sceneRenderer.setInstrumentGain(
      LimitingMagnitude.gainFor(sighting.instrument, {
        fNumber: pose?.fNumber,
        fieldOfViewDeg: SightingShapes.fovOf(sighting, t),
        exposureSeconds: sighting.exposure
      }),
      // A film or a sensor — anything with a grain — records the sky; an eye sees it (see
      // ScatteredSky.setInstrument).
      sighting.instrument.detailUm !== undefined,
      Filters.byId(pose?.filter).opticalDensity
    )
    // And how the picture answers it: a film's own curve at the exposure it was given, not an
    // eye's adapting response (see RecordingMedium).
    this.sceneRenderer.setMedium(sighting.instrument.medium, sighting.exposure, pose?.fNumber ?? sighting.instrument.fNumber, sighting.iso)
    // What the observer's own legs are doing to their eye between two recorded positions — nothing
    // for a observer who stood still — the slow sway of a living body, see Stance — and a couple of
    // centimetres of rise and sway for one who walked. Rebuilt each tick rather than cached: the
    // editor moves keyframes under this element without the recording ever changing identity (see
    // Gait.of).
    this.sceneRenderer.setGait(Gait.bodyAt(sighting, t, this.ufoElement.steadyBody))
    // Keeps decor anchored to its own real-world spot rather than sliding along with a moving
    // observer — see SceneRenderer.updateDecorAnchoring's own doc comment. The reference pose is
    // always the recording's own t=0, regardless of what t is being rendered right now.
    this.sceneRenderer.updateDecorAnchoring(resolveObserverPoseAt(sighting, 0), pose, t)
    // On the same origin as the decor, so right after it.
    this.placeBodiesAt(t, instant === undefined)
    // A streetlight/vehicle's own lit state can change mid-recording (a photocell at dusk, a
    // driver's headlights) — see Decor.ts's own resolveDecorLitAt.
    this.sceneRenderer.updateDecorLitState(t, instant?.stepMs ?? 0)
    // Raw pose's own lat/lng (possibly undefined), never the astronomy fallback below — a real
    // terrain patch must only ever build from a real recorded location, never (0,0).
    //
    // And once it is built, the bodies are stood again on it. They were placed just above, on
    // whatever relief was there before this one arrived — the flat plane, or the LAST recording's
    // patch — and a paused reader gets no further tick to put them right: Valensole's machine
    // opened hanging two and a half metres over its field after Wilcox, and came down only when
    // play was pressed. The decor is re-anchored by the renderer itself at that moment (see
    // SceneRenderer.setTerrainOrigin); the bodies are this element's, so this is where it happens.
    this.sceneRenderer.setTerrainOrigin(pose?.lat, pose?.lng, () => {
      this.placeBodiesAt(this.lastTimeMs, true)
      this.sceneRenderer.render()
    })
    // What the account's own plan draws, as opposed to what a survey of today reports — see
    // StatedRoad. Cheap to call every tick: the renderer keeps the array it was last given.
    this.sceneRenderer.setStatedRoads(sighting.roads)
    this.sceneRenderer.setTraces(sighting.traces, this.traceLabels(sighting.traces))
    // Last, once the camera and the decor stand where this instant puts them: what the decor says
    // along a line of sight is read from exactly that state (see pushPhenomenaAt).
    this.pushPhenomenaAt(t)

    const lat = pose?.lat ?? DEFAULT_OBSERVER_POSE.lat!
    const lng = pose?.lng ?? DEFAULT_OBSERVER_POSE.lng!
    const startDate = sightingTimeToDate(sighting.event.time ?? {}, lng, sighting.event.utcOffsetHours)
    const observer: ObserverGeo = { lat, lng, elevationM: pose?.elevationM ?? 0 }
    // Every instant, like the decor: a satellite crosses a pixel in a fraction of a frame, and a pose
    // long enough to trail the stars trails a satellite across the whole picture.
    this.pushSatellitesAt(startDate, t, observer)
    // The re-entries the interpretation on show claims, every instant too: a piece crosses degrees
    // a second. Placed on the Earth, so seen from the observer's real place, not the scene's origin.
    // And the fireballs a camera network recorded during it, drawn the same way at their real instant.
    this.ensureFireballs(startDate)
    const burning = [...(this.interpretationShown?.reentries ?? []), ...(this.fireballs?.reentries ?? [])]
    this.sceneRenderer.setReentries(burning.length === 0 ? [] : ReentrySighting.viewsAt(burning, t, { lat, lng, heightM: observer.elevationM }))

    // Everything above moves with the instant and costs almost nothing; the sky below costs about
    // 8 ms to restate, and an instant that only carries an aeroplane a few pixels further has no
    // reason to pay for it — see updateAstronomy, which says which instants the sky itself asks for.
    if (instant && !instant.sky) return

    if (!startDate) {
      this.sceneRenderer.setAstronomy(DEFAULT_ASTRONOMY)
      return
    }

    const date = new Date(startDate.getTime() + t)
    // The sky is a function of the moment and the place, and restating it costs about 8 ms — which
    // is most of a frame, and which every editing gesture was paying: a shape dragged across the
    // canvas fires a tick per pointer move at the SAME instant, and the sky was recomputed for each.
    // Skipped when nothing it depends on has changed; a seek, a pose edit or a new catalogue still
    // restate it, and so does every instant of a long pose (each has its own date).
    //
    // And skipped while the sky has not visibly moved: it turns fifteen arcseconds a second, and a
    // frame of ordinary playback is a sixtieth of one — restating the whole star field (29 ms on a
    // deep catalogue) for a drift of a thousandth of a pixel is what held the airliner demo to
    // eight frames a second. The instant is quantised to a quarter of a pixel of drift, which at
    // 1× is seconds of the recording; a pose's own sky instants are a pixel apart by construction
    // (SkyDrift.instants) and still each get their own restatement.
    const quantumMs = Math.max(1, Math.round((0.25 * this.degreesPerPixelAt(t)) / SkyDrift.DEG_PER_SECOND * 1000))
    // A walking observer changes lat/lng every frame too. Exact coordinates defeat the time
    // cache and rebuild the sky (including shader materials) for centimetres of movement.
    // Bound each geographic angle to a tenth of a display pixel; use the actual position
    // when refreshing. Terrain, gait, clouds and decor above still update at every instant.
    const positionQuantumDeg = Math.max(1e-8, this.degreesPerPixelAt(t) * 0.1)
    const skyKey = `${Math.floor(date.getTime() / quantumMs)}|${Math.round(lat / positionQuantumDeg)}|${Math.round(lng / positionQuantumDeg)}|${Math.round(observer.elevationM)}|${this.starCatalog ? this.starCatalogDepth : 0}`
    if (skyKey === this.lastSkyKey) {
      // Restating the sky was also what drew the frame; everything above it — the pose, the decor,
      // the phenomena — still has to reach the canvas.
      this.sceneRenderer.render()
      return
    }
    this.lastSkyKey = skyKey
    const sunPosition = computeBodyPosition("Sun", date, observer)
    const moonPosition = computeBodyPosition("Moon", date, observer)
    // Worked out for every date and place, never declared: the ephemeris is only asked once the two
    // discs are within a degree of each other, which is a handful of minutes in a year.
    let eclipse: SceneAstronomy["eclipse"] = SolarEclipse.separationOf(sunPosition, moonPosition) < 1 ? SolarEclipse.viewAt(date, observer) : undefined
    if (eclipse) {
      const sunFromMoon = SolarEclipse.offsetOf(sunPosition, moonPosition, eclipse.separationDeg)
      // Near totality the edge of the Moon is not a circle: its valleys are Baily's beads. Asked for only then.
      if (eclipse.obscuration > SceneElement.LIMB_FROM_OBSCURATION) {
        const limb = this.limbFor(date, observer)
        if (limb) {
          eclipse = { ...eclipse, obscuration: 1 - LunarLimb.uncoveredFraction(limb, eclipse.sunRadiusDeg, sunFromMoon), limb }
        }
      }
      // And the horizon, which sees the eclipse from the ground round it (twenty microseconds).
      eclipse = {
        ...eclipse,
        horizonShare: SolarEclipse.horizonShare(eclipse, sunFromMoon, sunPosition.altitudeDeg, sunPosition.azimuthDeg,
          LunarDisc.distanceKm(date, observer))
      }
    }
    // What reaches the observer is what the Moon leaves of the Sun's disc (plus the corona).
    const sun = {
      ...sunPosition,
      magnitude: computeBodyMagnitude("Sun", date) - 2.5 * Math.log10(SolarEclipse.beamFraction(eclipse))
    }
    this.lastSun = { altitudeDeg: sun.altitudeDeg, azimuthDeg: sun.azimuthDeg }
    const moon = {
      ...moonPosition,
      phase: computeMoonPhase(date),
      magnitude: computeBodyMagnitude("Moon", date),
      radiusDeg: LunarDisc.apparentRadiusDeg(date, observer)
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
      // Every one whose light curve covers the instant, not the brightest: two do overlap (HR Del
      // was still up when LV Vul peaked), and unlike a comet a faint nova beside a bright one is not
      // a competing claim about what was seen, just another star.
      novae: Novae.appearancesAt(date, observer).map(({ outburst, position, magnitude }): SceneNova => ({ id: outburst.id, position, magnitude })),
      stars: this.starCatalog ? { catalog: this.starCatalog, date, observer } : undefined,
      // The same date and place again, and deliberately not folded into `stars`: the Milky Way and
      // the zodiacal light need no catalog to arrive first (see SceneAstronomy.frame).
      frame: { date, observer },
      eclipse
    })
    // The player's own map borrows a daytime photograph of this ground whatever hour the account is
    // about, so it has to be told what hour that was — see UfoElement.setSunAltitude. Told from
    // here because this is where the real Sun is already computed; the player carries no astronomy
    // of its own and must not start.
    this.ufoElement.setSunAltitude(sun.altitudeDeg)
  }

  /** Above this share of the Sun hidden, the Moon's ragged edge is worked out: under it, a limb a few seconds of arc out of round shows in nothing. */
  private static readonly LIMB_FROM_OBSCURATION = 0.98
  /** The relief of the Moon's limb (see LunarRelief), once it has come; asked for the first time an eclipse comes near totality. */
  private limbRelief?: LunarRelief
  private limbRequested = false
  /** The edge last worked out, kept for the seconds in which it does not move: 70 ms of arithmetic is not for every frame. */
  private limbCache?: { profile: LimbProfile; atMs: number; lat: number; lng: number; elevationM: number }

  private limbFor(date: Date, observer: ObserverGeo): LimbProfile | undefined {
    if (!this.limbRelief) {
      if (!this.limbRequested) {
        this.limbRequested = true
        void LunarReliefLoader.load(DEFAULT_LUNAR_RELIEF_URL).then(relief => {
          this.limbRelief = relief
          // The sky was last stated without it.
          this.lastSkyKey = ""
          if (relief && this.isConnected) this.updateAstronomy(this.lastTimeMs)
        })
      }
      return undefined
    }
    const cached = this.limbCache
    if (cached && Math.abs(date.getTime() - cached.atMs) < 5000 && cached.lat === observer.lat && cached.lng === observer.lng && cached.elevationM === observer.elevationM) {
      return cached.profile
    }
    const profile = LunarLimb.profile(date, observer, this.limbRelief)
    this.limbCache = { profile, atMs: date.getTime(), lat: observer.lat, lng: observer.lng, elevationM: observer.elevationM }
    return profile
  }

  /**
   * Stands the satellites of that instant in the scene — the ones in sunlight, above the horizon,
   * with a known brightness. Loads the element sets for the observation's start first, if that has
   * not been done for it (see ensureSatellites); until they arrive the sky simply has none.
   */
  private pushSatellitesAt(startDate: Date | undefined, t: number, observer: ObserverGeo): void {
    this.ensureSatellites(startDate)
    if (!startDate || !this.satellites) {
      this.sceneRenderer.setSatellites([])
      return
    }
    const date = new Date(startDate.getTime() + t)
    const drawn: SceneSatellite[] = []
    for (const position of this.satellites.passes.positionsAt(date, observer, -1)) {
      if (position.magnitude === undefined) continue
      drawn.push({
        norad: position.object.norad,
        name: position.object.name,
        position: { altitudeDeg: position.altitudeDeg, azimuthDeg: position.azimuthDeg },
        magnitude: position.magnitude,
        heightKm: position.heightKm
      })
    }
    this.sceneRenderer.setSatellites(drawn)
  }

  /**
   * Fetches the fireballs on record that began during this recording, once per start and span — see
   * FireballArchive. Nothing is asked for a date before the archive begins, which is nearly every
   * recording here.
   */
  private ensureFireballs(startDate: Date | undefined): void {
    const sighting = this.ufoElement.sighting
    const spanMs = Math.max((sighting.event.durationSeconds ?? 0) * 1000, this.ufoElement.seekableDuration)
    const startMs = startDate?.getTime()
    const key = startMs === undefined ? "" : `${startMs}+${spanMs}`
    if (this.fireballs?.key === key) return
    if (startMs === undefined || !FireballArchive.mayCover(startMs + spanMs)) {
      this.fireballs = { key, status: "outside", reentries: [] }
      return
    }
    const asked: NonNullable<SceneElement["fireballs"]> = { key, status: "loading", reentries: [] }
    this.fireballs = asked
    void SceneElement.fireballArchive.between(startMs, startMs + spanMs).then(records => {
      asked.status = records ? "ready" : "unavailable"
      asked.records = records ?? []
      asked.reentries = asked.records.map(record => FireballArchive.asReentry(record, startMs))
      if (this.fireballs !== asked || !this.isConnected) return
      this.dispatchEvent(new CustomEvent(FIREBALLS_CHANGE_EVENT))
      if (asked.reentries.length > 0) this.updateAstronomy(this.lastTimeMs)
    })
  }

  /**
   * The decor the recording states, with the aircraft the record of air traffic puts around its observer
   * at the hour of the recording (see TrafficDecor). The traffic is never part of the recording: it is
   * looked up, as the weather is, and not saved with it.
   */
  private decorWithTraffic(sighting: Sighting): DecorObject[] {
    const set = this.ensureTraffic(sighting)
    if (!set || set.objects.length === 0) return sighting.decor
    const memo = this.decorMemo
    if (memo && memo.base === sighting.decor && memo.traffic === set.objects) return memo.merged
    const merged = [...sighting.decor, ...set.objects]
    this.decorMemo = { base: sighting.decor, traffic: set.objects, merged }
    return merged
  }

  /**
   * The decor as it stands at t for the one thing about it that CHANGES the object: who is inside.
   * An object whose seat is keyframed (see DecorObject.observerKeyframes) is handed on with the seat
   * the observer is in at t, which is what lets the renderer build the cabin around them while they
   * drive and take it away when they step out.
   *
   * The array is kept as long as nobody changes seat, because the renderer rebuilds every object when
   * it is given a different one: a car driven for seventy seconds is one array, and the rebuild
   * happens twice, when its driver gets in and when they get out.
   */
  private seatedDecor(decor: DecorObject[], t: number): DecorObject[] {
    if (!decor.some(object => object.observerKeyframes?.length)) return decor
    const seats = decor.map(object => {
      if (!object.observerKeyframes?.length) return ""
      const seat = resolveDecorSeatAt(object, t)
      return `${seat.side ?? "-"}/${seat.facing ?? "-"}`
    }).join("|")
    const memo = this.seatedMemo
    if (memo && memo.base === decor && memo.seats === seats) return memo.seated
    const seated = decor.map(object => {
      if (!object.observerKeyframes?.length) return object
      const seat = resolveDecorSeatAt(object, t)
      return { ...object, observerSide: seat.side, observerFacing: seat.facing }
    })
    this.seatedMemo = { base: decor, seats, seated }
    return seated
  }

  /**
   * Asks the air traffic source for the aircraft around the observer during this recording, once per
   * source, window and place. Nothing is asked without a date and a recorded place, nor for dates the
   * source cannot hold (nearly every recording here is older than any record of air traffic).
   */
  private ensureTraffic(sighting: Sighting): TrafficDecorSet | undefined {
    const pose = resolveObserverPoseAt(sighting, 0)
    const startDate = pose?.lng === undefined ? undefined : sightingTimeToDate(sighting.event.time ?? {}, pose.lng, sighting.event.utcOffsetHours)
    const spanMs = Math.max((sighting.event.durationSeconds ?? 0) * 1000, this.ufoElement.seekableDuration)
    const startMs = startDate?.getTime()
    const key = startMs === undefined || pose?.lat === undefined || pose.lng === undefined ? ""
      : `${this.aircraftSource.id}|${startMs}+${spanMs}|${pose.lat.toFixed(3)},${pose.lng.toFixed(3)}|${Math.round(pose.elevationM ?? 0)}`
    if (this.traffic?.key === key) return this.traffic.set
    if (key === "" || startMs === undefined || pose?.lat === undefined || pose.lng === undefined) {
      this.traffic = { key, status: "outside" }
      return undefined
    }
    let provider = SceneElement.aircraftProviders.get(this.aircraftSource.id)
    if (!provider) SceneElement.aircraftProviders.set(this.aircraftSource.id, provider = this.aircraftSource.create())
    if (provider.mayCover && !provider.mayCover(startMs + spanMs)) {
      this.traffic = { key, status: "outside" }
      return undefined
    }
    const asked: NonNullable<SceneElement["traffic"]> = { key, status: "loading", startMs, observer: { lat: pose.lat, lng: pose.lng } }
    this.traffic = asked
    const observer = { lat: pose.lat, lng: pose.lng, heightM: pose.elevationM ?? 0 }
    // A minute after the recording, and five before. An aircraft heard only a few seconds after it begins was there before,
    // and the still image of a paused scene at its first instant would otherwise be an empty sky: a minute is the longest gap
    // across which a track is still one flight. And the sound of an aircraft is the sound that left it long before: one forty
    // kilometres off is heard as it was two minutes ago, and one a hundred off five (see AircraftHearing), so what it was doing
    // then has to be in the record asked for.
    const after = AircraftSighting.MAX_GAP_S * 1000
    const before = SceneElement.SOUND_LOOKBACK_MS
    const geo = { lat: pose.lat, lng: pose.lng, elevationM: pose.elevationM ?? 0 }
    const build = (runtime: TrafficRuntime, models?: Map<string, AircraftModel>) =>
      runtime.TrafficDecor.from(asked.tracks ?? [], observer, startMs, runtime.TrafficDecor.MAX_OBJECTS, { models, sunElevationAt: point => this.sunElevationAt(point, geo) })
    void provider.between(observer, startMs - before, startMs + spanMs + after).then(async answer => {
      if (this.traffic !== asked) return
      if (answer.status !== "found") {
        asked.status = answer.status === "outside" ? "outside" : "unavailable"
        this.announceTraffic()
        return
      }
      // The code that draws them is only fetched now that there are aircraft to draw.
      let runtime: TrafficRuntime
      try {
        runtime = await SceneElement.loadTrafficRuntime()
      } catch {
        if (this.traffic === asked) {
          asked.status = "unavailable"
          this.announceTraffic()
        }
        return
      }
      if (this.traffic !== asked) return
      asked.status = "ready"
      asked.tracks = answer.tracks
      asked.set = build(runtime)
      this.startAircraftSound(asked, runtime)
      this.announceTraffic()
      void this.describeTraffic(provider, asked, runtime, build)
      // Only for a sky that has aircraft: with none there is no trail to work out, and the air is not asked for.
      if (asked.set.shown > 0) void this.readUpperAir(asked, runtime, startMs - before, startMs + spanMs + after)
    })
    return undefined
  }

  /**
   * Where the Sun stands for each aircraft in the sky at `t`: its height, and the Sun's elevation over the horizon of the
   * place it really is at — which is not the observer's (see AircraftLighting). Empty until the sky has been stated once.
   */
  private trafficSunlight(t: number): Map<string, DecorSunlight> {
    const sunlight = new Map<string, DecorSunlight>()
    const traffic = this.traffic
    const set = traffic?.set
    const sun = this.lastSun
    if (!set || !sun || traffic.startMs === undefined || !traffic.observer) return sunlight
    for (const [id, presence] of set.presence) {
      if (t < presence.fromMs || t > presence.untilMs) continue
      const flight = set.flights.get(id)
      const at = flight ? AircraftSighting.positionAt(flight, traffic.startMs + t) : undefined
      if (at) sunlight.set(id, { heightM: at.geo.heightM, sunElevationDeg: AircraftLighting.sunElevationDeg(sun, traffic.observer, at.geo) })
    }
    return sunlight
  }

  /** What is said of the aircraft under that point of the screen, if there is one. */
  private trafficTooltipAt(ndcX: number, ndcY: number): string | undefined {
    const id = this.sceneRenderer.pickTrafficAt(ndcX, ndcY)
    const info = id ? this.trafficInfoAt(id) : undefined
    if (!info) return undefined
    const naming = this.naming
    const runtime = SceneElement.trafficRuntime
    return runtime?.TrafficTooltip.text(info, naming.names?.trafficTooltip ?? runtime.TrafficTooltip.ENGLISH, azimuth => naming.towards(azimuth))
  }

  /**
   * What is known of one aircraft drawn from the record of air traffic, as the observer has it at the instant shown: who it is
   * as far as the record says, how it flies, where it is in their sky, and how it sounds. Undefined for an id that is not an
   * aircraft of the record, or one that is not in the sky then.
   */
  trafficInfoAt(id: string): TrafficInfo | undefined {
    const traffic = this.traffic
    const flight = traffic?.set?.flights.get(id)
    if (!traffic || !flight || traffic.startMs === undefined || !traffic.observer) return undefined
    const runtime = SceneElement.trafficRuntime
    if (!runtime) return undefined
    const description = traffic.descriptions?.get(TrafficIds.keyOf(flight))
    const pose = resolveObserverPoseAt(this.ufoElement.sighting, this.lastTimeMs)
    const here = { lat: traffic.observer.lat, lng: traffic.observer.lng, heightM: pose?.elevationM ?? 0 }
    // Against the same ambient noise as what is played, so that the label and the sound say the same.
    const ambientDbA = runtime.AmbientNoise.dbA(resolveActualWeatherAt(this.ufoElement.sighting, this.lastTimeMs))
    const info = runtime.TrafficInfos.at(flight, description, here, traffic.startMs + this.lastTimeMs, { ambientDbA })
    const contrail = info && this.contrailAt(id, this.lastTimeMs)
    return info && contrail ? { ...info, contrail } : info
  }

  /** What the air makes of the exhaust of that aircraft at `t` (ms from the start), when it leaves a trail there: the last position of the flight at which it formed one. */
  private contrailAt(id: string, t: number): TrafficInfo["contrail"] {
    const trail = this.traffic?.contrails?.find(candidate => candidate.id === id)
    if (!trail) return undefined
    let here: (typeof trail.points)[number] | undefined
    for (const point of trail.points) {
      if (point.tMs > t) break
      here = point
    }
    return here?.forms ? { persistent: here.persistent, iceRelativeHumidity: here.iceRelativeHumidity } : undefined
  }

  /**
   * Starts the sound of the aircraft of a record: the player is made, and unlocked and set to the clock exactly as it would have been had it been
   * there from the start; and which aircraft could be heard at all is sorted out, once.
   */
  private startAircraftSound(asked: NonNullable<SceneElement["traffic"]>, runtime: TrafficRuntime): void {
    if (!this.aircraftAudio) {
      this.aircraftAudio = new runtime.AircraftAudio()
      this.aircraftAudio.setLevel(this.ufoElement.level)
      if (this.interacted) this.aircraftAudio.resume()
      this.aircraftAudio.setPaused(this.ufoElement.playbackState !== "playing")
    }
    this.sortOutAudible(asked, runtime)
  }

  /** Which of the aircraft could be heard at all, from the nearest each comes — the only ones worked out at every instant. */
  private sortOutAudible(asked: NonNullable<SceneElement["traffic"]>, runtime: TrafficRuntime): void {
    if (!asked.set || !asked.observer) return
    // Against the quietest the place could be: the weather only ever adds to it, so what cannot be heard there cannot be heard at all.
    asked.audible = runtime.TrafficSound.candidates(asked.set.flights, asked.descriptions ?? new Map(), TrafficIds.keyOf, { ...asked.observer, heightM: 0 }, { ambientDbA: runtime.AmbientNoise.BASE_DB_A })
  }

  /**
   * Plays the aircraft that are heard at `t`, if there are any to be: the loudest few of those that could be heard, each as it sounded when its
   * sound left it. Nothing is worked out for a scene with no aircraft, and a scene that had some and has none now is silenced.
   */
  private pushAircraftSound(sighting: Sighting, t: number): void {
    const audio = this.aircraftAudio
    if (!audio) return
    const runtime = SceneElement.trafficRuntime
    const traffic = this.traffic
    const set = traffic?.set
    if (!runtime || !traffic || !set || !traffic.audible || traffic.startMs === undefined || !traffic.observer) {
      audio.setVoices([])
      return
    }
    const pose = resolveObserverPoseAt(sighting, t)
    const observer = { lat: traffic.observer.lat, lng: traffic.observer.lng, heightM: pose?.elevationM ?? 0 }
    // Heard against the weather the scene plays, and in proportion to it: an aircraft at the level of the wind is played as loud as the wind bed is.
    // Not only the aircraft that are in the record now: the sound of one that has left it is still arriving.
    const weather = resolveActualWeatherAt(sighting, t)
    const voices = runtime.TrafficSound.voices(traffic.audible, set.flights, traffic.descriptions ?? new Map(), TrafficIds.keyOf, observer, traffic.startMs + t,
      { ambientDbA: runtime.AmbientNoise.dbA(weather), referenceAmplitude: runtime.AmbientNoise.referenceAmplitude(weather) })
    audio.setVoices(voices, pose?.headingDeg ?? 0)
  }

  /** Tells whoever listens that the traffic changed, and draws it. */
  private announceTraffic(): void {
    if (!this.isConnected) return
    this.dispatchEvent(new CustomEvent(AIRCRAFT_CHANGE_EVENT))
    this.updateAstronomy(this.lastTimeMs)
  }

  /**
   * Asks the record what the aircraft it drew are — their type and category — and draws them again as what they are: the
   * size of a real A320, the rotor and lamps of a helicopter, the lamps a light aircraft carries only from dusk. They are
   * drawn at once as a generic airliner and refined when the answer comes, which leaves their ids and their presence as
   * they were.
   */
  private async describeTraffic(provider: AircraftProvider, asked: NonNullable<SceneElement["traffic"]>, runtime: TrafficRuntime, build: (runtime: TrafficRuntime, models?: Map<string, AircraftModel>) => TrafficDecorSet): Promise<void> {
    if (!provider.describe || !asked.set || !asked.tracks) return
    const shown = new Set([...asked.set.flights.values()].map(flight => TrafficIds.keyOf(flight)))
    const wanted = asked.tracks.filter(track => shown.has(TrafficIds.keyOf(track)) && track.points.length > 0)
    const models = new Map<string, AircraftModel>()
    const descriptions = new Map<string, AircraftDescription>()
    await Promise.all(wanted.map(async track => {
      const day = new Date(track.points[0].t).toISOString().slice(0, 10)
      const description = await provider.describe!(track, day).catch(() => undefined)
      if (!description) return
      descriptions.set(TrafficIds.keyOf(track), description)
      models.set(TrafficIds.keyOf(track), runtime.AircraftModels.of(description))
    }))
    if (this.traffic !== asked || models.size === 0) return
    asked.descriptions = descriptions
    asked.models = models
    asked.set = build(runtime, models)
    this.planContrails(asked, runtime)
    this.sortOutAudible(asked, runtime)
    this.announceTraffic()
  }

  /**
   * Asks the record of the air aloft for the temperature, humidity and wind at the levels the aircraft fly at, and, once it has come, works out
   * which of them leave a trail and where it goes (see AircraftContrails). Nothing is drawn of a trail the record cannot state.
   */
  private async readUpperAir(asked: NonNullable<SceneElement["traffic"]>, runtime: TrafficRuntime, fromMs: number, untilMs: number): Promise<void> {
    if (!asked.observer) return
    const source = this.upperAirSource ?? runtime.UPPER_AIR_SOURCES[0]
    let provider = SceneElement.upperAirProviders.get(source.id)
    if (!provider) SceneElement.upperAirProviders.set(source.id, provider = source.create())
    const answer = await provider.between(asked.observer, fromMs, untilMs)
    if (this.traffic !== asked || answer.status !== "found") return
    asked.air = answer.samples
    asked.airSource = answer.source
    this.planContrails(asked, runtime)
    this.announceTraffic()
  }

  private planContrails(asked: NonNullable<SceneElement["traffic"]>, runtime: TrafficRuntime): void {
    if (!asked.set || !asked.air || asked.startMs === undefined) return
    asked.contrails = runtime.AircraftContrails.plan(asked.set, asked.models, asked.air, asked.startMs)
  }

  /**
   * Where the Sun stands for each aircraft that leaves a trail, at the place it was at `t`, or at the end of its flight in the record once it
   * has left it: the trail stays lit, as the Sun at that height lights it (see SceneRenderer.setContrailSunlight).
   */
  private contrailSunlight(t: number): Map<string, DecorSunlight> {
    const sunlight = new Map<string, DecorSunlight>()
    const traffic = this.traffic
    const set = traffic?.set
    const sun = this.lastSun
    if (!set || !sun || !traffic.contrails?.length || traffic.startMs === undefined || !traffic.observer) return sunlight
    for (const trail of traffic.contrails) {
      const presence = set.presence.get(trail.id)
      const flight = set.flights.get(trail.id)
      if (!presence || !flight) continue
      const at = AircraftSighting.positionAt(flight, traffic.startMs + Math.min(presence.untilMs, Math.max(presence.fromMs, t)))
      if (at) sunlight.set(trail.id, { heightM: at.geo.heightM, sunElevationDeg: AircraftLighting.sunElevationDeg(sun, traffic.observer, at.geo) })
    }
    return sunlight
  }

  /** The Sun's elevation over the horizon at the place of an aircraft, at the instant of one of its positions. */
  private sunElevationAt(point: AircraftPoint, observer: ObserverGeo): number {
    const sun = computeBodyPosition("Sun", new Date(point.t), observer)
    return AircraftLighting.sunElevationDeg(sun, observer, point)
  }

  /** Where the air aloft the trails are worked out from is read: the first of the registry's unless it is pointed elsewhere (see UpperAirProvider). */
  private upperAirSource?: DataSource<UpperAirProvider>

  /** Points the scene at another record of the air aloft, and works the trails out again. */
  setUpperAirSource(source: DataSource<UpperAirProvider>): void {
    if (source.id === this.upperAirSource?.id) return
    this.upperAirSource = source
    this.traffic = undefined
    this.decorMemo = undefined
    this.updateAstronomy(this.lastTimeMs)
  }

  /** Points the scene at another source of air traffic and asks it again — see AircraftProvider. */
  setAircraftSource(source: DataSource<AircraftProvider>): void {
    if (source.id === this.aircraftSource.id) return
    this.aircraftSource = source
    this.traffic = undefined
    this.decorMemo = undefined
    this.updateAstronomy(this.lastTimeMs)
  }

  /**
   * What is known of the air traffic around the observer during this recording, for a readout and the
   * credits: `outside` what the source holds, still `loading`, `unavailable`, or `ready` — with how many
   * aircraft the record gave and how many are drawn (a record of an hour near a big airport holds
   * more than is worth drawing).
   */
  get aircraftState(): { status: "none" | "loading" | "ready" | "outside" | "unavailable"; total: number; shown: number; credit: string; creditUrl: string; trailCredit?: { credit: string; creditUrl: string } } {
    // Where the air the trails were worked out from comes from, once there are trails.
    const trailSource = this.traffic?.contrails?.length ? this.upperAirSource ?? SceneElement.trafficRuntime?.UPPER_AIR_SOURCES[0] : undefined
    return {
      trailCredit: trailSource && { credit: trailSource.credit, creditUrl: trailSource.creditUrl },
      status: this.traffic?.status ?? "none",
      total: this.traffic?.set?.total ?? 0,
      shown: this.traffic?.set?.shown ?? 0,
      credit: this.aircraftSource.credit,
      creditUrl: this.aircraftSource.creditUrl
    }
  }

  /**
   * What is known of the fireballs recorded during this recording, for a readout: `outside` the
   * archive's dates, still `loading`, `unavailable`, or `ready` with the records (possibly none).
   */
  get fireballState(): { status: "none" | "loading" | "ready" | "outside" | "unavailable"; records: readonly FireballRecord[] } {
    return { status: this.fireballs?.status ?? "none", records: this.fireballs?.records ?? [] }
  }

  /**
   * Fetches the element sets nearest the observation's start, once per start.
   *
   * The elements are those of the START for the whole recording: a set is good for days either side
   * of its epoch, and no recording here lasts more than hours. Not keyed on the place, which the
   * elements do not depend on; the passes computed from them are (see satellitePassesDuring).
   */
  private ensureSatellites(startDate: Date | undefined): void {
    const key = startDate ? String(startDate.getTime()) : ""
    if (key === this.satellitesFor) return
    this.satellitesFor = key
    this.satellites = undefined
    this.satellitePassesMemo = undefined
    const request = ++this.satelliteRequest
    if (!startDate) {
      this.satelliteStatus = "none"
      return
    }
    this.satelliteStatus = "loading"
    // The answer is kept whatever happens, but announced only to an element still in a document:
    // one removed while the archive was in flight has nobody listening, and a test environment torn
    // down in the meantime has no events left to construct (CI caught exactly that).
    const settle = (status: SatelliteStatus) => {
      if (request !== this.satelliteRequest) return
      this.satelliteStatus = status
      if (this.isConnected) this.dispatchEvent(new CustomEvent(SATELLITES_CHANGE_EVENT))
    }
    const archive = SceneElement.tleArchive
    void (async () => {
      if (!(await archive.covers(startDate))) return settle("outside")
      // The propagator is loaded only now, for a date the archive holds: every recording before 2021,
      // which is nearly all of them, never downloads it.
      const [snapshot, module] = await Promise.all([archive.at(startDate), import("../engine/astronomy/SatellitePasses.js")])
      if (request !== this.satelliteRequest) return
      if (!snapshot) return settle("unavailable")
      this.satellites = { snapshot, passes: new module.SatellitePasses(snapshot.objects) }
      settle("ready")
      if (this.isConnected) this.updateAstronomy(this.lastTimeMs)
    })().catch(() => settle("unavailable"))
  }

  /**
   * What is known of the satellites of this recording, for a readout.
   *
   * `outside` means the archive holds no element sets for that date at all (it starts in February
   * 2021); `unavailable` that it could not be reached. Both are different answers from `ready` with
   * no pass, which says the sets were there and nothing lit crossed this sky.
   */
  get satelliteState(): { status: SatelliteStatus; coverage?: TleCoverage[]; credit?: string; creditUrl?: string } {
    const snapshot = this.satellites?.snapshot
    return { status: this.satelliteStatus, coverage: snapshot?.coverage, credit: snapshot?.credit, creditUrl: snapshot?.creditUrl }
  }

  /**
   * Every pass — above the horizon and in sunlight — during the observation, from its start over
   * `durationMs`, for the place the observer stood at its start. Brightness is stated, visibility is
   * not: that is the reader's comparison against the sky's own limit.
   *
   * Scanned every ten seconds, or coarser beyond a hundred minutes so a long night stays under a
   * second of work; capped at four hours, past which "during the observation" stops meaning a moment.
   */
  satellitePassesDuring(durationMs: number): SatellitePass[] {
    const satellites = this.satellites
    const sighting = this.ufoElement.sighting
    const pose = resolveObserverPoseAt(sighting, 0)
    const place = sighting.event.place?.[0]
    const lat = pose?.lat ?? place?.lat
    const lng = pose?.lng ?? place?.lng
    if (!satellites || lat === undefined || lng === undefined) return []
    const startDate = sightingTimeToDate(sighting.event.time ?? {}, lng, sighting.event.utcOffsetHours)
    if (!startDate) return []
    const spanMs = Math.min(Math.max(durationMs, 0), 4 * 3_600_000)
    const observer = { lat, lng, elevationM: pose?.elevationM ?? 0 }
    const key = JSON.stringify([this.satellitesFor, startDate.getTime(), lat, lng, observer.elevationM, spanMs])
    if (this.satellitePassesMemo?.key === key) return this.satellitePassesMemo.passes
    const stepS = Math.max(10, Math.ceil(spanMs / 1000 / 600))
    const passes = satellites.passes.passesDuring(startDate, new Date(startDate.getTime() + spanMs), observer, stepS)
    this.satellitePassesMemo = { key, passes }
    return passes
  }

  /**
   * The brightest comet standing in that sky, if any was — in the form the renderer wants it.
   *
   * The brightest rather than a list: two apparitions overlap only in the odd year (1957, 1970),
   * and a scene showing both would be stating that a observer could have confused either, which is a
   * conclusion rather than a fact. The one that was actually conspicuous is the one to draw.
   *
   * Nothing is filtered on here — not the horizon, not the twilight. Whether the comet was
   * observable is the renderer's own visibility rule, applied to every body in this sky alike, and
   * the readout in the editor says so in words.
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

  /**
   * Stands every phenomenon in the scene at this instant — see PhenomenonSystem for what a plane
   * there asserts and does not, and PhenomenonDepth for where its distance comes from.
   *
   * This is also where the recording's crossings are read (see SizeEstimate): the camera, the
   * observer's own position and the decor are posed for exactly this instant, which is the only
   * state in which "what stood along that line of sight" means anything — so it runs from
   * applySceneAt, after everything else has been posed, and once per instant of a long pose.
   *
   * The shapes go in as the overlay would have painted them — canvas pixels, the reader's own turn
   * of the view and the observer's gait already applied — so the scene puts each one where the
   * picture had it, and the decor's own depth then hides whatever part of it a car or a shack
   * stood in front of. That is the whole of what changed hands: the picture is the same, and who
   * decides what hides it is not.
   */
  private pushPhenomenaAt(t: number): void {
    const sighting = this.ufoElement.sighting
    if (sighting !== this.sizeEstimatesFor) {
      this.sizeEstimates.clear()
      this.distanceHypotheses.clear()
      this.sizeEstimatesFor = sighting
    }
    const timeline = sighting.timeline
    const canvas = this.ufoElement.canvasElement
    const shift = this.ufoElement.frameShiftPx
    const projection = this.projectionAt(t)
    const shapes = new Map<string, Shape>()
    const depths = new Map<string, ResolvedDepth>()
    /** Shapes with no stated direction whose pixel is outside the picture: they were not painted
     * before and must not be stood anywhere now. */
    const offScreen = new Set<string>()
    for (const sourceId of timeline.sourceIds) {
      const shape = timeline.getInterpolatedShapeAt(t, sourceId)
      if (!shape) continue
      const shifted: Shape = { ...shape, bounds: { ...shape.bounds, x: shape.bounds.x + shift.x, y: shape.bounds.y + shift.y } }
      shapes.set(sourceId, shifted)
      // Where on the picture the shape is: from its own stated direction when it has one, which
      // holds behind the observer's back, where the pixel the overlay kept for it is clamped a
      // hundred thousand wide off the canvas (see SightingShapes.toPosition) and means nothing.
      const point = shape.aim
        ? this.sceneRenderer.screenPointOf(PhenomenonSystem.directionOf(shape.aim, this.directionScratch))
        : {
            ndcX: ((shifted.bounds.x + shifted.bounds.width / 2) / canvas.width) * 2 - 1,
            ndcY: -(((shifted.bounds.y + shifted.bounds.height / 2) / canvas.height) * 2 - 1)
          }
      const onScreen = point !== undefined && Math.abs(point.ndcX) <= 1 && Math.abs(point.ndcY) <= 1
      // The same ray, asked the only question a account can answer about distance: not "how far"
      // but "behind what, and in front of what". Accumulated across every instant the playhead
      // visits — see SizeEstimate, and sizeRangeOf's own comment on why that accumulation is the
      // honest shape for this. Only for a shape that is IN the picture: a thing behind the observer
      // crosses nothing they can see, and a ray cast for it would hit whatever stood nearest.
      const crossing = onScreen ? this.sceneRenderer.decorDistancesAt(point.ndcX, point.ndcY, sourceId) : {}
      offScreen.add(sourceId)
      if (onScreen || shape.aim) offScreen.delete(sourceId)
      const widthDeg = shape.angular?.widthDeg ?? projection.pxToDeg(shape.bounds.width)
      const estimate = this.sizeEstimateOf(sourceId)
      estimate.add(widthDeg, crossing)
      // What the observer's own walk establishes, read at this instant's apparent width — see
      // ShapeDistance, which says what it assumes.
      const approach = ShapeDistance.of(sighting, sourceId)
      depths.set(
        sourceId,
        PhenomenonDepth.resolve({
          hypothesisM: this.distanceHypotheses.get(sourceId),
          derivedM: approach && widthDeg > 0 ? ApparentSize.distanceMAt(approach.widthM, widthDeg) : undefined,
          range: estimate.distanceRangeAt(widthDeg),
          crossing
        })
      )
    }
    // A phenomenon drawn in several parts is one thing: Socorro's red insignia is painted ON its
    // craft, and standing the craft at five hundred metres while the insignia stayed five metres
    // out would float it in front of the bodywork. Anything drawn wholly inside another shape
    // stands where that shape stands — a hair nearer, so that it is drawn on it and not in it.
    for (const [sourceId, shape] of shapes) {
      for (const [carrierId, carrier] of shapes) {
        if (carrierId === sourceId) continue
        // A carrier is something SEEN, and bigger: an invisible shape drawn to the same box (Socorro's
        // flame is kept at the craft's own box while it is not burning) is not something the craft
        // is painted on, and two equal boxes would otherwise each stand where the other stands.
        if (carrier.transparency >= 1) continue
        if (carrier.bounds.width * carrier.bounds.height <= shape.bounds.width * shape.bounds.height) continue
        const inside =
          shape.bounds.x >= carrier.bounds.x &&
          shape.bounds.y >= carrier.bounds.y &&
          shape.bounds.x + shape.bounds.width <= carrier.bounds.x + carrier.bounds.width &&
          shape.bounds.y + shape.bounds.height <= carrier.bounds.y + carrier.bounds.height
        if (!inside) continue
        const depth = depths.get(carrierId)
        if (depth) depths.set(sourceId, { distanceM: depth.distanceM * 0.999, basis: depth.basis })
        break
      }
    }
    this.depths = depths
    const order = timeline.sourceIds
    const placed: PlacedPhenomenon[] = []
    for (const [sourceId, shape] of shapes) {
      placed.push({
        sourceId,
        shape,
        distanceM: depths.get(sourceId)!.distanceM,
        renderOrder: order.indexOf(sourceId),
        aim: shape.aim,
        // With an interpretation on show, the account is not what is drawn: it is either absent,
        // or beside it as outlines to compare with — and then all of it, what no body claims to be
        // included (an insignia, a flame), since that too is what the interpretation must answer.
        // But only what was SEEN at this instant: a shape the account makes invisible (Silly-le-Long's
        // rear rectangles, not seen before the bridge) has no outline to answer, and drew one where
        // nothing was.
        hidden: offScreen.has(sourceId) || (this.interpretationShown !== undefined && (!this.comparing || shape.transparency >= 1)),
        ghost: this.interpretationShown !== undefined && this.comparing
      })
    }
    // The instrument's own aperture and roll, which the painter needs for a dazzling light's spikes
    // — the same numbers the overlay used, so a starburst turns with the camera here as it did
    // there (see CanvasRenderer.setRoll).
    const pose = resolveObserverPoseAt(sighting, t)
    const rollDeg = (pose?.rollDeg ?? 0) + Gait.bodyAt(sighting, t, this.ufoElement.steadyBody).rollDeg
    this.sceneRenderer.setPhenomena(placed, {
      projection,
      canvasWidthPx: canvas.width,
      canvasHeightPx: canvas.height,
      // Painted at the picture's own resolution, so a shape is as sharp in the scene as the overlay
      // drew it — and no sharper, since the picture is what the reader is looking at.
      scale: Math.max(1, this.sceneCanvas.height / Math.max(1, canvas.height)),
      starPoints: Instruments.starPointsOf(sighting.instrument),
      rollRad: (rollDeg * Math.PI) / 180
    })
  }

  /**
   * Draws `sourceId` at this distance until told otherwise — a reader's hypothesis, never the
   * recording's (see PhenomenonDepth). A hypothesis outranks what the data establishes on purpose:
   * it is tested by watching it fail, a craft set at five hundred metres going behind the patrol
   * car it was drawn in front of. `undefined` withdraws it.
   */
  /**
   * The interpretation to replay the account with — its bodies standing in the scene in place of
   * the account's phenomena, which come back as outlines only when compared with (see
   * `compareAccount`) — or undefined for the raw account. See InterpretationJson. Never part of the recording this element shows: the player
   * chooses it, from the recording's own or from the case's.
   */
  get interpretation(): InterpretationJson | undefined {
    return this.interpretationShown
  }

  set interpretation(interpretation: InterpretationJson | undefined) {
    this.interpretationShown = interpretation
    this.syncAccountHidden()
    this.updateAstronomy(this.lastTimeMs)
  }

  /**
   * Whether the account stands beside the interpretation on show, as the outlines of what the
   * observer saw, and is measured against it (see `confrontation`). Off, the interpretation is shown
   * alone, as the world it claims — which is how it has to be looked at before it can be judged.
   * Meaningless for the raw account, which is always what is drawn then.
   */
  /**
   * Whether a recording whose observer said what it was (its own `interpretation`) is drawn that way,
   * in the round, rather than as the angles they saw — true unless a composing element says
   * otherwise. The editor does: what it edits is the angles, and drawing bodies over them would hide
   * the very thing being drawn. Read when a recording is set.
   */
  /** The account's shapes are not drawn when an interpretation stands alone, and they then name nothing under the pointer either. */
  private syncAccountHidden(): void {
    this.ufoElement.accountHidden = this.interpretationShown !== undefined && !this.comparing
  }

  get accountInTheRound(): boolean {
    return this.inTheRound
  }

  set accountInTheRound(inTheRound: boolean) {
    this.inTheRound = inTheRound
  }

  get compareAccount(): boolean {
    return this.comparing
  }

  set compareAccount(comparing: boolean) {
    this.comparing = comparing
    this.syncAccountHidden()
    this.updateAstronomy(this.lastTimeMs)
  }

  /** What the bodies of the interpretation on show look like from the observer's eye, against what
   * the observer said, at the instant on show — see BodyConfrontation. Empty for the raw account,
   * and while the account is not being compared with. */
  get confrontation(): ConfrontationReading[] {
    return this.confrontationReadings
  }

  /**
   * How far along a line of sight from the observer's eye at `t` the ground is, on the relief the
   * scene holds — undefined when the line clears it. What stands a body on the ground rather than
   * under it (see SightingEditorElement.newBodyStart).
   */
  groundAlong(azimuthDeg: number, altitudeDeg: number, t: number): number | undefined {
    const ground = this.sceneRenderer.bodyGround
    const eye = BodyPlacement.eyeOf(this.ufoElement.sighting, t, ground)
    return eye ? BodyPlacement.lineOfSightMeetsGround(eye, azimuthDeg, altitudeDeg, ground) : undefined
  }

  /**
   * A body as it stands at `t`, in both of the forms a keyframe can state it (see BodyKeyframe):
   * from the observer's eye (direction and distance to its middle) and in the world (east and north
   * of where the observer started, and how high its base is over the ground there) — with its size
   * and attitude. What the editor's fields show at the playhead. Undefined when it is not placed.
   */
  bodyReading(body: BodyJson, t: number): BodyReading | undefined {
    const ground = this.sceneRenderer.bodyGround
    const sighting = this.ufoElement.sighting
    const eyeAt = (at: number) => BodyPlacement.eyeOf(sighting, at, ground)
    const state = new BodyPlacement(body, ground, eyeAt).at(t)
    const eye = eyeAt(t)
    if (!state || !eye) return undefined
    const eastM = state.eastM - eye.eastM, northM = state.northM - eye.northM, upM = state.upM - eye.upM
    const horizontalM = Math.hypot(eastM, northM)
    return {
      azimuthDeg: ((Math.atan2(eastM, northM) * 180) / Math.PI + 360) % 360,
      altitudeDeg: (Math.atan2(upM, horizontalM) * 180) / Math.PI,
      distanceM: Math.hypot(horizontalM, upM),
      eastM: state.eastM,
      northM: state.northM,
      aboveGroundM: state.upM - state.sizeM.heightM / 2 - ground.heightAt(state.eastM, state.northM),
      sizeM: state.sizeM,
      attitude: state.attitude,
      appearance: state.appearance
    }
  }

  /**
   * The direction from the observer's eye to the middle of a body at `t`, or at its first keyframe
   * when it is not there at `t` — where to turn to look at it. Undefined for a body with no
   * keyframe, or one the eye stands inside.
   */
  directionToBody(body: BodyJson, t: number): { azimuthDeg: number, altitudeDeg: number } | undefined {
    const ground = this.sceneRenderer.bodyGround
    const sighting = this.ufoElement.sighting
    const eyeAt = (at: number) => BodyPlacement.eyeOf(sighting, at, ground)
    const placement = new BodyPlacement(body, ground, eyeAt)
    const at = placement.at(t) ? t : body.track[0]?.t
    const state = at === undefined ? undefined : placement.at(at)
    const eye = at === undefined ? undefined : eyeAt(at)
    if (!state || !eye) return undefined
    const eastM = state.eastM - eye.eastM, northM = state.northM - eye.northM, upM = state.upM - eye.upM
    const horizontalM = Math.hypot(eastM, northM)
    if (horizontalM === 0 && upM === 0) return undefined
    return {
      azimuthDeg: ((Math.atan2(eastM, northM) * 180) / Math.PI + 360) % 360,
      altitudeDeg: (Math.atan2(upM, horizontalM) * 180) / Math.PI
    }
  }

  /**
   * Stands the interpretation's bodies where it puts them at `t`, on the relief the renderer holds,
   * and reads them against the account. Placed afresh every instant rather than once: the relief
   * arrives after the recording does, and a body on the ground must stand on the ground that is
   * there now, not the flat plane that was there before.
   */
  private placeBodiesAt(t: number, announce: boolean): void {
    const interpretation = this.interpretationShown
    const sighting = this.ufoElement.sighting
    let states: BodyState[] = []
    let readings: ConfrontationReading[] = []
    const ground = this.sceneRenderer.bodyGround
    const eyeAt = (at: number) => BodyPlacement.eyeOf(sighting, at, ground)
    if (interpretation) {
      states = interpretation.bodies
        .map(body => new BodyPlacement(body, ground, eyeAt).at(t))
        .filter((state): state is BodyState => state !== undefined)
    }
    // Stood first, so that the outline read below is the one of this instant.
    // What carries dust and smoke: the recording's wind at this instant, which blows TOWARDS its
    // direction (see Weather.windDirectionDeg), in the scene's axes (x east, z south).
    const weather = resolveWeatherAt(sighting, t)
    const towards = (weather.windDirectionDeg * Math.PI) / 180
    const wind = { x: weather.windSpeed * Math.sin(towards), z: -weather.windSpeed * Math.cos(towards) }
    this.sceneRenderer.setBodies(states, t / 1000, interpretation?.bodies.map(body => body.id) ?? [], interpretation?.smoke ?? [], wind)
    const eye = interpretation && this.comparing ? eyeAt(t) : undefined
    if (eye) {
      readings = new BodyConfrontation(sighting.timeline).at(t, states, eye,
        state => state.outlineNode ? this.sceneRenderer.bodyOutline?.(state.id, state.outlineNode) : undefined)
    }
    this.confrontationReadings = readings
    if (!announce) return
    const signature = JSON.stringify(readings)
    if (signature === this.confrontationSignature) return
    this.confrontationSignature = signature
    this.dispatchEvent(new CustomEvent(CONFRONTATION_EVENT, { detail: readings }))
  }

  setDistanceHypothesis(sourceId: string, distanceM: number | undefined): void {
    if (distanceM === undefined || !(distanceM > 0)) this.distanceHypotheses.delete(sourceId)
    else this.distanceHypotheses.set(sourceId, distanceM)
    this.updateAstronomy(this.lastTimeMs)
  }

  /** How far `sourceId` is drawn right now, and on what basis — see PhenomenonDepth. Undefined
   * for a shape not on screen at this instant. */
  depthOf(sourceId: string): ResolvedDepth | undefined {
    return this.depths.get(sourceId)
  }

  /**
   * How wide this shape's object really was, in meters, as far as anything in the scene has been
   * able to establish — empty ranges included, which is the usual answer and the correct one.
   *
   * Accumulated from the instants the playhead has actually visited rather than scanned ahead: a
   * crossing only means anything with the camera, the observer's own position and the decor all
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
   * The storm's flashes at this instant, and the thunder of any flash playback has just reached.
   *
   * Only an ordinary frame hears thunder, and only while playing: a seek or one instant of a long
   * pose does not set off a clap.
   */
  private updateLightning(sighting: Sighting, t: number, withinPose: boolean): void {
    this.ensureLightningSchedule(sighting)
    this.sceneRenderer.updateLightning(t)
    if (withinPose) return
    const previous = this.lastLightningT
    this.lastLightningT = t
    if (previous === undefined || t < previous || this.ufoElement.playbackState !== "playing") return
    const struck = this.lightningFlashes.filter(flash => flash.t > previous && flash.t <= t).pop()
    if (struck && resolveWeatherAt(sighting, struck.t).storm) this.handleLightningFlash(struck)
  }

  /** Works the flashes out again when the recording's start or length has changed — the same
   * inputs, and the same reasoning, as the meteors (see ensureMeteorSchedule). */
  private ensureLightningSchedule(sighting: Sighting): void {
    const intensity = resolveWeatherAt(sighting, 0).precipitationIntensity
    const inputs = `${this.meteorInputsOf(sighting)}|${intensity}`
    if (inputs === this.lightningScheduleFor) return
    this.lightningScheduleFor = inputs
    const time = sighting.event.time
    const place = sighting.event.place?.[0]
    const date = time?.year !== undefined ? sightingTimeToDate(time, place?.lng ?? 0, sighting.event.utcOffsetHours) : undefined
    const durationMs = (sighting.event.durationSeconds ?? 0) * 1000 || sighting.timeline.duration || 20_000
    // Offset from the meteors' seed, so a stormy night's flashes are not tied to its meteors.
    const seed = Math.round((date?.getTime() ?? 0) / 1000) + Math.round((place?.lat ?? 0) * 1000) + 7
    this.lightningFlashes = LightningSchedule.schedule({ durationMs, seed, intensity })
    this.sceneRenderer.setLightning(this.lightningFlashes)
  }

  /**
   * Rebuilds the fall whenever anything it was computed FROM has moved.
   *
   * This used to compare the Sighting by identity, which quietly meant "never": the editor edits
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
      time?.second,
      sighting.event.utcOffsetHours,
      sighting.event.durationSeconds,
      sighting.timeline.duration
    ])
  }

  /**
   * Works out what falls during this recording — the shower, if one is running, and the sporadic
   * background, which is always.
   *
   * Both go into ONE list, because a observer does not see two skies. The shower's meteors radiate
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
   * It arises only for a device that has BOTH a frame and an aperture: without a frame there is no
   * focal length to work from (a camera nobody identified), and without an aperture there is no
   * depth of field at all in this model (an eye). Anything else would be guessing at a blur.
   *
   * A phone HAS one — fixed, round and f/1.8 — so it comes through here too. What it does not have
   * is a noticeable blur: a 5.7 mm lens puts everything past about two metres inside its own depth
   * of field, and the pass costs nothing to look at (see DepthOfFieldPass, whose shader drops any
   * pixel whose circle of confusion is under three quarters of a pixel).
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
