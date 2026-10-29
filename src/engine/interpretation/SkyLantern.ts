import type { SaidPosition } from "../model/SaidPosition.js"
import type { SaidText } from "../model/SaidText.js"
import type { BodyJson, BodyKeyframe, InterpretationJson } from "./Interpretation.js"

/**
 * Sky lanterns (Thai lanterns, Kongming lanterns) an interpretation claims were what the observer saw: paper envelopes lifted by the air a
 * burning fuel cell heats inside them, let go one after the other from a wedding, a festival, a new year's eve.
 *
 * It is stated as what an analyst knows or assumes — where they were let go and when, what wind there was — and each lantern's flight is
 * COMPUTED from that, not drawn: it climbs while the hot air lifts more than it weighs, at the speed the air's drag allows, goes with the
 * wind, and comes down once its fuel is spent and its air has cooled. That is what makes it worth computing: lanterns let go a minute apart
 * from the same garden, climbing each at its own rate into a wind that turns and strengthens with height, spread into the loose, slowly
 * drifting "formation" of orange points that observers a few kilometres away report as a fleet, silent, holding together, then going out
 * one by one.
 *
 * Each lantern becomes an ordinary body (see SkyLantern.bodiesOf): a glowing ellipsoid the size of its envelope whose track is sampled from
 * the computation, so it is drawn, lit and confronted as every other body is.
 */
export interface LanternLaunchJson {
  id: string
  title?: SaidText
  /** Where they are let go, in the recording's own frame (see BodyKeyframe). */
  site: LanternSite
  /** Each lantern let go, stated one by one. None when absent: `group` then says them all. */
  releases?: LanternRelease[]
  /** Lanterns let go as a group, of which only how many, over what span and how unlike each other is stated (see LanternGroup); added to
   * `releases`. */
  group?: LanternGroup
  /** The lantern let go: a common 1 m one when absent (see SkyLantern.COMMON). Any field left out is the common one's. */
  lantern?: Partial<LanternType>
  /** The wind at the ground: where it blows TOWARDS, degrees, and its speed. None when absent. */
  wind?: LanternWind
  /** The wind higher up, at `atM` metres above the site, blended with `wind` in between and held above: what makes lanterns let go at the
   * same spot part ways as they climb at different rates. The ground wind throughout when absent. */
  windAloft?: LanternWind & { atM: number }
  /** The air temperature at the site, °C, falling by 6.5 °C per kilometre above it: what the lanterns' hot air is lighter than. 10 when
   * absent. */
  airTemperatureC?: number
  /** The gusts and eddies of the air, each lantern meeting its own: what scatters a group let go at one spot (see LanternTurbulence).
   * SkyLantern.TURBULENCE (a light breeze's) when absent; all zero for a still, laminar air. */
  turbulence?: LanternTurbulence
}

/**
 * How the air a lantern goes through strays from the mean wind: by how much, horizontally and vertically (the spread of its speed about
 * the mean, m/s), and for how long a gust lasts before another takes over, s. Each lantern meets its own, drawn from its own seed (see
 * LanternRelease.seed), the same each time.
 */
export interface LanternTurbulence {
  horizontalMS: number
  verticalMS: number
  timescaleS: number
}

/** Where lanterns are let go: metres east and north of the recording's origin, and above the ground there (see BodyKeyframe.altitudeM). */
export interface LanternSite {
  eastM: number
  northM: number
  /** How it was said, when not as metres from the observer (see SaidPosition). */
  saidPosition?: SaidPosition
  /** Metres between where they are let go and the ground at the recording's origin. 0 when absent. */
  altitudeM?: number
  /** The height above sea level of the ground at the recording's origin, m: what sets how thin the air they climb into is. 0 when absent. */
  originElevationM?: number
}

/**
 * A number of lanterns let go between two instants, as a crowd does: each at its own instant, from its own spot round the site, burning its
 * own time with its own flame — drawn at random within what is stated, the same each time for the same `seed`, so that a recording plays
 * alike everywhere. Their mean lifetime is what a fuel cell gives (8 to 15 minutes by the sellers); when each goes out is where it vanishes.
 */
