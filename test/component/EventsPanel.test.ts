import { afterEach, describe, expect, it } from "vitest"
import silly from "../../public/demo-data/observer-silly-le-long.json"
import valensole from "../../public/demo-data/observer-valensole.json"
import { EventsPanel } from "../../src/component/EventsPanel.js"
import { eventsMessages_fr } from "../../src/component/messages/EventsMessages_fr.js"
import { TimelineTracks } from "../../src/component/TimelineTracks.js"
import { positionInputMessages_en, type PositionInputElement } from "../../src/component/PositionInputElement.js"
import type { PositionFrame } from "../../src/engine/model/SaidPosition.js"
import { fromSightingJson, toSightingJson, type SightingRecordingJson } from "../../src/engine/persistence/sightingJson.js"

function mounted(actor: "observer" | "phenomenon" | "bodies" = "observer", json: unknown = silly, now = 0, frame?: PositionFrame) {
  const sighting = fromSightingJson(json as SightingRecordingJson)
  const root = document.createElement("div")
  root.innerHTML = `<h3><span class="events-title"></span></h3><div class="events-body"></div>`
  document.body.append(root)
  const calls = { editing: 0, changed: 0, seek: [] as number[] }
  const panel = new EventsPanel(root, {
    sighting: () => sighting,
    editing: () => calls.editing++,
    changed: () => { calls.changed++; panel.render() },
    seek: t => calls.seek.push(t),
    now: () => now,
    currentBody: () => sighting.interpretation?.bodies[0]?.id,
    ...(frame ? { positionFrame: () => frame, positionMessages: () => positionInputMessages_en } : {})
  }, eventsMessages_fr, actor)
  panel.render()
  // The events are bars on the panel's timeline, in the order of the recording's events: pressed, one is picked.
  const bars = () => [...root.querySelectorAll<HTMLElement>(".events-timeline .span[data-id]")]
  const labels = () => bars().map(bar => bar.textContent)
  const press = (bar: HTMLElement) => bar.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }))
  const pick = (index: number) => press(bars()[index])
  const pickId = (id: string) => press(bars().find(bar => bar.dataset.id === id)!)
  const picked = () => root.querySelector<HTMLElement>('.events-timeline .span[aria-selected="true"]')?.dataset.id
  return { sighting, root, panel, calls, labels, pick, pickId, picked }
}

describe("EventsPanel", () => {
  afterEach(() => {
    document.body.innerHTML = ""
  })

  it("lists the observer's events to pick from, and shows the picked one's parameters, and where they come from", () => {
    const { root, labels, pick, picked, calls } = mounted()
    expect(root.querySelector("#observer-event")).toBeNull()
    expect(labels()).toEqual(["Conduit", "Regarde la route", "Se penche", "Regarde dans le rétroviseur"])
    expect(picked()).toBe("0")
    // One event's fields at a time.
    expect(root.querySelector(".events-fields")!.textContent).toContain("Vitesses")
    expect(root.querySelector(".events-fields .basis-mark[data-basis='derived']")).not.toBeNull()
    pick(2)
    expect(calls.seek).toEqual([93800])
    expect(root.querySelector(".events-fields")!.textContent).toContain("Déplace l'œil de")
    expect(root.querySelector(".events-fields")!.textContent).not.toContain("Vitesses")
    expect(root.querySelector(".events-note")!.textContent).toBe(eventsMessages_fr.derivedNote)
  })

  it("works the poses out again when a speed is typed, and writes the events alone", () => {
    const { sighting, root, calls } = mounted()
    const before = sighting.observerTrack.allKeyframes.find(keyframe => keyframe.t === 2000)!.pose.lat!
    const speed = root.querySelectorAll<HTMLInputElement>(".events-fields .event-rows input")[1]
    speed.value = "120"
    speed.dispatchEvent(new Event("change"))
    expect(calls).toMatchObject({ editing: 1, changed: 1 })
    expect(sighting.observerTrack.allKeyframes.find(keyframe => keyframe.t === 2000)!.pose.lat).not.toBe(before)
    const written = toSightingJson(sighting)
    expect(written.observerTrack).toBeUndefined()
    // Typed by the author: no longer the simulation's, so no longer said to be derived from it.
    expect((written.events![0].params!.speeds as unknown[])[0]).toEqual({ t: 0, kmh: 120 })
  })

  it("says when the author's own poses win, and gives the events back", () => {
    const { sighting, root, panel } = mounted()
    const first = sighting.observerTrack.allKeyframes[0]
    sighting.observerTrack.addKeyframe(first.t, { ...first.pose, headingDeg: 10 })
    panel.sync()
    expect(root.querySelector(".events-note")!.textContent).toBe(eventsMessages_fr.overriddenNote)
    root.querySelector<HTMLButtonElement>(".events-reset")!.click()
    expect(sighting.observerTrack.allKeyframes[0].pose.headingDeg).not.toBe(10)
    expect(toSightingJson(sighting).observerTrack).toBeUndefined()
  })

  it("adds an event of a kind at the playhead, picks it, and removes it, what is said of the others' parameters following them", () => {
    const { sighting, root, panel, picked } = mounted("bodies", valensole, 100000)
    const count = sighting.events!.length
    root.querySelector<HTMLButtonElement>("#bodies-event-add")!.click()
    root.querySelector<HTMLElement>("#bodies-event-kind-rise")!.click()
    expect(sighting.events).toHaveLength(count + 1)
    expect(sighting.events![count]).toMatchObject({ eventType: "rise", who: "craft", t: 100000, until: 103000 })
    expect(picked()).toBe(String(count))
    // A rise is drawn at once: the craft is off the ground in the middle of it.
    expect(sighting.interpretation!.bodies[0].track.some(key => key.t > 100000 && key.t < 103000 && (key.altitudeAboveGroundM ?? 0) > 0)).toBe(true)
    // The first event, and what was said of the craft's first rise (the fourth event), which moves up one.
    const riseBasis = sighting.provenance.at("events.3.params.angleDeg")
    panel.pick(0)
    root.querySelector<HTMLButtonElement>("#bodies-event-delete")!.click()
    expect(sighting.events).toHaveLength(count)
    expect(sighting.provenance.at("events.2.params.angleDeg")).toEqual(riseBasis)
  })
})

