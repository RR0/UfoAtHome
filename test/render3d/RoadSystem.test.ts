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

  it("keeps the carriageway above a crown the ground has between two rungs, which a flat ribbon would sink under", () => {
    // A road laid across an embankment's crown: the ground is higher in the middle of the road than at its two edges, and highest at one metre ahead.
    const crown = (x: number, z: number): number => Math.max(0, 1 - Math.abs(z) / 3) * 0.5 + (Math.abs(x - 100) < 1.5 ? 0.3 : 0)
    const system = new RoadSystem()
    system.set([straight("a", "paved", 7, 200)], LAT, LNG, crown, false)
    const position = meshes(system)[0].geometry.getAttribute("position")
    const index = meshes(system)[0].geometry.getIndex()!
    // Under a triangle's own plane at its centre, the ground may stand no more than a few centimetres above it, anywhere on the road.
    let worst = -Infinity
    for (let t = 0; t < index.count; t += 3) {
      let x = 0, y = 0, z = 0
      for (let k = 0; k < 3; k++) { x += position.getX(index.getX(t + k)) / 3; y += position.getY(index.getX(t + k)) / 3; z += position.getZ(index.getX(t + k)) / 3 }
      worst = Math.max(worst, crown(x, z) - y)
    }
    expect(worst).toBeLessThan(0.0)
  })

  it("puts a rung at least every STEP_M along a way, however few points the survey gave it", () => {
    const system = new RoadSystem()
    system.set([straight("a", "paved", 7, 200)], LAT, LNG, () => 0, false)
    const position = meshes(system)[0].geometry.getAttribute("position")
    // Three vertices a rung, and 200 m at 8 m a step is 25 steps — 26 rungs.
    expect(position.count / 3).toBeGreaterThanOrEqual(200 / RoadSystem.STEP_M)
  })

  it("draws the carriageway at the width it was given", () => {
    const system = new RoadSystem()
    system.set([straight("a", "paved", 7, 200)], LAT, LNG, () => 0, false)
    const position = meshes(system)[0].geometry.getAttribute("position")
    // The first rung: its first and last points are the road's two edges (the middle one is between them), so they are a width apart.
    const across = Math.hypot(position.getX(0) - position.getX(2), position.getZ(0) - position.getZ(2))
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

describe("RoadSystem pavements", () => {
  const sidewalks = (system: RoadSystem): Mesh<BufferGeometry> | undefined => meshes(system).find(mesh => mesh.name === "roads sidewalks")
  const urban = (way: RoadWay): RoadWay => ({ ...way, urban: true })
  const vertices = (mesh: Mesh<BufferGeometry>): number[][] => {
    const at = mesh.geometry.getAttribute("position")
    return Array.from({ length: at.count }, (_, i) => [at.getX(i), at.getY(i), at.getZ(i)])
  }

  it("draws none for a road the map does not say is urban", () => {
    const system = new RoadSystem()
    system.set([straight("a", "paved", 7, 200)], LAT, LNG, () => 0, false)
    expect(sidewalks(system)).toBeUndefined()
  })

  it("draws a strip along each side of an urban street, a kerb above the carriageway, past its edge", () => {
    const system = new RoadSystem()
    system.set([urban(straight("a", "paved", 6, 200))], LAT, LNG, () => 0, false)
    const mesh = sidewalks(system)!
    const points = vertices(mesh)
    // The carriageway is 3 m either side of its axis (z = 0); a strip lies between 3 and 4.8 m out, on both sides.
    const outside = points.map(point => Math.abs(point[2]))
    expect(Math.min(...outside)).toBeCloseTo(3, 1)
    expect(Math.max(...outside)).toBeCloseTo(4.8, 1)
    expect(points.some(point => point[2] > 0)).toBe(true)
    expect(points.some(point => point[2] < 0)).toBe(true)
    expect(points[0][1]).toBeCloseTo(RoadSystem.LIFT_M + RoadSystem.SIDEWALK_KERB_M, 5)
  })

  it("draws none for a lane or a track, or a street that is not paved", () => {
    const system = new RoadSystem()
    system.set([urban(straight("lane", "paved", 2.5, 200)), urban(straight("track", "gravel", 6, 200))], LAT, LNG, () => 0, false)
    expect(sidewalks(system)).toBeUndefined()
  })

  it("leaves a gap where a side street opens, instead of a pavement across it", () => {
    const along = urban(straight("main", "paved", 6, 200))
    const side: RoadWay = {
      id: "side", surface: "paved", widthM: 6, urban: true,
      points: [{ lat: LAT - 0.0006, lng: LNG + 100 / 92000 }, { lat: LAT + 0.0006, lng: LNG + 100 / 92000 }]
    }
    const system = new RoadSystem()
    system.set([along, side], LAT, LNG, () => 0, false)
    const mesh = sidewalks(system)!
    const points = vertices(mesh)
    const drawn = new Set(Array.from(mesh.geometry.getIndex()!.array))
    // No quad of any pavement touches the middle of the side street's mouth (on the main street, within 2.5 m of it along it, off its axis)...
    const inTheMouth = [...drawn].filter(i => Math.abs(points[i][0] - 100) < 2.5 && Math.abs(points[i][2]) < 5)
    expect(inTheMouth).toEqual([])
    // ...and the main street's pavement is there on both sides of the gap.
    expect([...drawn].some(i => points[i][0] < 90 && Math.abs(points[i][2]) < 5)).toBe(true)
    expect([...drawn].some(i => points[i][0] > 110 && Math.abs(points[i][2]) < 5)).toBe(true)
  })
})
