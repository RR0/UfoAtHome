import { describe, expect, it } from "vitest"
import type { CloudLayer } from "../../src/engine/model/CloudLayer.js"
import { resolveCloudLayers } from "../../src/engine/model/CloudLayer.js"
import { DEFAULT_WEATHER } from "../../src/engine/model/Weather.js"
import { lerpWeather, WeatherTrack } from "../../src/engine/model/WeatherTrack.js"
import { cloudOffsetAt } from "../../src/render3d/CloudMotion.js"
const layer = (id: string, baseM = 1000): CloudLayer => ({ id, baseM, type: "cumulus", thicknessM: 800, coverage: 0.6, sizeM: 1500, density: 1 })

describe("weather cloud layers", () => {
  it("adapts legacy water and cirrus without modifying the recording", () => {
    const weather = { ...DEFAULT_WEATHER, cloudCover: 0.7, highCloudCover: 0.3, cloudBaseM: 1200 }
    expect(resolveCloudLayers(weather).map(l => [l.type, l.coverage, l.baseM])).toEqual([["cumulus", 0.7, 1200], ["cirrus", 0.3, 8000]])
    expect(weather).not.toHaveProperty("cloudLayers")
    expect(resolveCloudLayers({ ...weather, cloudLayers: [] })).toEqual([])
  })
  it("matches layers by id when keyframes reorder them", () => {
    const a = { ...DEFAULT_WEATHER, cloudLayers: [layer("a"), layer("b", 4000)] }
    const b = { ...DEFAULT_WEATHER, cloudLayers: [layer("b", 6000), { ...layer("a", 2000), thicknessM: 1200, sizeM: 2500 }] }
    const mid = lerpWeather(a, b, 0.5).cloudLayers!
    expect(mid.map(l => [l.id, l.baseM])).toEqual([["a", 1500], ["b", 5000]])
    expect(mid[0].thicknessM).toBe(1000)
    expect(mid[0].sizeM).toBe(2000)
  })
  it("fades additions/removals and holds type/seed until the keyframe", () => {
    const a = { ...DEFAULT_WEATHER, cloudLayers: [layer("old"), { ...layer("same"), seed: 1 }] }
    const b = { ...DEFAULT_WEATHER, cloudLayers: [layer("new"), { ...layer("same"), type: "stratus" as const, seed: 2 }] }
    const middle = lerpWeather(a, b, 0.5).cloudLayers!
    expect(middle.find(l => l.id === "old")!.coverage).toBe(0.3)
    expect(middle.find(l => l.id === "new")!.coverage).toBe(0.3)
    expect(middle.find(l => l.id === "same")!.seed).toBe(1)
    expect(lerpWeather(a, b, 1).cloudLayers).toEqual(b.cloudLayers)
  })
  it("keeps a layer that states no wind of its own stating none between keyframes", () => {
    const a = { ...DEFAULT_WEATHER, windSpeed: 10, windDirectionDeg: 80, cloudLayers: [layer("a")] }
    const b = { ...DEFAULT_WEATHER, windSpeed: 20, windDirectionDeg: 100, cloudLayers: [layer("a")] }
    const middle = lerpWeather(a, b, 0.5).cloudLayers![0]
    expect(middle.windSpeed).toBeUndefined()
    expect(middle.windDirectionDeg).toBeUndefined()
    // Stated on one side only: the other side means the general wind, and the blend is real.
    const stated = lerpWeather({ ...a, cloudLayers: [{ ...layer("a"), windSpeed: 30 }] }, b, 0.5).cloudLayers![0]
    expect(stated.windSpeed).toBe(25)
  })
  it("round-trips per-layer wind and integrates it independently", () => {
    const track = new WeatherTrack()
    track.addKeyframe(0, { ...DEFAULT_WEATHER, windSpeed: 20, cloudLayers: [{ ...layer("a"), windSpeed: 5, windDirectionDeg: 90 }] })
    const restored = WeatherTrack.fromJSON(JSON.parse(JSON.stringify(track.toJSON())))
    expect(restored.toJSON()).toEqual(track.toJSON())
    expect(cloudOffsetAt(60000, restored, DEFAULT_WEATHER, undefined, undefined, "a").x).toBeCloseTo(-300)
  })
})
