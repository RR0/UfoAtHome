import { describe, expect, it } from "vitest"
import { ContrailGrowth } from "../../../src/engine/traffic/ContrailGrowth.js"

describe("ContrailGrowth", () => {
  describe("widthM", () => {
    it("starts at the span, which the wake's vortices spread the exhaust over, and widens with age", () => {
      expect(ContrailGrowth.widthM(35, 0)).toBeCloseTo(35, 6)
      expect(ContrailGrowth.widthM(35, 600)).toBeGreaterThan(ContrailGrowth.widthM(35, 60))
    })

    it("is some hundreds of metres after ten minutes and some kilometres after an hour, in the shear that is typical", () => {
      expect(ContrailGrowth.widthM(35, 600)).toBeGreaterThan(200)
      expect(ContrailGrowth.widthM(35, 600)).toBeLessThan(700)
      expect(ContrailGrowth.widthM(35, 3600)).toBeGreaterThan(1500)
      expect(ContrailGrowth.widthM(35, 3600)).toBeLessThan(6000)
    })

    it("is spread more by a wind that changes faster with height, and only diffuses in a steady one", () => {
      const calm = ContrailGrowth.widthM(35, 3600, 0)
      const typical = ContrailGrowth.widthM(35, 3600, 0.003)
      const strong = ContrailGrowth.widthM(35, 3600, 0.006)
      expect(calm).toBeLessThan(typical)
      expect(typical).toBeLessThan(strong)
      expect(calm).toBeGreaterThan(500)
      expect(calm).toBeLessThan(1200)
      // The shear's own share doubles with it.
      expect((strong - calm) / (typical - calm)).toBeCloseTo(2, 6)
    })

    it("grows faster and faster in a shear, because the trail also deepens", () => {
      const at = (age: number) => ContrailGrowth.widthM(35, age, 0.004) - ContrailGrowth.widthM(35, age, 0)
      expect(at(3600) / at(1800)).toBeGreaterThan(2.5)
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

    it("is visibly fainter after a few minutes than where the exhaust has just cooled, and much fainter after ten", () => {
      const young = ContrailGrowth.opacity(1, persistent)
      expect(ContrailGrowth.opacity(240, persistent)).toBeLessThan(young * 0.6)
      expect(ContrailGrowth.opacity(600, persistent)).toBeLessThan(young * 0.35)
    })

    it("thins faster in a shear that spreads it faster", () => {
      expect(ContrailGrowth.opacity(300, { ...persistent, shearPerS: 0.008 })).toBeLessThan(ContrailGrowth.opacity(300, { ...persistent, shearPerS: 0.001 }))
    })

    it("thins as a trail that lasts spreads, and is still there after a quarter of an hour", () => {
      expect(ContrailGrowth.opacity(900, persistent)).toBeGreaterThan(0)
      expect(ContrailGrowth.opacity(900, persistent)).toBeLessThan(ContrailGrowth.opacity(10, persistent))
    })

    it("disperses in the end: a trail that lasts is not seen after an hour, whatever the shear", () => {
      for (const shearPerS of [0, 0.001, 0.003, 0.008]) {
        expect(ContrailGrowth.opacity(3600, { ...persistent, shearPerS })).toBe(0)
      }
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
