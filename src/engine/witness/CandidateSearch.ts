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
  /** How far the phenomenon moved across the sky between the first and the last instant the account places it, and in how long. */
  motion?: { sweepDeg: number, spanMinutes: number }
  /** How many times wider it looked at the last of those instants than at the first: above 1, what the account reads as it coming nearer. */
  growth?: number
}

/**
 * A misperception that is no value shifted but a different reading of the scene (see docs/witness-error-model.md, "Structural variants"):
 * - `grouped`: lights read as one body (a formation, a re-entry's fragments, an airliner's lights);
 * - `still-seen-moving`: a light that stands still seen moving (the autokinetic effect of a point in the dark, the Moon behind clouds);
 * - `moving-seen-still`: a light that moves seen hovering (an aircraft coming head on);
 * - `brightening-as-approach`: a light growing brighter read as one coming nearer.
 * Each comes from the candidate, which declares those it may need; none is ever searched blindly.
 */
export type StructuralReading = "grouped" | "still-seen-moving" | "moving-seen-still" | "brightening-as-approach"

/** One structural reading a variant uses, with what the studies say of it, as a law's status. */
export interface UsedReading {
  reading: StructuralReading
  status: LeadStatus
}

/** A candidate explanation, as it would have looked from where the observer stood, `offsetMinutes` after the time they gave. */
export interface CandidateTrack {
  id: string
  /** What it is called, in the reader's language. */
  label: string
  /** Its direction and how wide it looked, and its magnitude when it is known, or undefined when it could not be seen then (below the
   * horizon, too faint). */
  at(offsetMinutes: number): { aim: ShapeAim, widthDeg: number, magnitude?: number } | undefined
  /** The structural readings it may need (see StructuralReading): none when not said. */
  readings?: StructuralReading[]
}

/** The three outcomes of a candidate, in the vocabulary of the leads' statuses. */
export type Verdict = "consolidated" | "contested" | "incompatible"

