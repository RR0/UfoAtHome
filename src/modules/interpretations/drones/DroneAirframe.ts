/**
 * What a drone is built as: its size, how it flies and the lights it carries, as the models of scripts/build-drones.ts draw it.
 *
 * Three builds, for the three kinds of drone accounts are about:
 *
 * - "quadcopter": the consumer multirotor most drone sightings are (or are said to be): four rotors on folding arms, a DJI Mavic 3's
 *   size (347 × 283 × 107 mm unfolded without its rotors, 0.51 × 0.49 m with them), its top speed 21 m/s and its tilt at most 35° (DJI's published figures). It holds a point in the
 *   air to ±0.5 m by satellite positioning (DJI: ±0.5 m vertical, ±0.5 m horizontal with GNSS), turns on the spot, and leans into where
 *   it goes and into the wind. Its lights are those of the type: two red at the front arms, a status light at the back that blinks green,
 *   and a white anti-collision strobe on top, which the FAA has required to fly at night since 2021 (14 CFR 107.29: visible for at least
 *   3 statute miles).
 * - "saucer": a multirotor in a disc, the "drufo" hobbyists build or buy to be taken for a flying saucer (an umbrella pair round a quad, a
 *   foam disc with its rotors inside): 0.8 m across, 0.2 m tall, ringed with coloured LEDs and lit under. Its size, colours and speed are
 *   SUPPOSED, from photographs of such builds; it flies as a multirotor does.
 * - "fixed-wing": a small military or survey drone with a wing and a pusher propeller, 3.6 m of span and 1.9 m long (a WB Electronics
 *   FlyEye's, the Polish army's), cruising at 20 m/s: it cannot hover, and banks to turn as an aeroplane does. Its navigation lights are
 *   an aeroplane's (red on the left wingtip, green on the right, white at the tail) and its strobe white; a military one may fly dark,
 *   which its interpretation says by putting them out.
 *
 * The brightness of every light is SUPPOSED, as an intensity, candela (see DroneLight): a 5 mm LED gives some 0.5 to 5 cd; a strobe the
 * FAA's 3 miles ask for has to give at least about 5 cd at night (an eye's threshold of some 2 × 10⁻⁷ lux at 4.8 km), and the strobes sold
 * for drones claim several times that, hence 40 cd.
 */
export interface DroneAirframe {
  id: DroneAirframeId
  /** The model of the catalogue it is drawn as (public/models/index.json). */
  modelId: string
  /** Its size as the model is built, rotors and lights included, metres: what a body states for it to be drawn at its own size. */
  sizeM: { widthM: number, lengthM: number, heightM: number }
  /** Whether it holds a point in the air and turns on the spot (a multirotor), or flies on a wing. */
  hovers: boolean
  /** Its top speed through the air, m/s, at which a multirotor leans its most (see maxTiltDeg). */
  maxSpeedMS: number
  /** How far a multirotor leans at its top speed, degrees: what the drag it then pushes against takes of its thrust. */
  maxTiltDeg: number
  /** How far it strays from where it is told to be, metres, sideways and up: satellite positioning's own error. */
  holdM: { horizontalM: number, verticalM: number }
  /** How fast it turns its nose round, degrees a second. */
  yawRateDegS: number
  /** Its hull's colour, CSS, which a recording may change (its `bodyColor`). */
  bodyColor: string
  /** Its lights, by the name a recording calls them (see DroneFlightJson.lights). */
  lights: Record<string, DroneLight>
}

export type DroneAirframeId = "quadcopter" | "saucer" | "fixed-wing"

/**
 * One light of a drone, or several alike (the two front LEDs of a quadcopter): what colour, how bright, and how it blinks. Each LED is a
 * material of its own in the model (`light-<name>`, `light-<name>-<n>` when there are several), so that each is a point of light of its
 * own where it is (see BodySystem.shineLights).
 */
export interface DroneLight {
  /** CSS. */
  color: string
  /** Its intensity, candela, each LED's: what is seen of it from afar. */
  candela: number
  /** How many times a second it flashes; steady when absent. */
  hz?: number
  /** How long each flash lasts, seconds: a strobe's are a few hundredths, a status light's half its period. Half the period when absent. */
  flashS?: number
  /** Where in its period it starts, 0 to 1. 0 when absent. */
  phase?: number
  /** Where each LED is on the model, metres (x right, y up, z backwards: the axes of BodySystem), and how big it is. */
  leds: { at: [number, number, number], radiusM: number }[]
  /** Off unless the recording lights it. On when absent. */
  off?: boolean
}

