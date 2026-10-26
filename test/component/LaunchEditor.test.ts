import { afterEach, describe, expect, test } from "vitest"
import { LaunchEditor } from "../../src/component/LaunchEditor.js"
import type { SkyEventsJson } from "../../src/engine/model/SkyEvents.js"
import { SaidTexts } from "../../src/engine/model/SaidText.js"
import type { Sighting } from "../../src/engine/model/Sighting.js"

const track = [{ t: 0, lat: 28, lng: -80, altitudeKm: 0 }, { t: 60000, lat: 30, lng: -78, altitudeKm: 150 }]

const stated = (): SkyEventsJson => ({
  launches: [
    { id: "a", title: { en: "First" }, vehicle: { name: "Falcon 9", engine: { thrustKN: 934, specificImpulseS: 348, propellant: "rp1-lox" } }, track },
    { id: "b", track }
  ]
})

describe("LaunchEditor", () => {
  const container = document.createElement("div")
  document.body.append(container)
  afterEach(() => container.replaceChildren())

  const build = (skyEvents: SkyEventsJson | null = stated()) => {
    const sighting = { skyEvents: skyEvents ?? undefined, event: { place: [{ lat: 48, lng: 2 }] }, observerTrack: { getInterpolatedPoseAt: () => ({ headingDeg: 90 }) } } as unknown as Sighting
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
    expect(sighting.skyEvents!.launches![0].plume).toEqual({ collarShare: 0.5 })
    expect(changes()).toBe(1)
    typed(field("plume.collarShare"), "")
    expect(sighting.skyEvents!.launches![0].plume).toBeUndefined()
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
    expect(sighting.skyEvents!.launches![0].title).toEqual({ en: "Renamed" })
    expect(container.querySelector<HTMLOptionElement>("#launch-select option")!.textContent).toBe("Renamed (a)")
  })

  test("deleting a launch leaves the other, and the last one leaves no event of the sky behind", () => {
    const { sighting } = build()
    container.querySelector<HTMLButtonElement>("#launch-delete")!.click()
    expect(sighting.skyEvents!.launches!.map(launch => launch.id)).toEqual(["b"])
    container.querySelector<HTMLButtonElement>("#launch-delete")!.click()
    expect(sighting.skyEvents).toBeUndefined()
    expect(container.querySelector<HTMLElement>("#launch-list .element-list-empty")!.hidden).toBe(false)
  })

  test("a recording with no interpretation says there is no launch", () => {
    build(null)
    expect(container.querySelector<HTMLElement>("#launch-list .element-list-empty")!.hidden).toBe(false)
    expect(container.querySelector<HTMLElement>("#launch-fields")!.hidden).toBe(true)
  })

  test("refresh leaves the fields alone while the same launches are on show, and redraws for others", () => {
    const { sighting, editor } = build()
    const first = field("plume.collarShare")
    editor.refresh()
    expect(field("plume.collarShare")).toBe(first)
    sighting.skyEvents = { launches: [{ id: "z", track }] }
    editor.refresh()
    expect([...container.querySelectorAll<HTMLOptionElement>("#launch-select option")].map(option => option.value)).toEqual(["z"])
  })

  test("adds a launch with a placeholder path in front of the observer, even to a recording with no interpretation", () => {
    const { sighting, changes } = build(null)
    container.querySelector<HTMLButtonElement>("#launch-add-falcon-9")!.click()
    const launches = sighting.skyEvents!.launches!
    expect(launches).toHaveLength(1)
    expect(launches[0].id).toBe("launch-1")
    expect(launches[0].vehicle?.name).toBe("Falcon 9")
    // The observer faces east: the stage climbs to the east of them, at the latitude they stand at.
    expect(launches[0].track[0].lng).toBeGreaterThan(2)
    expect(launches[0].track[0].lat).toBeCloseTo(48, 1)
    expect(launches[0].track).toHaveLength(2)
    expect(changes()).toBe(1)
    expect(container.querySelector<HTMLElement>("#launch-list .element-list-empty")!.hidden).toBe(true)
    expect(container.querySelector<HTMLSelectElement>("#launch-select")!.value).toBe("launch-1")
    // The vehicle is the one picked in the menu of the "+", and is not a field: another vehicle is another launch.
    expect(container.querySelector('[data-key="vehicle.name"]')).toBeNull()
  })

  test("numbers a new launch past the ones that exist, and selects it", () => {
    const { sighting } = build()
    container.querySelector<HTMLButtonElement>("#launch-add-falcon-9")!.click()
    container.querySelector<HTMLButtonElement>("#launch-add-falcon-9")!.click()
    expect(sighting.skyEvents!.launches!.map(launch => launch.id)).toEqual(["a", "b", "launch-3", "launch-4"])
    expect(container.querySelector<HTMLSelectElement>("#launch-select")!.value).toBe("launch-4")
  })

  test("cannot add a launch to a recording with no place, and says why", () => {
    const sighting = { interpretation: undefined, event: {}, observerTrack: { getInterpolatedPoseAt: () => undefined } } as unknown as Sighting
    const editor = new LaunchEditor(container, { sighting: () => sighting, said: () => new SaidTexts(["en"]), writingLanguage: () => "en", changed: () => undefined }, "en")
    editor.sync()
    const add = container.querySelector<HTMLButtonElement>("#launch-add")!
    expect(add.disabled).toBe(true)
    expect(add.title).not.toBe("")
    // A place given afterwards, in the Position group, is read when the part is shown again, the launches being the same.
    ;(sighting.event as { place?: unknown }).place = [{ lat: 48, lng: 2 }]
    editor.refresh()
    expect(add.disabled).toBe(false)
    expect(container.querySelector<HTMLElement>(".add-reason")!.hidden).toBe(true)
  })

  test("the burn times are typed in seconds and written in milliseconds, and an empty one shows the end of the path", () => {
    const { sighting } = build()
    // The path of the fixture goes from 0 to 60 s: where the engine burns when the launch says nothing.
    expect(field("burnFromT").placeholder).toBe("0")
    expect(field("burnUntilT").placeholder).toBe("60")
    typed(field("burnUntilT"), "45.5")
    expect(sighting.skyEvents!.launches![0].burnUntilT).toBe(45500)
    typed(field("burnFromT"), "-3")
    expect(sighting.skyEvents!.launches![0].burnFromT).toBe(-3000)
    typed(field("burnUntilT"), "")
    expect(sighting.skyEvents!.launches![0].burnUntilT).toBeUndefined()
  })

  const placeCell = (key: string) => container.querySelector<HTMLInputElement>(`#launchPlace\\.${key}`)!

  test("the path is edited one place at a time: a picker of instants, and the fields of the place picked", () => {
    const { sighting } = build()
    expect([...container.querySelectorAll<HTMLOptionElement>("#launch-place option")].map(option => option.textContent)).toEqual(["0 s", "60 s"])
    expect(placeCell("t").value).toBe("0")
    expect(placeCell("altitudeKm").value).toBe("0")
    const select = container.querySelector<HTMLSelectElement>("#launch-place")!
    select.value = "1"
    select.dispatchEvent(new Event("change", { bubbles: true }))
    expect(placeCell("altitudeKm").value).toBe("150")
    typed(placeCell("altitudeKm"), "170.5")
    typed(placeCell("t"), "45")
    expect(sighting.skyEvents!.launches![0].track).toEqual([{ t: 0, lat: 28, lng: -80, altitudeKm: 0 }, { t: 45000, lat: 30, lng: -78, altitudeKm: 170.5 }])
  })

  test("steps to the previous and next place with the buttons and with Alt and the arrows, and not past either end", () => {
    build()
    const previous = container.querySelector<HTMLButtonElement>("#launch-place-previous")!
    const next = container.querySelector<HTMLButtonElement>("#launch-place-next")!
    expect(previous.disabled).toBe(true)
    expect(next.disabled).toBe(false)
    next.click()
    expect(placeCell("t").value).toBe("60")
    expect(next.disabled).toBe(true)
    expect(previous.title).toContain("Alt+↑")
    // With the focus in the field of the place left behind, which is then not being typed in.
    placeCell("t").focus()
    placeCell("t").dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", altKey: true, bubbles: true, cancelable: true }))
    expect(placeCell("t").value).toBe("0")
    // The arrows alone belong to the field being edited.
    placeCell("t").dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }))
    expect(placeCell("t").value).toBe("0")
    placeCell("t").dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", altKey: true, bubbles: true, cancelable: true }))
    expect(placeCell("t").value).toBe("0")
  })

  test("adds a place that goes on as the path was going, and removes the one picked down to two", () => {
    const { sighting } = build()
    container.querySelector<HTMLButtonElement>("#launch-place-add")!.click()
    expect(sighting.skyEvents!.launches![0].track[2]).toEqual({ t: 120000, lat: 32, lng: -76, altitudeKm: 300 })
    expect(container.querySelector<HTMLSelectElement>("#launch-place")!.value).toBe("2")
    container.querySelector<HTMLButtonElement>("#launch-place-delete")!.click()
    expect(sighting.skyEvents!.launches![0].track).toHaveLength(2)
    expect(container.querySelector<HTMLButtonElement>("#launch-place-delete")!.disabled).toBe(true)
  })

  test("keeps the place being edited on show when changing its instant puts it elsewhere in the path", () => {
    const { sighting } = build()
    typed(placeCell("t"), "90")
    expect(sighting.skyEvents!.launches![0].track.map(place => place.t)).toEqual([60000, 90000])
    expect(container.querySelector<HTMLSelectElement>("#launch-place")!.value).toBe("1")
    expect(placeCell("t").value).toBe("90")
  })

  describe("jets", () => {
    test("a vent added to a launch is listed, shows the vent's values in force, and keeps the ascent's burn drawn", () => {
      const { sighting, changes } = build()
      container.querySelector<HTMLButtonElement>("#launch-jet-add-vent")!.click()
      const launch = sighting.skyEvents!.launches![0]
      expect(launch.jets).toEqual([{ kind: "vent", fromT: 30000, untilT: 60000, angleDeg: 90 }])
      // The ascent's burn, which jets would otherwise replace, is stated.
      expect([launch.burnFromT, launch.burnUntilT]).toEqual([0, 60000])
      expect(changes()).toBe(1)
      expect([...container.querySelectorAll<HTMLOptionElement>("#launch-jet option")].map(option => option.textContent)).toEqual(["Propellant vented 30 s"])
      expect(field("speedKmPerS").placeholder).toBe("0.7")
      expect(field("angleDeg").value).toBe("90")
    })

    test("a burn's values in force are the launch's engine's, and what is typed is written onto the jet", () => {
      const { sighting } = build()
      container.querySelector<HTMLButtonElement>("#launch-jet-add-burn")!.click()
      expect(field("massKgPerS").placeholder).toBe("273.68")
      expect(field("speedKmPerS").placeholder).toBe("3.41")
      typed(field("angleDeg"), "180")
      typed(field("spinPeriodS"), "60")
      expect(sighting.skyEvents!.launches![0].jets![0]).toMatchObject({ kind: "burn", angleDeg: 180, spinPeriodS: 60 })
    })

    test("removing the last jet leaves the launch with none", () => {
      const { sighting } = build()
      container.querySelector<HTMLButtonElement>("#launch-jet-add-vent")!.click()
      container.querySelector<HTMLButtonElement>("#launch-jet-delete")!.click()
      expect(sighting.skyEvents!.launches![0].jets).toBeUndefined()
    })
  })
})

