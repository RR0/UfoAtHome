import { describe, expect, it } from "vitest"


describe("SceneRenderer.trafficHeight", () => {
  it("draws an aircraft at its altitude, not over the ground beneath it, which that altitude already includes", async () => {
    const { SceneRenderer } = await import("../../src/render3d/SceneRenderer.js")
    expect(SceneRenderer.trafficHeight(3000, 200)).toBe(3000)
  })

  it("never in the ground, where a barometric altitude off by the day's pressure would put one landing at a higher airfield", async () => {
    const { SceneRenderer } = await import("../../src/render3d/SceneRenderer.js")
    expect(SceneRenderer.trafficHeight(-18, 63)).toBe(63)
  })
})
