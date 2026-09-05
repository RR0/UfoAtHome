import { describe, expect, it } from "vitest"
import type { MeshLambertMaterial } from "three"
import { buildTerrainMesh } from "../../../src/render3d/terrain/TerrainMeshBuilder.js"
import type { ElevationGrid, ElevationProvider } from "../../../src/render3d/terrain/ElevationProvider.js"
import type { ImageryProvider, ImageryTexture } from "../../../src/render3d/terrain/ImageryProvider.js"
import type { GeoBounds } from "../../../src/render3d/terrain/GeoBounds.js"

const OBSERVER_LAT = 34.058
const OBSERVER_LNG = -106.891
/** Socorro's real ground is some 1400 m above the sea, and the patch is built RELATIVE to whatever
 * the observer stands on — a flat plateau at this height must still come out at y≈0 around them. */
const PLATEAU_M = 1400

class FlatElevation implements ElevationProvider {
  async getElevationGrid(bounds: GeoBounds, resolution: { width: number; height: number }): Promise<ElevationGrid> {
    return {
      heights: new Float32Array(resolution.width * resolution.height).fill(PLATEAU_M),
      width: resolution.width,
      height: resolution.height,
      bounds
    }
  }
}

class BlankImagery implements ImageryProvider {
  readonly attribution = "test imagery"

  async getImageryTexture(_bounds: GeoBounds, resolution: { width: number; height: number }): Promise<ImageryTexture> {
    const canvas = document.createElement("canvas")
    canvas.width = resolution.width
    canvas.height = resolution.height
    return { source: canvas, width: resolution.width, height: resolution.height }
  }
}

const providers = { elevation: new FlatElevation(), imagery: new BlankImagery() }

describe("buildTerrainMesh", () => {
  it("is depth-tested, so the scenery standing on it can occlude it", async () => {
    // The regression this guards: the patch used to carry depthTest:false and a renderOrder above
    // every decor group's, so it repainted whatever stood on it. A patrol car eight meters from the
    // witness came out as a featureless slab with only its roof clearing the terrain's silhouette,
    // and a shack ninety meters out disappeared altogether — which is exactly the ground a witness
    // reports things happening ON. See SceneRenderer.applyGroundDepthWrite for the other half: the
    // flat haze disc underneath stops writing depth while this patch exists, which is what
    // depthTest:false was really working around.
    const { mesh } = await buildTerrainMesh(OBSERVER_LAT, OBSERVER_LNG, providers, 900)
    expect((mesh.material as MeshLambertMaterial).depthTest).toBe(true)
  })

  it("puts the observer's own ground at y=0, whatever its height above the sea", async () => {
    const { mesh } = await buildTerrainMesh(OBSERVER_LAT, OBSERVER_LNG, providers, 900)
    const positions = mesh.geometry.getAttribute("position")
    for (let i = 0; i < positions.count; i++) {
      expect(positions.getY(i)).toBeCloseTo(0, 1)
    }
  })

  it("reports the imagery provider's own attribution", async () => {
    const { attribution } = await buildTerrainMesh(OBSERVER_LAT, OBSERVER_LNG, providers, 900)
    expect(attribution).toBe("test imagery")
  })
})
