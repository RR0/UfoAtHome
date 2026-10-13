import { describe, expect, it } from "vitest"
import { Box3 } from "three"
import { RoofGeometry } from "../../src/render3d/RoofGeometry.js"

function box(roof: Parameters<typeof RoofGeometry.build>[0], width: number, length: number): Box3 {
  const geometry = RoofGeometry.build(roof, width, length)
  geometry.computeBoundingBox()
  return geometry.boundingBox!
}

describe("RoofGeometry", () => {
  const OVER = RoofGeometry.OVERHANG_M

  it("rises to the ridge it was given, from the eaves, and overhangs the walls on every side", () => {
    const gable = box({ shape: "gable", riseM: 3 }, 12, 8)
    expect(gable.min.y).toBeCloseTo(0)
    expect(gable.max.y).toBeCloseTo(3)
    expect(gable.max.x - gable.min.x).toBeCloseTo(12 + 2 * OVER)
    expect(gable.max.z - gable.min.z).toBeCloseTo(8 + 2 * OVER)
  })

  it("runs a gable's ridge the length of the width, and a ridge along the depth the other way", () => {
    const along = RoofGeometry.build({ shape: "gable", riseM: 3 }, 12, 8)
    const ridge = (geometry: typeof along): { x: number[], z: number[] } => {
      const at = geometry.getAttribute("position")
      const x: number[] = []
      const z: number[] = []
      for (let i = 0; i < at.count; i++) if (Math.abs(at.getY(i) - 3) < 1e-6) { x.push(at.getX(i)); z.push(at.getZ(i)) }
      return { x, z }
    }
    const width = ridge(along)
    expect(Math.max(...width.x) - Math.min(...width.x)).toBeGreaterThan(10)
    expect(Math.max(...width.z) - Math.min(...width.z)).toBeCloseTo(0)
    const depth = ridge(RoofGeometry.build({ shape: "gable", riseM: 3, ridge: "depth" }, 12, 8))
    expect(Math.max(...depth.z) - Math.min(...depth.z)).toBeGreaterThan(6)
    expect(Math.max(...depth.x) - Math.min(...depth.x)).toBeCloseTo(0)
    const turned = box({ shape: "gable", riseM: 3, ridge: "depth" }, 12, 8)
    expect(turned.max.x - turned.min.x).toBeCloseTo(12 + 2 * OVER)
    expect(turned.max.z - turned.min.z).toBeCloseTo(8 + 2 * OVER)
  })

  it("makes a hip roof's ridge shorter than the building and a square one a point", () => {
    const hip = RoofGeometry.build({ shape: "hip", riseM: 3 }, 12, 8)
    const at = hip.getAttribute("position")
    const ridge: number[] = []
    for (let i = 0; i < at.count; i++) if (Math.abs(at.getY(i) - 3) < 1e-6) ridge.push(at.getX(i))
    expect(Math.max(...ridge) - Math.min(...ridge)).toBeLessThan(5)
    const square = RoofGeometry.build({ shape: "hip", riseM: 3 }, 8, 8)
    const top = square.getAttribute("position")
    const xs: number[] = []
    for (let i = 0; i < top.count; i++) if (Math.abs(top.getY(i) - 3) < 1e-6) xs.push(top.getX(i))
    expect(Math.max(...xs) - Math.min(...xs)).toBeLessThan(0.2)
  })

  it("is a thin slab for a flat roof, which is where a colour goes on a box", () => {
    const flat = box({ shape: "flat", riseM: 0 }, 12, 8)
    expect(flat.max.y).toBeCloseTo(RoofGeometry.SLAB_M)
  })
})
