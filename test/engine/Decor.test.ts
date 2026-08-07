import { describe, expect, it } from "vitest"
import {
  resolveDecorLitAt,
  hasWindows,
  isWindowOpenable,
  canHoldWitness,
  defaultWindows,
  DECOR_SIDES,
  DEFAULT_WINDOW_OPACITY_PERCENT,
  FIXED_WINDOW_MIN_OPACITY_PERCENT
} from "../../src/engine/model/Decor.js"
import type { DecorObject, DecorKind } from "../../src/engine/model/Decor.js"

function streetlight(overrides: Partial<DecorObject> = {}): DecorObject {
  return { id: "decor-1", kind: "streetlight", eastM: 0, northM: 0, ...overrides }
}

describe("resolveDecorLitAt", () => {
  it("falls back to the static lit field when there are no keyframes", () => {
    expect(resolveDecorLitAt(streetlight({ lit: true }), 5000)).toBe(true)
    expect(resolveDecorLitAt(streetlight({ lit: false }), 5000)).toBe(false)
    expect(resolveDecorLitAt(streetlight(), 5000)).toBe(false)
  })

  it("falls back to the static lit field when litKeyframes is an empty array", () => {
    expect(resolveDecorLitAt(streetlight({ lit: true, litKeyframes: [] }), 5000)).toBe(true)
  })

  it("holds the last keyframe at-or-before t", () => {
    const decor = streetlight({
      litKeyframes: [
        { t: 0, lit: false },
        { t: 5000, lit: true },
        { t: 10000, lit: false }
      ]
    })
    expect(resolveDecorLitAt(decor, 0)).toBe(false)
    expect(resolveDecorLitAt(decor, 2500)).toBe(false)
    expect(resolveDecorLitAt(decor, 5000)).toBe(true)
    expect(resolveDecorLitAt(decor, 7500)).toBe(true)
    expect(resolveDecorLitAt(decor, 10000)).toBe(false)
    expect(resolveDecorLitAt(decor, 99999)).toBe(false)
  })

  it("holds the first keyframe's value before it, ignoring the static lit field once any keyframe exists", () => {
    const decor = streetlight({ lit: false, litKeyframes: [{ t: 5000, lit: true }] })
    expect(resolveDecorLitAt(decor, 0)).toBe(true)
  })

  it("works regardless of keyframe insertion order (reads assume sorted input, same contract as the writer)", () => {
    const decor = streetlight({
      litKeyframes: [
        { t: 10000, lit: false },
        { t: 0, lit: false },
        { t: 5000, lit: true }
      ].sort((a, b) => a.t - b.t)
    })
    expect(resolveDecorLitAt(decor, 6000)).toBe(true)
  })
})

const NON_WINDOWED_KINDS: DecorKind[] = ["tree", "streetlight", "witness"]

describe("hasWindows", () => {
  it("is true only for building and vehicle", () => {
    expect(hasWindows("building")).toBe(true)
    expect(hasWindows("vehicle")).toBe(true)
    for (const kind of NON_WINDOWED_KINDS) expect(hasWindows(kind)).toBe(false)
  })
})

describe("isWindowOpenable", () => {
  it("every side is openable for a building", () => {
    for (const side of DECOR_SIDES) expect(isWindowOpenable("building", side)).toBe(true)
  })

  it("only left/right are openable for a vehicle — front/behind (windshield/rear window) are fixed", () => {
    expect(isWindowOpenable("vehicle", "front")).toBe(false)
    expect(isWindowOpenable("vehicle", "behind")).toBe(false)
    expect(isWindowOpenable("vehicle", "left")).toBe(true)
    expect(isWindowOpenable("vehicle", "right")).toBe(true)
  })

  it("no side is openable for a kind with no windows at all", () => {
    for (const kind of NON_WINDOWED_KINDS) {
      for (const side of DECOR_SIDES) expect(isWindowOpenable(kind, side)).toBe(false)
    }
  })
})

describe("canHoldWitness", () => {
  it("is true only for building and vehicle", () => {
    expect(canHoldWitness("building")).toBe(true)
    expect(canHoldWitness("vehicle")).toBe(true)
    for (const kind of NON_WINDOWED_KINDS) expect(canHoldWitness(kind)).toBe(false)
  })
})

describe("defaultWindows", () => {
  it("gives a building every side at DEFAULT_WINDOW_OPACITY_PERCENT — all 4 are openable", () => {
    expect(defaultWindows("building")).toEqual({
      front: DEFAULT_WINDOW_OPACITY_PERCENT,
      behind: DEFAULT_WINDOW_OPACITY_PERCENT,
      left: DEFAULT_WINDOW_OPACITY_PERCENT,
      right: DEFAULT_WINDOW_OPACITY_PERCENT
    })
  })

  it("gives a vehicle's fixed front/behind FIXED_WINDOW_MIN_OPACITY_PERCENT instead, since they can never open", () => {
    expect(defaultWindows("vehicle")).toEqual({
      front: FIXED_WINDOW_MIN_OPACITY_PERCENT,
      behind: FIXED_WINDOW_MIN_OPACITY_PERCENT,
      left: DEFAULT_WINDOW_OPACITY_PERCENT,
      right: DEFAULT_WINDOW_OPACITY_PERCENT
    })
  })

  it("is undefined for a kind with no windows at all", () => {
    for (const kind of NON_WINDOWED_KINDS) expect(defaultWindows(kind)).toBeUndefined()
  })
})
