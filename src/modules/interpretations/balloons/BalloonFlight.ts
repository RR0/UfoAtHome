import type { SaidPosition } from "../../../engine/model/SaidPosition.js"
import type { SaidText } from "../../../engine/model/SaidText.js"
import type { BodyJson, BodyKeyframe } from "../../../engine/interpretation/Interpretation.js"
import { BalloonTypes } from "./BalloonType.js"
import type { BalloonType, BalloonTypeId } from "./BalloonType.js"

/**
 * Balloons an interpretation claims were what the observer saw: a weather balloon high in the Sun at dusk, a stratospheric balloon
 * floating for hours, a hot-air balloon whose burner lights it up at night, party balloons let go at a wedding, a foil balloon flashing
 * as it turns, LED balloons drifting in a line, a captive balloon swaying over a town.
 *
 * Stated as an analyst would: what balloon (see BalloonType), let go where and when (one by one, or as a group of which only how many and
 * over what span is said), into what wind; the pilot's heights for a hot-air balloon, the line for a captive one. Each balloon's flight is
 * COMPUTED from that, not drawn: it rises by what its gas or its hot air lifts beyond its weight, at the speed the air's drag lets it, in
 * the air of the standard atmosphere (thinning and cooling up to the stratosphere, where it warms again), swelling as the air thins until
 * a latex one bursts or a vented one floats, and goes with the wind of each height. A hot-air balloon's pilot fires its burner in blasts to
 * keep the height they want, and each blast lights it.
 *
 * Each balloon becomes an ordinary body (see BalloonFlight.bodiesOf): its model at the size it has swelled to, along its computed path, so
 * that it is drawn, lit (by the Sun it sees up there, see BodyFrame.sunAloft) and confronted as every other body is.
 */
export interface BalloonFlightJson {
  id: string
  title?: SaidText
  /** What balloon: one of BalloonTypes.ALL, or one whose figures are changed (any field left out is the type's). */
  balloon: BalloonTypeId | (Partial<Omit<BalloonType, "id">> & { id: BalloonTypeId })
  /** Where it is let go, in the recording's own frame (see BodyKeyframe). */
  site: BalloonSite
  /** Each balloon let go, stated one by one. One at the recording's start when neither this nor `group` says any. */
  releases?: BalloonRelease[]
  /** Balloons let go as a group, of which only how many, over what span and how far round the site is stated; added to `releases`. */
  group?: BalloonGroup
  /** The wind at the ground: where it blows TOWARDS, degrees, and its speed. None when absent. */
  wind?: BalloonWind
  /** The wind higher up, at `atM` metres above the site, each blended with the one below and the last held above: a weather balloon goes
   * through the jet stream on its way up. The ground wind throughout when absent. */
  windsAloft?: (BalloonWind & { atM: number })[]
  /** The air temperature at the site, °C: the standard atmosphere's from there up, shifted by the difference, which fades by 11 km. 15
   * when absent. */
  airTemperatureC?: number
  /** The gusts it meets (see BalloonTurbulence): a light breeze's when absent, all zero for a still air. */
  turbulence?: BalloonTurbulence
  /** A hot-air balloon's pilot's heights: metres above the site they aim at from each instant, ms of the recording. When absent, a climb to
   * 300 m, held. */
  plan?: { t: number, altitudeM: number }[]
  /** A captive balloon's line, metres: how far from the site it can go. Its type's 30 m when absent. */
  tetherM?: number
  /** Its lamp lit, for a type that carries one (see BalloonType.lamp). */
  lit?: boolean
  /** Its colour, for an LED balloon its light's too, instead of its type's. */
  color?: string
  /** How long each flight is computed for from when it is let go, s, instead of its type's: it may burst or land before. */
  durationS?: number
  /** The phenomena of the account it claims to be, the balloons together (see BodyJson.ensemble). */
  explains?: string[]
  /** The phenomenon of the account each balloon claims to be, in order, instead of `explains`; a balloon past the list explains nothing. */
  explainsEach?: string[]
}

