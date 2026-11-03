import { HumanMotion } from "../model/ObserverTrack.js"
import type { DriveExpansion } from "./DriveExpansion.js"
import { DriveExpansion as Drive } from "./DriveExpansion.js"
import type { LeanParams, LookAheadParams, VehiclePoint, WatchParams } from "./RecordingEvent.js"

/** What a driver looks at, from an instant on. */
type GazeMode = "watch" | "glance" | "road" | "mirror"

/** What the look is worked out from at an instant: the road's heading, what is watched (its heading and the pitch looked at), the eye at rest. */
interface GazeSample {
  t: number
  roadDeg: number
  headingDeg: number
  pitchDeg: number
  eye: VehiclePoint
}

/** A pose of a driver at an instant: where they look, and where their eye is in the vehicle. */
export interface DriverPose {
  t: number
  headingDeg: number
  pitchDeg: number
  eye: VehiclePoint
  roadDeg: number
  lat: number
  lng: number
}

/**
 * Where a driver looks while driving, from the events that say how (see LookAheadParams, LeanParams, WatchParams), and where their eye is
 * in the vehicle meanwhile. Every turn of the head is a person's: it starts from still, takes TURN_S plus TURN_S_PER_DEG a degree, arrives still
 * moving at HumanMotion.ARRIVAL of its mean pace and swings a little past, settling back as HumanMotion.settle does; and a turn cut short by
 * the next starts from where the head is, not from where it was going. Written densely (DENSE_MS) where the head moves, every STEP_MS
 * elsewhere, so that the interpolation between the poses cannot spoil it.
 */
export class GazeExpansion {
  private static readonly STEP_MS = 250
  private static readonly DENSE_MS = 50
  /** How long after a turn its settling is written. */
  private static readonly SETTLED_MS = 700
  private static readonly TURN_S = 0.4
  private static readonly TURN_S_PER_DEG = 0.5 / 150
  /** A driver looking at the road looks a little down it. */
  private static readonly ROAD_PITCH_DEG = -1
  /** Looking back over the shoulder, the head turns about the neck and the eyes come forward and towards the door, past the headrest: this far once
   * looking straight behind, none up to TWIST_FROM_DEG off the road. */
  private static readonly SHOULDER: VehiclePoint = { x: -0.08, y: 0, z: -0.07 }
  private static readonly TWIST_FROM_DEG = 60

  private readonly aimed: number[]
  private readonly pitched: number[]
  private readonly times: number[]

  /**
   * @param pitchAt the phenomenon's height in the observer's sky at `t`, degrees (from the account's shapes)
   */
  constructor(
    private readonly drive: DriveExpansion, private readonly eye: VehiclePoint, private readonly lookAhead: LookAheadParams,
    private readonly lean: { t: number, params: LeanParams } | undefined, private readonly watch: { t: number, params: WatchParams } | undefined,
    pitchAt: (t: number) => number
  ) {
    this.times = drive.sampleTimes
    // What is watched, sampled with the vehicle and drawn through as it is: its heading unwrapped, so that its curve does not jump at north.
    const share = lookAhead.pitchShare ?? 1
    this.aimed = []
    for (const t of this.times) {
      const bearing = drive.bearingAt(t, lookAhead.target)
      const previous = this.aimed[this.aimed.length - 1]
      this.aimed.push(previous === undefined ? bearing : previous + GazeExpansion.signed(bearing - previous))
    }
    this.pitched = this.times.map(t => pitchAt(t) * share)
  }

