import type { GeoBounds } from "../GeoBounds.js"
import { chooseZoomForTileEdge, tileGridAround, type TileCoord } from "../TileMath.js"
import { geoToLocalMeters } from "../GeoProjection.js"

const TILE_SIZE_PX = 256
const GRID_SIZE = 3

/** Shared by ImageryProvider implementations that fetch a Z/Y/X (or Z/X/Y) tile grid of ordinary
 * images (as opposed to AwsTerrariumElevationProvider's numeric PNG decode) and stitch/resize them
 * into one canvas — currently EsriWorldImageryProvider and EoxSentinel2ImageryProvider. */
export async function fetchImageryRaster(
  bounds: GeoBounds,
  resolution: { width: number; height: number },
  buildUrl: (tile: TileCoord) => string,
  fetchImpl: typeof fetch
): Promise<HTMLCanvasElement> {
  const centerLat = (bounds.south + bounds.north) / 2
  const centerLng = (bounds.west + bounds.east) / 2
  const widthM = Math.abs(geoToLocalMeters(centerLat, bounds.east, centerLat, bounds.west).x)
  const heightM = Math.abs(geoToLocalMeters(bounds.north, centerLng, bounds.south, centerLng).z)
  const zoom = chooseZoomForTileEdge(centerLat, Math.max(widthM, heightM))
  const { tiles } = tileGridAround(centerLng, centerLat, zoom, GRID_SIZE)

  const rasterSize = GRID_SIZE * TILE_SIZE_PX
  const raster = document.createElement("canvas")
  raster.width = rasterSize
  raster.height = rasterSize
  const rasterCtx = raster.getContext("2d")
  if (!rasterCtx) throw new Error("2D canvas context unavailable")

  const originTile = tiles[0]
  await Promise.all(
    tiles.map(async tile => {
      const url = buildUrl(tile)
      const response = await fetchImpl(url)
      if (!response.ok) throw new Error(`Imagery tile fetch failed (${response.status}): ${url}`)
      const bitmap = await createImageBitmap(await response.blob())
      rasterCtx.drawImage(bitmap, (tile.x - originTile.x) * TILE_SIZE_PX, (tile.y - originTile.y) * TILE_SIZE_PX)
    })
  )

  const output = document.createElement("canvas")
  output.width = resolution.width
  output.height = resolution.height
  const outputCtx = output.getContext("2d")
  if (!outputCtx) throw new Error("2D canvas context unavailable")
  outputCtx.drawImage(raster, 0, 0, rasterSize, rasterSize, 0, 0, resolution.width, resolution.height)
  return output
}
