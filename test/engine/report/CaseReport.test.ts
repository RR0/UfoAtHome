import { describe, expect, it } from "vitest"
import { ReadingCheck } from "../../../src/engine/interpretation/ReadingCheck.js"
import { readingCheckTexts_en } from "../../../src/engine/interpretation/messages/ReadingCheckTexts_en.js"
import { SaidTexts } from "../../../src/engine/model/SaidText.js"
import type { CaseJson } from "../../../src/engine/persistence/caseJson.js"
import type { SightingRecordingJson } from "../../../src/engine/persistence/sightingJson.js"
import { CaseReport } from "../../../src/engine/report/CaseReport.js"
import { CaseReportDataFiles } from "../../../src/engine/report/CaseReportData.js"
import { CaseReportHtml } from "../../../src/engine/report/CaseReportHtml.js"
import { caseReportTexts_en } from "../../../src/engine/report/messages/CaseReportTexts_en.js"

const DEG = Math.PI / 180
const base = "https://example.org/case/"

/** A witness who said, as a report has it, where a phenomenon a degree across was at two instants: due north, 10° up. The size is drawn. */
const account = (): SightingRecordingJson => ({
  version: 4,
  id: "q",
  place: { locations: [{ lat: 48, lng: 2 }] },
  timeline: {
    keyframes: [0, 1000].map(t => ({
      t,
      shapes: [{
        sourceId: "ufo",
        shape: {
          kind: "oval", bounds: { x: 0, y: 0, width: 1, height: 1 }, color: "#fff", angle: 0, transparency: 0, haloScale: 0, selected: false,
          ...(t === 0 ? { title: "A light" } : {}),
          angular: { widthDeg: 1, heightDeg: 1 },
          aim: { value: { azimuthDeg: 0, altitudeDeg: 10 }, basis: "stated", rationale: "the report, table 1" }
        }
      }]
    }))
  },
  observerTrack: { keyframes: [{ t: 0, pose: { lat: 48, lng: 2, elevationM: 0, headingDeg: 0, pitchDeg: 10, fovDeg: 60 } }] }
} as unknown as SightingRecordingJson)

const diameter = 2 * 100 * Math.tan(0.5 * DEG)

/** A balloon 100 m off where the light was said to be, its track supposed. */
const reading = (): SightingRecordingJson => ({
  version: 4,
  timeline: { keyframes: [] },
  interpretation: {
    title: "A balloon",
    bodies: [{
      id: "b", model: { id: "ellipsoid" }, explains: ["ufo"],
      track: {
        value: [0, 1000].map(t => ({ t, azimuthDeg: 0, altitudeDeg: 10, distanceM: 100, sizeM: { widthM: diameter, lengthM: diameter, heightM: diameter } })),
        basis: "assumed", rationale: { en: "a party balloon, <its> height guessed", fr: "un ballon de fête, <sa> hauteur devinée" }
      }
    }]
  }
} as unknown as SightingRecordingJson)

const caseJson: CaseJson = {
  id: "Test1950", title: "Test & case", time: "1950",
  events: [
    { type: "event", eventType: "sighting", id: "q", title: "Q. B.", url: "q.json" },
    { type: "event", eventType: "sighting", interpretationOf: "q", title: "A balloon", url: "balloon.json", by: [{ people: "CousynAntoine" }], time: "2026-11" },
    { type: "event", eventType: "interview", title: "Interview of Q. B.", interviewOf: "q", url: "i.json", by: [{ org: "GEIPAN" }] }
  ]
} as CaseJson

const recordings = () => new Map([[`${base}q.json`, account()], [`${base}balloon.json`, reading()]])
const report = () => CaseReport.of(caseJson, `${base}case.json`, recordings(), new SaidTexts(["en"]), new ReadingCheck(readingCheckTexts_en), new Date("2026-11-14T12:00:00Z"))

