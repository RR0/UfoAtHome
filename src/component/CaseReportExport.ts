import { ReadingCheck } from "../engine/interpretation/ReadingCheck.js"
import { READING_CHECK_TEXTS } from "../engine/interpretation/messages/ReadingCheckTexts.js"
import { SaidTexts } from "../engine/model/SaidText.js"
import type { CaseJson } from "../engine/persistence/caseJson.js"
import type { SightingRecordingJson } from "../engine/persistence/sightingJson.js"
import { CaseReport } from "../engine/report/CaseReport.js"
import { CaseReportDataFiles } from "../engine/report/CaseReportData.js"
import { CaseReportHtml } from "../engine/report/CaseReportHtml.js"
import { CASE_REPORT_TEXTS } from "../engine/report/messages/CaseReportTexts.js"
import type { UfoLanguage } from "./messages/index.js"

/** What a report is made from: the case, where it is, and its recordings by their absolute address. */
export interface CaseReportSource {
  caseJson: CaseJson
  caseUrl: string
  recordings: ReadonlyMap<string, SightingRecordingJson>
}

/** The ways a report goes out (see CaseExportElement). */
export type CaseReportKind = "html" | "print" | "json" | "csv"

/**
 * Makes a report of a case and hands it out: the part of the export that is loaded only when a report is asked for (see CaseExportElement),
 * since most readers of a case never ask for one. It brings the report's computation, its writers and their words with it.
 */
export class CaseReportExport {

  static async make(kind: CaseReportKind, source: CaseReportSource, language: UfoLanguage, preferences: readonly string[]): Promise<void> {
    const [texts, checkTexts] = await Promise.all([CASE_REPORT_TEXTS.load(language), READING_CHECK_TEXTS.load(language)])
    const data = CaseReport.of(source.caseJson, source.caseUrl, source.recordings, new SaidTexts([...preferences]), new ReadingCheck(checkTexts))
    const stem = `${source.caseJson.id ?? "case"}-report`
    switch (kind) {
      case "html":
        CaseReportExport.download(new Blob([CaseReportHtml.of(data, texts, language, __APP_VERSION__)], { type: "text/html" }), `${stem}.html`)
        return
      case "print":
        CaseReportExport.print(CaseReportHtml.of(data, texts, language, __APP_VERSION__))
        return
      case "json":
        CaseReportExport.download(new Blob([CaseReportDataFiles.json(data, __APP_VERSION__)], { type: "application/json" }), `${stem}.json`)
        return
      case "csv": {
        const { zipSync, strToU8 } = await import("fflate")
        // A byte order mark first: a spreadsheet then reads the accents as UTF-8 rather than guessing.
        const files = Object.fromEntries(Object.entries(CaseReportDataFiles.csv(data, texts, language)).map(([name, csv]) => [name, strToU8(`﻿${csv}`)]))
        CaseReportExport.download(new Blob([zipSync(files) as BlobPart], { type: "application/zip" }), `${stem}-tables.zip`)
      }
    }
  }

  /**
   * Prints the report, to paper or to a PDF as the browser offers: from a frame of this page that nobody sees, rather than from a window of
   * its own, which a blocker of pop-ups stops and which, opened only once the report is worked out, is no longer the answer to a press.
   * What is printed is the frame's document, the report alone, with its own print layout.
   */
  private static print(html: string): void {
    const frame = document.createElement("iframe")
    frame.setAttribute("aria-hidden", "true")
    frame.style.cssText = "position: fixed; right: 0; bottom: 0; width: 0; height: 0; border: 0"
    frame.addEventListener("load", () => {
      const view = frame.contentWindow
      if (!view) return
      view.addEventListener("afterprint", () => frame.remove())
      view.focus()
      view.print()
      // Some browsers never say printing is over: the frame goes anyway, once the dialog has long been answered.
      window.setTimeout(() => frame.remove(), 60_000)
    }, { once: true })
    frame.srcdoc = html
    document.body.append(frame)
  }

  private static download(blob: Blob, name: string): void {
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = name
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}
