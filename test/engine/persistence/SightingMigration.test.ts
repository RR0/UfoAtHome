import { describe, expect, it } from "vitest"
import { SightingMigration } from "../../../src/engine/persistence/SightingMigration.js"
import { fromSightingJson, type SightingRecordingJsonV1 } from "../../../src/engine/persistence/sightingJson.js"

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

  it("is what every reader goes through: a file of version 1 reads as it did", () => {
    const sighting = fromSightingJson({
      version: 1,
      time: { year: 1948, month: 7, day: 24, hour: 2, minute: 45 },
      place: [{ lat: 32.3792, lng: -86.3077, name: "Montgomery, Alabama" }],
      timeline: { keyframes: [] }
    })
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
