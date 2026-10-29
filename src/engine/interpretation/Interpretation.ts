import type { SaidPosition } from "../model/SaidPosition.js"
import type { DecorModelRef } from "../model/Decor.js"
import type { People } from "../model/People.js"
import type { SaidText } from "../model/SaidText.js"
import type { FlareSalvoJson } from "./DecoyFlare.js"
import type { LanternLaunchJson } from "./SkyLantern.js"
import type { AircraftKind } from "../traffic/AircraftModels.js"

/**
 * What somebody believes was there: bodies in metres, standing in the world, that a account's
 * angles are then confronted with.
 *
 * A recording states angles and nothing else (see Sighting), and that stays true: an
 * interpretation is not more of the account, it is a claim ABOUT it, and it is tested by drawing
 * it where it says and seeing whether it looks the way the observer said. Two places hold one:
 *
 * - The recording itself, singular (`SightingRecordingJson.interpretation`): what the OBSERVER took
 *   it to be — "a craft standing on legs in the gully, a hundred feet away". Its author is the
 *   observer, so it names none.
 * - The case, plural: its events of type `interpretation` (see InterpretationEventJson), each by an
 *   identified analyst and naming the recording it interprets by that recording's `id`. The case
 *   points at the account, never the other way round.
 *
 * Both have the same shape, so either can stand in for the other: a reader replays the raw
 * account, or the observer's own reading of it, or any analyst's — one at a time.
 *
 * Nothing here is a default. No recording gets a body it did not state, because a body is a dozen
 * free parameters and a default would be a claim nobody made.
 */
export interface InterpretationJson {
  /** What the claim is, in a few words — "Craft on its legs", "Weather balloon at 3 km". */
  title?: SaidText
  bodies: BodyJson[]
  /** Fires the interpretation lights on the ground, as their smoke — see SmokeSource. */
  smoke?: SmokeSource[]
  /** Salvoes of decoy flares an aircraft dispensed, computed into bodies when shown — see FlareSalvoJson. */
  flares?: FlareSalvoJson[]
  /** Sky lanterns let go from the ground, computed into bodies when shown — see LanternLaunchJson. */
  lanterns?: LanternLaunchJson[]
  /**
   * When this interpretation is a VARIANT of the account: what the observer would have to have erred by for the account to be a
   * misperception of a candidate, as the candidate search found it (see CandidateSearch, docs/witness-error-model.md). The account never
   * changes: the variant is the transformation, kept so it can be replayed and computed again when the error model changes.
   */
  variant?: VariantJson
}

/** What makes an interpretation a variant of the account — see InterpretationJson.variant. */
export interface VariantJson {
  /** Which candidate: a body of the sky ("Venus"), a satellite, a re-entry, an aircraft, or another interpretation. */
  candidate: string
  /** What the candidate is called, as it was when the variant was kept. */
  label?: string
  /** The known phenomenon of Poher's matrix it is an instance of, when it is one. */
  phenomenon?: string
  /** The witness parameters applied: a clock offset in minutes, a rotation of the heading in degrees, factors on elevation and size. */
  parameters: { clockMinutes: number, headingDeg: number, elevationFactor: number, sizeFactor: number, durationFactor?: number }
  /** The values it moves: what the account says, what the variant reads, the bias and its status. */
  moved: { field: "time" | "heading" | "elevation" | "size" | "duration" | "sweep", stated: number, variant: number, parameter: string, amount: number, z: number, status: string }[]
  /** The structural readings it uses (see CandidateSearch's StructuralReading), each with what the studies say of it. */
  readings?: { reading: string, status: string }[]
  /** What it costs, in units of the laws' spread (σ), and the verdict it got. */
  cost: number
  verdict: "consolidated" | "contested" | "incompatible"
  /** The error model it was computed with (see WitnessError.MODELS). */
  modelId: string
}

/**
 * Something burning on the ground from an instant on — brush a flame set alight — seen by its
 * smoke, carried off by the wind. Where, and from when, in the recording's own frame and time.
 */
