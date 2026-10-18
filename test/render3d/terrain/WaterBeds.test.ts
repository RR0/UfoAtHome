import { describe, expect, it } from "vitest"
import { WaterBeds } from "../../../src/render3d/terrain/WaterBeds.js"
import type { ElevationGrid } from "../../../src/render3d/terrain/ElevationProvider.js"

/** A grid of 11 × 11 vertices over a degree-square box, heights by (row, col). */
function grid(height: (row: number, col: number) => number): ElevationGrid {
  const heights = new Float32Array(121)
  for (let row = 0; row < 11; row++) for (let col = 0; col < 11; col++) heights[row * 11 + col] = height(row, col)
  return { heights, width: 11, height: 11, bounds: { north: 10, south: 0, west: 0, east: 10 } }
}

/** A ring of (row, col) corners as places on that grid: row 0 is the north edge, latitude 10. */
const ring = (...corners: [number, number][]) => corners.map(([row, col]) => ({ lat: 10 - row, lng: col }))

describe("WaterBeds", () => {
  it("presses the ground inside a river down to its water, read where the bed is wide, and leaves the banks and the islands", () => {
    // A river between rows 2.5 and 7.5: its middle at 27, the vertices next to the banks smoothed up to 31.
    const ground = grid((row) => row < 3 || row > 7 ? 36 : row === 3 || row === 7 ? 31 : 27)
    const lowered = WaterBeds.flatten(ground, [{ id: "seine", rings: [ring([2.5, -1], [2.5, 11], [7.5, 11], [7.5, -1]), ring([4.5, 4.5], [4.5, 5.5], [5.5, 5.5], [5.5, 4.5])] }])
    expect(lowered).toBe(22)
    expect(ground.heights[3 * 11 + 2]).toBe(27)
    expect(ground.heights[7 * 11 + 9]).toBe(27)
    expect(ground.heights[2 * 11 + 2]).toBe(36)
    expect(ground.heights[8 * 11 + 2]).toBe(36)
  })

  it("keeps the islands out by the even-odd rule", () => {
    const ground = grid(() => 30)
    const inside = WaterBeds.fill(ground, { id: "lake", rings: [ring([0.5, 0.5], [0.5, 9.5], [9.5, 9.5], [9.5, 0.5]), ring([3.5, 3.5], [3.5, 6.5], [6.5, 6.5], [6.5, 3.5])] })
    expect(inside).toHaveLength(81 - 9)
    expect(inside).not.toContain(5 * 11 + 5)
  })

  it("leaves the ground under the observer's road: a deck they drive over is not the river under it", () => {
    const ground = grid((row) => row === 5 ? 27 : 36)
    const river = { id: "river", rings: [ring([2.5, -1], [2.5, 11], [7.5, 11], [7.5, -1])] }
    // A road crossing the river north to south at column 5; the grid's cells are a degree, so the clearance is a fraction of one.
    WaterBeds.flatten(ground, [river], [{ lat: 10, lng: 5 }, { lat: 0, lng: 5 }])
    expect(ground.heights[4 * 11 + 5]).toBe(36)
    expect(ground.heights[4 * 11 + 4]).toBe(27)
  })
})
