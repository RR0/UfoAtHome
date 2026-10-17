import { describe, expect, it } from "vitest"
import { CaseSession } from "../../src/component/CaseSession.js"
import type { CaseJson } from "../../src/engine/persistence/caseJson.js"
import type { SightingRecordingJson } from "../../src/engine/persistence/sightingJson.js"

const account = { version: 1, id: "1950-05-11-TrentPaul", time: { year: 1950 }, utcOffsetHours: -7, place: [{ value: { lat: 45, lng: -123 } }], observer: { id: "TrentPaul" }, description: "Account", decor: [{ id: "house", kind: "building", eastM: 1, northM: 2 }], weatherTrack: { keyframes: [] }, instrument: "roamer-1-120", observerTrack: { keyframes: [] }, timeline: { keyframes: [] }, interpretation: { bodies: [] } } as unknown as SightingRecordingJson
const caseJson = (): CaseJson => ({
  id: "McMinnville1950",
  events: [
    { type: "event", eventType: "sighting", title: "Paul Trent", url: "observer-mcminnville.json" },
    { type: "event", eventType: "sighting", interpretationOf: "1950-05-11-TrentPaul", time: "2013-04", title: "A model", url: "interpretation-mcminnville-1.json" }
  ]
})
const url = "https://example.org/dossier/McMinnville/case.json"

