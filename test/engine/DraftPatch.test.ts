import { describe, expect, it } from "vitest"
import { DraftPatch } from "../../src/engine/narrative/DraftPatch.js"
import type { SightingRecordingJson } from "../../src/engine/persistence/sightingJson.js"

const empty = (): SightingRecordingJson => ({ version: 1, timeline: { keyframes: [] } })

describe("DraftPatch", () => {
  it("names every leaf a draft states, and none of the objects holding them", () => {
    // Naming `observer` would write the whole of it and take with it any sibling key the account
    // happens not to mention.
    const paths = DraftPatch.stated({
      time: { year: 1965, month: 7, day: 1 },
      observer: { id: "masse", title: "Maurice Masse" }
    })

    expect(paths).toEqual(["time.year", "time.month", "time.day", "observer.id", "observer.title"])
  })

  it("treats an array as one value, so a stated timeline is written whole", () => {
    // Element correspondence between an array the account produced and one already in the file is a
    // guess, and a wrong guess here corrupts a recording.
    expect(DraftPatch.stated({ timeline: { keyframes: [{ t: 0, shapes: [] }, { t: 5000, shapes: [] }] } }))
      .toEqual(["timeline.keyframes"])
  })

  it("leaves alone what the account is silent about", () => {
    // The case the class exists for: a place geocoded to the metre, an instrument chosen, decor
    // placed — none of that is in a account, so no reading of one may touch it.
    const editor: SightingRecordingJson = {
      ...empty(),
      place: [{ lat: 43.837, lng: 5.993 }],
      instrument: "instamatic-104",
      durationSeconds: 270
    }
    const draft = { time: { year: 1965 }, id: "valensole" }

    const patched = DraftPatch.apply(editor, draft, DraftPatch.stated(draft))

    expect(patched.time).toEqual({ year: 1965 })
    expect(patched.id).toBe("valensole")
    expect(patched.place).toEqual([{ lat: 43.837, lng: 5.993 }])
    expect(patched.instrument).toBe("instamatic-104")
    expect(patched.durationSeconds).toBe(270)
  })

  it("writes what the account does state, over whatever was there", () => {
    const editor: SightingRecordingJson = { ...empty(), durationSeconds: 270 }
    const draft = { durationSeconds: 240 }

    expect(DraftPatch.apply(editor, draft, DraftPatch.stated(draft)).durationSeconds).toBe(240)
  })

  it("leaves both arguments untouched", () => {
    const editor: SightingRecordingJson = { ...empty(), id: "before" }
    const draft = { id: "after" }

    const patched = DraftPatch.apply(editor, draft, ["id"])

    expect(editor.id).toBe("before")
    expect(patched.id).toBe("after")
    patched.timeline.keyframes.push({ t: 0, shapes: [] })
    expect(editor.timeline.keyframes).toEqual([])
  })

  it("skips a path the draft does not actually state, rather than blanking the value", () => {
    const editor: SightingRecordingJson = { ...empty(), id: "valensole" }

    expect(DraftPatch.apply(editor, {}, ["id"]).id).toBe("valensole")
  })

  it("creates the object a stated leaf needs, when the recording has none", () => {
    const draft = { observer: { title: "Maurice Masse" } }

    expect(DraftPatch.apply(empty(), draft, DraftPatch.stated(draft)).observer)
      .toEqual({ title: "Maurice Masse" })
  })
})
