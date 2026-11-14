import type { CaseExportMessages } from "./CaseExportMessages.js"

export const caseExportMessages_en = {
  button: "Report",
  hint: "Export a report of the case: the witnesses' indications, the readings compared, findings, sensitivity and figures",
  html: "Report (HTML)",
  print: "Print or PDF",
  json: "Results (JSON)",
  csv: "Tables (CSV)",
  htmlHint: "A page standing on its own, to open, keep, or take into a word processor",
  printHint: "The same report, to print or save as a PDF from the browser",
  jsonHint: "All the data and every computed result, for other tools",
  csvHint: "One file per table, for a spreadsheet, gathered in a zip",
  pictures: "Include views of the scene",
  picturesHint: "Longer: the scene is simulated and pictured for each witness and each reading",
  drawing: "Views of the scene: {done} of {total}…",
  working: "Working out the report…",
  failed: "The report could not be worked out."
} satisfies CaseExportMessages
