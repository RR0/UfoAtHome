/**
 * Pure (no Three.js/WebGL dependency) sky color interpolation, so it's
 * unit-testable without a real GPU context — see SceneRenderer.ts for the
 * actual Three.js sky dome built from these colors.
 */
export type RgbColor = [number, number, number]

interface SkyColorStop {
  altitudeDeg: number
  zenith: RgbColor
  horizon: RgbColor
}

/**
 * Keyframe stops from deep night to midday, driven only by the sun's
 * altitude (see engine/astronomy/SunPosition.ts) — not azimuth, since the
 * witness's viewing direction isn't part of the data model yet (a future
 * refinement), so this can't yet position where on the horizon the glow
 * should sit, only how dark/light the sky as a whole should be.
 */
const STOPS: SkyColorStop[] = [
  { altitudeDeg: -90, zenith: [0.0, 0.0, 0.02], horizon: [0.01, 0.01, 0.03] },
  { altitudeDeg: -18, zenith: [0.01, 0.01, 0.05], horizon: [0.03, 0.02, 0.08] },
  { altitudeDeg: -6, zenith: [0.02, 0.03, 0.12], horizon: [0.25, 0.12, 0.15] },
  { altitudeDeg: 0, zenith: [0.05, 0.1, 0.35], horizon: [0.9, 0.55, 0.35] },
  { altitudeDeg: 10, zenith: [0.15, 0.35, 0.75], horizon: [0.75, 0.82, 0.92] },
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

/** Fewer/no stars in twilight or daylight; a full field once the sky is properly dark. */
export function starCountForAltitude(altitudeDeg: number): number {
  if (altitudeDeg > -6) return 0
  if (altitudeDeg > -18) return 800
  return 3000
}

/**
 * Skews toward dim stars (the overwhelming majority in a real sky) with a few bright ones —
 * a stylized approximation of how a starfield's brightness is distributed, not a physically
 * calibrated magnitude scale (real astronomical magnitudes run the other way, with lower/
 * negative numbers being brighter, which would misleadingly imply more precision than a
 * hand-picked power-law skew actually has). `random` is a uniform [0,1) sample; returns a
 * brightness in [0,1) (1 = brightest, never quite reached since `random` never reaches 1).
 */
export function starBrightness(random: number): number {
  return random ** 4
}

/** How much a star's rendered color is floored above black at a given brightness — keeps even
 * the dimmest star in a tier faintly visible instead of literally invisible. */
export function starColorScale(brightness: number): number {
  return 0.3 + 0.7 * brightness
}

export interface StarBrightnessTier {
  readonly maxBrightness: number
  readonly size: number
}

/**
 * Discrete rendering buckets for stars, by their starBrightness() value — see
 * SceneRenderer.ts's buildStars(), which needs one Points/PointsMaterial per tier since
 * three.js's PointsMaterial has no per-vertex size without a custom shader. Brightness still
 * varies continuously *within* a tier via per-vertex color (see starColorScale).
 */
export const STAR_BRIGHTNESS_TIERS: StarBrightnessTier[] = [
  { maxBrightness: 0.5, size: 1.2 },
  { maxBrightness: 0.85, size: 2.0 },
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
