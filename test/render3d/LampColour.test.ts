import { describe, expect, it } from "vitest"
import { LampColour } from "../../src/render3d/LampColour.js"
import { DecorSystem } from "../../src/render3d/DecorSystem.js"
import { Mesh, MeshLambertMaterial, ZeroFactor } from "three"
import type { Group } from "three"

const luminance = (rgb: readonly number[]) => 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]

describe("LampColour", () => {
  it("gives a light of unit luminance, orange for a sodium lamp, warm white for a town's LED, about white at daylight's temperature", () => {
    const sodium = LampColour.ofTemperature(2000)
    const led = LampColour.ofTemperature(3000)
    const daylight = LampColour.ofTemperature(6504)
    for (const rgb of [sodium, led, daylight]) expect(luminance(rgb)).toBeCloseTo(1, 6)
    expect(sodium[2] / sodium[0]).toBeLessThan(led[2] / led[0])
    expect(sodium[2] / sodium[0]).toBeLessThan(0.15)
    expect(daylight[0]).toBeCloseTo(daylight[2], 1)
  })
})

describe("A streetlight's lamp as its inventory says it", () => {
  const heads = (group: Group) => {
    const found: Mesh[] = []
    group.traverse(child => { if ((child as Mesh).isMesh && child.userData.emissive) found.push(child as Mesh) })
    return found
  }

  it("shines in proportion to its flux and in its colour", () => {
    const plain = DecorSystem.build({ id: "a", kind: "streetlight", eastM: 0, northM: 0 }, true)
    const avenue = DecorSystem.build({ id: "b", kind: "streetlight", eastM: 0, northM: 0, lamp: { lumens: 20000, colorTemperatureK: 2000 } }, true)
    DecorSystem.setLit(plain, "streetlight", true, 1e-3)
    DecorSystem.setLit(avenue, "streetlight", true, 1e-3, { lumens: 20000, colorTemperatureK: 2000 })
    const a = (heads(plain)[0].material as MeshLambertMaterial).emissive
    const b = (heads(avenue)[0].material as MeshLambertMaterial).emissive
    expect(luminance([b.r, b.g, b.b]) / luminance([a.r, a.g, a.b])).toBeCloseTo(2 / luminance([1, 0.85, 0.5]), 2)
    expect(b.b / b.r).toBeLessThan(0.15)
  })

  it("hangs on its wall with no column of its own, and its head says it is a lamp's", () => {
    const wall = DecorSystem.build({ id: "c", kind: "streetlight", eastM: 0, northM: 0, lamp: { mount: "wall" } }, true)
    const meshes: Mesh[] = []
    wall.traverse(child => { if ((child as Mesh).isMesh) meshes.push(child as Mesh) })
    expect(meshes).toHaveLength(1)
    expect((meshes[0].material as MeshLambertMaterial).blendDstAlpha).toBe(ZeroFactor)
  })

  it("is a pale glass the day lights when it is out, and not a black ball", () => {
    const lamp = DecorSystem.build({ id: "d", kind: "streetlight", eastM: 0, northM: 0 }, false)
    DecorSystem.setLit(lamp, "streetlight", false, 1e-3)
    const glass = heads(lamp)[0].material as MeshLambertMaterial
    expect(glass).toBeInstanceOf(MeshLambertMaterial)
    expect(glass.color.r).toBeGreaterThan(0.5)
    expect([glass.emissive.r, glass.emissive.g, glass.emissive.b]).toEqual([0, 0, 0])
  })
})
