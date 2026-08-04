// Named imports (not `import * as THREE`) so Rollup can tree-shake the unused 95% of
// three.js — a namespace import defeats tree-shaking since property access on it isn't
// statically analyzable, which was the difference between an ~850KB and an ~180KB bundle here.
import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CircleGeometry,
  Color,
  Fog,
  Float32BufferAttribute,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Raycaster,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  Vector2,
  Vector3,
  WebGLRenderer
} from "three"
import type { Material, Texture } from "three"
import {
  atmosphericTint,
  cartesianToHorizontal,
  glareOpacity,
  glareRadius,
  glareStrength,
  horizontalToCartesian,
  magnitudeToBrightness,
  skyColorForPosition,
  skyColorsForAltitude,
  starBrightnessTierIndex,
  starColorScale,
  twinkleIntensity,
  visibleMagnitudeLimit,
  STAR_BRIGHTNESS_TIERS
} from "./skyColors.js"
import { equatorialToHorizontal } from "../engine/astronomy/CelestialPositions.js"
import type { CelestialBody, HorizontalPosition, MoonPhase, ObserverGeo } from "../engine/astronomy/CelestialPositions.js"
import type { ObserverPose } from "../engine/model/ObserverTrack.js"
import type { StarCatalog } from "./StarCatalog.js"
import { defaultTerrainProviders } from "./terrain/defaultTerrainProviders.js"
import type { TerrainProviders } from "./terrain/defaultTerrainProviders.js"
import { buildTerrainMesh } from "./terrain/TerrainMeshBuilder.js"
import { geoToLocalMeters } from "./terrain/GeoProjection.js"
import { DEFAULT_WEATHER } from "../engine/model/Weather.js"
import type { PrecipitationType, Weather } from "../engine/model/Weather.js"
import { buildRainSystem } from "./RainSystem.js"
import type { RainSystem } from "./RainSystem.js"
import {
  buildCloudClusterLayouts,
  buildCloudInstanceGeometry,
  buildCloudMaterial,
  buildOvercastGeometry,
  buildOvercastMaterial,
  cloudGenusForWeather
} from "./CloudSystem.js"
import type { CloudUniforms, OvercastUniforms } from "./CloudSystem.js"

const SKY_RADIUS = 900
const GROUND_RADIUS = 900
const STAR_RADIUS = 850
const BODY_PLACEMENT_RADIUS = 850
/** Sized to match the Sun/Moon's real ~0.53deg angular diameter at BODY_PLACEMENT_RADIUS
 * (radius = R*tan(0.265deg) =~ 3.9) — this is a simulation, not an illustration: rendering them
 * bigger or artificially brighter than they'd really appear would defeat the actual point (e.g.
 * judging whether a reported light could realistically have been Venus). If they end up small and
 * easy to miss on screen, that's accurate, not a bug — a real witness can misjudge/miss them too. */
const SUN_MOON_VISUAL_RADIUS = 4
/** Real planets are angularly far smaller than this (arcseconds, genuinely point-like to the naked
 * eye) — this is already a floor for basic renderability (three.js can't usefully rasterize a
 * true-to-scale sub-pixel sphere), not a stylistic choice, so it's kept as small as still renders. */
const PLANET_VISUAL_RADIUS = 1.5
const BELOW_HORIZON_CUTOFF_DEG = -1
/** How much bigger than its visual disc a body's raycasting hit-test target is — real Sun/Moon/
 * planet discs are too small to reliably point at exactly, so hover/click detection (see
 * pickBodyAt) uses a more forgiving invisible radius without changing what's actually drawn. */
const HOVER_HIT_RADIUS_SCALE = 6
/** Sun/Moon/planet meshes stop being built once this far below the horizon — well past the point
 * the opaque ground plane would occlude them anyway, so there's no point paying for the geometry. */
const BODY_HIDE_BELOW_DEG = -4

/** French abbreviations, clockwise from north — matches this project's own azimuth convention
 * (0deg = north, increasing clockwise). Shown on the horizon in "edit mode" (see
 * SceneElement's show-compass attribute, set by UfoRecorderElement) so a witness's heading can be
 * set/checked against a real compass reference instead of a bare number. */
const COMPASS_DIRECTIONS: ReadonlyArray<{ azimuthDeg: number; label: string }> = [
  { azimuthDeg: 0, label: "N" },
  { azimuthDeg: 45, label: "NE" },
  { azimuthDeg: 90, label: "E" },
  { azimuthDeg: 135, label: "SE" },
  { azimuthDeg: 180, label: "S" },
  { azimuthDeg: 225, label: "SO" },
  { azimuthDeg: 270, label: "O" },
  { azimuthDeg: 315, label: "NO" }
]
const COMPASS_PLACEMENT_RADIUS = 880 // just inside the sky dome, reading as "on the horizon"
const COMPASS_SPRITE_SIZE = 40
/** Higher than every other mesh's default renderOrder (0) — combined with the sprite material's
 * own depthTest:false, this guarantees compass labels paint over the ground/terrain regardless of
 * scene-graph insertion order or actual distance, matching their own "fixed HUD reference" intent
 * (see buildCompassLabels). Without this, a real terrain patch — genuinely closer to the camera
 * than the compass's own placement radius — would win the normal opaque depth test and occlude the
 * label, even though the label ignores depth when rendering itself: renderOrder controls *when*
 * something draws, depthTest only controls whether *that* draw respects what's already there. */
const COMPASS_RENDER_ORDER = 10
/** See setTerrainOrigin's use of this — must stay between groundMesh's default renderOrder (0) and
 * COMPASS_RENDER_ORDER. */
const TERRAIN_RENDER_ORDER = 1
/** See setTerrainOrigin's use of this — a moving ObserverTrack (multiple keyframes at different
 * lat/lng) interpolates a fractionally-different position on essentially every animation frame
 * during playback; rebuilding (an 18-tile fetch) on exact inequality would mean refetching on
 * every single frame while the observer is in motion. 150m is comfortably inside the terrain
 * patch's own 900m radius, so the old patch still visibly covers the observer's surroundings for a
 * while after a rebuild, rather than needing to be pixel-perfect the instant they've moved at all. */
const TERRAIN_REBUILD_DISTANCE_M = 150

/** A fixed pool of cloud "puff" sprites — cloudCover reveals a stable-ordered subset of it (see
 * buildClouds) rather than spawning/despawning a variable count, so lowering cover never makes a
 * *different* random subset appear, just fewer of the same deterministic set. */
const CLOUD_POOL_SIZE = 24
const CLOUD_RADIUS = 700 // inside STAR_RADIUS/BODY_PLACEMENT_RADIUS (850) so clouds occlude stars/bodies, matching real sky layering
/** Between TERRAIN_RENDER_ORDER (1) and COMPASS_RENDER_ORDER (10) — clouds are part of the
 * astronomically-positioned scene (unlike the compass HUD) so they use normal depthTest, but must
 * never be hidden behind the ground/terrain (irrelevant since they're always above it) and must
 * stay under the compass labels. */
const CLOUD_RENDER_ORDER = 5
/** Strictly above CLOUD_RENDER_ORDER — three.js sorts transparent objects by renderOrder first, so
 * this guarantees the overcast shell (see buildOvercastMaterial) always draws after every puff
 * cluster regardless of camera-distance tiebreaking, letting it visually seal over them once fully
 * opaque at max cloudCover rather than risking an unstable draw order at nearly-equal distances. */
const CLOUD_OVERCAST_RENDER_ORDER = CLOUD_RENDER_ORDER + 1
const CLOUD_LIGHT_COLOR: [number, number, number] = [0.92, 0.92, 0.95]
const CLOUD_DARK_COLOR: [number, number, number] = [0.15, 0.15, 0.19]
/** Uniform multiplier applied to every CloudGenusProfile offset/scale number — see
 * CloudLayoutConfig.clusterScale's own comment for why: the reference skill's numbers assume a much
 * smaller flight scene than this dome's CLOUD_RADIUS=700. Chosen so a cumulus cluster's average
 * footprint (~294 units) lands close to the old sprite system's own CLOUD_SPRITE_SIZE=260 average. */
const CLOUD_CLUSTER_SCALE = 7
/** Single shared opacity for every cluster's material — replaces the old per-sprite random opacity
 * (0.4-0.85); an accepted v1 simplification since a 20-50-sphere overlapping cluster already creates
 * density variation through overlap, unlike a single flat sprite. */
const CLOUD_OPACITY = 0.85
/** Deg/s of azimuthal cloud-layer rotation at weather.windSpeed=1 — deliberately NOT
 * WIND_DRIFT_M_PER_S (that's a flat-translation rate for RainSystem/CPU precipitation's own small,
 * ground-hugging volumes; translating a cluster at CLOUD_RADIUS=700 by even a modest per-second rate
 * would drift it off its dome radius within seconds — see updateClouds). Tuned by eye for a
 * visible-but-not-frantic drift over a typical sighting's playback length. */
const CLOUD_DRIFT_DEG_PER_SECOND_AT_MAX_WIND = 3

/** Rain is not in this map — it's rendered by the GPU shader-based RainSystem (see RainSystem.ts
 * and buildRain/updateRain below), not this CPU/PointsMaterial path. Real snowflakes/hailstones are
 * round, so they don't need RainSystem's streak-specific machinery (GPU recycling + UV squash);
 * they kept the simpler, already-working approach. */
type CpuPrecipitationType = Exclude<PrecipitationType, "none" | "rain">

interface PrecipitationTypeConfig {
  fallSpeedMPerS: number
  size: number
  color: Color
  /** 0-1 multiplier on how much windSpeed drives this type's horizontal drift — hail is heavy and
   * resists wind, snow drifts more freely. */
  driftSensitivity: number
  /** Per-type volume, not a shared constant — see snow's own comment on why: bringing a slow-falling
   * type's volume closer to the camera raises its apparent angular speed (parallax) without lying
   * about its real fallSpeedMPerS, the same lever RainSystem uses (RAIN_RADIUS_M/HEIGHT_M) for
   * exactly the same reason. */
  radiusM: number
  topYM: number
  /** Base alpha (0-1), before the depth-cue haze/blur dimming already applied in the fragment
   * shader — real hail is dense, solid ice and should read as noticeably more opaque/solid than
   * snow's soft, translucent aggregated crystals. */
  opacity: number
  /** Max CPU-updated particle pool for this type — per-type (not a shared constant) since a user
   * can ask to raise one type's density without the other: snow bumped on its own request while
   * hail's own pool stayed put, which a single shared PRECIPITATION_POOL_SIZE couldn't express. A
   * per-frame position update over even the larger of these two is still comfortably sub-millisecond
   * (same "cheap enough not to bother measuring" territory as the star-twinkle loop), so there's no
   * real cost pressure keeping the two in lockstep either. */
  poolSize: number
}
/** Real, physically-driven fall speeds throughout — see radiusM/topYM's own comment for how slow
 * real speeds (snow) still read as motion without inflating them. Hail ~9-30 m/s depending on
 * stone size, using a mid-size-stone figure here; snow ~1-2 m/s (low mass/drag ratio). */
const PRECIPITATION_CONFIG: Record<CpuPrecipitationType, PrecipitationTypeConfig> = {
  // size dropped 2.6->0.5->0.3 to compensate for radiusM shrinking 150->25 (see below): PointsMaterial's
  // sizeAttenuation scales on-screen size inversely with distance, so bringing the volume ~6x closer
  // without shrinking `size` to match made flakes render too big on screen — the parallax speed
  // boost from a closer volume shouldn't come bundled with giant flakes as a side effect. Reduced a
  // second time after user feedback that 0.5 still read as too large.
  // opacity lowered from the old shared 0.85 — real snow is soft, translucent, aggregated ice
  // crystals with air gaps, and should read as less solid than hail's dense ice (see hail's own
  // opacity comment below). Raised slightly again, 0.65->0.75, on direct request — still kept
  // clearly under hail's own 0.95 so the ice-vs-crystal ordering stays intact.
  // poolSize doubled 1200->2400 on direct request to raise snow's own max density further — kept
  // independent of hail's own pool (see PrecipitationTypeConfig.poolSize's own comment).
  snow: { fallSpeedMPerS: 2, size: 0.3, color: new Color(1, 1, 1), driftSensitivity: 1, radiusM: 25, topYM: 20, opacity: 0.75, poolSize: 2400 },
  // radiusM/topYM shrunk 150/80 -> 25/10 after user feedback that hail read as much too slow (and,
  // after an initial 25/18 attempt, still not close enough to rain's own cycle rate) — the real
  // fallSpeedMPerS (14, already faster than rain's own real max of 9) was never the problem: the old
  // 80m-tall volume meant a full fall cycle took ~5.75s (80.5/14) regardless of that real speed being
  // high, exactly the same "real physics number, but the volume it falls through is too big for it to
  // ever read as fast" trap RainSystem.ts's own overallSpeed fix already diagnosed and solved for
  // rain. At (25,10), cycle time is ~0.75s — close to rain's own ~0.39s (GPU-driven, a fundamentally
  // faster-cycling system, so not expected to match exactly) without inflating the real 14 m/s
  // figure. size dropped 1.6->0.35 to compensate for the closer volume (same reasoning as snow's own
  // radiusM-shrink-needs-a-size-cut comment), then raised to 0.5 after user feedback that hail
  // stones — real, dense ice, not fluffy aggregated crystals — need to stay clearly bigger than
  // snow's own 0.3, not land almost indistinguishably close to it. opacity raised above snow's own
  // 0.65 for the same real-physical reason: solid ice is less translucent than soft, airy crystals.
  hail: { fallSpeedMPerS: 14, size: 0.5, color: new Color(0.95, 0.98, 1), driftSensitivity: 0.25, radiusM: 25, topYM: 10, opacity: 0.95, poolSize: 1200 }
}
/** Matches groundMesh.position.y — a particle reaching real ground height respawns. Shared across
 * every precipitation type (rain, snow, hail alike) — ground level doesn't vary by weather type,
 * unlike radiusM/topYM/fallSpeedMPerS which do. */
const PRECIPITATION_RESPAWN_Y_MIN = -0.5
/** Scales weather.windSpeed (0-1) into a world-units-per-second horizontal drift — tuned so
 * windSpeed=1 visibly sweeps precipitation sideways without it reading as a hurricane. */
const WIND_DRIFT_M_PER_S = 6

