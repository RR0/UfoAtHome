import { afterEach, describe, expect, test } from "vitest"
import { SearchlightEditor } from "../../src/modules/sky-events/searchlights/SearchlightEditor.js"
import type { SkyEventsJson } from "../../src/engine/model/SkyEvents.js"
import { SaidTexts } from "../../src/engine/model/SaidText.js"
import type { Sighting } from "../../src/engine/model/Sighting.js"

describe("SearchlightEditor", () => {
  const container = document.createElement("div")
  document.body.append(container)
  afterEach(() => container.replaceChildren())

  const build = async (skyEvents?: SkyEventsJson, placed = true) => {
    const sighting = { skyEvents, event: { place: placed ? [{ lat: 45.73, lng: 4.98 }] : [] } } as unknown as Sighting
    let changes = 0
    const editor = new SearchlightEditor(container, {
      sighting: () => sighting,
      said: () => new SaidTexts(["en"]),
      writingLanguage: () => "en",
      currentTime: () => 0, duration: () => 120_000, seekTo: () => undefined,
      changed: () => changes++
    }, "en")
    await editor.ready
    editor.sync()
    return { sighting, editor, changes: () => changes }
  }
  const field = (key: string) => container.querySelector<HTMLInputElement | HTMLSelectElement>(`[data-key="${key}"]`)
  const typed = (target: Element, value: string) => {
    ;(target as HTMLInputElement).value = value
    target.dispatchEvent(new Event("input", { bubbles: true }))
  }

  test("adds a four-headed skytracker beside the witness", async () => {
    const { sighting, changes } = await build()
    expect(container.textContent).toContain("clouds")
    container.querySelector<HTMLButtonElement>("#searchlight-add")!.click()
    expect(sighting.skyEvents!.searchlights).toEqual([{ id: "searchlight-1", lat: 45.73, lng: 4.98, beams: 4 }])
    expect(changes()).toBe(1)
  })

  test("cannot add one to a recording with no place, and says why", async () => {
    await build(undefined, false)
    expect(container.querySelector<HTMLButtonElement>("#searchlight-add")!.disabled).toBe(true)
    expect(container.textContent).toContain("place")
  })

  test("an empty field shows the skytracker's value, and the motion its beams imply", async () => {
    await build({ searchlights: [{ id: "s", lat: 45.75, lng: 4.95, beams: 4 }] })
    expect((field("intensityCd") as HTMLInputElement).placeholder).toBe("300000000")
    expect((field("divergenceDeg") as HTMLInputElement).placeholder).toBe("1")
    // The sweep's width is only for a sweep: a cloverleaf has none.
    const spread = field("spreadDeg")!
    expect((spread.closest("label, .parameter-row") as HTMLElement).hidden).toBe(true)
    expect((field("periodS")!.closest("label, .parameter-row") as HTMLElement).hidden).toBe(false)
  })

  test("what is typed is written onto the searchlight, and the recording is told", async () => {
    const { sighting, changes } = await build({ searchlights: [{ id: "s", lat: 45.75, lng: 4.95, beams: 4 }] })
    typed(field("periodS")!, "6")
    expect(sighting.skyEvents!.searchlights![0].periodS).toBe(6)
    expect(changes()).toBe(1)
  })

  test("deleting the last searchlight leaves no event of the sky behind", async () => {
    const { sighting } = await build({ searchlights: [{ id: "s", lat: 45.75, lng: 4.95 }] })
    container.querySelector<HTMLButtonElement>("#searchlight-delete")!.click()
    expect(sighting.skyEvents).toBeUndefined()
  })
})
