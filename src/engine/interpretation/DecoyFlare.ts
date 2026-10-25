import type { DecorModelRef } from "../model/Decor.js"
import type { SaidText } from "../model/SaidText.js"
import type { BodyJson, BodyKeyframe, BodySize, InterpretationJson } from "./Interpretation.js"

/**
 * A salvo of infrared decoy flares an interpretation claims was what the observer saw: a military
 * aircraft dispensing them one after the other, as the AARO found aircraft did during an exercise
 * near the "Western U.S. Event" of October 2023.
 *
 * It is stated as what an analyst knows or assumes — where the aircraft was, which way it flew and
 * how fast, when each flare left it — and the flares themselves are COMPUTED from that, not drawn:
 * each leaves the aircraft at its speed plus the dispenser's kick, is braked by the air within a
 * fraction of a second (a flare is a small, light, blunt pellet), drops at its terminal speed while
 * the wind carries it, and burns for a few seconds. That is what makes it worth computing rather than
 * keyframing: a salvo is a line of points lit one after the other along the aircraft's path, almost
 * still in the sky once lit, which an observer who never sees the dark aircraft can take for
 * something that moves along that line, or "launches" the next one. Whether it looks so from where
 * the observer stood is what the reading then shows (see BodyConfrontation).
 *
 * Each flare becomes an ordinary body (see DecoyFlare.bodiesOf): a glowing sphere whose track is
 * sampled from the computation, so it is drawn, lit and confronted as every other body is.
 */
export interface FlareSalvoJson {
  id: string
  title?: SaidText
  /** The aircraft at one instant of the recording, flying straight and level from there on (and before). */
  aircraft: FlareAircraft
  /** When each flare leaves it, and which phenomena of the account it claims to be. */
  releases: FlareRelease[]
  /** The flare dispensed: an MJU-7 when absent (see DecoyFlare.MJU_7). Any field left out is the MJU-7's. */
  flare?: Partial<FlareType>
  /** The wind at the flares' height: where it blows TOWARDS, degrees, and its speed. None when absent. */
  wind?: { towardDeg: number, speedMS: number }
}

/** Where the dispensing aircraft is at `t`, in the recording's own frame (see BodyKeyframe). */
export interface FlareAircraft {
  t: number
  eastM: number
  northM: number
  /** Metres above the ground at the recording's origin — see BodyKeyframe.altitudeM. */
  altitudeM: number
  headingDeg: number
  speedMS: number
  /** Its height above sea level at `t` would be this plus `altitudeM`: what sets how thick the air
   * braking the flares is. 1000 m when absent. */
  originElevationM?: number
  /** Drawn when given (a catalogue model or a primitive), dark and unlit as a fighter in an exercise often is. */
  model?: DecorModelRef
  sizeM?: BodySize
  /** A light it gives off as it flies — its afterburner — which an observer may have taken for a phenomenon of its own. */
  glow?: AircraftGlow
}

/**
 * The light of the aircraft itself, seen as a ball: an afterburner's plume at night is the one thing of a fighter an observer sees from
 * kilometres away. Lit and put out in turn when `onS` and `offS` say so (a pilot modulating it, or the plume turning away), from `fromT` to
 * `untilT`.
 */
export interface AircraftGlow {
  /** The phenomena of the account it claims to be — see BodyJson.explains. */
  explains?: string[]
  /** How wide it looks, m. */
  sizeM: number
  luminousIntensityCd: number
  color: string
  /** Ms of the recording. */
  fromT: number
  untilT: number
  /** Seconds lit, then seconds out, repeated from `fromT`; always lit when absent. */
  onS?: number
  offS?: number
}

/** One flare leaving the aircraft. */
export interface FlareRelease {
  /** Ms of the recording. */
  t: number
  /** The phenomena of the account this flare claims to be — see BodyJson.explains. */
  explains?: string[]
}

/** What a flare is made of and how it burns: what the computation needs of it. */
export interface FlareType {
  /** Mass at ejection, kg. */
  massKg: number
  /** Mass burned away by burnout, kg. */
  burnedKg: number
  /** Drag coefficient times reference area, m²: how hard the air brakes it. */
  dragAreaM2: number
  /** The dispenser's kick, m/s, straight down out of the aircraft. */
  ejectionMS: number
  /** How long it burns, s. */
  burnS: number
  /** Its luminous intensity at full burn, candela, in the visible: what the eye gets of it. */
  luminousIntensityCd: number
  /** How wide its burning plume looks, m: the size of the glowing sphere drawn. */
  flameSizeM: number
  /** The colour of its light, CSS. */
  color: string
}

/** A state of one flare, metres and seconds, x east, y north, z up. */
interface FlareState {
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
}

export class DecoyFlare {

