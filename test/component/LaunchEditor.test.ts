import { afterEach, describe, expect, test } from "vitest"
import { LaunchEditor } from "../../src/component/LaunchEditor.js"
import type { InterpretationJson } from "../../src/engine/interpretation/Interpretation.js"
import { SaidTexts } from "../../src/engine/model/SaidText.js"
import type { Sighting } from "../../src/engine/model/Sighting.js"

const track = [{ t: 0, lat: 28, lng: -80, altitudeKm: 0 }, { t: 60000, lat: 30, lng: -78, altitudeKm: 150 }]

const stated = (): InterpretationJson => ({
  bodies: [],
  launches: [
    { id: "a", title: { en: "First" }, vehicle: { name: "Falcon 9", engine: { thrustKN: 934, specificImpulseS: 348, propellant: "rp1-lox" } }, track },
    { id: "b", track }
  ]
})

describe("LaunchEditor", () => {
  const container = document.createElement("div")
  document.body.append(container)
  afterEach(() => container.replaceChildren())

  const build = (interpretation: InterpretationJson | null = stated()) => {
    const sighting = { interpretation: interpretation ?? undefined } as Sighting
    let changes = 0
    const editor = new LaunchEditor(container, {
      sighting: () => sighting,
      said: () => new SaidTexts(["en"]),
      writingLanguage: () => "en",
      changed: () => changes++
    }, "en")
    editor.sync()
    return { sighting, editor, changes: () => changes }
  }
  const field = (key: string) => container.querySelector<HTMLInputElement>(`[data-key="${key}"]`)!
  const typed = (target: Element, value: string) => {
    ;(target as HTMLInputElement).value = value
    target.dispatchEvent(new Event("input", { bubbles: true }))
  }

  test("lists the launches and shows the first one's fields, drawn from what the launch kind publishes", () => {
    build()
    expect([...container.querySelectorAll<HTMLOptionElement>("#launch-select option")].map(option => option.textContent)).toEqual(["First (a)", "b"])
    expect(field("vehicle.engine.thrustKN").value).toBe("934")
    expect(field("vehicle.engine.propellant").value).toBe("rp1-lox")
    expect(container.querySelector("#launch-track")!.textContent).toBe("2 points from 0 s to 60 s, up to 150 km")
  })

  test("an empty field shows what the plume will use, which follows the engine", () => {
    build()
    expect(field("plume.exhaustKgPerS").placeholder).toBe("273.68")
    typed(field("vehicle.engine.thrustKN"), "3000")
    expect(field("plume.exhaustKgPerS").placeholder).toBe("879.07")
  })

  test("what is typed is written onto the launch, and the recording is told", () => {
    const { sighting, changes } = build()
    typed(field("plume.collarShare"), "0.5")
    expect(sighting.interpretation!.launches![0].plume).toEqual({ collarShare: 0.5 })
    expect(changes()).toBe(1)
    typed(field("plume.collarShare"), "")
    expect(sighting.interpretation!.launches![0].plume).toBeUndefined()
  })

  test("the other launch has its own fields", () => {
    const { editor } = build()
    editor.show("b")
    expect(field("vehicle.engine.thrustKN").value).toBe("")
    expect(field("plume.exhaustKgPerS").placeholder).toBe("273")
  })

  test("renaming a launch writes its title in the writing language and updates the list", () => {
    const { sighting } = build()
    typed(field("title"), "Renamed")
    expect(sighting.interpretation!.launches![0].title).toEqual({ en: "Renamed" })
    expect(container.querySelector<HTMLOptionElement>("#launch-select option")!.textContent).toBe("Renamed (a)")
  })

  test("deleting a launch leaves the other, and the last one leaves no interpretation behind", () => {
    const { sighting } = build()
    container.querySelector<HTMLButtonElement>("#launch-delete")!.click()
    expect(sighting.interpretation!.launches!.map(launch => launch.id)).toEqual(["b"])
    container.querySelector<HTMLButtonElement>("#launch-delete")!.click()
    expect(sighting.interpretation).toBeUndefined()
    expect(container.querySelector<HTMLElement>("#launch-none")!.hidden).toBe(false)
  })

  test("a recording with no interpretation says there is no launch", () => {
    build(null)
    expect(container.querySelector<HTMLElement>("#launch-none")!.hidden).toBe(false)
    expect(container.querySelector<HTMLElement>("#launch-fields")!.hidden).toBe(true)
  })

  test("refresh leaves the fields alone while the same launches are on show, and redraws for others", () => {
    const { sighting, editor } = build()
    const first = field("plume.collarShare")
    editor.refresh()
    expect(field("plume.collarShare")).toBe(first)
    sighting.interpretation = { bodies: [], launches: [{ id: "z", track }] }
    editor.refresh()
    expect([...container.querySelectorAll<HTMLOptionElement>("#launch-select option")].map(option => option.value)).toEqual(["z"])
  })
})
