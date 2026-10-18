import { describe, expect, it } from "vitest"
import { Mesh } from "three"
import { RailwaySystem } from "../../src/render3d/RailwaySystem.js"
import { localMetersToGeo } from "../../src/render3d/terrain/GeoProjection.js"
import type { RailwayLine } from "../../src/render3d/terrain/RailwayProvider.js"

const ORIGIN = { lat: 48.84, lng: 2.378 }

/** A line through points in metres east and south of the origin (the patch's x and z), each with an altitude where one is given. */
function line(overrides: Partial<RailwayLine>, ...points: [number, number, number?][]): RailwayLine {
  return {
    id: "line", kind: "rail", gaugeMm: 1435, tracks: 1, level: 0, ...overrides,
    points: points.map(([x, z, altitudeM]) => ({ ...localMetersToGeo(x, z, ORIGIN.lat, ORIGIN.lng), ...(altitudeM !== undefined ? { altitudeM } : {}) }))
  }
}

function mesh(system: RailwaySystem, name: string): Mesh | undefined {
  return system.group.children.find(child => child.name === `railways ${name}`) as Mesh | undefined
}

function bounds(system: RailwaySystem, name: string) {
  const geometry = mesh(system, name)!.geometry
  geometry.computeBoundingBox()
  return geometry.boundingBox!
}

