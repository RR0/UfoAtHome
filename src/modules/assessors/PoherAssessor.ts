import type { Assessment, AssessmentCriterion, Assessor } from "../../engine/assessment/Assessor.js"
import type { Sighting } from "../../engine/model/Sighting.js"
import type { Basis } from "../../engine/persistence/Provenance.js"
import type { ShapeAim } from "../../engine/shape/Shape.js"
import { RecordingActors } from "../../engine/events/RecordingActors.js"

/** One fact the note turns on: whether the recording shows it, and on what. */
interface Fact {
  shown: boolean
  /** Undefined when nothing in the recording answers it. */
  basis?: Basis
  paths: string[]
}

/** How the phenomenon went across the observer's sky. */
type Trajectory = "unknown" | "still" | "straight" | "abnormal" | "erratic"

/**
 * Rates the strangeness of what was observed the way Claude Poher did in 1969, as
 * rr0.org/science/crypto/ufo/enquete/methode/Poher-Criteres.html gives it: a note from 0 to 5, which "must depend only on the description
 * of the facts observed", never on the observers (their credibility is another note of his).
 *
 * - 0: not strange at all, or not classifiable for want of information.
 * - 1: a point going in a straight line.
 * - 2: small, but its trajectory "abnormal".
 * - 3: "caracolant" (going every which way), a landing or near-landing without traces, a sudden disappearance in flight, oscillations.
 * - 4: a landing with traces.
 * - 5: a landing with occupants seen.
 *
 * Poher read each from a coded field of his catalogue (trajectory, disappearance, oscillations, traces, occupants). A recording holds the
 * same facts in other forms, and this reads them there, each criterion saying where and on what basis:
 *
 * - The trajectory from the directions the account's shapes were seen in, instant after instant: still, straight, with one sharp turn
 *   (TURN_DEG or more), or with several (ERRATIC_TURNS): the last is his "caracolant".
 * - A sudden disappearance from a `vanish` event of the phenomenon (a shape no longer seen is as often one gone out of sight).
 * - Oscillations from the phenomenon's or a body's `vibrate`, `spiral` or `roll` events.
 * - A landing from the interpretation the recording holds, a body of it on the ground at one instant and in the air at another: an
 *   assumption, somebody's reading.
 * - Traces and occupants from what the investigators judged (account.strangeness, see Ballester-Guasp's same factors), and occupants also
 *   from beings the scene places (a decor entity), which the account states.
 *
 * What this project reads its own way, and says so: the angular size Poher pairs with levels 1 and 2 is not read, the trajectory alone
 * telling them apart; the trajectory is the one the observer saw, their own movement in it (a pilot's, a walker's), as the account gives
 * it; and the note is the highest level whose facts are shown, as his examples read.
 */
export class PoherAssessor implements Assessor {

  /** What it rates is what the phenomenon did: see Assessor.about. */
  readonly about = "shape"

  /** Degrees of sky a phenomenon has to go before a change of its direction is read: under it, the hand that drew it. */
  static readonly STEP_DEG = 2

  /** A change of direction this sharp, degrees, is a turn. */
  static readonly TURN_DEG = 60

  /** This many turns is going every which way. */
  static readonly ERRATIC_TURNS = 3

  /** The events that are oscillations. */
  static readonly OSCILLATIONS = ["vibrate", "spiral", "roll"]

  async assess(sighting: Sighting): Promise<Assessment> {
    const trajectory = this.trajectory(sighting)
    const vanish = this.vanish(sighting)
    const oscillation = this.oscillation(sighting)
    const landing = this.landing(sighting)
    const traces = this.judged(sighting, "traces")
    const occupants = this.occupants(sighting)
    const note = landing.shown && occupants.shown ? 5
      : landing.shown && traces.shown ? 4
        : landing.shown || trajectory.value === "erratic" || vanish.shown || oscillation.shown ? 3
          : trajectory.value === "abnormal" ? 2
            : trajectory.value === "straight" ? 1
              : 0
    const criteria: AssessmentCriterion[] = [
      { id: "poher-trajectory", basis: trajectory.basis, paths: trajectory.paths, value: PoherAssessor.TRAJECTORIES.indexOf(trajectory.value) },
      this.criterion("poher-vanish", vanish),
      this.criterion("poher-oscillation", oscillation),
      // Nowhere in the format to say it but the interpretation: not a field an author fills in.
      { ...this.criterion("poher-landing", landing), unsupported: landing.basis === undefined },
      this.criterion("poher-traces", traces),
      this.criterion("poher-occupants", occupants)
    ]
    return { verdict: String(note), criteria }
  }

  private static readonly TRAJECTORIES: Trajectory[] = ["unknown", "still", "straight", "abnormal", "erratic"]

  private criterion(id: string, fact: Fact): AssessmentCriterion {
    return { id, value: fact.shown ? 1 : 0, basis: fact.basis, paths: fact.basis === undefined ? [] : fact.paths }
  }

