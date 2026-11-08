import type { DecorLight } from "../model/Decor.js"
import { LIGHT_RIGS } from "../model/LightRig.js"
import type { AircraftKind, AircraftModel } from "./AircraftModels.js"

/** Which of an aircraft's lamps are lit. */
export interface LampsOn {
  navigation: boolean
  beacon: boolean
  strobes: boolean
}

/**
 * The lamps of an aircraft: which are lit, where they stand on its real size, and how bright.
 *
 * WHICH ARE LIT depends on what it is and on how dark it is. An airliner flies with its anti-collision
 * lights (the beacon and the wingtip strobes) and its navigation lights on at every hour: they are on
 * from engine start, whatever the Sun does. A light aircraft or a helicopter lights them from dusk, when the
 * Sun is under the horizon of the aircraft, and by day they are taken as off — a great many are on, but
 * nothing in a record says so, and a lamp invented is worse than a lamp left out. A glider and a balloon
 * carry none, a drone only its strobes, and from dusk.
 *
 * WHERE THEY STAND follows the wingspan and the length of the machine (the navigation lights on the wingtips and on the tail,
 * the strobes there too, the beacon on the fuselage), and HOW BRIGHT follows the class: a light aircraft's
 * strobe is a fifth of an airliner's, its navigation lights a half.
 *
 * THE LANDING LIGHTS are the one thing here that no record states: what a transponder sends says nothing of them. They are supposed, by the
 * common practice of switching them on under 10 000 ft (see landingLights), because leaving them out made an airliner climbing at 1.5 km at night
 * no brighter than a faint star, when they are what is seen of it from afar. They are narrow beams thrown ahead along its heading, so an
 * aircraft going away shows none; its pitch is not in the record, so a climb's beam is taken as level, which is its weakest case for an eye below.
 */
export class TrafficLights {
  /** The Sun's elevation at an aircraft's place under which it is dusk for its lamps, degrees: the horizon, the upper limb gone. */
  static readonly DUSK_SUN_ELEVATION_DEG = -0.83
  /** The kinds that fly lit at every hour. */
  private static readonly ALWAYS: ReadonlySet<AircraftKind> = new Set(["airliner-narrow", "airliner-wide", "regional-turboprop", "regional-jet", "business-jet"])
  private static readonly NONE: ReadonlySet<AircraftKind> = new Set(["glider", "balloon"])
  /** Brightness against an airliner's: [navigation, strobes, beacon]. */
  private static readonly BRIGHTNESS: Partial<Record<AircraftKind, [number, number, number]>> = {
    "light-piston": [0.5, 0.2, 0.5], "turboprop-light": [0.7, 0.4, 0.8], "ultralight": [0.4, 0.2, 0.4], "unmanned": [0, 0.05, 0],
    "helicopter-light": [1, 1, 1], "helicopter-medium": [1, 1, 1], "helicopter-heavy": [1, 1, 1], "military-jet": [1, 1, 1]
  }

  /** The height under which the landing lights are taken as on, feet: the common practice, which no record states. */
  static readonly LANDING_LIGHTS_BELOW_FT = 10_000
  /** A landing light's peak against a navigation light's (see DecorLight.intensity): sixty thousand candela. */
  private static readonly LANDING_INTENSITY = 600
  /** The angle off its axis at which it gives half its light, degrees. */
  private static readonly LANDING_BEAM_DEG = 10
  private static readonly LANDING_COLOR = "#fff1dc"
  /** Against an airliner's. A kind absent carries none that can be told: a military aircraft's practice is its own. */
  private static readonly LANDING_BRIGHTNESS: Partial<Record<AircraftKind, number>> = {
    "airliner-narrow": 1, "airliner-wide": 1, "regional-jet": 0.6, "regional-turboprop": 0.6, "business-jet": 0.4,
    "turboprop-light": 0.2, "light-piston": 0.1, "ultralight": 0.05,
    "helicopter-light": 0.1, "helicopter-medium": 0.2, "helicopter-heavy": 0.2
  }

