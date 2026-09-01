import { describe, expect, it } from "vitest"
import { WaterDrop, WaterRefraction, type DropRay } from "../../../src/engine/atmosphere/WaterDrop.js"
import { Rainbows } from "../../../src/engine/atmosphere/Rainbows.js"

/**
 * Where the closed forms and the trace are compared EXACTLY, one colour at a time and with nothing
 * blurred: the sweep that draws the sky (RainbowSky) mixes twenty-four wavelengths into three screen
 * channels and then softens the answer by the Sun's own disc, so its peaks are a few tenths of a
 * degree from any single wavelength's angle for two good reasons. Here there is neither, and the two
 * derivations have to agree to a hundredth of a degree.
 */
const STEPS = 400_000

/**
 * The angle where the light of one colour stops moving as the ray is walked across the drop.
 *
 * That standing-still IS the bow, and it is why one exists at all: light entering a whole band of
 * the drop leaves in almost the same direction, so the sky there receives what a wide ring of the
 * beam collected. Found by watching for the emergent angle to turn round, which asks nothing of the
 * closed form it is about to be compared with — not the angle, not even which way the turn goes.
 */
function stationaryRadiusDeg(chords: number, wavelengthNm: number): number {
  const drop = new WaterDrop()
  drop.refractiveIndex = WaterRefraction.indexAt(wavelengthNm)
  const out: DropRay[] = Array.from({ length: WaterDrop.MAX_CHORDS + 1 }, () => ({
    chords: 0,
    scatteringAngle: 0,
    weight: 0
  }))
  const angleAt = (step: number): number => {
    const count = drop.trace(Math.sqrt(step / STEPS), out)
    for (let index = 0; index < count; index++) {
      if (out[index].chords === chords) return 180 - (out[index].scatteringAngle * 180) / Math.PI
    }
    return Number.NaN
  }
  // Started clear of the very centre of the drop, where every order comes back along the axis and
  // the angle is standing still for a quite different reason.
  const first = Math.round(STEPS * 0.01)
  let previous = angleAt(first)
  let rising = angleAt(first + 1) > previous
  for (let step = first + 1; step <= STEPS; step++) {
    const here = angleAt(step)
    if (here > previous !== rising) return (here + previous) / 2
    rising = here > previous
    previous = here
  }
  return Number.NaN
}

describe("WaterDrop, a sphere of water with Snell's law in it", () => {
  it("lands the primary exactly where the closed form puts it, for each colour separately", () => {
    for (const wavelengthNm of [WaterRefraction.RED_NM, 550, WaterRefraction.BLUE_NM]) {
      const index = WaterRefraction.indexAt(wavelengthNm)
      expect(stationaryRadiusDeg(2, wavelengthNm)).toBeCloseTo(Rainbows.radiusDeg(2, index), 2)
    }
  })

  it("lands the secondary there too, which is the one the closed forms could most easily get wrong", () => {
    for (const wavelengthNm of [WaterRefraction.RED_NM, 550, WaterRefraction.BLUE_NM]) {
      const index = WaterRefraction.indexAt(wavelengthNm)
      expect(stationaryRadiusDeg(3, wavelengthNm)).toBeCloseTo(Rainbows.radiusDeg(3, index), 2)
    }
  })

  it("charges the secondary for its extra bounce", () => {
    const drop = new WaterDrop()
    drop.refractiveIndex = WaterRefraction.indexAt(550)
    const out: DropRay[] = Array.from({ length: WaterDrop.MAX_CHORDS + 1 }, () => ({
      chords: 0,
      scatteringAngle: 0,
      weight: 0
    }))
    // At the impact parameter that makes the primary, and at the one that makes the secondary.
    drop.trace(0.8618, out)
    const primary = out[2].weight
    drop.trace(0.9505, out)
    const secondary = out[3].weight
    expect(secondary).toBeLessThan(primary)
    // Every emergence is a share of one incident ray, so nothing may add up past it.
    drop.trace(0.5, out)
    expect(out.reduce((total, ray) => total + ray.weight, 0)).toBeLessThanOrEqual(1)
  })

  it("folds a ray that has been turned more than half round back to the angle a sky can hold", () => {
    const drop = new WaterDrop()
    drop.refractiveIndex = 1.333
    const out: DropRay[] = Array.from({ length: WaterDrop.MAX_CHORDS + 1 }, () => ({
      chords: 0,
      scatteringAngle: 0,
      weight: 0
    }))
    for (let step = 0; step <= 1000; step++) {
      const count = drop.trace(step / 1000, out)
      for (let index = 0; index < count; index++) {
        expect(out[index].scatteringAngle).toBeGreaterThanOrEqual(0)
        expect(out[index].scatteringAngle).toBeLessThanOrEqual(Math.PI + 1e-12)
      }
    }
  })
})
