import type { SaidText } from "../../../engine/model/SaidText.js"
import type { BodyJson, BodyKeyframe } from "../../../engine/interpretation/Interpretation.js"
import { DECOR_LAMP_CANDELA } from "../../../engine/model/Decor.js"
import type { DecorLight } from "../../../engine/model/Decor.js"
import { DroneAirframes } from "./DroneAirframe.js"
import type { DroneAirframe, DroneAirframeId, DroneLight } from "./DroneAirframe.js"

/**
 * Drones an interpretation claims were what the observer saw: a quadcopter hovering over a field at night, its strobe flashing white and
 * its red and green LEDs steady, taken for a craft that "hung there, silent"; a few of them over a coast, a "swarm"; a saucer-shaped
 * "drufo" built to be taken for a flying saucer; a military drone on a wing.
 *
 * Stated as an analyst would: what drones (their `airframe`, see DroneAirframe), how many, and where they flew when (their `path`). Each
 * drone is COMPUTED from that into a body of its own (see DroneFlight.bodiesOf): a multirotor stops at a point where its path stops (two
 * points at the same place a few seconds apart: it hovers), sets off and slows down smoothly, leans into where it goes and into the wind,
 * by the angle its thrust has to take to push it against its drag, strays round where it is told to be as satellite positioning lets it,
 * and turns its nose where it goes; a drone on a wing flies on, and banks into its turns. Its lights blink as they do, each strobe of a swarm
 * at its own phase, and it buzzes (see BodySound "unmanned"): so that what it looks like from the observer, the cluster of points, their
 * blinking, how still it holds, what it sounds like, is what follows from the claim and not what was drawn.
 */
export interface DroneFlightJson {
  id: string
  title?: SaidText
  /** What it is built as: one of DroneAirframes.ALL. */
  airframe: DroneAirframeId
  /** How many. 1 when absent. */
  count?: number
  formation?: DroneFormation
  /**
   * Where it goes, through these points at these instants: the middle of the group when there are several. A multirotor is at rest at
   * the first point and at the last, and at a point where its path turns back or stops (the same point twice: it hovers between the two
   * instants); it passes the others without stopping. A drone on a wing flies on before the first point and after the last.
   */
  path: DroneWaypoint[]
  /** Which way a multirotor's nose points, degrees from north, all along: it faces where it goes when absent. */
  headingDeg?: number
  /** The wind at the height it flies, which a multirotor leans into to hold its place. Calm when absent. */
  wind?: { fromDeg: number, speedMS: number }
  /** Its hull's colour, instead of its airframe's. */
  bodyColor?: string
  /** Its lights, by name (see DroneAirframe.lights), changed from its airframe's, or `false` to put one out. */
  lights?: Record<string, Partial<Omit<DroneLight, "leds">> | false>
  /** Unheard: not even its rotors' whine. It is heard as its class is when absent (see BodySound "unmanned"). */
  silent?: boolean
  /** How much quieter it is than its class, decibels (see BodySound.quieterDb). */
  quieterDb?: number
  /** The phenomena of the account it claims to be, the group together (see BodyJson.ensemble). */
  explains?: string[]
  /** The phenomenon of the account each drone claims to be, in order, instead of `explains`; a drone past the list explains nothing. */
  explainsEach?: string[]
  /** What the draws start from: where each drone is in the group, how it strays, when its lights flash. 1 when absent. */
  seed?: number
}

/**
 * A point of its path: where it is at `t`, ms of the recording, in the recording's own frame (see BodyKeyframe), or as a direction and a
 * distance from the recording's origin (an observer's eye at `eyeHeightM`).
 */
export type DroneWaypoint = { t: number } & (
  | { eastM: number, northM: number, altitudeM: number }
  | { azimuthDeg: number, altitudeDeg: number, distanceM: number, eyeHeightM?: number }
)

/**
 * How several drones are arranged round their path:
 *
 * - "single": one, on the path.
 * - "cluster": a loose group, each at its own place round the path's point, some `spacingM` from the nearest (10 when absent).
 * - "line": abreast across where they go, `spacingM` apart (5 when absent).
 */
export interface DroneFormation {
  kind: "single" | "cluster" | "line"
  spacingM?: number
}

