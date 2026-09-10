import { resolveCloudLayers } from "./CloudLayer.js"
import type { CloudInstance, CloudLayer } from "./CloudLayer.js"
import type { Weather } from "./Weather.js"

/**
 * The sighting's weather condition over time — a keyframe track alongside the UFO's Timeline and
 * the observer's own ObserverTrack, for observations where circumstances changed mid-sighting
 * (e.g. it started raining, then stopped). Mirrors ObserverTrack.ts's own shape (single track, not
 * per-sourceId, same binary-search-insert/hold-last-value/interpolate pattern) rather than sharing
 * code with it — see ObserverTrack.ts's own doc comment on why that pattern is intentionally
 * duplicated instead of generalized.
 */
export interface WeatherKeyframe {
  t: number
  weather: Weather
}

export interface WeatherTrackJson {
  keyframes: WeatherKeyframe[]
}

function lerpNumber(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/** Same shortest-arc wraparound as ObserverTrack.ts's own lerpAngleDeg (e.g. 350deg -> 10deg
 * passes through 0deg, not back down through 180deg) — reused here for windDirectionDeg, which
 * shares the exact same "degrees clockwise from true north" convention. */
function lerpAngleDeg(a: number, b: number, t: number): number {
  const delta = ((((b - a) % 360) + 540) % 360) - 180
  return (((a + delta * t) % 360) + 360) % 360
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function lerpInstances(a: CloudInstance[] = [], b: CloudInstance[] = [], t: number): CloudInstance[] | undefined {
  if (!a.length && !b.length) return undefined
  return [...new Set([...a.map(i => i.id), ...b.map(i => i.id)])].map(id => {
    const left = a.find(i => i.id === id), right = b.find(i => i.id === id)
    const start = left ?? { ...right!, density: 0 }, end = right ?? { ...left!, density: 0 }
    return { ...start, eastM: lerpNumber(start.eastM, end.eastM, t), northM: lerpNumber(start.northM, end.northM, t),
      baseM: lerpNumber(start.baseM, end.baseM, t), thicknessM: lerpNumber(start.thicknessM, end.thicknessM, t),
      widthM: lerpNumber(start.widthM, end.widthM, t), depthM: lerpNumber(start.depthM, end.depthM, t),
      rotationDeg: lerpAngleDeg(start.rotationDeg, end.rotationDeg, t), density: lerpNumber(start.density, end.density, t),
      darkness: lerpNumber(start.darkness ?? 0, end.darkness ?? 0, t) }
  })
}

/** Match by identity, never array index. Added/removed layers fade instead of popping.
 * Type and seed remain discrete until the next keyframe; their spatial identity is preserved.
 */
function lerpCloudLayers(a: Weather, b: Weather, t: number): CloudLayer[] | undefined {
  if (a.cloudLayers === undefined && b.cloudLayers === undefined) return undefined
  const from = resolveCloudLayers(a)
  const to = resolveCloudLayers(b)
  if (t >= 1) return to.map(layer => ({ ...layer }))
  const ids = new Set([...from.map(layer => layer.id), ...to.map(layer => layer.id)])
  return [...ids].map(id => {
    const left = from.find(layer => layer.id === id)
    const right = to.find(layer => layer.id === id)
    const start = left ?? { ...right!, coverage: 0 }
    const end = right ?? { ...left!, coverage: 0 }
    return {
      ...start,
      instances: lerpInstances(left?.instances, right?.instances, t),
      baseM: lerpNumber(start.baseM, end.baseM, t),
      thicknessM: lerpNumber(start.thicknessM, end.thicknessM, t),
      coverage: lerpNumber(start.coverage, end.coverage, t),
      sizeM: lerpNumber(start.sizeM, end.sizeM, t),
      density: lerpNumber(start.density, end.density, t),
      darkness: lerpNumber(start.darkness ?? a.cloudDarkness, end.darkness ?? b.cloudDarkness, t),
      iceCrystalAlignment: start.iceCrystalAlignment === undefined || end.iceCrystalAlignment === undefined
        ? undefined : lerpNumber(start.iceCrystalAlignment, end.iceCrystalAlignment, t),
      windSpeed: lerpNumber(start.windSpeed ?? a.windSpeed, end.windSpeed ?? b.windSpeed, t),
      windDirectionDeg: lerpAngleDeg(start.windDirectionDeg ?? a.windDirectionDeg, end.windDirectionDeg ?? b.windDirectionDeg, t)
    }
  })
}

/** precipitationType and storm are held (from's value until t reaches 1), not blended — there's no
 * meaningful halfway point between "raining" and "not raining", same "discrete fields are held"
 * convention as Shape.ts's own lerpShape (kind/outline/title/selected). Every continuous field
 * (cloudCover, cloudDarkness, highCloudCover, precipitationIntensity, windSpeed, windDirectionDeg)
 * blends. */
export function lerpWeather(a: Weather, b: Weather, t: number): Weather {
  return {
    cloudLayers: lerpCloudLayers(a, b, t),
    cloudCover: lerpNumber(a.cloudCover, b.cloudCover, t),
    cloudDarkness: lerpNumber(a.cloudDarkness, b.cloudDarkness, t),
    // The ice deck blends like the rest — a cirrus veil really does thicken or clear during an
    // observation, and it is what decides whether a halo could have stood there. Undefined on
    // either side means unstated, which has no midpoint and must not become nought: nought is a
    // sky somebody looked at and found no cirrus in.
    highCloudCover:
      a.highCloudCover === undefined || b.highCloudCover === undefined ? undefined : lerpNumber(a.highCloudCover, b.highCloudCover, t),
    iceCrystalAlignment:
      a.iceCrystalAlignment === undefined || b.iceCrystalAlignment === undefined
        ? undefined
        : lerpNumber(a.iceCrystalAlignment, b.iceCrystalAlignment, t),
    lowerCloudCover:
      a.lowerCloudCover === undefined || b.lowerCloudCover === undefined ? undefined : lerpNumber(a.lowerCloudCover, b.lowerCloudCover, t),
    // A deck really does lift or lower during an observation, so this blends like the other
    // continuous fields — undefined on either side means unstated, which has no midpoint.
    cloudBaseM: a.cloudBaseM === undefined || b.cloudBaseM === undefined ? undefined : lerpNumber(a.cloudBaseM, b.cloudBaseM, t),
    precipitationType: t < 1 ? a.precipitationType : b.precipitationType,
    precipitationIntensity: lerpNumber(a.precipitationIntensity, b.precipitationIntensity, t),
    windDirectionDeg: lerpAngleDeg(a.windDirectionDeg, b.windDirectionDeg, t),
    windSpeed: lerpNumber(a.windSpeed, b.windSpeed, t),
    storm: t < 1 ? a.storm : b.storm
  }
}

/**
 * A keyframe store for weather, sorted by time — same binary-search-insert/hold-last-value/
 * interpolate shape as ObserverTrack, scoped to a single track instead of per-sourceId.
 */
export class WeatherTrack {
  private readonly keyframes: WeatherKeyframe[] = []

  addKeyframe(t: number, weather: Weather): void {
    const index = this.findInsertIndex(t)
    if (this.keyframes[index]?.t === t) {
      this.keyframes[index] = { t, weather }
    } else {
      this.keyframes.splice(index, 0, { t, weather })
    }
  }

  /** Removes every keyframe. */
  clear(): void {
    this.keyframes.length = 0
  }

  /** Removes the keyframe at exactly time t, if one exists — leaves keyframes at every other time
   * untouched, unlike clear(). */
  removeKeyframeAt(t: number): void {
    const index = this.findInsertIndex(t)
    if (this.keyframes[index]?.t === t) {
      this.keyframes.splice(index, 1)
    }
  }

  private findInsertIndex(t: number): number {
    let low = 0
    let high = this.keyframes.length
    while (low < high) {
      const mid = (low + high) >>> 1
      if (this.keyframes[mid].t < t) {
        low = mid + 1
      } else {
        high = mid
      }
    }
    return low
  }

  /** Hold-last-value: the most recently recorded weather at-or-before t. */
  getLatestWeatherAt(t: number): Weather | undefined {
    let index = this.findInsertIndex(t)
    if (this.keyframes[index]?.t !== t) {
      index -= 1
    }
    return index >= 0 ? this.keyframes[index].weather : undefined
  }

  /** Like getLatestWeatherAt, but blends toward the next keyframe instead of holding the last one
   * — falls back to hold-last-value at the ends of the recorded range. */
  getInterpolatedWeatherAt(t: number): Weather | undefined {
    const index = this.findInsertIndex(t)
    const atOrBefore = this.keyframes[index]?.t === t ? this.keyframes[index] : this.keyframes[index - 1]
    if (atOrBefore?.t === t) return atOrBefore.weather
    const after = this.keyframes[index]?.t === t ? undefined : this.keyframes[index]
    if (!atOrBefore) return after?.weather
    if (!after) return atOrBefore.weather
    return lerpWeather(atOrBefore.weather, after.weather, clamp((t - atOrBefore.t) / (after.t - atOrBefore.t), 0, 1))
  }

  get duration(): number {
    return this.keyframes.length === 0 ? 0 : this.keyframes[this.keyframes.length - 1].t
  }

  get allKeyframes(): ReadonlyArray<WeatherKeyframe> {
    return this.keyframes
  }

  toJSON(): WeatherTrackJson {
    return { keyframes: this.keyframes }
  }

  static fromJSON(json: WeatherTrackJson): WeatherTrack {
    const track = new WeatherTrack()
    for (const keyframe of json.keyframes) {
      track.addKeyframe(keyframe.t, keyframe.weather)
    }
    return track
  }
}
