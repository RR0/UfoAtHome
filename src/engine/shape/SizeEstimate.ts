import { ApparentSize } from "./ApparentSize.js"

/** What the scene said about how far an object was, at one instant — see
 * SceneRenderer.decorDistancesAt, which is the only thing that can produce it. */
export interface DecorDistances {
  /** The object passed behind decor standing this far away: it was AT LEAST this far. */
  behindM?: number
  /** The object passed in front of decor standing this far away: it was AT MOST this far. */
  inFrontM?: number
}

/** A quantity in meters that is known only within bounds — either end may be missing, which is
 * the normal case rather than a defect. */
export interface MeterRange {
  /** The largest lower bound established, if any. */
  minM?: number
  /** The smallest upper bound established, if any. */
  maxM?: number
}

/**
 * How big an object really was, accumulated from the only evidence a testimony can offer for it:
 * the moments it crossed something whose distance is known.
 *
 * The chain is short and each link is honest. The recording states how wide the object LOOKED at
 * an instant (BaseShape.angular). The scene states how far a piece of decor stood along that same
 * line of sight. The witness stated which of the two was in front (DecorObject.occludesSourceIds).
 * Together those give an inequality on distance at that instant, and an angle plus a distance is a
 * size — so every crossing narrows the object's real width from one side.
 *
 * A size, once narrowed, applies to the WHOLE recording: the object does not change size as it
 * flies. That is what makes this worth accumulating rather than computing per instant, and it is
 * what lets the estimate be read back as a distance at instants where nothing was crossed at all
 * (distanceRangeAt) — the object subtends less, so it must be further, in exactly that proportion.
 *
 * Most recordings will never constrain anything: a light in an empty night sky crosses nothing,
 * and the honest answer for it is that its size is unknown. `empty` says so rather than inventing
 * a plausible number, which is the entire point of not storing one in the first place.
 */
export class SizeEstimate {
  private lowerM?: number
  private upperM?: number

  /**
   * Folds in one instant's crossings, given how wide the object looked at that same instant.
   *
   * Both bounds tighten monotonically and never loosen: an object seen to pass behind a 300 m
   * hangar was at least 300 m away then, and no later instant can make that untrue. Ignores an
   * angular width of zero — a shape drawn with no width states nothing about size, and dividing
   * by it would manufacture an infinity.
   */
  add(angularWidthDeg: number, distances: DecorDistances): void {
    if (angularWidthDeg <= 0) return
    if (distances.behindM !== undefined) {
      const atLeast = ApparentSize.sizeMAt(distances.behindM, angularWidthDeg)
      this.lowerM = this.lowerM === undefined ? atLeast : Math.max(this.lowerM, atLeast)
    }
    if (distances.inFrontM !== undefined) {
      const atMost = ApparentSize.sizeMAt(distances.inFrontM, angularWidthDeg)
      this.upperM = this.upperM === undefined ? atMost : Math.min(this.upperM, atMost)
    }
  }

  /** Everything established so far about the object's real width. */
  get sizeRange(): MeterRange {
    return { minM: this.lowerM, maxM: this.upperM }
  }

  /** Nothing in the scene has ever constrained this object — its real size is unknown, and saying
   * so is the correct answer, not a missing feature. */
  get empty(): boolean {
    return this.lowerM === undefined && this.upperM === undefined
  }

  /**
   * The recording claims something impossible: the object was seen both behind something far and
   * in front of something nearer, at angles that cannot both be true of one rigid object.
   *
   * Surfaced rather than quietly clamped, because it is real information — it means one of the
   * stated crossings, or one of the drawn sizes, is wrong, and only the author can say which.
   */
  get contradictory(): boolean {
    return this.lowerM !== undefined && this.upperM !== undefined && this.lowerM > this.upperM
  }

  /**
   * How far the object must have been at an instant where it looked `angularWidthDeg` wide —
   * reading the accumulated size back through the same relation, in the other direction.
   *
   * This is the "dynamic estimate" a testimony is allowed to produce: not a distance it stated,
   * but the range of distances its own stated angles and crossings leave possible. A bigger object
   * subtending the same angle has to be further away, so the size bounds map straight onto
   * distance bounds without swapping ends.
   */
  distanceRangeAt(angularWidthDeg: number): MeterRange {
    if (angularWidthDeg <= 0) return {}
    return {
      minM: this.lowerM === undefined ? undefined : ApparentSize.distanceMAt(this.lowerM, angularWidthDeg),
      maxM: this.upperM === undefined ? undefined : ApparentSize.distanceMAt(this.upperM, angularWidthDeg)
    }
  }

  /** Starts over — for a recorder that has just loaded a different recording, whose crossings have
   * nothing to do with the previous one's. */
  clear(): void {
    this.lowerM = undefined
    this.upperM = undefined
  }
}
