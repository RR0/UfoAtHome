import { describe, expect, it } from "vitest"
import { resolveDecorLitAt } from "../../src/engine/model/Decor.js"
import type { DecorObject } from "../../src/engine/model/Decor.js"

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
