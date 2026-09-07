import { describe, expect, it } from "vitest"
import { DraftPatch } from "../../src/engine/narrative/DraftPatch.js"
import type { SightingRecordingJson } from "../../src/engine/persistence/sightingJson.js"

const empty = (): SightingRecordingJson => ({ version: 1, timeline: { keyframes: [] } })

describe("DraftPatch", () => {
  it("names every leaf a first draft states, and none of the objects holding them", () => {
    const paths = DraftPatch.stated({
      time: { year: 1965, month: 7, day: 1 },
      witness: { id: "masse", title: "Maurice Masse" }
    })

    expect(paths).toEqual(["time.year", "time.month", "time.day", "witness.id", "witness.title"])
  })

  it("names only what moved between two drafts", () => {
    const before = { time: { year: 1965, hour: 5 }, witness: { id: "masse", title: "M. Masse" } }
    const after = { time: { year: 1965, hour: 6 }, witness: { id: "masse", title: "M. Masse" } }

    expect(DraftPatch.changed(before, after)).toEqual(["time.hour"])
  })

  it("leaves a hand-corrected field alone when a correction only restates it", () => {
    // The case the whole class exists for. A first draft proposes a misspelt witness; the author
    // fixes it by hand; a later ask corrects the hour and, as corrections do, restates the witness
    // exactly as it was FIRST proposed. Applying that wholesale would undo the fix.
    const first = { time: { hour: 5 }, witness: { title: "Maurice Mass" } }
    const corrected = { time: { hour: 6 }, witness: { title: "Maurice Mass" } }
    const edited: SightingRecordingJson = { ...empty(), time: { hour: 5 }, witness: { title: "Maurice Masse" } }

    const patched = DraftPatch.apply(edited, corrected, DraftPatch.changed(first, corrected))

    expect(patched.time).toEqual({ hour: 6 })
    expect(patched.witness).toEqual({ title: "Maurice Masse" })
  })

  it("treats an array as one value, so a changed timeline is written whole", () => {
    const before = { timeline: { keyframes: [{ t: 0, shapes: [] }] } }
    const after = { timeline: { keyframes: [{ t: 0, shapes: [] }, { t: 5000, shapes: [] }] } }

    expect(DraftPatch.changed(before, after)).toEqual(["timeline.keyframes"])
  })

  it("never deletes: a field the new draft is silent about survives", () => {
    // Silence is far more often "nobody was talking about that this round" than a retraction, and
    // a value that vanishes on its own is much harder to recover than one that needs a keystroke.
    const before = { caseId: "valensole", durationSeconds: 270 }
    const after = { caseId: "valensole" }
    const editor: SightingRecordingJson = { ...empty(), caseId: "valensole", durationSeconds: 270 }

    const patched = DraftPatch.apply(editor, after, DraftPatch.changed(before, after))

    expect(patched.durationSeconds).toBe(270)
  })

  it("adds a field an earlier draft never had", () => {
    const paths = DraftPatch.changed({ time: { year: 1965 } }, { time: { year: 1965, hour: 5 } })

    expect(paths).toEqual(["time.hour"])
  })

  it("names the leaves of a wholly new object rather than the object", () => {
    // So that a later round adding a sibling key doesn't have to restate the ones already applied.
    expect(DraftPatch.stated({ witness: { id: "masse", title: "Maurice Masse" } }))
      .toEqual(["witness.id", "witness.title"])
  })

  it("leaves both arguments untouched", () => {
    const editor: SightingRecordingJson = { ...empty(), caseId: "before" }
    const draft = { caseId: "after" }

    const patched = DraftPatch.apply(editor, draft, ["caseId"])

    expect(editor.caseId).toBe("before")
    expect(patched.caseId).toBe("after")
    patched.timeline.keyframes.push({ t: 0, shapes: [] })
    expect(editor.timeline.keyframes).toEqual([])
  })

  it("skips a path the draft does not actually state", () => {
    // changed() can name a path only the EARLIER draft had; apply must not write undefined over a
    // value the editor holds.
    const editor: SightingRecordingJson = { ...empty(), caseId: "valensole" }

    expect(DraftPatch.apply(editor, {}, ["caseId"]).caseId).toBe("valensole")
  })
})
