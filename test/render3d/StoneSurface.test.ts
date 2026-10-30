import { describe, expect, it } from "vitest"
import { PlaneGeometry } from "three"
import { StoneSurface } from "../../src/render3d/StoneSurface.js"

describe("StoneSurface", () => {
  it("is made once, the same tile everywhere it is drawn", () => {
    expect(StoneSurface.texture()).toBe(StoneSurface.texture())
  })

  it("has grain in its slabs and darker joints between them", () => {
    const data = StoneSurface.texture().image.data as Uint8Array
    const size = StoneSurface.SIZE
    const slabPx = size / StoneSurface.SLABS
    const at = (x: number, y: number) => data[(y * size + x) * 4]
    // Inside one slab, the stone is not one flat value.
    const inside = Array.from({ length: 50 }, (_, i) => at(slabPx / 2 + i, slabPx / 2))
    expect(Math.max(...inside) - Math.min(...inside)).toBeGreaterThan(10)
    // A joint, at a slab's edge, is darker than the stone beside it.
    expect(at(slabPx, slabPx / 2)).toBeLessThan(Math.min(...inside))
  })

  it("lays the pattern at its real size, in metres seen from above", () => {
    const tileM = StoneSurface.SLAB_M * StoneSurface.SLABS
    const geometry = new PlaneGeometry(tileM * 2, tileM).rotateX(-Math.PI / 2)
    StoneSurface.layOn(geometry)
    const uv = geometry.getAttribute("uv")
    const us = Array.from({ length: uv.count }, (_, i) => uv.getX(i))
    expect(Math.max(...us) - Math.min(...us)).toBeCloseTo(2, 6)
  })
})
