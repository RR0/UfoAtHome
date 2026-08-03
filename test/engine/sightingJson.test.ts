import { describe, expect, it } from "vitest"
import { Sighting } from "../../src/engine/model/Sighting.js"
import { fromSightingJson, toSightingJson } from "../../src/engine/persistence/sightingJson.js"
import { createOval } from "../../src/engine/shape/Shape.js"

describe("sightingJson", () => {
  it("round-trips time, place, witnessId and timeline through JSON", () => {
    const sighting = Sighting.create(
      { year: 1987, month: 6, day: 12 },
      [{ lat: 45.188529, lng: 5.724524 }],
      "witness-1"
    )
    sighting.timeline.addKeyframe(0, [
      { sourceId: "ufo-1", shape: createOval({ x: 10, y: 20, width: 40, height: 24 }) }
    ])

    const restored = fromSightingJson(toSightingJson(sighting))

    expect(restored.event.time).toEqual({ year: 1987, month: 6, day: 12 })
    expect(restored.event.place).toEqual([{ lat: 45.188529, lng: 5.724524 }])
    expect(restored.witnessId).toBe("witness-1")
    expect(restored.timeline.getShapeAt(0, "ufo-1")?.bounds).toEqual({ x: 10, y: 20, width: 40, height: 24 })
  })

  it("tolerates a sighting with no time/place", () => {
    const restored = fromSightingJson(toSightingJson(Sighting.create()))
    expect(restored.event.time).toBeUndefined()
    expect(restored.event.place).toBeUndefined()
  })

  it("round-trips witnessName and caseId", () => {
    const json = {
      version: 1 as const,
      witnessId: "chiles",
      witnessName: "Clarence Chiles",
      caseId: "chiles-whitted",
      timeline: { keyframes: [] },
      observerTrack: { keyframes: [] }
    }

    const restored = fromSightingJson(json)

    expect(restored.witnessId).toBe("chiles")
    expect(restored.witnessName).toBe("Clarence Chiles")
    expect(restored.caseId).toBe("chiles-whitted")
    expect(toSightingJson(restored)).toEqual(json)
  })

  it("round-trips an observerTrack", () => {
    const sighting = Sighting.create({ year: 1948, month: 7, day: 24 }, [{ lat: 35.0, lng: -90.0 }])
    sighting.observerTrack.addKeyframe(0, {
      lat: 35.0,
      lng: -90.0,
      elevationM: 1500,
      headingDeg: 270,
      pitchDeg: 5,
      fovDeg: 50
    })

    const restored = fromSightingJson(toSightingJson(sighting))

    expect(restored.observerTrack.getLatestPoseAt(0)).toEqual({
      lat: 35.0,
      lng: -90.0,
      elevationM: 1500,
      headingDeg: 270,
      pitchDeg: 5,
      fovDeg: 50
    })
  })

  it("defaults to an empty observerTrack when absent from JSON", () => {
    const restored = fromSightingJson({ version: 1, timeline: { keyframes: [] } })
    expect(restored.observerTrack.allKeyframes).toEqual([])
  })

  it("round-trips endTime and durationSeconds", () => {
    const restored = fromSightingJson({
      version: 1,
      time: { year: 1948, month: 7, day: 24, hour: 2, minute: 45 },
      endTime: { year: 1948, month: 7, day: 24, hour: 2, minute: 50 },
      durationSeconds: 300,
      timeline: { keyframes: [] }
    })
    expect(restored.event.endTime).toEqual({ year: 1948, month: 7, day: 24, hour: 2, minute: 50 })
    expect(restored.event.durationSeconds).toBe(300)
  })
})
