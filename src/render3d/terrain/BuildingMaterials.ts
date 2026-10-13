import type { DecorFacade } from "../../engine/model/Decor.js"
import type { BuildingMaterial, SurveyedBuilding } from "./SurroundingsProvider.js"

/**
 * What the walls and the roofs of buildings are made of, as the map says it, and how that looks.
 *
 * The map (BD TOPO) takes its materials from the land registry's building files (the "fichiers fonciers", variables dmatgm and dmatto), in
 * two-digit codes: the units digit is the main material and the tens digit a second one, 0 meaning none. So 34 is brick (with concrete) and 50 is
 * breeze block, 20 on a roof slate, 12 slate again (with tile). Walls: 1 stone, 2 meulière (a millstone-grit stone of the Paris basin), 3 concrete,
 * 4 brick, 5 breeze block, 6 wood, 9 other. Roofs: 1 tile, 2 slate, 3 zinc or aluminium, 4 concrete, 9 other. 0, or nothing, is not known: the map fills
 * these for about three buildings in five.
 *
 * The colours are what such a surface looks like lit by the day, as an albedo: they are the colour of the wall and not of the photograph of it,
 * so the sun and the sky of the scene light it once. A wall whose material is not known is a plaster of a pale, warm grey, which most of them are, and
 * is varied a little from one building to the next (by where it stands, so that the same place always looks the same) because a street of walls of
 * exactly one colour is not a street.
 */
export class BuildingMaterials {
  private static readonly WALLS: Record<string, BuildingMaterial> = { 1: "stone", 2: "meuliere", 3: "concrete", 4: "brick", 5: "block", 6: "wood", 9: "other" }
  private static readonly ROOFS: Record<string, BuildingMaterial> = { 1: "tile", 2: "slate", 3: "zinc", 4: "concrete", 9: "other" }

  private static readonly WALL_COLOURS: Record<string, string> = {
    stone: "#b9ae9b", meuliere: "#b8a78a", concrete: "#b4b2ac", brick: "#a65f48", block: "#d0c6b2", wood: "#7d5c3e", other: "#c9c0ae"
  }
  /** A plastered wall, which is what a wall nobody said anything of is. */
  private static readonly PLASTER = "#d3cab8"
  private static readonly ROOF_COLOURS: Record<string, string> = {
    tile: "#a0583f", slate: "#4a5059", zinc: "#8d969c", concrete: "#8f8e8a", other: "#7a7872"
  }
  /** How far a building's colour may be pushed lighter or darker from the typical, as a part of it. */
  private static readonly VARIATION = 0.12

  /** The main material a code of the registry names, or none where it names none. */
  static of(code: unknown, table: "wall" | "roof"): BuildingMaterial | undefined {
    const digits = String(code ?? "").trim()
    if (!/^\d{1,2}$/.test(digits)) return undefined
    const value = Number(digits)
    const main = value % 10 !== 0 ? value % 10 : Math.floor(value / 10)
    return (table === "wall" ? BuildingMaterials.WALLS : BuildingMaterials.ROOFS)[String(main)]
  }

  /** The colour of a roof of this material, "#rrggbb": undefined where the material is not known. */
  static roofColor(material: BuildingMaterial | undefined): string | undefined {
    return material ? BuildingMaterials.ROOF_COLOURS[material] : undefined
  }

  /** Each building with its facade: the colour of its walls' material, or a plaster, a little different from one place to the next. */
  static fit(buildings: SurveyedBuilding[]): SurveyedBuilding[] {
    return buildings.map(building => {
      const facade: DecorFacade = { color: BuildingMaterials.wallColor(building) }
      return { ...building, facade }
    })
  }

  private static wallColor(building: SurveyedBuilding): string {
    const base = building.wallMaterial ? BuildingMaterials.WALL_COLOURS[building.wallMaterial] : BuildingMaterials.PLASTER
    // From where it stands, in tenths of a metre: stable, and different for neighbours.
    const seed = Math.sin(building.eastM * 12.9898 + building.northM * 78.233) * 43758.5453
    const shade = 1 + (seed - Math.floor(seed) - 0.5) * 2 * BuildingMaterials.VARIATION
    const channel = (at: number): string => Math.max(0, Math.min(255, Math.round(parseInt(base.slice(at, at + 2), 16) * shade))).toString(16).padStart(2, "0")
    return `#${channel(1)}${channel(3)}${channel(5)}`
  }
}
