import { describe, expect, it } from "vitest"
import { ASSESSMENT_SOURCES } from "../../src/engine/assessment/assessmentSources.js"
import { fromSightingJson } from "../../src/engine/persistence/sightingJson.js"
import type { SightingRecordingJson } from "../../src/engine/persistence/sightingJson.js"

const hynek = ASSESSMENT_SOURCES.find(source => source.id === "hynek")!

const classify = (json: Partial<SightingRecordingJson>): Promise<string | undefined> =>
  hynek.create()
    .assess(fromSightingJson({ version: 1, timeline: { keyframes: [] }, ...json } as SightingRecordingJson))
    .then(assessment => assessment.verdict)

/** Landévennec: 20 May 1974, 19:00 legal time in Brittany, which is UTC+1 that year. The Sun is
 * still well up — it sets there around 21:40 local in late May. */
const evening = {
  time: { year: 1974, month: 5, day: 20, hour: 19, minute: 0 },
  utcOffsetHours: 1,
  place: [{ lat: 48.288, lng: -4.29 }]
}

/** Socorro: 24 April 1964, 17:45 in New Mexico, on UTC-7 two days before that year's switch. */
const afternoon = {
  time: { year: 1964, month: 4, day: 24, hour: 17, minute: 45 },
  utcOffsetHours: -7,
  place: [{ lat: 34.06, lng: -106.9 }]
}

const night = { ...evening, time: { ...evening.time, hour: 1 } }

describe("HynekAssessor", () => {
  it("works out daylight from the real Sun, not from the hour on the clock", async () => {
    // The same astronomy the sky is drawn from, so the class agrees with the render — and it is
    // right about a 19:00 that is broad daylight in May and pitch dark in December.
    expect(await classify(evening)).toBe("dd")
    expect(await classify(afternoon)).toBe("dd")
    expect(await classify(night)).toBe("nl")
    expect(await classify({ ...evening, time: { ...evening.time, month: 12 } })).toBe("nl")
  })

  it("declines to choose when the recording says neither when nor where", async () => {
    // Its last two classes differ by daylight alone, so with nothing to work that out from there is
    // nothing to choose between, and saying so is the answer.
    expect(await classify({})).toBeUndefined()
    expect(await classify({ time: evening.time })).toBeUndefined()
    expect(await classify({ place: evening.place })).toBeUndefined()
  })

  it("reports as unsupported what no recording could say, not as merely unanswered", async () => {
    // Not a shortcoming of the assessor: nothing in the model records a physical trace, no distance
    // is stored, and no instrument in the registry is a radar. An author cannot fill those in, so
    // saying "unanswered" would send them to do the impossible.
    const assessment = await hynek.create()
      .assess(fromSightingJson({ version: 1, timeline: { keyframes: [] }, ...evening } as SightingRecordingJson))
    const of = (id: string) => assessment.criteria.find(criterion => criterion.id === id)!

    for (const id of ["traces", "proximity", "radar"]) {
      expect(of(id).unsupported).toBe(true)
      expect(of(id).basis).toBeUndefined()
    }
    // Answerable now, and unanswered here: this recording places no being.
    expect(of("entities").unsupported).toBeUndefined()
    expect(of("entities").basis).toBeUndefined()
    expect(of("daylight").unsupported).toBeUndefined()
  })

  it("reaches CE3 from beings placed in the scene, over anything the daylight says", async () => {
    // Valensole's two figures beside the craft. The account's own statement that there were any is
    // exactly what this tier turns on, and it outranks the distant classes.
    const withBeings = {
      ...evening,
      decor: [
        { id: "etre-1", kind: "entity" as const, eastM: 5, northM: 12, sizeM: { heightM: 1 } },
        { id: "etre-2", kind: "entity" as const, eastM: 7, northM: 12, sizeM: { heightM: 1 } }
      ]
    }

    expect(await classify(withBeings)).toBe("ce3")

    const assessment = await hynek.create()
      .assess(fromSightingJson({ version: 1, timeline: { keyframes: [] }, ...withBeings } as SightingRecordingJson))
    expect(assessment.criteria.find(criterion => criterion.id === "entities")!.paths)
      .toEqual(["decor.0", "decor.1"])
  })

  it("does not take a companion for a being: same silhouette, opposite claim", async () => {
    const withCompanion = {
      ...evening,
      decor: [{ id: "epouse", kind: "witness" as const, eastM: 1, northM: 0 }]
    }

    expect(await classify(withCompanion)).toBe("dd")
  })

  it("never concludes from a tag, however plainly the tag says it", async () => {
    // A tag is a non-authoritative note that helps somebody search, never an assertion the file
    // makes. Valensole carries "RR3", "trace" and "paralysis" and still classifies by its data
    // alone — which for now means by daylight.
    expect(await classify({ ...evening, tags: ["RR3", "trace", "paralysis", "radar"] })).toBe("dd")
    expect(await classify({ ...night, tags: ["occupants", "close encounter"] })).toBe("nl")
  })

  it("says which of its grounds it worked out", async () => {
    const assessment = await hynek.create()
      .assess(fromSightingJson({ version: 1, timeline: { keyframes: [] }, ...evening } as SightingRecordingJson))
    const daylight = assessment.criteria.find(criterion => criterion.id === "daylight")!

    expect(daylight.basis).toBe("derived")
    expect(daylight.paths).toEqual(["time", "place"])
  })

  it("reaches no score, because it classifies rather than measures", async () => {
    const assessment = await hynek.create()
      .assess(fromSightingJson({ version: 1, timeline: { keyframes: [] }, ...evening } as SightingRecordingJson))

    expect(assessment.score).toBeUndefined()
    expect(assessment.verdict).toBe("dd")
  })
})
