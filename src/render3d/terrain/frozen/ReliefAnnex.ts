import type { GeoBounds } from "../GeoBounds.js"
import type { ElevationGrid, ElevationHints, ElevationProvider } from "../ElevationProvider.js"
import { FrozenPatches, type FrozenPatch } from "./FrozenPatches.js"

/** One patch of the relief, as its source answered for it. */
export interface FrozenReliefPatch extends FrozenPatch {
  grid: ElevationGrid
}

/** The relief annex once read: what `<recording>.relief.zip` holds. */
export interface ReliefAnnexData {
  takenOn: string
  attribution: string
  patches: FrozenReliefPatch[]
}

interface ReliefIndexFile {
  version: 1
  takenOn: string
  attribution: string
  patches: (FrozenPatch & { bounds: GeoBounds, width: number, height: number, file: string })[]
}

/**
 * The relief annex: a zip of an `index.json` naming each patch and the grid its source answered with, and one file per grid.
 *
 * A grid is written as it came, every height a 32-bit float, so that the frozen scene stands on the very ground the live one did. Its bytes
 * are written by plane (the first byte of every height, then the second…) before the zip compresses them: the high bytes of the heights of
 * one hillside are nearly all the same, and a plane of them compresses to almost nothing, where the heights side by side do not.
 */
export class ReliefAnnex {
  static async encode(annex: ReliefAnnexData): Promise<Uint8Array> {
    const { zipSync, strToU8 } = await import("fflate")
    const files: Record<string, Uint8Array> = {}
    const index: ReliefIndexFile = {
      version: 1, takenOn: annex.takenOn, attribution: annex.attribution,
      patches: annex.patches.map((patch, i) => {
        const file = `${i}.f32`
        files[file] = ReliefAnnex.byPlane(patch.grid.heights)
        return { lat: patch.lat, lng: patch.lng, radiusM: patch.radiusM, ...(patch.far ? { far: patch.far } : {}), bounds: patch.grid.bounds, width: patch.grid.width, height: patch.grid.height, file }
      })
    }
    files["index.json"] = strToU8(JSON.stringify(index, null, 1))
    return zipSync(files, { level: 9 })
  }

  static decode(files: Record<string, Uint8Array>): ReliefAnnexData {
    const indexBytes = files["index.json"]
    if (!indexBytes) throw new Error("A relief annex without its index")
    const index = JSON.parse(new TextDecoder().decode(indexBytes)) as ReliefIndexFile
    return {
      takenOn: index.takenOn,
      attribution: index.attribution,
      patches: index.patches.flatMap(patch => {
        const bytes = files[patch.file]
        if (!bytes || bytes.length !== patch.width * patch.height * 4) return []
        const grid: ElevationGrid = { heights: ReliefAnnex.fromPlanes(bytes), width: patch.width, height: patch.height, bounds: patch.bounds }
        return [{ lat: patch.lat, lng: patch.lng, radiusM: patch.radiusM, ...(patch.far ? { far: patch.far } : {}), grid }]
      })
    }
  }

  /** The bytes of the heights by plane: every first byte, then every second, every third, every fourth. */
  static byPlane(heights: Float32Array): Uint8Array {
    const raw = new Uint8Array(heights.buffer, heights.byteOffset, heights.byteLength)
    const count = heights.length
    const out = new Uint8Array(raw.length)
    for (let i = 0; i < count; i++) {
      for (let b = 0; b < 4; b++) out[b * count + i] = raw[i * 4 + b]
    }
    return out
  }

  static fromPlanes(bytes: Uint8Array): Float32Array {
    const count = bytes.length / 4
    const raw = new Uint8Array(bytes.length)
    for (let i = 0; i < count; i++) {
      for (let b = 0; b < 4; b++) raw[i * 4 + b] = bytes[b * count + i]
    }
    return new Float32Array(raw.buffer)
  }
}

/**
 * The relief as it was frozen: each patch's own grid for the patch it was taken for, and for a smaller square inside one (the editor's height of
 * the ground under a point) the grid read there. Nothing else is asked of anybody: a square no patch holds is not a ground this can answer for,
 * and it says so, as a source that does not cover a place does.
 */
export class FrozenElevationProvider implements ElevationProvider {
  constructor(private readonly annex: Promise<ReliefAnnexData>) {
  }

  async getElevationGrid(bounds: GeoBounds, resolution: { width: number, height: number }, _hints?: ElevationHints): Promise<ElevationGrid> {
    const { patches } = await this.annex
    // By the square the patch was ASKED for: a source may answer with a grid of its own extent.
    const same = patches.find(patch => FrozenPatches.sameBounds(FrozenPatches.boundsOf(patch), bounds))
    // A copy: the mesh presses the beds of the rivers into the heights it is given (see WaterBeds), and the next build is of the same patch.
    if (same) return { ...same.grid, heights: new Float32Array(same.grid.heights) }
    const within = patches.find(patch => FrozenPatches.contains(patch.grid.bounds, bounds))
    if (within) return FrozenElevationProvider.resample(within.grid, bounds, resolution)
    throw new Error("The frozen relief does not hold this ground")
  }

  /** `grid` read bilinearly at a `resolution` grid over `bounds`, which it contains. */
  static resample(grid: ElevationGrid, bounds: GeoBounds, resolution: { width: number, height: number }): ElevationGrid {
    const { width, height } = resolution
    const heights = new Float32Array(width * height)
    const spanLng = grid.bounds.east - grid.bounds.west
    const spanLat = grid.bounds.north - grid.bounds.south
    for (let row = 0; row < height; row++) {
      const lat = bounds.north - (bounds.north - bounds.south) * (height > 1 ? row / (height - 1) : 0)
      const y = Math.min(grid.height - 1, Math.max(0, (grid.bounds.north - lat) / spanLat * (grid.height - 1)))
      const y0 = Math.floor(y), y1 = Math.min(grid.height - 1, y0 + 1), fy = y - y0
      for (let column = 0; column < width; column++) {
        const lng = bounds.west + (bounds.east - bounds.west) * (width > 1 ? column / (width - 1) : 0)
        const x = Math.min(grid.width - 1, Math.max(0, (lng - grid.bounds.west) / spanLng * (grid.width - 1)))
        const x0 = Math.floor(x), x1 = Math.min(grid.width - 1, x0 + 1), fx = x - x0
        const at = (r: number, c: number) => grid.heights[r * grid.width + c]
        const top = at(y0, x0) * (1 - fx) + at(y0, x1) * fx
        const bottom = at(y1, x0) * (1 - fx) + at(y1, x1) * fx
        heights[row * width + column] = top * (1 - fy) + bottom * fy
      }
    }
    return { heights, width, height, bounds }
  }
}