describe("A report on a case", () => {
  it("sets out each witness's indications with what they rest on and how far they may be off", () => {
    const [witness] = report().witnesses
    expect(witness.title).toBe("Q. B.")
    expect(witness.indications).toHaveLength(2)
    // Named by the title the account gives it once, at every instant.
    expect(witness.indications.map(indication => indication.phenomenon)).toEqual(["A light", "A light"])
    expect(witness.indications[0]).toMatchObject({ directionSaid: true, sizeSaid: false, basis: "stated", rationale: "the report, table 1" })
    // A direction estimated: ±45° across, and an elevation that may be lower than said, never higher.
    expect(witness.indications[0].uncertainty).toEqual({ azimuthDeg: [-45, 45], altitudeDeg: [3, 10] })
  })

  it("sets out each reading: who made it, what it supposed, how it compares with what was said, and how robust that is", () => {
    const data = report()
    const [balloon] = data.readings
    expect(balloon).toMatchObject({ title: "A balloon", reads: "Q. B.", by: ["Antoine Cousyn"], time: "2026-11" })
    expect(balloon.supposed.map(value => value.path)).toEqual(["interpretation.bodies.0.track"])
    // Its justification in the reader's language, when it is given in several.
    expect(balloon.supposed[0].rationale).toBe("a party balloon, <its> height guessed")
    expect(CaseReport.of(caseJson, `${base}case.json`, recordings(), new SaidTexts(["fr"])).readings[0].supposed[0].rationale).toBe("un ballon de fête, <sa> hauteur devinée")
    expect(balloon.comparisons.map(comparison => comparison.agrees)).toEqual([true, true])
    expect(balloon.sensitivity?.agreement).toBe(1)
    expect(balloon.sensitivity?.sufficient).toBe(true)
    expect(data.interviews).toEqual([{ title: "Interview of Q. B.", witness: "Q. B.", by: ["GEIPAN"] }])
  })

  it("writes it out as one HTML page standing on its own, its figures inside it, its text escaped", () => {
    const html = CaseReportHtml.of(report(), caseReportTexts_en, "en", "9.9.9")
    expect(html).toMatch(/^<!doctype html>/)
    expect(html).toContain("<title>Case Test &amp; case: report</title>")
    expect(html).toContain("UFO@home 9.9.9")
    // The sky of the witness, said and read, and nothing fetched from anywhere.
    expect(html).toContain('<svg xmlns="http://www.w3.org/2000/svg"')
    expect(html).not.toMatch(/<(script|link|img)\b[^>]*\b(src|href)="(?!data:)/)
    expect(html).toContain("a party balloon, &lt;its&gt; height guessed")
    expect(html).toContain("sufficient margin")
    expect(html).toContain("@media print")
    // The case seen from above, and the witness's moments in time.
    expect(html).toContain('class="plan"')
    expect(html).toContain('class="timeline"')
  })

  it("tells the witness's account, where it can be read, and puts witnesses and readings on one map", () => {
    const json = account() as unknown as Record<string, unknown>
    json.description = { en: "A light, due north.", fr: "Une lumière, plein nord." }
    json.sources = [{ title: "A report", authors: ["A. Author"], url: "https://example.org/r.pdf", publication: { publisher: "COBEPS", time: "2016" } }]
    json.milestones = [{ t: 500, label: "A", note: { en: "It stops" } }]
    const data = CaseReport.of(caseJson, `${base}case.json`, new Map([[`${base}q.json`, json as unknown as SightingRecordingJson], [`${base}balloon.json`, reading()]]),
      new SaidTexts(["fr"]))
    const [witness] = data.witnesses
    expect(witness.description).toBe("Une lumière, plein nord.")
    expect(witness.sources).toEqual([{ title: "A report", authors: ["A. Author"], publisher: "COBEPS", time: "2016", url: "https://example.org/r.pdf" }])
    expect(witness.moments).toEqual([{ t: 500, label: "A", note: "It stops" }])
    // The first witness is the map's origin; the balloon is 100 m north of them, seen 10° up.
    expect(witness.at).toEqual({ eastM: 0, northM: 0 })
    const [first] = data.readings[0].paths[0].points
    expect(first.eastM).toBeCloseTo(0, 3)
    expect(first.northM).toBeCloseTo(100 * Math.cos(10 * DEG), 0)
  })

  it("sets the views of the scene, when there are some, beside what judges them", () => {
    const data = report()
    data.witnesses[0].pictures = [{ t: 0, views: [{ label: "Account", image: "data:image/jpeg;base64,AAAA" }, { label: "A balloon" }] }]
    const html = CaseReportHtml.of(data, caseReportTexts_en, "en", "9.9.9")
    expect(html).toContain('<img src="data:image/jpeg;base64,AAAA" alt="Account, 0 s">')
    expect(html).toContain("no view drawn")
    expect(html).toContain("An illustration, not evidence")
  })

  it("writes its data as JSON that says what it is, and its tables as CSV a spreadsheet reads", () => {
    const data = report()
    const json = JSON.parse(CaseReportDataFiles.json(data, "9.9.9"))
    expect(json).toMatchObject({ format: "ufoathome-case-report", version: 1, generator: "UFO@home 9.9.9", case: { id: "Test1950" } })
    const csv = CaseReportDataFiles.csv(data, caseReportTexts_en, "en")
    expect(Object.keys(csv).sort()).toEqual(["comparisons.csv", "findings.csv", "indications.csv", "margins.csv", "readings.csv", "values.csv"])
    const [head, row] = csv["readings.csv"].split("\r\n")
    expect(head).toBe("Reading,Reads,By,Date,Reproduced,Indications said,Median gap (°),Robustness,Supposed values")
    // Two numbers, not "2 / 2", which a spreadsheet would take for a date.
    expect(row).toBe("A balloon,Q. B.,Antoine Cousyn,2026-11,2,2,0,sufficient margin,1")
    // A cell with a comma is quoted.
    expect(CaseReportDataFiles.table(["a"], [["x, y"]])).toBe('a\r\n"x, y"\r\n')
  })
})
