import { describe, expect, it } from "vitest"
import { SizeEstimate } from "../../src/engine/shape/SizeEstimate.js"
import { ApparentSize } from "../../src/engine/shape/ApparentSize.js"

/** What a 30 m object 500 m away subtends — the Chiles-Whitted geometry, used here only as a
 * convenient pair of numbers that are known to belong together. */
const WIDTH_DEG = ApparentSize.angularWidthDeg({ sizeM: 30, distanceM: 500 })

describe("SizeEstimate", () => {
  it("says nothing at all until something crosses the line of sight", () => {
    const estimate = new SizeEstimate()
    expect(estimate.empty).toBe(true)
    expect(estimate.sizeRange).toEqual({ minM: undefined, maxM: undefined })
    // The usual case: a light in an empty night sky. No decor, no inequality, no meters.
    estimate.add(WIDTH_DEG, {})
    expect(estimate.empty).toBe(true)
  })

  it("turns 'it passed behind that' into a floor on the object's real width", () => {
    const estimate = new SizeEstimate()
    estimate.add(WIDTH_DEG, { behindM: 500 })
    expect(estimate.sizeRange.minM).toBeCloseTo(30, 6)
    expect(estimate.sizeRange.maxM).toBeUndefined()
  })

  it("turns 'it passed in front of that' into a ceiling", () => {
    const estimate = new SizeEstimate()
    estimate.add(WIDTH_DEG, { inFrontM: 500 })
    expect(estimate.sizeRange.maxM).toBeCloseTo(30, 6)
    expect(estimate.sizeRange.minM).toBeUndefined()
  })

  it("keeps the tightest bound of every crossing, and never loosens one", () => {
    const estimate = new SizeEstimate()
    estimate.add(WIDTH_DEG, { behindM: 300, inFrontM: 900 })
    estimate.add(WIDTH_DEG, { behindM: 500, inFrontM: 700 })
    // A later, weaker crossing must not widen what a stronger one already established.
    estimate.add(WIDTH_DEG, { behindM: 100, inFrontM: 5000 })
    expect(estimate.sizeRange.minM).toBeCloseTo(ApparentSize.sizeMAt(500, WIDTH_DEG), 6)
    expect(estimate.sizeRange.maxM).toBeCloseTo(ApparentSize.sizeMAt(700, WIDTH_DEG), 6)
    expect(estimate.contradictory).toBe(false)
  })

  it("bounds the same object from instants where it looked completely different", () => {
    const estimate = new SizeEstimate()
    // Far away, small: behind a 900 m hangar.
    estimate.add(1, { behindM: 900 })
    // Close, large: in front of a tree 50 m off.
    estimate.add(20, { inFrontM: 50 })
    const { minM, maxM } = estimate.sizeRange
    expect(minM).toBeCloseTo(ApparentSize.sizeMAt(900, 1), 6)
    expect(maxM).toBeCloseTo(ApparentSize.sizeMAt(50, 20), 6)
    // ~15.7 m at least, ~17.6 m at most — a real object, pinned from two ends by two crossings
    // that have nothing else in common.
    expect(minM!).toBeLessThan(maxM!)
  })

  it("reports a recording that cannot be true rather than quietly clamping it", () => {
    const estimate = new SizeEstimate()
    estimate.add(WIDTH_DEG, { behindM: 900 })
    // Same apparent width, yet also in front of something much nearer: impossible for one object.
    estimate.add(WIDTH_DEG, { inFrontM: 100 })
    expect(estimate.contradictory).toBe(true)
  })

  it("reads an established size back as a distance wherever the object is drawn", () => {
    const estimate = new SizeEstimate()
    estimate.add(WIDTH_DEG, { behindM: 400, inFrontM: 600 })
    // At the very instant it crossed, the range is the crossing itself.
    const here = estimate.distanceRangeAt(WIDTH_DEG)
    expect(here.minM).toBeCloseTo(400, 6)
    expect(here.maxM).toBeCloseTo(600, 6)
    // Later it looks half as wide: for the same real object, that is twice as far.
    const later = estimate.distanceRangeAt(WIDTH_DEG / 2)
    expect(later.minM!).toBeGreaterThan(here.minM! * 1.9)
  })

  it("ignores a shape with no width, rather than manufacturing an infinity from it", () => {
    const estimate = new SizeEstimate()
    estimate.add(0, { behindM: 500, inFrontM: 900 })
    expect(estimate.empty).toBe(true)
    expect(estimate.distanceRangeAt(0)).toEqual({})
  })

  it("forgets everything when told to — a different recording constrains nothing here", () => {
    const estimate = new SizeEstimate()
    estimate.add(WIDTH_DEG, { behindM: 500 })
    estimate.clear()
    expect(estimate.empty).toBe(true)
  })
})
