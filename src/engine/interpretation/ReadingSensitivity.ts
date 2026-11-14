import type { Sighting } from "../model/Sighting.js"
import { Provenance } from "../persistence/Provenance.js"
import { fromSightingJson, type SightingRecordingJson } from "../persistence/sightingJson.js"
import { WitnessError } from "../witness/WitnessError.js"
import { BodyConfrontation, type ConfrontationTolerance } from "./BodyConfrontation.js"
import { BodyPlacement, type BodyState, type Ground, type LocalPoint } from "./BodyPlacement.js"
import type { BodyJson, BodyKeyframe } from "./Interpretation.js"

const DEG = Math.PI / 180

/**
 * What can be turned on a body a reading places: where it is seen (its direction across and up), how far it is along the line it is
 * seen on, how big it is, and when it does what it does.
 */
export type SensitivityKnob = "azimuth" | "altitude" | "distance" | "size" | "time"

/**
 * How far one knob of one body can be turned, each way, before the reading reproduces less of the account than it does as written: before
 * a contradiction appears, for a reading that has none.
 *
 * `lower` and `upper` are offsets from the reading as written for an angle (degrees) or a time (milliseconds), and multipliers for a
 * distance or a size (`lower` ≤ 1 ≤ `upper`). An end marked `reached` is the limit of the search, not of the reading: it still holds
 * there, and is at least that robust.
 */
export interface KnobMargin {
  bodyId: string
  knob: SensitivityKnob
  lower: number
  upper: number
  lowerReached: boolean
  upperReached: boolean
  /** The narrower side, as a share of how far the search goes that way: 0 is a reading that breaks at the slightest turn, 1 one that
   * holds as far as the search looks. What makes margins in degrees, factors and milliseconds comparable at all. */
  share: number
  /** How far the value may reasonably be off, each way, in the margin's own units: what the margin is judged against (see
   * ReadingSensitivity.reference). Undefined where no law says it: the moment of an indication, a body's own size. */
  reference?: { lower: number, upper: number }
  /** The share of `reference` the margin covers, on its narrower side, from 0 to 1. */
  coverage?: number
}

/** What of a phenomenon at an instant the witness is on record as having said: its direction, its apparent size. */
export interface SaidAspects { direction: boolean, size: boolean }

/** A reading set against the account under every turn of what it leaves free. */
export interface ReadingSensitivityResult {
  /** Whether the reading as written reproduces the account at every instant it is compared at. */
  holds: boolean
  /** The share of the comparisons the reading as written is not contradicted at, from 0 to 1: one phenomenon at one instant each. A real
   * reading seldom reproduces every instant of a witness's account, and how much of it it does is what its margins keep. */
  agreement: number
  /** How many comparisons that is. */
  compared: number
  /** How many instants it was compared at: none means there was nothing to confront (no body explains anything the account draws). */
  instants: number
  /** The median of the separations between what was said and what the bodies give, degrees, as written. */
  medianSeparationDeg?: number
  /** The bodies that were turned: those a reading's provenance marks as free (see Provenance.free). */
  freeBodies: string[]
  /** The bodies that were not, because something other than the reading settles them. */
  fixedBodies: string[]
  /** One per knob of each free body, the tightest first. Empty for a reading that reproduces nothing as written: it has no margin. */
  margins: KnobMargin[]
  /** The best turn the search came across, when it reproduces more of the account than the reading as written: the reading is not at its
   * best, and says so rather than being credited with a margin around a value nothing recommends. */
  better?: { bodyId: string, knob: SensitivityKnob, amount: number, agreement: number }
  /**
   * Whether every margin that has a reference covers at least half of it each way (see ReadingSensitivity.SUFFICIENT): the reading
   * holds when what it supposed is moved by as much as such a value is uncertain, and does not rest on a fine-tuning. Undefined when no
   * margin has a reference, or none is measured.
   */
  sufficient?: boolean
}

