import { describe, expect, it } from "vitest"
import { RecordingDigest } from "../../src/engine/narrative/RecordingDigest.js"
import { DraftRecording } from "../../src/engine/narrative/DraftRecording.js"
import { fromSightingJson, toSightingJson } from "../../src/engine/persistence/sightingJson.js"
import type { SightingRecordingJson } from "../../src/engine/persistence/sightingJson.js"

const recording = (): SightingRecordingJson => ({
  version: 1,
  time: { year: 1964, month: 4, day: 24, hour: 17, minute: 45 },
  caseId: "socorro",
  witness: { id: "zamora", title: "Lonnie Zamora" },
  timeline: {
    keyframes: [
      {
        t: 0,
        shapes: [
          {
            sourceId: "ufo-1",
            shape: {
              kind: "oval",
              bounds: { x: 319.5, y: 179.8, width: 1, height: 0.5 },
              color: "#e8e6df",
              angle: 0,
              transparency: 1,
              haloScale: 0,
              selected: false,
              title: "Objet",
              angular: { widthDeg: 0.1603, heightDeg: 0.0827 },
              aim: { azimuthDeg: 200, altitudeDeg: -5.0083 }
            }
          }
        ]
      }
    ]
  }
})

describe("RecordingDigest", () => {
  it("keeps the account whole", () => {
    const digest = RecordingDigest.of(recording())

    expect(digest?.time).toEqual({ year: 1964, month: 4, day: 24, hour: 17, minute: 45 })
    expect(digest?.caseId).toBe("socorro")
    expect(digest?.witness).toEqual({ id: "zamora", title: "Lonnie Zamora" })
  })

  it("reduces a shape to what was perceived, dropping how it is painted", () => {
    const shape = RecordingDigest.of(recording())?.timeline?.keyframes[0].shapes[0]

    expect(shape).toEqual({
      sourceId: "ufo-1",
      kind: "oval",
      title: "Objet",
      angular: { widthDeg: 0.1603, heightDeg: 0.0827 },
      aim: { azimuthDeg: 200, altitudeDeg: -5.0083 }
    })
    // The pixels, the colour, the transparency and the halo are not testimony: they are derived on
    // load from the two fields above (see SightingShapes), and sending them every round would pay
    // for the timeline again on every correction.
    expect(shape).not.toHaveProperty("bounds")
    expect(shape).not.toHaveProperty("color")
    expect(shape).not.toHaveProperty("transparency")
  })

  it("says nothing about an empty editor", () => {
    // An empty recording is not a statement, and offering its emptiness would invite it to be read
    // as one.
    expect(RecordingDigest.of({ version: 1, timeline: { keyframes: [] } })).toBeUndefined()
  })

  it("omits an angle or a direction a shape never stated", () => {
    const bare: SightingRecordingJson = {
      version: 1,
      timeline: {
        keyframes: [{
          t: 0,
          shapes: [{
            sourceId: "ufo-1",
            shape: {
              kind: "oval",
              bounds: { x: 0, y: 0, width: 10, height: 10 },
              color: "#fff",
              angle: 0,
              transparency: 0,
              haloScale: 0,
              selected: false
            }
          }]
        }]
      }
    }

    expect(RecordingDigest.of(bare)?.timeline?.keyframes[0].shapes[0]).toEqual({ sourceId: "ufo-1", kind: "oval" })
  })

  it("stays a fraction of the recording it describes", () => {
    const full = JSON.stringify(recording()).length
    const digest = JSON.stringify(RecordingDigest.of(recording())).length

    expect(digest).toBeLessThan(full)
  })
})

describe("DraftRecording", () => {
  it("makes a draft that states only an angle and a direction loadable", () => {
    // A draft is asked for the perception and nothing else, but the steps that turn a perception
    // into a drawing (SightingShapes.toBounds/toPosition) read a box before replacing it — so one
    // that asserts nothing has to be there for them to read.
    const draft = {
      version: 1 as const,
      time: { year: 1964 },
      timeline: {
        keyframes: [{
          t: 0,
          shapes: [{
            sourceId: "ufo-1",
            shape: { kind: "oval", title: "Un ovale blanc", angular: { widthDeg: 2, heightDeg: 1 } }
          }]
        }]
      }
    } as unknown as Partial<SightingRecordingJson>

    const loadable = DraftRecording.loadable(draft) as SightingRecordingJson
    const restored = fromSightingJson(loadable)
    const shape = restored.timeline.getShapeAt(0, "ufo-1")

    expect(shape?.title).toBe("Un ovale blanc")
    // The stated angle survives the round trip, and the neutral box it was given did not.
    expect(toSightingJson(restored).timeline.keyframes[0].shapes[0].shape.angular?.widthDeg).toBeCloseTo(2, 3)
    expect(shape?.bounds.width).toBeGreaterThan(1)
  })

  it("gives a polygon an outline when the draft named the kind without one", () => {
    const loadable = DraftRecording.loadable({
      timeline: {
        keyframes: [{
          t: 0,
          shapes: [{ sourceId: "ufo-1", shape: { kind: "polygon", angular: { widthDeg: 1, heightDeg: 1 } } }]
        }]
      }
    } as unknown as Partial<SightingRecordingJson>) as SightingRecordingJson
    const shape = loadable.timeline.keyframes[0].shapes[0].shape

    expect(shape.kind).toBe("polygon")
    expect(shape.kind === "polygon" && shape.points).toHaveLength(4)
  })

  it("leaves a draft with no timeline exactly as it is", () => {
    const draft = { caseId: "valensole" }

    expect(DraftRecording.loadable(draft)).toBe(draft)
  })
})
