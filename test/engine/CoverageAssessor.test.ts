import { describe, expect, it } from "vitest"
import { ASSESSMENT_SOURCES } from "../../src/engine/assessment/assessmentSources.js"
import type { AssessmentCriterion } from "../../src/engine/assessment/Assessor.js"
import { fromSightingJson } from "../../src/engine/persistence/sightingJson.js"
import type { SightingRecordingJson } from "../../src/engine/persistence/sightingJson.js"

const assess = (json: unknown): Promise<AssessmentCriterion[]> =>
  ASSESSMENT_SOURCES[0].create()
    .assess(fromSightingJson(json as SightingRecordingJson))
    .then(assessment => assessment.criteria)

const of = (criteria: AssessmentCriterion[], id: string): AssessmentCriterion =>
  criteria.find(criterion => criterion.id === id)!

/** Landévennec as the first real draft wrote it: a moment the witness gave, a place worked out, an
 * altitude nobody could know. */
const landevennec = {
  version: 1,
  time: { year: 1974, month: 5, day: 20, hour: 19, raw: "1974-05-20T19:00" },
  endTime: { year: 1974, month: 5, day: 20, hour: 19, minute: 10, raw: "1974-05-20T19:10~" },
  place: [{ lat: { value: 48.288, basis: "derived" }, lng: { value: -4.29, basis: "derived" } }],
  timeline: {
    keyframes: [{
      t: 0,
      shapes: [{
        sourceId: "ufo-1",
        shape: {
          kind: "oval", bounds: { x: 0, y: 0, width: 1, height: 1 }, color: "#e8e6df",
          angle: 0, transparency: 0, haloScale: 0, selected: false,
          title: "Le chapelet",
          angular: { widthDeg: { value: 8, basis: "derived" }, heightDeg: { value: 1.1, basis: "derived" } },
          aim: { azimuthDeg: { value: 73, basis: "derived" }, altitudeDeg: { value: 3, basis: "assumed" } }
        }
      }]
    }]
  },
  witnessTrack: { keyframes: [{ t: 0, pose: { lat: 48.288, lng: -4.29, elevationM: { value: 40, basis: "assumed" }, headingDeg: { value: 73, basis: "derived" }, pitchDeg: 3, fovDeg: 60 } }] },
  soundTrack: { keyframes: [{ t: 0, sound: { kind: "none", volume: 0 } }] }
}

describe("CoverageAssessor", () => {
  it("asks the same ten questions of every recording", async () => {
    // A fixed list is the whole point: counting a recording's own fields measures how finely they
    // happen to be cut, and moves when nothing about the sighting has.
    const bare = await assess({ version: 1, timeline: { keyframes: [] } })
    const full = await assess(landevennec)

    expect(bare.map(criterion => criterion.id)).toEqual(full.map(criterion => criterion.id))
    expect(bare).toHaveLength(10)
  })

  it("says nothing is answered in an empty recording, rather than answering zero", async () => {
    const criteria = await assess({ version: 1, timeline: { keyframes: [] } })

    expect(criteria.every(criterion => criterion.basis === undefined)).toBe(true)
    expect(criteria.every(criterion => criterion.paths.length === 0)).toBe(true)
  })

  it("reads a moment the witness gave as stated", async () => {
    const criteria = await assess(landevennec)

    expect(of(criteria, "when").basis).toBe("stated")
    expect(of(criteria, "when").paths).toContain("time.year")
  })

  it("takes the weakest basis holding an answer up, never the best", async () => {
    // A shape's direction here is a derived azimuth and an assumed altitude. The answer is worth no
    // more than the least of what holds it up.
    const criteria = await assess(landevennec)

    expect(of(criteria, "sky-position").basis).toBe("assumed")
    expect(of(criteria, "apparent-size").basis).toBe("derived")
    expect(of(criteria, "where").basis).toBe("derived")
  })

  it("points at where each answer was found, so nobody has to take its word", async () => {
    const criteria = await assess(landevennec)

    expect(of(criteria, "sky-position").paths).toEqual([
      "timeline.keyframes.0.shapes.0.shape.aim.azimuthDeg",
      "timeline.keyframes.0.shapes.0.shape.aim.altitudeDeg"
    ])
  })

  it("distinguishes a phenomenon that never moved from one nobody tracked", async () => {
    // One keyframe is an account saying it stayed put; it is not an account of a movement.
    const still = await assess(landevennec)
    expect(of(still, "movement").basis).toBeUndefined()

    const moving = await assess({
      ...landevennec,
      timeline: { keyframes: [...landevennec.timeline.keyframes, { t: 5000, shapes: [] }] }
    })
    expect(of(moving, "movement").basis).toBe("stated")
  })

  it("counts silence as an answer about sound", async () => {
    // A witness who says it was silent has said something; one who never mentions sound has not.
    const said = await assess(landevennec)
    expect(of(said, "sound").basis).toBe("stated")

    const { soundTrack, ...silent } = landevennec
    void soundTrack
    expect(of(await assess(silent), "sound").basis).toBeUndefined()
  })

  it("leaves conditions unanswered when no record was ever looked up", async () => {
    expect(of(await assess(landevennec), "conditions").basis).toBeUndefined()
  })

  it("reaches conditions once a weather record is there", async () => {
    const criteria = await assess({
      ...landevennec,
      weatherTrack: { keyframes: [{ t: 0, weather: { cloudCover: 0.2, precipitationType: "none", precipitationIntensity: 0 } }] }
    })

    expect(of(criteria, "conditions").basis).toBe("stated")
  })

  it("does not count an empty array as an answer", async () => {
    const criteria = await assess({ version: 1, place: [], timeline: { keyframes: [] } })

    expect(of(criteria, "where").basis).toBeUndefined()
  })

  it("gives no single figure, because ten answers of different kinds do not add up", async () => {
    const assessment = await ASSESSMENT_SOURCES[0].create()
      .assess(fromSightingJson(landevennec as unknown as SightingRecordingJson))

    expect(assessment.verdict).toBeUndefined()
  })
})
