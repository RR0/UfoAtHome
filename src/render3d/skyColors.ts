/**
 * Pure (no Three.js/WebGL dependency) sky color interpolation, so it's
 * unit-testable without a real GPU context — see SceneRenderer.ts for the
 * actual Three.js sky dome built from these colors.
 */
export type RgbColor = [number, number, number]

const DEG_TO_RAD = Math.PI / 180
const RAD_TO_DEG = 180 / Math.PI

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

interface SkyColorStop {
  altitudeDeg: number
  zenith: RgbColor
  horizon: RgbColor
}

/**
 * Keyframe stops from deep night to midday, driven only by the sun's altitude — this alone
 * decides overall sky darkness/warmth (and is still what buildGround() uses for the ground's own
 * flat, non-directional tint). Where on the horizon a dawn/dusk glow should actually sit is
 * layered on top by skyColorForPosition(), which also takes the sun's azimuth.
 *
 * The 8deg/25deg stops (as opposed to a single stop around 10deg, an earlier version of this
 * table) deliberately stretch the golden-hour-to-neutral-day transition out further: with only a
 * 0deg->10deg jump, a sun at ~9-11deg (e.g. shortly after sunrise/before sunset, not literally at
 * the horizon) already rendered nearly indistinguishable from full midday — real cases at those
 * altitudes (Valensole ~9deg, Socorro ~11deg in this project's own demo data) showed no visible
 * dawn/dusk character at all until this was widened.
 */
const STOPS: SkyColorStop[] = [
  { altitudeDeg: -90, zenith: [0.0, 0.0, 0.02], horizon: [0.01, 0.01, 0.03] },
  { altitudeDeg: -18, zenith: [0.01, 0.01, 0.05], horizon: [0.03, 0.02, 0.08] },
  { altitudeDeg: -6, zenith: [0.02, 0.03, 0.12], horizon: [0.25, 0.12, 0.15] },
  { altitudeDeg: 0, zenith: [0.05, 0.1, 0.35], horizon: [0.9, 0.55, 0.35] },
  { altitudeDeg: 8, zenith: [0.1, 0.22, 0.55], horizon: [0.82, 0.6, 0.45] },
  { altitudeDeg: 25, zenith: [0.15, 0.38, 0.78], horizon: [0.76, 0.82, 0.91] },
  { altitudeDeg: 90, zenith: [0.15, 0.45, 0.9], horizon: [0.7, 0.8, 0.95] }
]

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function lerpColor(a: RgbColor, b: RgbColor, t: number): RgbColor {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]
}

export interface SkyColors {
  zenith: RgbColor
  horizon: RgbColor
}

export function skyColorsForAltitude(altitudeDeg: number): SkyColors {
  const clamped = Math.max(STOPS[0].altitudeDeg, Math.min(STOPS[STOPS.length - 1].altitudeDeg, altitudeDeg))
  for (let i = 0; i < STOPS.length - 1; i++) {
    const a = STOPS[i]
    const b = STOPS[i + 1]
    if (clamped >= a.altitudeDeg && clamped <= b.altitudeDeg) {
      const t = (clamped - a.altitudeDeg) / (b.altitudeDeg - a.altitudeDeg)
      return { zenith: lerpColor(a.zenith, b.zenith, t), horizon: lerpColor(a.horizon, b.horizon, t) }
    }
  }
  const last = STOPS[STOPS.length - 1]
  return { zenith: last.zenith, horizon: last.horizon }
}

/** Where astronomical twilight ends and the sky is as dark as it will get. */
const ASTRONOMICAL_TWILIGHT_DEG = -18
/** Brighter than Venus ever gets — effectively "nothing" by day. */
const DAYLIGHT_MAG_LIMIT = -4
/**
 * How sharply the sky darkens through twilight.
 *
 * The number that turns a straight line into the curve the sky actually follows, and it was
 * measured against the standard twilight definitions rather than chosen: at the end of civil
 * twilight (-6 degrees) an unaided eye reaches about magnitude 1 to 2, at the end of nautical
 * twilight (-12) about 5, and at -18 the full 6.5. An exponent of 1.8 passes through all three.
 */
const TWILIGHT_FALLOFF = 1.8

/**
 * The faintest real apparent magnitude visible given the sun's altitude — replaces the old
 * step-function starCountForAltitude() now that stars come from a real catalog with real
 * magnitudes to filter by, instead of an arbitrary point count. Daylight washes out everything;
 * the catalog's own naked-eye cutoff (7.5) is only reached once the sky is properly dark
 * (astronomical twilight ends, sun at -18deg); in between, the limit relaxes continuously.
 *
 * CURVED, not straight, and the difference is two magnitudes in the middle of twilight — which is
 * to say most of the sky. A real sky darkens fast just after sunset and then creeps: by the end of
 * nautical twilight it is already within a magnitude and a half of its final depth. Interpolating
 * linearly between the two ends sags badly in between — it put the limit at 1.8 with the sun ten
 * degrees down, where an eye really reaches about 4, so a scene at dusk showed twenty-nine stars
 * instead of several hundred and read as a black sky with a few dots in it. Found because a comet
 * at magnitude -0.8 sailed over the sagging limit while the whole star field fell under it.
 */