export interface LanternGroup {
  count: number
  /** Ms of the recording between which they are let go, spread evenly with a jitter of half the interval. */
  fromT: number
  untilT: number
  /** How far round the site each is let go from, m. 20 when absent. */
  radiusM?: number
  /** How long each burns from when it is let go, s, drawn between the two. 480 to 900 when absent. */
  burnS?: { min: number, max: number }
  /** How much hotter than the air its air is at full burn, K, drawn between the two: what sets how fast it climbs, and so how high it gets.
   * 125 to 175 when absent. */
  insideExcessK?: { min: number, max: number }
  /** How long each had burned already when let go, or seen first (see LanternRelease.burnedS). 0 when absent. */
  burnedS?: number
  /** The phenomena of the account the group claims to be — see BodyJson.explains. */
  explains?: string[]
  /** What the draws start from. 1 when absent. */
  seed?: number
}

export interface LanternWind {
  towardDeg: number
  speedMS: number
}

/** One lantern let go. */
export interface LanternRelease {
  /** Ms of the recording. */
  t: number
  /** The phenomena of the account this lantern claims to be — see BodyJson.explains. */
  explains?: string[]
  /** Metres east and north of the site it is let go from: a crowd lets them go a few metres apart. */
  eastM?: number
  northM?: number
  /** Metres above the ground at the recording's origin it starts from, instead of the site's: for a lantern the account only has from where
   * it was first seen, already up, rather than from where it was let go. */
  altitudeM?: number
  /** How long it had burned already at `t`, s: one first seen in the air has not got its whole burn ahead of it. 0 when absent. */
  burnedS?: number
  /** What this one has of its own: no two fuel cells burn alike, nor do two envelopes hold their air alike. */
  lantern?: Partial<LanternType>
  /** What the gusts it meets are drawn from (see LanternTurbulence): drawn from the group's seed for a group, from when and where it is let
   * go when absent. */
  seed?: number
}

/** What a lantern is made of and how it burns: what the computation needs of it. */
export interface LanternType {
  /** How much air its envelope holds, m³. */
  envelopeVolumeM3: number
  /** What it weighs when let go — paper, frame and fuel cell — kg. */
  massKg: number
  /** The mass of fuel it burns away by the time it goes out, kg. */
  fuelKg: number
  /** How long it burns from when it is let go, s. */
  burnS: number
  /** How much hotter than the air round it the air in its envelope is while its fuel burns fully, K. */
  insideExcessK: number
  /** Drag coefficient times reference area, m²: how hard the air brakes it. */
  dragAreaM2: number
  /** Its luminous intensity at full burn, candela: the flame's light through the paper. */
  luminousIntensityCd: number
  /** How wide and how tall its envelope is, m: the size of the glowing body drawn. */
  widthM: number
  heightM: number
  /** The colour of its light through the paper, CSS. */
  color: string
}

/** A state of one lantern, metres and seconds, x east, y north, z up from the recording's origin. */
interface LanternState {
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  /** How much hotter than the air round it its air is, K. */
  excessK: number
}

export class SkyLantern {

  /**
   * The common lantern sold for weddings and festivals: about 1 m tall and 0.6 m across its top, of rice paper on a bamboo (or wire) ring,
   * with a fuel cell of paraffin-soaked paper burning 8 to 15 minutes.
   *
   * From retailers' listings: 0.9 to 1.1 m tall, 0.6 to 0.7 m across, 40 to 80 g with a 25 to 35 g fuel cell. The rest is ASSUMED, for no
   * measurement was found: the envelope volume (a truncated cone of those sizes, 0.19 m³); the air inside 150 K hotter than outside, which
   * is what such a mass needs to climb at the 1 to 2 m/s seen and reach the few hundred metres to a kilometre reported; the drag area of
   * a blunt body that size (Cd ≈ 0.8 over 0.3 m²); and above all the light: 10 cd, a flame some ten candles' worth seen through paper that
   * lets half of it out, which puts one at 2 km at about magnitude 0, a bright star — what observers compare them to. It is the figure a
   * variant should move first.
   */
  static readonly COMMON: LanternType = {
    envelopeVolumeM3: 0.19,
    massKg: 0.065,
    fuelKg: 0.03,
    burnS: 600,
    insideExcessK: 150,
    dragAreaM2: 0.25,
    luminousIntensityCd: 10,
    widthM: 0.6,
    heightM: 1,
    color: "#ffa250"
  }

