import { describe, expect, it } from "vitest"
import { FormatVersion, FormatVersionError } from "../../../src/engine/persistence/FormatVersion.js"
import { fromSightingJson, type SightingRecordingJson } from "../../../src/engine/persistence/sightingJson.js"
import { CaseFile } from "../../../src/engine/persistence/caseJson.js"
import { InterviewFile } from "../../../src/engine/persistence/interviewJson.js"

describe("FormatVersion", () => {
  it("names each schema under its version", () => {
    expect(FormatVersion.schemaUrl("sighting")).toBe("https://ufoathome.org/schema/1/sighting.schema.json")
    expect(FormatVersion.schemaUrl("case", 2)).toBe("https://ufoathome.org/schema/2/case.schema.json")
  })

  it("reads a file that states no version as version 1", () => {
    expect(() => CaseFile.check({ events: [] })).not.toThrow()
  })

  it("reads a version stated with its provenance", () => {
    expect(FormatVersion.of({ version: { value: 1, basis: "stated" } })).toBe(1)
  })

  it("refuses a newer version, saying which", () => {
    const error = (() => {
      try {
        FormatVersion.check({ version: 2 }, "sighting")
      } catch (thrown) {
        return thrown
      }
    })()
    expect(error).toBeInstanceOf(FormatVersionError)
    expect((error as FormatVersionError).found).toBe(2)
    expect((error as FormatVersionError).said("{found} > {supported}")).toBe("2 > 1")
  })

  it("refuses what is not a version", () => {
    for (const version of [0, 1.5, "1", null]) {
      expect(() => FormatVersion.check({ version }, "sighting")).toThrow(FormatVersionError)
    }
  })

  it("is checked by every reader", () => {
    const recording = { version: 2, timeline: { keyframes: [] } } as unknown as SightingRecordingJson
    expect(() => fromSightingJson(recording)).toThrow(FormatVersionError)
    expect(() => CaseFile.check({ version: 2 } as never)).toThrow(FormatVersionError)
    expect(() => InterviewFile.read({ version: 2, speakers: {} })).toThrow(FormatVersionError)
    expect(InterviewFile.read({ version: 1, speakers: {} }).speakers).toEqual({})
  })
})
