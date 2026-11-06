import type { DriveParams, EventPlace } from "./RecordingEvent.js"

/** A place in a local frame, metres east and north of its origin. */
interface Local {
  e: number
  n: number
}

/** Where the vehicle is at an instant, in the frame of the drive's first place, and which way the road goes there. */
export interface DriveState {
  eastM: number
  northM: number
  /** The road's heading there, degrees from north. */
  roadDeg: number
  /** Its place. */
  lat: number
  lng: number
}

/**
 * The places a drive goes through (see DriveParams): its speeds integrated along its path, placed by the one place it went through at a stated
 * instant, and read every SAMPLE_MS then drawn through as a Catmull-Rom curve. A path as a survey draws it is a broken line, whose heading
 * jumps at every vertex; the curve through samples two seconds apart is the vehicle's own line, and its heading turns as a vehicle turns.
 */
export class DriveExpansion {
  /** The Earth's mean radius, m, as the surveys' frame uses it. */
  private static readonly R = 6371008.8
  /** The speeds' integration step, ms. */
  private static readonly STEP_MS = 100
  /** How far apart the vehicle's line is sampled before it is drawn as a curve, ms. */
  static readonly SAMPLE_MS = 2000
  /** How long after its end the drive is integrated, so that the curve's last stretch has a point beyond it. */
  private static readonly BEYOND_MS = 80000

  private readonly origin: EventPlace
  private readonly cos0: number
  private readonly points: Local[]
  private readonly cumulative: number[]
  private readonly distances: number[]
  private readonly shift: number
  /** The samples the curve is drawn through, in the frame of the first one. */
  private readonly samples: { t: number, e: number, n: number }[]
  private readonly sampleOrigin: EventPlace
  private readonly sampleCos: number

  constructor(private readonly params: DriveParams, private readonly from: number, until: number) {
    this.origin = params.path[0]
    this.cos0 = Math.cos(params.path[0].lat * Math.PI / 180)
    this.points = params.path.map(place => this.local(place))
    this.cumulative = [0]
    for (let i = 1; i < this.points.length; i++) {
      const a = this.points[i - 1], b = this.points[i]
      this.cumulative.push(this.cumulative[i - 1] + Math.hypot(b.e - a.e, b.n - a.n))
    }
    // The distance covered at each step, before that step's own speed is added.
    this.distances = []
    let s = 0
    for (let t = from; t <= until + DriveExpansion.BEYOND_MS; t += DriveExpansion.STEP_MS) {
      this.distances.push(s)
      s += this.speedAt(t) * DriveExpansion.STEP_MS / 1000
    }
    this.shift = this.project(this.local(params.through)) - this.distanceAt(params.through.t)
    const places: { t: number, place: EventPlace }[] = []
    for (let t = from; t <= until; t += DriveExpansion.SAMPLE_MS) places.push({ t, place: this.placeAt(t) })
    this.sampleOrigin = places[0].place
    this.sampleCos = Math.cos(this.sampleOrigin.lat * Math.PI / 180)
    this.samples = places.map(({ t, place }) => ({
      t,
      e: (place.lng - this.sampleOrigin.lng) * Math.PI / 180 * DriveExpansion.R * this.sampleCos,
      n: (place.lat - this.sampleOrigin.lat) * Math.PI / 180 * DriveExpansion.R
    }))
  }

  /** The first place of the vehicle's line: what the decor that moves with it is placed from. */
  get start(): EventPlace {
    return this.sampleOrigin
  }

  /** Where the vehicle is at `t`, on its curve. */
  stateAt(t: number): DriveState {
    const samples = this.samples
    const last = samples.length - 2
    let i = 0
    while (i < last && samples[i + 1].t < t) i++
    const a = samples[i], b = samples[i + 1]
    const f = (t - a.t) / (b.t - a.t)
    // At either end the curve is carried on straight (a point mirrored past the last one), not stopped on a repeated point.
    const four = (values: number[]): [number, number, number, number] => [
      i > 0 ? values[i - 1] : 2 * values[i] - values[i + 1],
      values[i], values[i + 1],
      i + 2 < values.length ? values[i + 2] : 2 * values[i + 1] - values[i]
    ]
    const es = samples.map(sample => sample.e), ns = samples.map(sample => sample.n)
    const e = DriveExpansion.catmull(four(es), f)
    const n = DriveExpansion.catmull(four(ns), f)
    const roadDeg = ((Math.atan2(DriveExpansion.slope(four(es), f), DriveExpansion.slope(four(ns), f)) * 180 / Math.PI) % 360 + 360) % 360
    return {
      eastM: e, northM: n, roadDeg,
      lat: this.sampleOrigin.lat + n / DriveExpansion.R * 180 / Math.PI,
      lng: this.sampleOrigin.lng + e / (DriveExpansion.R * this.sampleCos) * 180 / Math.PI
    }
  }

