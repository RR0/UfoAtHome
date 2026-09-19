import type { DecorModelRef } from "../model/Decor.js"
import type { People } from "../model/People.js"
import type { SaidText } from "../model/SaidText.js"

/**
 * What somebody believes was there: bodies in metres, standing in the world, that a testimony's
 * angles are then confronted with.
 *
 * A recording states angles and nothing else (see Sighting), and that stays true: an
 * interpretation is not more of the testimony, it is a claim ABOUT it, and it is tested by drawing
 * it where it says and seeing whether it looks the way the witness said. Two places hold one:
 *
 * - The recording itself, singular (`SightingRecordingJson.interpretation`): what the WITNESS took
 *   it to be — "a craft standing on legs in the gully, a hundred feet away". Its author is the
 *   witness, so it names none.
 * - The case, plural: its events of type `interpretation` (see InterpretationEventJson), each by an
 *   identified analyst and naming the recording it interprets by that recording's `id`. The case
 *   points at the testimony, never the other way round.
 *
 * Both have the same shape, so either can stand in for the other: a reader replays the raw
 * testimony, or the witness's own reading of it, or any analyst's — one at a time.
 *
 * Nothing here is a default. No recording gets a body it did not state, because a body is a dozen
 * free parameters and a default would be a claim nobody made.
 */
export interface InterpretationJson {
  /** What the claim is, in a few words — "Craft on its legs", "Weather balloon at 3 km". */
  title?: SaidText
  bodies: BodyJson[]
}

/**
 * Who made a claim: a reference when one exists, a description when it does not.
 *
 * `{ people: "HynekJosefAllen" }` or `{ org: "ProjectBlueBook" }` name an entry that lives
 * elsewhere (on RR0, a people or an org directory); a person with no id yet is described in value,
 * with the fields of a People.
 */
export type AgentRef = { people: string } | { org: string } | People

/**
 * One analyst's interpretation, as an event of a case — beside its `sighting` events, which it
 * interprets one of.
 *
 * The bodies are either inline or in a file of their own at `url`, read relative to the case file
 * like a sighting's own `url`: a track of keyframes is long, and a case is a chronology someone
 * reads.
 */
export interface InterpretationEventJson {
  type?: "event"
  eventType: "interpretation"
  /** The `id` of the recording this interprets — see Sighting.id. */
  sighting: string
  /** Who claims it. */
  by?: AgentRef[]
  /** When it was claimed, as RR0 writes a time. */
  time?: string
  title?: SaidText
  url?: string
  bodies?: BodyJson[]
}

/** The shapes this project builds itself. Anything else a model names is a catalogue entry or a
 * file — see BodyJson.model. */
export const BODY_PRIMITIVES = ["ellipsoid", "sphere", "disc", "cylinder", "cone", "box", "torus"] as const
export type BodyPrimitive = typeof BODY_PRIMITIVES[number]

/**
 * One thing in the world: a craft, a balloon, an aircraft, a figure.
 *
 * Several phenomena seen at once are several bodies. Its `track` says where it stands and what it
 * looks like at each instant, in the recording's own milliseconds.
 */
export interface BodyJson {
  id: string
  title?: SaidText
  /**
   * The phenomena of the testimony (their `sourceId`s) this body claims to be — what its projected
   * outline is measured against at each instant, and what is drawn as a ghost beside it. Absent
   * means it explains nothing the witness drew: scenery the interpreter needed, say.
   */
  explains?: string[]
  /**
   * What it is shaped like. A primitive this project builds (`{ "id": "ellipsoid" }`, see
   * BODY_PRIMITIVES), a model of the catalogue (`{ "id": "poly-google-airliner" }`), or a glTF file
   * (`{ "url": …, "credit": … }`). Stretched to `sizeM` whichever it is: a sphere given three
   * different lengths IS an ellipsoid, and a model is fitted to the size stated rather than trusted
   * to have been made at it.
   */
  model: DecorModelRef
  track: BodyKeyframe[]
}

/**
 * Where a body is and what it looks like at one instant.
 *
 * Its position is stated one of two ways, never both:
 *
 * - IN THE WORLD, as scenery is: `eastM`/`northM` from where the witness stood at the start of the
 *   recording (the same origin as DecorObject), and `onGround` or `altitudeAboveGroundM` over the ground
 *   there.
 * - FROM THE WITNESS, as a witness says it: `azimuthDeg`/`altitudeDeg` (the conventions of
 *   BaseShape.aim), from where they stood at THIS instant, and `distanceM` along it. Turned into the
 *   world with their pose at this instant, and fixed there: between two keyframes a body moves in
 *   the world, not with the witness's head.
 *
 * With `onGround`, the body stands on the relief (see BodyPlacement). A direction with no distance
 * then says "where that line meets the ground"; a direction WITH a distance keeps the distance and
 * puts the body on the ground there — and if the ground is not where the direction said, what the
 * witness sees no longer matches what they said, which is the contradiction the reading exists to
 * show (see BodyConfrontation).
 *
 * Every other field holds from one keyframe to the next until a later one restates it, and blends
 * between two that both state it.
 */
export interface BodyKeyframe {
  t: number
  eastM?: number
  northM?: number
  azimuthDeg?: number
  altitudeDeg?: number
  distanceM?: number
  /** Standing on the ground. */
  onGround?: boolean
  /** Metres between the ground under it and its lowest point. Ignored with `onGround`. */
  altitudeAboveGroundM?: number
  sizeM?: BodySize
  attitude?: BodyAttitude
  appearance?: BodyAppearance
  /** A flame coming out of it, from here on — see BodyFlame. `luminanceCdM2: 0` puts it out. */
  flame?: BodyFlame
}

/**
 * A flame a body throws: an exhaust, a jet, a flare.
 *
 * Not a part of the body and not a shape of its own: an effect, anchored to a NAMED NODE of the
 * body's model (`node`, "exhaust" by default), so that the model says where it comes out and the
 * track says when and how strongly. A primitive has no nodes, and throws it from the middle of its
 * underside. It points along the body's own downward axis, turning with it.
 *
 * Seen by the light it gives out, not by any it receives: `luminanceCdM2` is what the scene's own
 * photometry turns into how bright it looks against the sky of that instant (see
 * EyeAdaptation.displayOf). A flame bright enough to read clearly in daylight is some tens of
 * thousands; a candle's is ten thousand, a gas flame's blue a few thousand.
 */
export interface BodyFlame {
  node?: string
  /** How far it reaches from the node, metres. */
  lengthM: number
  /** How wide it is at its widest, metres. */
  widthM: number
  /** Its colour where it leaves the node, CSS. */
  color: string
  /** Its colour at its far end; the same as `color` when absent. */
  tipColor?: string
  luminanceCdM2: number
}

/** Metres along its own three axes: across, fore and aft, and up. */
export interface BodySize {
  widthM: number
  lengthM: number
  heightM: number
}

/** How it is turned, degrees — the conventions of ObserverPose: heading clockwise from true north,
 * pitch nose-up, roll right side down. */
export interface BodyAttitude {
  headingDeg?: number
  pitchDeg?: number
  rollDeg?: number
}

/** What its surface is like. It sends back the light that falls on it and none of its own: a
 * glowing body needs the scene's exposure to say what a candela per square metre looks like, which
 * comes with lights. */
export interface BodyAppearance {
  /** Its surface colour, CSS. */
  color?: string
  /** How much of the light falling on it it sends back, 0-1: aluminium ~0.7, a matt dark hull ~0.1. */
  albedo?: number
}
