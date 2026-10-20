import type { RoadWay } from "./terrain/RoadProvider.js"
import { geoToLocalMeters } from "./terrain/GeoProjection.js"

/** One strip of a ribbon laid on the ground (see RoadSystem.appendPath): along `points`, `widthM` wide, shifted `offsetM` to the left of the way, lifted `liftM`. */
export type MarkingStrip = (points: { x: number, z: number }[], widthM: number, options: { offsetM: number, liftM: number, minHalfM: number }) => void

/** How a line is drawn along the road: whole, in long dashes (the line of a lane or of the middle), or in the shorter dashes of an edge. */
export type MarkingPattern = "solid" | "dashed" | "rive"

/** One line of paint: where it runs across the carriageway (metres to the left of the way's points, as the ribbon's strips count) and how it is drawn. */
export interface MarkingLine {
  offsetM: number
  pattern: MarkingPattern
  /** Dashed on the straight and whole in a bend, where overtaking is not allowed: the line of the middle of a road. */
  solidInBends?: boolean
}

type Point = { x: number, z: number }

/**
 * The paint on a carriageway, as the road is: how many lanes it has, which way they go, what kind of road it is. An edge line each side and the dashed
 * line of the middle on a road that is only said to be wide; a continuous line at the median and at the shoulder of a motorway carriageway, with a dashed one
 * between its lanes; a double line down the middle of a road of four lanes; none on a roundabout, a lane or a track. It is what anchors a lit road in the
 * eye, since a beam on a plain surface is only a gradient, and a line that goes by says how fast and how far.
 *
 * Loaded only for a scene that has roads wide enough to be painted (see RoadSystem.set): a recording with no roads, or only tracks, never brings it in.
 */
export class RoadMarkings {
  /** A carriageway narrower than this is a lane or a track, and has no paint. */
  static readonly MIN_ROAD_M = 5.5
  /** From this width a road of which nothing else is known has two lanes each way, and the dashes mark the lanes instead of the middle. */
  static readonly WIDE_ROAD_M = 9
  static readonly LINE_WIDTH_M = 0.12
  /** A dash and the gap after it, metres: the line of a lane or of the middle (T1 of the French road code: 3 m and 10). */
  static readonly DASH_M = 3
  static readonly GAP_M = 10
  /** The shorter dashes of an edge line of a road (T3: a dash and a gap, a little under a car's length each). */
  static readonly RIVE_DASH_M = 2.5
  static readonly RIVE_GAP_M = 3.5
  /** A dash shorter than this is not drawn. */
  static readonly MIN_DASH_M = 0.5
  /** How wide a lane is, metres: what a road of known lanes is divided by (a motorway's is three and a half). */
  static readonly LANE_M = 3.5
  /** A shoulder (bande d'arrêt d'urgence) is told by what is left of a carriageway once its lanes are laid: this much at least is one. */
  static readonly SHOULDER_MIN_M = 1.5
  /** From this width, or this speed (km/h), the edge lines of a road are whole and not in dashes. */
  static readonly SOLID_EDGE_FROM_M = 7
  static readonly SOLID_EDGE_FROM_KMH = 80
  /** A bend tighter than this (the radius of the way, metres) is no place to overtake: the line of the middle is whole there. */
  static readonly BEND_RADIUS_M = 300
  /** How far the edge line stands inside the edge of the carriageway. */
  static readonly EDGE_SETBACK_M = 0.4
  /**
   * How far from the patch's own origin the paint is laid. A line twelve centimetres wide is under a pixel a few hundred metres off, and the patch is
   * replaced every hundred and fifty metres of a drive (the one that comes is asked for as the observer leaves the one before, and lands a second or two
   * later): this reaches the next patch from any point of the one before, and costs a fifth of painting the whole square.
   */
  static readonly PAINT_RADIUS_M = 450
  /** Above the carriageway's own ribbon, which is laid at the ground and a few centimetres. */
  static readonly LIFT_M = 0.015
  /** The barrier between two carriageways: how far apart their axes may be to have one (a median is a few metres to some tens), how high and thick it is. */
  static readonly BARRIER_MAX_AXES_M = 40
  static readonly BARRIER_MIN_AXES_M = 5
  static readonly BARRIER_HEIGHT_M = 0.8
  static readonly BARRIER_HALF_WIDTH_M = 0.2
  static readonly BARRIER_STEP_M = 4