  /** How often a lantern's computed path is sampled into keyframes, ms: it moves metres per second, the player blends between them. */
  static readonly SAMPLE_MS = 1000
  /** The integration step, s. */
  private static readonly STEP_S = 0.05
  /** How long the air in the envelope takes to follow the flame, s: it is renewed through the opening at the bottom within tens of seconds. */
  static readonly COOLING_S = 20
  /**
   * The air's own stirring when nothing is stated, ASSUMED: a light breeze's, its speed straying by some 0.8 m/s about the mean and rising
   * and sinking by 0.3 m/s, each gust holding some 30 s — what turns a dozen lanterns let go together into the loose, shifting, stretching
   * string they are seen as, and not a rigid formation.
   */
  static readonly TURBULENCE: LanternTurbulence = { horizontalMS: 0.8, verticalMS: 0.3, timescaleS: 30 }
  private static readonly G = 9.81
  /** The gas constant of dry air, J/(kg·K). */
  private static readonly R_AIR = 287.05
  /** Temperature lapse with height, K/m. */
  private static readonly LAPSE = 0.0065

  /** The interpretation with every lantern of its launches added to its bodies. Unchanged when it states none. */
  static expand(interpretation: InterpretationJson): InterpretationJson
  static expand(interpretation: InterpretationJson | undefined): InterpretationJson | undefined
  static expand(interpretation: InterpretationJson | undefined): InterpretationJson | undefined {
    const launches = interpretation?.lanterns
    if (!interpretation || !launches || launches.length === 0) return interpretation
    return { ...interpretation, bodies: [...interpretation.bodies, ...launches.flatMap(launch => SkyLantern.bodiesOf(launch))] }
  }

  /** The bodies of one launch: one per lantern let go. */
  static bodiesOf(launch: LanternLaunchJson): BodyJson[] {
    return SkyLantern.releasesOf(launch).map((release, index) => SkyLantern.lanternBody(launch, release, index))
  }

  /** Every lantern of a launch: those stated one by one, then those its group draws. */
  static releasesOf(launch: LanternLaunchJson): LanternRelease[] {
    const releases = [...(launch.releases ?? [])]
    const group = launch.group
    if (!group || !(group.count > 0)) return releases
    const random = SkyLantern.randomFrom(group.seed ?? 1)
    const between = (range: { min: number, max: number }) => range.min + (range.max - range.min) * random()
    const interval = group.count > 1 ? (group.untilT - group.fromT) / (group.count - 1) : 0
    const radiusM = group.radiusM ?? 20
    for (let i = 0; i < group.count; i++) {
      const t = group.fromT + interval * i + (random() - 0.5) * interval
      // Uniform over the disc round the site.
      const r = radiusM * Math.sqrt(random()), angle = 2 * Math.PI * random()
      releases.push({
        t: Math.round(Math.min(group.untilT, Math.max(group.fromT, t))),
        explains: group.explains,
        eastM: Math.round(r * Math.sin(angle) * 10) / 10,
        northM: Math.round(r * Math.cos(angle) * 10) / 10,
        burnedS: group.burnedS,
        seed: Math.floor(random() * 4294967296),
        lantern: {
          burnS: Math.round(between(group.burnS ?? { min: 480, max: 900 })),
          insideExcessK: Math.round(between(group.insideExcessK ?? { min: 125, max: 175 }))
        }
      })
    }
    return releases
  }

  /** A generator of numbers from 0 to 1 that gives the same ones for the same seed (mulberry32). */
  private static randomFrom(seed: number): () => number {
    let state = seed >>> 0
    return () => {
      state = (state + 0x6d2b79f5) >>> 0
      let z = state
      z = Math.imul(z ^ (z >>> 15), z | 1)
      z ^= z + Math.imul(z ^ (z >>> 7), z | 61)
      return ((z ^ (z >>> 14)) >>> 0) / 4294967296
    }
  }

  /** The lantern a release lets go: its own, over the launch's, over the common one. */
  static typeOf(launch: LanternLaunchJson, release: LanternRelease): LanternType {
    return { ...SkyLantern.COMMON, ...launch.lantern, ...release.lantern }
  }