  /**
   * The MJU-7A/B, the 1 × 2 × 8 in magnesium-Teflon-Viton (MTV) flare of the F-15 and F-16.
   *
   * Stated by its makers: 370 g, 261 g of it composition, 3.5 to 5 s of burn (Chemring/Kilgore and
   * TARA Aerospace datasheets), burnt out within 150 to 400 ft of descent (Holloman AFB flare report),
   * which a pellet of that shape tumbling at a drag coefficient of about 1.2 over its 2 × 8 in side
   * does: about 20 m/s terminal, 90 m in 4.5 s. The rest is ASSUMED, for no figure was found: the
   * dispenser's kick (about 30 m/s, a common order of magnitude for impulse-cartridge dispensers) and
   * above all the visible output. MTV burns white-hot (about 1100 °C): 20 000 cd is taken, a
   * hundredth of a parachute illumination flare (LUU-2, 1.8 Mcd) for a pellet about thirty times
   * lighter burning eighty times shorter. It is the figure a variant should move first.
   */
  static readonly MJU_7: FlareType = {
    massKg: 0.37,
    burnedKg: 0.26,
    dragAreaM2: 1.2 * 0.0508 * 0.2032,
    ejectionMS: 30,
    burnS: 4.5,
    luminousIntensityCd: 20000,
    flameSizeM: 1.5,
    color: "#ffd9a0"
  }

  /** How often a flare's computed path is sampled into keyframes, ms: the player blends between them. */
  static readonly SAMPLE_MS = 100
  /** The integration step, s: the braking happens within a tenth of a second. */
  private static readonly STEP_S = 0.002
  private static readonly G = 9.81

  /** The interpretation with every flare of its salvoes (and each drawn aircraft) added to its bodies. Unchanged when it states none. */
  static expand(interpretation: InterpretationJson): InterpretationJson
  static expand(interpretation: InterpretationJson | undefined): InterpretationJson | undefined
  static expand(interpretation: InterpretationJson | undefined): InterpretationJson | undefined {
    const salvoes = interpretation?.flares
    if (!interpretation || !salvoes || salvoes.length === 0) return interpretation
    return { ...interpretation, bodies: [...interpretation.bodies, ...salvoes.flatMap(salvo => DecoyFlare.bodiesOf(salvo))] }
  }

  /** The bodies of one salvo: the aircraft if it is drawn, then each flare. */
  static bodiesOf(salvo: FlareSalvoJson): BodyJson[] {
    const type: FlareType = { ...DecoyFlare.MJU_7, ...salvo.flare }
    const bodies: BodyJson[] = []
    const aircraft = salvo.aircraft
    if (aircraft.model) {
      const times = salvo.releases.map(release => release.t)
      const from = Math.min(aircraft.t, ...times) - 5000, to = Math.max(aircraft.t, ...times) + 5000
      const at = (t: number): BodyKeyframe => {
        const p = DecoyFlare.aircraftAt(aircraft, t)
        return { t, eastM: p.x, northM: p.y, altitudeM: p.z, attitude: { headingDeg: aircraft.headingDeg }, sizeM: aircraft.sizeM, appearance: { color: "#30333a", albedo: 0.15 } }
      }
      bodies.push({ id: `${salvo.id}-aircraft`, title: salvo.title, model: aircraft.model, track: [at(from), at(to)] })
    }
    if (aircraft.glow) bodies.push(DecoyFlare.glowBody(salvo, aircraft.glow))
    salvo.releases.forEach((release, index) => bodies.push(DecoyFlare.flareBody(salvo, type, release, index)))
    return bodies
  }

  /** Where the aircraft is at `t` ms: straight and level through its stated point. */
  static aircraftAt(aircraft: FlareAircraft, t: number): { x: number, y: number, z: number } {
    const heading = aircraft.headingDeg * Math.PI / 180, s = (t - aircraft.t) / 1000 * aircraft.speedMS
    return { x: aircraft.eastM + Math.sin(heading) * s, y: aircraft.northM + Math.cos(heading) * s, z: aircraft.altitudeM }
  }

  /**
   * The light a flare gives at `s` seconds after it left the aircraft, as a share of its full burn:
   * it catches within a fifth of a second, holds, and dies over the last quarter of its burn.
   */
  static burnShare(type: FlareType, s: number): number {
    if (s < 0 || s >= type.burnS) return 0
    if (s < 0.2) return s / 0.2
    const fade = type.burnS * 0.75
    return s <= fade ? 1 : (type.burnS - s) / (type.burnS - fade)
  }

