// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { HvsElement } from "../../src/component/HvsElement.js"
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
})
