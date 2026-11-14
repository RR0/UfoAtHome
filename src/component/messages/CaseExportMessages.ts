/** What the export of a case's report says — see CaseExportElement. Only these few words come with the page: the report's own are fetched
 * with it, when it is asked for. */
export interface CaseExportMessages {
  /** The button, and its tooltip. */
  button: string
  hint: string
  /** The four ways out. */
  html: string
  print: string
  json: string
  csv: string
  /** What each gives, under its name. */
  htmlHint: string
  printHint: string
  jsonHint: string
  csvHint: string
  /** While the report is being worked out, and when it could not be. */
  working: string
  failed: string
}
