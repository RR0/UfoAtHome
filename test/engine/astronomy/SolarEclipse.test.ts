import * as Astronomy from "astronomy-engine"
import { describe, expect, it } from "vitest"
import { SolarEclipse } from "../../../src/engine/astronomy/SolarEclipse.js"

const REIMS = { lat: 49.2583, lng: 4.0317, elevationM: 85 }
const PARIS = { lat: 48.8566, lng: 2.3522, elevationM: 35 }

/** The library's own search for the eclipse seen from a place, as the reference to measure against. */
function reference(observer: { lat: number, lng: number, elevationM: number }, from: Date) {
  return Astronomy.SearchLocalSolarEclipse(from, new Astronomy.Observer(observer.lat, observer.lng, observer.elevationM))
}

describe("the Moon's disc over the Sun's", () => {
  it("covers circles the way geometry does", () => {
    expect(SolarEclipse.overlap(1, 1, 0)).toBeCloseTo(1, 10)
    expect(SolarEclipse.overlap(1, 0.5, 0)).toBeCloseTo(0.25, 10)
    expect(SolarEclipse.overlap(1, 1.05, 0.02)).toBe(1)
    expect(SolarEclipse.overlap(1, 1, 2)).toBe(0)
    // Two unit circles half a diameter apart overlap by 2·acos(1/2)·… = 0.3910 of one disc.
    expect(SolarEclipse.overlap(1, 1, 1)).toBeCloseTo((2 * Math.acos(0.5) - Math.sin(2 * Math.acos(0.5))) / Math.PI, 10)
  })

  it("reproduces the library's obscuration at the peak of the total eclipse of 11 August 1999 at Reims", () => {
    const eclipse = reference(REIMS, new Date(Date.UTC(1999, 7, 1)))
    const view = SolarEclipse.viewAt(eclipse.peak.time.date, REIMS)
    expect(eclipse.kind).toBe(Astronomy.EclipseKind.Total)
    expect(view).toBeDefined()
    expect(view!.obscuration).toBeCloseTo(1, 3)
    expect(view!.moonRadiusDeg).toBeGreaterThan(view!.sunRadiusDeg)
  })

  it("reproduces the library's obscuration of the partial eclipse seen from Paris", () => {
    const eclipse = reference(PARIS, new Date(Date.UTC(1999, 7, 1)))
    const view = SolarEclipse.viewAt(eclipse.peak.time.date, PARIS)
    expect(view).toBeDefined()
    expect(view!.obscuration).toBeCloseTo(eclipse.obscuration, 2)
  })

  it("agrees across the 2017 and 2024 eclipses, at their peaks, to a hundredth", () => {
    const places = [
      { observer: { lat: 36.9, lng: -89.2, elevationM: 100 }, from: new Date(Date.UTC(2017, 7, 1)) },
      { observer: { lat: 44.0, lng: -78.0, elevationM: 100 }, from: new Date(Date.UTC(2024, 2, 1)) }
    ]
    for (const { observer, from } of places) {
      const eclipse = reference(observer, from)
      const view = SolarEclipse.viewAt(eclipse.peak.time.date, observer)
      expect(view, from.toISOString()).toBeDefined()
      expect(view!.obscuration, from.toISOString()).toBeCloseTo(eclipse.obscuration, 2)
    }
  })

  it("finds nothing when the discs do not touch — an ordinary day", () => {
    expect(SolarEclipse.viewAt(new Date(Date.UTC(1999, 7, 20, 11)), REIMS)).toBeUndefined()
  })

  it("lets the Sun's disc grow and shrink with the season", () => {
    const eclipse = (month: number) => SolarEclipse.viewAt(reference(PARIS, new Date(Date.UTC(1999, month, 1))).peak.time.date, PARIS)
    // 1999 has its annular/total pair in February (Southern) and August; only the second shows from Paris.
    expect(eclipse(7)!.sunRadiusDeg).toBeGreaterThan(0.262)
    expect(eclipse(7)!.sunRadiusDeg).toBeLessThan(0.268)
  })
})

