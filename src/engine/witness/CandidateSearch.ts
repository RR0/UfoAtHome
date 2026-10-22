import type { WitnessConditions } from "../model/Account.js"
import type { ShapeAim } from "../shape/Shape.js"
import type { ErrorModel, LeadStatus } from "./WitnessError.js"
import { WitnessError } from "./WitnessError.js"

/** What an account states of its main phenomenon: where it was, how wide it looked, when it was seen. */
export interface AccountStatement {
  /** The direction of the phenomenon, when the account states one. */
  aim?: ShapeAim
  /** How wide it looked, in degrees. */
  widthDeg?: number
  /** How the time was given, for the clock's law (see StatedValue.how). */
  timeHow?: string
  /** How the heading and the elevation were given, and the apparent size (see StatedValue.how). */
  headingHow?: string
  sizeHow?: string
}

/** A candidate explanation, as it would have looked from where the observer stood, `offsetMinutes` after the time they gave. */
export interface CandidateTrack {
  id: string
  /** What it is called, in the reader's language. */
  label: string
  /** Its direction and how wide it looked, or undefined when it could not be seen then (below the horizon, too faint). */
  at(offsetMinutes: number): { aim: ShapeAim, widthDeg: number } | undefined
}

/** The three outcomes of a candidate, in the vocabulary of the leads' statuses. */
export type Verdict = "consolidated" | "contested" | "incompatible"

/** One value of the account as the variant reads it: what the account said, what the candidate needs, and the bias that moves one to the other. */
export interface MovedValue {
  field: "time" | "heading" | "elevation" | "size"
  stated: number
  variant: number
  /** The bias invoked, as the witness parameter it is (see WitnessParameter), and how far, in units of its law's spread. */
  parameter: "clock" | "heading" | "elevation" | "size"
  amount: number
  z: number
  status: LeadStatus
}

/**
 * What a candidate makes of the account: the witness parameters that bring the account closest to it, what they move, what that
 * costs, and the verdict. A variant is the account as it would read had the observer erred that way; the account itself never changes.
 */
export interface Variant {
  candidate: string
  label: string
  verdict: Verdict
  /** The distance from the account, in units of the laws' spread (σ), summed in quadrature. Not a probability. */
  cost: number
  parameters: { clockMinutes: number, headingDeg: number, elevationFactor: number, sizeFactor: number }
  moved: MovedValue[]
  /** Why it is incompatible, when it is: never seen at all, or seen too far from where and how the account puts it. */
  reason?: "never-seen" | "direction" | "size"
  /** The error model it was computed with, to compute it again when the model changes. */
  modelId: string
}

/**
 * Asks, for each candidate, whether the account could be a misperception of it, and at what cost (see docs/witness-error-model.md,
 * "The search"): the few parameters that tie one witness's errors — a clock offset, a rotation of the heading, a compression of the
 * elevation, a factor on sizes — are set to bring the account as close as they can to what the candidate looked like, each paid for in
 * units of its own law's spread. The number of variants is the number of candidates, never a power of the number of fields.
 */
export class CandidateSearch {
  /** Beyond this many σ on any one value, a candidate is out of reach of the laws: incompatible even at the bounds. */
  static readonly BOUND_SIGMA = 3
  /** Beyond this, it needs the tails of a law: "only by invoking" what is past its usual spread. */
  static readonly TAIL_SIGMA = 2
  /** The size a point of light is seen at, at the least: glare and blur give a star a disc of a few arcminutes. */
  static readonly POINT_SIZE_DEG = 0.1
  /** The degrees an elevation outside its one-sided law is paid in, per σ. */
  private static readonly ELEVATION_SIGMA_DEG = 5

  constructor(private readonly model: ErrorModel, private readonly conditions?: WitnessConditions) {
  }

  /** The variant `candidate` makes of the account, the best its parameters can do. */
  fit(statement: AccountStatement, candidate: CandidateTrack): Variant {
    const timeLaw = this.model.law({ kind: "time", value: 0, how: statement.timeHow }, this.conditions)
    const timeSigma = Math.max(0.5, (timeLaw.high ?? 6) / 2)
    let best: Variant | undefined
    // The clock offset is searched on a grid across its law: the candidate moves slowly against the sky, and a few steps find its best.
    const steps = 24
    for (let i = 0; i <= steps; i++) {
      const offset = -CandidateSearch.BOUND_SIGMA * timeSigma + (2 * CandidateSearch.BOUND_SIGMA * timeSigma * i) / steps
      const seen = candidate.at(offset)
      if (!seen) continue
      const variant = this.variantAt(statement, candidate, offset, timeSigma, timeLaw.status, seen)
      if (!best || variant.cost < best.cost) best = variant
    }
    return best ?? {
      candidate: candidate.id, label: candidate.label, verdict: "incompatible", cost: Infinity, reason: "never-seen", moved: [],
      parameters: { clockMinutes: 0, headingDeg: 0, elevationFactor: 1, sizeFactor: 1 }, modelId: this.model.id
    }
  }

