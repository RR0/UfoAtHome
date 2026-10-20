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

describe("RoadMarkings.plan: the paint by what the road is", () => {
  const base = { surface: "paved" as const, kind: "road" as const }
  const offsets = (lines: { offsetM: number }[]) => lines.map(line => Number(line.offsetM.toFixed(2))).sort((a, b) => a - b)

  it("paints a way that says nothing of its use as any wide road: edges whole, the middle dashed", () => {
    const lines = RoadMarkings.plan({ surface: "paved", widthM: 7 })
    expect(lines.map(line => line.pattern).sort()).toEqual(["dashed", "solid", "solid"])
    expect(offsets(lines)).toEqual([-3.1, 0, 3.1])
    expect(RoadMarkings.plan({ surface: "paved", widthM: 12 }).filter(line => line.pattern === "dashed").map(line => line.offsetM).sort((a, b) => a - b)).toEqual([-3, 3])
  })

  it("paints nothing on a track, a lane too narrow for two ways, or a roundabout", () => {
    expect(RoadMarkings.plan({ ...base, surface: "gravel", widthM: 8 })).toEqual([])
    expect(RoadMarkings.plan({ ...base, widthM: 4.5, lanes: 2, direction: "both" })).toEqual([])
    expect(RoadMarkings.plan({ surface: "paved", widthM: 7, kind: "roundabout", lanes: 2, direction: "forward" })).toEqual([])
  })

  it("paints a carriageway of a motorway: its two edges whole, a shoulder's line where the lanes end, a dashed line between the lanes", () => {
    // Ten metres, two lanes of three and a half: seven of lanes, three of shoulder. Going with its points, its left is the left of the points.
    const lines = RoadMarkings.plan({ surface: "paved", widthM: 10, kind: "motorway", lanes: 2, direction: "forward", speedKmh: 90 })
    const whole = lines.filter(line => line.pattern === "solid").map(line => Number(line.offsetM.toFixed(2))).sort((a, b) => a - b)
    // The median's edge 0.4 m in from the left edge; the shoulder's line 7 m from the left edge; the lane between at 3.5 m.
    expect(whole).toEqual([-2, 4.6])
    expect(lines.filter(line => line.pattern === "dashed").map(line => line.offsetM)).toEqual([1.5])
  })

  it("mirrors a carriageway that goes against the order of its points: its left is their right", () => {
    const forward = RoadMarkings.plan({ surface: "paved", widthM: 10, kind: "motorway", lanes: 2, direction: "forward" })
    const backward = RoadMarkings.plan({ surface: "paved", widthM: 10, kind: "motorway", lanes: 2, direction: "backward" })
    expect(offsets(backward)).toEqual(offsets(forward).map(offset => -offset).sort((a, b) => a - b))
  })

  it("gives a motorway of three lanes two dashed lines, and has no shoulder line where the carriageway is all lanes", () => {
    const lines = RoadMarkings.plan({ surface: "paved", widthM: 10.5, kind: "motorway", lanes: 3, direction: "forward" })
    expect(lines.filter(line => line.pattern === "dashed")).toHaveLength(2)
    // Three lanes of three and a half fill it: the right line is the edge's own.
    const right = lines.filter(line => line.pattern === "solid").map(line => line.offsetM).sort((a, b) => a - b)
    expect(right[0]).toBeCloseTo(-(10.5 / 2 - 0.4), 6)
  })

  it("paints a two-way road of two lanes with its middle dashed and whole in the bends, its edges whole from seven metres or 80 km/h and in short dashes below", () => {
    const wide = RoadMarkings.plan({ ...base, widthM: 7, lanes: 2, direction: "both", speedKmh: 40 })
    expect(wide.find(line => line.offsetM === 0)).toMatchObject({ pattern: "dashed", solidInBends: true })
    expect(wide.filter(line => line.pattern === "solid" || line.pattern === "rive").every(line => line.pattern === "solid")).toBe(true)
    const narrow = RoadMarkings.plan({ ...base, widthM: 6, lanes: 2, direction: "both", speedKmh: 40 })
    expect(narrow.filter(line => line.offsetM !== 0).every(line => line.pattern === "rive")).toBe(true)
    const fast = RoadMarkings.plan({ ...base, widthM: 6, lanes: 2, direction: "both", speedKmh: 90 })
    expect(fast.filter(line => line.offsetM !== 0).every(line => line.pattern === "solid")).toBe(true)
  })

  it("paints a double whole line down the middle of a two-way road of four lanes, and its lanes dashed", () => {
    const lines = RoadMarkings.plan({ ...base, widthM: 14, lanes: 4, direction: "both", speedKmh: 70 })
    expect(lines.filter(line => Math.abs(line.offsetM) < 0.2).map(line => line.pattern)).toEqual(["solid", "solid"])
    expect(lines.filter(line => line.pattern === "dashed").length).toBeGreaterThanOrEqual(2)
  })

  it("paints a two-way road of one lane not at all, and a one-way street with edges only", () => {
    expect(RoadMarkings.plan({ ...base, widthM: 6, lanes: 1, direction: "both" })).toEqual([])
    const oneWay = RoadMarkings.plan({ ...base, widthM: 6, lanes: 1, direction: "forward", speedKmh: 30 })
    expect(oneWay.filter(line => line.pattern === "dashed")).toEqual([])
    expect(oneWay).toHaveLength(2)
  })
})

