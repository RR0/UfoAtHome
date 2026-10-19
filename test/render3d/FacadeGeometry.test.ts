import { describe, expect, it } from "vitest"
import { FacadeGeometry } from "../../src/render3d/FacadeGeometry.js"
import { FacadeTexture } from "../../src/render3d/FacadeTexture.js"

describe("FacadeGeometry", () => {
  it("is the size of the building, from the ground to the walls' height", () => {
    const geometry = FacadeGeometry.build(12, 8, 9)
    geometry.computeBoundingBox()
    const box = geometry.boundingBox!
    expect([box.max.x - box.min.x, box.max.y - box.min.y, box.max.z - box.min.z].map(v => Math.round(v * 100) / 100)).toEqual([12, 9, 8])
    expect(box.min.y).toBe(0)
  })

  it("faces outward on every side, and up on the top", () => {
    const geometry = FacadeGeometry.build(12, 8, 6)
    const position = geometry.getAttribute("position")
    const normal = geometry.getAttribute("normal")
    for (let i = 0; i < position.count; i++) {
      const outward = [Math.abs(position.getX(i)) > 5.99 ? Math.sign(position.getX(i)) : 0, position.getY(i) > 5.99 ? 1 : 0, Math.abs(position.getZ(i)) > 3.99 ? Math.sign(position.getZ(i)) : 0]
      // A vertex on a face is facing the way of the coordinate that puts it on the face (a corner is on two): never against any of them.
      const dot = outward[0] * normal.getX(i) + outward[1] * normal.getY(i) + outward[2] * normal.getZ(i)
      expect(dot).toBeGreaterThan(-1e-6)
    }
  })

  it("puts the door on the ground floor of the front face only, windows elsewhere", () => {
    const geometry = FacadeGeometry.build(9, 9, 6)
    const position = geometry.getAttribute("position")
    const uv = geometry.getAttribute("uv")
    const tileOf = (i: number): number => Math.floor(uv.getX(i) * FacadeTexture.TILES)
    const doors = new Set<string>()
    for (let i = 0; i < position.count; i++) {
      if (tileOf(i) === FacadeTexture.GROUND_DOOR) doors.add(`${position.getZ(i)}:${position.getY(i) < 3.01 ? "ground" : "up"}`)
    }
    expect([...doors].every(key => key.startsWith("-4.5:") && key.endsWith("ground"))).toBe(true)
    expect(doors.size).toBeGreaterThan(0)
  })

  it("has as many floors as the walls hold, about three metres each, and a window on each", () => {
    const geometry = FacadeGeometry.build(3, 3, 9)
    const uv = geometry.getAttribute("uv")
    let upper = 0
    for (let i = 0; i < uv.count; i++) if (Math.floor(uv.getX(i) * FacadeTexture.TILES) === FacadeTexture.UPPER) upper++
    // Two upper floors, four faces, one bay each, six vertices a bay.
    expect(upper).toBe(2 * 4 * 6)
  })

  it("is a plain wall when the openings are left out", () => {
    const uv = FacadeGeometry.build(9, 9, 6, false).getAttribute("uv")
    for (let i = 0; i < uv.count; i++) expect(Math.floor(uv.getX(i) * FacadeTexture.TILES)).toBe(FacadeTexture.PLAIN)
  })

  /** The tiles of the walls (the top left out), one a bay, and how many storeys high the walls are cut. */
  const bays = (geometry: ReturnType<typeof FacadeGeometry.build>): { tiles: number[], levels: number } => {
    const uv = geometry.getAttribute("uv")
    const position = geometry.getAttribute("position")
    const tiles: number[] = []
    const floors = new Set<number>()
    for (let i = 0; i + 6 <= uv.count - 6; i += 6) {
      tiles.push(Math.floor(uv.getX(i) * FacadeTexture.TILES))
      floors.add(Math.round(position.getY(i) * 100))
    }
    return { tiles, levels: floors.size }
  }

  it("cuts an old building's walls into the storeys it states, each bay a tall window, the door on the front", () => {
    const { tiles, levels } = bays(FacadeGeometry.build(15, 12, 17.2, true, 0, "tall", 17.2 / 7))
    expect(levels).toBe(7)
    expect(tiles.filter(tile => tile === FacadeTexture.GROUND_DOOR)).toHaveLength(1)
    expect(tiles.filter(tile => tile !== FacadeTexture.GROUND_DOOR).every(tile => tile === FacadeTexture.TALL)).toBe(true)
  })

  it("draws a church's walls with tall narrow bays six metres apart in every other tier of about ten from the top, no door and nothing lit", () => {
    const geometry = FacadeGeometry.build(90, 14, 35, true, 0, "lancet")
    const { tiles, levels } = bays(geometry)
    expect(levels).toBe(4)
    expect(tiles.every(tile => tile === FacadeTexture.LANCET || tile === FacadeTexture.PLAIN)).toBe(true)
    // Two long sides of fifteen bays and two short ones of two, on each of four tiers: the top one and the second below it opened.
    expect(tiles).toHaveLength(4 * (2 * 15 + 2 * 2))
    expect(tiles.filter(tile => tile === FacadeTexture.LANCET)).toHaveLength(2 * (2 * 15 + 2 * 2))
    // An aisle, one tier high, is opened.
    expect(bays(FacadeGeometry.build(40, 14, 12, true, 0, "lancet")).tiles.every(tile => tile === FacadeTexture.LANCET)).toBe(true)
    const rank = geometry.getAttribute("litRank")
    for (let i = 0; i < rank.count; i++) expect(rank.getX(i)).toBeGreaterThan(1)
  })
})