/**
 * How much a reading's likeness to the account owes to the exact values it chose for what nothing settles.
 *
 * Asked for by the GEIPAN (A. Cousyn, November 2026): the more free parameters a reconstruction holds, the easier a likeness is to make,
 * and a seductive picture must not be read as a validation of the hypothesis it pictures. So a reading is not left at how well it
 * reproduces the account: each value it was free to choose is turned away from the one it chose, each way, until it reproduces less of
 * the account than it did. A likeness that survives only within a degree of a supposed heading was made; one that survives thirty degrees
 * of it was found. And a turn that reproduces more than the reading as written is said too: that reading was not at its best.
 *
 * It measures margins rather than sampling "reasonable variations", because nothing says what is reasonable for a value nobody stated:
 * deciding a range would be one more free parameter. A margin needs no such choice, and lets whoever reads it judge. What is stated is
 * not turned here: how far a witness's own estimate may be off is already in what counts as a contradiction (see
 * BodyConfrontation.lawsOf, given as `tolerance`).
 *
 * The relief is not known here: the ground is flat at the observer's feet. The bodies a reading places in the air are what it is for.
 */
export class ReadingSensitivity {

  /** How far each knob is searched, each way: degrees, a factor, or milliseconds. */
  static readonly LIMITS: Readonly<Record<SensitivityKnob, number>> = { azimuth: 45, altitude: 30, distance: 10, size: 10, time: 10_000 }
  /**
   * The share of a value's uncertainty a margin must cover, each way, to be sufficient. Not all of it: whether the reading agrees with
   * what was said is already judged with the same uncertainty, so a margin covers all of it only for a reading dead on what was said.
   * Half of it is a reading that keeps agreeing when what it supposed is moved by half of what the witness could be off by.
   */
  static readonly SUFFICIENT = 0.5
  /** The share of what was said a reading must reproduce for its robustness to mean anything: below, it is not a likeness, and how
   * robust it is would be how robust a coincidence is. */
  static readonly MEASURABLE = 0.5
  /** How many steps outward before the edge is refined, and how many halvings refine it. */
  private static readonly STEPS = 12
  private static readonly HALVINGS = 8
  private static readonly FLAT: Ground = { heightAt: () => 0 }

  private readonly confrontation: BodyConfrontation
  /** What the reading as written explains, as "instant/phenomenon": a turn that leaves one of them unexplained has broken it, even
   * though nothing it still places is contradicted (a body moved later in time is not there yet when the phenomenon is). */
  private expected = new Set<string>()
  /** The share of `expected` the reading as written reproduces. */
  private nominalAgreement = 0
  private best?: ReadingSensitivityResult["better"]
  private readonly eyeAt: (t: number) => (LocalPoint & { headingDeg?: number }) | undefined

  /**
   * @param account The observation the reading reads, as a model: its timeline is what was said, its track is where it was said from.
   * @param instants The times of the account the reading is compared at, milliseconds: those its timeline states a phenomenon at.
   */
  /**
   * @param said What the witness is on record as having said, by "instant/phenomenon": only that is compared, each aspect for itself.
   *   Undefined: everything the timeline draws, as if all of it had been said.
   */
  constructor(account: Sighting, private readonly instants: readonly number[], tolerance?: ConfrontationTolerance,
              private readonly said?: ReadonlyMap<string, SaidAspects>,
              private readonly references: Partial<Record<SensitivityKnob, { lower: number, upper: number }>> = {}) {
    this.confrontation = new BodyConfrontation(account.timeline, tolerance)
    this.eyeAt = (t: number) => BodyPlacement.eyeOf(account, t, ReadingSensitivity.FLAT)
  }

