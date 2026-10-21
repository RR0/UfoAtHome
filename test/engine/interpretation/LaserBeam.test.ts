import { describe, expect, test } from "vitest"
import { AerialPerspective } from "../../../src/engine/atmosphere/AerialPerspective.js"
import { LaserBeamSighting } from "../../../src/engine/interpretation/LaserBeam.js"
import type { BeamJson } from "../../../src/engine/interpretation/LaserBeam.js"

/** The shot of 9 October 2026, from the Grande Coupole of Meudon to the Arago dome of the Paris Observatory. */
const MEUDON_TO_PARIS: BeamJson = {
  id: "shot",
  path: [
    { lat: 48.805, lng: 2.23105, altitudeM: 172 },
    { lat: 48.83632, lng: 2.33702, altitudeM: 88 }
  ],
  wavelengthNm: 532,
  powerW: 10
}

const air = new AerialPerspective()

describe("LaserBeamSighting", () => {
  test("follows a straight line between the two observatories, half the 17 km of the round trip", () => {
    const samples = LaserBeamSighting.samplesOf(MEUDON_TO_PARIS, { lat: 48.805, lng: 2.23105 }, air)
    const last = samples[samples.length - 1]
    expect(last.fromSourceM).toBeGreaterThan(8400)
    expect(last.fromSourceM).toBeLessThan(8600)
    // Light covers it there and back in 57 microseconds, as the experiment measured.
    expect((2 * last.fromSourceM) / 299792458 * 1e6).toBeCloseTo(57, 0)
    expect(samples.every((sample, i) => i === 0 || sample.fromSourceM - samples[i - 1].fromSourceM <= LaserBeamSighting.STEP_M + 1e-6)).toBe(true)
  })

  test("is placed round the observer with its heights from the sea, less the Earth's curve", () => {
    const samples = LaserBeamSighting.samplesOf(MEUDON_TO_PARIS, { lat: 48.805, lng: 2.23105 }, air)
    expect(samples[0].upM).toBeCloseTo(172, 0)
    expect(Math.hypot(samples[0].eastM, samples[0].northM)).toBeLessThan(0.5)
    const last = samples[samples.length - 1]
    // 8.5 km off, the ground has fallen 5.7 m under the plane of the emitter's horizon.
    expect(last.upM).toBeCloseTo(88 - (8500 ** 2) / (2 * 6371000), 0)
    expect(Math.atan2(last.eastM, last.northM) * 180 / Math.PI).toBeCloseTo(66, 0)
    // A chord stands above the ground between its ends: the altitude of its middle is more than the mean of theirs.
    const middle = samples[Math.floor(samples.length / 2)]
    expect(middle.altitudeM).toBeGreaterThan((172 + 88) / 2)
  })

  test("loses power to the air and widens as it goes", () => {
    const samples = LaserBeamSighting.samplesOf(MEUDON_TO_PARIS, { lat: 48.805, lng: 2.23105 }, air)
    const last = samples[samples.length - 1]
    expect(samples[0].powerW).toBe(10)
    expect(last.powerW).toBeLessThan(10)
    // The clear air of the default haze, 40 km of visibility: half of it is left after 8.5 km.
    expect(last.powerW).toBeGreaterThan(3)
    expect(last.widthM).toBeCloseTo(LaserBeamSighting.DEFAULT_APERTURE_M + LaserBeamSighting.DEFAULT_DIVERGENCE_MRAD / 1000 * last.fromSourceM, 6)
  })

  test("is on only between its own instants", () => {
    const beam = { ...MEUDON_TO_PARIS, fromT: 1000, untilT: 2000 }
    expect(LaserBeamSighting.onAt([beam], 500)).toHaveLength(0)
    expect(LaserBeamSighting.onAt([beam], 1500)).toHaveLength(1)
    expect(LaserBeamSighting.onAt([beam], 2500)).toHaveLength(0)
  })

  test("scatters more light forward than sideways, and its phase functions hold all the light", () => {
    const coefficients = { rayleighPerM: 1, aerosolPerM: 0 }
    // The integral over the sphere of each phase function is one.
    let rayleigh = 0
    let haze = 0
    const steps = 2000
    for (let i = 0; i < steps; i++) {
      const cos = -1 + (2 * (i + 0.5)) / steps
      rayleigh += LaserBeamSighting.phasedScattering(coefficients, cos) * 2 * Math.PI * (2 / steps)
      haze += LaserBeamSighting.phasedScattering({ rayleighPerM: 0, aerosolPerM: 1 }, cos) * 2 * Math.PI * (2 / steps)
    }
    expect(rayleigh).toBeCloseTo(1, 3)
    expect(haze).toBeCloseTo(LaserBeamSighting.AEROSOL_SINGLE_SCATTERING_ALBEDO, 2)
    const hazy = { rayleighPerM: 1e-5, aerosolPerM: 1e-4 }
    expect(LaserBeamSighting.phasedScattering(hazy, 0.99)).toBeGreaterThan(10 * LaserBeamSighting.phasedScattering(hazy, 0))
  })

  test("is green and of no negative primary at 532 nm", () => {
    const [r, g, b] = LaserBeamSighting.colourOf(532)
    expect(Math.min(r, g, b)).toBeGreaterThanOrEqual(-1e-9)
    expect(g).toBeGreaterThan(5 * Math.max(r, b))
    // Its luminance is one.
    expect(0.2126 * r + 0.7152 * g + 0.0722 * b).toBeCloseTo(1, 2)
    expect(LaserBeamSighting.efficacy(532)).toBeGreaterThan(550)
  })

  test("10 W seen from the side a few tens of metres off is far brighter than a city's night sky", () => {
    const coefficients = LaserBeamSighting.coefficientsAt(air, 532, 170)
    const scattered = LaserBeamSighting.phasedScattering(coefficients, 0)
    // Two pixels of a 70 degree field 1 000 pixels high, 30 m away.
    const shownM = 2 * (70 * Math.PI / 180 / 1000) * 30
    const luminance = LaserBeamSighting.luminanceCdM2(10, 532, scattered, shownM, 1)
    expect(luminance).toBeGreaterThan(0.05)
    expect(luminance).toBeLessThan(50)
  })
})
