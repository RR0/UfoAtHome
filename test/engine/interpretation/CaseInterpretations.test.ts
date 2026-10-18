import { describe, expect, it } from "vitest"
import { CaseFile } from "../../../src/engine/persistence/caseJson.js"
import { InterviewFile } from "../../../src/engine/persistence/interviewJson.js"
import type { InterviewJson } from "../../../src/engine/persistence/interviewJson.js"
import type { CaseJson } from "../../../src/engine/persistence/caseJson.js"
import { fromSightingJson, toSightingJson } from "../../../src/engine/persistence/sightingJson.js"
import type { BodyJson } from "../../../src/engine/interpretation/Interpretation.js"

const body: BodyJson = { id: "craft", explains: ["ufo"], model: { id: "ellipsoid" }, track: [{ t: 0, eastM: 1, northM: 2, onGround: true }] }

const caseJson: CaseJson = {
  id: "Socorro",
  events: [
    { type: "event", eventType: "sighting", url: "observer.json" },
    { type: "event", eventType: "interpretation", sighting: "1964-04-24-ZamoraLonnie", title: "Inline", bodies: [body] } as never,
    { type: "event", eventType: "interpretation", sighting: "1964-04-24-ZamoraLonnie", url: "hypothesis.json" },
    { type: "event", eventType: "interpretation", sighting: "some-other-recording", url: "other.json" }
  ]
}

describe("A case's interpretations", () => {
  it("are its interpretation events naming the recording by its id, and only those", () => {
    expect(CaseFile.interpretationEvents(caseJson, "1964-04-24-ZamoraLonnie")).toHaveLength(2)
    // A recording nobody has given an id cannot be named by any.
    expect(CaseFile.interpretationEvents(caseJson, undefined)).toEqual([])
  })

  it("state their bodies inline, or in a file read relative to the case", async () => {
    const [inline, filed] = CaseFile.interpretationEvents(caseJson, "1964-04-24-ZamoraLonnie")
    const asked: string[] = []
    const fetchJson = async (url: string) => {
      asked.push(url)
      return { title: "From the file", bodies: [body] }
    }
    expect(await CaseFile.interpretationOf(inline, "https://rr0.org/dossier/Socorro/case.json", fetchJson)).toEqual({ title: "Inline", bodies: [body] })
    expect(await CaseFile.interpretationOf(filed, "https://rr0.org/dossier/Socorro/case.json", fetchJson)).toEqual({ title: "From the file", bodies: [body] })
    expect(asked).toEqual(["https://rr0.org/dossier/Socorro/hypothesis.json"])
  })

  it("read a model's url relative to the file that states it, not to the page", async () => {
    const credit = { title: "Craft", license: "CC0 1.0" }
    const withModel = (url: string): BodyJson => ({ ...body, model: { url, credit } })
    const inline = { type: "event", eventType: "interpretation", title: "Inline", bodies: [withModel("craft.gltf")] } as never
    const filed = { type: "event", eventType: "interpretation", url: "hypotheses/landing.json" } as never
    const fetchJson = async () => ({ title: "From the file", bodies: [withModel("../models/craft.gltf"), withModel("https://example.org/a.glb")] })
    const caseUrl = "https://example.org/dossier/Socorro/case.json"
    expect((await CaseFile.interpretationOf(inline, caseUrl, fetchJson)).bodies[0].model.url)
      .toBe("https://example.org/dossier/Socorro/craft.gltf")
    const fromFile = await CaseFile.interpretationOf(filed, caseUrl, fetchJson)
    expect(fromFile.bodies.map(b => b.model.url)).toEqual(["https://example.org/dossier/Socorro/models/craft.gltf", "https://example.org/a.glb"])
    // A catalogue model has no address to resolve.
    expect((await CaseFile.interpretationOf({ type: "event", eventType: "interpretation", bodies: [body] } as never, caseUrl, fetchJson)).bodies[0].model)
      .toEqual({ id: "ellipsoid" })
  })
})

