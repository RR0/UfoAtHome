import { describe, expect, it } from "vitest"
import { SceneRenderer } from "../../src/render3d/SceneRenderer.js"

describe("What the eye adapts to", () => {
  it("is the sky where the sky outshines the ground: in the country at night, and by day", () => {
    expect(SceneRenderer.adaptingLuminance(0.004, [0.0003, 0.0003, 0.0003])).toBe(0.004)
    expect(SceneRenderer.adaptingLuminance(3000, [2000 * Math.PI, 2000 * Math.PI, 2000 * Math.PI])).toBe(3000)
  })

  it("is half the ground's light under the lamps of a square, where the sky is black: not the 0.05 that turned everything they lit white", () => {
    // Notre-Dame by night: the ground round the eye some 28 cd/m² on average, thrown up as π times that.
    const down = [28 * Math.PI, 28 * Math.PI, 28 * Math.PI]
    expect(SceneRenderer.adaptingLuminance(0.05, down)).toBeCloseTo(14, 6)
  })
})