describe("A case being edited", () => {
  it("lists the accounts and the readings as tracks, both being recordings", () => {
    const session = new CaseSession(caseJson(), url)
    expect(session.tracks.map(track => [track.kind, track.url])).toEqual([
      ["observer", "https://example.org/dossier/McMinnville/observer-mcminnville.json"],
      ["reading", "https://example.org/dossier/McMinnville/interpretation-mcminnville-1.json"]
    ])
  })

  it("finds the account a reading reads", () => {
    const session = new CaseSession(caseJson(), url)
    session.keep(session.tracks[0], account, true)
    expect(session.accountOf(session.tracks[1])).toBe(session.tracks[0])
    expect(session.accountOf(session.tracks[0])).toBeUndefined()
  })

  it("adds a reading: an event marked interpretationOf and a recording of its own at the account's place", () => {
    const session = new CaseSession(caseJson(), url)
    session.keep(session.tracks[0], account, true)
    const added = session.addReading(session.tracks[0], "2026-10-04")
    expect(added.event).toMatchObject({ eventType: "sighting", interpretationOf: "trentpaul", time: "2026-10-04", url: "interpretation-mcminnville-2.json" })
    expect(session.json.events).toContain(added.event)
    expect(added.recording).toMatchObject({ id: "1950-05-11-TrentPaul-interpretation-2", utcOffsetHours: -7, tags: ["interpretation"], interpretation: { bodies: [] } })
    // The whole scene comes along, so that the reading is not bodies over bare ground; the account's own words and observer do not.
    expect(added.recording).toMatchObject({ decor: account.decor, instrument: "roamer-1-120", weatherTrack: { keyframes: [] } })
    expect(added.recording).not.toHaveProperty("observer")
    expect(added.recording).not.toHaveProperty("description")
    expect(added.recording!.timeline).toEqual({ keyframes: [], order: [], groups: [] })
    expect(session.changed(added)).toBe(true)
  })

  it("deletes a reading but never an account", () => {
    const session = new CaseSession(caseJson(), url)
    expect(session.deleteReading(session.tracks[0])).toBe(false)
    expect(session.deleteReading(session.tracks[1])).toBe(true)
    expect(session.tracks).toHaveLength(1)
    expect(session.json.events).toHaveLength(1)
  })

  it("names a reading as its own interpretation does", () => {
    const session = new CaseSession(caseJson(), url)
    const reading = { ...account, interpretation: { title: { en: "A hubcap" }, bodies: [] } } as SightingRecordingJson
    session.keep(session.tracks[1], reading)
    expect(session.tracks[1].event.title).toEqual({ en: "A hubcap" })
  })

  it("writes the case and what changed, relative to the case, and nothing it did not touch", () => {
    const session = new CaseSession(caseJson(), url)
    session.keep(session.tracks[0], account, true)
    session.keep(session.tracks[1], { ...account, id: "reading" } as SightingRecordingJson, true)
    expect(session.files().map(file => file.path)).toEqual(["case.json"])
    session.keep(session.tracks[1], { ...account, id: "reading", tags: ["edited"] } as SightingRecordingJson)
    session.addReading(session.tracks[0], "2026-10-04")
    expect(session.files().map(file => file.path)).toEqual(["case.json", "interpretation-mcminnville-1.json", "interpretation-mcminnville-2.json"])
  })

  it("adds an observer's account: an event with no interpretationOf, at a file and an id of its own", () => {
    const session = new CaseSession(caseJson(), url)
    session.keep(session.tracks[0], account, true)
    const added = session.addObservation({ version: 1, id: "1950-05-11-TrentPaul", timeline: { keyframes: [] } } as unknown as SightingRecordingJson, "1950-05-11", "Evelyn Trent")
    expect(added.kind).toBe("observer")
    expect(added.recording!.id).toBe("1950-05-11-TrentPaul-2") // the id was taken
    expect(added.event.url).toBe("observer-1950-05-11-trentpaul-2.json")
    expect(added.event.interpretationOf).toBeUndefined()
    expect(session.json.events!.at(-1)).toBe(added.event)
    expect(session.files().map(file => file.path)).toContain("observer-1950-05-11-trentpaul-2.json")
  })

  it("finds the readings that interpret an account, and refuses to delete one they interpret", () => {
    const session = new CaseSession(caseJson(), url)
    session.keep(session.tracks[0], account, true)
    expect(session.readingsOf(session.tracks[0])).toEqual([session.tracks[1]])
    expect(session.deleteObservation(session.tracks[0])).toEqual({ deleted: false, readings: 1 })
    expect(session.tracks).toHaveLength(2)
    session.deleteReading(session.tracks[1])
    expect(session.deleteObservation(session.tracks[0])).toEqual({ deleted: true })
    expect(session.json.events).toEqual([])
  })

  it("is clean as opened, dirty once a recording is edited, a field touched or a recording added, and clean again once exported", () => {
    const session = new CaseSession(caseJson(), url)
    session.keep(session.tracks[0], account, true)
    session.keep(session.tracks[1], { ...account, id: "reading" } as SightingRecordingJson, true)
    expect(session.dirty).toBe(false)
    session.keep(session.tracks[0], { ...account, description: "Edited" } as SightingRecordingJson)
    expect(session.dirty).toBe(true)
    session.markExported(false) // the case only: the edited recording is still lost by leaving
    expect(session.dirty).toBe(true)
    session.markExported(true)
    expect(session.dirty).toBe(false)
    session.touch()
    expect(session.dirty).toBe(true)
    session.markExported(false)
    expect(session.dirty).toBe(false)
    session.addReading(session.tracks[0], "2026-10-05")
    expect(session.dirty).toBe(true)
  })

  it("is dirty when made around a recording that is open, until exported", () => {
    const made = CaseSession.around(account, "1950-05-11 19:45", "Trent", undefined, "https://example.org/edit/")
    expect(made.dirty).toBe(true)
    made.markExported(true)
    expect(made.dirty).toBe(false)
  })

  it("writes every recording the case lists when asked, not only the ones that changed", () => {
    const session = new CaseSession(caseJson(), url)
    session.keep(session.tracks[0], account, true)
    session.keep(session.tracks[1], { ...account, id: "reading" } as SightingRecordingJson, true)
    expect(session.files(true).map(file => file.path)).toEqual(["case.json"])
    expect(session.files(true, true).map(file => file.path)).toEqual(["case.json", "observer-mcminnville.json", "interpretation-mcminnville-1.json"])
    expect(session.files(false, true).map(file => file.path)).toEqual(["case.json"])
  })

  describe("its ids", () => {
    const withIds = (): CaseJson => ({
      id: "McMinnville1950",
      events: [
        { type: "event", eventType: "sighting", id: "trent", title: "Paul Trent", url: "observer-mcminnville.json" },
        { type: "event", eventType: "sighting", interpretationOf: "trent", time: "2013-04", title: "A model", url: "interpretation-mcminnville-1.json" }
      ]
    })

    it("finds the account a reading reads by its event's id, and by its recording's id as the older form", () => {
      const session = new CaseSession(withIds(), url)
      expect(session.accountOf(session.tracks[1])).toBe(session.tracks[0])
      const older = new CaseSession(caseJson(), url)
      older.keep(older.tracks[0], account, true)
      expect(older.accountOf(older.tracks[1])).toBe(older.tracks[0])
    })

    it("does not read some other account when a reading names none of the case's", () => {
      const json = withIds()
      json.events![1].interpretationOf = "nobody"
      const session = new CaseSession(json, url)
      expect(session.accountOf(session.tracks[1])).toBeUndefined()
      expect(session.problems().unresolved).toEqual([{ reading: "interpretation-mcminnville-1.json", reference: "nobody" }])
    })

    it("proposes the observer's family name, then a number, and suffixes what is taken", () => {
      const session = new CaseSession({ events: [
        { eventType: "sighting", url: "a.json" }, { eventType: "sighting", url: "b.json" }, { eventType: "sighting", id: "trent", url: "c.json" }
      ] }, url)
      expect(session.proposedId(session.tracks[0])).toBe("sighting-1")
      session.tracks[1].recording = { ...account, observer: { lastName: "Trent" } } as SightingRecordingJson
      expect(session.proposedId(session.tracks[1])).toBe("trent-2")
      session.tracks[0].recording = { ...account, observer: { lastName: "Zamora" } } as SightingRecordingJson
      expect(session.proposedId(session.tracks[0])).toBe("zamora")
    })

    it("gives the account it is read by an id of its own when a reading is added, and names it by that", () => {
      const session = new CaseSession(caseJson(), url)
      session.keep(session.tracks[0], account, true)
      const added = session.addReading(session.tracks[0], "2026-10-04")
      expect(session.tracks[0].event.id).toBe("trentpaul")
      expect(added.event.interpretationOf).toBe("trentpaul")
      expect(session.readingsOf(session.tracks[0])).toHaveLength(2)
    })

    it("gives an account it adds an id, and a case made around a recording one too", () => {
      const session = new CaseSession(withIds(), url)
      const added = session.addObservation({ ...account, id: "1950-05-11-Other", observer: { lastName: "Trent" } } as SightingRecordingJson)
      expect(added.event.id).toBe("trent-2")
      const around = CaseSession.around(account, undefined, undefined, undefined, "https://example.org/edit/")
      expect(around.tracks[0].event.id).toBe("trentpaul")
    })

    it("refuses an id that is empty while a reading names it, that is not plain, or that another event has", () => {
      const session = new CaseSession(withIds(), url)
      const added = session.addObservation({ ...account, id: "x", observer: { lastName: "Other" } } as SightingRecordingJson)
      expect(session.setId(session.tracks[0], "")).toBe("empty")
      expect(session.setId(session.tracks[0], "has space")).toBe("invalid")
      expect(session.setId(added, "trent")).toBe("taken")
      expect(session.setId(added, "other-2")).toBe("ok")
    })

    it("renames an id in every reading that named it, whichever form they used", () => {
      const session = new CaseSession(caseJson(), url)
      session.keep(session.tracks[0], account, true)
      expect(session.setId(session.tracks[0], "trent")).toBe("ok")
      expect(session.tracks[1].event.interpretationOf).toBe("trent")
      session.tracks[1].event.interpretationOf = ["trent", "other"]
      expect(session.setId(session.tracks[0], "paul")).toBe("ok")
      expect(session.tracks[1].event.interpretationOf).toEqual(["paul", "other"])
      expect(session.dirty).toBe(true)
    })

    it("reports an id two events bear", () => {
      const json = withIds()
      json.events!.push({ eventType: "sighting", id: "trent", url: "other.json" })
      expect(new CaseSession(json, url).problems().duplicateIds).toEqual(["trent"])
    })

    it("does not touch a case it only opens", () => {
      const session = new CaseSession(caseJson(), url)
      expect(session.dirty).toBe(false)
      expect(session.json.events![0]).not.toHaveProperty("id")
    })
  })
})

