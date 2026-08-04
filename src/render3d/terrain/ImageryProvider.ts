import type { GeoBounds } from "./GeoBounds.js"

/** An assembled image (e.g. a stitched-tiles canvas) covering `GeoBounds`, ready to use as a three.js texture source. */
export interface ImageryTexture {
  source: CanvasImageSource
  width: number
  height: number
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
