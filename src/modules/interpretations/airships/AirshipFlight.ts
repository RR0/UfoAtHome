import type { SaidText } from "../../../engine/model/SaidText.js"
import type { BodyJson, BodyKeyframe } from "../../../engine/interpretation/Interpretation.js"
import { DroneFlight, DronePath } from "../drones/DroneFlight.js"
import type { DroneWaypoint } from "../drones/DroneFlight.js"
import type { DroneLight } from "../drones/DroneAirframe.js"
import { DroneAirframes } from "../drones/DroneAirframe.js"
import { AirshipTypes } from "./AirshipType.js"
import type { AirshipType, AirshipTypeId } from "./AirshipType.js"

/**
 * Airships an interpretation claims were what the observer saw: a blimp over a stadium at night, its sign of lamps a band of light along
 * its flank, its navigation lights and strobe under it; a lightship glowing all over; a tethered aerostat at a few kilometres, its red
 * lights flashing, taken for a craft that "hung there for hours"; a great rigid airship of the 1930s; the "phantom airships" an account of
 * 1897 may have been.
 *
 * Stated as an analyst would: what airship (its type, see AirshipType), and where it went when (its `path`, as a drone's, see
 * DroneWaypoint). Its course is COMPUTED from that into one body: it goes through its points on time, smoothly, its nose into the air it
 * goes through (where it goes, less the wind), nosing up as it climbs and down as it descends, barely banking in its turns; held on a line,
 * an aerostat stays where it is moored, its nose turned into the wind, swinging slowly about it. Its lights blink as they do, its sign is
 * lit or not, and its engines are heard as its class's (see BodySound).
 */
export interface AirshipFlightJson {
  id: string
  title?: SaidText
  /** What airship: one of AirshipTypes.ALL, or one whose figures are changed (any left out is the type's). */
  airship: AirshipTypeId | (Partial<Omit<AirshipType, "id">> & { id: AirshipTypeId })
  /** Where it goes, through these points at these instants (see DroneWaypoint). A tethered aerostat stays at the first. */
  path: DroneWaypoint[]
  /** The wind at its height, which it noses into and which a tethered one points into. Calm when absent. */
  wind?: { fromDeg: number, speedMS: number }
  /** Its envelope's colour, and its fins', instead of its type's. */
  color?: string
  finColor?: string
  /** Its sign: lit or not, or lit in this colour, at this luminance. Its type's when absent. */
  sign?: boolean | { color?: string, luminanceCdM2?: number }
  /** A lightship's envelope lit from inside, or not. Lit when absent. */
  lit?: boolean
  /** Its lights, by name (see AirshipType.lights), changed, or `false` to put one out. */
  lights?: Record<string, Partial<Omit<DroneLight, "leds">> | false>
  /** Unheard: not even its engines. */
  silent?: boolean
  /** The phenomena of the account it claims to be (see BodyJson.explains). */
  explains?: string[]
  /** What the phases of its lights and an aerostat's swinging are drawn from. 1 when absent. */
  seed?: number
}

export class AirshipFlight {
  /** How often its track is sampled, ms, besides the instants its lights switch: it is slow, and the player blends between keys. */
  static readonly SAMPLE_MS = 500
  /** The most keyframes it is given: a long flight is sampled more sparsely. */
  static readonly MAX_KEYFRAMES = 20_000
  /** How many times less than the bank a turn would give an aeroplane an airship banks: its fins and its weight low under its lift keep it
   * near level. SUPPOSED. */
  private static readonly BANK_SHARE = 0.25
  /** How far its nose goes up or down at most, degrees. */
  private static readonly MAX_PITCH_DEG = 20
  /** What each is called where it is pointed at, by its type. */
  static readonly TITLES: Record<AirshipTypeId, SaidText> = {
    blimp: { en: "Blimp", fr: "Dirigeable souple", es: "Dirigible flexible", it: "Dirigibile floscio" },
    "zeppelin-nt": { en: "Zeppelin NT", fr: "Zeppelin NT", es: "Zeppelin NT", it: "Zeppelin NT" },
    lightship: { en: "Lightship", fr: "Dirigeable lumineux", es: "Dirigible luminoso", it: "Dirigibile luminoso" },
    aerostat: { en: "Tethered aerostat", fr: "Aérostat captif", es: "Aeróstato cautivo", it: "Aerostato frenato" },
    rigid: { en: "Rigid airship", fr: "Dirigeable rigide", es: "Dirigible rígido", it: "Dirigibile rigido" }
  }
  private static readonly computed = new Map<string, BodyJson[]>()

