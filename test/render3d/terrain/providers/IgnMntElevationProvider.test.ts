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
    // The picture reaches past the square by the window of a vertex, so the west edge of the grid stands inside it, at a column further than the first.
    expect(grid.heights[0]).toBeGreaterThan(100)
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
    const [south, west, north, east] = (query.get("BBOX") ?? "").split(",").map(Number)
    // The square, and a margin round it of the width of a cell of the mesh (28 m, the window a vertex is averaged over): never less than the square.
    expect(south).toBeLessThan(49.0968)
    expect(south).toBeGreaterThan(49.0968 - 0.0005)
    expect(north).toBeGreaterThan(49.1134)
    expect(west).toBeLessThan(-1.0884)
    expect(east).toBeGreaterThan(-1.0623)
    // About 1900 m at four metres a pixel, and not a picture a hundred times larger than the mesh it is read into.
    expect(Number(query.get("HEIGHT"))).toBeGreaterThan(440)
    expect(Number(query.get("HEIGHT"))).toBeLessThan(500)
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

describe("IgnMntElevationProvider and the size of the grid", () => {
  const MESH = { south: 49.0968, north: 49.1134, west: -1.0884, east: -1.0623 }

  it("answers a mesh with a vertex about every seven metres, the odd count the scene needs", async () => {
    const { fetchImpl } = serving({ [LASER]: slope })
    const grid = await new IgnMntElevationProvider({ fetchImpl }).getElevationGrid(MESH, { width: 65, height: 65 })
    // 1.85 km by 1.9 km at seven metres is more than 256 segments: the most, 257 vertices.
    expect(grid.width).toBe(257)
    expect(grid.height).toBe(257)
    expect(grid.heights.length).toBe(257 * 257)
  })

  it("is no finer than the square needs, and never coarser than asked", async () => {
    const { fetchImpl } = serving({ [LASER]: slope })
    const small = { south: 49.1, north: 49.1009, west: -1.08, east: -1.0788 } // ~100 m
    const grid = await new IgnMntElevationProvider({ fetchImpl }).getElevationGrid(small, { width: 65, height: 65 })
    expect(grid.width).toBe(65)
  })

  it("answers a point or two as asked, with no finer grid than it was asked for", async () => {
    const { fetchImpl } = serving({ [LASER]: slope })
    const grid = await new IgnMntElevationProvider({ fetchImpl }).getElevationGrid(MESH, { width: 2, height: 2 })
    expect(grid.width).toBe(2)
  })
})