/** Where balloons are let go: metres east and north of the recording's origin, and above the ground there (see BodyKeyframe.altitudeM). */
export interface BalloonSite {
  eastM: number
  northM: number
  /** How it was said, when not as metres from the observer (see SaidPosition). */
  saidPosition?: SaidPosition
  /** Metres between where they are let go and the ground at the recording's origin. 0 when absent. */
  altitudeM?: number
  /** The height above sea level of the ground at the recording's origin, m: what sets how thin the air is. 0 when absent. */
  originElevationM?: number
}

/** One balloon let go. */
export interface BalloonRelease {
  /** Ms of the recording. */
  t: number
  /** Metres east and north of the site. */
  eastM?: number
  northM?: number
  /** Metres above the ground at the recording's origin it starts from, instead of the site's: for one the account only has from where it
   * was first seen, already up. Its gas is then what it was let go with, swelled to that height. */
  altitudeM?: number
  /** How much more or less gas it was filled with than its type says, as a share: 0.1 is a tenth more. 0 when absent. */
  fill?: number
  /** Its own colour. */
  color?: string
  /** What the gusts it meets are drawn from: drawn from the group's seed, or from when and where it is let go. */
  seed?: number
}

/** A number of balloons let go between two instants, each at its own instant, from its own spot round the site, filled a little unlike the
 * others — drawn at random within what is stated, the same each time for the same `seed`. */
export interface BalloonGroup {
  count: number
  /** Ms of the recording between which they are let go. */
  fromT: number
  untilT: number
  /** How far round the site each is let go from, m. 10 when absent. */
  radiusM?: number
  /** How unlike each other their filling is, as a share either way. 0.1 when absent. */
  fillSpread?: number
  /** The colours they are, one each in turn: the type's when absent. */
  colors?: string[]
  seed?: number
}

export interface BalloonWind {
  towardDeg: number
  speedMS: number
}

/** How the air strays from the mean wind (see LanternTurbulence): the spread of its speed, m/s, across and up, and how long a gust lasts, s. */
export interface BalloonTurbulence {
  horizontalMS: number
  verticalMS: number
  timescaleS: number
}

/** One sample of a balloon's flight: where its lowest point is, metres in the recording's frame, how wide it has swelled, and its burner. */
export interface BalloonSample {
  t: number
  x: number
  y: number
  z: number
  widthM: number
  /** Whether its burner is firing. */
  burning: boolean
}

/** What a flight ended by: its time was up, it burst, or it came down to the ground and stayed. */
export type BalloonEnd = "time" | "burst" | "landed"

interface BalloonState {
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  /** The mass of its gas, kg (an open envelope: unused). */
  gasKg: number
  /** How much hotter than outside an open envelope's air is, K. */
  excessK: number
  /** Until when, s since let go, its burner fires. */
  burnUntilS: number
  /** The ballast it still carries, kg (see BalloonType.ballastKg). */
  ballastKg: number
  /** Whether it has been full once (a vented envelope): from then on, falling, it drops ballast. */
  floated: boolean
}