export function visibleMagnitudeLimit(sunAltitudeDeg: number): number {
  if (sunAltitudeDeg <= ASTRONOMICAL_TWILIGHT_DEG) return NAKED_EYE_MAG_LIMIT
  if (sunAltitudeDeg >= 0) return DAYLIGHT_MAG_LIMIT
  // 0 at sunset, 1 at the end of astronomical twilight.
  const darkness = sunAltitudeDeg / ASTRONOMICAL_TWILIGHT_DEG
  return NAKED_EYE_MAG_LIMIT - (NAKED_EYE_MAG_LIMIT - DAYLIGHT_MAG_LIMIT) * (1 - darkness) ** TWILIGHT_FALLOFF
}

const BRIGHT_MAG_REFERENCE = -1.5 // brighter than any real star (Sirius, -1.46) maps to brightness 1
/** What an unaided eye actually reaches on a genuinely dark night. The star catalog itself goes to
 * 7.5, which is binocular territory: rendering all of it put thousands of stars in the sky that no
 * witness ever saw, and made every night scene read as an observatory photograph rather than as a
 * testimony. Also the magnitude that maps to brightness 0 below — the two must agree, or the
 * faintest star still drawn would be drawn at something other than the faintest brightness. */
const NAKED_EYE_MAG_LIMIT = 6.5
const FAINT_MAG_REFERENCE = NAKED_EYE_MAG_LIMIT

/** Bends the linear magnitude ramp so the faint majority stays faint instead of crowding toward
 * mid-grey — the eye's own response to a night sky, where a handful of stars dominate and the rest
 * are barely there. */
const BRIGHTNESS_GAMMA = 1.6

/**
 * Real apparent magnitude -> render brightness in [0,1].
 *
 * Linear in MAGNITUDE, not in flux: magnitude is already a logarithmic scale, and it is the one
 * the eye works on. Interpolating flux instead — as this did — collapses the entire naked-eye sky
 * into the bottom of the range, since Sirius outshines a magnitude-6 star by a factor of a
 * thousand: every star from magnitude 2 to 6.5 came out between 0.04 and 0.0004, which
 * starColorScale's floor then rendered as one indistinguishable grey. All of them looked the same,
 * because they very nearly were.
 */
export function magnitudeToBrightness(mag: number): number {
  const ramp = (FAINT_MAG_REFERENCE - mag) / (FAINT_MAG_REFERENCE - BRIGHT_MAG_REFERENCE)
  return clamp(ramp, 0, 1) ** BRIGHTNESS_GAMMA
}

/**
 * Spherical (altitude/azimuth, as used throughout this module and SceneRenderer's sky
 * dome/star/sun/moon/planet placement) <-> Cartesian conversion, sharing one fixed convention:
 * azimuth 0deg (north) points down -Z, azimuth increases clockwise (90deg/east -> +X), and +Y is
 * up. This is the single source of truth for that mapping — every mesh placed on the sky sphere
 * and every per-vertex sky-dome color lookup must agree on it, or objects/colors would end up in
 * the wrong compass direction relative to each other.
 */
export function horizontalToCartesian(altitudeDeg: number, azimuthDeg: number, radius: number): { x: number; y: number; z: number } {
  const altitudeRad = altitudeDeg * DEG_TO_RAD
  const azimuthRad = azimuthDeg * DEG_TO_RAD
  const horizontalRadius = radius * Math.cos(altitudeRad)
  return {
    x: horizontalRadius * Math.sin(azimuthRad),
    y: radius * Math.sin(altitudeRad),
    z: -horizontalRadius * Math.cos(azimuthRad)
  }
}

export function cartesianToHorizontal(x: number, y: number, z: number): { altitudeDeg: number; azimuthDeg: number } {
  const radius = Math.sqrt(x * x + y * y + z * z)
  const altitudeDeg = radius === 0 ? 0 : Math.asin(clamp(y / radius, -1, 1)) * RAD_TO_DEG
  const azimuthDeg = (Math.atan2(x, -z) * RAD_TO_DEG + 360) % 360
  return { altitudeDeg, azimuthDeg }
}

function angularAzimuthDistance(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360
  return diff > 180 ? 360 - diff : diff
}

