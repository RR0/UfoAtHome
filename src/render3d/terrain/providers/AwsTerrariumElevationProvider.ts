import type { GeoBounds } from "../GeoBounds.js"
import type { ElevationGrid, ElevationProvider } from "../ElevationProvider.js"
import { chooseZoomForTileEdge, lngLatToTileFraction, tileGridAround, type TileCoord } from "../TileMath.js"
import { geoToLocalMeters } from "../GeoProjection.js"

const TILE_SIZE_PX = 256
const GRID_SIZE = 3
// Terrarium PNG encoding (Mapzen convention, still what AWS's public elevation-tiles-prod serves):
// height (meters) = (R * 256 + G + B / 256) - 32768
const TERRARIUM_OFFSET = 32768

export interface AwsTerrariumElevationProviderOptions {
  fetchImpl?: typeof fetch
  /** {z}/{x}/{y} placeholders. Defaults to AWS's public, keyless elevation-tiles-prod bucket. */
  tileUrlTemplate?: string
}

/**
 * Real-world elevation from AWS's public "elevation-tiles-prod" S3 bucket (Terrarium-encoded PNGs,
 * derived from SRTM/ETOPO1 — no API key, no rate limit). See ElevationProvider's doc comment: this
 * is one interchangeable implementation, not something TerrainMeshBuilder depends on directly.
 */
export class AwsTerrariumElevationProvider implements ElevationProvider {
  private readonly fetchImpl: typeof fetch
  private readonly tileUrlTemplate: string

  constructor(options: AwsTerrariumElevationProviderOptions = {}) {
    // fetch.bind(globalThis), not the bare `fetch` reference — an unbound fetch loses its
    // required `this` (the Window/WorkerGlobalScope), throwing "Illegal invocation" once called
    // as `this.fetchImpl(url)` here.
    this.fetchImpl = options.fetchImpl ?? fetch.bind(globalThis)
    this.tileUrlTemplate = options.tileUrlTemplate ?? "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"
  }

  async getElevationGrid(bounds: GeoBounds, resolution: { width: number; height: number }): Promise<ElevationGrid> {
    const centerLat = (bounds.south + bounds.north) / 2
    const centerLng = (bounds.west + bounds.east) / 2
    const widthM = Math.abs(geoToLocalMeters(centerLat, bounds.east, centerLat, bounds.west).x)
    const heightM = Math.abs(geoToLocalMeters(bounds.north, centerLng, bounds.south, centerLng).z)
    const zoom = chooseZoomForTileEdge(centerLat, Math.max(widthM, heightM))
    const { tiles } = tileGridAround(centerLng, centerLat, zoom, GRID_SIZE)

    const rasterSize = GRID_SIZE * TILE_SIZE_PX
    const combined = new Float32Array(rasterSize * rasterSize)
    const originTile = tiles[0] // top-left of the grid (smallest x, smallest y)
    await Promise.all(tiles.map(tile => this.decodeTileInto(tile, originTile, combined, rasterSize)))

    const heights = new Float32Array(resolution.width * resolution.height)
    for (let row = 0; row < resolution.height; row++) {
      const lat = bounds.north + (bounds.south - bounds.north) * (row / (resolution.height - 1))
      for (let col = 0; col < resolution.width; col++) {
        const lng = bounds.west + (bounds.east - bounds.west) * (col / (resolution.width - 1))
        heights[row * resolution.width + col] = this.sampleAt(lat, lng, zoom, originTile, combined, rasterSize)
      }
    }
    return { heights, width: resolution.width, height: resolution.height, bounds }
  }

  private async decodeTileInto(tile: TileCoord, originTile: TileCoord, combined: Float32Array, rasterSize: number): Promise<void> {
    const url = this.tileUrlTemplate.replace("{z}", String(tile.z)).replace("{x}", String(tile.x)).replace("{y}", String(tile.y))
    const response = await this.fetchImpl(url)
    if (!response.ok) throw new Error(`Elevation tile fetch failed (${response.status}): ${url}`)
    const bitmap = await createImageBitmap(await response.blob())
    const canvas = document.createElement("canvas")
    canvas.width = TILE_SIZE_PX
    canvas.height = TILE_SIZE_PX
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("2D canvas context unavailable")
    ctx.drawImage(bitmap, 0, 0)
    const { data } = ctx.getImageData(0, 0, TILE_SIZE_PX, TILE_SIZE_PX)
    const offsetX = (tile.x - originTile.x) * TILE_SIZE_PX
    const offsetY = (tile.y - originTile.y) * TILE_SIZE_PX
    for (let py = 0; py < TILE_SIZE_PX; py++) {
      for (let px = 0; px < TILE_SIZE_PX; px++) {
        const i = (py * TILE_SIZE_PX + px) * 4
        const height = data[i] * 256 + data[i + 1] + data[i + 2] / 256 - TERRARIUM_OFFSET
        const dstX = offsetX + px
        const dstY = offsetY + py
        combined[dstY * rasterSize + dstX] = height
      }
    }
  }

  private sampleAt(lat: number, lng: number, zoom: number, originTile: TileCoord, combined: Float32Array, rasterSize: number): number {
    const { x, y } = lngLatToTileFraction(lng, lat, zoom)
    const px = (x - originTile.x) * TILE_SIZE_PX
    const py = (y - originTile.y) * TILE_SIZE_PX
    const x0 = Math.max(0, Math.min(rasterSize - 1, Math.floor(px)))
    const y0 = Math.max(0, Math.min(rasterSize - 1, Math.floor(py)))
    const x1 = Math.min(rasterSize - 1, x0 + 1)
    const y1 = Math.min(rasterSize - 1, y0 + 1)
    const fx = px - x0
    const fy = py - y0
    const h00 = combined[y0 * rasterSize + x0]
    const h10 = combined[y0 * rasterSize + x1]
    const h01 = combined[y1 * rasterSize + x0]
    const h11 = combined[y1 * rasterSize + x1]
    const top = h00 + (h10 - h00) * fx
    const bottom = h01 + (h11 - h01) * fx
    return top + (bottom - top) * fy
  }
}
