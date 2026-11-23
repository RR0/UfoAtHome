import { afterEach, describe, expect, it } from "vitest"
import { OrientationsElement, register } from "../../src/component/OrientationsElement.js"
import type { OrientationResults } from "../../src/engine/orientation/OrientationProvider.js"

register()

const results: OrientationResults = {
  provider: "tool",
  engine: { name: "Tool", version: "2.1" },
  reference: { sha256: "ABC123", date: "2026-11-13", note: { en: "Scores of an earlier reference", fr: "Scores d'un référentiel antérieur" } },
  computed: "2026-11-20",
  profiles: [{
    id: "P1", title: { en: "Orange orb", fr: "Orbe orange" },
    episodes: [{ event: "w1", digest: "d1" }, { event: "w2", digest: "d2" }, { event: "w3" }],
    configurations: [{ label: { en: "All", fr: "Tous" }, population: 4633, top: [{ rank: 1, family: "fam-a", score: 0.31862 }, { rank: 2, family: "fam-b", label: "Family B", score: 0.25 }] }]
  }]
}

const make = async (lang: string): Promise<OrientationsElement> => {
  const element = document.createElement(OrientationsElement.TAG) as OrientationsElement
  element.setAttribute("lang", lang)
  document.body.append(element)
  element.results = [results]
  element.digests = new Map([["w1", "d1"], ["w2", "changed"]])
  element.labels = new Map([["w1", "Witness 1"]])
  await element.ready
  return element
}

describe("OrientationsElement", () => {
  afterEach(() => {
    document.body.innerHTML = ""
  })

  it("shows the indicators apart, with what they are not, the engine, the reference and when they were computed", async () => {
    const text = (await make("fr")).shadowRoot!.textContent!
    expect(text).toContain("Indicateurs statistiques")
    expect(text).toContain("jamais la probabilité")
    expect(text).toContain("Tool, version 2.1")
    expect(text).toContain("ABC123")
    expect(text).toContain("2026-11-13")
    expect(text).toContain("Calculé le 2026-11-20")
    expect(text).toContain("Scores d'un référentiel antérieur")
  })

  it("shows each setting's ranks and scores, a family by its name when the tool gives one", async () => {
    const root = (await make("en")).shadowRoot!
    const rows = [...root.querySelectorAll("tr")].slice(1).map(row => [...row.cells].map(cell => cell.textContent))
    expect(rows).toEqual([["1", "fam-a", "0.3186"], ["2", "Family B", "0.2500"]])
    expect(root.querySelector("caption")!.textContent).toBe("All · 4,633 cases")
  })

  it("names the episodes as the case does, and says which were coded on a version that changed since, or on one not known", async () => {
    const episodes = (await make("en")).shadowRoot!.querySelector(".episodes")!
    expect(episodes.textContent).toBe("Episodes: Witness 1, w2 (coded on a version of the recording that has changed since), w3 (the version coded is not known)")
    expect(episodes.querySelectorAll(".stale")).toHaveLength(1)
  })

  it("says of a profile with no ranks that it is not ranked yet", async () => {
    const element = await make("en")
    element.results = [{ ...results, profiles: [{ id: "P2", episodes: [{ event: "w1" }], configurations: [] }] }]
    await element.ready
    expect(element.shadowRoot!.querySelector(".profile")!.textContent).toContain("Not ranked yet.")
  })

  it("says when there is nothing to show", async () => {
    const element = await make("es")
    element.results = []
    await element.ready
    expect(element.shadowRoot!.textContent).toContain("Ningún indicador estadístico")
  })
})
