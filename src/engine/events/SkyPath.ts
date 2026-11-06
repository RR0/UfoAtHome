import type { RecordingEventJson } from "./RecordingEvent.js"

/** A direction in the observer's sky, degrees. */
export interface SkyDirection {
  azimuthDeg: number
  altitudeDeg: number
}

/**
 * The phenomenon goes across the observer's sky (`travel`, `who` it, or the group of its shapes), with no place of its own: an account of
 * directions only, as one seen at night with nothing to tell how far it was. From `from`, heading for `towards` along the great circle
 * between them, at `speeds` (degrees of sky a second, from still between two of them as anything speeds up and slows down), turned by its
 * `turn`s, until the event's end.
 */
export interface TravelParams {
  from: SkyDirection
  towards: SkyDirection
  speeds: { t: number, degPerS: number }[]
  /** How wide it appears at the zenith, degrees: what its parts' shares are of. */
  sizeDeg: number
  /**
   * How its apparent size changes: "altitude", as the sine of its altitude (smallest near the horizon, whole at the zenith: what an object
   * flying over the observer at no constant height looks like, with nothing more said), never under a tenth. Constant when absent.
   */
  sizeBy?: "altitude"
}

/**
 * The phenomenon going across the sky turns (`turn`, `who` it), between the event's start and its end: by `byDeg`, to its `side`, from
 * still and settling. A side said from the craft (`seenFrom` "craft", as a drone's pilot says it) is the other one on the sky seen from
 * below.
 */
export interface SkyTurnParams {
  byDeg: number
  side: "left" | "right"
  seenFrom?: "craft"
}

type Vector = [number, number, number]

/**
 * Where a phenomenon going across the sky is at each instant (see TravelParams, SkyTurnParams): a flight on the sphere of the sky, its
 * place and its heading moved together every STEP_MS, as a direction and the tangent along which it goes.
 */
export class SkyPath {
  private static readonly STEP_MS = 5
  private readonly directions: SkyDirection[] = []

  constructor(private readonly travel: RecordingEventJson, turns: RecordingEventJson[], end: number) {
    const params = travel.params as unknown as TravelParams
    const until = travel.until ?? end
    let p = SkyPath.unit(params.from)
    let tangent = SkyPath.towards(p, SkyPath.unit(params.towards))
    const sides = turns.map(turn => {
      const turnParams = turn.params as unknown as SkyTurnParams
      const left = turnParams.side === "left" ? 1 : -1
      return { from: turn.t, to: turn.until ?? turn.t, radians: turnParams.byDeg * Math.PI / 180 * (turnParams.seenFrom === "craft" ? -left : left) }
    })
    const step = SkyPath.STEP_MS
    for (let ms = travel.t; ms <= until; ms += step) {
      this.directions.push(SkyPath.direction(p))
      for (const turn of sides) {
        const span = turn.to - turn.from
        if (span <= 0) continue
        const angle = turn.radians * (SkyPath.smooth((ms + step - turn.from) / span) - SkyPath.smooth((ms - turn.from) / span))
        if (angle) tangent = SkyPath.add(SkyPath.scale(tangent, Math.cos(angle)), SkyPath.scale(SkyPath.cross(tangent, p), Math.sin(angle)))
      }
      const d = SkyPath.speedAt(params.speeds, ms) * step / 1000 * Math.PI / 180
      const moved = SkyPath.add(SkyPath.scale(p, Math.cos(d)), SkyPath.scale(tangent, Math.sin(d)))
      tangent = SkyPath.add(SkyPath.scale(tangent, Math.cos(d)), SkyPath.scale(p, -Math.sin(d)))
      p = moved
    }
  }

  /** Where it is at `t`: at the step nearest. */
  at(t: number): SkyDirection {
    const index = Math.round((t - this.travel.t) / SkyPath.STEP_MS)
    return this.directions[Math.max(0, Math.min(this.directions.length - 1, index))]
  }

