import type { Surroundings, SurveyedCrossing, SurveyedSign, SurveyedSignal } from "../SurroundingsProvider.js"
import { TrafficSignals } from "../../../engine/model/LightRig.js"
import { OverpassClient } from "./OverpassClient.js"
import type { OverpassClientOptions, OverpassResponse } from "./OverpassClient.js"
import { OverpassRoadProvider } from "./OverpassRoadProvider.js"
import { OsmStreetLamps } from "./OsmStreetLamps.js"

/** What stands in a street and is neither a building nor a tree: its lamps, its traffic lights, its painted crossings and its signs. */
export type StreetFurniture = Pick<Surroundings, "lamps" | "signals" | "crossings" | "signs" | "incomplete">

type Element = NonNullable<OverpassResponse["elements"]>[number]
type Metres = [number, number]

/** A road a node of the map stands on, and where on it. */
interface OnRoad {
  way: Element
  points: Metres[]
  index: number
}

/** One way of reaching a node along a road: the direction of travel, as a unit vector east and north, and the road. */
interface Approach {
  unit: Metres
  road: OnRoad
}

/**
 * The furniture of the streets round a place, as OpenStreetMap's volunteers have mapped it, in one question to Overpass: the lamps (see
 * OsmStreetLamps), the traffic lights, the painted pedestrian crossings and the road signs.
 *
 * The map puts a traffic light, a crossing or a stop sign ON the road, as a node of its line, where the real one stands at the kerb: what is
 * drawn here is the post where it stands, a kerb off the road's edge on the right of the traffic it faces, the road's width and direction read
 * from the road the node is on (which the same question brings). A light that the map does not say the direction of serves both ways of its
 * road, and each road of a junction it stands at; a sign that the map does not say the direction of faces the traffic coming to the end of the
 * road nearer to it, which is where the junction it guards is. A pedestrian's light is a head at each end of its crossing, looking across.
 *
 * Patchy as the lamps are, and for the same reason: an empty answer says nothing of the lights there are. What is mapped is a suggestion for the
 * author to keep, move or remove, as every object of a survey is.
 */
export class OsmStreetFurniture {
  private static readonly METRES_PER_DEGREE = 111320
  /** How far outside the edge of the road a post stands. */
  private static readonly KERB_OFFSET_M = 0.6
  /** How far before the node of the map the head of a light stands, toward the traffic it stops: the stop line is a little before it. */
  private static readonly SETBACK_M = 0.5
  /** The narrowest and widest crossing a footway's line makes. */
  private static readonly MIN_CROSSING_M = 3
  private static readonly MAX_CROSSING_M = 30
  /** Two crossings nearer than this are the same one, mapped as a node and as a line. */
  private static readonly SAME_CROSSING_M = 5
  /** Two heads nearer than this, facing within this angle of each other, are the same head mapped twice. */
  private static readonly SAME_HEAD_M = 2.5
  private static readonly SAME_HEAD_DEG = 45
  /** More than this many of each and a scene is a forest of posts: the nearest are kept. */
  private static readonly MAX_SIGNALS = 160
  private static readonly MAX_CROSSINGS = 150
  private static readonly MAX_SIGNS = 100
  /** What the map draws on a road and is not a road: the paths a pedestrian takes, which a crossing node is on too. */
  private static readonly ROADS = new Set([...OverpassRoadProvider.DRIVABLE, "living_street", "busway", "road"])
  private static readonly ON_ROAD = "^(traffic_signals|crossing|stop|give_way)$"

  private readonly client: OverpassClient

  constructor(options: OverpassClientOptions = {}) {
    this.client = new OverpassClient(options)
  }

  /** The day the volunteers' map was asked, which is the day it is as of. */
  static today(): string {
    return new Date().toISOString().slice(0, 10)
  }

