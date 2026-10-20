import type { GeoBounds } from "../GeoBounds.js"
import { OsmRailwayNames } from "./OsmRailwayNames.js"
import { OverpassClient } from "./OverpassClient.js"
import type { OverpassClientOptions, OverpassResponse } from "./OverpassClient.js"
import type { RailwayElectrification, RailwayKind, RailwayLine, RailwayProvider } from "../RailwayProvider.js"

/**
 * Today's railways outside France, from OpenStreetMap through Overpass: every kind of track a scene draws, in ONE query for the square of ground.
 *
 * OpenStreetMap draws each track on its own (a double line is two ways), and says what a scene needs where a mapper said it: the gauge in
 * millimetres, `electrified=contact_line` for a wire and `=rail` for a third rail, `bridge` and `tunnel`, `service` for a siding or a yard.
 * It has no altitudes: a bridge is held at the height of the ground at its two ends (see RailwaySystem).
 */
export class OverpassRailwayProvider implements RailwayProvider {
  readonly attribution = "Railways © OpenStreetMap contributors, as surveyed today"
  readonly contemporary = true

  /** The kinds of track asked for. A preserved or disused line has its rails still, an abandoned one has not: only the first is asked. */
  static readonly KINDS: readonly string[] = ["rail", "light_rail", "tram", "subway", "narrow_gauge", "funicular", "preserved"]

  private readonly client: OverpassClient

  constructor(options: OverpassClientOptions = {}) {
    this.client = new OverpassClient(options)
  }

  async getRailways(bounds: GeoBounds): Promise<RailwayLine[]> {
    const box = `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`
    // The routes too, which say what runs on each way (see OsmRailwayNames).
    const query = `[out:json][timeout:25];way["railway"~"^(${OverpassRailwayProvider.KINDS.join("|")})$"](${box})->.w;.w out tags geom;rel(bw.w)["route"~"^(${OsmRailwayNames.ROUTES})$"];out body;`
    return this.linesFrom(await this.client.query(query))
  }

  /** One Overpass answer as lines — exposed so a build step can read an answer fetched by other means. */
  linesFrom(body: OverpassResponse): RailwayLine[] {
    const lines: RailwayLine[] = []
    const servicesOf = OsmRailwayNames.servicesByWay(body)
    for (const element of body.elements ?? []) {
      const geometry = element.geometry
      const tags = element.tags
      if (element.type === "relation" || !tags || !geometry || geometry.length < 2) continue
      const services = [...(servicesOf.get(element.id ?? -1) ?? [])].sort()
      const voltageV = OsmRailwayNames.voltageOf(tags)
      const kind = OverpassRailwayProvider.kindOf(tags)
      const gauge = Number.parseInt((tags.gauge ?? "").split(";")[0], 10)
      const tracks = Number.parseInt(tags.tracks ?? "", 10)
      const electrification = OverpassRailwayProvider.electrificationOf(tags.electrified)
      const highSpeed = tags.highspeed === "yes" || Number.parseInt(tags.maxspeed ?? "", 10) >= 250
      lines.push({
        id: `osm-rail-${element.id ?? lines.length}`,
        ...(tags.name ? { name: tags.name } : {}),
        ...(services.length > 0 ? { services } : {}),
        ...(voltageV ? { voltageV } : {}),
        kind,
        ...(tags.service || tags.usage === "industrial" ? { service: true } : {}),
        ...(highSpeed ? { highSpeed: true } : {}),
        gaugeMm: Number.isFinite(gauge) && gauge > 300 ? gauge : tags.railway === "narrow_gauge" ? 1000 : 1435,
        tracks: Number.isFinite(tracks) && tracks > 0 ? tracks : 1,
        ...(electrification ? { electrification } : {}),
        level: OverpassRailwayProvider.levelOf(tags),
        points: geometry.map(point => ({ lat: point.lat, lng: point.lon }))
      })
    }
    return lines
  }

  private static kindOf(tags: Record<string, string>): RailwayKind {
    switch (tags.railway) {
      case "tram": return "tram"
      case "subway": return "subway"
      case "light_rail": return "light_rail"
      case "funicular": return "funicular"
      default: return "rail"
    }
  }

  /** `contact_line` and `yes` on a line with no rail said are a wire; `rail` a third rail; `4th_rail` too. */
  private static electrificationOf(electrified: string | undefined): RailwayElectrification | undefined {
    if (electrified === undefined) return undefined
    if (electrified === "no") return "none"
    if (electrified === "contact_line" || electrified === "yes") return "overhead"
    if (electrified === "rail" || electrified === "4th_rail" || electrified === "ground-level_power_supply") return "third_rail"
    return undefined
  }

  /** Above the ground on a bridge, at its layer where one is given; below it in a tunnel or a covered way. */
  private static levelOf(tags: Record<string, string>): number {
    const layer = Number.parseInt(tags.layer ?? "", 10)
    if (tags.tunnel && tags.tunnel !== "no") return Number.isFinite(layer) && layer < 0 ? layer : -1
    if (tags.covered === "yes" && tags.location === "underground") return -1
    if (tags.bridge && tags.bridge !== "no") return Number.isFinite(layer) && layer > 0 ? layer : 1
    return 0
  }
}