  /**
   * The sensitivity of readings of `json`, as the GEIPAN would have it judged: against what the witness is on record as having said, and
   * nothing else, and with the uncertainty a witness's estimate has (see BodyConfrontation.lawsOf).
   *
   * A timeline is drawn to be played, so it holds far more than was said: a direction every half second where the witness gave three, a
   * size nobody gave at all. Comparing a reading to those compares two reconstructions with each other, and finds a likeness where neither
   * is the testimony. So only a direction or a size the recording traces to the witness is compared: wrapped with a basis that is not
   * free, and saying what it rests on (a "stated" that says nothing more is the default, which the file does not even keep: see
   * Provenance.set). A bare one, or one supposed, is not.
   */
  static forAccount(json: SightingRecordingJson): ReadingSensitivity {
    const account = fromSightingJson(json)
    const keyframes = Provenance.strip(json).recording.timeline?.keyframes ?? []
    const said = new Map<string, SaidAspects>()
    const isSaid = (path: string) => account.provenance.paths().some(known =>
      (known === path || known.startsWith(`${path}.`)) && !Provenance.free(account.provenance.at(known)))
    const model = WitnessError.MODELS[0]
    const conditions = account.account?.conditions
    const references: Partial<Record<SensitivityKnob, { lower: number, upper: number }>> = {}
    // The narrowest each way of what the laws give the directions said: the best-known indication is how well a direction is known.
    const narrow = (knob: SensitivityKnob, lower: number, upper: number) => {
      const known = references[knob]
      references[knob] = known ? { lower: Math.max(known.lower, lower), upper: Math.min(known.upper, upper) } : { lower, upper }
    }
    keyframes.forEach((key, k) => key.shapes.forEach((state, n) => {
      const at = `timeline.keyframes.${k}.shapes.${n}.shape`
      const aspects = { direction: isSaid(`${at}.aim`), size: isSaid(`${at}.angular`) }
      if (aspects.direction || aspects.size) said.set(`${key.t}/${state.sourceId}`, aspects)
      const aim = state.shape.aim
      if (!aspects.direction || !aim) return
      const entryOf = (axis: string) => account.provenance.at(`${at}.aim.${axis}`) ?? account.provenance.at(`${at}.aim`)
      for (const [knob, kind, value, axis] of [["azimuth", "heading", aim.azimuthDeg, "azimuthDeg"], ["altitude", "elevation", aim.altitudeDeg, "altitudeDeg"]] as const) {
        const entry = entryOf(axis)
        const law = model.law({ kind, value, basis: entry?.basis, how: entry?.how }, conditions)
        if (law.low !== undefined && law.high !== undefined) narrow(knob, law.low - value, law.high - value)
      }
    }))
    // A distance nobody anchored is no data at all (see ConsolidatedErrorModel): what a reading supposes of one is as uncertain.
    const distance = model.law({ kind: "distance", value: 1 }, conditions)
    const factor = distance.params?.factor
    if (typeof factor === "number") references.distance = { lower: 1 / factor, upper: factor }
    const tolerance = BodyConfrontation.lawsOf(model, conditions)
    return new ReadingSensitivity(account, keyframes.map(key => key.t), tolerance, said, references)
  }

  /**
   * @param bodies The reading's bodies, plain (see Provenance.strip).
   * @param provenance The reading's provenance: what of it is free.
   */
  of(bodies: readonly BodyJson[], provenance: Provenance): ReadingSensitivityResult {
    const free = bodies.filter((_, index) => ReadingSensitivity.isFree(provenance, index))
    const nominal = this.score(bodies)
    this.expected = new Set(nominal.outcomes.keys())
    this.nominalAgreement = this.agreementOf(nominal.outcomes)
    this.best = undefined
    const result: ReadingSensitivityResult = {
      holds: nominal.outcomes.size > 0 && this.nominalAgreement === 1,
      agreement: this.nominalAgreement,
      compared: nominal.outcomes.size,
      instants: nominal.instants,
      ...(nominal.separations.length ? { medianSeparationDeg: ReadingSensitivity.median(nominal.separations) } : {}),
      freeBodies: free.map(body => body.id),
      fixedBodies: bodies.filter(body => !free.includes(body)).map(body => body.id),
      margins: []
    }
    if (this.nominalAgreement === 0) return result
    for (const body of free) {
      for (const knob of this.knobsOf(body)) {
        result.margins.push(this.marginOf(bodies, body, knob))
      }
    }
    // Those judged against an uncertainty first, the least covered first; then those no law gives one for, the tightest first.
    result.margins.sort((a, b) => a.coverage !== undefined && b.coverage !== undefined ? a.coverage - b.coverage
      : a.coverage !== undefined ? -1 : b.coverage !== undefined ? 1 : a.share - b.share)
    if (this.best) result.better = this.best
    const judged = result.margins.filter(margin => margin.coverage !== undefined)
    if (judged.length > 0 && ReadingSensitivity.measurable(result)) result.sufficient = judged.every(margin => margin.coverage! >= ReadingSensitivity.SUFFICIENT)
    return result
  }

