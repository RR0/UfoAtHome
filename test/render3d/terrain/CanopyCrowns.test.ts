import { describe, expect, it } from "vitest"
import { CanopyCrowns } from "../../../src/render3d/terrain/CanopyCrowns.js"
import { GeoTiffRaster } from "../../../src/render3d/terrain/GeoTiffRaster.js"
import { TiffFixture } from "./TiffFixture.js"

/** A grid of `size` x `size` pixels of 1 m, flat, with discs of the given height and radius stamped on it. */
class Grid {
  readonly heights: Float32Array
  readonly vegetation: Uint8Array

  constructor(readonly size: number) {
    this.heights = new Float32Array(size * size)
    this.vegetation = new Uint8Array(size * size)
  }

  /** A crown of `radius` pixels centred at (x, y), `height` high; `plant` false makes it a roof. */
  disc(x: number, y: number, radius: number, height: number, plant = true): this {
    for (let j = 0; j < this.size; j++) {
      for (let i = 0; i < this.size; i++) {
        if (Math.hypot(i - x, j - y) <= radius) {
          // Taller at the middle, as a crown is, so there is one summit to find.
          this.heights[j * this.size + i] = Math.max(this.heights[j * this.size + i], height - Math.hypot(i - x, j - y) * 0.2)
          this.vegetation[j * this.size + i] = plant ? 1 : 0
        }
      }
    }
    return this
  }

  crowns(): CanopyCrowns {
    return new CanopyCrowns(this.heights, this.vegetation, this.size, this.size)
  }
}

describe("CanopyCrowns", () => {
  it("finds one tree where there is one crown, placed in metres from the centre, north up", () => {
    // 100 x 100 pixels of 1 m: the centre is (50, 50). A crown 20 px east and 10 px north of it.
    const trees = new Grid(100).disc(70, 40, 4, 12).crowns().trees({ metresPerPixel: 1, radiusM: 60 })
    expect(trees).toHaveLength(1)
    // The middle of a pixel, which is where its height was measured: half a pixel east and south of its corner.
    expect(trees[0].eastM).toBeCloseTo(20.5, 1)
    expect(trees[0].northM).toBeCloseTo(9.5, 1)
    expect(trees[0].heightM).toBeCloseTo(12, 0)
    expect(trees[0].widthM).toBeGreaterThan(4)
    expect(trees[0].widthM).toBeLessThanOrEqual(16)
  })

  it("finds two crowns where two are far enough apart, and the most prominent first", () => {
    const trees = new Grid(100).disc(50, 20, 4, 8).disc(50, 80, 4, 8).disc(55, 52, 4, 15).crowns().trees({ metresPerPixel: 1, radiusM: 60 })
    expect(trees).toHaveLength(3)
    // The near, tall one reaches highest above the eye line.
    expect(trees[0].heightM).toBeCloseTo(15, 0)
  })

  it("does not take a roof for a tree: only what is vegetation counts", () => {
    const trees = new Grid(100).disc(70, 40, 6, 20, false).crowns().trees({ metresPerPixel: 1, radiusM: 60 })
    expect(trees).toEqual([])
  })

  it("ignores bushes lower than a tree, and trees beyond the radius", () => {
    const grid = new Grid(200).disc(110, 100, 3, 2).disc(190, 100, 4, 12)
    expect(grid.crowns().trees({ metresPerPixel: 1, radiusM: 60 })).toEqual([])
  })

  it("keeps only the trees that stand out above the eye line, and no more than asked for", () => {
    // A 5 m tree 100 m away is 2 degrees above an eye 1.6 m up: just kept. A 4.5 m one 200 m away is not.
    const near = new Grid(300).disc(250, 150, 3, 5.5).crowns().trees({ metresPerPixel: 1, radiusM: 140, minElevationDeg: 2 })
    expect(near).toHaveLength(1)
    const far = new Grid(500).disc(450, 250, 3, 4.5).crowns().trees({ metresPerPixel: 1, radiusM: 240, minElevationDeg: 2 })
    expect(far).toEqual([])
    const grid = new Grid(100)
    for (let i = 0; i < 8; i++) grid.disc(10 + i * 10, 50, 3, 10)
    expect(grid.crowns().trees({ metresPerPixel: 1, radiusM: 60, maxTrees: 3 })).toHaveLength(3)
  })
})

describe("GeoTiffRaster", () => {
  it("reads a grid of heights", () => {
    const raster = GeoTiffRaster.parse(TiffFixture.floats(3, 2, [0, 1, 2, 3.5, 4, -9999]))
    expect([raster.width, raster.height, raster.samples]).toEqual([3, 2, 1])
    expect(raster.at(0, 0)).toBe(0)
    expect(raster.at(0, 1)).toBeCloseTo(3.5)
    expect(raster.at(2, 1)).toBe(-9999)
  })

  it("reads a picture of several values a pixel", () => {
    const raster = GeoTiffRaster.parse(TiffFixture.bytes(2, 1, 4, [70, 150, 60, 255, 180, 20, 20, 255]))
    expect(raster.samples).toBe(4)
    expect([raster.at(0, 0, 0), raster.at(0, 0, 1), raster.at(0, 0, 2)]).toEqual([70, 150, 60])
    expect(raster.at(1, 0, 0)).toBe(180)
  })

  it("refuses what is not a TIFF it can read rather than reading noise", () => {
    expect(() => GeoTiffRaster.parse(new TextEncoder().encode("<html>Service unavailable</html>").buffer as ArrayBuffer)).toThrow()
  })
})
