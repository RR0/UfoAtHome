import { describe, expect, it } from "vitest"
import { BoxGeometry, Mesh, MeshBasicMaterial, Vector3 } from "three"
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

describe("SceneRenderer.nearestBody", () => {
  const deg = (degrees: number) => (degrees * Math.PI) / 180
  const at = (degrees: number) => new Vector3(Math.cos(deg(degrees)), Math.sin(deg(degrees)), 0)
  const reach = deg(0.1)

  // A Sun, and a Moon over it with its centre 0.1 degrees to the side, as in an eclipse at 0.9 magnitude.
  const eclipse = [
    { key: "sun", direction: at(0), radiusRad: deg(0.26) },
    { key: "moon", direction: at(0.1), radiusRad: deg(0.27), inFront: true }
  ]

  it("says the Moon over the part of the Sun it covers, though the Sun's disc is there too", () => {
    expect(SceneRenderer.nearestBody(at(0.05), eclipse, reach)).toBe("moon")
  })

  it("says the Moon where it is alone, and the Sun where the Moon has left it", () => {
    expect(SceneRenderer.nearestBody(at(0.36), eclipse, reach)).toBe("moon")
    expect(SceneRenderer.nearestBody(at(-0.2), eclipse, reach)).toBe("sun")
  })

  it("names nothing beyond the discs and the reach it is given", () => {
    expect(SceneRenderer.nearestBody(at(0.5), eclipse, reach)).toBeUndefined()
    expect(SceneRenderer.nearestBody(at(-0.5), eclipse, reach)).toBeUndefined()
    // 0.37 is the Moon's far edge: a tenth of a degree past it is still within reach.
    expect(SceneRenderer.nearestBody(at(0.45), eclipse, reach)).toBe("moon")
  })

  it("reaches as far as it is told to, whatever the size of the disc", () => {
    const sun = [{ key: "sun", direction: at(0), radiusRad: deg(0.26) }]
    expect(SceneRenderer.nearestBody(at(0.3), sun, deg(0.05))).toBe("sun")
    expect(SceneRenderer.nearestBody(at(0.4), sun, deg(0.05))).toBeUndefined()
    expect(SceneRenderer.nearestBody(at(0.4), sun, deg(0.2))).toBe("sun")
  })

  it("prefers the smaller of two discs that both hold the pointer, a planet against the Sun", () => {
    const sky = [{ key: "sun", direction: at(0), radiusRad: deg(0.26) }, { key: "Venus", direction: at(0.1), radiusRad: deg(0.01) }]
    expect(SceneRenderer.nearestBody(at(0.1), sky, reach)).toBe("Venus")
    expect(SceneRenderer.nearestBody(at(-0.1), sky, reach)).toBe("sun")
  })

  it("answers nothing when there is no body", () => {
    expect(SceneRenderer.nearestBody(at(0), [], reach)).toBeUndefined()
  })
})
