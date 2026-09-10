import { resolveCloudLayers } from "./CloudLayer.js"
import type { CloudLayer } from "./CloudLayer.js"
import type { Weather } from "./Weather.js"
import type { WeatherTrack } from "./WeatherTrack.js"

/** Change one layer without copying the current interpolated weather over other keyframes. */
export function editCloudLayer(track: WeatherTrack, fallback: Weather, timeMs: number, id: string,
  edit: (layer: CloudLayer) => CloudLayer, scope: "observation" | "instant"): void {
  editCloudLayers(track, fallback, timeMs, layers => layers.map(layer => layer.id === id ? edit(layer) : layer), scope)
}

/** Layer membership follows the same time and scope rules as layer properties. */
export function editCloudLayers(track: WeatherTrack, fallback: Weather, timeMs: number,
  edit: (layers: CloudLayer[]) => CloudLayer[], scope: "observation" | "instant"): void {
  const update = (weather: Weather): Weather => {
    const cloudLayers = edit(resolveCloudLayers(weather))
    const cover = (high: boolean) => 1 - cloudLayers.filter(layer => (layer.type === "cirrus") === high)
      .reduce((clear, layer) => clear * (1 - layer.coverage), 1)
    const lowerCloudCover = cover(false), highCloudCover = cover(true)
    const bases = cloudLayers.filter(layer => layer.coverage > 0 && layer.type !== "cirrus").map(layer => layer.baseM)
    const visible = cloudLayers.filter(layer => layer.coverage > 0 || (layer.instances?.length ?? 0) > 0)
    const cloudDarkness = visible.length ? Math.max(...visible.flatMap(layer => [layer.darkness ?? weather.cloudDarkness,
      ...(layer.instances ?? []).map(instance => instance.darkness ?? layer.darkness ?? weather.cloudDarkness)])) : 0
    const cirrus = cloudLayers.filter(layer => layer.type === "cirrus" && layer.coverage > 0)
      .sort((a, b) => b.coverage - a.coverage)[0]
    // Keep the weather summary and older consumers coherent with explicit layer editing.
    return { ...weather, cloudLayers, lowerCloudCover, highCloudCover, cloudDarkness,
      iceCrystalAlignment: cirrus?.iceCrystalAlignment,
      cloudCover: 1 - (1 - lowerCloudCover) * (1 - highCloudCover), cloudBaseM: bases.length ? Math.min(...bases) : undefined }
  }
  if (scope === "instant" || track.allKeyframes.length === 0) {
    track.addKeyframe(scope === "observation" ? 0 : timeMs, update(track.getInterpolatedWeatherAt(timeMs) ?? fallback))
  } else {
    for (const frame of [...track.allKeyframes]) track.addKeyframe(frame.t, update(frame.weather))
  }
}
