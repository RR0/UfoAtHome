import { describe, expect, it } from "vitest"
import { imageryTilePlan } from "../../../src/render3d/terrain/providers/xyzImageryRaster.js"
import { metersPerPixel } from "../../../src/render3d/terrain/TileMath.js"

/** Socorro — the patch this was measured on, and a latitude where a tile is neither its widest nor
 * its narrowest. */
const LAT = 34.050918
/** What SceneRenderer builds a patch over: GROUND_RADIUS of 900 m, so 1800 m across. */
const PATCH_SPAN_M = 1800

describe("imageryTilePlan", () => {
  it("gives the ground under a scene about two metres to the texel, where a road is three texels wide", () => {
    // It used to be six, and a road is six metres wide: the ground was a smear in which neither the
    // highway nor the track a car turned off onto could be made out.
    const plan = imageryTilePlan(LAT, PATCH_SPAN_M, 2048)
    expect(plan.mPerPixel).toBeLessThan(2.5)
    expect(metersPerPixel(LAT, plan.zoom)).toBeCloseTo(plan.mPerPixel, 6)
  })

  it("asks for no more tiles than it is fair to ask a free service for", () => {
    for (const span of [200, 900, 1800, 5000, 30000, 60000]) {
      const plan = imageryTilePlan(LAT, span, 2048)
      expect(plan.gridSize).toBeGreaterThanOrEqual(3)
      expect(plan.gridSize).toBeLessThanOrEqual(5)
      expect(plan.gridSize % 2).toBe(1)
    }
  })

  it("covers the whole span from the centre whatever tile the centre falls in", () => {
    // The centre can sit anywhere in its own tile — at its very edge, in the worst case — so it is
    // HALF the grid in whole tiles that has to reach half the span.
    for (const span of [200, 1800, 5000, 30000]) {
      const plan = imageryTilePlan(LAT, span, 2048)
      const reach = ((plan.gridSize - 1) / 2) * plan.mPerPixel * 256
      expect(reach).toBeGreaterThanOrEqual(span / 2)
    }
  })

  it("does not buy a whole zoom level, and four times the fetches, for a few percent of sharpness", () => {
    // A target falling just under a level's own pixel size is answered by that level, not the next.
    const justUnder = metersPerPixel(LAT, 15) * 0.98
    const plan = imageryTilePlan(LAT, PATCH_SPAN_M, PATCH_SPAN_M / justUnder)
    expect(plan.zoom).toBe(15)
  })

  it("does not go finer than the caller will hold", () => {
    const small = imageryTilePlan(LAT, PATCH_SPAN_M, 256)
    const large = imageryTilePlan(LAT, PATCH_SPAN_M, 2048)
    expect(small.zoom).toBeLessThan(large.zoom)
  })
})
