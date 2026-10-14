import type { GeoBounds } from "../GeoBounds.js"
import type { ElevationGrid, ElevationProvider } from "../ElevationProvider.js"
import { GeoTiffRaster } from "../GeoTiffRaster.js"
import { geoToLocalMeters } from "../GeoProjection.js"
import { IgnGeoplatform } from "./IgnGeoplatform.js"

export interface IgnMntElevationProviderOptions {
  fetchImpl?: typeof fetch
  /** Mainly for tests, and for pointing at a mirror. */
  wmsEndpoint?: string
  /** How long the service is waited for, ms: a slow answer is worth less than the worldwide relief that is there already. */
  timeoutMs?: number
}

/**
 * The ground of France as the IGN measured it: the bare-earth model of the LiDAR HD survey (a point every metre, trees and roofs taken out) and,
 * where the laser has not flown yet, the RGE ALTI (the same metre-grid model from the older survey, which covers the whole country).
 *
 * Measured against it at Saint-Lô, Maffliers and Silly-le-Long, the worldwide relief (see AwsTerrariumElevationProvider, from SRTM) is a metre or two
 * off near the observer and five to twenty metres off where there is forest or a road on an embankment: SRTM is a model of the SURFACE, so the
 * canopy lifts it, and it is fifteen metres to the pixel, so an embankment is smoothed away. A building stood on it flies or sinks by as much.
 *
 * The service is asked for one picture of the square, at four metres to the pixel, which is already finer than the mesh the scene builds from it
 * (one vertex every 28 m): a picture a hundred times larger would buy nothing. A vertex is read from it by bilinear interpolation between pixel centres.
 * What the picture does not hold (the laser's holes, a border) is -9999 in it: a few vertices are filled from their neighbours, many are not a ground
 * this provider can answer for, and it says so, for another to answer (see FirstElevationThatAnswers).
 */
export class IgnMntElevationProvider implements ElevationProvider {
  private static readonly WMS = "https://data.geopf.fr/wms-r/wms"
  /** In the order they are tried: the laser's bare earth, then the older survey's grid. */
  static readonly LAYERS = ["IGNF_LIDAR-HD_MNT_ELEVATION.ELEVATIONGRIDCOVERAGE.LAMB93", "ELEVATION.ELEVATIONGRIDCOVERAGE.HIGHRES"]
  private static readonly METRES_PER_PIXEL = 4
  private static readonly MIN_PIXELS = 8
  private static readonly MAX_PIXELS = 700
  private static readonly NO_DATA_BELOW = -9000
  /** The share of vertices over no data that is still filled from the neighbours: more, and the layer does not cover the place. */
  private static readonly MAX_HOLE_SHARE = 0.05
  private static readonly DEFAULT_TIMEOUT_MS = 12_000

  private readonly fetchImpl: typeof fetch
  private readonly wms: string
  private readonly timeoutMs: number

  constructor(options: IgnMntElevationProviderOptions = {}) {
    // Bound, as AwsTerrariumElevationProvider's is: an unbound fetch loses the `this` it needs once called as a field.
    this.fetchImpl = options.fetchImpl ?? fetch.bind(globalThis)
    this.wms = options.wmsEndpoint ?? IgnMntElevationProvider.WMS
    this.timeoutMs = options.timeoutMs ?? IgnMntElevationProvider.DEFAULT_TIMEOUT_MS
  }

  async getElevationGrid(bounds: GeoBounds, resolution: { width: number, height: number }): Promise<ElevationGrid> {
    const centre = { lat: (bounds.south + bounds.north) / 2, lng: (bounds.west + bounds.east) / 2 }
    if (!IgnGeoplatform.covers(centre.lat, centre.lng)) throw new Error("The IGN's relief covers France only")
    const widthM = Math.abs(geoToLocalMeters(centre.lat, bounds.east, centre.lat, bounds.west).x)
    const heightM = Math.abs(geoToLocalMeters(bounds.north, centre.lng, bounds.south, centre.lng).z)
    const pixels = (extentM: number): number => Math.min(IgnMntElevationProvider.MAX_PIXELS,
      Math.max(IgnMntElevationProvider.MIN_PIXELS, Math.ceil(extentM / IgnMntElevationProvider.METRES_PER_PIXEL)))
    const size = { width: pixels(widthM), height: pixels(heightM) }
    let failure: unknown = new Error("No layer of the IGN's relief answered")
    for (const layer of IgnMntElevationProvider.LAYERS) {
      try {
        const raster = await this.raster(bounds, size, layer)
        const heights = this.sample(raster, resolution)
        if (heights) return { heights, width: resolution.width, height: resolution.height, bounds }
        failure = new Error(`${layer} does not cover this place`)
      } catch (error) {
        failure = error
      }
    }
    throw failure
  }

