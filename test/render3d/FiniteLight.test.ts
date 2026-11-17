import { ShaderChunk } from "three"
import { describe, expect, it } from "vitest"
import { FiniteLight } from "../../src/render3d/FiniteLight.js"

describe("FiniteLight", () => {
  it("clamps what every lit material writes, once, before it is written", () => {
    FiniteLight.install()
    FiniteLight.install()
    const chunk = ShaderChunk.opaque_fragment
    expect(chunk.match(/clamp\( outgoingLight/g)).toHaveLength(1)
    expect(chunk.indexOf("clamp( outgoingLight")).toBeLessThan(chunk.indexOf("gl_FragColor"))
    expect(chunk).toContain("60000.0")
  })
})
