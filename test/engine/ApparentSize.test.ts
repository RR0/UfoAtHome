import { describe, expect, it } from "vitest"
import { ApparentSize } from "../../src/engine/shape/ApparentSize.js"

/** The canvas every reproduction is authored on — 640x360 with a 60 degree vertical field of
 * view, so 1 degree is about 5.4 px and the full Moon about 2.8 px. */
const CANVAS_HEIGHT = 360
const FOV = 60

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

  it("projects a reported size/distance onto the canvas in pixels", () => {
    expect(ApparentSize.widthPx({ sizeM: 3.5, distanceM: 90 }, CANVAS_HEIGHT, FOV)).toBeCloseTo(12.1, 1)
    expect(ApparentSize.widthPx({ sizeM: 3.5, distanceM: 150 }, CANVAS_HEIGHT, FOV)).toBeCloseTo(7.3, 1)
  })

  it("halves the pixel size when the object is twice as far", () => {
    const near = ApparentSize.widthPx({ sizeM: 3, distanceM: 100 }, CANVAS_HEIGHT, FOV)
    const far = ApparentSize.widthPx({ sizeM: 3, distanceM: 200 }, CANVAS_HEIGHT, FOV)
    expect(far).toBeCloseTo(near / 2, 3)
  })

  it("pxToDeg inverts widthPx exactly", () => {
    const extent = { sizeM: 3.5, distanceM: 90 }
    const px = ApparentSize.widthPx(extent, CANVAS_HEIGHT, FOV)
    expect(ApparentSize.pxToDeg(px, CANVAS_HEIGHT, FOV)).toBeCloseTo(ApparentSize.angularWidthDeg(extent), 6)
  })

  it("a full canvas height is exactly the field of view", () => {
    expect(ApparentSize.pxToDeg(CANVAS_HEIGHT, CANVAS_HEIGHT, FOV)).toBeCloseTo(FOV, 6)
  })

  it("counts a width in full Moons — the only unit of apparent size testimonies come with", () => {
    expect(ApparentSize.inMoons(ApparentSize.MOON_ANGULAR_WIDTH_DEG)).toBeCloseTo(1, 6)
    // What the four existing case files actually draw: 80 to 110 px, i.e. dozens of Moons wide.
    expect(ApparentSize.inMoons(ApparentSize.pxToDeg(80, CANVAS_HEIGHT, FOV))).toBeGreaterThan(25)
  })

  it("interpolates an extent only when both ends document one", () => {
    const from = { sizeM: 3, distanceM: 100 }
    const to = { sizeM: 3, distanceM: 300 }
    expect(ApparentSize.lerp(from, to, 0.5)).toEqual({ sizeM: 3, distanceM: 200 })
    expect(ApparentSize.lerp(from, undefined, 0.5)).toBeUndefined()
    expect(ApparentSize.lerp(undefined, to, 0.5)).toBeUndefined()
  })
})
