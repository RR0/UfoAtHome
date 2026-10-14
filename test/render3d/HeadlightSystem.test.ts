import { describe, expect, it } from "vitest"
import { Group, Vector3 } from "three"
import type { Scene } from "three"
import { HeadlightSystem } from "../../src/render3d/HeadlightSystem.js"

const north = new Vector3(0, 0, -1)
const system = () => new HeadlightSystem(new Group() as unknown as Scene)

describe("HeadlightSystem", () => {
  it("makes two lights to a vehicle, one to each lamp, and four vehicles' worth at most", () => {
    const beams = system()
    expect(beams.add("observer")).toBe(true)
    expect(beams.lamps("observer")).toHaveLength(2)
    for (const id of ["a", "b", "c"]) expect(beams.add(id)).toBe(true)
    expect(beams.add("e")).toBe(false)
    expect(beams.size).toBe(4)
    expect(beams.has("e")).toBe(false)
  })

  it("makes the lights of the observer's own lamps cast a shadow, and no other's: a bank keeps the light from what is behind it", () => {
    const beams = system()
    beams.add("observer")
    beams.add("car")
    beams.aim("observer", "dipped", new Vector3(0, 0.7, 0), north, 0.65, 1, 0)
    beams.aim("car", "dipped", new Vector3(30, 0.7, 0), north, 0.7, 1, 0)
    for (const light of beams.lamps("observer")) expect(light.castShadow).toBe(true)
    for (const light of beams.lamps("car")) expect(light.castShadow).toBe(false)
  })

  it("stops drawing a shadow for lamps that are off, so that nothing is rendered for them", () => {
    const beams = system()
    beams.add("observer")
    beams.aim("observer", "main", new Vector3(0, 0.7, 0), north, 0.65, 1, 0)
    expect(beams.lamps("observer")[0].castShadow).toBe(true)
    beams.aim("observer", "off", new Vector3(0, 0.7, 0), north, 0.65, 1, 0)
    for (const light of beams.lamps("observer")) {
      expect(light.castShadow).toBe(false)
      expect(light.intensity).toBe(0)
    }
    // The position lights light nothing either.
    beams.aim("observer", "position", new Vector3(0, 0.7, 0), north, 0.65, 1, 0)
    expect(beams.lamps("observer")[0].intensity).toBe(0)
  })

  it("shows the light in the air in proportion to what the air scatters: faint in clear air, strong in a fog, none off", () => {
    const beams = system()
    beams.add("observer")
    const intensityOf = (extinction: number) => {
      beams.aim("observer", "dipped", new Vector3(0, 0.7, 0), north, 0.65, 7, extinction)
      const cone = beams.airMeshes("observer")[0]
      return { visible: cone.visible, scatter: cone.material.uniforms.uScatter.value as number }
    }
    const clear = intensityOf(0)
    expect(clear.scatter).toBe(HeadlightSystem.CLEAR_AIR_SCATTER_PER_M)
    const fog = intensityOf(0.02)
    expect(fog.scatter).toBe(0.02)
    expect(fog.visible).toBe(true)
    expect(fog.scatter).toBeGreaterThan(clear.scatter * 50)
    beams.aim("observer", "off", new Vector3(0, 0.7, 0), north, 0.65, 7, 0.02)
    expect(beams.airMeshes("observer")[0].visible).toBe(false)
  })

  it("puts the cone of lit air at the lamp, along its axis, as wide as its beam", () => {
    const beams = system()
    beams.add("observer")
    beams.aim("observer", "main", new Vector3(0, 0.7, 0), north, 0.65, 7, 0.01)
    const lamp = beams.lamps("observer")[0]
    const cone = beams.airMeshes("observer")[0]
    expect(cone.position.distanceTo(lamp.position)).toBeLessThan(1e-6)
    // Its length is along z, its width is the beam's own at that length.
    expect(cone.scale.z).toBeGreaterThan(50)
    expect(cone.scale.x / cone.scale.z).toBeCloseTo(Math.tan(lamp.angle), 4)
    // It points where the lamp does: its +Z, in the world, is towards the lamp's target.
    const axis = new Vector3(0, 0, 1).applyQuaternion(cone.quaternion)
    const toTarget = lamp.target.position.clone().sub(lamp.position).normalize()
    expect(axis.dot(toTarget)).toBeGreaterThan(0.999)
  })

  it("takes a vehicle's beams away, and all of them but the observer's when the decor changes", () => {
    const beams = system()
    for (const id of ["observer", "a", "b"]) beams.add(id)
    beams.remove("a")
    expect(beams.has("a")).toBe(false)
    beams.clear(true)
    expect(beams.has("observer")).toBe(true)
    expect(beams.size).toBe(1)
    beams.clear(false)
    expect(beams.size).toBe(0)
  })
})