  /**
   * How much of its full heat its flame gives at `s` seconds after it was let go: lit before it was let go (it is held until its envelope
   * fills), full for most of its burn, then dying over the last quarter as the last of the paraffin goes.
   */
  static heatShare(type: LanternType, s: number): number {
    if (s < 0 || s >= type.burnS) return 0
    const fade = type.burnS * 0.75
    return s <= fade ? 1 : (type.burnS - s) / (type.burnS - fade)
  }

  /** The wind at `z` metres above the site, as east and north components, m/s. */
  static windAt(launch: LanternLaunchJson, z: number): { x: number, y: number } {
    const ground = SkyLantern.componentsOf(launch.wind)
    const aloft = launch.windAloft
    if (!aloft) return ground
    const high = SkyLantern.componentsOf(aloft)
    const share = Math.max(0, Math.min(1, z / aloft.atM))
    return { x: ground.x + (high.x - ground.x) * share, y: ground.y + (high.y - ground.y) * share }
  }

  /**
   * The path of one lantern from its release until it goes out (or comes down while still lit), sampled every `sampleMs`: positions in
   * metres (x east, y north, z up, the recording's own frame) and the share of its full light at each. Integrated with the lift of its hot
   * air, its weight (lightening as its fuel burns), and a quadratic drag relative to the wind, in air thinning and cooling with height; what
   * it carries along (its own air, and the air it pushes aside) is part of what the forces move.
   */
  static trajectory(launch: LanternLaunchJson, release: LanternRelease, sampleMs = SkyLantern.SAMPLE_MS): { t: number, x: number, y: number, z: number, light: number }[] {
    const type = SkyLantern.typeOf(launch, release)
    const site = launch.site
    const ground = site.altitudeM ?? 0
    const burned = Math.max(0, release.burnedS ?? 0)
    const seaLevelOffset = site.originElevationM ?? 0
    const groundK = (launch.airTemperatureC ?? 10) + 273.15
    const state: LanternState = { x: site.eastM + (release.eastM ?? 0), y: site.northM + (release.northM ?? 0), z: release.altitudeM ?? ground, vx: 0, vy: 0, vz: 0, excessK: type.insideExcessK * SkyLantern.heatShare(type, burned) }
    const step = SkyLantern.STEP_S, perSample = Math.max(1, Math.round(sampleMs / 1000 / step))
    const steps = Math.ceil(Math.max(0, type.burnS - burned) / step)
    const samples = [{ t: release.t, x: state.x, y: state.y, z: state.z, light: SkyLantern.heatShare(type, burned) }]
    const gust = SkyLantern.gusts(launch.turbulence ?? SkyLantern.TURBULENCE, SkyLantern.seedOf(release), step)
    for (let i = 1; i <= steps; i++) {
      // Seconds since it was let go, and since the recording first has it.
      const elapsed = i * step, s = burned + elapsed
      const heat = SkyLantern.heatShare(type, s)
      state.excessK += (type.insideExcessK * heat - state.excessK) * Math.min(1, step / SkyLantern.COOLING_S)
      const above = state.z - ground
      const outsideK = groundK - SkyLantern.LAPSE * Math.max(0, above)
      const pressure = 101325 * Math.exp(-(state.z + seaLevelOffset) / 8400)
      const rho = pressure / (SkyLantern.R_AIR * outsideK)
      const insideRho = pressure / (SkyLantern.R_AIR * (outsideK + state.excessK))
      const mass = type.massKg - type.fuelKg * Math.min(1, s / type.burnS)
      const lift = (rho - insideRho) * type.envelopeVolumeM3 * SkyLantern.G
      // What the forces move: the lantern, the air it holds, and half the air it displaces as it goes (a sphere's added mass).
      const inertia = mass + insideRho * type.envelopeVolumeM3 + 0.5 * rho * type.envelopeVolumeM3
      // The mean wind of that height, and the gust it is meeting there.
      const mean = SkyLantern.windAt(launch, above), stray = gust()
      const wind = { x: mean.x + stray.x, y: mean.y + stray.y, z: stray.z }
      const rx = state.vx - wind.x, ry = state.vy - wind.y, rz = state.vz - wind.z
      const k = 0.5 * rho * type.dragAreaM2 * Math.hypot(rx, ry, rz) / inertia
      // Semi-implicit, as the drag is what sets its speed and an explicit step would overshoot it.
      state.vx = (state.vx + k * step * wind.x) / (1 + k * step)
      state.vy = (state.vy + k * step * wind.y) / (1 + k * step)
      state.vz = (state.vz + k * step * wind.z + (lift - mass * SkyLantern.G) / inertia * step) / (1 + k * step)
      state.x += state.vx * step
      state.y += state.vy * step
      state.z = Math.max(ground, state.z + state.vz * step)
      const landed = state.z <= ground && elapsed > 10
      if (i % perSample === 0 || i === steps || landed) samples.push({ t: release.t + Math.round(elapsed * 1000), x: state.x, y: state.y, z: state.z, light: heat })
      if (landed) break
    }
    return samples
  }