  /**
   * What a survey that waits for `furniture` lacked when it answered without it (see SurroundingsProvider.later): the furniture once Overpass
   * answers, dated as the volunteers' map is. Undefined for a survey given none.
   */
  static later(furniture: OsmStreetFurniture | undefined, centre: { lat: number, lng: number }, radiusM: number): Promise<Partial<Surroundings>> | undefined {
    return furniture?.answered(centre, radiusM).then(found => ({ ...found, ...(OsmStreetFurniture.found(found) ? { dates: { lamps: OsmStreetFurniture.today() } } : {}) }))
  }

  /** Whether an answer found anything at all: what dates it. */
  static found(furniture: StreetFurniture | undefined): boolean {
    return Boolean(furniture?.lamps?.length || furniture?.signals?.length || furniture?.crossings?.length || furniture?.signs?.length)
  }

  /** The question, for the square round a place: everything at once, then the roads the furniture stands on, so that it can be put at their kerbs. */
  static query(box: string): string {
    const onRoad = OsmStreetFurniture.ON_ROAD
    return `[out:json][timeout:25];(node["highway"="street_lamp"](${box});way["highway"]["lit"="yes"](${box});node["highway"~"${onRoad}"](${box});`
      + `node["traffic_sign"](${box});way["footway"="crossing"](${box}););out geom;`
      + `(node._["highway"~"${onRoad}"];node._["traffic_sign"];)->.kerb;way(bn.kerb)["highway"];out geom;`
  }

  /**
   * The questions of this page still on their way, or answered after the survey stopped waiting for them, by the square asked about: the answer
   * Overpass gives in forty seconds on a busy day is the answer of the next survey of the same place, which asks for nothing again.
   */
  private static readonly pending = new Map<string, Promise<OverpassResponse | undefined>>()

  async near(centre: { lat: number, lng: number }, radiusM: number): Promise<StreetFurniture> {
    const asked = this.ask(OsmStreetFurniture.boxOf(centre, radiusM))
    // The furniture never holds up the rest of a survey: an instance that does not answer is waited for a few seconds, not until its own timeout.
    let timer: ReturnType<typeof setTimeout> | undefined
    const late = Symbol("late")
    const patience = new Promise<typeof late>(resolve => { timer = setTimeout(() => resolve(late), OsmStreetLamps.PATIENCE_MS) })
    try {
      const answer = await Promise.race([asked, patience])
      // Late or refused, it is not that the streets have nothing: the survey says it is not whole, and is not kept as the place's answer.
      if (answer === late || answer === undefined) return { incomplete: true }
      return OsmStreetFurniture.from(answer, centre, radiusM)
    } finally {
      clearTimeout(timer)
    }
  }

  /**
   * How long the furniture is waited for again after Overpass failed, try after try, while the page is open: every instance down is an outage of
   * minutes to hours (2026-10-19: all five answering 5xx or nothing for an evening), and asking every few seconds would be no help to them.
   */
  static readonly RETRY_DELAYS_MS: readonly number[] = [15000, 60000, 180000, 600000]

  /**
   * The furniture round a place once Overpass answers, however late: the question already on its way is waited for, and one that failed is asked
   * again after each of RETRY_DELAYS_MS. Fails when the last try has, which is "not for now": calling it again starts over.
   */
  async answered(centre: { lat: number, lng: number }, radiusM: number): Promise<StreetFurniture> {
    const box = OsmStreetFurniture.boxOf(centre, radiusM)
    for (let attempt = 0; ; attempt++) {
      const answer = await this.ask(box)
      if (answer) return OsmStreetFurniture.from(answer, centre, radiusM)
      if (attempt >= OsmStreetFurniture.RETRY_DELAYS_MS.length) throw new Error("Overpass did not answer")
      await new Promise(resolve => setTimeout(resolve, OsmStreetFurniture.RETRY_DELAYS_MS[attempt]))
    }
  }