  /** Its body, computed once for the same statement. */
  static bodiesOf(flight: AirshipFlightJson): BodyJson[] {
    const key = JSON.stringify(flight)
    let bodies = AirshipFlight.computed.get(key)
    if (!bodies) {
      bodies = AirshipFlight.compute(flight)
      AirshipFlight.computed.set(key, bodies)
      if (AirshipFlight.computed.size > 16) AirshipFlight.computed.delete(AirshipFlight.computed.keys().next().value!)
    }
    return bodies
  }

  /** The type a flight states: its own figures over its type's. */
  static typeOf(flight: Pick<AirshipFlightJson, "airship">): AirshipType {
    const stated = flight.airship
    const id = typeof stated === "string" ? stated : stated?.id
    const type = AirshipTypes.byId(id) ?? AirshipTypes.ALL[0]
    return typeof stated === "string" ? type : { ...type, ...stated, id: type.id }
  }

  /** Its lights as they are lit: its type's, changed by what the flight states; those put out left out. */
  static lightsOf(flight: AirshipFlightJson): Record<string, DroneLight> {
    const lights: Record<string, DroneLight> = {}
    for (const [name, own] of Object.entries(AirshipFlight.typeOf(flight).lights)) {
      const stated = flight.lights?.[name]
      if (stated === false) continue
      const light = { ...own, ...(stated ?? {}) }
      if (!light.off) lights[name] = light
    }
    return lights
  }

  /** Its sign as it is lit, or nothing when it has none or it is out. */
  static signOf(flight: AirshipFlightJson): { color: string, luminanceCdM2: number } | undefined {
    const own = AirshipFlight.typeOf(flight).sign
    if (!own) return undefined
    const stated = flight.sign
    if (stated === false || (stated === undefined && !own.lit)) return undefined
    return { color: own.color, luminanceCdM2: own.luminanceCdM2, ...(typeof stated === "object" ? stated : {}) }
  }

