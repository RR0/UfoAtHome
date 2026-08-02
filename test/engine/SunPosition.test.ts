import { describe, expect, it } from "vitest"
import { computeSunPosition, skyBrightness } from "../../src/engine/astronomy/SunPosition.js"

describe("computeSunPosition", () => {
  it("places the sun well below the horizon for a pre-dawn sighting (Chiles-Whitted, 1948-07-24 02:45, Montgomery AL)", () => {
    const position = computeSunPosition({ lat: 32.3792, lng: -86.3077, year: 1948, month: 7, day: 24, hour: 2, minute: 45 })
    expect(position.altitudeDeg).toBeLessThan(-18)
    expect(skyBrightness(position.altitudeDeg)).toBe("night")
  })

  it("places the sun above the horizon around local solar noon in summer", () => {
    const position = computeSunPosition({ lat: 48.8566, lng: 2.3522, year: 2024, month: 6, day: 21, hour: 13, minute: 0 })
    expect(position.altitudeDeg).toBeGreaterThan(50)
    expect(skyBrightness(position.altitudeDeg)).toBe("day")
  })

  it("places the sun near the horizon around dawn/dusk", () => {
    const dawn = computeSunPosition({ lat: 45, lng: 0, year: 2024, month: 3, day: 20, hour: 6, minute: 0 })
    expect(Math.abs(dawn.altitudeDeg)).toBeLessThan(15)
  })

  it("keeps altitude within [-90, 90] and azimuth within [0, 360) across a full day", () => {
    for (let hour = 0; hour < 24; hour++) {
      const position = computeSunPosition({ lat: 51.5, lng: -0.1, year: 2024, month: 1, day: 1, hour, minute: 0 })
      expect(position.altitudeDeg).toBeGreaterThanOrEqual(-90)
      expect(position.altitudeDeg).toBeLessThanOrEqual(90)
      expect(position.azimuthDeg).toBeGreaterThanOrEqual(0)
      expect(position.azimuthDeg).toBeLessThan(360)
    }
  })
})

describe("skyBrightness", () => {
  it("classifies altitude into the standard twilight bands", () => {
    expect(skyBrightness(10)).toBe("day")
    expect(skyBrightness(-3)).toBe("civil-twilight")
    expect(skyBrightness(-9)).toBe("nautical-twilight")
    expect(skyBrightness(-15)).toBe("astronomical-twilight")
    expect(skyBrightness(-30)).toBe("night")
  })
})