/** A point of the path in the recording's frame: ms, metres east, north, and up from the ground at the origin (the drone's middle). */
export interface DronePoint {
  t: number
  eastM: number
  northM: number
  upM: number
}

/** Where one drone is and how it is turned at one instant. */
interface DroneSample {
  t: number
  eastM: number
  northM: number
  upM: number
  headingDeg: number
  pitchDeg: number
  rollDeg: number
}

export class DroneFlight {
  /** How often a drone's track is sampled, ms, besides the instants its lights switch. */
  static readonly SAMPLE_MS = 100
  /** The most keyframes all the drones of one group are given: past that they are sampled more sparsely. */
  static readonly MAX_KEYFRAMES = 60_000
  private static readonly computed = new Map<string, BodyJson[]>()

  /** The bodies of one group, one per drone; computed once for the same statement. Its path is flown as stated, the decor ignored. */
  static bodiesOf(flight: DroneFlightJson): BodyJson[] {
    const key = JSON.stringify(flight)
    let bodies = DroneFlight.computed.get(key)
    if (!bodies) {
      bodies = DroneFlight.compute(flight)
      DroneFlight.computed.set(key, bodies)
      if (DroneFlight.computed.size > 16) DroneFlight.computed.delete(DroneFlight.computed.keys().next().value!)
    }
    return bodies
  }

  static airframeOf(flight: DroneFlightJson): DroneAirframe {
    return DroneAirframes.byId(flight.airframe) ?? DroneAirframes.ALL[0]
  }

  /** Its lights as they are lit: its airframe's, changed by what the flight states; those put out left out. */
  static lightsOf(flight: DroneFlightJson): Record<string, DroneLight> {
    const airframe = DroneFlight.airframeOf(flight)
    const lights: Record<string, DroneLight> = {}
    for (const [name, own] of Object.entries(airframe.lights)) {
      const stated = flight.lights?.[name]
      if (stated === false) continue
      const light = { ...own, ...(stated ?? {}) }
      if (light.off) continue
      lights[name] = light
    }
    return lights
  }

