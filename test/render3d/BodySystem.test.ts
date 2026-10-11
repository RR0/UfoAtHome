import { describe, expect, it } from "vitest"
import { Vector3 } from "three"
import { BodySystem } from "../../src/render3d/BodySystem.js"
import type { BodyState } from "../../src/engine/interpretation/BodyPlacement.js"
import type { Veil } from "../../src/render3d/Veil.js"

/** An ellipsoid 10 m across, 400 m from the eye, giving out `luminanceCdM2` of its own. */
const glowing = (luminanceCdM2: number): BodyState => ({
  id: "ball", model: { id: "sphere" }, explains: [], eastM: 0, northM: 400, upM: 20,
  sizeM: { widthM: 10, lengthM: 10, heightM: 10 }, attitude: { headingDeg: 0, pitchDeg: 0, rollDeg: 0 },
  appearance: { color: "#88ffaa", albedo: 0.5, luminanceCdM2 }, throwsFlame: false
})

describe("BodySystem veil", () => {
  const veilAfter = (luminanceCdM2: number): Veil | undefined => {
    const system = new BodySystem(async () => undefined as never, () => undefined, () => 1e-5)
    system.set([glowing(luminanceCdM2)], { originX: 0, originZ: 0, originGroundY: 0, eye: new Vector3(0, 1.6, 0) })
    return (system as unknown as { glares: Map<string, Veil> }).glares.get("ball")
  }
  const radiusOf = (veil: Veil) => Math.atan(veil.mesh.material.uniforms.uTanRadius.value as number) * 180 / Math.PI

  it("is thrown by a body that glows, and grows with how bright it is, however bright", () => {
    const dim = veilAfter(2e4)!
    const bright = veilAfter(2e5)!
    const brighter = veilAfter(2e6)!
    for (const veil of [dim, bright, brighter]) expect(veil.mesh.visible).toBe(true)
    // k·E/θ² falls to the faintest worth drawing at a radius that goes as the root of the luminance: a hundred times as bright, ten times as wide.
    expect(radiusOf(bright) / radiusOf(dim)).toBeGreaterThan(2.5)
    expect(radiusOf(brighter) / radiusOf(bright)).toBeGreaterThan(2.5)
    expect(radiusOf(brighter)).toBeLessThanOrEqual(30)
  })

  it("is not thrown by a body that does not glow", () => {
    const none = veilAfter(0)
    expect(none === undefined || none.mesh.visible === false).toBe(true)
  })

  /** The same body with a hill across the line of sight to the north, between 150 and 250 m from the eye, 300 m high. */
  const withHill = (northM: number): Veil | undefined => {
    const system = new BodySystem(async () => undefined as never, () => undefined, () => 1e-5)
    const state = { ...glowing(2e6), northM }
    // Scene z is south: the body stands at z = -northM.
    system.set([state], { originX: 0, originZ: 0, originGroundY: 0, eye: new Vector3(0, 1.6, 0), groundYAt: (_x, z) => -z > 150 && -z < 250 ? 300 : 0 })
    return (system as unknown as { glares: Map<string, Veil> }).glares.get("ball")
  }

  it("is hidden when the relief rises between the eye and the body, and shown over the relief when the body is in front of it", () => {
    const behind = withHill(400)
    expect(behind === undefined || behind.mesh.visible === false).toBe(true)
    const inFront = withHill(100)!
    expect(inFront.mesh.visible).toBe(true)
  })

  it("is drawn over the relief, the decor and the clouds, as it is in the eye", () => {
    expect(veilAfter(2e6)!.mesh.renderOrder).toBeGreaterThan(6)
  })
})
