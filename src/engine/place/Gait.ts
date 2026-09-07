import type { Sighting } from "../model/Sighting.js"
import { geoToLocalMeters } from "../../render3d/terrain/GeoProjection.js"
import { WitnessPath } from "./WitnessPath.js"

/**
 * Where the witness's eye is, relative to where the path alone would put it — metres, east/north
 * on the ground and up.
 *
 * A DISPLACEMENT and not a pose: it is added on top of whatever the recording states, the same way
 * a reader's own look-around is (see SceneRenderer.setLookOffset), and for the same reason. Nobody
 * wrote down which foot Masse was on.
 */
export interface GaitOffset {
  eastM: number
  northM: number
  upM: number
}

/** One stretch of path over which the witness travelled at one speed, with the walking cycle's
 * own state at its start. Precomputed because the phase at any instant depends on every stretch
 * before it: a walk is a count of steps taken, not a function of the clock. */
interface GaitStretch {
  startMs: number
  endMs: number
  speedMPerS: number
  /** Direction of travel, unit, in the ground plane. */
  eastUnit: number
  northUnit: number
  /** Steps per second here — zero for a stretch that is not a walk at all (see Gait.stepHzFor). */
  stepHz: number
  /** Steps taken since the recording began, at startMs. Fractional: it is a phase, not a count. */
  stepsBefore: number
  /** Whether the walk is starting/ending here rather than continuing from/into the next stretch,
   * which is what decides if the cycle has to be ramped up or down across it (see amplitudeAt). */
  rampsIn: boolean
  rampsOut: boolean
}

/**
 * The small movement of walking, derived from the path the witness is already recorded as having
 * taken.
 *
 * A witness who walks is carried up and down, and side to side, by their own legs: the head rises
 * and falls about five centimetres twice per stride, and sways a few centimetres once per stride.
 * It is a real displacement of the eye, so it is a real parallax — near scenery shifts against far
 * scenery, exactly as it does when the witness covers ground, only faster and much smaller.
 *
 * WHY IT IS WORTH RENDERING AT ALL, given the size of it: because parallax is the one cue that
 * separates something a few metres away from something far off, and it is the near foreground that
 * carries it. At Masse's own walking speed the eye's two-and-a-half-centimetre rise moves a lavender
 * row a metre and a half away by about a degree, and moves an object sixty metres away by an
 * arcminute — one part in forty. A reconstruction that renders both as equally rigid is quietly
 * claiming the foreground was as far off as the phenomenon.
 *
 * WHAT IT DELIBERATELY DOES NOT DO is rotate anything. A walking head is stabilised, and the eye in
 * it is stabilised again by the vestibulo-ocular reflex, so the image a witness gets does NOT roll
 * with their gait the way a hand-held camera's does. Rolling an eye's view would be reproducing a
 * convention of cinema rather than an observation. Rotation is a separate question with a separate
 * answer per instrument, and it is not this class's.
 *
 * DERIVED, NEVER RECORDED: nothing here is stored in a case file, and no case file can state it.
 * A recording says where the witness was and when; that they had legs is not a further claim.
 */
export class Gait {
  /** The speed the cadence law below is anchored at, and the cadence there — an ordinary adult
   * walk, and about 114 steps a minute, which is what walking sounds like. */
  private static readonly REFERENCE_SPEED_M_PER_S = 1.4
  private static readonly REFERENCE_STEP_HZ = 1.9

  /** Walking faster is done mostly with longer steps and only partly with quicker ones, which is
   * why this is well under 1: cadence goes as about the 0.43 power of speed and stride length as
   * the rest (Grieve, "Gait patterns and the speed of walking", 1968). Getting the split wrong is
   * not cosmetic — a linear-in-speed cadence would have a witness at 2 m/s stepping half again as
   * fast as they really do, and the whole oscillation is at that frequency. */
  private static readonly CADENCE_EXPONENT = 0.43

  /** Half of the head's peak-to-peak rise per metre per second of walking speed. The rise grows
   * with speed roughly linearly, from a couple of centimetres at a stroll to six or seven at the
   * fastest walk (Hirasaki et al., "Effects of walking velocity on vertical head and body movements
   * during locomotion", 1999); this constant puts it at five centimetres peak-to-peak at the
   * reference speed. */
  private static readonly RISE_M_PER_M_PER_S = 0.0175

  /** Half the head's peak-to-peak side-to-side sway, metres. Flat in speed rather than growing with
   * it, unlike the rise: walking faster narrows the step as much as it quickens it, and the sway
   * stays around three and a half centimetres across the ordinary range. */
  private static readonly SWAY_M = 0.0175

  /** Under this the witness is not walking anywhere — they are standing, and a standing body's own
   * sway is a different phenomenon on a different time scale, not a slow walk. */
  private static readonly SLOWEST_WALK_M_PER_S = 0.2

  /**
   * Over this it is not a walk either, and this class says nothing rather than guessing.
   *
   * A witness above it is running (Zamora, at Socorro, ran) or is being carried by something — and
   * running is not this cycle scaled up: the body leaves the ground, the rise roughly doubles, and
   * the phase relationship between rise and sway is not the one used here. A vehicle has no gait at
   * all and its own vibration is not a body's. Returning nothing for both is the only honest
   * option; extrapolating a walk into either would put invented movement into a reconstruction.
   */
  private static readonly FASTEST_WALK_M_PER_S = 2.2

  /** What a witness who is not walking is displaced by. Frozen: it is handed out repeatedly. */
  static readonly STILL: GaitOffset = Object.freeze({ eastM: 0, northM: 0, upM: 0 })

