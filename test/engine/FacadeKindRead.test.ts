import { describe, expect, it } from "vitest"
import { fromSightingJson, type SightingRecordingJson } from "../../src/engine/persistence/sightingJson.js"

describe("a facade's kind, read from a recording", () => {
  it("reads the bare-wall flag of older files as the kind it now is", () => {
    const sighting = fromSightingJson({
      version: 4, timeline: { keyframes: [] },
      decor: [{ id: "shed", kind: "building", eastM: 0, northM: 0, facade: { color: "#aabbcc", plain: true } }]
    } as unknown as SightingRecordingJson)
    expect(sighting.decor[0].facade).toEqual({ color: "#aabbcc", openings: "plain" })
  })
})