  /** The question about a square, the one already on its way if there is one (see pending): undefined when it failed. */
  private ask(box: string): Promise<OverpassResponse | undefined> {
    let asked = OsmStreetFurniture.pending.get(box)
    if (!asked) {
      // A failure is forgotten, so that the next survey asks again; an answer is kept for as long as the page.
      asked = this.client.query(OsmStreetFurniture.query(box)).catch(() => {
        OsmStreetFurniture.pending.delete(box)
        return undefined
      })
      OsmStreetFurniture.pending.set(box, asked)
    }
    return asked
  }

  /** The square round a place, as Overpass is asked about it. */
  private static boxOf(centre: { lat: number, lng: number }, radiusM: number): string {
    const dLat = radiusM / OsmStreetFurniture.METRES_PER_DEGREE
    const dLng = radiusM / (OsmStreetFurniture.METRES_PER_DEGREE * Math.cos(centre.lat * Math.PI / 180))
    return [centre.lat - dLat, centre.lng - dLng, centre.lat + dLat, centre.lng + dLng].map(v => v.toFixed(6)).join(",")
  }

  /** Forgets the answers of this page. For tests. */
  static forget(): void {
    OsmStreetFurniture.pending.clear()
  }

  /** One Overpass answer as the furniture of the streets, each kind nearest first, inside the circle only. Absent kinds are none. */
  static from(body: OverpassResponse, centre: { lat: number, lng: number }, radiusM: number): StreetFurniture {
    const lamps = OsmStreetLamps.lampsFrom(body, centre, radiusM)
    const cosine = Math.cos(centre.lat * Math.PI / 180)
    const toMetres = (lat: number, lon: number): Metres =>
      [(lon - centre.lng) * OsmStreetFurniture.METRES_PER_DEGREE * cosine, (lat - centre.lat) * OsmStreetFurniture.METRES_PER_DEGREE]
    const keyOf = (lat: number, lon: number) => `${lat.toFixed(7)},${lon.toFixed(7)}`
    const roadsAt = new Map<string, OnRoad[]>()
    const seen = new Set<number>()
    const crossingWays: Element[] = []
    const nodes: Element[] = []
    for (const element of body.elements ?? []) {
      if (element.type === "node") {
        if (typeof element.lat === "number" && typeof element.lon === "number") nodes.push(element)
        continue
      }
      if (element.type !== "way" || !element.geometry || element.geometry.length < 2) continue
      if (element.id !== undefined) {
        if (seen.has(element.id)) continue
        seen.add(element.id)
      }
      const tags = element.tags ?? {}
      if (tags.footway === "crossing") crossingWays.push(element)
      if (!OsmStreetFurniture.ROADS.has(tags.highway ?? "")) continue
      const points = element.geometry.map(point => toMetres(point.lat, point.lon))
      element.geometry.forEach((point, index) => {
        const key = keyOf(point.lat, point.lon)
        roadsAt.set(key, [...(roadsAt.get(key) ?? []), { way: element, points, index }])
      })
    }
    const signals: SurveyedSignal[] = []
    const crossings: SurveyedCrossing[] = []
    const signs: SurveyedSign[] = []
    const nodeIds = new Set<number>()
    for (const node of nodes) {
      if (node.id !== undefined) {
        if (nodeIds.has(node.id)) continue
        nodeIds.add(node.id)
      }
      const tags = node.tags ?? {}
      const at = toMetres(node.lat!, node.lon!)
      const roads = roadsAt.get(keyOf(node.lat!, node.lon!)) ?? []
      const highway = tags.highway
      if (highway === "traffic_signals") {
        for (const approach of OsmStreetFurniture.approaches(roads, OsmStreetFurniture.directionOf(tags), false)) {
          signals.push(OsmStreetFurniture.head(at, approach, "vehicles"))
        }
      }
      // A crossing, or a light the map has made one node with the crossing it guards.
      if (highway === "crossing" || (highway === "traffic_signals" && tags.crossing !== undefined)) {
        const road = roads[0]
        if (road && OsmStreetFurniture.marked(tags)) {
          const unit = OsmStreetFurniture.directionAt(road)
          if (unit) crossings.push({ eastM: OsmStreetFurniture.round(at[0]), northM: OsmStreetFurniture.round(at[1]), headingDeg: OsmStreetFurniture.heading(unit), widthM: OverpassRoadProvider.widthOf(road.way.tags ?? {}) })
          if (unit && (tags.crossing === "traffic_signals" || tags["crossing:signals"] === "yes")) signals.push(...OsmStreetFurniture.pedestrianHeads(at, unit, road))
        }
      }
      if (highway === "traffic_signals") continue
      const face = highway === "stop" ? { face: "stop" as const } : highway === "give_way" ? { face: "give-way" as const } : OsmStreetFurniture.faceOf(tags)
      if (!face) continue
      const code = tags.traffic_sign ? { code: tags.traffic_sign } : {}
      if (roads.length > 0) {
        // On the road: at its right kerb, before the node, facing the traffic it is for.
        const approach = OsmStreetFurniture.approaches(roads, OsmStreetFurniture.directionOf(tags), true)[0]
        if (approach) {
          const head = OsmStreetFurniture.head(at, approach, "vehicles")
          signs.push({ eastM: head.eastM, northM: head.northM, headingDeg: head.headingDeg, ...face, ...code })
        }
        continue
      }
      // Beside the road, where the map says which way it faces: its `direction` is the way of the traffic that reads it.
      const facing = OsmStreetFurniture.compassOf(tags.direction)
      if (facing !== undefined) signs.push({ eastM: OsmStreetFurniture.round(at[0]), northM: OsmStreetFurniture.round(at[1]), headingDeg: (facing + 180) % 360, ...face, ...code })
    }
    for (const way of crossingWays) {
      const crossing = OsmStreetFurniture.crossingAlong(way, toMetres)
      if (crossing && !crossings.some(other => Math.hypot(other.eastM - crossing.eastM, other.northM - crossing.northM) < OsmStreetFurniture.SAME_CROSSING_M)) crossings.push(crossing)
    }
    const unique = signals.filter((signal, index) => !signals.slice(0, index).some(other => other.for === signal.for
      && Math.hypot(other.eastM - signal.eastM, other.northM - signal.northM) < OsmStreetFurniture.SAME_HEAD_M
      && Math.abs(((other.headingDeg - signal.headingDeg + 540) % 360) - 180) < OsmStreetFurniture.SAME_HEAD_DEG))
    const nearest = <T extends { eastM: number, northM: number }>(objects: T[], max: number): T[] => objects
      .filter(object => Math.hypot(object.eastM, object.northM) <= radiusM)
      .sort((a, b) => Math.hypot(a.eastM, a.northM) - Math.hypot(b.eastM, b.northM))
      .slice(0, max)
    const found: StreetFurniture = {}
    if (lamps.length > 0) found.lamps = lamps
    const kept = { signals: nearest(unique, OsmStreetFurniture.MAX_SIGNALS), crossings: nearest(crossings, OsmStreetFurniture.MAX_CROSSINGS), signs: nearest(signs, OsmStreetFurniture.MAX_SIGNS) }
    if (kept.signals.length > 0) found.signals = kept.signals
    if (kept.crossings.length > 0) found.crossings = kept.crossings
    if (kept.signs.length > 0) found.signs = kept.signs
    return found
  }

