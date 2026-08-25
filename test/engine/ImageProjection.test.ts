import { describe, expect, it } from "vitest"
import { ImageProjection } from "../../src/engine/instrument/ImageProjection.js"
import { Instruments } from "../../src/engine/instrument/Instrument.js"
import { ApparentSize } from "../../src/engine/shape/ApparentSize.js"

/** The canvas every reproduction is authored on, and the field of view every case file declares. */
const H = ApparentSize.CANVAS_HEIGHT_PX
const FOV = 60

const eye = new ImageProjection("equidistant", H, FOV)
const lens = new ImageProjection("rectilinear", H, FOV)

describe("ImageProjection", () => {
  it("both mappings agree on the one thing they are pinned to: the full height IS the field", () => {
    expect(eye.pxToDeg(H)).toBeCloseTo(FOV, 6)
    expect(lens.pxToDeg(H)).toBeCloseTo(FOV, 6)
  })

  it("inverts itself exactly, both ways, in both mappings", () => {
    for (const projection of [eye, lens]) {
      for (const px of [1, 12.1, 34.9, 51.2, 360]) {
        expect(projection.degToPx(projection.pxToDeg(px))).toBeCloseTo(px, 9)
      }
    }
  })

  it("the eye is linear in angle — a degree is a degree wherever it falls", () => {
    const perDegree = eye.degToPx(1)
    expect(eye.degToPx(2)).toBeCloseTo(perDegree * 2, 9)
    expect(eye.degToPx(20)).toBeCloseTo(perDegree * 20, 9)
    // 360 px for 60 degrees: exactly 6 px per degree, which is what makes a screen ruler mean
    // something.
    expect(perDegree).toBeCloseTo(6, 9)
  })

  it("the lens is not — it packs the centre and spreads the edges", () => {
    const perDegree = lens.degToPx(1)
    expect(lens.degToPx(20)).toBeGreaterThan(perDegree * 20)
  })

  it("draws the same stated angle about 10% larger through an eye than through a lens", () => {
    // Socorro's object: 3.5 m at 31.254 m, i.e. 6.41 degrees of arc. The file drew it 34.9 px wide
    // because it was being rendered as a photograph; an eye gives it 38.46.
    const deg = ApparentSize.angularWidthDeg({ sizeM: 3.5, distanceM: 31.254 })
    expect(lens.degToPx(deg)).toBeCloseTo(34.9, 1)
    expect(eye.degToPx(deg)).toBeCloseTo(38.46, 2)
    expect(eye.degToPx(deg) / lens.degToPx(deg)).toBeCloseTo(1.10, 2)
  })

  it("reads a drawn box as an angle on both axes, and puts it back unchanged", () => {
    for (const projection of [eye, lens]) {
      const size = { width: 51.2, height: 6.8 }
      const angular = projection.ofBounds(size)
      expect(angular.widthDeg).toBeGreaterThan(angular.heightDeg)
      const back = projection.toBoundsSize(angular)
      expect(back.width).toBeCloseTo(size.width, 9)
      expect(back.height).toBeCloseTo(size.height, 9)
    }
  })

  it("draws the same angle bigger through a narrower field of view", () => {
    const angular = eye.ofBounds({ width: 50, height: 10 })
    const zoomed = new ImageProjection("equidistant", H, FOV / 2).toBoundsSize(angular)
    // Half the field across the same canvas: under the eye's mapping, exactly twice the pixels.
    expect(zoomed.width).toBeCloseTo(100, 6)
  })

  it("projects a size/distance hypothesis onto the canvas", () => {
    expect(lens.widthPx({ sizeM: 3.5, distanceM: 90 })).toBeCloseTo(12.1, 1)
    // Same object, same distance, seen rather than photographed: a little bigger.
    expect(eye.widthPx({ sizeM: 3.5, distanceM: 90 })).toBeGreaterThan(lens.widthPx({ sizeM: 3.5, distanceM: 90 }))
  })

  it("is built from an instrument, and an unknown one falls back to the eye", () => {
    expect(ImageProjection.of(Instruments.byId("eye"), H, FOV).kind).toBe("equidistant")
    expect(ImageProjection.of(Instruments.byId("rectilinear-lens"), H, FOV).kind).toBe("rectilinear")
    expect(ImageProjection.of(Instruments.byId("no-such-device"), H, FOV).kind).toBe("equidistant")
    expect(ImageProjection.of(Instruments.byId(undefined), H, FOV).kind).toBe("equidistant")
  })
})
