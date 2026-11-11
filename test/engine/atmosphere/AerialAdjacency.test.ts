import { describe, expect, it } from "vitest"
import { AerialAdjacency } from "../../../src/engine/atmosphere/AerialAdjacency.js"
import { AerialPerspective } from "../../../src/engine/atmosphere/AerialPerspective.js"
import { AtmosphereProfile } from "../../../src/engine/atmosphere/AtmosphereProfile.js"

describe("Where the light the air lays over ground comes from", () => {
  const haze = (cosAngle: number) => AtmosphereProfile.aerosolPhase(cosAngle)

  it("is the ground for half of what the air's molecules scatter, at any angle", () => {
    // Rayleigh scatters as much forward as back: a symmetric lobe is cut in two by any plane through it.
    for (const elevation of [0, 20, 45, 90]) {
      expect(AerialAdjacency.groundShare(elevation, AtmosphereProfile.rayleighPhase)).toBeCloseTo(0.5, 2)
    }
  })

  it("is the ground for most of what haze scatters towards an eye above it, and more the steeper it looks down", () => {
    const shares = [10, 20, 30, 60, 90].map(elevation => AerialAdjacency.groundShare(elevation, haze))
    for (let i = 1; i < shares.length; i++) expect(shares[i]).toBeGreaterThan(shares[i - 1])
    // The Concorde's frame, 17° to 35° below the horizon.
    expect(shares[1]).toBeGreaterThan(0.8)
    // Looking along the horizontal, the ground and the sky each fill half of the lobe.
    expect(AerialAdjacency.groundShare(0, haze)).toBeCloseTo(0.5, 2)
  })

  it("sums a phase function to one over the whole sphere, so the shares are shares", () => {
    // The lower half of the directions with the lobe as it is, and with the lobe turned round: together the whole sphere.
    for (const elevation of [15, 40, 90]) {
      expect(AerialAdjacency.groundShare(elevation, haze) + AerialAdjacency.groundShare(elevation, (cosAngle: number) => haze(-cosAngle)))
        .toBeCloseTo(1, 2)
    }
  })

  it("comes from kilometres round at a slant, and from close under a look straight down", () => {
    const slant = AerialAdjacency.neighbourhoodRadiusM(25, haze, AtmosphereProfile.AEROSOL_SCALE_HEIGHT_M)
    const down = AerialAdjacency.neighbourhoodRadiusM(90, haze, AtmosphereProfile.AEROSOL_SCALE_HEIGHT_M)
    expect(slant).toBeGreaterThan(1500)
    expect(down).toBeLessThan(slant)
    expect(down).toBeGreaterThan(100)
  })

  it("weighs the ground by what scatters rather than absorbs, and by how much of the extinction each takes", () => {
    const share = AerialAdjacency.interpolate(AerialAdjacency.table().haze, 25)
    expect(AerialAdjacency.groundWeight(25, 0, 1e-3)).toBeCloseTo(AtmosphereProfile.AEROSOL_SINGLE_SCATTERING_ALBEDO * share, 6)
    expect(AerialAdjacency.groundWeight(25, 1e-3, 0)).toBeCloseTo(0.5, 2)
    expect(AerialAdjacency.groundWeight(25, 0, 0)).toBe(0)
  })
})

describe("A stated visibility", () => {
  it("is the haze, read back from Koschmieder's law at the ground it was stated for", () => {
    const air = AerialPerspective.of({ visibilityKm: 10, precipitationType: "none", precipitationIntensity: 0 })
    expect(air.visibilityM(0)).toBeCloseTo(10_000, -1)
    const mesa = AerialPerspective.of({ visibilityKm: 10, precipitationType: "none", precipitationIntensity: 0 }, 1500)
    expect(mesa.visibilityM(1500)).toBeCloseTo(10_000, -1)
  })

  it("outranks the humidity, which only guesses at a typical haze", () => {
    const stated = AerialPerspective.aerosolOpticalDepthOf({ visibilityKm: 4, relativeHumidity: 0.5 })
    const guessed = AerialPerspective.aerosolOpticalDepthOf({ relativeHumidity: 0.5 })
    expect(stated).toBeGreaterThan(guessed!)
  })

  it("leaves no haze, rather than a negative one, past what the molecules alone allow", () => {
    expect(AerialPerspective.aerosolOpticalDepthOf({ visibilityKm: 400 })).toBe(0)
  })
})