  /** Every candidate's variant, by verdict and then by cost: what is compatible with consolidated biases first. */
  search(statement: AccountStatement, candidates: CandidateTrack[]): Variant[] {
    const rank: Record<Verdict, number> = { consolidated: 0, contested: 1, incompatible: 2 }
    return candidates.map(candidate => this.fit(statement, candidate)).sort((a, b) => rank[a.verdict] - rank[b.verdict] || a.cost - b.cost)
  }

  private variantAt(statement: AccountStatement, candidate: CandidateTrack, offset: number, timeSigma: number, timeStatus: LeadStatus,
    seen: { aim: ShapeAim, widthDeg: number }): Variant {
    const moved: MovedValue[] = []
    let reason: Variant["reason"]
    if (Math.abs(offset) > 0.05) moved.push({ field: "time", stated: 0, variant: offset, parameter: "clock", amount: offset, z: offset / timeSigma, status: timeStatus })
    let headingDeg = 0
    let elevationFactor = 1
    if (statement.aim) {
      // The heading: the candidate's bearing, rotated from the account's by what its law allows.
      const headingLaw = this.model.law({ kind: "heading", value: statement.aim.azimuthDeg, how: statement.headingHow }, this.conditions)
      const headingSigma = ((headingLaw.high ?? statement.aim.azimuthDeg + 45) - statement.aim.azimuthDeg) / 2
      headingDeg = ((((seen.aim.azimuthDeg - statement.aim.azimuthDeg) % 360) + 540) % 360) - 180
      if (Math.abs(headingDeg) > 0.5) {
        moved.push({ field: "heading", stated: statement.aim.azimuthDeg, variant: (seen.aim.azimuthDeg + 360) % 360, parameter: "heading", amount: headingDeg,
          z: headingDeg / headingSigma, status: headingLaw.status })
      }
      // The elevation: overestimated, so a lower candidate costs nothing within the law; a higher one, or one far lower, costs its distance.
      const stated = statement.aim.altitudeDeg
      const law = this.model.law({ kind: "elevation", value: stated }, this.conditions)
      const low = law.low ?? stated
      const high = law.high ?? stated
      const truth = seen.aim.altitudeDeg
      const z = truth > high ? (truth - high) / CandidateSearch.ELEVATION_SIGMA_DEG : truth < low ? (low - truth) / CandidateSearch.ELEVATION_SIGMA_DEG : 0
      elevationFactor = stated > 0 ? truth / stated : 1
      if (Math.abs(truth - stated) > 0.5) {
        moved.push({ field: "elevation", stated, variant: truth, parameter: "elevation", amount: elevationFactor, z, status: z > 0 ? "argued" : law.status })
      }
    }
    let sizeFactor = 1
    if (statement.widthDeg !== undefined && statement.widthDeg > 0) {
      // The size: the candidate's own (a point of light seen with its glare), against the band the size law gives the stated one.
      const truth = Math.max(seen.widthDeg, CandidateSearch.POINT_SIZE_DEG)
      const law = this.model.law({ kind: "angularSize", value: statement.widthDeg, how: statement.sizeHow }, this.conditions)
      const low = law.low ?? statement.widthDeg
      const high = law.high ?? statement.widthDeg
      const z = truth > high ? Math.log(truth / high) / Math.log(1.5) : truth < low ? Math.log(low / truth) / Math.log(1.5) : 0
      sizeFactor = statement.widthDeg / truth
      if (Math.abs(Math.log(sizeFactor)) > Math.log(1.1)) {
        moved.push({ field: "size", stated: statement.widthDeg, variant: truth, parameter: "size", amount: sizeFactor, z, status: law.status })
      }
    }
    const cost = Math.sqrt(moved.reduce((sum, value) => sum + value.z * value.z, 0))
    const beyond = moved.find(value => Math.abs(value.z) > CandidateSearch.BOUND_SIGMA)
    if (beyond) reason = beyond.field === "size" ? "size" : "direction"
    // Contested when it takes a contested law moving the value at all, or a law's tail.
    const contested = moved.some(value => value.status === "contested" || Math.abs(value.z) > CandidateSearch.TAIL_SIGMA)
    const verdict: Verdict = beyond ? "incompatible" : contested ? "contested" : "consolidated"
    return {
      candidate: candidate.id, label: candidate.label, verdict, cost: WitnessError.rounded(cost), moved, ...(reason ? { reason } : {}),
      parameters: { clockMinutes: offset, headingDeg, elevationFactor, sizeFactor }, modelId: this.model.id
    }
  }
}
