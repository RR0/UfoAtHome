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
