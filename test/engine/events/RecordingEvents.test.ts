import { describe, expect, it } from "vitest"
import silly from "../../../public/demo-data/observer-silly-le-long.json"
import sillyTemoins from "../../../public/demo-data/observer-silly-le-long-temoins.json"
import valensole from "../../../public/demo-data/observer-valensole.json"
import valensolePv from "../../../public/demo-data/observer-valensole-pv-1965-07-02.json"
import { fromSightingJson, toSightingJson, type SightingRecordingJson } from "../../../src/engine/persistence/sightingJson.js"
import reference from "./silly-poses.json"
import { RecordingActors } from "../../../src/engine/events/RecordingActors.js"
import { BodyPlacement } from "../../../src/engine/interpretation/BodyPlacement.js"
import { isLightOnAt, lightOnFractionBetween, lightStateAt } from "../../../src/engine/model/Decor.js"

/** Poses of T1 as add_van.py wrote them before his events were (one in fifty, and his lean to the mirror), with the van's place then. */
type Reference = { count: number, poses: { t: number, lat: number, lng: number, elevationM: number, headingDeg: number, pitchDeg: number,
  van: { eastM: number, northM: number, headingDeg: number } }[] }

const angle = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180)

describe("RecordingEvents", () => {

  it.each([
    ["observer-silly-le-long", silly],
    ["observer-silly-le-long-temoins", sillyTemoins]
  ])("works out %s's poses and van from his events, as the script that wrote them did", (name, json) => {
    const sighting = fromSightingJson(json as unknown as SightingRecordingJson)
    const expected = (reference as Record<string, Reference>)[name]
    const poses = new Map(sighting.observerTrack.allKeyframes.map(keyframe => [keyframe.t, keyframe.pose]))
    const van = new Map(sighting.decor.find(object => object.id === "van")!.track!.map(keyframe => [keyframe.t, keyframe]))
    // The same instants: dense where his head turns, every quarter of a second elsewhere.
    expect(poses.size).toBe(expected.count)
    for (const want of expected.poses) {
      const got = poses.get(want.t)!
      const metres = Math.hypot((got.lat! - want.lat) * 111320, (got.lng! - want.lng) * 111320 * Math.cos(want.lat * Math.PI / 180))
      expect(metres, `place at ${want.t}`).toBeLessThan(0.02)
      expect(angle(got.headingDeg!, want.headingDeg), `heading at ${want.t}`).toBeLessThan(0.1)
      expect(Math.abs(got.pitchDeg - want.pitchDeg), `pitch at ${want.t}`).toBeLessThan(0.2)
      expect(Math.abs(got.elevationM - want.elevationM), `lean at ${want.t}`).toBeLessThan(0.005)
      const at = van.get(want.t)!
      expect(Math.hypot(at.eastM - want.van.eastM, at.northM - want.van.northM), `van at ${want.t}`).toBeLessThan(0.03)
      expect(angle(at.headingDeg!, want.van.headingDeg), `van heading at ${want.t}`).toBeLessThan(0.1)
    }
  })

  it("flies the aircraft down the runway's centreline, as the script that wrote its track did", () => {
    const sighting = fromSightingJson(silly as unknown as SightingRecordingJson)
    const track = new Map(sighting.decor.find(object => object.id === "f-hobs")!.track!.map(keyframe => [keyframe.t, keyframe]))
    expect(track.size).toBe(102)
    // build_silly.py's track, counted from where the road starts rather than from the observer: under a metre apart three kilometres off.
    for (const want of [
      { t: 0, eastM: 3328.2, northM: 2381.3, altitudeM: 197.7 }, { t: 60000, eastM: 1460.2, northM: 1566.3, altitudeM: 122.4 },
      { t: 120000, eastM: -407.8, northM: 751.3, altitudeM: 35.8 }, { t: 202000, eastM: -2960.8, northM: -362.5, altitudeM: 120 }
    ]) {
      const got = track.get(want.t)!
      expect(Math.hypot(got.eastM - want.eastM, got.northM - want.northM), `place at ${want.t}`).toBeLessThan(1)
      expect(Math.abs(got.altitudeM! - want.altitudeM), `height at ${want.t}`).toBeLessThan(0.1)
    }
    expect(toSightingJson(sighting).decor!.find(object => object.id === "f-hobs")!.track).toBeUndefined()
  })

  it("draws the account's shapes from where the phenomenon stood, how it looked and how its lights blinked, as the script that wrote them did", () => {
    const sighting = fromSightingJson(silly as unknown as SightingRecordingJson)
    const at = (t: number, id: string) => sighting.timeline.getInterpolatedShapeAt(t, id)!
    // build_silly.py's shapes: from the front, the bar and its lights; past the bridge, the V and its rectangles, off at 71.5 s.
    for (const [t, id, azimuthDeg, altitudeDeg, widthDeg] of [
      [40000, "pan", 34.16, 2.273, 3.5876], [40000, "blanc-g", 32.365, 2.273, 0.18], [40000, "rouge", 32.778, 2.273, 0.18],
      [71500, "pan", 290.087, 16.684, 21.3411], [71500, "rect-d", 300.239, 17.965, 2.0274]
    ] as const) {
      const shape = at(t, id)
      expect(angle(shape.aim!.azimuthDeg, azimuthDeg), `${id} azimuth at ${t}`).toBeLessThan(0.1)
      expect(Math.abs(shape.aim!.altitudeDeg - altitudeDeg), `${id} altitude at ${t}`).toBeLessThan(0.05)
      expect(Math.abs(shape.angular!.widthDeg - widthDeg), `${id} width at ${t}`).toBeLessThan(0.05)
    }
    expect(at(71500, "rect-g").color).toBe("#0b0c0e")
    expect(at(73500, "rect-g").color).toBe("#f4f7ff")
    expect(at(71500, "blanc-g").transparency).toBe(1)
    // The red light: on, then off half a second later.
    expect(at(1000, "rouge").transparency).toBe(0)
    expect(at(500, "rouge").transparency).toBe(1)
    expect(toSightingJson(sighting).timeline.keyframes).toEqual([])
  })

  it("walks Masse to the craft, and keeps it in the middle of his eyes as it leaves", () => {
    const sighting = fromSightingJson(valensole as unknown as SightingRecordingJson)
    // Where he stood in the poses Valensole held before its events.
    for (const [t, lat] of [[0, 43.845508], [15000, 43.845304], [30000, 43.845099], [45000, 43.844895], [55000, 43.844758], [270000, 43.844758]]) {
      // One even walk slowing into its stop, where four stretches were written: within a metre on the way, exact where he stops.
      expect(Math.abs(sighting.observerTrack.getInterpolatedPoseAt(t)!.lat! - lat) * 111320, `place at ${t}`).toBeLessThan(t === 0 || t >= 55000 ? 0.01 : 1)
    }
    const ground = { heightAt: () => 0 }
    const eyeAt = (t: number) => BodyPlacement.eyeOf(sighting, t, ground)
    const craft = new BodyPlacement(sighting.interpretation!.bodies.find(body => body.id === "craft")!, ground, eyeAt)
    for (const t of [254000, 256000, 258000, 260000, 262000]) {
      const body = craft.at(t)!, eye = eyeAt(t)!
      const pose = sighting.observerTrack.getInterpolatedPoseAt(t)!
      const east = body.eastM - eye.eastM, north = body.northM - eye.northM
      expect(angle(pose.headingDeg!, Math.atan2(east, north) * 180 / Math.PI), `heading at ${t}`).toBeLessThan(0.01)
      expect(Math.abs(pose.pitchDeg - Math.atan2(body.upM - eye.upM, Math.hypot(east, north)) * 180 / Math.PI), `pitch at ${t}`).toBeLessThan(0.01)
    }
    expect(toSightingJson(sighting).observerTrack).toBeUndefined()
  })

  it("draws the craft away as Masse told it: the tube drawn in, the legs turning, straight up, then off at a slant, gone", () => {
    const sighting = fromSightingJson(valensole as unknown as SightingRecordingJson)
    const ground = { heightAt: () => 0 }
    const craft = new BodyPlacement(sighting.interpretation!.bodies.find(body => body.id === "craft")!, ground, t => BodyPlacement.eyeOf(sighting, t, ground))
    expect(craft.at(247000)!.motions!["pivot-retract"]).toBeCloseTo(0.5, 5)
    // The legs, a part of it ("craft/legs"), half a turn a second from 248 s, anticlockwise seen from above; the hull not turning.
    expect(craft.at(258000)!.turns!.legs).toBeCloseTo(-1800, 3)
    expect(craft.at(258000)!.attitude.headingDeg).toBe(craft.at(240000)!.attitude.headingDeg)
    // On the ground, then 0.79 m up, straight, then where he lost it, 51 degrees off the vertical towards the west.
    expect(craft.at(250000)!.upM).toBeCloseTo(1.21, 2)
    expect(craft.at(255000)!).toMatchObject({ eastM: expect.closeTo(0, 2), upM: expect.closeTo(2, 1) })
    const lost = craft.at(262000)!
    expect(Math.hypot(lost.eastM + 29.4, lost.upM - 25.87)).toBeLessThan(0.2)
    expect(craft.at(262500)).toBeUndefined()
    const written = toSightingJson(sighting).interpretation!.bodies.find(body => body.id === "craft")!.track as unknown as { value: unknown[] }
    expect(written.value).toHaveLength(1)
  })

  it("turns a part of a body alone, to where an event about it says, as a head turns", () => {
    const sighting = fromSightingJson({
      ...(valensole as unknown as SightingRecordingJson),
      events: [...(valensole as unknown as SightingRecordingJson).events!, { type: "event", eventType: "turn", who: "etre-2/head", t: 52000, until: 53000, params: { headingDeg: 60 } }]
    } as unknown as SightingRecordingJson)
    const ground = { heightAt: () => 0 }
    const being = new BodyPlacement(sighting.interpretation!.bodies.find(body => body.id === "etre-2")!, ground, t => BodyPlacement.eyeOf(sighting, t, ground))
    expect(being.at(51000)!.turns!.head).toBe(0)
    expect(being.at(52500)!.turns!.head).toBeCloseTo(30, 5)
    expect(being.at(55000)!.turns!.head).toBe(60)
    expect(RecordingActors.issues(sighting)).toEqual([])
    // A part of nothing there is is not.
    sighting.events!.at(-1)!.who = "etre-9/head"
    expect(RecordingActors.issues(sighting).map(issue => issue.id)).toEqual(["etre-9/head"])
  })

  it("switches the lights of T1's craft as he told them: the red blinking, the front gone out, the rectangles blinking together", () => {
    for (const [json, at] of [[silly, { switch: 69500, vanish: 202500 }], [sillyTemoins, { switch: 83800, vanish: 211300 }]] as const) {
      const sighting = fromSightingJson(structuredClone(json) as unknown as SightingRecordingJson)
      const ground = { heightAt: () => 0 }
      const craft = new BodyPlacement(sighting.interpretation!.bodies.find(body => body.id === "engin")!, ground, t => BodyPlacement.eyeOf(sighting, t, ground))
      const lights = (t: number) => craft.at(t)!.lights!
      // Half a second on, half a second off, from the start; the whites steady.
      expect(lights(250)).toMatchObject({ "front-red": 500, "front-white-left": 500, "rear-left": 0 })
      expect(lights(750)["front-red"]).toBe(0)
      expect(lights(1250)["front-red"]).toBe(500)
      // A switch, never a fade: on until the millisecond it goes off.
      expect(lights(499)["front-red"]).toBe(500)
      expect(lights(500)["front-red"]).toBe(0)
      // The front gone out, for good, a group of three lights ("engin/front").
      expect(lights(at.switch - 1)["front-white-right"]).toBe(500)
      for (const t of [at.switch, at.vanish - 1, at.vanish + 5000]) {
        expect(lights(t)).toMatchObject({ "front-red": 0, "front-white-left": 0, "front-white-right": 0 })
      }
      // The rectangles, two lights of one group ("engin/rear"), two seconds on, two off, together, dark once it is lost.
      expect(lights(at.switch + 1000)).toMatchObject({ "rear-left": 30, "rear-right": 30 })
      expect(lights(at.switch + 3000)).toMatchObject({ "rear-left": 0, "rear-right": 0 })
      expect(lights(at.switch + 5000)).toMatchObject({ "rear-left": 30, "rear-right": 30 })
      expect(lights(at.vanish)["rear-left"]).toBe(0)
      // Written back as its events: the body states where it is to begin with, and how it is lit then.
      const written = toSightingJson(sighting).interpretation!.bodies.find(body => body.id === "engin")!.track as unknown as { value: unknown[] }
      expect(written.value).toHaveLength(1)
    }
  })

  it("lights a light from an event, for as long as it says, and dark again after", () => {
    const sighting = fromSightingJson({
      version: 3, observer: { id: "o" }, timeline: { keyframes: [] }, durationSeconds: 20,
      interpretation: { bodies: [{ id: "car", model: { id: "ellipsoid" }, groups: [{ id: "beacons", members: ["blue", "red"] }],
        track: [{ t: 0, eastM: 0, northM: 10, onGround: true, lights: { blue: 0, red: 0 } }] }] },
      events: [
        { type: "event", eventType: "light", who: "car/blue", t: 2000, until: 4000, params: { cdM2: 100 } },
        // Without an end, a blink goes on until the end of the recording.
        { type: "event", eventType: "blink", who: "car/beacons", t: 6000, params: { onS: 0.25, offS: 0.75, cdM2: 200 } }
      ]
    } as unknown as SightingRecordingJson)
    const ground = { heightAt: () => 0 }
    const car = new BodyPlacement(sighting.interpretation!.bodies[0], ground, () => ({ eastM: 0, northM: 0, upM: 1.6 }))
    expect(car.at(1999)!.lights!.blue).toBe(0)
    expect(car.at(2000)!.lights!.blue).toBe(100)
    expect(car.at(3999)!.lights!.blue).toBe(100)
    expect(car.at(4000)!.lights!.blue).toBe(0)
    expect(car.at(6100)!.lights).toMatchObject({ blue: 200, red: 200 })
    expect(car.at(6500)!.lights).toMatchObject({ blue: 0, red: 0 })
    expect(car.at(19100)!.lights).toMatchObject({ blue: 200, red: 200 })
    expect(RecordingActors.issues(sighting)).toEqual([])
  })

  it("switches the lamps of a decor object from the events about them, one or a group, and writes back the events alone", () => {
    const steady = { kind: "steady" } as const
    const json = {
      version: 3, observer: { id: "o" }, timeline: { keyframes: [] }, durationSeconds: 60,
      decor: [{ id: "plane", kind: "aircraft", eastM: 0, northM: 500, headingDeg: 0,
        groups: [{ id: "strobes", members: ["strobe-port", "strobe-starboard"] }],
        lights: [
          { id: "landing", offsetM: { x: 0, y: 0, z: 3 }, color: "#ffffff", intensity: 6, pattern: steady },
          { id: "strobe-port", offsetM: { x: -5, y: 0, z: 0 }, color: "#ffffff", intensity: 0, pattern: steady },
          { id: "strobe-starboard", offsetM: { x: 5, y: 0, z: 0 }, color: "#ffffff", intensity: 0, pattern: steady },
          { id: "nav", offsetM: { x: 0, y: 1, z: 0 }, color: "#ff0000", pattern: steady }
        ] }],
      events: [
        // The landing light put out at 10 s, for good.
        { type: "event", eventType: "light", who: "plane/landing", t: 10000, params: { intensity: 0 } },
        // The strobes, off to begin with, flashing a twentieth of a second every second from 20 s to 40 s.
        { type: "event", eventType: "blink", who: "plane/strobes", t: 20000, until: 40000, params: { onS: 0.05, offS: 0.95, intensity: 20 } }
      ]
    }
    const sighting = fromSightingJson(structuredClone(json) as unknown as SightingRecordingJson)
    const lamp = (id: string) => sighting.decor[0].lights!.find(light => light.id === id)!
    expect(isLightOnAt(lamp("landing"), 9999)).toBe(true)
    expect(isLightOnAt(lamp("landing"), 10000)).toBe(false)
    expect(isLightOnAt(lamp("landing"), 59000)).toBe(false)
    for (const id of ["strobe-port", "strobe-starboard"]) {
      expect(isLightOnAt(lamp(id), 19990)).toBe(false)
      expect(isLightOnAt(lamp(id), 20010)).toBe(true)
      expect(isLightOnAt(lamp(id), 20500)).toBe(false)
      expect(isLightOnAt(lamp(id), 33020)).toBe(true)
      expect(lightStateAt(lamp(id), 33020).intensity).toBe(20)
      expect(isLightOnAt(lamp(id), 40010)).toBe(false)
      // A pose of the whole blink: lit a twentieth of it, whatever its instants.
      expect(lightOnFractionBetween(lamp(id), 20000, 40000)).toBeCloseTo(0.05, 6)
      expect(lightOnFractionBetween(lamp(id), 0, 60000)).toBeCloseTo(1 / 60, 6)
    }
    expect(lamp("nav").keyframes).toBeUndefined()
    expect(RecordingActors.issues(sighting)).toEqual([])
    // Written back as the lamps it states, and the events.
    const written = toSightingJson(sighting)
    expect(written.decor![0].lights).toEqual(json.decor[0].lights)
    // A lamp it has not is no part of it.
    sighting.events![0].who = "plane/beacon"
    expect(RecordingActors.issues(sighting).map(issue => issue.id)).toEqual(["plane/beacon"])
  })

  it("has the beings crouched by the craft, then standing, the second turning round, until they go back in", () => {
    const sighting = fromSightingJson(valensole as unknown as SightingRecordingJson)
    const ground = { heightAt: () => 0 }
    const eyeAt = (t: number) => BodyPlacement.eyeOf(sighting, t, ground)
    const being = (id: string) => new BodyPlacement(sighting.interpretation!.bodies.find(body => body.id === id)!, ground, eyeAt)
    // Their model crouches by its own movement, at its standing size (see build_people.py's postures).
    expect(being("etre-1").at(30000)!.motions!.crouch).toBe(1)
    expect(being("etre-1").at(47000)!.motions!.crouch).toBeCloseTo(0.5, 5)
    expect(being("etre-1").at(50000)!.motions!.crouch).toBe(0)
    expect(being("etre-1").at(30000)!.sizeM.heightM).toBeCloseTo(0.95, 5)
    expect(being("etre-2").at(50000)!.attitude.headingDeg).toBeCloseTo(0, 5)
    expect(being("etre-2").at(60000)).toBeUndefined()
  })

  it("carries the passenger in the craft, wherever it goes", () => {
    const sighting = fromSightingJson(valensolePv as unknown as SightingRecordingJson)
    const ground = { heightAt: () => 0 }
    const eyeAt = (t: number) => BodyPlacement.eyeOf(sighting, t, ground)
    const bodies = sighting.interpretation!.bodies
    const craft = new BodyPlacement(bodies.find(body => body.id === "craft")!, ground, eyeAt)
    const passenger = new BodyPlacement(bodies.find(body => body.id === "passager")!, ground, eyeAt)
    for (const t of [61000, 62000, 63000, 63750]) {
      const a = craft.at(t)!, b = passenger.at(t)!
      expect(Math.hypot(a.eastM - b.eastM, a.northM - b.northM), `beside it at ${t}`).toBeLessThan(0.01)
    }
    expect(passenger.at(64000)).toBeUndefined()
  })

  it("writes back the events and not what they give, while it is what they give", () => {
    const sighting = fromSightingJson(silly as unknown as SightingRecordingJson)
    const written = toSightingJson(sighting)
    expect(written.events).toHaveLength(14)
    expect(written.observerTrack).toBeUndefined()
    expect(written.decor!.find(object => object.id === "van")!.track).toBeUndefined()
    // Read again, the same poses.
    const again = fromSightingJson(written)
    expect(again.observerTrack.allKeyframes).toEqual(sighting.observerTrack.allKeyframes)
  })

  it("keeps the poses an author changed, which then win over the events", () => {
    const sighting = fromSightingJson(silly as unknown as SightingRecordingJson)
    const first = sighting.observerTrack.allKeyframes[0]
    sighting.observerTrack.addKeyframe(first.t, { ...first.pose, headingDeg: 10 })
    const written = toSightingJson(sighting)
    expect(written.observerTrack!.keyframes[0].pose.headingDeg).toBe(10)
    expect(fromSightingJson(written).observerTrack.allKeyframes[0].pose.headingDeg).toBe(10)
  })

  it("says where its parameters come from, as any value does", () => {
    const sighting = fromSightingJson(silly as unknown as SightingRecordingJson)
    const drive = sighting.events!.findIndex(event => event.eventType === "drive")
    expect(sighting.provenance.at(`events.${drive}.params.speeds`)).toMatchObject({ basis: "derived" })
    expect(toSightingJson(sighting).events![drive].params!.speeds).toMatchObject({ basis: "derived" })
  })
})
