import type { DecorRoof } from "../../engine/model/Decor.js"

/** One tree, as a survey of the canopy saw it, in metres from the place asked about. */
export interface SurveyedTree {
  /** Metres east of the centre asked about, west being negative. */
  eastM: number
  /** Metres north of the centre asked about, south being negative. */
  northM: number
  /** From the ground to the top of the crown. */
  heightM: number
  /** Across the crown. */
  widthM: number
}

/**
 * One building, as a survey saw its roof: the rectangle that best holds its footprint, in metres from the place asked about.
 *
 * The rectangle is a drawing of a building and not its plan: an L-shaped house is the smallest rectangle that holds it, which
 * is what a decor object can say. `widthM` is the longer side, the one a front facade has, and `lengthM` the depth, which
 * is the direction the building faces (see DecorObject.headingDeg and DecorSystem, where a building faces -Z at heading 0).
 */
export interface SurveyedBuilding {
  eastM: number
  northM: number
  /** The longer side of the rectangle, in metres. */
  widthM: number
  /** The shorter side, in metres. */
  lengthM: number
  /** From the ground to the roof. */
  heightM: number
  /** Degrees clockwise from north of the shorter side, which is what `DecorObject.headingDeg` says for a building. */
  headingDeg: number
  /** How many floors the survey says it has, where it says (a laser does not: the height gives about one in three metres). */
  floors?: number
  /** What the survey calls it, where it is named ("Mairie de Saint-Lô"): most buildings are not. */
  name?: string
  /**
   * The shape and colour of its roof, where the laser and the aerial photograph could say (see RoofShapes). When it is set `heightM` is to the
   * ridge, and the walls are `riseM` lower.
   */
  roof?: DecorRoof
}

/**
 * One road or rail bridge, as a survey drew its centre line: where its middle is, how long it runs, how wide the deck is and how high
 * the road lies above the ground under it (see DecorObject's "bridge" kind).
 */
export interface SurveyedBridge {
  eastM: number
  northM: number
  /** Along the road, from one end of the structure to the other. */
  lengthM: number
  /** Across it, the carriageway and its edges. */
  widthM: number
  /** The road surface above the ground under it. */
  heightM: number
  /** Degrees clockwise from north of the direction it runs in, from 0 up to 180. */
  headingDeg: number
  /** The name of the road it carries, where the survey has one ("Rue de Carentan"). */
  name?: string
}

/**
 * One span of an overhead electric line, between two of its supports: where its middle is, how long it runs, the direction it runs in,
 * and how high its conductors and its poles stand (see DecorObject's "wire" kind).
 */
export interface SurveyedLine {
  eastM: number
  northM: number
  lengthM: number
  /** Degrees clockwise from north, from 0 up to 360: the line has a direction here, the way the survey drew it. */
  headingDeg: number
  /** The lowest conductor above the ground. */
  heightM: number
  /** The top of the supports. */
  poleHeightM: number
  /** How far each conductor hangs to the right of the line's heading, metres: one entry per conductor. */
  acrossM: number[]
  /** What the survey says of the line, in its own words ("90 kV"). */
  voltage: string
}

/** One public street lamp, as a map has it, in metres from the place asked about. */
export interface SurveyedLamp {
  eastM: number
  northM: number
  /** The height of the light above the ground, where the map says (a lamp column is five to eight metres, a lamp on a wall lower). */
  heightM?: number
}

/** What a survey found around a place. */
export interface Surroundings {
  trees: SurveyedTree[]
  buildings: SurveyedBuilding[]
  bridges: SurveyedBridge[]
  lines: SurveyedLine[]
  /** The public lamps: the light of a town at night, not a thing a laser or a footprint draws. A survey without them gives none. */
  lamps?: SurveyedLamp[]
}

/**
 * Why a provider could not answer, which is not the same as having nothing to say: a place with no trees answers with an
 * empty list, and a place nobody has surveyed throws this.
 *
 * - "no-coverage": the survey does not reach this place (the IGN's LiDAR HD reaches France only, and not all of it yet).
 *   Nothing is wrong, and asking again will not help.
 * - "unreachable": the service did not answer or answered something unreadable. Asking again later might.
 */
export class SurroundingsUnavailableError extends Error {
  constructor(readonly reason: "no-coverage" | "unreachable", message: string) {
    super(message)
    this.name = "SurroundingsUnavailableError"
  }
}

/**
 * Where the trees, the buildings, the bridges and the electric lines around a place come from.
 *
 * The same seam as RoadProvider, for the same reason: this project takes the ground from surveys it did not make, and the
 * one place that chooses which survey is the registry (see SURROUNDINGS_SOURCES). A laser scan is of one day, and the day
 * of a recording is some other: trees grow, are felled and planted, a house is built or pulled down, so a provider says it
 * is `contemporary` and what it returns is a suggestion for the author to keep, move or remove, never a statement of the
 * recording.
 *
 * What a provider must NOT do is mistake something else for a tree or for a roof: a laser model of the surface reads a
 * church tower, a pylon and a house as readily as an oak, and a scene planted with them would put a forest where a town
 * stands. A provider that cannot tell what a point is says so (throws), it does not guess.
 */
export interface SurroundingsProvider {
  /** Stable, and what a decor object taken from it says it came from (see DecorObject.origin). */
  readonly id: string
  /** The service, for the author ("IGN LiDAR HD"). */
  readonly name: string
  /** Shown to the reader wherever these objects are (see ImageryProvider.attribution). */
  readonly attribution: string
  /** Where that attribution points. */
  readonly creditUrl: string
  /** True when what comes back is the world of the day of the survey rather than the recording's own day. */
  readonly contemporary: boolean
  /** Cheap and offline: whether the survey could cover this place. The answer to "is it worth asking". */
  covers(lat: number, lng: number): boolean
  /** What stands within `radiusM` of the centre, the most prominent first. A part the survey could not give (its vectors being out of reach, say) is an empty list. */
  getSurroundings(centre: { lat: number, lng: number }, radiusM: number): Promise<Surroundings>
}
