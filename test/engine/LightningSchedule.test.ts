import { describe, expect, it } from "vitest"
import { LightningSchedule } from "../../src/engine/weather/LightningSchedule.js"

describe("LightningSchedule", () => {
  const hour = LightningSchedule.schedule({ durationMs: 3_600_000, seed: 42 })

  it("gives the same storm for the same seed, and another for another", () => {
    expect(LightningSchedule.schedule({ durationMs: 3_600_000, seed: 42 })).toEqual(hour)
    expect(LightningSchedule.schedule({ durationMs: 3_600_000, seed: 43 })[0]).not.toEqual(hour[0])
  })

  it("flashes every 8 to 25 seconds, the first one anywhere in the first interval", () => {
    for (let i = 1; i < hour.length; i++) {
      const gap = (hour[i].t - hour[i - 1].t) / 1000
      expect(gap).toBeGreaterThanOrEqual(LightningSchedule.MIN_INTERVAL_S)
      expect(gap).toBeLessThanOrEqual(LightningSchedule.MAX_INTERVAL_S)
    }
    // A storm is already under way: across many seeds some first flashes fall in the first seconds.
    const firsts = Array.from({ length: 200 }, (_, seed) => LightningSchedule.schedule({ durationMs: 60_000, seed })[0]?.t ?? Infinity)
    expect(Math.min(...firsts)).toBeLessThan(2000)
  })

  it("flashes more often under heavier rain, and no differently below moderate rain", () => {
    const count = (intensity: number) => LightningSchedule.schedule({ durationMs: 3_600_000, seed: 7, intensity }).length
    expect(count(0.2)).toBe(count(0.5))
    expect(count(1)).toBeGreaterThan(count(0.5) * 2.5)
    const severe = LightningSchedule.schedule({ durationMs: 3_600_000, seed: 7, intensity: 1 })
    for (let i = 1; i < severe.length; i++) expect(severe[i].t - severe[i - 1].t).toBeLessThanOrEqual(8000)
  })

  it("sends about one flash in four to the ground, with several strokes, and keeps cloud flashes to one", () => {
    const ground = hour.filter(flash => flash.cloudToGround)
    expect(ground.length / hour.length).toBeGreaterThan(0.12)
    expect(ground.length / hour.length).toBeLessThan(0.4)
    expect(Math.max(...ground.map(flash => flash.strokes.length))).toBeGreaterThan(1)
    expect(hour.filter(flash => !flash.cloudToGround).every(flash => flash.strokes.length === 1)).toBe(true)
    for (const flash of hour) {
      expect(flash.distanceM).toBeGreaterThanOrEqual(LightningSchedule.MIN_DISTANCE_M)
      expect(flash.distanceM).toBeLessThanOrEqual(LightningSchedule.MAX_DISTANCE_M)
    }
  })

  it("is bright at a stroke, fades within tenths of a second, and flickers again at the next stroke", () => {
    const flash = { t: 1000, azimuthDeg: 0, distanceM: 3000, cloudToGround: true, channelSeed: 1,
      strokes: [{ offsetMs: 0, intensity: 1 }, { offsetMs: 80, intensity: 0.6 }] }
    expect(LightningSchedule.brightnessAt(flash, 999)).toBe(0)
    expect(LightningSchedule.brightnessAt(flash, 1000)).toBe(1)
    expect(LightningSchedule.brightnessAt(flash, 1070)).toBeLessThan(0.25)
    expect(LightningSchedule.brightnessAt(flash, 1080)).toBeGreaterThan(0.6)
    expect(LightningSchedule.brightnessAt(flash, LightningSchedule.endOf(flash) + 1)).toBe(0)
  })

  it("delays the thunder by the distance sound travels", () => {
    const flash = { ...hour[0], distanceM: 3430 }
    expect(LightningSchedule.thunderDelayMs(flash)).toBeCloseTo(10_000, 5)
  })
})