describe("EventsPanel of the phenomenon", () => {
  afterEach(() => {
    document.body.innerHTML = ""
  })

  it("lists what the phenomenon did, and works the account's shapes out again when its size is typed", () => {
    const { sighting, root, labels } = mounted("phenomenon")
    expect(labels()).toEqual(["Se tient", "Aspect", "Aspect", "Clignote", "Clignote", "Disparaît"])
    expect(root.querySelector(".events-note")!.textContent).toBe(eventsMessages_fr.derivedShapesNote)
    const before = sighting.timeline.getInterpolatedShapeAt(40000, "pan")!.angular!.widthDeg
    // Its width at 36.6 s (the third row: an instant, a width, a height each), doubled.
    const width = root.querySelectorAll<HTMLInputElement>(".events-fields .event-rows input[type=number]")[7]
    width.value = String(Number(width.value) * 2)
    width.dispatchEvent(new Event("change"))
    expect(sighting.timeline.getInterpolatedShapeAt(40000, "pan")!.angular!.widthDeg).toBeGreaterThan(before)
    expect(toSightingJson(sighting).timeline.keyframes).toEqual([])
  })
})

describe("TimelineTracks", () => {
  it("says a place as every position is, from the observer or as degrees, and keeps how it was said once the focus leaves it", () => {
    const { sighting, root, pick, labels, calls } = mounted("observer", valensole, 0, { origin: { lat: 43.8447, lng: 5.9632 }, references: [{ label: "the observer", eastM: 0, northM: 0 }] })
    pick(labels().findIndex(text => text!.includes("Marche")))
    const to = root.querySelectorAll<PositionInputElement>(".events-fields rr0-input-position")[1]
    expect(to).toBeDefined()
    to.querySelector<HTMLButtonElement>(".position-mode")!.click()
    to.eastInput.value = "10"
    to.eastInput.dispatchEvent(new Event("input", { bubbles: true }))
    to.dispatchEvent(new FocusEvent("focusout", { bubbles: true }))
    const event = sighting.events!.find(candidate => candidate.eventType === "walk")!
    const place = event.params!.to as { lat: number, lng: number, said?: { eastM: number } }
    expect(place.said?.eastM).toBe(10)
    expect(place.lng).toBeGreaterThan(5.9632)
    expect(calls.changed).toBe(1)
  })

  it("draws a track's events as bars, in rows where they overlap", () => {
    const host = document.createElement("div")
    const tracks = new TimelineTracks(host, () => undefined, { addKeyframeHere: "", keyframeHere: "", zoomHint: "" })
    tracks.show([{
      id: "observer", label: "observateur", color: "#7fd4ff", times: [],
      spans: [{ t: 0, until: 100, label: "Conduit" }, { t: 0, until: 50, label: "Regarde la route" }, { t: 50, until: 100, label: "Regarde dans le rétroviseur" }],
      open: () => undefined, add: () => undefined
    }], 100, 0)
    const bars = [...host.querySelectorAll<HTMLElement>(".track-lane .span")]
    expect(bars.map(bar => [bar.textContent, bar.style.top])).toEqual([["Conduit", "0%"], ["Regarde la route", "50%"], ["Regarde dans le rétroviseur", "50%"]])
    expect(host.querySelectorAll(".track-lane .kf")).toHaveLength(0)
  })
})

