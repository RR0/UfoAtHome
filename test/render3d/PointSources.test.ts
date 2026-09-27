import { describe, expect, it } from "vitest"
import { ShaderLib } from "three"
import { PointSources } from "../../src/render3d/PointSources.js"
import { RoundPoints } from "../../src/render3d/RoundPoints.js"

/** The light a point of `size` pixels puts on the pixel grid, centred `dx`,`dy` off a pixel's
 * centre, as the patched shader shares it out — or as the round disc it replaces did. */
function lightOnGrid(size: number, dx: number, dy: number, gaussian: boolean): number {
  const total = Math.max(1, PointSources.COVERAGE * size * size)
  const sigma = Math.max(PointSources.MIN_SIGMA_PX, PointSources.SIGMA_PER_SIZE * size)
  const { core, rim } = RoundPoints.FALLOFF
  let sum = 0
  for (let x = -6; x <= 6; x++) {
    for (let y = -6; y <= 6; y++) {
      const d = Math.hypot(x - dx, y - dy)
      if (gaussian) {
        if (d > PointSources.EDGE_SIGMAS * sigma) continue
        sum += (Math.exp(-0.5 * d * d / (sigma * sigma)) * total) / (2 * Math.PI * sigma * sigma)
      } else {
        // The disc: a size-pixel square, lit where the glare reaches, at the pixel's own light.
        if (Math.abs(x - dx) > size / 2 || Math.abs(y - dy) > size / 2) continue
        const r = d / size
        if (r > rim) continue
        const t = Math.min(Math.max((r - core) / (rim - core), 0), 1)
        sum += 1 - t * t * (3 - 2 * t)
      }
    }
  }
  return sum
}

function swing(size: number, gaussian: boolean): number {
  const sums: number[] = []
  for (let k = 0; k < 20; k++) sums.push(lightOnGrid(size, k / 20, (k * 7 % 20) / 20, gaussian))
  return (Math.max(...sums) - Math.min(...sums)) / Math.max(...sums)
}

describe("PointSources", () => {
  it("puts the same light on the screen wherever a point falls between pixels", () => {
    // What made a moving star or satellite flicker: the round disc of the smallest tier lit one
    // pixel, then two, then four, as it crossed the grid.
    for (const size of [1.2, 2.0, 3.2]) expect(swing(size, true)).toBeLessThan(0.1)
    expect(swing(1.2, false)).toBeGreaterThan(0.5)
  })

  it("hooks into three.js's own points shaders", () => {
    expect(PointSources.patchFragment(ShaderLib.points.fragmentShader)).toContain("vTotal / ( 6.2831853")
    expect(PointSources.patch(ShaderLib.points.vertexShader)).toContain("vRaster = gl_PointSize")
  })
})
