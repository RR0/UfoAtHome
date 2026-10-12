import type { SurveyedTree } from "./SurroundingsProvider.js"

/** What is asked of the canopy to call a crown a tree worth planting. */
export interface CanopyCrownOptions {
  /** Metres per pixel of the grid. */
  metresPerPixel: number
  /** Only what stands higher than this is a tree: a hedge or a bush is not what hides the sky. */
  minHeightM?: number
  /** The trees kept are within this many metres of the centre of the grid. */
  radiusM: number
  /** The height of the observer's eye: a tree only matters where it rises above the line of sight. */
  eyeM?: number
  /** The least angle above the eye line a tree must reach to be kept, in degrees. */
  minElevationDeg?: number
  /** At most this many, the most prominent first: a scene draws every one of them. */
  maxTrees?: number
}

/**
 * The trees in a grid of canopy heights: the crowns, found as the local summits of what stands higher
 * than a bush, and sized by how far each spreads.
 *
 * The grid is the survey's own, pixel by pixel from the north-west, with the height of whatever stands
 * above the ground (a canopy model, not a terrain one); `vegetation` says which pixels are plants. That
 * second grid is not optional: a laser model of the surface reads a house or a tower as readily as an
 * oak, and the summits of a town are not trees.
 */
export class CanopyCrowns {
  /** How far apart two summits must be to be two crowns and not one: the radius a pixel must be the highest within. */
  private static readonly SUMMIT_RADIUS_M = 2.5
  /** How far a crown is looked for around its summit, which caps the width of a tree. */
  private static readonly CROWN_REACH_M = 8
  private static readonly MAX_WIDTH_M = 16
  private static readonly MIN_WIDTH_M = 2

  /** Metres to the nearest decimetre: a laser's own precision is no finer, and a file full of 12.34567 says otherwise. */
  private static tenth(value: number): number {
    return Math.round(value * 10) / 10
  }

  constructor(
    private readonly heights: Float32Array,
    private readonly vegetation: Uint8Array,
    private readonly width: number,
    private readonly height: number
  ) {}

  trees(options: CanopyCrownOptions): SurveyedTree[] {
    const res = options.metresPerPixel
    const minHeight = options.minHeightM ?? 4
    const eye = options.eyeM ?? 1.6
    const minElevation = options.minElevationDeg ?? 2
    const reach = Math.max(1, Math.round(CanopyCrowns.SUMMIT_RADIUS_M / res))
    const spread = Math.round(CanopyCrowns.CROWN_REACH_M / res)
    const centreX = this.width / 2
    const centreY = this.height / 2
    const found: { tree: SurveyedTree, elevation: number }[] = []
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const h = this.canopy(x, y)
        if (h < minHeight) continue
        const east = (x + 0.5 - centreX) * res
        const north = (centreY - y - 0.5) * res
        const distance = Math.hypot(east, north)
        if (distance > options.radiusM) continue
        if (!this.isSummit(x, y, h, reach)) continue
        const elevation = Math.atan2(h - eye, Math.max(distance, 1)) * 180 / Math.PI
        if (elevation < minElevation) continue
        found.push({
          tree: { eastM: CanopyCrowns.tenth(east), northM: CanopyCrowns.tenth(north), heightM: CanopyCrowns.tenth(h), widthM: CanopyCrowns.tenth(this.crownWidth(x, y, h, res, spread)) },
          elevation
        })
      }
    }
    found.sort((a, b) => b.elevation - a.elevation)
    return found.slice(0, options.maxTrees ?? 150).map(entry => entry.tree)
  }

  /** The height of the plant at a pixel; nothing where there is no plant or no pixel. */
  private canopy(x: number, y: number): number {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return 0
    const at = y * this.width + x
    return this.vegetation[at] ? this.heights[at] : 0
  }

  /** Whether nothing within `reach` pixels is higher (and, of two equal tops, only the first in reading order is a summit). */
  private isSummit(x: number, y: number, h: number, reach: number): boolean {
    for (let dy = -reach; dy <= reach; dy++) {
      for (let dx = -reach; dx <= reach; dx++) {
        if (dx === 0 && dy === 0) continue
        const other = this.canopy(x + dx, y + dy)
        if (other > h || (other === h && (dy < 0 || (dy === 0 && dx < 0)))) return false
      }
    }
    return true
  }

  /** The diameter of a disc of the area that stands above half the height of the summit around it. */
  private crownWidth(x: number, y: number, h: number, res: number, spread: number): number {
    let area = 0
    for (let dy = -spread; dy <= spread; dy++) {
      for (let dx = -spread; dx <= spread; dx++) {
        if (Math.hypot(dx, dy) * res <= CanopyCrowns.CROWN_REACH_M && this.canopy(x + dx, y + dy) >= h * 0.5) area++
      }
    }
    const diameter = 2 * Math.sqrt(area * res * res / Math.PI)
    return Math.max(CanopyCrowns.MIN_WIDTH_M, Math.min(diameter, CanopyCrowns.MAX_WIDTH_M))
  }
}