/**
 * How strongly a point at vertexAzimuthDeg should carry the sun's horizon glow: 1 right at the
 * sun's own azimuth, fading out by 90deg away, and only relevant when the sun itself is near the
 * horizon (dawn/dusk) — negligible at full day or full night, when skyColorsForAltitude's own
 * horizon stop is already appropriately bright/dark on its own.
 */
function sunGlowWeight(vertexAzimuthDeg: number, sunAzimuthDeg: number, sunAltitudeDeg: number): number {
  const azimuthFalloff = Math.max(0, 1 - angularAzimuthDistance(vertexAzimuthDeg, sunAzimuthDeg) / 90)
  const twilightWindow = Math.max(0, 1 - Math.abs(sunAltitudeDeg) / 18)
  return azimuthFalloff * twilightWindow
}

/**
 * The final render color for one point of the sky dome at (altitudeDeg, vertexAzimuthDeg), given
 * the sun's own real position. Layers a dawn/dusk glow — concentrated near the sun's actual
 * compass direction rather than spread uniformly around the whole horizon like the plain
 * altitude-only gradient — on top of skyColorsForAltitude's base zenith/horizon blend.
 */
export function skyColorForPosition(altitudeDeg: number, vertexAzimuthDeg: number, sunAzimuthDeg: number, sunAltitudeDeg: number): RgbColor {
  // The sun's altitude picks which zenith/horizon color pair is "in effect" right now (how
  // dark/warm the whole sky is); the vertex's own altitude only decides where between that pair
  // this particular point sits (see heightFraction below) — mixing the two up here would make
  // every point near the zenith render as if it were always daytime, regardless of the real sun.
  const { zenith, horizon } = skyColorsForAltitude(sunAltitudeDeg)
  const heightFraction = clamp((altitudeDeg + 90) / 180, 0, 1)
  const base = lerpColor(horizon, zenith, heightFraction)
  const glow = sunGlowWeight(vertexAzimuthDeg, sunAzimuthDeg, sunAltitudeDeg)
  if (glow <= 0) return base
  return lerpColor(base, horizon, glow * (1 - heightFraction) * 0.8)
}

/** How much a star's rendered color is floored above black at a given brightness — keeps even
 * the dimmest star in a tier faintly visible instead of literally invisible. */
export function starColorScale(brightness: number): number {
  // A low floor, not the old 0.3: that lifted the faintest star to nearly a third of full white,
  // which is most of why the field read as uniform. Kept above zero all the same, so a star at the
  // visibility limit is dim rather than absent.
  return 0.12 + 0.88 * brightness
}

/**
 * Real ocular/lens glare — the veiling halo/bloom a human eye or camera perceives around a very
 * bright light source, distinct from the source's own tiny true-scale disc (see
 * SUN_MOON_VISUAL_RADIUS's own doc comment in SceneRenderer.ts on why the disc itself must stay
 * true-to-scale). This *is* part of realistic rendering, not an artistic legibility boost: a
 * human witness genuinely can't look near the Sun without a real perceived glow around it, and
 * omitting that would under-render what a witness actually saw.
 *
 * Driven purely by the body's own real apparent magnitude (already computed for every tracked
 * body — see ScenePlanet.magnitude, and Sun/Moon get the same treatment) rather than any
 * per-body special-casing, so it falls out "for free" that only the Sun (always), the Moon
 * (mainly near full), and Venus at its historical brightest (barely) ever show any glare — an
 * ordinary planet or star never does, matching real human perception. Threshold picked just
 * brighter than Venus's historical max apparent magnitude (~-4.9).
 */
const GLARE_THRESHOLD_MAG = -4

export function glareStrength(magnitude: number): number {
  return Math.max(0, GLARE_THRESHOLD_MAG - magnitude)
}

/** World-space radius of a glare halo sprite, in the same units as BODY_PLACEMENT_RADIUS/
 * visualRadius. sqrt-compressed (not linear in strength) so the Sun's halo — strength ~23 vs. a
 * full Moon's ~9 — reads as dramatically brighter/wider without literally being ~2.5x the
 * Moon's, and capped so it never swallows a large fraction of the visible sky. */
const GLARE_RADIUS_PER_SQRT_STRENGTH = 6
const GLARE_MAX_RADIUS = 60

export function glareRadius(strength: number): number {
  return Math.min(GLARE_MAX_RADIUS, GLARE_RADIUS_PER_SQRT_STRENGTH * Math.sqrt(strength))
}

/** Opacity of the additive-blended glare sprite — saturates quickly (by strength ~3, i.e. just
 * past Venus-bright) so the Sun and a full Moon both read as "fully glowing" rather than the
 * Sun's much larger `strength` also making it implausibly more opaque; their very different
 * radii (see glareRadius) already carry most of the visual distinction between them. */
