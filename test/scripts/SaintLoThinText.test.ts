import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { RecordingText } from "../../src/engine/persistence/RecordingText.js"
import { SightingShapes } from "../../src/engine/persistence/SightingShapes.js"
import { fromSightingJson, toSightingJson } from "../../src/engine/persistence/sightingJson.js"
describe("RecordingText thin, on a recording of outlines over many keyframes", () => {
  it("writes Saint-Lô about as small as its file, and reads back the boxes and outlines it held", () => {
    const file = readFileSync("public/demo-data/observer-saint-lo.json", "utf8")
    const sighting = fromSightingJson(JSON.parse(file))
    const json = toSightingJson(sighting)
    const whole = RecordingText.of(json, "whole")
    const thin = RecordingText.of(json, "thin", SightingShapes.derivable(sighting))
    // Half a million lines whole; thin, about what the file itself is.
    expect(thin.split("\n").length).toBeLessThan(file.split("\n").length * 1.5)
    expect(whole.length).toBeGreaterThan(thin.length * 10)
    const again = fromSightingJson(JSON.parse(thin))
    const close = (a: number, b: number) => Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(b))
    sighting.timeline.allKeyframes.forEach((keyframe, i) => {
      const read = again.timeline.allKeyframes[i]
      expect(read.t).toBe(keyframe.t)
      keyframe.shapes.forEach((state, j) => {
        const shape = state.shape
        const back = read.shapes[j].shape
        expect(read.shapes[j].sourceId).toBe(state.sourceId)
        for (const key of ["x", "y", "width", "height"] as const) expect(close(back.bounds[key], shape.bounds[key]), `${i} ${state.sourceId} ${key}`).toBe(true)
        if (shape.kind === "polygon" && back.kind === "polygon") {
          expect(back.points.length).toBe(shape.points.length)
          back.points.forEach((point, k) => expect(close(point.x, shape.points[k].x) && close(point.y, shape.points[k].y), `${i} ${state.sourceId} point ${k}`).toBe(true))
        }
        expect(JSON.stringify({ ...back, bounds: undefined, points: undefined })).toBe(JSON.stringify({ ...shape, bounds: undefined, points: undefined }))
      })
    })
  })
})
