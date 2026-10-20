/**
 * The groups of data a scene asks a survey or a record for as it plays, each of which a recording can carry frozen beside it.
 *
 * - relief: the ground's height, as the elevation source answered for each patch of ground the scene builds;
 * - imagery: the photograph of the ground draped over it, as the tiles the imagery source served;
 * - roads, water, railways: the ways, rivers and tracks laid on each patch;
 * - upperAir: the air at the levels the aircraft fly at, which decides their trails.
 *
 * What is not here is frozen already, in the recording itself: the weather (weatherTrack), the scenery (decor), the place, the time zone and
 * the light pollution are looked up while the recording is made, and written into it.
 */
export type FrozenGroupName = "relief" | "imagery" | "roads" | "water" | "railways" | "upperAir"

/** The groups laid on a patch of ground. */
export type FrozenTerrainGroupName = Exclude<FrozenGroupName, "upperAir">

/** One group, frozen: where its annex is, and when and from whom it was taken. */
export interface FrozenGroup {
  /** The annex holding it, relative to the recording's own file (as a model's `url` is). */
  src: string
  /** The day it was taken from its source, YYYY-MM-DD: what the data is a picture of (a road network, a survey) is that day's. */
  takenOn?: string
  /** Whom it was taken from, as their licence asks it to be said. */
  attribution?: string
  /**
   * Asked of its source again, once: the scene does not read the annex, and the editor takes it again at the next save and drops this.
   * What a person editing the file by hand writes to have one group taken again.
   */
  refresh?: boolean
}

/**
 * What a recording carries of the data its scene would otherwise ask third parties for (see FrozenGroupName), in files beside it.
 *
 * A recording that is finished must play the same way in ten years, and without asking anybody for anything: the IGN, Esri or Overpass
 * may answer differently, or not at all, and a reader of a case dossier never asked them. So what was taken while it was made is kept,
 * and a group with no annex is the one group still asked for live.
 */
export interface FrozenData {
  /** Every group asked of its source at every play, and nothing taken at save: off (absent) by default. */
  live?: boolean
  relief?: FrozenGroup
  imagery?: FrozenGroup
  roads?: FrozenGroup
  water?: FrozenGroup
  railways?: FrozenGroup
  upperAir?: FrozenGroup
}

/** What can be asked of a recording's frozen data, group by group. */
export class FrozenGroups {
  static readonly NAMES: readonly FrozenGroupName[] = ["relief", "imagery", "roads", "water", "railways", "upperAir"]
  /** Those laid on a patch of ground, and therefore taken for each patch the scene builds. */
  static readonly TERRAIN: readonly FrozenTerrainGroupName[] = ["relief", "imagery", "roads", "water", "railways"]

  /** The group as the scene reads it: its annex, or undefined when it is asked for live (no annex, `live`, or a `refresh` asked). */
  static held(data: FrozenData | undefined, name: FrozenGroupName): FrozenGroup | undefined {
    if (!data || data.live) return undefined
    const group = data[name]
    return group && !group.refresh ? group : undefined
  }

  /** The annex's file name for a recording saved as `base` (its file name without `.json`). */
  static annexName(base: string, name: FrozenGroupName): string {
    const extension = name === "relief" || name === "imagery" ? "zip" : "json"
    const kebab = name.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)
    return `${base}.${kebab}.${extension}`
  }

  /** Whether the recording says anything at all about frozen data. */
  static isEmpty(data: FrozenData | undefined): boolean {
    return !data || (!data.live && FrozenGroups.NAMES.every(name => !data[name]))
  }
}
