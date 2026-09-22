import { describe, expect, it } from "vitest"
import type { BufferGeometry, Mesh } from "three"
import { RoadSystem } from "../../src/render3d/RoadSystem.js"
import type { RoadWay } from "../../src/render3d/terrain/RoadProvider.js"

const LAT = 34.050918
const LNG = -106.891693

/** A hillside: one metre up for every ten metres east. */
const SLOPE = (x: number): number => x / 10

function straight(id: string, surface: RoadWay["surface"], widthM: number, metresEast: number): RoadWay {
  // Roughly a hundred metres to a thousandth of a degree of longitude at this latitude — the exact
  // figure does not matter here, only that the two ends are far apart.
  return {
    id, surface, widthM,
    points: [{ lat: LAT, lng: LNG }, { lat: LAT, lng: LNG + metresEast / 92000 }]
  }
}

/** The surveyed layer's meshes — the group now holds one child group per kind (see RoadSystem). */
function meshes(system: RoadSystem): Mesh<BufferGeometry>[] {
  return layer(system, "roads surveyed")
}

function stated(system: RoadSystem): Mesh<BufferGeometry>[] {
  return layer(system, "roads stated")
}

function layer(system: RoadSystem, name: string): Mesh<BufferGeometry>[] {
  return (system.group.children.find(child => child.name === name)?.children ?? []) as Mesh<BufferGeometry>[]
}

describe("RoadSystem", () => {
  it("draws one mesh per surface, not one per way — a town is five hundred ways", () => {
    const system = new RoadSystem()
    system.set([
      straight("a", "paved", 7, 200), straight("b", "paved", 5, 200), straight("c", "gravel", 4, 200)
    ], LAT, LNG, () => 0, true)
    expect(meshes(system).map(mesh => mesh.name).sort()).toEqual(["roads gravel", "roads paved"])
  })

  it("lays the carriageway on the relief rather than flat between the survey's two points", () => {
    // OSM states a straight kilometre as two points. Laid flat between them, a road would cut
    // through every rise in between.
    const system = new RoadSystem()
    system.set([straight("a", "paved", 7, 200)], LAT, LNG, SLOPE, false)
    const position = meshes(system)[0].geometry.getAttribute("position")
    let worst = 0
    for (let i = 0; i < position.count; i++) {
      worst = Math.max(worst, Math.abs(position.getY(i) - (SLOPE(position.getX(i)) + RoadSystem.LIFT_M)))
    }
    expect(worst).toBeLessThan(0.01)
  })

  it("puts a rung at least every STEP_M along a way, however few points the survey gave it", () => {
    const system = new RoadSystem()
    system.set([straight("a", "paved", 7, 200)], LAT, LNG, () => 0, false)
    const position = meshes(system)[0].geometry.getAttribute("position")
    // Two vertices a rung, and 200 m at 8 m a step is 25 steps — 26 rungs.
    expect(position.count / 2).toBeGreaterThanOrEqual(200 / RoadSystem.STEP_M)
  })

  it("draws the carriageway at the width it was given", () => {
    const system = new RoadSystem()
    system.set([straight("a", "paved", 7, 200)], LAT, LNG, () => 0, false)
    const position = meshes(system)[0].geometry.getAttribute("position")
    // The first rung: its two ends are the road's two edges, so they are a width apart.
    const across = Math.hypot(position.getX(0) - position.getX(1), position.getZ(0) - position.getZ(1))
    expect(across).toBeCloseTo(7, 1)
  })

  it("draws a surveyed road faint, and one the case file states at full presence", () => {
    // The two are not the same claim: one is the ground the observer was on, measured by the people
    // who went there; the other is a survey taken sixty years later.
    const system = new RoadSystem()
    system.set([straight("a", "gravel", 4, 100)], LAT, LNG, () => 0, true)
    system.setStated([{ id: "plan", surface: "gravel", widthM: 4, path: [{ eastM: 0, northM: 0 }, { eastM: 100, northM: 0 }] }], () => 0)
    const opacityOf = (mesh: Mesh<BufferGeometry>): number => (mesh.material as unknown as { opacity: number }).opacity
    expect(opacityOf(stated(system)[0])).toBe(1)
    expect(opacityOf(meshes(system)[0])).toBe(RoadSystem.CONTEMPORARY_OPACITY)
  })

  it("keeps a stated road when no survey answers — it depends on nobody", () => {
    const system = new RoadSystem()
    system.setStated([{ id: "plan", surface: "gravel", widthM: 4, path: [{ eastM: 0, northM: 0 }, { eastM: 100, northM: 0 }] }], () => 0)
    system.set([straight("a", "paved", 7, 100)], LAT, LNG, () => 0, true)
    system.clear()
    expect(meshes(system)).toHaveLength(0)
    expect(stated(system)).toHaveLength(1)
  })

  it("lays a stated road in the account's own metres, east and north of the observer's place", () => {
    const system = new RoadSystem()
    system.setStated([{ id: "plan", surface: "dirt", widthM: 4, path: [{ eastM: 0, northM: 0 }, { eastM: 0, northM: 100 }] }], () => 0)
    const position = stated(system)[0].geometry.getAttribute("position")
    // North is the NEGATED z axis, the convention decor is placed under.
    let furthestNorth = 0
    for (let i = 0; i < position.count; i++) furthestNorth = Math.min(furthestNorth, position.getZ(i))
    expect(furthestNorth).toBeCloseTo(-100, 1)
  })

  it("re-drapes on every call, because a carriageway belongs to the relief it was laid on", () => {
    // Skipping a rebuild whose roads and place were unchanged left a whole network hanging at the
    // heights of the patch before, once the patch under it was rebuilt.
    const system = new RoadSystem()
    system.set([straight("a", "paved", 7, 100)], LAT, LNG, () => 0, false)
    const flat = meshes(system)[0].geometry.getAttribute("position").getY(4)
    system.set([straight("a", "paved", 7, 100)], LAT, LNG, () => 20, false)
    expect(meshes(system)[0].geometry.getAttribute("position").getY(4)).toBeCloseTo(flat + 20, 5)
    system.clear()
    expect(meshes(system)).toHaveLength(0)
  })
})