  private static compute(flight: DroneFlightJson): BodyJson[] {
    const points = DroneFlight.pathOf(flight)
    if (points.length === 0) return []
    const airframe = DroneFlight.airframeOf(flight)
    const path = new DronePath(points, airframe.hovers)
    const count = Math.max(1, Math.floor(flight.count ?? 1))
    const random = DroneFlight.randomFrom(flight.seed ?? 1)
    const startT = points[0].t
    const endT = Math.max(points[points.length - 1].t, startT)
    const sampleMs = DroneFlight.sampleMs(count, endT - startT)
    const offsets = DroneFlight.offsetsOf(flight.formation ?? { kind: count > 1 ? "cluster" : "single" }, count, random)
    const lights = DroneFlight.lightsOf(flight)
    const colours: Record<string, string> = { bodyColor: flight.bodyColor ?? airframe.bodyColor }
    for (const [name, light] of Object.entries(lights)) colours[DroneAirframes.colourKeyOf(name)] = light.color
    const line = flight.formation?.kind === "line"
    return offsets.map((offset, index) => {
      const sway = DroneFlight.swayFrom(random, airframe.holdM)
      // Each drone's lights flash at their own phase: a swarm's strobes are not one another's.
      const phases = Object.fromEntries(Object.entries(lights).map(([name, light]) => [name, light.phase ?? (count > 1 ? random() : 0)]))
      const at = (t: number): { eastM: number, northM: number, upM: number } => {
        const p = path.at(t)
        const [dEast, dNorth, dUp] = sway((t - startT) / 1000)
        let east = offset.eastM, north = offset.northM
        if (line) {
          // Abreast across where the group goes: the offset is to its right, turned with it.
          const v = path.velocityAt(t)
          const h = Math.hypot(v.east, v.north) > 0.3 ? Math.atan2(v.east, v.north) : path.headingAtRest(t)
          east = Math.cos(h) * offset.rightM
          north = -Math.sin(h) * offset.rightM
        }
        return { eastM: p.eastM + east + dEast, northM: p.northM + north + dNorth, upM: p.upM + offset.upM + dUp }
      }
      const grid: number[] = []
      for (let t = startT; t <= endT + 1e-6; t += sampleMs) grid.push(t)
      if (grid[grid.length - 1] < endT) grid.push(endT)
      const samples = DroneFlight.attitudes(grid.map(t => ({ t, ...at(t), headingDeg: 0, pitchDeg: 0, rollDeg: 0 })), airframe, flight)
      const switches = DroneFlight.switchesOf(lights, phases, startT, endT)
      const times = [...new Set([...grid.map(t => Math.round(t)), ...switches])].filter(t => t >= startT && t <= endT).sort((a, b) => a - b)
      let k = 0
      const keys: BodyKeyframe[] = times.map((t, n) => {
        while (k < samples.length - 2 && samples[k + 1].t <= t) k++
        const sample = DroneFlight.between(samples[k], samples[Math.min(samples.length - 1, k + 1)], t, at)
        return {
          t,
          eastM: DroneFlight.round(sample.eastM),
          northM: DroneFlight.round(sample.northM),
          altitudeM: DroneFlight.round(sample.upM - airframe.sizeM.heightM / 2),
          ...(n === 0 ? { sizeM: airframe.sizeM } : {}),
          attitude: { headingDeg: DroneFlight.round(sample.headingDeg, 10), pitchDeg: DroneFlight.round(sample.pitchDeg, 10), rollDeg: DroneFlight.round(sample.rollDeg, 10) },
          lights: DroneFlight.luminancesAt(lights, phases, t, times[n + 1] === t + 1)
        }
      })
      const body: BodyJson = {
        id: count > 1 ? `${flight.id}-${index + 1}` : flight.id,
        ...(flight.title ? { title: flight.title } : {}),
        ...(flight.explainsEach
          ? (flight.explainsEach[index] !== undefined ? { explains: [flight.explainsEach[index]] } : {})
          : { ...(flight.explains ? { explains: flight.explains } : {}), ...(count > 1 ? { ensemble: flight.id } : {}) }),
        model: { id: airframe.modelId },
        modelParameters: colours,
        lamps: DroneFlight.lampsOf(lights, phases),
        ...(flight.silent ? {} : { sound: { kind: "unmanned", ...(flight.quieterDb ? { quieterDb: flight.quieterDb } : {}) } }),
        track: keys
      }
      return body
    })
  }

  /**
   * Its LEDs as lamps (see BodyJson.lamps): what the confrontation sizes the light a witness saw of it by, at night (see BodyGlare). Each where it
   * is on the airframe (the model's front is its −z, a lamp's its +z), as bright as it is (a lamp's intensity is a ratio of DECOR_LAMP_CANDELA)
   * and blinking as it does, at this drone's phase.
   */
  static lampsOf(lights: Record<string, DroneLight>, phases: Record<string, number>): DecorLight[] {
    return Object.entries(lights).flatMap(([name, light]) => light.leds.map((led, i) => {
      const flashing = light.hz! > 0
      const periodS = flashing ? 1 / light.hz! : 0
      return {
        id: DroneAirframes.materialOf(name, i, light.leds.length),
        offsetM: { x: led.at[0], y: led.at[1], z: -led.at[2] },
        color: light.color,
        intensity: light.candela / DECOR_LAMP_CANDELA,
        // A drone's light is on while frac(t/period − phase) is under its flash (see isOn); a lamp's while frac(t/period + phase) is (see Decor).
        pattern: flashing
          ? { kind: "flash" as const, perMinute: light.hz! * 60, dutyCycle: Math.min(1, (light.flashS ?? 0.5 * periodS) / periodS), phase: ((1 - (phases[name] ?? 0)) % 1 + 1) % 1 }
          : { kind: "steady" as const }
      }
    }))
  }

