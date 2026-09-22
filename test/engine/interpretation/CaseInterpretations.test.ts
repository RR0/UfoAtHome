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

  it("read a model's url relative to the file that states it, not to the page", async () => {
    const credit = { title: "Craft", license: "CC0 1.0" }
    const withModel = (url: string): BodyJson => ({ ...body, model: { url, credit } })
    const inline = { type: "event", eventType: "interpretation", title: "Inline", bodies: [withModel("craft.gltf")] } as never
    const filed = { type: "event", eventType: "interpretation", url: "hypotheses/landing.json" } as never
    const fetchJson = async () => ({ title: "From the file", bodies: [withModel("../models/craft.gltf"), withModel("https://example.org/a.glb")] })
    const caseUrl = "https://example.org/dossier/Socorro/case.json"
    expect((await CaseFile.interpretationOf(inline, caseUrl, fetchJson)).bodies[0].model.url)
      .toBe("https://example.org/dossier/Socorro/craft.gltf")
    const fromFile = await CaseFile.interpretationOf(filed, caseUrl, fetchJson)
    expect(fromFile.bodies.map(b => b.model.url)).toEqual(["https://example.org/dossier/Socorro/models/craft.gltf", "https://example.org/a.glb"])
    // A catalogue model has no address to resolve.
    expect((await CaseFile.interpretationOf({ type: "event", eventType: "interpretation", bodies: [body] } as never, caseUrl, fetchJson)).bodies[0].model)
      .toEqual({ id: "ellipsoid" })
  })
})

describe("The witness's own interpretation", () => {
  it("travels with the recording, unchanged", () => {
    const interpretation = { title: "On its legs", bodies: [body] }
    const json = { version: 1 as const, id: "x", timeline: { keyframes: [] }, interpretation }
    expect(toSightingJson(fromSightingJson(json)).interpretation).toEqual(interpretation)
  })
})
