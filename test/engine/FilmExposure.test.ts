import { describe, expect, it } from "vitest"
import { FilmExposure } from "../../src/engine/instrument/FilmExposure.js"
import { EYE_RESPONSE_GLSL } from "../../src/render3d/colorSpace.js"
import { LitSurfaceOnPicture } from "../../src/engine/instrument/LitSurfaceOnPicture.js"
import { Instruments } from "../../src/engine/instrument/Instrument.js"
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

describe("FilmExposure on every medium", () => {
  it("is the slide's and the sensor's curve the finish draws", () => {
    expect(EYE_RESPONSE_GLSL).toContain("if (uMedium > 2.5) return min(1.0, MEDIUM_MID_GREY * h);")
    expect(FilmExposure.response("slide", 1)).toBeCloseTo(0.18, 6)
    expect(FilmExposure.response("sensor", 1)).toBeCloseTo(0.18, 6)
    expect(FilmExposure.response("sensor", 10)).toBe(1)
    // The slide is steeper than the negative on both sides of its middle grey.
    expect(FilmExposure.response("slide", 0.5)).toBeLessThan(FilmExposure.response("negative", 0.5))
    expect(FilmExposure.response("slide", 2)).toBeGreaterThan(FilmExposure.response("negative", 2))
  })

  it("finds the exposure back from what the picture shows, on every medium", () => {
    for (const kind of ["negative", "slide", "sensor"] as const) {
      for (const h of [0.01, 0.3, 1, 3]) expect(FilmExposure.exposureFor(kind, FilmExposure.response(kind, h))).toBeCloseTo(h, 6)
    }
  })

  it("first shows a dim surface on a sensor, then a negative, then a slide, at the same speed", () => {
    const first = (kind: "negative" | "slide" | "sensor") => FilmExposure.exposureFor(kind, FilmExposure.FIRST_MARK_RESPONSE)
    expect(first("negative")).toBeCloseTo(FilmExposure.FIRST_MARK, 6)
    // A sensor's straight line reaches it some four stops under a middle grey; a slide's steeper toe, the narrow latitude slides are
    // known for, only some two and a half.
    expect(Math.log2(1 / first("sensor"))).toBeCloseTo(4.1, 1)
    expect(first("negative")).toBeLessThan(first("slide"))
    expect(Math.log2(1 / first("slide"))).toBeCloseTo(2.4, 1)
  })
})

describe("LitSurfaceOnPicture", () => {
  const settings = { seconds: 0.1, fNumber: 3.5, iso: 100, medium: "negative" as const }

  it("is the response the lighting it reckons gives back", () => {
    for (const response of [FilmExposure.FIRST_MARK_RESPONSE, 0.18, FilmExposure.BURNT_OUT]) {
      expect(LitSurfaceOnPicture.responseAt(LitSurfaceOnPicture.luxFor(response, 0.5, settings), 0.5, settings)).toBeCloseTo(response, 6)
    }
  })

  it("needs half the light for twice the albedo, twice the speed or a stop more open", () => {
    const lux = LitSurfaceOnPicture.luxFor(0.18, 0.4, settings)
    expect(LitSurfaceOnPicture.luxFor(0.18, 0.8, settings)).toBeCloseTo(lux / 2, 6)
    expect(LitSurfaceOnPicture.luxFor(0.18, 0.4, { ...settings, iso: 200 })).toBeCloseTo(lux / 2, 6)
    expect(LitSurfaceOnPicture.luxFor(0.18, 0.4, { ...settings, fNumber: 3.5 / Math.SQRT2 })).toBeCloseTo(lux / 2, 6)
  })

  it("takes a picture's settings from its instrument, and from what the recording states over them", () => {
    const kodak = Instruments.byId("kodak-35")
    expect(LitSurfaceOnPicture.settingsOf(kodak, { seconds: 0.1 })).toEqual({ seconds: 0.1, fNumber: 3.5, iso: 100, medium: "negative" })
    expect(LitSurfaceOnPicture.settingsOf(Instruments.byId("eye"))).toBeUndefined()
  })
})
