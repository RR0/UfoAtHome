import { TrafficSignals } from "../../../engine/model/LightRig.js"
import type { RoadProvider, RoadWay } from "../RoadProvider.js"
import type { StreetSignalSource, SurveyCredit, SurveyedSignal } from "../SurroundingsProvider.js"

/** One record of the inventory, reduced to what is asked for (see ParisTrafficSignals.query). */
interface ParisLensRecord {
  geo_point_2d?: { lat: number, lon: number }
  lib_regime?: string | null
}

type Metres = [number, number]

/** A post of the inventory: where it stands, and the lenses it carries. */
interface Post {
  at: Metres
  vehicles: number
  pedestrians: number
}

/**
 * The traffic lights of Paris, as the city keeps them: its inventory of its light signals (« Signalisation lumineuse tricolore », opendata.paris.fr,
 * ODbL), every lens of every post at the post's surveyed place, with what it shows: red, amber or green for the traffic, « attendez » and
 * « passez » for the pedestrians.
 *
 * The inventory says where a post stands and what it carries, not which way its heads look. That is read from the road it stands at, which the
 * IGN's map gives (see IgnTopoRoadProvider, which does not depend on the volunteers' map either): the traffic's head looks back along the
 * carriageway nearest the post at the traffic coming on the post's side, or the only way it comes on a one-way street; the pedestrian's looks
 * across that carriageway, at whoever waits on the other kerb. A post with both carries the pedestrian's a little along the kerb from the
 * traffic's, as the two heads of one post are seen. A post further than SEARCH_M from any carriageway is not oriented, and is left out.
 *
 * One head of each kind per post: the repeaters of a post (a second red, a second green) are the same head seen from elsewhere.
 */
export class ParisTrafficSignals implements StreetSignalSource {
  readonly credit: SurveyCredit = { name: "Ville de Paris, Signalisation lumineuse tricolore", url: "https://opendata.paris.fr/explore/dataset/signalisation-tricolore/", licence: "ODbL", of: "signals" }
  private static readonly BOUNDS = { south: 48.8156, north: 48.9022, west: 2.2241, east: 2.4698 }
  private static readonly ENDPOINT = "https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/signalisation-tricolore/records"
  private static readonly PAGE = 100
  /** Some five lenses to a post: five pages are a hundred posts, which is more than a scene of a few hundred metres holds. */
  private static readonly MAX_PAGES = 5
  /** More than this many heads and a scene is a forest of posts: the nearest are kept (as OsmStreetFurniture does). */
  static readonly MAX = 160
  private static readonly METRES_PER_DEGREE = 111320
  /** Lenses nearer than this to each other are on one post. */
  private static readonly SAME_POST_M = 0.8
  /** How far from its carriageway a post may stand and still be read as standing at it. */
  static readonly SEARCH_M = 15
  /** How far along the kerb a pedestrian's head stands from the traffic's head of the same post. */
  private static readonly PEDESTRIAN_ALONG_M = 0.4

  private readonly fetchImpl: typeof fetch

  constructor(private readonly roads: RoadProvider, fetchImpl?: typeof fetch) {
    this.fetchImpl = fetchImpl ?? fetch.bind(globalThis)
  }

  covers(lat: number, lng: number): boolean {
    const box = ParisTrafficSignals.BOUNDS
    return lat >= box.south && lat <= box.north && lng >= box.west && lng <= box.east
  }

  async signalsNear(centre: { lat: number, lng: number }, radiusM: number): Promise<SurveyedSignal[]> {
    const dLat = (radiusM + ParisTrafficSignals.SEARCH_M) / ParisTrafficSignals.METRES_PER_DEGREE
    const dLng = dLat / Math.cos(centre.lat * Math.PI / 180)
    const [records, ways] = await Promise.all([
      this.lenses(centre, radiusM),
      this.roads.getRoads({ south: centre.lat - dLat, north: centre.lat + dLat, west: centre.lng - dLng, east: centre.lng + dLng })
    ])
    return ParisTrafficSignals.signalsFrom(records, ways, centre)
  }

  private async lenses(centre: { lat: number, lng: number }, radiusM: number): Promise<ParisLensRecord[]> {
    const records: ParisLensRecord[] = []
    for (let page = 0; page < ParisTrafficSignals.MAX_PAGES; page++) {
      const response = await this.fetchImpl(ParisTrafficSignals.query(centre, radiusM, ParisTrafficSignals.PAGE, page * ParisTrafficSignals.PAGE))
      if (!response.ok) throw new Error(`opendata.paris.fr refused (${response.status})`)
      const results = ((await response.json()) as { results?: ParisLensRecord[] }).results ?? []
      records.push(...results)
      if (results.length < ParisTrafficSignals.PAGE) break
    }
    return records
  }

  /** The address of one page of the lenses nearest the centre within the radius, nearest first. */
  static query(centre: { lat: number, lng: number }, radiusM: number, limit: number, offset: number): string {
    const point = `geom'POINT(${centre.lng.toFixed(6)} ${centre.lat.toFixed(6)})'`
    const parameters = new URLSearchParams({
      select: "geo_point_2d,lib_regime",
      where: `within_distance(geo_point_2d,${point},${Math.round(radiusM)}m)`,
      order_by: `distance(geo_point_2d,${point})`,
      limit: String(limit),
      offset: String(offset)
    })
    return `${ParisTrafficSignals.ENDPOINT}?${parameters}`
  }

