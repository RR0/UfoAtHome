import { describe, expect, it } from "vitest"
import { LineSegments, Vector3 } from "three"
import { BodySystem } from "../../src/render3d/BodySystem.js"
import type { BodyFrame } from "../../src/render3d/BodySystem.js"
import type { BodyState } from "../../src/engine/interpretation/BodyPlacement.js"

function state(overrides: Partial<BodyState> = {}): BodyState {
  return {
    id: "craft", model: { id: "ellipsoid" }, explains: [], eastM: 0, northM: 30, upM: 1, sizeM: { widthM: 2.5, lengthM: 2.5, heightM: 1.8 },
    attitude: { headingDeg: 0, pitchDeg: 0, rollDeg: 0 },
    appearance: { color: "#888888", albedo: 0.3, luminanceCdM2: 0 },
    throwsFlame: false, ...overrides
  }
}

function frame(ground: (x: number, z: number) => number): BodyFrame {
  return { originX: 0, originZ: 0, originGroundY: 0, eye: new Vector3(0, 5, 0), groundYAt: ground }
}

function outlines(system: BodySystem): LineSegments[] {
  const found: LineSegments[] = []
  system.group.traverse(object => { if (object instanceof LineSegments) found.push(object) })
  return found
}

describe("BodySystem.outlineWhenHidden", () => {
  // The eye is 5 m up; the body stands 30 m north (scene z = -30) on the level, and a wall 6 m high crosses the way at 10 m.
  const wall = (_x: number, z: number) => (z < -9 && z > -11 ? 6 : 0)

  it("draws the edges of a body that the ground hides, over what hides it", () => {
    const system = new BodySystem(() => Promise.resolve(undefined), () => undefined)
    system.set([state({ outlineWhenHidden: true })], frame(wall))
    const lines = outlines(system)
    expect(lines.length).toBeGreaterThan(0)
    expect(lines.every(line => line.visible)).toBe(true)
    expect(lines.every(line => (line.material as { depthTest: boolean }).depthTest === false)).toBe(true)
  })

  it("draws nothing of a body in plain view, or of one that did not ask", () => {
    const flat = () => 0
    const seen = new BodySystem(() => Promise.resolve(undefined), () => undefined)
    seen.set([state({ outlineWhenHidden: true })], frame(flat))
    expect(outlines(seen).every(line => !line.visible)).toBe(true)
    const plain = new BodySystem(() => Promise.resolve(undefined), () => undefined)
    plain.set([state()], frame(wall))
    expect(outlines(plain)).toHaveLength(0)
  })
})
