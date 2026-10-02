import { describe, expect, it } from "vitest"
import { ContrailGrowth } from "../../../src/engine/traffic/ContrailGrowth.js"

describe("ContrailGrowth", () => {
  describe("widthM", () => {
    it("starts at the span, which the wake's vortices spread the exhaust over, and widens with age", () => {
      expect(ContrailGrowth.widthM(35, 0)).toBeCloseTo(35, 6)
      expect(ContrailGrowth.widthM(35, 600)).toBeGreaterThan(ContrailGrowth.widthM(35, 60))
    })

    it("is some hundreds of metres after ten minutes and about a kilometre and a half after an hour", () => {
      expect(ContrailGrowth.widthM(35, 600)).toBeGreaterThan(200)
      expect(ContrailGrowth.widthM(35, 600)).toBeLessThan(500)
      expect(ContrailGrowth.widthM(35, 3600)).toBeGreaterThan(1000)
      expect(ContrailGrowth.widthM(35, 3600)).toBeLessThan(2500)
    })
  })

  describe("lifetimeS", () => {
    it("is seconds in very dry air and minutes in air that is nearly saturated over ice", () => {
      expect(ContrailGrowth.lifetimeS(0.1)).toBeLessThan(30)
      expect(ContrailGrowth.lifetimeS(0.95)).toBeGreaterThan(60)
      expect(ContrailGrowth.lifetimeS(0.95)).toBeLessThan(300)
    })

    it("never shortens as the air gets damper", () => {
      expect(ContrailGrowth.lifetimeS(0.8)).toBeGreaterThan(ContrailGrowth.lifetimeS(0.4))
    })
  })

  describe("opacity", () => {
    const persistent = { persistent: true, lifetimeS: Infinity, spanM: 35 }
    const brief = { persistent: false, lifetimeS: 40, spanM: 35 }

    it("is nothing before the exhaust has cooled: the trail starts behind the aircraft, not at it", () => {
      expect(ContrailGrowth.opacity(0, persistent)).toBe(0)
      expect(ContrailGrowth.opacity(0.1, persistent)).toBe(0)
      expect(ContrailGrowth.opacity(2, persistent)).toBeGreaterThan(0)
    })

    it("is gone when the ice of a trail that does not last has sublimated", () => {
      expect(ContrailGrowth.opacity(10, brief)).toBeGreaterThan(0)
      expect(ContrailGrowth.opacity(40, brief)).toBe(0)
      expect(ContrailGrowth.opacity(100, brief)).toBe(0)
    })

    it("fades along a trail that does not last", () => {
      expect(ContrailGrowth.opacity(30, brief)).toBeLessThan(ContrailGrowth.opacity(5, brief))
    })

    it("thins as a trail that lasts spreads, but does not vanish", () => {
      const young = ContrailGrowth.opacity(10, persistent)
      const old = ContrailGrowth.opacity(3000, persistent)
      expect(old).toBeLessThan(young)
      expect(old).toBeGreaterThan(0.02)
    })

    it("stays a share", () => {
      for (const age of [1, 10, 100, 1000, 10000]) {
        const value = ContrailGrowth.opacity(age, persistent)
        expect(value).toBeGreaterThanOrEqual(0)
        expect(value).toBeLessThanOrEqual(1)
      }
    })
  })
})
