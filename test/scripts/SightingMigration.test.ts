import { describe, expect, it } from "vitest"
import { SightingMigration } from "../../scripts/migration/SightingMigration.js"
import type { SightingRecordingJsonV1, SightingRecordingJsonV2 } from "../../scripts/migration/SightingMigration.js"
import { fromSightingJson } from "../../src/engine/persistence/sightingJson.js"
import { RecordingActors } from "../../src/engine/events/RecordingActors.js"
import { FormatVersionError } from "../../src/engine/persistence/FormatVersion.js"

/**
 * The conversions from the versions the format had before the current one. They are no longer part of what is shipped: the engine reads
 * one version and refuses any other (see FormatVersion), and this brings a file found in an older one forward, outside the player.
 */
describe("SightingMigration", () => {

  it("leaves a recording of the current version as it is, the same object", () => {
    const current = { version: 4 as const, time: "1964-04-24T17:50", timeline: { keyframes: [] } }
    expect(SightingMigration.toCurrent(current)).toBe(current)
  })

  it("writes a time of version 1 as EDTF, its qualifiers kept, and a file with no version as version 1", () => {
    const migrated = SightingMigration.toCurrent({
      time: { year: 1967, month: 8, day: 29, hour: 10, minute: 30, raw: "1967-08-29T10:30~" },
      endTime: { year: 1964, month: 4, day: 24, hour: 17, minute: 52 },
      timeline: { keyframes: [] }
    } as SightingRecordingJsonV1)
    expect(migrated).toMatchObject({ version: 4, time: "1967-08-29T10:30~", endTime: "1964-04-24T17:52" })
  })

  it("keeps what a time said of where it came from, its own or one of its fields'", () => {
    const migrated = SightingMigration.toCurrent({
      version: 1,
      time: { value: { year: 1950, month: 5, day: 11, hour: 19, minute: 45 }, basis: "derived", rationale: "Condon's case 46" },
      endTime: { year: 1974, month: 5, day: 20, hour: 19, minute: { value: 10, basis: "derived" } },
      timeline: { keyframes: [] }
    } as unknown as SightingRecordingJsonV1)
    expect(migrated.time).toEqual({ value: "1950-05-11T19:45", basis: "derived", rationale: "Condon's case 46" })
    expect(migrated.endTime).toEqual({ value: "1974-05-20T19:10", basis: "derived" })
  })

  it("makes one place of the locations, named as the first named one, with the provenance they had", () => {
    const migrated = SightingMigration.toCurrent({
      version: 1,
      place: [
        { value: { lat: 44.98, lng: 2.92, name: "Cussac, Cantal, France" }, basis: "derived", rationale: "the dossier's plan" },
        { lat: 44.99, lng: 2.93 }
      ],
      timeline: { keyframes: [] }
    } as unknown as SightingRecordingJsonV1)
    expect(migrated.place).toEqual({
      value: { name: "Cussac, Cantal, France", locations: [{ lat: 44.98, lng: 2.92 }, { lat: 44.99, lng: 2.93 }] },
      basis: "derived",
      rationale: "the dossier's plan"
    })
  })

  it("drops an empty list of locations rather than writing a place with none", () => {
    const migrated = SightingMigration.toCurrent({ version: 1, place: [], timeline: { keyframes: [] } } as SightingRecordingJsonV1)
    expect(migrated).not.toHaveProperty("place")
  })

  it("is what a file of version 1 must go through now: the engine itself refuses it", () => {
    const old = {
      version: 1,
      time: { year: 1948, month: 7, day: 24, hour: 2, minute: 45 },
      place: [{ lat: 32.3792, lng: -86.3077, name: "Montgomery, Alabama" }],
      timeline: { keyframes: [] }
    }
    expect(() => fromSightingJson(old as never)).toThrow(FormatVersionError)
    // Brought forward here, it reads as it always did.
    const sighting = fromSightingJson(SightingMigration.toCurrent(old as SightingRecordingJsonV1))
    expect(sighting.event.time).toMatchObject({ year: 1948, month: 7, day: 24, hour: 2, minute: 45 })
    expect(sighting.event.place).toEqual([{ lat: 32.3792, lng: -86.3077, name: "Montgomery, Alabama" }])
  })

  it("calls snapshots what version 3 called frozen, where it stood among the keys", () => {
    const frozen = { relief: { src: "a.relief.zip", takenOn: "2026-10-20" } }
    const migrated = SightingMigration.toCurrent({ version: 3, frozen, decor: [], timeline: { keyframes: [] } } as never) as unknown as Record<string, unknown>
    expect(migrated.version).toBe(4)
    expect(migrated.snapshots).toEqual(frozen)
    expect("frozen" in migrated).toBe(false)
    expect(Object.keys(migrated)).toEqual(["version", "snapshots", "decor", "timeline"])
  })
})

describe("SightingMigration to version 3", () => {
  it("makes the phenomenon of version 2 a group of its shapes, and the lights a blink listed a group of it", () => {
    const part = (sourceId: string) => ({ sourceId, kind: "oval", color: "#fff", widthShare: 0.1 })
    const sighting = fromSightingJson(SightingMigration.toCurrent({
      version: 2, observer: { id: "T1" }, place: { locations: [{ lat: 49, lng: 2.7 }] }, timeline: { keyframes: [], groups: [["x", "y"]] },
      events: [
        { eventType: "stand", who: "phenomenon", t: 0, until: 10000, params: { place: { lat: 49.01, lng: 2.7 }, metres: [{ t: 0, widthM: 30, heightM: 20 }] } },
        { eventType: "appearance", who: "phenomenon", t: 0, params: { parts: [part("bar"), part("left"), part("right"), part("red")] } },
        { eventType: "blink", who: "phenomenon", t: 0, params: { parts: ["red"], onS: 1, offS: 1, off: { transparency: 1 } } },
        { eventType: "blink", who: "phenomenon", t: 5000, params: { parts: ["left", "right"], onS: 2, offS: 2, off: { transparency: 1 } } }
      ]
    } as unknown as SightingRecordingJsonV2))
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
