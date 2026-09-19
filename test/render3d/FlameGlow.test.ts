import { describe, expect, it } from "vitest"
import { FlameEffect } from "../../src/render3d/FlameEffect.js"

const flame = { lengthM: 2.4, widthM: 1.2, luminanceCdM2: 20000 }

describe("A flame's glare", () => {
  it("never shrinks under the angle a bright point blooms to, however far the flame", () => {
    const glow = FlameEffect.glowFor(flame, 1200)
    expect(glow.radiusM / 1200).toBeCloseTo(FlameEffect.GLOW_MIN_ANGLE_RAD, 9)
  })

  it("spreads the flame's own light over itself when it is much larger than the flame, and so dims with distance", () => {
    const near = FlameEffect.glowFor(flame, 2400)
    const far = FlameEffect.glowFor(flame, 4800)
    const lightOf = (glow: { radiusM: number, luminanceCdM2: number }) => glow.luminanceCdM2 * FlameEffect.GLOW_FILL * Math.PI * glow.radiusM ** 2
    // The same light, whatever the distance, which is what makes it dimmer as it grows.
    expect(lightOf(near)).toBeCloseTo(0.7 * flame.widthM * flame.lengthM * flame.luminanceCdM2, 6)
    expect(lightOf(far)).toBeCloseTo(lightOf(near), 6)
    expect(far.luminanceCdM2).toBeCloseTo(near.luminanceCdM2 / 4, 6)
  })

  it("is only a faint bloom round a flame close enough to be seen for itself", () => {
    expect(FlameEffect.glowFor(flame, 30).luminanceCdM2).toBe(flame.luminanceCdM2 * FlameEffect.GLOW_MAX_SHARE)
  })
})
