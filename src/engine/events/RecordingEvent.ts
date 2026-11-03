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
  /** Whom it is about: "observer" (the default). */
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

/**
 * The phenomenon stands at a place the observer stated (`who` "phenomenon"): its direction in their sky is read from there at every instant,
 * and its size from `metres`, its width and its height above the observer's eye, which may change (a reconstitution fitted to what they
 * pointed at). How it looks is said by `look`.
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
  widthShare: number
  /** An oval's is its width. */
  heightShare?: number
  minWidthDeg?: number
  minHeightDeg?: number
  alongShare?: number
  upShare?: number
}

/** How the phenomenon looks from `t` on (as the observer drew it): its parts. A part another look has and this one has not is not seen. */
export interface LookParams {
  parts: LookPart[]
}

/** Parts of the phenomenon blink: on for `onS`, then off for `offS`, from the event's start; off, they take `off` (null takes a field away). */
export interface BlinkParams {
  parts: string[]
  onS: number
  offS: number
  off: { color?: string, transparency?: number, brightness?: number | null }
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
