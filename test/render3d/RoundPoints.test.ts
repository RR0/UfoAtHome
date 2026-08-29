import { describe, expect, it } from "vitest"
import { ShaderLib } from "three"
import { RoundPoints } from "../../src/render3d/RoundPoints.js"

describe("RoundPoints", () => {
  it("hooks onto a line three.js's own points shader still has", () => {
    // The whole failure mode this guards. The rounding is a string replacement in three's shader:
    // if a future version words that line differently, replace() silently does nothing, no error is
    // raised anywhere, and every star in the sky quietly goes back to being a square. Upgrading
    // three should break THIS, loudly, rather than the sky.
    expect(ShaderLib.points.fragmentShader).toContain(RoundPoints.ANCHOR)
  })

  it("throws away the corners of the quad, which is what made stars square", () => {
    const patched = RoundPoints.patch(ShaderLib.points.fragmentShader)
    expect(patched).not.toBe(ShaderLib.points.fragmentShader)
    expect(patched).toContain("gl_PointCoord")
    expect(patched).toContain("discard")
  })

  it("fades the disc outwards rather than stamping a hard circle", () => {
    // A point source spreads; it does not end at a rim. A flat disc would just be a rounder sticker.
    const patched = RoundPoints.patch(ShaderLib.points.fragmentShader)
    expect(patched).toContain("smoothstep")
    expect(patched).toContain("opacity * glare")
  })

  it("leaves a shader it does not recognise alone rather than breaking it", () => {
    // A sky of squares is a poor result; a shader that fails to compile is a black one.
    const foreign = "void main() { gl_FragColor = vec4( 1.0 ); }"
    expect(RoundPoints.patch(foreign)).toBe(foreign)
  })
})
