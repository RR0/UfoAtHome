import type { SurveyedLamp } from "../SurroundingsProvider.js"
import type { OverpassResponse } from "./OverpassClient.js"

/**
 * The public lamps round a place, as OpenStreetMap's volunteers have mapped them: each lamp mapped (`highway=street_lamp`), and, since
 * volunteers tag a street as lit far more often than they place its lamps (three lamps and eight lit streets in the centre of Saint-Lô), a lamp
 * every so many metres along each street tagged `lit=yes`, on alternate sides. Those are drawn, not surveyed: where the street is lit the lamps
 * are somewhere along it, and at about that spacing.
 *
 * The one survey that has them: a laser sees a lamp column as a pixel and a footprint is not one. OSM is patchy (a town whose mappers walked its
 * streets has every lamp, the next one has none), so an empty answer says nothing of the lamps there are, and a lamp mapped is a lamp that stood
 * on the day of the map: it is the same suggestion as the trees and the buildings of a survey, for the author to keep, move or remove.
 *
 * Asked with the rest of the furniture of the streets, in the same question (see OsmStreetFurniture).
 */
export class OsmStreetLamps {
  /** A lamp on a column is about this high where nobody wrote a height. */
  static readonly DEFAULT_HEIGHT_M = 6
  private static readonly METRES_PER_DEGREE = 111320
  /** The spacing of the lamps of a street the map only says is lit: the usual one of a town. */
  static readonly STREET_SPACING_M = 35
  /** How far outside the kerb of a road its lamps stand. */
  private static readonly KERB_OFFSET_M = 1
  /** What the width of a road is taken to be when the map gives none (see OverpassRoadProvider for the classes). */
  private static readonly DEFAULT_WIDTH_M = 5.5
  /** How long a survey waits for the furniture of the streets before it goes on without it. */
  static readonly PATIENCE_MS = 15000
  /** More than this and a scene is a forest of lamps: the nearest are kept. */
  private static readonly MAX = 150

  /** One Overpass answer as lamps, nearest first, those inside the circle only. Exposed for the build steps that freeze an answer. */
  static lampsFrom(body: OverpassResponse, centre: { lat: number, lng: number }, radiusM: number): SurveyedLamp[] {
    const lamps: SurveyedLamp[] = []
    // The answer holds the lamps among the rest of a street's furniture (see OsmStreetFurniture), and a lit road twice when a light stands on it.
    const seen = new Set<string>()
    for (const element of body.elements ?? []) {
      if (element.id !== undefined) {
        const key = `${element.type}/${element.id}`
        if (seen.has(key)) continue
        seen.add(key)
      }
      if (element.type === "way") {
        if (element.tags?.lit === "yes") OsmStreetLamps.alongStreet(element, centre, lamps)
        continue
      }
      if (element.tags?.highway !== "street_lamp" || typeof element.lat !== "number" || typeof element.lon !== "number") continue
      const eastM = (element.lon - centre.lng) * OsmStreetLamps.METRES_PER_DEGREE * Math.cos(centre.lat * Math.PI / 180)
      const northM = (element.lat - centre.lat) * OsmStreetLamps.METRES_PER_DEGREE
      if (Math.hypot(eastM, northM) > radiusM) continue
      const stated = Number.parseFloat(element.tags?.height ?? "")
      lamps.push({ eastM: Math.round(eastM * 10) / 10, northM: Math.round(northM * 10) / 10, ...(Number.isFinite(stated) && stated >= 2 && stated <= 20 ? { heightM: stated } : {}) })
    }
    const inside = lamps.filter(lamp => Math.hypot(lamp.eastM, lamp.northM) <= radiusM)
    lamps.length = 0
    lamps.push(...inside)
    lamps.sort((a, b) => Math.hypot(a.eastM, a.northM) - Math.hypot(b.eastM, b.northM))
    return lamps.slice(0, OsmStreetLamps.MAX)
  }

  /** The lamps of a street the map says is lit: one every STREET_SPACING_M along it, a kerb's width off its edge, on alternate sides. */
  private static alongStreet(way: NonNullable<OverpassResponse["elements"]>[number], centre: { lat: number, lng: number }, lamps: SurveyedLamp[]): void {
    const geometry = way.geometry
    if (!geometry || geometry.length < 2) return
    const toMetres = (point: { lat: number, lon: number }): [number, number] =>
      [(point.lon - centre.lng) * OsmStreetLamps.METRES_PER_DEGREE * Math.cos(centre.lat * Math.PI / 180), (point.lat - centre.lat) * OsmStreetLamps.METRES_PER_DEGREE]
    const points = geometry.map(toMetres)
    const stated = Number.parseFloat(way.tags?.width ?? "")
    const lanes = Number.parseInt(way.tags?.lanes ?? "", 10)
    const width = Number.isFinite(stated) && stated > 0 ? stated : (Number.isFinite(lanes) && lanes > 0 ? lanes * 3.5 : OsmStreetLamps.DEFAULT_WIDTH_M)
    const offset = width / 2 + OsmStreetLamps.KERB_OFFSET_M
    let side = 1
    let next = OsmStreetLamps.STREET_SPACING_M / 2
    let walked = 0
    for (let i = 1; i < points.length; i++) {
      const [x0, y0] = points[i - 1]
      const [x1, y1] = points[i]
      const length = Math.hypot(x1 - x0, y1 - y0)
      if (length === 0) continue
      const ux = (x1 - x0) / length
      const uy = (y1 - y0) / length
      for (; next <= walked + length; next += OsmStreetLamps.STREET_SPACING_M) {
        const along = next - walked
        lamps.push({
          eastM: Math.round((x0 + ux * along + uy * offset * side) * 10) / 10,
          northM: Math.round((y0 + uy * along - ux * offset * side) * 10) / 10
        })
        side = -side
      }
      walked += length
    }
  }
}