describe("A case whose file was edited as text", () => {
  it("takes the events of the text, the recordings it still lists keeping what was loaded of them", () => {
    const session = new CaseSession(caseJson(), url)
    session.keep(session.tracks[0], account, true)
    const kept = session.tracks[0]
    const next: CaseJson = {
      id: "McMinnville1950",
      events: [
        { type: "event", eventType: "sighting", title: "Paul Trent, renamed", url: "observer-mcminnville.json" },
        { type: "event", eventType: "sighting", title: "A new witness", url: "observer-new.json" }
      ]
    }
    session.replaceJson(next)
    expect(session.json).toBe(next)
    // The first recording is the same track, with its recording and the event of the new text; the reading is gone; a witness is added, not loaded yet.
    expect(session.tracks[0]).toBe(kept)
    expect(kept.recording).toBe(account)
    expect(kept.event).toBe(next.events![0])
    expect(session.tracks.map(track => track.url)).toEqual([
      "https://example.org/dossier/McMinnville/observer-mcminnville.json", "https://example.org/dossier/McMinnville/observer-new.json"])
    expect(session.tracks[1].recording).toBeUndefined()
    expect(session.dirty).toBe(true)
  })

  it("keeps the interviews of the text, and reads which account each was held with", () => {
    const session = new CaseSession({ id: "X", events: [{ type: "event", eventType: "sighting", id: "w", url: "a.json" }] }, url)
    session.replaceJson({ id: "X", events: [
      { type: "event", eventType: "sighting", id: "w", url: "a.json" },
      { type: "event", eventType: "interview", id: "i", interviewOf: "w", title: "Interview" }
    ] })
    expect(session.interviews).toHaveLength(1)
    expect(session.intervieweeOf(session.interviews[0])).toBe(session.tracks[0])
  })

  it("adds an interview held with an account, which gives that account the id it is named by", () => {
    const session = new CaseSession({ id: "X", events: [{ type: "event", eventType: "sighting", url: "a.json", title: "Trent" }] }, url)
    const interview = session.addInterview(session.tracks[0], "2026-10-13", "Phone", [{ people: "BeauJerome" }])
    expect(session.tracks[0].event.id).toBeTruthy()
    expect(interview).toMatchObject({ eventType: "interview", interviewOf: session.tracks[0].event.id, time: "2026-10-13", title: "Phone", by: [{ people: "BeauJerome" }] })
    expect(session.interviews).toEqual([interview])
    expect(session.addInterview(session.tracks[0], "2026-10-14").id).not.toBe(interview.id)
    expect(session.deleteInterview(interview)).toBe(true)
    expect(session.interviews).toHaveLength(1)
  })
})


