import { describe, expect, it } from "vitest"
import { GlassMaterial } from "../../src/render3d/GlassMaterial.js"
import { Fresnel } from "../../src/engine/atmosphere/Fresnel.js"

describe("a thin wall of glass", () => {
  it("mirrors some eight per cent head-on, both its faces together", () => {
    // One face: ((1.5 − 1)/(1.5 + 1))² = 4 %; two, with the light bouncing between them: 2R/(1+R).
    expect(GlassMaterial.wallReflectance(1, 1.5, Fresnel.reflectance)).toBeCloseTo(0.0769, 3)
  })

  it("becomes a mirror towards its rim, where the eye meets it at grazing incidence", () => {
    const at = (degrees: number) => GlassMaterial.wallReflectance(Math.cos((degrees * Math.PI) / 180), 1.5, Fresnel.reflectance)
    expect(at(60)).toBeGreaterThan(at(0))
    expect(at(80)).toBeGreaterThan(0.5)
    expect(at(89.5)).toBeGreaterThan(0.95)
  })
})
