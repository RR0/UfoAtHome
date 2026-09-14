import { describe, expect, it } from "vitest"
import { AtmosphereProfile } from "../../../src/engine/atmosphere/AtmosphereProfile.js"
import { SkyScattering } from "../../../src/engine/atmosphere/SkyScattering.js"
import { VisibleSpectrum } from "../../../src/engine/atmosphere/Spectrum.js"
import { NightSkyBrightness } from "../../../src/engine/atmosphere/NightSkyBrightness.js"
import { SkyMonteCarlo } from "./SkyMonteCarlo.js"
import referenceJson from "./sky-reference.json"

/**
 * Nothing in the scattering model was fitted to any of the numbers below. The medium is air's
 * refractive index, a published ozone band and a haze optical depth; everything checked here is what
 * the sky does with them — and each check is something the model could get wrong on its own.
 */
const WAVELENGTHS = AtmosphereProfile.WAVELENGTHS_NM
const STEP = AtmosphereProfile.WAVELENGTH_STEP_NM
const RADIANS = Math.PI / 180
/** A multiple-scattering table at the GPU's own resolution takes several seconds to build here. */
const TABLE_BUILD_TIMEOUT_MS = 60_000

/** Paranal: 2635 m up, and the clean air a site is chosen for. */
const PARANAL_M = 2635
const paranal = new SkyScattering(new AtmosphereProfile({ aerosolOpticalDepth: 0.05 }))

function direction(altitudeDeg: number, azimuthDeg = 0): { x: number; y: number; z: number } {
  const altitude = altitudeDeg * RADIANS
  const azimuth = azimuthDeg * RADIANS
  return { x: Math.cos(altitude) * Math.sin(azimuth), y: Math.sin(altitude), z: Math.cos(altitude) * Math.cos(azimuth) }
}

function radianceOf(sky: SkyScattering, altitudeM: number, view: { altitudeDeg: number; azimuthDeg?: number }, sunAltitudeDeg: number) {
  const radiance = new Float64Array(WAVELENGTHS.length)
  sky.radiance(altitudeM, direction(view.altitudeDeg, view.azimuthDeg), direction(sunAltitudeDeg), radiance)
  return radiance
}

function xyzOfRadiance(radiance: ArrayLike<number>) {
  return VisibleSpectrum.tristimulus(
    WAVELENGTHS,
    Array.from(radiance, (value, index) => value * AtmosphereProfile.SOLAR_IRRADIANCE[index]),
    STEP
  )
}

function xyzOf(sky: SkyScattering, altitudeM: number, view: { altitudeDeg: number; azimuthDeg?: number }, sunAltitudeDeg: number) {
  return xyzOfRadiance(radianceOf(sky, altitudeM, view, sunAltitudeDeg))
}

/** Surface brightness from luminance: the photometric identity, V ≈ photopic. */
function magPerArcsec2(candelas: number): number {
  return 12.58 - 2.5 * Math.log10(candelas)
}

describe("the medium", () => {
  it("adds the Sun's spectrum up to the Sun's illuminance", () => {
    // 128 to 133 thousand lux above the atmosphere: never written anywhere in the model.
    const lux = VisibleSpectrum.tristimulus(WAVELENGTHS, AtmosphereProfile.SOLAR_IRRADIANCE, STEP)[1]
    expect(lux).toBeGreaterThan(125e3)
    expect(lux).toBeLessThan(137e3)
  })

  it("gives sea-level air the Rayleigh scattering it is measured to have", () => {
    // A cross-section of 4.51e-27 cm² at 550 nm (Bodhaine et al. 1999), times Loschmidt's number.
    // Guards the transcription of their fit, whose terms nearly cancel.
    expect(AtmosphereProfile.rayleighAt(550)).toBeGreaterThan(1.13e-5)
    expect(AtmosphereProfile.rayleighAt(550)).toBeLessThan(1.17e-5)
    expect(AtmosphereProfile.rayleighAt(450) / AtmosphereProfile.rayleighAt(650)).toBeGreaterThan(4.2)
  })
})

describe("twilight at the zenith", () => {
  it("meets the photometry measured at Paranal", () => {
    // Patat et al. (2006), table 1 in V, scatter 0.18 mag, sky within 40° of the zenith — which is not
    // quite the zenith, and in twilight the sky is uneven. The fit covers -5° to -15°.
    for (const sunAltitude of [-6, -8, -10, -12, -14]) {
      const zenith = xyzOf(paranal, PARANAL_M, { altitudeDeg: 90 }, sunAltitude)[1]
      expect(Math.abs(magPerArcsec2(zenith) - NightSkyBrightness.patatV(sunAltitude)), `Sun at ${sunAltitude}°`).toBeLessThan(0.7)
    }
  })

  it("is deep blue because of ozone, and nearly white without it (Hulburt, 1953)", () => {
    const ratio = (sky: SkyScattering) => {
      const [r, , b] = VisibleSpectrum.linearSrgbOf(xyzOf(sky, PARANAL_M, { altitudeDeg: 90 }, -6))
      return b / r
    }
    const withoutOzone = new SkyScattering(new AtmosphereProfile({ aerosolOpticalDepth: 0.05, ozoneDobson: 0 }))
    expect(ratio(paranal)).toBeGreaterThan(4)
    expect(ratio(withoutOzone)).toBeLessThan(1.6)
   }, TABLE_BUILD_TIMEOUT_MS)
})

