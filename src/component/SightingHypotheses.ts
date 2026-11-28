import type { HvsHypothesisResult, HvsResult, HvsScore } from "../engine/assessment/hvs/Hvs.js"
import type { PoherRanking } from "../engine/witness/PoherMatrix.js"
import type { SummaryEntry } from "./SightingSummary.js"
import type { SightingLabels } from "./messages/SightingLabels.js"

/**
 * What the hypotheses' evaluators make of an observation, turned into the chips that state it, beside the assessment's (see
 * SightingAssessments): Poher's matrix says which phenomenon the testimony fits best, the HVS protocol which of the case's hypotheses
 * dominates and its score. One chip per evaluator, its headline only; the detail is in the sections the chips lead to (the candidates,
 * the HVS table).
 *
 * An assessment rates the account; these weigh what could explain it: two different questions, hence two nests.
 */
export class SightingHypotheses {
  /** The section of the observation's Summary each chip leads to, by its element id (see SightingEditorElement.onParamSummaryClick). */
  static readonly CANDIDATES_SECTION = "candidates-section"
  static readonly HVS_SECTION = "hvs-section"

  private readonly number: Intl.NumberFormat
  private readonly percent: Intl.NumberFormat

  constructor(private readonly labels: SightingLabels, language: string) {
    this.number = new Intl.NumberFormat(language, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    this.percent = new Intl.NumberFormat(language, { style: "percent", maximumFractionDigits: 0 })
  }

  /**
   * The matrix's ranking as one chip: the phenomenon it ranks first among those it does not rule out, with how many others score the same
   * (a tie is said, never broken: the matrix cannot tell them apart). Undefined when the testimony answers none of its questions.
   * @param names The matrix's names of its phenomena, in the reader's language.
   */
  poher(rows: readonly PoherRanking[], answered: number, names: Readonly<Record<string, string>>): SummaryEntry | undefined {
    if (rows.length === 0 || answered === 0) return undefined
    const h = this.labels.hypotheses
    const possible = rows.filter(row => row.excludedBy.length === 0)
    const best = possible[0]
    let value = h.allExcluded
    let detail: string | undefined
    if (best) {
      const tied = possible.filter(row => Math.abs(row.mean - best.mean) < 1e-9).length - 1
      const name = names[best.phenomenon] ?? best.phenomenon
      value = tied > 0 ? h.tied.replace("{name}", name).replace("{n}", String(tied)) : name
      detail = h.poherDetail.replace("{mean}", this.percent.format(best.mean)).replace("{possible}", String(possible.length)).replace("{of}", String(rows.length))
    }
    return this.entry(SightingHypotheses.CANDIDATES_SECTION, h.poher, value, detail)
  }

  /**
   * The protocol's weighing as one chip: the dominant hypothesis and its score, or that none dominates. Undefined when the case gives the
   * protocol no hypothesis.
   * @param title A hypothesis's name, by its id.
   */
  hvs(result: HvsResult, title: (id: string) => string): SummaryEntry | undefined {
    if (result.hypotheses.length === 0) return undefined
    const h = this.labels.hypotheses
    const dominant = result.hypotheses.find(found => found.dominant)
    const value = dominant ? [title(dominant.id), dominant.hvs ? this.number.format(dominant.hvs.preferred) : undefined].filter(Boolean).join(" ") : h.noDominant
    return this.entry(SightingHypotheses.HVS_SECTION, h.hvs, value, dominant ? this.hvsDetail(dominant) : undefined)
  }

  private hvsDetail(found: HvsHypothesisResult): string | undefined {
    const cs = found.csDiscriminating ?? found.csRaw
    if (!found.hvs || !found.ps) return undefined
    const format = (score: HvsScore) => this.number.format(score.preferred)
    return this.labels.hypotheses.hvsDetail.replace("{hvs}", format(found.hvs)).replace("{cs}", format(cs)).replace("{ps}", format(found.ps))
  }

  private entry(section: string, label: string, value: string, detail: string | undefined): SummaryEntry {
    // The field is the section's id, so that a chip leads to it as any chip leads to its field.
    return { group: "hypothesis", field: section, label, value, unit: "", fromSource: false, about: "observation", ...(detail ? { detail } : {}) }
  }
}
