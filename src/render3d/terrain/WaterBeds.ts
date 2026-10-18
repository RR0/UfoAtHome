import type { ElevationGrid } from "./ElevationProvider.js"
import type { WaterSurface } from "./WaterProvider.js"

/**
 * The beds of the rivers, lakes and ponds of a place, pressed into its relief at the level of their water.
 *
 * WHY: the bare earth of a river is its water level, between quays that are walls, and a relief grid of a vertex every seven metres, each the
 * mean of the ground round it, cannot hold a wall: it slopes. The Seine's arm south of the Île de la Cité, thirty metres between quays nine metres
 * high, came out as a V whose bottom barely reached the water, and water laid at its level showed as a thread down the middle of a dry trough.
 * A map knows where the water is, so inside its outline the ground is held down to the level of the water there, and the bank is as steep as one
 * cell of the grid can make it.
 *
 * AT WHAT LEVEL: a low share (LEVEL_QUANTILE) of the grid's heights inside the outline, which is the water where the bed is wide enough for the grid
 * to see it (measured on the Seine: 27.0 m against the map's 27 and the laser's 27.2). Never raised: a vertex is only lowered, to that level.
 *
 * NOT under the observer's road: a road carried over the water (a bridge the observer drives over) was laid into the ground by the elevation provider
 * (see IgnMntElevationProvider.layBridgeDecks), and holding it down to the water would drop the observer into the river.
 */
export class WaterBeds {
  /** The share of the grid's heights inside an outline that is its water: see WaterSystem.LEVEL_QUANTILE, the same reading. */
  static readonly LEVEL_QUANTILE = 0.2
  /** How far from the observer's road the ground is left alone, metres: a deck's half-width and its edges, and the cell it falls in. */
  static readonly ROUTE_CLEARANCE_M = 12
  private static readonly METRES_PER_DEGREE = 111320

  /** Holds the grid down to each surface's water level inside its outline; returns how many vertices were lowered. */
  static flatten(grid: ElevationGrid, surfaces: readonly WaterSurface[], route?: readonly { lat: number, lng: number }[]): number {
    const spared = route && route.length >= 2 ? WaterBeds.alongRoute(grid, route) : undefined
    let lowered = 0
    for (const surface of surfaces) {
      const inside = WaterBeds.fill(grid, surface).filter(index => !spared?.[index])
      if (inside.length === 0) continue
      const heights = inside.map(index => grid.heights[index]).filter(Number.isFinite).sort((a, b) => a - b)
      if (heights.length === 0) continue
      const level = heights[Math.floor((heights.length - 1) * WaterBeds.LEVEL_QUANTILE)]
      for (const index of inside) {
        if (grid.heights[index] > level) {
          grid.heights[index] = level
          lowered++
        }
      }
    }
    return lowered
  }

  /**
   * The vertices of the grid inside a surface (its outline, not its islands), by rows: on each row of the grid the edges of the rings cross it at
   * some columns, and the vertices between the first and the second crossing, the third and the fourth, and so on, are inside (the even-odd rule,
   * which keeps the islands out). A row costs the edges of the rings, and not the edges for every vertex.
   */
  static fill(grid: ElevationGrid, surface: WaterSurface): number[] {
    const { width, height, bounds } = grid
    const toCol = (lng: number) => (lng - bounds.west) / (bounds.east - bounds.west) * (width - 1)
    const toRow = (lat: number) => (bounds.north - lat) / (bounds.north - bounds.south) * (height - 1)
    const edges: { r0: number, c0: number, r1: number, c1: number }[] = []
    for (const ring of surface.rings) {
      for (let i = 0; i < ring.length; i++) {
        const a = ring[i]
        const b = ring[(i + 1) % ring.length]
        const edge = { r0: toRow(a.lat), c0: toCol(a.lng), r1: toRow(b.lat), c1: toCol(b.lng) }
        if (edge.r0 !== edge.r1) edges.push(edge)
      }
    }
    const inside: number[] = []
    if (edges.length === 0) return inside
    const top = Math.max(0, Math.ceil(Math.min(...edges.map(edge => Math.min(edge.r0, edge.r1)))))
    const bottom = Math.min(height - 1, Math.floor(Math.max(...edges.map(edge => Math.max(edge.r0, edge.r1)))))
    for (let row = top; row <= bottom; row++) {
      const crossings: number[] = []
      for (const { r0, c0, r1, c1 } of edges) {
        // Half-open, so a vertex of a ring that falls on the row is counted once.
        if ((r0 <= row) !== (r1 <= row)) crossings.push(c0 + (c1 - c0) * (row - r0) / (r1 - r0))
      }
      crossings.sort((a, b) => a - b)
      for (let k = 0; k + 1 < crossings.length; k += 2) {
        const from = Math.max(0, Math.ceil(crossings[k]))
        const to = Math.min(width - 1, Math.floor(crossings[k + 1]))
        for (let col = from; col <= to; col++) inside.push(row * width + col)
      }
    }
    return inside
  }

  /** The vertices within ROUTE_CLEARANCE_M of the observer's road. */
  private static alongRoute(grid: ElevationGrid, route: readonly { lat: number, lng: number }[]): Uint8Array {
    const { width, height, bounds } = grid
    const metresPerCol = (bounds.east - bounds.west) * WaterBeds.METRES_PER_DEGREE * Math.cos((bounds.north + bounds.south) / 2 * Math.PI / 180) / (width - 1)
    const metresPerRow = (bounds.north - bounds.south) * WaterBeds.METRES_PER_DEGREE / (height - 1)
    const reachCols = Math.ceil(WaterBeds.ROUTE_CLEARANCE_M / metresPerCol)
    const reachRows = Math.ceil(WaterBeds.ROUTE_CLEARANCE_M / metresPerRow)
    const spared = new Uint8Array(width * height)
    const toCol = (lng: number) => (lng - bounds.west) / (bounds.east - bounds.west) * (width - 1)
    const toRow = (lat: number) => (bounds.north - lat) / (bounds.north - bounds.south) * (height - 1)
    for (let i = 0; i + 1 < route.length; i++) {
      const [c0, r0, c1, r1] = [toCol(route[i].lng), toRow(route[i].lat), toCol(route[i + 1].lng), toRow(route[i + 1].lat)]
      // A leg wholly off the grid spares nothing on it.
      if (Math.max(c0, c1) < -reachCols || Math.min(c0, c1) > width - 1 + reachCols || Math.max(r0, r1) < -reachRows || Math.min(r0, r1) > height - 1 + reachRows) continue
      const steps = Math.max(1, Math.ceil(Math.hypot(c1 - c0, r1 - r0) * 2))
      for (let s = 0; s <= steps; s++) {
        const col = Math.round(c0 + (c1 - c0) * s / steps)
        const row = Math.round(r0 + (r1 - r0) * s / steps)
        for (let dr = -reachRows; dr <= reachRows; dr++) {
          for (let dc = -reachCols; dc <= reachCols; dc++) {
            const r = row + dr
            const c = col + dc
            if (r < 0 || c < 0 || r >= height || c >= width) continue
            if (Math.hypot(dc * metresPerCol, dr * metresPerRow) <= WaterBeds.ROUTE_CLEARANCE_M) spared[r * width + c] = 1
          }
        }
      }
    }
    return spared
  }
}
