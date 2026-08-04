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