export class BalloonFlight {
  /** How often a flight is sampled into keyframes, ms, besides the instants its burner starts and stops. */
  static readonly SAMPLE_MS = 1000
  /** The most keyframes one balloon is given: a long flight is sampled more sparsely. */
  static readonly MAX_KEYFRAMES = 6000
  private static readonly STEP_S = 0.05
  static readonly G = 9.80665
  /** The universal gas constant, J/(mol·K), and dry air's molar mass, kg/mol. */
  private static readonly R = 8.314462
  private static readonly AIR_KG_MOL = 0.0289644
  private static readonly R_AIR = BalloonFlight.R / BalloonFlight.AIR_KG_MOL
  /** A light breeze's stirring, as a lantern meets (see SkyLantern.TURBULENCE). */
  static readonly TURBULENCE: BalloonTurbulence = { horizontalMS: 0.8, verticalMS: 0.3, timescaleS: 30 }
  /** How far above the ground a gust's up and down reaches its full strength, m (see SkyLantern.GUST_GROUND_M). */
  private static readonly GUST_GROUND_M = 2
  /** A captive balloon's line when the recording does not say, m. */
  static readonly TETHER_M = 30
  /** What a hot-air balloon's pilot climbs to when the recording does not say, m above the site. */
  static readonly CRUISE_M = 300
  /** How fast a pilot is willing to climb or come down, m/s. */
  private static readonly PILOT_MS = 2
  /** What each is called where it is pointed at, by its type. */
  static readonly TITLES: Record<BalloonTypeId, SaidText> = {
    "hot-air": { en: "Hot-air balloon", fr: "Montgolfière", es: "Globo aerostático", it: "Mongolfiera" },
    party: { en: "Party balloon", fr: "Ballon de baudruche", es: "Globo de fiesta", it: "Palloncino" },
    led: { en: "LED balloon", fr: "Ballon lumineux à LED", es: "Globo de LED", it: "Palloncino a LED" },
    foil: { en: "Foil balloon", fr: "Ballon métallisé", es: "Globo metalizado", it: "Palloncino metallizzato" },
    pilot: { en: "Pilot balloon", fr: "Ballon pilote", es: "Globo piloto", it: "Pallone pilota" },
    weather: { en: "Weather balloon", fr: "Ballon-sonde", es: "Globo sonda", it: "Pallone sonda" },
    stratospheric: { en: "Stratospheric balloon", fr: "Ballon stratosphérique", es: "Globo estratosférico", it: "Pallone stratosferico" },
    solar: { en: "Solar balloon", fr: "Ballon solaire", es: "Globo solar", it: "Pallone solare" },
    captive: { en: "Captive balloon", fr: "Ballon captif", es: "Globo cautivo", it: "Pallone frenato" }
  }
  private static readonly computed = new Map<string, BodyJson[]>()

  /** The bodies of one flight, one per balloon; computed once for the same statement. */
  static bodiesOf(flight: BalloonFlightJson): BodyJson[] {
    const key = JSON.stringify(flight)
    let bodies = BalloonFlight.computed.get(key)
    if (!bodies) {
      bodies = BalloonFlight.releasesOf(flight).map((release, index, all) => BalloonFlight.balloonBody(flight, release, index, all.length))
      BalloonFlight.computed.set(key, bodies)
      if (BalloonFlight.computed.size > 16) BalloonFlight.computed.delete(BalloonFlight.computed.keys().next().value!)
    }
    return bodies
  }

  /** The type a flight lets go: its own figures over its type's. */
  static typeOf(flight: Pick<BalloonFlightJson, "balloon">): BalloonType {
    const stated = flight.balloon
    const id = typeof stated === "string" ? stated : stated?.id
    const type = BalloonTypes.byId(id) ?? BalloonTypes.ALL[0]
    return typeof stated === "string" ? type : { ...type, ...stated, id: type.id }
  }

  /** Every balloon of a flight: those stated one by one, then those its group draws; one at the start when neither says any. */
  static releasesOf(flight: BalloonFlightJson): BalloonRelease[] {
    const releases = [...(flight.releases ?? [])]
    const group = flight.group
    if (group && group.count > 0) {
      const random = BalloonFlight.randomFrom(group.seed ?? 1)
      const interval = group.count > 1 ? (group.untilT - group.fromT) / (group.count - 1) : 0
      const radiusM = group.radiusM ?? 10
      const spread = group.fillSpread ?? 0.1
      for (let i = 0; i < group.count; i++) {
        const t = group.fromT + interval * i + (random() - 0.5) * interval
        const r = radiusM * Math.sqrt(random()), angle = 2 * Math.PI * random()
        releases.push({
          t: Math.round(Math.min(group.untilT, Math.max(group.fromT, t))),
          eastM: Math.round(r * Math.sin(angle) * 10) / 10,
          northM: Math.round(r * Math.cos(angle) * 10) / 10,
          fill: Math.round((2 * random() - 1) * spread * 1000) / 1000,
          ...(group.colors?.length ? { color: group.colors[i % group.colors.length] } : {}),
          seed: Math.floor(random() * 4294967296)
        })
      }
    }
    return releases.length > 0 ? releases : [{ t: 0 }]
  }

