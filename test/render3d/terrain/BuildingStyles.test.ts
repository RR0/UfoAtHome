import { describe, expect, it } from "vitest"
import { BuildingMaterials } from "../../../src/render3d/terrain/BuildingMaterials.js"
import { BuildingStyles } from "../../../src/render3d/terrain/BuildingStyles.js"
import { TopoBuildings } from "../../../src/render3d/terrain/TopoBuildings.js"
import { SurveyedDecor } from "../../../src/render3d/terrain/SurveyedDecor.js"
import type { VectorFeature } from "../../../src/render3d/terrain/OverheadStructures.js"
import type { SurveyedBuilding } from "../../../src/render3d/terrain/SurroundingsProvider.js"

const CENTRE = { lat: 48.853, lng: 2.349 }

/** A rectangle of the map, `east` and `north` metres from the centre, with what BD TOPO says of it. */
const feature = (east: number, north: number, width: number, depth: number, properties: Record<string, unknown>): VectorFeature => {
  const cos = Math.cos(CENTRE.lat * Math.PI / 180)
  const lng = (e: number): number => CENTRE.lng + e / (111320 * cos)
  const lat = (n: number): number => CENTRE.lat + n / 111320
  const ring = [[east, north], [east + width, north], [east + width, north + depth], [east, north + depth], [east, north]].map(([e, n]) => [lng(e), lat(n)])
  return { geometry: { type: "Polygon", coordinates: [ring] }, properties }
}

/** What BD TOPO says of Notre-Dame de Paris and of the Hôtel-Dieu beside it, as its WFS answered on 2026-10-18 (rounded). */
const NOTRE_DAME_TOWER = { nature: "Eglise", usage_1: "Religieux", hauteur: 66, nombre_d_etages: null, date_d_apparition: null }
const NOTRE_DAME_NAVE = { nature: "Eglise", usage_1: "Religieux", hauteur: 34.9, nombre_d_etages: null, date_d_apparition: null }
const HOTEL_DIEU = { nature: "Indifférenciée", usage_1: "Commercial et services", hauteur: 23.4, nombre_d_etages: null, date_d_apparition: null }
const HOUSE_OF_1800 = { nature: "Indifférenciée", usage_1: "Résidentiel", hauteur: 17.2, nombre_d_etages: 7, materiaux_des_murs: "20", materiaux_de_la_toiture: "30", date_d_apparition: "1800-01-01Z" }
const BLOCK_OF_1969 = { nature: "Indifférenciée", usage_1: "Résidentiel", hauteur: 15.7, nombre_d_etages: 3, date_d_apparition: "1969-01-01Z" }

