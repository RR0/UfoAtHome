import { describe, expect, it } from "vitest"
import { CaseTimeline, type CaseEventKind } from "../../src/component/CaseTimeline.js"

interface Item {
  id: string
  kind: CaseEventKind
  when: string
  reads?: string
}

const words = { kindObservation: "Observation", kindReading: "Reading", kindInterview: "Interview", openEvent: "Open", linkAnd: "and", byAuthor: "by" }

describe("CaseTimeline", () => {
  it("puts an undated reading after the account it reads, and an account before its readings at the same time", () => {
    const items: Item[] = [
      { id: "undated reading of b", kind: "reading", when: "", reads: "b" },
      { id: "b", kind: "observation", when: "1990-02" },
      { id: "a", kind: "observation", when: "1990-01" },
      { id: "dated reading of a", kind: "reading", when: "1990-01" },
      { id: "interview", kind: "interview", when: "1990-03" }
    ]
    const byId = new Map(items.map(item => [item.id, item]))
    const sorted = CaseTimeline.inTime(items, {
      when: item => item.when, kind: item => item.kind, read: item => item.reads ? [byId.get(item.reads)!] : []
    })
    expect(sorted.map(({ item }) => item.id)).toEqual(["a", "dated reading of a", "b", "undated reading of b", "interview"])
    expect(sorted.map(({ index }) => index)).toEqual([2, 3, 1, 0, 4])
  })

  it("draws a card per event on the rail, its renvois listed as a sentence and lighting the card they lead to", () => {
    const list = document.createElement("ol")
    document.body.append(list)
    const followed: number[] = []
    const chosen: number[] = []
    new CaseTimeline(list, at => chosen.push(at), at => followed.push(at)).render([
      { at: 0, kind: "observation", title: "A", meta: "1990" },
      { at: 1, kind: "observation", title: "B", meta: "1990" },
      { at: 2, kind: "observation", title: "C", meta: "1990" },
      { at: 3, kind: "reading", title: "R", meta: "", by: "Z", open: true,
        links: { heading: "Reading of", to: [{ at: 0, title: "A" }, { at: 1, title: "B" }, { at: 2, title: "C" }] } }
    ], words)
    const cards = [...list.querySelectorAll<HTMLElement>(".event-card")]
    expect(cards.map(card => card.dataset.kind)).toEqual(["observation", "observation", "observation", "reading"])
    expect(cards[3].dataset.open).toBe("")
    expect(cards[3].querySelector(".event-links")!.textContent).toBe("Reading of A, B and C by Z")
    const ref = cards[3].querySelectorAll<HTMLButtonElement>(".event-ref")[1]
    ref.dispatchEvent(new Event("mouseenter"))
    expect([...list.querySelectorAll<HTMLElement>(".event-aimed")].map(card => card.dataset.at)).toEqual(["1"])
    ref.click()
    cards[2].querySelector<HTMLButtonElement>(".event-open")!.click()
    expect(followed).toEqual([1])
    expect(chosen).toEqual([2])
    list.remove()
  })
})
