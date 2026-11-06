import { describe, expect, it } from "vitest"
import { ASSESSMENT_SOURCES } from "../../src/engine/assessment/assessmentSources.js"
import type { Assessment } from "../../src/engine/assessment/Assessor.js"
import { fromSightingJson } from "../../src/engine/persistence/sightingJson.js"
import type { SightingRecordingJsonV1 } from "../../src/engine/persistence/sightingJson.js"

const poher = ASSESSMENT_SOURCES.find(source => source.id === "poher")!

const assess = (json: Partial<SightingRecordingJsonV1>): Promise<Assessment> =>
  poher.create().assess(fromSightingJson({ version: 1, timeline: { keyframes: [] }, ...json } as SightingRecordingJsonV1))

const of = (assessment: Assessment, id: string) => assessment.criteria.find(criterion => criterion.id === id)!

/** A light seen at these directions, one a second. */
const light = (...aims: [number, number][]) => ({
  timeline: {
    keyframes: aims.map(([azimuthDeg, altitudeDeg], index) => ({
      t: index * 1000,
      shapes: [{
        sourceId: "light",
        shape: { kind: "oval", bounds: { x: 0, y: 0, width: 4, height: 4 }, color: "#ffffff", angle: 0, transparency: 0, haloScale: 0, selected: false,
          angular: { widthDeg: 0.2, heightDeg: 0.2 }, aim: { azimuthDeg, altitudeDeg } }
      }]
    }))
  }
}) as Partial<SightingRecordingJsonV1>

/** A craft of the interpretation, on the ground then 10 m up. */
const landed = { interpretation: { bodies: [{ id: "craft", model: { id: "sphere" }, track: [{ t: 0, eastM: 50, northM: 0, onGround: true }, { t: 5000, eastM: 50, northM: 0, altitudeAboveGroundM: 10 }] }] } } as Partial<SightingRecordingJsonV1>

describe("PoherAssessor", () => {
  it("rates nothing known as 0, and a light that stays where it is too", async () => {
    expect((await assess({})).verdict).toBe("0")
    expect((await assess(light([90, 20], [90, 20], [90, 20.5]))).verdict).toBe("0")
  })

  it("rates a light going in a straight line 1, one that turns 2, one going every which way 3", async () => {
    expect((await assess(light([90, 20], [95, 20], [100, 20], [105, 20]))).verdict).toBe("1")
    expect((await assess(light([90, 20], [95, 20], [100, 20], [100, 25], [100, 30]))).verdict).toBe("2")
    const zigzag = await assess(light([90, 20], [95, 20], [95, 25], [100, 25], [100, 30], [105, 30]))
    expect(zigzag.verdict).toBe("3")
    expect(of(zigzag, "poher-trajectory")).toMatchObject({ basis: "derived", paths: ["timeline"] })
  })

  it("does not turn a light that goes straight over the zenith", async () => {
    expect((await assess(light([0, 80], [0, 85], [0, 89], [180, 87], [180, 82], [180, 77]))).verdict).toBe("1")
  })

  it("reads a landing off the interpretation, as an assumption, and not a body that never leaves the ground", async () => {
    const assessment = await assess(landed)
    expect(assessment.verdict).toBe("3")
    expect(of(assessment, "poher-landing")).toMatchObject({ value: 1, basis: "assumed", paths: ["interpretation.bodies.0"] })
    const car = await assess({ interpretation: { bodies: [{ id: "car", model: { id: "box" }, track: [{ t: 0, eastM: 50, northM: 0, onGround: true }, { t: 5000, eastM: 80, northM: 0, onGround: true }] }] } } as Partial<SightingRecordingJsonV1>)
    expect(car.verdict).toBe("0")
  })

  it("rates a landing with traces 4, with occupants 5, as the investigators judged or the scene places them", async () => {
    expect((await assess({ ...landed, account: { strangeness: { traces: true } } })).verdict).toBe("4")
    expect((await assess({ ...landed, account: { strangeness: { traces: true, beings: true } } })).verdict).toBe("5")
    const placed = await assess({ ...landed, decor: [{ id: "etre", kind: "entity" as const, eastM: 45, northM: 2, sizeM: { heightM: 1 } }] })
    expect(placed.verdict).toBe("5")
    expect(of(placed, "poher-occupants")).toMatchObject({ basis: "stated", paths: ["decor.0"] })
  })

  it("reads a sudden disappearance and oscillations off the phenomenon's events", async () => {
    const base = light([90, 20], [95, 20], [100, 20])
    expect((await assess({ ...base, events: [{ eventType: "vanish", who: "light", t: 2000 }] } as Partial<SightingRecordingJsonV1>)).verdict).toBe("3")
    expect((await assess({ ...base, events: [{ eventType: "vibrate", who: "light", t: 0, until: 2000 }] } as Partial<SightingRecordingJsonV1>)).verdict).toBe("3")
  })
})
