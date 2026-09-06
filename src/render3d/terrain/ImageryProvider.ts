import type { GeoBounds } from "./GeoBounds.js"

/** An assembled image (e.g. a stitched-tiles canvas) ready to use as a three.js texture source —
 * or to be drawn straight onto a 2D canvas, which is what the witness map does with it. */
export interface ImageryTexture {
  source: CanvasImageSource
  width: number
  height: number
  /**
   * The geographic area this image ACTUALLY covers, which is not necessarily the area that was
   * asked for: a tiled provider can only return whole tiles, so it returns the grid that contains
   * the request and says so here.
   *
   * Part of the interface because an image without it is not a map. Every consumer that puts
   * anything at a known place on this image — a texture's UVs over real terrain, a marker at the
   * witness's coordinates — needs the real extent to do it, and a consumer that assumes it got the
   * bounds it asked for silently misplaces everything by the difference (see TerrainMeshBuilder,
   * which did exactly that, and fetchImageryRaster, which returns roughly three times the requested
   * span).
   */
  bounds: GeoBounds
}

/**
 * Source of real-world aerial/satellite imagery to drape over the terrain. See ElevationProvider's
 * doc comment — same swappability rationale applies here.
 */
export interface ImageryProvider {
  /**
   * Verbatim attribution text this provider's license requires be shown to the viewer — part of
   * the interface (not a constant living outside providers/) so swapping providers automatically
   * swaps what's displayed, with no attribution text hardcoded anywhere else in the codebase.
   */
  readonly attribution: string
  getImageryTexture(bounds: GeoBounds, resolution: { width: number; height: number }): Promise<ImageryTexture>
}
