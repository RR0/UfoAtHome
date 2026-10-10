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

  it("marks no line for one that was taken away, since there is no line of the new text to mark", () => {
    expect(LineDiff.changed(lines("abcdef"), lines("abdef"))).toEqual([])
  })

  it("says where lines were taken away: the line of the new text that now stands in their place", () => {
    expect(LineDiff.compare(lines("abcdef"), lines("abdef")).removed).toEqual([2])
    expect(LineDiff.compare(lines("abcdef"), lines("abcd")).removed).toEqual([4])
    expect(LineDiff.compare(lines("abcdef"), lines("cdef")).removed).toEqual([0])
    expect(LineDiff.compare(lines("abcdef"), lines("")).removed).toEqual([0])
    expect(LineDiff.compare(lines("abcdefghij"), lines("abdefhij")).removed).toEqual([2, 5])
  })

  it("says nothing was taken away where lines were only added or changed", () => {
    expect(LineDiff.compare(lines("abcdef"), lines("abXdef")).removed).toEqual([])
    expect(LineDiff.compare(lines("abcdef"), lines("abcXdef")).removed).toEqual([])
  })

  it("marks both a line that replaced others and the place of the ones it replaced", () => {
    const { changed, removed } = LineDiff.compare(lines("abcdef"), lines("abXf"))
    expect(changed).toEqual([2])
    expect(removed).toEqual([3])
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