  /**
   * The ways of reaching a node along the roads it is on: along each road from the point before it and from the point after it, as far as the road
   * is open that way, and as far as the map's own `direction` (forward or backward of the one road it is on) narrows it. `toJunction` keeps the one
   * that comes to the end of the road nearer to the node, for a sign the map does not say the direction of.
   */
  private static approaches(roads: OnRoad[], direction: "forward" | "backward" | undefined, toJunction: boolean): Approach[] {
    const found: { approach: Approach, toEndM: number, forward: boolean }[] = []
    for (const road of roads) {
      const tags = road.way.tags ?? {}
      const oneWay = tags.oneway === "yes" || tags.oneway === "true" || tags.oneway === "1" || tags.junction === "roundabout" || tags.highway === "motorway"
      const against = tags.oneway === "-1"
      const { points, index } = road
      const lengthTo = (from: number, to: number): number => {
        let sum = 0
        for (let k = Math.min(from, to); k < Math.max(from, to); k++) sum += Math.hypot(points[k + 1][0] - points[k][0], points[k + 1][1] - points[k][1])
        return sum
      }
      const unitFrom = (other: number): Metres | undefined => {
        const dx = points[index][0] - points[other][0]
        const dy = points[index][1] - points[other][1]
        const length = Math.hypot(dx, dy)
        return length > 0 ? [dx / length, dy / length] : undefined
      }
      if (index > 0 && !against) {
        const unit = unitFrom(index - 1)
        if (unit) found.push({ approach: { unit, road }, toEndM: lengthTo(index, points.length - 1), forward: true })
      }
      if (index < points.length - 1 && !oneWay) {
        const unit = unitFrom(index + 1)
        if (unit) found.push({ approach: { unit, road }, toEndM: lengthTo(0, index), forward: false })
      }
    }
    const directed = direction !== undefined && roads.length === 1 ? found.filter(one => one.forward === (direction === "forward")) : found
    if (!toJunction || directed.length <= 1) return directed.map(one => one.approach)
    return [directed.reduce((best, one) => one.toEndM < best.toEndM ? one : best).approach]
  }

