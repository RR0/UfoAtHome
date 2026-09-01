import { describe, expect, it } from "vitest"
import { DepthOfField } from "../../src/engine/instrument/DepthOfField.js"
import { INSTRUMENTS, Instruments } from "../../src/engine/instrument/Instrument.js"
import type { Instrument } from "../../src/engine/instrument/Instrument.js"

const byId = (id: string): Instrument => INSTRUMENTS.find(instrument => instrument.id === id)!

/**
 * Checked against the numbers every published depth-of-field table gives, since this is the same
 * criterion those are computed with — that is the whole reason to use it rather than something
 * chosen here.
 */
describe("DepthOfField, which is what an aperture decides besides brightness", () => {
  it("gives 35 mm film the circle of confusion every table is built on", () => {
    // The classic 0.03 mm for a 36 x 24 frame — diagonal over 1500.
    expect(DepthOfField.acceptableCircleMm(byId("slr-35mm-50"))!).toBeCloseTo(0.029, 2)
    // A phone's frame is tiny, so what counts as sharp on it is a far smaller disc.
    expect(DepthOfField.acceptableCircleMm(byId("phone-landscape"))!).toBeLessThan(0.007)
    // An eye has no frame, so the question does not arise.
    expect(DepthOfField.acceptableCircleMm(Instruments.default)).toBeUndefined()
  })

  it("puts the 50 mm's hyperfocal where a photographer expects it", () => {
    // 50 mm at f/8 on 35 mm film: about 10 metres, which is the number on the lens's own scale.
    const circle = DepthOfField.acceptableCircleMm(byId("slr-35mm-50"))!
    expect(DepthOfField.hyperfocalM(50, 8, circle)).toBeCloseTo(10.4, 0)
    // Stopping down halves it twice over; opening up runs it out.
    expect(DepthOfField.hyperfocalM(50, 16, circle)).toBeLessThan(DepthOfField.hyperfocalM(50, 8, circle))
    expect(DepthOfField.hyperfocalM(200, 8, circle)).toBeGreaterThan(150)
  })

  it("says why a phone can never bound how far a light was", () => {
    // The claim worth having, and it falls out of the focal length being tiny: everything past
    // about three metres is sharp, so a phone's picture of something in the sky carries no useful
    // near bound at all. The same picture through a 200 mm lens bounds it at 170 metres.
    const phone = byId("phone-landscape")
    const phoneCircle = DepthOfField.acceptableCircleMm(phone)!
    expect(DepthOfField.hyperfocalM(phone.frame!.focalLengthMm, 1.6, phoneCircle)).toBeLessThan(4)
    const filmCircle = DepthOfField.acceptableCircleMm(byId("slr-35mm-zoom"))!
    expect(DepthOfField.hyperfocalM(200, 8, filmCircle)).toBeGreaterThan(100)
  })

  it("blurs nothing at the distance it is focused on, and more the further from it", () => {
    expect(DepthOfField.circleOfConfusionMm(50, 8, 10, 10)).toBe(0)
    const near = DepthOfField.circleOfConfusionMm(50, 8, 5, 10)
    const nearer = DepthOfField.circleOfConfusionMm(50, 8, 2, 10)
    expect(nearer).toBeGreaterThan(near)
    // Focused at infinity, an object's blur goes as one over its distance: half as far, twice the
    // disc, which is the inverse law the renderer's own pass is built on.
    expect(DepthOfField.circleOfConfusionMm(50, 8, 25)).toBeCloseTo(DepthOfField.circleOfConfusionMm(50, 8, 50) * 2, 6)
  })

  it("states the bound a sharp photograph carries, and where it has none", () => {
    const circle = DepthOfField.acceptableCircleMm(byId("slr-35mm-50"))!
    // Focused at infinity: sharp from the hyperfocal distance outward, and no far bound at all —
    // which is why most photographs of a light in the sky bound nothing above.
    const atInfinity = DepthOfField.sharpRangeM(50, 8, circle)
    expect(atInfinity.nearM).toBeCloseTo(DepthOfField.hyperfocalM(50, 8, circle), 6)
    expect(atInfinity.farM).toBe(Number.POSITIVE_INFINITY)
    // Focused close, wide open: a narrow slice, and both ends real.
    const close = DepthOfField.sharpRangeM(50, 2, circle, 3)
    expect(close.nearM).toBeGreaterThan(2.5)
    expect(close.farM).toBeLessThan(4)
    expect(close.nearM).toBeLessThan(3)
    expect(close.farM).toBeGreaterThan(3)
  })
})
