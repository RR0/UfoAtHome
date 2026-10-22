import { describe, expect, it } from "vitest"
import { InterviewEdits } from "../../../src/engine/persistence/InterviewEdits.js"
import type { InterviewSegment } from "../../../src/engine/persistence/interviewJson.js"

const reason = "taken out at proofreading"

describe("InterviewEdits", () => {
  it("takes a stretch of what was said out, keeping what is around it", () => {
    const segment: InterviewSegment = { speaker: "witness", text: "I was following a car speeding south of town." }
    const removed = InterviewEdits.redact(segment, 18, 30, reason)
    expect(removed).toEqual({ text: "car speeding", nth: 0 })
    expect(segment.text).toBeUndefined()
    expect(segment.parts).toEqual([{ text: "I was following a" }, { redacted: { reason, words: 2 } }, { text: "south of town." }])
  })

  it("takes whole words out of a selection that cuts into them", () => {
    const segment: InterviewSegment = { speaker: "witness", text: "I answered all your questions willingly." }
    expect(InterviewEdits.redact(segment, 12, 22, reason)!.text).toBe("all your questions")
    expect(segment.parts![0]).toEqual({ text: "I answered" })
  })

  it("refuses a stretch that is not within one passage said", () => {
    const segment: InterviewSegment = { speaker: "witness", parts: [{ text: "one two" }, { redacted: { reason } }, { text: "three" }] }
    const ranges = InterviewEdits.shownRanges(segment.parts!)
    expect(ranges.map(range => [range.from, range.to])).toEqual([[0, 7], [8, 8], [9, 14]])
    expect(InterviewEdits.redact(segment, 4, 12, reason)).toBeUndefined()
    expect(InterviewEdits.redact(segment, 9, 14, reason)).toEqual({ text: "three", nth: 1 })
  })

  it("puts a passage back while its text is known, and is plain text again when nothing is taken out", () => {
    const segment: InterviewSegment = { speaker: "witness", text: "a b c" }
    const removed = InterviewEdits.redact(segment, 2, 3, reason)!
    InterviewEdits.restorePart(segment, removed.nth, removed.text)
    expect(segment).toEqual({ speaker: "witness", text: "a b c" })
  })

  it("puts a passage back against the punctuation that follows it", () => {
    const segment: InterviewSegment = { speaker: "witness", text: "Alors, oui." }
    const removed = InterviewEdits.redact(segment, 0, 5, reason)!
    InterviewEdits.restorePart(segment, removed.nth, removed.text)
    expect(segment.text).toBe("Alors, oui.")
  })

  it("takes a whole turn out and back", () => {
    const segment: InterviewSegment = { speaker: "witness", text: "hello there", refs: [{ at: 3, range: [0, 5] }] }
    const kept = InterviewEdits.redactWhole(segment, reason)
    expect(segment).toEqual({ speaker: "witness", redacted: { reason, words: 2 }, refs: [{ at: 3 }] })
    InterviewEdits.restoreWhole(segment, kept)
    expect(segment.text).toBe("hello there")
    expect(segment.redacted).toBeUndefined()
  })

  it("reads raw text with ⟦ ⟧ back, keeping a passage that still reads …", () => {
    const segment: InterviewSegment = { speaker: "witness", parts: [{ text: "one" }, { redacted: { reason: "old", words: 4 } }, { text: "two" }] }
    const raw = InterviewEdits.raw(segment)
    expect(raw).toBe("one ⟦…⟧ two")
    const removed = InterviewEdits.fromRaw(segment, "one ⟦…⟧ two ⟦secret name⟧ three", reason)
    expect(segment.parts).toEqual([{ text: "one" }, { redacted: { reason: "old", words: 4 } }, { text: "two" }, { redacted: { reason, words: 2 } }, { text: "three" }])
    expect(removed.get(1)).toBe("secret name")
  })
})
