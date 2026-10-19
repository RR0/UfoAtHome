import type { SurveyedBridge, SurveyedLine } from "./SurroundingsProvider.js"

/** One feature of a vector survey, as a WFS answers in GeoJSON: coordinates are longitude, latitude (and sometimes an altitude). */
export interface VectorFeature {
  geometry: { type: string, coordinates: unknown }
  properties: Record<string, unknown>
}

/** What the vectors of a place say: the bridges, the roads that carry something over the ground, and the electric lines. */
export interface PlaceVectors {
  bridges: VectorFeature[]
  /** The road sections over the ground: the width of the road on a bridge is theirs. */
  elevatedRoads: VectorFeature[]
  /** The railway sections over the ground: a bridge along one carries a railway, which the scene draws with its tracks (see RailwaySystem). */
  elevatedRailways?: VectorFeature[]
  lines: VectorFeature[]
  /** The outlines of the buildings, with their height and floors, where they were asked for. */
  buildings: VectorFeature[]
  /** The named zones (a town hall, a post office, a square), whose names the buildings inside them take, where they were asked for. */
  zones: VectorFeature[]
  /** The latest edition of the buildings the map holds here, as YYYY-MM-DD, where they carry one. */
  mapDate?: string
}

/**
 * The heights a laser survey measured round a place, as a grid, for the structures a vector survey only draws on the map: how high
 * a deck stands, how tall a pole is.
 *
 * A pixel is a plant, a roof or something else; only something else is a structure, and a measure never reads a tree for a pole.
 */
export class HeightGrid {
  constructor(
    private readonly heights: Float32Array,
    private readonly plants: Uint8Array,
    private readonly buildings: Uint8Array,
    private readonly size: number,
    private readonly metresPerPixel: number
  ) {}

  /** The height of a structure at a point, east and north of the centre of the grid: undefined where there is none, or no pixel. */
  structureAt(eastM: number, northM: number): number | undefined {
    const x = Math.floor(eastM / this.metresPerPixel + this.size / 2)
    const y = Math.floor(this.size / 2 - northM / this.metresPerPixel)
    if (x < 0 || y < 0 || x >= this.size || y >= this.size) return undefined
    const at = y * this.size + x
    if (this.plants[at] || this.buildings[at]) return undefined
    return this.heights[at]
  }

  /** The tallest structure within `radiusM` of a point, undefined where there is none. */
  tallestStructureNear(eastM: number, northM: number, radiusM: number): number | undefined {
    let tallest: number | undefined
    const steps = Math.ceil(radiusM / this.metresPerPixel)
    for (let j = -steps; j <= steps; j++) {
      for (let i = -steps; i <= steps; i++) {
        if (Math.hypot(i, j) * this.metresPerPixel > radiusM) continue
        const height = this.structureAt(eastM + i * this.metresPerPixel, northM + j * this.metresPerPixel)
        if (height !== undefined && (tallest === undefined || height > tallest)) tallest = height
      }
    }
    return tallest
  }
}

/**
 * The bridges and the overhead electric lines round a place, from the vector survey of the IGN (BD TOPO) and the heights of the
 * laser one.
 *
 * Vectors and not the laser's classification, because a line of wire is a few centimetres across and a half-metre pixel does not see
 * it: the survey of the map knows where the line runs and at what voltage, and the laser says how tall the supports stand. A bridge
 * is the same way: the map has its centre line and the width of the road it carries, the laser the height of its deck.
 *
 * What neither knows is drawn from what a structure of its kind is, and said so in the doc of each constant below.
 */
