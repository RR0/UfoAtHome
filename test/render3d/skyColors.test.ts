import { describe, expect, it } from "vitest"
import {
  skyColorsForAltitude,
  starCountForAltitude,
  starBrightness,
  starBrightnessTierIndex,
  starColorScale,
  twinkleIntensity,
  STAR_BRIGHTNESS_TIERS
} from "../../src/render3d/skyColors.js"

describe("skyColorsForAltitude", () => {
  it("is near-black at deep night", () => {
    const { zenith, horizon } = skyColorsForAltitude(-45)
    expect(zenith.every(c => c < 0.05)).toBe(true)
    expect(horizon.every(c => c < 0.1)).toBe(true)
  })

  it("is bright blue at midday", () => {
    const { zenith } = skyColorsForAltitude(60)
    expect(zenith[2]).toBeGreaterThan(zenith[0])
    expect(zenith[2]).toBeGreaterThan(0.5)
  })

  it("warms the horizon near sunrise/sunset (altitude 0)", () => {
    const { horizon } = skyColorsForAltitude(0)
    expect(horizon[0]).toBeGreaterThan(horizon[2])
  })

  it("clamps beyond the defined range instead of extrapolating", () => {
    expect(skyColorsForAltitude(-200)).toEqual(skyColorsForAltitude(-90))
    expect(skyColorsForAltitude(200)).toEqual(skyColorsForAltitude(90))
  })

  it("interpolates smoothly between adjacent stops", () => {
    const a = skyColorsForAltitude(-18)
    const mid = skyColorsForAltitude(-12)
    const b = skyColorsForAltitude(-6)
    expect(mid.zenith[2]).toBeGreaterThan(a.zenith[2])
    expect(mid.zenith[2]).toBeLessThan(b.zenith[2])
  })
})

describe("starCountForAltitude", () => {
  it("shows no stars in daylight/civil twilight", () => {
    expect(starCountForAltitude(10)).toBe(0)
    expect(starCountForAltitude(-3)).toBe(0)
  })

  it("shows fewer stars in astronomical twilight than full night", () => {
    const twilight = starCountForAltitude(-15)
    const night = starCountForAltitude(-30)
    expect(twilight).toBeGreaterThan(0)
    expect(night).toBeGreaterThan(twilight)
  })
})

describe("starBrightness", () => {
  it("stays in [0,1) and skews toward dim (most uniform samples yield low brightness)", () => {
    const samples = Array.from({ length: 1000 }, (_, i) => i / 1000).map(starBrightness)
    expect(samples.every(b => b >= 0 && b < 1)).toBe(true)
    expect(samples.filter(b => b < 0.5).length).toBeGreaterThan(samples.length * 0.8)
  })

  it("is monotonically increasing in its input", () => {
    expect(starBrightness(0.8)).toBeGreaterThan(starBrightness(0.4))
  })

  it("maps 0 to exactly 0", () => {
    expect(starBrightness(0)).toBe(0)
  })
})

describe("starColorScale", () => {
  it("floors above black even at brightness 0, and reaches 1 at brightness 1", () => {
    expect(starColorScale(0)).toBeCloseTo(0.3)
    expect(starColorScale(1)).toBeCloseTo(1)
  })
})

describe("starBrightnessTierIndex", () => {
  it("buckets a dim, medium, and bright star into distinct, ordered tiers", () => {
    const dim = starBrightnessTierIndex(0.1)
    const medium = starBrightnessTierIndex(0.7)
    const bright = starBrightnessTierIndex(0.99)
    expect(dim).toBeLessThan(medium)
    expect(medium).toBeLessThan(bright)
    expect(bright).toBe(STAR_BRIGHTNESS_TIERS.length - 1)
  })
})

describe("twinkleIntensity", () => {
  it("always stays within [0,1]", () => {
    for (let t = 0; t < 10; t += 0.37) {
      expect(twinkleIntensity(1, { phase: 0, speedFactor: 1 }, t)).toBeGreaterThanOrEqual(0)
      expect(twinkleIntensity(1, { phase: 0, speedFactor: 1 }, t)).toBeLessThanOrEqual(1)
    }
  })

  it("dips further below its resting value for a bright star than a dim one", () => {
    // A phase where sin(...) is negative: the *rising* half of the cycle always clamps to
    // exactly 1 regardless of brightness (the resting value is already the ceiling — twinkle
    // can only ever dim, never brighten further), so the dimming half is where the two
    // brightnesses' amplitudes actually differ observably.
    const phase = { phase: -Math.PI / 6, speedFactor: 1 }
    const brightDip = 1 - twinkleIntensity(1, phase, 0)
    const dimDip = 1 - twinkleIntensity(0, phase, 0)
    expect(brightDip).toBeGreaterThan(dimDip)
    expect(brightDip).toBeGreaterThan(0)
  })

  it("clamps to exactly 1 when the raw swing would overshoot", () => {
    const value = twinkleIntensity(1, { phase: Math.PI / 2, speedFactor: 1 }, 0)
    expect(value).toBe(1)
  })
})
