import { afterEach, describe, expect, test } from "vitest"
import { ReentryEditor } from "../../src/component/ReentryEditor.js"
import type { ReentryJson } from "../../src/engine/interpretation/Reentry.js"
import { SaidTexts } from "../../src/engine/model/SaidText.js"
import type { Sighting } from "../../src/engine/model/Sighting.js"
import type { SkyEventsJson } from "../../src/engine/model/SkyEvents.js"

const chelyabinsk = (): ReentryJson => ({
  id: "chelyabinsk",
  track: [{ t: -2000, lat: 54.5, lng: 64, altitudeKm: 95 }, { t: 10000, lat: 54.9, lng: 61, altitudeKm: 30 }],
  fragments: [{ id: "main", absoluteMagnitude: -27.5, lightCurve: [{ t: -2000, absoluteMagnitude: -3 }, { t: 8000, absoluteMagnitude: -27.5 }] }]
})

describe("ReentryEditor", () => {
  const container = document.createElement("div")
  document.body.append(container)
  afterEach(() => container.replaceChildren())

  const build = (skyEvents?: SkyEventsJson, at = 0) => {
    const sighting = { skyEvents, event: { place: [{ lat: 48, lng: 2 }] }, observerTrack: { getInterpolatedPoseAt: () => ({ headingDeg: 90 }) } } as unknown as Sighting
    let changes = 0
    const time = { now: at, seeks: [] as number[] }
    const editor = new ReentryEditor(container, {
      sighting: () => sighting, said: () => new SaidTexts(["en"]), writingLanguage: () => "en",
      currentTime: () => time.now, duration: () => 20000, seekTo: t => { time.seeks.push(t); time.now = t }, changed: () => changes++
    }, "en")
    editor.sync()
    return { sighting, changes: () => changes, time }
  }
  const typed = (target: Element, value: string) => {
    ;(target as HTMLInputElement).value = value
    target.dispatchEvent(new Event("input", { bubbles: true }))
  }
  const lanes = () => [...container.querySelectorAll<HTMLElement>("#reentry-timeline .track-lane")]
  const adds = () => [...container.querySelectorAll<HTMLButtonElement>("#reentry-timeline .track-add")]
  /** A lane laid out 220 px wide from x = 0: over −3.2 s to 11.2 s for Chelyabinsk's −2 s to 10 s, a tenth more on either side. */
  const laidOut = (lane: HTMLElement) => {
    lane.getBoundingClientRect = () => ({ left: 0, width: 220, top: 0, height: 24, right: 220, bottom: 24, x: 0, y: 0, toJSON: () => undefined })
    lane.setPointerCapture = () => undefined
    return lane
  }
  const pointer = (lane: HTMLElement, type: string, x: number) => lane.dispatchEvent(new MouseEvent(type, { clientX: x, bubbles: true }) as PointerEvent)

  test("adds a fireball in front of the observer, from the playhead on", () => {
    const { sighting, changes } = build(undefined, 4000)
    container.querySelector<HTMLButtonElement>("#reentry-add")!.click()
    container.querySelector<HTMLElement>("#reentry-add-fireball")?.click()
    const reentries = sighting.skyEvents!.reentries!
    expect(reentries).toHaveLength(1)
    expect(reentries[0].id).toBe("fireball-1")
    expect(reentries[0].track.map(place => place.t)).toEqual([4000, 7000])
    // East of the observer, who faces east.
    expect(reentries[0].track[0].lng).toBeGreaterThan(2)
    expect(reentries[0].fragments[0].absoluteMagnitude).toBeLessThanOrEqual(-4)
    expect(changes()).toBeGreaterThan(0)
  })

  test("lays the path and each piece out on a timeline of its own, in place of lists of instants", () => {
    build({ reentries: [chelyabinsk()] })
    expect(lanes()).toHaveLength(2)
    expect(container.querySelector("#reentry-place")).toBeNull()
    const [path, piece] = lanes()
    expect(path.querySelectorAll(".kf")).toHaveLength(2)
    expect(path.querySelector('.kf[data-selected="true"]')!.getAttribute("data-t")).toBe("-2000")
    expect(piece.querySelectorAll(".kf")).toHaveLength(2)
    expect(piece.querySelector(".span")).not.toBeNull()
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

  test("the + of the path puts a point at the playhead, where the fireball is then, and shows it", () => {
    const { sighting } = build({ reentries: [chelyabinsk()] }, 4000)
    adds()[0].click()
    const track = sighting.skyEvents!.reentries![0].track
    expect(track.map(place => place.t)).toEqual([-2000, 4000, 10000])
    expect(track[1].altitudeKm).toBeCloseTo(62.5, 1)
    expect((container.querySelector('#reentry-place-parameters [data-key="t"]') as HTMLInputElement).value).toBe("4")
  })

  test("the + of a piece puts a point of its light curve at the playhead, as bright as it is then", () => {
    const { sighting } = build({ reentries: [chelyabinsk()] }, 4000)
    adds()[1].click()
    const curve = sighting.skyEvents!.reentries![0].fragments[0].lightCurve!
    expect(curve.map(point => point.t)).toEqual([-2000, 4000, 8000])
    // Six tenths of the way from −3 to −27.5.
    expect(curve[1].absoluteMagnitude).toBeCloseTo(-17.7, 5)
  })

  test("a diamond pressed shows its point and takes the playhead there; dragged, it moves in time", () => {
    const { sighting, time } = build({ reentries: [chelyabinsk()] })
    const path = laidOut(lanes()[0])
    // The second point, at 10 s, is 13.2 s from the lane's start, of 14.4: 201.7 px.
    pointer(path, "pointerdown", 202)
    expect(time.seeks.at(-1)).toBe(10000)
    expect((container.querySelector('#reentry-place-parameters [data-key="altitudeKm"]') as HTMLInputElement).value).toBe("30")
    // 156 px is 7.01 s, put at the tenth of a second.
    pointer(path, "pointermove", 156)
    pointer(path, "pointerup", 156)
    expect(sighting.skyEvents!.reentries![0].track.map(place => place.t)).toEqual([-2000, 7000])
    // Nothing is there before the recording's start: the playhead stays at it.
    const again = laidOut(lanes()[0])
    pointer(again, "pointerdown", 0)
    pointer(again, "pointerup", 0)
    expect(time.seeks.at(-1)).toBe(0)
  })

  test("edits a piece's brightness and its light curve, keeping one piece at least", () => {
    const { sighting } = build({ reentries: [chelyabinsk()] })
    typed(container.querySelector('#reentry-fragment-parameters [data-key="absoluteMagnitude"]')!, "-27")
    expect(sighting.skyEvents!.reentries![0].fragments[0].absoluteMagnitude).toBe(-27)
    expect(container.querySelector<HTMLButtonElement>("#reentry-fragment-delete")!.disabled).toBe(true)
    typed(container.querySelector('#reentry-curve-parameters [data-key="absoluteMagnitude"]')!, "-4")
    expect(sighting.skyEvents!.reentries![0].fragments[0].lightCurve![0].absoluteMagnitude).toBe(-4)
    container.querySelector<HTMLButtonElement>("#reentry-fragment-add")!.click()
    expect(sighting.skyEvents!.reentries![0].fragments).toHaveLength(2)
    expect(sighting.skyEvents!.reentries![0].fragments[1].lagS).toBe(1)
    expect(lanes()).toHaveLength(3)
  })

  test("taking out the last points of a light curve leaves the piece without one", () => {
    const { sighting } = build({ reentries: [chelyabinsk()] })
    container.querySelector<HTMLButtonElement>("#reentry-curve-delete")!.click()
    container.querySelector<HTMLButtonElement>("#reentry-curve-delete")!.click()
    expect(sighting.skyEvents!.reentries![0].fragments[0].lightCurve).toBeUndefined()
    expect(container.querySelector<HTMLElement>("#reentry-curve-empty")!.hidden).toBe(false)
  })

  test("deleting the last re-entry leaves no event of the sky behind", () => {
    const { sighting } = build({ reentries: [chelyabinsk()] })
    container.querySelector<HTMLButtonElement>("#reentry-delete")!.click()
    expect(sighting.skyEvents).toBeUndefined()
  })
})
