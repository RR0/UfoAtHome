import type { CaseElementJson, HvsHypothesisJson, HvsJson, HvsMilestone, HvsRating } from "./HvsJson.js"

/** A score as the protocol gives it: the value preferred, and the envelope its uncertainty allows, least and greatest. */
export interface HvsScore {
  preferred: number
  envelope: [number, number]
}

/**
 * How a hypothesis was found to explain an element, or not: by the confrontation of a reading that tests it with the account, or as the
 * analyst declares. `readings` says how many readings were confronted on it: more than one is several variants, and the element is
 * explained when one of them reproduces it, which is choosing the variant that fits and is said beside it.
 */
export interface HvsExplanation {
  explained: boolean
  by: "confrontation" | "declared"
  readings?: number
}

/** What a hypothesis is worth against one observation. */
export interface HvsHypothesisResult {
  id: string
  /** The readings of the observation that test it, by their event's `id`. */
  readings: string[]
  /** How they were found: by the phenomenon it names, or chosen by hand (see HvsHypothesisJson.readings). */
  linkedBy: "phenomenon" | "chosen"
  /** Element by element, for those counted: how it explains each. */
  explanations: Record<string, HvsExplanation>
  /** The coverage over every counted element. */
  csRaw: HvsScore
  /** The coverage over the elements that tell the hypotheses apart; undefined when none does (one hypothesis, or all alike). */
  csDiscriminating?: HvsScore
  /** The plausibility, context included; undefined when no rating of it is given. */
  ps?: HvsScore
  /** Whether the intrinsic plausibility is the geometric mean of its ratings, one of them having collapsed under a strong one. */
  geometric?: boolean
  /** Ratings of the plausibility the analyst did not give, which it is computed without: "context" counts as 1. */
  missing?: string[]
  /** CS × PS: the discriminating coverage where there is one, else the raw one. Undefined without a plausibility. */
  hvs?: HvsScore
  /**
   * Whether it is admissible: it covers at least half of the elements (see Hvs.ADMISSIBLE). A filter before the hypotheses are told apart, not
   * a verdict: an admissible hypothesis may still score nothing. The protocol says "retained"; "admissible" is its own word for what it
   * keeps ("the hypotheses that are admissible in the end"), and does not read as a conclusion beside a score of 0.
   */
  admissible: boolean
  /** Whether it is the dominant hypothesis: the admissible one of greatest discriminating coverage. */
  dominant: boolean
  milestone?: HvsMilestone
}

/** What the protocol makes of a case's hypotheses against one of its observations. */
export interface HvsResult {
  /** The `id` of the observation's account event. */
  account: string
  /** The elements of the observation counted: all of them but the inferences of association. */
  counted: string[]
  /** Those of them that tell the hypotheses apart: explained by some and not by others. */
  discriminating: string[]
  hypotheses: HvsHypothesisResult[]
}

/**
 * Whether a reading reproduces what the witness said of a phenomenon at an instant, by "instant/phenomenon" as its confrontation keys it
 * (see ReadingSensitivityResult.outcomes): what a hypothesis's readings settle of the elements that are directions or sizes.
 */
export type ReadingOutcomes = Readonly<Record<string, boolean>>

/** A reading of the observation, as the weighing needs it: what it is a reading of, and what its confrontation found once it is had. */
export interface HvsReading {
  /** Its event's `id`. */
  id: string
  /** The phenomena its bodies are instances of (see InterpretationKinds.phenomena). */
  phenomena: ReadonlySet<string>
  outcomes?: ReadingOutcomes
}

/**
 * Weighs a case's hypotheses against one of its observations as Stéphane Baron's HVS protocol (Hypothesis Validity Score, version 7.0)
 * does: how much of the observation's elements each covers (CS), how plausible it is apart from the case (PS), and their product,
 * HVS = CS × PS, given as a value preferred with an envelope. Never a probability: the scores of the hypotheses do not add up to anything,
 * and the protocol emits no class.
 *
 * One observation at a time: an evaluation is an observation's, and two witnesses, who did not see nor say the same, are two evaluations
 * of the same hypotheses.
 *
 * The coverage is this program's to work out, from the list of elements and from the confrontation of each reading with what the witness
 * said. The plausibility is not: its ratings and the context factor are the analyst's, against the protocol's own grid, and nothing here
 * supplies a prior.
 *
 * Where the protocol leaves a choice open, the one made here is said where it is made (the envelope of a coverage, when a rating has
 * collapsed), to be confirmed with its author.
 */
export class Hvs {

