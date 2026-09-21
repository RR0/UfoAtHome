import { describe, expect, it } from "vitest"
import { EyeAdaptation } from "../../../src/engine/atmosphere/EyeAdaptation.js"

/** A sky adapted to itself, as a luminance on the screen. */
function selfAdapted(luminance: number): number {
  return EyeAdaptation.response(luminance, luminance)
}

describe("an eye adapted to the sky it looks at", () => {
  it("shows a clear day's zenith and a moonless night's where the colour table put them", () => {
    expect(selfAdapted(EyeAdaptation.DAYLIGHT_ANCHOR_CD_M2)).toBeCloseTo(EyeAdaptation.DAYLIGHT_ANCHOR_RESPONSE, 6)
    expect(selfAdapted(EyeAdaptation.NIGHT_ANCHOR_CD_M2)).toBeCloseTo(EyeAdaptation.NIGHT_ANCHOR_RESPONSE, 6)
    expect(EyeAdaptation.ADAPTATION_EXPONENT).toBeGreaterThan(0.55)
    expect(EyeAdaptation.ADAPTATION_EXPONENT).toBeLessThan(0.7)
  })

  it("shows a moonlit night darker than twilight and brighter than a moonless one, never grey-light", () => {
    // A 91 % Moon puts the sky near 19.6 mag/arcsec², about 2.6e-3 cd/m².
    const moonlit = selfAdapted(2.6e-3)
    expect(moonlit).toBeGreaterThan(EyeAdaptation.NIGHT_ANCHOR_RESPONSE)
    expect(moonlit).toBeLessThan(0.04)
  })

  it("sees each sky of a twilight darker than the one before, but nowhere near in proportion", () => {
    // Noon, sunset, the end of civil, nautical and astronomical twilight, and a moonless midnight.
    const skies = [3000, 100, 0.8, 1.4e-3, 3e-4, 1.7e-4]
    const shown = skies.map(selfAdapted)
    for (let at = 1; at < shown.length; at++) expect(shown[at]).toBeLessThan(shown[at - 1])
    // Seven decades of light, and the screen keeps well over one of them.
    expect(shown[0] / shown[shown.length - 1]).toBeLessThan(100)
    expect(shown[shown.length - 1]).toBeGreaterThan(0)
  })

  it("bends at a moonlit anchor when one is stated, and leaves both ends where they were", () => {
    const unanchored = selfAdapted(EyeAdaptation.MOONLIT_ANCHOR_CD_M2)
    EyeAdaptation.MOONLIT_ANCHOR_RESPONSE = unanchored * 0.7
    try {
      expect(selfAdapted(EyeAdaptation.MOONLIT_ANCHOR_CD_M2)).toBeCloseTo(unanchored * 0.7, 6)
      expect(selfAdapted(EyeAdaptation.DAYLIGHT_ANCHOR_CD_M2)).toBeCloseTo(EyeAdaptation.DAYLIGHT_ANCHOR_RESPONSE, 6)
      expect(selfAdapted(EyeAdaptation.NIGHT_ANCHOR_CD_M2)).toBeCloseTo(EyeAdaptation.NIGHT_ANCHOR_RESPONSE, 6)
      // Still darker at every step down, whichever side of the bend.
      const skies = [3000, 100, 0.8, 1e-2, 3.5e-3, 1.4e-3, 3e-4, 1.7e-4]
      const shown = skies.map(selfAdapted)
      for (let at = 1; at < shown.length; at++) expect(shown[at]).toBeLessThan(shown[at - 1])
    } finally {
      EyeAdaptation.MOONLIT_ANCHOR_RESPONSE = undefined
    }
  })

  it("keeps contrast inside the sky it is adapted to", () => {
    const adapted = 0.8
    expect(EyeAdaptation.response(3 * adapted, adapted)).toBeGreaterThan(EyeAdaptation.response(adapted, adapted) * 1.3)
  })

  it("hands vision to the rods as the light goes, and the colour with it", () => {
    expect(EyeAdaptation.rodShare(3000)).toBeLessThan(0.001)
    expect(EyeAdaptation.rodShare(1e-3)).toBeGreaterThan(0.95)
    // A saturated blue twilight sky, first to a day-adapted eye and then to a night-adapted one.
    const blueSky: [number, number, number] = [0.25, 0.3, 0.9]
    const [dayR, , dayB] = EyeAdaptation.displayOf(blueSky, 0.6, 1000)
    const [nightR, , nightB] = EyeAdaptation.displayOf(blueSky, 0.6, 1e-3)
    expect(dayB / dayR).toBeGreaterThan(3)
    // Night blue: plainly blue, and not the saturated blue of a day sky.
    expect(nightB / nightR).toBeGreaterThan(1.4)
    expect(nightB / nightR).toBeLessThan(dayB / dayR)
  })
})
