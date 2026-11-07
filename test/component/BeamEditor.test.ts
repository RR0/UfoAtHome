import { afterEach, describe, expect, test } from "vitest"
import { BeamEditor } from "../../src/component/BeamEditor.js"
import { SaidTexts } from "../../src/engine/model/SaidText.js"
import type { Sighting } from "../../src/engine/model/Sighting.js"
import type { SkyEventsJson } from "../../src/engine/model/SkyEvents.js"

const path = [{ lat: 48.805, lng: 2.231, altitudeM: 172 }, { lat: 48.836, lng: 2.337, altitudeM: 88 }]

describe("BeamEditor", () => {
  const container = document.createElement("div")
  document.body.append(container)
  afterEach(() => container.replaceChildren())

  const build = (skyEvents?: SkyEventsJson) => {
    const sighting = { skyEvents, event: { place: [{ lat: 48, lng: 2 }] }, observerTrack: { getInterpolatedPoseAt: () => ({ headingDeg: 90 }) } } as unknown as Sighting
    let changes = 0
    const time = { now: 4000 }
    const editor = new BeamEditor(container, { sighting: () => sighting, said: () => new SaidTexts(["en"]), writingLanguage: () => "en", currentTime: () => time.now, duration: () => 20000, seekTo: t => { time.now = t }, changed: () => changes++ }, "en")
    editor.sync()
    return { sighting, changes: () => changes, time }
  }
  const typed = (target: Element, value: string) => {
    ;(target as HTMLInputElement).value = value
    target.dispatchEvent(new Event("input", { bubbles: true }))
  }

  test("adds a beam in front of the observer, a green laser, under the recording's events of the sky", () => {
    const { sighting, changes } = build()
    container.querySelector<HTMLButtonElement>("#beam-add")!.click()
    const beams = sighting.skyEvents!.beams!
    expect(beams).toHaveLength(1)
    expect(beams[0].wavelengthNm).toBe(532)
    expect(beams[0].path).toHaveLength(2)
    expect(changes()).toBe(1)
  })

  test("writes an edit as a new beam in a new list, so that the scene sees it", () => {
    const beam = { id: "b", path, wavelengthNm: 532, powerW: 10 }
    const { sighting } = build({ beams: [beam] })
    const before = sighting.skyEvents!.beams!
    typed(container.querySelector('[data-key="powerW"]')!, "20")
    const after = sighting.skyEvents!.beams!
    expect(after).not.toBe(before)
    expect(after[0]).not.toBe(beam)
    expect(after[0].powerW).toBe(20)
    expect(beam.powerW).toBe(10)
  })

  test("edits a point of the path, and keeps two at least", () => {
    const { sighting } = build({ beams: [{ id: "b", path, wavelengthNm: 532, powerW: 10 }] })
    typed(container.querySelector('#beam-place-parameters [data-key="altitudeM"]')!, "175")
    expect(sighting.skyEvents!.beams![0].path[0].altitudeM).toBe(175)
    expect(container.querySelector<HTMLButtonElement>("#beam-place-delete")!.disabled).toBe(true)
    container.querySelector<HTMLButtonElement>("#beam-place-add")!.click()
    expect(sighting.skyEvents!.beams![0].path).toHaveLength(3)
  })

  test("lays out when the beam is on on a timeline: the whole recording where it says nothing, its ends dragged, switched on at the playhead", () => {
    const { sighting, time } = build({ beams: [{ id: "b", path, wavelengthNm: 532, powerW: 10 }] })
    const lane = container.querySelector<HTMLElement>("#beam-timeline .track-lane")!
    expect([...lane.querySelectorAll<HTMLElement>(".kf")].map(diamond => diamond.dataset.t)).toEqual(["0", "20000"])
    // 200 px over the 20 s of the recording: its end dragged back to 15 s.
    lane.getBoundingClientRect = () => ({ left: 0, width: 200, top: 0, height: 24, right: 200, bottom: 24, x: 0, y: 0, toJSON: () => undefined })
    lane.setPointerCapture = () => undefined
    lane.dispatchEvent(new MouseEvent("pointerdown", { clientX: 199, bubbles: true }))
    lane.dispatchEvent(new MouseEvent("pointermove", { clientX: 150, bubbles: true }))
    lane.dispatchEvent(new MouseEvent("pointerup", { clientX: 150, bubbles: true }))
    expect(sighting.skyEvents!.beams![0].untilT).toBe(15000)
    expect(container.querySelector<HTMLInputElement>('[data-key="untilT"]')!.value).toBe("15")
    // The playhead went with the end dragged: taken back to 4 s.
    expect(time.now).toBe(15000)
    time.now = 4000
    container.querySelector<HTMLButtonElement>("#beam-timeline .track-add")!.click()
    expect(sighting.skyEvents!.beams![0]).toMatchObject({ fromT: 4000, untilT: 15000 })
  })

  test("deleting the last beam leaves no event of the sky behind", () => {
    const { sighting } = build({ beams: [{ id: "b", path, wavelengthNm: 532, powerW: 10 }] })
    container.querySelector<HTMLButtonElement>("#beam-delete")!.click()
    expect(sighting.skyEvents).toBeUndefined()
  })
})
