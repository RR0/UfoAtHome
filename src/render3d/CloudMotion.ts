import type { Weather } from "../engine/model/Weather.js"
import type { WeatherTrack } from "../engine/model/WeatherTrack.js"
import { geoToLocalMeters } from "./terrain/GeoProjection.js"

type Position = { lat?: number; lng?: number }

const DAY_MS = 86_400_000
/** How far, either way and on each axis, one day's clouds are set from another's. Several times the
 * size of the largest cloud, so that two days never share an arrangement. */
const DAY_SHIFT_SPAN_M = 40_000

/**
 * Where a record's clouds already are when the recording starts: drifted by the wind since the
 * start of that day, and set apart from the other days'.
 *
 * What a record gives is how MUCH of the sky each layer covers, never WHERE: the arrangement is a
 * pattern of our own, the same one for every date. Counted from the recording's start, the wind moved
 * it a few metres in a minute and nothing at all between one hour and the next, so a day scrolled
 * through hour by hour showed the same clouds growing and shrinking where they stood. Counted from
 * the start of the day instead, the pattern slides at the wind's own speed as the hours go by, as a
 * real field of cloud does (and decorrelates in the half hour a real one takes to), and a day's
 * shift keeps the same hour of two different days from looking alike.
 */
export interface CloudPreroll {
  readonly elapsedMs: number
  readonly shiftM: { readonly x: number; readonly z: number }
}

/** The preroll of a recording starting at `start`. UTC's days, not local ones: the shift only has
 * to be the same for a whole day, and a day's boundary is somewhere the sky is arbitrary anyway. */
export function cloudPrerollAt(start: Date): CloudPreroll {
  const day = Math.floor(start.getTime() / DAY_MS)
  return {
    elapsedMs: start.getTime() - day * DAY_MS,
    shiftM: { x: CloudMotionHash.unit(day, 0x9e3779b1) * DAY_SHIFT_SPAN_M, z: CloudMotionHash.unit(day, 0x85ebca6b) * DAY_SHIFT_SPAN_M }
  }
}

/** A deterministic number in [-1, 1) for an integer and a key — not a random source, just a spread. */
class CloudMotionHash {
  static unit(value: number, key: number): number {
    let hash = Math.imul(value | 0, key) ^ key
    hash = Math.imul(hash ^ (hash >>> 15), 0x2c1b3c6d)
    hash = Math.imul(hash ^ (hash >>> 12), 0x297a2d39)
    hash ^= hash >>> 15
    return ((hash >>> 0) / 0xffffffff) * 2 - 1
  }
}

/** World-space sampling offset in metres: observer translation minus wind advection.
 * Integrate from recording time zero so seeking and replay do not depend on frame history.
 * Weather direction is the bearing TOWARD which air moves (north = -Z).
 */
export function cloudOffsetAt(
  tMs: number,
  track: WeatherTrack,
  fallback: Weather,
  origin?: Position,
  observer?: Position,
  layerId?: string,
  preroll?: CloudPreroll
): { x: number; z: number } {
  const offset = origin?.lat !== undefined && origin.lng !== undefined && observer?.lat !== undefined && observer.lng !== undefined
    ? geoToLocalMeters(observer.lat, observer.lng, origin.lat, origin.lng)
    : { x: 0, z: 0 }
  if (preroll) {
    // The wind the recording starts in, held over the hours before it: nothing says what it was.
    const weather = track.getInterpolatedWeatherAt(0) ?? fallback
    const layer = layerId === undefined ? undefined : weather.cloudLayers?.find(layer => layer.id === layerId)
    const radians = (layer?.windDirectionDeg ?? weather.windDirectionDeg) * Math.PI / 180
    const distance = (layer?.windSpeed ?? weather.windSpeed) * preroll.elapsedMs / 1000
    offset.x += preroll.shiftM.x - Math.sin(radians) * distance
    offset.z += preroll.shiftM.z + Math.cos(radians) * distance
  }
  const end = Math.max(0, tMs)
  const boundaries = [0, ...track.allKeyframes.map(frame => frame.t).filter(t => t > 0 && t < end), end]
  for (let segment = 1; segment < boundaries.length; segment++) {
    const start = boundaries[segment - 1]
    const duration = boundaries[segment] - start
    if (duration === 0) continue
    // Composite Simpson integration of linearly changing speed and shortest-arc bearing.
    // Split at keyframes; 32 intervals accurately resolve even a half-turn within one segment.
    const steps = 32
    for (let i = 0; i <= steps; i++) {
      const weather = track.getInterpolatedWeatherAt(start + duration * i / steps) ?? fallback
      const layer = layerId === undefined ? undefined : weather.cloudLayers?.find(layer => layer.id === layerId)
      const radians = (layer?.windDirectionDeg ?? weather.windDirectionDeg) * Math.PI / 180
      const weight = i === 0 || i === steps ? 1 : i % 2 === 0 ? 2 : 4
      const distance = (layer?.windSpeed ?? weather.windSpeed) * duration / 1000 / steps / 3 * weight
      offset.x -= Math.sin(radians) * distance
      offset.z += Math.cos(radians) * distance
    }
  }
  return offset
}
