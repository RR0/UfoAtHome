import { describe, expect, it } from "vitest"
import { Layers } from "three"
import { RenderLayers } from "../../src/render3d/RenderLayers.js"
import { BODY_OVER_LAYER } from "../../src/render3d/BodySystem.js"
import { PHENOMENON_LAYER } from "../../src/render3d/PhenomenonSystem.js"
import { REFERENCE_LAYER } from "../../src/render3d/ReferenceSystem.js"
import { PointLayerPass } from "../../src/render3d/PointLayerPass.js"

describe("RenderLayers", () => {
  const layers = Object.entries(RenderLayers)

  it("gives each pass a layer of its own, never the scene's", () => {
    const numbers = layers.map(([, layer]) => layer)
    expect(new Set(numbers).size).toBe(numbers.length)
    for (const [name, layer] of layers) {
      expect(Number.isInteger(layer), name).toBe(true)
      expect(layer, name).toBeGreaterThan(0)
      expect(layer, name).toBeLessThan(32)
    }
  })

  it("is the layer each system puts its objects on", () => {
    expect(BODY_OVER_LAYER).toBe(RenderLayers.bodyOver)
    expect(PHENOMENON_LAYER).toBe(RenderLayers.phenomenon)
    expect(REFERENCE_LAYER).toBe(RenderLayers.reference)
    expect(PointLayerPass.OCCLUDER_LAYER).toBe(RenderLayers.pointOccluder)
    expect(PointLayerPass.CLOUD_LAYER).toBe(RenderLayers.pointCloud)
  })

  it("keeps a body out of the camera that draws the Sun's dazzle on the resampled picture", () => {
    // A body is on the scene's layer and on bodyOver (see BodySystem); the dazzle is drawn by the eye's camera set to dazzle alone.
    const body = new Layers()
    body.enable(RenderLayers.bodyOver)
    const dazzleCamera = new Layers()
    dazzleCamera.set(RenderLayers.dazzle)
    expect(dazzleCamera.test(body)).toBe(false)
  })
})
