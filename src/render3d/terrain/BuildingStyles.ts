import type { DecorRoof } from "../../engine/model/Decor.js"
import type { BuildingStyle, SurveyedBuilding } from "./SurroundingsProvider.js"

/**
 * What kind of building a survey says a building is, as far as it shows from the street: a church is not a block of flats, and a house of 1800 is not
 * one of 1970.
 *
 * Read from what the survey states and nothing else:
 *
 * - the map's nature of the building (BD TOPO "Eglise", "Chapelle", "Monument", "Tour, donjon", "Château"…) and its use ("Religieux"), or what an
 *   OpenStreetMap volunteer wrote (`building=church`, `historic=castle`);
 * - the year it was built, where it is stated (BD TOPO `date_d_apparition`, from the land registry; OSM `start_date`): before 1900, an old building;
 * - a building over fifteen metres that states neither its floors nor its year nor that people live in it (a hospital, a ministry, a school of the
 *   nineteenth century): its storeys are not those of a house, and drawing one window every three metres up it makes a tower of flats of it.
 *
 * Each style draws its walls (see BuildingMaterials.fit) and, for a church, its roof (see fit): a church whose roof nobody measured has the pitched roof
 * every church has, on top of the walls the map gives the height of (BD TOPO's `hauteur` is to the gutter). A tower stays flat at the top: the laser's
 * gable on a bell tower is its parapet.
 */
export class BuildingStyles {
  /** The natures of the map that are a church, and those that are a monument (walls of stone and few openings, or none). */
  private static readonly MAP_NATURES: Readonly<Record<string, BuildingStyle>> = {
    "Eglise": "church", "Chapelle": "church",
    "Monument": "monument", "Tour, donjon": "monument", "Fort, blockhaus, casemate": "monument", "Arc de triomphe": "monument", "Arène ou théâtre antique": "monument",
    // A château has windows, many and tall: it is an old building, which its date often does not say.
    "Château": "old"
  }
  /** What OSM's `building` says of a building, where it says what it is. */
  private static readonly OSM_BUILDINGS: Readonly<Record<string, BuildingStyle>> = {
    cathedral: "church", church: "church", chapel: "church", basilica: "church", temple: "church", mosque: "church", synagogue: "church", shrine: "church", religious: "church",
    castle: "old", palace: "old", fortress: "monument", bunker: "monument", triumphal_arch: "monument"
  }
  /** What OSM's `historic` says, where it is a building: the rest of `historic=*` is an old building. */
  private static readonly OSM_HISTORIC: Readonly<Record<string, BuildingStyle>> = {
    church: "church", chapel: "church", monastery: "old", castle: "old", manor: "old", fort: "monument", tower: "monument", monument: "monument", memorial: "monument", city_gate: "monument"
  }
  /** Built before this, a building is an old one: stone, tall windows, storeys of three and a half metres and more. */
  static readonly OLD_BEFORE = 1900
  /** The height from which a building that says nothing else of itself is not drawn with a house's storeys, and up to which it is not a modern tower. */
  private static readonly GRAND_FROM_M = 15
  private static readonly GRAND_UP_TO_M = 40
  /** A church's part this much taller than it is wide is a tower: flat at the top. */
  private static readonly TOWER_SLENDERNESS = 2
  /** A church's roof: about fifty-five degrees over its width (a rise of 0.7 of it), no higher than this part of its walls (an aisle's is low). */
  private static readonly CHURCH_PITCH = 0.7
  private static readonly CHURCH_ROOF_OF_WALLS = 0.35
  private static readonly CHURCH_ROOF_COLOUR = "#5a6068"

  /** What the map (BD TOPO) says a building is, from its properties: its style where it says one, and its year where it states it. */
  static ofMap(properties: Record<string, unknown>): { style?: BuildingStyle, builtYear?: number } {
    const builtYear = BuildingStyles.year(properties.date_d_apparition)
    const stated = BuildingStyles.MAP_NATURES[String(properties.nature ?? "")] ?? (properties.usage_1 === "Religieux" ? "church" : undefined)
    const style = stated ?? BuildingStyles.ofYear(builtYear) ?? BuildingStyles.grand(properties)
    return { ...(style ? { style } : {}), ...(builtYear !== undefined ? { builtYear } : {}) }
  }

  /** What an OSM volunteer says a building is, from its tags. */
  static ofOsm(tags: Record<string, string>): { style?: BuildingStyle, builtYear?: number } {
    const builtYear = BuildingStyles.year(tags.start_date)
    const historic = tags.historic && tags.historic !== "no" ? BuildingStyles.OSM_HISTORIC[tags.historic] ?? "old" : undefined
    const worship = tags.amenity === "place_of_worship" ? "church" : undefined
    const style = BuildingStyles.OSM_BUILDINGS[tags.building ?? ""] ?? historic ?? worship ?? BuildingStyles.ofYear(builtYear)
    return { ...(style ? { style } : {}), ...(builtYear !== undefined ? { builtYear } : {}) }
  }

  /** The year a date the survey writes starts with ("1800-01-01Z", "1872", "c. 1650"): undefined where there is none. */
  static year(value: unknown): number | undefined {
    const year = Number(/\b(\d{4})\b/.exec(String(value ?? ""))?.[1])
    return Number.isFinite(year) && year >= 1000 && year <= 2100 ? year : undefined
  }

  /** A church's roof where nobody measured one, and a tower flat at the top: the other buildings as they are. */
  static fit(buildings: SurveyedBuilding[]): SurveyedBuilding[] {
    return buildings.map(building => building.style === "church" ? BuildingStyles.church(building) : building)
  }

  /** Whether a building is a tower: taller than twice its width. */
  static isTower(building: SurveyedBuilding): boolean {
    return building.heightM >= BuildingStyles.TOWER_SLENDERNESS * Math.max(building.widthM, building.lengthM)
  }

  private static church(building: SurveyedBuilding): SurveyedBuilding {
    const color = building.roof?.color ?? BuildingStyles.CHURCH_ROOF_COLOUR
    if (BuildingStyles.isTower(building)) {
      // The top of the tower is where the laser saw it, but the slope it saw there is a parapet's, not a roof's.
      return { ...building, roof: { shape: "flat", riseM: 0, color } }
    }
    // A roof the laser measured is the roof.
    if (building.roof && building.roof.shape !== "flat") return building
    const riseM = Math.round(Math.min(BuildingStyles.CHURCH_PITCH * building.lengthM, BuildingStyles.CHURCH_ROOF_OF_WALLS * building.heightM) * 10) / 10
    // Along the longer side: a nave runs the length of the church.
    const roof: DecorRoof = { shape: "gable", riseM, color }
    return { ...building, heightM: Math.round((building.heightM + riseM) * 10) / 10, roof }
  }

  private static ofYear(year: number | undefined): BuildingStyle | undefined {
    return year !== undefined && year < BuildingStyles.OLD_BEFORE ? "old" : undefined
  }

  /** A tall building that says neither its floors, nor its year, nor that people live in it. */
  private static grand(properties: Record<string, unknown>): BuildingStyle | undefined {
    const height = Number(properties.hauteur)
    const floors = Number(properties.nombre_d_etages)
    if (Number.isFinite(floors) && floors > 0) return undefined
    if (properties.usage_1 === "Résidentiel" || properties.date_d_apparition) return undefined
    return height >= BuildingStyles.GRAND_FROM_M && height <= BuildingStyles.GRAND_UP_TO_M ? "grand" : undefined
  }
}