/** RainSystem tuning — see RainSystem.ts's own doc comment for why rain gets a completely separate,
 * much tighter volume than the old shared 150m-radius CPU pool: a small, camera-hugging volume is
 * what actually reads as a dense downpour (parallax — see PrecipitationTypeConfig.radiusM's own
 * comment, the same lever now also applied to snow), matching the reference project's own scale
 * (radius 20, height 15 in its units). */
/** GPU-recycled Points draw cost is dominated by draw-call overhead, not per-vertex work, so this can
 * be pushed well past what a CPU-updated pool (see PrecipitationTypeConfig.poolSize) would tolerate.
 * Bumped 1500->3000 after user feedback that even full intensity read as too sparse — same feedback
 * that also bumped the CPU snow/hail pool at the time, "les deux" (both rain and snow). */
const RAIN_POOL_SIZE = 3000
const RAIN_RADIUS_M = 20
const RAIN_HEIGHT_M = 15
const RAIN_BOTTOM_Y_M = PRECIPITATION_RESPAWN_Y_MIN
/** Drives RainSystemConfig.overallSpeed — see that field's own comment for why this is deliberately
 * NOT a real m/s figure. At RAIN_HEIGHT_M=15 and this rate, a full recycle cycle (before per-particle
 * ±15% jitter) takes 15/40 ≈ 0.375s — fast enough that the field visibly refreshes continuously
 * rather than reading as a slow, trackable loop. Tuned by eye; not derived from any physical formula,
 * unlike rainFallSpeedMPerS below (which drives the streak-length illusion only, not this). */
const RAIN_OVERALL_SPEED = 40
/** Real terminal velocity depends only on drop diameter (source: scnat.ch's rain physics primer),
 * and diameter genuinely correlates with intensity — a drizzle isn't just sparser than a downpour,
 * its individual drops are physically smaller and slower:
 *  - Drizzle (<0.5mm): ~1 m/s (3.6 km/h) — dominated by air resistance relative to their tiny mass.
 *  - Medium drops (1-2mm): ~4-6 m/s (14-22 km/h).
 *  - Large storm drops (5mm): up to ~9 m/s (32.4 km/h) — the real maximum: beyond ~5-6mm, air
 *    resistance shreds a drop into smaller fragments before it can fall any faster, so 9 m/s isn't
 *    an arbitrary cap, it's the real physical ceiling.
 * Modeled as a straight linear interpolation between the two extremes by
 * weather.precipitationIntensity (0-1) — see rainFallSpeedMPerS; a straight line already lands
 * medium intensity (0.5) at 5 m/s, matching the real 4-6 m/s medium-drop range without needing a
 * fancier curve. This also feeds RAIN_STREAK_REFERENCE_SPEED_M_PER_S's speedStreak calculation, so a
 * drizzle's streaks read shorter too, not just sparser — another real effect this correlation gives
 * for free, not a separate rule. */
const RAIN_FALL_SPEED_MIN_M_PER_S = 1
const RAIN_FALL_SPEED_MAX_M_PER_S = 9
function rainFallSpeedMPerS(intensity: number): number {
  return RAIN_FALL_SPEED_MIN_M_PER_S + (RAIN_FALL_SPEED_MAX_M_PER_S - RAIN_FALL_SPEED_MIN_M_PER_S) * intensity
}
const RAIN_COLOR = new Color(0.75, 0.82, 0.92)
/** The real fallSpeedMPerS a streak needs to hit for RainSystemConfig.speedStreak to reach 1 (streak
 * fills the whole point sprite, no motion-blur compression) — see speedStreak's own doc comment for
 * the mechanism. Originally set to hail's own 14 m/s for a "physically consistent" partial streak,
 * but that read as too short — lowered close to rain's own real speed so its streaks read as long,
 * confident lines rather than short dashes (still not exactly 1:1, so the mechanism isn't fully
 * degenerate — a real fallSpeedMPerS below this would still compress visibly shorter). */
const RAIN_STREAK_REFERENCE_SPEED_M_PER_S = 10
/** Floor so even a light drizzle's streak stays a visible short *dash*, not a near-round dot — a
 * genuinely correct fall speed (see rainFallSpeedMPerS) can still read as "barely moving" if its
 * own shape gives no visual motion cue at all; a compressed-but-still-elongated mark keeps that cue
 * without touching the real physical speed itself. Bumped 0.3->0.5 after a user report that light
 * rain read as much slower than its real ~2 m/s — a round-ish dot (0.3's actual look) doesn't carry
 * a "this is falling" cue the way even a short dash does, regardless of how correct the underlying
 * per-frame displacement is. */
const RAIN_STREAK_MIN_FACTOR = 0.5
function speedStreakFactor(fallSpeedMPerS: number): number {
  return clamp(fallSpeedMPerS / RAIN_STREAK_REFERENCE_SPEED_M_PER_S, RAIN_STREAK_MIN_FACTOR, 1)
}

/** Ground-splash ring pool for rain impacts — a deliberate approximation, not a literal per-drop
 * impact simulation. RainSystem's own falling drops are positioned entirely inside the vertex
 * shader (see RainSystem.ts's own doc comment) and never read back to the CPU, so there's no way
 * to know exactly when or where any specific modeled drop reaches the ground. Instead, a small,
 * independent CPU-driven pool of ring sprites spawns/respawns at random ground positions within
 * the same RAIN_RADIUS_M volume rain itself falls through, at a rate that scales with
 * precipitationIntensity via the same precipitationVisibleCount mechanism already used for the
 * falling particles' own density. Visually this reads as "more splashes during a downpour, almost
 * none during a drizzle" — which is what actually matters — without needing genuine per-drop
 * impact tracking, the same kind of pragmatic simplification already documented for hail's reused
 * audio bed. */
const RAIN_SPLASH_POOL_SIZE = 200
/** Each splash re-rolls its own duration on every respawn (same "per-event, not per-slot" random
 * reasoning as HAIL_BOUNCE_HEIGHT/DURATION) — a quick, near-instant ripple, not a lingering puddle
 * mark. */
const RAIN_SPLASH_MIN_DURATION_S = 0.18
const RAIN_SPLASH_MAX_DURATION_S = 0.32
/** Ring diameter at the very end of its life (it starts at 0 and grows to this) — small relative
 * to RAIN_RADIUS_M, a real raindrop's impact ripple is a modest, localized disturbance, not a
 * wide splash. */
const RAIN_SPLASH_MAX_SIZE_M = 0.35
const RAIN_SPLASH_COLOR = new Color(0.85, 0.9, 0.98)

/** Depth cues shared by every precipitation type (rain's own RainSystem.ts, and the CPU snow/hail
 * material below) — see RainSystem.ts's own doc comment for the two distinct physical effects this
 * approximates (near-camera optical defocus + distance atmospheric haze) and why a full post-process
 * depth-of-field pass (three.js's real `BokehPass`) was deliberately not used: it would blur the
 * whole scene (sky/terrain/stars), not just precipitation, for a real architecture/bundle cost this
 * project doesn't otherwise need. Near-focus distance is about the *eye*, not the weather volume, so
 * it's one constant shared by every type/system; haze distance scales with each type's own volume
 * radius (a type with a wider volume should stay clear farther out), computed per-call, not shared. */
const PRECIPITATION_NEAR_FOCUS_DISTANCE_M = 5
/** Haze reaches full strength at this fraction of a type's own radiusM — see
 * PRECIPITATION_NEAR_FOCUS_DISTANCE_M's own comment for why this scales per-type instead of being a
 * single shared constant. */
const PRECIPITATION_HAZE_DISTANCE_RATIO = 0.85
/** How many of a pool (RAIN_POOL_SIZE, RAIN_SPLASH_POOL_SIZE, or a CPU type's own poolSize) are
 * actually drawn, as a fraction of the pool,
 * at a given weather.precipitationIntensity (0-1) — this is what "light drizzle" vs. "downpour"
 * should mean, not a dimmer/brighter render of the same fixed density (see RainSystemConfig's own
 * visibleCount comment). The floor keeps intensity=0 from reading as "nothing selected" once a type
 * IS selected — a few visible drops/flakes, not zero. Lowered twice (0.2->0.05->0.01) after user
 * feedback that intensity=0 still looked too dense for the lightest possible drizzle/flurry. */
const PRECIPITATION_INTENSITY_COUNT_FLOOR = 0.01
function precipitationVisibleCount(poolSize: number, intensity: number): number {
  return Math.round(poolSize * (PRECIPITATION_INTENSITY_COUNT_FLOOR + (1 - PRECIPITATION_INTENSITY_COUNT_FLOOR) * intensity))
}
/** Numerator of `gl_PointSize = uPixelSize / -mvPosition.z` (see RainSystem.ts's vertex shader) —
 * tuned by eye against this project's own camera (60deg fov) and RAIN_RADIUS_M. Scaled down from an
 * earlier 340 (tuned for a since-abandoned 30m radius) to roughly track RAIN_RADIUS_M's own 30->20m
 * reduction, then re-verified visually rather than trusted as an exact proportional derivation. */
const RAIN_PIXEL_SIZE = 230
/** At a steep camera pitch, shrinks the streak's on-screen size and squashes its texture UV toward
 * the center column (see updateRain) — ported from the reference project's own
 * minAngleSizeScale/minAngleUvSquash, same values (not re-tuned; they already read correctly here). */
const RAIN_MIN_ANGLE_SIZE_SCALE = 0.7
const RAIN_MIN_ANGLE_UV_SQUASH = 0.05
/** Real snowflakes flutter side-to-side (and front-to-back — see the 2-axis wobble in
 * updatePrecipitation) as they fall (low mass/high drag), unlike rain or hail which fall in a
 * near-straight line — a per-particle sinusoidal wobble on top of the wind drift, not a substitute
 * for it. These are BASE values only — actual per-particle frequency/amplitude are these times
 * precipitationWobbleFreqJitter/AmpJitter (see their own comment), not applied directly. Amplitude
 * lowered 1.4->0.7 after user feedback that the wobble read as an exaggerated zigzag with no wind
 * to compete against; frequency/amplitude picked by eye, same as every other "real effect, tuned
 * for legibility" constant in this file (e.g. WIND_DRIFT_M_PER_S itself). Only snow uses this — see
 * updatePrecipitation. */
const SNOW_WOBBLE_FREQUENCY_HZ = 0.6
const SNOW_WOBBLE_AMPLITUDE_M_PER_S = 0.7
/** A brief, subtle rebound when a hailstone hits the ground — real hard ice genuinely bounces on
 * impact, unlike snow (settles) or rain (splashes, a different effect not attempted here). Quick and
 * small ("un léger rebond", not a physically simulated multi-bounce decay) — see
 * updatePrecipitation's own bounce state machine for the mechanism. */
const HAIL_BOUNCE_DURATION_S = 0.15
const HAIL_BOUNCE_HEIGHT_M = 0.35
// Base horizontal scatter speed for a bounce at the *average* rolled height (see bounceVelX/Z's own
// comment) — a stone landing at an angle skids/scatters sideways on impact, it doesn't just pop
// straight up in place. Scaled per-bounce by how high that particular hop rolled, so a bigger bounce
// (more impact energy) also travels farther, not just higher — the two should correlate physically.
const HAIL_BOUNCE_SCATTER_M_PER_S = 3
/** Upper bound on one animation step's dt — see startTwinkle's tick() for why. 1/12s is generous
 * (equivalent to a completely smooth 12fps, well below any real frame rate) while still being far
 * smaller than every precipitation type's full fall cycle (even hail's fastest, ~5.75s), so a single
 * clamped step can never move a particle past the ground in one go. */
const MAX_ANIMATION_DT_SECONDS = 1 / 12

/** Lightning only fires once the storm reads as one — reuses cloudDarkness rather than adding a
 * second "is it stormy" concept, since that's already what darkness encodes. */
const LIGHTNING_MIN_DARKNESS = 0.5
const LIGHTNING_MIN_INTERVAL_S = 8
const LIGHTNING_MAX_INTERVAL_S = 25
const LIGHTNING_FLASH_DURATION_S = 0.12

const PLANET_COLORS: Partial<Record<CelestialBody, Color>> = {
  Venus: new Color(1, 0.96, 0.85),
  Mars: new Color(1, 0.55, 0.4),
  Jupiter: new Color(0.95, 0.87, 0.72),
  Saturn: new Color(0.92, 0.86, 0.68)
}

interface StarTier {
  readonly points: Points
  readonly colorAttribute: BufferAttribute
  readonly brightness: Float32Array
  readonly phase: Float32Array
  readonly speedFactor: Float32Array
}

export interface ScenePlanet {
  body: CelestialBody
  position: HorizontalPosition
  /** Real apparent visual magnitude — scales how large/bright the planet's marker renders, the
   * same way star magnitude drives the starfield, so e.g. Venus reads as distinctly more
   * prominent than Saturn instead of both being identical dots. */
  magnitude: number
}

/** Everything needed to render one instant's sky: real Sun/Moon/planet positions (already
 * resolved by SceneElement via engine/astronomy/CelestialPositions.ts) plus the star catalog and
 * the date/observer needed to place its fixed RA/dec entries in the sky right now. `stars` is
 * undefined until the (lazily fetched) catalog asset has loaded — the sky renders without stars
 * until then. */
export interface SceneAstronomy {
  sun: HorizontalPosition & { magnitude: number }
  moon: HorizontalPosition & { phase: MoonPhase; magnitude: number }
  planets: ReadonlyArray<ScenePlanet>
  stars?: { catalog: StarCatalog; date: Date; observer: ObserverGeo }
}

/**
 * Renders the "decor" (sky, horizon, sun/moon/planets, stars) behind a sighting's 2D shape
 * layer — see SceneElement, which composites this underneath a transparent-background
 * <rr0-ufo>. A vertex-colored sky dome (now azimuth-aware, not just altitude-aware — see
 * skyColorForPosition), a flat haze-blended ground plane (an aeronautical horizon, not a literal
 * terrain), self-illuminated Sun/Moon/planet discs (no THREE.Light: astronomically the Sun isn't
 * "lit by" anything, and a self-illuminated MeshBasicMaterial disc is already visible without
 * one — see the milestone plan for why a real light is deliberately out of scope here), and a
 * real star field from a catalog once loaded.
 */
export class SceneRenderer {
  private readonly renderer: WebGLRenderer
  private readonly scene = new Scene()
  private readonly camera: PerspectiveCamera

