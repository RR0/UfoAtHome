import { describe, expect, it } from "vitest"
import { geoToLocalMeters, localMetersToGeo } from "../../../src/render3d/terrain/GeoProjection.js"

const ORIGIN_LAT = 43.837
const ORIGIN_LNG = 5.993

describe("geoToLocalMeters", () => {
  it("is the origin at (0,0)", () => {
    const { x, z } = geoToLocalMeters(ORIGIN_LAT, ORIGIN_LNG, ORIGIN_LAT, ORIGIN_LNG)
    expect(x).toBeCloseTo(0, 9)
    expect(z).toBeCloseTo(0, 9) // toBeCloseTo, not toBe: -0 vs 0 (from the -north negation) shouldn't fail this
  })

  it("north is -Z, matching skyColors.horizontalToCartesian's azimuth-0 convention", () => {
    const { x, z } = geoToLocalMeters(ORIGIN_LAT + 0.01, ORIGIN_LNG, ORIGIN_LAT, ORIGIN_LNG)
    expect(z).toBeLessThan(0)
    expect(x).toBeCloseTo(0, 6)
  })

  it("east is +X", () => {
    const { x, z } = geoToLocalMeters(ORIGIN_LAT, ORIGIN_LNG + 0.01, ORIGIN_LAT, ORIGIN_LNG)
    expect(x).toBeGreaterThan(0)
    expect(z).toBeCloseTo(0, 6)
  })

  it("one degree of latitude is about 111.32km", () => {
    const { z } = geoToLocalMeters(ORIGIN_LAT + 1, ORIGIN_LNG, ORIGIN_LAT, ORIGIN_LNG)
    expect(Math.abs(z)).toBeCloseTo(111320, -1)
  })
})

describe("localMetersToGeo", () => {
  it("round-trips geoToLocalMeters", () => {
    const lat = ORIGIN_LAT + 0.004
    const lng = ORIGIN_LNG - 0.006
    const { x, z } = geoToLocalMeters(lat, lng, ORIGIN_LAT, ORIGIN_LNG)
    const back = localMetersToGeo(x, z, ORIGIN_LAT, ORIGIN_LNG)
    expect(back.lat).toBeCloseTo(lat, 9)
    expect(back.lng).toBeCloseTo(lng, 9)
  })
})
