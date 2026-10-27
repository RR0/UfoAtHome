import { describe, expect, it } from "vitest"
import type { BufferGeometry, Mesh } from "three"
import { RoadSystem } from "../../src/render3d/RoadSystem.js"
import type { RoadWay } from "../../src/render3d/terrain/RoadProvider.js"
import { StreetFacades } from "../../src/render3d/StreetFacades.js"

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

  it("is drawn right after the ground, so a faint ribbon blends with the ground and not with the sky behind it", () => {
    // Drawn first, a surveyed road (45% opaque) was blended with the bright sky below the night's horizon, and the ground, a little farther in depth, never
    // covered it: the road came out as a glow over the ground.
    const system = new RoadSystem()
    system.set([straight("a", "paved", 7, 200)], LAT, LNG, () => 0, true)
    const ribbon = meshes(system)[0]
    expect(ribbon.renderOrder).toBe(RoadSystem.RENDER_ORDER)
    // The ground's own order is 1 (SceneRenderer.TERRAIN_RENDER_ORDER), and the clouds' is between it and the compass's, 10.
    expect(RoadSystem.RENDER_ORDER).toBeGreaterThan(1)
    expect(RoadSystem.RENDER_ORDER).toBeLessThan(2)
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

  describe("between the walls of a street", () => {
    // Rue Maurice Thorez in Nanterre: three metres of lane in the map, façades 6.9 m on one side and 4.2 m on the other.
    const wallFootprints = [
      { x: 100, z: -6.9 - 5, alongX: 1, alongZ: 0, halfAlongM: 150, halfAcrossM: 5 },
      { x: 100, z: 4.2 + 5, alongX: 1, alongZ: 0, halfAlongM: 150, halfAcrossM: 5 }
    ]
    const walls = new StreetFacades(wallFootprints)
    const lane = urban(straight("thorez", "paved", 3, 200))
    const drawnZ = (mesh: Mesh<BufferGeometry>): number[] => {
      const points = vertices(mesh)
      return [...new Set(Array.from(mesh.geometry.getIndex()!.array))].filter(i => points[i][0] > 20 && points[i][0] < 180).map(i => points[i][2])
    }

    it("lays the carriageway the map states in the middle of the street, and the pavements out to the walls", () => {
      const system = new RoadSystem()
      system.set([lane], LAT, LNG, () => 0, false, Infinity, walls)
      const carriageway = drawnZ(meshes(system).find(mesh => mesh.name === "roads paved")!)
      const pavements = drawnZ(sidewalks(system)!)
      // From wall to wall, 11.1 m: the pavements at the walls, the carriageway centred between them and three metres, one car, as the map says.
      expect(Math.min(...pavements)).toBeCloseTo(-6.9, 1)
      expect(Math.max(...pavements)).toBeCloseTo(4.2, 1)
      const left = Math.min(...carriageway)
      const right = Math.max(...carriageway)
      expect(right - left).toBeCloseTo(3, 1)
      expect((left + right) / 2).toBeCloseTo((-6.9 + 4.2) / 2, 1)
    })

    it("stands the face of each kerb up from the carriageway, facing it", () => {
      const system = new RoadSystem()
      system.set([lane], LAT, LNG, () => 0, false, Infinity, walls)
      const mesh = sidewalks(system)!
      const normals = mesh.geometry.getAttribute("normal")
      const points = vertices(mesh)
      const faces = Array.from({ length: normals.count }, (_, i) => i).filter(i => Math.abs(normals.getY(i)) < 0.1 && points[i][0] > 20 && points[i][0] < 180)
      // Two kerbs, each its height high, and each turned towards the middle of the street.
      const heights = faces.map(i => points[i][1])
      expect(Math.max(...heights) - Math.min(...heights)).toBeCloseTo(RoadSystem.SIDEWALK_KERB_M, 5)
      const middle = (-6.9 + 4.2) / 2
      for (const i of faces) expect(Math.sign(normals.getZ(i))).toBe(Math.sign(middle - points[i][2]))
    })

    it("draws the pavements solid, a road of today though it is: a faint kerb is a pane of glass", () => {
      const system = new RoadSystem()
      system.set([lane], LAT, LNG, () => 0, true, Infinity, walls)
      expect(sidewalks(system)!.material).toMatchObject({ transparent: false, opacity: 1 })
    })

    it("moves the lane off a surveyed lamp: a lamp stands on a pavement, never in the carriageway", () => {
      // The middle of the street is at -1.35; a lamp surveyed there says the lane runs beside it.
      const lamp = { x: 100, z: -1.35 }
      const system = new RoadSystem()
      system.set([lane], LAT, LNG, () => 0, false, Infinity, new StreetFacades(wallFootprints, [lamp]))
      const carriageway = drawnZ(meshes(system).find(mesh => mesh.name === "roads paved")!)
      const left = Math.min(...carriageway)
      const right = Math.max(...carriageway)
      expect(right - left).toBeCloseTo(3, 1)
      expect(lamp.z < left - 0.3 || lamp.z > right + 0.3).toBe(true)
    })

    it("puts a lamp nobody surveyed that fell in the carriageway at the kerb of the side it was put on", () => {
      const system = new RoadSystem()
      system.set([lane], LAT, LNG, () => 0, false, Infinity, walls)
      const carriageway = drawnZ(meshes(system).find(mesh => mesh.name === "roads paved")!)
      const top = Math.max(...carriageway)
      const moved = system.atKerb(80, top - 0.5)
      expect(moved.x).toBeCloseTo(80, 5)
      expect(moved.z).toBeCloseTo(top + 0.5, 1)
      // Nowhere near a street laid between walls: where it was.
      expect(system.atKerb(80, 500)).toEqual({ x: 80, z: 500 })
    })

    it("draws pavements along a lane too narrow for them by its width alone, once its walls say there is room", () => {
      const system = new RoadSystem()
      system.set([lane], LAT, LNG, () => 0, false)
      expect(sidewalks(system)).toBeUndefined()
      system.set([lane], LAT, LNG, () => 0, false, Infinity, walls)
      expect(sidewalks(system)).toBeDefined()
    })
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

  it("draws only the roads that come near the patch, however many an archive holds", () => {
    const system = new RoadSystem()
    const near = straight("near", "paved", 7, 200)
    // A road five kilometres east of the patch: an archive of a whole drive holds it, and the patch of a few hundred metres cannot show it.
    const far: RoadWay = { id: "far", surface: "paved", widthM: 7, points: [{ lat: LAT, lng: LNG + 5000 / 92000 }, { lat: LAT, lng: LNG + 5200 / 92000 }] }
    system.set([near, far], LAT, LNG, () => 0, false, 900)
    const position = meshes(system)[0].geometry.getAttribute("position")
    for (let i = 0; i < position.count; i++) expect(Math.abs(position.getX(i))).toBeLessThan(1500)
    // Without a radius, all of it.
    const whole = new RoadSystem()
    whole.set([near, far], LAT, LNG, () => 0, false)
    const wide = meshes(whole)[0].geometry.getAttribute("position")
    let farthest = 0
    for (let i = 0; i < wide.count; i++) farthest = Math.max(farthest, Math.abs(wide.getX(i)))
    expect(farthest).toBeGreaterThan(4000)
  })

  it("lays the pavements of a town of hundreds of streets in a fraction of a second, not seconds: each rung asks its own cell of ground", () => {
    // A grid of 30 x 30 urban streets 60 m apart: 1800 ways crossing and the pavements of every one of them.
    const ways: RoadWay[] = []
    for (let i = 0; i < 30; i++) {
      const north = i * 60 / 111320
      ways.push({ id: `e${i}`, surface: "paved", widthM: 6, urban: true, points: [{ lat: LAT + north, lng: LNG }, { lat: LAT + north, lng: LNG + 1800 / 92000 }] })
      const east = i * 60 / 92000
      ways.push({ id: `n${i}`, surface: "paved", widthM: 6, urban: true, points: [{ lat: LAT, lng: LNG + east }, { lat: LAT + 1800 / 111320, lng: LNG + east }] })
    }
    const system = new RoadSystem()
    const started = performance.now()
    system.set(ways, LAT, LNG, () => 0, false)
    expect(performance.now() - started).toBeLessThan(1500)
    const pavements = meshes(system).find(mesh => mesh.name === "roads sidewalks")
    expect(pavements).toBeDefined()
    expect(pavements!.geometry.getIndex()!.count).toBeGreaterThan(0)
  })
})
