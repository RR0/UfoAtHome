import { describe, expect, it } from "vitest"
import { TopoBuildings } from "../../../src/render3d/terrain/TopoBuildings.js"
import type { VectorFeature } from "../../../src/render3d/terrain/OverheadStructures.js"

const CENTRE = { lat: 49.1, lng: -1.08 }
const METRES = 111320

/** A MultiPolygon from rings of points given as metres east and north of the centre. */
function polygon(properties: Record<string, unknown>, ...rings: [number, number][][]): VectorFeature {
  const lonLat = (ring: [number, number][]) => [...ring, ring[0]].map(([east, north]) => [CENTRE.lng + east / (METRES * Math.cos(CENTRE.lat * Math.PI / 180)), CENTRE.lat + north / METRES])
  return { properties, geometry: { type: "MultiPolygon", coordinates: [rings.map(lonLat)] } }
}

describe("TopoBuildings names", () => {
  const zone = (toponyme: string, ...ring: [number, number][]) => polygon({ toponyme }, ring)

  it("gives a building the name of the zone it stands in, and leaves the others as they are", () => {
    const houses = TopoBuildings.buildings([
      polygon({ hauteur: 9 }, [[-10, 8], [10, 8], [10, 16], [-10, 16]]),
      polygon({ hauteur: 6 }, [[40, 0], [50, 0], [50, 10], [40, 10]])
    ], CENTRE, 100)
    const named = TopoBuildings.named(houses, [zone("Mairie de Saint-Lô", [-20, 0], [20, 0], [20, 30], [-20, 30])], CENTRE)
    expect(named.map(building => building.name)).toEqual(["Mairie de Saint-Lô", undefined])
  })

  it("does not name a building by a zone it only touches, nor by one with no name", () => {
    const [house] = TopoBuildings.buildings([polygon({ hauteur: 9 }, [[-10, 8], [10, 8], [10, 16], [-10, 16]])], CENTRE, 100)
    expect(TopoBuildings.named([house], [zone("Square", [30, 0], [40, 0], [40, 10], [30, 10])], CENTRE)[0].name).toBeUndefined()
    expect(TopoBuildings.named([house], [polygon({}, [[-20, 0], [20, 0], [20, 30], [-20, 30]])], CENTRE)[0].name).toBeUndefined()
  })
})

describe("TopoBuildings", () => {
  it("gives a rectangular outline its place, its sides, the way it faces and its height", () => {
    // 20 m wide east-west, 8 m deep, 12 m north of the centre.
    const [house] = TopoBuildings.buildings([polygon({ hauteur: 9.2 }, [[-10, 8], [10, 8], [10, 16], [-10, 16]])], CENTRE, 100)
    expect(house.eastM).toBeCloseTo(0, 0)
    expect(house.northM).toBeCloseTo(12, 0)
    expect(house.widthM).toBeCloseTo(20, 0)
    expect(house.lengthM).toBeCloseTo(8, 0)
    expect(house.heightM).toBe(9.2)
    // The depth runs north-south: it faces north (or south), heading 0 from 0 up to 180.
    expect(house.headingDeg % 180).toBeCloseTo(0, 0)
  })

  it("keeps the outlines apart that a laser would see as one run of roof", () => {
    const found = TopoBuildings.buildings([
      polygon({ hauteur: 6 }, [[-10, 8], [0, 8], [0, 16], [-10, 16]]),
      polygon({ hauteur: 6 }, [[0, 8], [10, 8], [10, 16], [0, 16]])
    ], CENTRE, 100)
    expect(found).toHaveLength(2)
  })

  it("takes an L apart into the rectangles it is made of, and leaves a courtyard empty", () => {
    const ell = TopoBuildings.buildings([polygon({ hauteur: 7 }, [[0, 0], [30, 0], [30, 10], [10, 10], [10, 30], [0, 30]])], CENTRE, 100)
    expect(ell.length).toBeGreaterThanOrEqual(2)
    for (const part of ell) expect(part.widthM * part.lengthM).toBeLessThan(30 * 30 / 2)

    // A 30 m square with a 14 m square courtyard: the middle is not a building.
    const ring = TopoBuildings.buildings([polygon({ hauteur: 7 }, [[0, 0], [30, 0], [30, 30], [0, 30]], [[8, 8], [22, 8], [22, 22], [8, 22]])], CENTRE, 100)
    expect(ring.length).toBeGreaterThanOrEqual(3)
    expect(ring.every(part => !(Math.abs(part.eastM - 15) < 4 && Math.abs(part.northM - 15) < 4 && part.widthM > 8 && part.lengthM > 8))).toBe(true)
  })

  it("gives the floors the map says, and a height from them where it gives no height, and two floors where it says nothing", () => {
    const [stated] = TopoBuildings.buildings([polygon({ nombre_d_etages: 3 }, [[0, 0], [10, 0], [10, 10], [0, 10]])], CENTRE, 100)
    expect(stated.floors).toBe(3)
    expect(stated.heightM).toBe(9)
    const [silent] = TopoBuildings.buildings([polygon({}, [[0, 0], [10, 0], [10, 10], [0, 10]])], CENTRE, 100)
    expect(silent.heightM).toBe(6)
    expect(silent.floors).toBeUndefined()
  })

  it("leaves out what is too small or too far, and counts the nearest first", () => {
    const found = TopoBuildings.buildings([
      polygon({ hauteur: 3 }, [[40, 0], [42, 0], [42, 2], [40, 2]]),
      polygon({ hauteur: 5 }, [[300, 0], [310, 0], [310, 10], [300, 10]]),
      polygon({ hauteur: 5 }, [[60, 0], [70, 0], [70, 10], [60, 10]]),
      polygon({ hauteur: 5 }, [[20, 0], [30, 0], [30, 10], [20, 10]])
    ], CENTRE, 100)
    expect(found.map(building => Math.round(building.eastM))).toEqual([25, 65])
  })
})
