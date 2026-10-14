import type { RoadWay } from "./terrain/RoadProvider.js"
import { geoToLocalMeters } from "./terrain/GeoProjection.js"

/** One strip of a ribbon laid on the ground (see RoadSystem.appendPath): along `points`, `widthM` wide, shifted `offsetM` to the left of the way, lifted `liftM`. */
export type MarkingStrip = (points: { x: number, z: number }[], widthM: number, options: { offsetM: number, liftM: number, minHalfM: number }) => void

/**
 * The paint on a carriageway: an edge line each side and the dashed line of the middle, or of each lane on a wide one. What anchors a lit road in the eye,
 * since a beam on a plain surface is only a gradient, and a line that goes by says how fast and how far.
 *
 * Loaded only for a scene that has roads wide enough to be painted (see RoadSystem.set): a recording with no roads, or only tracks, never brings it in.
 */
export class RoadMarkings {
  /** A carriageway narrower than this is a lane or a track, and has no paint. */
  static readonly MIN_ROAD_M = 5.5
  /** From this width a road has two lanes each way, and the dashes mark the lanes instead of the middle. */
  static readonly WIDE_ROAD_M = 9
  static readonly LINE_WIDTH_M = 0.12
  /** A dash and the gap after it, metres: 3 and 9 for a road with no dual carriageway (a rule of the French road code, for the line of a lane). */
  static readonly DASH_M = 3
  static readonly GAP_M = 9
  /** A dash shorter than this is not drawn. */
  static readonly MIN_DASH_M = 0.5
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

  /** Whether a way is painted. */
  static painted(way: Pick<RoadWay, "surface" | "widthM">): boolean {
    return way.surface === "paved" && way.widthM >= RoadMarkings.MIN_ROAD_M
  }

  /**
   * Lays the paint of every painted way, through `strip` (which puts a strip on the ground, one rung at a time, where it was asked for).
   *
   * @returns How many strips were laid: nothing for a network with nothing to paint.
   */
  static lay(ways: RoadWay[], originLat: number, originLng: number, strip: MarkingStrip): number {
    let strips = 0
    for (const way of ways) {
      if (!RoadMarkings.painted(way)) continue
      const whole = way.points.map(point => geoToLocalMeters(point.lat, point.lng, originLat, originLng))
      const half = way.widthM / 2
      // Only the stretches of the way that are near enough to be seen.
      for (const path of RoadMarkings.near(whole, RoadMarkings.PAINT_RADIUS_M)) {
        // The edges, whole.
        for (const side of [1, -1]) {
          strip(path, RoadMarkings.LINE_WIDTH_M, { offsetM: side * (half - RoadMarkings.EDGE_SETBACK_M), liftM: RoadMarkings.LIFT_M, minHalfM: RoadMarkings.LINE_WIDTH_M / 2 })
          strips++
        }
        // The middle, or the lanes, in dashes.
        const offsets = way.widthM >= RoadMarkings.WIDE_ROAD_M ? [-way.widthM / 4, way.widthM / 4] : [0]
        const dashes = RoadMarkings.dashes(path, RoadMarkings.DASH_M, RoadMarkings.GAP_M)
        for (const offsetM of offsets) {
          for (const dash of dashes) {
            strip(dash, RoadMarkings.LINE_WIDTH_M, { offsetM, liftM: RoadMarkings.LIFT_M, minHalfM: RoadMarkings.LINE_WIDTH_M / 2 })
            strips++
          }
        }
      }
    }
    return strips
  }

  /** The stretches of a path that lie within `radiusM` of the origin: each a run of consecutive segments (one of whose ends is near), kept in one piece. */
  static near(path: { x: number, z: number }[], radiusM: number): { x: number, z: number }[][] {
    const runs: { x: number, z: number }[][] = []
    let current: { x: number, z: number }[] | undefined
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
  static dashes(path: { x: number, z: number }[], on: number, off: number): { x: number, z: number }[][] {
    const out: { x: number, z: number }[][] = []
    const period = on + off
    let along = 0
    let current: { x: number, z: number }[] | undefined
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
    const lengthOf = (dash: { x: number, z: number }[]) => dash.slice(1).reduce((sum, point, i) => sum + Math.hypot(point.x - dash[i].x, point.z - dash[i].z), 0)
    return out.filter(dash => dash.length >= 2 && lengthOf(dash) >= RoadMarkings.MIN_DASH_M)
  }
}