  /** The share of the elements a hypothesis must cover to be admissible: half, which the protocol says is arbitrary and to be refined. */
  static readonly ADMISSIBLE = 0.5
  /**
   * When the intrinsic plausibility is the geometric mean rather than the arithmetic one: a rating at most COLLAPSED while another is at
   * least STRONG, so that a fatal weakness is not made up for by the other two. The protocol says when without saying how much: these two
   * thresholds are this program's.
   */
  static readonly COLLAPSED = 0.2
  static readonly STRONG = 0.6

  /** The elements of the observation `account`: those that say they are its, or every one that says nothing in a case of one account. */
  static elementsOf(elements: readonly CaseElementJson[], account: string, single: boolean): CaseElementJson[] {
    return elements.filter(element => element.of === account || (element.of === undefined && single))
  }

  /** The elements of a case of several accounts that say of none which they are: they count in no evaluation, and are to be said so. */
  static unassigned(elements: readonly CaseElementJson[], single: boolean): CaseElementJson[] {
    return single ? [] : elements.filter(element => element.of === undefined)
  }

  /**
   * The readings of the observation that test `hypothesis`: those it chose by hand, else those whose bodies are of the phenomena it names,
   * all of them and no other (a combined hypothesis is tested by a reading of all its parts, a single one by a reading of it alone).
   */
  static readingsOf(hypothesis: HvsHypothesisJson, readings: readonly HvsReading[]): { readings: HvsReading[], linkedBy: "phenomenon" | "chosen" } {
    if (hypothesis.readings !== undefined) return { readings: readings.filter(reading => hypothesis.readings!.includes(reading.id)), linkedBy: "chosen" }
    const named = new Set([hypothesis.phenomenon ?? []].flat())
    if (named.size === 0) return { readings: [], linkedBy: "phenomenon" }
    const same = (reading: HvsReading) => reading.phenomena.size === named.size && [...named].every(phenomenon => reading.phenomena.has(phenomenon))
    return { readings: readings.filter(same), linkedBy: "phenomenon" }
  }

  /**
   * @param elements The case's elements: those of the observation are taken (see elementsOf).
   * @param hvs What the case says for the protocol.
   * @param account The `id` of the observation's account event.
   * @param readings The readings of that observation.
   * @param single Whether the case has that one account only.
   */
  static of(elements: readonly CaseElementJson[], hvs: HvsJson | undefined, account: string, readings: readonly HvsReading[], single: boolean): HvsResult {
    const counted = Hvs.elementsOf(elements, account, single).filter(element => element.status !== "association")
    const hypotheses = hvs?.hypotheses ?? []
    const tested = hypotheses.map(hypothesis => Hvs.readingsOf(hypothesis, readings))
    const explanations = hypotheses.map((hypothesis, index) => Hvs.explanationsOf(hypothesis, counted, tested[index].readings))
    const discriminating = counted.filter(element => {
      const verdicts = new Set(explanations.map(found => found[element.id]?.explained ?? false))
      return verdicts.size > 1
    })
    const observation = hvs?.observations?.[account]
    const results = hypotheses.map((hypothesis, index): HvsHypothesisResult => {
      const found = explanations[index]
      const csRaw = Hvs.coverage(counted, found)
      const csDiscriminating = discriminating.length > 0 ? Hvs.coverage(discriminating, found) : undefined
      const plausibility = Hvs.plausibility(hypothesis, observation?.context?.[hypothesis.id])
      const cs = csDiscriminating ?? csRaw
      return {
        id: hypothesis.id,
        readings: tested[index].readings.map(reading => reading.id),
        linkedBy: tested[index].linkedBy,
        explanations: found,
        csRaw,
        ...(csDiscriminating ? { csDiscriminating } : {}),
        ...(plausibility ? {
          ps: plausibility.score,
          ...(plausibility.geometric ? { geometric: true } : {}),
          ...(plausibility.missing.length ? { missing: plausibility.missing } : {}),
          hvs: {
            preferred: cs.preferred * plausibility.score.preferred,
            envelope: [cs.envelope[0] * plausibility.score.envelope[0], cs.envelope[1] * plausibility.score.envelope[1]]
          }
        } : {}),
        admissible: counted.length > 0 && csRaw.preferred >= Hvs.ADMISSIBLE,
        dominant: false,
        ...(hypothesis.milestone ? { milestone: hypothesis.milestone } : {})
      }
    })
    const standing = (result: HvsHypothesisResult) => (result.csDiscriminating ?? result.csRaw).preferred
    const admissible = results.filter(result => result.admissible)
    if (admissible.length > 0) {
      const best = Math.max(...admissible.map(standing))
      const leaders = admissible.filter(result => standing(result) === best)
      // Two hypotheses that cover alike are not told apart by their coverage, and neither dominates: the product says the rest.
      if (leaders.length === 1) leaders[0].dominant = true
    }
    return { account, counted: counted.map(element => element.id), discriminating: discriminating.map(element => element.id), hypotheses: results }
  }

