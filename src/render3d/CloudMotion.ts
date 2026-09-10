import type { Weather } from "../engine/model/Weather.js"
import type { WeatherTrack } from "../engine/model/WeatherTrack.js"
import { geoToLocalMeters } from "./terrain/GeoProjection.js"

type Position = { lat?: number; lng?: number }

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
  layerId?: string
): { x: number; z: number } {
  const offset = origin?.lat !== undefined && origin.lng !== undefined && observer?.lat !== undefined && observer.lng !== undefined
    ? geoToLocalMeters(observer.lat, observer.lng, origin.lat, origin.lng)
    : { x: 0, z: 0 }
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
