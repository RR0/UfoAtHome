import { describe, expect, it } from "vitest"
import { ObserverTrack, lerpObserverPose } from "../../src/engine/model/ObserverTrack.js"
import type { ObserverPose } from "../../src/engine/model/ObserverTrack.js"

function poseAt(lat: number, headingDeg?: number): ObserverPose {
  return { lat, lng: 0, elevationM: 0, headingDeg, pitchDeg: 0, fovDeg: 60 }
}

describe("ObserverTrack", () => {
  it("stores and retrieves an exact keyframe", () => {
    const track = new ObserverTrack()
    track.addKeyframe(100, poseAt(1))
    expect(track.getLatestPoseAt(100)?.lat).toBe(1)
  })

  it("keeps keyframes sorted regardless of insertion order", () => {
    const track = new ObserverTrack()
    track.addKeyframe(200, poseAt(2))
    track.addKeyframe(0, poseAt(0))
    track.addKeyframe(100, poseAt(1))
    expect(track.allKeyframes.map(k => k.t)).toEqual([0, 100, 200])
  })

  it("overwrites a keyframe recorded at the same t", () => {
    const track = new ObserverTrack()
    track.addKeyframe(100, poseAt(1))
    track.addKeyframe(100, poseAt(9))
    expect(track.allKeyframes).toHaveLength(1)
    expect(track.getLatestPoseAt(100)?.lat).toBe(9)
  })

  it("getLatestPoseAt holds the last recorded value between keyframes", () => {
    const track = new ObserverTrack()
    track.addKeyframe(0, poseAt(0))
    track.addKeyframe(200, poseAt(2))
    expect(track.getLatestPoseAt(0)?.lat).toBe(0)
    expect(track.getLatestPoseAt(150)?.lat).toBe(0)
    expect(track.getLatestPoseAt(200)?.lat).toBe(2)
    expect(track.getLatestPoseAt(1000)?.lat).toBe(2)
  })

  it("getLatestPoseAt is undefined before the first keyframe", () => {
    const track = new ObserverTrack()
    track.addKeyframe(100, poseAt(1))
    expect(track.getLatestPoseAt(0)).toBeUndefined()
  })

  it("getInterpolatedPoseAt blends between keyframes", () => {
    const track = new ObserverTrack()
    track.addKeyframe(0, poseAt(0))
    track.addKeyframe(200, poseAt(20))
    expect(track.getInterpolatedPoseAt(50)?.lat).toBeCloseTo(5)
    expect(track.getInterpolatedPoseAt(200)?.lat).toBeCloseTo(20)
  })

  it("getInterpolatedPoseAt holds the last value past the recorded range", () => {
    const track = new ObserverTrack()
    track.addKeyframe(0, poseAt(0))
    track.addKeyframe(200, poseAt(20))
    expect(track.getInterpolatedPoseAt(1000)?.lat).toBe(20)
  })

  it("clear() removes every keyframe", () => {
    const track = new ObserverTrack()
    track.addKeyframe(0, poseAt(1))
    track.addKeyframe(500, poseAt(2))
    track.clear()
    expect(track.allKeyframes).toHaveLength(0)
    expect(track.getLatestPoseAt(500)).toBeUndefined()
  })

  it("removeKeyframeAt() removes only the keyframe at that exact t, leaving others intact", () => {
    const track = new ObserverTrack()
    track.addKeyframe(0, poseAt(1))
    track.addKeyframe(500, poseAt(2))
    track.removeKeyframeAt(500)
    expect(track.allKeyframes.map(k => k.t)).toEqual([0])
    expect(track.getLatestPoseAt(0)?.lat).toBe(1)
  })

  it("removeKeyframeAt() is a no-op when there's no keyframe at that t", () => {
    const track = new ObserverTrack()
    track.addKeyframe(0, poseAt(1))
    track.removeKeyframeAt(250)
    expect(track.allKeyframes).toHaveLength(1)
  })

  it("round-trips through JSON", () => {
    const track = new ObserverTrack()
    track.addKeyframe(0, poseAt(1, 90))
    track.addKeyframe(500, poseAt(2, 100))
    const restored = ObserverTrack.fromJSON(track.toJSON())
    expect(restored.allKeyframes).toEqual(track.allKeyframes)
  })
})

describe("lerpObserverPose heading", () => {
  it("interpolates through the shorter arc across the 0/360 boundary", () => {
    const result = lerpObserverPose(poseAt(0, 350), poseAt(0, 10), 0.5)
    expect(result.headingDeg).toBeCloseTo(0)
  })

  it("interpolates a plain within-range heading normally", () => {
    const result = lerpObserverPose(poseAt(0, 10), poseAt(0, 30), 0.5)
    expect(result.headingDeg).toBeCloseTo(20)
  })

  it("stays undefined if either side has no known heading", () => {
    const result = lerpObserverPose(poseAt(0, undefined), poseAt(0, 30), 0.5)
    expect(result.headingDeg).toBeUndefined()
  })
})

