import { describe, expect, it } from "vitest"
import { NightSkyBrightness } from "../../../src/engine/atmosphere/NightSkyBrightness.js"
import { SurfaceBrightness } from "../../../src/engine/astronomy/SurfaceBrightness.js"

/**
 * The point of these: this is the denominator that decides whether either diffuse glow is a sight
 * or nothing. Everything checked here is a fact an observer could state without instruments — the
 * sky stops getting darker after astronomical twilight, a full Moon costs four magnitudes, a half
 * Moon costs far less than half of that — and the model has to say them without being told.
 */
describe("twilight", () => {
  it("bottoms out at a natural dark sky and stays there", () => {
    expect(NightSkyBrightness.moonlessMagPerArcsec2(-18)).toBeCloseTo(21.9, 1)
    expect(NightSkyBrightness.moonlessMagPerArcsec2(-40)).toBeGreaterThan(21.9)
    expect(NightSkyBrightness.moonlessMagPerArcsec2(-40)).toBeLessThanOrEqual(22)
    // A tenth of a magnitude between the end of twilight and the middle of the night: the reason an
    // observer's rule is a solar depression and not a clock.
    expect(NightSkyBrightness.moonlessMagPerArcsec2(-18) - NightSkyBrightness.moonlessMagPerArcsec2(-90)).toBeLessThan(0.2)
  })

  it("darkens monotonically as the Sun goes down, and fastest in the middle", () => {
    const run = [10, 0, -4, -6, -8, -10, -12, -14, -16, -18].map(alt => NightSkyBrightness.moonlessMagPerArcsec2(alt))
    for (let at = 1; at < run.length; at++) expect(run[at]).toBeGreaterThan(run[at - 1])
    const throughNautical =
      NightSkyBrightness.moonlessMagPerArcsec2(-12) - NightSkyBrightness.moonlessMagPerArcsec2(-6)
    const throughAstronomical =
      NightSkyBrightness.moonlessMagPerArcsec2(-18) - NightSkyBrightness.moonlessMagPerArcsec2(-12)
    expect(throughNautical).toBeGreaterThan(throughAstronomical)
  })

  it("makes the daylit sky a million times the night one", () => {
    const day = SurfaceBrightness.fromMagPerArcsec2(NightSkyBrightness.moonlessMagPerArcsec2(45))
    const night = SurfaceBrightness.fromMagPerArcsec2(NightSkyBrightness.moonlessMagPerArcsec2(-20))
    expect(day / night).toBeGreaterThan(1e6)
  })
})

describe("moonlight", () => {
  const highFullMoon = { phaseAngleDeg: 0, altitudeDeg: 60 }
  /** The Sun far enough down that the twilight term is zero and only the Moon is being measured. */
  const deepNight = { altitudeDeg: -30, separationDeg: 120 }

  it("puts a full Moon's sky at about eighteenth magnitude, four above a dark one", () => {
    const lit = NightSkyBrightness.magPerArcsec2(deepNight, { ...highFullMoon, separationDeg: 90 }, 45)
    expect(lit).toBeGreaterThan(17.5)
    expect(lit).toBeLessThan(19)
  })

  it("brightens the sky most close to the Moon", () => {
    const run = [10, 30, 60, 90].map(sep => NightSkyBrightness.magPerArcsec2(deepNight, { ...highFullMoon, separationDeg: sep }, 45))
    for (let at = 1; at < run.length; at++) expect(run[at]).toBeGreaterThan(run[at - 1])
  })

  it("costs far more than half a full Moon at half phase, which is why the calendar misleads people", () => {
    const full = NightSkyBrightness.moonNanolamberts(NightSkyBrightness.phaseAngleOf(1), 60, 90, 45)
    const half = NightSkyBrightness.moonNanolamberts(NightSkyBrightness.phaseAngleOf(0.5), 60, 90, 45)
    expect(half / full).toBeLessThan(0.25)
  })

  it("does nothing at all once it has set", () => {
    expect(NightSkyBrightness.moonNanolamberts(0, -1, 90, 45)).toBe(0)
    expect(
      NightSkyBrightness.magPerArcsec2(deepNight, { phaseAngleDeg: 0, altitudeDeg: -5, separationDeg: 90 }, 45)
    ).toBeCloseTo(NightSkyBrightness.AIRGLOW_MAG_PER_ARCSEC2, 6)
  })

  it("adds as light and not as magnitudes", () => {
    // Two glows of the same brightness make a sky one magnitude and a bit brighter than either, not
    // the same brightness — the reason this had to be a function rather than a minimum.
    const moonless = NightSkyBrightness.toNanolamberts(22)
    expect(NightSkyBrightness.fromNanolamberts(moonless * 2)).toBeCloseTo(22 - 2.5 * Math.log10(2), 3)
  })
})

describe("the unit it all meets in", () => {
  it("agrees with itself across S10, magnitudes and nanolamberts", () => {
    const dark = NightSkyBrightness.nanolambertsOfS10(SurfaceBrightness.fromMagPerArcsec2(22))
    expect(NightSkyBrightness.fromNanolamberts(dark)).toBeCloseTo(22, 6)
    // The natural dark sky in the unit the moonlight model is written in — about fifty
    // nanolamberts, which is the figure that model's own paper quotes for it.
    expect(dark).toBeGreaterThan(45)
    expect(dark).toBeLessThan(65)
  })
})

describe("the twilight arch", () => {
  const dusk = -12
  const brightness = (separationFromSunDeg: number, altitudeDeg: number): number =>
    NightSkyBrightness.magPerArcsec2(
      { altitudeDeg: dusk, separationDeg: separationFromSunDeg },
      { phaseAngleDeg: 180, altitudeDeg: -20, separationDeg: 90 },
      altitudeDeg
    )

  it("lands on the measured photometry at the zenith, whatever it does elsewhere", () => {
    // The zenith is a quarter turn plus the solar depression away from the Sun. Anything else the
    // shape does, this has to stay exactly what was measured.
    expect(brightness(90 - dusk, 90)).toBeCloseTo(NightSkyBrightness.moonlessMagPerArcsec2(dusk), 6)
  })

  it("makes the sky toward the Sun brighter than the sky away from it, at the same height", () => {
    const towardTheSun = brightness(25, 15)
    const away = brightness(155, 15)
    expect(towardTheSun).toBeLessThan(away - 0.5)
  })

  it("flattens out once astronomical twilight is over, leaving no arch in the middle of the night", () => {
    const night = (separationDeg: number) =>
      NightSkyBrightness.magPerArcsec2(
        { altitudeDeg: -25, separationDeg },
        { phaseAngleDeg: 180, altitudeDeg: -20, separationDeg: 90 },
        30
      )
    expect(night(20)).toBeCloseTo(night(160), 6)
    expect(night(20)).toBeCloseTo(NightSkyBrightness.AIRGLOW_MAG_PER_ARCSEC2, 6)
  })
})
