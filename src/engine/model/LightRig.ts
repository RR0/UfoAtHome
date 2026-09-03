import type { DecorKind, DecorLight } from "./Decor.js"

/**
 * A ready-made set of lamps for a kind of object — what you pick instead of entering a flash rate
 * by hand.
 *
 * These numbers are not decoration. An aircraft's anticollision lights are required to flash
 * between 40 and 100 times a minute, and a road vehicle's hazard flashers between 60 and 120; the
 * values below are representative figures inside those ranges, and an author who knows the actual
 * aircraft can change them. What matters is that the RATE is real, because on a long exposure the
 * spacing of the dots along the streak is that rate times the object's angular speed — which is
 * exactly the arithmetic by which a photograph of a passing airliner is told from a photograph of
 * something that does not blink.
 *
 * A rig is data, and deliberately so: a catalogue of specific aircraft or specific vehicles is more
 * entries here, never more code (same principle as INSTRUMENTS, see Instrument.ts).
 */
export interface LightRig {
  /** Stable id — what a case file names. */
  id: string
  /** Short name for the picker. */
  name: string
  /** Which decor kinds this rig makes sense on; a picker offers only the matching ones. */
  kinds: DecorKind[]
  /** Built fresh on each use, so an object owns its own lamps and can then be edited. */
  create(): DecorLight[]
}

/** Regulated navigation colours, named once rather than repeated as hex literals. */
const PORT_RED = "#ff2200"
const STARBOARD_GREEN = "#00ff44"
const WHITE = "#ffffff"
const AMBER = "#ffa500"
const TAIL_RED = "#ff0000"
const BEACON_BLUE = "#2244ff"