export interface SmokeSource {
  eastM: number
  northM: number
  fromT: number
  untilT?: number
  /** How fast it dies down, seconds to half its thickness — brush flares and smoulders. 20 when
   * absent; it never quite stops before `untilT`, a tenth of it lingering. */
  halfLifeS?: number
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
 * One interpretation of a sighting, as an event of a case — beside the `sighting` events it interprets.
 *
 * An interpretation is another observation: the one that was, as whoever interprets holds it. So it
 * is an event of type `sighting` like the original, with a recording at its `url` (the same format,
 * its `interpretation` holding the bodies), marked by `interpretationOf` — the `id` of the case's event
 * (or the ids of the several) it interprets (see CaseEventJson.id; the older form names the recording's own `id`) — and dated when the interpretation was elaborated
 * (`time`), by whom (`by`). A case lists the recordings that are observers' accounts by the events
 * with no `interpretationOf`, and those that are readings of them by the ones that have.
 *
 * The older form is still read: an event of type `interpretation` naming the sighting in `sighting`,
 * its bodies inline or in a file of their own at `url`.
 */
export interface InterpretationEventJson {
  type?: "event"
  eventType: "sighting" | "interpretation"
  /** The `id` of the event of the case (or the ids of the events) this interprets — see CaseEventJson.id; the older form: of the recording, see Sighting.id. */
  interpretationOf?: string | string[]
  /** Older form: the `id` of the recording this interprets. */
  sighting?: string
  /** Who claims it. */
  by?: AgentRef[]
  /** When it was elaborated, as RR0 writes a time. */
  time?: string
  title?: SaidText
  url?: string
  bodies?: BodyJson[]
  smoke?: SmokeSource[]
  flares?: FlareSalvoJson[]
  lanterns?: LanternLaunchJson[]
}

/** The shapes this project builds itself. "figure" is a standing human silhouette — the decor's own
 * (see DecorKind "entity"), for a being an interpretation places: the pair at Socorro. Anything else a model names is a catalogue entry or a
 * file — see BodyJson.model. */
export const BODY_PRIMITIVES = ["ellipsoid", "sphere", "disc", "cylinder", "cone", "box", "torus", "figure"] as const
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
   * The phenomena of the account (their `sourceId`s) this body claims to be — what its projected
   * outline is measured against at each instant, and what is drawn as a ghost beside it. Absent
   * means it explains nothing the observer drew: scenery the interpreter needed, say.
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
  /**
   * The settings of its model, by the key the model publishes them under (see ModelParameters.parameters): the colour of a sky lantern's
   * paper, say. Which of them applies, and how, is the model's own to say (ModelParameters.bindings), as for a decor object's
   * (see DecorObject.modelParameters); a primitive has none.
   */
  modelParameters?: Record<string, string | number | boolean>
  /**
   * How much its light wavers, as a flame's does, as a share of it: 0.15 has it go some 15 % above and below what its track states, a few
   * times a second, alike every time the recording is played. Steady when absent.
   */
  flicker?: number
  /**
   * Whether the observer carries it: its keyframes, stated FROM THE OBSERVER, are offsets from their eye that go with the eye, instead
   * of points of the world fixed where the eye was at each keyframe's instant. What a thing that is part of the place they stand in
   * needs — a spot of light on the glass of a flight deck, half a metre from an airline pilot's eye, which the relief under an
   * airliner ten kilometres on would otherwise carry up and down by a metre.
   */
  withObserver?: boolean
  /**
   * The node of the model that IS what the observer drew — "hull" for a craft on legs the observer
   * drew as an oval — and so what its outline is measured by (see BodyConfrontation). The whole
   * model when absent, and always for a primitive.
   */
  outlineNode?: string
  track: BodyKeyframe[]
  /**
   * What it sounds like: heard from where the observer stands, late by the time sound takes to come, shifted in pitch as it comes and goes, and
   * masked by the noise of the place (see BodyHearing). Silent when absent: nothing here is a default, and a body is a claim.
   */
  sound?: BodySound
}

/**
 * The noise a body makes, as a class of aircraft makes it (see AircraftHearing's classes), and how much quieter the interpretation claims it
 * was than any machine of that class: what a hypothesis of an unknown, quieter machine has to state for its silence to be weighed.
 */
export interface BodySound {
  kind: AircraftKind
  /** Decibels less than the class's own sound power, across its spectrum. 0 when absent. */
  quieterDb?: number
}

/**
 * Where a body is and what it looks like at one instant.
 *
 * Its position is stated one of two ways, never both:
 *
 * - IN THE WORLD, as scenery is: `eastM`/`northM` from where the observer stood at the start of the
 *   recording (the same origin as DecorObject), and `onGround` or `altitudeAboveGroundM` over the ground
 *   there.
 * - FROM THE OBSERVER, as a observer says it: `azimuthDeg`/`altitudeDeg` (the conventions of
 *   BaseShape.aim), from where they stood at THIS instant, and `distanceM` along it. Turned into the
 *   world with their pose at this instant, and fixed there: between two keyframes a body moves in
 *   the world, not with the observer's head.
 *
 * With `onGround`, the body stands on the relief (see BodyPlacement). A direction with no distance
 * then says "where that line meets the ground"; a direction WITH a distance keeps the distance and
 * puts the body on the ground there — and if the ground is not where the direction said, what the
 * observer sees no longer matches what they said, which is the contradiction the reading exists to
 * show (see BodyConfrontation).
 *
 * Every other field holds from one keyframe to the next until a later one restates it, and blends
 * between two that both state it.
 */
export interface BodyKeyframe {
  t: number
  eastM?: number
  northM?: number
  /** How `eastM`/`northM` were said, when not as metres from the observer: from a decor object, or as degrees (see SaidPosition). */
  saidPosition?: SaidPosition
  azimuthDeg?: number
  altitudeDeg?: number
  distanceM?: number
  /** Standing on the ground. */
  onGround?: boolean
  /** Gone from here on — `false` — or back — `true`. A being seen at first glance and not there a
   * minute later is a body whose track says so. */
  present?: boolean
  /** Metres between the ground under it and its lowest point. Ignored with `onGround`. */
  altitudeAboveGroundM?: number
  /**
   * Metres between its lowest point and the ground at the recording's own origin (where the observer
   * stands at the start) — a height in the air that does NOT follow what is under the body. For
   * something that flies over a wall, a terrace or a ridge: with `altitudeAboveGroundM` it rises and
   * falls with the ground it passes over, so crossing the edge of a 2 m wall is a 2 m jump in the air.
   * Ignored with `onGround`, and with `altitudeAboveGroundM`.
   */
  altitudeM?: number
  sizeM?: BodySize
  attitude?: BodyAttitude
  appearance?: BodyAppearance
  /** A flame coming out of it, from here on — see BodyFlame. `luminanceCdM2: 0` puts it out. */
  flame?: BodyFlame
  /**
   * How far along each of its model's own movements it is, by the movement's name in the model
   * (a glTF animation): 0 at its start, 1 at its end, and on past 1 for one that repeats — a turn
   * made three times is 3. The model says WHAT moves and how (a pivot drawn up into the hull, a set
   * of legs turning); the track says when, and how far: blended between two keyframes that state
   * it, held at the last one that did.
   */
  motions?: Record<string, number>
  /**
   * The luminance of each of its model's own lights, cd/m², by the name of the light's material in
   * the model: what lets one body carry lights that behave each their own way — a steady white at
   * each end, a red one flashing between. The model says where each light is, how big and of what
   * colour; the track says how bright, and when. Blended between two keyframes that state it (two
   * a millisecond apart switch it), held after the last; a light no keyframe names glows at its
   * share of the body's own `appearance.luminanceCdM2`, as before this field existed.
   */
  lights?: Record<string, number>
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
  /** Whether it raises dust where it meets the ground — a flame reaching loose, dry soil does, the
   * more the nearer it gets. */
  raisesDust?: boolean
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

/** What its surface is like: what it sends back of the light that falls on it, and what it gives
 * out of itself. */
export interface BodyAppearance {
  /** Its surface colour, CSS. */
  color?: string
  /** How much of the light falling on it it sends back, 0-1: aluminium ~0.7, a matt dark hull ~0.1. */
  albedo?: number
  /**
   * What it gives out of itself, candela per square metre — read through the scene's own photometry
   * exactly as a flame's is (see BodyFlame), so that the same figure is a lamp at night and nothing
   * at all against a noon sky.
   *
   * Absent or zero means it glows not at all and is seen only by the light that falls on it, which
   * is what most bodies are. A observer who says a thing was "as bright as the Sun at noon" has said
   * something about this number and not about `albedo`: sunlit snow is some 20 000 cd/m², an
   * overcast sky 2 000, a fluorescent tube 10 000, and the Sun's own disc 1.6 × 10⁹.
   *
   * On a model rather than a primitive it sets the brightness of whatever the model already says
   * glows — its lit windows, its glowing hull — keeping each one's own colour, and leaves the rest
   * of it dark.
   */
  luminanceCdM2?: number
  /**
   * How much of what is behind it shows through, 0 (opaque, the default) to 1 (gone): the same
   * statement a drawn shape's transparency makes, for a body of the scene. Blended between keyframes,
   * so a body that fades out does it over the interval that says so.
   */
  transparency?: number
  /**
   * How far the glare it throws round itself reaches, as a multiple of what its light gives (1, the
   * default): 0 puts the glare out, 2 doubles its width. Only a body that gives out light of its own
   * has a glare to scale. Blended between keyframes.
   */
  haloScale?: number
}
