import { describe, expect, it } from "vitest"
import { fromSightingJson, toSightingJson } from "../../../src/engine/persistence/sightingJson.js"

describe("a sky entered by hand", () => {
  it("is written as it was read, and a sky from the sources, the default, is not written", () => {
    const byHand = fromSightingJson({ version: 4, timeline: { keyframes: [] }, skySources: false })
    expect(byHand.skySources).toBe(false)
    expect(JSON.parse(JSON.stringify(toSightingJson(byHand))).skySources).toBe(false)

    const sourced = fromSightingJson({ version: 4, timeline: { keyframes: [] }, skySources: true })
    expect("skySources" in JSON.parse(JSON.stringify(toSightingJson(sourced)))).toBe(false)
  })
})
