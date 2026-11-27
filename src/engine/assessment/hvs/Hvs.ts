import type { CaseElementJson, HvsHypothesisJson, HvsJson, HvsMilestone, HvsRating } from "./HvsJson.js"

/** A score as the protocol gives it: the value preferred, and the envelope its uncertainty allows, least and greatest. */
export interface HvsScore {
  preferred: number
  envelope: [number, number]
}

/** How a hypothesis was found to explain an element, or not: by a reading's confrontation with the account, or as the analyst declares. */
export interface HvsExplanation {
  explained: boolean
  by: "confrontation" | "declared"
}

/** What a hypothesis is worth against its case. */
export interface HvsHypothesisResult {
  id: string
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

/** What the protocol makes of a case's hypotheses. */
export interface HvsResult {
  /** The elements counted: every element but the inferences of association. */
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

/**
 * Weighs a case's hypotheses as Stéphane Baron's HVS protocol (Hypothesis Validity Score, version 7.0) does: how much of the case's
 * elements each covers (CS), how plausible it is apart from the case (PS), and their product, HVS = CS × PS, given as a value preferred
 * with an envelope. Never a probability: the scores of the hypotheses do not add up to anything, and the protocol emits no class.
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

  /**
   * @param elements The case's elements.
   * @param hvs What the case says for the protocol.
   * @param outcomes What a reading's confrontation found, by the `id` of the reading's event; undefined for one not confronted.
   * @param accountOf The `id` of the account event a reading reads, by the `id` of the reading's event.
   * @param onlyAccount The `id` of the case's account event when it has only one: what an element of no `of` is about.
   */
  static of(elements: readonly CaseElementJson[], hvs: HvsJson | undefined, outcomes: (readingId: string) => ReadingOutcomes | undefined,
            accountOf: (readingId: string) => string | undefined, onlyAccount?: string): HvsResult {
    const counted = elements.filter(element => element.status !== "association")
    const hypotheses = hvs?.hypotheses ?? []
    const explanations = hypotheses.map(hypothesis => Hvs.explanationsOf(hypothesis, counted, outcomes, accountOf, onlyAccount))
    const discriminating = counted.filter(element => {
      const verdicts = new Set(explanations.map(found => found[element.id]?.explained ?? false))
      return verdicts.size > 1
    })
    const results = hypotheses.map((hypothesis, index): HvsHypothesisResult => {
      const found = explanations[index]
      const csRaw = Hvs.coverage(counted, found)
      const csDiscriminating = discriminating.length > 0 ? Hvs.coverage(discriminating, found) : undefined
      const plausibility = Hvs.plausibility(hypothesis)
      const cs = csDiscriminating ?? csRaw
      return {
        id: hypothesis.id,
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
    return { counted: counted.map(element => element.id), discriminating: discriminating.map(element => element.id), hypotheses: results }
  }

  /** Element by element, whether `hypothesis` explains it: by its reading of the element's account where that settles it, else as declared. */
  private static explanationsOf(hypothesis: HvsHypothesisJson, counted: readonly CaseElementJson[], outcomes: (readingId: string) => ReadingOutcomes | undefined,
                                accountOf: (readingId: string) => string | undefined, onlyAccount?: string): Record<string, HvsExplanation> {
    const declared = new Set(hypothesis.explains ?? [])
    const found: Record<string, HvsExplanation> = {}
    for (const element of counted) {
      const confronted = element.phenomenon ? Hvs.confronted(element, hypothesis.readings ?? [], outcomes, accountOf, onlyAccount) : undefined
      found[element.id] = confronted === undefined ? { explained: declared.has(element.id), by: "declared" } : { explained: confronted, by: "confrontation" }
    }
    return found
  }

  /**
   * Whether the reading of the element's account reproduces what was said of its phenomenon, at its instant or at every one: undefined
   * when no reading of the hypothesis reads that account, or its confrontation compared nothing of that phenomenon.
   */
  private static confronted(element: CaseElementJson, readings: readonly string[], outcomes: (readingId: string) => ReadingOutcomes | undefined,
                            accountOf: (readingId: string) => string | undefined, onlyAccount?: string): boolean | undefined {
    const account = element.of ?? onlyAccount
    const { sourceId, t } = element.phenomenon!
    const verdicts = readings.filter(reading => account === undefined || accountOf(reading) === account).flatMap(reading => {
      const found = outcomes(reading)
      if (!found) return []
      return Object.entries(found).filter(([pair]) => {
        const slash = pair.indexOf("/")
        return pair.slice(slash + 1) === sourceId && (t === undefined || Number(pair.slice(0, slash)) === t)
      }).map(([, agrees]) => agrees)
    })
    return verdicts.length === 0 ? undefined : verdicts.every(Boolean)
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

  /** The plausibility of `hypothesis` from the analyst's ratings, its envelope from their ranges; undefined when none is given. */
  private static plausibility(hypothesis: HvsHypothesisJson): { score: HvsScore, geometric: boolean, missing: string[] } | undefined {
    const given = hypothesis.plausibility
    if (!given) return undefined
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
