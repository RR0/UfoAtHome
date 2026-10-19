import type { RailwayKind } from "./terrain/RailwayProvider.js"
import type { GroundYAt } from "./RoadSystem.js"

/** One line laid out along its centre: its rungs on the ground plane, their distance along it, and the map's altitude at each where it gives one. */
export interface TrackLayout {
  kind: RailwayKind
  highSpeed?: boolean
  level: number
  centre: { x: number, z: number, altitudeM?: number }[]
  along: number[]
}

/**
 * The height of the formation of every line of a patch: what a track is laid on, which is not the relief under it.
 *
 * WHY: the relief is the bare earth, with the structures taken out: under a bridge it is the road that goes under it, and a track laid on it
 * dipped two metres into the hollow of every underpass (the RER B over the avenue Jean Monnet at Antony: the map's altitude 6.0 m over the road,
 * the relief at the abutments 4.3 m). A railway does not follow the ground: its profile is long and gentle (a few per mille, 25 at most on most of
 * the network, 35 on a high-speed line), and the earthworks (an embankment, a cutting) and the structures are what make the ground fit it.
 *
 * HOW, for a line on the ground:
 * - the target at each rung is the relief, or the map's own altitude (moved onto the scene's zero, see `offset`) where it stands more than
 *   HOLLOW_M over the relief: the map's altitude is the track's (to a metre and a half), the relief there is a hole under a structure;
 * - the height is the median of the targets within WINDOW_M along the line and the lines that meet its ends (and only those: a line passing
 *   alongside at another height, the approach of a flyover, is another profile). A hollow narrower than the window is passed over, a slope is
 *   followed exactly. The lines that meet at a node take the same samples there, so they meet at the same height;
 * - then held to the steepest grade of its kind (MAX_GRADE), from each end inwards, its ends unmoved.
 *
 * For a line carried over the ground (a bridge, a viaduct), the map's altitude, bent at each end to meet the lines on the ground there; with no
 * altitude, a straight deck between them.
 */
export class TrackProfile {
  /** A rung's target is the map's altitude where that stands this far over the relief: a hole the laser saw under a structure. */
  static readonly HOLLOW_M = 1
  /** How far along the lines the median is taken, each side: wider than an underpass and its ramps, narrower than a valley. */
  static readonly WINDOW_M = 30
  /** How far apart the samples are taken along a line. */
  static readonly SAMPLE_M = 4
  /**
   * The steepest a line of each kind climbs: 25 ‰ on the conventional lines (the usual limit of their design; a few mountain lines go past it,
   * whose relief the median follows anyway), 35 ‰ on a high-speed line, 40 on a metro, 60 on a light railway, 80 for a tram in a street.
   * Nothing for a funicular, which is built on the slope.
   */
  static readonly MAX_GRADE: Readonly<Record<RailwayKind | "highSpeed", number>> = {
    rail: 0.025, highSpeed: 0.035, subway: 0.04, light_rail: 0.06, tram: 0.08, funicular: Infinity
  }

  /** The heights, rung by rung, of each layout, in the order given. */
  static heights(layouts: readonly TrackLayout[], groundYAt: GroundYAt, offset: number | undefined): number[][] {
    const grounded = layouts.map(layout => layout.level === 0)
    const targets = layouts.map((layout, n) => grounded[n] ? TrackProfile.targets(layout, groundYAt, offset) : [])
    const samples = layouts.map((layout, n) => grounded[n] ? TrackProfile.samples(layout, targets[n]) : [])
    // Which lines on the ground end at each node: two lines meet where an end of one is an end of the other.
    const nodes = new Map<string, number[]>()
    layouts.forEach((layout, n) => {
      if (!grounded[n]) return
      for (const end of TrackProfile.ends(layout)) {
        const key = TrackProfile.key(end)
        const list = nodes.get(key)
        if (list) list.push(n)
        else nodes.set(key, [n])
      }
    })
    const nodeHeight = (point: { x: number, z: number }): number | undefined => {
      const touching = nodes.get(TrackProfile.key(point))
      if (!touching) return undefined
      return TrackProfile.median(touching.flatMap(n => samples[n]), point)
    }
    return layouts.map((layout, n) => {
      if (grounded[n]) {
        const pool = [...new Set([n, ...TrackProfile.ends(layout).flatMap(end => nodes.get(TrackProfile.key(end)) ?? [])])].flatMap(m => samples[m])
        const y = layout.centre.map((point, i) => TrackProfile.median(pool, point) ?? targets[n][i])
        // The ends as the lines meeting there have them, so a node is one height.
        const [first, last] = TrackProfile.ends(layout)
        y[0] = nodeHeight(first) ?? y[0]
        y[y.length - 1] = nodeHeight(last) ?? y[y.length - 1]
        return TrackProfile.graded(y, layout.along, layout.highSpeed ? TrackProfile.MAX_GRADE.highSpeed : TrackProfile.MAX_GRADE[layout.kind])
      }
      return TrackProfile.carried(layout, groundYAt, offset, nodeHeight)
    })
  }