  /** Whether a way is painted. */
  static painted(way: Pick<RoadWay, "surface" | "widthM" | "kind">): boolean {
    return way.surface === "paved" && way.widthM >= RoadMarkings.MIN_ROAD_M && way.kind !== "roundabout"
  }

  /**
   * The lines of paint of one way, by what is known of it: pure, and in the way's own terms (offsets to the left of its points).
   *
   * - A way that says nothing (an archive made before roads said more, or a map that gives no lanes): an edge line each side, the dashed middle, the lanes
   *   instead from nine metres.
   * - One-way (a carriageway of a motorway, of a road with two): the left edge is whole (the median's side), the right one whole too (the shoulder's, set
   *   where the lanes end when there is a shoulder), and a dashed line between lanes.
   * - Two-way with two lanes: the middle dashed, whole in the bends, and the edges whole from seven metres or 80 km/h, in short dashes otherwise.
   * - Two-way with four lanes or more: a double whole line in the middle, and the lanes dashed.
   */
  static plan(way: Pick<RoadWay, "surface" | "widthM" | "kind" | "lanes" | "direction" | "speedKmh">): MarkingLine[] {
    if (!RoadMarkings.painted(way)) return []
    const width = way.widthM
    const half = width / 2
    const setback = RoadMarkings.EDGE_SETBACK_M
    const known = way.direction !== undefined && way.lanes !== undefined
    if (!known) {
      const lines: MarkingLine[] = [{ offsetM: half - setback, pattern: "solid" }, { offsetM: -(half - setback), pattern: "solid" }]
      const lanes = width >= RoadMarkings.WIDE_ROAD_M ? [-width / 4, width / 4] : [0]
      for (const offsetM of lanes) lines.push({ offsetM, pattern: "dashed" })
      return lines
    }
    const lanes = way.lanes as number
    const wholeEdges = width >= RoadMarkings.SOLID_EDGE_FROM_M || (way.speedKmh ?? 0) >= RoadMarkings.SOLID_EDGE_FROM_KMH
    const edge = wholeEdges ? "solid" : "rive"
    if (way.direction === "both") {
      if (lanes < 2) return []
      const lines: MarkingLine[] = [{ offsetM: half - setback, pattern: edge }, { offsetM: -(half - setback), pattern: edge }]
      if (lanes >= 4) {
        // Two lanes each way: a double line in the middle, the lanes dashed between it and the edges.
        lines.push({ offsetM: 0.1, pattern: "solid" }, { offsetM: -0.1, pattern: "solid" })
        const each = Math.floor(lanes / 2)
        const laneWidth = width / lanes
        for (let k = 1; k < each; k++) lines.push({ offsetM: k * laneWidth, pattern: "dashed" }, { offsetM: -k * laneWidth, pattern: "dashed" })
      } else {
        lines.push({ offsetM: 0, pattern: "dashed", solidInBends: true })
      }
      return lines
    }
    // One way: the lines are placed from the left of the way of travel, which is the left of the points when it goes with them and their right when against.
    const sign = way.direction === "backward" ? -1 : 1
    const fromLeft = (distance: number): number => sign * (half - distance)
    const laneWidth = Math.min(RoadMarkings.LANE_M, width / Math.max(lanes, 1))
    const lanesEnd = lanes * laneWidth
    const shoulder = width - lanesEnd
    const hasShoulder = (way.kind === "motorway" || way.kind === "dual") && shoulder >= RoadMarkings.SHOULDER_MIN_M
    const lines: MarkingLine[] = [{ offsetM: fromLeft(setback), pattern: way.kind === "motorway" || way.kind === "dual" ? "solid" : edge }]
    lines.push({ offsetM: fromLeft(hasShoulder ? lanesEnd : width - setback), pattern: way.kind === "motorway" || way.kind === "dual" ? "solid" : edge })
    for (let k = 1; k < lanes; k++) lines.push({ offsetM: fromLeft(k * laneWidth), pattern: "dashed" })
    return lines
  }

