import { describe, expect, it } from "vitest"
import type { SurveyedBuilding } from "../../../src/render3d/terrain/SurroundingsProvider.js"
import { RoofShapes } from "../../../src/render3d/terrain/RoofShapes.js"
import type { RoofHeights, RoofPhoto } from "../../../src/render3d/terrain/RoofShapes.js"

const SIZE = 100
const RES = 0.5
/** 12 m wide (east-west), 8 m deep (north-south), in the middle of a 50 m square, facing north (the depth is the heading). */
const HOUSE: SurveyedBuilding = { eastM: 0, northM: 0, widthM: 12, lengthM: 8, heightM: 8, headingDeg: 0 }

/** A laser square where `heightAt(east, north)` says how high the roof is under that point (undefined: no roof). */
function laser(heightAt: (east: number, north: number) => number | undefined, plants?: (east: number, north: number) => boolean): RoofHeights {
  const heights = new Float32Array(SIZE * SIZE).fill(0)
  const vegetation = new Uint8Array(SIZE * SIZE)
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const east = (x + 0.5 - SIZE / 2) * RES
      const north = (SIZE / 2 - y - 0.5) * RES
      const height = heightAt(east, north)
      if (height !== undefined) heights[y * SIZE + x] = height
      if (plants?.(east, north)) vegetation[y * SIZE + x] = 1
    }
  }
  return { size: SIZE, metresPerPixel: RES, heights, vegetation }
}

const inHouse = (east: number, north: number): boolean => Math.abs(east) <= 6 && Math.abs(north) <= 4

/** A photograph of the same square, red where the house is, the colour of a lawn elsewhere. */
function photo(red: number[], lawn = [60, 140, 50]): RoofPhoto {
  const values = new Uint8Array(SIZE * SIZE * 3)
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const east = (x + 0.5 - SIZE / 2) * RES
      const north = (SIZE / 2 - y - 0.5) * RES
      values.set(inHouse(east, north) ? red : lawn, (y * SIZE + x) * 3)
    }
  }
  return { size: SIZE, metresPerPixel: RES, samples: 3, values }
}

describe("RoofShapes", () => {
  it("reads a gable roof, higher in the middle across the building and level along it, and gives the height to the ridge", () => {
    const [house] = RoofShapes.fit([HOUSE], laser((e, n) => inHouse(e, n) ? 6 + 3 * (1 - Math.abs(n) / 4) : undefined), undefined)
    expect(house.roof?.shape).toBe("gable")
    expect(house.roof!.riseM).toBeGreaterThan(1.5)
    expect(house.roof!.riseM).toBeLessThan(3.2)
    expect(house.heightM).toBeGreaterThan(8.2)
  })

  it("reads a hip roof, falling away at both ends as well", () => {
    const [house] = RoofShapes.fit([HOUSE], laser((e, n) => inHouse(e, n) ? 6 + 3 * Math.min(1 - Math.abs(n) / 4, (6 - Math.abs(e)) / 4) : undefined), undefined)
    expect(house.roof?.shape).toBe("hip")
  })

  it("keeps a flat roof a box, and the height the outline gave", () => {
    const [house] = RoofShapes.fit([HOUSE], laser((e, n) => inHouse(e, n) ? 8 : undefined), undefined)
    expect(house.roof).toEqual({ shape: "flat", riseM: 0 })
    expect(house.heightM).toBe(8)
  })

  it("says nothing of a roof it cannot read: one that slopes one way, or that a crown hides", () => {
    const [sloping] = RoofShapes.fit([HOUSE], laser((e, n) => inHouse(e, n) ? 6 + (n + 4) / 8 * 3 : undefined), undefined)
    expect(sloping.roof).toBeUndefined()
    const [hidden] = RoofShapes.fit([HOUSE], laser((e, n) => inHouse(e, n) ? 12 : undefined, inHouse), undefined)
    expect(hidden.roof).toBeUndefined()
    const [unflown] = RoofShapes.fit([HOUSE], laser((e, n) => inHouse(e, n) ? -9999 : undefined), undefined)
    expect(unflown.roof).toBeUndefined()
  })

  it("takes the colour of the photograph under the outline, without the green of what overhangs, lifted a little", () => {
    const [house] = RoofShapes.fit([HOUSE], undefined, photo([150, 80, 60]))
    expect(house.roof).toEqual({ shape: "flat", riseM: 0, color: "#b15e47" })
    // The same roof half under a tree: the green pixels are not the roof.
    const values = photo([150, 80, 60]).values as Uint8Array
    for (let at = 0; at < values.length; at += 6) values.set([40, 120, 40], at)
    const [shaded] = RoofShapes.fit([HOUSE], undefined, { size: SIZE, metresPerPixel: RES, samples: 3, values })
    expect(shaded.roof?.color).toBe("#b15e47")
  })

  it("reads the building where it is, turned by its heading", () => {
    const turned: SurveyedBuilding = { ...HOUSE, eastM: 10, northM: -5, headingDeg: 90 }
    // Heading 90: the depth runs east-west, the width north-south; the ridge runs along the width, so the heights change with east.
    const [house] = RoofShapes.fit([turned], laser((e, n) => Math.abs(e - 10) <= 4 && Math.abs(n + 5) <= 6 ? 6 + 3 * (1 - Math.abs(e - 10) / 4) : undefined), undefined)
    expect(house.roof?.shape).toBe("gable")
  })

  it("leaves the buildings alone with neither a laser nor a photograph", () => {
    expect(RoofShapes.fit([HOUSE], undefined, undefined)).toEqual([HOUSE])
  })
})
