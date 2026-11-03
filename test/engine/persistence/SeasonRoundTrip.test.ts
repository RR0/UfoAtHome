import { describe, expect, it } from "vitest"
import { fromSightingJson, toSightingJson } from "../../../src/engine/persistence/sightingJson.js"
import type { SightingRecordingJson } from "../../../src/engine/persistence/sightingJson.js"

describe("a date known to be in a season", () => {
  it("is written to a recording and read back as such", () => {
    const recording: SightingRecordingJson = { version: 2, timeline: { keyframes: [] }, time: "2022-21" }
    const sighting = fromSightingJson(recording)
    expect(sighting.event.time).toMatchObject({ year: 2022, season: "spring", raw: "2022-21" })
    const written = JSON.parse(JSON.stringify(toSightingJson(sighting)))
    expect(written.time).toBe("2022-21")
  })
})
