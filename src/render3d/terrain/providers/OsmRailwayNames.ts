import type { GeoBounds } from "../GeoBounds.js"
import { geoToLocalMeters } from "../GeoProjection.js"
import type { RailwayLine } from "../RailwayProvider.js"
import { OverpassClient } from "./OverpassClient.js"
import type { OverpassClientOptions, OverpassResponse } from "./OverpassClient.js"

/** What OpenStreetMap says of one of its ways of railway, and where it runs. */
interface NamedWay {
  name?: string
  voltageV?: number
  services: string[]
  path: { x: number, z: number }[]
}

/**
 * The names of the railways of a place, and the services that run on them, from OpenStreetMap: what the IGN's map, which draws the tracks better, does
 * not say. Its sections name nothing (`cpx_toponyme` empty, the line it links to unpublished: at Silly-le-Long it names only the high-speed lines); OSM
 * calls the line under the RN2 there the "Ligne de La Plaine à Hirson et Anor (frontière)", at 25 kV, and has the Transilien K and the TER K15 run on it.
 *
 * A line is given what the OSM ways along it say, by most of its length: each point of it, every SAMPLE_M, takes the ways within NEAR_M that run the same
 * way (within ALIGNED_DEG): the nearest's name and voltage, and the services of all of them (OSM draws each track, and a route may use one only). A
 * name is the line's that the most points have, a service one that a quarter of them have at least. A line the ways do not follow keeps what it
 * had. A service is said as a reader says it: the route's name before its stops ("Transilien K (AEKY) : Crépy-en-Valois → Gare du Nord" is
 * "Transilien K"), else its network and its reference.
 *
 * For a build step (see build-railway-archive.ts) and the lines drawn from OSM itself: Overpass is slow and donated, and a scene never asks it.
 */
export class OsmRailwayNames {
  static readonly NEAR_M = 15
  static readonly ALIGNED_DEG = 30
  static readonly SAMPLE_M = 10
  /** What runs on rails: the routes asked for. */
  static readonly ROUTES = "train|subway|light_rail|tram|monorail"
  private static readonly KINDS = "rail|light_rail|subway|tram|narrow_gauge|funicular|preserved"

  private readonly client: OverpassClient

  constructor(options: OverpassClientOptions = {}) {
    this.client = new OverpassClient(options)
  }

  /** The lines with the names, the voltage and the services OSM gives them: those it says nothing of, as they were. */
  async named(lines: readonly RailwayLine[], bounds: GeoBounds): Promise<RailwayLine[]> {
    if (lines.length === 0) return [...lines]
    const box = `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`
    const query = `[out:json][timeout:120];way["railway"~"^(${OsmRailwayNames.KINDS})$"](${box})->.w;.w out tags geom;rel(bw.w)["route"~"^(${OsmRailwayNames.ROUTES})$"];out body;`
    return OsmRailwayNames.apply(lines, await this.client.query(query), bounds)
  }

  /** The same, from an answer already had: exposed for a test and for a build step that fetched it by other means. */
  static apply(lines: readonly RailwayLine[], body: OverpassResponse, bounds: GeoBounds): RailwayLine[] {
    const origin = { lat: (bounds.north + bounds.south) / 2, lng: (bounds.east + bounds.west) / 2 }
    const ways = OsmRailwayNames.ways(body, origin)
    if (ways.length === 0) return [...lines]
    return lines.map(line => {
      const path = line.points.map(point => geoToLocalMeters(point.lat, point.lng, origin.lat, origin.lng))
      const names = new Map<string, number>()
      const voltages = new Map<number, number>()
      const services = new Map<string, number>()
      let samples = 0
      for (const point of OsmRailwayNames.samples(path)) {
        samples++
        const along = OsmRailwayNames.waysAt(ways, point)
        if (along.length === 0) continue
        const [nearest] = along
        if (nearest.name) names.set(nearest.name, (names.get(nearest.name) ?? 0) + 1)
        if (nearest.voltageV) voltages.set(nearest.voltageV, (voltages.get(nearest.voltageV) ?? 0) + 1)
        // OpenStreetMap draws each track and a route may use one: what runs on any track the line holds runs on the line.
        for (const service of new Set(along.flatMap(way => way.services))) services.set(service, (services.get(service) ?? 0) + 1)
      }
      const most = <T>(counts: Map<T, number>): T | undefined => [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
      const name = line.name ?? most(names)
      const voltageV = line.voltageV ?? most(voltages)
      // A service that runs along part of the line only (a branch leaving it) is still one that runs there.
      const running = [...services.entries()].filter(([, count]) => count * 4 >= samples).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([service]) => service)
      return {
        ...line,
        ...(name ? { name } : {}),
        ...(voltageV ? { voltageV } : {}),
        ...(running.length > 0 ? { services: running } : {})
      }
    })
  }

