import { describe, expect, it } from "vitest"
import format from "../../../src/generated/sightingSchema.json"
import recording from "../../../docs/hvs/fictif-2026-001.json"
import { RecordingCheck } from "../../../src/engine/persistence/RecordingCheck.js"
import type { FormatField } from "../../../src/engine/persistence/RecordingCheck.js"
import { fromSightingJson } from "../../../src/engine/persistence/sightingJson.js"
import { Provenance } from "../../../src/engine/persistence/Provenance.js"
import caseJson from "../../../docs/hvs/case.json"
import { Hvs } from "../../../src/engine/assessment/hvs/Hvs.js"
import type { CaseJson } from "../../../src/engine/persistence/caseJson.js"

/** Stéphane Baron's fictitious HVS case (November 2026) written in the format by hand: what of it passes as it is (see docs/hvs). */
describe("The fictitious HVS case in the format", () => {
  it("is a file the format takes whole, and loads with nothing made up", () => {
    expect(new RecordingCheck(format as unknown as Record<string, FormatField>).issues(recording)).toEqual([])
    expect(fromSightingJson(recording as never).loadIssues).toEqual([])
  })

  it("keeps the provenance and the range of each value it states", () => {
    const known = Provenance.strip(recording).provenance
    expect(known.at("timeline.keyframes.0.shapes.0.shape.aim.azimuthDeg")).toMatchObject({ basis: "derived", range: [242, 248] })
    expect(known.at("timeline.keyframes.0.shapes.0.shape.aim.altitudeDeg")).toMatchObject({ basis: "stated", range: [12, 18] })
  })

  it("weighs its hypotheses from the case's elements: the lantern dominates on the sudden going out, the one element that tells them apart", () => {
    const json = caseJson as unknown as CaseJson
    const result = Hvs.of(json.elements!, json.hvs, () => undefined, () => undefined, "temoin")
    expect(result.discriminating).toEqual(["E5"])
    const [lantern, aircraft] = result.hypotheses
    expect(lantern).toMatchObject({ admissible: true, dominant: true, csRaw: { preferred: 1, envelope: [0.8, 1] } })
    expect(lantern.hvs!.preferred).toBeCloseTo(0.7)
    expect(lantern.hvs!.envelope).toEqual([0.6, 0.8].map(value => expect.closeTo(value)) as never)
    expect(aircraft).toMatchObject({ admissible: true, dominant: false, csDiscriminating: { preferred: 0 } })
    // Plausible, and explaining nothing that tells them apart: its product says so.
    expect(aircraft.ps!.preferred).toBeCloseTo(2.6 / 3)
    expect(aircraft.hvs!.preferred).toBe(0)
  })
})
