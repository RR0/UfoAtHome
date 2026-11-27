import { describe, expect, it } from "vitest"
import format from "../../../src/generated/sightingSchema.json"
import recording from "../../../docs/hvs/fictif-2026-001.json"
import { RecordingCheck } from "../../../src/engine/persistence/RecordingCheck.js"
import type { FormatField } from "../../../src/engine/persistence/RecordingCheck.js"
import { fromSightingJson } from "../../../src/engine/persistence/sightingJson.js"
import { Provenance } from "../../../src/engine/persistence/Provenance.js"

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
})
