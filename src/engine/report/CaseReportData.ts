import type { CaseReportData } from "./CaseReport.js"
import type { CaseReportTexts } from "./messages/CaseReportTexts.js"
import { ReportFormat } from "./ReportFormat.js"

/**
 * A report's content written out as data: the whole of it as JSON, for whoever goes on working on it with other tools, and its tables as
 * CSV, for a spreadsheet. Asked for by the GEIPAN (A. Cousyn, November 2026), who named JSON for the data and wanted the computed gaps and
 * parameters usable in a report.
 */
export class CaseReportDataFiles {

  /** What a report's JSON says it is: the format and its version, for a reader to know what it reads. */
  static readonly FORMAT = "ufoathome-case-report"
  static readonly VERSION = 1

  /** The whole report, numbers as computed (degrees, milliseconds), names as the case gives them. */
  static json(data: CaseReportData, appVersion: string): string {
    return JSON.stringify({ format: CaseReportDataFiles.FORMAT, version: CaseReportDataFiles.VERSION, generator: `UFO@home ${appVersion}`, ...data }, null, 2)
  }

  /**
   * One CSV per table of the report, by file name: comma-separated, numbers with a dot, as RFC 4180 has it, so that any spreadsheet reads
   * them the same; the column heads in the reader's language.
   */
  static csv(data: CaseReportData, texts: CaseReportTexts, language: string): Record<string, string> {
    const f = new ReportFormat(texts, language)
    const c = texts.columns
    const n = (value: number | undefined) => value === undefined || !Number.isFinite(value) ? "" : String(Math.round(value * 1000) / 1000)
    const files: Record<string, string> = {}
    files["indications.csv"] = CaseReportDataFiles.table(
      [c.witness, `${c.instant} (s)`, c.phenomenon, `${c.azimuth} (°)`, `${c.altitude} (°)`, `${c.azimuth} min`, `${c.azimuth} max`,
        `${c.altitude} min`, `${c.altitude} max`, `${c.size} (°)`, c.basis, c.rests],
      data.witnesses.flatMap(witness => witness.indications.map(indication => [
        witness.title, n(indication.t / 1000), indication.phenomenon ?? indication.sourceId,
        n(indication.aim?.azimuthDeg), n(indication.aim?.altitudeDeg),
        n(indication.uncertainty?.azimuthDeg[0]), n(indication.uncertainty?.azimuthDeg[1]),
        n(indication.uncertainty?.altitudeDeg[0]), n(indication.uncertainty?.altitudeDeg[1]),
        indication.sizeSaid ? n(indication.angular?.widthDeg) : "", indication.basis ? texts.bases[indication.basis] : "", f.rests(indication)])))
    files["values.csv"] = CaseReportDataFiles.table([c.witness, c.reading, c.path, c.value, c.basis, c.rests], [
      ...data.witnesses.flatMap(witness => witness.values.map(value => [witness.title, "", value.path, f.value(value), texts.bases[value.basis], f.rests(value)])),
      ...data.readings.flatMap(reading => reading.supposed.map(value => [reading.reads, reading.title, value.path, f.value(value), texts.bases[value.basis], f.rests(value)]))])
    // Two numbers rather than "2 / 3", which a spreadsheet would take for a date.
    files["readings.csv"] = CaseReportDataFiles.table([c.reading, c.reads, c.by, c.time, c.reproduced, c.compared, `${c.gap} (°)`, c.robustness, c.supposedCount],
      data.readings.map(reading => [reading.title, reading.reads, reading.by.join(", "), reading.time ?? "",
        reading.sensitivity && reading.sensitivity.compared > 0 ? String(Math.round(reading.sensitivity.agreement * reading.sensitivity.compared)) : "",
        reading.sensitivity && reading.sensitivity.compared > 0 ? String(reading.sensitivity.compared) : "",
        n(reading.sensitivity?.medianSeparationDeg), f.robustness(reading.sensitivity).text, String(reading.supposed.length)]))
    files["margins.csv"] = CaseReportDataFiles.table([c.reading, c.reads, c.knob, c.from, c.to, `${c.reference} min`, `${c.reference} max`, c.covered],
      data.readings.flatMap(reading => (reading.sensitivity?.margins ?? []).map(margin => [reading.title, reading.reads, texts.knobs[margin.knob],
        n(margin.lower), n(margin.upper), n(margin.reference?.lower), n(margin.reference?.upper),
        margin.coverage === undefined ? "" : n(margin.coverage)])))
    files["comparisons.csv"] = CaseReportDataFiles.table([c.reading, c.reads, `${c.instant} (s)`, c.phenomenon, `${c.said} ${c.azimuth}`, `${c.said} ${c.altitude}`,
      `${c.read} ${c.azimuth}`, `${c.read} ${c.altitude}`, `${c.separation} (°)`, c.agrees],
      data.readings.flatMap(reading => reading.comparisons.map(comparison => [reading.title, reading.reads, n(comparison.t / 1000),
        data.witnesses.find(witness => witness.title === reading.reads)?.phenomena?.[comparison.sourceId] ?? comparison.sourceId,
        n(comparison.said?.azimuthDeg), n(comparison.said?.altitudeDeg), n(comparison.predicted.azimuthDeg), n(comparison.predicted.altitudeDeg),
        n(comparison.separationDeg), comparison.agrees ? texts.yes : texts.no])))
    files["findings.csv"] = CaseReportDataFiles.table([c.reading, c.reads, c.finding, c.outcome, c.against, c.origin],
      data.readings.flatMap(reading => reading.findings.map(finding => [reading.title, reading.reads, finding.text, texts.outcomes[finding.outcome],
        finding.outcome === "fails" ? texts.grounds[finding.against ?? "established"] : "", texts.origins[finding.written ? "written" : "computed"]])))
    return files
  }

  /** A CSV of `rows` under `heads`: every cell quoted where it has to be, lines ended by CRLF. */
  static table(heads: readonly string[], rows: readonly (readonly string[])[]): string {
    const cell = (text: string) => /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
    return [heads, ...rows].map(row => row.map(cell).join(",")).join("\r\n") + "\r\n"
  }
}
