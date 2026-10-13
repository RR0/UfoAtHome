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
})

describe("FacadeGeometry lit windows", () => {
  const tiles = (share: number, seed = 1): number[] => {
    const uv = FacadeGeometry.build(12, 9, 9, true, { share, seed }).getAttribute("uv")
    return Array.from({ length: uv.count }, (_, i) => Math.floor(uv.getX(i) * FacadeTexture.TILES))
  }

  it("lights none by default or with a share of none, and every window with a share of all but never the door", () => {
    expect(tiles(0).some(tile => tile === FacadeTexture.UPPER_LIT || tile === FacadeTexture.GROUND_WINDOW_LIT)).toBe(false)
    const all = tiles(1.01)
    expect(all.some(tile => tile === FacadeTexture.UPPER)).toBe(false)
    expect(all.some(tile => tile === FacadeTexture.UPPER_LIT)).toBe(true)
    expect(all.some(tile => tile === FacadeTexture.GROUND_DOOR)).toBe(true)
  })

  it("lights about the share it is asked to, the same ones every time, and not the same ones for another building", () => {
    const lit = (list: number[]): number => list.filter(tile => tile === FacadeTexture.UPPER_LIT || tile === FacadeTexture.GROUND_WINDOW_LIT).length
    const windows = (list: number[]): number => list.filter(tile => tile !== FacadeTexture.GROUND_DOOR && tile !== FacadeTexture.PLAIN).length
    const list = tiles(0.3)
    expect(lit(list) / windows(list)).toBeGreaterThan(0.15)
    expect(lit(list) / windows(list)).toBeLessThan(0.45)
    expect(tiles(0.3)).toEqual(list)
    expect(tiles(0.3, 99)).not.toEqual(list)
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
    // The lit variants look like the windows by day, and glow where the glass is, only there.
    for (const [lit, unlit] of [[FacadeTexture.UPPER_LIT, FacadeTexture.UPPER], [FacadeTexture.GROUND_WINDOW_LIT, FacadeTexture.GROUND_WINDOW]]) {
      expect(at(lit, 1.2, 1.5)).toBe(at(unlit, 1.2, 1.5))
      expect(at(lit, 0.3, 1.5)).toBe(255)
    }
    const glow = FacadeTexture.glow()
    const glows = (tile: number, x: number, y: number): number => glow[((Math.round(y * size / 3)) * width + tile * size + Math.round(x * size / 3)) * 4]
    expect(glows(FacadeTexture.UPPER_LIT, 1.2, 1.5)).toBe(255)
    expect(glows(FacadeTexture.UPPER_LIT, 0.3, 1.5)).toBe(0)
    expect(glows(FacadeTexture.UPPER, 1.2, 1.5)).toBe(0)
    expect(glows(FacadeTexture.GROUND_DOOR, 1.5, 1)).toBe(0)
  })
})
