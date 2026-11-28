// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { HvsElement } from "../../src/component/HvsElement.js"
import { SightingHypotheses } from "../../src/component/SightingHypotheses.js"
import type { CaseJson } from "../../src/engine/persistence/caseJson.js"
import type { SightingRecordingJson } from "../../src/engine/persistence/sightingJson.js"
// S. Baron's fictitious case, as transcribed in docs/hvs.
import fictitiousCase from "../../docs/hvs/case.json"
import account from "../../docs/hvs/fictif-2026-001.json"
import lantern from "../../docs/hvs/lecture-lanterne.json"

async function until(check: () => boolean, timeoutMs = 10000): Promise<void> {
  const start = Date.now()
  while (!check()) {
    if (Date.now() - start > timeoutMs) throw new Error("timed out")
    await new Promise(resolve => setTimeout(resolve, 5))
  }
}

describe("rr0-hvs", () => {
  it("shows the weighing when unfolded after the chips of the observation have loaded it: it stayed empty under its title", async () => {
    HvsElement.register()
    const element = document.createElement(HvsElement.TAG) as HvsElement
    document.body.append(element)
    const caseJson = fictitiousCase as unknown as CaseJson
    const files: Record<string, unknown> = { temoin: account, "lecture-lanterne": lantern }
    element.show({
      caseJson: () => caseJson,
      recording: id => Promise.resolve(structuredClone(files[id]) as SightingRecordingJson | undefined),
      account: "temoin"
    })
    const details = () => element.shadowRoot!.querySelector("details")
    await until(() => details() !== null)
    // What the chips ask for (see SightingHypotheses): everything is loaded before the reader unfolds the table.
    expect(await element.weigh()).toBeDefined()

    const folded = details()!
    folded.open = true
    folded.dispatchEvent(new Event("toggle"))

    await until(() => details()!.querySelector("table") !== null)
    expect(details()!.open).toBe(true)
    expect(details()!.textContent).toContain("balloon / lantern")
  })

  it("stands hidden in the player until its chip opens it, unfolded, and goes back to the chip once folded", async () => {
    HvsElement.register()
    const element = document.createElement(HvsElement.TAG) as HvsElement
    element.onDemand = true
    document.body.append(element)
    element.scrollIntoView = () => {}
    const caseJson = fictitiousCase as unknown as CaseJson
    const files: Record<string, unknown> = { temoin: account, "lecture-lanterne": lantern }
    element.show({ caseJson: () => caseJson, recording: id => Promise.resolve(structuredClone(files[id]) as SightingRecordingJson | undefined), account: "temoin" })
    const details = () => element.shadowRoot!.querySelector("details")
    expect(element.hidden).toBe(true)
    expect(await element.weigh()).toBeDefined()
    expect(element.hidden).toBe(true)
    expect(details()).toBeNull()

    element.unfold()
    expect(element.hidden).toBe(false)
    await until(() => details()!.querySelector("table") !== null)
    expect(details()!.open).toBe(true)

    const open = details()!
    open.open = false
    open.dispatchEvent(new Event("toggle"))
    expect(element.hidden).toBe(true)
  })
})

describe("an unfolded chip's way to its detail", () => {
  it("ends the unfolded chip, opens the detail without folding the chip, and goes with the fold", () => {
    const item = document.createElement("span")
    const value = document.createElement("span")
    item.append(value)
    const entry = { group: "hypothesis" as const, field: SightingHypotheses.HVS_SECTION, label: "HVS", value: "ballon / lanterne 0,70…", unit: "",
      fromSource: false, about: "observation" as const, expandable: "ballon / lanterne — HVS 0,70\navion — HVS 0,00" }
    let opened = 0
    SightingHypotheses.fold(item, value, entry, new Set(), { label: "Détail élément par élément", open: () => opened++ })
    const link = () => item.querySelector("button.chip-more")
    expect(link()).toBeNull()

    item.click()
    expect(link()?.textContent).toBe("Détail élément par élément")
    ;(link() as HTMLButtonElement).click()
    expect(opened).toBe(1)
    expect(item.hasAttribute("data-expanded")).toBe(true)

    item.click()
    expect(link()).toBeNull()
  })
})