  /** The most remarkable way one of the account's shapes went across the sky. */
  private trajectory(sighting: Sighting): { value: Trajectory, basis?: Basis, paths: string[] } {
    let best: Trajectory = "unknown"
    for (const sourceId of sighting.timeline.sourceIds) {
      const seen = this.seen(sighting, sourceId).filter(instant => instant.aim !== undefined).map(instant => instant.aim!)
      if (seen.length < 2) continue
      // Steps of at least STEP_DEG, each from where the last one ended, so that a hand's wobble is not a turn; on the sphere, so that a
      // phenomenon going over the zenith, whose azimuth swings round, does not turn for it.
      const points: number[][] = [PoherAssessor.unit(seen[0])]
      for (const aim of seen.slice(1)) {
        const point = PoherAssessor.unit(aim)
        if (PoherAssessor.angleDeg(points[points.length - 1], point) >= PoherAssessor.STEP_DEG) points.push(point)
      }
      const steps = points.length - 1
      let turns = 0
      for (let i = 1; i < points.length - 1; i++) {
        // The angle between the great circle it came along and the one it went on along: between their planes.
        const before = PoherAssessor.cross(points[i - 1], points[i])
        const after = PoherAssessor.cross(points[i], points[i + 1])
        if (PoherAssessor.angleDeg(before, after) >= PoherAssessor.TURN_DEG) turns++
      }
      const value: Trajectory = steps === 0 ? "still" : turns >= PoherAssessor.ERRATIC_TURNS ? "erratic" : turns > 0 ? "abnormal" : "straight"
      if (PoherAssessor.TRAJECTORIES.indexOf(value) > PoherAssessor.TRAJECTORIES.indexOf(best)) best = value
    }
    return best === "unknown" ? { value: best, paths: [] } : { value: best, basis: "derived", paths: ["timeline"] }
  }

  /**
   * A `vanish` of the phenomenon: the account saying it was gone at once. Not read off a shape no longer seen, which is as often the
   * phenomenon going out of sight, behind a cloud or a roof, or the observer looking away: the instants cannot say it was sudden.
   */
  private vanish(sighting: Sighting): Fact {
    const stated = (sighting.events ?? []).findIndex(event => event.eventType === "vanish" && RecordingActors.isPhenomenon(sighting, event))
    return stated >= 0 ? { shown: true, basis: "stated", paths: [`events.${stated}`] } : { shown: false, paths: [] }
  }

  /** The phenomenon or a body of the interpretation vibrating, going in a spiral, rolling. */
  private oscillation(sighting: Sighting): Fact {
    const bodies = new Set((sighting.interpretation?.bodies ?? []).map(body => body.id))
    const index = (sighting.events ?? []).findIndex(event => PoherAssessor.OSCILLATIONS.includes(event.eventType)
      && (RecordingActors.isPhenomenon(sighting, event) || bodies.has(event.who?.split("/")[0] ?? "")))
    return index >= 0 ? { shown: true, basis: "stated", paths: [`events.${index}`] } : { shown: false, paths: [] }
  }

  /**
   * A body of the interpretation on the ground at one instant and off it at another: that reading of the account has it land, or take
   * off. One always on the ground is not landing: a car, in the reading that it was one.
   */
  private landing(sighting: Sighting): Fact {
    const flies = (key: { onGround?: boolean, altitudeAboveGroundM?: number, altitudeM?: number }) => !key.onGround
      && ((key.altitudeAboveGroundM ?? 0) > 0 || (key.altitudeM ?? 0) > 0)
    const index = (sighting.interpretation?.bodies ?? []).findIndex(body => Array.isArray(body.track)
      && body.track.some(key => key.onGround) && body.track.some(flies))
    return index >= 0
      ? { shown: true, basis: "assumed", paths: [`interpretation.bodies.${index}`] }
      : { shown: false, paths: [] }
  }

  /** Beings the scene places, which the account states, or the investigators judged there were. */
  private occupants(sighting: Sighting): Fact {
    const placed = sighting.decor.findIndex(object => object.kind === "entity")
    if (placed >= 0) return { shown: true, basis: "stated", paths: [`decor.${placed}`] }
    return this.judged(sighting, "beings")
  }

  /** What the investigators judged of `factor` (account.strangeness). */
  private judged(sighting: Sighting, factor: "traces" | "beings"): Fact {
    const judged = sighting.account?.strangeness?.[factor]
    return judged === undefined ? { shown: false, paths: [] } : { shown: judged, basis: "stated", paths: [`account.strangeness.${factor}`] }
  }

  /** The instants that state `sourceId`, in time order: where it was, and whether it was seen. */
  private instants(sighting: Sighting, sourceId: string): { t: number, aim?: ShapeAim, visible: boolean }[] {
    return sighting.timeline.allKeyframes
      .map(keyframe => ({ t: keyframe.t, shape: keyframe.shapes.find(state => state.sourceId === sourceId)?.shape }))
      .filter(({ shape }) => shape !== undefined)
      .map(({ t, shape }) => ({ t, aim: shape!.aim, visible: shape!.transparency < 1 }))
      .sort((a, b) => a.t - b.t)
  }

  private seen(sighting: Sighting, sourceId: string): { t: number, aim?: ShapeAim }[] {
    return this.instants(sighting, sourceId).filter(instant => instant.visible)
  }

  /** A direction of the sky as a unit vector: east, north, up. */
  private static unit(aim: ShapeAim): number[] {
    const [azimuth, altitude] = [aim.azimuthDeg * Math.PI / 180, aim.altitudeDeg * Math.PI / 180]
    return [Math.cos(altitude) * Math.sin(azimuth), Math.cos(altitude) * Math.cos(azimuth), Math.sin(altitude)]
  }

  private static cross(a: number[], b: number[]): number[] {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
  }

  /** The angle between two vectors, degrees. */
  private static angleDeg(a: number[], b: number[]): number {
    const norm = Math.hypot(...a) * Math.hypot(...b)
    if (norm === 0) return 0
    const cos = (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / norm
    return Math.acos(Math.max(-1, Math.min(1, cos))) * 180 / Math.PI
  }
}
