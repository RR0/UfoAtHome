import { describe, expect, it } from "vitest"
import saintLo from "../../../public/demo-data/observer-saint-lo.json"
import valensole from "../../../public/demo-data/observer-valensole.json"
import { KeyframeRuns } from "../../../src/engine/events/KeyframeRuns.js"
import { ObserverTrack } from "../../../src/engine/model/ObserverTrack.js"
import { fromSightingJson, toSightingJson, type SightingRecordingJson } from "../../../src/engine/persistence/sightingJson.js"

const told = (sampleMs?: number) => fromSightingJson({
  ...(structuredClone(saintLo) as unknown as SightingRecordingJson),
  ...(sampleMs === undefined ? {} : { sampleMs })
} as unknown as SightingRecordingJson)

describe("KeyframeRuns", () => {
  it("keeps the first and the last of keyframes that say the same thing, so that the player draws the same", () => {
    const track = new ObserverTrack()
    const pose = (headingDeg: number) => ({ lat: 1, lng: 2, elevationM: 0, headingDeg, pitchDeg: 0, fovDeg: 60 })
    for (const [t, heading] of [[0, 10], [100, 10], [200, 10], [300, 10], [400, 20], [500, 20], [600, 30]]) track.addKeyframe(t, pose(heading))
    const before = [50, 250, 350, 450, 550].map(t => track.getInterpolatedPoseAt(t)!.headingDeg)
    KeyframeRuns.observer(track)
    expect(track.allKeyframes.map(key => key.t)).toEqual([0, 300, 400, 500, 600])
    expect([50, 250, 350, 450, 550].map(t => track.getInterpolatedPoseAt(t)!.headingDeg)).toEqual(before)
  })

  it("leaves Masse's look held as two keyframes while he stands looking, and what he is drawn doing the same", () => {
    const sighting = fromSightingJson(structuredClone(valensole) as unknown as SightingRecordingJson)
    const keys = sighting.observerTrack.allKeyframes
    for (let index = 1; index < keys.length - 1; index++) {
      const said = (k: number) => JSON.stringify(keys[k].pose)
      expect(said(index) === said(index - 1) && said(index) === said(index + 1), `at ${keys[index].t}`).toBe(false)
    }
    // Still written as its events.
    expect(toSightingJson(sighting).observerTrack).toBeUndefined()
  })
})

describe("Sighting.sampleMs", () => {
  it("works the shapes and the look that follows them out at the recording's pace, the same for both", () => {
    const sighting = told(50)
    const times = (keys: ReadonlyArray<{ t: number }>) => keys.map(key => key.t).filter(t => t > 0 && t < 4000)
    const looks = times(sighting.observerTrack.allKeyframes)
    const shapes = times(sighting.timeline.allKeyframes)
    expect(looks.every(t => t % 50 === 0)).toBe(true)
    expect(shapes.every(t => t % 50 === 0)).toBe(true)
    // Where the look still moves, at the instants the shapes are drawn: before his reaction it holds still, and is two keyframes.
    expect(looks.every(t => shapes.includes(t))).toBe(true)
    expect(looks.filter(t => t >= 1000)).toEqual(shapes.filter(t => t >= 1000))
    // Written back as it was said.
    expect(toSightingJson(sighting).sampleMs).toBe(50)
  })

  it("keeps each its own pace when the recording says none: the shapes and the look every 25 ms", () => {
    const sighting = told()
    // His look held still until he reacts: its first and its last there (the look he held, which states no roll, then the first of the
    // follow, which does), then every 25 ms as it moves.
    expect(sighting.observerTrack.allKeyframes.slice(0, 5).map(key => key.t)).toEqual([0, 25, 500, 525, 550])
    expect(sighting.timeline.allKeyframes.slice(0, 4).map(key => key.t)).toEqual([0, 25, 50, 75])
    expect(toSightingJson(sighting).sampleMs).toBeUndefined()
  })
})
