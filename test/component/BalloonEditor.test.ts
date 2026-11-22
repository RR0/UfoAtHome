import { afterEach, describe, expect, test } from "vitest"
import type { InterpretationJson } from "../../src/engine/interpretation/Interpretation.js"
import { SaidTexts } from "../../src/engine/model/SaidText.js"
import type { Sighting } from "../../src/engine/model/Sighting.js"
import { BalloonEditor } from "../../src/modules/interpretations/balloons/BalloonEditor.js"
import { BalloonFlight } from "../../src/modules/interpretations/balloons/BalloonFlight.js"
import type { BalloonFlightJson } from "../../src/modules/interpretations/balloons/BalloonFlight.js"
import { BalloonParameters } from "../../src/modules/interpretations/balloons/BalloonParameters.js"

describe("BalloonEditor", () => {
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
    const editor = new BalloonEditor(container, {
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
  const weather = (): BalloonFlightJson => ({ id: "w", balloon: "weather", site: { eastM: 0, northM: 1000 }, releases: [{ t: 0 }], wind: { towardDeg: 90, speedMS: 3 } })
  const balloonsOf = (sighting: Sighting) => sighting.interpretation!.balloons!

  test("adds a weather balloon let go at the playhead a kilometre in front of the observer, beside the interpretation's bodies", async () => {
    const body = { id: "b", model: { id: "sphere" }, track: [] }
    const { sighting, changes } = await build({ bodies: [body] })
    container.querySelector<HTMLButtonElement>("#balloon-add")!.click()
    const [added] = balloonsOf(sighting)
    expect(added).toMatchObject({ balloon: "weather", releases: [{ t: 5000 }] })
    // The observer faces east.
    expect(added.site.eastM).toBeCloseTo(1000, -1)
    expect(sighting.interpretation!.bodies).toEqual([body])
    expect(changes()).toBe(1)
    expect(BalloonFlight.bodiesOf(added)).toHaveLength(1)
  })

  test("cannot add a balloon to a recording that has no place", async () => {
    await build({ bodies: [] }, false)
    expect(container.querySelector<HTMLButtonElement>("#balloon-add")!.disabled).toBe(true)
  })

  test("writes an edit as a new flight, its type by name, and changes a figure of the type as the recording states figures", async () => {
    const stated = weather()
    const { sighting } = await build({ bodies: [], balloons: [stated] })
    const before = sighting.interpretation
    chosen(field("balloon")!, "party")
    expect(sighting.interpretation).not.toBe(before)
    expect(balloonsOf(sighting)[0].balloon).toBe("party")
    expect(stated.balloon).toBe("weather")
    expect((field("figures.massKg") as HTMLInputElement).placeholder).toBe("0.0045")
    typed(field("figures.massKg")!, "0.01")
    expect(balloonsOf(sighting)[0].balloon).toEqual({ id: "party", massKg: 0.01 })
    typed(field("figures.massKg")!, "")
    expect(balloonsOf(sighting)[0].balloon).toBe("party")
  })

  test("lets one balloon go or a group, and turns the one into the group's first instant", async () => {
    const { sighting } = await build({ bodies: [], balloons: [{ ...weather(), releases: [{ t: 12000 }] }] })
    expect(hidden("group.count")).toBe(true)
    chosen(field("mode")!, "group")
    expect(balloonsOf(sighting)[0].group).toMatchObject({ count: 10, fromT: 12000, untilT: 72000 })
    expect(balloonsOf(sighting)[0].releases).toBeUndefined()
    expect(hidden("group.count")).toBe(false)
    chosen(field("mode")!, "one")
    expect(balloonsOf(sighting)[0].group).toBeUndefined()
    expect(balloonsOf(sighting)[0].releases).toEqual([{ t: 12000 }])
  })

  test("edits the first wind aloft and keeps the others, and a hot-air pilot's one height", async () => {
    const stated: BalloonFlightJson = { ...weather(), balloon: "hot-air", windsAloft: [{ atM: 500, towardDeg: 10, speedMS: 4 }, { atM: 9000, towardDeg: 80, speedMS: 30 }] }
    const { sighting } = await build({ bodies: [], balloons: [stated] })
    typed(field("windAloft.speedMS")!, "6")
    expect(balloonsOf(sighting)[0].windsAloft).toEqual([{ atM: 500, towardDeg: 10, speedMS: 6 }, { atM: 9000, towardDeg: 80, speedMS: 30 }])
    expect(container.querySelector("#balloon-kept")!.textContent).toContain("1 more winds aloft")
    typed(field("cruiseM")!, "450")
    expect(balloonsOf(sighting)[0].plan).toEqual([{ t: 0, altitudeM: 450 }])
    expect(hidden("tetherM")).toBe(true)
  })

  test("offers a captive balloon's line and a pilot balloon's lamp, only to them", async () => {
    const { sighting } = await build({ bodies: [], balloons: [{ ...weather(), balloon: "captive" }] })
    expect(hidden("tetherM")).toBe(false)
    expect(hidden("lit")).toBe(true)
    typed(field("tetherM")!, "60")
    expect(balloonsOf(sighting)[0].tetherM).toBe(60)
    chosen(field("balloon")!, "pilot")
    expect(hidden("lit")).toBe(false)
    ticked(field("lit")!, true)
    expect(balloonsOf(sighting)[0].lit).toBe(true)
  })

  test("its view, turned back, is the flight it was made from", () => {
    const flight: BalloonFlightJson = {
      id: "x", balloon: { id: "stratospheric", massKg: 300 }, site: { eastM: 1, northM: 2 }, group: { count: 3, fromT: 0, untilT: 9000 },
      releases: [{ t: 4000 }], windsAloft: [{ atM: 1, towardDeg: 2, speedMS: 3 }], plan: [{ t: 0, altitudeM: 100 }, { t: 9000, altitudeM: 0 }]
    }
    expect(BalloonParameters.fromView(BalloonParameters.viewOf(flight), flight)).toEqual(flight)
  })

  test("deletes the balloon, and with it an interpretation that then says nothing", async () => {
    const { sighting } = await build({ bodies: [], balloons: [weather()] })
    container.querySelector<HTMLButtonElement>("#balloon-delete")!.click()
    expect(sighting.interpretation).toBeUndefined()
  })

  test("speaks French", async () => {
    await build({ bodies: [], balloons: [weather()] }, true, "fr")
    expect(container.textContent).toContain("Ballon-sonde")
    expect(container.textContent).toContain("Lâcher")
  })
})
