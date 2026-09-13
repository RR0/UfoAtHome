import { Rng } from "../astronomy/MeteorFall.js"

/** One return stroke of a flash: when it starts after the flash's own instant, and how strong it is. */
export interface LightningStroke {
  offsetMs: number
  /** 0..1, the first stroke of a flash being 1. */
  intensity: number
}

/** One lightning flash as a witness under the storm experiences it. */
export interface LightningFlash {
  /** Recording time of the first stroke, milliseconds. */
  t: number
  /** Where it struck or lit up, degrees clockwise from true north. */
  azimuthDeg: number
  /** How far from the witness, metres. */
  distanceM: number
  /** Whether the channel reaches the ground, and can therefore be seen below the cloud base. The
   * others stay inside the cloud and only light it from within. */
  cloudToGround: boolean
  strokes: LightningStroke[]
  /** Seeds the shape of the channel, so the same flash always draws the same bolt. */
  channelSeed: number
}

export interface LightningScheduleOptions {
  durationMs: number
  /** Anything stable: the same seed must always give the same storm. */
  seed: number
}

/**
 * The flashes of a storm over a recording, as a pure function of a seed and the recording's clock.
 *
 * On the recording's clock rather than the wall's, like the meteors: a paused replay keeps its flash
 * frozen, a seek finds the same flashes again, and a demo can say when its first one falls.
 *
 * The numbers are the textbook ones for a thunderstorm seen from under or beside it (Rakov and Uman,
 * "Lightning: Physics and Effects", 2003):
 *
 * - A flash every 8 to 25 seconds within sight and earshot, and the first one anywhere in the first
 *   interval: a storm is already going when a recording starts, it does not begin with it.
 * - About one flash in four reaches the ground; the rest stay within the cloud.
 * - A ground flash is usually several return strokes, three to four on average, some 60 ms apart,
 *   which is the flicker everybody has seen; a cloud flash is a single glow.
 * - Between one and fifteen kilometres away, spread evenly over that AREA rather than that distance
 *   (there is more ground far away than near), fifteen being about as far as thunder carries.
 */
export class LightningSchedule {
  static readonly MIN_INTERVAL_S = 8
  static readonly MAX_INTERVAL_S = 25
  static readonly CLOUD_TO_GROUND_FRACTION = 0.25
  static readonly MIN_DISTANCE_M = 1000
  static readonly MAX_DISTANCE_M = 15000
  static readonly INTERSTROKE_MS = 60
  /** How long a stroke's light takes to fall to a third: the channel glows for tens of milliseconds
   * after the few microseconds of the stroke itself. */
  static readonly STROKE_DECAY_MS = 40
  /** Speed of sound in air, metres per second. */
  static readonly SOUND_SPEED_M_S = 343

  static schedule(options: LightningScheduleOptions): LightningFlash[] {
    const rng = new Rng(options.seed)
    const flashes: LightningFlash[] = []
    let t = rng.between(0, LightningSchedule.MAX_INTERVAL_S) * 1000
    while (t < options.durationMs) {
      const cloudToGround = rng.next() < LightningSchedule.CLOUD_TO_GROUND_FRACTION
      const near = LightningSchedule.MIN_DISTANCE_M, far = LightningSchedule.MAX_DISTANCE_M
      const distanceM = Math.sqrt(rng.between(near * near, far * far))
      const strokeCount = cloudToGround ? 1 + Math.floor(rng.next() * 4) : 1
      const strokes: LightningStroke[] = []
      let offsetMs = 0
      for (let i = 0; i < strokeCount; i++) {
        strokes.push({ offsetMs, intensity: i === 0 ? 1 : rng.between(0.4, 0.9) })
        offsetMs += LightningSchedule.INTERSTROKE_MS * rng.between(0.5, 1.6)
      }
      flashes.push({
        t,
        azimuthDeg: rng.between(0, 360),
        distanceM,
        cloudToGround,
        strokes,
        channelSeed: Math.floor(rng.next() * 2 ** 31)
      })
      t += rng.between(LightningSchedule.MIN_INTERVAL_S, LightningSchedule.MAX_INTERVAL_S) * 1000
    }
    return flashes
  }

  /** How much of its light a flash is giving at recording time `t`, 0 when dark. */
  static brightnessAt(flash: LightningFlash, t: number): number {
    let brightness = 0
    for (const stroke of flash.strokes) {
      const dt = t - flash.t - stroke.offsetMs
      if (dt < 0 || dt > LightningSchedule.STROKE_DECAY_MS * 6) continue
      brightness += stroke.intensity * Math.exp(-dt / LightningSchedule.STROKE_DECAY_MS)
    }
    return Math.min(1, brightness)
  }

  /** When the flash stops giving any light worth drawing. */
  static endOf(flash: LightningFlash): number {
    const last = flash.strokes[flash.strokes.length - 1]
    return flash.t + last.offsetMs + LightningSchedule.STROKE_DECAY_MS * 6
  }

  /** How long after the flash its thunder reaches the witness, milliseconds. */
  static thunderDelayMs(flash: LightningFlash): number {
    return (flash.distanceM / LightningSchedule.SOUND_SPEED_M_S) * 1000
  }
}