  /** A lantern's own seed: the one it was given, or one drawn from when and where it is let go. */
  private static seedOf(release: LanternRelease): number {
    if (release.seed !== undefined) return release.seed
    return (Math.round(release.t) * 2654435761 + Math.round((release.eastM ?? 0) * 100) * 40503 + Math.round((release.northM ?? 0) * 100)) >>> 0
  }

  /**
   * The gusts one lantern meets, a step of `stepS` at a time: each component of the air's speed about the mean wanders as a gust does,
   * drawn back towards none over the timescale and pushed at random meanwhile (an Ornstein–Uhlenbeck process), with the stated spread.
   */
  private static gusts(turbulence: LanternTurbulence, seed: number, stepS: number): () => { x: number, y: number, z: number } {
    const random = SkyLantern.randomFrom(seed)
    // A normal draw from two uniform ones (Box–Muller).
    const normal = () => Math.sqrt(-2 * Math.log(Math.max(1e-12, random()))) * Math.cos(2 * Math.PI * random())
    const keep = turbulence.timescaleS > 0 ? Math.exp(-stepS / turbulence.timescaleS) : 0
    const push = Math.sqrt(1 - keep * keep)
    // Started anywhere in its spread, as the air is when the lantern is let go into it.
    const gust = { x: turbulence.horizontalMS * normal(), y: turbulence.horizontalMS * normal(), z: turbulence.verticalMS * normal() }
    return () => {
      gust.x = keep * gust.x + push * turbulence.horizontalMS * normal()
      gust.y = keep * gust.y + push * turbulence.horizontalMS * normal()
      gust.z = keep * gust.z + push * turbulence.verticalMS * normal()
      return gust
    }
  }

  private static componentsOf(wind: LanternWind | undefined): { x: number, y: number } {
    if (!wind) return { x: 0, y: 0 }
    const toward = wind.towardDeg * Math.PI / 180
    return { x: Math.sin(toward) * wind.speedMS, y: Math.cos(toward) * wind.speedMS }
  }

  /** One lantern as a body: a glowing ellipsoid along its computed path, gone once it is out. */
  private static lanternBody(launch: LanternLaunchJson, release: LanternRelease, index: number): BodyJson {
    const type = SkyLantern.typeOf(launch, release)
    // The light of its whole envelope, spread over what the observer sees of it: an ellipse its width by its height.
    const fullLuminance = type.luminousIntensityCd / (Math.PI * type.widthM / 2 * type.heightM / 2)
    const path = SkyLantern.trajectory(launch, release)
    const size = { widthM: type.widthM, lengthM: type.widthM, heightM: type.heightM }
    const track: BodyKeyframe[] = path.map((point, i) => ({
      t: point.t,
      eastM: point.x,
      northM: point.y,
      altitudeM: point.z,
      ...(i === 0 ? { sizeM: size, present: true } : {}),
      appearance: { color: type.color, luminanceCdM2: fullLuminance * point.light, ...(i === 0 ? { albedo: 0.6, haloScale: 1 } : {}) }
    }))
    track.push({ t: path[path.length - 1].t + 1, present: false })
    return { id: `${launch.id}-lantern-${index + 1}`, title: launch.title, explains: release.explains, model: { id: "sphere" }, track }
  }
}
