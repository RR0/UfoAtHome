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

describe("SightingFileEditor.changesBetween", () => {
  const apply = (text: string, changes: Array<{ from: number, to: number, insert: string }>) =>
    [...changes].reverse().reduce((at, change) => at.slice(0, change.from) + change.insert + at.slice(change.to), text)

  it("gives, line by line, what turns one text into the other, whether lines were changed, added or taken away", () => {
    let seed = 11
    const random = (n: number) => {
      seed = (seed * 1103515245 + 12345) % 2147483648
      return seed % n
    }
    for (let round = 0; round < 400; round++) {
      const lines = Array.from({ length: 1 + random(30) }, (_, i) => `  "k${i}": ${random(5)},`)
      const after = [...lines]
      for (let edit = random(6); edit > 0; edit--) {
        const at = random(after.length)
        const kind = random(4)
        if (kind === 0) after.splice(at, 0, `  "n${round}": 1,`)
        else if (kind === 1 && after.length > 1) after.splice(at, 1)
        else after[at] = `${after[at]}x`
      }
      const from = lines.join("\n")
      const to = after.join("\n")
      const changes = SightingFileEditor.changesBetween(from, to)
      expect(apply(from, changes)).toBe(to)
      // In order and apart: what an editor is given in one go.
      for (let i = 1; i < changes.length; i++) expect(changes[i].from).toBeGreaterThan(changes[i - 1].to)
    }
  })

  it("gives one change per run of lines changed in place, however far apart", () => {
    const before = Array.from({ length: 1000 }, (_, i) => `  "azimuthDeg": ${i},`)
    const after = before.map((line, i) => i % 100 === 0 ? `${line} ` : line)
    const changes = SightingFileEditor.changesBetween(before.join("\n"), after.join("\n"))
    expect(changes).toHaveLength(10)
    expect(changes.every(change => !change.insert.includes("\n"))).toBe(true)
  })
})
