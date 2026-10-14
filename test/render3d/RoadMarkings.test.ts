import { describe, expect, it } from "vitest"
import type { BufferGeometry, Mesh } from "three"
import { RoadMarkings } from "../../src/render3d/RoadMarkings.js"
import type { MarkingStrip } from "../../src/render3d/RoadMarkings.js"
import { RoadSystem } from "../../src/render3d/RoadSystem.js"
import type { RoadWay } from "../../src/render3d/terrain/RoadProvider.js"

const LAT = 49.1
const LNG = 2.75
const way = (surface: RoadWay["surface"], widthM: number, metresEast = 120): RoadWay => ({
  id: `${surface}-${widthM}`, surface, widthM, points: [{ lat: LAT, lng: LNG }, { lat: LAT, lng: LNG + metresEast / 72850 }]
})
const laid = (ways: RoadWay[]) => {
  const strips: { length: number, offsetM: number, widthM: number }[] = []
  const strip: MarkingStrip = (points, widthM, options) => {
    let length = 0
    for (let i = 1; i < points.length; i++) length += Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z)
    strips.push({ length, offsetM: options.offsetM, widthM })
  }
  const count = RoadMarkings.lay(ways, LAT, LNG, strip)
  return { count, strips }
}

describe("RoadMarkings", () => {
  it("cuts a path into dashes of three metres with nine between", () => {
    const path = [{ x: 0, z: 0 }, { x: 100, z: 0 }]
    const dashes = RoadMarkings.dashes(path, 3, 9)
    // One at 0, 12, 24 ... 96: nine of them.
    expect(dashes).toHaveLength(9)
    for (const dash of dashes) expect(Math.abs(dash.at(-1)!.x - dash[0].x - 3)).toBeLessThan(1e-6)
    expect(dashes[1][0].x).toBeCloseTo(12, 6)
    expect(dashes[8][0].x).toBeCloseTo(96, 6)
  })

  it("lets the pattern run on across a bend instead of starting again at every point", () => {
    // Two segments of 7 m each: the dash that starts at 0 ends at 3, the next starts at 12, which is 5 m into the second segment.
    const path = [{ x: 0, z: 0 }, { x: 7, z: 0 }, { x: 7, z: 20 }]
    const dashes = RoadMarkings.dashes(path, 3, 9)
    expect(dashes[0][0]).toEqual({ x: 0, z: 0 })
    expect(dashes[1][0].x).toBeCloseTo(7, 6)
    expect(dashes[1][0].z).toBeCloseTo(5, 6)
  })

  it("keeps a dash that is cut by a point of the way in one piece, bent at it", () => {
    const path = [{ x: 0, z: 0 }, { x: 2, z: 0 }, { x: 2, z: 10 }]
    const first = RoadMarkings.dashes(path, 3, 9)[0]
    expect(first).toHaveLength(3)
    expect(first[1]).toEqual({ x: 2, z: 0 })
    expect(first[2].z).toBeCloseTo(1, 6)
  })

  it("keeps the stretches of a way near the patch, and leaves out what is too far to be seen", () => {
    const path = [{ x: -2000, z: 0 }, { x: -1000, z: 0 }, { x: -400, z: 0 }, { x: 0, z: 0 }, { x: 400, z: 0 }, { x: 1000, z: 0 }, { x: 2000, z: 0 }]
    const runs = RoadMarkings.near(path, 450)
    expect(runs).toHaveLength(1)
    // From the point 400 m west, which is near, to the one 400 m east: the segments with an end within reach, in one piece.
    expect(runs[0][0].x).toBe(-1000)
    expect(runs[0].at(-1)!.x).toBe(1000)
    expect(RoadMarkings.near([{ x: 3000, z: 0 }, { x: 4000, z: 0 }], 450)).toEqual([])
    // A long segment that passes near the origin with no end near is kept.
    expect(RoadMarkings.near([{ x: -5000, z: 10 }, { x: 5000, z: 10 }], 450)).toHaveLength(1)
  })

  it("paints the paved roads wide enough for two ways, and no lane, track or gravel", () => {
    expect(RoadMarkings.painted(way("paved", 7))).toBe(true)
    expect(RoadMarkings.painted(way("paved", 5))).toBe(false)
    expect(RoadMarkings.painted(way("gravel", 8))).toBe(false)
    expect(laid([way("paved", 3), way("gravel", 8), way("dirt", 6)]).count).toBe(0)
  })

  it("draws an edge line each side, whole, and one dashed line in the middle of a two-way road", () => {
    const { strips } = laid([way("paved", 7)])
    const edges = strips.filter(strip => Math.abs(strip.offsetM) > 1)
    expect(edges.map(strip => strip.offsetM).sort()).toEqual([-3.1, 3.1])
    for (const edge of edges) expect(edge.length).toBeGreaterThan(100)
    const middle = strips.filter(strip => strip.offsetM === 0)
    expect(middle.length).toBeGreaterThan(5)
    for (const dash of middle) expect(dash.length).toBeCloseTo(3, 1)
    for (const line of strips) expect(line.widthM).toBeCloseTo(0.12, 6)
  })

  it("marks the lanes, and not the middle, of a road wide enough for two each way", () => {
    const { strips } = laid([way("paved", 12)])
    const offsets = new Set(strips.filter(strip => strip.length < 5).map(strip => strip.offsetM))
    expect([...offsets].sort()).toEqual([-3, 3])
  })
})

describe("RoadSystem and the paint of its roads", () => {
  const groups = (system: RoadSystem) => (system.group.children.find(child => child.name === "roads surveyed")?.children ?? []) as Mesh<BufferGeometry>[]
  const names = (system: RoadSystem) => groups(system).map(mesh => mesh.name)

  it("lays the paint of a road wide enough, a moment after the road, from code that comes in then", async () => {
    const system = new RoadSystem()
    let drawn = 0
    system.onMarkings = () => { drawn++ }
    system.set([way("paved", 7)], LAT, LNG, () => 0, true)
    expect(names(system)).not.toContain("roads markings")
    await vi_waitFor(() => names(system).includes("roads markings"))
    expect(drawn).toBe(1)
    const paint = groups(system).find(mesh => mesh.name === "roads markings")!
    expect(paint.renderOrder).toBe(RoadSystem.MARKINGS_RENDER_ORDER)
    expect(paint.renderOrder).toBeGreaterThan(RoadSystem.RENDER_ORDER)
  })

  it("does not ask for the code of the paint for roads that have none: a track, a lane", async () => {
    const system = new RoadSystem()
    let drawn = 0
    system.onMarkings = () => { drawn++ }
    system.set([way("gravel", 8), way("paved", 3)], LAT, LNG, () => 0, true)
    await new Promise(resolve => setTimeout(resolve, 60))
    expect(names(system)).not.toContain("roads markings")
    expect(drawn).toBe(0)
  })

  it("drops the paint of roads that were replaced before it came", async () => {
    const system = new RoadSystem()
    system.set([way("paved", 7)], LAT, LNG, () => 0, true)
    // Another patch's roads, with nothing to paint, take their place at once.
    system.set([way("gravel", 4)], LAT, LNG, () => 0, true)
    await new Promise(resolve => setTimeout(resolve, 60))
    expect(names(system)).not.toContain("roads markings")
  })
})

async function vi_waitFor(condition: () => boolean, timeoutMs = 2000): Promise<void> {
  const start = Date.now()
  while (!condition()) {
    if (Date.now() - start > timeoutMs) throw new Error("timed out")
    await new Promise(resolve => setTimeout(resolve, 10))
  }
}
