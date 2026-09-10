import type { Weather } from "./Weather.js"
import { DEFAULT_CLOUD_BASE_M } from "./Weather.js"

/** A local cloud mass, advected by its parent layer's wind from recording time zero. */
export interface CloudInstance {
  id: string
  /** Position relative to the recording's initial observer, in metres east/north. */
  eastM: number
  northM: number
  baseM: number
  thicknessM: number
  widthM: number
  depthM: number
  rotationDeg: number
  density: number
  /** Visual shading, 0 (white) to 1 (very dark); absent inherits the parent layer. */
  darkness?: number
  seed?: number
}

/** One persistent cloud layer; its properties belong to each weather-track keyframe. */
export interface CloudLayer {
  /** Stable across keyframes: reordering layers must not regenerate their cloud pattern. */
  id: string
  /** Optional explicit masses, independent of the generated coverage percentage. */
  instances?: CloudInstance[]
  type: "cumulus" | "stratus" | "stratocumulus" | "cirrus" | "unknown"
  /** Base in metres above the recording's reference ground, not above the moving observer. */
  baseM: number
  /** Vertical extent in metres. */
  thicknessM: number
  /** Horizontal coverage, 0–1. This is independent of opacity and apparent sky coverage. */
  coverage: number
  /** Characteristic horizontal cloud size in metres. */
  sizeM: number
  /** Relative optical density, 0–2; zero is transparent. */
  density: number
  /** Visual shading, 0 (white) to 1 (very dark). */
  darkness?: number
  /** Degree of preferential crystal orientation, meaningful only for cirrus. */
  iceCrystalAlignment?: number
  /** Reproducible variation; defaults to a hash of the stable layer id. */
  seed?: number
  /** Optional wind overrides; bearing TOWARD which the cloud travels, clockwise from north. */
  windDirectionDeg?: number
  windSpeed?: number
}

/** Empty explicitly means clear sky. Absent uses the historical water/cirrus fields. */
export function resolveCloudLayers(weather: Weather): CloudLayer[] {
  if (weather.cloudLayers !== undefined) return weather.cloudLayers
  const layers: CloudLayer[] = []
  const coverage = weather.lowerCloudCover ?? weather.cloudCover
  if (coverage > 0) layers.push({ id: "lower", type: "cumulus", baseM: weather.cloudBaseM ?? DEFAULT_CLOUD_BASE_M,
    thicknessM: 650, coverage, sizeM: 1400, density: 1, darkness: weather.cloudDarkness })
  if ((weather.highCloudCover ?? 0) > 0) layers.push({ id: "cirrus", type: "cirrus", baseM: 8000,
    thicknessM: 400, coverage: weather.highCloudCover!, sizeM: 2200, density: 0.35,
    darkness: weather.cloudDarkness, iceCrystalAlignment: weather.iceCrystalAlignment })
  return layers
}
