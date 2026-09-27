import type { Sighting } from "../model/Sighting.js"
import type { GaitOffset } from "./Gait.js"

/**
 * The small movement of a body that is standing, sitting or waiting: nobody holds still.
 *
 * A standing person sways on their feet, their head drifts by a centimetre or so and breathes, and
 * however steady their gaze their eye is never a tripod's. Drawn perfectly still, a reconstruction reads
 * as a picture rather than a moment: at the end of an account where nothing moves any more, a
 * reader cannot tell a scene still playing from one that has stopped.
 *
 * The movement is slow (a few tenths of a hertz, what postural sway and breathing are made of): about
 * a centimetre of the eye's PLACE, which is real parallax — the near ground and scenery shift a
 * little against the far — and whatever of its DIRECTION's drift the instrument lets through: an
 * eye a third of it, the wandering of a held gaze (see GAZE_DRIFT_SHARE), a hand-held camera all. It is a sum
 * of unrelated slow waves rather than a noise, so that the same instant always looks the same:
 * a recording is played again and again, and must show the same thing at the same instant.
 *
 * Its size is the recording's own `sway` (see Sighting.sway): 1 for a person, 0 for an instrument
 * on a tripod. Absent, it is 1 — except for an observer the account says was paralysed (tag
 * "paralysis"): Masse at Valensole could not move, and a sway would contradict the very thing he
 * reported; and except for a shutter held open longer than a hand can hold a camera still
 * (HAND_HELD_S): a 20-second exposure is made on a tripod, and a sway drew every star of it as a
 * wavy line.
 *
 * The movement itself is DERIVED, never recorded, like the gait (see Gait): having a body is not a
 * claim of the account. Only its size can be stated, and only because an instrument can have none.
 */
export class Stance {
  /** How far the eye's place wanders, metres, each way: a standing adult's head, not the ankles. */
  private static readonly SWAY_M = 0.012
  /** How much breathing lifts it, metres. */
  private static readonly BREATH_M = 0.003
  /** How far the head's direction wanders, degrees, before the instrument's stabilisation. */
  private static readonly DRIFT_YAW_DEG = 0.5
  private static readonly DRIFT_PITCH_DEG = 0.4
  private static readonly DRIFT_ROLL_DEG = 0.3
  /**
   * The least of the head's turning that reaches an eye's image. Stabilisation is not perfect —
   * the reflex's gain is short of one, and a fixation drifts by itself — so a gaze held on something
   * wanders by a tenth of a degree or two. Cancelled entirely, the view of a standing observer showed
   * no life at all; the star flicker the turn once caused came from how points were drawn, since
   * fixed (see PointSources).
   */
  private static readonly GAZE_DRIFT_SHARE = 0.35
  /** The longest exposure a hand holds a camera still for, seconds: beyond it, a tripod. */
  static readonly HAND_HELD_S = 0.5
  /** Unrelated slow rates, hertz: sway, breath, drift. */
  private static readonly HZ = [0.11, 0.23, 0.17, 0.29, 0.37, 0.07] as const

  /** @param rotationPassed The share of the head's turning that reaches the image — see
   * Instrument.stabilization, as the gait takes it. */
  private constructor(private readonly rotationPassed: number, private readonly scale: number) {}

  /** Undefined for an observer who does not move: a sway of 0, or a paralysed observer who states
   * none. */
  static of(sighting: Sighting): Stance | undefined {
    const still = sighting.event.tags?.includes("paralysis") || (sighting.exposure ?? 0) > Stance.HAND_HELD_S
    const scale = sighting.sway ?? (still ? 0 : 1)
    if (!(scale > 0)) return undefined
    return new Stance(Math.max(1 - (sighting.instrument.stabilization ?? 0), Stance.GAZE_DRIFT_SHARE), scale)
  }

  offsetAt(tMs: number): GaitOffset {
    const s = tMs / 1000
    const k = this.scale
    const wave = (hz: number, phase: number) => Math.sin(2 * Math.PI * hz * s + phase)
    const [a, b, c, d, e, f] = Stance.HZ
    return {
      eastM: k * Stance.SWAY_M * (0.7 * wave(a, 0.3) + 0.3 * wave(d, 1.9)),
      northM: k * Stance.SWAY_M * (0.6 * wave(c, 2.2) + 0.4 * wave(e, 0.8)),
      upM: k * Stance.BREATH_M * wave(b, 0.0),
      yawDeg: k * this.rotationPassed * Stance.DRIFT_YAW_DEG * (0.6 * wave(f, 1.1) + 0.4 * wave(d, 2.7)),
      pitchDeg: k * this.rotationPassed * Stance.DRIFT_PITCH_DEG * (0.5 * wave(b, 1.6) + 0.5 * wave(c, 0.4)),
      rollDeg: k * this.rotationPassed * Stance.DRIFT_ROLL_DEG * wave(a, 2.9)
    }
  }
}
