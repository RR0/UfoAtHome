/**
 * The groups of data a scene asks a survey or a record for as it plays, each of which a recording can carry frozen beside it.
 *
 * - relief: the ground's height, as the elevation source answered for each patch of ground the scene builds;
 * - imagery: the photograph of the ground draped over it, as the tiles the imagery source served;
 * - roads, water, railways: the ways, rivers and tracks laid on each patch;
 * - upperAir: the air at the levels the aircraft fly at, which decides their trails;
 * - map: the photograph under the observer map, as the tiles the imagery source served for the ground the map is fitted to.
 *
 * What is not here is frozen already, in the recording itself: the weather (weatherTrack), the scenery (decor), the place, the time zone and
 * the light pollution are looked up while the recording is made, and written into it.
 */
export type FrozenGroupName = "relief" | "imagery" | "roads" | "water" | "railways" | "upperAir" | "map"

/** The groups laid on a patch of ground. */
export type FrozenTerrainGroupName = Exclude<FrozenGroupName, "upperAir" | "map">

/** One group, frozen: where its annex is, and when and from whom it was taken. Or a group asked of its source at every play, and never frozen. */
export interface FrozenGroup {
  /**
   * The annex holding it, relative to the recording's own file (as a model's `url` is), or a `data:` URL for an annex kept inside the
   * recording itself. Absent for a group asked live.
   */
  src?: string
  /** Asked of its source at every play, and never taken at save: what an author chooses by picking a source rather than the file. */
  live?: boolean
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
  map?: FrozenGroup
  /**
   * Where the weather is kept, when it is not inside the recording (its `weatherTrack` and `weatherSource`): an annex holding them,
   * read as the recording is loaded (see RecordingSections). Absent, the weather is the recording's own.
   */
  weather?: FrozenGroup
  /**
   * The place's name and coordinates (`place`), read from the recording's file rather than looked up by a geocoder when present: inside the
   * recording, or in the annex `src` names. Absent, the editor names the place by the geocoder as the observer moves.
   */
  place?: FrozenGroup
  /**
   * The night sky's figure (`lightPollution`), read from the recording's file rather than looked up in the atlas when present: inside the
   * recording, or in the annex `src` names. Absent, the editor reads it from the atlas as the observer moves.
   */
  lightPollution?: FrozenGroup
  /**
   * The scenery (`decor`), read from the recording's file rather than taken again from a survey of the place as the observer moves, when
   * present: inside the recording, or in the annex `src` names.
   */
  decor?: FrozenGroup
}

/** The parts of a recording's own text that it may keep in a file beside it rather than inside it. */
export type RecordingSectionName = "weather" | "place" | "lightPollution" | "decor"

/** A section's annex: those keys of the recording, kept in a file beside it, with when and from whom they were taken. */
export interface SectionAnnex {
  version: 1
  takenOn?: string
  attribution?: string
  [key: string]: unknown
}

/** What a recording keeps of its own text in files beside it. */
export class RecordingSections {
  static readonly NAMES: readonly RecordingSectionName[] = ["weather", "place", "lightPollution", "decor"]
  /** The recording's keys each section holds. */
  static readonly KEYS: Readonly<Record<RecordingSectionName, readonly string[]>> = {
    weather: ["weatherTrack", "weatherSource"],
    place: ["place"],
    lightPollution: ["lightPollution"],
    decor: ["decor"]
  }

  /** The annex's file name for a recording saved as `base`. */
  static annexName(base: string, name: RecordingSectionName): string {
    return `${base}.${name.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}.json`
  }

  /** Whether the section is read from the recording's file rather than asked of its source: said for the place and the night sky. */
  static fromFile(data: FrozenData | undefined, name: RecordingSectionName): boolean {
    return data?.[name] !== undefined && data[name]!.live !== true
  }
}

/** A group the scene reads from its annex. */
export type HeldGroup = FrozenGroup & { src: string }

/** What can be asked of a recording's frozen data, group by group. */
export class FrozenGroups {
  static readonly NAMES: readonly FrozenGroupName[] = ["relief", "imagery", "roads", "water", "railways", "upperAir", "map"]
  /** Those laid on a patch of ground, and therefore taken for each patch the scene builds. */
  static readonly TERRAIN: readonly FrozenTerrainGroupName[] = ["relief", "imagery", "roads", "water", "railways"]

  /** The group as the scene reads it: its annex, or undefined when it is asked for live (no annex, `live`, or a `refresh` asked). */
  static held(data: FrozenData | undefined, name: FrozenGroupName): HeldGroup | undefined {
    if (!data || data.live) return undefined
    const group = data[name]
    return group && !group.live && !group.refresh && group.src !== undefined ? group as HeldGroup : undefined
  }

  /** Whether the group is asked of its source at every play: chosen so for itself, or for every group. Never taken at save, then. */
  static isLive(data: FrozenData | undefined, name: FrozenGroupName): boolean {
    return data?.live === true || data?.[name]?.live === true
  }

  /** The annex's file name for a recording saved as `base` (its file name without `.json`). */
  static annexName(base: string, name: FrozenGroupName): string {
    const extension = name === "relief" || name === "imagery" || name === "map" ? "zip" : "json"
    const kebab = name.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)
    return `${base}.${kebab}.${extension}`
  }

  /** Whether the recording says anything at all about frozen data. */
  static isEmpty(data: FrozenData | undefined): boolean {
    return !data || (!data.live && FrozenGroups.NAMES.every(name => !data[name]) && RecordingSections.NAMES.every(name => !data[name]))
  }
}