  /**
   * The air of the standard atmosphere (ISA, 1976) at `heightM` above sea level, up to 47 km: its pressure, Pa, and its temperature, K,
   * the latter shifted by `offsetK`, the difference between the site's air and the standard air there, which fades out by 11 km above the
   * site (the weather of the ground is not the stratosphere's).
   */
  static airAt(heightM: number, offsetK = 0, siteM = 0): { pressurePa: number, temperatureK: number } {
    const layers = BalloonFlight.LAYERS
    // The layers are laid out in geopotential metres, which gravity's weakening with height makes fewer than geometric ones up there.
    const h = Math.max(-500, Math.min(BalloonFlight.EARTH_RADIUS_M * heightM / (BalloonFlight.EARTH_RADIUS_M + heightM), 47000))
    let layer = layers[0]
    for (const candidate of layers) if (h >= candidate.fromM) layer = candidate
    const dh = h - layer.fromM
    const T = layer.baseK + layer.lapseKM * dh
    const gMR = BalloonFlight.G * BalloonFlight.AIR_KG_MOL / BalloonFlight.R
    const pressurePa = layer.lapseKM === 0
      ? layer.basePa * Math.exp(-gMR * dh / layer.baseK)
      : layer.basePa * Math.pow(layer.baseK / T, gMR / layer.lapseKM)
    const fade = Math.max(0, 1 - Math.max(0, heightM - siteM) / 11000)
    return { pressurePa, temperatureK: T + offsetK * fade }
  }

  /** The Earth's radius the standard atmosphere's geopotential heights are reckoned with, m. */
  private static readonly EARTH_RADIUS_M = 6356766
  /** The layers of the standard atmosphere: where each starts, geopotential m, its temperature and pressure there, and its lapse, K/m. */
  private static readonly LAYERS = [
    { fromM: 0, baseK: 288.15, basePa: 101325, lapseKM: -0.0065 },
    { fromM: 11000, baseK: 216.65, basePa: 22632.06, lapseKM: 0 },
    { fromM: 20000, baseK: 216.65, basePa: 5474.889, lapseKM: 0.001 },
    { fromM: 32000, baseK: 228.65, basePa: 868.0187, lapseKM: 0.0028 }
  ]

  /** The wind at `aboveM` metres above the site, east and north components, m/s. */
  static windAt(flight: Pick<BalloonFlightJson, "wind" | "windsAloft">, aboveM: number): { x: number, y: number } {
    const levels = [{ atM: 0, ...(flight.wind ?? { towardDeg: 0, speedMS: 0 }) }, ...[...(flight.windsAloft ?? [])].sort((a, b) => a.atM - b.atM)]
    const of = (wind: BalloonWind) => ({ x: Math.sin(wind.towardDeg * Math.PI / 180) * wind.speedMS, y: Math.cos(wind.towardDeg * Math.PI / 180) * wind.speedMS })
    if (aboveM <= levels[0].atM || levels.length === 1) return of(levels[0])
    for (let i = 1; i < levels.length; i++) {
      if (aboveM > levels[i].atM) continue
      const a = of(levels[i - 1]), b = of(levels[i])
      const share = (aboveM - levels[i - 1].atM) / Math.max(1e-6, levels[i].atM - levels[i - 1].atM)
      return { x: a.x + (b.x - a.x) * share, y: a.y + (b.y - a.y) * share }
    }
    return of(levels[levels.length - 1])
  }

  /** What height a hot-air balloon's pilot aims at, metres above the site, `t` ms into the recording. */
  static planAt(flight: Pick<BalloonFlightJson, "plan">, t: number): number {
    const plan = [...(flight.plan ?? [])].sort((a, b) => a.t - b.t)
    if (plan.length === 0) return BalloonFlight.CRUISE_M
    let aim = plan[0].altitudeM
    for (const step of plan) if (step.t <= t) aim = step.altitudeM
    return aim
  }

  /** How wide a balloon holding `volumeM3` is, m: a sphere's width for that volume, or its type's own (see BalloonType.widthM). */
  static widthOf(type: BalloonType, volumeM3: number): number {
    if (type.widthM !== undefined) return type.widthM
    return Math.cbrt(6 * volumeM3 / Math.PI)
  }

