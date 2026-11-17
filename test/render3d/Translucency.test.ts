import { describe, expect, it } from "vitest"
import { Group, Mesh, MeshStandardMaterial, SphereGeometry } from "three"
import type { WebGLProgramParametersWithUniforms, WebGLRenderer } from "three"
import { Translucency } from "../../src/render3d/Translucency.js"

describe("Translucency", () => {
  const shaderOf = (material: MeshStandardMaterial) => {
    const shader = { uniforms: {}, vertexShader: "", fragmentShader: "#include <common>\n#include <emissivemap_fragment>" } as unknown as WebGLProgramParametersWithUniforms
    material.onBeforeCompile(shader, {} as WebGLRenderer)
    return shader
  }

  it("lets the share it is given of the directional lights on the far side through, forward most", () => {
    const material = new MeshStandardMaterial()
    const scene = new Group().add(new Mesh(new SphereGeometry(), material))
    Translucency.apply(scene, 0.18)
    const shader = shaderOf(material)
    expect((shader.uniforms.translucency as { value: number }).value).toBe(0.18)
    expect(shader.fragmentShader).toContain("-dot(normal, directionalLights[i].direction)")
    expect(material.customProgramCacheKey()).toContain("translucency")
  })

  it("is applied once, and takes a new share again", () => {
    const material = new MeshStandardMaterial()
    const scene = new Group().add(new Mesh(new SphereGeometry(), material))
    Translucency.apply(scene, 0.1)
    Translucency.apply(scene, 0.2)
    const shader = shaderOf(material)
    expect(shader.fragmentShader.match(/uniform float translucency/g)).toHaveLength(1)
    expect((shader.uniforms.translucency as { value: number }).value).toBe(0.2)
  })
})