  /**
   * The luminance of each LED at `t`, cd/m², by its material: its intensity over the disc it shows, so that what is seen of it from afar is
   * its candela (see BodySystem.shineLights). A light that switches at `t` is stated as it was until then; `switching` says the key 1 ms
   * later states it as it is after (two keys a millisecond apart switch it, see BodyKeyframe.lights).
   */
  static luminancesAt(lights: Record<string, DroneLight>, phases: Record<string, number>, t: number, switching = false): Record<string, number> {
    const out: Record<string, number> = {}
    for (const [name, light] of Object.entries(lights)) {
      // A switch's instant is its edge rounded to the millisecond: a millisecond before it, it is still as it was.
      const on = DroneFlight.isOn(light, phases[name] ?? 0, switching ? t - 1 : t + 0.5)
      light.leds.forEach((led, i) => {
        out[DroneAirframes.materialOf(name, i, light.leds.length)] = on ? DroneFlight.round(light.candela / (Math.PI * led.radiusM ** 2), 1) : 0
      })
    }
    return out
  }

  /** Whether a light is lit at `t`, ms: always for a steady one, during each flash for one that blinks. */
  static isOn(light: DroneLight, phase: number, t: number): boolean {
    if (!(light.hz! > 0)) return true
    const periodMs = 1000 / light.hz!
    const flashMs = Math.min(periodMs, (light.flashS ?? 0.5 / light.hz!) * 1000)
    const into = ((t / periodMs - phase) % 1 + 1) % 1 * periodMs
    return into < flashMs
  }

  /** The instants, whole ms, at which some light switches, and each a millisecond later: the pairs of keys that switch it. */
  static switchesOf(lights: Record<string, DroneLight>, phases: Record<string, number>, fromT: number, untilT: number): number[] {
    const times: number[] = []
    for (const [name, light] of Object.entries(lights)) {
      if (!(light.hz! > 0)) continue
      const periodMs = 1000 / light.hz!
      const flashMs = Math.min(periodMs, (light.flashS ?? 0.5 / light.hz!) * 1000)
      if (flashMs >= periodMs) continue
      const phaseMs = (phases[name] ?? 0) * periodMs
      for (let start = Math.floor((fromT - phaseMs) / periodMs) * periodMs + phaseMs; start <= untilT; start += periodMs) {
        for (const edge of [start, start + flashMs]) {
          const at = Math.round(edge)
          if (at >= fromT && at < untilT) times.push(at, at + 1)
        }
      }
    }
    return times
  }

  /** Every 100 ms, or more sparsely for a group that would otherwise have more than MAX_KEYFRAMES. */
  static sampleMs(count: number, spanMs: number): number {
    const keys = count * (spanMs / DroneFlight.SAMPLE_MS + 1)
    return keys <= DroneFlight.MAX_KEYFRAMES ? DroneFlight.SAMPLE_MS : Math.ceil(DroneFlight.SAMPLE_MS * keys / DroneFlight.MAX_KEYFRAMES / 50) * 50
  }

  /** The path's points in the recording's frame, in time order. */
  static pathOf(flight: Pick<DroneFlightJson, "path">): DronePoint[] {
    return [...flight.path].sort((a, b) => a.t - b.t).map(point => {
      if ("eastM" in point) return { t: point.t, eastM: point.eastM, northM: point.northM, upM: point.altitudeM }
      const az = point.azimuthDeg * Math.PI / 180, alt = point.altitudeDeg * Math.PI / 180
      const level = point.distanceM * Math.cos(alt)
      return { t: point.t, eastM: level * Math.sin(az), northM: level * Math.cos(az), upM: (point.eyeHeightM ?? 1.6) + point.distanceM * Math.sin(alt) }
    })
  }

