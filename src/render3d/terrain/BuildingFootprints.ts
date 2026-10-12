import type { SurveyedBuilding } from "./SurroundingsProvider.js"

/** What is asked of a patch of roof to call it a building worth drawing. */
export interface BuildingFootprintOptions {
  /** Metres per pixel of the grid. */
  metresPerPixel: number
  /** The buildings kept are within this many metres of the centre of the grid. */
  radiusM: number
  /** Smaller than this and it is a shed, a bin or a mistake, not what hides the sky or stands in a witness's way. */
  minAreaM2?: number
  /** At most this many, the nearest first: a scene draws every one of them. */
  maxBuildings?: number
}

/** A rectangle in the frame of a patch: its extent along each of the two axes, and where it is. */
interface Rectangle {
  minU: number
  maxU: number
  minV: number
  maxV: number
}

/**
 * The buildings in a grid of heights and a grid of what each pixel is: each patch of roof, as the rectangles that hold
 * it, with the height of the roof.
 *
 * The patch is found by the classification and not by the height: a laser model of the surface gives 291 m at the Eiffel
 * Tower and a few metres for an oak, and only the classification tells a roof from a crown. Three things then turn
 * patches into buildings, because a town is not a scatter of detached houses:
 *
 * - Neighbours join only where their roofs meet at the same height (see STEP_M): houses that touch are one patch of
 *   roof for the classification, and two buildings for whoever walked past them.
 * - A patch that is a rectangle is one building, the smallest rectangle that holds it among those lying along each side of
 *   its convex hull, which is how a house comes out square to its walls whatever way it is turned.
 * - A patch that is not (an L, a courtyard, a row that bends) is taken apart into the largest rectangles it contains, one after
 *   the other, until what is left is too small to be a building.
 */
export class BuildingFootprints {
  /** A roof is not flat and carries chimneys: its height is the one 90% of it stays under, not the highest pixel. */
  private static readonly ROOF_PERCENTILE = 0.9
  /** The most two adjacent pixels of one roof differ by, in metres: a steep pitch is half a metre a half-metre pixel; an eave above a neighbour's is more. */
  private static readonly STEP_M = 0.9
  /** How much of its smallest rectangle a patch fills for it to be called a rectangle. */
  private static readonly RECTANGLE_FILL = 0.72
  /** A patch is taken apart into this many rectangles at most. */
  private static readonly MAX_PARTS = 24
  /** The most cells a patch is drawn on when it is taken apart: a whole town block is not worth more. */
  private static readonly MAX_CELLS = 640

  constructor(
    private readonly heights: Float32Array,
    /** Non-zero where the pixel is part of a building. */
    private readonly building: Uint8Array,
    private readonly width: number,
    private readonly height: number
  ) {}

  buildings(options: BuildingFootprintOptions): SurveyedBuilding[] {
    const res = options.metresPerPixel
    const minArea = options.minAreaM2 ?? 12
    const seen = new Uint8Array(this.width * this.height)
    const found: SurveyedBuilding[] = []
    for (let start = 0; start < this.building.length; start++) {
      if (!this.building[start] || seen[start]) continue
      const patch = this.patchFrom(start, seen)
      if (patch.length * res * res < minArea) continue
      for (const building of this.buildingsOf(patch, res, minArea)) {
        if (Math.hypot(building.eastM, building.northM) <= options.radiusM) found.push(building)
      }
    }
    found.sort((a, b) => Math.hypot(a.eastM, a.northM) - Math.hypot(b.eastM, b.northM))
    return found.slice(0, options.maxBuildings ?? 60)
  }

