import { describe, expect, it } from "vitest"
import { BoxGeometry, Mesh, MeshBasicMaterial } from "three"
import { SceneRenderer } from "../../src/render3d/SceneRenderer.js"

function hit(opacity: number, transparent = opacity < 1) {
  return { object: new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial({ transparent, opacity })) }
}

describe("SceneRenderer.firstSolid", () => {
  it("looks through a pane of glass to what lies behind it", () => {
    const glass = hit(0.12)
    const hill = hit(1)
    expect(SceneRenderer.firstSolid([glass, hill])).toBe(hill)
  })

  it("stops at a nearly opaque pane and at anything not transparent", () => {
    const tinted = hit(0.95)
    expect(SceneRenderer.firstSolid([tinted, hit(1)])).toBe(tinted)
  })

  it("answers nothing when there is only glass", () => {
    expect(SceneRenderer.firstSolid([hit(0.3)])).toBeUndefined()
  })
})
