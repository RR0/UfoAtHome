import { describe, expect, it } from "vitest"
import { MeshLambertMaterial } from "three"
import { GrassDetail } from "../../src/render3d/terrain/GrassDetail.js"

/** What three hands onBeforeCompile: the material's own shader, with the chunks it is built from. */
function compile(material: MeshLambertMaterial): { vertexShader: string, fragmentShader: string, uniforms: Record<string, { value: number }> } {
  const shader = {
    vertexShader: "#include <common>\n#include <begin_vertex>\nvoid main() {}",
    fragmentShader: "#include <common>\n#include <map_fragment>\nvoid main() {}",
    uniforms: {} as Record<string, { value: number }>
  }
  material.onBeforeCompile(shader as never, undefined as never)
  return shader
}

describe("GrassDetail", () => {
  it("lays the grain where the photograph is green, read in the patch's own metres", () => {
    const material = new MeshLambertMaterial()
    GrassDetail.install(material)
    const shader = compile(material)

    expect(shader.vertexShader).toContain("vGrassPatchXZ = position.xz")
    expect(shader.fragmentShader).toContain("smoothstep(0.2200, 0.5000, green)")
    expect(shader.uniforms.uGrassContrast.value).toBe(GrassDetail.CONTRAST)
  })

  it("lays it everywhere on a surface that is grass by construction, in the world's metres, as a program of its own", () => {
    const detected = new MeshLambertMaterial()
    const everywhere = new MeshLambertMaterial()
    GrassDetail.install(detected)
    GrassDetail.install(everywhere, true)
    const shader = compile(everywhere)

    expect(shader.vertexShader).toContain("modelMatrix")
    expect(shader.fragmentShader).toContain("float grass = 1.0;")
    expect(everywhere.customProgramCacheKey()).not.toBe(detected.customProgramCacheKey())
  })
})
