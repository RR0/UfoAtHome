import { describe, expect, it } from "vitest"
import { RecordingText } from "../../src/engine/persistence/RecordingText.js"
import type { SightingRecordingJson } from "../../src/engine/persistence/sightingJson.js"

const outline = Array.from({ length: 50 }, (_, i) => ({ x: i, y: i % 3 }))
const recording = {
  version: 1,
  timeline: {
    keyframes: [0, 100, 200].map(t => ({ t, shapes: [{ sourceId: "p", shape: { kind: "polygon", bounds: { x: 0, y: 0, width: 50, height: 3 }, points: outline, aim: { azimuthDeg: t / 10, altitudeDeg: 5 } } }] })),
    order: ["p"], groups: []
  }
} as unknown as SightingRecordingJson

describe("RecordingText", () => {
  it("writes the keyframes whole as JSON.stringify does", () => {
    expect(RecordingText.of(recording, "whole")).toBe(JSON.stringify(recording, null, 2))
  })

  it("writes them thin: a shape whole where it first appears, then only what changed", () => {
    const keyframes = (JSON.parse(RecordingText.of(recording, "thin")) as { timeline: { keyframes: Array<{ shapes: Array<{ shape: object }> }> } }).timeline.keyframes
    expect(keyframes[0].shapes[0].shape).toHaveProperty("points")
    expect(keyframes[1].shapes[0].shape).toEqual({ aim: { azimuthDeg: 10, altitudeDeg: 5 } })
  })

  it("writes a recording without keyframes the same either way", () => {
    const bare = { version: 1 } as SightingRecordingJson
    expect(RecordingText.of(bare, "thin")).toBe(JSON.stringify(bare, null, 2))
  })
})