describe("RailwaySystem", () => {
  it("lays a track on the ground: ballast to the top of the sleepers, the rails on them at the gauge", () => {
    const system = new RailwaySystem()
    system.set([line({}, [-100, 0], [100, 0])], ORIGIN.lat, ORIGIN.lng, () => 30)
    expect(system.count).toBe(1)
    expect(bounds(system, "ballast").max.y).toBeCloseTo(30 + RailwaySystem.BALLAST_HEIGHT_M + RailwaySystem.LIFT_M, 2)
    const heads = bounds(system, "rail heads")
    expect(heads.max.y).toBeCloseTo(30 + RailwaySystem.BALLAST_HEIGHT_M + RailwaySystem.LIFT_M + RailwaySystem.RAIL_HEIGHT_M, 2)
    // The two heads, outer face to outer face: the gauge between the inner faces and a head on each side.
    expect(heads.max.z - heads.min.z).toBeCloseTo(1.435 + 2 * RailwaySystem.RAIL_HEAD_M, 2)
    const sleepers = bounds(system, "sleepers")
    expect(sleepers.max.z - sleepers.min.z).toBeCloseTo(RailwaySystem.SLEEPER_LENGTH_M, 2)
    // Every face of the ballast's top looks up.
    const normals = mesh(system, "ballast")!.geometry.getAttribute("normal")
    let up = 0
    for (let i = 0; i < normals.count; i++) if (normals.getY(i) > 0) up++
    expect(up).toBe(normals.count)
  })

  it("stops the ballast at its own height on an embankment, and draws the bank below it as earth", () => {
    const system = new RailwaySystem()
    // The relief falls 1.5 m from the middle of the track to 4 m out on each side, as the smoothed relief of a low embankment does.
    const bank = (_x: number, z: number): number => 30 - Math.min(1.5, Math.abs(z) * 1.5 / 4)
    system.set([line({}, [-100, 0], [100, 0])], ORIGIN.lat, ORIGIN.lng, bank)
    const ballast = bounds(system, "ballast")
    expect(ballast.max.y - ballast.min.y).toBeLessThan(RailwaySystem.BALLAST_HEIGHT_M + 0.05)
    const earth = bounds(system, "embankments")
    expect(earth.min.y).toBeLessThan(29)
    expect(earth.max.y).toBeLessThanOrEqual(ballast.min.y + 0.001)
  })

  it("draws the two tracks of a double line side by side, and nothing of a tunnel", () => {
    const system = new RailwaySystem()
    system.set([line({ tracks: 2 }, [-100, 0], [100, 0]), line({ id: "tunnel", level: -1 }, [-100, 50], [100, 50])], ORIGIN.lat, ORIGIN.lng, () => 0)
    expect(system.count).toBe(1)
    const heads = bounds(system, "rail heads")
    expect(heads.max.z - heads.min.z).toBeCloseTo(3.7 + 1.435 + 2 * RailwaySystem.RAIL_HEAD_M, 2)
  })

  it("holds a viaduct at the map's altitude against the ground the scene draws, meeting the ground where the line at grade starts", () => {
    const system = new RailwaySystem()
    // The ground is 10 m below the map's altitudes everywhere, and falls 8 m into a valley under the viaduct.
    const ground = (x: number) => x > 110 && x < 290 ? 22 : 30
    system.set([
      line({ id: "west" }, [-100, 0, 40], [0, 0, 40], [100, 0, 40]),
      line({ id: "viaduct", level: 1 }, [100, 0, 40], [200, 0, 40.5], [300, 0, 40]),
      line({ id: "east" }, [300, 0, 40], [400, 0, 40])
    ], ORIGIN.lat, ORIGIN.lng, (x: number) => ground(x))
    const ballast = mesh(system, "ballast")!.geometry
    ballast.computeBoundingBox()
    // Nothing sinks into the valley: the deck's underside is the lowest of it, under the formation at 30 m.
    expect(ballast.boundingBox!.min.y).toBeGreaterThan(30 - RailwaySystem.DECK_DEPTH_M - 0.01)
    // The hump of the map's half metre is kept.
    expect(ballast.boundingBox!.max.y).toBeCloseTo(30.5 + RailwaySystem.BALLAST_HEIGHT_M + RailwaySystem.LIFT_M, 1)
  })

  it("hangs the contact wire of an electrified main line 5.50 m over the rail, a mast every span or so", () => {
    const system = new RailwaySystem()
    system.set([line({ electrification: "overhead" }, [-270, 0], [270, 0])], ORIGIN.lat, ORIGIN.lng, () => 0)
    const railTop = RailwaySystem.BALLAST_HEIGHT_M + RailwaySystem.LIFT_M + RailwaySystem.RAIL_HEIGHT_M
    const wires = mesh(system, "catenary wires")!.geometry
    const positions = wires.getAttribute("position")
    let lowest = Infinity
    let highest = -Infinity
    for (let i = 0; i < positions.count; i++) {
      lowest = Math.min(lowest, positions.getY(i))
      highest = Math.max(highest, positions.getY(i))
    }
    expect(lowest + RailwaySystem.CONTACT_DIAMETER_M / 2).toBeCloseTo(railTop + 5.5, 2)
    // The messenger, 1.40 m over it at a mast.
    expect(highest - RailwaySystem.MESSENGER_DIAMETER_M / 2).toBeCloseTo(railTop + 5.5 + 1.4, 2)
    // Masts: 540 m in spans of 54, each a box of 24 vertices, and two arms of a cantilever each.
    const steel = mesh(system, "catenary masts")!.geometry.getAttribute("position")
    expect(steel.count / (24 * 3)).toBe(10)
  })

  it("gives a tram its rails in the street and a single wire, and a metro no wire at all", () => {
    const tram = new RailwaySystem()
    tram.set([line({ kind: "tram", electrification: "overhead" }, [-60, 0], [60, 0])], ORIGIN.lat, ORIGIN.lng, () => 0)
    expect(mesh(tram, "ballast")).toBeUndefined()
    expect(mesh(tram, "sleepers")).toBeUndefined()
    expect(bounds(tram, "catenary wires").max.y).toBeCloseTo(RailwaySystem.LIFT_M + RailwaySystem.TRAM_RAIL_HEIGHT_M + 6 + RailwaySystem.CONTACT_DIAMETER_M / 2, 2)
    const metro = new RailwaySystem()
    metro.set([line({ kind: "subway", electrification: "third_rail" }, [-60, 0], [60, 0])], ORIGIN.lat, ORIGIN.lng, () => 0)
    expect(mesh(metro, "catenary wires")).toBeUndefined()
    expect(mesh(metro, "rail heads")).toBeDefined()
  })

  it("leaves out the lines that do not come near the patch", () => {
    const system = new RailwaySystem()
    system.set([line({}, [5000, 0], [5100, 0])], ORIGIN.lat, ORIGIN.lng, () => 0, 900)
    expect(system.count).toBe(0)
    expect(system.group.children).toHaveLength(0)
  })
})
