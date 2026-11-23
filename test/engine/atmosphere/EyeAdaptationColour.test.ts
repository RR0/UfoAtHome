import { describe, expect, it } from "vitest"
import { EyeAdaptation } from "../../../src/engine/atmosphere/EyeAdaptation.js"
import { AuroralLines } from "../../../src/modules/sky-events/auroras/Aurora.js"

const xyzOf = (rgb: readonly number[]): [number, number, number] => [
  0.4124 * rgb[0] + 0.3576 * rgb[1] + 0.1805 * rgb[2], 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2], 0.0193 * rgb[0] + 0.1192 * rgb[1] + 0.9505 * rgb[2]]

describe("The colour an eye adapted to the dark sees", () => {
  const green = xyzOf(AuroralLines.GREEN.colour)
  const kept = (kr: number, xyz = green) => 1 - EyeAdaptation.colourRodShare(kr * AuroralLines.GREEN.cdM2PerKR, xyz, 0)

  it("gives the aurora's green the colour the International Brightness Coefficient says: barely at class II (10 kR), plainly at class III (100 kR)", () => {
    expect(kept(1)).toBeLessThan(0.03)
    expect(kept(10)).toBeGreaterThan(0.1)
    expect(kept(10)).toBeLessThan(0.25)
    expect(kept(100)).toBeGreaterThan(0.55)
    expect(kept(1000)).toBeGreaterThan(0.9)
  })

  it("keeps a white's threshold (Krawczyk's) for a white and a blue: their photochromatic interval is the widest", () => {
    expect(EyeAdaptation.colourHalfLuminance([0.9505, 1, 1.089])).toBe(EyeAdaptation.ROD_HALF_LUMINANCE_CD_M2)
    expect(EyeAdaptation.colourHalfLuminance(xyzOf([0, 0, 1]))).toBe(EyeAdaptation.ROD_HALF_LUMINANCE_CD_M2)
    expect(EyeAdaptation.colourHalfLuminance(xyzOf(AuroralLines.RED.colour))).toBeLessThan(EyeAdaptation.colourHalfLuminance(green))
  })
})
