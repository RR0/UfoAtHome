import { describe, expect, it } from "vitest"
import { FilmExposure } from "../../src/engine/instrument/FilmExposure.js"
import { EYE_RESPONSE_GLSL } from "../../src/render3d/colorSpace.js"
import { BirdOnFilm } from "../../src/modules/interpretations/birds/BirdOnFilm.js"
import { BirdSpecies } from "../../src/modules/interpretations/birds/BirdSpecies.js"

describe("FilmExposure", () => {
  it("is the negative's curve the finish draws", () => {
    // The GLSL twin: a negative's power 1.2 and its middle grey at 0.18.
    expect(EYE_RESPONSE_GLSL).toContain("pow(h, uMedium > 1.5 ? 1.8 : 1.2)")
    expect(EYE_RESPONSE_GLSL).toContain("const float MEDIUM_MID_GREY = 0.18;")
    expect(FilmExposure.negativeResponse(1)).toBeCloseTo(0.18, 6)
    expect(FilmExposure.negativeExposureFor(FilmExposure.negativeResponse(7))).toBeCloseTo(7, 6)
  })

  it("gives a middle grey to the luminance an exposure meter would set for", () => {
    // ISO 100, f/8, 1/125 s is what a meter (N² / t = L S / K, K = 12.5) sets for 1 000 cd/m²: q K / 10 = 0.8125 of a middle grey.
    const luminance = 12.5 * 64 / ((1 / 125) * 100)
    expect(luminance).toBeCloseTo(1000, 6)
    expect(FilmExposure.middleGreys(luminance, 1 / 125, 100, 8)).toBeCloseTo(0.65 * 12.5 / 10, 6)
  })
})

describe("A flock lit from below, on Hart's film", () => {
  const settings = [0.1, 3.5] as const
  const duck = BirdSpecies.byId("mallard")!, killdeer = BirdSpecies.byId("killdeer")!

  it("needs more light than the town gave to show at all, at any speed of the time", () => {
    for (const at of BirdOnFilm.sweep(duck, ...settings, [25, 50, 100, 200])) expect(at.luxToMark).toBeGreaterThan(2)
  })

  it("needs a light only Tri-X's speed would bring under a street lamp's two lux to mark it, and far more to burn it out", () => {
    const [at400] = BirdOnFilm.sweep(killdeer, ...settings, [400])
    expect(at400.luxToMark).toBeLessThan(2)
    expect(at400.luxToBurnOut).toBeGreaterThan(50 * at400.luxToMark)
  })
})
