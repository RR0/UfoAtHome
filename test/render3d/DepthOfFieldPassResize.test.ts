import { describe, expect, it } from "vitest"
import { DepthOfFieldPass } from "../../src/render3d/DepthOfFieldPass.js"

describe("DepthOfFieldPass.resize", () => {
  it("resizes the depth textures with the targets, or the framebuffer is incomplete and the frame black", () => {
    const pass = new DepthOfFieldPass(720, 405)
    pass.resize(405, 405)
    for (const target of [(pass as any).target, (pass as any).overlayTarget]) {
      expect(target.width).toBe(405)
      expect(target.depthTexture.image.width).toBe(405)
      expect(target.depthTexture.image.height).toBe(405)
    }
  })
})