  /** Element by element, whether `hypothesis` explains it: by the confrontation of its readings where that settles it, else as declared. */
  private static explanationsOf(hypothesis: HvsHypothesisJson, counted: readonly CaseElementJson[], readings: readonly HvsReading[]): Record<string, HvsExplanation> {
    const declared = new Set(hypothesis.explains ?? [])
    const found: Record<string, HvsExplanation> = {}
    for (const element of counted) {
      const confronted = element.phenomenon ? Hvs.confronted(element, readings) : undefined
      found[element.id] = confronted === undefined ? { explained: declared.has(element.id), by: "declared" }
        : { explained: confronted.explained, by: "confrontation", ...(confronted.readings > 1 ? { readings: confronted.readings } : {}) }
    }
    return found
  }

  /**
   * Whether a reading reproduces what was said of the element's phenomenon, at its instant or at every one, and how many readings were
   * confronted on it: undefined when none of them compared anything of that phenomenon. A reading that reproduces it is enough.
   */
  private static confronted(element: CaseElementJson, readings: readonly HvsReading[]): { explained: boolean, readings: number } | undefined {
    const { sourceId, t } = element.phenomenon!
    const verdicts = readings.flatMap(reading => {
      const pairs = Object.entries(reading.outcomes ?? {}).filter(([pair]) => {
        const slash = pair.indexOf("/")
        return pair.slice(slash + 1) === sourceId && (t === undefined || Number(pair.slice(0, slash)) === t)
      })
      return pairs.length === 0 ? [] : [pairs.every(([, agrees]) => agrees)]
    })
    return verdicts.length === 0 ? undefined : { explained: verdicts.some(Boolean), readings: verdicts.length }
  }

  /**
   * The share of `elements` explained. Its envelope runs from the share explained when no inference counts (the protocol counts them "and
   * marks them as less sure": this is how sure) up to the share preferred.
   */
  private static coverage(elements: readonly CaseElementJson[], found: Record<string, HvsExplanation>): HvsScore {
    if (elements.length === 0) return { preferred: 0, envelope: [0, 0] }
    const explained = elements.filter(element => found[element.id]?.explained)
    const sure = explained.filter(element => element.status === "observed")
    const preferred = explained.length / elements.length
    return { preferred, envelope: [sure.length / elements.length, preferred] }
  }

  /**
   * The plausibility of `hypothesis` from the analyst's ratings, its envelope from their ranges; undefined when none is given.
   * @param observed The context factor said for the observation, in place of the hypothesis's own.
   */
  private static plausibility(hypothesis: HvsHypothesisJson, observed?: HvsRating): { score: HvsScore, geometric: boolean, missing: string[] } | undefined {
    const given = { ...hypothesis.plausibility, ...(observed === undefined ? {} : { context: observed }) }
    if (!hypothesis.plausibility && observed === undefined) return undefined
    const names = ["existence", "frequency", "compatibility"] as const
    const ratings = names.map(name => given[name]).filter((rating): rating is HvsRating => rating !== undefined).map(Hvs.rating)
    if (ratings.length === 0) return undefined
    const missing: string[] = names.filter(name => given[name] === undefined)
    const context = given.context === undefined ? { value: 1, low: 1, high: 1 } : Hvs.rating(given.context)
    if (given.context === undefined) missing.push("context")
    const values = ratings.map(rating => rating.value)
    const geometric = Math.min(...values) <= Hvs.COLLAPSED && Math.max(...values) >= Hvs.STRONG
    const mean = (of: number[]) => geometric
      ? Math.pow(of.reduce((product, value) => product * value, 1), 1 / of.length)
      : of.reduce((sum, value) => sum + value, 0) / of.length
    // Both means grow with each rating: the envelope is the mean of the least and of the greatest, each times the context's.
    const score: HvsScore = {
      preferred: mean(values) * context.value,
      envelope: [mean(ratings.map(rating => rating.low)) * context.low, mean(ratings.map(rating => rating.high)) * context.high]
    }
    return { score, geometric, missing }
  }

  /** A rating's value and the least and greatest of its range, kept within 0 to 1; an open end is as far as a rating goes. */
  private static rating(rating: HvsRating): { value: number, low: number, high: number } {
    const clamp = (value: number) => Math.min(1, Math.max(0, value))
    if (typeof rating === "number") return { value: clamp(rating), low: clamp(rating), high: clamp(rating) }
    const value = clamp(rating.value)
    const [low, high] = rating.range ?? [rating.value, rating.value]
    return { value, low: Math.min(value, clamp(low ?? 0)), high: Math.max(value, clamp(high ?? 1)) }
  }
}
