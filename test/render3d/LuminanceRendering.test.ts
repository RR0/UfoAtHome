import { describe, expect, it } from "vitest"
import { EyeAdaptation } from "../../src/engine/atmosphere/EyeAdaptation.js"
import { AerialPerspective } from "../../src/engine/atmosphere/AerialPerspective.js"
import { Photometry } from "../../src/render3d/Photometry.js"
import { PointSources } from "../../src/render3d/PointSources.js"
import { Veil } from "../../src/render3d/Veil.js"
import { EYE_RESPONSE_GLSL } from "../../src/render3d/colorSpace.js"

describe("rendering in luminance", () => {
  it("finishes a relative light into what the eye made of it, shown as a lightness", () => {
    // Drawn as light and responded to once at the end, the sky keeps the colour it had when each
    // pixel went through the response itself, and its response is shown as the luminance of that
    // lightness — to the rounding of the XYZ-to-sRGB matrix, whose rows sum to Y within 1e-4.
    for (const adapted of [1e-4, 3.5e-3, 1, 3000]) {
      const xyz: [number, number, number] = [0.9 * adapted, adapted, 1.1 * adapted]
      const direct = EyeAdaptation.displayOf(xyz, adapted, adapted, 0)
      const response = Photometry.luminanceOf(direct)
      const finished = EyeAdaptation.finish(EyeAdaptation.relativeOf(xyz, adapted, adapted, 0))
      const shown = EyeAdaptation.fromLightness(response) / response
      for (let c = 0; c < 3; c++) expect(finished[c]).toBeCloseTo(direct[c] * shown, 3)
    }
  })

  it("shows the eye's half response as a photograph's middle grey", () => {
    expect(EyeAdaptation.fromLightness(0.5)).toBeCloseTo(0.184, 3)
    expect(EyeAdaptation.lightnessOf(EyeAdaptation.fromLightness(0.3))).toBeCloseTo(0.3, 9)
  })

  it("fits a colour too saturated for its brightness by desaturating it, not by clipping", () => {
    const shown = EyeAdaptation.finish([30, 5, 0.5])
    expect(Math.max(...shown)).toBeCloseTo(1, 9)
    expect(Photometry.luminanceOf(shown)).toBeCloseTo(EyeAdaptation.fromLightness(EyeAdaptation.respond(Photometry.luminanceOf([30, 5, 0.5]))), 9)
    // Still orange: red over green over blue.
    expect(shown[0]).toBeGreaterThan(shown[1])
    expect(shown[1]).toBeGreaterThan(shown[2])
  })

  it("undoes its own response", () => {
    for (const response of [0.01, 0.3, 0.5, 0.9]) {
      expect(EyeAdaptation.respond(EyeAdaptation.relativeOfResponse(response))).toBeCloseTo(response, 9)
    }
  })

  it("draws a glowing colour at the brightness a white of that luminance is seen at", () => {
    const display = (rgb: readonly [number, number, number], luminance: number) =>
      EyeAdaptation.relativeOf([rgb[0] * luminance, luminance, rgb[2] * luminance], luminance, 1, 0)
    const white = EyeAdaptation.fromLightness(EyeAdaptation.respond(Photometry.luminanceOf(display([1, 1, 1], 5))))
    const blue: [number, number, number] = [0.1, 0.2, 1]
    const shown = EyeAdaptation.finish(Photometry.shown(blue, 5, display))
    // The same as the display-space rule it replaces: the hue over its peak, times the white's brightness.
    for (let c = 0; c < 3; c++) expect(shown[c]).toBeCloseTo(blue[c] * white, 6)
  })

  it("lets less of a low Sun through, and less blue than red", () => {
    const air = new AerialPerspective()
    const high = air.transmittanceFromSpace(0, 60)
    const low = air.transmittanceFromSpace(0, 5)
    expect(low[1]).toBeLessThan(high[1])
    expect(low[2] / low[0]).toBeLessThan(high[2] / high[0])
    // Over a mountain the air above is thinner.
    expect(air.transmittanceFromSpace(3000, 5)[1]).toBeGreaterThan(low[1])
  })

  it("resolves a point to the cones' minute of arc and the rods' ten", () => {
    const minute = (Math.PI / 180 / 60) ** 2
    expect(PointSources.acuitySolidAngle(0)).toBeCloseTo(minute, 12)
    expect(PointSources.acuitySolidAngle(1)).toBeCloseTo(100 * minute, 12)
    expect(PointSources.COVERAGE).toBeGreaterThan(0.1)
    expect(PointSources.COVERAGE).toBeLessThan(Math.PI / 4)
  })

  it("patches three's points vertex shader where it means to", async () => {
    const { ShaderLib } = await import("three")
    const patched = PointSources.patch(ShaderLib.points.vertexShader)
    expect(patched).toContain("uniform float uRodSolidAngle;")
    expect(patched).toContain("vColor.rgb /= uAcuitySolidAngle;")
  })

  it("veils as far as the law stays above a thousandth of the eye's semi-saturation", () => {
    expect(Veil.radiusDeg(Veil.K * 0.05)).toBeCloseTo(Math.sqrt(500), 6)
    expect(Veil.radiusDeg(1e9)).toBe(Veil.MAX_RADIUS_DEG)
  })

  it("keeps the response's exponent in the shader", () => {
    expect(EYE_RESPONSE_GLSL).toContain(EyeAdaptation.RESPONSE_EXPONENT.toFixed(4))
  })
})
