import type { Sighting } from "../model/Sighting.js"
import type { GaitOffset } from "./Gait.js"

/**
 * The small movement of a body that is standing, sitting or waiting: nobody holds still.
 *
 * A standing person sways on their feet by a few millimetres, their head drifts and breathes, and
 * however steady their gaze it is never a tripod's. Drawn perfectly still, a reconstruction reads
 * as a picture rather than a moment: at the end of an account where nothing moves any more, a
 * reader cannot tell a scene still playing from one that has stopped.
 *
 * The movement is slow (a few tenths of a hertz, what postural sway and breathing are made of) and
 * small: millimetres of the eye's place, and a tenth of a degree or two of its direction — enough
 * to see that the view is alive, far too little to move what the observer looked at. It is a sum
 * of unrelated slow waves rather than a noise, so that the same instant always looks the same:
 * a recording is played again and again, and must show the same thing at the same instant.
 *
 * NOT for an observer the account says was paralysed (tag "paralysis"): Masse at Valensole could
 * not move, and a sway would contradict the very thing he reported.
 *
 * DERIVED, NEVER RECORDED, like the gait (see Gait): having a body is not a claim of the account.
 */
export class Stance {
  /** How far the eye's place wanders, metres, each way. */
  private static readonly SWAY_M = 0.005
  /** How much breathing lifts it, metres. */
  private static readonly BREATH_M = 0.002
  /** How far its direction wanders, degrees, as it reaches the image. */
  private static readonly DRIFT_YAW_DEG = 0.12
  private static readonly DRIFT_PITCH_DEG = 0.1
  private static readonly DRIFT_ROLL_DEG = 0.05
  /** Unrelated slow rates, hertz: sway, breath, drift. */
  private static readonly HZ = [0.11, 0.23, 0.17, 0.29, 0.37, 0.07] as const

  private constructor() {}

  /** Undefined for an observer the account says could not move. */
  static of(sighting: Sighting): Stance | undefined {
    if (sighting.event.tags?.includes("paralysis")) return undefined
    return Stance.ALIVE
  }

  private static readonly ALIVE = new Stance()

  offsetAt(tMs: number): GaitOffset {
    const s = tMs / 1000
    const wave = (hz: number, phase: number) => Math.sin(2 * Math.PI * hz * s + phase)
    const [a, b, c, d, e, f] = Stance.HZ
    return {
      eastM: Stance.SWAY_M * (0.7 * wave(a, 0.3) + 0.3 * wave(d, 1.9)),
      northM: Stance.SWAY_M * (0.6 * wave(c, 2.2) + 0.4 * wave(e, 0.8)),
      upM: Stance.BREATH_M * wave(b, 0.0),
      yawDeg: Stance.DRIFT_YAW_DEG * (0.6 * wave(f, 1.1) + 0.4 * wave(d, 2.7)),
      pitchDeg: Stance.DRIFT_PITCH_DEG * (0.5 * wave(b, 1.6) + 0.5 * wave(c, 0.4)),
      rollDeg: Stance.DRIFT_ROLL_DEG * wave(a, 2.9)
    }
  }
}