describe("the light an eclipse leaves", () => {
  const view = (obscuration: number) => ({ sunRadiusDeg: 0.2666, moonRadiusDeg: 0.27, separationDeg: 0, obscuration, magnitude: 1 })

  it("is all of it without an eclipse, and what the Moon leaves with one", () => {
    expect(SolarEclipse.beamFraction(undefined)).toBe(1)
    expect(SolarEclipse.beamFraction(view(0.75))).toBeCloseTo(0.25, 10)
  })

  it("never falls below the corona's for the beam", () => {
    expect(SolarEclipse.beamFraction(view(1))).toBe(SolarEclipse.CORONA_LIGHT)
  })

  it("keeps the zenith at about a magnitude of 13 per square arcsecond at totality, as it was measured", () => {
    const magnitude = -2.5 * Math.log10(SolarEclipse.UMBRA_ZENITH_CD_M2 / 1.08e5)
    expect(magnitude).toBeGreaterThan(12.8)
    expect(magnitude).toBeLessThan(13.3)
  })

  it("measures the angle between two altitudes and azimuths", () => {
    expect(SolarEclipse.separationOf({ altitudeDeg: 50, azimuthDeg: 146 }, { altitudeDeg: 50.3, azimuthDeg: 146 })).toBeCloseTo(0.3, 6)
    expect(SolarEclipse.separationOf({ altitudeDeg: 0, azimuthDeg: 0 }, { altitudeDeg: 0, azimuthDeg: 90 })).toBeCloseTo(90, 6)
    // Azimuth degrees shrink with altitude: a degree of azimuth at 60° up is half a degree of sky.
    expect(SolarEclipse.separationOf({ altitudeDeg: 60, azimuthDeg: 10 }, { altitudeDeg: 60, azimuthDeg: 11 })).toBeCloseTo(0.5, 2)
  })
})

describe("the eclipse of a day, for a sky line", () => {
  it("finds the total eclipse of 11 August 1999 from Reims, and its two minutes", () => {
    const found = SolarEclipse.around(new Date(Date.UTC(1999, 7, 11, 10, 0)), REIMS)!
    expect(found.total).toBe(true)
    expect(found.peakAltitudeDeg).toBeGreaterThan(50)
    expect(found.totality!.seconds).toBeGreaterThan(110)
    expect(found.totality!.seconds).toBeLessThan(130)
  })

  it("finds the partial one from Paris, at 99 %", () => {
    const found = SolarEclipse.around(new Date(Date.UTC(1999, 7, 11, 10, 0)), PARIS)!
    expect(found.total).toBe(false)
    expect(found.obscuration).toBeCloseTo(0.993, 2)
    expect(found.totality).toBeUndefined()
  })

  it("finds none on an ordinary day", () => {
    expect(SolarEclipse.around(new Date(Date.UTC(1999, 7, 20, 10)), REIMS)).toBeUndefined()
  })
})

describe("the light the horizon keeps", () => {
  const SUN = 0.2629
  const MOON = 0.2704
  const view = (separation: number) => ({
    sunRadiusDeg: SUN, moonRadiusDeg: MOON, separationDeg: separation, obscuration: SolarEclipse.overlap(SUN, MOON, separation), magnitude: 1
  })
  const sharesAt = (separation: number) => SolarEclipse.horizonShare(view(separation), { upDeg: separation, rightDeg: 0 }, 52, 146, 383_000)
  const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length

  it("is what a partial eclipse leaves everywhere, to within a few per cent: the Moon is the same size seen from ground a hundred kilometres off", () => {
    for (const separation of [0.1, 0.2, 0.3]) {
      const shares = sharesAt(separation)
      expect(shares).toHaveLength(SolarEclipse.HORIZON_AZIMUTHS)
      for (const share of shares) expect(share).toBeCloseTo(1 - view(separation).obscuration, 1)
    }
  })

  it("is all of the day's where there is no eclipse", () => {
    for (const share of sharesAt(0.7)) expect(share).toBeCloseTo(1, 6)
  })

  it("is a thousandth or so at totality, and not the same all round: the shadow is longer along one way than across", () => {
    const shares = sharesAt(0)
    expect(mean(shares)).toBeGreaterThan(2e-4)
    expect(mean(shares)).toBeLessThan(5e-3)
    expect(Math.max(...shares) / Math.min(...shares)).toBeGreaterThan(1.5)
  })
})
