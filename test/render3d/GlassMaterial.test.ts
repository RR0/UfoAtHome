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

  it("shows a lamp's reflection nearly as bright as the lamp, through the eye rather than times it", () => {
    const headOn = GlassMaterial.wallReflectance(1, 1.5, Fresnel.reflectance)
    // A lamp at the top of the eye's range: its 8 % is still near the top, not 8 % of it.
    expect(GlassMaterial.reflectedResponse(0.999, headOn)).toBeGreaterThan(0.9)
    // A day sky shown at 0.42: its reflection is well above 8 % of it, and below the sky itself.
    const sky = GlassMaterial.reflectedResponse(0.42, headOn)
    expect(sky).toBeGreaterThan(0.42 * headOn * 2)
    expect(sky).toBeLessThan(0.42)
    // A darker thing makes a darker reflection, and a mirror gives the thing back.
    expect(GlassMaterial.reflectedResponse(0.1, headOn)).toBeLessThan(sky)
    expect(GlassMaterial.reflectedResponse(0.42, 1)).toBeCloseTo(0.42, 6)
  })
})

describe("GlassMaterial's Sun", () => {
  it("is the same disc for every glass, which the probe no longer holds", () => {
    const Glass = GlassMaterial
    const a = new Glass(), b = new Glass()
    Glass.setSun({ direction: [0, 0.1, -1], radiusRad: 0.00465, radiance: [5, 4, 3] })
    expect(a.uniforms.uSunRadiance.value.toArray()).toEqual([5, 4, 3])
    expect(b.uniforms.uSunCosRadius.value).toBeCloseTo(Math.cos(0.00465), 9)
    expect(a.uniforms.uSunDirection.value.length()).toBeCloseTo(1, 9)
    expect(a.fragmentShader).toContain("uSunCosRadius")
    Glass.setSun(undefined)
    expect(b.uniforms.uSunRadiance.value.toArray()).toEqual([0, 0, 0])
    expect(a.uniforms.uSunCosRadius.value).toBeGreaterThan(1)
  })
})