  /**
   * Lays the paint of every painted way, through `strip` (which puts a strip on the ground, one rung at a time, where it was asked for).
   *
   * @returns How many strips were laid: nothing for a network with nothing to paint.
   */
  static lay(ways: RoadWay[], originLat: number, originLng: number, strip: MarkingStrip): number {
    let strips = 0
    const put = (points: Point[], offsetM: number) => {
      strip(points, RoadMarkings.LINE_WIDTH_M, { offsetM, liftM: RoadMarkings.LIFT_M, minHalfM: RoadMarkings.LINE_WIDTH_M / 2 })
      strips++
    }
    for (const way of ways) {
      const lines = RoadMarkings.plan(way)
      if (lines.length === 0) continue
      const whole = way.points.map(point => geoToLocalMeters(point.lat, point.lng, originLat, originLng))
      // Only the stretches of the way that are near enough to be seen.
      for (const path of RoadMarkings.near(whole, RoadMarkings.PAINT_RADIUS_M)) {
        for (const line of lines) {
          if (line.pattern === "solid") {
            put(path, line.offsetM)
            continue
          }
          const [on, off] = line.pattern === "dashed" ? [RoadMarkings.DASH_M, RoadMarkings.GAP_M] : [RoadMarkings.RIVE_DASH_M, RoadMarkings.RIVE_GAP_M]
          // A line of the middle that is whole in the bends is cut at them: dashes on the straights, the bend's stretch whole.
          for (const run of line.solidInBends ? RoadMarkings.byBends(path) : [{ path, bend: false }]) {
            if (run.bend) put(run.path, line.offsetM)
            else for (const dash of RoadMarkings.dashes(run.path, on, off)) put(dash, line.offsetM)
          }
        }
      }
    }
    return strips
  }

  /**
   * A path cut into its straights and its bends: a run of segments is a bend where the way turns by more than a few degrees over a length that makes its
   * radius under BEND_RADIUS_M. The turn is read at each vertex of the path: the radius of the circle that turns that much over the two half-segments either side.
   */
  static byBends(path: Point[]): { path: Point[], bend: boolean }[] {
    if (path.length < 3) return [{ path, bend: false }]
    const heading = (a: Point, b: Point) => Math.atan2(b.x - a.x, -(b.z - a.z))
    const tight: boolean[] = new Array(path.length - 1).fill(false)
    for (let i = 1; i < path.length - 1; i++) {
      const before = Math.hypot(path[i].x - path[i - 1].x, path[i].z - path[i - 1].z)
      const after = Math.hypot(path[i + 1].x - path[i].x, path[i + 1].z - path[i].z)
      if (before < 1e-6 || after < 1e-6) continue
      let turn = Math.abs(heading(path[i], path[i + 1]) - heading(path[i - 1], path[i]))
      if (turn > Math.PI) turn = 2 * Math.PI - turn
      // Arc length over the half of each segment either side, over the angle: the radius that turns this much there.
      const radius = (before + after) / 2 / Math.max(turn, 1e-6)
      if (radius < RoadMarkings.BEND_RADIUS_M) {
        tight[i - 1] = true
        tight[i] = true
      }
    }
    const runs: { path: Point[], bend: boolean }[] = []
    for (let i = 0; i < tight.length; i++) {
      const last = runs.at(-1)
      if (last && last.bend === tight[i]) last.path.push(path[i + 1])
      else runs.push({ path: [path[i], path[i + 1]], bend: tight[i] })
    }
    return runs
  }