describe("RoadMarkings.byBends", () => {
  it("keeps a straight in one run and marks the tight bend of a way as another", () => {
    const straight = Array.from({ length: 9 }, (_, i) => ({ x: i * 40, z: 0 }))
    expect(RoadMarkings.byBends(straight)).toEqual([{ path: straight, bend: false }])
    // A way that turns a quarter in thirty metres has a radius of a few tens of metres.
    const bent = [{ x: 0, z: 0 }, { x: 400, z: 0 }, { x: 430, z: 20 }, { x: 440, z: 60 }, { x: 440, z: 560 }]
    const runs = RoadMarkings.byBends(bent)
    expect(runs.some(run => run.bend)).toBe(true)
    expect(runs.some(run => !run.bend)).toBe(true)
  })
})

describe("RoadMarkings.barriers: the median between two carriageways", () => {
  const way = (id: string, direction: "forward" | "backward", northM: number, kind: RoadWay["kind"] = "motorway"): RoadWay => ({
    id, surface: "paved", widthM: 10, kind, lanes: 2, direction,
    points: [{ lat: LAT + northM / 111320, lng: LNG - 100 / 72850 }, { lat: LAT + northM / 111320, lng: LNG + 100 / 72850 }]
  })
  // Two carriageways of a motorway: one goes east (forward along its points), the other west (backward along its points, which run east).
  const pair = (gapM: number) => [way("a", "forward", 0), way("b", "backward", gapM)]

  it("runs a barrier midway between two carriageways that go opposite ways, drawn once", () => {
    const paths = RoadMarkings.barriers(pair(20), LAT, LNG)
    expect(paths).toHaveLength(1)
    // Z is the negated north: the middle of two carriageways 20 m apart is 10 m north of the first.
    for (const point of paths[0]) expect(point.z).toBeCloseTo(-10, 1)
    expect(Math.abs(paths[0].at(-1)!.x - paths[0][0].x)).toBeGreaterThan(100)
  })

  it("leaves no hole where the map cuts a carriageway in two", () => {
    // The eastbound carriageway in two ways meeting 3 m east of the origin, a step's remainder short of the 4 m step.
    const cut = (id: string, fromM: number, toM: number): RoadWay => ({
      ...way(id, "forward", 0), points: [{ lat: LAT, lng: LNG + fromM / 72850 }, { lat: LAT, lng: LNG + toM / 72850 }]
    })
    const paths = RoadMarkings.barriers([cut("a1", -100, 3), cut("a2", 3, 100), way("b", "backward", 20)], LAT, LNG)
    const reaches = paths.map(path => [Math.min(...path.map(point => point.x)), Math.max(...path.map(point => point.x))]).sort((p, q) => p[0] - q[0])
    for (let i = 1; i < reaches.length; i++) expect(reaches[i][0] - reaches[i - 1][1]).toBeLessThan(0.5)
  })

  it("makes none between two carriageways that go the same way, or that stand too far apart or too close", () => {
    expect(RoadMarkings.barriers([way("a", "forward", 0), way("b", "forward", 20)], LAT, LNG)).toEqual([])
    expect(RoadMarkings.barriers(pair(80), LAT, LNG)).toEqual([])
    expect(RoadMarkings.barriers(pair(3), LAT, LNG)).toEqual([])
  })

  it("makes none for roads that are not of two carriageways", () => {
    expect(RoadMarkings.barriers([way("a", "forward", 0, "road"), way("b", "backward", 20, "road")], LAT, LNG)).toEqual([])
  })

  it("builds a prism along each path: four points a ring, three faces between rings", () => {
    const geometry = RoadMarkings.barrierGeometry([[{ x: 0, z: 0 }, { x: 10, z: 0 }, { x: 20, z: 0 }]], () => 5)
    expect(geometry.positions.length / 3).toBe(12)
    expect(geometry.indices.length / 3).toBe(2 * 3 * 2)
    const heights = geometry.positions.filter((_, i) => i % 3 === 1)
    expect(Math.min(...heights)).toBe(5)
    expect(Math.max(...heights)).toBeCloseTo(5 + RoadMarkings.BARRIER_HEIGHT_M, 6)
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
