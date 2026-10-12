import { SurroundingsUnavailableError } from "../SurroundingsProvider.js"
import type { SurroundingsProvider, Surroundings } from "../SurroundingsProvider.js"
import { BuildingFootprints } from "../BuildingFootprints.js"
import { CanopyCrowns } from "../CanopyCrowns.js"
import { GeoTiffRaster } from "../GeoTiffRaster.js"

export interface IgnLidarSurroundingsProviderOptions {
  fetchImpl?: typeof fetch
  /** Mainly for tests, and for pointing at a mirror. */
  endpoint?: string
}

/**
 * The trees and the buildings around a place in France, from the IGN's LiDAR HD: the whole country scanned from the air,
 * published as open data (Licence Ouverte 2.0) and served by the Géoplateforme's WMS, which answers
 * browsers from anywhere (it sends `Access-Control-Allow-Origin: *`).
 *
 * Two layers are asked for the same square, and both are needed:
 *
 * - the canopy height model (MNH), the height above the ground of whatever stands, in metres as 32-bit floats;
 * - the classification, a picture of what each laser point was taken to be. It is the only thing that tells a
 *   tree from a roof: the height model gives 291 m at the Eiffel Tower, and 21 m for an oak. Only the greens
 *   of that picture (medium and high vegetation) are plants, and its dark red is the buildings.
 *
 * A place the scan does not cover answers with a height of -9999 everywhere, which is how "no coverage" is
 * told from "no tree". The survey is of the day it was flown, which this service does not say: the provider
 * is `contemporary`, and its trees are a suggestion.
 */
export class IgnLidarSurroundingsProvider implements SurroundingsProvider {
  readonly id = "ign-lidar-hd"
  readonly name = "IGN LiDAR HD"
  readonly attribution = "Canopy © IGN, LiDAR HD (Licence Ouverte 2.0), as surveyed on a day the service does not give"
  readonly creditUrl = "https://geoservices.ign.fr/lidarhd"
  readonly contemporary = true

  private static readonly ENDPOINT = "https://data.geopf.fr/wms-r/wms"
  private static readonly HEIGHT_LAYER = "IGNF_LIDAR-HD_MNH_ELEVATION.ELEVATIONGRIDCOVERAGE.LAMB93"
  private static readonly CLASS_LAYER = "IGNF_LIDAR-HD_CLASS"
  private static readonly METRES_PER_PIXEL = 0.5
  /** More than this and the two answers are 1.4 MB each: the ground is asked for in a square this big at most. */
  static readonly MAX_RADIUS_M = 150
  private static readonly NO_DATA = -9999
  private static readonly METRES_PER_DEGREE = 111320

  private readonly fetchImpl: typeof fetch
  private readonly endpoint: string

  constructor(options: IgnLidarSurroundingsProviderOptions = {}) {
    // Bound, as AwsTerrariumElevationProvider's is: an unbound fetch loses the `this` it needs once called as a field.
    this.fetchImpl = options.fetchImpl ?? fetch.bind(globalThis)
    this.endpoint = options.endpoint ?? IgnLidarSurroundingsProvider.ENDPOINT
  }

  /** Metropolitan France and Corsica, as a box: a place outside it is not worth a request. */
  covers(lat: number, lng: number): boolean {
    return lat >= 41.2 && lat <= 51.3 && lng >= -5.4 && lng <= 9.8
  }

  async getSurroundings(centre: { lat: number, lng: number }, radiusM: number): Promise<Surroundings> {
    if (!this.covers(centre.lat, centre.lng)) throw new SurroundingsUnavailableError("no-coverage", "The LiDAR HD survey covers France only")
    const radius = Math.min(radiusM, IgnLidarSurroundingsProvider.MAX_RADIUS_M)
    const size = Math.ceil(2 * radius / IgnLidarSurroundingsProvider.METRES_PER_PIXEL)
    const [heights, classes] = await Promise.all([
      this.raster(centre, radius, size, IgnLidarSurroundingsProvider.HEIGHT_LAYER, "image/geotiff"),
      this.raster(centre, radius, size, IgnLidarSurroundingsProvider.CLASS_LAYER, "image/geotiff")
    ])
    if (heights.samples !== 1 || classes.samples < 3) throw new SurroundingsUnavailableError("unreachable", "The survey answered in a layout this does not read")
    if ((heights.values as Float32Array).every(v => v === IgnLidarSurroundingsProvider.NO_DATA)) {
      throw new SurroundingsUnavailableError("no-coverage", "No LiDAR HD survey here yet")
    }
    const vegetation = new Uint8Array(size * size)
    const building = new Uint8Array(size * size)
    for (let i = 0; i < size * size; i++) {
      const r = classes.values[i * classes.samples]
      const g = classes.values[i * classes.samples + 1]
      const b = classes.values[i * classes.samples + 2]
      vegetation[i] = g > r && g > b ? 1 : 0
      // The dark red of the classification's own key for buildings.
      building[i] = r > 120 && g < 90 && b < 90 ? 1 : 0
    }
    const metresPerPixel = 2 * radius / size
    const grid = heights.values as Float32Array
    return {
      trees: new CanopyCrowns(grid, vegetation, size, size).trees({ metresPerPixel, radiusM: radius }),
      buildings: new BuildingFootprints(grid, building, size, size).buildings({ metresPerPixel, radiusM: radius })
    }
  }

  private async raster(centre: { lat: number, lng: number }, radiusM: number, size: number, layer: string, format: string): Promise<GeoTiffRaster> {
    const dLat = radiusM / IgnLidarSurroundingsProvider.METRES_PER_DEGREE
    const dLng = radiusM / (IgnLidarSurroundingsProvider.METRES_PER_DEGREE * Math.cos(centre.lat * Math.PI / 180))
    const query = new URLSearchParams({
      SERVICE: "WMS", VERSION: "1.3.0", REQUEST: "GetMap", LAYERS: layer, STYLES: "", CRS: "EPSG:4326",
      // WMS 1.3.0 gives the axes of EPSG:4326 in its own order: latitude first.
      BBOX: [centre.lat - dLat, centre.lng - dLng, centre.lat + dLat, centre.lng + dLng].map(v => v.toFixed(6)).join(","),
      WIDTH: String(size), HEIGHT: String(size), FORMAT: format
    })
    let response: Response
    try {
      response = await this.fetchImpl(`${this.endpoint}?${query}`)
    } catch (error) {
      throw new SurroundingsUnavailableError("unreachable", error instanceof Error ? error.message : String(error))
    }
    if (!response.ok) throw new SurroundingsUnavailableError("unreachable", `The survey answered ${response.status}`)
    try {
      return GeoTiffRaster.parse(await response.arrayBuffer())
    } catch (error) {
      throw new SurroundingsUnavailableError("unreachable", error instanceof Error ? error.message : String(error))
    }
  }
}
