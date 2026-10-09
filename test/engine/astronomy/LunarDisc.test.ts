import * as Astronomy from "astronomy-engine"
import { describe, expect, it } from "vitest"
import { LunarDisc } from "../../../src/engine/astronomy/LunarDisc.js"
import { RedMoon } from "../../../src/engine/astronomy/RedMoon.js"

const PARIS = { lat: 48.8566, lng: 2.3522, elevationM: 35 }

describe("the Moon's disc", () => {
  it("is 0.518° across at the mean distance, and 14 % wider at perigee than at apogee", () => {
    expect(LunarDisc.MEAN_RADIUS_DEG * 2).toBeCloseTo(0.518, 3)
    expect(LunarDisc.radiusAtKm(356_500) / LunarDisc.radiusAtKm(406_700)).toBeCloseTo(1.14, 2)
  })

  it("is the supermoon of 14 November 2016 at its rising over Paris: 8 % wider than the mean", () => {
    const rising = new Date(Date.UTC(2016, 10, 14, 16, 41))
    const radius = LunarDisc.apparentRadiusDeg(rising, PARIS)
    expect(LunarDisc.distanceKm(rising, PARIS)).toBeLessThan(LunarDisc.SUPERMOON_DISTANCE_KM)
    expect(LunarDisc.relativeToMean(radius)).toBeGreaterThan(0.07)
    expect(LunarDisc.relativeToMean(radius)).toBeLessThan(0.09)
  })

  it("is smaller on the horizon than overhead: the Moon there is up to an Earth radius farther", () => {
    // At the same moment, the observer is nearer to the Moon by R·sin(altitude) than the Earth's centre is.
    const date = new Date(Date.UTC(2016, 10, 14, 23, 30))
    const place = new Astronomy.Observer(PARIS.lat, PARIS.lng, PARIS.elevationM)
    const equator = Astronomy.Equator(Astronomy.Body.Moon, date, place, true, true)
    const altitude = Astronomy.Horizon(date, place, equator.ra, equator.dec).altitude
    const geocentric = Astronomy.GeoVector(Astronomy.Body.Moon, date, true)
    const centreKm = Math.hypot(geocentric.x, geocentric.y, geocentric.z) * 149_597_870.7
    expect(altitude).toBeGreaterThan(5)
    expect(LunarDisc.distanceKm(date, PARIS)).toBeCloseTo(centreKm - 6371 * Math.sin((altitude * Math.PI) / 180), -2)
    expect(LunarDisc.distanceKm(date, PARIS)).toBeLessThan(centreKm)
  })
})

describe("the lune rousse", () => {
  it("computes Easter", () => {
    const easter = (year: number) => RedMoon.easter(year).toISOString().slice(0, 10)
    expect(easter(2024)).toBe("2024-03-31")
    expect(easter(2025)).toBe("2025-04-20")
    expect(easter(2026)).toBe("2026-04-05")
    expect(easter(1999)).toBe("1999-04-04")
  })

  it("is the lunation begun by the first new Moon after Easter, and its full Moon", () => {
    const lunation = RedMoon.lunation(2026)!
    expect(lunation.begin.toISOString().slice(0, 10)).toBe("2026-04-17")
    expect(lunation.full.toISOString().slice(0, 10)).toBe("2026-05-01")
    expect(lunation.end.toISOString().slice(0, 10)).toBe("2026-05-16")
    expect(RedMoon.isIn(new Date(Date.UTC(2026, 4, 1, 19, 24)))).toBe(true)
    expect(RedMoon.isIn(new Date(Date.UTC(2026, 3, 10)))).toBe(false)
    expect(RedMoon.isIn(new Date(Date.UTC(2026, 4, 20)))).toBe(false)
  })

  it("is not defined before the Gregorian calendar", () => {
    expect(RedMoon.lunation(1500)).toBeUndefined()
  })
})