  /** The pixels joined to this one by a side, over a step no higher than a roof's own, as indices. */
  private patchFrom(start: number, seen: Uint8Array): number[] {
    const patch: number[] = []
    const stack = [start]
    seen[start] = 1
    while (stack.length > 0) {
      const at = stack.pop()!
      patch.push(at)
      const x = at % this.width
      const y = Math.floor(at / this.width)
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx
        const ny = y + dy
        if (nx < 0 || ny < 0 || nx >= this.width || ny >= this.height) continue
        const next = ny * this.width + nx
        if (this.building[next] && !seen[next] && Math.abs(this.heights[next] - this.heights[at]) <= BuildingFootprints.STEP_M) {
          seen[next] = 1
          stack.push(next)
        }
      }
    }
    return patch
  }

  private buildingsOf(patch: number[], res: number, minArea: number): SurveyedBuilding[] {
    // The pixels as points, in metres east and north of the centre of the grid, with their height.
    const centreX = this.width / 2
    const centreY = this.height / 2
    const xs: number[] = []
    const ys: number[] = []
    const hs: number[] = []
    for (const at of patch) {
      const x = at % this.width
      const y = Math.floor(at / this.width)
      xs.push((x + 0.5 - centreX) * res)
      ys.push((centreY - y - 0.5) * res)
      hs.push(this.heights[at])
    }
    return BuildingFootprints.ofPoints(xs, ys, hs, res, minArea)
  }

  /**
   * The buildings in a patch of roof given as points `res` metres apart (each one the middle of a cell of that side), with the height
   * of the roof at each: one rectangle if the patch is one, else the rectangles it is made of. The part of a survey of buildings that
   * does not depend on how the survey drew them, laser pixels or the outlines of a map (see TopoBuildings). `rectangleFill` is how much of its
   * smallest rectangle a patch must fill to be called a rectangle: a laser's pixels along a turned roof are staircases, which a map's outline is not.
   */
  static ofPoints(xs: number[], ys: number[], hs: number[], res: number, minArea: number, rectangleFill = BuildingFootprints.RECTANGLE_FILL): SurveyedBuilding[] {
    const corners: [number, number][] = []
    for (let i = 0; i < xs.length; i++) {
      for (const [dx, dy] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) corners.push([xs[i] + dx * res, ys[i] + dy * res])
    }
    const hull = BuildingFootprints.hull(corners)
    const { angle, rectangle } = BuildingFootprints.smallestRectangle(hull)
    const area = xs.length * res * res
    const rectangleArea = (rectangle.maxU - rectangle.minU) * (rectangle.maxV - rectangle.minV)
    if (area / rectangleArea >= rectangleFill || area < 4 * minArea) {
      return [BuildingFootprints.building(rectangle, angle, BuildingFootprints.roof(hs))]
    }
    return BuildingFootprints.parts(xs, ys, hs, angle, rectangle, res, minArea)
  }

  /** The largest rectangles in a patch, one after the other, drawn on a grid turned to lie along the patch. */
  private static parts(xs: number[], ys: number[], hs: number[], angle: number, frame: Rectangle, res: number, minArea: number): SurveyedBuilding[] {
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    // Cells no finer than a pixel, and no more of them than a block is worth.
    const cell = Math.max(res, Math.max(frame.maxU - frame.minU, frame.maxV - frame.minV) / BuildingFootprints.MAX_CELLS)
    const columns = Math.max(1, Math.ceil((frame.maxU - frame.minU) / cell))
    const rows = Math.max(1, Math.ceil((frame.maxV - frame.minV) / cell))
    const filled = new Uint8Array(columns * rows)
    const heightAt: number[][] = Array.from({ length: columns * rows }, () => [])
    for (let i = 0; i < xs.length; i++) {
      const u = xs[i] * cos + ys[i] * sin
      const v = -xs[i] * sin + ys[i] * cos
      const column = Math.min(columns - 1, Math.max(0, Math.floor((u - frame.minU) / cell)))
      const row = Math.min(rows - 1, Math.max(0, Math.floor((v - frame.minV) / cell)))
      filled[row * columns + column] = 1
      heightAt[row * columns + column].push(hs[i])
    }
    const found: SurveyedBuilding[] = []
    for (let part = 0; part < BuildingFootprints.MAX_PARTS; part++) {
      const best = BuildingFootprints.largestRectangle(filled, columns, rows)
      if (best === undefined || best.area * cell * cell < minArea) break
      const roofs: number[] = []
      for (let row = best.row; row < best.row + best.rows; row++) {
        for (let column = best.column; column < best.column + best.columns; column++) {
          roofs.push(...heightAt[row * columns + column])
          filled[row * columns + column] = 0
        }
      }
      if (roofs.length === 0) continue
      found.push(BuildingFootprints.building({
        minU: frame.minU + best.column * cell, maxU: frame.minU + (best.column + best.columns) * cell,
        minV: frame.minV + best.row * cell, maxV: frame.minV + (best.row + best.rows) * cell
      }, angle, BuildingFootprints.roof(roofs)))
    }
    return found
  }

  /** The largest rectangle of filled cells in a grid, by the stack of the histogram of each row. */
  private static largestRectangle(filled: Uint8Array, columns: number, rows: number): { column: number, row: number, columns: number, rows: number, area: number } | undefined {
    const heights = new Array<number>(columns).fill(0)
    let best: { column: number, row: number, columns: number, rows: number, area: number } | undefined
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) heights[column] = filled[row * columns + column] ? heights[column] + 1 : 0
      const stack: number[] = []
      for (let column = 0; column <= columns; column++) {
        const current = column === columns ? 0 : heights[column]
        while (stack.length > 0 && heights[stack[stack.length - 1]] >= current) {
          const top = stack.pop()!
          const span = stack.length === 0 ? column : column - stack[stack.length - 1] - 1
          const area = heights[top] * span
          if (best === undefined || area > best.area) {
            best = { column: column - span, row: row - heights[top] + 1, columns: span, rows: heights[top], area }
          }
        }
        stack.push(column)
      }
    }
    return best
  }

  /** The roof's height: what 90% of it stays under, and never less than a floor's worth. */
  private static roof(heights: number[]): number {
    const sorted = [...heights].sort((a, b) => a - b)
    return Math.max(2, sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * BuildingFootprints.ROOF_PERCENTILE))])
  }

  /** A rectangle in the frame turned `angle` (counter-clockwise from east) as a building: where it stands, its sides, and the way it faces. */
  private static building(rectangle: Rectangle, angle: number, roof: number): SurveyedBuilding {
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    const spanU = rectangle.maxU - rectangle.minU
    const spanV = rectangle.maxV - rectangle.minV
    const midU = (rectangle.minU + rectangle.maxU) / 2
    const midV = (rectangle.minV + rectangle.maxV) / 2
    // The shorter side is the depth, and the direction a building faces. Its bearing, clockwise from north, from 0 up to 180: a
    // building faces both ways along it, as far as a footprint can tell.
    const shortAngle = spanU < spanV ? angle : angle + Math.PI / 2
    const bearing = ((90 - shortAngle * 180 / Math.PI) % 180 + 180) % 180
    return {
      eastM: BuildingFootprints.tenth(midU * cos - midV * sin),
      northM: BuildingFootprints.tenth(midU * sin + midV * cos),
      widthM: BuildingFootprints.tenth(Math.max(spanU, spanV)),
      lengthM: BuildingFootprints.tenth(Math.min(spanU, spanV)),
      heightM: BuildingFootprints.tenth(roof),
      headingDeg: Math.round(bearing * 10) / 10
    }
  }

  /** Of the rectangles lying along each side of a hull, the smallest, with the angle it lies at. */
  private static smallestRectangle(hull: [number, number][]): { angle: number, rectangle: Rectangle } {
    let best = { area: Infinity, angle: 0, rectangle: { minU: 0, maxU: 0, minV: 0, maxV: 0 } }
    for (let i = 0; i < Math.max(1, hull.length); i++) {
      const [x0, y0] = hull[i] ?? [0, 0]
      const [x1, y1] = hull[(i + 1) % hull.length] ?? [1, 0]
      const angle = Math.atan2(y1 - y0, x1 - x0)
      const cos = Math.cos(angle)
      const sin = Math.sin(angle)
      let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity
      for (const [x, y] of hull) {
        const u = x * cos + y * sin
        const v = -x * sin + y * cos
        minU = Math.min(minU, u); maxU = Math.max(maxU, u)
        minV = Math.min(minV, v); maxV = Math.max(maxV, v)
      }
      const area = (maxU - minU) * (maxV - minV)
      if (area < best.area) best = { area, angle, rectangle: { minU, maxU, minV, maxV } }
    }
    return best
  }

  /** The convex hull of some points (Andrew's monotone chain), counter-clockwise. */
  private static hull(points: [number, number][]): [number, number][] {
    const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1])
    const unique = sorted.filter((p, i) => i === 0 || p[0] !== sorted[i - 1][0] || p[1] !== sorted[i - 1][1])
    if (unique.length < 3) return unique
    const cross = (o: [number, number], a: [number, number], b: [number, number]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    const lower: [number, number][] = []
    for (const p of unique) {
      while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop()
      lower.push(p)
    }
    const upper: [number, number][] = []
    for (const p of [...unique].reverse()) {
      while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop()
      upper.push(p)
    }
    return [...lower.slice(0, -1), ...upper.slice(0, -1)]
  }

  private static tenth(value: number): number {
    return Math.round(value * 10) / 10
  }
}
