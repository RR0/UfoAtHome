import { describe, expect, it } from "vitest"
import { HeightGrid, OverheadStructures } from "../../../src/render3d/terrain/OverheadStructures.js"
import type { PlaceVectors, VectorFeature } from "../../../src/render3d/terrain/OverheadStructures.js"

const CENTRE = { lat: 49.1, lng: -1.08 }
const METRES = 111320

/** A line from points in metres east and north of the centre, as the map writes it: longitude then latitude. */
function line(properties: Record<string, unknown>, ...points: [number, number][]): VectorFeature {
  return {
    properties,
    geometry: { type: "LineString", coordinates: points.map(([east, north]) => [CENTRE.lng + east / (METRES * Math.cos(CENTRE.lat * Math.PI / 180)), CENTRE.lat + north / METRES]) }
  }
}

function vectors(parts: Partial<PlaceVectors>): PlaceVectors {
  return { bridges: [], elevatedRoads: [], lines: [], buildings: [], zones: [], ...parts }
}

describe("OverheadStructures bridges", () => {
  it("takes the length and direction of a bridge from its centre line, from 0 up to 180", () => {
    const [bridge] = OverheadStructures.bridges(vectors({ bridges: [line({ nature: "Pont" }, [30, 10], [30, -30])] }), CENTRE, 100, undefined)
    expect(bridge.lengthM).toBeCloseTo(40, 0)
    // Drawn from north to south: it runs the same direction as south to north.
    expect(bridge.headingDeg).toBeCloseTo(0, 0)
    expect(bridge.eastM).toBeCloseTo(30, 0)
    expect(bridge.northM).toBeCloseTo(-10, 0)
  })

  it("gives it the width of the road that is over the ground at its middle, with the edges, or what a bridge of its kind is", () => {
    const bridges = [line({ nature: "Pont" }, [-20, 0], [20, 0])]
    const road = line({ nature: "Route à 1 chaussée", largeur_de_chaussee: 7 }, [-30, 1], [30, 1])
    expect(OverheadStructures.bridges(vectors({ bridges, elevatedRoads: [road] }), CENTRE, 100, undefined)[0].widthM).toBeCloseTo(9.4, 1)
    expect(OverheadStructures.bridges(vectors({ bridges }), CENTRE, 100, undefined)[0].widthM).toBe(6)
    const path = line({ nature: "Sentier" }, [-30, 1], [30, 1])
    expect(OverheadStructures.bridges(vectors({ bridges, elevatedRoads: [path] }), CENTRE, 100, undefined)[0].widthM).toBe(2.5)
    // A road that is over the ground somewhere else is not this bridge's.
    const far = line({ nature: "Route à 1 chaussée", largeur_de_chaussee: 7 }, [-30, 80], [30, 80])
    expect(OverheadStructures.bridges(vectors({ bridges, elevatedRoads: [far] }), CENTRE, 100, undefined)[0].widthM).toBe(6)
  })

  it("names a bridge for the road it carries, when the map names it", () => {
    const bridges = [line({ nature: "Pont" }, [-20, 0], [20, 0])]
    const named = line({ nature: "Route à 1 chaussée", largeur_de_chaussee: 7, nom_voie_ban_gauche: "Rue de Carentan" }, [-30, 1], [30, 1])
    expect(OverheadStructures.bridges(vectors({ bridges, elevatedRoads: [named] }), CENTRE, 100, undefined)[0].name).toBe("Rue de Carentan")
    const bare = line({ nature: "Route à 1 chaussée", largeur_de_chaussee: 7 }, [-30, 1], [30, 1])
    expect(OverheadStructures.bridges(vectors({ bridges, elevatedRoads: [bare] }), CENTRE, 100, undefined)[0].name).toBeUndefined()
  })

  it("draws one bridge of the pieces the map cuts it into, whichever way each piece was drawn, and its deck measured over the whole", () => {
    // The Petit-Pont in Paris: two pieces meeting mid-Seine, the second drawn from its far end.
    const bridges = [line({ nature: "Pont" }, [0, -20], [0, 0]), line({ nature: "Pont" }, [0, 20], [0, 0])]
    const size = 100
    const heights = new Float32Array(size * size)
    // The deck 9 m over the water from -15 to +15 m; the bank to the south, under the first half's end, is not the deck.
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (Math.abs(x - 50) < 4 && Math.abs(50 - y) < 15) heights[y * size + x] = 9
    const grid = new HeightGrid(heights, new Uint8Array(size * size), new Uint8Array(size * size), size, 1)
    const found = OverheadStructures.bridges(vectors({ bridges }), CENTRE, 100, grid)
    expect(found).toHaveLength(1)
    expect(found[0].lengthM).toBeCloseTo(40, 0)
    expect(found[0].northM).toBeCloseTo(0, 0)
    expect(found[0].headingDeg).toBeCloseTo(0, 0)
    expect(found[0].heightM).toBe(9)
  })

  it("keeps apart two bridges that meet at a junction rather than run on", () => {
    const bridges = [line({ nature: "Pont" }, [0, -20], [0, 0]), line({ nature: "Pont" }, [0, 0], [20, 0])]
    expect(OverheadStructures.bridges(vectors({ bridges }), CENTRE, 100, undefined)).toHaveLength(2)
  })

  it("leaves out what is too short or too far", () => {
    const found = OverheadStructures.bridges(vectors({ bridges: [line({}, [0, 0], [2, 0]), line({}, [400, 0], [440, 0])] }), CENTRE, 100, undefined)
    expect(found).toEqual([])
  })
})