  private constructor(private readonly stretches: ReadonlyArray<GaitStretch>) {}

  /**
   * The gait implied by a recording's own witness track, or undefined when the recording states no
   * path to walk along — one point, or none, which is most recordings.
   *
   * Built fresh by every caller that needs it rather than cached on the sighting: the editor mutates
   * a recording's keyframes in place, so anything keyed on the sighting's identity would keep
   * handing out the walk from before the edit. It is a few dozen keyframes of arithmetic.
   */
  static of(sighting: Sighting): Gait | undefined {
    const path = WitnessPath.of(sighting)
    if (!path || path.points.length < 2) return undefined
    const stretches: GaitStretch[] = []
    let stepsBefore = 0
    for (let index = 1; index < path.points.length; index++) {
      const from = path.points[index - 1]
      const to = path.points[index]
      const seconds = (to.t - from.t) / 1000
      if (seconds <= 0) continue
      const local = geoToLocalMeters(to.lat, to.lng, from.lat, from.lng)
      const eastM = local.x
      const northM = -local.z
      const metres = Math.hypot(eastM, northM)
      const speedMPerS = metres / seconds
      const stepHz = Gait.stepHzFor(speedMPerS)
      stretches.push({
        startMs: from.t,
        endMs: to.t,
        speedMPerS,
        eastUnit: metres > 0 ? eastM / metres : 0,
        northUnit: metres > 0 ? northM / metres : 0,
        stepHz,
        stepsBefore,
        // Filled in below, once every stretch is known and each one can see its neighbours.
        rampsIn: true,
        rampsOut: true
      })
      // Only a walk advances the cycle. A witness who stood still for a minute did not come out of
      // it mid-step, and which foot they set off on again is not in any file.
      stepsBefore += stepHz * seconds
    }
    for (let index = 0; index < stretches.length; index++) {
      const previous = stretches[index - 1]
      const next = stretches[index + 1]
      stretches[index].rampsIn = previous === undefined || previous.stepHz === 0
      stretches[index].rampsOut = next === undefined || next.stepHz === 0
    }
    return stretches.some(stretch => stretch.stepHz > 0) ? new Gait(stretches) : undefined
  }

  /**
   * How fast the witness is stepping at a given speed, or zero when what they are doing is not
   * walking — see SLOWEST_WALK_M_PER_S and FASTEST_WALK_M_PER_S for both refusals.
   */
  private static stepHzFor(speedMPerS: number): number {
    if (speedMPerS < Gait.SLOWEST_WALK_M_PER_S || speedMPerS > Gait.FASTEST_WALK_M_PER_S) return 0
    return Gait.REFERENCE_STEP_HZ * Math.pow(speedMPerS / Gait.REFERENCE_SPEED_M_PER_S, Gait.CADENCE_EXPONENT)
  }

  /**
   * Where the witness's eye sits at t, relative to the path's own answer.
   *
   * Phase zero is midstance on the right foot: the head is at the top of its rise and furthest over
   * to that side, which is the one instant of the cycle where the two are locked together. Which
   * foot, and therefore whether the sway starts to the right or the left, is arbitrary and stated
   * here only so that the rise and the sway keep the relationship they really have — the head rises
   * twice per stride and sways once, and the sway reaches its extreme over the foot being stood on.
   */
  offsetAt(tMs: number): GaitOffset {
    const stretch = this.stretches.find(candidate => tMs >= candidate.startMs && tMs <= candidate.endMs)
    if (!stretch || stretch.stepHz === 0) return Gait.STILL
    const steps = stretch.stepsBefore + (stretch.stepHz * (tMs - stretch.startMs)) / 1000
    const stepAngle = 2 * Math.PI * steps
    const settled = this.amplitudeAt(stretch, tMs)
    const sway = Gait.SWAY_M * settled * Math.cos(stepAngle / 2)
    return {
      // To the witness's right, which is the direction of travel turned a quarter turn clockwise.
      eastM: sway * stretch.northUnit,
      northM: -sway * stretch.eastUnit,
      upM: Gait.RISE_M_PER_M_PER_S * stretch.speedMPerS * settled * Math.cos(stepAngle)
    }
  }

  /**
   * How far into its steady state the cycle is at t, from 0 to 1 — a raised cosine over the first
   * and last step of a walk.
   *
   * Not smoothing for its own sake. Without it the eye would jump by the full amplitude at the
   * instant a recording's keyframes say the witness set off or stopped, and a jump in POSITION is
   * an artifact of a kind the path itself never produces (a track states positions, so the eye's
   * own place is continuous even where its speed is not). A body starting and stopping really does
   * take about a step to reach and leave a steady gait, so the shape of the fix is the shape of the
   * thing. Applied only where the walk actually begins or ends: a witness crossing a keyframe at
   * the same speed keeps stepping, and tapering there would invent a stumble every few seconds.
   */
  private amplitudeAt(stretch: GaitStretch, tMs: number): number {
    const stepMs = 1000 / stretch.stepHz
    // Half a step each side at most, so a stretch shorter than one step still reaches its middle
    // rather than being cancelled from both ends.
    const rampMs = Math.min(stepMs, (stretch.endMs - stretch.startMs) / 2)
    if (rampMs <= 0) return 1
    const sinceStart = tMs - stretch.startMs
    const untilEnd = stretch.endMs - tMs
    const fraction = Math.min(
      stretch.rampsIn ? sinceStart / rampMs : 1,
      stretch.rampsOut ? untilEnd / rampMs : 1,
      1
    )
    return (1 - Math.cos(Math.PI * Math.max(fraction, 0))) / 2
  }
}