  /**
   * The path of one flare from its release, sampled every `sampleMs`: positions in metres (x east,
   * y north, z up, the recording's own frame), integrated with gravity and a quadratic drag in air
   * thinning with height, relative to the wind, while it loses the mass it burns.
   */
  static trajectory(salvo: FlareSalvoJson, type: FlareType, releaseT: number, sampleMs = DecoyFlare.SAMPLE_MS): { t: number, x: number, y: number, z: number }[] {
    const aircraft = salvo.aircraft
    const heading = aircraft.headingDeg * Math.PI / 180
    const start = DecoyFlare.aircraftAt(aircraft, releaseT)
    const state: FlareState = { ...start, vx: Math.sin(heading) * aircraft.speedMS, vy: Math.cos(heading) * aircraft.speedMS, vz: -type.ejectionMS }
    const toward = (salvo.wind?.towardDeg ?? 0) * Math.PI / 180, windSpeed = salvo.wind?.speedMS ?? 0
    const wx = Math.sin(toward) * windSpeed, wy = Math.cos(toward) * windSpeed
    const seaLevelOffset = aircraft.originElevationM ?? 1000
    const samples = [{ t: releaseT, x: state.x, y: state.y, z: state.z }]
    const step = DecoyFlare.STEP_S, perSample = Math.round(sampleMs / 1000 / step)
    const steps = Math.ceil(type.burnS / step)
    for (let i = 1; i <= steps; i++) {
      const s = i * step
      const mass = type.massKg - type.burnedKg * Math.min(1, s / type.burnS)
      const rho = 1.225 * Math.exp(-(state.z + seaLevelOffset) / 8500)
      const rx = state.vx - wx, ry = state.vy - wy, rz = state.vz
      const speed = Math.hypot(rx, ry, rz)
      const k = 0.5 * rho * type.dragAreaM2 * speed / mass
      // Semi-implicit: the braking is far quicker than any explicit step would stay stable for.
      state.vx = (state.vx + k * step * wx) / (1 + k * step)
      state.vy = (state.vy + k * step * wy) / (1 + k * step)
      state.vz = (state.vz - DecoyFlare.G * step) / (1 + k * step)
      state.x += state.vx * step
      state.y += state.vy * step
      state.z += state.vz * step
      if (i % perSample === 0 || i === steps) samples.push({ t: releaseT + Math.round(s * 1000), x: state.x, y: state.y, z: state.z })
    }
    return samples
  }

  /** The aircraft's own light as a body: a glowing sphere on its straight path, lit and put out in turn. */
  private static glowBody(salvo: FlareSalvoJson, glow: AircraftGlow): BodyJson {
    const radius = glow.sizeM / 2, full = glow.luminousIntensityCd / (Math.PI * radius * radius)
    // Every switch is two keyframes a millisecond apart (see BodyKeyframe.lights): the light does not fade from one state to the other.
    const switches: { t: number, lit: boolean }[] = [{ t: glow.fromT, lit: true }]
    if (glow.onS && glow.offS) {
      for (let t = glow.fromT, lit = true; t < glow.untilT; lit = !lit) {
        t += (lit ? glow.onS : glow.offS) * 1000
        if (t < glow.untilT) switches.push({ t, lit: !lit })
      }
    }
    const key = (t: number, lit: boolean): BodyKeyframe => {
      const p = DecoyFlare.aircraftAt(salvo.aircraft, t)
      return { t, eastM: p.x, northM: p.y, altitudeM: p.z, appearance: { color: glow.color, luminanceCdM2: lit ? full : 0 } }
    }
    const track: BodyKeyframe[] = []
    switches.forEach(({ t, lit }, i) => {
      if (i > 0) track.push(key(t - 1, !lit))
      track.push(key(t, lit))
    })
    track[0] = { ...track[0], sizeM: { widthM: glow.sizeM, lengthM: glow.sizeM, heightM: glow.sizeM }, present: true }
    const last = switches[switches.length - 1]
    track.push(key(glow.untilT, last.lit), { t: glow.untilT + 1, present: false })
    return { id: `${salvo.id}-glow`, title: salvo.title, explains: glow.explains, model: { id: "sphere" }, track }
  }

  /** One flare as a body: a glowing sphere along its computed path, gone once burnt out. */
  private static flareBody(salvo: FlareSalvoJson, type: FlareType, release: FlareRelease, index: number): BodyJson {
    const size = type.flameSizeM, radius = size / 2
    const fullLuminance = type.luminousIntensityCd / (Math.PI * radius * radius)
    const path = DecoyFlare.trajectory(salvo, type, release.t)
    const track: BodyKeyframe[] = path.map((point, i) => ({
      t: point.t,
      eastM: point.x,
      northM: point.y,
      altitudeM: point.z,
      ...(i === 0 ? { sizeM: { widthM: size, lengthM: size, heightM: size }, present: true } : {}),
      appearance: { color: type.color, luminanceCdM2: fullLuminance * DecoyFlare.burnShare(type, (point.t - release.t) / 1000), ...(i === 0 ? { haloScale: 1 } : {}) }
    }))
    track.push({ t: path[path.length - 1].t + 1, present: false })
    return { id: `${salvo.id}-flare-${index + 1}`, title: salvo.title, explains: release.explains, model: { id: "sphere" }, track }
  }
}
