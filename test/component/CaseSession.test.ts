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
    expect(added.event).toMatchObject({ eventType: "sighting", interpretationOf: "1950-05-11-TrentPaul", time: "2026-10-04", url: "interpretation-mcminnville-2.json" })
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
})
