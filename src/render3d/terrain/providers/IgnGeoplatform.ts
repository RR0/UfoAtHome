import { SurroundingsUnavailableError } from "../SurroundingsProvider.js"
import { HeightGrid } from "../OverheadStructures.js"
import type { PlaceVectors, VectorFeature } from "../OverheadStructures.js"
import { GeoTiffRaster } from "../GeoTiffRaster.js"

export interface IgnGeoplatformOptions {
  fetchImpl?: typeof fetch
  /** Mainly for tests, and for pointing at a mirror. */
  wmsEndpoint?: string
  wfsEndpoint?: string
}

/** What the laser saw round a place, as grids of 0.5 m pixels, row after row from the north-west. */
export interface LidarGrids {
  size: number
  metresPerPixel: number
  /** The height of whatever stands above the ground, metres. */
  heights: Float32Array
  /** Non-zero where the pixel is a plant. */
  vegetation: Uint8Array
  /** Non-zero where the pixel is a roof. */
  building: Uint8Array
  /** The heights as a lookup of structures: what is neither a plant nor a roof. */
  structures: HeightGrid
}

/**
 * The IGN's Géoplateforme, which the surveys of France come from: its WMS gives the laser's height model and classification as pictures, its
 * WFS the vectors of the map (BD TOPO). Both answer browsers from anywhere (`Access-Control-Allow-Origin: *`).
 *
 * One place for what the three surveys built on it share (the laser alone, the map alone, both together): how a square of ground is asked
 * for, in which axis order, and how a failure is told from nothing. A survey is then only what it makes of the answers.
 */
export class IgnGeoplatform {
  /** Metropolitan France and Corsica, as a box: a place outside it is not worth a request. */
  static covers(lat: number, lng: number): boolean {
    return lat >= 41.2 && lat <= 51.3 && lng >= -5.4 && lng <= 9.8
  }

  private static readonly WMS = "https://data.geopf.fr/wms-r/wms"
  private static readonly WFS = "https://data.geopf.fr/wfs/ows"
  private static readonly HEIGHT_LAYER = "IGNF_LIDAR-HD_MNH_ELEVATION.ELEVATIONGRIDCOVERAGE.LAMB93"
  private static readonly CLASS_LAYER = "IGNF_LIDAR-HD_CLASS"
  private static readonly METRES_PER_PIXEL = 0.5
  /** The map is asked in small filtered questions, so a far horizon costs a few more kilobytes: three kilometres at most. */
  static readonly MAX_RADIUS_M = 3000
  /**
   * The laser's grids are 1.4 MB each at half a metre over 150 m, and that is as far as they are asked for. Spreading the same pixels over a
   * wider square was tried and is wrong: at two thirds of a metre the classification's colours blend at the edge of a roof, and a corner of a
   * building 17 m high and 4 m wide became a tree, twice as many trees within 100 m as at half a metre. What lies farther comes from the map.
   */
  static readonly MAX_LIDAR_RADIUS_M = 150
  /** What the height model says where the laser has not flown. */
  private static readonly NO_DATA = -9999
  private static readonly METRES_PER_DEGREE = 111320

  private readonly fetchImpl: typeof fetch
  private readonly wms: string
  private readonly wfs: string

  constructor(options: IgnGeoplatformOptions = {}) {
    // Bound, as AwsTerrariumElevationProvider's is: an unbound fetch loses the `this` it needs once called as a field.
    this.fetchImpl = options.fetchImpl ?? fetch.bind(globalThis)
    this.wms = options.wmsEndpoint ?? IgnGeoplatform.WMS
    this.wfs = options.wfsEndpoint ?? IgnGeoplatform.WFS
  }

  /** The radius asked for, held to what the map is asked for. */
  static radius(radiusM: number): number {
    return Math.min(radiusM, IgnGeoplatform.MAX_RADIUS_M)
  }

  /** The radius the laser is asked for: farther than this, a far building comes from the map, and the laser keeps its resolution for what is near. */
  static lidarRadius(radiusM: number): number {
    return Math.min(radiusM, IgnGeoplatform.MAX_LIDAR_RADIUS_M)
  }

  /**
   * The laser's grids for the square round a place. Two layers are needed, both: the height model alone gives 291 m at the Eiffel Tower
   * and 21 m for an oak, and only the classification (a picture of what each laser point was taken to be) tells a tree from a roof. Its greens
   * are the plants, and its dark red the buildings.
   *
   * A place the scan does not cover answers with a height of -9999 everywhere, which is how "no coverage" is told from "no tree".
   */
  async lidar(centre: { lat: number, lng: number }, radiusM: number): Promise<LidarGrids> {
    const radius = IgnGeoplatform.lidarRadius(radiusM)
    const size = Math.ceil(2 * radius / IgnGeoplatform.METRES_PER_PIXEL)
    const [heights, classes] = await Promise.all([
      this.raster(centre, radius, size, IgnGeoplatform.HEIGHT_LAYER),
      this.raster(centre, radius, size, IgnGeoplatform.CLASS_LAYER)
    ])
    if (heights.samples !== 1 || classes.samples < 3) throw new SurroundingsUnavailableError("unreachable", "The survey answered in a layout this does not read")
    const grid = heights.values as Float32Array
    if (grid.every(v => v === IgnGeoplatform.NO_DATA)) throw new SurroundingsUnavailableError("no-coverage", "No LiDAR HD survey here yet")
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
    return { size, metresPerPixel, heights: grid, vegetation, building, structures: new HeightGrid(grid, vegetation, building, size, metresPerPixel) }
  }

