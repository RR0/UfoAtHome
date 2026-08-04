import type { GeoBounds } from "../GeoBounds.js"
import type { ImageryProvider, ImageryTexture } from "../ImageryProvider.js"
import { fetchImageryRaster } from "./xyzImageryRaster.js"

export interface EsriWorldImageryProviderOptions {
  fetchImpl?: typeof fetch
  /** {z}/{y}/{x} placeholders — note Esri's own tile services use z/y/x order, not the usual z/x/y. */
  tileUrlTemplate?: string
}

/**
 * Real aerial/satellite imagery from Esri's public World Imagery service — free, keyless, but its
 * terms of use require the attribution below to be shown to the viewer (see ImageryProvider's
 * `attribution` field). One interchangeable implementation, see ImageryProvider's doc comment.
 */
export class EsriWorldImageryProvider implements ImageryProvider {
  readonly attribution = "Imagery © Esri, Maxar, Earthstar Geographics, and the GIS User Community"

  private readonly fetchImpl: typeof fetch
  private readonly tileUrlTemplate: string

  constructor(options: EsriWorldImageryProviderOptions = {}) {
    // See AwsTerrariumElevationProvider's identical comment: an unbound `fetch` throws "Illegal
    // invocation" once called through `this.fetchImpl(url)`.
    this.fetchImpl = options.fetchImpl ?? fetch.bind(globalThis)
    this.tileUrlTemplate = options.tileUrlTemplate ?? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
  }

  async getImageryTexture(bounds: GeoBounds, resolution: { width: number; height: number }): Promise<ImageryTexture> {
    const source = await fetchImageryRaster(
      bounds,
      resolution,
      tile => this.tileUrlTemplate.replace("{z}", String(tile.z)).replace("{y}", String(tile.y)).replace("{x}", String(tile.x)),
      this.fetchImpl
    )
    return { source, width: resolution.width, height: resolution.height }
  }
}
