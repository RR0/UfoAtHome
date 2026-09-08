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

  it("puts a radar-visual above the distant classes", async () => {
    expect(await classify({ ...evening, tags: ["radar"] })).toBe("rv")
  })

  it("ranks the close encounters above everything, and above each other", async () => {
    // A thing seen at fifty metres is not filed by whether it was daylight.
    expect(await classify({ ...evening, tags: ["close encounter"] })).toBe("ce1")
    expect(await classify({ ...evening, tags: ["trace"] })).toBe("ce2")
    expect(await classify({ ...evening, tags: ["occupants"] })).toBe("ce3")
    expect(await classify({ ...evening, tags: ["radar", "trace", "occupants"] })).toBe("ce3")
    expect(await classify({ ...evening, tags: ["radar", "trace"] })).toBe("ce2")
  })

  it("reads the French classification codes a recording may carry instead", async () => {
    // "RR3" and the rest are passed through untranslated by design (see TagNames), so the assessor
    // has to know them as well as the English words.
    expect(await classify({ ...evening, tags: ["RR3"] })).toBe("ce3")
    expect(await classify({ ...evening, tags: ["RR2"] })).toBe("ce2")
  })

  it("says which of its grounds was the author's word and which it worked out", async () => {
    // A classification that hides its grounds is worse than none: proximity comes from a tag, an
    // author's judgment, while daylight is computed from the moment and the place.
    const assessment = await hynek.create()
      .assess(fromSightingJson({ version: 1, timeline: { keyframes: [] }, ...evening, tags: ["trace"] } as SightingRecordingJson))
    const of = (id: string) => assessment.criteria.find(criterion => criterion.id === id)!

    expect(of("traces").basis).toBe("stated")
    expect(of("traces").paths).toEqual(["tags.0"])
    expect(of("daylight").basis).toBe("derived")
    expect(of("entities").basis).toBeUndefined()
  })

  it("reaches no score, because it classifies rather than measures", async () => {
    const assessment = await hynek.create()
      .assess(fromSightingJson({ version: 1, timeline: { keyframes: [] }, ...evening } as SightingRecordingJson))

    expect(assessment.score).toBeUndefined()
    expect(assessment.verdict).toBe("dd")
  })
})
