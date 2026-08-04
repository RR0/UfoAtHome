import { describe, expect, it } from "vitest"
import { chooseZoomForTileEdge, lngLatToTile, metersPerPixel, tileBounds, tileGridAround } from "../../../src/render3d/terrain/TileMath.js"

describe("metersPerPixel", () => {
  it("matches the standard Web Mercator constant at the equator, zoom 0", () => {
    expect(metersPerPixel(0, 0)).toBeCloseTo(156543.03392, 3)
  })

  it("halves each time zoom increases by one", () => {
    expect(metersPerPixel(0, 5)).toBeCloseTo(metersPerPixel(0, 4) / 2, 6)
  })

  it("shrinks toward the poles (cos(lat) factor)", () => {
    expect(metersPerPixel(60, 10)).toBeLessThan(metersPerPixel(0, 10))
  })
})

describe("chooseZoomForTileEdge", () => {
  it("returns the finest zoom whose tile edge is still >= the target", () => {
    const z = 12
    const edgeAtZ = metersPerPixel(0, z) * 256
    // Just under edgeAtZ so it can't be satisfied by z+1 (whose edge is edgeAtZ/2), but still
    // satisfied by z itself.
    expect(chooseZoomForTileEdge(0, edgeAtZ * 0.99)).toBe(z)
  })

  it("picks a coarser (smaller) zoom for a larger target coverage", () => {
    expect(chooseZoomForTileEdge(43.837, 2000)).toBeLessThan(chooseZoomForTileEdge(43.837, 200))
  })
})

describe("lngLatToTile / tileBounds", () => {
  it("the whole world is one tile at zoom 0", () => {
    expect(lngLatToTile(5.993, 43.837, 0)).toEqual({ x: 0, y: 0, z: 0 })
  })

  it("a tile's own bounds contain the point used to look it up", () => {
    const lng = 5.993
    const lat = 43.837
    const z = 14
    const tile = lngLatToTile(lng, lat, z)
    const bounds = tileBounds(tile)
    expect(lat).toBeGreaterThanOrEqual(bounds.south)
    expect(lat).toBeLessThanOrEqual(bounds.north)
    expect(lng).toBeGreaterThanOrEqual(bounds.west)
    expect(lng).toBeLessThanOrEqual(bounds.east)
  })
})

describe("tileGridAround", () => {
  it("returns gridSize x gridSize contiguous tiles centered on the point's own tile", () => {
    const { tiles } = tileGridAround(5.993, 43.837, 14, 3)
    expect(tiles).toHaveLength(9)
    const center = lngLatToTile(5.993, 43.837, 14)
    const xs = tiles.map(t => t.x)
    const ys = tiles.map(t => t.y)
    expect(Math.min(...xs)).toBe(center.x - 1)
    expect(Math.max(...xs)).toBe(center.x + 1)
    expect(Math.min(...ys)).toBe(center.y - 1)
    expect(Math.max(...ys)).toBe(center.y + 1)
  })

  it("combined bounds contain the center point", () => {
    const { bounds } = tileGridAround(5.993, 43.837, 14, 3)
    expect(43.837).toBeGreaterThanOrEqual(bounds.south)
    expect(43.837).toBeLessThanOrEqual(bounds.north)
    expect(5.993).toBeGreaterThanOrEqual(bounds.west)
    expect(5.993).toBeLessThanOrEqual(bounds.east)
  })
})
