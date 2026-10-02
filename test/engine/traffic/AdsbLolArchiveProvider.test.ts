import { describe, expect, test } from "vitest"
import { AdsbLolArchiveProvider } from "../../../src/engine/traffic/providers/AdsbLolArchiveProvider.js"

describe("AdsbLolArchiveProvider.tilesAround", () => {
  test("a place in the middle of a tile reaches its neighbours at 150 km", () => {
    const keys = AdsbLolArchiveProvider.tilesAround({ lat: 48.5, lng: 2.5, heightM: 0 }, 150)
    for (const key of ["48_2", "47_2", "49_2", "48_1", "48_3", "47_1", "49_3"]) expect(keys).toContain(key)
    expect(keys).not.toContain("45_2")
    expect(keys).toHaveLength(new Set(keys).size)
  })

  test("near the antimeridian the tiles wrap to the other side", () => {
    const keys = AdsbLolArchiveProvider.tilesAround({ lat: 0.5, lng: 179.95, heightM: 0 }, 150)
    expect(keys).toContain("0_179")
    expect(keys).toContain("0_-180")
    expect(keys.some(key => key.endsWith("_180"))).toBe(false)
  })

  test("at the pole there is no tile past it, and every meridian is near", () => {
    const keys = AdsbLolArchiveProvider.tilesAround({ lat: 89.9, lng: 10, heightM: 0 }, 150)
    expect(keys.every(key => Number(key.split("_")[0]) <= 89)).toBe(true)
    expect(keys.filter(key => key.startsWith("89_"))).toHaveLength(360)
  })
})
