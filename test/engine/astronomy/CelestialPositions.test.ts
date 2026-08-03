import { describe, expect, it } from "vitest"
import * as Astronomy from "astronomy-engine"
import {
  computeBodyMagnitude,
  computeBodyPosition,
  computeMoonPhase,
  equatorialToHorizontal,
  sightingTimeToDate,
  TRACKED_PLANETS
} from "../../../src/engine/astronomy/CelestialPositions.js"

const PARIS = { lat: 48.8566, lng: 2.3522, elevationM: 35 }

describe("computeBodyPosition", () => {
  it("places the sun high in the sky around summer solar noon in Paris", () => {
    const position = computeBodyPosition("Sun", new Date(Date.UTC(2024, 5, 21, 11, 0, 0)), PARIS)
    expect(position.altitudeDeg).toBeGreaterThan(50)
  })

  it("places the sun well below the horizon at night", () => {
    const position = computeBodyPosition("Sun", new Date(Date.UTC(2024, 5, 21, 1, 0, 0)), PARIS)
    expect(position.altitudeDeg).toBeLessThan(0)
  })

  it("keeps altitude/azimuth within valid ranges for every tracked planet across a full day", () => {
    for (const body of TRACKED_PLANETS) {
      for (let hour = 0; hour < 24; hour += 3) {
        const position = computeBodyPosition(body, new Date(Date.UTC(2024, 5, 21, hour, 0, 0)), PARIS)
        expect(position.altitudeDeg).toBeGreaterThanOrEqual(-90)
        expect(position.altitudeDeg).toBeLessThanOrEqual(90)
        expect(position.azimuthDeg).toBeGreaterThanOrEqual(0)
        expect(position.azimuthDeg).toBeLessThan(360)
      }
    }
  })
})

describe("sightingTimeToDate", () => {
  it("is undefined when literally nothing (no year/month/day/hour) is known", () => {
    expect(sightingTimeToDate({}, 0)).toBeUndefined()
  })

  it("treats hour/minute as local clock time and subtracts the longitude-approximated timezone", () => {
    // Paris (lng ~2.35deg) rounds to UTC+0 here, so local noon should read as UTC noon.
    const date = sightingTimeToDate({ year: 2024, month: 6, day: 21, hour: 12, minute: 0 }, 2.3522)
    expect(date?.getUTCHours()).toBe(12)

    // Montgomery AL (lng ~-86.3deg) rounds to UTC-6, so a 2:45am local reading is 8:45am UTC.
    const nightDate = sightingTimeToDate({ year: 1948, month: 7, day: 24, hour: 2, minute: 45 }, -86.3077)
    expect(nightDate?.getUTCHours()).toBe(8)
    expect(nightDate?.getUTCMinutes()).toBe(45)
  })

  it("defaults month/day to Jan 1 when only the year is known", () => {
    const date = sightingTimeToDate({ year: 1965 }, 0)
    expect(date?.getUTCFullYear()).toBe(1965)
    expect(date?.getUTCMonth()).toBe(0)
    expect(date?.getUTCDate()).toBe(1)
  })

  it("still renders an hour-only witness memory (no date at all) via a fixed reference date, not undefined", () => {
    const date = sightingTimeToDate({ hour: 2 }, 0)
    expect(date).toBeDefined()
    expect(date?.getUTCHours()).toBe(2)
  })

  it("an hour-only date is deterministic (same reference date every time, not 'today')", () => {
    const a = sightingTimeToDate({ hour: 2 }, 0)
    const b = sightingTimeToDate({ hour: 2 }, 0)
    expect(a?.getTime()).toBe(b?.getTime())
  })
})

describe("computeBodyMagnitude", () => {
  it("reports Venus as much brighter (lower magnitude) than Saturn on the same date", () => {
    const date = new Date(Date.UTC(2024, 5, 21, 20, 0, 0))
    const venusMag = computeBodyMagnitude("Venus", date)
    const saturnMag = computeBodyMagnitude("Saturn", date)
    expect(venusMag).toBeLessThan(saturnMag)
    expect(venusMag).toBeLessThan(0)
  })
})

describe("equatorialToHorizontal", () => {
  it("agrees with computeBodyPosition when fed the same body's own RA/dec", () => {
    const date = new Date(Date.UTC(2024, 5, 21, 20, 0, 0))
    const obs = new Astronomy.Observer(PARIS.lat, PARIS.lng, PARIS.elevationM)
    const equatorial = Astronomy.Equator(Astronomy.Body.Venus, date, obs, true, true)

    const fromWrapper = computeBodyPosition("Venus", date, PARIS)
    const fromTransform = equatorialToHorizontal(equatorial.ra, equatorial.dec, date, PARIS)

    expect(fromTransform.altitudeDeg).toBeCloseTo(fromWrapper.altitudeDeg, 6)
    expect(fromTransform.azimuthDeg).toBeCloseTo(fromWrapper.azimuthDeg, 6)
  })
})

describe("computeMoonPhase", () => {
  it("keeps phaseFraction/illuminatedFraction within their valid ranges", () => {
    for (let day = 1; day <= 28; day += 3) {
      const phase = computeMoonPhase(new Date(Date.UTC(2024, 5, day, 12, 0, 0)))
      expect(phase.phaseFraction).toBeGreaterThanOrEqual(0)
      expect(phase.phaseFraction).toBeLessThan(1)
      expect(phase.illuminatedFraction).toBeGreaterThanOrEqual(0)
      expect(phase.illuminatedFraction).toBeLessThanOrEqual(1)
    }
  })

  it("reports near-zero illumination at a real new moon and near-full illumination at a real full moon", () => {
    // quarter: 0 = new moon, 1 = first quarter, 2 = full moon, 3 = third quarter.
    let quarter = Astronomy.SearchMoonQuarter(new Date(Date.UTC(2024, 0, 1)))
    let newMoon: Astronomy.MoonQuarter | undefined
    let fullMoon: Astronomy.MoonQuarter | undefined
    while (!newMoon || !fullMoon) {
      if (quarter.quarter === 0) newMoon = quarter
      if (quarter.quarter === 2) fullMoon = quarter
      quarter = Astronomy.NextMoonQuarter(quarter)
    }

    expect(computeMoonPhase(newMoon.time.date).illuminatedFraction).toBeLessThan(0.05)
    expect(computeMoonPhase(fullMoon.time.date).illuminatedFraction).toBeGreaterThan(0.95)
  })
})
