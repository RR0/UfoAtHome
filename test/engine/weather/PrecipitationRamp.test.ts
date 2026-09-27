import { describe, expect, it } from "vitest"
import { PrecipitationRamp } from "../../../src/engine/weather/PrecipitationRamp.js"
import { WeatherTrack } from "../../../src/engine/model/WeatherTrack.js"
import { DEFAULT_WEATHER } from "../../../src/engine/model/Weather.js"
import type { Weather } from "../../../src/engine/model/Weather.js"

const dry: Weather = { ...DEFAULT_WEATHER, precipitationType: "none", precipitationIntensity: 0 }
const rain = (intensity: number): Weather => ({ ...DEFAULT_WEATHER, precipitationType: "rain", precipitationIntensity: intensity })

describe("PrecipitationRamp", () => {
  it("starts a shower where the recording starts it, with its first drops, and not all at once", () => {
    const track = new WeatherTrack()
    track.addKeyframe(0, dry)
    track.addKeyframe(11_900, dry)
    track.addKeyframe(12_000, rain(0.5))
    track.addKeyframe(30_000, rain(0.5))
    expect(track.getActualWeatherAt(11_000)!.precipitationType).toBe("none")
    const start = track.getActualWeatherAt(12_000)!
    expect(start.precipitationType).toBe("rain")
    expect(start.precipitationIntensity).toBeLessThan(0.01)
    expect(track.getActualWeatherAt(16_900)!.precipitationIntensity).toBeCloseTo(0.25, 2)
    expect(track.getActualWeatherAt(21_900)!.precipitationIntensity).toBeCloseTo(0.5, 2)
    expect(track.getActualWeatherAt(28_000)!.precipitationIntensity).toBeCloseTo(0.5, 5)
  })

  it("follows a change the keyframes already spread over longer than rain needs, exactly", () => {
    const track = new WeatherTrack()
    track.addKeyframe(0, rain(0))
    track.addKeyframe(60_000, rain(0.6))
    expect(track.getActualWeatherAt(30_000)!.precipitationIntensity).toBeCloseTo(0.3, 5)
  })

  it("lets rain end with its last drop, then stops calling it rain", () => {
    const track = new WeatherTrack()
    track.addKeyframe(0, rain(0.4))
    track.addKeyframe(1_000, dry)
    track.addKeyframe(20_000, dry)
    const ending = track.getActualWeatherAt(4_000)!
    expect(ending.precipitationType).toBe("rain")
    expect(ending.precipitationIntensity).toBeCloseTo(0.2, 2)
    expect(track.getActualWeatherAt(10_000)!.precipitationType).toBe("none")
  })

  it("leaves what the recording states untouched, for the editors that write it back", () => {
    const track = new WeatherTrack()
    track.addKeyframe(0, dry)
    track.addKeyframe(1_000, rain(1))
    expect(track.getInterpolatedWeatherAt(1_000)!.precipitationIntensity).toBe(1)
  })

  it("keeps settling after the last keyframe instead of jumping to it", () => {
    const track = new WeatherTrack()
    track.addKeyframe(0, dry)
    track.addKeyframe(1_000, rain(1))
    // The shower starts where its stretch does, at 0, and climbs at the rain's own rate.
    expect(track.getActualWeatherAt(11_000)!.precipitationIntensity).toBeCloseTo(0.55, 2)
    expect(track.getActualWeatherAt(40_000)!.precipitationIntensity).toBe(1)
  })

  it("follows in closed form, whatever the length of the stretch", () => {
    expect(PrecipitationRamp.follow(0, 0, 1, 7200, 3600)).toBeCloseTo(0.5, 5)
    expect(PrecipitationRamp.follow(0, 1, 1, 0.1, 10)).toBeCloseTo(0.5, 5)
  })
})
