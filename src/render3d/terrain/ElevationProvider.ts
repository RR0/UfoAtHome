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

/** The ground's height above sea level at one point, read off whichever provider is live — what
 * makes "altitude" a real number in an editor rather than a height above an unstated datum: a
 * witness in the Alps is not at 0 m, and the field has to say so before they wonder why. Kept as a
 * helper over the grid API rather than a second interface method so a provider only ever has one
 * thing to implement (see ElevationProvider's own doc comment). */
export class GroundElevation {
  /** A patch small enough to be one hillside, large enough that the two samples aren't the same
   * pixel of the source tile. */
  private static readonly SPAN_DEG = 0.002

  constructor(private readonly provider: ElevationProvider) {
  }

  async at(lat: number, lng: number): Promise<number | undefined> {
    const span = GroundElevation.SPAN_DEG
    try {
      const grid = await this.provider.getElevationGrid(
        { south: lat - span, north: lat + span, west: lng - span, east: lng + span },
        // 2x2 is the smallest grid the samplers can interpolate across (a 1-wide one divides by
        // zero); the first cell is the north-west corner, close enough at this span.
        { width: 2, height: 2 }
      )
      const height = grid.heights[0]
      return Number.isFinite(height) ? height : undefined
    } catch {
      // Offline, a CORS failure, a tile that doesn't exist: the editor simply doesn't learn the
      // ground's height, exactly as it didn't before. Never an error the witness has to dismiss.
      return undefined
    }
  }
}