  /** The driver's poses from `from` to `until`. */
  poses(from: number, until: number): DriverPose[] {
    const grid: number[] = []
    for (let t = from; t < until; t += GazeExpansion.STEP_MS) grid.push(t)
    grid.push(until)
    const off = new Map(grid.map(t => {
      const sample = this.sample(t)
      return [t, GazeExpansion.signed(sample.headingDeg - sample.roadDeg)]
    }))
    const offAt = (t: number) => off.get(grid.reduce((best, each) => Math.abs(each - t) < Math.abs(best - t) ? each : best))!
    const schedule = this.schedule(offAt, until)
    const mirrorFrom = this.watch?.t
    const durations = schedule.map(([start, mode], k) => {
      if (k === 0) return 0
      if (start === mirrorFrom && this.lean) return this.lean.params.turnS
      const sample = this.sample(start)
      return GazeExpansion.turnS(this.target(schedule[k - 1][1], sample), this.target(mode, sample))
    })
    // Dense where the head moves fast: each turn, and the lean towards the mirror and back.
    const times = new Set(grid)
    const ramps: [number, number][] = schedule.map(([start], k) => [start, durations[k]])
    if (this.lean) ramps.push([this.lean.t, this.lean.params.turnS], [this.lean.t + this.lean.params.holdS * 1000, this.lean.params.turnS])
    for (const [start, durationS] of ramps) {
      const end = Math.round(start + durationS * 1000 + GazeExpansion.SETTLED_MS) + GazeExpansion.DENSE_MS
      for (let t = Math.round(start); t < end; t += GazeExpansion.DENSE_MS) if (t >= from && t <= until) times.add(t)
    }
    return [...times].sort((a, b) => a - b).map(t => {
      const sample = this.sample(t)
      const [headingDeg, pitchDeg] = this.gaze(schedule, durations, sample)
      const state = this.drive.stateAt(t)
      return { t, headingDeg, pitchDeg, eye: this.eyeAt(t, GazeExpansion.signed(headingDeg - sample.roadDeg)), roadDeg: state.roadDeg, lat: state.lat, lng: state.lng }
    })
  }

  /** Who is looked at from when. `offAt(t)` is the phenomenon's angle off the vehicle's axis at t, degrees. */
  private schedule(offAt: (t: number) => number, until: number): [number, GazeMode][] {
    const schedule: [number, GazeMode][] = []
    const look = this.lookAhead
    const mirrorFrom = this.watch?.t ?? until
    let t = 0
    while (t < mirrorFrom) {
      if (Math.abs(offAt(t)) <= look.glanceBeyondDeg) {
        if (schedule.length === 0 || schedule[schedule.length - 1][1] !== "watch") schedule.push([t, "watch"])
        t += GazeExpansion.STEP_MS
        continue
      }
      schedule.push([t, "glance"])
      t += look.glanceS * 1000
      if (t >= mirrorFrom) break
      schedule.push([t, "road"])
      t += look.roadS * 1000
    }
    if (!this.watch) return schedule
    const watch = this.watch.params
    t = mirrorFrom
    schedule.push([t, "mirror"])
    t += watch.firstS * 1000
    let cycle = 0
    while (t < until) {
      // Over the shoulder every other time while they still glance at it, the road the others.
      const away: GazeMode = t < watch.glancesUntil && cycle % 2 === 0 ? "glance" : "road"
      schedule.push([t, away])
      t += (away === "glance" ? watch.glanceS : watch.roadS) * 1000
      schedule.push([t, "mirror"])
      t += watch.mirrorS * 1000
      cycle++
    }
    return schedule
  }

  /** What the look is worked out from at `t`. */
  private sample(t: number): GazeSample {
    const times = this.times
    const last = times.length - 2
    let i = 0
    while (i < last && times[i + 1] < t) i++
    const f = (t - times[i]) / (times[i + 1] - times[i])
    const four = (values: number[]): [number, number, number, number] => [
      i > 0 ? values[i - 1] : 2 * values[i] - values[i + 1],
      values[i], values[i + 1],
      i + 2 < values.length ? values[i + 2] : 2 * values[i + 1] - values[i]
    ]
    return {
      t,
      roadDeg: this.drive.stateAt(t).roadDeg,
      headingDeg: ((Drive.catmull(four(this.aimed), f) % 360) + 360) % 360,
      pitchDeg: Drive.catmull(four(this.pitched), f),
      eye: this.eyeAt(t, 0)
    }
  }

  /** Where the driver looks in `mode`, as (heading, pitch). */
  private target(mode: GazeMode, sample: GazeSample): [number, number] {
    const { roadDeg, headingDeg, pitchDeg, eye } = sample
    if (mode === "glance") return [headingDeg, pitchDeg]
    if (mode === "watch") {
      // As far as keeps it within about keepDeg of where they look, eased in: no head stops at the road, then starts all at once.
      const off = GazeExpansion.signed(headingDeg - roadDeg)
      const keep = this.lookAhead.keepDeg
      const turn = off - keep * Math.tanh(off / keep)
      const share = off ? turn / off : 0
      return [GazeExpansion.normalized(roadDeg + turn), GazeExpansion.ROAD_PITCH_DEG + (pitchDeg - GazeExpansion.ROAD_PITCH_DEG) * share]
    }
    if (mode === "road" || !this.watch) return [roadDeg, GazeExpansion.ROAD_PITCH_DEG]
    const mirror = this.watch.params.mirror
    const toward = { x: mirror.x - eye.x, y: mirror.y - eye.y, z: mirror.z - eye.z }
    const left = Math.atan2(-toward.x, -toward.z) * 180 / Math.PI
    const down = Math.atan2(toward.y, Math.hypot(toward.x, toward.z)) * 180 / Math.PI
    return [GazeExpansion.normalized(roadDeg - left), down]
  }

