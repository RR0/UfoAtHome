import { afterEach, describe, expect, test } from "vitest"
import type { InterpretationJson } from "../../src/engine/interpretation/Interpretation.js"
import { SaidTexts } from "../../src/engine/model/SaidText.js"
import type { Sighting } from "../../src/engine/model/Sighting.js"
import { AirshipEditor } from "../../src/modules/interpretations/airships/AirshipEditor.js"
import { AirshipFlight } from "../../src/modules/interpretations/airships/AirshipFlight.js"
import type { AirshipFlightJson } from "../../src/modules/interpretations/airships/AirshipFlight.js"
import { AirshipParameters } from "../../src/modules/interpretations/airships/AirshipParameters.js"

describe("AirshipEditor", () => {
  const container = document.createElement("div")
  document.body.append(container)
  afterEach(() => container.replaceChildren())

  const build = async (interpretation?: InterpretationJson, place = true, language = "en") => {
    const sighting = {
      interpretation,
      event: { place: place ? [{ lat: 48, lng: 2 }] : [] },
      observerTrack: { getInterpolatedPoseAt: () => ({ headingDeg: 90, lat: 48, lng: 2 }) },
      weatherTrack: undefined
    } as unknown as Sighting
    let changes = 0
    let time = 5000
    const seeks: number[] = []
    const editor = new AirshipEditor(container, {
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
  const field = (key: string) => container.querySelector(`[data-key="${key}"]`)
  const hidden = (key: string) => field(key)?.closest("[hidden]") !== null
  const blimp = (): AirshipFlightJson => ({
    id: "a", airship: "blimp",
    path: [{ t: 0, eastM: 0, northM: 1500, altitudeM: 300 }, { t: 60000, eastM: 900, northM: 1500, altitudeM: 300 }]
  })
  const airshipsOf = (sighting: Sighting) => sighting.interpretation!.airships!

  test("adds a blimp crossing in front of the observer from the playhead, beside the interpretation's bodies", async () => {
    const body = { id: "b", model: { id: "sphere" }, track: [] }
    const { sighting, changes } = await build({ bodies: [body] })
    container.querySelector<HTMLButtonElement>("#airship-add")!.click()
    const [added] = airshipsOf(sighting)
    expect(added.airship).toBe("blimp")
    const [from, to] = added.path as { t: number, eastM: number, northM: number }[]
    expect([from.t, to.t]).toEqual([5000, 65000])
    // The observer faces east: 1.5 km east, crossing from north to south.
    expect(from.eastM).toBeCloseTo(1500, -1)
    expect(from.northM).toBeGreaterThan(to.northM)
    expect(sighting.interpretation!.bodies).toEqual([body])
    expect(changes()).toBe(1)
    expect(AirshipFlight.bodiesOf(added)).toHaveLength(1)
  })

  test("cannot add an airship to a recording that has no place", async () => {
    await build({ bodies: [] }, false)
    expect(container.querySelector<HTMLButtonElement>("#airship-add")!.disabled).toBe(true)
  })

  test("puts its sign out, colours it, and offers it only to a type that has one", async () => {
    const { sighting } = await build({ bodies: [], airships: [blimp()] })
    expect((field("signLit") as HTMLInputElement).checked).toBe(true)
    ticked(field("signLit")!, false)
    expect(airshipsOf(sighting)[0].sign).toBe(false)
    ticked(field("signLit")!, true)
    typed(field("signColor")!, "#40a0ff")
    expect(airshipsOf(sighting)[0].sign).toEqual({ color: "#40a0ff" })
    chosen(field("airship")!, "aerostat")
    expect(hidden("signLit")).toBe(true)
    expect(hidden("lights.nose.candela")).toBe(false)
    expect(container.querySelector("#airship-tethered")!.closest("[hidden]")).toBeNull()
  })

  test("offers a lightship its envelope lit, and only its lights", async () => {
    const { sighting } = await build({ bodies: [], airships: [{ ...blimp(), airship: "lightship" }] })
    expect(hidden("lit")).toBe(false)
    expect(hidden("lights.strobe.candela")).toBe(true)
    ticked(field("lit")!, false)
    expect(airshipsOf(sighting)[0].lit).toBe(false)
  })

  test("puts a point at the playhead where the airship is then", async () => {
    const { sighting, at, seeks } = await build({ bodies: [], airships: [blimp()] })
    at(30000)
    const add = [...container.querySelectorAll<HTMLButtonElement>("#airship-timeline button")].find(button => button.title.includes("Add a point here"))!
    add.click()
    const path = airshipsOf(sighting)[0].path
    expect(path).toHaveLength(3)
    const added = path.find(point => point.t === 30000) as { eastM: number }
    expect(added.eastM).toBeCloseTo(450, -1)
    expect(seeks).toContain(30000)
  })

  test("its view, turned back, is the airship it was made from", () => {
    const flight: AirshipFlightJson = { ...blimp(), airship: { id: "rigid", cruiseMS: 30 }, sign: { color: "#ff0000", luminanceCdM2: 100 } }
    expect(AirshipParameters.fromView(AirshipParameters.viewOf(flight), flight)).toEqual(flight)
    const off: AirshipFlightJson = { ...blimp(), sign: false }
    expect(AirshipParameters.fromView(AirshipParameters.viewOf(off), off)).toEqual(off)
  })

  test("deletes the airship, and with it an interpretation that then says nothing", async () => {
    const { sighting } = await build({ bodies: [], airships: [blimp()] })
    container.querySelector<HTMLButtonElement>("#airship-delete")!.click()
    expect(sighting.interpretation).toBeUndefined()
  })

  test("speaks French", async () => {
    await build({ bodies: [], airships: [blimp()] }, true, "fr")
    expect(container.textContent).toContain("Dirigeable souple")
    expect(container.textContent).toContain("Enseigne allumée")
  })
})
