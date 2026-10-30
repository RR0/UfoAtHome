import { describe, expect, it } from "vitest"
import { PhoneDevelopment } from "../../../src/engine/instrument/PhoneDevelopment.js"

describe("PhoneDevelopment", () => {
  it("leaves a scene whose exposure nothing held down as the sensor's straight line", () => {
    // A grey sky round a veiled Sun, metered to a middle grey: nothing to bring back.
    expect(PhoneDevelopment.strengthFor(PhoneDevelopment.MID_GREY)).toBe(0)
    expect(PhoneDevelopment.strengthFor(0.5)).toBe(0)
    expect(PhoneDevelopment.shown(0.3, 0)).toBe(0.3)
  })

  it("brings an exposure held down back to a middle grey", () => {
    for (const mean of [0.1, 0.05, 0.03]) {
      expect(PhoneDevelopment.shown(mean, PhoneDevelopment.strengthFor(mean))).toBeCloseTo(PhoneDevelopment.MID_GREY, 4)
    }
  })

  it("lifts a night no further than its most, some nine times in the deepest shadows", () => {
    expect(PhoneDevelopment.strengthFor(1e-4)).toBe(PhoneDevelopment.MAX_STRENGTH)
    const lift = PhoneDevelopment.shown(1e-4, PhoneDevelopment.MAX_STRENGTH) / 1e-4
    expect(lift).toBeGreaterThan(8.5)
    expect(lift).toBeLessThan(9.5)
  })

  it("keeps full at full and never shows past it", () => {
    expect(PhoneDevelopment.shown(1, 20)).toBeCloseTo(1, 9)
    expect(PhoneDevelopment.shown(4, 20)).toBeCloseTo(1, 9)
  })
})
