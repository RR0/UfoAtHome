import { afterEach, describe, expect, test } from "vitest"
import { AuroraEditor } from "../../src/modules/sky-events/auroras/AuroraEditor.js"
import type { SkyEventsJson } from "../../src/engine/model/SkyEvents.js"
import { SaidTexts } from "../../src/engine/model/SaidText.js"
import type { Sighting } from "../../src/engine/model/Sighting.js"

describe("AuroraEditor", () => {
  const container = document.createElement("div")
  document.body.append(container)
  afterEach(() => container.replaceChildren())

  const build = async (skyEvents?: SkyEventsJson) => {
    const sighting = { skyEvents, event: { place: [{ lat: 69.7, lng: 18.6 }] } } as unknown as Sighting
    let changes = 0
    const editor = new AuroraEditor(container, {
      sighting: () => sighting,
      said: () => new SaidTexts(["en"]),
      writingLanguage: () => "en",
      currentTime: () => 0, duration: () => 600_000, seekTo: () => undefined,
      changed: () => changes++
    }, "en")
    await editor.ready
    editor.sync()
    return { sighting, editor, changes: () => changes }
  }
  const field = (key: string) => container.querySelector<HTMLInputElement>(`[data-key="${key}"]`)!
  const typed = (target: Element, value: string) => {
    ;(target as HTMLInputElement).value = value
    target.dispatchEvent(new Event("input", { bubbles: true }))
  }

  test("says the archive's aurora is shown while none is stated, and adds one of a disturbed field", async () => {
    const { sighting, changes } = await build()
    expect(container.textContent).toContain("GFZ")
    container.querySelector<HTMLButtonElement>("#aurora-add")!.click()
    expect(sighting.skyEvents!.auroras).toEqual([{ id: "aurora-1", kp: 5 }])
    expect(changes()).toBe(1)
  })

  test("an empty field shows what Kp implies, and follows it", async () => {
    await build({ auroras: [{ id: "a", kp: 5 }] })
    expect(field("edgeLatDeg").placeholder).toBe("56.3")
    typed(field("kp"), "9")
    expect(field("edgeLatDeg").placeholder).toBe("48.1")
  })

  test("what is typed is written onto the aurora, and the recording is told", async () => {
    const { sighting, changes } = await build({ auroras: [{ id: "a", kp: 5 }] })
    typed(field("redKR"), "4")
    expect(sighting.skyEvents!.auroras![0].redKR).toBe(4)
    expect(changes()).toBe(1)
  })

  test("deleting the last aurora leaves no event of the sky behind", async () => {
    const { sighting } = await build({ auroras: [{ id: "a", kp: 5 }] })
    container.querySelector<HTMLButtonElement>("#aurora-delete")!.click()
    expect(sighting.skyEvents).toBeUndefined()
  })
})
