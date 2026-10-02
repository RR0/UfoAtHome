import { describe, expect, it } from "vitest"
import { ContrailPhysics } from "../../../src/engine/traffic/ContrailPhysics.js"

describe("ContrailPhysics", () => {
  describe("pressureAtAltitudeFt", () => {
    it("is the standard atmosphere's: 1013.25 hPa at 0, 226.3 at the tropopause, 300.9 at FL300", () => {
      expect(ContrailPhysics.pressureAtAltitudeFt(0)).toBeCloseTo(1013.25, 1)
      expect(ContrailPhysics.pressureAtAltitudeFt(36089)).toBeCloseTo(226.3, 0)
      expect(ContrailPhysics.pressureAtAltitudeFt(30000)).toBeCloseTo(300.9, 0)
    })

    it("keeps falling above the tropopause, isothermally", () => {
      expect(ContrailPhysics.pressureAtAltitudeFt(41000)).toBeCloseTo(179, -1)
    })
  })

  describe("saturation vapour pressure", () => {
    it("matches the published values over water and over ice", () => {
      expect(ContrailPhysics.saturationOverWaterPa(0)).toBeCloseTo(611.2, 0)
      expect(ContrailPhysics.saturationOverWaterPa(-40)).toBeCloseTo(18.9, 0)
      expect(ContrailPhysics.saturationOverIcePa(0)).toBeCloseTo(611.2, 0)
      expect(ContrailPhysics.saturationOverIcePa(-40)).toBeCloseTo(12.84, 1)
    })

    it("is lower over ice than over water below freezing, the more so the colder", () => {
      const ratio = (c: number) => ContrailPhysics.saturationOverWaterPa(c) / ContrailPhysics.saturationOverIcePa(c)
      expect(ratio(-20)).toBeGreaterThan(1)
      expect(ratio(-60)).toBeGreaterThan(ratio(-40))
    })
  })

  describe("iceRelativeHumidity", () => {
    it("is 1 exactly where the air is saturated over ice", () => {
      const rhw = ContrailPhysics.saturationOverIcePa(-50) / ContrailPhysics.saturationOverWaterPa(-50)
      expect(ContrailPhysics.iceRelativeHumidity(-50, rhw)).toBeCloseTo(1, 6)
    })

    it("is more than the humidity over water when it is cold", () => {
      expect(ContrailPhysics.iceRelativeHumidity(-50, 0.5)).toBeGreaterThan(0.5)
    })
  })

  describe("criticalTemperatureC", () => {
    it("is about -41 C at 250 hPa for a modern turbofan, and warmer lower down", () => {
      const at250 = ContrailPhysics.criticalTemperatureC(250, 0.35)
      expect(at250).toBeGreaterThan(-42.5)
      expect(at250).toBeLessThan(-39.5)
      expect(ContrailPhysics.criticalTemperatureC(300, 0.35)).toBeGreaterThan(at250)
    })

    it("is warmer for a more efficient engine: less of the fuel's heat goes to the exhaust", () => {
      expect(ContrailPhysics.criticalTemperatureC(250, 0.4)).toBeGreaterThan(ContrailPhysics.criticalTemperatureC(250, 0.3))
    })
  })

  describe("requiredHumidity", () => {
    it("is 1 at the critical temperature and falls to nothing a few degrees below it", () => {
      const critical = ContrailPhysics.criticalTemperatureC(250, 0.35)
      expect(ContrailPhysics.requiredHumidity(250, 0.35, critical)).toBeCloseTo(1, 3)
      expect(ContrailPhysics.requiredHumidity(250, 0.35, critical - 4)).toBeLessThan(1)
      expect(ContrailPhysics.requiredHumidity(250, 0.35, critical - 12)).toBeLessThanOrEqual(0)
    })
  })

  describe("evaluate", () => {
    const air = (temperatureC: number, relativeHumidity: number, pressureHpa = 250) => ({ pressureHpa, temperatureC, relativeHumidity })

    it("forms nothing in air warmer than the critical temperature, however damp", () => {
      expect(ContrailPhysics.evaluate(air(-30, 1), 0.35).forms).toBe(false)
    })

    it("forms one in cold dry air, which is gone at once", () => {
      const result = ContrailPhysics.evaluate(air(-55, 0.1), 0.35)
      expect(result.forms).toBe(true)
      expect(result.persistent).toBe(false)
    })

    it("does not form one in air only a little below the critical temperature unless it is damp", () => {
      expect(ContrailPhysics.evaluate(air(-45, 0.3), 0.35).forms).toBe(false)
      expect(ContrailPhysics.evaluate(air(-45, 0.95), 0.35).forms).toBe(true)
    })

    it("persists where the air is supersaturated over ice, and only there", () => {
      const saturated = ContrailPhysics.saturationOverIcePa(-55) / ContrailPhysics.saturationOverWaterPa(-55)
      expect(ContrailPhysics.evaluate(air(-55, saturated * 1.1), 0.35).persistent).toBe(true)
      expect(ContrailPhysics.evaluate(air(-55, saturated * 0.8), 0.35).persistent).toBe(false)
    })

    it("never persists what did not form", () => {
      const result = ContrailPhysics.evaluate(air(-30, 1), 0.35)
      expect(result.persistent).toBe(false)
    })

    it("reports what it was decided from", () => {
      const result = ContrailPhysics.evaluate(air(-55, 0.3), 0.35)
      expect(result.criticalTemperatureC).toBeCloseTo(ContrailPhysics.criticalTemperatureC(250, 0.35), 6)
      expect(result.iceRelativeHumidity).toBeCloseTo(ContrailPhysics.iceRelativeHumidity(-55, 0.3), 6)
    })
  })
})
