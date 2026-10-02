import { describe, expect, it } from "vitest"
import type { UpperAirSample } from "../../../src/engine/traffic/UpperAirProvider.js"
import { UpperAirProfile } from "../../../src/engine/traffic/UpperAirProfile.js"

const level = (pressureHpa: number, temperatureC: number, relativeHumidity: number, windSpeedMs = 10, windFromDeg = 270) =>
  ({ pressureHpa, temperatureC, relativeHumidity, windSpeedMs, windFromDeg })

const HOUR = 3_600_000
const sample = (t: number, shift = 0): UpperAirSample => ({
  t,
  levels: [level(300, -45 + shift, 0.4), level(250, -55 + shift, 0.6), level(200, -58 + shift, 0.2)]
})

describe("UpperAirProfile", () => {
  describe("at", () => {
    it("reads a level as it is stated", () => {
      const air = UpperAirProfile.at([sample(0)], 0, 250)!
      expect(air.temperatureC).toBeCloseTo(-55, 6)
      expect(air.relativeHumidity).toBeCloseTo(0.6, 6)
    })

    it("interpolates between levels along the logarithm of the pressure", () => {
      const mid = Math.sqrt(300 * 250)
      const air = UpperAirProfile.at([sample(0)], 0, mid)!
      expect(air.temperatureC).toBeCloseTo(-50, 6)
      expect(air.relativeHumidity).toBeCloseTo(0.5, 6)
    })

    it("interpolates between hours", () => {
      const air = UpperAirProfile.at([sample(0), sample(HOUR, 4)], HOUR / 4, 250)!
      expect(air.temperatureC).toBeCloseTo(-54, 6)
    })

    it("holds the first and the last hour beyond the series, within an hour of it, and says nothing further off", () => {
      expect(UpperAirProfile.at([sample(HOUR)], HOUR - 1000, 250)).toBeDefined()
      expect(UpperAirProfile.at([sample(HOUR)], 5 * HOUR, 250)).toBeUndefined()
    })

    it("says nothing for a pressure outside the levels it has", () => {
      expect(UpperAirProfile.at([sample(0)], 0, 500)).toBeUndefined()
      expect(UpperAirProfile.at([sample(0)], 0, 100)).toBeUndefined()
    })

    it("says nothing when there is no sample", () => {
      expect(UpperAirProfile.at([], 0, 250)).toBeUndefined()
    })

    it("states the shear: how much the wind changes per second of height between the two levels that bracket the pressure", () => {
      const sheared = UpperAirProfile.at([{ t: 0, levels: [level(300, -50, 0.4, 10, 270), level(250, -50, 0.4, 20, 270)] }], 0, 270)!
      // 300 to 250 hPa at -50 C is about 1.19 km: 10 m/s over it.
      expect(sheared.shearPerS).toBeGreaterThan(0.0075)
      expect(sheared.shearPerS).toBeLessThan(0.0095)
    })

    it("counts a change of direction as shear too, not only of speed", () => {
      const turning = UpperAirProfile.at([{ t: 0, levels: [level(300, -50, 0.4, 20, 270), level(250, -50, 0.4, 20, 360)] }], 0, 270)!
      expect(turning.shearPerS).toBeGreaterThan(0.01)
    })

    it("has none where the wind is the same at both levels", () => {
      const steady = UpperAirProfile.at([{ t: 0, levels: [level(300, -50, 0.4, 15, 250), level(250, -50, 0.4, 15, 250)] }], 0, 270)!
      expect(steady.shearPerS).toBeCloseTo(0, 6)
    })

    it("turns the wind into a drift: east and north, towards where it blows", () => {
      const west = UpperAirProfile.at([{ t: 0, levels: [level(300, -45, 0.4, 20, 270), level(200, -58, 0.2, 20, 270)] }], 0, 250)!
      expect(west.driftEastMs).toBeCloseTo(20, 6)
      expect(Math.abs(west.driftNorthMs)).toBeLessThan(1e-6)
      const north = UpperAirProfile.at([{ t: 0, levels: [level(300, -45, 0.4, 10, 0), level(200, -58, 0.2, 10, 0)] }], 0, 250)!
      expect(north.driftNorthMs).toBeCloseTo(-10, 6)
    })
  })
})
