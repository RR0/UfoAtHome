import { describe, expect, it } from "vitest"
import { BufferAttribute, BufferGeometry, Mesh, ShaderLib } from "three"
import { PointLayerPass } from "../../src/render3d/PointLayerPass.js"
import { SkyRibbons } from "../../src/render3d/SkyRibbons.js"
import { PointSources } from "../../src/render3d/PointSources.js"

describe("SkyRibbons", () => {
  it("hooks into three's own projection line of the basic material, which would otherwise leave a ribbon at the source's pixels", () => {
    expect(ShaderLib.basic.vertexShader).toContain(PointSources.PROJECT_ANCHOR)
    const patched = SkyRibbons.patchOutput(ShaderLib.basic.vertexShader)
    expect(patched).toContain("uOutputHalfFovRad")
    expect(patched.indexOf("uOutputHalfFovRad")).toBeLessThan(patched.indexOf("void main"))
    expect(patched).toContain("vColor.rgb *= 1.0 - covered;")
  })

  it("is one twin per material, drawn without depth", () => {
    const material = SkyRibbons.material()
    const twin = SkyRibbons.outputMaterial(material)
    expect(SkyRibbons.outputMaterial(material)).toBe(twin)
    expect(twin.depthTest).toBe(false)
    expect(twin.vertexColors).toBe(true)
  })

  it("is taken into the picture's own layer while it has something to draw, and left alone when it has none", () => {
    const geometry = new BufferGeometry()
    geometry.setAttribute("position", new BufferAttribute(new Float32Array(9), 3))
    geometry.setDrawRange(0, 0)
    const ribbon = new Mesh(geometry, SkyRibbons.material())
    SkyRibbons.track(ribbon)
    const layer = new PointLayerPass(64, 36)
    const host = { points: () => [ribbon], clouds: () => [], sky: ribbon }
    expect(layer.take(host)).toBe(false)
    geometry.setDrawRange(0, 3)
    expect(layer.take(host)).toBe(true)
    expect(ribbon.visible).toBe(false)
    layer.restore()
    expect(ribbon.visible).toBe(true)
  })
})
