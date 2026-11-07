import { afterEach, describe, expect, test } from "vitest"
import { BeamEditor } from "../../src/modules/sky-events/beams/BeamEditor.js"
import { SaidTexts } from "../../src/engine/model/SaidText.js"
import type { Sighting } from "../../src/engine/model/Sighting.js"
import type { SkyEventsJson } from "../../src/engine/model/SkyEvents.js"

const path = [{ lat: 48.805, lng: 2.231, altitudeM: 172 }, { lat: 48.836, lng: 2.337, altitudeM: 88 }]

describe("BeamEditor", () => {
  const container = document.createElement("div")
  document.body.append(container)
  afterEach(() => container.replaceChildren())

  const build = async (skyEvents?: SkyEventsJson) => {
    const sighting = { skyEvents, event: { place: [{ lat: 48, lng: 2 }] }, observerTrack: { getInterpolatedPoseAt: () => ({ headingDeg: 90 }) } } as unknown as Sighting
    let changes = 0
    const time = { now: 4000 }
    const editor = new BeamEditor(container, { sighting: () => sighting, said: () => new SaidTexts(["en"]), writingLanguage: () => "en", currentTime: () => time.now, duration: () => 20000, seekTo: t => { time.now = t }, changed: () => changes++ }, "en")
    await editor.ready
    editor.sync()
    return { sighting, changes: () => changes, time }
  }
  const typed = (target: Element, value: string) => {
    ;(target as HTMLInputElement).value = value
    target.dispatchEvent(new Event("input", { bubbles: true }))
  }

  test("adds a beam in front of the observer, a green laser, under the recording's events of the sky", async () => {
    const { sighting, changes } = await build()
    container.querySelector<HTMLButtonElement>("#beam-add")!.click()
    const beams = sighting.skyEvents!.beams!
    expect(beams).toHaveLength(1)
    expect(beams[0].wavelengthNm).toBe(532)
    expect(beams[0].path).toHaveLength(2)
    expect(changes()).toBe(1)
  })

  test("writes an edit as a new beam in a new list, so that the scene sees it", async () => {
    const beam = { id: "b", path, wavelengthNm: 532, powerW: 10 }
    const { sighting } = await build({ beams: [beam] })
    const before = sighting.skyEvents!.beams!
    // Its power is a field of its light, shown with the Light row.
    container.querySelectorAll<HTMLButtonElement>("#beam-timeline .track-name")[1].click()
    typed(container.querySelector('#beam-light-parameters [data-key="powerW"]')!, "20")
    const after = sighting.skyEvents!.beams!
    expect(after).not.toBe(before)
    expect(after[0]).not.toBe(beam)
    expect(after[0].powerW).toBe(20)
    expect(beam.powerW).toBe(10)
  })

  const rows = () => [...container.querySelectorAll<HTMLElement>("#beam-timeline .track-row")]
  const name = (index: number) => rows()[index].querySelector<HTMLButtonElement>(".track-name")!
  const add = (index: number) => rows()[index].querySelector<HTMLButtonElement>(".track-add")!
  const shown = (id: string) => !container.querySelector<HTMLElement>(`#${id}`)!.hidden
  /** A lane laid out 200 px wide over the 20 s of the recording: 10 px a second. */
  const laidOut = (lane: HTMLElement) => {
    lane.getBoundingClientRect = () => ({ left: 0, width: 200, top: 0, height: 24, right: 200, bottom: 24, x: 0, y: 0, toJSON: () => undefined })
    lane.setPointerCapture = () => undefined
    return lane
  }
  const drag = (lane: HTMLElement, from: number, to: number) => {
    lane.dispatchEvent(new MouseEvent("pointerdown", { clientX: from, bubbles: true }))
    lane.dispatchEvent(new MouseEvent("pointermove", { clientX: to, bubbles: true }))
    lane.dispatchEvent(new MouseEvent("pointerup", { clientX: to, bubbles: true }))
  }

  test("lays the beam out on a timeline of three rows, the details of the one picked alone under it", async () => {
    await build({ beams: [{ id: "b", path, wavelengthNm: 532, powerW: 10 }] })
    expect(rows().map(row => row.querySelector(".track-name")!.textContent)).toEqual(["On", "Light", "Path"])
    expect(rows().map(row => row.dataset.active)).toEqual(["true", "false", "false"])
    expect([shown("beam-on"), shown("beam-light"), shown("beam-path")]).toEqual([true, false, false])
    name(2).click()
    expect([shown("beam-on"), shown("beam-light"), shown("beam-path")]).toEqual([false, false, true])
    expect(rows().map(row => row.dataset.active)).toEqual(["false", "false", "true"])
  })

  test("edits a point of the path, and keeps two at least", async () => {
    const { sighting } = await build({ beams: [{ id: "b", path, wavelengthNm: 532, powerW: 10 }] })
    name(2).click()
    typed(container.querySelector('#beam-place-parameters [data-key="altitudeM"]')!, "175")
    expect(sighting.skyEvents!.beams![0].path[0].altitudeM).toBe(175)
    expect(container.querySelector<HTMLButtonElement>("#beam-place-delete")!.disabled).toBe(true)
    container.querySelector<HTMLButtonElement>("#beam-place-add")!.click()
    expect(sighting.skyEvents!.beams![0].path).toHaveLength(3)
  })

  test("its ends dragged move when it is on, and the + switches it on at the playhead", async () => {
    const { sighting, time } = await build({ beams: [{ id: "b", path, wavelengthNm: 532, powerW: 10 }] })
    const lane = laidOut(rows()[0].querySelector<HTMLElement>(".track-lane")!)
    expect([...lane.querySelectorAll<HTMLElement>(".kf")].map(diamond => diamond.dataset.t)).toEqual(["0", "20000"])
    drag(lane, 199, 150)
    expect(sighting.skyEvents!.beams![0].untilT).toBe(15000)
    expect(container.querySelector<HTMLInputElement>('#beam-on-parameters [data-key="untilT"]')!.value).toBe("15")
    // The playhead went with the end dragged: taken back to 4 s.
    expect(time.now).toBe(15000)
    time.now = 4000
    add(0).click()
    expect(sighting.skyEvents!.beams![0]).toMatchObject({ fromT: 4000, untilT: 15000 })
  })

  test("a key of the light put at the playhead is as the light is then, and its colour picked sets its wavelength", async () => {
    const { sighting, time } = await build({ beams: [{ id: "b", path, wavelengthNm: 532, powerW: 10, light: [{ t: 0, wavelengthNm: 532 }, { t: 8000, wavelengthNm: 638, powerW: 20 }] }] })
    time.now = 4000
    add(1).click()
    const light = sighting.skyEvents!.beams![0].light!
    expect(light.map(key => key.t)).toEqual([0, 4000, 8000])
    expect(light[1]).toEqual({ t: 4000, wavelengthNm: 585, powerW: 20 })
    expect(shown("beam-light")).toBe(true)
    expect(container.querySelector<HTMLInputElement>('#beam-light-key-parameters [data-key="t"]')!.value).toBe("4")
    const colour = container.querySelector<HTMLInputElement>("#beam-colour")!
    colour.value = "#0000ff"
    colour.dispatchEvent(new Event("input", { bubbles: true }))
    expect(sighting.skyEvents!.beams![0].light![1].wavelengthNm).toBeLessThan(470)
    container.querySelector<HTMLButtonElement>("#beam-light-delete")!.click()
    expect(sighting.skyEvents!.beams![0].light).toHaveLength(2)
  })

  test("without a key of the light, the colour picked is the beam's own", async () => {
    const { sighting } = await build({ beams: [{ id: "b", path, wavelengthNm: 532, powerW: 10 }] })
    name(1).click()
    const colour = container.querySelector<HTMLInputElement>("#beam-colour")!
    expect(colour.value).toMatch(/^#[0-9a-f]{6}$/)
    colour.value = "#ff0000"
    colour.dispatchEvent(new Event("input", { bubbles: true }))
    expect(sighting.skyEvents!.beams![0].wavelengthNm).toBeGreaterThan(600)
  })

  test("a key of the path put at the playhead holds the path then, and its points are edited where it stands", async () => {
    const { sighting, time } = await build({ beams: [{ id: "b", path, wavelengthNm: 532, powerW: 10 }] })
    time.now = 6000
    add(2).click()
    const moves = sighting.skyEvents!.beams![0].moves!
    expect(moves).toEqual([{ t: 6000, path }])
    typed(container.querySelector('#beam-place-parameters [data-key="altitudeM"]')!, "300")
    expect(sighting.skyEvents!.beams![0].moves![0].path[0].altitudeM).toBe(300)
    // The beam's own path is left as it was.
    expect(sighting.skyEvents!.beams![0].path[0].altitudeM).toBe(172)
    container.querySelector<HTMLButtonElement>("#beam-move-delete")!.click()
    expect(sighting.skyEvents!.beams![0].moves).toBeUndefined()
  })

  test("deleting the last beam leaves no event of the sky behind", async () => {
    const { sighting } = await build({ beams: [{ id: "b", path, wavelengthNm: 532, powerW: 10 }] })
    container.querySelector<HTMLButtonElement>("#beam-delete")!.click()
    expect(sighting.skyEvents).toBeUndefined()
  })
})
