import type { GeoBounds } from "../GeoBounds.js"
import type { ImageryProvider, ImageryTexture } from "../ImageryProvider.js"
import { fetchImageryRaster } from "./xyzImageryRaster.js"

export interface EoxSentinel2ImageryProviderOptions {
  fetchImpl?: typeof fetch
  /** Cloudless mosaic year — EOX publishes one per year from 2018 onward. */
  year?: number
}

/**
 * Real Sentinel-2-derived cloudless satellite imagery from EOX's public s2maps.eu/cloudless.eox.at
 * service — free, keyless, Creative Commons-licensed with a required attribution string (see
 * ImageryProvider's `attribution` field). Not wired by defaultTerrainProviders() — this file exists
 * to demonstrate that ImageryProvider genuinely has more than one implementation, so swapping the
 * active imagery source (e.g. to this one, or later to a paid provider) only ever means editing
 * defaultTerrainProviders.ts, never TerrainMeshBuilder/SceneRenderer.
 */
export class EoxSentinel2ImageryProvider implements ImageryProvider {
  readonly attribution: string

  private readonly fetchImpl: typeof fetch
  private readonly tileUrlTemplate: string

  constructor(options: EoxSentinel2ImageryProviderOptions = {}) {
    // See AwsTerrariumElevationProvider's identical comment: an unbound `fetch` throws "Illegal
    // invocation" once called through `this.fetchImpl(url)`.
    this.fetchImpl = options.fetchImpl ?? fetch.bind(globalThis)
    const year = options.year ?? 2024
    this.tileUrlTemplate = `https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-${year}_3857/default/g/{z}/{y}/{x}.jpg`
    this.attribution = `EOxCloudless https://cloudless.eox.at by EOX IT Services GmbH (Contains modified Copernicus Sentinel data ${year})`
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
