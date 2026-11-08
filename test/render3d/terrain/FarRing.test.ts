import { describe, expect, it } from "vitest"
import { ElevationGaps } from "../../../src/render3d/terrain/TerrainMeshBuilder.js"
import { TerrainReach } from "../../../src/render3d/terrain/TerrainReach.js"

describe("The far ring of ground", () => {
  it("is built where the eye overlooks lower ground, or a beam goes past the patch, and not on a plain", () => {
    expect(TerrainReach.needsFarRing(900, 2, 0)).toBe(false)
    // The terrace of Meudon, a hundred metres over the Seine.
    expect(TerrainReach.needsFarRing(900, 40, 0)).toBe(true)
    // A beam shot 8.5 km across.
    expect(TerrainReach.needsFarRing(900, 0, 8500)).toBe(true)
    // A patch already as wide as anyone sees needs none.
    expect(TerrainReach.needsFarRing(30000, 200, 8500)).toBe(false)
  })
})

describe("ElevationGaps", () => {
  it("fills the postings a source had no ground for from those round them, from the edge of the gap in", () => {
    const heights = new Float32Array([
      10, 10, 10,
      10, -9999, 10,
      10, 10, Number.NaN
    ])
    ElevationGaps.fill(heights, 3)
    expect([...heights]).toEqual([10, 10, 10, 10, 10, 10, 10, 10, 10])
  })

  it("takes as no ground what is lower than any dry ground, which is what a service makes of its no-data when it shrinks a picture", () => {
    const heights = new Float32Array([50, 50, -620, 50])
    ElevationGaps.fill(heights, 2)
    expect(heights[2]).toBe(50)
  })

  it("leaves the sea's level where there is no ground at all", () => {
    const heights = new Float32Array([-9999, -9999, -9999, -9999])
    ElevationGaps.fill(heights, 2)
    expect([...heights]).toEqual([0, 0, 0, 0])
  })
})

describe("the patch round someone flying", () => {
  it("is the whole reach of someone on the ground", () => {
    expect(TerrainReach.patchRadiusFor(4500, 1.6)).toBe(4500)
    expect(TerrainReach.patchRadiusFor(30000, 100)).toBe(30000)
  })

  it("is what they can read from up there, the far ring carrying the rest", () => {
    const radius = TerrainReach.patchRadiusFor(30000, 3000)
    expect(radius).toBe(12000)
    expect(TerrainReach.needsFarRing(radius, 3000, 0)).toBe(true)
  })

  it("never asks for a network from an aircraft, and never goes past the reach", () => {
    expect(TerrainReach.patchRadiusFor(30000, 500)).toBeGreaterThan(TerrainReach.ROADS_MAX_RADIUS_M)
    expect(TerrainReach.patchRadiusFor(30000, 11700)).toBe(30000)
  })
})