describe("ObserverTrack moves the way a person does", () => {
  const look = (headingDeg: number) => ({ lat: 48, lng: 2, elevationM: 0, headingDeg, pitchDeg: 0, fovDeg: 60 })
  const at = (lat: number) => ({ lat, lng: 2, elevationM: 0, headingDeg: 0, pitchDeg: 0, fovDeg: 60 })

  it("turns the head from still, and arrives still moving, not at a robot's constant speed", () => {
    const track = new ObserverTrack()
    track.addKeyframe(0, look(300))
    track.addKeyframe(1000, look(350))
    // A quarter of the way through the time, well under a quarter of the way round, and still short of half-way at half-time…
    expect(track.getInterpolatedPoseAt(250)!.headingDeg!).toBeLessThan(300 + 50 * 0.2)
    const half = track.getInterpolatedPoseAt(500)!.headingDeg!
    expect(half).toBeGreaterThan(300 + 50 * 0.4)
    expect(half).toBeLessThan(325)
    // …and exactly where the recording says at its instants.
    expect(track.getInterpolatedPoseAt(1000)!.headingDeg!).toBe(350)
  })

  it("lets a look go a little past what it turned to, and settle back there, as a head does", () => {
    const track = new ObserverTrack()
    // Maffliers: the observer turns to the phenomenon, and looks at it.
    track.addKeyframe(4000, look(303))
    track.addKeyframe(4600, look(340))
    track.addKeyframe(4900, look(353.68))
    track.addKeyframe(25000, look(353.68))
    const at = (t: number) => track.getInterpolatedPoseAt(t)!.headingDeg!
    expect(at(4900)).toBe(353.68)
    // Still turning as it gets there: no dead stop.
    expect(at(4900) - at(4890)).toBeGreaterThan(0.2)
    // A little past, a tenth of a second later, and never more than a tenth of the turn…
    const past = at(5020)
    expect(past).toBeGreaterThan(353.68 + 0.3)
    expect(past).toBeLessThan(353.68 + 1.4)
    // …and settled back well before the next keyframe, which is met exactly.
    expect(at(6500)).toBeCloseTo(353.68, 2)
    expect(at(25000)).toBe(353.68)
  })

  it("settles a look that the recording ends on", () => {
    const track = new ObserverTrack()
    track.addKeyframe(0, look(0))
    track.addKeyframe(500, look(30))
    expect(track.getInterpolatedPoseAt(620)!.headingDeg!).toBeGreaterThan(30.5)
    expect(track.getInterpolatedPoseAt(3000)!.headingDeg!).toBeCloseTo(30, 3)
  })

  it("turns through north the short way", () => {
    const track = new ObserverTrack()
    track.addKeyframe(0, look(350))
    track.addKeyframe(1000, look(10))
    const half = track.getInterpolatedPoseAt(500)!.headingDeg!
    expect(half > 355 || half < 5).toBe(true)
  })

  it("slows down into a stop the data states, and never overshoots it", () => {
    const track = new ObserverTrack()
    track.addKeyframe(0, at(0))
    track.addKeyframe(1000, at(1))
    track.addKeyframe(2000, at(2))
    track.addKeyframe(3000, at(2))
    const before = track.getInterpolatedPoseAt(1900)!.lat!
    const last = track.getInterpolatedPoseAt(1999)!.lat!
    // The last tenth of a second before the stop covers far less than a tenth of the stride.
    expect(last - before).toBeLessThan(0.05)
    for (let t = 2000; t <= 3000; t += 100) expect(track.getInterpolatedPoseAt(t)!.lat).toBeCloseTo(2, 9)
  })

  it("stops dead in under a second, however far apart the keyframes around the stop are", () => {
    const track = new ObserverTrack()
    track.addKeyframe(0, at(0))
    track.addKeyframe(45_000, at(45))
    track.addKeyframe(55_000, at(55))
    track.addKeyframe(120_000, at(55))
    // Still at its walking pace a second and a half before the stop…
    const pace = track.getInterpolatedPoseAt(53_600)!.lat! - track.getInterpolatedPoseAt(53_500)!.lat!
    expect(pace).toBeGreaterThan(0.1)
    // …and stopped when the recording says.
    expect(track.getInterpolatedPoseAt(55_000)!.lat).toBe(55)
    const lastTenth = track.getInterpolatedPoseAt(55_000)!.lat! - track.getInterpolatedPoseAt(54_900)!.lat!
    expect(lastTenth).toBeLessThan(0.03)
  })

  it("carries a steady movement through its keyframes at its own speed", () => {
    const track = new ObserverTrack()
    for (let k = 0; k <= 4; k++) track.addKeyframe(k * 1000, at(k))
    expect(track.getInterpolatedPoseAt(1500)!.lat).toBeCloseTo(1.5, 9)
    expect(track.getInterpolatedPoseAt(250)!.lat).toBeCloseTo(0.25, 9)
  })
})
