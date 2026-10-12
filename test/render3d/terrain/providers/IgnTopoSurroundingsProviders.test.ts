import { describe, expect, it, vi } from "vitest"
import { IgnLidarTopoSurroundingsProvider } from "../../../../src/render3d/terrain/providers/IgnLidarTopoSurroundingsProvider.js"
import { IgnTopoSurroundingsProvider } from "../../../../src/render3d/terrain/providers/IgnTopoSurroundingsProvider.js"
import { GREEN, GROUND, ROOF, SAINT_LO, Survey, line, outline } from "./IgnSurvey.js"

/** Two houses that touch, as the map outlines them: 8 m by 10 m each, side by side along the east-west line, on the north side of the place. */
const TWO_HOUSES = [
  outline({ hauteur: 7.5, nombre_d_etages: 2 }, [-8, 5], [0, 5], [0, 15], [-8, 5 + 10]),
  outline({ hauteur: 11 }, [0, 5], [8, 5], [8, 15], [0, 15])
]

describe("IgnTopoSurroundingsProvider (the map alone)", () => {
  it("gives each outline of the map its own building, with its height and its floors, and no tree", async () => {
    const survey = new Survey(40)
    survey.vectors = { batiment: TWO_HOUSES }
    const found = await new IgnTopoSurroundingsProvider({ fetchImpl: survey.fetch() }).getSurroundings(SAINT_LO, 40)
    expect(found.trees).toEqual([])
    expect(found.buildings).toHaveLength(2)
    const [west, east] = [...found.buildings].sort((a, b) => a.eastM - b.eastM)
    expect(west.heightM).toBe(7.5)
    expect(west.floors).toBe(2)
    expect(east.heightM).toBe(11)
    expect(east.floors).toBeUndefined()
    expect(east.eastM).toBeGreaterThan(west.eastM)
    expect(Math.hypot(east.widthM - 10, east.lengthM - 8)).toBeLessThan(1.5)
  })

  it("asks the map only: no laser raster is asked for", async () => {
    const fetchImpl = new Survey(40).fetch()
    await new IgnTopoSurroundingsProvider({ fetchImpl }).getSurroundings(SAINT_LO, 40)
    const asked = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls.map(call => new URL(String(call[0])).searchParams.get("SERVICE"))
    expect(new Set(asked)).toEqual(new Set(["WFS"]))
    const layers = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls.map(call => new URL(String(call[0])).searchParams.get("TYPENAMES")).sort()
    expect(layers).toEqual(["BDTOPO_V3:batiment", "BDTOPO_V3:construction_lineaire", "BDTOPO_V3:ligne_electrique", "BDTOPO_V3:troncon_de_route", "BDTOPO_V3:zone_d_activite_ou_d_interet"])
  })

  it("draws bridges and lines at their ordinary heights where no laser measured them", async () => {
    const survey = new Survey(40)
    survey.vectors = {
      construction_lineaire: [line({ nature: "Pont" }, [-20, 0], [20, 0])],
      ligne_electrique: [line({ voltage: "90 kV" }, [-30, 10], [30, 10])]
    }
    const found = await new IgnTopoSurroundingsProvider({ fetchImpl: survey.fetch() }).getSurroundings(SAINT_LO, 40)
    expect(found.bridges[0].heightM).toBe(4)
    expect(found.lines[0].poleHeightM).toBe(22)
  })

  it("fails as unreachable when the map does", async () => {
    const survey = new Survey(40)
    survey.mapDown = true
    await expect(new IgnTopoSurroundingsProvider({ fetchImpl: survey.fetch() }).getSurroundings(SAINT_LO, 40)).rejects.toMatchObject({ reason: "unreachable" })
  })
})

describe("IgnLidarTopoSurroundingsProvider (both)", () => {
  it("takes the trees from the laser, the buildings from the map, and says which it is", async () => {
    // A tree 8 m east of the middle in the laser, and a roof 8 m west that the laser sees but the map draws its own way.
    const survey = new Survey(100).block(66, 46, 8, 12, GREEN).block(18, 40, 16, 12, ROOF)
    survey.vectors = { batiment: TWO_HOUSES }
    const provider = new IgnLidarTopoSurroundingsProvider({ fetchImpl: survey.fetch() })
    expect(provider.name).toBe("IGN LiDAR HD + BD TOPO")
    const found = await provider.getSurroundings(SAINT_LO, 25)
    expect(found.trees).toHaveLength(1)
    // The map's two houses, not the laser's one roof.
    expect(found.buildings).toHaveLength(2)
    expect(found.buildings.every(building => building.northM > 0)).toBe(true)
  })

  it("falls back on the laser's roofs where the map has drawn no building", async () => {
    const survey = new Survey(100).block(18, 40, 16, 12, ROOF)
    const found = await new IgnLidarTopoSurroundingsProvider({ fetchImpl: survey.fetch() }).getSurroundings(SAINT_LO, 25)
    expect(found.buildings).toHaveLength(1)
    expect(found.buildings[0].heightM).toBeCloseTo(12, 0)
  })

  it("measures the deck of a bridge and the pole of a line with the laser, over the ordinary", async () => {
    const survey = new Survey(100).block(30, 48, 40, 6, [240, 240, 0, 255]).block(89, 49, 2, 19, GROUND)
    survey.vectors = {
      construction_lineaire: [line({ nature: "Pont" }, [-20, 0], [20, 0])],
      ligne_electrique: [line({ voltage: "63 kV" }, [-20, 12], [20, 12])]
    }
    const found = await new IgnLidarTopoSurroundingsProvider({ fetchImpl: survey.fetch() }).getSurroundings(SAINT_LO, 25)
    expect(found.bridges[0].heightM).toBeCloseTo(6, 0)
    expect(found.lines[0].poleHeightM).toBeCloseTo(20, 0)
  })

  it("still gives the trees when the map is down, and the map's things when the laser is", async () => {
    const mapDown = new Survey(100).block(66, 46, 8, 12, GREEN)
    mapDown.mapDown = true
    const withoutMap = await new IgnLidarTopoSurroundingsProvider({ fetchImpl: mapDown.fetch() }).getSurroundings(SAINT_LO, 25)
    expect(withoutMap.trees).toHaveLength(1)
    expect(withoutMap.bridges).toEqual([])

    const laserDown = new Survey(100, -9999)
    laserDown.vectors = { batiment: TWO_HOUSES, ligne_electrique: [line({ voltage: "90 kV" }, [-30, 10], [30, 10])] }
    const withoutLaser = await new IgnLidarTopoSurroundingsProvider({ fetchImpl: laserDown.fetch() }).getSurroundings(SAINT_LO, 25)
    expect(withoutLaser.trees).toEqual([])
    expect(withoutLaser.buildings).toHaveLength(2)
    expect(withoutLaser.lines).toHaveLength(1)
  })

  it("fails only when both do", async () => {
    const both = new Survey(100, -9999)
    both.mapDown = true
    await expect(new IgnLidarTopoSurroundingsProvider({ fetchImpl: both.fetch() }).getSurroundings(SAINT_LO, 25)).rejects.toMatchObject({ reason: "no-coverage" })
  })
})
