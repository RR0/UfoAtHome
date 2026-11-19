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

  it("sets each reading under every observation it reads, after that observation's earlier readings", () => {
    const items: Item[] = [
      { id: "a", kind: "observation", when: "1990-01" },
      { id: "b", kind: "observation", when: "1990-02" },
      { id: "reading of a", kind: "reading", when: "1990-03", reads: "a" },
      { id: "interview", kind: "interview", when: "1990-04" },
      { id: "later reading of a", kind: "reading", when: "2000", reads: "a" },
      { id: "reading of b", kind: "reading", when: "2001", reads: "b" },
      { id: "reading of nothing", kind: "reading", when: "2002" },
      { id: "reading of both", kind: "reading", when: "2003", reads: "a b" }
    ]
    const byId = new Map(items.map(item => [item.id, item]))
    const grouped = CaseTimeline.grouped(items.map((item, index) => ({ item, index })), {
      kind: item => item.kind, read: item => item.reads ? item.reads.split(" ").map(id => byId.get(id)!) : []
    })
    expect(grouped.map(({ item }) => item.id)).toEqual(["a", "reading of a", "later reading of a", "reading of both", "b", "reading of b",
      "reading of both", "interview", "reading of nothing"])
    expect(grouped.map(({ under }) => under?.id)).toEqual([undefined, "a", "a", "a", undefined, "b", "b", undefined, undefined])
  })

  it("lets the mark on the rail show an event beside the others, where the host lets several be open", () => {
    const list = document.createElement("ol")
    const toggled: number[] = []
    const chosen: number[] = []
    new CaseTimeline(list, at => chosen.push(at), undefined, at => toggled.push(at)).render([
      { at: 0, kind: "observation", title: "A", meta: "", open: true },
      { at: 1, kind: "reading", title: "R", meta: "", nested: true }
    ], { ...words, toggleEvent: "Toggle" })
    const marks = [...list.querySelectorAll<HTMLButtonElement>("button.event-mark")]
    expect(marks.map(mark => mark.getAttribute("aria-pressed"))).toEqual(["true", "false"])
    expect(list.querySelectorAll(".event-card")[1].hasAttribute("data-nested")).toBe(true)
    marks[1].click()
    expect(toggled).toEqual([1])
    expect(chosen).toEqual([])
    // Without a toggle, the mark is a picture of the kind, not a button.
    new CaseTimeline(list, () => undefined).render([{ at: 0, kind: "observation", title: "A", meta: "" }], words)
    expect(list.querySelector("button.event-mark")).toBeNull()
    expect(list.querySelector("span.event-mark")!.getAttribute("aria-hidden")).toBe("true")
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
    const ref = cards[3].querySelectorAll<HTMLElement>(".event-ref")[1]
    ref.dispatchEvent(new Event("mouseenter"))
    expect([...list.querySelectorAll<HTMLElement>(".event-aimed")].map(card => card.dataset.at)).toEqual(["1"])
    ref.click()
    cards[2].querySelector<HTMLButtonElement>(".event-open")!.click()
    expect(followed).toEqual([1])
    expect(chosen).toEqual([2])
    list.remove()
  })
})
