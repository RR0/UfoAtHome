import { describe, expect, it } from "vitest"
import { WeatherTrack, lerpWeather } from "../../src/engine/model/WeatherTrack.js"
import { DEFAULT_CLOUD_BASE_M, DEFAULT_WEATHER } from "../../src/engine/model/Weather.js"
import type { Weather } from "../../src/engine/model/Weather.js"

function weatherAt(cloudCover: number, precipitationType: Weather["precipitationType"] = "none"): Weather {
  return {
    cloudCover,
    cloudDarkness: 0,
    precipitationType,
    precipitationIntensity: 0,
    windDirectionDeg: 0,
    windSpeed: 0,
    storm: false
  }
}

describe("WeatherTrack", () => {
  it("stores and retrieves an exact keyframe", () => {
    const track = new WeatherTrack()
    track.addKeyframe(100, weatherAt(1))
    expect(track.getLatestWeatherAt(100)?.cloudCover).toBe(1)
  })

  it("keeps keyframes sorted regardless of insertion order", () => {
    const track = new WeatherTrack()
    track.addKeyframe(200, weatherAt(2))
    track.addKeyframe(0, weatherAt(0))
    track.addKeyframe(100, weatherAt(1))
    expect(track.allKeyframes.map(k => k.t)).toEqual([0, 100, 200])
  })

  it("overwrites a keyframe recorded at the same t", () => {
    const track = new WeatherTrack()
    track.addKeyframe(100, weatherAt(0.1))
    track.addKeyframe(100, weatherAt(0.9))
    expect(track.allKeyframes).toHaveLength(1)
    expect(track.getLatestWeatherAt(100)?.cloudCover).toBe(0.9)
  })

  it("getLatestWeatherAt holds the last recorded value between keyframes", () => {
    const track = new WeatherTrack()
    track.addKeyframe(0, weatherAt(0))
    track.addKeyframe(200, weatherAt(1))
    expect(track.getLatestWeatherAt(0)?.cloudCover).toBe(0)
    expect(track.getLatestWeatherAt(150)?.cloudCover).toBe(0)
    expect(track.getLatestWeatherAt(200)?.cloudCover).toBe(1)
    expect(track.getLatestWeatherAt(1000)?.cloudCover).toBe(1)
  })

  it("getLatestWeatherAt is undefined before the first keyframe", () => {
    const track = new WeatherTrack()
    track.addKeyframe(100, weatherAt(1))
    expect(track.getLatestWeatherAt(0)).toBeUndefined()
  })

  it("getInterpolatedWeatherAt blends continuous fields between keyframes", () => {
    const track = new WeatherTrack()
    track.addKeyframe(0, weatherAt(0))
    track.addKeyframe(200, weatherAt(1))
    expect(track.getInterpolatedWeatherAt(50)?.cloudCover).toBeCloseTo(0.25)
    expect(track.getInterpolatedWeatherAt(200)?.cloudCover).toBeCloseTo(1)
  })

  it("getInterpolatedWeatherAt holds the last value past the recorded range", () => {
    const track = new WeatherTrack()
    track.addKeyframe(0, weatherAt(0))
    track.addKeyframe(200, weatherAt(1))
    expect(track.getInterpolatedWeatherAt(1000)?.cloudCover).toBe(1)
  })

  it("getInterpolatedWeatherAt holds precipitationType (a real storm's onset isn't a blend of 'none' and 'rain')", () => {
    const track = new WeatherTrack()
    track.addKeyframe(0, weatherAt(0, "none"))
    track.addKeyframe(200, weatherAt(1, "rain"))
    expect(track.getInterpolatedWeatherAt(100)?.precipitationType).toBe("none")
    expect(track.getInterpolatedWeatherAt(200)?.precipitationType).toBe("rain")
  })

  it("getInterpolatedWeatherAt holds storm the same way", () => {
    const track = new WeatherTrack()
    track.addKeyframe(0, { ...weatherAt(0), storm: false })
    track.addKeyframe(200, { ...weatherAt(0), storm: true })
    expect(track.getInterpolatedWeatherAt(100)?.storm).toBe(false)
    expect(track.getInterpolatedWeatherAt(200)?.storm).toBe(true)
  })

  it("clear() removes every keyframe", () => {
    const track = new WeatherTrack()
    track.addKeyframe(0, weatherAt(0.1))
    track.addKeyframe(500, weatherAt(0.5))
    track.clear()
    expect(track.allKeyframes).toHaveLength(0)
    expect(track.getLatestWeatherAt(500)).toBeUndefined()
  })

  it("removeKeyframeAt() removes only the keyframe at that exact t, leaving others intact", () => {
    const track = new WeatherTrack()
    track.addKeyframe(0, weatherAt(0.1))
    track.addKeyframe(500, weatherAt(0.5))
    track.removeKeyframeAt(500)
    expect(track.allKeyframes.map(k => k.t)).toEqual([0])
    expect(track.getLatestWeatherAt(0)?.cloudCover).toBe(0.1)
  })

  it("removeKeyframeAt() is a no-op when there's no keyframe at that t", () => {
    const track = new WeatherTrack()
    track.addKeyframe(0, weatherAt(0.1))
    track.removeKeyframeAt(250)
    expect(track.allKeyframes).toHaveLength(1)
  })

  it("round-trips through JSON", () => {
    const track = new WeatherTrack()
    track.addKeyframe(0, weatherAt(0.1, "rain"))
    track.addKeyframe(500, weatherAt(0.9, "hail"))
    const restored = WeatherTrack.fromJSON(track.toJSON())
    expect(restored.allKeyframes).toEqual(track.allKeyframes)
  })
})

describe("lerpWeather windDirectionDeg", () => {
  it("interpolates through the shorter arc across the 0/360 boundary", () => {
    const result = lerpWeather({ ...weatherAt(0), windDirectionDeg: 350 }, { ...weatherAt(0), windDirectionDeg: 10 }, 0.5)
    expect(result.windDirectionDeg).toBeCloseTo(0)
  })

  it("interpolates a plain within-range direction normally", () => {
    const result = lerpWeather({ ...weatherAt(0), windDirectionDeg: 10 }, { ...weatherAt(0), windDirectionDeg: 30 }, 0.5)
    expect(result.windDirectionDeg).toBeCloseTo(20)
  })
})

/**
 * A cloud base is what decides which side of the deck a witness is on — under it, as almost every
 * ground witness is, or above it, as a witness in an aircraft can be.
 */
describe("cloudBaseM", () => {
  const at = (cloudBaseM?: number): Weather => ({ ...DEFAULT_WEATHER, cloudCover: 0.5, cloudBaseM })

  it("blends between two stated bases, like the other continuous fields", () => {
    expect(lerpWeather(at(800), at(1800), 0.5).cloudBaseM).toBe(1300)
  })

  it("stays unstated when either side is — an unrecorded base has no midpoint", () => {
    expect(lerpWeather(at(800), at(undefined), 0.5).cloudBaseM).toBeUndefined()
    expect(lerpWeather(at(undefined), at(1800), 0.5).cloudBaseM).toBeUndefined()
  })

  it("is absent from the default weather — unstated, not zero", () => {
    expect(DEFAULT_WEATHER.cloudBaseM).toBeUndefined()
    expect(DEFAULT_CLOUD_BASE_M).toBeGreaterThan(0)
  })
})