  private static compute(flight: AirshipFlightJson): BodyJson[] {
    const points = DroneFlight.pathOf(flight)
    if (points.length === 0) return []
    const type = AirshipFlight.typeOf(flight)
    const random = DroneFlight.randomFrom(flight.seed ?? 1)
    const startT = points[0].t
    const endT = Math.max(points[points.length - 1].t, startT)
    const sampleMs = Math.max(AirshipFlight.SAMPLE_MS, Math.ceil((endT - startT) / AirshipFlight.MAX_KEYFRAMES / 100) * 100)
    const windFrom = (flight.wind?.fromDeg ?? 0) * Math.PI / 180, windSpeed = flight.wind?.speedMS ?? 0
    const windE = -windSpeed * Math.sin(windFrom), windN = -windSpeed * Math.cos(windFrom)
    const path = new DronePath(points, false)
    // A moored aerostat swings slowly about its line, a few degrees either way, and drifts a few metres: two slow sines of its own.
    const swing = { period: 40 + 40 * random(), phase: 2 * Math.PI * random(), amplitudeDeg: 4 + 4 * random() }
    const place = (t: number) => {
      if (!type.tethered) {
        const p = path.at(t)
        return { eastM: p.eastM, northM: p.northM, upM: p.upM }
      }
      const s = (t - startT) / 1000, a = Math.sin(2 * Math.PI * s / swing.period + swing.phase)
      return { eastM: points[0].eastM + 3 * a, northM: points[0].northM + 3 * Math.cos(2 * Math.PI * s / swing.period * 0.7), upM: points[0].upM + 1.5 * a }
    }
    const lights = AirshipFlight.lightsOf(flight)
    const phases = Object.fromEntries(Object.entries(lights).map(([name, light]) => [name, light.phase ?? random()]))
    const grid: number[] = []
    for (let t = startT; t <= endT + 1e-6; t += sampleMs) grid.push(Math.round(t))
    if (grid[grid.length - 1] < endT) grid.push(Math.round(endT))
    const times = [...new Set([...grid, ...DroneFlight.switchesOf(lights, phases, startT, endT)])].filter(t => t >= startT && t <= endT).sort((a, b) => a - b)
    const sign = AirshipFlight.signOf(flight)
    const glow = type.glowCdM2 !== undefined && flight.lit !== false ? type.glowCdM2 : 0
    const halfHeight = type.sizeM.heightM / 2
    let lastHeading: number | undefined
    const track: BodyKeyframe[] = times.map((t, n) => {
      const at = place(t)
      const before = place(t - 1000), after = place(t + 1000)
      const v = { e: (after.eastM - before.eastM) / 2, n: (after.northM - before.northM) / 2, u: (after.upM - before.upM) / 2 }
      const airE = v.e - windE, airN = v.n - windN
      const air = Math.hypot(airE, airN)
      let heading: number
      if (type.tethered || air < 1) {
        // Moored, or barely making way: its nose into the wind, as a weathervane; with no wind at all, where it last pointed.
        const into = windSpeed > 0.3 ? (flight.wind!.fromDeg + 360) % 360 : lastHeading ?? 0
        heading = type.tethered ? (into + swing.amplitudeDeg * Math.sin(2 * Math.PI * (t - startT) / 1000 / swing.period + swing.phase) + 360) % 360 : into
      } else heading = (Math.atan2(airE, airN) * 180 / Math.PI + 360) % 360
      const level = Math.hypot(v.e, v.n)
      const pitch = type.tethered ? 0 : Math.max(-AirshipFlight.MAX_PITCH_DEG, Math.min(AirshipFlight.MAX_PITCH_DEG, Math.atan2(v.u, Math.max(level, 2)) * 180 / Math.PI))
      // Its turn rate, from where it was pointing a second before, banks it a little into the turn.
      const turnDegS = lastHeading === undefined ? 0 : ((heading - lastHeading + 540) % 360 - 180) / Math.max(1e-3, (t - (times[n - 1] ?? t)) / 1000)
      const roll = type.tethered ? 0 : Math.max(-10, Math.min(10, Math.atan(level * turnDegS * Math.PI / 180 / DroneAirframes.G) * 180 / Math.PI * AirshipFlight.BANK_SHARE))
      lastHeading = heading
      const lit = DroneFlight.luminancesAt(lights, phases, t, times[n + 1] === t + 1)
      if (type.sign) for (const side of ["left", "right"]) lit[`light-sign-${side}`] = sign?.luminanceCdM2 ?? 0
      if (type.glowCdM2 !== undefined) lit.envelope = glow
      return {
        t,
        eastM: AirshipFlight.round(at.eastM),
        northM: AirshipFlight.round(at.northM),
        altitudeM: AirshipFlight.round(at.upM - halfHeight),
        ...(n === 0 ? { sizeM: type.sizeM, appearance: { color: flight.color ?? type.color, albedo: type.albedo } } : {}),
        attitude: { headingDeg: AirshipFlight.round(heading, 10), pitchDeg: AirshipFlight.round(pitch, 10), rollDeg: AirshipFlight.round(roll, 10) },
        lights: lit
      }
    })
    const colours: Record<string, string> = { envelopeColor: flight.color ?? type.color }
    if (type.modelId !== "ufoathome-airship-lightship") colours.finColor = flight.finColor ?? type.finColor
    if (type.sign) colours.signColor = sign?.color ?? type.sign.color
    for (const [name, light] of Object.entries(lights)) colours[DroneAirframes.colourKeyOf(name)] = light.color
    return [{
      id: flight.id,
      title: flight.title ?? AirshipFlight.TITLES[type.id],
      ...(flight.explains ? { explains: flight.explains } : {}),
      model: { id: type.modelId },
      modelParameters: colours,
      lamps: DroneFlight.lampsOf(lights, phases),
      ...(flight.silent || !type.sound ? {} : { sound: { kind: type.sound } }),
      track
    }]
  }

  private static round(value: number, per = 100): number {
    return Math.round(value * per) / per
  }
}
