import type { PrecipitationType, Weather } from "../model/Weather.js"

/** One keyframe as the ramp reads it: when, how hard, and as what. */
interface RampPoint {
  t: number
  /** The last kind of precipitation stated at or before this keyframe: what is still falling
   * after a keyframe that says "none", until the rain has had time to stop. */
  lastFalling: PrecipitationType
  /** 0 when nothing falls, whatever the stored intensity says (it is meaningless under "none"). */
  intensity: number
  type: PrecipitationType
}

/**
 * How hard it is raining at any instant, given what the keyframes say it should be — never faster
 * to change than real rain does.
 *
 * A recording states the weather at a few instants, and blending straight between two of them makes
 * a shower start the way a tap does: nothing, then a downpour, as fast as the keyframes are close.
 * Real rain does not begin like that. The first drops come alone and the rest follow; even a
 * shower that "falls all at once" takes seconds to reach its full rate, and ends the same way. So
 * the intensity here FOLLOWS the blended one, starting from where the recording starts it and
 * moving towards it no faster than MAX_CHANGE_PER_S: a change the keyframes spread over longer is
 * followed exactly, and one they compress is stretched to the time rain takes.
 *
 * The onset is never moved earlier: rain the recording starts at twelve seconds starts at twelve
 * seconds, and reaches its stated rate a little later rather than earlier.
 *
 * The drops themselves need nothing more: how many are drawn already goes with the intensity (see
 * SceneRenderer's precipitationVisibleCount), so a ramp from nothing IS a few drops, then more.
 */
export class PrecipitationRamp {
  /** From nothing to the heaviest rain in twenty seconds: what a convective shower does at its
   * fastest, and still "all at once" to someone standing in it. */
  static readonly MAX_CHANGE_PER_S = 0.05

  private readonly points: RampPoint[]
  /** The followed intensity at each keyframe — the state the next stretch starts from. */
  private readonly followed: number[]

  constructor(keyframes: ReadonlyArray<{ t: number; weather: Weather }>) {
    let lastFalling: PrecipitationType = "none"
    this.points = keyframes.map(({ t, weather }) => {
      if (weather.precipitationType !== "none") lastFalling = weather.precipitationType
      return {
        t,
        lastFalling,
        intensity: weather.precipitationType === "none" ? 0 : weather.precipitationIntensity,
        type: weather.precipitationType
      }
    })
    this.followed = []
    for (let index = 0; index < this.points.length; index++) {
      if (index === 0) {
        this.followed.push(this.points[0].intensity)
        continue
      }
      const from = this.points[index - 1]
      const to = this.points[index]
      this.followed.push(PrecipitationRamp.follow(this.followed[index - 1], from.intensity, to.intensity, (to.t - from.t) / 1000, (to.t - from.t) / 1000))
    }
  }

  /** The precipitation at `t`: its type and how hard. Undefined outside the keyframes' span, where
   * the caller holds the nearest keyframe as it always has. */
  at(tMs: number): { type: PrecipitationType; intensity: number } | undefined {
    if (this.points.length === 0 || tMs < this.points[0].t) return undefined
    let index = this.points.length - 1
    while (index > 0 && this.points[index].t > tMs) index--
    const from = this.points[index]
    const to = this.points[index + 1]
    const intensity = to
      ? PrecipitationRamp.follow(this.followed[index], from.intensity, to.intensity, (to.t - from.t) / 1000, (tMs - from.t) / 1000)
      : PrecipitationRamp.follow(this.followed[index], from.intensity, from.intensity, 1, (tMs - from.t) / 1000)
    return { type: PrecipitationRamp.typeBetween(from, to, tMs, intensity), intensity }
  }

  /**
   * What falls between two keyframes. Rain that is starting is rain from its first drop, so a
   * stretch from "none" to rain is rain as soon as it has begun; rain that is stopping is rain until
   * its last drop has fallen. Between two kinds of precipitation the earlier one is held, as every
   * discrete field of the weather is (see lerpWeather).
   */
  private static typeBetween(from: RampPoint, to: RampPoint | undefined, tMs: number, intensity: number): PrecipitationType {
    if (from.type === "none") {
      if (to && to.type !== "none" && tMs > from.t) return to.type
      return intensity > 0 ? from.lastFalling : "none"
    }
    if (to && to.type === "none" && intensity <= 0) return "none"
    return from.type
  }

  /**
   * Where an intensity that started at `start` stands `elapsed` seconds into a stretch whose target
   * runs straight from `from` to `to` over `span` seconds, chasing it no faster than
   * MAX_CHANGE_PER_S. Closed form: the follower heads for the target at the maximum rate until it
   * meets it, and from then on moves with it wherever the target is slower than that rate.
   */
  static follow(start: number, from: number, to: number, span: number, elapsed: number): number {
    const rate = PrecipitationRamp.MAX_CHANGE_PER_S
    const slope = span > 0 ? (to - from) / span : 0
    const target = (s: number) => from + slope * Math.min(Math.max(s, 0), span)
    let value = start
    let s = 0
    // At most a handful of phases: towards the target, then with it or after it. Stepped by the
    // phase boundaries, never by a clock, so a two-hour stretch costs what a two-second one does.
    for (let guard = 0; guard < 8 && s < elapsed; guard++) {
      const gap = target(s) - value
      if (Math.abs(gap) < 1e-9) {
        // Caught up: move with the target while it is slower than the rate, else fall behind it.
        const moving = s < span ? slope : 0
        if (Math.abs(moving) <= rate) {
          const until = s < span ? Math.min(elapsed, span) : elapsed
          value = target(until)
          s = until
          continue
        }
        const until = Math.min(elapsed, span)
        value += Math.sign(moving) * rate * (until - s)
        s = until
        continue
      }
      const direction = Math.sign(gap)
      const moving = s < span ? slope : 0
      // Closing speed: the follower's rate against the target's own motion.
      const closing = rate - direction * moving
      const meet = closing > 0 ? s + Math.abs(gap) / closing : Infinity
      const boundary = s < span ? span : Infinity
      const until = Math.min(elapsed, meet, boundary)
      value += direction * rate * (until - s)
      s = until
      if (until === meet) value = target(s)
    }
    return Math.min(1, Math.max(0, value))
  }
}
