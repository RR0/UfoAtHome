import { describe, expect, it } from "vitest"
import { resolveDecorGazeAt } from "../../../src/engine/model/Decor.js"
import type { DecorObject } from "../../../src/engine/model/Decor.js"

const figure = (track?: DecorObject["track"]): DecorObject => ({ id: "steward", kind: "observer", eastM: 0, northM: 0, track })

describe("resolveDecorGazeAt", () => {
  it("looks nowhere in particular when no keyframe says where", () => {
    expect(resolveDecorGazeAt(figure(), 0)).toBeUndefined()
    expect(resolveDecorGazeAt(figure([{ t: 0, eastM: 0, northM: 0 }]), 1000)).toBeUndefined()
  })

  it("holds the first gaze before it and the last after it", () => {
    const track = [{ t: 1000, eastM: 0, northM: 0, gazeAzimuthDeg: 270 }, { t: 3000, eastM: 0, northM: 0, gazeAzimuthDeg: 240 }]
    expect(resolveDecorGazeAt(figure(track), 0)).toBe(270)
    expect(resolveDecorGazeAt(figure(track), 9000)).toBe(240)
  })

  it("turns between two keyframes", () => {
    const track = [{ t: 0, eastM: 0, northM: 0, gazeAzimuthDeg: 270 }, { t: 2000, eastM: 0, northM: 0, gazeAzimuthDeg: 250 }]
    expect(resolveDecorGazeAt(figure(track), 1000)).toBeCloseTo(260, 6)
  })

  it("turns the short way round the compass", () => {
    const track = [{ t: 0, eastM: 0, northM: 0, gazeAzimuthDeg: 350 }, { t: 2000, eastM: 0, northM: 0, gazeAzimuthDeg: 10 }]
    expect(resolveDecorGazeAt(figure(track), 1000)).toBeCloseTo(0, 6)
  })
})
