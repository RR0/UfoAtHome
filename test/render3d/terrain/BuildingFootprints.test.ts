import { describe, expect, it } from "vitest"
import { BuildingFootprints } from "../../../src/render3d/terrain/BuildingFootprints.js"

/** A grid of 1 m pixels with roofs stamped on it. */
class Roofs {
  readonly heights: Float32Array
  readonly building: Uint8Array

  constructor(readonly size: number) {
    this.heights = new Float32Array(size * size)
    this.building = new Uint8Array(size * size)
  }

  /** A rectangle of `across` by `along` metres turned `degrees` clockwise from north, centred at pixel (x, y), `height` high. */
  roof(x: number, y: number, across: number, along: number, degrees: number, height: number): this {
    const angle = degrees * Math.PI / 180
    for (let j = 0; j < this.size; j++) {
      for (let i = 0; i < this.size; i++) {
        const east = i + 0.5 - x
        const north = y - j - 0.5
        // The part of this pixel along the direction `degrees` (north at 0), and across it.
        const u = east * Math.sin(angle) + north * Math.cos(angle)
        const v = east * Math.cos(angle) - north * Math.sin(angle)
        if (Math.abs(v) <= across / 2 && Math.abs(u) <= along / 2) {
          this.building[j * this.size + i] = 1
          this.heights[j * this.size + i] = height
        }
      }
    }
    return this
  }

  footprints(): BuildingFootprints {
    return new BuildingFootprints(this.heights, this.building, this.size, this.size)
  }
}

describe("BuildingFootprints", () => {
  it("finds a house as the rectangle that holds it, its longer side the width and its depth the way it faces", () => {
    // 100 m grid, centre (50, 50). A 20 m wide, 8 m deep house, its depth running north to south: it faces north.
    const [house] = new Roofs(100).roof(70, 40, 20, 8, 0, 7).footprints().buildings({ metresPerPixel: 1, radiusM: 60 })
    expect(house.widthM).toBeCloseTo(20, 0)
    expect(house.lengthM).toBeCloseTo(8, 0)
    expect(house.heightM).toBeCloseTo(7, 0)
    expect(house.eastM).toBeCloseTo(20, 0)
    expect(house.northM).toBeCloseTo(10, 0)
    // Facing north, or south: a footprint cannot tell which, and the heading is taken from 0 up to 180.
    expect(house.headingDeg % 180).toBeCloseTo(0, 0)
  })

  it("finds the direction a turned house faces, square to its walls whichever way it is turned", () => {
    const [house] = new Roofs(100).roof(50, 50, 16, 6, 30, 6).footprints().buildings({ metresPerPixel: 1, radiusM: 60 })
    // Within a pixel: the corners of a turned roof are staircases of whole pixels, which add up to a pixel to each side.
    expect(Math.abs(house.widthM - 16)).toBeLessThanOrEqual(1.5)
    expect(Math.abs(house.lengthM - 6)).toBeLessThanOrEqual(1.5)
    expect(Math.abs(house.headingDeg - 30)).toBeLessThanOrEqual(5)
  })

  it("takes an L apart into the rectangles it is made of, and not into one box that holds the courtyard too", () => {
    // Two arms of a 30 m by 10 m L: 30 x 10 along the north, 10 x 20 down the west side below it.
    const roofs = new Roofs(100).roof(50, 30, 10, 30, 90, 6).roof(40, 45, 10, 20, 0, 6)
    const found = roofs.footprints().buildings({ metresPerPixel: 1, radiusM: 60 })
    expect(found.length).toBeGreaterThanOrEqual(2)
    // None of them covers the corner of the box that is open sky.
    for (const building of found) expect(building.widthM * building.lengthM).toBeLessThanOrEqual(30 * 10 + 20)
  })

  it("keeps two houses of different heights that touch as two buildings", () => {
    // Two 10 m houses side by side, a 6 m roof and a 12 m roof: the classification gives one patch, a walk past gives two.
    const found = new Roofs(100).roof(40, 50, 10, 10, 0, 6).roof(50, 50, 10, 10, 0, 12).footprints().buildings({ metresPerPixel: 1, radiusM: 60 })
    expect(found.map(building => Math.round(building.heightM)).sort()).toEqual([12, 6])
  })

  it("gives the height of the roof as what most of it stays under, not the top of a chimney", () => {
    const roofs = new Roofs(100).roof(50, 50, 10, 10, 0, 6)
    roofs.heights[50 * 100 + 50] = 15
    const [house] = roofs.footprints().buildings({ metresPerPixel: 1, radiusM: 60 })
    expect(house.heightM).toBeCloseTo(6, 0)
  })

  it("leaves out what is too small to be a building, and what is beyond the radius, and counts the nearest first", () => {
    const roofs = new Roofs(200).roof(100, 100, 2, 2, 0, 3).roof(150, 100, 6, 6, 0, 5).roof(120, 100, 6, 6, 0, 5).roof(195, 100, 6, 6, 0, 5)
    const found = roofs.footprints().buildings({ metresPerPixel: 1, radiusM: 60 })
    expect(found.map(building => Math.round(building.eastM))).toEqual([20, 50])
  })
})
