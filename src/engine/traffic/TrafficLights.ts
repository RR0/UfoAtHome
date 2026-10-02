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
 * NOT MODELLED: the landing lights, which an airliner turns on below 3 000 m: they are narrow beams, seen from the
 * front and from nowhere else, and a lamp the scene can only draw all round would be a false light from behind.
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

  /** The colour of the airframe, which decides what the Sun lays on it: the white and the silver of a livery, a grey for a military one. */
  static bodyColor(model: AircraftModel): string {
    if (model.kind === "military-jet") return "#8a8e94"
    if (model.kind.startsWith("helicopter")) return "#c8ccd1"
    if (model.kind === "unmanned") return "#2c2e33"
    return "#dde0e4"
  }
}
