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
      // The shear's own share doubles with it, the turbulence's adding to it in quadrature: what the shear adds to the band the wake
      // let go, two spans wide after an hour.
      const wake = 2 * 35
      const sheared = (width: number) => Math.sqrt(width ** 2 - calm ** 2 + wake ** 2) - wake
      expect(sheared(strong) / sheared(typical)).toBeCloseTo(2, 6)
    })

    it("grows faster and faster in a shear, because the trail also deepens", () => {
      const at = (age: number) => ContrailGrowth.widthM(35, age, 0.004) - ContrailGrowth.widthM(35, age, 0)
      expect(at(3600) / at(1800)).toBeGreaterThan(2.5)
    })
  })

  describe("profileExponent", () => {
    it("is a band with sharp sides behind the aircraft and a diffusing Gaussian minutes later", () => {
      expect(ContrailGrowth.profileExponent(0)).toBeCloseTo(8, 6)
      expect(ContrailGrowth.profileExponent(300)).toBeGreaterThan(6)
      expect(ContrailGrowth.profileExponent(60)).toBeGreaterThan(ContrailGrowth.profileExponent(600))
      expect(ContrailGrowth.profileExponent(1800)).toBeCloseTo(2, 2)
    })
  })

  describe("widthM, in the first minutes", () => {
    it("is about as wide as the wings for the first minute, the wake holding it, and twice as wide once the wake lets it go", () => {
      expect(ContrailGrowth.widthM(35, 60, 0)).toBeLessThan(45)
      expect(ContrailGrowth.widthM(35, 600, 0)).toBeGreaterThan(70)
      expect(ContrailGrowth.widthM(35, 600, 0)).toBeLessThan(110)
    })

    it("spreads ever faster as it ages, turbulence taking a larger cloud apart faster", () => {
      const rate = (age: number) => ContrailGrowth.widthM(35, age + 60, 0) - ContrailGrowth.widthM(35, age, 0)
      expect(rate(1800)).toBeGreaterThan(rate(600))
      expect(rate(3600)).toBeGreaterThan(rate(1800))
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

    it("is fainter after a few minutes than where the exhaust has just cooled, and fainter still after ten", () => {
      const young = ContrailGrowth.opacity(1, persistent)
      expect(ContrailGrowth.opacity(240, persistent)).toBeLessThan(young * 0.75)
      expect(ContrailGrowth.opacity(600, persistent)).toBeLessThan(young * 0.55)
      // Yet still the optical depth of an aged trail measured from aircraft, 0.1 to 0.3 (Voigt et al., 2011).
      const depth = -Math.log(1 - ContrailGrowth.opacity(600, persistent))
      expect(depth).toBeGreaterThan(0.1)
      expect(depth).toBeLessThan(0.3)
    })

    it("thins faster in a shear that spreads it faster", () => {
      expect(ContrailGrowth.opacity(300, { ...persistent, shearPerS: 0.008 })).toBeLessThan(ContrailGrowth.opacity(300, { ...persistent, shearPerS: 0.001 }))
    })

    it("thins as a trail that lasts spreads, and is still there after a quarter of an hour", () => {
      expect(ContrailGrowth.opacity(900, persistent)).toBeGreaterThan(0)
      expect(ContrailGrowth.opacity(900, persistent)).toBeLessThan(ContrailGrowth.opacity(10, persistent))
    })

    it("lives as long as the air stays supersaturated: a wide band after an hour, fainter the more the wind spread it", () => {
      for (const shearPerS of [0, 0.001, 0.003, 0.008]) {
        expect(ContrailGrowth.opacity(3600, { ...persistent, shearPerS })).toBeGreaterThan(0)
        expect(ContrailGrowth.opacity(3600, { ...persistent, shearPerS })).toBeLessThan(ContrailGrowth.opacity(600, { ...persistent, shearPerS }))
      }
      expect(ContrailGrowth.opacity(3600, { ...persistent, shearPerS: 0.008 })).toBeLessThan(ContrailGrowth.opacity(3600, { ...persistent, shearPerS: 0 }))
    })

    it("sublimates within minutes once the air is no longer supersaturated", () => {
      const drying = { ...persistent, saturatedForS: 1200 }
      expect(ContrailGrowth.opacity(1100, drying)).toBeCloseTo(ContrailGrowth.opacity(1100, persistent), 6)
      expect(ContrailGrowth.opacity(1500, drying)).toBeLessThan(ContrailGrowth.opacity(1500, persistent) / 2)
      expect(ContrailGrowth.opacity(1900, drying)).toBe(0)
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
