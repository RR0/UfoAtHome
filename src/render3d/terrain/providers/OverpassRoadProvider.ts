import type { GeoBounds } from "../GeoBounds.js"
import { OverpassClient } from "./OverpassClient.js"
import type { OverpassResponse } from "./OverpassClient.js"
import type { RoadKind, RoadProvider, RoadSurface, RoadWay } from "../RoadProvider.js"

export interface OverpassRoadProviderOptions {
  fetchImpl?: typeof fetch
  /** Where to send the query, in order. Mainly for tests, and for pointing at one instance only. */
  endpoints?: string[]
}

export type { OverpassResponse }

/**
 * Today's road network, from OpenStreetMap through an Overpass endpoint.
 *
 * OSM is the only survey of roads that is free, worldwide, and readable straight from a browser.
 * What it is not is a survey of 1964: it says what is there now. So this provider reports itself
 * CONTEMPORARY, and everything downstream is built around that admission — see RoadProvider.
 *
 * Only ways somebody could drive are asked for. A town's footways and steps outnumber its roads
 * five to one (measured around Socorro: 589 footways against 133 residential and service roads),
 * and none of them is what a reader is looking for when they ask where the road went.
 */
export class OverpassRoadProvider implements RoadProvider {
  readonly attribution = "Roads © OpenStreetMap contributors, as surveyed today"
  readonly contemporary = true

  /** The ways asked for: everything a vehicle uses, and nothing a pedestrian does. */
  private static readonly DRIVABLE = [
    "motorway", "trunk", "primary", "secondary", "tertiary", "unclassified", "residential",
    "service", "track", "motorway_link", "trunk_link", "primary_link", "secondary_link", "tertiary_link"
  ]

  /**
   * What a road of each class is taken to be when OSM does not say — and it usually does not: of
   * 1149 ways around Socorro, 963 carry no `width` and no `surface` at all.
   *
   * These are carriageway widths, kerb to kerb, from the ordinary practice of the countries this
   * has to serve: a lane is about 3.5 m, a rural two-lane road about 7, a village street 5, a
   * service road or a ranch track one vehicle wide plus room to pass a fence post.
   */
  private static readonly WIDTH_M: Record<string, number> = {
    motorway: 11, trunk: 9, primary: 8, secondary: 7, tertiary: 6.5,
    unclassified: 5.5, residential: 5.5, service: 4, track: 3.5
  }
  private static readonly DEFAULT_WIDTH_M = 5

  private readonly client: OverpassClient

  constructor(options: OverpassRoadProviderOptions = {}) {
    this.client = new OverpassClient(options)
  }

  async getRoads(bounds: GeoBounds): Promise<RoadWay[]> {
    const box = `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`
    const query = `[out:json][timeout:30];way["highway"~"^(${OverpassRoadProvider.DRIVABLE.join("|")})$"](${box});out geom;`
    return this.waysFrom(await this.client.query(query))
  }

  /** One Overpass answer as roads — exposed so a build step can read an answer fetched by other
   * means (see scripts/build-road-archive.ts). */
  waysFrom(body: OverpassResponse): RoadWay[] {
    const ways: RoadWay[] = []
    for (const element of body.elements ?? []) {
      const geometry = element.geometry
      const tags = element.tags
      if (!tags || !geometry || geometry.length < 2) continue
      ways.push({
        id: `osm-${element.id ?? ways.length}`,
        name: tags.name,
        surface: OverpassRoadProvider.surfaceOf(tags),
        widthM: OverpassRoadProvider.widthOf(tags),
        ...OverpassRoadProvider.paintOf(tags),
        points: geometry.map(point => ({ lat: point.lat, lng: point.lon }))
      })
    }
    return ways
  }

  /**
   * What OSM says of how the road is used, for its paint (see RoadMarkings): the kind from the class of the road and the roundabout tag, the lanes, the
   * direction (a motorway is one-way where it does not say), the speed. Only what is said: a way with none of it is painted as any wide road.
   */
  private static paintOf(tags: Record<string, string>): Pick<RoadWay, "kind" | "lanes" | "direction" | "speedKmh"> {
    const highway = tags.highway ?? ""
    const roundabout = tags.junction === "roundabout" || tags.junction === "circular"
    const oneWayTag = tags.oneway
    const oneWay = oneWayTag === "yes" || oneWayTag === "1" || oneWayTag === "true" || (oneWayTag === undefined && (highway === "motorway" || roundabout))
    const backward = oneWayTag === "-1" || oneWayTag === "reverse"
    const lanes = Number.parseInt(tags.lanes ?? "", 10)
    const speed = Number.parseInt(tags.maxspeed ?? "", 10)
    const kind: RoadKind | undefined = roundabout ? "roundabout"
      : highway === "motorway" ? "motorway"
        : highway.endsWith("_link") ? "slip"
          : (highway === "trunk" || highway === "primary") && (oneWay || backward) ? "dual"
            : highway ? "road" : undefined
    return {
      ...(kind ? { kind } : {}),
      ...(Number.isFinite(lanes) && lanes > 0 ? { lanes } : {}),
      ...(oneWayTag !== undefined || highway === "motorway" || roundabout ? { direction: backward ? "backward" as const : oneWay ? "forward" as const : "both" as const } : {}),
      ...(Number.isFinite(speed) && speed > 0 ? { speedKmh: speed } : {})
    }
  }

  /** What OSM says, where it says anything; what the class implies otherwise — see WIDTH_M. */
  private static widthOf(tags: Record<string, string>): number {
    const stated = Number.parseFloat(tags.width ?? tags["est_width"] ?? "")
    if (Number.isFinite(stated) && stated > 0) return stated
    const lanes = Number.parseInt(tags.lanes ?? "", 10)
    if (Number.isFinite(lanes) && lanes > 0) return lanes * 3.5
    return OverpassRoadProvider.WIDTH_M[tags.highway] ?? OverpassRoadProvider.DEFAULT_WIDTH_M
  }

  /**
   * Paved unless something says otherwise. A `track` is the exception and the one that matters
   * here: the tag exists for exactly the kind of unsealed ranch road Zamora turned onto.
   */
  private static surfaceOf(tags: Record<string, string>): RoadSurface {
    const surface = tags.surface
    if (surface === "dirt" || surface === "earth" || surface === "mud") return "dirt"
    if (surface === "gravel" || surface === "fine_gravel" || surface === "compacted"
      || surface === "ground" || surface === "sand" || surface === "unpaved") return "gravel"
    if (surface) return "paved"
    return tags.highway === "track" ? "gravel" : "paved"
  }
}
