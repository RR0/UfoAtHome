import { describe, expect, test } from "vitest"
import { Igrf } from "../../../src/engine/astronomy/Igrf.js"
import { Geomagnetism } from "../../../src/engine/astronomy/Geomagnetism.js"

describe("Igrf", () => {
  const place = (latDeg: number, lngDeg: number): [number, number, number] => {
    const lat = (latDeg * Math.PI) / 180, lng = (lngDeg * Math.PI) / 180
    return [Igrf.A_KM * Math.cos(lat) * Math.cos(lng), Igrf.A_KM * Math.cos(lat) * Math.sin(lng), Igrf.A_KM * Math.sin(lat)]
  }

  test("gives the field at Paris in 2020 as the observatories measure it: some 47.9 µT, dipping 64.6°", () => {
    const p = place(48.85, 2.35)
    const b = Igrf.fieldAt(Igrf.coefficientsAt(new Date("2020-01-01")), ...p)
    const total = Math.hypot(...b)
    const down = -(b[0] * p[0] + b[1] * p[1] + b[2] * p[2]) / Igrf.A_KM
    expect(total).toBeGreaterThan(47_000)
    expect(total).toBeLessThan(49_000)
    expect((Math.asin(down / total) * 180) / Math.PI).toBeCloseTo(64.6, 0)
  })

  test("puts a place at the apex latitude of its field line, not at a centred dipole's: Paris six degrees further from the oval", () => {
    const date = new Date("2024-05-10")
    expect(Igrf.apexLatitude(48.85, 2.35, date)).toBeCloseTo(44.4, 0)
    expect(Geomagnetism.latitudeOf(48.85, 2.35, date)).toBeCloseTo(50.4, 0)
    // Tromsø and Fairbanks, under the auroral zone, near their corrected geomagnetic latitudes.
    expect(Igrf.apexLatitude(69.65, 18.96, date)).toBeCloseTo(67, 0)
    expect(Igrf.apexLatitude(64.84, -147.7, date)).toBeCloseTo(65, 0)
  })

  test("a southern place is south of the magnetic equator", () => {
    expect(Igrf.apexLatitude(-42.9, 147.3, new Date("2024-01-01"))).toBeLessThan(-50)
  })

  test("follows the field's own drift: Montreal was nearer the magnetic pole in 1938 than now", () => {
    expect(Igrf.apexLatitude(45.5, -73.6, new Date("1938-01-25"))).toBeGreaterThan(Igrf.apexLatitude(45.5, -73.6, new Date("2024-01-01")) + 3)
  })
})

describe("Geomagnetism", () => {
  test("moves the geomagnetic pole as the IGRF's epochs do", () => {
    expect(Geomagnetism.poleAt(new Date("1900-01-01")).lat).toBeCloseTo(78.7, 1)
    expect(Geomagnetism.poleAt(new Date("2020-01-01")).lat).toBeCloseTo(80.7, 1)
    expect(Geomagnetism.latitudeOf(80.7, -72.7, new Date("2020-01-01"))).toBeCloseTo(90, 1)
  })

  test("reads magnetic local time from the Sun: noon under it, midnight opposite", () => {
    const axis = [0, 0, 1]
    expect(Geomagnetism.localTime([1, 0, 0], axis, [1, 0, 0])).toBeCloseTo(12, 6)
    expect(Geomagnetism.localTime([-1, 0, 0], axis, [1, 0, 0])).toBeCloseTo(0, 6)
    // East of the Sun's meridian it is later.
    expect(Geomagnetism.localTime([0, 1, 0], axis, [1, 0, 0])).toBeCloseTo(18, 6)
  })

  test("a field line leans towards the equator as it rises", () => {
    expect(Geomagnetism.footLatitude(65, 100)).toBeCloseTo(65, 6)
    expect(Geomagnetism.footLatitude(65, 300)).toBeGreaterThan(65)
    expect(Geomagnetism.footLatitude(-65, 300)).toBeLessThan(-65)
  })
})
