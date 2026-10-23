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
 *
 * What kind of building it is (see BuildingStyles) opens the walls: a church has tall narrow bays and no door of a house, a monument and a shed none, an old building
 * and a tall one that states no floors have tall windows on high storeys. Their walls are of stone where the registry says nothing of them (a church, a
 * fort, a house of before 1900 in France is built of it), and the roof of an old building is a zinc or a slate grey where nothing measured its colour.
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
  /** An old building's roof that no photograph coloured: the zinc of a Paris roof, the slate of the others, which look alike from the street. */
  private static readonly OLD_ROOF = "#7d858c"
  /** The storey of an old building that does not state its floors, and of a tall one that does not either. */
  private static readonly OLD_STOREY_M = 3.6
  private static readonly GRAND_STOREY_M = 4.5
  /** The storeys the floors a map states may make: less is a count that is not of floors, more a hall. */
  private static readonly MIN_STOREY_M = 2.4
  private static readonly MAX_STOREY_M = 6

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

  /**
   * Each building with its facade: the colour of its walls' material, or a plaster (a stone for what is built of it), a little different from one place
   * to the next, and the openings of its kind.
   */
  static fit(buildings: SurveyedBuilding[]): SurveyedBuilding[] {
    return buildings.map(building => {
      const style = building.style
      // A colour a survey already gave (somebody wrote it down) is not repainted from a typical one: the openings are still those of its kind.
      const facade: DecorFacade = { ...building.facade, color: building.facade?.color ?? BuildingMaterials.wallColor(building) }
      if (style === "church") facade.openings = "lancet"
      else if (style === "monument" || style === "works") facade.plain = true
      else if (style === "old" || style === "grand") facade.openings = "tall"
      if (building.closedAtNight && !facade.plain) facade.closedAtNight = true
      const storeyM = BuildingMaterials.storeyOf(building)
      if (storeyM !== undefined && style !== "church" && style !== "monument") facade.storeyM = storeyM
      const roof = style === "old" && building.roof?.color === undefined ? { shape: "flat" as const, riseM: 0, ...building.roof, color: BuildingMaterials.OLD_ROOF } : building.roof
      return { ...building, facade, ...(roof ? { roof } : {}) }
    })
  }

  /** The height of a storey: what the floors the survey states make of the walls, else that of its kind, else none (three metres). */
  private static storeyOf(building: SurveyedBuilding): number | undefined {
    const walls = building.heightM - (building.roof?.riseM ?? 0)
    if (building.floors && building.floors > 0) {
      const storey = walls / building.floors
      if (storey >= BuildingMaterials.MIN_STOREY_M && storey <= BuildingMaterials.MAX_STOREY_M) return Math.round(storey * 100) / 100
    }
    return building.style === "old" ? BuildingMaterials.OLD_STOREY_M : building.style === "grand" ? BuildingMaterials.GRAND_STOREY_M : undefined
  }

  private static wallColor(building: SurveyedBuilding): string {
    const built = building.style === "church" || building.style === "monument" || building.style === "old"
    const base = building.wallMaterial ? BuildingMaterials.WALL_COLOURS[building.wallMaterial] : built ? BuildingMaterials.WALL_COLOURS.stone : BuildingMaterials.PLASTER
    // From where it stands, in tenths of a metre: stable, and different for neighbours.
    const seed = Math.sin(building.eastM * 12.9898 + building.northM * 78.233) * 43758.5453
    const shade = 1 + (seed - Math.floor(seed) - 0.5) * 2 * BuildingMaterials.VARIATION
    const channel = (at: number): string => Math.max(0, Math.min(255, Math.round(parseInt(base.slice(at, at + 2), 16) * shade))).toString(16).padStart(2, "0")
    return `#${channel(1)}${channel(3)}${channel(5)}`
  }
}
