import { describe, expect, it } from "vitest"
import { skyColorsForAltitude, starCountForAltitude } from "../../src/render3d/skyColors.js"

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