  /** Where each drone of a group sits round the path's point, metres east, north and up (or to the right of it, for a line). */
  static offsetsOf(formation: DroneFormation, count: number, random: () => number): { eastM: number, northM: number, upM: number, rightM: number }[] {
    if (formation.kind === "single" || count === 1) return [{ eastM: 0, northM: 0, upM: 0, rightM: 0 }]
    if (formation.kind === "line") {
      const spacing = formation.spacingM ?? 5
      return Array.from({ length: count }, (_, i) => ({ eastM: 0, northM: 0, upM: (random() - 0.5) * spacing * 0.2, rightM: (i - (count - 1) / 2) * spacing }))
    }
    // A loose group: a flattened ellipsoid (twice as wide as it is tall) holding `count` drones some `spacing` apart, never two closer than
    // half that.
    const spacing = formation.spacingM ?? 10
    const unit = Math.cbrt(count * spacing ** 3 / (4 / 3 * Math.PI * 2 * 2 * 1))
    const slots: { eastM: number, northM: number, upM: number, rightM: number }[] = []
    let tries = 0
    while (slots.length < count && tries < count * 200) {
      tries++
      const x = 2 * random() - 1, y = 2 * random() - 1, z = 2 * random() - 1
      if (x * x + y * y + z * z > 1) continue
      const slot = { eastM: x * 2 * unit, northM: y * 2 * unit, upM: z * unit, rightM: 0 }
      if (slots.some(other => (other.eastM - slot.eastM) ** 2 + (other.northM - slot.northM) ** 2 + (other.upM - slot.upM) ** 2 < (spacing / 2) ** 2)) continue
      slots.push(slot)
    }
    while (slots.length < count) slots.push({ eastM: (random() - 0.5) * 4 * unit, northM: (random() - 0.5) * 4 * unit, upM: 0, rightM: 0 })
    return slots
  }

  /**
   * How a drone strays round where it is told to be, metres east, north and up at `s` seconds: two slow sines on each axis, of its own
   * periods and phases, within the error of its positioning.
   */
  private static swayFrom(random: () => number, hold: DroneAirframe["holdM"]): (s: number) => [number, number, number] {
    const terms = [hold.horizontalM, hold.horizontalM, hold.verticalM].map(amplitude => [0, 1].map(() => ({
      period: 4 + random() * 10, phase: random() * 2 * Math.PI, amplitude: amplitude * 0.5 * (0.5 + 0.5 * random())
    })))
    return s => terms.map(axis => axis.reduce((sum, term) => sum + term.amplitude * Math.sin(2 * Math.PI * s / term.period + term.phase), 0)) as [number, number, number]
  }

