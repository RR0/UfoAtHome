import { describe, expect, test } from "vitest"
import { AmbientNoise } from "../../../src/engine/traffic/AmbientNoise.js"

const calm = { windSpeed: 0, precipitationType: "none", precipitationIntensity: 0 }

describe("AmbientNoise", () => {
  test("a calm night is the base: a quiet rural place", () => {
    expect(AmbientNoise.dbA(calm)).toBeCloseTo(30, 1)
  })

  test("the wind makes it louder, by what is reported of wind in the trees", () => {
    const at = (windSpeed: number) => AmbientNoise.dbA({ ...calm, windSpeed })
    expect(at(1)).toBeGreaterThan(30)
    expect(at(3)).toBeGreaterThan(40)
    expect(at(3)).toBeLessThan(43)
    expect(at(8)).toBeGreaterThan(51)
    expect(at(20)).toBeGreaterThan(65)
    expect(at(40)).toBeLessThan(70)
  })

  test("rain adds its patter to it, and a heavier rain more", () => {
    const at = (precipitationIntensity: number) => AmbientNoise.dbA({ ...calm, precipitationType: "rain", precipitationIntensity })
    expect(at(0.1)).toBeGreaterThan(41)
    expect(at(0.6)).toBeGreaterThan(at(0.1))
    expect(at(1)).toBeGreaterThan(64)
  })

  test("snow falls in silence, as the scene plays it: only its wind carries", () => {
    expect(AmbientNoise.dbA({ ...calm, precipitationType: "snow", precipitationIntensity: 1 })).toBeCloseTo(30, 1)
  })

  test("wind and rain together are louder than either, as energies add and not decibels", () => {
    const wind = AmbientNoise.dbA({ ...calm, windSpeed: 8 })
    const rain = AmbientNoise.dbA({ ...calm, precipitationType: "rain", precipitationIntensity: 0.6 })
    const both = AmbientNoise.dbA({ windSpeed: 8, precipitationType: "rain", precipitationIntensity: 0.6 })
    expect(both).toBeGreaterThan(Math.max(wind, rain))
    expect(both).toBeLessThan(Math.max(wind, rain) + 3.1)
  })

  test("the scene's own bed is played as WeatherAudio plays it: the wind at its speed over twenty once above one metre a second, the rain at its intensity", () => {
    expect(AmbientNoise.bedVolume(calm)).toBe(0)
    expect(AmbientNoise.bedVolume({ ...calm, windSpeed: 0.8 })).toBe(0)
    expect(AmbientNoise.bedVolume({ ...calm, windSpeed: 10 })).toBeCloseTo(0.5, 9)
    expect(AmbientNoise.bedVolume({ ...calm, windSpeed: 40 })).toBe(1)
    expect(AmbientNoise.bedVolume({ ...calm, precipitationType: "rain", precipitationIntensity: 0.4 })).toBeCloseTo(0.4, 9)
    expect(AmbientNoise.bedVolume({ ...calm, precipitationType: "hail", precipitationIntensity: 0.5 })).toBeCloseTo(0.85, 9)
    expect(AmbientNoise.bedVolume({ ...calm, precipitationType: "snow", precipitationIntensity: 1 })).toBe(0)
  })

  test("a sound at the ambient level is played as loud as the scene's own bed, and at a faint minimum where there is none", () => {
    expect(AmbientNoise.referenceAmplitude(calm)).toBe(AmbientNoise.MINIMUM_REFERENCE)
    expect(AmbientNoise.referenceAmplitude({ ...calm, windSpeed: 10 })).toBeCloseTo(AmbientNoise.BED_RMS * 0.5, 9)
    expect(AmbientNoise.referenceAmplitude({ ...calm, windSpeed: 20 })).toBeCloseTo(AmbientNoise.BED_RMS, 9)
  })

  test("the louder the weather, the louder the reference an aircraft is played against", () => {
    const at = (windSpeed: number) => AmbientNoise.referenceAmplitude({ ...calm, windSpeed })
    expect(at(15)).toBeGreaterThan(at(5))
  })
})