describe("The transcripts of a case's interviews", () => {
  const withInterview = (): CaseSession => new CaseSession({
    id: "X",
    events: [
      { type: "event", eventType: "sighting", id: "w", url: "a.json" },
      { type: "event", eventType: "interview", id: "i", interviewOf: "w", url: "interview-i.json" }
    ]
  }, url)

  it("are kept as the author has them, and make the case something to save", () => {
    const session = withInterview()
    const [interview] = session.interviews
    expect(session.transcriptText(interview)).toBeUndefined()
    expect(session.dirty).toBe(false)
    session.keepTranscript(interview, "{ \"segments\": [] }\n")
    expect(session.transcriptText(interview)).toBe("{ \"segments\": [] }\n")
    expect(session.dirty).toBe(true)
  })

  it("are written at the address the interview lists, beside the case, with the recordings, once they changed", () => {
    const session = withInterview()
    session.keepTranscript(session.interviews[0], "{ \"segments\": [] }\n")
    expect(session.files(true).map(file => file.path)).toEqual(["case.json", "interview-i.json"])
    expect(session.files(true)[1].content).toBe("{ \"segments\": [] }\n")
    expect(session.files(false).map(file => file.path)).toEqual(["case.json"])
    session.markExported(true)
    expect(session.dirty).toBe(false)
    expect(session.files(true).map(file => file.path)).toEqual(["case.json"])
    expect(session.files(true, true).map(file => file.path)).toEqual(["case.json", "interview-i.json"])
  })

  it("follow their interview when the text of the case is edited, and go with it when it is deleted", () => {
    const session = withInterview()
    session.keepTranscript(session.interviews[0], "text")
    session.replaceJson({ id: "X", events: [
      { type: "event", eventType: "sighting", id: "w", url: "a.json" },
      { type: "event", eventType: "interview", id: "i", interviewOf: "w", url: "interview-i.json", title: "Renamed" }
    ] })
    expect(session.transcriptText(session.interviews[0])).toBe("text")
    expect(session.deleteInterview(session.interviews[0])).toBe(true)
    expect(session.files(true).map(file => file.path)).toEqual(["case.json"])
  })
})
