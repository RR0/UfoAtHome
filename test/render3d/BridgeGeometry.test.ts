import { describe, expect, it } from "vitest"
import { Box3, Raycaster, Mesh, MeshBasicMaterial, Vector3 } from "three"
import { BridgeGeometry } from "../../src/render3d/BridgeGeometry.js"
import { DecorSystem } from "../../src/render3d/DecorSystem.js"
import type { DecorObject } from "../../src/engine/model/Decor.js"

const SIZE = { widthM: 9, lengthM: 242, heightM: 6.5 }

describe("BridgeGeometry", () => {
  it("keeps the road level over the span and brings it down the banks to the ground", () => {
    const bridge = new BridgeGeometry(SIZE, { spanM: 42 })
    expect(bridge.roadAt(0)).toBe(6.5)
    expect(bridge.roadAt(21)).toBe(6.5)
    expect(bridge.roadAt(-71)).toBeCloseTo(3.25, 5)
    expect(bridge.roadAt(121)).toBe(0)
  })

  it("is drawn at its own size, railing above the road", () => {
    const parts = new BridgeGeometry(SIZE, { spanM: 42 }).build()
    parts.railing.computeBoundingBox()
    expect(parts.railing.boundingBox!.max.y).toBeCloseTo(6.5 + 1.05, 2)
    parts.concrete.computeBoundingBox()
    expect(parts.concrete.boundingBox!.max.z).toBeCloseTo(21, 2)
  })

  it("leaves rectangular openings between two posts and two rails", () => {
    const railing = new Mesh(new BridgeGeometry(SIZE, { spanM: 42 }).build().railing, new MeshBasicMaterial())
    const caster = new Raycaster()
    const hits = (y: number, z: number) => {
      caster.set(new Vector3(-20, y, z), new Vector3(1, 0, 0))
      return caster.intersectObject(railing).length
    }
    // Midway between two posts: 161 intervals over 242 m put them at z = ±0.75…
    const between = 0
    // …the lower opening and the upper one are open, the rails are not.
    expect(hits(6.5 + 0.25, between)).toBe(0)
    expect(hits(6.5 + 0.78, between)).toBe(0)
    expect(hits(6.5 + 1.05 / 2 - 0.02, between)).toBeGreaterThan(0)
    expect(hits(6.5 + 1.05 - 0.02, between)).toBeGreaterThan(0)
  })

  it("is never stretched by the decor system, whatever its size", () => {
    const object: DecorObject = { id: "bridge", kind: "bridge", eastM: 0, northM: 50, sizeM: SIZE, bridge: { spanM: 42 } }
    const group = DecorSystem.build(object, false)
    const box = new Box3().setFromObject(group)
    expect(box.max.y - box.min.y).toBeCloseTo(6.5 + 1.05, 1)
    expect(DecorSystem.sizeOf(object)).toEqual(SIZE)
  })
})
