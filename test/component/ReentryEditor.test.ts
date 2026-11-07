import { afterEach, describe, expect, test } from "vitest"
import { ReentryEditor } from "../../src/component/ReentryEditor.js"
import type { ReentryJson } from "../../src/engine/interpretation/Reentry.js"
import { SaidTexts } from "../../src/engine/model/SaidText.js"
import type { Sighting } from "../../src/engine/model/Sighting.js"
import type { SkyEventsJson } from "../../src/engine/model/SkyEvents.js"

const chelyabinsk = (): ReentryJson => ({
  id: "chelyabinsk",
  track: [{ t: -2000, lat: 54.5, lng: 64, altitudeKm: 95 }, { t: 10300, lat: 54.9, lng: 61, altitudeKm: 30 }],
  fragments: [{ id: "main", absoluteMagnitude: -27.5, lightCurve: [{ t: -2000, absoluteMagnitude: -3 }, { t: 9000, absoluteMagnitude: -27.5 }] }]
})

describe("ReentryEditor", () => {
  const container = document.createElement("div")
  document.body.append(container)
  afterEach(() => container.replaceChildren())

  const build = (skyEvents?: SkyEventsJson) => {
    const sighting = { skyEvents, event: { place: [{ lat: 48, lng: 2 }] }, observerTrack: { getInterpolatedPoseAt: () => ({ headingDeg: 90 }) } } as unknown as Sighting
    let changes = 0
    const editor = new ReentryEditor(container, { sighting: () => sighting, said: () => new SaidTexts(["en"]), writingLanguage: () => "en", changed: () => changes++ }, "en")
    editor.sync()
    return { sighting, changes: () => changes }
  }
  const typed = (target: Element, value: string) => {
    ;(target as HTMLInputElement).value = value
    target.dispatchEvent(new Event("input", { bubbles: true }))
  }

  test("adds a fireball in front of the observer, under the recording's events of the sky", () => {
    const { sighting, changes } = build()
    container.querySelector<HTMLButtonElement>("#reentry-add")!.click()
    container.querySelector<HTMLElement>("#reentry-add-fireball")?.click()
    const reentries = sighting.skyEvents!.reentries!
    expect(reentries).toHaveLength(1)
    expect(reentries[0].id).toBe("fireball-1")
    expect(reentries[0].track).toHaveLength(2)
    // East of the observer, who faces east.
    expect(reentries[0].track[0].lng).toBeGreaterThan(2)
    expect(reentries[0].fragments[0].absoluteMagnitude).toBeLessThanOrEqual(-4)
    expect(changes()).toBeGreaterThan(0)
  })

  test("writes an edit of the path as a new re-entry in a new list, so that the scene sees it", () => {
    const reentry = chelyabinsk()
    const { sighting } = build({ reentries: [reentry] })
    const before = sighting.skyEvents!.reentries!
    typed(container.querySelector('#reentry-place-parameters [data-key="altitudeKm"]')!, "96")
    const after = sighting.skyEvents!.reentries!
    expect(after).not.toBe(before)
    expect(after[0]).not.toBe(reentry)
    expect(after[0].track[0].altitudeKm).toBe(96)
    expect(reentry.track[0].altitudeKm).toBe(95)
  })

  test("edits a piece's brightness and its light curve, keeping one piece at least", () => {
    const { sighting } = build({ reentries: [chelyabinsk()] })
    typed(container.querySelector('#reentry-fragment-parameters [data-key="absoluteMagnitude"]')!, "-27")
    expect(sighting.skyEvents!.reentries![0].fragments[0].absoluteMagnitude).toBe(-27)
    expect(container.querySelector<HTMLButtonElement>("#reentry-fragment-delete")!.disabled).toBe(true)
    typed(container.querySelector('#reentry-curve-parameters [data-key="absoluteMagnitude"]')!, "-4")
    expect(sighting.skyEvents!.reentries![0].fragments[0].lightCurve![0].absoluteMagnitude).toBe(-4)
    container.querySelector<HTMLButtonElement>("#reentry-curve-add")!.click()
    expect(sighting.skyEvents!.reentries![0].fragments[0].lightCurve).toHaveLength(3)
    container.querySelector<HTMLButtonElement>("#reentry-fragment-add")!.click()
    expect(sighting.skyEvents!.reentries![0].fragments).toHaveLength(2)
    expect(sighting.skyEvents!.reentries![0].fragments[1].lagS).toBe(1)
  })

  test("deleting the last re-entry leaves no event of the sky behind", () => {
    const { sighting } = build({ reentries: [chelyabinsk()] })
    container.querySelector<HTMLButtonElement>("#reentry-delete")!.click()
    expect(sighting.skyEvents).toBeUndefined()
  })
})
