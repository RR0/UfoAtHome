import { describe, expect, it } from "vitest"
import { ReadingCheck as Check } from "../../../src/engine/interpretation/ReadingCheck.js"
import { readingCheckTexts_en } from "../../../src/engine/interpretation/messages/ReadingCheckTexts_en.js"
import type { SightingRecordingJson } from "../../../src/engine/persistence/sightingJson.js"
import type { ReadingFinding } from "../../../src/engine/interpretation/Interpretation.js"

/** The check in English. */
const ReadingCheck = new Check(readingCheckTexts_en)
const english = (finding: ReadingFinding): string => finding.text as string

/** A film over southern England whose hour is supposed within the June or July the sources give, and whose picture shows the aircraft
 * lit from behind the camera. At 16:00 UTC on 15 June 1976 at 51° N, 1.5° W, the Sun is 261° round and 38° high: 230° from a camera
 * looking at 31°, behind it on its left. */
const account = (): SightingRecordingJson => ({
  version: 4,
  time: { value: "1976-06-15T16:00:00", basis: "assumed", range: "1976-06/1976-07" } as never,
  utcOffsetHours: 0,
  place: { name: "Southern England", locations: [{ lat: { value: 51, basis: "assumed", range: [50.5, 51.6] }, lng: { value: -1.5, basis: "assumed", range: [-5.5, 1.4] } }] } as never,
  observerTrack: { keyframes: [{ t: 0, pose: { lat: 51, lng: -1.5, elevationM: 3000, headingDeg: 31, pitchDeg: -29, fovDeg: 20 } }] },
  lighting: { value: { sunFromViewDeg: { fromDeg: 105, toDeg: 285 }, sunAltitudeDeg: { minDeg: 5, maxDeg: 90 } }, basis: "derived", rationale: "the fuselage and the fin lit on the camera's side" } as never,
  timeline: { keyframes: [] }
})

const readingOf = (change: (json: SightingRecordingJson) => void): SightingRecordingJson => {
  const json = structuredClone(account())
  change(json)
  return json
}

describe("A reading set against the observation it reads", () => {
  it("finds nothing to say of a reading that moves nothing", () => {
    expect(ReadingCheck.findingsOf(account(), account())).toEqual([])
  })

  it("lets the time move within what is known of it, and the Sun must still light the scene as the picture does", () => {
    // Later the same afternoon, in July: within the sources' months, and the Sun still behind the camera.
    const findings = ReadingCheck.findingsOf(account(), readingOf(json => { (json.time as unknown as { value: string }).value = "1976-07-02T17:00:00" }))
    expect(findings.map(finding => [finding.outcome, finding.against])).toEqual([["holds", "established"], ["holds", "established"]])
    expect(english(findings[0])).toContain("1976-06/1976-07")
  })

  it("contradicts what is known of a time taken beyond its range", () => {
    const findings = ReadingCheck.findingsOf(account(), readingOf(json => { (json.time as unknown as { value: string }).value = "1976-09-01T16:00:00" }))
    expect(findings[0]).toMatchObject({ outcome: "fails", against: "established" })
  })

  it("couples the hour with the way the camera looked: the morning Sun is ahead of it, unless it looked the other way", () => {
    const morning = (json: SightingRecordingJson) => { (json.time as unknown as { value: string }).value = "1976-06-15T08:00:00" }
    const ahead = ReadingCheck.findingsOf(account(), readingOf(morning)).find(finding => english(finding).includes("Sun"))!
    expect(ahead).toMatchObject({ outcome: "fails", against: "established" })
    const turned = ReadingCheck.findingsOf(account(), readingOf(json => {
      morning(json)
      json.observerTrack!.keyframes![0].pose!.headingDeg = 211
    })).find(finding => english(finding).includes("Sun"))!
    expect(turned.outcome).toBe("holds")
  })

  it("couples the place with the hour too: the same clock far to the west is an earlier Sun", () => {
    const west = ReadingCheck.findingsOf(account(), readingOf(json => {
      json.observerTrack!.keyframes![0].pose!.lng = -100
      ;(json.place!.locations![0] as unknown as { lng: { value: number } }).lng.value = -100
    }))
    // Outside southern England, which is what is known of the place; and the Sun of 16:00 UTC there is a morning one, ahead of the camera.
    expect(west.find(finding => english(finding).includes("longitude"))).toMatchObject({ outcome: "fails", against: "established" })
    expect(west.find(finding => english(finding).includes("Sun"))).toMatchObject({ outcome: "fails" })
  })

  it("holds a value the observation states, with no range said of it, to what it states", () => {
    const stated = { ...account(), time: "1976-06-15T16:00:00" }
    const findings = ReadingCheck.findingsOf(stated, { ...stated, time: "1976-06-15T17:00:00" })
    expect(findings[0]).toMatchObject({ outcome: "fails", against: "established" })
  })

  it("leaves free a value the observation only assumed and bounded by nothing", () => {
    const assumed = { ...account(), time: { value: "1976-06-15T16:00:00", basis: "assumed" } as never, lighting: undefined }
    const reading = { ...assumed, time: { value: "1976-12-01T09:00:00", basis: "assumed" } as never }
    expect(ReadingCheck.findingsOf(assumed, reading)).toEqual([])
  })

  it("leaves free a value turned to make a hypothesis fit: moving it is no contradiction", () => {
    const fitted = { ...account(), time: { value: "1976-06-15T16:00:00", basis: "fitted", rationale: "turned for the reflection" } as never, lighting: undefined }
    const reading = { ...fitted, time: { value: "1976-12-01T09:00:00", basis: "fitted" } as never }
    expect(ReadingCheck.findingsOf(fitted, reading)).toEqual([])
  })

  it("brings an hour the light rules out to the nearest of that day it allows, which the heading moves", () => {
    const lighting = { sunFromViewDeg: { fromDeg: 105, toDeg: 285 }, sunAltitudeDeg: { minDeg: 5, maxDeg: 90 } }
    const midnight = { year: 1976, month: 6, day: 15, hour: 0, minute: 0 }
    const lit = Check.nearestLit(lighting, midnight, account())!
    // The Sun behind a camera looking at 31° is an afternoon one: the first minute of it, nearer midnight than its last.
    expect(lit.hour).toBeGreaterThanOrEqual(9)
    expect(lit.hour).toBeLessThanOrEqual(12)
    expect(Check.lights(lighting, Check.sunOf(lit, account())!)).toBe(true)
    expect(Check.lights(lighting, Check.sunOf({ ...lit, minute: lit.minute! - 1 }, account())!)).toBe(false)
    // An hour it allows stays as it is.
    const afternoon = { year: 1976, month: 6, day: 15, hour: 16, minute: 0 }
    expect(Check.nearestLit(lighting, afternoon, account())).toBe(afternoon)
    // Looking the other way, the morning is the one allowed.
    const turned = readingOf(json => { json.observerTrack!.keyframes![0].pose!.headingDeg = 211 })
    expect(Check.nearestLit(lighting, afternoon, turned)!.hour).toBeLessThan(16)
  })

  it("reads an EDTF interval each end as wide as it is said", () => {
    expect(Check.withinInterval(new Date(Date.UTC(1976, 6, 31, 23, 0)), "1976-06/1976-07")).toBe(true)
    expect(Check.withinInterval(new Date(Date.UTC(1976, 7, 1, 0, 30)), "1976-06/1976-07")).toBe(false)
    expect(Check.withinInterval(new Date(Date.UTC(1976, 4, 31, 23, 0)), "1976-06/1976-07")).toBe(false)
  })
})