  /** Which way `target` is from the vehicle's sampled place at `t`, degrees from north (the instants of the samples only). */
  bearingAt(t: number, target: EventPlace): number {
    const here = this.local(this.placeAt(t))
    const there = this.local(target)
    return ((Math.atan2(there.e - here.e, there.n - here.n) * 180 / Math.PI) % 360 + 360) % 360
  }

  /** The instants the vehicle's line is sampled at. */
  get sampleTimes(): number[] {
    return this.samples.map(sample => sample.t)
  }

  private placeAt(t: number): EventPlace {
    const at = this.along(this.distanceAt(t) + this.shift)
    return {
      lat: this.origin.lat + at.n / DriveExpansion.R * 180 / Math.PI,
      lng: this.origin.lng + at.e / (DriveExpansion.R * this.cos0) * 180 / Math.PI
    }
  }

  private distanceAt(t: number): number {
    const index = Math.max(0, Math.min(this.distances.length - 1, Math.round((t - this.from) / DriveExpansion.STEP_MS)))
    return this.distances[index]
  }

  /** The speed at `t`, m/s: the stated speeds, divided by the divisors stated. */
  private speedAt(t: number): number {
    const divisor = this.params.speedDivisors ? DriveExpansion.linear(this.params.speedDivisors.map(({ t, divisor, step }) => ({ t, value: divisor, step })), t) : 1
    return DriveExpansion.linear(this.params.speeds.map(({ t, kmh, step }) => ({ t, value: kmh, step })), t) / 3.6 / divisor
  }

  private local(place: EventPlace): Local {
    return {
      e: (place.lng - this.origin.lng) * Math.PI / 180 * DriveExpansion.R * this.cos0,
      n: (place.lat - this.origin.lat) * Math.PI / 180 * DriveExpansion.R
    }
  }

  /** The point `s` metres along the path, carried on along its last stretch beyond its end. */
  private along(s: number): Local {
    const points = this.points
    let i = 0
    while (i < points.length - 2 && this.cumulative[i + 1] < s) i++
    const a = points[i], b = points[i + 1]
    const f = (s - this.cumulative[i]) / (this.cumulative[i + 1] - this.cumulative[i])
    return { e: a.e + (b.e - a.e) * f, n: a.n + (b.n - a.n) * f }
  }

  /** How far along the path the point of it nearest `point` is. */
  private project(point: Local): number {
    let best = Infinity, at = 0
    for (let i = 0; i < this.points.length - 1; i++) {
      const a = this.points[i], b = this.points[i + 1]
      const dx = b.e - a.e, dy = b.n - a.n
      const f = Math.max(0, Math.min(1, ((point.e - a.e) * dx + (point.n - a.n) * dy) / (dx * dx + dy * dy)))
      const d = Math.hypot(a.e + dx * f - point.e, a.n + dy * f - point.n)
      if (d < best) {
        best = d
        at = this.cumulative[i] + f * Math.hypot(dx, dy)
      }
    }
    return at
  }

  /** A value stated at instants, linear between them and held beyond them. */
  /** A table of instants read at `t`: linear between two rows, at once at a row that says so (`step`), held before the first and after the last. */
  static linear(points: { t: number, value: number, step?: boolean }[], t: number): number {
    if (t <= points[0].t) return points[0].value
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i], b = points[i + 1]
      if (b.step && t < b.t) return a.value
      if (t <= b.t) return a.value + (b.value - a.value) * (t - a.t) / (b.t - a.t)
    }
    return points[points.length - 1].value
  }

  static catmull([p0, p1, p2, p3]: [number, number, number, number], f: number): number {
    return 0.5 * (2 * p1 + (p2 - p0) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f + (3 * p1 - p0 - 3 * p2 + p3) * f ** 3)
  }

  static slope([p0, p1, p2, p3]: [number, number, number, number], f: number): number {
    return 0.5 * ((p2 - p0) + 2 * (2 * p0 - 5 * p1 + 4 * p2 - p3) * f + 3 * (3 * p1 - p0 - 3 * p2 + p3) * f * f)
  }
}
