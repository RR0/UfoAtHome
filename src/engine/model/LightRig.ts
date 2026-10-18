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
  /**
   * The size of the machine its offsets were written for, metres: the lamps of an object drawn at another size (a model, or a size
   * the recording states) are carried to the same places on it, a wingtip light staying on the wingtip. Absent: the offsets are absolute.
   */
  referenceSizeM?: { widthM: number, heightM: number, lengthM: number }
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
    referenceSizeM: { widthM: 34, heightM: 12, lengthM: 36 },
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
    referenceSizeM: { widthM: 10, heightM: 4, lengthM: 14 },
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
    referenceSizeM: { widthM: 1.8, heightM: 1.5, lengthM: 4.5 },
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
    referenceSizeM: { widthM: 1.8, heightM: 1.5, lengthM: 4.5 },
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
    referenceSizeM: { widthM: 1.8, heightM: 1.5, lengthM: 4.5 },
    create: () => [
      { id: "beacon-blue", offsetM: { x: -0.4, y: 1.6, z: 0 }, color: BEACON_BLUE, intensity: 2.5, pattern: { kind: "flash", perMinute: 120, dutyCycle: 0.1 } },
      { id: "beacon-red", offsetM: { x: 0.4, y: 1.6, z: 0 }, color: TAIL_RED, intensity: 2.5, pattern: { kind: "flash", perMinute: 120, dutyCycle: 0.1, phase: 0.5 } }
    ]
  },
  {
    id: "traffic-signal",
    name: "Traffic light",
    kinds: ["trafficlight"],
    create: () => TrafficSignals.vehicleLights(0)
  },
  {
    id: "pedestrian-signal",
    name: "Pedestrian light",
    kinds: ["trafficlight"],
    create: () => TrafficSignals.pedestrianLights(0)
  },
  {
    id: "streetlamp",
    name: "Streetlamp",
    kinds: ["streetlight"],
    referenceSizeM: { widthM: 1, heightM: 5, lengthM: 1 },
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

/**
 * The cycle of the traffic lights of a junction, as lamps (see DecorLight): which of them is lit when.
 *
 * Nobody knows the timing of a given junction, and the map does not say it: this is a plausible one, the same everywhere, so that what a scene
 * shows of a light is what such a light does. A cycle of ninety seconds in two phases, the usual cycle of a town's junction: the traffic of one of
 * two crossing roads has its green for 41 s, its amber for 3 s (the amber of a French town), and a second when every way is red before the other
 * road's green. A pedestrian crossing a road has a green of its own while that road's traffic is stopped. Which phase a light is in is told by the
 * direction of its road (see phaseOf), so that two opposite approaches are green together and two crossing ones never.
 */
export class TrafficSignals {
  static readonly CYCLE_S = 90
  static readonly GREEN_S = 41
  static readonly AMBER_S = 3
  /** When a pedestrian's green begins after the traffic it crosses turned red, and how long it lasts. */
  static readonly PEDESTRIAN_DELAY_S = 2
  static readonly PEDESTRIAN_GREEN_S = 30
  /** A traffic light's three lenses of 200 mm: some three hundred candela on its axis, as EN 12368 has them; a pedestrian's less. */
  static readonly VEHICLE_INTENSITY = 3
  static readonly PEDESTRIAN_INTENSITY = 1.5
  static readonly LENS_RADIUS_M = 0.1
  /** The angle off its axis where a lens gives half its light: a wide-beam head, seen from the pavement across the road and not from behind. */
  static readonly BEAM_DEG = 30
  /** Where the lamps of a head are on the post, metres up, and how far in front of the post their lenses are. */
  static readonly VEHICLE_HEAD_Y_M = 2.9
  static readonly PEDESTRIAN_HEAD_Y_M = 2.6
  static readonly LENS_SPACING_M = 0.3
  static readonly LENS_FRONT_M = 0.13
  /** The regulated colours: a red, a yellow-amber, a green that leans to blue. */
  static readonly RED = "#ff1e00"
  static readonly AMBER = "#ffa200"
  static readonly GREEN = "#00ff8c"

  /** The phase of a road by its direction: one of two crossing roads (within 45 degrees of north-south, else east-west). */
  static phaseOf(roadHeadingDeg: number): 0 | 1 {
    const axis = ((roadHeadingDeg % 180) + 180) % 180
    return axis >= 45 && axis < 135 ? 1 : 0
  }

  /** The three lamps of the head that stops the traffic of a road of phase `phase`. */
  static vehicleLights(phase: 0 | 1): DecorLight[] {
    const start = phase * TrafficSignals.CYCLE_S / 2
    const y = TrafficSignals.VEHICLE_HEAD_Y_M
    const step = TrafficSignals.LENS_SPACING_M
    return [
      TrafficSignals.lamp("red", TrafficSignals.RED, y + step, start + TrafficSignals.GREEN_S + TrafficSignals.AMBER_S, TrafficSignals.CYCLE_S - TrafficSignals.GREEN_S - TrafficSignals.AMBER_S, TrafficSignals.VEHICLE_INTENSITY),
      TrafficSignals.lamp("amber", TrafficSignals.AMBER, y, start + TrafficSignals.GREEN_S, TrafficSignals.AMBER_S, TrafficSignals.VEHICLE_INTENSITY),
      TrafficSignals.lamp("green", TrafficSignals.GREEN, y - step, start, TrafficSignals.GREEN_S, TrafficSignals.VEHICLE_INTENSITY)
    ]
  }

  /** The two lamps of the head of a crossing over a road of phase `phase`: green while that road's traffic is stopped. */
  static pedestrianLights(phase: 0 | 1): DecorLight[] {
    const green = phase * TrafficSignals.CYCLE_S / 2 + TrafficSignals.GREEN_S + TrafficSignals.AMBER_S + TrafficSignals.PEDESTRIAN_DELAY_S
    const y = TrafficSignals.PEDESTRIAN_HEAD_Y_M
    const half = TrafficSignals.LENS_SPACING_M / 2
    return [
      TrafficSignals.lamp("ped-red", TrafficSignals.RED, y + half, green + TrafficSignals.PEDESTRIAN_GREEN_S, TrafficSignals.CYCLE_S - TrafficSignals.PEDESTRIAN_GREEN_S, TrafficSignals.PEDESTRIAN_INTENSITY),
      TrafficSignals.lamp("ped-green", TrafficSignals.GREEN, y - half, green, TrafficSignals.PEDESTRIAN_GREEN_S, TrafficSignals.PEDESTRIAN_INTENSITY)
    ]
  }

  /** Whether these lamps are a pedestrian's head (two lenses) rather than the traffic's (three). */
  static isPedestrian(lights: readonly DecorLight[] | undefined): boolean {
    return lights?.some(light => light.id === "ped-green") ?? false
  }

  /** One lens, lit from `fromS` into the cycle for `forS` seconds (see lightOnFractionBetween: lit while frac(t / period + phase) < duty). */
  private static lamp(id: string, color: string, y: number, fromS: number, forS: number, intensity: number): DecorLight {
    const cycle = TrafficSignals.CYCLE_S
    const phase = Math.round((((1 - fromS / cycle) % 1) + 1) % 1 * 1e6) / 1e6
    return {
      id, color, intensity, radiusM: TrafficSignals.LENS_RADIUS_M, beamDeg: TrafficSignals.BEAM_DEG,
      // In front of the head, which is where the object's heading points: its −z, as the front of every decor object is.
      offsetM: { x: 0, y, z: -TrafficSignals.LENS_FRONT_M },
      pattern: { kind: "flash", perMinute: 60 / cycle, dutyCycle: Math.round(forS / cycle * 1e6) / 1e6, ...(phase ? { phase } : {}) }
    }
  }
}
