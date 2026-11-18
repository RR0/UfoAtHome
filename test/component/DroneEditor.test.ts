import { afterEach, describe, expect, test } from "vitest"
import { DroneEditor } from "../../src/modules/interpretations/drones/DroneEditor.js"
import { DroneFlight } from "../../src/modules/interpretations/drones/DroneFlight.js"
import type { DroneFlightJson } from "../../src/modules/interpretations/drones/DroneFlight.js"
import type { InterpretationJson } from "../../src/engine/interpretation/Interpretation.js"
import { SaidTexts } from "../../src/engine/model/SaidText.js"
import type { Sighting } from "../../src/engine/model/Sighting.js"

describe("DroneEditor", () => {
  const container = document.createElement("div")
  document.body.append(container)
  afterEach(() => container.replaceChildren())

  const build = async (interpretation?: InterpretationJson, place = true, language = "en") => {
    const sighting = {
      interpretation,
      event: { place: place ? [{ lat: 48, lng: 2 }] : [] },
      observerTrack: { getInterpolatedPoseAt: () => ({ headingDeg: 90, lat: 48, lng: 2 }) }
    } as unknown as Sighting
    let changes = 0
    let time = 5000
    const seeks: number[] = []
    const editor = new DroneEditor(container, {
      sighting: () => sighting, said: () => new SaidTexts([language]), writingLanguage: () => language, shapes: () => [{ id: "light-1", label: "Light 1" }],
      currentTime: () => time, duration: () => 60000, seekTo: t => { seeks.push(t); time = t },
      changed: () => changes++
    }, language)
    await editor.ready
    editor.sync()
    return { sighting, editor, changes: () => changes, seeks, at: (t: number) => { time = t } }
  }
  const typed = (target: Element, value: string) => {
    ;(target as HTMLInputElement).value = value
    target.dispatchEvent(new Event("input", { bubbles: true }))
  }
  const chosen = (target: Element, value: string) => {
    ;(target as HTMLSelectElement).value = value
    target.dispatchEvent(new Event("input", { bubbles: true }))
  }
  const ticked = (target: Element, checked: boolean) => {
    ;(target as HTMLInputElement).checked = checked
    target.dispatchEvent(new Event("input", { bubbles: true }))
  }
  const drone = (): DroneFlightJson => ({
    id: "d", airframe: "quadcopter",
    path: [{ t: 0, eastM: 0, northM: 150, altitudeM: 60 }, { t: 10000, eastM: 0, northM: 150, altitudeM: 60 }, { t: 30000, eastM: 200, northM: 300, altitudeM: 80 }]
  })
  const dronesOf = (sighting: Sighting) => sighting.interpretation!.drones!
  const field = (key: string) => container.querySelector(`[data-key="${key}"]`)

  test("adds a quadcopter hovering in front of the observer from the playhead, read into the account beside its bodies", async () => {
    const body = { id: "b", model: { id: "sphere" }, track: [] }
    const { sighting, changes } = await build({ bodies: [body] })
    container.querySelector<HTMLButtonElement>("#drone-add")!.click()
    const added = dronesOf(sighting)
    expect(added).toHaveLength(1)
    expect(added[0].airframe).toBe("quadcopter")
    // The observer faces east: 150 m east, the same point twice, from the playhead for 20 s.
    const [from, to] = added[0].path as { t: number, eastM: number, northM: number }[]
    expect([from.t, to.t]).toEqual([5000, 25000])
    expect(from.eastM).toBeCloseTo(150, -1)
    expect(to).toMatchObject({ eastM: from.eastM, northM: from.northM })
    expect(sighting.interpretation!.bodies).toEqual([body])
    expect(changes()).toBe(1)
    expect(DroneFlight.bodiesOf(added[0])).toHaveLength(1)
  })

  test("cannot add a drone to a recording that has no place", async () => {
    await build({ bodies: [] }, false)
    expect(container.querySelector<HTMLButtonElement>("#drone-add")!.disabled).toBe(true)
  })

  test("writes an edit as a new drone in a new interpretation, so that the scene computes it again", async () => {
    const stated = drone()
    const { sighting } = await build({ bodies: [], drones: [stated] })
    const before = sighting.interpretation
    typed(field("count")!, "4")
    expect(sighting.interpretation).not.toBe(before)
    expect(dronesOf(sighting)[0].count).toBe(4)
    expect(stated.count).toBeUndefined()
    chosen(field("airframe")!, "saucer")
    expect(dronesOf(sighting)[0].airframe).toBe("saucer")
  })

  test("offers only the lights its airframe has, and shows theirs when a field is empty", async () => {
    await build({ bodies: [], drones: [drone()] })
    const visible = (key: string) => !(field(key)?.closest("label, .parameter-row") as HTMLElement | null)?.hidden && field(key) !== null
    expect(visible("lights.strobe.candela")).toBe(true)
    expect((field("lights.strobe.candela") as HTMLInputElement).placeholder).toBe("40")
    expect((field("lights.strobe.hz") as HTMLInputElement).placeholder).toBe("1.25")
    expect((field("lights.front.color") as HTMLInputElement).value).toBe("#ff2a1a")
    expect(field("lights.rim.color")?.closest("[hidden]")).not.toBeNull()
  })

  test("puts a light out, and back on as its airframe has it; a light stated as false is put on by unticking it", async () => {
    const { sighting } = await build({ bodies: [], drones: [{ ...drone(), lights: { front: false } }] })
    expect((field("lights.front.off") as HTMLInputElement).checked).toBe(true)
    ticked(field("lights.front.off")!, false)
    expect(dronesOf(sighting)[0].lights?.front).toEqual({ off: false })
    ticked(field("lights.strobe.off")!, true)
    expect(dronesOf(sighting)[0].lights?.strobe).toEqual({ off: true })
    ticked(field("lights.strobe.off")!, false)
    expect(dronesOf(sighting)[0].lights?.strobe).toBeUndefined()
    expect(DroneFlight.lightsOf(dronesOf(sighting)[0]).front).toBeDefined()
  })

  test("a saucer's strobe is off as its airframe has it, and ticked so", async () => {
    await build({ bodies: [], drones: [{ ...drone(), airframe: "saucer" }] })
    expect((field("lights.strobe.off") as HTMLInputElement).checked).toBe(true)
    expect((field("lights.rim.color") as HTMLInputElement).value).toBe("#4fd2ff")
  })

  test("a wind given only a speed blows from the north", async () => {
    const { sighting } = await build({ bodies: [], drones: [drone()] })
    typed(field("wind.speedMS")!, "8")
    expect(dronesOf(sighting)[0].wind).toEqual({ fromDeg: 0, speedMS: 8 })
  })

  test("puts a point at the playhead where the drone is then, and a diamond pressed sends the playhead to its point", async () => {
    const { sighting, at, seeks } = await build({ bodies: [], drones: [drone()] })
    at(20000)
    const add = [...container.querySelectorAll<HTMLButtonElement>("#drone-timeline button")].find(button => button.title.includes("Add a point here"))!
    add.click()
    const path = dronesOf(sighting)[0].path
    expect(path).toHaveLength(4)
    const added = path.find(point => point.t === 20000) as { eastM: number, northM: number }
    expect(added.eastM).toBeGreaterThan(0)
    expect(added.eastM).toBeLessThan(200)
    expect(seeks).toContain(20000)
  })

  test("deletes the drone, and with it an interpretation that then says nothing", async () => {
    const { sighting } = await build({ bodies: [], drones: [drone()] })
    container.querySelector<HTMLButtonElement>("#drone-delete")!.click()
    expect(sighting.interpretation).toBeUndefined()
  })

  test("speaks French", async () => {
    await build({ bodies: [], drones: [drone()] }, true, "fr")
    expect(container.textContent).toContain("Cellule")
    expect(container.textContent).toContain("Feu à éclats")
  })
})