  /** What a line on the ground is laid on at each rung, before smoothing: see the class doc. */
  private static targets(layout: TrackLayout, groundYAt: GroundYAt, offset: number | undefined): number[] {
    return layout.centre.map(point => {
      const ground = groundYAt(point.x, point.z)
      if (offset === undefined || point.altitudeM === undefined) return ground
      const mapped = point.altitudeM + offset
      return mapped - ground > TrackProfile.HOLLOW_M ? mapped : ground
    })
  }

  /** The targets every SAMPLE_M along a line, with where they stand. */
  private static samples(layout: TrackLayout, targets: number[]): { x: number, z: number, y: number }[] {
    const out: { x: number, z: number, y: number }[] = []
    let next = 0
    layout.centre.forEach((point, i) => {
      if (layout.along[i] + 1e-6 < next && i < layout.centre.length - 1) return
      out.push({ x: point.x, z: point.z, y: targets[i] })
      next = layout.along[i] + TrackProfile.SAMPLE_M
    })
    return out
  }

  /** The median of the samples within WINDOW_M of a point, or nothing where there are none. */
  private static median(samples: { x: number, z: number, y: number }[], at: { x: number, z: number }): number | undefined {
    const near: number[] = []
    for (const sample of samples) if (Math.hypot(sample.x - at.x, sample.z - at.z) <= TrackProfile.WINDOW_M) near.push(sample.y)
    if (near.length === 0) return undefined
    near.sort((a, b) => a - b)
    const middle = near.length >> 1
    return near.length % 2 === 1 ? near[middle] : (near[middle - 1] + near[middle]) / 2
  }

  /**
   * Held to a grade, the ends unmoved: from the start forwards, no rung may be farther from the one before than the grade allows; then from the
   * end backwards. Where the two ends themselves are farther apart than the grade allows, the line goes straight from one to the other.
   */
  static graded(y: number[], along: number[], grade: number): number[] {
    if (!Number.isFinite(grade) || y.length < 3) return y
    const out = [...y]
    const last = out.length - 1
    const length = along[last]
    if (Math.abs(out[last] - out[0]) > grade * length) return along.map(s => out[0] + (out[last] - out[0]) * s / length)
    for (let i = 1; i < last; i++) {
      const step = grade * (along[i] - along[i - 1])
      out[i] = Math.min(out[i - 1] + step, Math.max(out[i - 1] - step, out[i]))
    }
    for (let i = last - 1; i > 0; i--) {
      const step = grade * (along[i + 1] - along[i])
      out[i] = Math.min(out[i + 1] + step, Math.max(out[i + 1] - step, out[i]))
    }
    return out
  }

  /** A line carried over the ground: see the class doc. */
  private static carried(layout: TrackLayout, groundYAt: GroundYAt, offset: number | undefined, nodeHeight: (point: { x: number, z: number }) => number | undefined): number[] {
    const [first, last] = TrackProfile.ends(layout)
    const length = layout.along[layout.along.length - 1]
    const startHeight = nodeHeight(first)
    const endHeight = nodeHeight(last)
    if (offset !== undefined && layout.centre.every(point => point.altitudeM !== undefined)) {
      const mapped = layout.centre.map(point => point.altitudeM! + offset)
      const startShift = startHeight !== undefined ? startHeight - mapped[0] : 0
      const endShift = endHeight !== undefined ? endHeight - mapped[mapped.length - 1] : 0
      return mapped.map((value, i) => value + startShift + (endShift - startShift) * layout.along[i] / length)
    }
    const from = startHeight ?? groundYAt(first.x, first.z)
    const to = endHeight ?? groundYAt(last.x, last.z)
    return layout.along.map(s => from + (to - from) * s / length)
  }

  private static ends(layout: TrackLayout): [{ x: number, z: number }, { x: number, z: number }] {
    return [layout.centre[0], layout.centre[layout.centre.length - 1]]
  }

  /** Where an end is, to half a metre: two sections the map joins share the point. */
  static key(point: { x: number, z: number }): string {
    return `${Math.round(point.x * 2)},${Math.round(point.z * 2)}`
  }
}