  private async raster(bounds: GeoBounds, size: { width: number, height: number }, layer: string): Promise<GeoTiffRaster> {
    const query = new URLSearchParams({
      SERVICE: "WMS", VERSION: "1.3.0", REQUEST: "GetMap", LAYERS: layer, STYLES: "", CRS: "EPSG:4326",
      // WMS 1.3.0 gives the axes of EPSG:4326 in its own order: latitude first.
      BBOX: [bounds.south, bounds.west, bounds.north, bounds.east].map(v => v.toFixed(6)).join(","),
      WIDTH: String(size.width), HEIGHT: String(size.height), FORMAT: "image/geotiff"
    })
    const response = await this.fetchImpl(`${this.wms}?${query}`, { signal: AbortSignal.timeout(this.timeoutMs) })
    if (!response.ok) throw new Error(`The IGN's relief answered ${response.status}`)
    const raster = GeoTiffRaster.parse(await response.arrayBuffer())
    if (raster.samples !== 1 || !(raster.values instanceof Float32Array)) throw new Error("The IGN's relief came in a layout this does not read")
    return raster
  }

  /** The heights at the vertices of the grid the scene asks for, or nothing where the picture holds too little of them. */
  private sample(raster: GeoTiffRaster, resolution: { width: number, height: number }): Float32Array | undefined {
    const { width, height } = resolution
    const heights = new Float32Array(width * height)
    const known = new Uint8Array(width * height)
    let holes = 0
    for (let row = 0; row < height; row++) {
      // Between pixel centres: a pixel is a square whose value belongs to its middle.
      const y = (height === 1 ? 0.5 : row / (height - 1)) * raster.height - 0.5
      for (let col = 0; col < width; col++) {
        const x = (width === 1 ? 0.5 : col / (width - 1)) * raster.width - 0.5
        const value = this.bilinear(raster, x, y)
        const i = row * width + col
        if (value === undefined) holes++
        else { heights[i] = value; known[i] = 1 }
      }
    }
    if (holes === width * height || holes / (width * height) > IgnMntElevationProvider.MAX_HOLE_SHARE) return undefined
    this.fill(heights, known, width, height)
    return heights
  }

  /** The value between four pixels, or nothing where any of them has no data (a vertex half over the laser's hole is not a height). */
  private bilinear(raster: GeoTiffRaster, x: number, y: number): number | undefined {
    const x0 = Math.max(0, Math.min(raster.width - 1, Math.floor(x)))
    const y0 = Math.max(0, Math.min(raster.height - 1, Math.floor(y)))
    const x1 = Math.min(raster.width - 1, x0 + 1)
    const y1 = Math.min(raster.height - 1, y0 + 1)
    const fx = Math.max(0, Math.min(1, x - x0))
    const fy = Math.max(0, Math.min(1, y - y0))
    const h00 = raster.at(x0, y0)
    const h10 = raster.at(x1, y0)
    const h01 = raster.at(x0, y1)
    const h11 = raster.at(x1, y1)
    for (const h of [h00, h10, h01, h11]) if (!Number.isFinite(h) || h < IgnMntElevationProvider.NO_DATA_BELOW) return undefined
    const top = h00 + (h10 - h00) * fx
    const bottom = h01 + (h11 - h01) * fx
    return top + (bottom - top) * fy
  }

  /** Each vertex without a height takes the mean of those around it, from the known ones outward, until none is left. */
  private fill(heights: Float32Array, known: Uint8Array, width: number, height: number): void {
    let remaining = known.reduce((n, k) => n + (k ? 0 : 1), 0)
    while (remaining > 0) {
      const found: [number, number][] = []
      for (let row = 0; row < height; row++) {
        for (let col = 0; col < width; col++) {
          const i = row * width + col
          if (known[i]) continue
          let sum = 0
          let count = 0
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const r = row + dr
              const c = col + dc
              if (r < 0 || c < 0 || r >= height || c >= width || !known[r * width + c]) continue
              sum += heights[r * width + c]
              count++
            }
          }
          if (count > 0) found.push([i, sum / count])
        }
      }
      if (found.length === 0) return
      for (const [i, value] of found) { heights[i] = value; known[i] = 1 }
      remaining -= found.length
    }
  }
}