describe("IgnMntElevationProvider and the bridges", () => {
  const CLASS = "IGNF_LIDAR-HD_CLASS"
  const SURFACE = "IGNF_LIDAR-HD_MNS_ELEVATION.ELEVATIONGRIDCOVERAGE.LAMB93"
  const GROUND = 100
  const DECK = 108
  /** The square the tests ask for: a hundred metres or so wide, with a deck across the middle of it. */
  const SQUARE = { south: 49.1, north: 49.1009, west: 2.75, east: 2.7512 }
  const MIDDLE = { lat: (SQUARE.south + SQUARE.north) / 2, lng: (SQUARE.west + SQUARE.east) / 2 }
  const METRES_PER_DEGREE = 111320
  const at = (eastM: number, northM: number) => ({ lat: MIDDLE.lat + northM / METRES_PER_DEGREE, lng: MIDDLE.lng + eastM / (METRES_PER_DEGREE * Math.cos(MIDDLE.lat * Math.PI / 180)) })
  /** A road section carried over the ground, east to west across the middle: the road ON the deck. */
  const CARRIED = [at(-150, 0), at(150, 0)]
  /** The road the deck crosses, north to south: the road UNDER it. */
  const BENEATH = [at(0, -150), at(0, 150)]

  /**
   * A service with a flat ground, a surface of the deck's height, a classification that says "deck" in a band across the picture, and a map that says one
   * road section is carried over the ground.
   */
  function serveWithDeck(options: { withClasses?: boolean, carried?: { lat: number, lng: number }[][] } = {}): { fetchImpl: typeof fetch, urls: string[] } {
    const urls: string[] = []
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      urls.push(String(input))
      const url = new URL(String(input))
      if (url.pathname.includes("wfs")) {
        const features = (options.carried ?? [CARRIED]).map(line => ({ geometry: { type: "LineString", coordinates: line.map(p => [p.lng, p.lat]) }, properties: {} }))
        return { ok: true, status: 200, json: async () => ({ features }) } as Response
      }
      const query = url.searchParams
      const layer = query.get("LAYERS")
      const width = Number(query.get("WIDTH"))
      const height = Number(query.get("HEIGHT"))
      const body = (buffer: ArrayBuffer) => ({ ok: true, status: 200, arrayBuffer: async () => buffer }) as Response
      const band = (x: number) => Math.abs(x - width / 2) < width / 10
      if (layer === LASER) return body(TiffFixture.floats(width, height, Array.from({ length: width * height }, () => GROUND)))
      if (layer === SURFACE) return body(TiffFixture.floats(width, height, Array.from({ length: width * height }, () => DECK)))
      if (layer === CLASS && (options.withClasses ?? true)) {
        const values: number[] = []
        for (let i = 0; i < width * height; i++) values.push(...(band(i % width) ? [240, 240, 0, 255] : [207, 150, 70, 255]))
        return body(TiffFixture.bytes(width, height, 4, values))
      }
      return { ok: false, status: 404 } as Response
    }) as unknown as typeof fetch
    return { fetchImpl, urls }
  }

  /** The grid asked for with no averaging, so a vertex is the picture's own value there. */
  const gridOf = (fetchImpl: typeof fetch, route?: { lat: number, lng: number }[]) =>
    new IgnMntElevationProvider({ fetchImpl, maxWindowM: 0 }).getElevationGrid(SQUARE, { width: 101, height: 3 }, route ? { route } : undefined)

  it("raises the ground to the deck for an observer who drives on it, and nowhere else", async () => {
    // The route goes east to west along the carried road, which is what the deck is: the deck is the ground.
    const grid = await gridOf(serveWithDeck().fetchImpl, [at(-100, 1), at(100, 1)])
    expect(grid.heights[50]).toBeCloseTo(DECK, 3)
    expect(grid.heights[0]).toBeCloseTo(GROUND, 3)
    expect(grid.heights[100]).toBeCloseTo(GROUND, 3)
  })

  it("leaves the bare earth for an observer who drives under it: across the carried road, the deck is a roof", async () => {
    const { fetchImpl, urls } = serveWithDeck()
    const grid = await gridOf(fetchImpl, BENEATH)
    expect(Math.max(...grid.heights)).toBeCloseTo(GROUND, 3)
    // Nothing more was asked than the map: neither the classification nor the surface, for a deck that is not laid.
    expect(urls.some(url => url.includes("CLASS") || url.includes("MNS"))).toBe(false)
  })

  it("lays no deck for an observer with no route: he stands where he is, and the bare earth is the ground", async () => {
    const { fetchImpl, urls } = serveWithDeck()
    const grid = await gridOf(fetchImpl)
    expect(Math.max(...grid.heights)).toBeCloseTo(GROUND, 3)
    expect(urls.some(url => url.includes("wfs"))).toBe(false)
  })

  it("keeps the bare earth when the classification cannot be had, and asks for the surface only when there is a deck", async () => {
    const { fetchImpl, urls } = serveWithDeck({ withClasses: false })
    const grid = await gridOf(fetchImpl, [at(-100, 1), at(100, 1)])
    expect(Math.max(...grid.heights)).toBeCloseTo(GROUND, 3)
    expect(urls.some(url => url.includes("MNS"))).toBe(false)
  })

  it("keeps the bare earth when the map does not answer", async () => {
    const { fetchImpl } = serveWithDeck()
    const failing = vi.fn(async (input: RequestInfo | URL) => String(input).includes("wfs") ? ({ ok: false, status: 503 }) as Response : fetchImpl(input)) as unknown as typeof fetch
    const grid = await gridOf(failing, [at(-100, 1), at(100, 1)])
    expect(Math.max(...grid.heights)).toBeCloseTo(GROUND, 3)
  })
})

describe("IgnMntElevationProvider and the vertices of a mesh", () => {
  it("does not let a narrow feature through or not by where the grid falls: a ridge a pixel wide is averaged over the cell", async () => {
    // A one-pixel-wide ridge, 10 m high, in every fourth column: a vertex at it alone reads 110, one between reads 100.
    const ridge = (width: number, height: number): number[] => Array.from({ length: width * height }, (_, i) => (i % width) % 4 === 0 ? 110 : 100)
    const { fetchImpl } = serving({ [LASER]: ridge })
    const point = await new IgnMntElevationProvider({ fetchImpl, maxWindowM: 0 }).getElevationGrid(SAINT_LO, { width: 9, height: 3 })
    const smooth = await new IgnMntElevationProvider({ fetchImpl }).getElevationGrid(SAINT_LO, { width: 9, height: 3 })
    const spread = (heights: Float32Array) => Math.max(...heights) - Math.min(...heights)
    expect(spread(point.heights)).toBeGreaterThan(5)
    expect(spread(smooth.heights)).toBeLessThan(spread(point.heights) / 2)
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