  /**
   * What the map draws round a place: the bridges, the road sections that are over the ground (which carry the width of a bridge's road), the
   * overhead electric lines and, where asked, the outlines of the buildings. Small filtered questions, each a few hundred bytes (a town's
   * buildings a few tens of kilobytes).
   */
  async vectors(centre: { lat: number, lng: number }, radiusM: number, withBuildings: boolean): Promise<PlaceVectors> {
    const radius = IgnGeoplatform.radius(radiusM)
    const dLat = radius / IgnGeoplatform.METRES_PER_DEGREE
    const dLng = radius / (IgnGeoplatform.METRES_PER_DEGREE * Math.cos(centre.lat * Math.PI / 180))
    // This service gives the axes of EPSG:4326 as longitude then latitude, the other way round from its WMS.
    const box = [centre.lng - dLng, centre.lat - dLat, centre.lng + dLng, centre.lat + dLat].map(v => v.toFixed(6)).join(",")
    const within = `BBOX(geometrie,${box},'EPSG:4326')`
    const [bridges, elevatedRoads, lines, buildings, zones] = await Promise.all([
      this.features("construction_lineaire", `${within} AND nature='Pont'`, "nature,geometrie"),
      this.features("troncon_de_route", `${within} AND position_par_rapport_au_sol<>'0'`, "nature,largeur_de_chaussee,position_par_rapport_au_sol,nom_voie_ban_gauche,nom_voie_ban_droite,cpx_toponyme_route_nommee,geometrie"),
      this.features("ligne_electrique", within, "voltage,geometrie"),
      withBuildings ? this.features("batiment", within, "hauteur,nombre_d_etages,geometrie", 2000) : Promise.resolve([]),
      // The names of the zones (a town hall, a post office, a square): a few, and a building takes the name of the one it stands in.
      withBuildings ? this.features("zone_d_activite_ou_d_interet", within, "toponyme,geometrie", 100).catch((): VectorFeature[] => []) : Promise.resolve([])
    ])
    return { bridges, elevatedRoads, lines, buildings, zones }
  }

  /** The roads of the map in a box (west, south, east, north): every section a vehicle or a rider could use, with what the map says of each. */
  async roads(box: { west: number, south: number, east: number, north: number }): Promise<VectorFeature[]> {
    const within = `BBOX(geometrie,${[box.west, box.south, box.east, box.north].map(v => v.toFixed(6)).join(",")},'EPSG:4326')`
    // Not the footpaths and the stairs (a town's outnumber its roads five to one), and not the tunnels, which are under the ground.
    return this.features("troncon_de_route",
      `${within} AND nature<>'Sentier' AND nature<>'Escalier' AND position_par_rapport_au_sol>='0'`,
      "cleabs,nature,largeur_de_chaussee,nom_voie_ban_gauche,nom_voie_ban_droite,cpx_toponyme_route_nommee,geometrie", 3000)
  }

  private async raster(centre: { lat: number, lng: number }, radiusM: number, size: number, layer: string): Promise<GeoTiffRaster> {
    const dLat = radiusM / IgnGeoplatform.METRES_PER_DEGREE
    const dLng = radiusM / (IgnGeoplatform.METRES_PER_DEGREE * Math.cos(centre.lat * Math.PI / 180))
    const query = new URLSearchParams({
      SERVICE: "WMS", VERSION: "1.3.0", REQUEST: "GetMap", LAYERS: layer, STYLES: "", CRS: "EPSG:4326",
      // WMS 1.3.0 gives the axes of EPSG:4326 in its own order: latitude first.
      BBOX: [centre.lat - dLat, centre.lng - dLng, centre.lat + dLat, centre.lng + dLng].map(v => v.toFixed(6)).join(","),
      WIDTH: String(size), HEIGHT: String(size), FORMAT: "image/geotiff"
    })
    let response: Response
    try {
      response = await this.fetchImpl(`${this.wms}?${query}`)
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

  private async features(layer: string, filter: string, properties: string, count = 200): Promise<VectorFeature[]> {
    const query = new URLSearchParams({
      SERVICE: "WFS", VERSION: "2.0.0", REQUEST: "GetFeature", TYPENAMES: `BDTOPO_V3:${layer}`, SRSNAME: "EPSG:4326",
      OUTPUTFORMAT: "application/json", COUNT: String(count), CQL_FILTER: filter, PROPERTYNAME: properties
    })
    let response: Response
    try {
      response = await this.fetchImpl(`${this.wfs}?${query}`)
    } catch (error) {
      throw new SurroundingsUnavailableError("unreachable", error instanceof Error ? error.message : String(error))
    }
    if (!response.ok) throw new SurroundingsUnavailableError("unreachable", `The map answered ${response.status}`)
    const body = await response.json() as { features?: VectorFeature[] }
    return body.features ?? []
  }
}
