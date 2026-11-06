import type { RecordingEventJson } from "./RecordingEvent.js"
import { SkyPath } from "./SkyPath.js"

/**
 * The phenomenon going across the sky banks (`roll`, `who` it), from the event's start to its end, from still and settling: to `toDeg`
 * (90: edge on, a line), or, `andBack`, to `toDeg` and back level again, as into a turn and out of it. Banked, it looks narrower across its
 * way, by the cosine of its bank, never under a twelfth: a thin wing seen edge on is still a line.
 */
export interface RollParams {
  toDeg: number
  andBack?: boolean
}

/**
 * The phenomenon going across the sky vibrates (`vibrate`, `who` it), from side to side across its way, `hz` times a second, by
 * `amplitudeShare` of its size: from nothing over `riseS`, then less and less, to nothing at the event's end.
 */
export interface VibrateParams {
  hz: number
  amplitudeShare: number
  riseS: number
}

/**
 * The phenomenon going across the sky spirals (`spiral`, `who` it), from the event's start to its end: `turns` round a circle beside its
 * way, clockwise or not as the observer saw it, as wide as `radiusDeg` once it has started and narrowing by `shrink` of that by its end;
 * rolling `rollDeg` as it does, at an even pace (a barrel roll).
 */
export interface SpiralParams {
  turns: number
  radiusDeg: number
  shrink: number
  clockwise: boolean
  rollDeg: number
}

/**
 * How a phenomenon going across the sky moves on its way, besides going along it (see RollParams, VibrateParams, SpiralParams): what its
 * events say of its bank, and how far from its way they take it on the observer's picture.
 */
export class SkyMotion {
  /** How much of its way the spiral has swept a quarter of the way through, the time it takes to open to its full width. */
  private static readonly SPIRAL_OPENS = 4
  /** The narrowest a banked phenomenon looks, as a share of its width across its way. */
  private static readonly THINNEST = 0.08

  private readonly rolls: RecordingEventJson[]
  private readonly vibrations: RecordingEventJson[]
  private readonly spirals: RecordingEventJson[]

  constructor(events: RecordingEventJson[], private readonly end: number) {
    const sorted = [...events].sort((a, b) => a.t - b.t)
    this.rolls = sorted.filter(event => event.eventType === "roll")
    this.vibrations = sorted.filter(event => event.eventType === "vibrate")
    this.spirals = sorted.filter(event => event.eventType === "spiral")
  }

  /** How far it is banked at `t`, degrees. */
  rollAt(t: number): number {
    let base = 0
    let roll = 0
    for (const event of this.rolls) {
      if (t < event.t) break
      const params = event.params as unknown as RollParams
      const x = this.progress(event, t)
      // Into a turn and out of it, back where it was; or to where it then stays.
      roll = base + (params.toDeg - base) * (params.andBack ? Math.sin(Math.PI * SkyPath.smooth(x)) : SkyPath.smooth(x))
      if (!params.andBack) base = params.toDeg
    }
    for (const event of this.spirals) {
      if (t < event.t) break
      const params = event.params as unknown as SpiralParams
      roll = base + (params.clockwise ? 1 : -1) * params.rollDeg * this.progress(event, t)
    }
    return roll
  }

  /** How wide across its way it looks at `t`, as a share of its width: the cosine of its bank. */
  acrossShareAt(t: number): number {
    return Math.max(SkyMotion.THINNEST, Math.abs(Math.cos(this.rollAt(t) * Math.PI / 180)))
  }

  /** How far it vibrates across its way at `t`, degrees, given its size then: positive to its left. */
  sidewaysAt(t: number, sizeDeg: number): number {
    let sideways = 0
    for (const event of this.vibrations) {
      const until = event.until ?? this.end
      if (t < event.t || t >= until) continue
      const params = event.params as unknown as VibrateParams
      const ramp = SkyPath.smooth((t - event.t) / (params.riseS * 1000)) * Math.max(0, 1 - (t - event.t) / (until - event.t))
      sideways += params.amplitudeShare * sizeDeg * ramp * Math.sin(2 * Math.PI * params.hz * (t - event.t) / 1000)
    }
    return sideways
  }

  /** How far the spiral has taken it from its way at `t`, on the observer's picture (tangents right and up); none outside one. */
  spiralAt(t: number): [number, number] | undefined {
    const event = [...this.spirals].reverse().find(candidate => candidate.t <= t)
    if (!event) return undefined
    const params = event.params as unknown as SpiralParams
    const k = this.progress(event, t)
    const radius = Math.tan(params.radiusDeg * Math.PI / 180) * SkyPath.smooth(k * SkyMotion.SPIRAL_OPENS) * (1 - params.shrink * SkyPath.smooth(k))
    const phase = -(params.clockwise ? 1 : -1) * 2 * Math.PI * params.turns * k
    return [radius * (Math.cos(phase) - 1), radius * Math.sin(phase)]
  }

  /** How far through `event` `t` is, 0 to 1. */
  private progress(event: RecordingEventJson, t: number): number {
    const until = event.until ?? this.end
    if (until <= event.t) return 1
    return Math.max(0, Math.min(1, (t - event.t) / (until - event.t)))
  }
}