describe("An interpretation as another observation", () => {
  const reading = { type: "event", eventType: "sighting", interpretationOf: "x-1", time: "2013-04", by: [{ people: "CousynAntoine" }], title: "A model", url: "reading.json" }
  const shared = { type: "event", eventType: "sighting", interpretationOf: ["x-1", "x-2"], title: "Shared", url: "shared.json" }
  const together: CaseJson = {
    events: [
      { type: "event", eventType: "sighting", url: "one.json" },
      { type: "event", eventType: "sighting", url: "two.json" },
      reading as never,
      shared as never
    ]
  }

  it("is an event of type sighting marked interpretationOf, and is not offered as an observer", () => {
    expect(CaseFile.sightingUrls(together, "https://example.org/d/case.json")).toEqual(["https://example.org/d/one.json", "https://example.org/d/two.json"])
  })

  it("names the sightings it is a reading of, one or several", () => {
    expect(CaseFile.interpretationEvents(together, "x-1")).toHaveLength(2)
    expect(CaseFile.interpretationEvents(together, "x-2")).toHaveLength(1)
    expect(CaseFile.interpretationEvents(together, "x-3")).toEqual([])
  })

  it("reads its bodies from the interpretation of the recording at its url", async () => {
    const recording = { version: 1, id: "x-1-interpretation-1", timeline: { keyframes: [] }, interpretation: { title: "From the recording", bodies: [body] } }
    const events = CaseFile.interpretationEvents(together, "x-1")
    const asked: string[] = []
    const read = await CaseFile.interpretationOf(events[0], "https://example.org/d/case.json", async url => { asked.push(url); return recording })
    // The case calls it what its event does; the bodies are the recording's.
    expect(read).toEqual({ title: "A model", bodies: [body] })
    expect(asked).toEqual(["https://example.org/d/reading.json"])
  })
})

describe("The observer's own interpretation", () => {
  it("travels with the recording, unchanged", () => {
    const interpretation = { title: "On its legs", bodies: [body] }
    const json = { version: 1 as const, id: "x", timeline: { keyframes: [] }, interpretation }
    expect(toSightingJson(fromSightingJson(json)).interpretation).toEqual(interpretation)
  })
})

describe("A case's own ids", () => {
  const caseUrl = "https://example.org/d/case.json"
  const local = {
    events: [
      { eventType: "sighting", id: "trent", url: "one.json" },
      { eventType: "sighting", interpretationOf: "trent", title: "A model", url: "reading.json" },
      { eventType: "sighting", interpretationOf: ["x-1", "ghost"], title: "Another", url: "other.json" }
    ]
  }

  it("names a recording by its event's id and by its own", () => {
    expect(CaseFile.accountIds(local, caseUrl, "https://example.org/d/one.json", "x-1")).toEqual(["trent", "x-1"])
    expect(CaseFile.accountIds(local, caseUrl, "https://example.org/d/two.json", undefined)).toEqual([])
  })

  it("finds the readings of a recording through any of its ids", () => {
    const ids = CaseFile.accountIds(local, caseUrl, "https://example.org/d/one.json", "x-1")
    expect(CaseFile.interpretationEvents(local, ids).map(event => event.title)).toEqual(["A model", "Another"])
    expect(CaseFile.interpretationEvents(local, "trent")).toHaveLength(1)
  })

  it("says which references name nothing, and which ids are borne twice", () => {
    expect(CaseFile.problems(local, ["x-1"])).toEqual({ duplicateIds: [], unresolved: [{ reading: "other.json", reference: "ghost" }] })
    const twice = { events: [{ eventType: "sighting", id: "a", url: "a.json" }, { eventType: "sighting", id: "a", url: "b.json" }] }
    expect(CaseFile.problems(twice, []).duplicateIds).toEqual(["a"])
  })
})

describe("A case's interview", () => {
  const caseUrl = "https://example.org/d/case.json"
  const interviewed = {
    events: [
      { eventType: "sighting", id: "qb", url: "observer.json" },
      { eventType: "interview", id: "interview-qb-1", interviewOf: "qb", time: "2026-10-13 21:27", summary: { fr: "Précisions." } }
    ]
  }

  it("is an event of its own: nothing of it is replayed, and it is not offered as an observer", () => {
    expect(CaseFile.sightingUrls(interviewed, caseUrl)).toEqual(["https://example.org/d/observer.json"])
    expect(CaseFile.interpretationEvents(interviewed, "qb")).toEqual([])
  })

  it("names the sighting it was held about, as a reading does, and says so when that names nothing", () => {
    expect(CaseFile.problems(interviewed, [])).toEqual({ duplicateIds: [], unresolved: [] })
    const ghost = { events: [{ eventType: "interview", id: "i", interviewOf: ["qb", "ghost"] }, { eventType: "sighting", id: "qb", url: "observer.json" }] }
    expect(CaseFile.problems(ghost, [])).toEqual({ duplicateIds: [], unresolved: [{ reading: "i", reference: "ghost" }] })
  })
})