export class OverheadStructures {
  private static readonly METRES_PER_DEGREE = 111320
  private static readonly MIN_BRIDGE_M = 4
  /** A bridge with no road to take its width from: the deck of a two-lane road, and of a footbridge. */
  private static readonly DEFAULT_DECK_M = 6
  private static readonly FOOTBRIDGE_DECK_M = 2.5
  /** A deck is wider than the carriageway it carries: a pavement and a parapet on each side. */
  private static readonly DECK_MARGIN_M = 2.4
  /**
   * Two pieces of the map's centre lines that meet end to end within this are one structure: the map cuts a bridge where a boundary crosses it (the
   * Petit-Pont and the Pont au Double in Paris are two pieces each, cut mid-Seine), and each piece drawn as a bridge of its own stood on the lowest ground
   * under its own half, one deck higher than the other.
   */
  private static readonly JOIN_M = 1
  /** And run on within this angle of each other: a bridge that meets another at a junction is another bridge. */
  private static readonly JOIN_DEG = 25
  /** How near the middle of a bridge a railway over the ground must run for the bridge to be the railway's: the centre line of a double track. */
  private static readonly RAIL_MATCH_M = 6
  /** How near the centre line of a bridge the road that crosses it must be. */
  private static readonly ROAD_MATCH_M = 12
  /** The deck of a bridge where nothing measured it. */
  private static readonly DEFAULT_DECK_HEIGHT_M = 4
  /** The shortest a pole can be measured, and the tallest: a reading outside is a tree, a building, or noise. */
  private static readonly MIN_POLE_M = 6
  private static readonly MAX_POLE_M = 70
  /** The longest span drawn: a line's drawing between two far-off vertices is a long straight wire, not a span. */
  private static readonly MAX_SPAN_M = 800
  private static readonly MAX_LINES = 16

  /**
   * What a line of each voltage is built like, in the way of the lines of France: the height of its supports, how far below their top
   * the conductors hang, and how far apart they are. The map gives the voltage and nothing else of it; the heights are those of the
   * ordinary pylon or pole of the voltage, which is what a recording can say where nothing measured it.
   */
  private static readonly BY_VOLTAGE: ReadonlyArray<{ upToKv: number, poleM: number, dropM: number, spreadM: number }> = [
    { upToKv: 25, poleM: 11, dropM: 1.2, spreadM: 0.8 },
    { upToKv: 70, poleM: 20, dropM: 3, spreadM: 3 },
    { upToKv: 100, poleM: 22, dropM: 3.5, spreadM: 3.5 },
    { upToKv: 170, poleM: 27, dropM: 4.5, spreadM: 4.5 },
    { upToKv: 250, poleM: 32, dropM: 5.5, spreadM: 5.5 },
    { upToKv: 1000, poleM: 42, dropM: 7, spreadM: 7.5 }
  ]

  /** A vertex [longitude, latitude] as metres east and north of the centre. */
  private static toMetres(vertex: unknown, centre: { lat: number, lng: number }): { east: number, north: number } {
    const [lng, lat] = vertex as [number, number]
    return {
      east: (lng - centre.lng) * OverheadStructures.METRES_PER_DEGREE * Math.cos(centre.lat * Math.PI / 180),
      north: (lat - centre.lat) * OverheadStructures.METRES_PER_DEGREE
    }
  }

  private static path(feature: VectorFeature, centre: { lat: number, lng: number }): { east: number, north: number }[] {
    if (feature.geometry.type !== "LineString") return []
    return (feature.geometry.coordinates as unknown[]).map(vertex => OverheadStructures.toMetres(vertex, centre))
  }

  /** Degrees clockwise from north of the direction from one point to another. */
  private static bearing(from: { east: number, north: number }, to: { east: number, north: number }): number {
    return ((Math.atan2(to.east - from.east, to.north - from.north) * 180 / Math.PI) + 360) % 360
  }

