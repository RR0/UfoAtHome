import { beforeAll, describe, expect, it } from "vitest"
import { RainbowSky, type RainbowProfile } from "../../../src/engine/atmosphere/RainbowSky.js"
import { Rainbows } from "../../../src/engine/atmosphere/Rainbows.js"

/**
 * The point of these: RainbowSky is told nothing about rainbows. It knows a sphere of water,
 * Snell's law and Fresnel's, and it sweeps a ray across the drop. Every angle Rainbows derives in
 * closed form has to fall out of that sweep independently, and so do the things no closed form
 * states at all — that the band between the bows is dark, that the sky inside the primary is bright,
 * that the secondary is several times the fainter. Two derivations of one piece of physics agreeing
 * is evidence; one number shared between them would only be a habit.
 */
let profile: RainbowProfile

beforeAll(() => {
  profile = new RainbowSky().compute()
})

/** How bright the sky is that many degrees out from the point opposite the source — the way every
 * bow is measured, and the way the closed forms state their radii. */
function radianceAt(fromAntisolarDeg: number): [number, number, number] {
  const scattering = 180 - fromAntisolarDeg
  const bin = Math.min(profile.bins - 1, Math.max(0, Math.floor(scattering / profile.binDeg)))
  const at = bin * 3
  return [profile.data[at], profile.data[at + 1], profile.data[at + 2]]
}

function brightnessAt(fromAntisolarDeg: number): number {
  const [r, g, b] = radianceAt(fromAntisolarDeg)
  return (r + g + b) / 3
}

/** Where one channel is brightest between two radii, and how bright it is there. */
function peakOf(channel: 0 | 1 | 2, fromDeg: number, toDeg: number): { atDeg: number; value: number } {
  let atDeg = fromDeg
  let value = -1
  for (let degrees = fromDeg; degrees <= toDeg; degrees += profile.binDeg) {
    const here = radianceAt(degrees)[channel]
    if (here > value) {
      value = here
      atDeg = degrees
    }
  }
  return { atDeg, value }
}

function meanBetween(fromDeg: number, toDeg: number): number {
  let total = 0
  let count = 0
  for (let degrees = fromDeg; degrees <= toDeg; degrees += 0.25) {
    total += brightnessAt(degrees)
    count++
  }
  return total / count
}