  /** How a reader names a route: its name before its stops and its code in brackets, else its network and its reference. */
  static serviceOf(tags: Record<string, string>): string | undefined {
    const named = tags.name?.split(" : ")[0].replace(/\s*\([^)]*\)\s*$/, "").trim()
    if (named) return named
    const said = [tags.network, tags.ref].filter(Boolean).join(" ")
    return said || undefined
  }

  /** The services each way of an answer is part of, by the way's id: from the routes the answer holds. */
  static servicesByWay(body: OverpassResponse): Map<number, Set<string>> {
    const servicesOf = new Map<number, Set<string>>()
    for (const element of body.elements ?? []) {
      if (element.type !== "relation" || !element.tags) continue
      const service = OsmRailwayNames.serviceOf(element.tags)
      if (!service) continue
      for (const member of element.members ?? []) {
        if (member.type !== "way" || member.ref === undefined) continue
        const set = servicesOf.get(member.ref) ?? new Set<string>()
        set.add(service)
        servicesOf.set(member.ref, set)
      }
    }
    return servicesOf
  }

  /** How many volts a way says its wire or rail carries: the first of a list, where it says. */
  static voltageOf(tags: Record<string, string>): number | undefined {
    const voltage = Number.parseInt((tags.voltage ?? "").split(";")[0], 10)
    return Number.isFinite(voltage) && voltage > 0 ? voltage : undefined
  }

  private static ways(body: OverpassResponse, origin: { lat: number, lng: number }): NamedWay[] {
    const servicesOf = OsmRailwayNames.servicesByWay(body)
    const out: NamedWay[] = []
    for (const element of body.elements ?? []) {
      if (element.type !== "way" || !element.geometry || element.geometry.length < 2) continue
      const tags = element.tags ?? {}
      const voltageV = OsmRailwayNames.voltageOf(tags)
      out.push({
        ...(tags.name ? { name: tags.name } : {}),
        ...(voltageV ? { voltageV } : {}),
        services: [...(servicesOf.get(element.id ?? -1) ?? [])],
        path: element.geometry.map(point => geoToLocalMeters(point.lat, point.lon, origin.lat, origin.lng))
      })
    }
    return out
  }

  /** Points every SAMPLE_M along a path, each with the direction it runs there. */
  private static samples(path: { x: number, z: number }[]): { x: number, z: number, dx: number, dz: number }[] {
    const out: { x: number, z: number, dx: number, dz: number }[] = []
    for (let i = 0; i < path.length - 1; i++) {
      const length = Math.hypot(path[i + 1].x - path[i].x, path[i + 1].z - path[i].z)
      if (length < 1e-6) continue
      const dx = (path[i + 1].x - path[i].x) / length
      const dz = (path[i + 1].z - path[i].z) / length
      for (let s = OsmRailwayNames.SAMPLE_M / 2; s < length; s += OsmRailwayNames.SAMPLE_M) out.push({ x: path[i].x + dx * s, z: path[i].z + dz * s, dx, dz })
    }
    return out
  }

  /** The ways within NEAR_M of a point that run its way (either sense), the nearest first. */
  private static waysAt(ways: NamedWay[], point: { x: number, z: number, dx: number, dz: number }): NamedWay[] {
    const cosAligned = Math.cos(OsmRailwayNames.ALIGNED_DEG * Math.PI / 180)
    const found: { way: NamedWay, distance: number }[] = []
    for (const way of ways) {
      let best: number | undefined
      for (let i = 0; i < way.path.length - 1; i++) {
        const a = way.path[i]
        const b = way.path[i + 1]
        const dx = b.x - a.x
        const dz = b.z - a.z
        const length = Math.hypot(dx, dz)
        if (length < 1e-6) continue
        if (Math.abs((dx * point.dx + dz * point.dz) / length) < cosAligned) continue
        const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.z - a.z) * dz) / (length * length)))
        const distance = Math.hypot(point.x - (a.x + dx * t), point.z - (a.z + dz * t))
        if (distance <= OsmRailwayNames.NEAR_M && (best === undefined || distance < best)) best = distance
      }
      if (best !== undefined) found.push({ way, distance: best })
    }
    return found.sort((a, b) => a.distance - b.distance).map(({ way }) => way)
  }
}