  /**
   * The flight of one balloon from when it is let go until its time is up, it bursts, or it comes down and stays, sampled every `sampleMs`
   * (and where its burner starts and stops): where its lowest point is, metres (x east, y north, z up, the recording's own frame), how wide it
   * has swelled, and whether its burner fires. Integrated with what lifts it (the air it pushes aside less its gas, or less its own hot air),
   * its weight, and a quadratic drag relative to the wind of its height; what it carries along (its gas, and the air it pushes aside) is part
   * of what the forces move. A captive balloon's line holds it within its length of the site; a balloon on the ground and not lifting rests.
   */
  static trajectory(flight: BalloonFlightJson, release: BalloonRelease, sampleMs = BalloonFlight.SAMPLE_MS): { samples: BalloonSample[], end: BalloonEnd } {
    const type = BalloonFlight.typeOf(flight)
    const site = flight.site
    const ground = site.altitudeM ?? 0
    const seaM = site.originElevationM ?? 0
    const siteSeaM = seaM + ground
    const offsetK = (flight.airTemperatureC ?? 15) + 273.15 - BalloonFlight.airAt(siteSeaM).temperatureK
    const gasMol = type.gasMolarMassKgMol ?? BalloonTypes.HELIUM_KG_MOL
    const durationS = flight.durationS ?? type.durationS
    const step = BalloonFlight.STEP_S
    const steps = Math.ceil(durationS / step)
    sampleMs = Math.max(sampleMs, Math.ceil(durationS * 1000 / BalloonFlight.MAX_KEYFRAMES / 500) * 500)
    const perSample = Math.max(1, Math.round(sampleMs / 1000 / step))
    const anchor = { x: site.eastM + (release.eastM ?? 0), y: site.northM + (release.northM ?? 0) }
    const tether = type.envelope === "sealed" ? flight.tetherM ?? BalloonFlight.TETHER_M : undefined
    const air = (z: number) => {
      const { pressurePa, temperatureK } = BalloonFlight.airAt(z + seaM, offsetK, siteSeaM)
      return { p: pressurePa, T: temperatureK, rho: pressurePa / (BalloonFlight.R_AIR * temperatureK) }
    }
    // Its gas, weighed as its volume is stated, in the standard air at the sea (see BalloonType.launchVolumeM3): a crew fills a balloon to the
    // lift it wants, and what a gas lifts beyond its own weight is the same wherever it is filled.
    const fill = 1 + (release.fill ?? 0)
    const gasKg = type.launchVolumeM3 * fill * 101325 * gasMol / (BalloonFlight.R * 288.15)
    const startZ = release.altitudeM ?? ground
    const state: BalloonState = { x: anchor.x, y: anchor.y, z: startZ, vx: 0, vy: 0, vz: 0, gasKg, excessK: 0, burnUntilS: -1, ballastKg: type.ballastKg ?? 0, floated: false }
    // The air in a hot-air balloon's envelope starts as hot as holding it on the ground takes: let go, its pilot's first blast lifts it.
    if (type.envelope === "open") {
      const at = air(startZ)
      state.excessK = type.burner
        ? Math.max(0, at.T * type.massKg / (at.rho * type.maxVolumeM3 - type.massKg))
        : type.insideExcessK ?? 0
    }
    const volumeOf = (at: { p: number, T: number }) => {
      if (type.envelope === "open" || type.envelope === "sealed") return type.maxVolumeM3
      const natural = state.gasKg * BalloonFlight.R * at.T / (at.p * gasMol)
      return type.envelope === "vented" ? Math.min(natural, type.maxVolumeM3) : natural
    }
    const at0 = air(startZ)
    const samples: BalloonSample[] = [{ t: release.t, x: state.x, y: state.y, z: state.z, widthM: BalloonFlight.widthOf(type, volumeOf(at0)), burning: false }]
    const gust = BalloonFlight.gusts(flight.turbulence ?? BalloonFlight.TURBULENCE, BalloonFlight.seedOf(release), step)
    let end: BalloonEnd = "time"
    let restingS = 0
    let lastBurnEndS = -Infinity
    for (let i = 1; i <= steps; i++) {
      const s = i * step
      const at = air(state.z)
      // A latex balloon bursts once it has swelled to its most; a vented one lets go of the gas it can no longer hold.
      let volume = volumeOf(at)
      if (type.envelope === "elastic" && volume >= type.maxVolumeM3) {
        end = "burst"
        samples.push({ t: release.t + Math.round(s * 1000), x: state.x, y: state.y, z: state.z, widthM: BalloonFlight.widthOf(type, type.maxVolumeM3), burning: false })
        break
      }
      if (type.envelope === "vented") {
        const most = type.maxVolumeM3 * at.p * gasMol / (BalloonFlight.R * at.T)
        if (state.gasKg >= most) {
          state.gasKg = most
          state.floated = true
        }
        volume = volumeOf(at)
      }
      // A pilot fires the burner when it comes down faster, or climbs slower, than they want, and blasts it for its while.
      const burner = type.burner
      let burning = false
      if (burner) {
        const aim = BalloonFlight.planAt(flight, release.t + s * 1000)
        // Coming in to land, the pilot keeps a metre a second down to the ground rather than easing off over it.
        const wanted = aim <= 0 ? -Math.min(1, Math.max(0.5, (state.z - ground) / 40)) * BalloonFlight.PILOT_MS / 2
          : Math.max(-BalloonFlight.PILOT_MS, Math.min(BalloonFlight.PILOT_MS, (aim + ground - state.z) / 40))
        // Landing, they fire only to soften a descent too hard, and let hot air out as soon as it no longer comes down.
        const landing = aim <= 0
        const fireBelow = landing ? -2.5 : wanted - 0.3, ventAbove = landing ? -0.3 : wanted + 0.8
        if (s >= state.burnUntilS && state.vz < fireBelow && s - lastBurnEndS > 2 && state.excessK < burner.maxExcessK) {
          state.burnUntilS = s + burner.blastS
        }
        burning = s < state.burnUntilS
        if (!burning && state.burnUntilS > 0 && s - step < state.burnUntilS) lastBurnEndS = s
        if (burning) state.excessK = Math.min(burner.maxExcessK, state.excessK + burner.heatingKS * step)
        state.excessK -= state.excessK / burner.coolingS * step
        // Climbing much faster than wanted, the pilot pulls the vent at its crown open and lets hot air out.
        if (!burning && state.vz > ventAbove) state.excessK -= 0.5 * step
        state.excessK = Math.max(0, state.excessK)
      }
      const insideKg = type.envelope === "open" ? at.p * type.maxVolumeM3 / (BalloonFlight.R_AIR * (at.T + state.excessK)) : state.gasKg
      const lift = (at.rho * volume - insideKg) * BalloonFlight.G
      let massKg = type.massKg - ((type.ballastKg ?? 0) - state.ballastKg)
      // Heavier than what lifts it once it has floated, it lets go of the ballast that makes up the difference, while it has any.
      if (state.floated && state.ballastKg > 0 && lift < massKg * BalloonFlight.G) {
        const dropped = Math.min(state.ballastKg, massKg - lift / BalloonFlight.G)
        state.ballastKg -= dropped
        massKg -= dropped
      }
      const weight = massKg * BalloonFlight.G
      const inertia = massKg + insideKg + 0.5 * at.rho * volume
      const width = BalloonFlight.widthOf(type, volume)
      const area = Math.PI * width * width / 4 * (type.depthRatio !== undefined ? (1 + type.depthRatio) / 2 : 1)
      const above = state.z - ground
      const mean = BalloonFlight.windAt(flight, above), stray = gust()
      const near = Math.max(0, Math.min(1, above / BalloonFlight.GUST_GROUND_M))
      const wind = { x: mean.x + stray.x, y: mean.y + stray.y, z: stray.z * near }
      const rx = state.vx - wind.x, ry = state.vy - wind.y, rz = state.vz - wind.z
      const k = 0.5 * at.rho * type.dragCoefficient * area * Math.hypot(rx, ry, rz) / inertia
      // Semi-implicit: the drag is what sets its speed, and an explicit step would overshoot it.
      state.vx = (state.vx + k * step * wind.x) / (1 + k * step)
      state.vy = (state.vy + k * step * wind.y) / (1 + k * step)
      state.vz = (state.vz + k * step * wind.z + (lift - weight) / inertia * step) / (1 + k * step)
      const resting = state.z <= ground + 1e-6 && state.vz <= 0
      if (resting) {
        state.vx = 0
        state.vy = 0
        state.vz = 0
      }
      state.x += state.vx * step
      state.y += state.vy * step
      state.z = Math.max(ground, state.z + state.vz * step)
      if (tether !== undefined) BalloonFlight.heldBy(state, anchor, ground, tether)
      // Down again and staying there, a free balloon's flight is over (a hot-air balloon has landed; a party balloon is in a tree).
      restingS = resting && s > 10 ? restingS + step : 0
      const landed = restingS > 30 && type.envelope !== "sealed"
      const switching = samples.length > 0 && samples[samples.length - 1].burning !== burning
      if (i % perSample === 0 || i === steps || switching || landed) {
        const t = release.t + Math.round(s * 1000)
        // A burner starting or stopping is stated by two keys a millisecond apart (see BodyKeyframe.lights).
        if (switching) samples.push({ t: t - 1, x: state.x, y: state.y, z: state.z, widthM: width, burning: !burning })
        samples.push({ t, x: state.x, y: state.y, z: state.z, widthM: width, burning })
      }
      if (landed) {
        end = "landed"
        break
      }
    }
    return { samples, end }
  }