  /**
   * The line a barrier runs along between two carriageways: where two ways of a motorway or of a road with two carriageways go in opposite directions side
   * by side, midway between them. The map gives the carriageways and not what is between them (a median is the ground left between), and what keeps one
   * from the other is a barrier, which is there on every one of these roads: it is drawn on the strength of the pair.
   *
   * @returns Paths in the origin's metres, each a stretch where there is a carriageway the other way within BARRIER_MAX_AXES_M.
   */
  static barriers(ways: RoadWay[], originLat: number, originLng: number): Point[][] {
    const carriageways = ways.filter(way => (way.kind === "motorway" || way.kind === "dual") && (way.direction === "forward" || way.direction === "backward"))
    const paths = carriageways.map(way => {
      const points = way.points.map(point => geoToLocalMeters(point.lat, point.lng, originLat, originLng))
      return way.direction === "backward" ? [...points].reverse() : points
    })
    const out: Point[][] = []
    const step = RoadMarkings.BARRIER_STEP_M
    carriageways.forEach((_, a) => {
      for (const path of RoadMarkings.near(paths[a], RoadMarkings.PAINT_RADIUS_M)) {
        let current: Point[] = []
        for (const sample of RoadMarkings.resample(path, step)) {
          const mid = RoadMarkings.midwayToOpposite(sample, a, carriageways, paths)
          if (mid) current.push(mid)
          else if (current.length > 0) {
            if (current.length >= 2) out.push(current)
            current = []
          }
        }
        if (current.length >= 2) out.push(current)
      }
    })
    return out
  }

  /** The middle of the way between a point of a carriageway and the nearest point of an antiparallel one, if there is one near: the lower id of the two draws it. */
  private static midwayToOpposite(sample: Point & { dx: number, dz: number }, own: number, ways: RoadWay[], paths: Point[][]): Point | undefined {
    let best: { distance: number, point: Point } | undefined
    for (let b = 0; b < paths.length; b++) {
      if (b === own || ways[b].id < ways[own].id) continue
      const path = paths[b]
      for (let i = 0; i < path.length - 1; i++) {
        const dx = path[i + 1].x - path[i].x
        const dz = path[i + 1].z - path[i].z
        const length2 = dx * dx + dz * dz
        if (length2 < 1e-9) continue
        // Antiparallel: the two ways go opposite directions, which is what two carriageways do.
        if ((dx * sample.dx + dz * sample.dz) / Math.sqrt(length2) > -0.9) continue
        const t = Math.max(0, Math.min(1, ((sample.x - path[i].x) * dx + (sample.z - path[i].z) * dz) / length2))
        const point = { x: path[i].x + dx * t, z: path[i].z + dz * t }
        const distance = Math.hypot(sample.x - point.x, sample.z - point.z)
        if (distance < RoadMarkings.BARRIER_MIN_AXES_M || distance > RoadMarkings.BARRIER_MAX_AXES_M) continue
        if (!best || distance < best.distance) best = { distance, point }
      }
    }
    return best ? { x: (sample.x + best.point.x) / 2, z: (sample.z + best.point.z) / 2 } : undefined
  }

  /**
   * A path with a point every `step` metres, each with the direction of travel there, and its last point: a way the map cuts in two (at every
   * bridge: the RN2 over the railway at Silly-le-Long) is two paths, and a barrier that stopped short of the cut left a hole up to a step long.
   */
  private static resample(path: Point[], step: number): (Point & { dx: number, dz: number })[] {
    const out: (Point & { dx: number, dz: number })[] = []
    for (let i = 0; i < path.length - 1; i++) {
      const length = Math.hypot(path[i + 1].x - path[i].x, path[i + 1].z - path[i].z)
      if (length < 1e-6) continue
      const dx = (path[i + 1].x - path[i].x) / length
      const dz = (path[i + 1].z - path[i].z) / length
      for (let s = 0; s < length; s += step) out.push({ x: path[i].x + dx * s, z: path[i].z + dz * s, dx, dz })
    }
    const last = out.at(-1)
    if (last) out.push({ ...path[path.length - 1], dx: last.dx, dz: last.dz })
    return out
  }

