import { describe, expect, it } from "vitest"
import silly from "../../../public/demo-data/observer-silly-le-long.json"
import sillyTemoins from "../../../public/demo-data/observer-silly-le-long-temoins.json"
import { fromSightingJson, toSightingJson, type SightingRecordingJson } from "../../../src/engine/persistence/sightingJson.js"
import reference from "./silly-poses.json"

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

  it("writes back the events and not what they give, while it is what they give", () => {
    const sighting = fromSightingJson(silly as unknown as SightingRecordingJson)
    const written = toSightingJson(sighting)
    expect(written.events).toHaveLength(5)
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
