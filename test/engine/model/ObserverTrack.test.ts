import { describe, expect, it } from "vitest"
import { ObserverTrack } from "../../../src/engine/model/ObserverTrack.js"

describe("A key that sets the view of its instant alone", () => {
  const pose = (headingDeg: number) => ({ lat: 51, lng: -1.5, elevationM: 3000, headingDeg, pitchDeg: -29, fovDeg: 20 })
  const track = () => {
    const made = new ObserverTrack()
    for (const t of [0, 100, 200, 300]) made.addKeyframe(t, pose(3))
    return made
  }

  it("is said of the stretch it bounds or lies in, and of no other", () => {
    const made = track()
    made.addKeyframe(150, pose(29), true)
    expect(made.turnIsViewOnly(129, 150)).toBe(true)
    expect(made.turnIsViewOnly(150, 160)).toBe(true)
    // Between the keys around it, the stretch before and after it reach it too.
    expect(made.turnIsViewOnly(110, 130)).toBe(true)
    expect(made.turnIsViewOnly(210, 230)).toBe(false)
    expect(made.turnIsViewOnly(20, 40)).toBe(false)
  })

  it("keeps what it says when its pose is set again, until said otherwise", () => {
    const made = track()
    made.addKeyframe(150, pose(29), true)
    made.addKeyframe(150, pose(31))
    expect(made.allKeyframes.find(keyframe => keyframe.t === 150)?.viewOnly).toBe(true)
    made.setViewOnly(150, false)
    expect(made.allKeyframes.find(keyframe => keyframe.t === 150)).toEqual({ t: 150, pose: pose(31) })
  })

  it("is read from the file and written back", () => {
    const made = track()
    made.addKeyframe(150, pose(29), true)
    const again = ObserverTrack.fromJSON(JSON.parse(JSON.stringify(made.toJSON())))
    expect(again.allKeyframes.find(keyframe => keyframe.t === 150)?.viewOnly).toBe(true)
    expect(again.allKeyframes.filter(keyframe => keyframe.viewOnly).length).toBe(1)
  })
})