  /** Whether a result's margins mean anything (see MEASURABLE). */
  static measurable(result: ReadingSensitivityResult): boolean {
    return result.compared > 0 && result.agreement >= ReadingSensitivity.MEASURABLE
  }

  /** Whether the reading says it chose the body, or its whole track, or any value of it: what is free of it is the body's to turn. */
  static isFree(provenance: Provenance, index: number): boolean {
    const prefix = `interpretation.bodies.${index}`
    return provenance.paths().some(path => (path === prefix || path.startsWith(`${prefix}.`)) && Provenance.free(provenance.at(path)))
  }

  /**
   * The knobs a body has that something said depends on: no size to turn for one that states none, no height for one standing on the
   * ground all along, and neither its distance nor its size when the witness gave no size, since moving along the line it is seen on
   * changes nothing of its direction. A knob nothing depends on would come out as robust as can be, which it is not: it is beside the
   * point, like the day of the week.
   */
  private knobsOf(body: BodyJson): SensitivityKnob[] {
    const sizeSaid = !this.said || [...this.said.values()].some(aspects => aspects.size)
    const knobs: SensitivityKnob[] = sizeSaid ? ["azimuth", "distance", "time"] : ["azimuth", "time"]
    if (body.track.some(key => key.altitudeDeg !== undefined || key.altitudeM !== undefined || key.altitudeAboveGroundM !== undefined)) {
      knobs.splice(1, 0, "altitude")
    }
    if (sizeSaid && body.track.some(key => key.sizeM !== undefined)) knobs.push("size")
    return knobs
  }

  private marginOf(bodies: readonly BodyJson[], body: BodyJson, knob: SensitivityKnob): KnobMargin {
    const limit = ReadingSensitivity.LIMITS[knob]
    const factor = knob === "distance" || knob === "size"
    // The amount at x in [0, 1] of the way out, each way: linear for an offset, geometric for a factor.
    const amount = (x: number, way: 1 | -1) => factor ? Math.exp(way * x * Math.log(limit)) : way * x * limit
    const holdsAt = (x: number, way: 1 | -1) => {
      // A time is moved where the track is read, not in the track: its motion moved, not its presence (see score).
      const turned = knob === "time" ? bodies : bodies.map(other => other === body ? this.turned(body, knob, amount(x, way)) : other)
      const agreement = this.agreementOf(this.score(turned, knob === "time" ? { body, ms: amount(x, way) } : undefined).outcomes)
      if (agreement > this.nominalAgreement + 1e-9 && (!this.best || agreement > this.best.agreement)) {
        this.best = { bodyId: body.id, knob, amount: amount(x, way), agreement }
      }
      return agreement >= this.nominalAgreement - 1e-9
    }
    const edge = (way: 1 | -1): { x: number, reached: boolean } => {
      let held = 0
      for (let step = 1; step <= ReadingSensitivity.STEPS; step++) {
        // Finer near the reading as written, where a needle-fit breaks.
        const x = (step / ReadingSensitivity.STEPS) ** 2
        if (!holdsAt(x, way)) {
          let fails = x
          for (let halving = 0; halving < ReadingSensitivity.HALVINGS; halving++) {
            const middle = (held + fails) / 2
            if (holdsAt(middle, way)) held = middle
            else fails = middle
          }
          return { x: held, reached: false }
        }
        held = x
      }
      return { x: 1, reached: true }
    }
    const down = edge(-1), up = edge(1)
    const margin: KnobMargin = {
      bodyId: body.id, knob,
      lower: amount(down.x, -1), upper: amount(up.x, 1),
      lowerReached: down.reached, upperReached: up.reached,
      share: Math.min(down.x, up.x)
    }
    const reference = this.references[knob]
    if (reference) {
      // How much of the way to the reference each side goes: in ratios for a factor, degrees otherwise. A side the search did not find
      // the end of covers it, and so does a side the law gives no room on (an elevation is overestimated, never under).
      const along = (moved: number, reasonable: number, reached: boolean) => {
        const room = factor ? Math.log(reasonable) : reasonable
        if (reached || Math.abs(room) < 1e-9) return 1
        return Math.min(1, (factor ? Math.log(moved) : moved) / room)
      }
      margin.reference = reference
      margin.coverage = Math.min(along(margin.lower, reference.lower, down.reached), along(margin.upper, reference.upper, up.reached))
    }
    return margin
  }

