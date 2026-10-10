import { describe, expect, it } from "vitest"
import { LineDiff } from "../../src/component/LineDiff.js"

const lines = (text: string) => text.split("")

describe("LineDiff", () => {
  it("finds nothing changed in a text that is the same", () => {
    expect(LineDiff.changed(lines("abcdef"), lines("abcdef"))).toEqual([])
  })

  it("marks a line that is not what it was, and only it", () => {
    expect(LineDiff.changed(lines("abcdef"), lines("abXdef"))).toEqual([2])
  })

  it("marks a line that was added, and none of those that moved down for it", () => {
    expect(LineDiff.changed(lines("abcdef"), lines("abcXdef"))).toEqual([3])
  })

  it("marks nothing for a line that was taken away, since there is no line of the new text to mark", () => {
    expect(LineDiff.changed(lines("abcdef"), lines("abdef"))).toEqual([])
  })

  it("follows several edits apart from each other", () => {
    expect(LineDiff.changed(lines("abcdefghij"), lines("aXcdefYYhij"))).toEqual([1, 6, 7])
  })

  it("marks the whole of a text that has nothing to do with the old one", () => {
    expect(LineDiff.changed(lines("abc"), lines("xyz"))).toEqual([0, 1, 2])
  })

  it("marks everything of a text that was empty", () => {
    expect(LineDiff.changed([], lines("ab"))).toEqual([0, 1])
  })

  it("works out a long text with a few edits without calling the rest changed", () => {
    const before = Array.from({ length: 3000 }, (_, i) => `line ${i}`)
    const after = [...before]
    after[100] = "changed"
    after.splice(2000, 0, "inserted")
    expect(LineDiff.changed(before, after)).toEqual([100, 2000])
  })
})
