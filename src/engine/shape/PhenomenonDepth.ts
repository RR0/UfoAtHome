import type { DecorDistances, MeterRange } from "./SizeEstimate.js"

/**
 * Where a rendering distance came from, strongest first — see PhenomenonDepth.
 *
 * `stated` is reserved for a recording that describes the phenomenon in metres itself (a close
 * encounter written as a body), which no recording does yet; the tier exists so the rule is
 * complete on the day one does.
 */
export type DepthBasis = "stated" | "hypothesis" | "derived" | "bounded" | "conventional"

export interface DepthInputs {
  /** The recording's own metres, when it states any. */
  statedM?: number
  /** What a reader is trying out — an editor's slider, never saved. */
  hypothesisM?: number
  /** What the witness's own walk establishes — see ShapeDistance. */
  derivedM?: number
  /** What the whole recording's crossings leave possible at this instant — see
   * SizeEstimate.distanceRangeAt. */
  range?: MeterRange
  /** What the decor says along the line of sight at this instant alone — see
   * SceneRenderer.decorDistancesAt. */
  crossing?: DecorDistances
}

export interface ResolvedDepth {
  distanceM: number
  basis: DepthBasis
}

/**
 * How far along its line of sight a phenomenon is DRAWN — which is not the same question as how
 * far away it was, and this class exists to keep the two apart.
 *
 * A shape facing the witness, scaled to the angle the recording states, looks exactly the same from
 * their eye at any distance whatever. So the recording goes on stating angles and nothing else, and
 * the distance is a parameter of the picture: the one thing it changes is what the depth buffer
 * hides the shape behind, per pixel, which is precisely what a flat overlay could never do and the
 * reason the phenomenon now stands in the scene at all.
 *
 * Five places the number can come from, in the order they outrank each other:
 *
 * - STATED by the recording — a body written in metres. None does yet.
 * - A HYPOTHESIS the reader is trying: "show it at five hundred metres". Above everything the data
 *   establishes ON PURPOSE, because a hypothesis is tested by seeing it fail — set the craft at
 *   five hundred metres and watch it go behind a patrol car it was drawn in front of.
 * - DERIVED from the witness's walk (ShapeDistance), where they walked.
 * - BOUNDED by what it crossed: behind that hangar is at least this far, in front of that tree is
 *   at most that far. Any distance in the interval draws every crossing correctly, so the middle
 *   of it (geometrically, since distances span decades) is taken, and a contradiction is drawn as
 *   the declared occluder wins — the same answer the overlay gave.
 * - CONVENTIONAL: nothing establishes anything, which is most recordings. A few metres out, in
 *   front of everything that was not declared to hide it, which is what "not declared" has always
 *   meant here (see DecorObject.occludesSourceIds) — and near rather than far, so that a shape
 *   drawn low in the frame does not go under the ground a long way off.
 */
export class PhenomenonDepth {
  /** Where a phenomenon nothing constrains is drawn, metres. */
  static readonly CONVENTIONAL_M = 5
  /** Nothing is drawn nearer than this — inside the camera's own near plane there is no picture. */
  static readonly NEAREST_M = 0.2
  /** Clearance from a bound, as a ratio: drawn just past what it was behind, just short of what it
   * was in front of, so the depth test cannot land on the exact surface and flicker. */
  static readonly MARGIN = 1.1

  static resolve(inputs: DepthInputs): ResolvedDepth {
    if (inputs.statedM !== undefined && inputs.statedM > 0) {
      return { distanceM: PhenomenonDepth.atLeastNearest(inputs.statedM), basis: "stated" }
    }
    if (inputs.hypothesisM !== undefined && inputs.hypothesisM > 0) {
      return { distanceM: PhenomenonDepth.atLeastNearest(inputs.hypothesisM), basis: "hypothesis" }
    }
    if (inputs.derivedM !== undefined && inputs.derivedM > 0) {
      return { distanceM: PhenomenonDepth.atLeastNearest(inputs.derivedM), basis: "derived" }
    }
    const floor = PhenomenonDepth.largest(inputs.range?.minM, inputs.crossing?.behindM)
    const ceiling = PhenomenonDepth.smallest(inputs.range?.maxM, inputs.crossing?.inFrontM)
    const lo = floor === undefined ? undefined : floor * PhenomenonDepth.MARGIN
    const hi = ceiling === undefined ? undefined : ceiling / PhenomenonDepth.MARGIN
    if (lo !== undefined && hi !== undefined) {
      // A contradiction — behind something far and in front of something near — is drawn behind:
      // the witness's own "it went behind that" outranks a crossing nobody declared.
      return { distanceM: PhenomenonDepth.atLeastNearest(lo <= hi ? Math.sqrt(lo * hi) : lo), basis: "bounded" }
    }
    if (lo !== undefined) {
      return { distanceM: PhenomenonDepth.atLeastNearest(lo), basis: "bounded" }
    }
    if (hi !== undefined && hi < PhenomenonDepth.CONVENTIONAL_M) {
      return { distanceM: PhenomenonDepth.atLeastNearest(hi), basis: "bounded" }
    }
    return { distanceM: PhenomenonDepth.CONVENTIONAL_M, basis: "conventional" }
  }

  private static atLeastNearest(m: number): number {
    return Math.max(PhenomenonDepth.NEAREST_M, m)
  }

  private static largest(...values: (number | undefined)[]): number | undefined {
    const known = values.filter((value): value is number => value !== undefined && value > 0)
    return known.length === 0 ? undefined : Math.max(...known)
  }

  private static smallest(...values: (number | undefined)[]): number | undefined {
    const known = values.filter((value): value is number => value !== undefined && value > 0)
    return known.length === 0 ? undefined : Math.min(...known)
  }
}