  /** How wide it appears at `t`, degrees. */
  sizeAt(t: number): number {
    const params = this.travel.params as unknown as TravelParams
    if (params.sizeBy !== "altitude") return params.sizeDeg
    return params.sizeDeg * Math.max(0.1, Math.sin(Math.max(this.at(t).altitudeDeg, 1) * Math.PI / 180))
  }

  /** Its speed at `ms`: from still between two speeds it states, held before the first and after the last. */
  private static speedAt(speeds: TravelParams["speeds"], ms: number): number {
    if (speeds.length === 0) return 0
    if (ms <= speeds[0].t) return speeds[0].degPerS
    for (let index = 1; index < speeds.length; index++) {
      const a = speeds[index - 1], b = speeds[index]
      if (ms < b.t) return a.degPerS + (b.degPerS - a.degPerS) * SkyPath.smooth((ms - a.t) / (b.t - a.t))
    }
    return speeds[speeds.length - 1].degPerS
  }

  static smooth(x: number): number {
    const clamped = Math.max(0, Math.min(1, x))
    return clamped * clamped * (3 - 2 * clamped)
  }

  static unit(direction: SkyDirection): Vector {
    const a = direction.azimuthDeg * Math.PI / 180, h = direction.altitudeDeg * Math.PI / 180
    return [Math.cos(h) * Math.sin(a), Math.cos(h) * Math.cos(a), Math.sin(h)]
  }

  static direction(v: Vector): SkyDirection {
    return {
      azimuthDeg: ((Math.atan2(v[0], v[1]) * 180 / Math.PI) % 360 + 360) % 360,
      altitudeDeg: Math.asin(Math.max(-1, Math.min(1, v[2]))) * 180 / Math.PI
    }
  }

  /** The unit tangent at `p` of the great circle from `p` to `q`. */
  private static towards(p: Vector, q: Vector): Vector {
    const along = SkyPath.add(q, SkyPath.scale(p, -SkyPath.dot(p, q)))
    const length = Math.hypot(...along) || 1
    return SkyPath.scale(along, 1 / length)
  }

  /**
   * Where `direction` is on the picture plane of an eye looking at `headingDeg`, `pitchDeg`: tangents of the angles to the right and up from
   * the middle, as a pinhole projects it.
   */
  static toScreen(direction: SkyDirection, headingDeg: number, pitchDeg: number): [number, number] {
    const [f, r, u] = SkyPath.basis(headingDeg, pitchDeg)
    const d = SkyPath.unit(direction)
    const z = SkyPath.dot(d, f)
    return [SkyPath.dot(d, r) / z, SkyPath.dot(d, u) / z]
  }

  /** The direction at a point of the picture plane (see toScreen). */
  static fromScreen(x: number, y: number, headingDeg: number, pitchDeg: number): SkyDirection {
    const [f, r, u] = SkyPath.basis(headingDeg, pitchDeg)
    const v: Vector = [f[0] + x * r[0] + y * u[0], f[1] + x * r[1] + y * u[1], f[2] + x * r[2] + y * u[2]]
    const n = Math.hypot(...v)
    return SkyPath.direction([v[0] / n, v[1] / n, v[2] / n])
  }

  /** An eye's forward, right and up. */
  private static basis(headingDeg: number, pitchDeg: number): [Vector, Vector, Vector] {
    const h = headingDeg * Math.PI / 180, p = pitchDeg * Math.PI / 180
    return [
      [Math.cos(p) * Math.sin(h), Math.cos(p) * Math.cos(h), Math.sin(p)],
      [Math.cos(h), -Math.sin(h), 0],
      [-Math.sin(p) * Math.sin(h), -Math.sin(p) * Math.cos(h), Math.cos(p)]
    ]
  }

  static dot(a: Vector, b: Vector): number {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
  }

  private static cross(a: Vector, b: Vector): Vector {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
  }

  private static add(a: Vector, b: Vector): Vector {
    return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
  }

  private static scale(v: Vector, k: number): Vector {
    return [v[0] * k, v[1] * k, v[2] * k]
  }
}
