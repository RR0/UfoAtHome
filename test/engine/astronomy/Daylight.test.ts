import { describe, expect, it } from "vitest"
import { Daylight } from "../../../src/engine/astronomy/Daylight.js"

describe("Daylight", () => {
  it("lights the ground fully while the Sun is up, and not at all once it is under the horizon", () => {
    expect(Daylight.directFraction(45, 0)).toBe(1)
    expect(Daylight.directFraction(1, 0)).toBe(1)
    // Three degrees under, the case of a scene with no date, which was lit orange: the whole disc is gone.
    expect(Daylight.directFraction(-3, 40)).toBe(0)
    expect(Daylight.directFraction(-1.3, 40)).toBe(0)
    expect(Daylight.directFraction(-20, 0)).toBe(0)
  })

  it("passes smoothly over the width of the disc: half of it above the horizon, half the light", () => {
    expect(Daylight.directFraction(0, 0)).toBeCloseTo(0.5, 5)
    const rising = [-0.3, -0.2, -0.1, 0, 0.1, 0.2, 0.3].map(altitude => Daylight.directFraction(altitude, 0))
    for (let i = 1; i < rising.length; i++) expect(rising[i]).toBeGreaterThanOrEqual(rising[i - 1])
    expect(rising[0]).toBe(0)
    expect(rising[6]).toBe(1)
  })

  it("keeps the Sun a little longer for a hill, by the dip of its horizon", () => {
    // Under the horizon by a tenth of a degree: gone from the sea shore, still half there from a place 100 m up (dip 0.32 degrees).
    expect(Daylight.directFraction(-0.3, 0)).toBe(0)
    expect(Daylight.directFraction(-0.3, 100)).toBeGreaterThan(0.4)
  })
})
