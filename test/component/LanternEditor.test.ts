import { afterEach, describe, expect, test } from "vitest"
import { LanternEditor } from "../../src/component/LanternEditor.js"
import type { InterpretationJson } from "../../src/engine/interpretation/Interpretation.js"
import { SaidTexts } from "../../src/engine/model/SaidText.js"
import type { Sighting } from "../../src/engine/model/Sighting.js"
import { WeatherTrack } from "../../src/engine/model/WeatherTrack.js"

describe("LanternEditor", () => {
  const container = document.createElement("div")
  document.body.append(container)
  afterEach(() => container.replaceChildren())

  const build = (interpretation?: InterpretationJson, place = true) => {
    const sighting = {
      interpretation,
      event: { place: place ? [{ lat: 48, lng: 2 }] : [] },
      observerTrack: { getInterpolatedPoseAt: () => ({ headingDeg: 90, lat: 48, lng: 2 }) },
      weatherTrack: new WeatherTrack()
    } as unknown as Sighting
    let changes = 0
    const editor = new LanternEditor(container, {
      sighting: () => sighting, said: () => new SaidTexts(["en"]), writingLanguage: () => "en", shapes: () => [{ id: "light-1", label: "Light 1" }],
      changed: () => changes++
    }, "en")
    editor.sync()
    return { sighting, changes: () => changes }
  }
  const typed = (target: Element, value: string) => {
    ;(target as HTMLInputElement).value = value
    target.dispatchEvent(new Event("input", { bubbles: true }))
  }

  test("adds a dozen lanterns let go in front of the observer, read into the account beside its bodies", () => {
    const body = { id: "b", model: { id: "sphere" }, track: [] }
    const { sighting, changes } = build({ bodies: [body] })
    container.querySelector<HTMLButtonElement>("#lantern-add")!.click()
    const launches = sighting.interpretation!.lanterns!
    expect(launches).toHaveLength(1)
    expect(launches[0].group!.count).toBe(12)
    // A kilometre and a half east: the way the observer faces.
    expect(launches[0].site.eastM).toBeCloseTo(1500, -1)
    expect(Math.abs(launches[0].site.northM)).toBeLessThan(5)
    expect(sighting.interpretation!.bodies).toEqual([body])
    expect(changes()).toBe(1)
  })

  test("writes an edit as a new launch in a new interpretation, so that the scene computes the lanterns again", () => {
    const launch = { id: "l", site: { eastM: 100, northM: 200 }, group: { count: 12, fromT: 0, untilT: 60000 } }
    const { sighting } = build({ bodies: [], lanterns: [launch] })
    const before = sighting.interpretation
    typed(container.querySelector('[data-key="group.count"]')!, "5")
    expect(sighting.interpretation).not.toBe(before)
    expect(sighting.interpretation!.lanterns![0].group!.count).toBe(5)
    expect(launch.group.count).toBe(12)
    typed(container.querySelector('[data-key="turbulence.horizontalMS"]')!, "0")
    expect(sighting.interpretation!.lanterns![0].turbulence!.horizontalMS).toBe(0)
  })

  test("deleting the last lanterns leaves no interpretation behind when it says nothing else, and keeps it when it does", () => {
    const launch = { id: "l", site: { eastM: 100, northM: 200 }, group: { count: 12, fromT: 0, untilT: 60000 } }
    const alone = build({ bodies: [], lanterns: [launch] })
    container.querySelector<HTMLButtonElement>("#lantern-delete")!.click()
    expect(alone.sighting.interpretation).toBeUndefined()
    container.replaceChildren()
    const withBodies = build({ bodies: [{ id: "b", model: { id: "sphere" }, track: [] }], lanterns: [launch] })
    container.querySelector<HTMLButtonElement>("#lantern-delete")!.click()
    expect(withBodies.sighting.interpretation!.bodies).toHaveLength(1)
    expect(withBodies.sighting.interpretation!.lanterns).toBeUndefined()
  })

  test("adds none to a recording with no place to let them go from", () => {
    const { sighting } = build(undefined, false)
    const add = container.querySelector<HTMLButtonElement>("#lantern-add")!
    add.click()
    expect(sighting.interpretation).toBeUndefined()
  })
})
