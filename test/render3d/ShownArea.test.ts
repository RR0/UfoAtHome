import { describe, expect, it } from "vitest"
import { BoxGeometry, Group, Mesh, MeshBasicMaterial, SphereGeometry, Vector3 } from "three"
import { ShownArea } from "../../src/render3d/ShownArea.js"

const placed = (mesh: Mesh, set?: (holder: Group) => void): Mesh => {
  const holder = new Group()
  holder.add(mesh)
  set?.(holder)
  holder.updateMatrixWorld(true)
  return mesh
}

describe("ShownArea", () => {
  it("is π r² for a ball, from anywhere", () => {
    const ball = placed(new Mesh(new SphereGeometry(2, 64, 32), new MeshBasicMaterial()))
    for (const d of [new Vector3(1, 0, 0), new Vector3(0, 1, 0), new Vector3(1, 1, 1).normalize()]) {
      expect(ShownArea.of([ball], d)).toBeCloseTo(Math.PI * 4, 0)
    }
    // A quarter of its surface: πr² too, for a convex body.
    expect(ShownArea.of([ball])).toBeCloseTo(Math.PI * 4, 0)
  })

  it("is a panel's face from in front and its edge from the side: a blimp's sign is 28 by 6.5, not a disc 28 across", () => {
    const sign = placed(new Mesh(new BoxGeometry(0.1, 6.5, 28), new MeshBasicMaterial()))
    expect(ShownArea.of([sign], new Vector3(1, 0, 0))).toBeCloseTo(182, 0)
    expect(ShownArea.of([sign], new Vector3(0, 0, 1))).toBeCloseTo(0.65, 1)
    expect(ShownArea.of([sign], new Vector3(1, 0, 0))).toBeLessThan(Math.PI * 14 * 14 / 3)
  })

  it("follows the mesh as it is turned and stretched", () => {
    const panel = placed(new Mesh(new BoxGeometry(1, 1, 0.01), new MeshBasicMaterial()), holder => {
      holder.scale.set(3, 2, 1)
      holder.rotation.y = Math.PI / 2
    })
    // Its 3 by 2 face, turned to face +X.
    expect(ShownArea.of([panel], new Vector3(1, 0, 0))).toBeCloseTo(6, 1)
    expect(ShownArea.of([panel], new Vector3(0, 0, 1))).toBeLessThan(0.1)
  })
})