  /**
   * A captive balloon's line: no farther from where it is tied than its length. Pulled past it, it is brought back onto the sphere of its
   * line, its speed away from the anchor gone, so that the wind leans it over and its lift holds it up.
   */
  private static heldBy(state: BalloonState, anchor: { x: number, y: number }, ground: number, lengthM: number): void {
    const dx = state.x - anchor.x, dy = state.y - anchor.y, dz = state.z - ground
    const distance = Math.hypot(dx, dy, dz)
    if (distance <= lengthM || distance === 0) return
    const nx = dx / distance, ny = dy / distance, nz = dz / distance
    state.x = anchor.x + nx * lengthM
    state.y = anchor.y + ny * lengthM
    state.z = ground + nz * lengthM
    const away = state.vx * nx + state.vy * ny + state.vz * nz
    if (away > 0) {
      state.vx -= away * nx
      state.vy -= away * ny
      state.vz -= away * nz
    }
  }

  /** One balloon as a body: its model along its computed path, at the size it has swelled to, gone once its flight is over. */
  private static balloonBody(flight: BalloonFlightJson, release: BalloonRelease, index: number, count: number): BodyJson {
    const type = BalloonFlight.typeOf(flight)
    const { samples } = BalloonFlight.trajectory(flight, release)
    const color = release.color ?? flight.color ?? (type.glow ? type.glow.color : type.color)
    const depth = type.depthRatio ?? 1
    const lamp = flight.lit && type.lamp ? type.lamp : undefined
    // An LED balloon glows all over: its LED's candela over the disc it shows.
    const glowCdM2 = (width: number) => type.glow ? type.glow.candela / (Math.PI * width * width / 4) : 0
    // A foil balloon turns slowly as it goes, at a rate of its own.
    const random = BalloonFlight.randomFrom(BalloonFlight.seedOf(release) ^ 0x9e3779b9)
    const spinDegS = type.finish === "mirror" ? (5 + 15 * random()) * (random() < 0.5 ? -1 : 1) : 0
    const headingStart = 360 * random()
    let lastWidth = -1
    const track: BodyKeyframe[] = samples.map((sample, i) => {
      const resized = Math.abs(sample.widthM - lastWidth) > lastWidth * 0.005
      if (resized) lastWidth = sample.widthM
      const size = { widthM: BalloonFlight.round(sample.widthM, 1000), lengthM: BalloonFlight.round(sample.widthM * depth, 1000), heightM: BalloonFlight.round(sample.widthM * type.aspect, 1000) }
      const key: BodyKeyframe = {
        t: sample.t,
        eastM: BalloonFlight.round(sample.x),
        northM: BalloonFlight.round(sample.y),
        altitudeM: BalloonFlight.round(sample.z),
        ...(i === 0 ? { present: true } : {}),
        ...(resized ? { sizeM: size } : {}),
        ...(spinDegS !== 0 ? { attitude: { headingDeg: BalloonFlight.round(((headingStart + spinDegS * (sample.t - release.t) / 1000) % 360 + 360) % 360, 10) } } : {}),
        ...(i === 0 ? { appearance: { color, albedo: type.albedo, ...(type.finish ? { finish: type.finish } : {}), ...(type.glow ? { luminanceCdM2: glowCdM2(sample.widthM) } : {}) } }
          : type.glow && resized ? { appearance: { color, luminanceCdM2: BalloonFlight.round(glowCdM2(sample.widthM), 100) } } : {})
      }
      const lights = BalloonFlight.lightsOf(type, sample.burning, lamp, sample.widthM)
      if (lights) key.lights = lights
      return key
    })
    track.push({ t: samples[samples.length - 1].t + 1, present: false })
    const title = flight.title ?? BalloonFlight.TITLES[type.id]
    const explains = flight.explainsEach
      ? (flight.explainsEach[index] !== undefined ? { explains: [flight.explainsEach[index]] } : {})
      : { ...(flight.explains ? { explains: flight.explains } : {}), ...(count > 1 ? { ensemble: flight.id } : {}) }
    const colours: Record<string, string> = { envelopeColor: color }
    if (type.stripeColor) colours.stripeColor = type.stripeColor
    if (lamp) colours.lampColor = lamp.color
    return {
      id: count > 1 ? `${flight.id}-${index + 1}` : flight.id,
      title, ...explains,
      model: { id: type.modelId }, modelParameters: colours,
      ...(type.id === "hot-air" ? { sound: { kind: "balloon" } } : {}),
      // Let go from the ground where it is, not from the ground at the recording's origin.
      altitudeFrom: { eastM: samples[0].x, northM: samples[0].y },
      track
    }
  }