  private skyMesh?: Mesh
  private groundMesh?: Mesh
  /** Location-accurate relief+imagery patch built by setTerrainOrigin(), layered on top of the
   * flat groundMesh disc (which keeps rendering underneath/beyond it unconditionally — see
   * setTerrainOrigin's own doc comment for why that's the permanent fallback, not something this
   * replaces). Undefined until a real observer location resolves and the async build finishes. */
  private terrainMesh?: Mesh
  private readonly terrainProviders: TerrainProviders
  private terrainOrigin?: { lat: number; lng: number }
  private terrainBuildToken = 0
  private terrainAttribution?: string
  private starTiers: StarTier[] = []
  private readonly bodyMeshes = new Map<string, Mesh | Sprite>()
  /** Invisible (opacity 0), larger-than-the-real-disc proxies used only for pickBodyAt's hover/
   * click hit-testing — see HOVER_HIT_RADIUS_SCALE. Never rendered/visible, so this doesn't
   * change how anything looks, only how forgiving it is to point at. */
  private readonly hitAreas = new Map<string, Sprite>()
  /** Additive-blended glare halos — real ocular/lens dazzle around a very bright body, driven by
   * its true magnitude (see glareStrength in skyColors.ts). Only ever non-empty for the Sun,
   * a bright-enough Moon, or Venus at its historical brightest — everything else's glareStrength
   * is 0, so no sprite is built for it at all. */
  private readonly glareSprites = new Map<string, Sprite>()
  private compassSprites: Sprite[] = []
  private showCompass = false
  private compassHovered = false
  /** See setCompassForced's own doc comment. */
  private compassForced = false
  private animationFrameId: number | null = null
  private readonly raycaster = new Raycaster()

  private weather: Weather = DEFAULT_WEATHER
  /** One shared ShaderMaterial for every current cluster — see disposeCloudSystem for why disposal
   * is single, not per-cluster. */
  private cloudMaterial?: ShaderMaterial
  private cloudUniforms?: CloudUniforms
  private cloudClusters: Array<{ mesh: InstancedMesh; baseAltitudeDeg: number; baseAzimuthDeg: number }> = []
  /** Accumulated azimuthal drift (deg) applied on top of every cluster's own baseAzimuthDeg — see
   * updateClouds. Reset on rebuild so a fresh pool doesn't inherit stale drift from the old one. */
  private cloudDriftDeg = 0
  /** The continuous overcast shell (see buildOvercastMaterial) that guarantees a true, gap-free
   * ceiling at max cloudCover — undefined whenever cloudClusters is empty (no clouds at all). */
  private overcastMesh?: Mesh
  private overcastMaterial?: ShaderMaterial
  private overcastUniforms?: OvercastUniforms
  private precipitationPoints?: Points
  /** Direct reference into precipitationPoints' own position BufferAttribute array — mutated in
   * place every frame (see updatePrecipitation), never reallocated, matching the star field's own
   * zero-per-frame-allocation discipline. */
  private precipitationPositions?: Float32Array
  /** Per-particle random phase offset (seeded, built alongside precipitationPositions) driving
   * snow's wobble term in updatePrecipitation — without a per-particle offset every flake would
   * wobble in lockstep, reading as one rigid sheet oscillating rather than independent flakes. */
  private precipitationPhase?: Float32Array
  /** Per-particle fall-speed multiplier (seeded, built alongside precipitationPositions) — real
   * snowflakes vary noticeably in size and therefore fall speed, unlike a uniform sheet all dropping
   * at the exact same rate; ±30% jitter around config.fallSpeedMPerS keeps that visible. */
  private precipitationSpeedJitter?: Float32Array
  /** Per-particle wobble frequency/amplitude multipliers (seeded, built alongside
   * precipitationPositions) — a phase offset alone only shifts *when* in the cycle each flake is,
   * every flake still traces the exact same sine shape just time-shifted, which reads as
   * suspiciously uniform ("they all do the same move"). Varying the frequency and amplitude
   * per-particle too makes each flake's own flutter path genuinely different, not just offset. */
  private precipitationWobbleFreqJitter?: Float32Array
  private precipitationWobbleAmpJitter?: Float32Array
  /** Per-particle countdown (seconds remaining) for hail's brief post-impact hop — 0 means "falling
   * normally, not currently bouncing". Only hail uses this (see updatePrecipitation's own comment on
   * why a bounce doesn't make sense for rain/snow); allocated for every CPU type regardless, same as
   * the other jitter arrays, since a type switch reuses the same pool/build path. */
  private precipitationBounceRemaining?: Float32Array
  /** The height/duration actually used by a hailstone's *current* bounce (see
   * precipitationBounceRemaining) — deliberately re-rolled with `Math.random()` fresh each time a
   * bounce starts (not a fixed per-particle-slot value like the other jitter arrays above), so two
   * consecutive impacts from the *same* pool slot don't repeat the identical hop — every individual
   * bounce is its own random event, not just every particle. Allocated lazily alongside
   * precipitationBounceRemaining but only ever written at the moment a bounce begins. */
  private precipitationBounceHeight?: Float32Array
  private precipitationBounceDuration?: Float32Array
  /** Horizontal scatter velocity (m/s) for the hailstone's *current* bounce — same "rolled fresh at
   * impact, not a fixed per-slot jitter" reasoning as precipitationBounceHeight/Duration. Without
   * this a bounce only drifted sideways as far as wind pushed it during its brief hop, landing right
   * back where it started under no-wind conditions — real stones scatter outward from where they
   * struck regardless of wind. */
  private precipitationBounceVelX?: Float32Array
  private precipitationBounceVelZ?: Float32Array
  /** The live CPU snow/hail material's own uniforms — kept so updatePrecipitation can refresh
   * uHazeColor every frame (the sky's own color changes continuously through a sighting's time of
   * day) without needing to reach into precipitationPoints.material and re-cast it each time. */
  private precipitationUniforms?: CpuPrecipitationUniforms
  /** GPU shader-based rain — see RainSystem.ts's own doc comment for why rain gets a separate system
   * from the CPU snow/hail pool above. Undefined whenever precipitationType isn't "rain". */
  private rainSystem?: RainSystem
  /** Ground-splash ring pool for rain impacts — see RAIN_SPLASH_POOL_SIZE's own comment for why
   * this is a separate CPU-driven approximation rather than tracking RainSystem's own GPU-computed
   * drop positions. Built/disposed in lockstep with rainSystem itself (buildRain/disposeRain), so
   * it's undefined exactly whenever rainSystem is. */
  private rainSplashSystem?: RainSplashSystem
  /** Scratch vector reused every updateRain call (avoids a per-frame allocation) — holds the
   * camera's current look direction, used to detect how steeply the witness is looking up/down. */
  private readonly rainCameraDirection = new Vector3()
  private rainLastVerticalFacing = -1
  private lightningArmed = false
  /** Absolute RAF clock (seconds) of the next scheduled flash — null while unarmed. Compared
   * against the same requestAnimationFrame timestamp startTwinkle's own loop already receives, not
   * the sighting's own playback time (weather isn't part of the timeline). */
  private nextLightningAtS: number | null = null
  private lightningFlashRemainingS = 0
  /** The real (non-flashing) fog color from the most recent setAstronomy() tick — what
   * updateLightning lerps away from/restores to, since a flash must revert exactly to "whatever
   * the sky actually looks like right now", not a hardcoded color, and the RAF loop driving the
   * flash runs independently of (usually faster than) setAstronomy's own per-playback-tick calls. */
  private baseFogColor: [number, number, number] = [0, 0, 0]
  /** Last real sun position from setAstronomy — lets a freshly rebuilt cloud pool (buildClouds,
   * triggered by setWeather, which setAstronomy is NOT called from) seed its lighting uniforms
   * immediately instead of sitting at buildCloudMaterial's arbitrary construction defaults (sunlight
   * from straight up) until the next real setAstronomy tick. The old flat-tinted sprites didn't need
   * this — their construction default (plain white) was already close to CLOUD_LIGHT_COLOR — but a
   * real directional-lit material looks visibly wrong from an arbitrary default. */
  private lastSunPosition?: HorizontalPosition
  private readonly onLightningFlash?: () => void

