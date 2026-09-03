import { describe, expect, it } from "vitest"
import { SkyDrift } from "../../../src/engine/astronomy/SkyDrift.js"

describe("SkyDrift", () => {
  it("turns the sky at the sidereal rate, not the solar one — 15.041 degrees an hour", () => {
    expect(SkyDrift.degOver(3600)).toBeCloseTo(15.041, 3)
    // The solar day's own 15.000 would be a made-up number where a measured one exists.
    expect(SkyDrift.degOver(3600)).toBeGreaterThan(15)
  })

  it("moves a star a thousandth of a degree in a quarter second — which is why a snapshot needs no accumulation", () => {
    expect(SkyDrift.degOver(0.25)).toBeCloseTo(0.001, 3)
    expect(SkyDrift.instants(0.25, 0.069)).toBe(1)
    expect(SkyDrift.instants(1 / 250, 0.069)).toBe(1)
  })

  it("stays a single instant right up to the pixel, and splits the moment it crosses one", () => {
    const degPerPixel = 0.069
    const justUnder = (degPerPixel * 0.99) / SkyDrift.DEG_PER_SECOND
    expect(SkyDrift.instants(justUnder, degPerPixel)).toBe(1)
    const justOver = (degPerPixel * 1.01) / SkyDrift.DEG_PER_SECOND
    expect(SkyDrift.instants(justOver, degPerPixel)).toBe(2)
  })

  it("draws one instant per pixel of trail, so the arc lands on touching pixels rather than dashes", () => {
    // A minute at a reflex's 0.069 deg/px: a quarter of a degree, about four pixels.
    expect(SkyDrift.degOver(60)).toBeCloseTo(0.2507, 4)
    expect(SkyDrift.instants(60, 0.069)).toBe(4)
    expect(SkyDrift.instants(600, 0.069)).toBe(37)
  })

  it("caps the cost however long the pose — an hour's trail is not sixty times the price of a minute's", () => {
    // An hour at a reflex's scale drifts 218 px, so the cap is what answers, not the pixel rule.
    expect(SkyDrift.instants(3600, 0.069)).toBe(SkyDrift.MAX_INSTANTS)
    expect(SkyDrift.instants(86400, 0.069)).toBe(SkyDrift.MAX_INSTANTS)
  })

  it("says one instant when there is no image to speak of, rather than dividing by its scale", () => {
    expect(SkyDrift.instants(600, 0)).toBe(1)
    expect(SkyDrift.instants(600, -1)).toBe(1)
    expect(SkyDrift.instants(-5, 0.069)).toBe(1)
  })
})
