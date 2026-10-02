import { describe, expect, test } from "vitest"
import { AircraftLighting } from "../../../src/engine/traffic/AircraftLighting.js"

describe("AircraftLighting", () => {
  test("the horizon of an aircraft at cruising height is more than three degrees low", () => {
    expect(AircraftLighting.dipDeg(0)).toBeCloseTo(0, 6)
    expect(AircraftLighting.dipDeg(1000)).toBeCloseTo(1.0, 0)
    expect(AircraftLighting.dipDeg(10668)).toBeCloseTo(3.27, 1)
  })

  test("at the observer's own place the Sun stands where the observer sees it", () => {
    const here = { lat: 48, lng: 2 }
    expect(AircraftLighting.sunElevationDeg({ altitudeDeg: 23, azimuthDeg: 200 }, here, here)).toBeCloseTo(23, 6)
  })

  test("an aircraft a hundred kilometres towards the Sun sees it a degree higher, and one away from it a degree lower", () => {
    const here = { lat: 0, lng: 0 }
    const degrees = 100 / 111.19
    const toward = AircraftLighting.sunElevationDeg({ altitudeDeg: 0, azimuthDeg: 270 }, here, { lat: 0, lng: -degrees })
    const away = AircraftLighting.sunElevationDeg({ altitudeDeg: 0, azimuthDeg: 270 }, here, { lat: 0, lng: degrees })
    expect(toward).toBeCloseTo(0.9, 1)
    expect(away).toBeCloseTo(-0.9, 1)
  })

  test("across the Sun's direction the horizontal does not tilt towards it", () => {
    const here = { lat: 0, lng: 0 }
    const north = AircraftLighting.sunElevationDeg({ altitudeDeg: 0, azimuthDeg: 270 }, here, { lat: 100 / 111.19, lng: 0 })
    expect(Math.abs(north)).toBeLessThan(0.01)
  })

  test("by day everything is lit, by night nothing, and the ground goes dark first", () => {
    expect(AircraftLighting.litFraction(30, 0)).toBe(1)
    expect(AircraftLighting.litFraction(-30, 10000)).toBe(0)
    // The Sun 2 degrees under the horizon: out for the ground, still on an aircraft at cruising height.
    expect(AircraftLighting.litFraction(-2, 0)).toBe(0)
    expect(AircraftLighting.litFraction(-2, 10668)).toBe(1)
  })

  test("it goes out smoothly over the Sun's own width as the aircraft's horizon passes it", () => {
    const height = 10668
    const edge = -AircraftLighting.dipDeg(height) - AircraftLighting.HORIZON_REFRACTION_DEG
    expect(AircraftLighting.litFraction(edge, height)).toBeCloseTo(0.5, 6)
    expect(AircraftLighting.litFraction(edge + 0.1, height)).toBeGreaterThan(0.5)
    expect(AircraftLighting.litFraction(edge - 0.1, height)).toBeLessThan(0.5)
    expect(AircraftLighting.litFraction(edge + 0.3, height)).toBe(1)
    expect(AircraftLighting.litFraction(edge - 0.3, height)).toBe(0)
  })

  test("a higher aircraft stays lit longer into the dusk", () => {
    const sun = -3.2
    expect(AircraftLighting.litFraction(sun, 12000)).toBeGreaterThan(AircraftLighting.litFraction(sun, 6000))
    expect(AircraftLighting.litFraction(sun, 6000)).toBeGreaterThan(AircraftLighting.litFraction(sun, 1000))
  })
})