describe("RainbowSky, which sweeps a ray across a drop and is told no angles at all", () => {
  describe("the bright bow", () => {
    it("piles the light up where the refractive index says, red outside and violet inside", () => {
      const red = peakOf(0, 38, 46)
      const violet = peakOf(2, 38, 46)
      const bow = Rainbows.primary()
      expect(red.atDeg).toBeCloseTo(bow.redRadiusDeg, 0)
      expect(violet.atDeg).toBeCloseTo(bow.violetRadiusDeg, 0)
      // Red on the OUTSIDE, which no line of the trace was told.
      expect(red.atDeg).toBeGreaterThan(violet.atDeg)
      // A THIRD OF A DEGREE INSIDE the closed forms, and the direction is the check rather than the
      // size. Two things put it there, both of them real and neither of them a disagreement about
      // the physics — WaterDrop.test.ts pins the same trace to the same closed forms to a hundredth
      // of a degree, monochromatic and unblurred. A screen's red is not a wavelength: it answers
      // across the whole long half of the spectrum, so its own angle is that of a shorter one than
      // the red the closed form is stated at. And the bright side of the primary is the INSIDE, so
      // smearing a one-sided edge by the Sun's disc pulls its peak inward. Both drag the same way.
      expect(bow.redRadiusDeg - red.atDeg).toBeGreaterThan(0)
      expect(bow.redRadiusDeg - red.atDeg).toBeLessThan(0.6)
      expect(bow.violetRadiusDeg - violet.atDeg).toBeGreaterThan(0)
      expect(bow.violetRadiusDeg - violet.atDeg).toBeLessThan(0.6)
    })

    it("cuts off outside and stays bright inside, which is what makes it a bow and not a ring", () => {
      const peak = peakOf(0, 38, 46).value
      // Nothing gets past the stationary angle: half a degree beyond the red edge the sky is dark.
      expect(brightnessAt(43.5)).toBeLessThan(peak / 20)
      // And everything short of it piles up: the sky inside a bow is visibly brighter than the sky
      // beyond it, which is the part of a photograph people never notice until it is pointed out.
      expect(meanBetween(20, 38)).toBeGreaterThan(meanBetween(44, 50) * 8)
    })
  })

  describe("the fainter bow, and the dark band", () => {
    it("stands it where two bounces put it, with its colours the other way up", () => {
      const red = peakOf(0, 49, 55)
      const violet = peakOf(2, 49, 55)
      const bow = Rainbows.secondary()
      expect(red.atDeg).toBeCloseTo(bow.redRadiusDeg, 0)
      expect(violet.atDeg).toBeCloseTo(bow.violetRadiusDeg, 0)
      // REVERSED, and again nothing said so: red now stands inside violet.
      expect(red.atDeg).toBeLessThan(violet.atDeg)
      // And the offset from the closed forms goes the OTHER WAY here, for the same two reasons: the
      // secondary's bright side is its outside, and its radius grows as the wavelength shortens.
      // A shift that reversed with the bow is the pair of causes showing themselves; a shift that
      // did not would have been an error.
      expect(red.atDeg - bow.redRadiusDeg).toBeGreaterThan(0)
      expect(red.atDeg - bow.redRadiusDeg).toBeLessThan(0.8)
    })

    it("keeps it several times the fainter, which is what the extra bounce costs", () => {
      const primary = peakOf(0, 38, 46).value
      const secondary = peakOf(0, 49, 55).value
      expect(secondary).toBeLessThan(primary / 3)
      expect(secondary).toBeGreaterThan(0)
    })

    it("leaves the band between them dark, which no formula here was given", () => {
      const band = Rainbows.alexandersBandDeg()
      const inside = meanBetween(band.fromDeg + 1, band.toDeg - 1)
      expect(inside).toBeLessThan(meanBetween(30, 42) / 8)
      expect(inside).toBeLessThan(brightnessAt(51) / 5)
    })
  })

  describe("what a shower does to the rest of the sky", () => {
    it("says nothing at all about the direction of the source itself", () => {
      // Kept out on purpose: what leaves a drop nearly undeviated belongs to the Sun, and the one
      // thing that really lives there — the corona — is diffraction, which this does not model.
      expect(brightnessAt(180)).toBe(0)
      expect(brightnessAt(179)).toBe(0)
    })

    it("leaves the half of the sky the light goes forward into to the glare that owns it", () => {
      // Real and deliberately not drawn: a drop throws far more light forward than back, and that
      // light is the Sun's own glare through rain rather than a display — see RainbowSky's
      // FULL_UNTIL_DEG. Nothing at all past 90 degrees from the antisolar point, and the way out to
      // it is a fade rather than an edge, so that no boundary can be mistaken for a form.
      expect(brightnessAt(95)).toBe(0)
      expect(brightnessAt(120)).toBe(0)
      expect(brightnessAt(140)).toBe(0)
      expect(brightnessAt(65)).toBeGreaterThan(brightnessAt(80))
      expect(brightnessAt(80)).toBeGreaterThan(brightnessAt(89))
      // And the bows themselves are untouched by it: they stand well inside where the fade begins.
      expect(brightnessAt(42)).toBeGreaterThan(brightnessAt(65) * 10)
    })

    it("gives back a curve that does not depend on how big the drops were", () => {
      // Geometric optics has no length in it. That is not a shortcut here, it is the reason a bow is
      // the same size in a drizzle and a downpour — and the reason the supernumerary arcs, which
      // DO depend on drop size, are absent (see WaterDrop).
      const again = new RainbowSky().compute()
      expect(again.data[900 * 3]).toBeCloseTo(profile.data[900 * 3], 10)
    })
  })
})