describe("BuildingStyles", () => {
  it("reads a church, a monument, a castle from the map's nature, and a church from its use", () => {
    expect(BuildingStyles.ofMap(NOTRE_DAME_TOWER).style).toBe("church")
    expect(BuildingStyles.ofMap({ nature: "Chapelle", hauteur: 23 }).style).toBe("church")
    expect(BuildingStyles.ofMap({ nature: "Indifférenciée", usage_1: "Religieux", hauteur: 9 }).style).toBe("church")
    expect(BuildingStyles.ofMap({ nature: "Tour, donjon", hauteur: 23 }).style).toBe("monument")
    expect(BuildingStyles.ofMap({ nature: "Monument", hauteur: 5 }).style).toBe("monument")
    expect(BuildingStyles.ofMap({ nature: "Château", hauteur: 18 }).style).toBe("old")
  })

  it("reads works from the map's use or nature and from OSM's building, and a home or an office as ordinary", () => {
    // The business park along the RN2 at Silly-le-Long: the map's sheds, said by their use, or by their nature where the use is not given.
    expect(BuildingStyles.ofMap({ nature: "Industriel, agricole ou commercial", usage_1: "Industriel", hauteur: 9 }).style).toBe("works")
    expect(BuildingStyles.ofMap({ nature: "Industriel, agricole ou commercial", usage_1: "Indifférencié", hauteur: 7 }).style).toBe("works")
    expect(BuildingStyles.ofMap({ nature: "Indifférenciée", usage_1: "Agricole", hauteur: 6 }).style).toBe("works")
    expect(BuildingStyles.ofMap({ nature: "Indifférenciée", usage_1: "Annexe", hauteur: 3 }).style).toBe("works")
    expect(BuildingStyles.ofMap({ nature: "Indifférenciée", usage_1: "Résidentiel", hauteur: 7 }).style).toBeUndefined()
    expect(BuildingStyles.ofOsm({ building: "warehouse" }).style).toBe("works")
    expect(BuildingStyles.ofOsm({ building: "house" }).style).toBeUndefined()
  })

  it("says a building of before 1900 is old, with its year, and one of after is ordinary", () => {
    expect(BuildingStyles.ofMap(HOUSE_OF_1800)).toEqual({ style: "old", builtYear: 1800 })
    expect(BuildingStyles.ofMap(BLOCK_OF_1969)).toEqual({ builtYear: 1969 })
  })

  it("does not give a house's storeys to a tall building that says neither its floors, nor its year, nor that people live in it", () => {
    expect(BuildingStyles.ofMap(HOTEL_DIEU).style).toBe("grand")
    // Lower, it is a house; higher, a tower of offices; with its floors or people living in it, it says what it is.
    expect(BuildingStyles.ofMap({ ...HOTEL_DIEU, hauteur: 9 }).style).toBeUndefined()
    expect(BuildingStyles.ofMap({ ...HOTEL_DIEU, hauteur: 80 }).style).toBeUndefined()
    expect(BuildingStyles.ofMap({ ...HOTEL_DIEU, nombre_d_etages: 6 }).style).toBeUndefined()
    expect(BuildingStyles.ofMap({ ...HOTEL_DIEU, usage_1: "Résidentiel" }).style).toBeUndefined()
  })

  it("reads what an OpenStreetMap volunteer wrote", () => {
    expect(BuildingStyles.ofOsm({ building: "cathedral" }).style).toBe("church")
    expect(BuildingStyles.ofOsm({ building: "yes", amenity: "place_of_worship" }).style).toBe("church")
    expect(BuildingStyles.ofOsm({ building: "yes", historic: "castle" }).style).toBe("old")
    expect(BuildingStyles.ofOsm({ building: "yes", historic: "building" }).style).toBe("old")
    expect(BuildingStyles.ofOsm({ building: "yes", start_date: "1872" })).toEqual({ style: "old", builtYear: 1872 })
    expect(BuildingStyles.ofOsm({ building: "apartments", start_date: "1972" })).toEqual({ builtYear: 1972 })
    expect(BuildingStyles.ofOsm({ building: "yes" })).toEqual({})
  })

  it("draws Notre-Dame as a church: stone without a house's windows, a pitched nave, flat towers, no floors", () => {
    const outlines = [feature(-1, 0, 22, 24, NOTRE_DAME_TOWER), feature(20, 0, 90, 14, NOTRE_DAME_NAVE)]
    const buildings = BuildingMaterials.fit(BuildingStyles.fit(TopoBuildings.buildings(outlines, CENTRE, 500)))
    const tower = buildings.find(building => building.heightM > 60)!
    const nave = buildings.find(building => building.widthM > 80)!
    for (const part of [tower, nave]) {
      expect(part.style).toBe("church")
      expect(part.facade!.openings).toBe("lancet")
      expect(part.facade!.storeyM).toBeUndefined()
    }
    expect(tower.roof?.shape ?? "flat").toBe("flat")
    expect(tower.heightM).toBe(66)
    // The map's height is to the gutter: the roof is on top of it, steep, and no higher than a third of the walls.
    expect(nave.roof!.shape).toBe("gable")
    expect(nave.roof!.riseM).toBeGreaterThan(6)
    expect(nave.roof!.riseM).toBeLessThanOrEqual(0.35 * 34.9 + 0.05)
    expect(nave.heightM).toBeCloseTo(34.9 + nave.roof!.riseM!, 1)
    // Stone where the registry says nothing of the walls: a warm grey, not the pale plaster of a house.
    const red = parseInt(nave.facade!.color!.slice(1, 3), 16)
    expect(red).toBeLessThan(0xd3 * 0.95)
    const { planted } = SurveyedDecor.of("ign-lidar-topo", { trees: [], buildings, bridges: [], lines: [] }, { kept: [], kindName: () => "Building" })
    expect(planted.every(object => object.floors === undefined)).toBe(true)
  })

  it("keeps a roof the laser measured on a church's nave, and flattens the one it saw on a tower", () => {
    const nave: SurveyedBuilding = { eastM: 0, northM: 0, widthM: 60, lengthM: 12, heightM: 43, headingDeg: 0, style: "church", roof: { shape: "gable", riseM: 9, color: "#606870" } }
    expect(BuildingStyles.fit([nave])[0]).toEqual(nave)
    const tower: SurveyedBuilding = { eastM: 0, northM: 0, widthM: 16, lengthM: 14, heightM: 68, headingDeg: 0, style: "church", roof: { shape: "gable", riseM: 3.4 } }
    const [flat] = BuildingStyles.fit([tower])
    expect(flat.roof!.shape).toBe("flat")
    expect(flat.heightM).toBe(68)
  })

  it("gives an old building tall windows on the storeys its floors make, and a zinc roof where nothing coloured it", () => {
    const [house] = BuildingMaterials.fit(BuildingStyles.fit(TopoBuildings.buildings([feature(10, 10, 15, 12, HOUSE_OF_1800)], CENTRE, 500)))
    expect(house.facade!.openings).toBe("tall")
    expect(house.facade!.storeyM).toBeCloseTo(17.2 / 7, 2)
    expect(house.roof!.color).toBe("#7d858c")
    const [hospital] = BuildingMaterials.fit(BuildingStyles.fit(TopoBuildings.buildings([feature(10, 10, 40, 12, HOTEL_DIEU)], CENTRE, 500)))
    expect(hospital.facade!.openings).toBe("tall")
    // Five storeys of four and a half metres, and not eight of three.
    expect(Math.round(23.4 / hospital.facade!.storeyM!)).toBe(5)
    const [block] = BuildingMaterials.fit(BuildingStyles.fit(TopoBuildings.buildings([feature(10, 10, 15, 12, BLOCK_OF_1969)], CENTRE, 500)))
    expect(block.facade!.openings).toBeUndefined()
  })

  it("reads the year of the dates surveys write, and nothing of what is not one", () => {
    expect(BuildingStyles.year("1800-01-01Z")).toBe(1800)
    expect(BuildingStyles.year("c. 1650")).toBe(1650)
    for (const value of [undefined, null, "", "recent", "12"]) expect(BuildingStyles.year(value)).toBeUndefined()
  })
})