describe("FacadeGeometry window ranks", () => {
  const ranks = (seed = 1): { rank: number[], tile: number[] } => {
    const geometry = FacadeGeometry.build(12, 9, 9, true, seed)
    const rank = geometry.getAttribute("litRank")
    const uv = geometry.getAttribute("uv")
    return { rank: Array.from({ length: rank.count }, (_, i) => rank.getX(i)), tile: Array.from({ length: uv.count }, (_, i) => Math.floor(uv.getX(i) * FacadeTexture.TILES)) }
  }

  it("ranks every window under one, and never a door or the top, which no share of lit windows reaches", () => {
    const { rank, tile } = ranks()
    rank.forEach((value, i) => {
      const isWindow = tile[i] === FacadeTexture.UPPER || tile[i] === FacadeTexture.GROUND_WINDOW
      if (isWindow) expect(value).toBeLessThan(1)
      else expect(value).toBeGreaterThan(1)
    })
  })

  it("gives the six vertices of a bay the same rank, and the bays of a building different ones, the same every time and not the same for another building", () => {
    const first = ranks()
    for (let i = 0; i < first.rank.length - 6; i += 6) if (first.tile[i] === FacadeTexture.UPPER) for (let k = 1; k < 6; k++) expect(first.rank[i + k]).toBe(first.rank[i])
    const windows = first.rank.filter((_, i) => first.tile[i] === FacadeTexture.UPPER)
    expect(new Set(windows).size).toBeGreaterThan(5)
    expect(ranks()).toEqual(first)
    expect(ranks(99).rank).not.toEqual(first.rank)
  })

  it("lights about the share it is asked to, taken as the windows ranked under it", () => {
    const { rank, tile } = ranks(7)
    const windows = rank.filter((_, i) => tile[i] === FacadeTexture.UPPER || tile[i] === FacadeTexture.GROUND_WINDOW)
    const share = (limit: number): number => windows.filter(value => value < limit).length / windows.length
    expect(share(0.3)).toBeGreaterThan(0.12)
    expect(share(0.3)).toBeLessThan(0.5)
    // A window lit at a small share is still lit at a bigger one.
    expect(windows.filter(value => value < 0.1).every(value => value < 0.5)).toBe(true)
  })
})

describe("FacadeTexture", () => {
  it("is four pale tiles with dark windows and a dark door, made once", () => {
    const pixels = FacadeTexture.pixels()
    const size = 96
    const width = size * FacadeTexture.TILES
    const at = (tile: number, metresX: number, metresY: number): number => pixels[((Math.round(metresY * size / 3)) * width + tile * size + Math.round(metresX * size / 3)) * 4]
    expect(at(FacadeTexture.UPPER, 0.3, 1.5)).toBe(255)
    expect(at(FacadeTexture.UPPER, 1.2, 1.5)).toBeLessThan(80)
    expect(at(FacadeTexture.GROUND_DOOR, 1.5, 1)).toBeLessThan(80)
    expect(at(FacadeTexture.GROUND_WINDOW, 1.2, 1.5)).toBeLessThan(80)
    expect(at(FacadeTexture.PLAIN, 1.5, 1.5)).toBe(255)
    expect(FacadeTexture.texture()).toBe(FacadeTexture.texture())
    // The glass of a window glows where it is glass, and nowhere else.
    const glow = FacadeTexture.glow()
    const glows = (tile: number, x: number, y: number): number => glow[((Math.round(y * size / 3)) * width + tile * size + Math.round(x * size / 3)) * 4]
    expect(glows(FacadeTexture.UPPER, 1.2, 1.5)).toBeGreaterThan(150)
    expect(glows(FacadeTexture.GROUND_WINDOW, 1.2, 1.5)).toBeGreaterThan(150)
    // A room and not a flat rectangle: its ceiling brighter than the sill, the curtains on each side dimmer than the middle.
    expect(glows(FacadeTexture.UPPER, 1.2, 2.25)).toBeGreaterThan(glows(FacadeTexture.UPPER, 1.2, 0.95))
    expect(glows(FacadeTexture.UPPER, 0.95, 1.8)).toBeLessThan(glows(FacadeTexture.UPPER, 1.2, 1.8))
    expect(glows(FacadeTexture.UPPER, 0.3, 1.5)).toBe(0)
    expect(glows(FacadeTexture.UPPER, 1.5, 1.5)).toBe(0)
    expect(glows(FacadeTexture.GROUND_DOOR, 1.5, 1)).toBe(0)
  })
})