const GLARE_OPACITY_SATURATION_STRENGTH = 3
const GLARE_MAX_OPACITY = 0.55

export function glareOpacity(strength: number): number {
  return GLARE_MAX_OPACITY * clamp(strength / GLARE_OPACITY_SATURATION_STRENGTH, 0, 1)
}

/**
 * Approximate relative air mass (atmosphere thickness a body's light actually travels through)
 * for a given altitude — 1 at the zenith, ~38 right at the horizon — via the standard Kasten-
 * Young (1989) formula, which (unlike the naive 1/sin(altitude)) stays finite and realistic all
 * the way down to the horizon instead of diverging to infinity. Clamped below -4deg since bodies
 * aren't rendered past that altitude anyway (see BODY_HIDE_BELOW_DEG).
 */
function airMassApprox(altitudeDeg: number): number {
  const alt = Math.max(altitudeDeg, -4)
  const denominator = Math.sin(alt * DEG_TO_RAD) + 0.50572 * Math.pow(alt + 6.07995, -1.6364)
  return clamp(1 / denominator, 1, 40)
}

/** Real Rayleigh scattering removes far more blue than red light from a body's own light the more
 * atmosphere it travels through (the same physics behind skyColorsForAltitude's warm horizon
 * stops) — this is why the Sun/Moon/a bright planet visibly redden near the horizon and read as
 * white/neutral high overhead, independent of the sky's own ambient color. Returns a multiplicative
 * RGB tint (1,1,1 at the zenith; only relative green/blue loss, not an overall darkening — a real
 * low Sun/Moon stays visually bright, it just shifts warm) meant to be multiplied against a body's
 * own base disc/glare color. Coefficients tuned so a body right at the horizon reads as a warm
 * orange (~1, 0.44, 0.10) fading to essentially neutral by ~25-30deg — matching this project's own
 * demo cases (Valensole/Socorro at ~9-11deg still read clearly warm; Wilcox at ~50deg reads neutral).
 */
const ATMOSPHERIC_TINT_GREEN_COEFF = 0.022
const ATMOSPHERIC_TINT_BLUE_COEFF = 0.062

export function atmosphericTint(altitudeDeg: number): RgbColor {
  const extraAirMass = airMassApprox(altitudeDeg) - 1
  return [1, Math.exp(-ATMOSPHERIC_TINT_GREEN_COEFF * extraAirMass), Math.exp(-ATMOSPHERIC_TINT_BLUE_COEFF * extraAirMass)]
}

export interface StarBrightnessTier {
  readonly maxBrightness: number
  readonly size: number
}

/**
 * Discrete rendering buckets for stars, by their magnitudeToBrightness() value — see
 * SceneRenderer.ts's buildStars(), which needs one Points/PointsMaterial per tier since
 * three.js's PointsMaterial has no per-vertex size without a custom shader. Brightness still
 * varies continuously *within* a tier via per-vertex color (see starColorScale).
 */
export const STAR_BRIGHTNESS_TIERS: StarBrightnessTier[] = [
  { maxBrightness: 0.35, size: 1.2 },
  { maxBrightness: 0.7, size: 2.0 },
  { maxBrightness: Infinity, size: 3.2 }
]

export function starBrightnessTierIndex(brightness: number): number {
  return STAR_BRIGHTNESS_TIERS.findIndex(tier => brightness <= tier.maxBrightness)
}

const TWINKLE_BASE_AMPLITUDE = 0.25
const TWINKLE_DIM_DAMPING = 0.3 // dim stars still twinkle, just at 30% of a bright star's swing
const TWINKLE_BASE_SPEED = 2.2 // rad/s at speedFactor = 1 (~2.9s per cycle)

export interface TwinklePhase {
  /** Random per-star offset in [0, 2π) so the whole field doesn't pulse in lockstep. */
  phase: number
  /** Random per-star jitter, e.g. in [0.7, 1.3], for the same lockstep-avoidance reason. */
  speedFactor: number
}

/**
 * Instantaneous [0,1] brightness multiplier for a star mid-twinkle. `baseBrightness` dims the
 * oscillation itself (not just the resting color) — real atmospheric scintillation is far more
 * visible on bright stars than faint ones. Clamped because the raw sine swing can dip below 0
 * or (harmlessly, since stars are grayscale) push past 1.
 */
export function twinkleIntensity(baseBrightness: number, { phase, speedFactor }: TwinklePhase, timeSeconds: number): number {
  const amplitude = TWINKLE_BASE_AMPLITUDE * (TWINKLE_DIM_DAMPING + (1 - TWINKLE_DIM_DAMPING) * baseBrightness)
  const raw = 1 + amplitude * Math.sin(timeSeconds * TWINKLE_BASE_SPEED * speedFactor + phase)
  return Math.min(1, Math.max(0, raw))
}
