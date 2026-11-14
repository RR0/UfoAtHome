import { describe, expect, it } from "vitest"
import { RecordingActors } from "../../../src/engine/events/RecordingActors.js"
import { fromSightingJson, toSightingJson, type SightingRecordingJson } from "../../../src/engine/persistence/sightingJson.js"

/** The demo recordings (not the cases, nor the files beside a recording), by name. */
const demos = Object.entries(import.meta.glob("../../../public/demo-data/observer-*.json", { eager: true, import: "default" }) as Record<string, unknown>)
  .filter(([path]) => /\/observer-[^./]*\.json$/.test(path))

describe("RecordingActors", () => {
  it("finds every demo saying whom each of its events is about, by an id that says one thing", () => {
    expect(demos.length).toBeGreaterThan(20)
    const found = demos.flatMap(([name, json]) => {
      const sighting = fromSightingJson(structuredClone(json) as SightingRecordingJson)
      return RecordingActors.issues(sighting).map(issue => `${name}: ${issue.kind} ${issue.id} (${issue.path})`)
    })
    expect(found).toEqual([])
  })

  it("reads an event that says nobody as the witness's, and writes it with their id", () => {
    const sighting = fromSightingJson({
      version: 4, observer: { id: "DoeJane" }, timeline: { keyframes: [] },
      events: [{ eventType: "look", t: 0, params: { headingDeg: 10, pitchDeg: 0 } }]
    } as unknown as SightingRecordingJson)
    expect(sighting.events![0].who).toBe("DoeJane")
    expect(toSightingJson(sighting).events![0].who).toBe("DoeJane")
  })

  it("says an event about nothing, and two things of one id", () => {
    const sighting = fromSightingJson({
      version: 4, observer: { id: "craft" }, timeline: { keyframes: [] }, interpretation: { bodies: [{ id: "craft", track: [] }] },
      events: [{ eventType: "vanish", who: "nobody", t: 0 }]
    } as unknown as SightingRecordingJson)
    expect(RecordingActors.issues(sighting)).toEqual([
      { kind: "duplicate-id", id: "craft", path: "observer, body" },
      { kind: "unknown-who", id: "nobody", path: "events.0.who" }
    ])
  })
})