export const LIGHT_RIGS: LightRig[] = [
  {
    id: "airliner",
    name: "Airliner",
    kinds: ["aircraft"],
    // Half-span 17 m, tail 18 m behind the centre: a narrow-body of the 737/A320 class, which is
    // what most "it had lights in a row" photographs turn out to be.
    create: () => [
      { id: "nav-port", offsetM: { x: -17, y: 0, z: 0 }, color: PORT_RED, pattern: { kind: "steady" } },
      { id: "nav-starboard", offsetM: { x: 17, y: 0, z: 0 }, color: STARBOARD_GREEN, pattern: { kind: "steady" } },
      { id: "nav-tail", offsetM: { x: 0, y: 1, z: -18 }, color: WHITE, pattern: { kind: "steady" } },
      // The rotating red beacon, above and below the fuselage. Long dwell, so it reads on a photo
      // as a comma rather than a point.
      { id: "beacon-top", offsetM: { x: 0, y: 2, z: 0 }, color: TAIL_RED, intensity: 1.5, pattern: { kind: "flash", perMinute: 45, dutyCycle: 0.18 } },
      { id: "beacon-bottom", offsetM: { x: 0, y: -2, z: 0 }, color: TAIL_RED, intensity: 1.5, pattern: { kind: "flash", perMinute: 45, dutyCycle: 0.18 } },
      // Wingtip strobes: very bright, very brief, and deliberately out of phase with each other —
      // which is what puts PAIRS of dots along a streak rather than single ones. Twenty, because
      // `intensity` is a ratio of peak candela and a wingtip strobe really is some two thousand
      // against a position light's hundred — and it is that ratio, not the flash itself, that makes
      // its dots stand out on a long pose against the line the steady lamps draw.
      { id: "strobe-port", offsetM: { x: -17, y: 0, z: -1 }, color: WHITE, intensity: 20, pattern: { kind: "flash", perMinute: 60, dutyCycle: 0.01 } },
      { id: "strobe-starboard", offsetM: { x: 17, y: 0, z: -1 }, color: WHITE, intensity: 20, pattern: { kind: "flash", perMinute: 60, dutyCycle: 0.01, phase: 0.08 } }
    ]
  },
  {
    id: "helicopter",
    name: "Helicopter",
    kinds: ["aircraft"],
    // Same lamps, a much smaller frame — and it is the TRACK, not the body, that makes a helicopter
    // read as one: it can hover, which an aeroplane cannot, and a hovering strobe piles its dots in
    // one place instead of spreading them.
    create: () => [
      { id: "nav-port", offsetM: { x: -5, y: 0, z: 0 }, color: PORT_RED, pattern: { kind: "steady" } },
      { id: "nav-starboard", offsetM: { x: 5, y: 0, z: 0 }, color: STARBOARD_GREEN, pattern: { kind: "steady" } },
      { id: "nav-tail", offsetM: { x: 0, y: 1, z: -7 }, color: WHITE, pattern: { kind: "steady" } },
      { id: "beacon", offsetM: { x: 0, y: 2, z: -2 }, color: TAIL_RED, intensity: 1.5, pattern: { kind: "flash", perMinute: 45, dutyCycle: 0.2 } },
      { id: "strobe", offsetM: { x: 0, y: -1, z: 0 }, color: WHITE, intensity: 15, pattern: { kind: "flash", perMinute: 75, dutyCycle: 0.015 } }
    ]
  },
  {
    id: "car-headlights",
    name: "Car, headlights on",
    kinds: ["vehicle"],
    create: () => [
      { id: "head-left", offsetM: { x: -0.7, y: 0.6, z: 2 }, color: WHITE, intensity: 2, pattern: { kind: "steady" } },
      { id: "head-right", offsetM: { x: 0.7, y: 0.6, z: 2 }, color: WHITE, intensity: 2, pattern: { kind: "steady" } },
      { id: "tail-left", offsetM: { x: -0.7, y: 0.6, z: -2 }, color: TAIL_RED, pattern: { kind: "steady" } },
      { id: "tail-right", offsetM: { x: 0.7, y: 0.6, z: -2 }, color: TAIL_RED, pattern: { kind: "steady" } }
    ]
  },
  {
    id: "car-hazards",
    name: "Car, hazard flashers",
    kinds: ["vehicle"],
    // Around 1.5 Hz at roughly half duty: the slow, soft blink of a filament flasher, nothing like
    // a strobe. On a long exposure it draws long dashes rather than dots.
    create: () => [
      { id: "hazard-front-left", offsetM: { x: -0.8, y: 0.6, z: 2 }, color: AMBER, pattern: { kind: "flash", perMinute: 90, dutyCycle: 0.5 } },
      { id: "hazard-front-right", offsetM: { x: 0.8, y: 0.6, z: 2 }, color: AMBER, pattern: { kind: "flash", perMinute: 90, dutyCycle: 0.5 } },
      { id: "hazard-rear-left", offsetM: { x: -0.8, y: 0.6, z: -2 }, color: AMBER, pattern: { kind: "flash", perMinute: 90, dutyCycle: 0.5 } },
      { id: "hazard-rear-right", offsetM: { x: 0.8, y: 0.6, z: -2 }, color: AMBER, pattern: { kind: "flash", perMinute: 90, dutyCycle: 0.5 } }
    ]
  },
  {
    id: "emergency-beacons",
    name: "Emergency vehicle beacons",
    kinds: ["vehicle"],
    create: () => [
      { id: "beacon-blue", offsetM: { x: -0.4, y: 1.6, z: 0 }, color: BEACON_BLUE, intensity: 2.5, pattern: { kind: "flash", perMinute: 120, dutyCycle: 0.1 } },
      { id: "beacon-red", offsetM: { x: 0.4, y: 1.6, z: 0 }, color: TAIL_RED, intensity: 2.5, pattern: { kind: "flash", perMinute: 120, dutyCycle: 0.1, phase: 0.5 } }
    ]
  },
  {
    id: "streetlamp",
    name: "Streetlamp",
    kinds: ["streetlight"],
    create: () => [{ id: "lamp", offsetM: { x: 0, y: 5, z: 0 }, color: "#ffd9a0", intensity: 2, pattern: { kind: "steady" } }]
  }
]

export class LightRigs {
  /** The rigs that make sense on this kind of object — what a picker offers. */
  static forKind(kind: DecorKind): LightRig[] {
    return LIGHT_RIGS.filter(rig => rig.kinds.includes(kind))
  }

  /** Looks one up by id; undefined for an unknown id, since "no rig" is a real answer here (most
   * scenery has no lamps at all) rather than something to fall back from. */
  static byId(id: string | undefined): LightRig | undefined {
    return LIGHT_RIGS.find(rig => rig.id === id)
  }
}
