import { describe, expect, it, vi } from "vitest"
import { IgnMntElevationProvider } from "../../../../src/render3d/terrain/providers/IgnMntElevationProvider.js"
import { FirstElevationThatAnswers } from "../../../../src/render3d/terrain/FirstElevationThatAnswers.js"
import type { ElevationProvider } from "../../../../src/render3d/terrain/ElevationProvider.js"
import { TiffFixture } from "../TiffFixture.js"

const SAINT_LO = { south: 49.1, north: 49.11, west: -1.08, east: -1.07 }
const LASER = "IGNF_LIDAR-HD_MNT_ELEVATION.ELEVATIONGRIDCOVERAGE.LAMB93"
const OLDER = "ELEVATION.ELEVATIONGRIDCOVERAGE.HIGHRES"
const NO_DATA = -9999

/** A service that answers each layer with a picture, whatever the size asked, or with a status. */
function serving(byLayer: Record<string, (width: number, height: number) => number[] | number>): { fetchImpl: typeof fetch, urls: string[] } {
  const urls: string[] = []
  const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
    urls.push(String(input))
    const query = new URL(String(input)).searchParams
    const answer = byLayer[query.get("LAYERS") ?? ""]
    if (!answer) return { ok: false, status: 404 } as Response
    const width = Number(query.get("WIDTH"))
    const height = Number(query.get("HEIGHT"))
    const values = answer(width, height)
    if (typeof values === "number") return { ok: false, status: values } as Response
    return { ok: true, status: 200, arrayBuffer: async () => TiffFixture.floats(width, height, values) } as Response
  }) as unknown as typeof fetch
  return { fetchImpl, urls }
}

/** A hillside: the height rises one metre for every column of the picture, row after row from the north. */
const slope = (width: number, height: number): number[] => Array.from({ length: width * height }, (_, i) => 100 + (i % width))

