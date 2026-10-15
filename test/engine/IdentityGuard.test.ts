import { describe, expect, it } from "vitest"
import { IdentityGuard } from "../../src/engine/persistence/IdentityGuard.js"
import type { SightingRecordingJson } from "../../src/engine/persistence/sightingJson.js"

const recording = (extra: Partial<SightingRecordingJson>): SightingRecordingJson =>
  ({ version: 1, timeline: { keyframes: [{ t: 0, shapes: [] }] }, ...extra }) as SightingRecordingJson

const kinds = (json: SightingRecordingJson, loaded?: SightingRecordingJson) =>
  IdentityGuard.inspect(json, loaded).map(finding => finding.kind)

describe("IdentityGuard", () => {
  it("finds nothing in a recording with initials", () => {
    expect(kinds(recording({
      id: "2026-08-11-SaintLo", observer: { lastName: "B.", firstNames: ["Q."] },
      description: { fr: "Je regardais vers l'est." }
    }))).toEqual([])
  })

  it("takes capital letters alone, with or without dots, for initials", () => {
    for (const lastName of ["B.", "QB", "J.-C.", "Q. B."]) {
      expect(kinds(recording({ observer: { lastName } }))).toEqual([])
    }
  })

  it("finds a last name and first names", () => {
    expect(kinds(recording({ observer: { lastName: "Zamora", firstNames: ["Lonnie"] } }))).toEqual(["lastName", "firstNames"])
  })

  it("finds the name written into an identifier, whatever the case", () => {
    const found = IdentityGuard.inspect(recording({ id: "1964-04-24-ZamoraLonnie", observer: { id: "zamoralonnie", lastName: "Zamora" } }))
    expect(found.filter(finding => finding.kind === "nameInId").map(finding => finding.found)).toEqual(["1964-04-24-ZamoraLonnie", "zamoralonnie"])
  })

  it("finds the name in the account, in every language, as a word only", () => {
    expect(kinds(recording({ observer: { lastName: "Martin" }, description: { en: "Mr Martin saw it", fr: "Il a vu" } })))
      .toEqual(["lastName", "nameInText"])
    expect(kinds(recording({ observer: { lastName: "Martin" }, description: "Un martinet passait" }))).toEqual(["lastName"])
  })

  it("ignores names too short to be told from words", () => {
    expect(kinds(recording({ observer: { lastName: "Li" } }))).toEqual([])
  })

  it("finds an address, an e-mail address and a telephone number in the free text", () => {
    expect(kinds(recording({ description: "Devant chez moi, 12 rue des Lilas, j'ai écrit à jean@example.org puis appelé le 06 12 34 56 78." })))
      .toEqual(["address", "email", "phone"])
  })

  it("does not take a date, a time or coordinates for a telephone number", () => {
    expect(kinds(recording({ description: "Le 2026-08-11T02:30, à 49.10489, -1.075382, pendant 120 s." }))).toEqual([])
  })

  it("finds the name of a place that is an address", () => {
    expect(kinds(recording({ place: [{ lat: 1, lng: 2, name: "3 avenue Foch, Paris" } as never] }))).toEqual(["address"])
  })

  it("reports only what the recording did not already state when it was opened", () => {
    const loaded = recording({ id: "1994-01-28-DubocJeanCharles", observer: { lastName: "Duboc", firstNames: ["Jean", "Charles"] } })
    expect(kinds(loaded, loaded)).toEqual([])
    const edited = recording({ ...loaded, description: "M. Duboc, 5 rue Lafayette" })
    expect(kinds(edited, loaded)).toEqual(["nameInText", "address"])
  })

  it("writes names as initials, in an identifier without the dots", () => {
    expect(IdentityGuard.initialsOf("Dupont")).toBe("D.")
    expect(IdentityGuard.initialsOf("Jean-Charles")).toBe("J.-C.")
    expect(IdentityGuard.withInitials("M. Dupont et jean", ["Dupont", "Jean"])).toBe("M. D. et J.")
    expect(IdentityGuard.withInitials("1994-01-28-DubocJeanCharles", ["Duboc", "Jean", "Charles"], true)).toBe("1994-01-28-DJC")
  })
})
