import { describe, expect, it } from "vitest"
import { resolveMilestoneAt, sortedMilestones } from "../../../src/engine/model/Milestone.js"
import type { Milestone } from "../../../src/engine/model/Milestone.js"

/** Socorro's own six, as the Blue Book sketch letters them. */
const SOCORRO: Milestone[] = [
  { t: 75000, label: "E", note: "Deux bruits sourds, un rugissement, un insigne rouge." },
  { t: 0, label: "A", note: "Un rugissement et une flamme dans le ciel." },
  { t: 15000, label: "B", note: "Le son passe de l'aigu au grave, puis s'arrête." }
]

describe("sortedMilestones", () => {
  it("puts them in the order they happen, whatever order the file was written in", () => {
    expect(sortedMilestones(SOCORRO).map(milestone => milestone.label)).toEqual(["A", "B", "E"])
  })

  it("copies rather than sorting the recording's own array in place", () => {
    const original = [...SOCORRO]
    sortedMilestones(SOCORRO)
    expect(SOCORRO).toEqual(original)
  })
})

describe("resolveMilestoneAt", () => {
  it("names nothing before the first one", () => {
    expect(resolveMilestoneAt([{ t: 5000, label: "A" }], 4999)).toBeUndefined()
  })

  it("holds the last one reached, which is what lets a player say which part of the account is on screen", () => {
    // Hold-last-value, the same resolution as every keyframed field in this model: a moment named
    // at 15 s is still the moment the recording is in at 20 s.
    expect(resolveMilestoneAt(SOCORRO, 0)?.label).toBe("A")
    expect(resolveMilestoneAt(SOCORRO, 14999)?.label).toBe("A")
    expect(resolveMilestoneAt(SOCORRO, 15000)?.label).toBe("B")
    expect(resolveMilestoneAt(SOCORRO, 20000)?.label).toBe("B")
    expect(resolveMilestoneAt(SOCORRO, 120000)?.label).toBe("E")
  })

  it("answers from an unsorted array too — a hand-edited file is not obliged to be in order", () => {
    expect(resolveMilestoneAt(SOCORRO, 80000)?.label).toBe("E")
  })

  it("names nothing at all when the recording bookmarks nothing, which is most of them", () => {
    expect(resolveMilestoneAt([], 1000)).toBeUndefined()
  })
})
