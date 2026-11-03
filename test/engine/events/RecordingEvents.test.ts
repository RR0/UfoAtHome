import { describe, expect, it } from "vitest"
import silly from "../../../public/demo-data/observer-silly-le-long.json"
import sillyTemoins from "../../../public/demo-data/observer-silly-le-long-temoins.json"
import valensole from "../../../public/demo-data/observer-valensole.json"
import valensolePv from "../../../public/demo-data/observer-valensole-pv-1965-07-02.json"
import { fromSightingJson, toSightingJson, type SightingRecordingJson } from "../../../src/engine/persistence/sightingJson.js"
import reference from "./silly-poses.json"
import { BodyPlacement } from "../../../src/engine/interpretation/BodyPlacement.js"

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
    // Half a turn a second, from 248 s.
    expect(craft.at(258000)!.motions!["legs-turn"]).toBeCloseTo(5, 5)
    // On the ground, then 0.79 m up, straight, then where he lost it, 51 degrees off the vertical towards the west.
    expect(craft.at(250000)!.upM).toBeCloseTo(1.21, 2)
    expect(craft.at(255000)!).toMatchObject({ eastM: expect.closeTo(0, 2), upM: expect.closeTo(2, 1) })
    const lost = craft.at(262000)!
    expect(Math.hypot(lost.eastM + 29.4, lost.upM - 25.87)).toBeLessThan(0.2)
    expect(craft.at(262500)).toBeUndefined()
    const written = toSightingJson(sighting).interpretation!.bodies.find(body => body.id === "craft")!.track as unknown as { value: unknown[] }
    expect(written.value).toHaveLength(1)
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
    expect(written.events).toHaveLength(11)
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
