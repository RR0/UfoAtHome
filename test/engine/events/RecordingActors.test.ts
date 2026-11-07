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

  it("reads an event of version 2 that says nobody as the observer's, and writes it with their id", () => {
    const sighting = fromSightingJson({
      version: 2, observer: { id: "DoeJane" }, timeline: { keyframes: [] },
      events: [{ eventType: "look", t: 0, params: { headingDeg: 10, pitchDeg: 0 } }]
    } as unknown as SightingRecordingJson)
    expect(sighting.events![0].who).toBe("DoeJane")
    expect(toSightingJson(sighting).events![0].who).toBe("DoeJane")
  })

  it("says an event about nothing, and two things of one id", () => {
    const sighting = fromSightingJson({
      version: 3, observer: { id: "craft" }, timeline: { keyframes: [] }, interpretation: { bodies: [{ id: "craft", track: [] }] },
      events: [{ eventType: "vanish", who: "nobody", t: 0 }]
    } as unknown as SightingRecordingJson)
    expect(RecordingActors.issues(sighting)).toEqual([
      { kind: "duplicate-id", id: "craft", path: "observer, body" },
      { kind: "unknown-who", id: "nobody", path: "events.0.who" }
    ])
  })
})

describe("SightingMigration to version 3", () => {
  it("makes the phenomenon of version 2 a group of its shapes, and the lights a blink listed a group of it", () => {
    const part = (sourceId: string) => ({ sourceId, kind: "oval", color: "#fff", widthShare: 0.1 })
    const sighting = fromSightingJson({
      version: 2, observer: { id: "T1" }, place: { locations: [{ lat: 49, lng: 2.7 }] }, timeline: { keyframes: [], groups: [["x", "y"]] },
      events: [
        { eventType: "stand", who: "phenomenon", t: 0, until: 10000, params: { place: { lat: 49.01, lng: 2.7 }, metres: [{ t: 0, widthM: 30, heightM: 20 }] } },
        { eventType: "appearance", who: "phenomenon", t: 0, params: { parts: [part("bar"), part("left"), part("right"), part("red")] } },
        { eventType: "blink", who: "phenomenon", t: 0, params: { parts: ["red"], onS: 1, offS: 1, off: { transparency: 1 } } },
        { eventType: "blink", who: "phenomenon", t: 5000, params: { parts: ["left", "right"], onS: 2, offS: 2, off: { transparency: 1 } } }
      ]
    } as unknown as SightingRecordingJson)
    const [stand, , red, pair] = sighting.events!
    expect(sighting.timeline.groupOf(stand.who!)!.members).toEqual(["bar", "group-3", "red"])
    expect(red.who).toBe("red")
    expect(sighting.timeline.leavesOf(pair.who!)).toEqual(["left", "right"])
    expect(pair.params).not.toHaveProperty("parts")
    // A group of shapes nothing draws goes.
    expect(sighting.timeline.groupOf("group-1")).toBeUndefined()
    expect(RecordingActors.issues(sighting)).toEqual([])
    // And the lights still blink: the red one is off in its second second.
    const at = (t: number, id: string) => sighting.timeline.getInterpolatedShapeAt(t, id)?.transparency
    expect([at(500, "red"), at(1500, "red"), at(1500, "left")]).toEqual([0, 1, 0])
  })
})
