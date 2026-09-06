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

  async getImageryTexture(bounds: GeoBounds, resolution: { width: number; height: number }): Promise<ImageryTexture> {
    const canvas = document.createElement("canvas")
    canvas.width = resolution.width
    canvas.height = resolution.height
    // The whole tile grid a real provider would have had to fetch to contain `bounds` — three
    // times its span here, standing in for the fact that what comes back is never the box asked
    // for (see ImageryTexture.bounds).
    const latSpan = bounds.north - bounds.south
    const lngSpan = bounds.east - bounds.west
    return {
      source: canvas,
      width: resolution.width,
      height: resolution.height,
      bounds: {
        south: bounds.south - latSpan,
        north: bounds.north + latSpan,
        west: bounds.west - lngSpan,
        east: bounds.east + lngSpan
      }
    }
  }
}

const providers = { elevation: new FlatElevation(), imagery: new BlankImagery() }

describe("buildTerrainMesh", () => {
  it("reads the photograph at the coordinates each vertex really has, not across whatever came back", async () => {
    // BlankImagery returns three times the span it was asked for, which is what a tiled provider
    // does. The patch must therefore use the middle third of the image and leave the rest alone:
    // the centre vertex at u=v=0.5, the west edge a third of the way in, the east edge two thirds.
    // Before ImageryTexture carried its own bounds this stretched the full image across the patch
    // (0 and 1 at the edges), which put every pixel of real ground about three times too far out
    // from the witness — and looked perfectly convincing, since one piece of desert resembles the
    // next.
    const { mesh } = await buildTerrainMesh(OBSERVER_LAT, OBSERVER_LNG, providers)
    const uv = mesh.geometry.getAttribute("uv")
    const gridSize = Math.round(Math.sqrt(uv.count))
    const middle = (gridSize - 1) / 2
    expect(uv.getX(middle * gridSize + middle)).toBeCloseTo(0.5, 5)
    // Looser than u, and that slack is itself the point: the rows are laid out evenly in LATITUDE
    // while the image is even in mercator y, so v is off by ~7e-5 here — the two would agree
    // exactly if this used a linear mapping, which is the bug being avoided. It grows with the
    // span and with tan(latitude); Socorro at 34 degrees over 1.8 km is where it is negligible.
    expect(uv.getY(middle * gridSize + middle)).toBeCloseTo(0.5, 3)
    expect(uv.getX(0)).toBeCloseTo(1 / 3, 5)
    expect(uv.getX(gridSize - 1)).toBeCloseTo(2 / 3, 5)
    // North edge first (row 0), so v runs the same way the rows do.
    expect(uv.getY(0)).toBeCloseTo(1 / 3, 3)
    expect(uv.getY((gridSize - 1) * gridSize)).toBeCloseTo(2 / 3, 3)
  })

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
