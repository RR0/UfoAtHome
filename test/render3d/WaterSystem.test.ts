import { describe, expect, it } from "vitest"
import { Mesh, Vector3 } from "three"
import { WaterSystem } from "../../src/render3d/WaterSystem.js"
import { localMetersToGeo } from "../../src/render3d/terrain/GeoProjection.js"

const ORIGIN = { lat: 48.853, lng: 2.349 }

/** A ring of points in metres east and south of the origin (the patch's x and z), as places. */
function ring(...points: [number, number][]): { lat: number, lng: number }[] {
  return points.map(([x, z]) => localMetersToGeo(x, z, ORIGIN.lat, ORIGIN.lng))
}

/** The Seine between its quays: 27 m in a bed 40 m wide, the quays 36 m, the mesh climbing between them over 7 m. */
const quays = (_x: number, z: number): number => {
  const fromMiddle = Math.abs(z)
  return fromMiddle < 13 ? 27 : fromMiddle > 20 ? 36 : 27 + (fromMiddle - 13) / 7 * 9
}

describe("WaterSystem", () => {
  it("lays a river at the level of its bed, not of the banks the mesh climbs inside its outline", () => {
    const water = new WaterSystem()
    water.set([{ id: "seine", rings: [ring([-100, -20], [100, -20], [100, 20], [-100, 20])] }], ORIGIN.lat, ORIGIN.lng, quays, 300, 7)
    expect(water.count).toBe(1)
    const mesh = water.group.children[0] as Mesh
    mesh.geometry.computeBoundingBox()
    expect(mesh.geometry.boundingBox!.min.y).toBeCloseTo(27 + WaterSystem.LIFT_M, 2)
    expect(mesh.geometry.boundingBox!.max.y).toBeCloseTo(27 + WaterSystem.LIFT_M, 2)
  })

  it("cuts a surface to the patch, keeps its islands dry, and faces every triangle up", () => {
    const water = new WaterSystem()
    // A lake reaching far past a patch of 50 m, with an island in the middle.
    water.set([{ id: "lake", rings: [ring([-500, -500], [500, -500], [500, 500], [-500, 500]), ring([-10, -10], [10, -10], [10, 10], [-10, 10])] }], ORIGIN.lat, ORIGIN.lng, () => 0, 50, 7)
    const geometry = (water.group.children[0] as Mesh).geometry
    geometry.computeBoundingBox()
    expect(geometry.boundingBox!.min.x).toBeCloseTo(-50, 3)
    expect(geometry.boundingBox!.max.z).toBeCloseTo(50, 3)
    const positions = geometry.getAttribute("position")
    let area = 0
    const [a, b, c] = [new Vector3(), new Vector3(), new Vector3()]
    for (let i = 0; i < positions.count; i += 3) {
      a.fromBufferAttribute(positions, i)
      b.fromBufferAttribute(positions, i + 1)
      c.fromBufferAttribute(positions, i + 2)
      const normal = new Vector3().subVectors(b, a).cross(new Vector3().subVectors(c, a))
      expect(normal.y).toBeGreaterThan(0)
      area += normal.length() / 2
    }
    expect(area).toBeCloseTo(100 * 100 - 20 * 20, 0)
  })

  it("draws nothing of a surface outside the patch", () => {
    const water = new WaterSystem()
    water.set([{ id: "far", rings: [ring([200, 200], [220, 200], [220, 220])] }], ORIGIN.lat, ORIGIN.lng, () => 0, 50, 7)
    expect(water.count).toBe(0)
  })

  it("reads a pond narrower than the grid at its own outline", () => {
    expect(WaterSystem.level([{ x: 0, z: 0 }, { x: 2, z: 0 }, { x: 2, z: 2 }], [], (x) => 5 + x, 7)).toBe(5)
  })
})
