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

describe("SightingFileEditor marks", () => {
  it("marks the same lines as a diff of the whole texts, comparing only what lies between their common ends", async () => {
    const { LineDiff } = await import("../../src/component/LineDiff.js")
    // A seeded walk of edits, so that a failure is the same failure each time.
    let seed = 7
    const random = (n: number) => {
      seed = (seed * 1103515245 + 12345) % 2147483648
      return seed % n
    }
    const baseline = Array.from({ length: 40 }, (_, i) => `  "k${i}": ${i},`)
    const host = document.createElement("div")
    document.body.append(host)
    const editor = new SightingFileEditor(host, baseline.join("\n"), () => undefined, "label")
    const marks = () => {
      const internal = editor as unknown as { view: { state: { field(field: unknown): { changed: Set<number>, removed: Set<number> } } }, changedField: unknown }
      return internal.view.state.field(internal.changedField)
    }
    let lines = [...baseline]
    for (let step = 0; step < 300; step++) {
      const at = random(lines.length + 1)
      const kind = random(3)
      if (kind === 0) lines.splice(at, 0, `  "new${step}": ${step},`)
      else if (kind === 1 && lines.length > 1) lines.splice(Math.min(at, lines.length - 1), 1)
      else lines[Math.min(at, lines.length - 1)] = `  "changed${step}": ${step},`
      // Now and then, back to what was saved: no mark at all.
      if (random(25) === 0) lines = [...baseline]
      editor.replaceText(lines.join("\n"), false)
      const expected = LineDiff.compare(baseline, lines)
      expect([...marks().changed].sort((a, b) => a - b)).toEqual(expected.changed)
      expect([...marks().removed].sort((a, b) => a - b)).toEqual(expected.removed)
    }
    editor.destroy()
  })
})

describe("SightingFileEditor common ends", () => {
  it("finds them across the chunks it compares at once, whatever chunk the difference falls in", () => {
    const base = "x".repeat(200_000)
    for (const at of [0, 1, 65_535, 65_536, 65_537, 131_071, 131_072, 199_999]) {
      const changed = base.slice(0, at) + "y" + base.slice(at + 1)
      expect(SightingFileEditor.commonPrefix(base, changed)).toBe(at)
      expect(SightingFileEditor.commonSuffix(base, changed, base.length)).toBe(base.length - 1 - at)
    }
    expect(SightingFileEditor.commonPrefix(base, base + "z")).toBe(base.length)
    expect(SightingFileEditor.commonSuffix("z" + base, base, base.length)).toBe(base.length)
  })
})