describe("OverheadStructures lines", () => {
  it("cuts a line into its spans, each with the direction it is drawn in, and leaves out the spans away from the place", () => {
    const found = OverheadStructures.lines(vectors({ lines: [line({ voltage: "225 kV" }, [-300, 20], [-100, 20], [100, 20], [300, 20], [500, 20])] }), CENTRE, 50, undefined)
    // The four spans, of which only the middle one passes within 50 m of the place: the others end 100 m away.
    expect(found).toHaveLength(1)
    expect(found.every(span => Math.abs(span.headingDeg - 90) < 1)).toBe(true)
    expect(found[0].lengthM).toBeCloseTo(200, 0)
  })

  it("builds a span by its voltage: the supports' height, the conductors below their top", () => {
    const heights = ["20 kV", "63 kV", "90 kV", "150 kV", "225 kV", "400 kV"].map(voltage =>
      OverheadStructures.lines(vectors({ lines: [line({ voltage }, [-50, 0], [50, 0])] }), CENTRE, 100, undefined)[0].poleHeightM)
    expect(heights).toEqual([11, 20, 22, 27, 32, 42])
    const [span] = OverheadStructures.lines(vectors({ lines: [line({ voltage: "90 kV" }, [-50, 0], [50, 0])] }), CENTRE, 100, undefined)
    expect(span.heightM).toBeCloseTo(18.5, 1)
    expect(span.acrossM).toEqual([-3.5, 0, 3.5])
  })

  it("passes by what is not under tension, or has no voltage said", () => {
    const found = OverheadStructures.lines(vectors({ lines: [line({ voltage: "Hors tension" }, [-50, 0], [50, 0]), line({}, [-50, 5], [50, 5])] }), CENTRE, 100, undefined)
    expect(found).toEqual([])
  })

  it("keeps a measured pole over a typical one, but only a reading that can be a pole", () => {
    const size = 200
    const heights = new Float32Array(size * size)
    const plants = new Uint8Array(size * size)
    const buildings = new Uint8Array(size * size)
    // 0.5 m pixels, the middle at (100, 100): a 17 m pole at 50 m east, and a 3 m fence post at 50 m west.
    const set = (east: number, north: number, height: number) => { heights[(100 - Math.round(north * 2)) * size + 100 + Math.round(east * 2)] = height }
    set(50, 0, 17)
    set(-50, 0, 3)
    const grid = new HeightGrid(heights, plants, buildings, size, 0.5)
    const [span] = OverheadStructures.lines(vectors({ lines: [line({ voltage: "90 kV" }, [-50, 0], [50, 0])] }), CENTRE, 100, grid)
    // Only the 17 m is a pole: the post is under what a pole can be, and the 22 m of the table is not used where one end measured.
    expect(span.poleHeightM).toBeCloseTo(17, 0)
  })
})

describe("HeightGrid", () => {
  it("reads a structure, and never a plant or a roof", () => {
    const size = 20
    const heights = new Float32Array(size * size).fill(8)
    const plants = new Uint8Array(size * size)
    const buildings = new Uint8Array(size * size)
    plants[10 * size + 11] = 1
    buildings[10 * size + 12] = 1
    const grid = new HeightGrid(heights, plants, buildings, size, 1)
    expect(grid.structureAt(0.5, -0.5)).toBe(8)
    expect(grid.structureAt(1.5, -0.5)).toBeUndefined()
    expect(grid.structureAt(2.5, -0.5)).toBeUndefined()
    expect(grid.structureAt(500, 0)).toBeUndefined()
  })
})