/** One value of the account as the variant reads it: what the account said, what the candidate needs, and the bias that moves one to the other. */
export interface MovedValue {
  field: "time" | "heading" | "elevation" | "size" | "duration" | "sweep"
  stated: number
  variant: number
  /** The bias invoked, as the witness parameter it is (see WitnessParameter), and how far, in units of its law's spread. */
  parameter: "clock" | "heading" | "elevation" | "size" | "duration" | "sweep"
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
  /** `durationFactor`: how many times longer it lasted than the account says, when how it moved was confronted. */
  parameters: { clockMinutes: number, headingDeg: number, elevationFactor: number, sizeFactor: number, durationFactor?: number }
  moved: MovedValue[]
  /** The structural readings it uses: those the account needs of it and it declares. */
  readings: UsedReading[]
  /** Why it is incompatible, when it is: never seen at all, seen too far from where and how the account puts it, or needing a reading of
   * how it moved or grew that it does not offer. */
  reason?: "never-seen" | "direction" | "size" | "motion" | "growth"
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
  /** Beyond this sweep, in degrees, a light moved; below STILL_DEG it stood still: between, the account says too little to read either way. */
  static readonly MOVED_DEG = 2
  static readonly STILL_DEG = 0.5
  /**
   * The spread of the angle an observer gives between two directions of one light, in degrees: each end is a direction given by eye,
   * about as uncertain as an elevation, and the two add in quadrature. No study measures it: what it moves is argued.
   */
  static readonly SWEEP_SIGMA_DEG = 5 * Math.SQRT2
  /** The most a still light is seen to move: the few degrees the autokinetic effect gives a point in the dark. A light crossing more
   * of the sky moved. */
  static readonly STILL_SEEN_MOVING_MAX_DEG = 10
  /** A growth of the account's light beyond this factor reads as it coming nearer. */
  static readonly GROWTH = 1.5
  /** A brightening by this many magnitudes is one an observer notices. */
  static readonly BRIGHTENING_MAG = 0.5
  /**
   * What the studies say of each structural reading, as a law's status: the autokinetic effect and induced motion are laboratory findings;
   * lights read as one body is what every re-entry recorded by many observers shows (Zond IV, 1968); an aircraft coming head on seen
   * hovering, and a brightening read as an approach, are argued from cases, not measured.
   */
  static readonly READING_STATUS: Record<StructuralReading, LeadStatus> = {
    "grouped": "consolidated",
    "still-seen-moving": "consolidated",
    "moving-seen-still": "argued",
    "brightening-as-approach": "argued"
  }
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
      candidate: candidate.id, label: candidate.label, verdict: "incompatible", cost: Infinity, reason: "never-seen", moved: [], readings: [],
      parameters: { clockMinutes: 0, headingDeg: 0, elevationFactor: 1, sizeFactor: 1 }, modelId: this.model.id
    }
  }

  /** Every candidate's variant, by verdict and then by cost: what is compatible with consolidated biases first. */
  search(statement: AccountStatement, candidates: CandidateTrack[]): Variant[] {
    const rank: Record<Verdict, number> = { consolidated: 0, contested: 1, incompatible: 2 }
    return candidates.map(candidate => this.fit(statement, candidate)).sort((a, b) => rank[a.verdict] - rank[b.verdict] || a.cost - b.cost)
  }

  private variantAt(statement: AccountStatement, candidate: CandidateTrack, offset: number, timeSigma: number, timeStatus: LeadStatus,
    seen: { aim: ShapeAim, widthDeg: number, magnitude?: number }): Variant {
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
    const { readings, lacking } = this.structural(statement, candidate, offset, seen)
    let durationFactor: number | undefined
    if (!lacking && !readings.some(used => used.reading === "still-seen-moving" || used.reading === "moving-seen-still")) {
      const motion = this.motionFit(statement, candidate, offset, seen)
      if (motion) {
        durationFactor = motion.factor
        moved.push(...motion.moved)
      }
    }
    const cost = Math.sqrt(moved.reduce((sum, value) => sum + value.z * value.z, 0))
    const beyond = moved.find(value => Math.abs(value.z) > CandidateSearch.BOUND_SIGMA)
    if (beyond) reason = beyond.field === "size" ? "size" : beyond.field === "duration" || beyond.field === "sweep" ? "motion" : "direction"
    if (!reason && lacking) reason = lacking
    // Contested when it takes a contested law moving the value at all, or a law's tail, or a reading the studies only argue.
    const contested = moved.some(value => value.status === "contested" || Math.abs(value.z) > CandidateSearch.TAIL_SIGMA)
      || readings.some(used => used.status !== "consolidated")
    const verdict: Verdict = reason ? "incompatible" : contested ? "contested" : "consolidated"
    return {
      candidate: candidate.id, label: candidate.label, verdict, cost: WitnessError.rounded(cost), moved, readings, ...(reason ? { reason } : {}),
      parameters: { clockMinutes: offset, headingDeg, elevationFactor, sizeFactor, ...(durationFactor !== undefined ? { durationFactor } : {}) },
      modelId: this.model.id
    }
  }

  /**
   * How the account's light moved against how the candidate did, when both moved: the duration, which an observer gets wrong by a factor
   * (see the duration law), is stretched or shrunk within its law until the candidate sweeps across the sky what the account says it did;
   * what is left of the sweep is paid in units of SWEEP_SIGMA_DEG. Undefined when the account says nothing of how it moved, or when one of
   * the two stood still (see the structural readings).
   */
  private motionFit(statement: AccountStatement, candidate: CandidateTrack, offset: number, seen: { aim: ShapeAim }): { factor: number, moved: MovedValue[] } | undefined {
    const motion = statement.motion
    if (!motion || motion.spanMinutes <= 0 || motion.sweepDeg < CandidateSearch.MOVED_DEG) return undefined
    const spanS = motion.spanMinutes * 60
    const law = this.model.law({ kind: "duration", value: spanS }, this.conditions)
    // The law's band is its usual spread, two σ each way in a log scale; the search goes as far as its bounds.
    const sigma = Math.log((law.high ?? spanS * 3) / spanS) / 2
    let best: { factor: number, sweep: number, zDuration: number, zSweep: number } | undefined
    const steps = 24
    for (let i = 0; i <= steps; i++) {
      const factor = Math.exp(sigma * CandidateSearch.BOUND_SIGMA * (2 * i / steps - 1))
      const end = candidate.at(offset + motion.spanMinutes * factor)
      if (!end) continue
      const sweep = CandidateSearch.separation(seen.aim, end.aim)
      const zDuration = Math.log(factor) / sigma
      const zSweep = (sweep - motion.sweepDeg) / CandidateSearch.SWEEP_SIGMA_DEG
      if (!best || zDuration ** 2 + zSweep ** 2 < best.zDuration ** 2 + best.zSweep ** 2) best = { factor, sweep, zDuration, zSweep }
    }
    // A candidate that sweeps too little at the shortest to read as still is the still reading's (see structural), not this one's.
    if (!best || best.sweep < CandidateSearch.STILL_DEG) return undefined
    const moved: MovedValue[] = []
    if (Math.abs(Math.log(best.factor)) > Math.log(1.1)) {
      moved.push({ field: "duration", stated: spanS, variant: spanS * best.factor, parameter: "duration", amount: best.factor, z: best.zDuration, status: law.status })
    }
    if (Math.abs(best.sweep - motion.sweepDeg) > 1) {
      moved.push({ field: "sweep", stated: motion.sweepDeg, variant: best.sweep, parameter: "sweep", amount: best.sweep - motion.sweepDeg, z: best.zSweep, status: "argued" })
    }
    return { factor: best.factor, moved }
  }

  /**
   * The structural readings the account needs of the candidate, from how it moved and grew against how the candidate did over the same
   * span: those the candidate declares are used, the first it does not is why it is incompatible. A candidate made of several lights is
   * read as one body whenever it declares so: that is what the account drew.
   */
  private structural(statement: AccountStatement, candidate: CandidateTrack, offset: number, seen: { aim: ShapeAim, widthDeg: number, magnitude?: number }):
    { readings: UsedReading[], lacking?: "motion" | "growth" } {
    const offered = candidate.readings ?? []
    const needed: [StructuralReading, "motion" | "growth"][] = []
    const motion = statement.motion
    const end = motion && motion.spanMinutes > 0 ? candidate.at(offset + motion.spanMinutes) : undefined
    if (motion && end) {
      const sweep = CandidateSearch.separation(seen.aim, end.aim)
      if (motion.sweepDeg >= CandidateSearch.MOVED_DEG && sweep < CandidateSearch.STILL_DEG) {
        if (motion.sweepDeg > CandidateSearch.STILL_SEEN_MOVING_MAX_DEG) return { readings: [], lacking: "motion" }
        needed.push(["still-seen-moving", "motion"])
      }
      else if (motion.sweepDeg < CandidateSearch.STILL_DEG && sweep >= CandidateSearch.MOVED_DEG) needed.push(["moving-seen-still", "motion"])
    }
    if (statement.growth !== undefined && statement.growth >= CandidateSearch.GROWTH && end && end.widthDeg / Math.max(seen.widthDeg, 1e-6) < CandidateSearch.GROWTH) {
      // It did not come nearer: only a light growing brighter can be what was read as it did, when the candidate is known to have.
      const brightened = seen.magnitude === undefined || end.magnitude === undefined || seen.magnitude - end.magnitude >= CandidateSearch.BRIGHTENING_MAG
      if (brightened) needed.push(["brightening-as-approach", "growth"])
      else return { readings: [], lacking: "growth" }
    }
    const readings: UsedReading[] = offered.includes("grouped") ? [{ reading: "grouped", status: CandidateSearch.READING_STATUS.grouped }] : []
    for (const [reading, field] of needed) {
      if (!offered.includes(reading)) return { readings, lacking: field }
      readings.push({ reading, status: CandidateSearch.READING_STATUS[reading] })
    }
    return { readings }
  }

  /** The angle between two directions, in degrees. */
  static separation(a: ShapeAim, b: ShapeAim): number {
    const rad = Math.PI / 180
    const cos = Math.sin(a.altitudeDeg * rad) * Math.sin(b.altitudeDeg * rad) + Math.cos(a.altitudeDeg * rad) * Math.cos(b.altitudeDeg * rad) * Math.cos((a.azimuthDeg - b.azimuthDeg) * rad)
    return Math.acos(Math.max(-1, Math.min(1, cos))) / rad
  }
}
