import { describe, expect, it } from "vitest"
import { CaseFile } from "../../../src/engine/persistence/caseJson.js"
import type { CaseJson } from "../../../src/engine/persistence/caseJson.js"
import { fromSightingJson, toSightingJson } from "../../../src/engine/persistence/sightingJson.js"
import type { BodyJson } from "../../../src/engine/interpretation/Interpretation.js"

const body: BodyJson = { id: "craft", explains: ["ufo"], model: { id: "ellipsoid" }, track: [{ t: 0, eastM: 1, northM: 2, onGround: true }] }

const caseJson: CaseJson = {
  id: "Socorro",
  events: [
    { type: "event", eventType: "sighting", url: "witness.json" },
    { type: "event", eventType: "interpretation", sighting: "1964-04-24-ZamoraLonnie", title: "Inline", bodies: [body] } as never,
    { type: "event", eventType: "interpretation", sighting: "1964-04-24-ZamoraLonnie", url: "hypothesis.json" },
    { type: "event", eventType: "interpretation", sighting: "some-other-recording", url: "other.json" }
  ]
}

describe("A case's interpretations", () => {
  it("are its interpretation events naming the recording by its id, and only those", () => {
    expect(CaseFile.interpretationEvents(caseJson, "1964-04-24-ZamoraLonnie")).toHaveLength(2)
    // A recording nobody has given an id cannot be named by any.
    expect(CaseFile.interpretationEvents(caseJson, undefined)).toEqual([])
  })

  it("state their bodies inline, or in a file read relative to the case", async () => {
    const [inline, filed] = CaseFile.interpretationEvents(caseJson, "1964-04-24-ZamoraLonnie")
    const asked: string[] = []
    const fetchJson = async (url: string) => {
      asked.push(url)
      return { title: "From the file", bodies: [body] }
    }
    expect(await CaseFile.interpretationOf(inline, "https://rr0.org/dossier/Socorro/case.json", fetchJson)).toEqual({ title: "Inline", bodies: [body] })
    expect(await CaseFile.interpretationOf(filed, "https://rr0.org/dossier/Socorro/case.json", fetchJson)).toEqual({ title: "From the file", bodies: [body] })
    expect(asked).toEqual(["https://rr0.org/dossier/Socorro/hypothesis.json"])
  })
})

describe("The witness's own interpretation", () => {
  it("travels with the recording, unchanged", () => {
    const interpretation = { title: "On its legs", bodies: [body] }
    const json = { version: 1 as const, id: "x", timeline: { keyframes: [] }, interpretation }
    expect(toSightingJson(fromSightingJson(json)).interpretation).toEqual(interpretation)
  })
})