  constructor(
    canvas: HTMLCanvasElement,
    terrainProviders: TerrainProviders = defaultTerrainProviders(),
    onLightningFlash?: () => void
  ) {
    this.renderer = new WebGLRenderer({ canvas, antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    this.camera = new PerspectiveCamera(60, canvas.width / Math.max(canvas.height, 1), 0.1, SKY_RADIUS * 1.2)
    this.camera.position.set(0, 1.6, 0)
    this.terrainProviders = terrainProviders
    this.onLightningFlash = onLightningFlash
  }

  /** Verbatim attribution text required by the currently active imagery provider's license, once a
   * real terrain patch has been built — undefined until then (see setTerrainOrigin). */
  get currentTerrainAttribution(): string | undefined {
    return this.terrainAttribution
  }

  resize(width: number, height: number): void {
    this.renderer.setSize(width, height, false)
    this.camera.aspect = width / Math.max(height, 1)
    this.camera.updateProjectionMatrix()
    this.render()
  }

  /** Orients the camera to the observer's current heading/pitch/field of view — turning the
   * witness's head changes what part of the (fixed, real-world-positioned) sky is in view, it
   * never moves any of the sky/star/body positions themselves. `elevationM` nudges the camera's
   * own world-space height, since a witness standing higher up plausibly sees a lower horizon.
   * `headingDeg` undefined (unknown heading) leaves the camera's current yaw untouched rather
   * than snapping it to a default. */
  setObserverPose(pose: ObserverPose): void {
    if (pose.headingDeg !== undefined) {
      this.camera.rotation.set(pose.pitchDeg * DEG_TO_RAD, -pose.headingDeg * DEG_TO_RAD, 0, "YXZ")
    } else {
      this.camera.rotation.set(pose.pitchDeg * DEG_TO_RAD, this.camera.rotation.y, 0, "YXZ")
    }
    this.camera.position.y = 1.6 + pose.elevationM
    if (this.camera.fov !== pose.fovDeg) {
      this.camera.fov = pose.fovDeg
      this.camera.updateProjectionMatrix()
    }
  }

  /**
   * Fetches and swaps in a location-accurate terrain patch (relief + photo imagery) around
   * (lat, lng), replacing nothing — the existing flat groundMesh disc built by buildGround() keeps
   * rendering as the permanent far-horizon/offline fallback (see its own doc comment). This is the
   * first network-dependent feature in an otherwise fully local renderer, so failures here are
   * deliberately silent to the viewer: no real location known, a fetch error, a CORS failure, or
   * being offline all just leave terrainMesh unset and log a console.warn — never an exception the
   * caller has to handle, and never a visible change from today's disc-only look.
   *
   * Safe to call every frame: no-ops unless (lat, lng) has moved more than
   * TERRAIN_REBUILD_DISTANCE_M from the last real build, so SceneElement can call this
   * unconditionally from its own per-tick updateAstronomy() even for a moving ObserverTrack (see
   * that constant's own comment on why exact-equality dedup isn't enough once the observer is
   * animating between keyframes rather than sitting at one fixed pose).
   *
   * `onSettled` fires once the async build finishes (success or failure) — SceneElement uses it to
   * refresh its attribution overlay right when currentTerrainAttribution actually changes, since
   * relying solely on its own per-tick polling would miss the update entirely whenever playback
   * isn't actively running at that moment (e.g. a scene sitting idle at t=0, never re-ticking after
   * the initial render that kicked the build off).
   */
  setTerrainOrigin(lat?: number, lng?: number, onSettled?: () => void): void {
    if (lat === undefined || lng === undefined) return
    if (this.terrainOrigin) {
      const { x, z } = geoToLocalMeters(lat, lng, this.terrainOrigin.lat, this.terrainOrigin.lng)
      if (Math.sqrt(x * x + z * z) < TERRAIN_REBUILD_DISTANCE_M) return
    }
    this.terrainOrigin = { lat, lng }
    const token = ++this.terrainBuildToken
    buildTerrainMesh(lat, lng, this.terrainProviders)
      .then(({ mesh, attribution }) => {
        if (token !== this.terrainBuildToken) return // superseded by a newer call while this was in flight
        this.disposeMesh(this.terrainMesh)
        // Higher than groundMesh's default (0), lower than the compass labels' (see
        // COMPASS_RENDER_ORDER) — draws after the flat disc (see TerrainMeshBuilder's own
        // depthTest:false comment on why depth alone can't be trusted to layer them correctly at
        // these distances) but still under the compass HUD.
        mesh.renderOrder = TERRAIN_RENDER_ORDER
        // Applied immediately, not left for the next setAstronomy() tick: the tile fetch behind
        // buildTerrainMesh is async and typically resolves AFTER setAstronomy has already run once
        // (page just loaded, playback sitting idle at t=0) — without this, the mesh sits at its raw,
        // untinted photo-texture color (reading as daylit regardless of actual time of night) until
        // something re-triggers setAstronomy, e.g. pressing Play. baseFogColor is the same
        // undarkened groundColor setAstronomy's own per-tick retint uses (see its own comment above)
        // — using it here keeps a freshly-built mesh visually consistent with the sky/fog the very
        // first frame it appears in, not just from the next astronomy update onward.
        ;(mesh.material as MeshBasicMaterial).color.setRGB(...this.baseFogColor)
        this.terrainMesh = mesh
        this.terrainAttribution = attribution
        this.scene.add(mesh)
        this.render()
        onSettled?.()
      })
      .catch(error => {
        console.warn("Terrain build failed, keeping the flat ground fallback:", error)
        onSettled?.()
      })
  }

  /** Enables/disables the N/NE/E/SE/S/SO/O/NO horizon labels feature — a fixed compass reference,
   * unrelated to astronomy/time, so it's built once and left alone rather than rebuilt on every
   * setAstronomy() call the way the sky/stars are. Building them doesn't make them visible on its
   * own — they start hidden until setCompassHovered(true), see its own doc comment. */
  setShowCompass(show: boolean): void {
    if (this.showCompass === show) return
    this.showCompass = show
    this.disposeCompassLabels()
    if (show) this.buildCompassLabels()
    this.render()
  }

  /** Shows/hides the compass labels built by setShowCompass — cheap visibility toggle, never
   * rebuilds the sprites. A witness's heading matters while actively pointing at the canvas to set
   * it, not as a permanent overlay competing with the scene the rest of the time — so the labels
   * only appear while the pointer hovers the canvas (see SceneElement's pointermove/pointerleave
   * handlers), same spirit as the body-identification tooltip's own hover-only visibility. See
   * setCompassForced for the other way they can be shown. */
  setCompassHovered(hovered: boolean): void {
    if (this.compassHovered === hovered) return
    this.compassHovered = hovered
    this.updateCompassVisibility()
  }

  /** A second, independent reason to show the compass besides hovering the canvas: while the
   * heading input itself is focused, the labels are exactly what the editor needs to read off a
   * value against — requiring the mouse to ALSO be hovering the (possibly not even visible, e.g.
   * scrolled off) canvas at the same time would defeat the point. `UfoRecorderElement` calls this
   * from the heading input's own focus/blur. Independent of setCompassHovered so leaving the field
   * focused but moving the pointer away doesn't hide them, and vice versa. */
  setCompassForced(forced: boolean): void {
    if (this.compassForced === forced) return
    this.compassForced = forced
    this.updateCompassVisibility()
  }

  private updateCompassVisibility(): void {
    const visible = this.compassHovered || this.compassForced
    for (const sprite of this.compassSprites) sprite.visible = visible
    this.render()
  }

  /**
   * Applies a (static, per-sighting) weather condition — unlike setAstronomy/setObserverPose/
   * setTerrainOrigin, this is meant to be called once per actual change, not every tick: weather
   * doesn't move over the course of a sighting the way the sun/observer/terrain do (see Weather.ts's
   * own doc comment). Dedupes on reference equality — SceneElement/UfoRecorderElement always
   * reassign `sighting.weather` wholesale on edit (never mutate it field-by-field), so this is safe.
   * Cloud/precipitation geometry rebuilds here; cloud *lighting* still needs the sun's current
   * position every tick (see updateCloudLighting, called from setAstronomy) since it must keep
   * reacting to sunrise/sunset independent of this method being called again.
   */
  setWeather(weather: Weather): void {
    if (this.weather === weather) return
    this.weather = weather
    this.buildClouds()
    this.buildPrecipitation()
    this.lightningArmed = weather.lightning && weather.cloudDarkness >= LIGHTNING_MIN_DARKNESS
    if (!this.lightningArmed) {
      this.nextLightningAtS = null
      this.lightningFlashRemainingS = 0
      if (this.scene.fog) (this.scene.fog as Fog).color.setRGB(...this.baseFogColor)
    }
    this.syncAnimationLoop()
    this.render()
  }

  setAstronomy(astronomy: SceneAstronomy): void {
    const groundColor = skyColorsForAltitude(astronomy.sun.altitudeDeg).horizon
    this.baseFogColor = groundColor
    this.lastSunPosition = astronomy.sun
    this.buildSky(astronomy.sun)
    this.buildGround(groundColor)
    this.updateCloudLighting(astronomy.sun, groundColor)
    // Cheap per-frame retint only — never rebuilds the mesh/refetches tiles, see setTerrainOrigin.
    // Unlike buildGround's flat disc (which darkens groundColor by *0.35 since a solid color plane
    // needs extra contrast to read as "ground" rather than "sky"), the terrain's own photo texture
    // and relief shading already read as ground — using groundColor undarkened just modulates the
    // real photo brighter by day / darker by night, matching the sky's own light level.
    if (this.terrainMesh) {
      ;(this.terrainMesh.material as MeshBasicMaterial).color.setRGB(groundColor[0], groundColor[1], groundColor[2])
    }
    this.buildStars(astronomy.stars, astronomy.sun.altitudeDeg)
    this.setBodyMesh("sun", astronomy.sun, SUN_MOON_VISUAL_RADIUS, new Color(1, 0.96, 0.88), astronomy.sun.magnitude)
    this.setMoonMesh(astronomy.moon)
    this.buildPlanets(astronomy.planets)
    this.scene.fog = new Fog(new Color(...groundColor), SKY_RADIUS * 0.2, SKY_RADIUS)
    this.render()
  }

  render(): void {
    this.renderer.render(this.scene, this.camera)
  }

  /** Finds which celestial body (if any) sits under normalized device coordinates (each in
   * [-1,1], as THREE.Raycaster.setFromCamera expects) — for hover/click identification, not
   * anything that changes rendering. Tests against the invisible, larger-than-the-real-disc
   * hitAreas (see HOVER_HIT_RADIUS_SCALE), not the tiny true-scale visible meshes themselves,
   * which would be impractical to point at exactly. Returns the same key setBodyMesh/setMoonMesh
   * were called with (e.g. "sun", "moon", "Venus"). */
  pickBodyAt(ndcX: number, ndcY: number): string | undefined {
    this.raycaster.setFromCamera(new Vector2(ndcX, ndcY), this.camera)
    const entries = [...this.hitAreas.entries()]
    const intersection = this.raycaster.intersectObjects(entries.map(([, sprite]) => sprite))[0]
    if (!intersection) return undefined
    return entries.find(([, sprite]) => sprite === intersection.object)?.[0]
  }

  dispose(): void {
    this.stopTwinkle()
    this.terrainBuildToken++ // discard any terrain build still in flight
    this.disposeMesh(this.skyMesh)
    this.disposeMesh(this.groundMesh)
    this.disposeMesh(this.terrainMesh)
    this.disposeCloudSystem()
    this.disposePrecipitationPoints()
    this.disposeRain()
    this.disposeStarTiers()
    for (const mesh of this.bodyMeshes.values()) {
      this.disposeMesh(mesh)
    }
    this.bodyMeshes.clear()
    for (const key of [...this.hitAreas.keys()]) {
      this.disposeHitArea(key)
    }
    for (const key of [...this.glareSprites.keys()]) {
      this.disposeGlare(key)
    }
    this.disposeCompassLabels()
    this.renderer.dispose()
  }

  /** Starts the shared per-frame animation loop — idempotent, and a no-op when nothing needs it
   * (see syncAnimationLoop). Originally just star twinkle; now also drives falling/drifting
   * precipitation and lightning scheduling, since all three are cheap enough to share one RAF loop
   * rather than each running their own. Exposed (not private) so SceneElement can still call
   * stopTwinkle() on disconnect without needing its own timer. */
  startTwinkle(): void {
    if (this.animationFrameId !== null || !this.needsAnimationLoop()) return
    let lastTimeMs: number | undefined
    const tick = (timeMs: number) => {
      // Clamped, not raw (timeMs - lastTimeMs) — a backgrounded/throttled tab can deliver a huge gap
      // between two rAF callbacks (minimized window, tab switch, OS deprioritizing a hidden tab).
      // updatePrecipitation does per-frame Euler integration (position -= speed*dt); an unclamped
      // multi-second dt would move every particle's Y by more than the whole fall range in one step,
      // so all 400 would cross the ground threshold in that same frame and respawn simultaneously —
      // permanently locking the whole pool into one Y-synchronized sheet (found by testing hail,
      // whose fast fall speed made it reproduce fastest, but the same overshoot can hit any type).
      // MAX_ANIMATION_DT_SECONDS keeps a single step small enough that even hail's fastest cycle
      // can't be skipped over.
      const dtSeconds = lastTimeMs === undefined ? 0 : Math.min((timeMs - lastTimeMs) / 1000, MAX_ANIMATION_DT_SECONDS)
      lastTimeMs = timeMs
      this.updateTwinkle(timeMs / 1000)
      this.updateClouds(dtSeconds)
      this.updatePrecipitation(timeMs / 1000, dtSeconds)
      this.updateRain(dtSeconds)
      this.updateLightning(timeMs / 1000, dtSeconds)
      this.render()
      this.animationFrameId = requestAnimationFrame(tick)
    }
    this.animationFrameId = requestAnimationFrame(tick)
  }

  stopTwinkle(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
  }

  private needsAnimationLoop(): boolean {
    return (
      this.starTiers.length > 0 ||
      this.cloudClusters.length > 0 ||
      this.precipitationPoints !== undefined ||
      this.rainSystem !== undefined ||
      this.lightningArmed
    )
  }

  /** Starts/stops the shared RAF loop based on the combined "does anything need animating" state —
   * replaces buildStars' own direct startTwinkle()/stopTwinkle() calls, since stars becoming empty
   * must no longer unconditionally stop the loop if precipitation or an armed lightning schedule
   * still need it (and vice versa: precipitation/lightning turning off must not leave the loop
   * running for no reason if there are also no stars). */
  private syncAnimationLoop(): void {
    if (this.needsAnimationLoop()) this.startTwinkle()
    else this.stopTwinkle()
  }

  private buildSky(sun: HorizontalPosition): void {
    this.disposeMesh(this.skyMesh)
    const geometry = new SphereGeometry(SKY_RADIUS, 32, 16)
    const position = geometry.attributes.position
    const colors: number[] = []
    for (let i = 0; i < position.count; i++) {
      const { altitudeDeg, azimuthDeg } = cartesianToHorizontal(position.getX(i), position.getY(i), position.getZ(i))
      const color = skyColorForPosition(altitudeDeg, azimuthDeg, sun.azimuthDeg, sun.altitudeDeg)
      colors.push(color[0], color[1], color[2])
    }
    geometry.setAttribute("color", new Float32BufferAttribute(colors, 3))
    const material = new MeshBasicMaterial({ vertexColors: true, side: BackSide, fog: false })
    this.skyMesh = new Mesh(geometry, material)
    this.scene.add(this.skyMesh)
  }

  private buildGround(horizon: [number, number, number]): void {
    this.disposeMesh(this.groundMesh)
    const geometry = new CircleGeometry(GROUND_RADIUS, 48)
    const groundColor = new Color(horizon[0] * 0.35, horizon[1] * 0.35, horizon[2] * 0.35)
    const material = new MeshBasicMaterial({ color: groundColor, fog: true })
    this.groundMesh = new Mesh(geometry, material)
    this.groundMesh.rotation.x = -Math.PI / 2
    this.groundMesh.position.y = -0.5
    this.scene.add(this.groundMesh)
  }

  /** Places (or updates) a single self-illuminated, true-to-scale disc mesh, keyed by name so
   * repeated calls (Sun each update, or one call per tracked planet) reuse/replace the same slot
   * instead of accumulating duplicates. Also places a matching invisible hitArea (see
   * HOVER_HIT_RADIUS_SCALE) and, when the body is bright enough, a real glare halo (see setGlare)
   * so it stays practical to hover/click despite being small, and reads with the same dazzle a
   * human witness would actually perceive. `color` is tinted by the body's own current altitude
   * (see atmosphericTint) before being applied, so it warms near the horizon the same way a real
   * low Sun/bright planet does — independent of the sky's own ambient color. */
  private setBodyMesh(key: string, position: HorizontalPosition, visualRadius: number, color: Color, magnitude: number): void {
    this.disposeMesh(this.bodyMeshes.get(key))
    this.disposeHitArea(key)
    this.disposeGlare(key)
    if (position.altitudeDeg < BODY_HIDE_BELOW_DEG) {
      // Well below the horizon: skip building a mesh at all rather than pay for geometry that
      // the opaque ground plane would occlude anyway.
      this.bodyMeshes.delete(key)
      return
    }
    const { x, y, z } = horizontalToCartesian(position.altitudeDeg, position.azimuthDeg, BODY_PLACEMENT_RADIUS)
    const tint = atmosphericTint(position.altitudeDeg)
    const tintedColor = new Color(color.r * tint[0], color.g * tint[1], color.b * tint[2])
    const geometry = new SphereGeometry(visualRadius, 16, 16)
    const material = new MeshBasicMaterial({ color: tintedColor, fog: false })
    const mesh = new Mesh(geometry, material)
    mesh.position.set(x, y, z)
    this.scene.add(mesh)
    this.bodyMeshes.set(key, mesh)
    this.setHitArea(key, x, y, z, visualRadius)
    this.setGlare(key, x, y, z, magnitude, tintedColor)
  }

  /** The Moon needs a real crescent/gibbous *shape*, not just a dimmed flat color — a sphere lit
   * from an arbitrary angle can't produce that without a real light (deliberately out of scope,
   * see this class's own doc comment), so it's a camera-facing Sprite with a procedurally-drawn
   * phase texture instead (see createMoonPhaseTexture) — accurate for how the Moon actually looks
   * from Earth (its phase doesn't meaningfully depend on the camera's viewing angle around it).
   * `material.color` (which multiplies against the texture) carries the same altitude-based
   * atmospheric tint as setBodyMesh, so a low Moon reddens the same way a real moonrise does. */
  private setMoonMesh(position: HorizontalPosition & { phase: MoonPhase; magnitude: number }): void {
    const key = "moon"
    this.disposeMesh(this.bodyMeshes.get(key))
    this.disposeHitArea(key)
    this.disposeGlare(key)
    if (position.altitudeDeg < BODY_HIDE_BELOW_DEG) {
      this.bodyMeshes.delete(key)
      return
    }
    const { x, y, z } = horizontalToCartesian(position.altitudeDeg, position.azimuthDeg, BODY_PLACEMENT_RADIUS)
    const tint = atmosphericTint(position.altitudeDeg)
    const tintColor = new Color(tint[0], tint[1], tint[2])
    const material = new SpriteMaterial({ map: createMoonPhaseTexture(position.phase), color: tintColor, fog: false })
    const sprite = new Sprite(material)
    sprite.position.set(x, y, z)
    const diameter = SUN_MOON_VISUAL_RADIUS * 2
    sprite.scale.set(diameter, diameter, 1)
    this.scene.add(sprite)
    this.bodyMeshes.set(key, sprite)
    this.setHitArea(key, x, y, z, SUN_MOON_VISUAL_RADIUS)
    this.setGlare(key, x, y, z, position.magnitude, tintColor)
  }

  private setHitArea(key: string, x: number, y: number, z: number, visualRadius: number): void {
    const material = new SpriteMaterial({ transparent: true, opacity: 0, depthTest: false, depthWrite: false, fog: false })
    const hitArea = new Sprite(material)
    hitArea.position.set(x, y, z)
    const size = visualRadius * HOVER_HIT_RADIUS_SCALE
    hitArea.scale.set(size, size, 1)
    this.scene.add(hitArea)
    this.hitAreas.set(key, hitArea)
  }

  private disposeHitArea(key: string): void {
    const hitArea = this.hitAreas.get(key)
    if (!hitArea) return
    this.scene.remove(hitArea)
    hitArea.material.dispose()
    this.hitAreas.delete(key)
  }

  /** Builds (or removes) a body's additive-blended glare halo — see glareStrength's own doc
   * comment in skyColors.ts for why this is a realism concern, not an artistic one. A no-op
   * (removes any existing halo and returns) whenever the body isn't bright enough to produce real
   * glare at all, which is true for every ordinary star/planet. `color` is the body's own already
   * atmosphere-tinted color, so the halo warms near the horizon along with the disc itself. */
  private setGlare(key: string, x: number, y: number, z: number, magnitude: number, color: Color): void {
    this.disposeGlare(key)
    const strength = glareStrength(magnitude)
    if (strength <= 0) return
    const radius = glareRadius(strength)
    const material = new SpriteMaterial({
      map: getGlareTexture(),
      color,
      transparent: true,
      opacity: glareOpacity(strength),
      blending: AdditiveBlending,
      depthWrite: false,
      fog: false
    })
    const sprite = new Sprite(material)
    sprite.position.set(x, y, z)
    sprite.scale.set(radius * 2, radius * 2, 1)
    this.scene.add(sprite)
    this.glareSprites.set(key, sprite)
  }

  private disposeGlare(key: string): void {
    const sprite = this.glareSprites.get(key)
    if (!sprite) return
    this.scene.remove(sprite)
    sprite.material.dispose()
    this.glareSprites.delete(key)
  }

  private buildPlanets(planets: ReadonlyArray<ScenePlanet>): void {
    const seen = new Set<string>(["sun", "moon"])
    for (const planet of planets) {
      seen.add(planet.body)
      const brightness = magnitudeToBrightness(planet.magnitude)
      const scale = starColorScale(brightness)
      const baseColor = PLANET_COLORS[planet.body] ?? new Color(1, 1, 1)
      const color = new Color(baseColor.r * scale, baseColor.g * scale, baseColor.b * scale)
      const radius = PLANET_VISUAL_RADIUS * (0.5 + 0.5 * brightness)
      this.setBodyMesh(planet.body, planet.position, radius, color, planet.magnitude)
    }
    for (const key of [...this.bodyMeshes.keys()]) {
      if (!seen.has(key)) {
        this.disposeMesh(this.bodyMeshes.get(key))
        this.bodyMeshes.delete(key)
        this.disposeHitArea(key)
        this.disposeGlare(key)
      }
    }
  }

  /** Builds the real star field: filters the catalog to what's actually visible right now (above
   * the horizon, and brighter than visibleMagnitudeLimit's sky-glare threshold), transforms each
   * surviving star's fixed RA/dec to today's alt/az via equatorialToHorizontal, and buckets by
   * magnitudeToBrightness into the same size tiers/twinkle machinery as before — only the source
   * of positions/brightness changed, not how they're rendered. */
  private buildStars(stars: SceneAstronomy["stars"], sunAltitudeDeg: number): void {
    this.disposeStarTiers()
    if (!stars || stars.catalog.count === 0) {
      this.syncAnimationLoop() // stars gone, but precipitation/lightning may still need the loop
      return
    }
    const { catalog, date, observer } = stars
    const magnitudeLimit = visibleMagnitudeLimit(sunAltitudeDeg)
    // Seeds only the twinkle jitter now (real positions/brightness come from the catalog) — kept
    // deterministic so a star's twinkle phase doesn't jump around between renders.
    const jitterRandom = mulberry32(1337)

    const visibleStars: { x: number; y: number; z: number; brightness: number; phase: number; speedFactor: number }[] = []
    for (let i = 0; i < catalog.count; i++) {
      const mag = catalog.mag[i]
      if (mag > magnitudeLimit) continue
      const { altitudeDeg, azimuthDeg } = equatorialToHorizontal(catalog.ra[i], catalog.dec[i], date, observer)
      if (altitudeDeg < BELOW_HORIZON_CUTOFF_DEG) continue
      const { x, y, z } = horizontalToCartesian(altitudeDeg, azimuthDeg, STAR_RADIUS)
      visibleStars.push({
        x,
        y,
        z,
        brightness: magnitudeToBrightness(mag),
        phase: jitterRandom() * Math.PI * 2,
        speedFactor: 0.7 + jitterRandom() * 0.6
      })
    }

    this.starTiers = STAR_BRIGHTNESS_TIERS.map((tier, tierIndex) => {
      const tierStars = visibleStars.filter(star => starBrightnessTierIndex(star.brightness) === tierIndex)
      const positions = new Float32Array(tierStars.length * 3)
      const brightness = new Float32Array(tierStars.length)
      const phase = new Float32Array(tierStars.length)
      const speedFactor = new Float32Array(tierStars.length)
      tierStars.forEach((star, i) => {
        positions[i * 3] = star.x
        positions[i * 3 + 1] = star.y
        positions[i * 3 + 2] = star.z
        brightness[i] = star.brightness
        phase[i] = star.phase
        speedFactor[i] = star.speedFactor
      })
      const geometry = new BufferGeometry()
      geometry.setAttribute("position", new BufferAttribute(positions, 3))
      const colorAttribute = new BufferAttribute(new Float32Array(tierStars.length * 3), 3)
      geometry.setAttribute("color", colorAttribute)
      const material = new PointsMaterial({ vertexColors: true, size: tier.size, sizeAttenuation: false, fog: false })
      const points = new Points(geometry, material)
      this.scene.add(points)
      return { points, colorAttribute, brightness, phase, speedFactor }
    })
    // Populates real initial colors synchronously (single source of truth for the color
    // formula — see updateTwinkle) before the very first render(), which setAstronomy() calls
    // right after buildStars() returns — otherwise that first frame would show default black.
    this.updateTwinkle(0)
    this.startTwinkle()
  }

  /** Rewrites each star tier's per-vertex color buffer for the current time — the CPU-side
   * "twinkle": no shader needed at these star counts (a few thousand Math.sin calls and a
   * small buffer re-upload per frame, well under a millisecond of work). */
  private updateTwinkle(timeSeconds: number): void {
    for (const tier of this.starTiers) {
      const colors = tier.colorAttribute.array as Float32Array
      for (let i = 0; i < tier.brightness.length; i++) {
        const intensity = twinkleIntensity(
          tier.brightness[i],
          { phase: tier.phase[i], speedFactor: tier.speedFactor[i] },
          timeSeconds
        )
        const scale = starColorScale(tier.brightness[i]) * intensity
        colors[i * 3] = scale
        colors[i * 3 + 1] = scale
        colors[i * 3 + 2] = scale
      }
      tier.colorAttribute.needsUpdate = true
    }
  }

  /** Rebuilds the cloud cluster pool from scratch on every call (same "full rebuild, no dirty
   * tracking" style as buildSky/buildGround/buildStars) — cheap at CLOUD_POOL_SIZE=24 clusters.
   * Picks a genus (see cloudGenusForWeather) and a static base color — the old CLOUD_LIGHT_COLOR/
   * CLOUD_DARK_COLOR lerp by cloudDarkness, now computed once here since darkness doesn't change
   * without a new weather object (see setWeather's own doc comment). Sun-driven lighting is applied
   * separately and continuously by updateCloudLighting, called every setAstronomy tick. */
  private buildClouds(): void {
    this.disposeCloudSystem()
    const visibleCount = Math.round(this.weather.cloudCover * CLOUD_POOL_SIZE)
    if (visibleCount === 0) return
    const genus = cloudGenusForWeather(this.weather.cloudCover, this.weather.cloudDarkness)
    const darkness = this.weather.cloudDarkness
    const baseColor = new Color(
      CLOUD_LIGHT_COLOR[0] + (CLOUD_DARK_COLOR[0] - CLOUD_LIGHT_COLOR[0]) * darkness,
      CLOUD_LIGHT_COLOR[1] + (CLOUD_DARK_COLOR[1] - CLOUD_LIGHT_COLOR[1]) * darkness,
      CLOUD_LIGHT_COLOR[2] + (CLOUD_DARK_COLOR[2] - CLOUD_LIGHT_COLOR[2]) * darkness
    )
    const { material, uniforms } = buildCloudMaterial(baseColor, CLOUD_OPACITY)
    this.cloudMaterial = material
    this.cloudUniforms = uniforms
    const overcast = buildOvercastMaterial(baseColor, this.weather.cloudCover)
    this.overcastMaterial = overcast.material
    this.overcastUniforms = overcast.uniforms
    // Seeds real lighting immediately from the last known sun position — see lastSunPosition's own
    // comment for why this can't just wait for the next setAstronomy tick the way the old sprite
    // system's equivalent gap harmlessly could.
    if (this.lastSunPosition) this.updateCloudLighting(this.lastSunPosition, this.baseFogColor)
    const overcastGeometry = buildOvercastGeometry(CLOUD_RADIUS)
    this.overcastMesh = new Mesh(overcastGeometry, overcast.material)
    this.overcastMesh.renderOrder = CLOUD_OVERCAST_RENDER_ORDER
    this.scene.add(this.overcastMesh)
    const layouts = buildCloudClusterLayouts({
      poolSize: CLOUD_POOL_SIZE,
      visibleCount,
      genus,
      seed: 4242,
      clusterScale: CLOUD_CLUSTER_SCALE
    })
    const dummy = new Object3D()
    for (const layout of layouts) {
      // Per-cluster clone (not the shared base sphere) — carries this cluster's own aSeed
      // instanced attribute, see buildCloudInstanceGeometry's own doc comment.
      const geometry = buildCloudInstanceGeometry(layout)
      const mesh = new InstancedMesh(geometry, material, layout.particles.length)
      layout.particles.forEach((particle, i) => {
        dummy.position.set(particle.x, particle.y, particle.z)
        dummy.scale.set(particle.sx, particle.sy, particle.sz)
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)
      })
      mesh.instanceMatrix.needsUpdate = true
      const { x, y, z } = horizontalToCartesian(layout.baseAltitudeDeg, layout.baseAzimuthDeg, CLOUD_RADIUS)
      mesh.position.set(x, y, z)
      // Same depthTest:false/renderOrder layering reasoning as the old sprite system — see
      // buildCloudMaterial's own comment: at CLOUD_RADIUS=700 against a far plane of
      // SKY_RADIUS*1.2=1080, the depth buffer can't reliably beat the sky dome at 900, so draw
      // order does the layering instead.
      mesh.renderOrder = CLOUD_RENDER_ORDER
      this.scene.add(mesh)
      this.cloudClusters.push({ mesh, baseAltitudeDeg: layout.baseAltitudeDeg, baseAzimuthDeg: layout.baseAzimuthDeg })
    }
  }

  /** Cheap per-tick uniform refresh (no geometry rebuild) — updates only the time-varying lighting
   * terms (sun direction/color, ambient) on the one shared cloudMaterial, driven by the app's real
   * current sun position/atmosphericTint instead of a hardcoded time-of-day color table. Replaces
   * the old retintClouds' per-sprite color mutation — cheaper too, since every cluster now shares
   * one material (3 uniform writes total vs. up to 24 per-sprite color mutations). */
  private updateCloudLighting(sun: HorizontalPosition, groundColor: [number, number, number]): void {
    if (!this.cloudUniforms && !this.overcastUniforms) return
    const { x, y, z } = horizontalToCartesian(sun.altitudeDeg, sun.azimuthDeg, 1)
    const tint = atmosphericTint(sun.altitudeDeg)
    if (this.cloudUniforms) {
      this.cloudUniforms.sunDir.value.set(x, y, z)
      this.cloudUniforms.sunColor.value.setRGB(tint[0], 0.96 * tint[1], 0.88 * tint[2])
      this.cloudUniforms.ambientColor.value.setRGB(groundColor[0], groundColor[1], groundColor[2])
    }
    if (this.overcastUniforms) {
      this.overcastUniforms.sunDir.value.set(x, y, z)
      this.overcastUniforms.sunColor.value.setRGB(tint[0], 0.96 * tint[1], 0.88 * tint[2])
      this.overcastUniforms.ambientColor.value.setRGB(groundColor[0], groundColor[1], groundColor[2])
    }
  }

  /** cloudMaterial is ONE shared ShaderMaterial referenced by every cluster's InstancedMesh —
   * disposed once here, not once per cluster. Each cluster's own geometry IS disposed per-cluster
   * though: buildCloudInstanceGeometry clones the module-cached base sphere per cluster (to carry
   * its own aSeed instanced attribute), so unlike the shared base sphere itself (never disposed,
   * same convention as the old getCloudPuffTexture), those clones are this system's own to clean
   * up — skipping this would leak one GPU buffer set per cluster on every rebuild. */
  private disposeCloudSystem(): void {
    for (const cluster of this.cloudClusters) {
      this.scene.remove(cluster.mesh)
      cluster.mesh.geometry.dispose()
    }
    this.cloudMaterial?.dispose()
    this.cloudMaterial = undefined
    this.cloudUniforms = undefined
    this.cloudClusters = []
    this.cloudDriftDeg = 0
    if (this.overcastMesh) {
      this.scene.remove(this.overcastMesh)
      this.overcastMesh.geometry.dispose()
    }
    this.overcastMaterial?.dispose()
    this.overcastMesh = undefined
    this.overcastMaterial = undefined
    this.overcastUniforms = undefined
  }

  /** CPU Euler integration on an accumulated angle (not a GPU uTime accumulator like updateRain) —
   * needs the same MAX_ANIMATION_DT_SECONDS clamp as updatePrecipitation (see startTwinkle's own
   * comment). Rotates every cluster's root position azimuthally around the fixed CLOUD_RADIUS dome
   * rather than translating it — a flat translation (like WIND_DRIFT_M_PER_S) would carry a cluster
   * off its assigned radius within seconds at this scale, breaking both the "clouds stay inside
   * STAR_RADIUS/BODY_PLACEMENT_RADIUS" occlusion invariant and its own apparent size. */
  private updateClouds(dtSeconds: number): void {
    if (this.cloudClusters.length === 0) return
    const windRad = this.weather.windDirectionDeg * DEG_TO_RAD
    this.cloudDriftDeg += Math.sin(windRad) * this.weather.windSpeed * CLOUD_DRIFT_DEG_PER_SECOND_AT_MAX_WIND * dtSeconds
    for (const cluster of this.cloudClusters) {
      const { x, y, z } = horizontalToCartesian(cluster.baseAltitudeDeg, cluster.baseAzimuthDeg + this.cloudDriftDeg, CLOUD_RADIUS)
      cluster.mesh.position.set(x, y, z)
    }
  }

  /** Removes+disposes the current precipitation Points/geometry/material. Unlike disposeMesh, this
   * never touches the texture referenced by uniforms.uTexture — that's one of the shared/cached
   * procedural textures from getPrecipitationTexture, reused across every future buildPrecipitation()
   * call (including after a type switch, e.g. snow -> hail -> snow again); disposing it here would
   * leave the module-level cache holding a reference to an already-disposed GPU texture, and the next
   * getPrecipitationTexture(type) call would return that same dead object instead of rebuilding it,
   * rendering blank. (ShaderMaterial.dispose() itself never cascades into uniform textures anyway —
   * this is about never adding that behavior later, not undoing something dispose() already does.) */
  private disposePrecipitationPoints(): void {
    if (this.precipitationPoints) {
      this.scene.remove(this.precipitationPoints)
      this.precipitationPoints.geometry.dispose()
      ;(this.precipitationPoints.material as ShaderMaterial).dispose()
    }
    this.precipitationPoints = undefined
    this.precipitationPositions = undefined
    this.precipitationPhase = undefined
    this.precipitationSpeedJitter = undefined
    this.precipitationWobbleFreqJitter = undefined
    this.precipitationWobbleAmpJitter = undefined
    this.precipitationBounceRemaining = undefined
    this.precipitationBounceHeight = undefined
    this.precipitationBounceDuration = undefined
    this.precipitationBounceVelX = undefined
    this.precipitationBounceVelZ = undefined
    this.precipitationUniforms = undefined
  }

  /** Rebuilds whichever precipitation system the current weather.precipitationType needs — the GPU
   * RainSystem for "rain" (see buildRain), or the CPU Points pool below for "snow"/"hail". Always
   * disposes both first: switching type must tear down whichever one is currently live, not just
   * build the new one on top. No-ops (leaves both undefined) for "none", which is also what
   * needsAnimationLoop checks to know whether the shared RAF loop still needs to run at all. */
  private buildPrecipitation(): void {
    this.disposePrecipitationPoints()
    this.disposeRain()
    const type = this.weather.precipitationType
    if (type === "none") return
    if (type === "rain") {
      this.buildRain()
      return
    }
    const config = PRECIPITATION_CONFIG[type]
    const poolSize = config.poolSize
    const random = mulberry32(9001)
    const positions = new Float32Array(poolSize * 3)
    const phase = new Float32Array(poolSize)
    const speedJitter = new Float32Array(poolSize)
    const wobbleFreqJitter = new Float32Array(poolSize)
    const wobbleAmpJitter = new Float32Array(poolSize)
    const bounceRemaining = new Float32Array(poolSize) // starts at 0 — not bouncing
    // Not seeded/pre-filled — see precipitationBounceHeight/DurationJitter's own comment: these are
    // only ever written with a fresh Math.random() roll at the moment a bounce actually starts.
    const bounceHeight = new Float32Array(poolSize)
    const bounceDuration = new Float32Array(poolSize)
    const bounceVelX = new Float32Array(poolSize)
    const bounceVelZ = new Float32Array(poolSize)
    for (let i = 0; i < poolSize; i++) {
      const angle = random() * Math.PI * 2
      const radius = random() * config.radiusM
      positions[i * 3] = Math.cos(angle) * radius
      // Spread through the full height range on initial build (not all starting at the top) so it
      // doesn't visibly look like precipitation "just started" the instant it's turned on.
      positions[i * 3 + 1] = PRECIPITATION_RESPAWN_Y_MIN + random() * (config.topYM - PRECIPITATION_RESPAWN_Y_MIN)
      positions[i * 3 + 2] = Math.sin(angle) * radius
      phase[i] = random() * Math.PI * 2
      // ±30% around config.fallSpeedMPerS — see precipitationSpeedJitter's own comment.
      speedJitter[i] = 0.7 + random() * 0.6
      // See precipitationWobbleFreqJitter/AmpJitter's own comment on why phase alone wasn't enough.
      wobbleFreqJitter[i] = 0.6 + random() * 0.8
      wobbleAmpJitter[i] = 0.4 + random() * 1.2
    }
    const geometry = new BufferGeometry()
    geometry.setAttribute("position", new BufferAttribute(positions, 3))
    // Density (how many flakes/stones are visible), not opacity, is what should track intensity —
    // see PRECIPITATION_INTENSITY_COUNT_FLOOR's own comment. Positions/phase are still built and
    // updated for the full pool regardless (updatePrecipitation doesn't consult drawRange), so
    // raising intensity later just reveals more of an already-simulated pool, not newly-spawned ones.
    geometry.setDrawRange(0, precipitationVisibleCount(poolSize, this.weather.precipitationIntensity))
    // uScale approximates PointsMaterial's own internal sizeAttenuation scale factor (tied to the
    // real render target's pixel height) — not required to be bit-exact, this material replaced
    // PointsMaterial for the depth-cue effect below, not to change the already-tuned base size.
    const uniforms: CpuPrecipitationUniforms = {
      uSize: { value: config.size },
      uScale: { value: 0.5 * this.renderer.domElement.height },
      uOpacity: { value: config.opacity },
      // A shared/cached procedural texture per type (see getPrecipitationTexture) — snow a soft
      // fluffy puff, hail a small bright hard-ish drop — reads as real precipitation instead of a
      // uniform flat square.
      uColor: { value: config.color },
      uHazeColor: { value: new Color(...this.baseFogColor) },
      uTexture: { value: getPrecipitationTexture(type) },
      uNearFocusDistance: { value: PRECIPITATION_NEAR_FOCUS_DISTANCE_M },
      uHazeDistance: { value: config.radiusM * PRECIPITATION_HAZE_DISTANCE_RATIO }
    }
    const material = new ShaderMaterial({
      uniforms,
      vertexShader: CPU_PRECIPITATION_VERTEX_SHADER,
      fragmentShader: CPU_PRECIPITATION_FRAGMENT_SHADER,
      transparent: true,
      // depthWrite:false — a Points sprite's quad is always its full square footprint, even though
      // the texture itself is mostly transparent (a soft round puff/drop). With depth writing on, a
      // nearer flake's fully-opaque-in-the-depth-buffer square quad occludes farther flakes wherever
      // the squares overlap — including the texture's transparent corners — which reads as a hard
      // square silhouette cutting through flakes behind it. Turning depth writing off lets alpha
      // blending combine overlapping flakes/drops normally, the same fix already applied to clouds'
      // own depthTest (a related but distinct z-fighting issue, not this one — see buildClouds).
      depthWrite: false
    })
    this.precipitationUniforms = uniforms
    const points = new Points(geometry, material)
    this.scene.add(points)
    this.precipitationPoints = points
    this.precipitationPositions = positions
    this.precipitationPhase = phase
    this.precipitationSpeedJitter = speedJitter
    this.precipitationWobbleFreqJitter = wobbleFreqJitter
    this.precipitationWobbleAmpJitter = wobbleAmpJitter
    this.precipitationBounceRemaining = bounceRemaining
    this.precipitationBounceHeight = bounceHeight
    this.precipitationBounceDuration = bounceDuration
    this.precipitationBounceVelX = bounceVelX
    this.precipitationBounceVelZ = bounceVelZ
  }

  /** Falls each particle by its type's real terminal velocity and drifts it horizontally by wind —
   * see PRECIPITATION_CONFIG/WIND_DRIFT_M_PER_S. Respawns (not destroys/recreates) any particle that
   * reaches ground level or drifts outside the precipitation volume's radius, picking a fresh random
   * top-of-volume position — plain Math.random() here (unlike buildPrecipitation's seeded initial
   * layout) since respawn timing is already effectively random/non-reproducible unless the whole
   * scene time is frozen, so there's nothing determinism would actually buy here. Rain doesn't reach
   * this method at all — see updateRain, driven entirely by the GPU shader's own uTime uniform. */
  private updatePrecipitation(nowSeconds: number, dtSeconds: number): void {
    if (!this.precipitationPoints || !this.precipitationPositions || !this.precipitationPhase || !this.precipitationSpeedJitter) return
    // Keeps the haze target in sync with the sky's own current color — see updateRain's identical
    // comment. Refreshed even when dtSeconds<=0 (the very first tick), unlike the fall/drift work
    // below, since it's cheap and shouldn't wait an extra frame.
    this.precipitationUniforms?.uHazeColor.value.setRGB(...this.baseFogColor)
    if (dtSeconds <= 0) return
    const type = this.weather.precipitationType
    if (type === "none" || type === "rain") return
    const config = PRECIPITATION_CONFIG[type]
    const windRad = this.weather.windDirectionDeg * DEG_TO_RAD
    const driftX = Math.sin(windRad) * this.weather.windSpeed * config.driftSensitivity * WIND_DRIFT_M_PER_S
    const driftZ = -Math.cos(windRad) * this.weather.windSpeed * config.driftSensitivity * WIND_DRIFT_M_PER_S
    const positions = this.precipitationPositions
    const phase = this.precipitationPhase
    const speedJitter = this.precipitationSpeedJitter
    const wobbleFreqJitter = this.precipitationWobbleFreqJitter
    const wobbleAmpJitter = this.precipitationWobbleAmpJitter
    const bounceRemaining = this.precipitationBounceRemaining
    const bounceHeight = this.precipitationBounceHeight
    const bounceDuration = this.precipitationBounceDuration
    const bounceVelX = this.precipitationBounceVelX
    const bounceVelZ = this.precipitationBounceVelZ
    // Only snow flutters — real rain/hail are dense/heavy enough to fall in a near-straight line
    // relative to the wind, unlike a fluttering snowflake (see SNOW_WOBBLE_* constants' own comment).
    const wobbling = type === "snow" && wobbleFreqJitter && wobbleAmpJitter
    // Only hail bounces on impact — real snow settles/doesn't rebound, and real rain splashes rather
    // than bouncing (a genuinely different effect, not attempted here); a hard ice stone hitting the
    // ground is the one case where a real, visible rebound is physically expected.
    const bouncy = type === "hail" && bounceRemaining && bounceHeight && bounceDuration && bounceVelX && bounceVelZ
    for (let i = 0, p = 0; i < positions.length; i += 3, p++) {
      if (bouncy && bounceRemaining[p] > 0) {
        // Mid-hop: skip the normal gravity/respawn logic below entirely for this particle this
        // frame — the hop itself, not gravity, owns positions[i+1] until it finishes.
        bounceRemaining[p] -= dtSeconds
        if (bounceRemaining[p] <= 0) {
          // Hop finished — respawn at the top, identical to the non-bouncing respawn branch below.
          const angle = Math.random() * Math.PI * 2
          const radius = Math.sqrt(Math.random()) * config.radiusM
          positions[i] = Math.cos(angle) * radius
          positions[i + 1] = config.topYM
          positions[i + 2] = Math.sin(angle) * radius
          bounceRemaining[p] = 0
        } else {
          // A half-sine arc: 0 at the moment of impact, peaks at HAIL_BOUNCE_HEIGHT_M halfway
          // through, back to 0 (ground level) right as the hop ends — a small, quick rebound, not a
          // real multi-bounce decay (the user asked for "un léger rebond", not a physically
          // simulated bounce-and-settle). Horizontal drift/wrap keeps applying during the hop so it
          // doesn't look frozen in X/Z while airborne, PLUS a per-bounce scatter velocity
          // (bounceVelX/Z) so the stone visibly lands away from where it struck, not just
          // wind-drifted in place — see HAIL_BOUNCE_SCATTER_M_PER_S's own comment.
          const t = 1 - bounceRemaining[p] / bounceDuration[p]
          positions[i + 1] = PRECIPITATION_RESPAWN_Y_MIN + Math.sin(Math.PI * t) * bounceHeight[p]
          positions[i] = wrapPrecipitationAxis(positions[i] + (driftX + bounceVelX[p]) * dtSeconds, config.radiusM)
          positions[i + 2] = wrapPrecipitationAxis(positions[i + 2] + (driftZ + bounceVelZ[p]) * dtSeconds, config.radiusM)
        }
        continue
      }
      let wobbleX = 0
      let wobbleZ = 0
      if (wobbling) {
        // A quarter-turn phase offset between the X and Z terms traces a loose elliptical drift
        // instead of a flat side-to-side sway — real snowflakes flutter in both horizontal
        // directions, not just left-right, since they tumble rather than simply swinging like a
        // pendulum. Frequency/amplitude are ALSO per-particle (not just phase) — a phase offset alone
        // only shifts when in the cycle each flake is, every flake still traces the identical sine
        // shape, which read as suspiciously uniform ("they all do the same move").
        const freq = SNOW_WOBBLE_FREQUENCY_HZ * wobbleFreqJitter[p]
        const amp = SNOW_WOBBLE_AMPLITUDE_M_PER_S * wobbleAmpJitter[p]
        wobbleX = Math.sin(nowSeconds * freq * Math.PI * 2 + phase[p]) * amp
        wobbleZ = Math.sin(nowSeconds * freq * Math.PI * 2 + phase[p] + Math.PI / 2) * amp
      }
      positions[i] += (driftX + wobbleX) * dtSeconds
      // speedJitter (±30%) keeps flakes/stones from falling as one rigid, uniform-speed sheet —
      // see precipitationSpeedJitter's own comment.
      positions[i + 1] -= config.fallSpeedMPerS * speedJitter[p] * dtSeconds
      positions[i + 2] += (driftZ + wobbleZ) * dtSeconds
      // Wraps X/Z into a [-radiusM, radiusM] box every frame (a torus, not "exit the circle -> pick
      // a brand-new random spot") — a real distribution bug, not just a visual nitpick: under any
      // constant wind, every particle drifts the same direction, so ones that happen to spawn near
      // the upwind edge have to cross almost the entire volume before they'd ever exit, while ones
      // already near the downwind edge exit almost immediately. In steady state that produces a real
      // density GRADIENT toward the downwind side (particles spend more of their "lifetime" — time
      // between respawns — near the downwind edge, provable directly from the flux/continuity math,
      // not just intuition), which is exactly the "no longer evenly distributed under wind" bug a
      // user reported from a screenshot. A true wrap keeps density uniform regardless of wind speed
      // or direction — the same technique RainSystem.ts's own uWindOffset already uses (see its
      // `wrap` helper in updateRain), just applied per-particle here since this pool is CPU-driven.
      positions[i] = wrapPrecipitationAxis(positions[i], config.radiusM)
      positions[i + 2] = wrapPrecipitationAxis(positions[i + 2], config.radiusM)
      if (positions[i + 1] < PRECIPITATION_RESPAWN_Y_MIN) {
        if (bouncy) {
          // Starts the hop instead of respawning immediately — rolls a FRESH random height/duration
          // for THIS specific bounce (not a fixed per-particle-slot value like the other jitter
          // arrays), so two consecutive impacts from the same pool slot don't repeat the identical
          // hop — see precipitationBounceHeight/Duration's own comment. Clamp to ground level; the
          // branch above takes over next frame while bounceRemaining[p] > 0.
          // Widened after user feedback that a 0.5-1.5x spread wasn't visually distinguishable
          // between stones ("on dirait qu'ils tombent tous sur la même toile tendue") — real hail
          // impacts vary a lot more than that in practice depending on stone size/shape/how it lands;
          // this keeps the same average (still centered on the base constants, still "léger" overall)
          // but with individual bounces ranging from barely-there to clearly visible.
          bounceHeight[p] = HAIL_BOUNCE_HEIGHT_M * (0.2 + Math.random() * 1.6)
          bounceDuration[p] = HAIL_BOUNCE_DURATION_S * (0.5 + Math.random())
          bounceRemaining[p] = bounceDuration[p]
          // Scatter direction is a fresh random angle each impact (a stone doesn't always skid the
          // same way); scatter SPEED scales with this bounce's own rolled height (bounceHeight[p] /
          // HAIL_BOUNCE_HEIGHT_M is 1 at the "average" roll) so a bigger, higher-energy bounce also
          // travels visibly farther from the impact point — not an independent random roll.
          const scatterAngle = Math.random() * Math.PI * 2
          const scatterSpeed = HAIL_BOUNCE_SCATTER_M_PER_S * (bounceHeight[p] / HAIL_BOUNCE_HEIGHT_M)
          bounceVelX[p] = Math.cos(scatterAngle) * scatterSpeed
          bounceVelZ[p] = Math.sin(scatterAngle) * scatterSpeed
          positions[i + 1] = PRECIPITATION_RESPAWN_Y_MIN
          continue
        }
        // Ground-level respawn only resets Y and picks a fresh X/Z — unlike the old wind-driven
        // exit case above, falling to the ground isn't position-dependent (every particle falls at
        // a roughly constant rate regardless of where it is horizontally), so a fresh random pick
        // here introduces no directional bias the way the old circular respawn did.
        const angle = Math.random() * Math.PI * 2
        const radius = Math.sqrt(Math.random()) * config.radiusM
        positions[i] = Math.cos(angle) * radius
        positions[i + 1] = config.topYM
        positions[i + 2] = Math.sin(angle) * radius
      }
    }
    ;(this.precipitationPoints.geometry.attributes.position as BufferAttribute).needsUpdate = true
  }

  /** Builds the GPU shader-based rain system — see RainSystem.ts's own doc comment for the technique
   * and why rain gets a separate system from the CPU snow/hail pool above. */
  private buildRain(): void {
    // Real fallSpeedMPerS drives ONLY the streak-length illusion below (speedStreak) — the actual
    // fall/recycle animation runs at RAIN_OVERALL_SPEED, a deliberately unrelated, faster rate. See
    // RainSystemConfig.overallSpeed's own comment for why conflating the two made rain read as far
    // too slow, especially at low intensity.
    const fallSpeedMPerS = rainFallSpeedMPerS(this.weather.precipitationIntensity)
    this.rainSystem = buildRainSystem({
      count: RAIN_POOL_SIZE,
      radiusM: RAIN_RADIUS_M,
      heightM: RAIN_HEIGHT_M,
      bottomYM: RAIN_BOTTOM_Y_M,
      overallSpeed: RAIN_OVERALL_SPEED,
      color: RAIN_COLOR,
      opacity: 0.85,
      visibleCount: precipitationVisibleCount(RAIN_POOL_SIZE, this.weather.precipitationIntensity),
      speedStreak: speedStreakFactor(fallSpeedMPerS),
      pixelSize: RAIN_PIXEL_SIZE,
      seed: 9001,
      nearFocusDistanceM: PRECIPITATION_NEAR_FOCUS_DISTANCE_M,
      hazeDistanceM: RAIN_RADIUS_M * PRECIPITATION_HAZE_DISTANCE_RATIO,
      hazeColor: new Color(...this.baseFogColor)
    })
    this.rainLastVerticalFacing = -1 // forces the first updateRain call to (re)apply size/UV-squash
    this.scene.add(this.rainSystem.points)
    this.buildRainSplashes()
  }

  /** See RAIN_SPLASH_POOL_SIZE's own comment for why this is a separate CPU-driven pool rather than
   * tracking RainSystem's own GPU-computed drop positions. Structurally mirrors buildPrecipitation's
   * seeded-initial-layout + per-particle-jitter-arrays pattern, just for a much simpler "ring
   * growing/fading over its own lifetime" effect instead of falling/drifting. */
  private buildRainSplashes(): void {
    const random = mulberry32(4242)
    const positions = new Float32Array(RAIN_SPLASH_POOL_SIZE * 3)
    const life = new Float32Array(RAIN_SPLASH_POOL_SIZE)
    const duration = new Float32Array(RAIN_SPLASH_POOL_SIZE)
    const lifeFraction = new Float32Array(RAIN_SPLASH_POOL_SIZE)
    for (let p = 0; p < RAIN_SPLASH_POOL_SIZE; p++) {
      const angle = random() * Math.PI * 2
      const radius = Math.sqrt(random()) * RAIN_RADIUS_M
      positions[p * 3] = Math.cos(angle) * radius
      positions[p * 3 + 1] = RAIN_BOTTOM_Y_M
      positions[p * 3 + 2] = Math.sin(angle) * radius
      duration[p] = randomBetween(RAIN_SPLASH_MIN_DURATION_S, RAIN_SPLASH_MAX_DURATION_S)
      // Staggered start — a fresh random point within [0, duration) rather than every splash
      // starting at life=0 on the very first frame, so the whole pool doesn't visibly pulse in sync
      // the instant rain is turned on (same reasoning as buildPrecipitation's own "spread through
      // the full height range on initial build" comment).
      life[p] = random() * duration[p]
      lifeFraction[p] = life[p] / duration[p]
    }
    const geometry = new BufferGeometry()
    geometry.setAttribute("position", new BufferAttribute(positions, 3))
    const lifeAttribute = new BufferAttribute(lifeFraction, 1)
    geometry.setAttribute("aLife", lifeAttribute)
    // Same "density, not opacity, tracks intensity" convention as every other precipitation pool —
    // a downpour shows many concurrent splashes, a drizzle shows almost none.
    geometry.setDrawRange(0, precipitationVisibleCount(RAIN_SPLASH_POOL_SIZE, this.weather.precipitationIntensity))
    const material = new ShaderMaterial({
      uniforms: {
        uMaxSize: { value: RAIN_SPLASH_MAX_SIZE_M },
        uScale: { value: 0.5 * this.renderer.domElement.height },
        uColor: { value: RAIN_SPLASH_COLOR },
        uTexture: { value: getRainSplashTexture() }
      },
      vertexShader: RAIN_SPLASH_VERTEX_SHADER,
      fragmentShader: RAIN_SPLASH_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false // same overlapping-ripples reasoning as every other precipitation material
    })
    const points = new Points(geometry, material)
    this.scene.add(points)
    this.rainSplashSystem = { points, positions, life, duration, lifeAttribute }
  }

  /** Doesn't dispose material.map — RainSystem's own texture is shared/cached at module scope
   * (getRainStreakTexture), same reasoning as disposePrecipitationPoints not disposing its own
   * shared textures. */
  private disposeRain(): void {
    if (this.rainSystem) {
      this.scene.remove(this.rainSystem.points)
      this.rainSystem.points.geometry.dispose()
      ;(this.rainSystem.points.material as ShaderMaterial).dispose()
    }
    this.rainSystem = undefined
    this.disposeRainSplashes()
  }

  /** Same shared/cached-texture caveat as disposeRain — getRainSplashTexture is cached at module
   * scope, but ShaderMaterial.dispose() never cascades into its uniform textures regardless, so no
   * special-case skip is actually needed here (see disposeRain's own comment for the general rule). */
  private disposeRainSplashes(): void {
    if (this.rainSplashSystem) {
      this.scene.remove(this.rainSplashSystem.points)
      this.rainSplashSystem.points.geometry.dispose()
      ;(this.rainSplashSystem.points.material as ShaderMaterial).dispose()
    }
    this.rainSplashSystem = undefined
  }

  /** Advances the GPU rain system's own clock/wind offset and keeps its size/UV-squash uniforms
   * matched to how steeply the camera is currently looking up/down — see RainSystem's fragment
   * shader for why UV-squash matters, and the reference project's own identical technique (this
   * method is a near-direct port of its RainSystem.update()). Unlike updatePrecipitation, this does
   * no per-particle CPU work at all — the whole pool's fall/recycling is computed by the vertex
   * shader from uTime, so an arbitrarily large dt (e.g. after a throttled/backgrounded tab, see
   * startTwinkle's own dt-clamp comment) is inherently safe here: mod() is well-defined for any
   * input, there's no "if past threshold, reset" branch to desync. */
  private updateRain(dtSeconds: number): void {
    const rain = this.rainSystem
    if (!rain) return
    rain.uniforms.uTime.value += dtSeconds
    // Keeps the haze target in sync with the sky's own current color (baseFogColor changes every
    // setAstronomy tick, e.g. as a sighting's playhead moves through dusk) — cheap (one Color write),
    // so refreshed unconditionally every frame rather than only when setAstronomy itself ticks.
    rain.uniforms.uHazeColor.value.setRGB(...this.baseFogColor)

    const windRad = this.weather.windDirectionDeg * DEG_TO_RAD
    const driftX = Math.sin(windRad) * this.weather.windSpeed * WIND_DRIFT_M_PER_S
    const driftZ = -Math.cos(windRad) * this.weather.windSpeed * WIND_DRIFT_M_PER_S
    const halfWidth = RAIN_RADIUS_M
    const wrap = (value: number): number => (((value % (halfWidth * 2)) + halfWidth * 3) % (halfWidth * 2)) - halfWidth
    rain.uniforms.uWindOffset.value.set(wrap(rain.uniforms.uWindOffset.value.x + driftX * dtSeconds), wrap(rain.uniforms.uWindOffset.value.y + driftZ * dtSeconds))

    this.camera.getWorldDirection(this.rainCameraDirection)
    const verticalFacing = Math.abs(this.rainCameraDirection.y)
    if (Math.abs(verticalFacing - this.rainLastVerticalFacing) > 0.001) {
      this.rainLastVerticalFacing = verticalFacing
      const sizeScale = RAIN_MIN_ANGLE_SIZE_SCALE + (1 - RAIN_MIN_ANGLE_SIZE_SCALE) * (1 - verticalFacing)
      const uvSquash = RAIN_MIN_ANGLE_UV_SQUASH + (1 - RAIN_MIN_ANGLE_UV_SQUASH) * (1 - verticalFacing)
      rain.uniforms.uUvSquash.value = uvSquash
      rain.uniforms.uPixelSize.value = RAIN_PIXEL_SIZE * sizeScale * (0.5 + 0.5 * uvSquash)
    }
    this.updateRainSplashes(dtSeconds)
  }

  /** Ages every splash ring by dtSeconds and respawns any that finished their ripple at a fresh
   * random ground position with a freshly rolled duration (re-rolled per event, same "no two
   * splashes look identical" reasoning as hail's own bounceHeight/Duration) — plain Math.random()
   * here, not the seeded generator buildRainSplashes uses for the initial layout, since respawn
   * timing is already non-reproducible moment to moment. */
  private updateRainSplashes(dtSeconds: number): void {
    const splash = this.rainSplashSystem
    if (!splash || dtSeconds <= 0) return
    const { positions, life, duration, lifeAttribute } = splash
    const lifeFraction = lifeAttribute.array as Float32Array
    for (let i = 0, p = 0; i < positions.length; i += 3, p++) {
      life[p] += dtSeconds
      if (life[p] >= duration[p]) {
        const angle = Math.random() * Math.PI * 2
        const radius = Math.sqrt(Math.random()) * RAIN_RADIUS_M
        positions[i] = Math.cos(angle) * radius
        positions[i + 2] = Math.sin(angle) * radius
        duration[p] = randomBetween(RAIN_SPLASH_MIN_DURATION_S, RAIN_SPLASH_MAX_DURATION_S)
        life[p] = 0
      }
      lifeFraction[p] = life[p] / duration[p]
    }
    ;(splash.points.geometry.attributes.position as BufferAttribute).needsUpdate = true
    lifeAttribute.needsUpdate = true
  }

  /** Schedules/renders lightning flashes while armed (see setWeather's lightningArmed gate).
   * nowSeconds is the same requestAnimationFrame absolute clock startTwinkle's loop already runs
   * on. A flash pulses scene.fog's color toward white and back over LIGHTNING_FLASH_DURATION_S —
   * reusing fog (the renderer's only real "ambient light" proxy, see this class's own doc comment on
   * why there's no THREE.Light) rather than a screen-space overlay quad, so a flash reads as a real
   * momentary change in ambient light level, not a UI effect layered on top. */
  private updateLightning(nowSeconds: number, dtSeconds: number): void {
    if (!this.lightningArmed) return
    if (this.lightningFlashRemainingS > 0) {
      this.lightningFlashRemainingS = Math.max(0, this.lightningFlashRemainingS - dtSeconds)
      const t = this.lightningFlashRemainingS / LIGHTNING_FLASH_DURATION_S
      if (this.scene.fog) {
        const fog = this.scene.fog as Fog
        fog.color.setRGB(
          this.baseFogColor[0] + (1 - this.baseFogColor[0]) * t,
          this.baseFogColor[1] + (1 - this.baseFogColor[1]) * t,
          this.baseFogColor[2] + (1 - this.baseFogColor[2]) * t
        )
      }
      return
    }
    if (this.nextLightningAtS === null) {
      this.nextLightningAtS = nowSeconds + randomBetween(LIGHTNING_MIN_INTERVAL_S, LIGHTNING_MAX_INTERVAL_S)
      return
    }
    if (nowSeconds >= this.nextLightningAtS) {
      this.lightningFlashRemainingS = LIGHTNING_FLASH_DURATION_S
      this.nextLightningAtS = nowSeconds + randomBetween(LIGHTNING_MIN_INTERVAL_S, LIGHTNING_MAX_INTERVAL_S)
      this.onLightningFlash?.()
    }
  }

  private buildCompassLabels(): void {
    this.compassSprites = COMPASS_DIRECTIONS.map(({ azimuthDeg, label }) => {
      // depthTest/fog off: these are a fixed HUD-like reference, not part of the astronomically
      // positioned scene — they should read clearly against the sky/fog regardless of altitude.
      const material = new SpriteMaterial({ map: createCompassLabelTexture(label), depthTest: false, fog: false })
      const sprite = new Sprite(material)
      const { x, y, z } = horizontalToCartesian(0, azimuthDeg, COMPASS_PLACEMENT_RADIUS)
      sprite.position.set(x, y, z)
      sprite.scale.set(COMPASS_SPRITE_SIZE, COMPASS_SPRITE_SIZE, 1)
      sprite.renderOrder = COMPASS_RENDER_ORDER
      sprite.visible = this.compassHovered || this.compassForced
      this.scene.add(sprite)
      return sprite
    })
  }

  private disposeCompassLabels(): void {
    for (const sprite of this.compassSprites) {
      this.scene.remove(sprite)
      sprite.material.map?.dispose()
      sprite.material.dispose()
    }
    this.compassSprites = []
  }

  private disposeStarTiers(): void {
    for (const tier of this.starTiers) {
      this.disposeMesh(tier.points)
    }
    this.starTiers = []
  }

  /** Sprite has no `.geometry` of its own (three.js shares one internally, not ours to dispose) —
   * only its material (and, for Sprites we built with a per-instance texture, that texture) needs
   * cleanup. */
  private disposeMesh(object?: Mesh | Points | Sprite): void {
    if (!object) return
    this.scene.remove(object)
    if ("geometry" in object) {
      object.geometry.dispose()
    }
    const materials = object.material as Material | Material[]
    for (const material of Array.isArray(materials) ? materials : [materials]) {
      // Only terrainMesh's MeshBasicMaterial carries a `.map` today (the stitched imagery
      // CanvasTexture) — everything else disposeMesh handles is untextured — but checking
      // generically means a future textured mesh doesn't silently leak its texture here too.
      const map = (material as Material & { map?: Texture | null }).map
      if (map) map.dispose()
      material.dispose()
    }
  }
}

const DEG_TO_RAD = Math.PI / 180

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

/** Wraps `value` into `[-halfWidth, halfWidth]` (a torus, not a clamp) — see
 * updatePrecipitation's own comment on why this replaced a "pick a new random position on exit"
 * respawn for the CPU snow/hail pool's horizontal wind drift. Mirrors RainSystem.ts's own inline
 * `wrap` helper in updateRain, factored out here since two unrelated call sites (X and Z) both need
 * it in the same loop. */
function wrapPrecipitationAxis(value: number, halfWidth: number): number {
  return ((value % (halfWidth * 2)) + halfWidth * 3) % (halfWidth * 2) - halfWidth
}

let sharedSnowflakeTexture: CanvasTexture | undefined
let sharedHailDropTexture: CanvasTexture | undefined

/** Returns the shared, cached procedural texture for one CPU-driven precipitation type — see
 * buildPrecipitation for why each type gets a distinct shape rather than reusing one plain dot. Rain
 * isn't handled here — see RainSystem.ts's own getRainStreakTexture. */
function getPrecipitationTexture(type: CpuPrecipitationType): CanvasTexture {
  switch (type) {
    case "snow":
      return getSnowflakeTexture()
    case "hail":
      return getHailDropTexture()
  }
}

/** A single soft, fluffy radial blob — real snowflakes read as diffuse puffs at any distance a
 * witness would view them from, not sharp discs. */
function getSnowflakeTexture(): CanvasTexture {
  if (sharedSnowflakeTexture) return sharedSnowflakeTexture
  const size = 64
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext("2d")!
  const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  gradient.addColorStop(0, "rgba(255,255,255,0.95)")
  gradient.addColorStop(0.5, "rgba(255,255,255,0.55)")
  gradient.addColorStop(1, "rgba(255,255,255,0)")
  context.fillStyle = gradient
  context.fillRect(0, 0, size, size)
  sharedSnowflakeTexture = new CanvasTexture(canvas)
  return sharedSnowflakeTexture
}

/** A small, bright, comparatively hard-edged core — hail reads as a dense, glinting ice pellet, not
 * a soft blob like snow or a thin streak like rain. */
function getHailDropTexture(): CanvasTexture {
  if (sharedHailDropTexture) return sharedHailDropTexture
  const size = 64
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext("2d")!
  const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  gradient.addColorStop(0, "rgba(255,255,255,1)")
  gradient.addColorStop(0.55, "rgba(255,255,255,0.95)")
  gradient.addColorStop(0.8, "rgba(255,255,255,0.4)")
  gradient.addColorStop(1, "rgba(255,255,255,0)")
  context.fillStyle = gradient
  context.fillRect(0, 0, size, size)
  sharedHailDropTexture = new CanvasTexture(canvas)
  return sharedHailDropTexture
}

let sharedRainSplashTexture: CanvasTexture | undefined

/** A soft expanding ring, not a solid growing disc — a real raindrop impact briefly displaces a
 * thin circular ripple of water outward from the point of impact. Transparent at both the center
 * and the outer edge, opaque along a mid-radius band. */
function getRainSplashTexture(): CanvasTexture {
  if (sharedRainSplashTexture) return sharedRainSplashTexture
  const size = 64
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext("2d")!
  const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  gradient.addColorStop(0, "rgba(255,255,255,0)")
  gradient.addColorStop(0.4, "rgba(255,255,255,0)")
  gradient.addColorStop(0.6, "rgba(255,255,255,0.9)")
  gradient.addColorStop(0.8, "rgba(255,255,255,0.25)")
  gradient.addColorStop(1, "rgba(255,255,255,0)")
  context.fillStyle = gradient
  context.fillRect(0, 0, size, size)
  sharedRainSplashTexture = new CanvasTexture(canvas)
  return sharedRainSplashTexture
}

/** Vertex/fragment pair for the rain-splash ring pool (see RAIN_SPLASH_POOL_SIZE's own comment) —
 * each point's own size grows from 0 to uMaxSize over its lifetime (aLife: 0 at spawn -> 1 at the
 * end) while its opacity fades the opposite way, so a splash reads as a ring expanding outward and
 * dissolving, not a static dot that pops in and out. Reimplements the same basic size-attenuation
 * formula as CPU_PRECIPITATION_VERTEX_SHADER below (`size * scale / -mvPosition.z`), for the same
 * "don't fight Material.onBeforeCompile's undocumented internals" reason. */
const RAIN_SPLASH_VERTEX_SHADER = `
uniform float uMaxSize;
uniform float uScale;
attribute float aLife;
varying float vOpacity;

void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  float dist = max(1.0, -mvPosition.z);
  gl_PointSize = uMaxSize * aLife * uScale / dist;
  vOpacity = 1.0 - aLife;
  gl_Position = projectionMatrix * mvPosition;
}
`
const RAIN_SPLASH_FRAGMENT_SHADER = `
uniform vec3 uColor;
uniform sampler2D uTexture;
varying float vOpacity;

void main() {
  vec4 tex = texture2D(uTexture, gl_PointCoord);
  float alpha = tex.a * vOpacity;
  if (alpha < 0.01) discard;
  gl_FragColor = vec4(uColor, alpha);
}
`

/** Small custom ShaderMaterial for the CPU snow/hail pool — replaces plain PointsMaterial so it can
 * carry the same near-defocus/distance-haze depth cues as rain's own RainSystem.ts (see that
 * module's doc comment for the two physical effects this approximates and why not a full post-process
 * DOF pass). Positions are still owned and updated every frame by SceneRenderer's own CPU loop
 * (updatePrecipitation) — only the *material* changes here, not the simulation. Reimplements
 * PointsMaterial's basic size-attenuation formula (`size * scale / -mvPosition.z`) rather than
 * fighting `Material.onBeforeCompile`'s undocumented, version-fragile internal chunk names to inject
 * the same effect into the stock shader. */
const CPU_PRECIPITATION_VERTEX_SHADER = `
uniform float uSize;
uniform float uScale;
uniform float uNearFocusDistance;
uniform float uHazeDistance;
varying float vNearBlur;
varying float vHaze;

void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  float dist = max(1.0, -mvPosition.z);
  vNearBlur = clamp(1.0 - dist / uNearFocusDistance, 0.0, 1.0);
  vHaze = clamp(dist / uHazeDistance, 0.0, 1.0);
  // Real physical flake/stone size is uniform (uSize) — only perspective (1/dist) should make one
  // look bigger or smaller than another; a random per-particle size multiplier read as physically
  // wrong (a user directly caught it: darker/hazier — i.e. farther — particles could randomly end up
  // as big or bigger than closer, less-hazy ones, since the old random jitter had no relationship to
  // distance at all). Only vNearBlur adds to size — real optical defocus genuinely spreads a
  // too-close point into a bigger, softer disc; vHaze does NOT add size (real atmospheric haze dims
  // and desaturates a distant object, it doesn't enlarge it — see the fragment shader, which still
  // uses vHaze for color/opacity, just not size). max(1.0, ...) is a hard floor: the farthest
  // particles genuinely bottom out at a single pixel rather than shrinking to an invisible/flickery
  // fractional size.
  gl_PointSize = max(1.0, uSize * uScale / dist + vNearBlur * 12.0);
  gl_Position = projectionMatrix * mvPosition;
}
`
const CPU_PRECIPITATION_FRAGMENT_SHADER = `
precision mediump float;
uniform sampler2D uTexture;
uniform vec3 uColor;
uniform vec3 uHazeColor;
uniform float uOpacity;
varying float vNearBlur;
varying float vHaze;

void main() {
  vec4 tex = texture2D(uTexture, gl_PointCoord);
  vec3 color = mix(uColor, uHazeColor, vHaze * 0.55);
  float blur = max(vNearBlur, vHaze);
  gl_FragColor = vec4(color, tex.a * uOpacity * (1.0 - blur * 0.5));
}
`

/** State for the rain ground-splash pool (see RAIN_SPLASH_POOL_SIZE's own comment) — positions is
 * the same Float32Array backing the geometry's "position" attribute (X/Z respawn on impact, Y is
 * fixed at ground level); life/duration are this-splash's own elapsed/total seconds (life resets
 * to 0 and duration is re-rolled every respawn); lifeAttribute is the geometry's own "aLife"
 * BufferAttribute, whose backing array updateRainSplashes writes life[p]/duration[p] into each
 * frame. */
interface RainSplashSystem {
  readonly points: Points
  readonly positions: Float32Array
  readonly life: Float32Array
  readonly duration: Float32Array
  readonly lifeAttribute: BufferAttribute
}

interface CpuPrecipitationUniforms {
  [uniform: string]: { value: unknown }
  uSize: { value: number }
  uScale: { value: number }
  uOpacity: { value: number }
  uColor: { value: Color }
  uHazeColor: { value: Color }
  uTexture: { value: CanvasTexture }
  uNearFocusDistance: { value: number }
  uHazeDistance: { value: number }
}

let sharedGlareTexture: CanvasTexture | undefined

/** One shared soft radial-gradient sprite texture for every body's glare halo (see setGlare) —
 * unlike the Moon's phase texture, its drawn content never differs between bodies/instants, only
 * the SpriteMaterial's own color/scale/opacity do, so a single cached canvas suffices instead of
 * generating one per body per update. */
function getGlareTexture(): CanvasTexture {
  if (sharedGlareTexture) return sharedGlareTexture
  const size = 128
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext("2d")!
  const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  gradient.addColorStop(0, "rgba(255,255,255,1)")
  gradient.addColorStop(0.4, "rgba(255,255,255,0.35)")
  gradient.addColorStop(1, "rgba(255,255,255,0)")
  context.fillStyle = gradient
  context.fillRect(0, 0, size, size)
  sharedGlareTexture = new CanvasTexture(canvas)
  return sharedGlareTexture
}

/**
 * Draws the Moon's real crescent/gibbous silhouette (not just a dimmed flat disc) using the
 * standard two-arc terminator technique: a fixed half-circle for the permanently-facing-the-
 * illuminated-side edge, and an ellipse (whose width tracks illuminatedFraction) for the other,
 * curved edge — concave for a crescent (illuminatedFraction < 0.5), convex for a gibbous (> 0.5).
 * `phaseFraction < 0.5` (waxing, i.e. growing toward full) picks which side is lit; real accuracy
 * of *which compass direction* the bright limb faces (a function of the Sun-Moon-observer
 * geometry, not just waxing/waning) is a further-out follow-up, not attempted here.
 */
function createMoonPhaseTexture(phase: MoonPhase): CanvasTexture {
  const size = 128
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext("2d")!
  const r = size / 2 - 2
  const cx = size / 2
  const cy = size / 2
  const DARK = "#2e2b26"
  const LIGHT = "#f4f1e2"

  context.fillStyle = DARK
  context.beginPath()
  context.arc(cx, cy, r, 0, Math.PI * 2)
  context.fill()

  const k = clamp(phase.illuminatedFraction, 0, 1)
  const waxing = phase.phaseFraction < 0.5
  const rx = r * Math.abs(1 - 2 * k)
  const crescent = k < 0.5

  context.save()
  context.beginPath()
  context.arc(cx, cy, r, 0, Math.PI * 2)
  context.clip()
  context.fillStyle = LIGHT
  context.beginPath()
  if (waxing) {
    context.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2, false)
    context.ellipse(cx, cy, rx, r, 0, Math.PI / 2, -Math.PI / 2, crescent)
  } else {
    context.arc(cx, cy, r, Math.PI / 2, -Math.PI / 2, false)
    context.ellipse(cx, cy, rx, r, 0, -Math.PI / 2, Math.PI / 2, crescent)
  }
  context.fill()
  context.restore()

  return new CanvasTexture(canvas)
}

/** Procedurally draws a compass direction label (e.g. "NE") onto a small canvas, the same way
 * everything else in this renderer is generated rather than loaded from an image/font asset. A
 * translucent dark disc behind the text keeps it legible against both a bright day sky and a dark
 * night one. */
function createCompassLabelTexture(label: string): CanvasTexture {
  const canvas = document.createElement("canvas")
  canvas.width = 128
  canvas.height = 128
  const context = canvas.getContext("2d")!
  context.fillStyle = "rgba(0, 0, 0, 0.55)"
  context.beginPath()
  context.arc(64, 64, 60, 0, Math.PI * 2)
  context.fill()
  context.fillStyle = "#ffffff"
  context.font = "bold 52px sans-serif"
  context.textAlign = "center"
  context.textBaseline = "middle"
  context.fillText(label, 64, 68)
  return new CanvasTexture(canvas)
}

/** Small deterministic PRNG (no dependency) so star twinkle jitter looks the same across re-renders. */
function mulberry32(seed: number): () => number {
  let a = seed
  return function random(): number {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
