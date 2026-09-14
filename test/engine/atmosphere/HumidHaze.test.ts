import { describe, expect, it } from "vitest"
import { AtmosphereProfile } from "../../../src/engine/atmosphere/AtmosphereProfile.js"
import { HumidHaze } from "../../../src/engine/atmosphere/HumidHaze.js"

describe("haze that swells with the humidity", () => {
  it("reads relative humidity off a temperature and its dew point", () => {
    expect(HumidHaze.relativeHumidity(20, 20)).toBeCloseTo(1, 6)
    // 20 °C with a 10 °C dew point is 52-53 % in any psychrometric table.
    expect(HumidHaze.relativeHumidity(20, 10)).toBeCloseTo(0.525, 2)
    expect(HumidHaze.relativeHumidity(30, -5)).toBeLessThan(0.1)
  })

  it("gives half-saturated air the haze assumed when nothing is known", () => {
    expect(HumidHaze.opticalDepth(0.5)).toBeCloseTo(AtmosphereProfile.DEFAULT_AEROSOL_OPTICAL_DEPTH, 2)
  })

  it("makes a humid dawn milkier than a dry afternoon, and stops short of fog", () => {
    expect(HumidHaze.opticalDepth(0.9)).toBeGreaterThan(1.5 * HumidHaze.opticalDepth(0.2))
    expect(HumidHaze.opticalDepth(1)).toBe(HumidHaze.opticalDepth(HumidHaze.MAX_RELATIVE_HUMIDITY))
    expect(HumidHaze.opticalDepth(1)).toBeLessThan(0.25)
  })

  it("builds a new sky only when the step changes", () => {
    expect(HumidHaze.steppedOpticalDepth(0.5)).toBe(HumidHaze.steppedOpticalDepth(0.52))
    expect(HumidHaze.steppedOpticalDepth(0.3)).not.toBe(HumidHaze.steppedOpticalDepth(0.92))
  })
})
