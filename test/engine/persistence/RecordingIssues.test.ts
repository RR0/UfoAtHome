import { describe, expect, it } from "vitest"
import format from "../../../src/generated/sightingSchema.json"
import { RecordingCheck } from "../../../src/engine/persistence/RecordingCheck.js"
import type { FormatField } from "../../../src/engine/persistence/RecordingCheck.js"
import { RecordingIssues } from "../../../src/engine/persistence/RecordingIssue.js"
import { fromSightingJson } from "../../../src/engine/persistence/sightingJson.js"
import type { SightingRecordingJson } from "../../../src/engine/persistence/sightingJson.js"

const check = new RecordingCheck(format as unknown as Record<string, FormatField>)
const files = (import.meta as unknown as { glob: (pattern: string, options: object) => Record<string, Record<string, unknown>> })
  .glob("../../../public/demo-data/*.json", { eager: true, import: "default" })
const recordings = Object.entries(files)
  .map(([path, json]) => ({ file: path.split("/").pop() ?? path, json }))
  .filter(({ json }) => "timeline" in json)

/** A recording that only states what a hand-written file would, with `extra` merged in. */
function recording(extra: Record<string, unknown> = {}): SightingRecordingJson {
  return {
    version: 1,
    time: { year: 2012, month: 6, day: 29 },
    place: [{ lat: 49.08, lng: 2.33 }],
    observerTrack: { keyframes: [{ t: 0, pose: { lat: 49.08, lng: 2.33, elevationM: 0, headingDeg: 350, pitchDeg: 0, fovDeg: 40 } }] },
    timeline: {
      keyframes: [{
        t: 0,
        shapes: [{ sourceId: "a", shape: { kind: "oval", color: "#fff", angular: { widthDeg: 1, heightDeg: 1 }, aim: { azimuthDeg: 350, altitudeDeg: 2 } } }]
      }]
    },
    ...extra
  } as unknown as SightingRecordingJson
}

describe("recording issues", () => {
  it.each(recordings)("finds nothing to say about $file", ({ json }) => {
    expect(check.issues(json).map(issue => RecordingIssues.text(issue))).toEqual([])
    expect(fromSightingJson(json as unknown as SightingRecordingJson).loadIssues.map(issue => RecordingIssues.text(issue))).toEqual([])
  })

  it("finds nothing to say about a complete hand-written file", () => {
    expect(check.issues(recording())).toEqual([])
    expect(fromSightingJson(recording()).loadIssues).toEqual([])
  })

  it("reports a misspelt key, a wrong type and a word out of its list", () => {
    const issues = check.issues(recording({ utcOffsetHour: 2, durationSeconds: "15", account: { source: "rumour" } }))
    expect(issues).toEqual([
      { kind: "unknown-key", path: "utcOffsetHour" },
      { kind: "wrong-type", path: "durationSeconds", expected: "number", found: "string" },
      expect.objectContaining({ kind: "not-in-list", path: "account.source", found: "\"rumour\"" })
    ])
  })

  it("checks the value inside a provenance wrapper", () => {
    expect(check.issues(recording({ durationSeconds: { value: 15, basis: "derived" } }))).toEqual([])
    expect(check.issues(recording({ durationSeconds: { value: "15", basis: "derived" } }))[0].kind).toBe("wrong-type")
  })

  it("reports keys inside a list's elements", () => {
    expect(check.issues(recording({ milestones: [{ t: 0, lable: "A" }] }))).toEqual([{ kind: "unknown-key", path: "milestones.0.lable" }])
  })

  it("reports what a first appearance left out, and a polygon with no outline", () => {
    const sighting = fromSightingJson(recording({
      timeline: { keyframes: [{ t: 0, shapes: [{ sourceId: "a", shape: { kind: "polygon" } }] }] }
    }))
    expect(sighting.loadIssues.map(issue => `${issue.kind} ${issue.path}`)).toEqual([
      "defaulted timeline.keyframes.0.shapes.0.shape.color",
      "unplaced timeline.keyframes.0.shapes.0.shape",
      "unsized timeline.keyframes.0.shapes.0.shape",
      "defaulted timeline.keyframes.0.shapes.0.shape.points"
    ])
  })

  it("does not report a field held from the keyframe before, which is the format's rule", () => {
    const base = recording()
    const keyframes = [...base.timeline.keyframes, { t: 1000, shapes: [{ sourceId: "a", shape: { aim: { azimuthDeg: 351, altitudeDeg: 3 } } }] }]
    expect(fromSightingJson({ ...base, timeline: { keyframes } } as unknown as SightingRecordingJson).loadIssues).toEqual([])
  })

  it("reports angles set aside by a box restated in pixels", () => {
    const base = recording()
    const keyframes = [...base.timeline.keyframes, { t: 1000, shapes: [{ sourceId: "a", shape: { bounds: { x: 10, y: 10, width: 5, height: 5 } } }] }]
    expect(fromSightingJson({ ...base, timeline: { keyframes } } as unknown as SightingRecordingJson).loadIssues)
      .toEqual([{ kind: "pixels-over-angles", path: "timeline.keyframes.1.shapes.0.shape" }])
  })
})
