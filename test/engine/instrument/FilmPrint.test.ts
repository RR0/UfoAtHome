import { describe, expect, it } from "vitest"
import { FilmPrints } from "../../../src/engine/instrument/FilmPrint.js"
import { Instruments } from "../../../src/engine/instrument/Instrument.js"

const print = FilmPrints.BROADCAST_35MM

describe("a print's frames", () => {
  it("come out the same however they are reached", () => {
    expect(FilmPrints.frame(print, 42)).toEqual(FilmPrints.frame(print, 42))
    expect(FilmPrints.frame(print, 42)).not.toEqual(FilmPrints.frame(print, 43))
  })

  it("change at the film's own rate, not the screen's", () => {
    expect(FilmPrints.frameAt(print, 0)).toBe(0)
    expect(FilmPrints.frameAt(print, 41)).toBe(0)
    expect(FilmPrints.frameAt(print, 42)).toBe(1)
    expect(FilmPrints.frameAt(print, 1000)).toBe(24)
  })

  const frames = Array.from({ length: 4000 }, (_, i) => FilmPrints.frame(print, i))

  it("carry about as many specks as measured", () => {
    const mean = frames.reduce((sum, frame) => sum + frame.specks.length, 0) / frames.length
    expect(mean).toBeGreaterThan(print.specksPerFrame * 0.85)
    expect(mean).toBeLessThan(print.specksPerFrame * 1.15)
  })

  it("carry specks mostly small, never wider than the widest measured", () => {
    const radii = frames.flatMap(frame => frame.specks.map(speck => speck.radius)).sort((a, b) => a - b)
    expect(radii[radii.length >> 1]).toBeLessThan(print.speckRadius * 1.3)
    expect(radii.at(-1)!).toBeLessThanOrEqual(print.speckRadiusMax)
  })

  it("sit off in the gate by about what was measured", () => {
    const rms = (axis: 0 | 1) => Math.sqrt(frames.reduce((sum, frame) => sum + frame.weave[axis] ** 2, 0) / frames.length)
    expect(rms(1) / print.weave[1]).toBeGreaterThan(0.75)
    expect(rms(1) / print.weave[1]).toBeLessThan(1.25)
    expect(rms(0) / print.weave[0]).toBeGreaterThan(0.75)
    expect(rms(0) / print.weave[0]).toBeLessThan(1.25)
  })
})

describe("the film camera seen on television", () => {
  it("records on a negative through its print, on a 4:3 frame", () => {
    const camera = Instruments.byId("cine-35mm-broadcast")
    expect(camera?.medium?.print).toBe(print)
    expect(camera?.medium?.kind).toBe("negative")
    expect(camera!.frame!.widthMm / camera!.frame!.heightMm).toBeCloseTo(4 / 3, 1)
  })
})
