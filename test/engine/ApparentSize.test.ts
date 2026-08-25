import { describe, expect, it } from "vitest"
import { ApparentSize } from "../../src/engine/shape/ApparentSize.js"

describe("ApparentSize", () => {
  it("computes the angular width a witness's own reported size and distance imply", () => {
    // Valensole: "du volume d'une Renault Dauphine" (3.5 m), landed 90 m away.
    expect(ApparentSize.angularWidthDeg({ sizeM: 3.5, distanceM: 90 })).toBeCloseTo(2.23, 2)
    // Chiles-Whitted: a ~30 m fuselage passing a few hundred meters from the DC-3.
    expect(ApparentSize.angularWidthDeg({ sizeM: 30, distanceM: 500 })).toBeCloseTo(3.44, 2)
  })

  it("stays exact at close range, where the small-angle approximation breaks down", () => {
    // Wilcox touched his object: 6 m wide, 30 cm away — more than 168 degrees, i.e. it fills the
    // view and then some. The small-angle formula (2*size/distance) would claim 1146 degrees.
    expect(ApparentSize.angularWidthDeg({ sizeM: 6, distanceM: 0.3 })).toBeCloseTo(168.6, 1)
  })

  it("counts a width in full Moons — the only unit of apparent size testimonies come with", () => {
    expect(ApparentSize.inMoons(ApparentSize.MOON_ANGULAR_WIDTH_DEG)).toBeCloseTo(1, 6)
    expect(ApparentSize.inMoons(6.41)).toBeGreaterThan(12)
  })

  it("interpolates an angular extent only when both ends document one", () => {
    const from = { widthDeg: 2, heightDeg: 1 }
    const to = { widthDeg: 6, heightDeg: 3 }
    expect(ApparentSize.lerpAngular(from, to, 0.5)).toEqual({ widthDeg: 4, heightDeg: 2 })
    expect(ApparentSize.lerpAngular(from, undefined, 0.5)).toBeUndefined()
    expect(ApparentSize.lerpAngular(undefined, to, 0.5)).toBeUndefined()
  })

  it("turns a distance into the size it implies, and back", () => {
    // A 30 m fuselage 500 m away subtends 3.44 degrees; from that angle, 500 m implies 30 m again.
    const widthDeg = ApparentSize.angularWidthDeg({ sizeM: 30, distanceM: 500 })
    expect(ApparentSize.sizeMAt(500, widthDeg)).toBeCloseTo(30, 6)
    expect(ApparentSize.distanceMAt(30, widthDeg)).toBeCloseTo(500, 6)
    // Twice as far, for the same apparent width, means twice as big.
    expect(ApparentSize.sizeMAt(1000, widthDeg)).toBeCloseTo(60, 6)
  })

  it("relates size, distance and angle the same way whatever it was seen through", () => {
    // This is the whole reason these live apart from ImageProjection: an eye and a lens disagree
    // about pixels, never about the geometry of a real object at a real distance.
    expect(ApparentSize.angularWidthDeg({ sizeM: 3.5, distanceM: 31.254 })).toBeCloseTo(6.41, 2)
  })
})
