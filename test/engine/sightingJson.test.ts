import { describe, expect, it } from "vitest"
import { Sighting } from "../../src/engine/model/Sighting.js"
import { fromSightingJson, toSightingJson } from "../../src/engine/persistence/sightingJson.js"
import { createOval } from "../../src/engine/shape/Shape.js"

describe("sightingJson", () => {
  it("round-trips time, place, witness and timeline through JSON", () => {
    const sighting = Sighting.create(
      { year: 1987, month: 6, day: 12 },
      [{ lat: 45.188529, lng: 5.724524 }],
      { id: "witness-1" }
    )
    sighting.timeline.addKeyframe(0, [
      { sourceId: "ufo-1", shape: createOval({ x: 10, y: 20, width: 40, height: 24 }) }
    ])

    const restored = fromSightingJson(toSightingJson(sighting))

    expect(restored.event.time).toEqual({ year: 1987, month: 6, day: 12 })
    expect(restored.event.place).toEqual([{ lat: 45.188529, lng: 5.724524 }])
    expect(restored.witness).toEqual({ id: "witness-1" })
    expect(restored.timeline.getShapeAt(0, "ufo-1")?.bounds).toEqual({ x: 10, y: 20, width: 40, height: 24 })
  })

  it("tolerates a sighting with no time/place", () => {
    const restored = fromSightingJson(toSightingJson(Sighting.create()))
    expect(restored.event.time).toBeUndefined()
    expect(restored.event.place).toBeUndefined()
  })

  it("round-trips witness (id+title) and caseId", () => {
    const json = {
      version: 1 as const,
      witness: { id: "chiles", title: "Clarence Chiles" },
      caseId: "chiles-whitted",
      timeline: { keyframes: [] },
      witnessTrack: { keyframes: [] }
    }

    const restored = fromSightingJson(json)

    expect(restored.witness).toEqual({ id: "chiles", title: "Clarence Chiles" })
    expect(restored.caseId).toBe("chiles-whitted")
    // timeline.order/groups are new (z-order support, multi-select grouping) — empty here since
    // there are no shapes/sources at all, but always present now, unlike the hand-written input above.
    expect(toSightingJson(restored)).toEqual({ ...json, timeline: { ...json.timeline, order: [], groups: [] } })
  })

  it("round-trips witness (lastName+firstNames)", () => {
    const json = {
      version: 1 as const,
      witness: { lastName: "Chiles", firstNames: ["Clarence"] },
      timeline: { keyframes: [] }
    }

    const restored = fromSightingJson(json)

    expect(restored.witness).toEqual({ lastName: "Chiles", firstNames: ["Clarence"] })
  })

  it("round-trips an witnessTrack", () => {
    const sighting = Sighting.create({ year: 1948, month: 7, day: 24 }, [{ lat: 35.0, lng: -90.0 }])
    sighting.witnessTrack.addKeyframe(0, {
      lat: 35.0,
      lng: -90.0,
      elevationM: 1500,
      headingDeg: 270,
      pitchDeg: 5,
      fovDeg: 50
    })

    const restored = fromSightingJson(toSightingJson(sighting))

    expect(restored.witnessTrack.getLatestPoseAt(0)).toEqual({
      lat: 35.0,
      lng: -90.0,
      elevationM: 1500,
      headingDeg: 270,
      pitchDeg: 5,
      fovDeg: 50
    })
  })

  it("defaults to an empty witnessTrack when absent from JSON", () => {
    const restored = fromSightingJson({ version: 1, timeline: { keyframes: [] } })
    expect(restored.witnessTrack.allKeyframes).toEqual([])
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

  it("round-trips weather", () => {
    const json = {
      version: 1 as const,
      timeline: { keyframes: [] },
      weather: {
        cloudCover: 0.8,
        cloudDarkness: 0.9,
        precipitationType: "rain" as const,
        precipitationIntensity: 0.6,
        windDirectionDeg: 270,
        windSpeed: 12,
        storm: true
      }
    }

    const restored = fromSightingJson(json)

    expect(restored.weather).toEqual(json.weather)
    expect(toSightingJson(restored).weather).toEqual(json.weather)
  })

  it("leaves weather undefined when absent from JSON", () => {
    const restored = fromSightingJson({ version: 1, timeline: { keyframes: [] } })
    expect(restored.weather).toBeUndefined()
  })

  it("round-trips description and tags", () => {
    const json = {
      version: 1 as const,
      description: "Bright light hovering over the field for several minutes.",
      tags: ["hovering", "night"],
      timeline: { keyframes: [] }
    }

    const restored = fromSightingJson(json)

    expect(restored.event.description).toBe(json.description)
    expect(restored.event.tags).toEqual(json.tags)
    expect(toSightingJson(restored).description).toBe(json.description)
    expect(toSightingJson(restored).tags).toEqual(json.tags)
  })

  it("leaves description and tags undefined when absent from JSON", () => {
    const restored = fromSightingJson({ version: 1, timeline: { keyframes: [] } })
    expect(restored.event.description).toBeUndefined()
    expect(restored.event.tags).toBeUndefined()
  })
})
