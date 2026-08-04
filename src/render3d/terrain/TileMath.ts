/**
 * Pure (no fetch/three.js) standard "slippy map" (Web Mercator / XYZ) tile math, shared by any
 * ElevationProvider/ImageryProvider that fetches Z/X/Y raster tiles — kept provider-agnostic so
 * AWS Terrarium and Esri (which use the same Web Mercator tiling, just a different URL order) both
 * reuse it. Unit-testable without a real GPU context, same spirit as skyColors.ts.
 */
import type { GeoBounds } from "./GeoBounds.js"

const DEG_TO_RAD = Math.PI / 180
const RAD_TO_DEG = 180 / Math.PI
const TILE_SIZE_PX = 256
const MAX_ZOOM = 19

export interface TileCoord {
  x: number
  y: number
  z: number
}

/** Real-world ground resolution of one pixel at a given latitude/zoom, standard Web Mercator formula. */
export function metersPerPixel(latDeg: number, z: number): number {
  return (156543.03392 * Math.cos(latDeg * DEG_TO_RAD)) / 2 ** z
}

function tileEdgeMeters(latDeg: number, z: number): number {
  return metersPerPixel(latDeg, z) * TILE_SIZE_PX
}

/**
 * The finest zoom level whose tile edge is still >= targetTileEdgeM — i.e. the most detail
 * available while still guaranteeing each tile covers at least the requested ground distance.
 * Computed from latDeg rather than hardcoded, since tile edge length in meters shrinks with
 * cos(latitude) at a fixed zoom (Web Mercator), so a fixed zoom picked for one sighting's latitude
 * wouldn't give the same real-world coverage for another.
 */
export function chooseZoomForTileEdge(latDeg: number, targetTileEdgeM: number): number {
  let z = 0
  while (z < MAX_ZOOM && tileEdgeMeters(latDeg, z + 1) >= targetTileEdgeM) z++
  return z
}

/** Fractional tile-space coordinates (not floored) — useful for sub-tile interpolation. */
export function lngLatToTileFraction(lngDeg: number, latDeg: number, z: number): { x: number; y: number } {
  const n = 2 ** z
  const x = ((lngDeg + 180) / 360) * n
  const latRad = latDeg * DEG_TO_RAD
  const y = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  return { x, y }
}

export function lngLatToTile(lngDeg: number, latDeg: number, z: number): TileCoord {
  const { x, y } = lngLatToTileFraction(lngDeg, latDeg, z)
  return { x: Math.floor(x), y: Math.floor(y), z }
}

/** Geographic bounds of one Z/X/Y tile. */
export function tileBounds(tile: TileCoord): GeoBounds {
  const n = 2 ** tile.z
  const west = (tile.x / n) * 360 - 180
  const east = ((tile.x + 1) / n) * 360 - 180
  const north = tileLatFromY(tile.y, n)
  const south = tileLatFromY(tile.y + 1, n)
  return { south, north, west, east }
}

function tileLatFromY(y: number, n: number): number {
  const yFrac = y / n
  return (Math.atan(Math.sinh(Math.PI * (1 - 2 * yFrac))) * RAD_TO_DEG)
}

/**
 * A square grid of gridSize x gridSize tiles centered on (lngDeg, latDeg)'s own tile, plus the
 * combined GeoBounds they cover — see TerrainMeshBuilder for why a 3x3 grid is used (guarantees at
 * least one full tile width of coverage around the observer in every direction, even if the
 * observer sits right at the edge of the center tile).
 */
export function tileGridAround(lngDeg: number, latDeg: number, z: number, gridSize: number): { tiles: TileCoord[]; bounds: GeoBounds } {
  const center = lngLatToTile(lngDeg, latDeg, z)
  const half = Math.floor(gridSize / 2)
  const tiles: TileCoord[] = []
  for (let dy = -half; dy <= half; dy++) {
    for (let dx = -half; dx <= half; dx++) {
      tiles.push({ x: center.x + dx, y: center.y + dy, z })
    }
  }
  const corners = tiles.map(tileBounds)
  const bounds: GeoBounds = {
    south: Math.min(...corners.map(c => c.south)),
    north: Math.max(...corners.map(c => c.north)),
    west: Math.min(...corners.map(c => c.west)),
    east: Math.max(...corners.map(c => c.east))
  }
  return { tiles, bounds }
}