  /**
   * (heading, pitch) at the sample's instant: what the schedule says, eased over that turn's duration from where the head IS, which is still the
   * previous turn if it has not ended.
   */
  private gaze(schedule: [number, GazeMode][], durations: number[], sample: GazeSample, index?: number): [number, number] {
    const t = sample.t
    let k = index ?? 0
    if (index === undefined && t >= schedule[0][0]) {
      for (let j = 0; j < schedule.length; j++) if (schedule[j][0] <= t) k = j
    }
    const [heading, pitch] = this.target(schedule[k][1], sample)
    if (k === 0) return [heading, pitch]
    const durationMs = durations[k] * 1000
    const elapsed = t - schedule[k][0]
    if (elapsed > durationMs + GazeExpansion.SETTLED_MS) return [heading, pitch]
    const [beforeHeading, beforePitch] = this.gaze(schedule, durations, sample, k - 1)
    if (elapsed < durationMs) {
      // From still, arriving at HumanMotion.ARRIVAL of the mean pace: the Hermite curve HumanMotion.gaze draws, in shares of the turn.
      const x = elapsed / durationMs
      const share = -2 * x ** 3 + 3 * x * x + (x ** 3 - x * x) * HumanMotion.ARRIVAL
      return [GazeExpansion.normalized(beforeHeading + GazeExpansion.signed(heading - beforeHeading) * share), beforePitch + (pitch - beforePitch) * share]
    }
    // Arrived: the swing past and back, speed × τ × e^(−τ/T) (HumanMotion.settle), on what it turned to.
    const turn = GazeExpansion.signed(heading - beforeHeading)
    const tau = elapsed - durationMs
    const swing = HumanMotion.ARRIVAL / durationMs * tau * Math.exp(-tau / Math.min(HumanMotion.SETTLE_MS, 0.4 * durationMs))
    return [GazeExpansion.normalized(heading + turn * swing), pitch + (pitch - beforePitch) * swing]
  }

  /** How far into the lean towards the mirror the head is at `t`, 0 to 1. */
  private leanAt(t: number): number {
    if (!this.lean) return 0
    const { holdS, turnS } = this.lean.params
    const since = (t - this.lean.t) / 1000
    if (since < 0 || since > holdS + turnS) return 0
    return GazeExpansion.smooth(Math.min(1, since / turnS, (holdS + turnS - since) / turnS))
  }

  /** Where the eye is in the vehicle at `t`, looking `offDeg` off the road. */
  private eyeAt(t: number, offDeg: number): VehiclePoint {
    const lean = this.leanAt(t)
    const offset = this.lean?.params.offsetM ?? { x: 0, y: 0, z: 0 }
    const twist = GazeExpansion.smooth((Math.abs(offDeg) - GazeExpansion.TWIST_FROM_DEG) / (180 - GazeExpansion.TWIST_FROM_DEG))
    const shoulder = GazeExpansion.SHOULDER
    return {
      x: this.eye.x + offset.x * lean + shoulder.x * twist,
      y: this.eye.y + offset.y * lean + shoulder.y * twist,
      z: this.eye.z + offset.z * lean + shoulder.z * twist
    }
  }

  /** How long a head takes to turn from one (heading, pitch) to another, s. */
  private static turnS(before: [number, number], after: [number, number]): number {
    return GazeExpansion.TURN_S + GazeExpansion.TURN_S_PER_DEG * Math.hypot(GazeExpansion.signed(after[0] - before[0]), after[1] - before[1])
  }

  /** The minimum-jerk profile from 0 to 1: speed and acceleration both nought at either end. */
  private static smooth(x: number): number {
    const c = Math.min(1, Math.max(0, x))
    return c * c * c * (10 - 15 * c + 6 * c * c)
  }

  private static signed(deg: number): number {
    return ((deg + 540) % 360 + 360) % 360 - 180
  }

  private static normalized(deg: number): number {
    return ((deg % 360) + 360) % 360
  }
}
