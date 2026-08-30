import { describe, expect, it } from "vitest"
import { atmosphericExtinctionMag, atmosphericTransmission } from "../../src/render3d/skyColors.js"

describe("what the atmosphere takes out of a body's light", () => {
  it("takes nothing at the zenith and about five magnitudes at the horizon", () => {
    // The measured anchor, and the only number in this: sunlight on a surface facing it falls from
    // around a hundred thousand lux overhead to around a thousand at sunset. A hundredfold is five
    // magnitudes, and it is why a setting Sun can be looked straight at.
    expect(atmosphericExtinctionMag(90)).toBeCloseTo(0, 3)
    expect(atmosphericExtinctionMag(0)).toBeGreaterThan(4.5)
    expect(atmosphericExtinctionMag(0)).toBeLessThan(5.5)
    expect(atmosphericTransmission(90)).toBeCloseTo(1, 3)
    expect(atmosphericTransmission(0)).toBeLessThan(0.02)
  })

  it("never gives back light as the body sinks", () => {
    // The trap this exists for: the air-mass fit it is built on turns on itself below the horizon —
    // its denominator changes sign a degree down — so a Sun two degrees under came out through MORE
    // atmosphere than one four degrees under, and the dazzle brightened again as the Sun set.
    let previous = Infinity
    for (let altitude = 90; altitude >= -15; altitude -= 0.5) {
      const transmission = atmosphericTransmission(altitude)
      expect(transmission).toBeLessThanOrEqual(previous + 1e-9)
      previous = transmission
    }
  })

  it("dims the low Sun far more than the reddening alone ever did", () => {
    // The whole point of keeping this apart from atmosphericTint, which reddens without darkening:
    // a Sun ten degrees up has lost about half its light, and one on the horizon ninety-nine
    // hundredths of it. That is the fade a reader was asking for in place of a light being cut.
    expect(atmosphericTransmission(10)).toBeLessThan(0.7)
    expect(atmosphericTransmission(10)).toBeGreaterThan(0.4)
    expect(atmosphericTransmission(5)).toBeLessThan(atmosphericTransmission(10))
    expect(atmosphericTransmission(1)).toBeLessThan(0.1)
  })
})