  /** A copy of `body` with `knob` turned by `amount`: degrees or milliseconds added, or a factor applied. */
  turned(body: BodyJson, knob: SensitivityKnob, amount: number): BodyJson {
    const copy = structuredClone(body)
    copy.track = copy.track.map(key => this.turnedKey(key, knob, amount))
    return copy
  }

  private turnedKey(key: BodyKeyframe, knob: SensitivityKnob, amount: number): BodyKeyframe {
    switch (knob) {
      case "time":
        return { ...key, t: key.t + amount }
      case "size":
        return key.sizeM ? { ...key, sizeM: { widthM: key.sizeM.widthM * amount, lengthM: key.sizeM.lengthM * amount, heightM: key.sizeM.heightM * amount } } : key
      case "distance":
        return this.scaledKey(key, amount)
      case "azimuth":
        return this.swungKey(key, amount)
      case "altitude":
        return this.raisedKey(key, amount)
    }
  }

  /** Moved along the line it is seen on: its direction from the eye kept, its distance times `factor`. */
  private scaledKey(key: BodyKeyframe, factor: number): BodyKeyframe {
    if (key.eastM === undefined || key.northM === undefined) {
      return key.distanceM === undefined ? key : { ...key, distanceM: key.distanceM * factor }
    }
    const eye = this.eyeAt(key.t) ?? { eastM: 0, northM: 0, upM: 0 }
    const scaled: BodyKeyframe = { ...key, eastM: eye.eastM + (key.eastM - eye.eastM) * factor, northM: eye.northM + (key.northM - eye.northM) * factor }
    if (key.altitudeM !== undefined) scaled.altitudeM = eye.upM + (key.altitudeM - eye.upM) * factor
    if (key.altitudeAboveGroundM !== undefined) scaled.altitudeAboveGroundM = eye.upM + (key.altitudeAboveGroundM - eye.upM) * factor
    return scaled
  }

  /** Swung round the eye by `deg`, clockwise seen from above, as an azimuth turns. */
  private swungKey(key: BodyKeyframe, deg: number): BodyKeyframe {
    if (key.eastM === undefined || key.northM === undefined) {
      return key.azimuthDeg === undefined ? key : { ...key, azimuthDeg: ((key.azimuthDeg + deg) % 360 + 360) % 360 }
    }
    const eye = this.eyeAt(key.t) ?? { eastM: 0, northM: 0, upM: 0 }
    const east = key.eastM - eye.eastM, north = key.northM - eye.northM
    const cos = Math.cos(deg * DEG), sin = Math.sin(deg * DEG)
    // An azimuth from north towards east: a turn of θ clockwise takes (e, n) to (e cos θ + n sin θ, n cos θ − e sin θ).
    return { ...key, eastM: eye.eastM + east * cos + north * sin, northM: eye.northM + north * cos - east * sin }
  }

