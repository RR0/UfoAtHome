import type { DecorRoof } from "../../engine/model/Decor.js"
import type { BuildingMaterial } from "./SurroundingsProvider.js"

/**
 * What the volunteers of OpenStreetMap write on a building, as the numbers and words a scene is drawn with.
 *
 * Most buildings carry nothing but `building=yes`, so every reading answers "not said" (undefined) rather than a guess: the scene's own defaults then
 * stand. What is said is read the way the wiki defines it: `height` is to the top of the roof, `building:levels` counts the ground floor and not the roof,
 * `roof:height` is the part of the height that is roof.
 */
export class OsmBuildingTags {
  private static readonly ROOF_SHAPES: Record<string, DecorRoof["shape"]> = {
    flat: "flat", gabled: "gable", gambrel: "gable", saltbox: "gable", "half-hipped": "hip", hipped: "hip", pyramidal: "hip", mansard: "hip", round: "gable"
  }
  private static readonly WALL_MATERIALS: Record<string, BuildingMaterial> = {
    brick: "brick", stone: "stone", granite: "stone", sandstone: "stone", limestone: "stone", concrete: "concrete", cement_block: "block", block: "block", wood: "wood", timber_framing: "wood"
  }
  private static readonly ROOF_MATERIALS: Record<string, BuildingMaterial> = {
    roof_tiles: "tile", tiles: "tile", tile: "tile", slate: "slate", metal: "zinc", zinc: "zinc", tin: "zinc", copper: "zinc", concrete: "concrete", eternit: "other"
  }
  /** The few colour names mappers write, as they look on a wall or a roof. */
  private static readonly COLOURS: Record<string, string> = {
    white: "#e8e6e0", grey: "#8c8c8a", gray: "#8c8c8a", black: "#3a3a3a", red: "#a8483a", brown: "#6e4f38", beige: "#d6c9a8", yellow: "#d8c070",
    orange: "#c9773a", green: "#5f7a52", blue: "#506a8a", tan: "#c0a37a", cream: "#e6dcc0", pink: "#c99a96", silver: "#b4b6b6"
  }

  /** The height in metres the tag says ("12", "12.5 m", "12m"); nothing for what is not a plausible building height. */
  static height(value: string | undefined): number | undefined {
    const metres = Number.parseFloat((value ?? "").replace(",", "."))
    return Number.isFinite(metres) && metres >= 2 && metres <= 500 ? metres : undefined
  }

  /** The number of levels the tag says (the ground floor counted). */
  static levels(value: string | undefined): number | undefined {
    const levels = Number.parseInt(value ?? "", 10)
    return Number.isFinite(levels) && levels >= 1 && levels <= 150 ? levels : undefined
  }

  /** The shape of the roof, or nothing for the shapes a gable, a hip or a box does not draw (a skillion, a dome). */
  static roofShape(value: string | undefined): DecorRoof["shape"] | undefined {
    return OsmBuildingTags.ROOF_SHAPES[(value ?? "").trim().toLowerCase()]
  }

  static wallMaterial(value: string | undefined): BuildingMaterial | undefined {
    return OsmBuildingTags.WALL_MATERIALS[(value ?? "").trim().toLowerCase()]
  }

  static roofMaterial(value: string | undefined): BuildingMaterial | undefined {
    return OsmBuildingTags.ROOF_MATERIALS[(value ?? "").trim().toLowerCase()]
  }

  /** A colour written as "#rrggbb", "#rgb" or one of the common names, as "#rrggbb". */
  static colour(value: string | undefined): string | undefined {
    const text = (value ?? "").trim().toLowerCase()
    if (/^#[0-9a-f]{6}$/.test(text)) return text
    if (/^#[0-9a-f]{3}$/.test(text)) return `#${text[1]}${text[1]}${text[2]}${text[2]}${text[3]}${text[3]}`
    return OsmBuildingTags.COLOURS[text]
  }
}