  /** The head of a light (or a sign) for the traffic of one approach: at the kerb on its right, a little before the node, looking back at it. */
  private static head(at: Metres, approach: Approach, kind: SurveyedSignal["for"]): SurveyedSignal {
    const [ux, uy] = approach.unit
    const out = OverpassRoadProvider.widthOf(approach.road.way.tags ?? {}) / 2 + OsmStreetFurniture.KERB_OFFSET_M
    const back = OsmStreetFurniture.SETBACK_M
    const heading = OsmStreetFurniture.heading(approach.unit)
    return {
      // The right of a direction (ux, uy) east and north is (uy, -ux).
      eastM: OsmStreetFurniture.round(at[0] - ux * back + uy * out),
      northM: OsmStreetFurniture.round(at[1] - uy * back - ux * out),
      headingDeg: (heading + 180) % 360,
      for: kind,
      phase: TrafficSignals.phaseOf(heading)
    }
  }

  /** The two heads of a crossing with lights, one at each kerb, each looking across the road at whoever waits on the other side. */
  private static pedestrianHeads(at: Metres, unit: Metres, road: OnRoad): SurveyedSignal[] {
    const out = OverpassRoadProvider.widthOf(road.way.tags ?? {}) / 2 + OsmStreetFurniture.KERB_OFFSET_M
    const roadHeading = OsmStreetFurniture.heading(unit)
    const phase = TrafficSignals.phaseOf(roadHeading)
    return [1, -1].map(side => ({
      eastM: OsmStreetFurniture.round(at[0] + unit[1] * out * side),
      northM: OsmStreetFurniture.round(at[1] - unit[0] * out * side),
      // On the right of the road, looking left of it, and the other way round.
      headingDeg: (roadHeading + (side === 1 ? 270 : 90)) % 360,
      for: "pedestrians" as const,
      phase
    }))
  }