describe("IgnMntElevationProvider", () => {
  it("reads the heights at the vertices of the grid asked for, between pixel centres", async () => {
    const { fetchImpl } = serving({ [LASER]: slope })
    const grid = await new IgnMntElevationProvider({ fetchImpl }).getElevationGrid(SAINT_LO, { width: 5, height: 5 })
    expect(grid.width).toBe(5)
    expect(grid.height).toBe(5)
    // The west edge of the grid is the edge of the first pixel, half a pixel from its centre: the value there cannot be extrapolated, so it is the first pixel's.
    expect(grid.heights[0]).toBeCloseTo(100, 3)
    // Heights grow from west to east and do not change from north to south.
    expect(grid.heights[4]).toBeGreaterThan(grid.heights[0])
    expect(grid.heights[4 * 5]).toBeCloseTo(grid.heights[0], 3)
    expect(grid.heights[2]).toBeCloseTo((grid.heights[0] + grid.heights[4]) / 2, 3)
  })

  it("asks the laser's layer first, latitude first in the box, at about four metres to the pixel", async () => {
    const { fetchImpl, urls } = serving({ [LASER]: slope })
    const wide = { south: 49.0968, north: 49.1134, west: -1.0884, east: -1.0623 }
    await new IgnMntElevationProvider({ fetchImpl }).getElevationGrid(wide, { width: 65, height: 65 })
    const query = new URL(urls[0]).searchParams
    expect(query.get("LAYERS")).toBe(LASER)
    expect(query.get("BBOX")).toBe("49.096800,-1.088400,49.113400,-1.062300")
    // 1850 m at 4 m: 463 pixels, and not a picture a hundred times larger than the mesh it is read into.
    expect(Number(query.get("HEIGHT"))).toBe(Math.ceil(1847.7 / 4))
    expect(Number(query.get("WIDTH"))).toBeLessThanOrEqual(700)
  })

  it("asks the older survey where the laser has not flown", async () => {
    const { fetchImpl, urls } = serving({ [LASER]: (w, h) => new Array(w * h).fill(NO_DATA), [OLDER]: slope })
    const grid = await new IgnMntElevationProvider({ fetchImpl }).getElevationGrid(SAINT_LO, { width: 3, height: 3 })
    expect(urls.map(url => new URL(url).searchParams.get("LAYERS"))).toEqual([LASER, OLDER])
    expect(grid.heights[2]).toBeGreaterThan(grid.heights[0])
  })

  it("says it cannot answer when neither layer covers the place", async () => {
    const empty = (w: number, h: number) => new Array(w * h).fill(NO_DATA)
    const { fetchImpl } = serving({ [LASER]: empty, [OLDER]: empty })
    await expect(new IgnMntElevationProvider({ fetchImpl }).getElevationGrid(SAINT_LO, { width: 3, height: 3 })).rejects.toThrow(/does not cover/)
  })

  it("fills a few vertices over the laser's holes from their neighbours, and never leaves a -9999 in the grid", async () => {
    const { fetchImpl } = serving({
      [LASER]: (w, h) => {
        const values = slope(w, h)
        // A block of the middle of a picture of some hundred pixels, under a few of the 1089 vertices (well under a twentieth of them).
        for (let y = Math.floor(h / 2) - 15; y < Math.floor(h / 2) + 15; y++) {
          for (let x = Math.floor(w / 2) - 15; x < Math.floor(w / 2) + 15; x++) values[y * w + x] = NO_DATA
        }
        return values
      }
    })
    const grid = await new IgnMntElevationProvider({ fetchImpl }).getElevationGrid(SAINT_LO, { width: 33, height: 33 })
    const middle = grid.heights[16 * 33 + 16]
    // Filled from what is round it: between the vertices either side of the hole, which a block of thirty pixels does not reach.
    expect(middle).toBeGreaterThan(grid.heights[16 * 33 + 12])
    expect(middle).toBeLessThan(grid.heights[16 * 33 + 20])
    expect(Math.min(...grid.heights)).toBeGreaterThanOrEqual(100)
  })

  it("does not answer for a place outside France, without asking the service", async () => {
    const { fetchImpl, urls } = serving({ [LASER]: slope })
    const socorro = { south: 34.04, north: 34.06, west: -106.9, east: -106.88 }
    await expect(new IgnMntElevationProvider({ fetchImpl }).getElevationGrid(socorro, { width: 3, height: 3 })).rejects.toThrow(/France/)
    expect(urls).toEqual([])
  })

  it("says it cannot answer when the service does not", async () => {
    const { fetchImpl } = serving({ [LASER]: () => 503, [OLDER]: () => 503 })
    await expect(new IgnMntElevationProvider({ fetchImpl }).getElevationGrid(SAINT_LO, { width: 3, height: 3 })).rejects.toThrow(/503/)
  })
})

describe("FirstElevationThatAnswers", () => {
  const grid = (height: number) => ({ heights: new Float32Array([height]), width: 1, height: 1, bounds: SAINT_LO })
  const answering = (height: number): ElevationProvider => ({ getElevationGrid: async () => grid(height) })
  const failing: ElevationProvider = { getElevationGrid: async () => { throw new Error("no") } }

  it("gives the first source's grid when it answers, without asking the others", async () => {
    const second = vi.fn(async () => grid(2))
    const result = await new FirstElevationThatAnswers(answering(1), { getElevationGrid: second }).getElevationGrid(SAINT_LO, { width: 1, height: 1 })
    expect(result.heights[0]).toBe(1)
    expect(second).not.toHaveBeenCalled()
  })

  it("falls back to the next source when one fails", async () => {
    const result = await new FirstElevationThatAnswers(failing, answering(2)).getElevationGrid(SAINT_LO, { width: 1, height: 1 })
    expect(result.heights[0]).toBe(2)
  })

  it("fails with the last error when none answers", async () => {
    await expect(new FirstElevationThatAnswers(failing, failing).getElevationGrid(SAINT_LO, { width: 1, height: 1 })).rejects.toThrow("no")
  })
})