  /**
   * The luminance of each of its model's lights, cd/m², by material (see build-balloons.ts): a hot-air balloon's flame and the envelope it
   * lights from inside while it fires, nothing between; a pilot balloon's lamp, its candela over the disc it shows. None for a balloon with
   * no light of its own.
   */
  static lightsOf(type: BalloonType, burning: boolean, lamp: BalloonType["lamp"] | undefined, widthM: number): Record<string, number> | undefined {
    if (type.burner) {
      const envelope = burning ? type.burner.envelopeCdM2 : 0
      return { flame: burning ? type.burner.flameCdM2 : 0, envelope, "envelope-stripe": envelope }
    }
    if (type.modelId === "ufoathome-balloon-latex") {
      // The lamp is a ball a fortieth of the balloon's width at its neck (see build-balloons.ts).
      const radiusM = widthM / 40
      return { "light-lamp": lamp ? BalloonFlight.round(lamp.candela / (Math.PI * radiusM * radiusM), 1) : 0 }
    }
    return undefined
  }

  /** A balloon's own seed: the one it was given, or one drawn from when and where it is let go. */
  private static seedOf(release: BalloonRelease): number {
    if (release.seed !== undefined) return release.seed
    return (Math.round(release.t) * 2654435761 + Math.round((release.eastM ?? 0) * 100) * 40503 + Math.round((release.northM ?? 0) * 100)) >>> 0
  }

  /** The gusts one balloon meets, a step at a time: an Ornstein–Uhlenbeck process on each component (see SkyLantern.gusts). */
  private static gusts(turbulence: BalloonTurbulence, seed: number, stepS: number): () => { x: number, y: number, z: number } {
    const random = BalloonFlight.randomFrom(seed)
    const normal = () => Math.sqrt(-2 * Math.log(Math.max(1e-12, random()))) * Math.cos(2 * Math.PI * random())
    const keep = turbulence.timescaleS > 0 ? Math.exp(-stepS / turbulence.timescaleS) : 0
    const push = Math.sqrt(1 - keep * keep)
    const gust = { x: turbulence.horizontalMS * normal(), y: turbulence.horizontalMS * normal(), z: turbulence.verticalMS * normal() }
    return () => {
      gust.x = keep * gust.x + push * turbulence.horizontalMS * normal()
      gust.y = keep * gust.y + push * turbulence.horizontalMS * normal()
      gust.z = keep * gust.z + push * turbulence.verticalMS * normal()
      return gust
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
