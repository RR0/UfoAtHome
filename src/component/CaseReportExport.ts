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
import type { CaseReportData } from "../engine/report/CaseReport.js"
import type { InterpretationJson } from "../engine/interpretation/Interpretation.js"
import { Provenance } from "../engine/persistence/Provenance.js"
import type { CaseReportTexts } from "../engine/report/messages/CaseReportTexts.js"

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

  /**
   * @param pictures Whether to draw views of the simulated scene (see pictures): longer, so asked for. `progress` says how far that is.
   */
  static async make(kind: CaseReportKind, source: CaseReportSource, language: UfoLanguage, preferences: readonly string[],
                    pictures = false, progress?: (done: number, total: number) => void): Promise<void> {
    const [texts, checkTexts] = await Promise.all([CASE_REPORT_TEXTS.load(language), READING_CHECK_TEXTS.load(language)])
    const data = CaseReport.of(source.caseJson, source.caseUrl, source.recordings, new SaidTexts([...preferences]), new ReadingCheck(checkTexts))
    if (pictures && kind !== "csv") await CaseReportExport.pictures(data, source, texts, progress)
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

  /** At most this many instants are drawn per witness: the first, the middle and the last they gave a direction at. */
  private static readonly PICTURED_INSTANTS = 3

  /**
   * Views of the simulated scene from where each witness stood, at a few of the instants they gave a direction: their account, then each
   * reading of it that places something. Drawn by a scene of its own, out of the page and drawn all the same, as the seek bar's preview is
   * (see SceneElement.pictureAt), one recording after the other.
   */
  private static async pictures(data: CaseReportData, source: CaseReportSource, texts: CaseReportTexts, progress?: (done: number, total: number) => void): Promise<void> {
    const { registerScene, SCENE_ELEMENT_NAME } = await import("./SceneElement.js")
    registerScene()
    const plans = data.witnesses.map(witness => {
      const said = witness.indications.filter(indication => indication.directionSaid).map(indication => indication.t)
      const picked = said.length <= CaseReportExport.PICTURED_INSTANTS ? said : [said[0], said[Math.floor(said.length / 2)], said[said.length - 1]]
      const readings = data.readings.filter(reading => reading.reads === witness.title && reading.comparisons.length > 0)
      const recordings = [{ label: texts.accountView, url: witness.url, reading: undefined as string | undefined },
        ...readings.map(reading => ({ label: reading.title, url: witness.url, reading: reading.url }))]
      return { witness, instants: [...new Set(picked)], recordings }
    }).filter(plan => plan.instants.length > 0)
    const total = plans.reduce((sum, plan) => sum + plan.instants.length * plan.recordings.length, 0)
    if (total === 0) return
    const scene = document.createElement(SCENE_ELEMENT_NAME) as import("./SceneElement.js").SceneElement
    scene.setAttribute("max-pixel-ratio", "1")
    scene.setAttribute("always-live", "")
    Object.assign(scene.style, { position: "fixed", left: "-10000px", top: "0", width: "640px", height: "360px", visibility: "hidden", pointerEvents: "none" })
    document.body.appendChild(scene)
    let done = 0
    progress?.(done, total)
    try {
      for (const plan of plans) {
        const rows = plan.instants.map(t => ({ t, views: [] as { label: string, image?: string }[] }))
        // The account's scene, set once per witness; each reading then lays its bodies over it, as the player shows a reading.
        const account = source.recordings.get(plan.witness.url)
        if (account) {
          scene.documentUrl = plan.witness.url
          scene.sightingData = account
        }
        for (const recording of plan.recordings) {
          const json = account
          const readingJson = recording.reading ? source.recordings.get(recording.reading) : undefined
          for (const row of rows) {
            let image: string | undefined
            if (json && (!recording.reading || readingJson)) {
              // The account shows its own interpretation (the witness's, if any), as the player's "account" choice does.
              if (row === rows[0]) scene.interpretation = CaseReportExport.bodiesOf(readingJson ?? json, recording.reading ?? plan.witness.url)
              image = await scene.pictureAt(row.t, 480).catch(() => undefined)
            }
            row.views.push({ label: recording.label, ...(image ? { image } : {}) })
            progress?.(++done, total)
          }
        }
        plan.witness.pictures = rows
      }
    } finally {
      scene.remove()
    }
  }

  /** A reading's interpretation as a scene shows it: plain values, and its models at addresses of their own (see CaseFile). */
  private static bodiesOf(reading: SightingRecordingJson, url: string): InterpretationJson | undefined {
    const interpretation = Provenance.strip(reading).recording.interpretation
    if (!interpretation) return undefined
    return {
      ...interpretation,
      bodies: interpretation.bodies.map(body => body.model?.url ? { ...body, model: { ...body.model, url: new URL(body.model.url, url).href } } : body)
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
