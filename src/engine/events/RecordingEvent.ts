import type { SaidText } from "../model/SaidText.js"

/**
 * What an actor of a recording did, stated as an event with its parameters instead of the values it implies: "T1 drives along the RN2 at
 * these speeds", "he keeps the phenomenon in the corner of his eye", "he leans to his mirror". The values (the observer's poses, the van's
 * place) are worked out when the recording is read (see RecordingEvents), by the same law for every recording, so that an author states
 * a dozen sentences instead of two thousand keyframes, and changes one by changing a parameter.
 *
 * As RR0 writes an event (@rr0/data's RR0EventJson, `type: "event"` and an `eventType`), with what UFO@home needs of it: who it is about,
 * and when in the recording (ms from its start, as every track counts), not a calendar time. Its parameters are values like any other: bare,
 * or with their provenance (`{ value, basis, rationale }`, see Provenance), which is where a speed says it is the reconstitution's.
 */
export interface RecordingEventJson {
  type?: "event"
  /** What kind of event: "drive", "lookAhead", "lean", "watch" (see RecordingEvents). */
  eventType: string
  /**
   * Whom it is about, by an id of the recording (see RecordingActors): the observer's (`observer.id`, the default when it is read), a shape's
   * or a group of shapes' of the account (the phenomenon, or the part of it that does this: a group of lights that blink), a body's of the
   * interpretation, a decor object's; or one part of a body's model, `id/part` (a node, a bone, a light: "craft/legs", "engin/front-red"), or
   * a group of its parts, `id/group` (see BodyJson.groups). Always written.
   */
  who?: string
  /** When it starts, ms from the start of the recording. */
  t: number
  /** When it ends, ms: the end of the recording when absent. */
  until?: number
  /** What it was, as the kind of event says (see each one's parameters). */
  params?: Record<string, unknown>
}

/** A place on the ground. */
export interface EventPlace {
  lat: number
  lng: number
}

/** A point in a vehicle's model, metres: x to the right, y up from the ground, the front towards −z (see DecorModelProvider). */
export interface VehiclePoint {
  x: number
  y: number
  z: number
}

/**
 * The observer drives: the vehicle (a decor object of the recording, which moves with them) follows `path` at `speeds`, and the observer's eye
 * is at `eye` in it. Where along the path is fixed by one place it went through at one instant (`through`); the rest follows from the
 * speeds.
 */
export interface DriveParams {
  /** The decor object the observer is in, whose track this writes. */
  vehicle?: string
  /** The way it followed, from its first point on (a carriageway as a survey draws it). */
  path: EventPlace[]
  /** Its speed, km/h, at instants of the recording: linear between them, held before the first and after the last. */
  speeds: { t: number, kmh: number }[]
  /** Factors its speeds are divided by, at instants of the recording, linear between them: a reading of the same driving at another pace. */
  speedDivisors?: { t: number, divisor: number }[]
  /** A place on the path it went through, and when: the rest of the drive is placed from it. */
  through: EventPlace & { t: number }
  /** Where the driver's eye is in the vehicle's model. */
  eye: VehiclePoint
  /** The observer's field of view meanwhile, degrees (60 when absent: an eye). */
  fovDeg?: number
}

/**
 * A decor object flies (an aircraft, `who` its id): along a straight line that ends at `from`, on `headingDeg`, at `speeds`, `metresBefore`
 * that place at the instant `at.t`; at `heights` above the observer's eye. Its track is written every two seconds, as a recording's tracks
 * are.
 */
export interface FlyParams {
  /** Where its line leads: a runway's threshold. */
  from: EventPlace
  /** Which way it flies, degrees from north. */
  headingDeg: number
  /** Its ground speed, km/h, at instants of the recording: linear between them, held beyond. */
  speeds: { t: number, kmh: number }[]
  /** How far before `from` it is at one instant. */
  at: { t: number, metresBefore: number }
  /** How high above the observer's eye, m, at instants of the recording: linear between them, held beyond. */
  heights: { t: number, altitudeM: number }[]
}

/** The observer holds a look (`look` with `who` the observer): where they look, from the event's start on (until another look or a follow turns them). */
export interface HoldLookParams {
  headingDeg: number
  pitchDeg: number
  /** Their field of view, degrees (60 when absent: an eye). */
  fovDeg?: number
}

/** The observer walks from `from` to `to`, from the event's start to its end, as a person walks (see HumanMotion.paced and Gait). */
export interface WalkParams {
  from: EventPlace
  to: EventPlace
}

/**
 * The observer follows a body of the recording with their eyes (`target`, its id), from the event's start to its end: they look at it at each of
 * the body's keyframes in between, so that it is in the middle of what they see; between those, their look turns as a head does (see
 * HumanMotion.gaze), which is all the lag eyes have on what they follow.
 */
export interface FollowParams {
  target: string
  /** A phenomenon going across the sky (see TravelParams): how long after the event's start the observer reacts, s; 0 when absent. */
  reactionS?: number
  /** How far behind it the eyes are as they follow it, s; 0 when absent. */
  lagS?: number
}

/**
 * A body of the interpretation (`who`, its id) plays one of its model's movements once (`motion`): from where it was to `to`, between the
 * event's start and its end. What moves (the central tube drawn into the hull) is the model's: the event says when, and how far.
 */
export interface MotionParams {
  motion: string
  to: number
}