  /** The distance from a point to a segment, metres. */
  private static distanceToSegment(p: { east: number, north: number }, a: { east: number, north: number }, b: { east: number, north: number }): number {
    const dx = b.east - a.east
    const dy = b.north - a.north
    const length2 = dx * dx + dy * dy
    const t = length2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.east - a.east) * dx + (p.north - a.north) * dy) / length2))
    return Math.hypot(p.east - (a.east + t * dx), p.north - (a.north + t * dy))
  }

  static bridges(vectors: PlaceVectors, centre: { lat: number, lng: number }, radiusM: number, grid: HeightGrid | undefined): SurveyedBridge[] {
    const roads = vectors.elevatedRoads.map(road => ({ path: OverheadStructures.path(road, centre), properties: road.properties }))
    const railways = (vectors.elevatedRailways ?? []).map(railway => OverheadStructures.path(railway, centre))
    const found: SurveyedBridge[] = []
    for (const path of OverheadStructures.joined(vectors.bridges.map(feature => OverheadStructures.path(feature, centre)))) {
      const from = path[0]
      const to = path[path.length - 1]
      const length = Math.hypot(to.east - from.east, to.north - from.north)
      if (length < OverheadStructures.MIN_BRIDGE_M) continue
      const middle = { east: (from.east + to.east) / 2, north: (from.north + to.north) / 2 }
      if (Math.hypot(middle.east, middle.north) > radiusM + length / 2) continue
      // The bridge of a railway is not a road bridge: drawn as one, it was a deck with a carriageway and railings along the track, over it. Its
      // deck is the railway's, laid with its ballast and its rails (see RailwaySystem), and the road under it goes through its opening.
      if (OverheadStructures.carriesRailway(from, to, railways)) continue
      found.push({
        eastM: OverheadStructures.tenth(middle.east),
        northM: OverheadStructures.tenth(middle.north),
        lengthM: OverheadStructures.tenth(length),
        widthM: OverheadStructures.roadOf(middle, roads).width,
        heightM: OverheadStructures.tenth(OverheadStructures.deckHeight(from, to, grid)),
        headingDeg: OverheadStructures.tenth(OverheadStructures.bearing(from, to) % 180),
        ...(OverheadStructures.roadOf(middle, roads).name ? { name: OverheadStructures.roadOf(middle, roads).name } : {})
      })
    }
    found.sort((a, b) => Math.hypot(a.eastM, a.northM) - Math.hypot(b.eastM, b.northM))
    return found
  }

  /** Whether a railway over the ground runs along a bridge: past its middle, within RAIL_MATCH_M, in its direction. */
  private static carriesRailway(from: { east: number, north: number }, to: { east: number, north: number }, railways: { east: number, north: number }[][]): boolean {
    const middle = { east: (from.east + to.east) / 2, north: (from.north + to.north) / 2 }
    const heading = OverheadStructures.bearing(from, to) % 180
    for (const railway of railways) {
      for (let i = 0; i + 1 < railway.length; i++) {
        if (OverheadStructures.distanceToSegment(middle, railway[i], railway[i + 1]) > OverheadStructures.RAIL_MATCH_M) continue
        const turn = Math.abs(OverheadStructures.bearing(railway[i], railway[i + 1]) % 180 - heading)
        if (Math.min(turn, 180 - turn) <= OverheadStructures.JOIN_DEG) return true
      }
    }
    return false
  }

  /** The pieces of centre line as whole structures: each chain of pieces that meet end to end and run on (see JOIN_M) as one path. */
  private static joined(paths: { east: number, north: number }[][]): { east: number, north: number }[][] {
    const chains = paths.filter(path => path.length >= 2)
    for (let i = 0; i < chains.length; i++) {
      for (let j = i + 1; j < chains.length; j++) {
        const chain = OverheadStructures.join(chains[i], chains[j])
        if (chain === undefined) continue
        chains[i] = chain
        chains.splice(j, 1)
        // The longer chain may meet a piece already passed by.
        j = i
      }
    }
    return chains
  }

  /** One path of two that meet end to end and run on, whichever way each was drawn: undefined where they do not. */
  private static join(a: { east: number, north: number }[], b: { east: number, north: number }[]): { east: number, north: number }[] | undefined {
    for (const first of [a, [...a].reverse()]) {
      for (const second of [b, [...b].reverse()]) {
        const end = first[first.length - 1]
        const start = second[0]
        if (Math.hypot(end.east - start.east, end.north - start.north) > OverheadStructures.JOIN_M) continue
        const turn = Math.abs(OverheadStructures.bearing(first[0], end) - OverheadStructures.bearing(start, second[second.length - 1]))
        if (Math.min(turn, 360 - turn) <= OverheadStructures.JOIN_DEG) return [...first, ...second.slice(1)]
      }
    }
    return undefined
  }

  /** The road that crosses a bridge at its middle: the width of its deck (the road's, with its edges, or what a bridge of its kind is), and its name. */
  private static roadOf(middle: { east: number, north: number }, roads: { path: { east: number, north: number }[], properties: Record<string, unknown> }[]): { width: number, name?: string } {
    let nearest: { distance: number, properties: Record<string, unknown> } | undefined
    for (const road of roads) {
      for (let i = 0; i + 1 < road.path.length; i++) {
        const distance = OverheadStructures.distanceToSegment(middle, road.path[i], road.path[i + 1])
        if (nearest === undefined || distance < nearest.distance) nearest = { distance, properties: road.properties }
      }
    }
    if (nearest === undefined || nearest.distance > OverheadStructures.ROAD_MATCH_M) return { width: OverheadStructures.DEFAULT_DECK_M }
    const named = [nearest.properties.nom_voie_ban_gauche, nearest.properties.nom_voie_ban_droite, nearest.properties.cpx_toponyme_route_nommee]
      .find((name): name is string => typeof name === "string" && name.length > 0)
    const carriageway = Number(nearest.properties.largeur_de_chaussee)
    const width = Number.isFinite(carriageway) && carriageway > 0
      ? OverheadStructures.tenth(carriageway + OverheadStructures.DECK_MARGIN_M)
      : (nearest.properties.nature === "Sentier" ? OverheadStructures.FOOTBRIDGE_DECK_M : OverheadStructures.DEFAULT_DECK_M)
    return named ? { width, name: named } : { width }
  }

  /** The height of the deck: the middle value of what the laser measured on the structure along the middle of its length. */
  private static deckHeight(from: { east: number, north: number }, to: { east: number, north: number }, grid: HeightGrid | undefined): number {
    if (grid === undefined) return OverheadStructures.DEFAULT_DECK_HEIGHT_M
    const measures: number[] = []
    const steps = 20
    for (let i = 4; i <= steps - 4; i++) {
      const height = grid.structureAt(from.east + (to.east - from.east) * i / steps, from.north + (to.north - from.north) * i / steps)
      if (height !== undefined && height >= 1.5) measures.push(height)
    }
    if (measures.length === 0) return OverheadStructures.DEFAULT_DECK_HEIGHT_M
    measures.sort((a, b) => a - b)
    return measures[Math.floor(measures.length / 2)]
  }

  static lines(vectors: PlaceVectors, centre: { lat: number, lng: number }, radiusM: number, grid: HeightGrid | undefined): SurveyedLine[] {
    const found: SurveyedLine[] = []
    for (const feature of vectors.lines) {
      const voltage = String(feature.properties.voltage ?? "")
      const kv = OverheadStructures.kilovolts(voltage)
      if (kv === undefined) continue
      const build = OverheadStructures.BY_VOLTAGE.find(entry => kv <= entry.upToKv) ?? OverheadStructures.BY_VOLTAGE[OverheadStructures.BY_VOLTAGE.length - 1]
      const path = OverheadStructures.path(feature, centre)
      for (let i = 0; i + 1 < path.length; i++) {
        const a = path[i]
        const b = path[i + 1]
        const length = Math.hypot(b.east - a.east, b.north - a.north)
        if (length < 5 || length > OverheadStructures.MAX_SPAN_M) continue
        if (OverheadStructures.distanceToSegment({ east: 0, north: 0 }, a, b) > radiusM) continue
        const pole = OverheadStructures.poleHeight(a, b, grid) ?? build.poleM
        found.push({
          eastM: OverheadStructures.tenth((a.east + b.east) / 2),
          northM: OverheadStructures.tenth((a.north + b.north) / 2),
          lengthM: OverheadStructures.tenth(length),
          headingDeg: OverheadStructures.tenth(OverheadStructures.bearing(a, b)),
          heightM: OverheadStructures.tenth(Math.max(4, pole - build.dropM)),
          poleHeightM: OverheadStructures.tenth(pole),
          acrossM: [-build.spreadM, 0, build.spreadM],
          voltage
        })
      }
    }
    found.sort((a, b) => Math.hypot(a.eastM, a.northM) - Math.hypot(b.eastM, b.northM))
    return found.slice(0, OverheadStructures.MAX_LINES)
  }

  /** The kilovolts of "90 kV", undefined for a line not under tension or whose voltage is not said. */
  private static kilovolts(voltage: string): number | undefined {
    const match = /([\d.,]+)\s*kV/i.exec(voltage)
    if (match === null) return undefined
    const kv = Number(match[1].replace(",", "."))
    return Number.isFinite(kv) && kv > 0 ? kv : undefined
  }

  /** The height of the supports at the two ends of a span, as the laser measured them: the mean of what it found, or nothing. */
  private static poleHeight(a: { east: number, north: number }, b: { east: number, north: number }, grid: HeightGrid | undefined): number | undefined {
    if (grid === undefined) return undefined
    const heights = [a, b]
      .map(end => grid.tallestStructureNear(end.east, end.north, 3))
      .filter((height): height is number => height !== undefined && height >= OverheadStructures.MIN_POLE_M && height <= OverheadStructures.MAX_POLE_M)
    return heights.length === 0 ? undefined : heights.reduce((sum, height) => sum + height, 0) / heights.length
  }

  private static tenth(value: number): number {
    return Math.round(value * 10) / 10
  }
}