  /** A crossing the map draws as the footway's line across the road: at its middle, as wide as the line is long, the road across it. */
  private static crossingAlong(way: Element, toMetres: (lat: number, lon: number) => Metres): SurveyedCrossing | undefined {
    if (!OsmStreetFurniture.marked(way.tags ?? {})) return undefined
    const points = way.geometry!.map(point => toMetres(point.lat, point.lon))
    const [x0, y0] = points[0]
    const [x1, y1] = points[points.length - 1]
    const length = Math.hypot(x1 - x0, y1 - y0)
    if (length < OsmStreetFurniture.MIN_CROSSING_M) return undefined
    return {
      eastM: OsmStreetFurniture.round((x0 + x1) / 2),
      northM: OsmStreetFurniture.round((y0 + y1) / 2),
      headingDeg: (OsmStreetFurniture.heading([(x1 - x0) / length, (y1 - y0) / length]) + 90) % 360,
      widthM: Math.round(Math.min(length, OsmStreetFurniture.MAX_CROSSING_M) * 10) / 10
    }
  }

  /** Whether a crossing is painted: the map says so, or says nothing (most crossings of a town are), and not that it is unmarked. */
  private static marked(tags: Record<string, string>): boolean {
    const crossing = tags.crossing
    return crossing !== "unmarked" && crossing !== "no" && crossing !== "informal" && tags["crossing:markings"] !== "no"
  }

  /** The direction of the road at a node of it: along the segment after it, else the one before. */
  private static directionAt(road: OnRoad): Metres | undefined {
    const { points, index } = road
    const [a, b] = index < points.length - 1 ? [points[index], points[index + 1]] : [points[index - 1], points[index]]
    const length = Math.hypot(b[0] - a[0], b[1] - a[1])
    return length > 0 ? [(b[0] - a[0]) / length, (b[1] - a[1]) / length] : undefined
  }

  /** The map's `direction` of a light or a sign on a road, where it is forward or backward of the road's line. */
  private static directionOf(tags: Record<string, string>): "forward" | "backward" | undefined {
    const stated = tags["traffic_signals:direction"] ?? tags["traffic_sign:direction"] ?? tags.direction
    return stated === "forward" || stated === "backward" ? stated : undefined
  }

  /** A `direction` that is a compass bearing: degrees, or the points of the compass ("NE"). */
  private static compassOf(stated: string | undefined): number | undefined {
    if (stated === undefined) return undefined
    const degrees = Number.parseFloat(stated)
    if (Number.isFinite(degrees) && /^\s*-?\d/.test(stated)) return ((degrees % 360) + 360) % 360
    const points = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"]
    const at = points.indexOf(stated.trim().toUpperCase())
    return at < 0 ? undefined : at * 22.5
  }

  /**
   * What the face of a sign says, from the map's `traffic_sign` (several codes, separated, for the plates of one post): a stop, a give way, a
   * speed limit, by their names or their codes in the countries this serves; anything else is a sign whose face is not drawn.
   */
  static faceOf(tags: Record<string, string>): Pick<SurveyedSign, "face" | "value"> | undefined {
    const stated = tags.traffic_sign
    if (!stated || stated === "no" || stated === "none") return undefined
    const codes = stated.split(/[;,]/).map(code => code.trim())
    if (codes.some(code => /stop|:AB4\b|:206\b|:R1-1\b|:B2\b/i.test(code))) return { face: "stop" }
    if (codes.some(code => /give_way|yield|:AB3a\b|:205\b|:R1-2\b|:B1\b/i.test(code))) return { face: "give-way" }
    for (const code of codes) {
      const limit = /maxspeed|:B14\b|:274\b|:C14\b|:R2-1\b/i.test(code) ? Number.parseInt(/\[(\d+)\]/.exec(code)?.[1] ?? tags.maxspeed ?? "", 10) : Number.NaN
      if (Number.isFinite(limit) && limit > 0) return { face: "speed-limit", value: limit }
    }
    return { face: "other" }
  }

  /** Degrees clockwise from north of a direction east and north. */
  private static heading([east, north]: Metres): number {
    return Math.round(((Math.atan2(east, north) * 180 / Math.PI) + 360) % 360 * 10) / 10
  }

  private static round(value: number): number {
    return Math.round(value * 10) / 10
  }
}
