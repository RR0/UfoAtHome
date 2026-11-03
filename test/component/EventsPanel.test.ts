import { afterEach, describe, expect, it } from "vitest"
import silly from "../../public/demo-data/observer-silly-le-long.json"
import { EventsPanel } from "../../src/component/EventsPanel.js"
import { eventsMessages_fr } from "../../src/component/messages/EventsMessages_fr.js"
import { TimelineTracks } from "../../src/component/TimelineTracks.js"
import { fromSightingJson, toSightingJson, type SightingRecordingJson } from "../../src/engine/persistence/sightingJson.js"

function mounted(actor: "observer" | "phenomenon" = "observer") {
  const sighting = fromSightingJson(silly as unknown as SightingRecordingJson)
  const root = document.createElement("div")
  root.innerHTML = `<h3><span class="events-title"></span></h3><div class="events-body"></div>`
  document.body.append(root)
  const calls = { editing: 0, changed: 0, seek: [] as number[] }
  const panel = new EventsPanel(root, {
    sighting: () => sighting,
    editing: () => calls.editing++,
    changed: () => calls.changed++,
    seek: t => calls.seek.push(t)
  }, eventsMessages_fr, actor)
  panel.render()
  return { sighting, root, panel, calls }
}

describe("EventsPanel", () => {
  afterEach(() => {
    document.body.innerHTML = ""
  })

  it("lists the observer's events, their parameters and where those come from", () => {
    const { root } = mounted()
    const items = [...root.querySelectorAll(".events-list > li")]
    expect(items.map(item => item.querySelector(".event-kind")!.textContent)).toEqual(["Conduit", "Regarde la route", "Se penche", "Regarde dans le rétroviseur"])
    // The aircraft's flight is not the observer's: it is the aircraft's own.
    expect(root.textContent).not.toContain("fly")
    const drive = items[0].textContent!
    expect(drive).toContain("Vitesses")
    expect(drive).toContain("points")
    expect(items[0].querySelector(".event-basis[data-basis='derived']")).not.toBeNull()
    expect(root.querySelector(".events-note")!.textContent).toBe(eventsMessages_fr.derivedNote)
  })

  it("works the poses out again when a speed is typed, and writes the events alone", () => {
    const { sighting, root, calls } = mounted()
    const before = sighting.observerTrack.allKeyframes.find(keyframe => keyframe.t === 2000)!.pose.lat!
    const speed = root.querySelectorAll<HTMLInputElement>(".events-list > li:first-child .event-rows input")[1]
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
})

describe("EventsPanel of the phenomenon", () => {
  afterEach(() => {
    document.body.innerHTML = ""
  })

  it("lists what the phenomenon did, and works the account's shapes out again when its size is typed", () => {
    const { sighting, root } = mounted("phenomenon")
    const items = [...root.querySelectorAll(".events-list > li")]
    expect(items.map(item => item.querySelector(".event-kind")!.textContent)).toEqual(["Se tient", "Aspect", "Aspect", "Clignote", "Clignote", "Disparaît"])
    expect(items[1].textContent).toContain("4 parties")
    expect(root.querySelector(".events-note")!.textContent).toBe(eventsMessages_fr.derivedShapesNote)
    const before = sighting.timeline.getInterpolatedShapeAt(40000, "pan")!.angular!.widthDeg
    // Its width at 36.6 s (the third row: an instant, a width, a height each), doubled.
    const width = items[0].querySelectorAll<HTMLInputElement>(".event-rows input")[7]
    width.value = String(Number(width.value) * 2)
    width.dispatchEvent(new Event("change"))
    expect(sighting.timeline.getInterpolatedShapeAt(40000, "pan")!.angular!.widthDeg).toBeGreaterThan(before)
    expect(toSightingJson(sighting).timeline.keyframes).toEqual([])
  })
})

describe("TimelineTracks", () => {
  it("draws a track's events as bars, in rows where they overlap", () => {
    const host = document.createElement("div")
    const tracks = new TimelineTracks(host, () => undefined, { addKeyframeHere: "", keyframeHere: "" })
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
