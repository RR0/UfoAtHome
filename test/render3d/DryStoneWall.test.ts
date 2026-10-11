import { describe, expect, it } from "vitest"
import { Box3, Mesh } from "three"
import { DryStoneWall } from "../../src/render3d/DryStoneWall.js"
import { DecorSystem } from "../../src/render3d/DecorSystem.js"

describe("DryStoneWall", () => {
  const wall = { id: "muret", kind: "wall" as const, eastM: 0, northM: 0, sizeM: { widthM: 0.6, lengthM: 80, heightM: 1 } }

  it("is built at the size the recording states, and is not stretched afterwards", () => {
    const group = DecorSystem.build(wall, false)
    const box = new Box3().setFromObject(group)
    expect(box.max.x - box.min.x).toBeCloseTo(0.6)
    expect(box.max.z - box.min.z).toBeCloseTo(80)
    expect(box.max.y).toBeCloseTo(1)
    expect(DecorSystem.naturalSize("wall")).toEqual({ widthM: 1, lengthM: 1, heightM: 1 })
  })

  it("is wrapped in stones of a real size, whatever its length", () => {
    const mesh = DryStoneWall.build(wall).children[0] as Mesh
    expect((mesh.material as { map: unknown }).map).toBe(DryStoneWall.texture())
    const uv = mesh.geometry.getAttribute("uv")
    // The first face runs along the length: eighty metres is as many tiles of the pattern as it holds.
    const along = Math.max(...Array.from({ length: 4 }, (_, i) => uv.getX(i)))
    expect(along).toBeCloseTo(80 / 2.4, 1)
  })
})
