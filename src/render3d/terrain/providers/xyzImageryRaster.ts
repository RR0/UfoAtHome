import type { GeoBounds } from "../GeoBounds.js"
import type { ImageryTexture } from "../ImageryProvider.js"
import { chooseZoomForTileEdge, tileGridAround, type TileCoord } from "../TileMath.js"
import { geoToLocalMeters } from "../GeoProjection.js"

const TILE_SIZE_PX = 256
const GRID_SIZE = 3

/** Shared by ImageryProvider implementations that fetch a Z/Y/X (or Z/X/Y) tile grid of ordinary
 * images (as opposed to AwsTerrariumElevationProvider's numeric PNG decode) and stitch/resize them
 * into one canvas — currently EsriWorldImageryProvider and EoxSentinel2ImageryProvider.
 *
 * Returns the tile grid's own bounds alongside the image, and NOT the bounds it was asked for: a
 * whole number of tiles centred on the centre point's own tile is what a tiled service can give,
 * and that area only contains the request, it does not equal it. See ImageryTexture.bounds — a
 * caller that assumes otherwise puts everything on the image in the wrong place.
 */
export async function fetchImageryRaster(
  bounds: GeoBounds,
  resolution: { width: number; height: number },
  buildUrl: (tile: TileCoord) => string,
  fetchImpl: typeof fetch
): Promise<ImageryTexture> {
  const centerLat = (bounds.south + bounds.north) / 2
  const centerLng = (bounds.west + bounds.east) / 2
  const widthM = Math.abs(geoToLocalMeters(centerLat, bounds.east, centerLat, bounds.west).x)
  const heightM = Math.abs(geoToLocalMeters(bounds.north, centerLng, bounds.south, centerLng).z)
  // HALF the requested span per tile, not the whole span. What has to be guaranteed is coverage
  // from the CENTRE outwards, and the centre can sit anywhere in its own tile — right at its edge,
  // in the worst case, leaving exactly one whole tile of margin on that side. One tile edge >= half
  // the span therefore covers the request whatever the alignment, while a tile edge >= the whole
  // span (what this asked for before) buys a second, wasted factor of two: the grid came back three
  // to six times the requested span, so the ground actually looked at got a sixth of the detail the
  // same number of fetched pixels could have given it.
  const zoom = chooseZoomForTileEdge(centerLat, Math.max(widthM, heightM) / 2)
  const { tiles, bounds: gridBounds } = tileGridAround(centerLng, centerLat, zoom, GRID_SIZE)

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
  return { source: output, width: resolution.width, height: resolution.height, bounds: gridBounds }
}
