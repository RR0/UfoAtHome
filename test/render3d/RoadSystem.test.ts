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

function meshes(system: RoadSystem): Mesh<BufferGeometry>[] {
  return system.group.children as Mesh<BufferGeometry>[]
}

describe("RoadSystem", () => {
  it("draws one mesh per surface, not one per way — a town is five hundred ways", () => {
    const system = new RoadSystem()
    system.set([
      straight("a", "paved", 7, 200), straight("b", "paved", 5, 200), straight("c", "gravel", 4, 200)
    ], LAT, LNG, () => 0, true, "k")
    expect(meshes(system).map(mesh => mesh.name).sort()).toEqual(["roads gravel", "roads paved"])
  })

  it("lays the carriageway on the relief rather than flat between the survey's two points", () => {
    // OSM states a straight kilometre as two points. Laid flat between them, a road would cut
    // through every rise in between.
    const system = new RoadSystem()
    system.set([straight("a", "paved", 7, 200)], LAT, LNG, SLOPE, false, "k")
    const position = meshes(system)[0].geometry.getAttribute("position")
    let worst = 0
    for (let i = 0; i < position.count; i++) {
      worst = Math.max(worst, Math.abs(position.getY(i) - (SLOPE(position.getX(i)) + RoadSystem.LIFT_M)))
    }
    expect(worst).toBeLessThan(0.01)
  })

  it("puts a rung at least every STEP_M along a way, however few points the survey gave it", () => {
    const system = new RoadSystem()
    system.set([straight("a", "paved", 7, 200)], LAT, LNG, () => 0, false, "k")
    const position = meshes(system)[0].geometry.getAttribute("position")
    // Two vertices a rung, and 200 m at 8 m a step is 25 steps — 26 rungs.
    expect(position.count / 2).toBeGreaterThanOrEqual(200 / RoadSystem.STEP_M)
  })

  it("draws the carriageway at the width it was given", () => {
    const system = new RoadSystem()
    system.set([straight("a", "paved", 7, 200)], LAT, LNG, () => 0, false, "k")
    const position = meshes(system)[0].geometry.getAttribute("position")
    // The first rung: its two ends are the road's two edges, so they are a width apart.
    const across = Math.hypot(position.getX(0) - position.getX(1), position.getZ(0) - position.getZ(1))
    expect(across).toBeCloseTo(7, 1)
  })

  it("draws a contemporary road faint, and one the case file states at full presence", () => {
    const stated = new RoadSystem()
    stated.set([straight("a", "gravel", 4, 100)], LAT, LNG, () => 0, false, "k")
    const today = new RoadSystem()
    today.set([straight("a", "gravel", 4, 100)], LAT, LNG, () => 0, true, "k")
    const opacityOf = (system: RoadSystem): number => (meshes(system)[0].material as { opacity: number }).opacity
    expect(opacityOf(stated)).toBe(1)
    expect(opacityOf(today)).toBe(RoadSystem.CONTEMPORARY_OPACITY)
  })

  it("does not rebuild what it already holds, and drops everything when asked", () => {
    const system = new RoadSystem()
    system.set([straight("a", "paved", 7, 100)], LAT, LNG, () => 0, false, "k")
    const before = meshes(system)[0]
    system.set([straight("b", "gravel", 4, 100)], LAT, LNG, () => 0, false, "k")
    expect(meshes(system)[0]).toBe(before)
    system.clear()
    expect(meshes(system)).toHaveLength(0)
  })
})
