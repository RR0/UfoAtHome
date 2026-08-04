import type { GeoBounds } from "./GeoBounds.js"

/** A regular width x height grid of elevations (meters) covering `bounds`, row-major, north to south. */
export interface ElevationGrid {
  heights: Float32Array
  width: number
  height: number
  bounds: GeoBounds
}

/**
 * Source of real-world ground elevation. Deliberately the only thing TerrainMeshBuilder knows
 * about elevation data — concrete implementations (see providers/) own everything about how they
 * fetch/decode it (tile scheme, file format, auth), so swapping to a different provider later
 * (including a paid/keyed one) never touches mesh-building or SceneRenderer code.
 */
export interface ElevationProvider {
  getElevationGrid(bounds: GeoBounds, resolution: { width: number; height: number }): Promise<ElevationGrid>
}