describe("a clear day", () => {
  const seaLevel = new SkyScattering(new AtmosphereProfile(), {
    transmittanceWidth: 128,
    transmittanceHeight: 32,
    multipleSize: 16,
    multipleDirections: 6
  })

  it("is brighter toward the horizon than at the zenith", () => {
    const zenith = xyzOf(seaLevel, 2, { altitudeDeg: 90 }, 45)[1]
    const low = xyzOf(seaLevel, 2, { altitudeDeg: 5, azimuthDeg: 90 }, 45)[1]
    expect(low).toBeGreaterThan(zenith)
  })

  it("is whiter toward the horizon than at the zenith", () => {
    const blueness = (altitudeDeg: number) => {
      const [r, , b] = VisibleSpectrum.linearSrgbOf(xyzOf(seaLevel, 2, { altitudeDeg, azimuthDeg: 90 }, 45))
      return b / r
    }
    expect(blueness(5)).toBeLessThan(blueness(89))
  })

  it("puts a bright aureole round the Sun", () => {
    const nearSun = xyzOf(seaLevel, 2, { altitudeDeg: 48 }, 45)[1]
    const quarterTurn = xyzOf(seaLevel, 2, { altitudeDeg: 45, azimuthDeg: 90 }, 45)[1]
    expect(nearSun).toBeGreaterThan(5 * quarterTurn)
  })
})

interface ReferenceCase {
  name: string
  conditions: { aerosolOpticalDepth?: number; ozoneDobson?: number }
  altitudeM: number
  sunAltitudeDeg: number
  view: { altitudeDeg: number; azimuthDeg: number }
  luminanceCdM2: number
  chromaticity: [number, number]
  relativeError: number[]
}

const reference = referenceJson as unknown as {
  medium: { wavelengthsNm: number[]; solarIrradiance: number[]; ozoneCrossSection: number[] }
  cases: ReferenceCase[]
}

describe("the Monte Carlo reference", () => {
  it("was traced through the medium the model has now", () => {
    // Change the medium and this fails until `npm run build:sky-reference` is run again.
    expect(reference.medium.wavelengthsNm).toEqual([...AtmosphereProfile.WAVELENGTHS_NM])
    expect(reference.medium.solarIrradiance).toEqual([...AtmosphereProfile.SOLAR_IRRADIANCE])
    expect(reference.medium.ozoneCrossSection).toEqual([...AtmosphereProfile.OZONE_CROSS_SECTION])
  })

  it("comes from a tracer whose two estimators agree where both work", () => {
    // Integrating the sunlight along each segment, and counting it only where paths collide, are two
    // independent ways to the same number. The second is hopeless in twilight, not in daylight.
    const tracer = new SkyMonteCarlo(new AtmosphereProfile({ aerosolOpticalDepth: 0.15 }))
    const view = direction(30, 90)
    const sun = direction(20)
    const byRay = tracer.estimateAt(2, view, sun, 7, { paths: 20_000, seed: 3 })
    const byCollision = tracer.estimateAt(2, view, sun, 7, { paths: 60_000, seed: 5, estimator: "collision" })
    const combinedError = Math.hypot(byRay.error, byCollision.error)
    expect(Math.abs(byRay.mean - byCollision.mean)).toBeLessThan(4 * combinedError)
  })

  it("is met by the model within a few tenths of a magnitude, all the way into deep twilight", () => {
    // The tables at the resolution the GPU builds them, against the exact physics of the same medium.
    // What separates the two is Hillaire's approximation and nothing else, and here is how much it
    // is, measured rather than hoped: within 0.25 mag in luminance and 0.012 in chromaticity for every
    // sky, from a hazy noon to a Sun sixteen degrees down, from the ground and from an aircraft...
    const skies = new Map<string, SkyScattering>()
    for (const skyCase of reference.cases) {
      const key = JSON.stringify(skyCase.conditions)
      if (!skies.has(key)) skies.set(key, new SkyScattering(new AtmosphereProfile(skyCase.conditions)))
      const [x, y, z] = xyzOf(skies.get(key)!, skyCase.altitudeM, skyCase.view, skyCase.sunAltitudeDeg)
      const deltaMag = Math.abs(2.5 * Math.log10(y / skyCase.luminanceCdM2))
      // ...but one: the Earth's shadow, low in the sky opposite a Sun in nautical twilight, comes out
      // two thirds of a magnitude too dark. It is lit only by light that has scattered round from the
      // far side of the sky, which is exactly the light an isotropic, geometric-series treatment of
      // the higher orders gets least right.
      const earthShadow = skyCase.view.azimuthDeg === 180 && skyCase.sunAltitudeDeg < -6
      // The Monte Carlo's own noise counts for the deepest skies, where it is several per cent.
      const noiseMag = 2.5 * Math.log10(1 + 2 * skyCase.relativeError[7])
      expect(deltaMag, skyCase.name).toBeLessThan((earthShadow ? 0.8 : 0.25) + noiseMag)
      expect(Math.abs(x / (x + y + z) - skyCase.chromaticity[0]), skyCase.name).toBeLessThan(0.012)
      expect(Math.abs(y / (x + y + z) - skyCase.chromaticity[1]), skyCase.name).toBeLessThan(0.012)
    }
   }, TABLE_BUILD_TIMEOUT_MS)
})
