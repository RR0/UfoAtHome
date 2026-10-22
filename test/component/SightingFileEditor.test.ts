// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { SightingFileEditor } from "../../src/component/SightingFileEditor.js"

describe("SightingFileEditor.changeBetween", () => {
  const apply = (from: string, change: { from: number, to: number, insert: string }) => from.slice(0, change.from) + change.insert + from.slice(change.to)

  it("replaces only what lies between what the two texts begin and end with", () => {
    const before = `{\n  "headingDeg": 110,\n  "frozen": "${"x".repeat(1000)}"\n}`
    const after = before.replace("110", "145")
    const change = SightingFileEditor.changeBetween(before, after)
    expect(change).toEqual({ from: before.indexOf("110") + 1, to: before.indexOf("110") + 3, insert: "45" })
    expect(apply(before, change)).toBe(after)
  })

  it("gives what was added or taken away at either end, and nothing when nothing changed", () => {
    for (const [from, to] of [["abc", "abcd"], ["abcd", "abc"], ["abc", "xabc"], ["xabc", "abc"], ["aaa", "aa"], ["", "abc"], ["abc", ""]]) {
      expect(apply(from, SightingFileEditor.changeBetween(from, to))).toBe(to)
    }
    expect(SightingFileEditor.changeBetween("same", "same")).toEqual({ from: 4, to: 4, insert: "" })
  })
})
