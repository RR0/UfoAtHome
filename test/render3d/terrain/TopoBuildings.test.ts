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

  it("keeps an outline whole as soon as any of it is within reach, however far the middle of its rectangle", () => {
    // A nave 110 m long whose west end is 90 m away: its middle is 145 m away, and it is there at a radius of 100 m all the same.
    const [nave] = TopoBuildings.buildings([polygon({ hauteur: 34.9 }, [[90, -6], [200, -6], [200, 6], [90, 6]])], CENTRE, 100)
    expect(nave.widthM).toBeCloseTo(110, 0)
    expect(TopoBuildings.buildings([polygon({ hauteur: 34.9 }, [[110, -6], [200, -6], [200, 6], [110, 6]])], CENTRE, 100)).toHaveLength(0)
  })

  it("brings every outline of a named zone one of them reaches: a cathedral comes whole, its far tower with its near one", () => {
    const cathedral = polygon({ toponyme: "Cathédrale Notre-Dame" }, [[80, -40], [240, -40], [240, 40], [80, 40]])
    const near = polygon({ hauteur: 66 }, [[95, -30], [111, -30], [111, -16], [95, -16]])
    // Its corner on the zone's own line, as the map draws them.
    const far = polygon({ hauteur: 66 }, [[110, 20], [126, 20], [126, 40], [110, 40]])
    const elsewhere = polygon({ hauteur: 10 }, [[110, 60], [120, 60], [120, 70], [110, 70]])
    const found = TopoBuildings.buildings([near, far, elsewhere], CENTRE, 100, 12, 300, [cathedral])
    expect(found.map(building => Math.round(building.northM)).sort((a, b) => a - b)).toEqual([-23, 30])
    expect(TopoBuildings.buildings([near, far], CENTRE, 100)).toHaveLength(1)
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

  it("cuts an L whose arms are turned off the axes into its two arms, square to their own sides, and not into strips", () => {
    // Two arms 8 m deep, one 40 m long and one 55 m long, turned 12 degrees off east-west and north-south.
    const turn = (east: number, north: number): [number, number] => {
      const a = 12 * Math.PI / 180
      return [east * Math.cos(a) - north * Math.sin(a), east * Math.sin(a) + north * Math.cos(a)]
    }
    const outline = [[0, 0], [40, 0], [40, 8], [8, 8], [8, 55], [0, 55]].map(([east, north]) => turn(east, north))
    const parts = TopoBuildings.buildings([polygon({ hauteur: 7 }, outline)], CENTRE, 200)
    expect(parts.length).toBeLessThanOrEqual(3)
    const longest = [...parts].sort((a, b) => b.widthM - a.widthM)
    expect(longest[0].widthM).toBeGreaterThan(50)
    expect(Math.abs(longest[0].lengthM - 8)).toBeLessThan(1.5)
    expect(longest[1].widthM).toBeGreaterThan(30)
    // The depth of an arm runs across it, whichever way it is turned: the two arms face a quarter turn apart.
    expect(Math.abs(((longest[0].headingDeg - longest[1].headingDeg + 180) % 180) - 90)).toBeLessThan(6)
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

  it("keeps, over the most it is asked for, what shows most from the place, and not what is nearest: a silo on the horizon over a house at its door", () => {
    const houses = [0, 1, 2, 3, 4].map(i => polygon({ hauteur: 6 }, [[400 + i * 20, 0], [408 + i * 20, 0], [408 + i * 20, 8], [400 + i * 20, 8]]))
    // Thirty metres across and twenty-seven high, a kilometre off: bigger in the sky than any of the houses at four hundred.
    const silo = polygon({ hauteur: 27 }, [[1000, 0], [1030, 0], [1030, 30], [1000, 30]])
    const found = TopoBuildings.buildings([...houses, silo], CENTRE, 2000, 12, 3)
    expect(found).toHaveLength(3)
    expect(found.some(building => building.heightM === 27)).toBe(true)
    // And they come nearest first all the same.
    const distances = found.map(building => Math.hypot(building.eastM, building.northM))
    expect(distances).toEqual([...distances].sort((a, b) => a - b))
  })

  it("names a silo as the map says it, and leaves the other buildings with no name of their own", () => {
    const [silo, shed] = TopoBuildings.buildings([
      polygon({ hauteur: 27, nature: "Silo" }, [[40, 0], [60, 0], [60, 20], [40, 20]]),
      polygon({ hauteur: 5, nature: "Industriel, agricole ou commercial" }, [[10, 0], [20, 0], [20, 10], [10, 10]])
    ], CENTRE, 100).sort((a, b) => b.heightM - a.heightM)
    expect(silo.name).toBe("Silo")
    expect(shed.name).toBeUndefined()
  })

  it("keeps everything while there are no more than it is asked for, the nearest first", () => {
    const found = TopoBuildings.buildings([
      polygon({ hauteur: 6 }, [[500, 0], [510, 0], [510, 10], [500, 10]]),
      polygon({ hauteur: 6 }, [[100, 0], [110, 0], [110, 10], [100, 10]])
    ], CENTRE, 2000, 12, 300)
    expect(found.map(building => Math.round(building.eastM))).toEqual([105, 505])
  })

  it("reads the materials of the walls and of the roof from the map's codes, and says nothing where it states none", () => {
    const [stated, bare] = TopoBuildings.buildings([
      polygon({ hauteur: 7, materiaux_des_murs: "34", materiaux_de_la_toiture: "20" }, [[-8, 5], [0, 5], [0, 15], [-8, 15]]),
      polygon({ hauteur: 7, materiaux_des_murs: "00", materiaux_de_la_toiture: "" }, [[10, 5], [18, 5], [18, 15], [10, 15]])
    ], CENTRE, 100).sort((a, b) => a.eastM - b.eastM)
    expect(stated).toMatchObject({ wallMaterial: "brick", roofMaterial: "slate" })
    expect(bare.wallMaterial).toBeUndefined()
    expect(bare.roofMaterial).toBeUndefined()
  })
})
