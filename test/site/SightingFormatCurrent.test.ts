import { describe, expect, it } from "vitest"
import { FormatVersion } from "../../src/engine/persistence/FormatVersion.js"

/**
 * That every recording this project ships is at the current version of the format IN ITS SHAPES, and not merely in the number it states.
 *
 * The schema says a file is well formed; it does not say a file is not carrying an older vocabulary under a current version number. A
 * generator that declares the version without writing its shapes makes exactly that file, and nothing converts it any more, since the
 * conversion is chosen by the number (see SightingMigration): build_duboc.py did it, and its groups stayed as the version before wrote
 * them. This is the check that lets the conversions of a version be taken out of the player once no file needs them: what it looks for
 * is what each of them would have converted.
 */
const files = (import.meta as unknown as { glob: (pattern: string, options: object) => Record<string, Record<string, unknown>> })
  .glob("../../public/demo-data/*.json", { eager: true, import: "default" })
const recordings = Object.entries(files)
  .map(([path, json]) => ({ file: path.split("/").pop() ?? path, json }))
  .filter(({ json }) => "timeline" in json)

/** A value as a file may write it: bare, or with its provenance beside it (see Provenance). */
const bare = (value: unknown): unknown =>
  typeof value === "object" && value !== null && "value" in value ? (value as { value: unknown }).value : value

/** Everything of a recording an event may be about, by id — see the `who` of RecordingEvents. */
const idsOf = (json: Record<string, unknown>): Set<string> => {
  const ids = new Set<string>()
  const observer = json.observer as { id?: string } | undefined
  // A witness without an id of their own is "observer", which is what an event of theirs says.
  ids.add(observer?.id ?? "observer")
  const timeline = (json.timeline ?? {}) as { keyframes?: { shapes?: { sourceId?: string }[] }[], order?: string[], groups?: { id?: string, members?: string[] }[] }
  for (const sourceId of timeline.order ?? []) ids.add(sourceId)
  for (const keyframe of timeline.keyframes ?? []) for (const shape of keyframe.shapes ?? []) if (shape.sourceId) ids.add(shape.sourceId)
  // A group holds its shapes by id, and a recording that draws them through its events alone states them nowhere else.
  for (const group of timeline.groups ?? []) {
    if (group.id) ids.add(group.id)
    for (const member of group.members ?? []) ids.add(member)
  }
  for (const object of (json.decor ?? []) as { id?: string }[]) if (object.id) ids.add(object.id)
  for (const body of ((json.interpretation ?? {}) as { bodies?: { id?: string }[] }).bodies ?? []) if (body.id) ids.add(body.id)
  return ids
}

describe("Every recording shipped is at the current version of the format", () => {
  it.each(recordings)("$file states the current version", ({ json }) => {
    expect(bare(json.version)).toBe(FormatVersion.CURRENT.sighting)
  })

  it.each(recordings)("$file says its time and its place as version 2 does, not as fields and a list", ({ json }) => {
    // Version 2 writes the observation's time as EDTF text and its place as one PlaceJson holding its locations.
    for (const key of ["time", "endTime"]) expect(typeof bare(json[key]), key).not.toBe("object")
    expect(Array.isArray(bare(json.place))).toBe(false)
  })

  it.each(recordings)("$file names its groups of shapes as version 3 does, not as bare lists of members", ({ json }) => {
    const groups = ((json.timeline ?? {}) as { groups?: unknown[] }).groups ?? []
    for (const group of groups) expect(Array.isArray(group)).toBe(false)
  })

  it.each(recordings)("$file says what each of its events is about by an id, as version 3 does", ({ json }) => {
    const ids = idsOf(json)
    for (const event of (json.events ?? []) as { who?: string, eventType?: string }[]) {
      if (event.who === undefined) continue
      // A part of something is named "<id>/<part>": a node of a model, one of its lamps, a group of them.
      const owner = event.who.split("/")[0]
      expect(ids.has(owner), `${event.eventType} about "${event.who}"`).toBe(true)
      // "phenomenon" was version 2's word for the account's shapes as a whole; version 3 made them a group with an id of its own, which
      // may well be called that. It is an id here only because the groups hold one.
      if (owner === "phenomenon") expect(((json.timeline ?? {}) as { groups?: { id?: string }[] }).groups?.some(group => group.id === "phenomenon")).toBe(true)
    }
  })

  it.each(recordings)("$file calls its frozen surveys snapshots, as version 4 does", ({ json }) => {
    expect("frozen" in json).toBe(false)
  })

  // That the checks above bite: each is given what the version before it wrote, which is what a generator left behind produces.
  describe("catches what a version left behind", () => {
    it("a group of shapes written as the bare list of its members, as build_duboc.py wrote one", () => {
      const groups: unknown[] = [["lens", "chevron"]]
      expect(groups.some(group => Array.isArray(group))).toBe(true)
    })

    it("an event about a word that names nothing of the recording", () => {
      const json = { observer: { id: "T1" }, timeline: { groups: [{ id: "phenomenon", members: ["disc"] }] } }
      expect(idsOf(json as unknown as Record<string, unknown>).has("phenomenon")).toBe(true)
      expect(idsOf(json as unknown as Record<string, unknown>).has("disc")).toBe(true)
      // What version 2 wrote where the witness has an id of their own: no longer anything the recording names.
      expect(idsOf(json as unknown as Record<string, unknown>).has("observer")).toBe(false)
    })

    it("a time written as its fields and a place written as a list", () => {
      expect(typeof bare({ value: { year: 1994, month: 1 } })).toBe("object")
      expect(Array.isArray(bare([{ lat: 48.8, lng: 2.3 }]))).toBe(true)
    })
  })
})
