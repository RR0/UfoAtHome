import { describe, expect, it } from "vitest"
import { BuildingMaterials } from "../../../src/render3d/terrain/BuildingMaterials.js"
import { RoofShapes } from "../../../src/render3d/terrain/RoofShapes.js"
import type { SurveyedBuilding } from "../../../src/render3d/terrain/SurroundingsProvider.js"

const HOUSE: SurveyedBuilding = { eastM: 12, northM: -7, widthM: 12, lengthM: 8, heightM: 8, headingDeg: 0 }

describe("BuildingMaterials", () => {
  it("reads the main material of a wall from the registry's code: the units digit, else the tens digit", () => {
    expect(BuildingMaterials.of("01", "wall")).toBe("stone")
    expect(BuildingMaterials.of("34", "wall")).toBe("brick")
    expect(BuildingMaterials.of("45", "wall")).toBe("block")
    expect(BuildingMaterials.of("50", "wall")).toBe("block")
    expect(BuildingMaterials.of("20", "wall")).toBe("meuliere")
    expect(BuildingMaterials.of("15", "wall")).toBe("block")
    expect(BuildingMaterials.of("3", "wall")).toBe("concrete")
  })

  it("reads a roof's the same way, with its own table: 20 and 12 are slate, 10 tile", () => {
    expect(BuildingMaterials.of("20", "roof")).toBe("slate")
    expect(BuildingMaterials.of("12", "roof")).toBe("slate")
    expect(BuildingMaterials.of("10", "roof")).toBe("tile")
    expect(BuildingMaterials.of("03", "roof")).toBe("zinc")
  })

  it("says nothing of a code that names nothing: unknown, empty, absent, or not a code", () => {
    for (const code of ["00", "", undefined, null, "TL", "abc", 0, "123"]) expect(BuildingMaterials.of(code, "wall")).toBeUndefined()
  })

  it("gives a wall the colour of its material, and a plaster to one that has none, each a little different from its neighbour's", () => {
    const [brick] = BuildingMaterials.fit([{ ...HOUSE, wallMaterial: "brick" }])
    const [plain] = BuildingMaterials.fit([HOUSE])
    const [next] = BuildingMaterials.fit([{ ...HOUSE, eastM: 30 }])
    const red = (hex: string): number => parseInt(hex.slice(1, 3), 16)
    const blue = (hex: string): number => parseInt(hex.slice(5, 7), 16)
    expect(red(brick.facade!.color!)).toBeGreaterThan(blue(brick.facade!.color!) + 40)
    expect(Math.abs(red(plain.facade!.color!) - blue(plain.facade!.color!))).toBeLessThan(40)
    expect(next.facade!.color!).not.toBe(plain.facade!.color!)
    expect(BuildingMaterials.fit([HOUSE])[0].facade).toEqual(plain.facade)
  })

  it("draws the walls of works with no windows, and a house's with them", () => {
    expect(BuildingMaterials.fit([{ ...HOUSE, style: "works" }])[0].facade!.plain).toBe(true)
    expect(BuildingMaterials.fit([HOUSE])[0].facade!.plain).toBeUndefined()
  })

  it("colours a roof by its material where there is no photograph, and the photograph's colour wins where there is one", () => {
    const [slate] = RoofShapes.fit([{ ...HOUSE, roofMaterial: "slate" }], undefined, undefined)
    expect(slate.roof).toEqual({ shape: "flat", riseM: 0, color: "#4a5059" })
    expect(RoofShapes.fit([HOUSE], undefined, undefined)[0].roof).toBeUndefined()
  })
})
