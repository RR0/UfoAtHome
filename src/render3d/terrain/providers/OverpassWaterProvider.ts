import type { GeoBounds } from "../GeoBounds.js"
import type { WaterProvider, WaterSurface } from "../WaterProvider.js"
import { OverpassClient } from "./OverpassClient.js"
import type { OverpassClientOptions, OverpassResponse } from "./OverpassClient.js"

type GeoPoint = { lat: number, lng: number }

/**
 * The water of the world as OpenStreetMap draws it: the areas tagged `natural=water` (a lake, a pond, a river's surface in the current tagging) or
 * `waterway=riverbank` (the older tagging of a river's surface), as closed ways or as multipolygons.
 *
 * A multipolygon is asked for by the parts of it that cross the place, not whole: the surface of a great river is one relation hundreds of
 * kilometres long, megabytes of points. Its parts are joined end to end into rings, and a ring that does not close within what came (the river
 * goes on beyond the place) is left out rather than closed by a guess, which would flood a bank or dry a river. So a river mapped as one long
 * multipolygon has no water here; a lake, a pond, and a river mapped in pieces do.
 */
export class OverpassWaterProvider implements WaterProvider {
  readonly attribution = "Water © OpenStreetMap contributors"

  private readonly client: OverpassClient

  constructor(options: OverpassClientOptions = {}) {
    this.client = new OverpassClient(options)
  }

  async getWater(bounds: GeoBounds): Promise<WaterSurface[]> {
    const box = `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`
    const query = `[out:json][timeout:30];`
      + `(way["natural"="water"](${box});way["waterway"="riverbank"](${box});)->.w;`
      + `(relation["natural"="water"](${box});relation["waterway"="riverbank"](${box});)->.r;`
      + `.w out geom;.r out body;way(r.r)(${box});out geom;`
    return OverpassWaterProvider.surfacesFrom(await this.client.query(query))
  }

  /** One Overpass answer as surfaces: the closed ways that are water, and the multipolygons whose parts close into rings. */
  static surfacesFrom(body: OverpassResponse): WaterSurface[] {
    const elements = body.elements ?? []
    const geometries = new Map<number, GeoPoint[]>()
    for (const element of elements) {
      if (element.type === "way" && element.id !== undefined && element.geometry) {
        geometries.set(element.id, element.geometry.map(point => ({ lat: point.lat, lng: point.lon })))
      }
    }
    const surfaces: WaterSurface[] = []
    const inRelation = new Set<number>()
    for (const element of elements) {
      if (element.type !== "relation") continue
      const parts = (role: string) => (element.members ?? [])
        .filter(member => member.type === "way" && member.role === role && member.ref !== undefined && geometries.has(member.ref))
        .map(member => {
          inRelation.add(member.ref as number)
          return geometries.get(member.ref as number) as GeoPoint[]
        })
      const holes = OverpassWaterProvider.rings(parts("inner"))
      for (const [index, outline] of OverpassWaterProvider.rings(parts("outer")).entries()) {
        const islands = holes.filter(hole => OverpassWaterProvider.contains(outline, hole[0]))
        surfaces.push({ id: `osm-r${element.id}-${index}`, rings: [outline, ...islands] })
      }
    }
    for (const element of elements) {
      if (element.type !== "way" || !element.tags || element.id === undefined || inRelation.has(element.id)) continue
      if (element.tags.natural !== "water" && element.tags.waterway !== "riverbank") continue
      for (const ring of OverpassWaterProvider.rings([geometries.get(element.id) ?? []])) surfaces.push({ id: `osm-w${element.id}`, rings: [ring] })
    }
    return surfaces
  }

  /** The closed rings the lines make once joined end to end, whichever way each was drawn, without the repeated closing point; what stays open is dropped. */
  static rings(lines: GeoPoint[][]): GeoPoint[][] {
    const same = (a: GeoPoint, b: GeoPoint) => a.lat === b.lat && a.lng === b.lng
    const open = lines.filter(line => line.length >= 2).map(line => [...line])
    const closed: GeoPoint[][] = []
    while (open.length > 0) {
      let chain = open.pop() as GeoPoint[]
      let grew = true
      while (!same(chain[0], chain[chain.length - 1]) && grew) {
        grew = false
        for (let i = 0; i < open.length; i++) {
          const line = open[i]
          const end = chain[chain.length - 1]
          if (same(end, line[0])) chain = [...chain, ...line.slice(1)]
          else if (same(end, line[line.length - 1])) chain = [...chain, ...[...line].reverse().slice(1)]
          else continue
          open.splice(i, 1)
          grew = true
          break
        }
      }
      if (chain.length >= 4 && same(chain[0], chain[chain.length - 1])) closed.push(chain.slice(0, -1))
    }
    return closed
  }

  /** Whether a point is inside a ring (even-odd), in degrees: a small place is flat enough for it. */
  private static contains(ring: GeoPoint[], point: GeoPoint): boolean {
    let inside = false
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const a = ring[i]
      const b = ring[j]
      if ((a.lat > point.lat) !== (b.lat > point.lat) && point.lng < (b.lng - a.lng) * (point.lat - a.lat) / (b.lat - a.lat) + a.lng) inside = !inside
    }
    return inside
  }
}
