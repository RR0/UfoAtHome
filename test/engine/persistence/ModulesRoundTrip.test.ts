import { describe, expect, it } from "vitest"
import { fromSightingJson, toSightingJson } from "../../../src/engine/persistence/sightingJson.js"
import type { SightingRecordingJson } from "../../../src/engine/persistence/sightingJson.js"

describe("the modules a recording names", () => {
  it("are written as they were read, and not written when there are none", () => {
    const recording: SightingRecordingJson = { version: 3, timeline: { keyframes: [] }, modules: ["acme/ufoathome-module.json", "https://x.example/m.json"] }
    expect(JSON.parse(JSON.stringify(toSightingJson(fromSightingJson(recording)))).modules).toEqual(recording.modules)

    const none = fromSightingJson({ version: 3, timeline: { keyframes: [] } })
    expect("modules" in JSON.parse(JSON.stringify(toSightingJson(none)))).toBe(false)
  })
})