  /** The lenses as heads on their posts, each looking at whom it stops (see the class), in metres from the centre, nearest first. */
  static signalsFrom(records: readonly ParisLensRecord[], ways: readonly RoadWay[], centre: { lat: number, lng: number }): SurveyedSignal[] {
    const cosine = Math.cos(centre.lat * Math.PI / 180)
    const toMetres = (lat: number, lng: number): Metres =>
      [(lng - centre.lng) * ParisTrafficSignals.METRES_PER_DEGREE * cosine, (lat - centre.lat) * ParisTrafficSignals.METRES_PER_DEGREE]
    const posts: Post[] = []
    for (const record of records) {
      if (!record.geo_point_2d) continue
      const at = toMetres(record.geo_point_2d.lat, record.geo_point_2d.lon)
      const regime = (record.lib_regime ?? "").toUpperCase()
      const vehicle = /ROUGE|JAUNE|VERT/.test(regime)
      const pedestrian = /PASSEZ|ATTENDEZ/.test(regime)
      if (!vehicle && !pedestrian) continue
      let post = posts.find(other => Math.hypot(other.at[0] - at[0], other.at[1] - at[1]) < ParisTrafficSignals.SAME_POST_M)
      if (!post) posts.push(post = { at, vehicles: 0, pedestrians: 0 })
      if (vehicle) post.vehicles++
      if (pedestrian) post.pedestrians++
    }
    const roads = ways.map(way => ({ way, points: way.points.map(point => toMetres(point.lat, point.lng)) }))
    const signals: SurveyedSignal[] = []
    for (const post of posts) {
      const near = ParisTrafficSignals.nearestRoad(post.at, roads)
      if (!near) continue
      const [ux, uy] = near.unit
      const roadHeading = ParisTrafficSignals.heading(near.unit)
      // Which side of the carriageway's line the post stands on: to the right of its direction (uy, -ux), the traffic that goes that way.
      const right = (post.at[0] - near.foot[0]) * uy - (post.at[1] - near.foot[1]) * ux >= 0
      const direction = near.way.direction
      const travel = direction === "forward" ? roadHeading : direction === "backward" ? (roadHeading + 180) % 360 : right ? roadHeading : (roadHeading + 180) % 360
      const round = (value: number) => Math.round(value * 10) / 10
      const turned = (degrees: number) => round(((degrees % 360) + 360) % 360)
      if (post.vehicles > 0) {
        signals.push({ eastM: round(post.at[0]), northM: round(post.at[1]), headingDeg: turned(travel + 180), for: "vehicles", phase: TrafficSignals.phaseOf(travel) })
      }
      if (post.pedestrians > 0) {
        const across = ParisTrafficSignals.heading([near.foot[0] - post.at[0], near.foot[1] - post.at[1]])
        const along = post.vehicles > 0 ? ParisTrafficSignals.PEDESTRIAN_ALONG_M : 0
        signals.push({
          eastM: round(post.at[0] + ux * along), northM: round(post.at[1] + uy * along),
          headingDeg: turned(Number.isNaN(across) ? roadHeading + 90 : across), for: "pedestrians", phase: TrafficSignals.phaseOf(roadHeading)
        })
      }
    }
    return signals
      .sort((a, b) => Math.hypot(a.eastM, a.northM) - Math.hypot(b.eastM, b.northM))
      .slice(0, ParisTrafficSignals.MAX)
  }

  /** The carriageway segment nearest a point within SEARCH_M: its way, its direction there and the foot of the perpendicular from the point. */
  private static nearestRoad(at: Metres, roads: readonly { way: RoadWay, points: Metres[] }[]): { way: RoadWay, unit: Metres, foot: Metres } | undefined {
    let best: { way: RoadWay, unit: Metres, foot: Metres, distance: number } | undefined
    for (const { way, points } of roads) {
      for (let i = 1; i < points.length; i++) {
        const [x0, y0] = points[i - 1]
        const [x1, y1] = points[i]
        const length = Math.hypot(x1 - x0, y1 - y0)
        if (length === 0) continue
        const unit: Metres = [(x1 - x0) / length, (y1 - y0) / length]
        const along = Math.max(0, Math.min(length, (at[0] - x0) * unit[0] + (at[1] - y0) * unit[1]))
        const foot: Metres = [x0 + unit[0] * along, y0 + unit[1] * along]
        const distance = Math.hypot(at[0] - foot[0], at[1] - foot[1])
        if (distance <= ParisTrafficSignals.SEARCH_M && (!best || distance < best.distance)) best = { way, unit, foot, distance }
      }
    }
    return best
  }

  /** Degrees clockwise from north of a direction east and north; NaN for none (a post standing on the line of its road). */
  private static heading([east, north]: Metres): number {
    if (east === 0 && north === 0) return Number.NaN
    return Math.round(((Math.atan2(east, north) * 180 / Math.PI) + 360) % 360 * 10) / 10
  }
}
