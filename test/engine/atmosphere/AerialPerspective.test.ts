import { describe, expect, it } from "vitest"
import { AerialPerspective } from "../../../src/engine/atmosphere/AerialPerspective.js"
import { AtmosphereProfile } from "../../../src/engine/atmosphere/AtmosphereProfile.js"

describe("the air between an eye and what it looks at", () => {
  it("lets a clear continental day see some forty kilometres at sea level", () => {
    const visibilityKm = new AerialPerspective().visibilityM(0) / 1000
    expect(visibilityKm).toBeGreaterThan(30)
    expect(visibilityKm).toBeLessThan(60)
  })

  it("sees less far through humid air than dry, from the haze that swells with it", () => {
    const dry = AerialPerspective.of({ relativeHumidity: 0.3, precipitationType: "none", precipitationIntensity: 0 })
    const humid = AerialPerspective.of({ relativeHumidity: 0.9, precipitationType: "none", precipitationIntensity: 0 })
    expect(humid.visibilityM(0)).toBeLessThan(dry.visibilityM(0) * 0.8)
  })

  it("takes a typical haze when nobody stated the humidity — the sky's own default", () => {
    const unstated = AerialPerspective.of({ precipitationType: "none", precipitationIntensity: 0 })
    expect(unstated.visibilityM(0)).toBeCloseTo(new AerialPerspective(AtmosphereProfile.DEFAULT_AEROSOL_OPTICAL_DEPTH).visibilityM(0), 3)
  })

  it("dims blue more than red over a long path, which is what reddens a distant light", () => {
    const [red, green, blue] = new AerialPerspective().transmittance(0, 0, 20000)
    expect(blue).toBeLessThan(green)
    expect(green).toBeLessThan(red)
  })

  it("sees further up in thinner air, and along a slant it averages the air it crosses", () => {
    const air = new AerialPerspective()
    expect(air.visibilityM(1500)).toBeGreaterThan(air.visibilityM(0) * 1.5)
    const level = air.transmittance(0, 0, 5000)[1]
    const slant = air.transmittance(0, 1500, 5000)[1]
    const high = air.transmittance(1500, 1500, 5000)[1]
    expect(slant).toBeGreaterThan(level)
    expect(slant).toBeLessThan(high)
  })

  it("thins with rain as the optical-link laws say, and more with snow of the same water", () => {
    const rain = (intensity: number) => AerialPerspective.of({ precipitationType: "rain", precipitationIntensity: intensity })
    // 1 mm/h and 8 mm/h (intensity 1): some ten, and some three kilometres.
    expect(rain(1 / 8).visibilityM(0) / 1000).toBeGreaterThan(7)
    expect(rain(1 / 8).visibilityM(0) / 1000).toBeLessThan(12)
    expect(rain(1).visibilityM(0) / 1000).toBeGreaterThan(2)
    expect(rain(1).visibilityM(0) / 1000).toBeLessThan(4)
    const snow = AerialPerspective.of({ precipitationType: "snow", precipitationIntensity: 1 / 8 })
    expect(snow.visibilityM(0)).toBeLessThan(rain(1 / 8).visibilityM(0) / 2)
    expect(AerialPerspective.precipitationExtinction({ precipitationType: "rain", precipitationIntensity: 0 })).toBe(0)
  })

  it("averages exp(−h/H) exactly along a straight rise", () => {
    const H = 1200
    expect(AerialPerspective.meanDensity(300, 300, H)).toBeCloseTo(Math.exp(-300 / H), 9)
    // Numerically integrated, it is the same thing.
    let sum = 0
    const steps = 10000
    for (let i = 0; i < steps; i++) sum += Math.exp(-(100 + (2000 * (i + 0.5)) / steps) / H)
    expect(AerialPerspective.meanDensity(100, 2100, H)).toBeCloseTo(sum / steps, 6)
    expect(AerialPerspective.meanDensity(2100, 100, H)).toBeCloseTo(sum / steps, 6)
  })
})
