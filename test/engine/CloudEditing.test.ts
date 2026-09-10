import { describe, expect, it } from "vitest"
import { editCloudLayer } from "../../src/engine/model/CloudEditing.js"
import { DEFAULT_WEATHER } from "../../src/engine/model/Weather.js"
import { WeatherTrack } from "../../src/engine/model/WeatherTrack.js"
import type { CloudLayer } from "../../src/engine/model/CloudLayer.js"
const layer: CloudLayer = { id: "low", type: "cumulus", baseM: 1000, thicknessM: 800, sizeM: 1400, coverage: 0.55, density: 1 }
function track() {
  const track = new WeatherTrack()
  track.addKeyframe(0, { ...DEFAULT_WEATHER, cloudLayers: [layer], windSpeed: 5 })
  track.addKeyframe(120000, { ...DEFAULT_WEATHER, cloudLayers: [layer], windSpeed: 20 })
  return track
}
describe("cloud edit scope", () => {
  it("keeps zero throughout playback when editing the whole observation, without changing wind", () => {
    const t = track()
    editCloudLayer(t, DEFAULT_WEATHER, 30000, "low", l => ({ ...l, coverage: 0 }), "observation")
    for (const time of [0, 30000, 60000, 120000]) expect(t.getInterpolatedWeatherAt(time)!.cloudLayers![0].coverage).toBe(0)
    expect(t.getInterpolatedWeatherAt(60000)!.windSpeed).toBe(12.5)
    expect(t.allKeyframes).toHaveLength(2)
  })
  it("changes only the selected keyframe when explicitly editing an instant", () => {
    const t = track()
    editCloudLayer(t, DEFAULT_WEATHER, 30000, "low", l => ({ ...l, coverage: 0 }), "instant")
    expect(t.getInterpolatedWeatherAt(30000)!.cloudLayers![0].coverage).toBe(0)
    expect(t.getInterpolatedWeatherAt(120000)!.cloudLayers![0].coverage).toBe(0.55)
  })
  it("interpolates instance position by identity and preserves it through JSON", () => {
    const t = track()
    const instance = { id: "mass", eastM: 0, northM: 3000, baseM: 1000, thicknessM: 800, widthM: 2000, depthM: 1000, rotationDeg: 350, density: 1 }
    editCloudLayer(t, DEFAULT_WEATHER, 0, "low", l => ({ ...l, instances: [instance] }), "observation")
    editCloudLayer(t, DEFAULT_WEATHER, 120000, "low", l => ({ ...l, instances: [{ ...instance, eastM: 1000, rotationDeg: 10 }] }), "instant")
    const restored = WeatherTrack.fromJSON(JSON.parse(JSON.stringify(t.toJSON())))
    const middle = restored.getInterpolatedWeatherAt(60000)!.cloudLayers![0].instances![0]
    expect(middle.eastM).toBe(500)
    expect(middle.rotationDeg).toBe(0)
  })
})
