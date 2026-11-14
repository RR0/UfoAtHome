import { Messages } from "../../../i18n/MessageCatalog.js"

/**
 * The words of a report on a case (see CaseReportHtml, CaseReportCsv), with `{…}` for their values: one chunk per language (see
 * MessageCatalog), loaded only when a report is made.
 */
export interface CaseReportTexts {
  /** The report's title, of the case `{title}`. */
  title: string
  /** When it was worked out, `{date}`, and by which version of UFO@home, `{version}`. */
  generated: string
  /** What the report holds and how it was worked out, before anything else. */
  method: string
  /** The button that prints the report, or saves it as a PDF. */
  print: string
  witnesses: string
  /** A witness's account, `{witness}`: its heading. */
  witnessHeading: string
  indications: string
  /** No direction and no size traced to the witness. */
  noIndication: string
  values: string
  readingsCompared: string
  /** A reading `{title}` of `{witness}`'s account: its heading. */
  readingHeading: string
  /** Who made it, `{names}`. */
  by: string
  /** When it was made, `{time}`. */
  made: string
  supposed: string
  noneSupposed: string
  findings: string
  noFinding: string
  sensitivity: string
  comparisons: string
  interviews: string
  /** A witness's own account, as told. */
  account: string
  sources: string
  /** A witness's place, duration and instrument, before their account. */
  place: string
  duration: string
  instrument: string
  /** The map of the case, and what it shows. */
  map: string
  mapCaption: string
  /** The scale of the map, `{metres}`. */
  scale: string
  /** The strip of a witness's moments, and what it shows. */
  timelineCaption: string
  /** The figure of a witness's sky. */
  figureCaption: string
  azimuth: string
  altitude: string
  /** The legend of the figure: what the witness said, and a reading. */
  saidLegend: string
  columns: {
    instant: string, phenomenon: string, azimuth: string, altitude: string, size: string, uncertainty: string, basis: string, rests: string,
    path: string, value: string, reading: string, reads: string, reproduced: string, compared: string, gap: string, separation: string, robustness: string, supposedCount: string,
    knob: string, from: string, to: string, reference: string, covered: string, said: string, read: string, agrees: string, outcome: string,
    against: string, origin: string, title: string, witness: string, time: string, by: string, medium: string, finding: string
  }
  bases: { established: string, measured: string, stated: string, derived: string, assumed: string, fitted: string }
  outcomes: { holds: string, fails: string, untested: string }
  grounds: { established: string, supposed: string }
  origins: { written: string, computed: string }
  knobs: { azimuth: string, altitude: string, distance: string, size: string, time: string }
  robustness: { sufficient: string, fineTuned: string, tooFew: string, unjudged: string, nothing: string }
  /** A turn that reproduces more: `{knob}` by `{amount}`, `{agreed}` of `{compared}`. */
  better: string
  /** No law gives an uncertainty for this value. */
  noLaw: string
  yes: string
  no: string
}

export const CASE_REPORT_TEXTS = Messages.catalog<CaseReportTexts>({
  en: () => import("./CaseReportTexts_en.js").then(m => m.caseReportTexts_en),
  fr: () => import("./CaseReportTexts_fr.js").then(m => m.caseReportTexts_fr),
  es: () => import("./CaseReportTexts_es.js").then(m => m.caseReportTexts_es),
  it: () => import("./CaseReportTexts_it.js").then(m => m.caseReportTexts_it)
})
