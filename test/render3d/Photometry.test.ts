import { describe, expect, it } from "vitest"
import { Photometry } from "../../src/render3d/Photometry.js"
import type { LuminanceDisplay } from "../../src/render3d/Photometry.js"

describe("Photometry.shown", () => {
  // A photometry where a white of 1 cd/m² is one relative unit.
  const linear = (rgb: readonly [number, number, number], luminance: number) => [rgb[0] * luminance, rgb[1] * luminance, rgb[2] * luminance] as const
  const orange: [number, number, number] = [1, 0.25, 0.02]

  it("keeps an orange orange for an eye, however bright: its colour grows with its brightness", () => {
    const eye: LuminanceDisplay = linear
    const dim = Photometry.shown(orange, 1, eye), bright = Photometry.shown(orange, 1e4, eye)
    expect(bright[1] / bright[0]).toBeCloseTo(dim[1] / dim[0], 6)
    expect(bright[0]).toBeLessThan(dim[0] * 100)
  })

  it("hands a recording medium the light as it is, for it to lose the colour, then all, where it is too bright", () => {
    const sensor: LuminanceDisplay = Object.assign(linear, { recorded: true })
    const dim = Photometry.shown(orange, 1, sensor), bright = Photometry.shown(orange, 1e4, sensor)
    expect(bright[0] / dim[0]).toBeCloseTo(1e4, 3)
    expect(bright[1] / bright[0]).toBeCloseTo(0.25, 6)
  })
})