  /**
   * Each sample's heading, pitch and roll from the track itself.
   *
   * A MULTIROTOR is pushed by its thrust, along its own up: to go anywhere, or to hold still in a wind, it leans that thrust over by the
   * angle whose tangent is the sideways force it needs over its weight. That force is what accelerates it plus what its drag takes, which
   * grows as the square of its speed through the air, and is all its lean at its top speed (DroneAirframe.maxTiltDeg): a drone at 21 m/s
   * flies nose down by 35°, one hovering in a 10 m/s wind leans some 9° into it. Its nose points where it goes, turning at its yaw rate,
   * or where the interpretation holds it.
   *
   * A drone ON A WING points into the air it flies through, noses up as it climbs, and banks into a turn by the angle whose tangent is its
   * sideways acceleration over gravity, as a bird does (see BirdFlock.attitudes).
   */
  static attitudes(samples: DroneSample[], airframe: DroneAirframe, flight: Pick<DroneFlightJson, "headingDeg" | "wind">): DroneSample[] {
    const n = samples.length
    if (n === 0) return samples
    const G = DroneAirframes.G
    const windFrom = (flight.wind?.fromDeg ?? 0) * Math.PI / 180
    const windE = -(flight.wind?.speedMS ?? 0) * Math.sin(windFrom), windN = -(flight.wind?.speedMS ?? 0) * Math.cos(windFrom)
    const velocity = (k: number) => {
      const a = samples[Math.max(0, k - 1)], b = samples[Math.min(n - 1, k + 1)]
      const dt = Math.max((b.t - a.t) / 1000, 1e-3)
      return { e: (b.eastM - a.eastM) / dt, n: (b.northM - a.northM) / dt, u: (b.upM - a.upM) / dt }
    }
    const velocities = samples.map((_, k) => velocity(k))
    const acceleration = (k: number) => {
      const a = velocities[Math.max(0, k - 1)], b = velocities[Math.min(n - 1, k + 1)]
      const dt = Math.max((samples[Math.min(n - 1, k + 1)].t - samples[Math.max(0, k - 1)].t) / 1000, 1e-3)
      return { e: (b.e - a.e) / dt, n: (b.n - a.n) / dt, u: (b.u - a.u) / dt }
    }
    if (!airframe.hovers) {
      for (let k = 0; k < n; k++) {
        const v = velocities[k]
        const airE = v.e - windE, airN = v.n - windN
        const level = Math.hypot(v.e, v.n)
        samples[k].headingDeg = Math.hypot(airE, airN) > 0.5 ? (Math.atan2(airE, airN) * 180 / Math.PI + 360) % 360 : k > 0 ? samples[k - 1].headingDeg : 0
        samples[k].pitchDeg = Math.atan2(v.u, Math.max(level, 1)) * 180 / Math.PI + 2
        const a = acceleration(k)
        // Sideways acceleration: the part of it across the way it goes.
        const across = level > 0.5 ? (a.e * v.n - a.n * v.e) / level : 0
        samples[k].rollDeg = Math.max(-45, Math.min(45, Math.atan(across / G) * 180 / Math.PI))
      }
      return samples
    }
    const drag = G * Math.tan(airframe.maxTiltDeg * Math.PI / 180) / airframe.maxSpeedMS ** 2
    const maxTurn = airframe.yawRateDegS * DroneFlight.SAMPLE_MS / 1000
    let heading: number | undefined = flight.headingDeg
    if (heading === undefined) {
      const moving = velocities.find(v => Math.hypot(v.e, v.n) > 1)
      heading = moving ? (Math.atan2(moving.e, moving.n) * 180 / Math.PI + 360) % 360 : 0
    }
    for (let k = 0; k < n; k++) {
      const v = velocities[k]
      if (flight.headingDeg === undefined && Math.hypot(v.e, v.n) > 1) {
        const wanted = (Math.atan2(v.e, v.n) * 180 / Math.PI + 360) % 360
        const turn: number = ((wanted - heading + 540) % 360) - 180
        const dt = k > 0 ? (samples[k].t - samples[k - 1].t) / DroneFlight.SAMPLE_MS : 1
        heading = (heading + Math.max(-maxTurn * dt, Math.min(maxTurn * dt, turn)) + 360) % 360
      }
      const a = acceleration(k)
      const airE = v.e - windE, airN = v.n - windN
      const air = Math.hypot(airE, airN)
      // The sideways force it needs, per kilogram: what accelerates it, and what holds it against its drag.
      const fE = a.e + drag * air * airE, fN = a.n + drag * air * airN
      const up = Math.max(G + a.u, 0.2 * G)
      const h = heading * Math.PI / 180
      const forward = fE * Math.sin(h) + fN * Math.cos(h)
      const right = fE * Math.cos(h) - fN * Math.sin(h)
      samples[k].headingDeg = heading
      samples[k].pitchDeg = -Math.atan(forward / up) * 180 / Math.PI
      samples[k].rollDeg = Math.atan(right / up) * 180 / Math.PI
    }
    return samples
  }

  /** The sample at `t` between two: its place where it is (`at`), its attitude blended. */
  private static between(a: DroneSample, b: DroneSample, t: number, at: (t: number) => { eastM: number, northM: number, upM: number }): DroneSample {
    if (t === a.t) return a
    if (t === b.t) return b
    const f = b.t === a.t ? 0 : Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t)))
    const turn = ((b.headingDeg - a.headingDeg + 540) % 360) - 180
    return {
      t, ...at(t),
      headingDeg: (a.headingDeg + turn * f + 360) % 360,
      pitchDeg: a.pitchDeg + (b.pitchDeg - a.pitchDeg) * f,
      rollDeg: a.rollDeg + (b.rollDeg - a.rollDeg) * f
    }
  }

  /** A generator of numbers from 0 to 1 that gives the same ones for the same seed (mulberry32). */
  static randomFrom(seed: number): () => number {
    let state = seed >>> 0
    return () => {
      state = (state + 0x6d2b79f5) >>> 0
      let z = state
      z = Math.imul(z ^ (z >>> 15), z | 1)
      z ^= z + Math.imul(z ^ (z >>> 7), z | 61)
      return ((z ^ (z >>> 14)) >>> 0) / 4294967296
    }
  }

  private static round(value: number, per = 100): number {
    return Math.round(value * per) / per
  }
}

/**
 * A drone's path through its points, in time: a cubic in each stretch between two points (Hermite), whose speed at each point is what
 * the two stretches round it make it, or nothing where a multirotor stops — at the first point and the last, where it hovers (the same
 * point twice) and where its path turns back by more than a right angle. So it sets off and slows down smoothly, and never overshoots a
 * point it stops at.
 *
 * Before the first point and after the last, a multirotor is still there; a drone on a wing flies on as it was.
 */
