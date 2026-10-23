import { describe, expect, it } from "vitest"
import { RecordingText } from "../../src/engine/persistence/RecordingText.js"
import type { SightingRecordingJson } from "../../src/engine/persistence/sightingJson.js"
import { fromSightingJson, toSightingJson } from "../../src/engine/persistence/sightingJson.js"

const oval = (x: number) => ({ kind: "oval", bounds: { x, y: 10, width: 10, height: 10 }, color: "#ffffff", angle: 0, transparency: 0, haloScale: 1.5, selected: false })
const recording = (keyframes: unknown[]): SightingRecordingJson => ({
  version: 1, id: "test", place: [{ lat: 48, lng: -1 }], time: { year: 2026, month: 8, day: 11, hour: 2, minute: 30 },
  observerTrack: { keyframes: [{ t: 0, pose: { lat: 48, lng: -1, elevationM: 0, headingDeg: 110, pitchDeg: 10, fovDeg: 60 } }] },
  timeline: { keyframes, order: ["ufo-1"], groups: [] }, decor: [{ id: "a", kind: "building" }]
} as unknown as SightingRecordingJson)

/** Freezes all of it, so that anything written in place throws rather than leaving a text that says what is no longer so. */
const deepFreeze = <T>(value: T): T => {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const held of Object.values(value)) deepFreeze(held)
  }
  return value
}

describe("RecordingText", () => {
  it("writes the very text JSON.stringify writes, whatever the timeline holds", () => {
    const writer = new RecordingText()
    for (const keyframes of [[], [{ t: 0, shapes: [] }], [0, 100, 200].map(t => ({ t, shapes: [{ sourceId: "ufo-1", shape: oval(t) }] }))]) {
      const json = recording(keyframes)
      expect(writer.of(json)).toBe(JSON.stringify(json, null, 2))
    }
    const bare = { version: 1 } as SightingRecordingJson
    expect(writer.of(bare)).toBe(JSON.stringify(bare, null, 2))
  })

  it("writes again only the keyframes that are other objects", () => {
    const writer = new RecordingText()
    const kept = { t: 0, shapes: [{ sourceId: "ufo-1", shape: oval(0) }] }
    const first = recording([kept, { t: 100, shapes: [{ sourceId: "ufo-1", shape: oval(1) }] }])
    writer.of(first)
    let written = 0
    const stringify = JSON.stringify
    JSON.stringify = ((...args: Parameters<typeof JSON.stringify>) => {
      if (args[0] === kept) written++
      return stringify(...args)
    }) as typeof JSON.stringify
    try {
      const second = recording([kept, { t: 100, shapes: [{ sourceId: "ufo-1", shape: oval(2) }] }])
      expect(writer.of(second)).toBe(stringify(second, null, 2))
    } finally {
      JSON.stringify = stringify
    }
    expect(written).toBe(0)
  })

  it("stays the text of the recording through saves and edits of a timeline whose keyframes are frozen", () => {
    const sighting = fromSightingJson(recording([0, 1000, 2000].map(t => ({ t, shapes: [{ sourceId: "ufo-1", shape: oval(t / 10) }] }))))
    const writer = new RecordingText()
    // Each keyframe, not the list the timeline keeps them in: that one is the timeline's to splice.
    const freezeKeyframes = () => sighting.timeline.allKeyframes.forEach(deepFreeze)
    const check = () => {
      const json = toSightingJson(sighting)
      expect(writer.of(json)).toBe(JSON.stringify(json, null, 2))
    }
    // The first save states each shape's angle and direction: new keyframes, which are then frozen as the editor leaves them.
    check()
    freezeKeyframes()
    check()
    const timeline = sighting.timeline
    timeline.addKeyframe(1000, [{ sourceId: "ufo-1", shape: oval(500) } as never])
    check()
    freezeKeyframes()
    timeline.addKeyframe(1500, [{ sourceId: "ufo-1", shape: oval(250) } as never])
    check()
    freezeKeyframes()
    check()
  })
})
