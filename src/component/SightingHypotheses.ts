import type { HvsHypothesisResult, HvsResult, HvsScore } from "../engine/assessment/hvs/Hvs.js"
import type { PoherMatrixVersion, PoherRanking } from "../engine/witness/PoherMatrix.js"
import type { Sighting } from "../engine/model/Sighting.js"
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
  /** The section of the observation's Summary that details each chip, by its element id. */
  static readonly CANDIDATES_SECTION = "candidates-section"
  static readonly HVS_SECTION = "hvs-section"

  /** The matrices read, by version and language, shared by every player of the page: read once. */
  private static readonly matrices = new Map<string, Promise<{ matrix: import("../engine/witness/PoherMatrix.js").PoherMatrix, labels: Record<string, string> }>>()

  /**
   * The chip of Poher's matrix for a recording, where nothing else has read the matrix (the player, which has no candidates): the version the
   * reader chose, from what the recording says, under the error model by default. Its code and its files arrive when first asked for.
   */
  async poherOf(sighting: Sighting, language: string): Promise<SummaryEntry | undefined> {
    const [{ PoherAnswers, PoherMatrix }, { PoherAccountFacts }, { WitnessError }, { SightingFetch }] = await Promise.all([
      import("../engine/witness/PoherMatrix.js"), import("../engine/witness/PoherSelfCheck.js"), import("../engine/witness/WitnessError.js"),
      import("../engine/net/SightingFetch.js")
    ])
    const version = PoherMatrix.chosenVersion()
    const key = `${version}/${language}`
    let loading = SightingHypotheses.matrices.get(key)
    if (!loading) {
      loading = PoherMatrix.load(version, language, url => SightingFetch.json(url))
      // A failure is not kept: the next ask tries again (back online).
      loading.catch(() => SightingHypotheses.matrices.delete(key))
      SightingHypotheses.matrices.set(key, loading)
    }
    const { matrix, labels } = await loading
    const answers = new PoherAnswers(WitnessError.MODELS[0], sighting.account?.conditions).of(PoherAccountFacts.of(sighting)).filter(answer => matrix.has(answer.question))
    return this.poher(matrix.rank(answers), answers.length, labels, version)
  }

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
   * @param version The version of the matrix read, which names the chip: Poher's own, or RR0's that extends it.
   */
  poher(rows: readonly PoherRanking[], answered: number, names: Readonly<Record<string, string>>, version: PoherMatrixVersion): SummaryEntry | undefined {
    if (rows.length === 0 || answered === 0) return undefined
    const h = this.labels.hypotheses
    const possible = rows.filter(row => row.excludedBy.length === 0)
    const excluded = rows.filter(row => row.excludedBy.length > 0)
    const name = (row: PoherRanking) => names[row.phenomenon] ?? row.phenomenon
    const best = possible[0]
    let value = h.allExcluded
    let detail: string | undefined
    if (best) {
      const tied = possible.filter(row => Math.abs(row.mean - best.mean) < 1e-9).length - 1
      value = tied > 0 ? h.tied.replace("{name}", name(best)).replace("{n}", String(tied)) : name(best)
      detail = h.poherDetail.replace("{mean}", this.percent.format(best.mean)).replace("{possible}", String(possible.length)).replace("{of}", String(rows.length))
    }
    // Every phenomenon, opened from the chip: those still possible with their score, then those ruled out.
    const full = [
      ...(possible.length > 0 ? [h.possible.replace("{n}", String(possible.length)).replace("{of}", String(rows.length)),
        ...possible.map(row => `${name(row)} ${this.percent.format(row.mean)}`)] : []),
      ...(excluded.length > 0 ? [...(possible.length > 0 ? [""] : []), h.excluded.replace("{n}", String(excluded.length)), excluded.map(name).join(", ")] : [])
    ].join("\n")
    return this.entry(SightingHypotheses.CANDIDATES_SECTION, h.poher[version], value, detail, rows.length > 1 ? full : undefined)
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
    // Every hypothesis, opened from the chip, by decreasing score: its score and what it is made of, and its standing.
    const scoreOf = (found: HvsHypothesisResult) => found.hvs?.preferred ?? -1
    const full = [...result.hypotheses].sort((a, b) => scoreOf(b) - scoreOf(a)).map(found => {
      const cs = this.number.format((found.csDiscriminating ?? found.csRaw).preferred)
      const score = found.hvs && found.ps
        ? h.hvsLine.replace("{hvs}", this.number.format(found.hvs.preferred)).replace("{cs}", cs).replace("{ps}", this.number.format(found.ps.preferred))
        : h.hvsLineNoPs.replace("{cs}", cs)
      const standing = [found.admissible ? h.admissible : h.notAdmissible, ...(found.dominant ? [h.dominant] : [])].join(", ")
      return `${title(found.id)} — ${score} (${standing})`
    }).join("\n")
    return this.entry(SightingHypotheses.HVS_SECTION, h.hvs, value, dominant ? this.hvsDetail(dominant) : undefined, result.hypotheses.length > 1 ? full : undefined)
  }

  private hvsDetail(found: HvsHypothesisResult): string | undefined {
    const cs = found.csDiscriminating ?? found.csRaw
    if (!found.hvs || !found.ps) return undefined
    const format = (score: HvsScore) => this.number.format(score.preferred)
    return this.labels.hypotheses.hvsDetail.replace("{hvs}", format(found.hvs)).replace("{cs}", format(cs)).replace("{ps}", format(found.ps))
  }

  /** With `full`, the chip says there is more ("…") and unfolds to it in place (see fold). */
  private entry(section: string, label: string, value: string, detail: string | undefined, full: string | undefined): SummaryEntry {
    return {
      group: "hypothesis", field: section, label, value: full ? `${value}…` : value, unit: "", fromSource: false, about: "observation",
      ...(detail ? { detail } : {}), ...(full ? { expandable: full } : {})
    }
  }

  /**
   * Makes the chip `item` of `entry` unfold to the whole of what it heads, in place, and fold back, on a click: the chip grows to hold the
   * list, the rest of the strip staying as it is. Whether it is unfolded is kept by its field in `unfolded`, which the host keeps between
   * redraws of its strip. Does nothing to a chip that heads nothing more.
   */
  static fold(item: HTMLElement, value: HTMLElement, entry: SummaryEntry, unfolded: Set<string>): void {
    const whole = entry.expandable
    if (whole === undefined) return
    const draw = () => {
      const open = unfolded.has(entry.field)
      item.toggleAttribute("data-expanded", open)
      item.setAttribute("aria-expanded", String(open))
      value.textContent = open ? whole : entry.value
    }
    const toggle = (event: Event) => {
      // Its own: not the strip's, which would lead the click to a field.
      event.stopPropagation()
      if (!unfolded.delete(entry.field)) unfolded.add(entry.field)
      draw()
    }
    item.classList.add("expandable")
    if (item.tagName !== "BUTTON") {
      item.tabIndex = 0
      item.setAttribute("role", "button")
      item.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          toggle(event)
        }
      })
    }
    item.addEventListener("click", toggle)
    draw()
  }

  /** The styles of an unfolded chip, which both templates carry: a box holding its list, a line per item. */
  static readonly CSS = `
.param-chip.expandable, .param-label.expandable {
  cursor: pointer;
}
.param-chip.expandable[data-expanded], .param-label.expandable[data-expanded] {
  white-space: normal;
  text-align: left;
  border-radius: 12px;
  padding: 0.3em 0.7em;
}
.param-chip.expandable[data-expanded] .param-chip-value, .param-label.expandable[data-expanded] .param-label-value {
  display: block;
  white-space: pre-line;
  font-weight: normal;
  margin-top: 0.2em;
}
`
}