  /**
   * The geometry of a barrier along each path: a prism, BARRIER_HEIGHT_M high, a ring of four points at each point of the path (the two feet and the two
   * edges of the top) with the three faces between one ring and the next.
   */
  static barrierGeometry(paths: Point[][], groundYAt: (x: number, z: number) => number): { positions: number[], indices: number[] } {
    const positions: number[] = []
    const indices: number[] = []
    const half = RoadMarkings.BARRIER_HALF_WIDTH_M
    for (const path of paths) {
      if (path.length < 2) continue
      const base = positions.length / 3
      for (let i = 0; i < path.length; i++) {
        const before = path[Math.max(0, i - 1)]
        const after = path[Math.min(path.length - 1, i + 1)]
        const length = Math.hypot(after.x - before.x, after.z - before.z) || 1
        // To the left of the way of travel, on the ground plane.
        const nx = -(after.z - before.z) / length * half
        const nz = (after.x - before.x) / length * half
        const y = groundYAt(path[i].x, path[i].z)
        positions.push(
          path[i].x + nx, y, path[i].z + nz,
          path[i].x + nx, y + RoadMarkings.BARRIER_HEIGHT_M, path[i].z + nz,
          path[i].x - nx, y + RoadMarkings.BARRIER_HEIGHT_M, path[i].z - nz,
          path[i].x - nx, y, path[i].z - nz
        )
      }
      for (let i = 0; i < path.length - 1; i++) {
        const a = base + i * 4
        const b = a + 4
        // The left face, the top and the right face, each a pair of triangles.
        for (let face = 0; face < 3; face++) indices.push(a + face, b + face, a + face + 1, a + face + 1, b + face, b + face + 1)
      }
    }
    return { positions, indices }
  }

  /** The stretches of a path that lie within `radiusM` of the origin: each a run of consecutive segments (one of whose ends is near), kept in one piece. */
  static near(path: Point[], radiusM: number): Point[][] {
    const runs: Point[][] = []
    let current: Point[] | undefined
    for (let i = 0; i < path.length - 1; i++) {
      const close = Math.min(Math.hypot(path[i].x, path[i].z), Math.hypot(path[i + 1].x, path[i + 1].z)) <= radiusM
        // A long segment can pass near without an end being so: its middle says.
        || Math.hypot((path[i].x + path[i + 1].x) / 2, (path[i].z + path[i + 1].z) / 2) <= radiusM
      if (close) {
        if (!current) current = [path[i]]
        current.push(path[i + 1])
      } else if (current) {
        runs.push(current)
        current = undefined
      }
    }
    if (current) runs.push(current)
    return runs
  }

  /** A path cut into dashes: `on` metres kept, `off` left, along it, the pattern running on across the bends. */
  static dashes(path: Point[], on: number, off: number): Point[][] {
    const out: Point[][] = []
    const period = on + off
    let along = 0
    let current: Point[] | undefined
    const at = (index: number, t: number) => ({ x: path[index].x + (path[index + 1].x - path[index].x) * t, z: path[index].z + (path[index + 1].z - path[index].z) * t })
    for (let i = 0; i < path.length - 1; i++) {
      const length = Math.hypot(path[i + 1].x - path[i].x, path[i + 1].z - path[i].z)
      if (length < 1e-6) continue
      // The metres along this segment where the pattern changes between a dash and a gap.
      let local = 0
      while (local < length) {
        const phase = (along + local) % period
        const inDash = phase < on
        const toChange = inDash ? on - phase : period - phase
        const stop = Math.min(length, local + toChange)
        if (inDash) {
          if (!current) current = [at(i, local / length)]
          current.push(at(i, stop / length))
          if (stop - local >= toChange - 1e-9) {
            out.push(current)
            current = undefined
          }
        }
        local = stop
      }
      along += length
    }
    if (current && current.length >= 2) out.push(current)
    // Not a sliver of a dash where the way ends in the middle of a gap's end.
    const lengthOf = (dash: Point[]) => dash.slice(1).reduce((sum, point, i) => sum + Math.hypot(point.x - dash[i].x, point.z - dash[i].z), 0)
    return out.filter(dash => dash.length >= 2 && lengthOf(dash) >= RoadMarkings.MIN_DASH_M)
  }
}
