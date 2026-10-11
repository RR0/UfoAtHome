import { describe, expect, test } from "vitest"
import { BodyKeyframes, BodyParameterSets } from "../../../src/engine/interpretation/BodyParameterSets.js"
import type { BodyReadingLike } from "../../../src/engine/interpretation/BodyParameterSets.js"
import type { BodyJson } from "../../../src/engine/interpretation/Interpretation.js"

const reading: BodyReadingLike = {
  azimuthDeg: 10.004, altitudeDeg: 2, distanceM: 100, eastM: 17.3601, northM: 98.48, aboveGroundM: 1.5,
  sizeM: { widthM: 4, lengthM: 5, heightM: 2 }, attitude: { headingDeg: 30, pitchDeg: 0, rollDeg: 0 },
  appearance: { color: "#c8c8c8", albedo: 0.5, luminanceCdM2: 0 }
}
const body = (track: BodyJson["track"]): BodyJson => ({ id: "b", model: { id: "ellipsoid" }, track })

describe("BodyKeyframes", () => {
  test("the view of an instant is in the terms of the keyframe in force, and as a field shows it", () => {
    const world = BodyKeyframes.viewOf(body([{ t: 0, eastM: 0, northM: 100 }]), 500, reading)
    expect([world.mode, world.eastM, world.azimuthDeg]).toEqual(["world", 17.36, 10])
    const observer = BodyKeyframes.viewOf(body([{ t: 0, azimuthDeg: 10, altitudeDeg: 2, distanceM: 100, onGround: true }]), 0, reading)
    expect([observer.mode, observer.onGround]).toEqual(["observer", true])
  })

  test("the keyframe of an observer-terms view states a direction, a distance, a size and an attitude, and nothing of the world", () => {
    const view = BodyKeyframes.viewOf(body([{ t: 0, azimuthDeg: 10, altitudeDeg: 2, distanceM: 100 }]), 0, reading)
    view.distanceM = 250
    expect(BodyKeyframes.keyframeOf(view, 2000, undefined, false)).toEqual({
      t: 2000, azimuthDeg: 10, altitudeDeg: 2, distanceM: 250, sizeM: { widthM: 4, lengthM: 5, heightM: 2 }, attitude: { headingDeg: 30, pitchDeg: 0, rollDeg: 0 }
    })
  })

  test("a world view states metres, and a height unless it stands on the ground", () => {
    const view = BodyKeyframes.viewOf(body([{ t: 0, eastM: 1, northM: 2 }]), 0, reading)
    expect(BodyKeyframes.keyframeOf(view, 0, undefined, false)).toMatchObject({ eastM: 17.36, northM: 98.48, altitudeAboveGroundM: 1.5 })
    view.onGround = true
    const grounded = BodyKeyframes.keyframeOf(view, 0, undefined, false)
    expect(grounded).toMatchObject({ onGround: true })
    expect(grounded.altitudeAboveGroundM).toBeUndefined()
  })

  test("a keyframe already there keeps what it states besides its placement, and its look unless the look was edited", () => {
    const existing = { t: 5000, eastM: 0, northM: 90, motions: { legs: 1 }, appearance: { color: "#fff", albedo: 0.2, luminanceCdM2: 3 } }
    const view = BodyKeyframes.viewOf(body([existing]), 5000, reading)
    expect(BodyKeyframes.keyframeOf(view, 5000, existing, false)).toMatchObject({ motions: { legs: 1 }, appearance: existing.appearance })
    view.color = "#33aa77"
    expect(BodyKeyframes.keyframeOf(view, 5000, existing, true).appearance).toEqual({ color: "#33aa77", albedo: 0.5, luminanceCdM2: 0 })
    expect(BodyKeyframes.keyframeOf(view, 5000, undefined, false).appearance).toBeUndefined()
  })

  test("a distance is never nil and a size never nought", () => {
    const view = BodyKeyframes.viewOf(body([{ t: 0, azimuthDeg: 0, altitudeDeg: 0, distanceM: 1 }]), 0, reading)
    Object.assign(view, { distanceM: 0, widthM: 0 })
    const key = BodyKeyframes.keyframeOf(view, 0, undefined, false)
    expect([key.distanceM, key.sizeM!.widthM]).toEqual([0.1, 0.01])
  })
})

describe("BodyParameterSets", () => {
  test("a body has an id, a name, the shapes it stands for and the part the observer drew", () => {
    expect(BodyParameterSets.BODY.parameters.map(p => p.key)).toEqual(["id", "title", "explains", "outlineNode"])
  })

  test("the id may not be one another body has, but may be the body's own", () => {
    const id = BodyParameterSets.BODY.parameters[0] as { validate: (value: string, element: object, context: object) => boolean }
    const context = { ids: ["craft", "figure"], shapes: [] }
    expect(id.validate("figure", { id: "craft" }, context)).toBe(false)
    expect(id.validate("craft", { id: "craft" }, context)).toBe(true)
    expect(id.validate("engin", { id: "craft" }, context)).toBe(true)
  })

  test("the position is asked in the terms the instant is stated in, and the height only off the ground", () => {
    const spec = (key: string) => BodyParameterSets.KEYFRAME.parameters.find(p => p.key === key)!
    expect(spec("azimuthDeg").visibleWhen!({ mode: "observer" })).toBe(true)
    expect(spec("azimuthDeg").visibleWhen!({ mode: "world" })).toBe(false)
    expect(spec("eastM").visibleWhen!({ mode: "world" })).toBe(true)
    expect(spec("aboveGroundM").visibleWhen!({ mode: "world", onGround: false })).toBe(true)
    expect(spec("aboveGroundM").visibleWhen!({ mode: "world", onGround: true })).toBe(false)
  })

  test("a colour is offered only for a shape that is painted, not for a model that keeps its materials", () => {
    const colour = BodyParameterSets.KEYFRAME.parameters.find(p => p.key === "color")!
    expect(colour.visibleWhen!({}, { drawnFromModel: false })).toBe(true)
    expect(colour.visibleWhen!({}, { drawnFromModel: true })).toBe(false)
  })

  test("every label is said in the four languages", () => {
    for (const set of [BodyParameterSets.BODY, BodyParameterSets.KEYFRAME]) {
      for (const spec of set.parameters) {
        expect(Object.keys(spec.label as object).sort(), spec.key).toEqual(["en", "es", "fr", "it"])
      }
    }
  })
})