export class DronePath {
  private readonly speeds: { e: number, n: number, u: number }[]

  constructor(private readonly points: DronePoint[], private readonly hovers: boolean) {
    const p = points
    this.speeds = p.map((point, i) => {
      const before = p[i - 1], after = p[i + 1]
      const of = (a: DronePoint, b: DronePoint) => {
        const dt = Math.max((b.t - a.t) / 1000, 1e-3)
        return { e: (b.eastM - a.eastM) / dt, n: (b.northM - a.northM) / dt, u: (b.upM - a.upM) / dt }
      }
      if (!before || !after) {
        if (hovers || p.length < 2) return { e: 0, n: 0, u: 0 }
        return before ? of(before, point) : of(point, after)
      }
      const v1 = of(before, point), v2 = of(point, after)
      const s1 = Math.hypot(v1.e, v1.n, v1.u), s2 = Math.hypot(v2.e, v2.n, v2.u)
      if (hovers && (s1 < 0.05 || s2 < 0.05 || v1.e * v2.e + v1.n * v2.n + v1.u * v2.u < 0)) return { e: 0, n: 0, u: 0 }
      // The mean of the two, weighted by how long each stretch lasts, as a Catmull-Rom curve in time would.
      const d1 = point.t - before.t, d2 = after.t - point.t
      const w = d1 / Math.max(d1 + d2, 1)
      return { e: v1.e * (1 - w) + v2.e * w, n: v1.n * (1 - w) + v2.n * w, u: v1.u * (1 - w) + v2.u * w }
    })
  }

  at(t: number): DronePoint {
    const p = this.points
    if (p.length === 1) return { ...p[0], t }
    if (t <= p[0].t) return this.outside(t, 0)
    if (t >= p[p.length - 1].t) return this.outside(t, p.length - 1)
    let i = 0
    while (i < p.length - 2 && t > p[i + 1].t) i++
    const a = p[i], b = p[i + 1]
    const span = Math.max((b.t - a.t) / 1000, 1e-3)
    const u = (t - a.t) / (b.t - a.t)
    const u2 = u * u, u3 = u2 * u
    const h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = -2 * u3 + 3 * u2, h11 = u3 - u2
    const va = this.speeds[i], vb = this.speeds[i + 1]
    return {
      t,
      eastM: h00 * a.eastM + h10 * va.e * span + h01 * b.eastM + h11 * vb.e * span,
      northM: h00 * a.northM + h10 * va.n * span + h01 * b.northM + h11 * vb.n * span,
      upM: h00 * a.upM + h10 * va.u * span + h01 * b.upM + h11 * vb.u * span
    }
  }

  velocityAt(t: number): { east: number, north: number, up: number } {
    const a = this.at(t - 50), b = this.at(t + 50)
    return { east: (b.eastM - a.eastM) / 0.1, north: (b.northM - a.northM) / 0.1, up: (b.upM - a.upM) / 0.1 }
  }

  /** Which way it last went before `t`, radians from north: what a line of drones at rest stays abreast across. */
  headingAtRest(t: number): number {
    const p = this.points
    for (let i = p.length - 1; i > 0; i--) {
      if (p[i].t > t && i > 1) continue
      const de = p[i].eastM - p[i - 1].eastM, dn = p[i].northM - p[i - 1].northM
      if (Math.hypot(de, dn) > 0.1) return Math.atan2(de, dn)
    }
    for (let i = 1; i < p.length; i++) {
      const de = p[i].eastM - p[i - 1].eastM, dn = p[i].northM - p[i - 1].northM
      if (Math.hypot(de, dn) > 0.1) return Math.atan2(de, dn)
    }
    return 0
  }

  private outside(t: number, index: number): DronePoint {
    const from = this.points[index]
    if (this.hovers) return { ...from, t }
    const v = this.speeds[index]
    const s = (t - from.t) / 1000
    return { t, eastM: from.eastM + v.e * s, northM: from.northM + v.n * s, upM: from.upM + v.u * s }
  }
}
