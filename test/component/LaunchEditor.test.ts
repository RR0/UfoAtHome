import { afterEach, describe, expect, test } from "vitest"
import { LaunchEditor } from "../../src/modules/sky-events/launches/LaunchEditor.js"
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

  const build = async (skyEvents: SkyEventsJson | null = stated(), at = 0) => {
    const sighting = { skyEvents: skyEvents ?? undefined, event: { place: [{ lat: 48, lng: 2 }] }, observerTrack: { getInterpolatedPoseAt: () => ({ headingDeg: 90 }) } } as unknown as Sighting
    let changes = 0
    const time = { now: at, seeks: [] as number[] }
    const editor = new LaunchEditor(container, {
      sighting: () => sighting,
      said: () => new SaidTexts(["en"]),
      writingLanguage: () => "en",
      currentTime: () => time.now, duration: () => 60000, seekTo: t => { time.seeks.push(t); time.now = t },
      changed: () => changes++
    }, "en")
    await editor.ready
    editor.sync()
    return { sighting, editor, changes: () => changes, time }
  }
  const field = (key: string) => container.querySelector<HTMLInputElement>(`[data-key="${key}"]`)!
  const typed = (target: Element, value: string) => {
    ;(target as HTMLInputElement).value = value
    target.dispatchEvent(new Event("input", { bubbles: true }))
  }

  test("lists the launches and shows the first one's fields, drawn from what the launch kind publishes", async () => {
    await build()
    expect([...container.querySelectorAll<HTMLOptionElement>("#launch-select option")].map(option => option.textContent)).toEqual(["First (a)", "b"])
    expect(field("vehicle.engine.thrustKN").value).toBe("934")
    expect(field("vehicle.engine.propellant").value).toBe("rp1-lox")
  })

  test("an empty field shows what the plume will use, which follows the engine", async () => {
    await build()
    expect(field("plume.exhaustKgPerS").placeholder).toBe("273.68")
    typed(field("vehicle.engine.thrustKN"), "3000")
    expect(field("plume.exhaustKgPerS").placeholder).toBe("879.07")
  })

  test("what is typed is written onto the launch, and the recording is told", async () => {
    const { sighting, changes } = await build()
    typed(field("plume.collarShare"), "0.5")
    expect(sighting.skyEvents!.launches![0].plume).toEqual({ collarShare: 0.5 })
    expect(changes()).toBe(1)
    typed(field("plume.collarShare"), "")
    expect(sighting.skyEvents!.launches![0].plume).toBeUndefined()
  })

  test("the other launch has its own fields", async () => {
    const { editor } = await build()
    editor.show("b")
    expect(field("vehicle.engine.thrustKN").value).toBe("")
    expect(field("plume.exhaustKgPerS").placeholder).toBe("273")
  })

  test("renaming a launch writes its title in the writing language and updates the list", async () => {
    const { sighting } = await build()
    typed(field("title"), "Renamed")
    expect(sighting.skyEvents!.launches![0].title).toEqual({ en: "Renamed" })
    expect(container.querySelector<HTMLOptionElement>("#launch-select option")!.textContent).toBe("Renamed (a)")
  })

  test("deleting a launch leaves the other, and the last one leaves no event of the sky behind", async () => {
    const { sighting } = await build()
    container.querySelector<HTMLButtonElement>("#launch-delete")!.click()
    expect(sighting.skyEvents!.launches!.map(launch => launch.id)).toEqual(["b"])
    container.querySelector<HTMLButtonElement>("#launch-delete")!.click()
    expect(sighting.skyEvents).toBeUndefined()
    expect(container.querySelector<HTMLElement>("#launch-list .element-list-empty")!.hidden).toBe(false)
  })

  test("a recording with no interpretation says there is no launch", async () => {
    await build(null)
    expect(container.querySelector<HTMLElement>("#launch-list .element-list-empty")!.hidden).toBe(false)
    expect(container.querySelector<HTMLElement>("#launch-fields")!.hidden).toBe(true)
  })

  test("refresh leaves the fields alone while the same launches are on show, and redraws for others", async () => {
    const { sighting, editor } = await build()
    const first = field("plume.collarShare")
    editor.refresh()
    expect(field("plume.collarShare")).toBe(first)
    sighting.skyEvents = { launches: [{ id: "z", track }] }
    editor.refresh()
    expect([...container.querySelectorAll<HTMLOptionElement>("#launch-select option")].map(option => option.value)).toEqual(["z"])
  })

  test("adds a launch with a placeholder path in front of the observer, even to a recording with no interpretation", async () => {
    const { sighting, changes } = await build(null)
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

  test("numbers a new launch past the ones that exist, and selects it", async () => {
    const { sighting } = await build()
    container.querySelector<HTMLButtonElement>("#launch-add-falcon-9")!.click()
    container.querySelector<HTMLButtonElement>("#launch-add-falcon-9")!.click()
    expect(sighting.skyEvents!.launches!.map(launch => launch.id)).toEqual(["a", "b", "launch-3", "launch-4"])
    expect(container.querySelector<HTMLSelectElement>("#launch-select")!.value).toBe("launch-4")
  })

  test("cannot add a launch to a recording with no place, and says why", async () => {
    const sighting = { interpretation: undefined, event: {}, observerTrack: { getInterpolatedPoseAt: () => undefined } } as unknown as Sighting
    const editor = new LaunchEditor(container, { sighting: () => sighting, said: () => new SaidTexts(["en"]), writingLanguage: () => "en", currentTime: () => 0, duration: () => 60000, seekTo: () => undefined, changed: () => undefined }, "en")
    await editor.ready
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

  test("the burn times are typed in seconds and written in milliseconds, and an empty one shows the end of the path", async () => {
    const { sighting } = await build()
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

  const lanes = () => [...container.querySelectorAll<HTMLElement>("#launch-timeline .track-lane")]
  const adds = () => [...container.querySelectorAll<HTMLButtonElement>("#launch-timeline .track-add")]
  const shown = (id: string) => !container.querySelector<HTMLElement>(`#${id}`)!.hidden
  /** A lane laid out 132 px wide from x = 0: over −6 s to 66 s for a path of 0 to 60 s, a tenth more on either side, so 1.833 px a second. */
  const laidOut = (lane: HTMLElement) => {
    lane.getBoundingClientRect = () => ({ left: 0, width: 132, top: 0, height: 24, right: 132, bottom: 24, x: 0, y: 0, toJSON: () => undefined })
    lane.setPointerCapture = () => undefined
    return lane
  }
  const press = (lane: HTMLElement, x: number, to = x) => {
    lane.dispatchEvent(new MouseEvent("pointerdown", { clientX: x, bubbles: true }))
    if (to !== x) lane.dispatchEvent(new MouseEvent("pointermove", { clientX: to, bubbles: true }))
    lane.dispatchEvent(new MouseEvent("pointerup", { clientX: to, bubbles: true }))
  }

  test("the path is a row of the launch's timeline, its places diamonds, in place of a picker of instants", async () => {
    await build()
    expect(container.querySelector("#launch-place")).toBeNull()
    expect(lanes()).toHaveLength(1)
    expect([...lanes()[0].querySelectorAll<HTMLElement>(".kf")].map(diamond => diamond.dataset.t)).toEqual(["0", "60000"])
    expect(shown("launch-path")).toBe(true)
    expect(shown("launch-jets")).toBe(false)
    expect(placeCell("t").value).toBe("0")
  })

  test("a diamond of the path pressed shows its place and takes the playhead there; dragged, it moves in time", async () => {
    const { sighting, time } = await build()
    // 60 s is 66 s from the lane's start, of 72: 121 px.
    press(laidOut(lanes()[0]), 121)
    expect(time.seeks.at(-1)).toBe(60000)
    expect(placeCell("altitudeKm").value).toBe("150")
    typed(placeCell("altitudeKm"), "170.5")
    // Dragged back to 45 s: 51 s from the start, 93.5 px.
    press(laidOut(lanes()[0]), 121, 93.5)
    expect(sighting.skyEvents!.launches![0].track).toEqual([{ t: 0, lat: 28, lng: -80, altitudeKm: 0 }, { t: 45000, lat: 30, lng: -78, altitudeKm: 170.5 }])
    expect(placeCell("t").value).toBe("45")
  })

  test("the + of the path puts a place at the playhead, where the stage is then, and removes the one picked down to two", async () => {
    const { sighting } = await build(stated(), 30000)
    adds()[0].click()
    expect(sighting.skyEvents!.launches![0].track[1]).toEqual({ t: 30000, lat: 29, lng: -79, altitudeKm: 75 })
    expect(placeCell("t").value).toBe("30")
    container.querySelector<HTMLButtonElement>("#launch-place-delete")!.click()
    expect(sighting.skyEvents!.launches![0].track).toHaveLength(2)
    expect(container.querySelector<HTMLButtonElement>("#launch-place-delete")!.disabled).toBe(true)
  })

  test("keeps the place being edited on show when changing its instant puts it elsewhere in the path", async () => {
    const { sighting } = await build()
    typed(placeCell("t"), "90")
    expect(sighting.skyEvents!.launches![0].track.map(place => place.t)).toEqual([60000, 90000])
    expect(placeCell("t").value).toBe("90")
  })

  describe("jets", () => {
    test("a vent added at the playhead is a row of its own, shown alone under the timeline, and keeps the ascent's burn drawn", async () => {
      const { sighting, changes } = await build(stated(), 20000)
      container.querySelector<HTMLButtonElement>("#launch-jet-add-vent")!.click()
      const launch = sighting.skyEvents!.launches![0]
      expect(launch.jets).toEqual([{ kind: "vent", fromT: 20000, untilT: 50000, angleDeg: 90 }])
      // The ascent's burn, which jets would otherwise replace, is stated.
      expect([launch.burnFromT, launch.burnUntilT]).toEqual([0, 60000])
      expect(changes()).toBe(1)
      expect(lanes()).toHaveLength(2)
      expect(container.querySelectorAll("#launch-timeline .track-name")[1].textContent).toBe("Propellant vented 1")
      expect(shown("launch-jets")).toBe(true)
      expect(shown("launch-path")).toBe(false)
      expect(field("speedKmPerS").placeholder).toBe("0.7")
      expect(field("angleDeg").value).toBe("90")
      // The path's row pressed shows the path again, alone.
      container.querySelector<HTMLButtonElement>("#launch-timeline .track-name")!.click()
      expect(shown("launch-path")).toBe(true)
      expect(shown("launch-jets")).toBe(false)
    })

    test("an end of a jet's bar dragged moves it in time", async () => {
      const { sighting } = await build(stated(), 20000)
      container.querySelector<HTMLButtonElement>("#launch-jet-add-vent")!.click()
      // Its end at 50 s, 56 s from the lane's start: 102.7 px; dragged to 40 s, 84.3 px.
      press(laidOut(lanes()[1]), 103, 84.3)
      expect(sighting.skyEvents!.launches![0].jets![0]).toMatchObject({ fromT: 20000, untilT: 40000 })
    })

    test("a burn's values in force are the launch's engine's, and what is typed is written onto the jet", async () => {
      const { sighting } = await build()
      container.querySelector<HTMLButtonElement>("#launch-jet-add-burn")!.click()
      expect(field("massKgPerS").placeholder).toBe("273.68")
      expect(field("speedKmPerS").placeholder).toBe("3.41")
      typed(field("angleDeg"), "180")
      typed(field("spinPeriodS"), "60")
      expect(sighting.skyEvents!.launches![0].jets![0]).toMatchObject({ kind: "burn", angleDeg: 180, spinPeriodS: 60 })
    })

    test("removing the last jet leaves the launch with none, and the path shown", async () => {
      const { sighting } = await build()
      container.querySelector<HTMLButtonElement>("#launch-jet-add-vent")!.click()
      container.querySelector<HTMLButtonElement>("#launch-jet-delete")!.click()
      expect(sighting.skyEvents!.launches![0].jets).toBeUndefined()
      expect(lanes()).toHaveLength(1)
      expect(shown("launch-path")).toBe(true)
    })
  })
})
