import type { GeoBounds } from "../../../render3d/terrain/GeoBounds.js"
import type { ImageryProvider, ImageryTexture } from "../../../render3d/terrain/ImageryProvider.js"
import { fetchImageryRaster } from "./xyzImageryRaster.js"

export interface XyzImageryProviderOptions {
  /** The address of a tile, with `{z}`, `{x}` and `{y}` where its zoom and its column and row go, in whatever order the service has them. */
  tileUrlTemplate: string
  /** What its licence requires to be shown beside the picture. */
  attribution: string
  fetchImpl?: typeof fetch
}

/**
 * Aerial imagery from any service that serves it as a grid of ordinary image tiles: what a module that names a tile address and its
 * credit, and nothing else, is given (see ModuleManifest). The services this project knows by name have their own class (Esri, EOX),
 * with their address and their credit written in.
 */
export class XyzImageryProvider implements ImageryProvider {
  readonly attribution: string
  private readonly fetchImpl: typeof fetch
  private readonly tileUrlTemplate: string

  constructor(options: XyzImageryProviderOptions) {
    this.attribution = options.attribution
    this.tileUrlTemplate = options.tileUrlTemplate
    // An unbound fetch throws "Illegal invocation" once called as a field: see AwsTerrariumElevationProvider.
    this.fetchImpl = options.fetchImpl ?? fetch.bind(globalThis)
  }

  getImageryTexture(bounds: GeoBounds, resolution: { width: number, height: number }): Promise<ImageryTexture> {
    return fetchImageryRaster(bounds, resolution, tile => XyzImageryProvider.tileUrl(this.tileUrlTemplate, tile), this.fetchImpl)
  }

  /** The address of one tile. */
  static tileUrl(template: string, tile: { z: number, x: number, y: number }): string {
    return template.replaceAll("{z}", String(tile.z)).replaceAll("{x}", String(tile.x)).replaceAll("{y}", String(tile.y))
  }
}