export class DroneAirframes {
  static readonly G = 9.81

  static readonly ALL: readonly DroneAirframe[] = [
    {
      id: "quadcopter",
      modelId: "ufoathome-drone-quadcopter",
      sizeM: { widthM: 0.508, lengthM: 0.493, heightM: 0.111 },
      hovers: true,
      maxSpeedMS: 21,
      maxTiltDeg: 35,
      holdM: { horizontalM: 0.5, verticalM: 0.5 },
      yawRateDegS: 120,
      bodyColor: "#5b5f63",
      lights: {
        front: { color: "#ff2a1a", candela: 1, leds: [{ at: [-0.125, -0.03, -0.14], radiusM: 0.004 }, { at: [0.125, -0.03, -0.14], radiusM: 0.004 }] },
        rear: { color: "#2aff5a", candela: 1, hz: 0.5, leds: [{ at: [0, 0.005, 0.135], radiusM: 0.004 }] },
        strobe: { color: "#ffffff", candela: 40, hz: 1.25, flashS: 0.06, leds: [{ at: [0, 0.055, 0.02], radiusM: 0.006 }] }
      }
    },
    {
      id: "saucer",
      modelId: "ufoathome-drone-saucer",
      sizeM: { widthM: 0.8, lengthM: 0.8, heightM: 0.206 },
      hovers: true,
      maxSpeedMS: 12,
      maxTiltDeg: 25,
      holdM: { horizontalM: 0.5, verticalM: 0.5 },
      yawRateDegS: 90,
      bodyColor: "#c9ccd0",
      lights: {
        rim: { color: "#4fd2ff", candela: 1, leds: DroneAirframes.ring(12, 0.388, 0, 0.012) },
        under: { color: "#ffffff", candela: 3, leds: [{ at: [0, -0.094, 0], radiusM: 0.02 }] },
        strobe: { color: "#ffffff", candela: 40, hz: 1.25, flashS: 0.06, off: true, leds: [{ at: [0, 0.1, 0], radiusM: 0.006 }] }
      }
    },
    {
      id: "fixed-wing",
      modelId: "ufoathome-drone-fixed-wing",
      sizeM: { widthM: 3.596, lengthM: 1.848, heightM: 0.53 },
      hovers: false,
      maxSpeedMS: 33,
      maxTiltDeg: 0,
      holdM: { horizontalM: 1, verticalM: 0.5 },
      yawRateDegS: 0,
      bodyColor: "#6f7568",
      lights: {
        "nav-left": { color: "#ff2a1a", candela: 2, leds: [{ at: [-1.79, 0.02, 0.05], radiusM: 0.008 }] },
        "nav-right": { color: "#2aff5a", candela: 2, leds: [{ at: [1.79, 0.02, 0.05], radiusM: 0.008 }] },
        tail: { color: "#ffffff", candela: 1, leds: [{ at: [0, 0.05, 0.94], radiusM: 0.008 }] },
        strobe: { color: "#ffffff", candela: 40, hz: 1, flashS: 0.06, leds: [{ at: [0, 0.16, -0.1], radiusM: 0.008 }] }
      }
    }
  ]

  static byId(id: string | undefined): DroneAirframe | undefined {
    return DroneAirframes.ALL.find(airframe => airframe.id === id)
  }

  /** The material of the `index`th LED of a light (see DroneLight): `light-<name>`, or `light-<name>-<n>` for one of several. */
  static materialOf(name: string, index: number, count: number): string {
    return count > 1 ? `light-${name}-${index + 1}` : `light-${name}`
  }

  /** The key of the model setting that colours a light (see the catalogue's bindings): `frontColor`, `navLeftColor`. */
  static colourKeyOf(name: string): string {
    return name.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase()) + "Color"
  }

  /** `count` LEDs round a ring of `radiusM` at height `y`, the first at the front. */
  private static ring(count: number, radiusM: number, y: number, ledM: number): { at: [number, number, number], radiusM: number }[] {
    return Array.from({ length: count }, (_, i) => {
      const a = (i / count) * 2 * Math.PI
      return { at: [Math.round(radiusM * Math.sin(a) * 1e4) / 1e4, y, Math.round(-radiusM * Math.cos(a) * 1e4) / 1e4] as [number, number, number], radiusM: ledM }
    })
  }
}
