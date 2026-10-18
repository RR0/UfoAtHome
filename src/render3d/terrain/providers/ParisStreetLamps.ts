import type { StreetLampSource, SurveyCredit, SurveyedLamp } from "../SurroundingsProvider.js"

/** One record of the inventory, reduced to what is asked for (see ParisStreetLamps.query). */
interface ParisLampRecord {
  geo_point_2d?: { lat: number, lon: number }
  lib_ouvrag?: string
  lampe_temperature_couleur?: string | number | null
  lampe_flux?: string | number | null
  support_hauteur?: string | number | null
}

/**
 * The public lamps of Paris, as the city keeps them: its inventory of the public lighting (« Éclairage public », opendata.paris.fr, ODbL), every
 * lamp at its surveyed place with the colour and the flux of its light and whether it stands on a column or hangs on a wall.
 *
 * Asked before the volunteers' map wherever it reaches (see OsmStreetFurniture), because it is the better account of the lamps: the map has some of
 * them, and draws the rest every so many metres along a street it says is lit, where the city lists each one it maintains (232 within 150 m of
 * Notre-Dame, against the map's 150), dated by its last update (the first of October 2026 when this was written), and says what each gives out,
 * which a lamp drawn from a street does not: a sodium lamp's orange is not an LED's white, nor a footpath's 1 600 lumens an avenue's 30 000.
 *
 * The floodlights of the inventory are left out: they light a facade or a monument from below, and a lamp drawn on a column would put their light
 * where it is not. Several lamps of one column are one lamp of their summed flux, as they are seen from a distance.
 */
export class ParisStreetLamps implements StreetLampSource {
  readonly credit: SurveyCredit = { name: "Ville de Paris, Éclairage public", url: "https://opendata.paris.fr/explore/dataset/eclairage-public/", licence: "ODbL", of: "lamps" }
  /** The city's territory, the two woods included: a box, which is all `covers` needs to say whether asking is worth it. */
  private static readonly BOUNDS = { south: 48.8156, north: 48.9022, west: 2.2241, east: 2.4698 }
  private static readonly ENDPOINT = "https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/eclairage-public/records"
  /** The most records a page of the service gives, the most lamps kept (OsmStreetLamps keeps as many of the map's), and the most pages asked for
   * them: the heads of one column are records of their own, and 150 records round Notre-Dame were 73 columns. */
  private static readonly PAGE = 100
  static readonly MAX = 150
  private static readonly MAX_PAGES = 4
  private static readonly METRES_PER_DEGREE = 111320
  /** Lamps nearer than this to each other are the heads of one column. */
  private static readonly SAME_COLUMN_M = 0.5
  /** What a lamp's height is taken from: a figure under this is no height (the inventory writes 0 for "unknown"). */
  private static readonly MIN_HEIGHT_M = 2

  private readonly fetchImpl: typeof fetch

  constructor(fetchImpl?: typeof fetch) {
    this.fetchImpl = fetchImpl ?? fetch.bind(globalThis)
  }

  covers(lat: number, lng: number): boolean {
    const box = ParisStreetLamps.BOUNDS
    return lat >= box.south && lat <= box.north && lng >= box.west && lng <= box.east
  }

  async lampsNear(centre: { lat: number, lng: number }, radiusM: number): Promise<SurveyedLamp[]> {
    const records: ParisLampRecord[] = []
    let lamps: SurveyedLamp[] = []
    for (let page = 0; page < ParisStreetLamps.MAX_PAGES && lamps.length < ParisStreetLamps.MAX; page++) {
      const response = await this.fetchImpl(ParisStreetLamps.query(centre, radiusM, ParisStreetLamps.PAGE, page * ParisStreetLamps.PAGE))
      if (!response.ok) throw new Error(`opendata.paris.fr refused (${response.status})`)
      const results = ((await response.json()) as { results?: ParisLampRecord[] }).results ?? []
      records.push(...results)
      lamps = ParisStreetLamps.lampsFrom(records, centre)
      if (results.length < ParisStreetLamps.PAGE) break
    }
    return lamps.slice(0, ParisStreetLamps.MAX)
  }

  /** The address of one page of the lamps nearest the centre within the radius, nearest first. */
  static query(centre: { lat: number, lng: number }, radiusM: number, limit: number, offset: number): string {
    const point = `geom'POINT(${centre.lng.toFixed(6)} ${centre.lat.toFixed(6)})'`
    const parameters = new URLSearchParams({
      select: "geo_point_2d,lib_ouvrag,lampe_temperature_couleur,lampe_flux,support_hauteur",
      where: `within_distance(geo_point_2d,${point},${Math.round(radiusM)}m)`,
      order_by: `distance(geo_point_2d,${point})`,
      limit: String(limit),
      offset: String(offset)
    })
    return `${ParisStreetLamps.ENDPOINT}?${parameters}`
  }

  /** The inventory's records as lamps, in metres from the centre, nearest first: the floodlights out, the heads of one column one lamp. */
  static lampsFrom(records: readonly ParisLampRecord[], centre: { lat: number, lng: number }): SurveyedLamp[] {
    const cosine = Math.cos(centre.lat * Math.PI / 180)
    const number = (value: string | number | null | undefined): number | undefined => {
      const parsed = typeof value === "number" ? value : Number.parseFloat(value ?? "")
      return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
    }
    const lamps: SurveyedLamp[] = []
    for (const record of records) {
      const point = record.geo_point_2d
      if (!point || record.lib_ouvrag === "Projecteur") continue
      const eastM = Math.round((point.lon - centre.lng) * ParisStreetLamps.METRES_PER_DEGREE * cosine * 10) / 10
      const northM = Math.round((point.lat - centre.lat) * ParisStreetLamps.METRES_PER_DEGREE * 10) / 10
      const lumens = number(record.lampe_flux)
      const column = lamps.find(lamp => Math.hypot(lamp.eastM - eastM, lamp.northM - northM) < ParisStreetLamps.SAME_COLUMN_M)
      if (column) {
        if (lumens !== undefined) column.lumens = (column.lumens ?? 0) + lumens
        continue
      }
      const kelvins = number(record.lampe_temperature_couleur)
      const height = number(record.support_hauteur)
      lamps.push({
        eastM, northM,
        ...(height !== undefined && height >= ParisStreetLamps.MIN_HEIGHT_M ? { heightM: height } : {}),
        ...(kelvins !== undefined ? { colorTemperatureK: kelvins } : {}),
        ...(lumens !== undefined ? { lumens } : {}),
        ...(record.lib_ouvrag === "Console" ? { mount: "wall" as const } : {})
      })
    }
    return lamps
  }
}
