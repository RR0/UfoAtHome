import { ReadingSensitivity, type KnobMargin, type ReadingSensitivityResult, type SensitivityKnob } from "../interpretation/ReadingSensitivity.js"
import type { ValueSource } from "../persistence/Provenance.js"
import type { ReportValue } from "./CaseReport.js"
import type { CaseReportTexts } from "./messages/CaseReportTexts.js"

/** How a report says its values, the same in its HTML and its CSV: numbers in the reader's language, instants in seconds, a margin's ends. */
export class ReportFormat {

  private readonly decimal: Intl.NumberFormat
  private readonly signed: Intl.NumberFormat

  constructor(readonly texts: CaseReportTexts, readonly language: string) {
    this.decimal = new Intl.NumberFormat(language, { maximumFractionDigits: 1 })
    this.signed = new Intl.NumberFormat(language, { maximumFractionDigits: 2, signDisplay: "exceptZero" })
  }

  /** A number to one decimal. */
  number(value: number | undefined): string {
    return value === undefined || !Number.isFinite(value) ? "" : this.decimal.format(value)
  }

  degrees(value: number | undefined): string {
    return value === undefined ? "" : `${this.number(value)}°`
  }

  /** An azimuth, brought within 0 to 360°: an uncertainty either side of the north goes past it. */
  azimuth(value: number | undefined): string {
    return value === undefined ? "" : this.degrees(((value % 360) + 360) % 360)
  }

  /** An instant of the recording, milliseconds from its start, in seconds. */
  instant(ms: number): string {
    return `${this.number(ms / 1000)} s`
  }

  /** A turn of a knob: degrees and seconds signed, a factor after a ×. */
  amount(knob: SensitivityKnob, value: number): string {
    switch (knob) {
      case "azimuth":
      case "altitude":
        return `${this.signed.format(value)}°`
      case "time":
        return `${this.signed.format(value / 1000)} s`
      default:
        return `×${new Intl.NumberFormat(this.language, { maximumFractionDigits: 2 }).format(value)}`
    }
  }

  /** What a value rests on: its source named, else its rationale. */
  rests(entry: { rationale?: string, source?: ValueSource }): string {
    const source = entry.source
    const named = source ? [source.said ? `interview ${source.said.interview ?? ""} #${source.said.segment}`.replace("  ", " ") : undefined,
      typeof source.document === "string" ? source.document : undefined, source.at, source.picture, source.tool, source.url].filter(Boolean).join(", ") : ""
    return [named, entry.rationale].filter(text => text && text !== "").join(" : ")
  }

  /** A value as the recording holds it: a number, a text, or what else is, compact. */
  value(entry: ReportValue): string {
    const value = entry.value
    if (typeof value === "number") return this.number(value)
    if (typeof value === "string") return value
    if (Array.isArray(value)) return `[${value.length}]`
    return value === undefined ? "" : JSON.stringify(value)
  }

  /** How robust a reading is, in a few words, and which of its kinds that is (for a mark's colour). */
  robustness(result: ReadingSensitivityResult | undefined): { kind: "sufficient" | "fine-tuned" | "too-few" | "unjudged" | "nothing", text: string } {
    const r = this.texts.robustness
    if (!result || result.compared === 0) return { kind: "nothing", text: r.nothing }
    if (!ReadingSensitivity.measurable(result)) return { kind: "too-few", text: r.tooFew }
    if (result.sufficient === true) return { kind: "sufficient", text: r.sufficient }
    if (result.sufficient === false) return { kind: "fine-tuned", text: r.fineTuned.replace("{knob}", this.texts.knobs[result.margins[0].knob]) }
    return { kind: "unjudged", text: r.unjudged }
  }

  /** How many of the comparisons it reproduces, as "2 / 3". */
  reproduced(result: ReadingSensitivityResult | undefined): string {
    return result && result.compared > 0 ? `${Math.round(result.agreement * result.compared)} / ${result.compared}` : ""
  }

  /** A margin's ends, an end the search did not find marked as reached. */
  ends(margin: KnobMargin): { from: string, to: string } {
    const end = (value: number, reached: boolean) => `${reached ? "≥ " : ""}${this.amount(margin.knob, value)}`
    return { from: end(margin.lower, margin.lowerReached), to: end(margin.upper, margin.upperReached) }
  }

  fill(template: string, values: Record<string, string>): string {
    return template.replace(/\{(\w+)\}/g, (whole, key: string) => key in values ? values[key] : whole)
  }
}
