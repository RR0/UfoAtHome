import { describe, expect, test } from "vitest"
import { GroundReflection } from "../../../src/engine/traffic/GroundReflection.js"

const ASPHALT = { flowResistivityKPa: 30000, earHeightM: 1.6 }
const SNOW = { flowResistivityKPa: 20, earHeightM: 1.6 }

describe("GroundReflection", () => {
  test("the echo comes later by the extra path 2 h sin ψ: some 9 ms for a sound from overhead to ears at 1.6 m, nothing from the horizon", () => {
    expect(GroundReflection.delayS(90, GroundReflection.GRASS, 340)).toBeCloseTo(3.2 / 340, 9)
    expect(GroundReflection.delayS(30)).toBeCloseTo(1.6 / 340, 9)
    expect(GroundReflection.delayS(0)).toBe(0)
  })

  test("a hard ground gives nearly all back, a soft one less, and less of the highs; at grazing every ground turns the echo over", () => {
    const strength = (f: number, elevation: number, ground = GroundReflection.GRASS) => Math.hypot(...Object.values(GroundReflection.reflection(f, elevation, ground)))
    expect(strength(1000, 45, ASPHALT)).toBeGreaterThan(0.95)
    expect(strength(1000, 45)).toBeLessThan(strength(1000, 45, ASPHALT))
    expect(strength(1000, 45, SNOW)).toBeLessThan(strength(1000, 45))
    expect(strength(4000, 45)).toBeLessThan(strength(125, 45))
    // Delany and Bazley for grass at 125 Hz and 30°, worked by hand: Z = 14.0 − 16.9i, R = (6.0 − 8.45i)/(8.0 − 8.45i).
    expect(strength(125, 30)).toBeCloseTo(0.89, 2)
    for (const ground of [GroundReflection.GRASS, ASPHALT, SNOW]) expect(GroundReflection.reflection(500, 0, ground).re).toBeCloseTo(-1, 6)
  })

  test("changes nothing overhead, where the classes' levels were measured with their ground under them", () => {
    for (const level of GroundReflection.excessDb(90)) expect(level).toBeCloseTo(0, 9)
  })

  test("takes the lows from a sound that comes from near the horizon over grass: the ground effect", () => {
    const grazing = GroundReflection.excessDb(3)
    expect(grazing[1]).toBeLessThan(-2)
    expect(grazing[2]).toBeLessThan(-2)
  })

  test("is heard as an echo only once its delay puts a comb's notches into the lows, coherent for 0.4 of what the ground gives back", () => {
    expect(GroundReflection.echo(2)).toBeUndefined()
    const overhead = GroundReflection.echo(90)!
    expect(overhead.delayS).toBeCloseTo(3.2 / 340, 9)
    const r = GroundReflection.reflection(GroundReflection.LOW_HZ, 90)
    expect(overhead.lowGain).toBeCloseTo(0.4 * Math.hypot(r.re, r.im), 9)
    expect(overhead.highGain).toBeLessThan(overhead.lowGain)
    // Coming in smoothly as it climbs: weaker just over the threshold than well above it.
    expect(GroundReflection.echo(6)!.lowGain).toBeLessThan(GroundReflection.echo(30)!.lowGain)
  })
})
