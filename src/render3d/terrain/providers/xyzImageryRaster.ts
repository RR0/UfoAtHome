import type { GeoBounds } from "../GeoBounds.js"
import type { ImageryTexture } from "../ImageryProvider.js"
import { chooseZoomForPixelSize, tileEdgeM, tileGridAround, type TileCoord } from "../TileMath.js"
import { geoToLocalMeters } from "../GeoProjection.js"

const TILE_SIZE_PX = 256
/**
 * At most this many tiles on a side, so 25 fetches from somebody else's service for one patch.
 *
 * It used to be exactly three, at whatever zoom covered the span — which over Socorro meant six
 * metres to the texel, and a road is six metres wide. The ground under the scene was therefore a
 * brown smear in which no road, no verge and no track could be made out, and a reader could not
 * see where the car had left the highway. Esri's survey is nothing like that coarse (half a metre
 * at zoom 18, looked at over Socorro before this was changed); the limit is what it is fair to
 * fetch and to hold, not what has been surveyed.
 */
const MAX_GRID_SIZE = 5

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
  const spanM = Math.max(widthM, heightM)
  // The zoom is chosen from the ground resolution the CALLER asked for — its span over its pixels —
  // rather than from what a fixed three tiles happen to cover. Finer than that is thrown away in
  // the resize below; coarser is invented there.
  //
  // How many tiles that then takes is a consequence, not a constant. What has to be guaranteed is
  // coverage from the CENTRE outwards, and the centre can sit anywhere in its own tile — right at
  // its edge, in the worst case, leaving exactly one whole tile of margin on that side. So half the
  // grid, in whole tiles, must reach half the span. Past MAX_GRID_SIZE the zoom steps back instead:
  // a coarser photograph is a disappointment, and fifty fetches to a free service is a rudeness.
  const { zoom, gridSize } = imageryTilePlan(centerLat, spanM, Math.max(resolution.width, resolution.height))
  const { tiles, bounds: gridBounds } = tileGridAround(centerLng, centerLat, zoom, gridSize)

  const rasterSize = gridSize * TILE_SIZE_PX
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

  // The asked-for size is a CEILING, not an order: enlarging the raster to meet it would spend
  // memory on texels carrying nothing the tiles held, and the caller's own reason for naming a size
  // is how much it is prepared to hold.
  const outputSize = Math.min(Math.max(resolution.width, resolution.height), rasterSize)
  if (outputSize === rasterSize) {
    return { source: raster, width: rasterSize, height: rasterSize, bounds: gridBounds }
  }
  const output = document.createElement("canvas")
  output.width = outputSize
  output.height = outputSize
  const outputCtx = output.getContext("2d")
  if (!outputCtx) throw new Error("2D canvas context unavailable")
  outputCtx.drawImage(raster, 0, 0, rasterSize, rasterSize, 0, 0, outputSize, outputSize)
  return { source: output, width: outputSize, height: outputSize, bounds: gridBounds }
}

/**
 * Which tiles to ask for: the zoom and the odd grid size, for a square of `spanM` on the ground at
 * `latDeg`, wanted at no more than `maxPixels` on a side. See fetchImageryRaster for the reasoning;
 * separated out so the decision can be checked without a canvas or a network.
 */
export function imageryTilePlan(latDeg: number, spanM: number, maxPixels: number): { zoom: number; gridSize: number; mPerPixel: number } {
  let zoom = chooseZoomForPixelSize(latDeg, spanM / Math.max(1, maxPixels))
  let gridSize = gridSizeFor(latDeg, zoom, spanM)
  while (gridSize > MAX_GRID_SIZE && zoom > 0) {
    zoom--
    gridSize = gridSizeFor(latDeg, zoom, spanM)
  }
  return { zoom, gridSize, mPerPixel: tileEdgeM(latDeg, zoom) / TILE_SIZE_PX }
}

/** The smallest odd grid of tiles at this zoom whose half reaches half the span — see the caller. */
function gridSizeFor(latDeg: number, zoom: number, spanM: number): number {
  const half = Math.ceil(spanM / 2 / tileEdgeM(latDeg, zoom))
  return Math.max(3, 2 * half + 1)
}