  /** Which lamps are lit on a machine of that kind when the Sun stands at `sunElevationDeg` over its horizon. */
  static lampsOn(kind: AircraftKind, sunElevationDeg: number): LampsOn {
    if (TrafficLights.NONE.has(kind)) return { navigation: false, beacon: false, strobes: false }
    if (TrafficLights.ALWAYS.has(kind)) return { navigation: true, beacon: true, strobes: true }
    const dusk = sunElevationDeg < TrafficLights.DUSK_SUN_ELEVATION_DEG
    if (kind === "unmanned") return { navigation: false, beacon: false, strobes: dusk }
    return { navigation: dusk, beacon: dusk, strobes: dusk }
  }

  /** The lamps of `model`, those that are lit at that elevation of the Sun, placed on its size. */
  static lights(model: AircraftModel, sunElevationDeg: number): DecorLight[] {
    const on = TrafficLights.lampsOn(model.kind, sunElevationDeg)
    const helicopter = model.kind.startsWith("helicopter")
    const rig = LIGHT_RIGS.find(candidate => candidate.id === (helicopter ? "helicopter" : "airliner"))!.create()
    // The rigs are drawn for an A320 (half-span 17 m, tail 18 m behind) and an H135 (half-rotor 5 m, tail 7 m behind).
    const [baseHalfSpan, baseHalfLength] = helicopter ? [5, 7] : [17, 18]
    const across = model.spanM / 2 / baseHalfSpan
    const along = model.lengthM / 2 / baseHalfLength
    const [navigation, strobes, beacon] = TrafficLights.BRIGHTNESS[model.kind] ?? [1, 1, 1]
    return rig
      .filter(light => light.id.startsWith("nav") ? on.navigation : light.id.startsWith("strobe") ? on.strobes : light.id.startsWith("beacon") ? on.beacon : true)
      .filter(light => !(light.id.startsWith("beacon") && !on.beacon))
      .map(light => {
        const scale = light.id.startsWith("nav") ? navigation : light.id.startsWith("strobe") ? strobes : beacon
        return {
          ...light,
          offsetM: { x: light.offsetM.x * across, y: light.offsetM.y, z: light.offsetM.z * along },
          intensity: (light.intensity ?? 1) * scale
        }
      })
      .filter(light => (light.intensity ?? 1) > 0)
  }

  /**
   * The landing lights of `model` on a flight, switched by height as it goes: at `t` in ms from the start of the recording, as `flight` gives it. None for a
   * flight that never comes under the height, for what carries none, and, for what is only lit from dusk, by day.
   */
  static landingLights(model: AircraftModel, sunElevationDeg: number, flight: readonly { t: number; altitudeFt: number }[]): DecorLight[] {
    const brightness = TrafficLights.LANDING_BRIGHTNESS[model.kind] ?? 0
    if (brightness === 0 || !TrafficLights.lampsOn(model.kind, sunElevationDeg).navigation) return []
    const lit = (altitudeFt: number) => altitudeFt < TrafficLights.LANDING_LIGHTS_BELOW_FT
    if (!flight.some(point => lit(point.altitudeFt))) return []
    const intensity = TrafficLights.LANDING_INTENSITY * brightness
    const keyframes = flight.flatMap((point, index) =>
      index > 0 && lit(point.altitudeFt) !== lit(flight[index - 1].altitudeFt) ? [{ t: point.t, intensity: lit(point.altitudeFt) ? intensity : 0 }] : [])
    const across = model.spanM / 34
    const along = model.lengthM / 36
    return [-1, 1].map(side => ({
      id: side < 0 ? "landing-left" : "landing-right",
      offsetM: { x: side * 5 * across, y: -1, z: 3 * along },
      color: TrafficLights.LANDING_COLOR,
      intensity: lit(flight[0].altitudeFt) ? intensity : 0,
      pattern: { kind: "steady" as const },
      beamDeg: TrafficLights.LANDING_BEAM_DEG,
      keyframes
    }))
  }

  /** The colour of the airframe, which decides what the Sun lays on it: the white and the silver of a livery, a grey for a military one. */
  static bodyColor(model: AircraftModel): string {
    if (model.kind === "military-jet") return "#8a8e94"
    if (model.kind.startsWith("helicopter")) return "#c8ccd1"
    if (model.kind === "unmanned") return "#2c2e33"
    return "#dde0e4"
  }
}