  /** Raised by `deg` above the horizon as seen from the eye, its distance across the ground kept. */
  private raisedKey(key: BodyKeyframe, deg: number): BodyKeyframe {
    if (key.eastM === undefined || key.northM === undefined) {
      return key.altitudeDeg === undefined ? key : { ...key, altitudeDeg: Math.max(-90, Math.min(90, key.altitudeDeg + deg)) }
    }
    const height = key.altitudeM ?? key.altitudeAboveGroundM
    if (height === undefined || key.onGround) return key
    const eye = this.eyeAt(key.t) ?? { eastM: 0, northM: 0, upM: 0 }
    const across = Math.hypot(key.eastM - eye.eastM, key.northM - eye.northM)
    const elevation = Math.atan2(height - eye.upM, across) + deg * DEG
    const raised = eye.upM + across * Math.tan(Math.max(-89 * DEG, Math.min(89 * DEG, elevation)))
    return key.altitudeM !== undefined ? { ...key, altitudeM: raised } : { ...key, altitudeAboveGroundM: raised }
  }

  /** The share of what the reading as written explains that `outcomes` reproduces: a comparison gone missing (a body moved later is not
   * there yet when the phenomenon is) is one it no longer reproduces. */
  private agreementOf(outcomes: ReadonlyMap<string, boolean>): number {
    if (this.expected.size === 0) return 0
    let agreed = 0
    for (const pair of this.expected) if (outcomes.get(pair) === true) agreed++
    return agreed / this.expected.size
  }

  /** The bodies set against the account at every instant: whether each comparison, "instant/phenomenon", agrees, and the separations. */
  /**
   * @param delayed A body whose motion is moved later by `ms` (earlier, negative): it is where it was `ms` before, at every instant it is
   *   there at all. Its presence is not moved with it: a reading has it appear when the witness first describes it, and a delay that left it
   *   absent then would break on how the track begins, not on what the reading says. Where its motion has not begun yet, or has ended, it
   *   is held where it begins or ends.
   */
  private score(bodies: readonly BodyJson[], delayed?: { body: BodyJson, ms: number }): { instants: number, outcomes: Map<string, boolean>, separations: number[] } {
    const placements = bodies.map(body => ({ body, placement: new BodyPlacement(body, ReadingSensitivity.FLAT, this.eyeAt) }))
    const stateAt = ({ body, placement }: { body: BodyJson, placement: BodyPlacement }, t: number) => {
      const there = placement.at(t)
      if (!there || delayed?.body !== body) return there
      const keys = body.track
      const moved = Math.min(Math.max(t - delayed.ms, keys[0].t), keys[keys.length - 1].t)
      return placement.at(moved) ?? there
    }
    let instants = 0
    const separations: number[] = []
    const outcomes = new Map<string, boolean>()
    for (const t of this.instants) {
      const eye = this.eyeAt(t)
      if (!eye) continue
      const states = placements.map(placed => stateAt(placed, t)).filter((state): state is BodyState => state !== undefined)
      const readings = this.confrontation.at(t, states, eye)
      let compared = false
      for (const reading of readings) {
        const pair = `${t}/${reading.sourceId}`
        const aspects = this.said ? this.said.get(pair) : { direction: true, size: true }
        if (!aspects) continue
        compared = true
        const counted = reading.disagreements.filter(off => off === "direction" ? aspects.direction : aspects.size)
        // Two bodies that explain the same phenomenon: it is reproduced when either does.
        outcomes.set(pair, outcomes.get(pair) === true || counted.length === 0)
        if (aspects.direction && reading.separationDeg !== undefined) separations.push(reading.separationDeg)
      }
      if (compared) instants++
    }
    return { instants, outcomes, separations }
  }

  private static median(values: readonly number[]): number {
    const sorted = [...values].sort((a, b) => a - b)
    const middle = Math.floor(sorted.length / 2)
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
  }
}