describe("An interview's transcript file", () => {
  const transcript: InterviewJson = {
    version: 1,
    speakers: { interviewer: { role: "interviewer", by: { people: "BeauJerome" } }, witness: { role: "witness", title: "Q. B.", of: "qb" } },
    segments: [
      { speaker: "interviewer", start: 0, end: 27.6, text: "Where do we start?" },
      { speaker: "witness", start: 25, end: 3725.25, text: "5 < 6 & more" }
    ]
  }

  it("names a speaker by the witness's title or the interviewer's agent", () => {
    expect(InterviewFile.speakerName(transcript, "witness")).toBe("Q. B.")
    expect(InterviewFile.speakerName(transcript, "interviewer")).toBe("BeauJerome")
  })

  it("becomes WebVTT with the speaker in a voice tag, no cue overlapping the next, the text escaped", () => {
    expect(InterviewFile.toVtt(transcript)).toBe(
      "WEBVTT\n\n00:00:00.000 --> 00:00:25.000\n<v BeauJerome>Where do we start?\n\n00:00:25.000 --> 01:02:05.250\n<v Q. B.>5 &lt; 6 &amp; more\n")
  })

  it("shows a redacted passage as a gap in the subtitles, whatever its reason", () => {
    const redacted: InterviewJson = {
      ...transcript,
      segments: [{ speaker: "witness", start: 1, end: 2, redacted: { reason: { en: "private life" } } }]
    }
    expect(InterviewFile.toVtt(redacted)).toBe("WEBVTT\n\n00:00:01.000 --> 00:00:02.000\n<v Q. B.>[…]\n")
  })

  it("is proofread only when every speaker approved it, directly or through a fuller version", () => {
    expect(InterviewFile.isProofread(transcript)).toBe(false)
    const speakers = Object.keys(transcript.speakers)
    const approved = (status: "approved" | "covered" | "pending") => Object.fromEntries(speakers.map(id => [id, { status }]))
    expect(InterviewFile.isProofread({ ...transcript, proofreading: approved("approved") })).toBe(true)
    expect(InterviewFile.isProofread({ ...transcript, proofreading: approved("covered") })).toBe(true)
    expect(InterviewFile.isProofread({ ...transcript, proofreading: { ...approved("approved"), [speakers[0]]: { status: "pending" } } })).toBe(false)
    expect(InterviewFile.isProofread({ ...transcript, proofreading: { [speakers[0]]: { status: "approved" } } })).toBe(false)
  })

  it("lists the passages that tell of an observation, in the order of the moments they are about", () => {
    const withRefs: InterviewJson = {
      ...transcript,
      interviewOf: ["qb", "friend"],
      segments: [
        { speaker: "witness", start: 1, end: 2, text: "Late.", refs: [{ at: 4 }] },
        { speaker: "witness", start: 3, end: 4, text: "Early.", refs: [{ at: 0.5, range: [0, 5] }, { sighting: "friend", at: 2 }] },
        { speaker: "witness", start: 5, end: 6, redacted: { reason: { en: "private" } }, refs: [{ sighting: "qb", at: 1 }] }
      ]
    }
    expect(InterviewFile.passagesAbout(withRefs, "qb").map(passage => [passage.index, passage.at])).toEqual([[1, 0.5], [2, 1], [0, 4]])
    expect(InterviewFile.passagesAbout(withRefs, "friend").map(passage => [passage.index, passage.at])).toEqual([[1, 0.5], [1, 2], [0, 4]])
    expect(InterviewFile.passagesAbout(withRefs, "other")).toEqual([])
    expect(InterviewFile.passagesAbout(withRefs, "qb")[0]).toMatchObject({ text: "Early.", range: [0, 5] })
    expect(InterviewFile.passagesAbout(withRefs, "qb")[1].text).toBeUndefined()
  })

  it("writes a time as on a clock", () => {
    expect(InterviewFile.clock(0)).toBe("0:00")
    expect(InterviewFile.clock(125)).toBe("2:05")
    expect(InterviewFile.clock(1.5)).toBe("0:01.5")
    expect(InterviewFile.clock(3725)).toBe("1:02:05")
  })

  it("says what a segment says as published: its text, its said parts around a gap, or nothing when taken out whole", () => {
    expect(InterviewFile.said({ speaker: "witness", start: 0, end: 1, text: "Hi" })).toBe("Hi")
    expect(InterviewFile.said({ speaker: "witness", start: 0, end: 1, parts: [{ text: "No lights." }, { redacted: { reason: { en: "place" } } }, { text: "That is all." }] }))
      .toBe("No lights. … That is all.")
    expect(InterviewFile.said({ speaker: "witness", start: 0, end: 1, redacted: { reason: { en: "private" } } })).toBeUndefined()
  })
})
