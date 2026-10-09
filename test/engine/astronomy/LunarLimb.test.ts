import * as Astronomy from "astronomy-engine"
import { describe, expect, it } from "vitest"
import { LunarDisc } from "../../../src/engine/astronomy/LunarDisc.js"
import { LunarLimb, LunarRelief } from "../../../src/engine/astronomy/LunarLimb.js"
import { SolarEclipse } from "../../../src/engine/astronomy/SolarEclipse.js"

const REIMS = { lat: 49.2583, lng: 4.0317, elevationM: 85 }
const TOTALITY = new Date(Date.UTC(1999, 7, 11, 10, 25, 30))

describe("the Moon's own frame", () => {
  it("puts the sub-observer point where the library's libration says the Earth sees it, to within the observer's parallax", () => {
    for (const date of [TOTALITY, new Date(Date.UTC(2016, 10, 14, 12)), new Date(Date.UTC(2024, 3, 8, 18))]) {
      const own = LunarLimb.subObserverPoint(date, { lat: 0, lng: 0, elevationM: 0 })
      const library = Astronomy.Libration(date)
      // A degree at most: the Earth's radius is a degree and a bit as seen from the Moon.
      expect(Math.abs(own.lonDeg - library.elon)).toBeLessThan(1.2)
      expect(Math.abs(own.latDeg - library.elat)).toBeLessThan(1.2)
    }
  })
})

describe("the limb of a smooth Moon", () => {
  const smooth = LunarRelief.smooth()

  it("is a circle of the radius the distance gives", () => {
    const profile = LunarLimb.profile(TOTALITY, REIMS, smooth, 720)
    const radius = LunarDisc.apparentRadiusDeg(TOTALITY, REIMS)
    expect(profile.meanRadiusDeg).toBeCloseTo(radius, 5)
    for (const value of profile.radiusDeg) expect(value).toBeCloseTo(radius, 5)
  })

  it("covers the Sun the way two circles do", () => {
    const profile = LunarLimb.profile(TOTALITY, REIMS, smooth, 2880)
    const sun = 0.2629
    for (const [up, right] of [[0, 0], [0.1, 0.05], [0.3, 0], [0, -0.45], [0.2, 0.2]]) {
      const separation = Math.hypot(up, right)
      const uncovered = LunarLimb.uncoveredFraction(profile, sun, { upDeg: up, rightDeg: right })
      expect(1 - uncovered).toBeCloseTo(SolarEclipse.overlap(sun, profile.meanRadiusDeg, separation), 3)
    }
  })
})

describe("a mountain on the limb", () => {
  it("stands out of the edge at the position angle it is at, by its height over the distance", () => {
    const heightKm = 4
    const angle = 120
    // A point 89.74° from the one facing the observer — on the limb — towards that position angle.
    const point = LunarLimb.surfacePoint(TOTALITY, REIMS, angle, 89.74)
    const profile = LunarLimb.profile(TOTALITY, REIMS, LunarRelief.withBump(point.latDeg, ((point.lonDeg % 360) + 360) % 360, heightKm), 2880)
    const deviation = Array.from(profile.radiusDeg, value => value - profile.meanRadiusDeg)
    const peak = deviation.indexOf(Math.max(...deviation))
    expect((peak / deviation.length) * 360).toBeGreaterThan(angle - 1.5)
    expect((peak / deviation.length) * 360).toBeLessThan(angle + 1.5)
    // 4 km at 383 000 km is 2.2 arcseconds: all of it, on the limb, in the direction of the line of sight's normal.
    const expectedDeg = ((heightKm / LunarDisc.distanceKm(TOTALITY, REIMS)) * 180) / Math.PI
    expect(deviation[peak]).toBeGreaterThan(0.6 * expectedDeg)
    expect(deviation[peak]).toBeLessThan(1.1 * expectedDeg)
  })
})