/**
 * A body keeps one of its model's movements turning (`spin`): `turnsPerS` turns a second, from the event's start to its end. Or, an event about
 * a part of it (`who` "craft/legs"), that part turns about its own upright axis, `turnsPerS` turns a second, clockwise seen from its top
 * (negative the other way), and no `motion` is needed: the legs turning under the hull.
 */
export interface SpinParams {
  motion?: string
  turnsPerS: number
}

/**
 * A body rises (`rise`): `distanceM` along a straight line `angleDeg` off the vertical (0, straight up), towards `headingDeg`, between the event's
 * start and its end. Starting from still, it either `stops` at the end, slowing down into it, or keeps going faster and faster (a departure).
 */
export interface RiseParams {
  distanceM: number
  angleDeg: number
  headingDeg?: number
  stops?: boolean
}

/** A body turns to face `headingDeg` (`turn`), between the event's start and its end. */
export interface TurnParams {
  /** The heading it turns to; for a part of it (`who` "etre-2/head"), how far it turns from where its model has it, clockwise seen from its
   * top: a head turned to its right, 90. */
  headingDeg: number
}

/** A body is carried by another (`ride`, `in` its id): it goes where that one goes, `aboveM` higher (a passenger in the craft), and goes with it. */
export interface RideParams {
  in: string
  aboveM: number
}

/**
 * The phenomenon stands at a place the observer stated (`who` the shape or the group of shapes it is drawn as): its direction in their sky is read from there at every instant,
 * and its size from `metres`, its width and its height above the observer's eye, which may change (a reconstitution fitted to what they
 * pointed at). How it looks is said by `appearance`.
 */
export interface StandParams {
  place: EventPlace
  /** Its width and its height above the eye, m, at instants of the recording: linear between them, held beyond. */
  metres: { t: number, widthM: number, heightM: number }[]
}

/**
 * One part of how the phenomenon looks: a shape of the account, placed and sized in shares of the phenomenon's width as it appears (its
 * angular width at that instant): `alongShare` along it from its middle (negative to the left), `upShare` above it.
 */
export interface LookPart {
  sourceId: string
  title?: SaidText
  kind: "oval" | "polygon"
  /** A polygon's outline, in shares of its own box, x to the right and y down. */
  points?: { x: number, y: number }[]
  color: string
  brightness?: number
  halo?: number
  /** How much of what is behind it shows through: 0 none, 1 all. */
  transparency?: number
  /** How soft its edge is: 0 sharp, 1 none. */
  blur?: number
  widthShare: number
  /** An oval's is its width. */
  heightShare?: number
  minWidthDeg?: number
  minHeightDeg?: number
  alongShare?: number
  upShare?: number
}

/** How the phenomenon looks from `t` on (`appearance`, as the observer drew it): its parts. A part another appearance has and this one has not is not seen. */
export interface AppearanceParams {
  parts: LookPart[]
}

/**
 * What the event is about blinks, from its start to its end: on for `onS`, then off for `offS`, and so on. The account's shapes (`who` one or a
 * group of them) take `off` while off (null takes a field away). A light of a body's model, or a group of them (`who` "engin/front-red",
 * "engin/rear"), is lit at `cdM2` while on, or at what it was lit at before when it says none, and dark while off; once the event ends, it is
 * lit again as it was before it. A light goes on or off at once: a blink is never a fade.
 */
export interface BlinkParams {
  onS: number
  offS: number
  off?: { color?: string, transparency?: number, brightness?: number | null }
  /** A light's luminance while on, cd/m². */
  cdM2?: number
}

/**
 * A light of a body's model, or a group of them (`who` "engin/front-white-left", "engin/front"), is lit at `cdM2` from the event's start (0:
 * switched off), and, at its end when it states one, lit again as it was before it. At once, as a light is switched.
 */
export interface LightParams {
  cdM2: number
}

/**
 * The observer looks down the road, and keeps what they watch in the corner of their eye: while it is within `glanceBeyondDeg` of the vehicle's
 * axis, they turn only as far as keeps it within about `keepDeg` of where they look; further off, they glance at it for `glanceS`, then look
 * back at the road for `roadS`, and so on.
 */
export interface LookAheadParams {
  /** Where what they watch is: its direction is read from there. */
  target: EventPlace
  /** How much of the phenomenon's height (from the account's shapes) the look rises to: below 1, it keeps the road in view. */
  pitchShare?: number
  keepDeg: number
  glanceBeyondDeg: number
  glanceS: number
  roadS: number
}

/** The observer leans towards the vehicle's mirror to see in it: their eye moves by `offsetM` (in the vehicle's frame) over `turnS`, for `holdS`. */
export interface LeanParams {
  offsetM: VehiclePoint
  holdS: number
  turnS: number
}

/**
 * The observer watches what they follow in the vehicle's mirror: `firstS` at first, then the mirror for `mirrorS` between looks away, which
 * are glances at it over the shoulder (`glanceS`) every other time until `glancesUntil`, and the road (`roadS`) otherwise.
 */
export interface WatchParams {
  /** The centre of the mirror's glass, in the vehicle's model. */
  mirror: VehiclePoint
  /** Where what they watch is, for the glances over the shoulder. */
  target: EventPlace
  pitchShare?: number
  firstS: number
  mirrorS: number
  glanceS: number
  roadS: number
  /** Until when they still glance at it directly, ms. */
  glancesUntil: number
}