describe("EventsPanel's tables of instants", () => {
  it("adds a row after the last, removes one, keeps them in the order of their instants, and says a row comes at once", () => {
    const { sighting, root } = mounted("phenomenon")
    const metres = () => (sighting.events!.find(event => Array.isArray((event.params as Record<string, unknown> | undefined)?.metres))!.params!.metres as { t: number, step?: boolean }[])
    const count = metres().length
    root.querySelector<HTMLButtonElement>(".events-fields .event-row-add")!.click()
    expect(metres().length).toBe(count + 1)
    expect(metres()[count].t).toBe(metres()[count - 1].t + 1000)
    // The new row's instant typed before the first: it goes first.
    const instants = () => [...root.querySelectorAll<HTMLInputElement>(".events-fields .event-rows input[type=number]")].filter((_, index) => index % 3 === 0)
    const last = instants()[count]
    last.value = String(metres()[0].t / 1000 - 1)
    last.dispatchEvent(new Event("change"))
    expect(metres().map(row => row.t)).toEqual([...metres().map(row => row.t)].sort((a, b) => a - b))
    const step = root.querySelector<HTMLInputElement>(".events-fields .event-row-step input")!
    step.checked = true
    step.dispatchEvent(new Event("change"))
    expect(metres()[1].step).toBe(true)
    root.querySelectorAll<HTMLButtonElement>(".events-fields .event-row-remove")[0].click()
    expect(metres().length).toBe(count)
  })
})

describe("EventsPanel's choices", () => {
  it("picks a value the player knows among the others, and says what one the file leaves out then is", async () => {
    const saintLo = (await import("../../public/demo-data/observer-saint-lo.json")).default
    const { sighting, root, pick, labels } = mounted("phenomenon", saintLo)
    pick(labels().findIndex(text => text!.includes("Parcourt")))
    const travel = sighting.events!.find(event => event.eventType === "travel")!
    const sizeBy = [...root.querySelectorAll<HTMLSelectElement>(".events-fields .event-params select")].find(select => [...select.options].some(option => option.value === "altitude"))!
    expect(sizeBy.value).toBe("altitude")
    sizeBy.value = ""
    sizeBy.dispatchEvent(new Event("change"))
    expect(travel.params!.sizeBy).toBeUndefined()
    pick(labels().findIndex(text => text!.includes("Se tourne")))
    const seenFrom = [...root.querySelectorAll<HTMLSelectElement>(".events-fields .event-params select")].find(select => [...select.options].some(option => option.value === "craft"))!
    expect(seenFrom.value).toBe("craft")
  })
})

describe("EventsPanel's bases", () => {
  it("says what each parameter stands on, and keeps what the author says of it, without forgetting the value", () => {
    const { sighting, root } = mounted("phenomenon")
    const basis = root.querySelector<HTMLElement & { pill: HTMLElement, openWindow?: HTMLElement }>(".events-fields rr0-input-basis")!
    const path = [...sighting.provenance.paths()].find(candidate => /^events\.\d+\.params\./.test(candidate))
    basis.pill.click()
    const select = basis.openWindow!.querySelector("select")!
    select.value = "measured"
    select.dispatchEvent(new Event("change"))
    const edited = [...sighting.provenance.paths()].filter(candidate => sighting.provenance.at(candidate)!.basis === "measured")
    expect(edited.length).toBe(1)
    expect(edited[0]).toMatch(/^events\.\d+\.params\./)
    expect(path).toBeDefined()
  })

  it("keeps a label short, its details in a (?)", () => {
    const { root, pick, labels } = mounted("phenomenon")
    pick(labels().findIndex(text => text!.includes("Se tient")))
    const label = [...root.querySelectorAll(".events-fields .event-param-label")].find(candidate => candidate.querySelector("rr0-hint"))!
    expect(label.querySelector(".event-param-name")!.firstChild!.textContent).toBe("Taille")
    expect(label.querySelector("rr0-hint button")!.getAttribute("title")).toContain("hauteur au-dessus de l'œil")
  })
})
