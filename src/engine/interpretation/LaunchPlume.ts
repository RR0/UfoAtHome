import * as Astronomy from "astronomy-engine"
import type { SaidText } from "../model/SaidText.js"
import { ExhaustFlight, ExhaustPath } from "./ExhaustFlight.js"
import { ReentrySighting } from "./Reentry.js"
import type { GeoPoint, ReentryKeyframe, SkyPoint } from "./Reentry.js"

/**
 * The exhaust a rocket leaves in the sky, which shows when the Sun still lights it and not the ground
 * below: the "space jellyfish" seen over New York on 25 August 2026, the last Falcon 9 Starlink
 * launch from Florida, 1 100 km from where it flew.
 *
 * Like a re-entry (see ReentryJson) it is not a body: it stands tens to hundreds of kilometres up and
 * is seen from as far, so it is placed where it really was — latitude, longitude, height — and seen
 * through the Earth's actual shape. Unlike a re-entry it makes no light of its own. What is seen is
 * sunlight scattered by the exhaust, so everything here turns on three things the interpretation does
 * NOT state and the engine computes: where the Earth's shadow is, how the plume has spread since each
 * part left the engine, and which way the light is scattered towards this observer.
 *
 * The plume is a string of puffs, each the exhaust of a short stretch of the burn. It is the
 * interpretation that says where the stage flew and while which seconds the engine burned; the
 * amount of exhaust that scatters, and how fast it spreads, are properties of the plume with a
 * default each (see LaunchPlumeSighting) which an interpretation can overwrite when it knows better.
 *
 * Each puff then flies on its own (see ExhaustFlight), so the plume is a thing in space and not a
 * picture: seen from the side, from ahead or from behind, it is the same puffs in the same places.
 * Besides the burn of the ascent, a stage can let other things go (`jets`): another burn, and the
 * propellant it vents once its work is done, which from a spinning stage draws a spiral.
 */
export interface LaunchJson {
  id: string
  title?: SaidText
  /** The phenomena of the account (their `sourceId`s) this launch claims to be — see BodyJson.explains. */
  explains?: string[]
  /** What flew, as its operator names it. */
  vehicle?: LaunchVehicle
  /** Where the stage stood at instants of the recording, ms. At least two; it may begin before the recording does. */
  track: ReentryKeyframe[]
  /** When the engine started and stopped, ms of the recording. The ends of the track when absent. */
  burnFromT?: number
  burnUntilT?: number
  plume?: LaunchPlumeJson
  /**
   * What else the stage lets go, each while some seconds of the recording. When there are any, the
   * burn of the ascent (`burnFromT`/`burnUntilT`) is drawn only if one of its ends is stated: the
   * stage of a launch seen hours later, deorbited over another continent, burned nothing on this track.
   */
  jets?: LaunchJetJson[]
}

/**
 * Something a stage lets go besides the exhaust of its ascent: another burn of its engine (a deorbit
 * burn, the stage turned round so that its exhaust leaves ahead of it and slows it), or propellant
 * vented from its tanks once its work is done. Each leaves the stage in one direction, at one speed,
 * and turns with the stage if the stage spins, so that vented propellant draws a spiral round it.
 */
export interface LaunchJetJson {
  id?: string
  /**
   * "burn": the engine burns, and what leaves it is its exhaust, with the vehicle's plume (its flow,
   * its velocity, its collar and trail). "vent": propellant let out of the tanks, slower and colder,
   * which turns to particles almost wholly. "burn" when absent.
   */
  kind?: LaunchJetKind
  /** When it starts and stops, ms of the recording. */
  fromT: number
  untilT: number
  /**
   * Which way it leaves the stage, degrees from straight back along the stage's motion: 0 behind it
   * (an engine pushing it on), 90 sideways, 180 ahead of it (an engine braking it). 0 when absent.
   */
  angleDeg?: number
  /**
   * Round the stage's line of motion, which side it leaves on at the start, degrees from the side
   * facing away from the Earth, towards the right of the motion. 0 when absent.
   */
  azimuthDeg?: number
  /**
   * How long the stage takes to turn once round its line of motion, seconds; the jet turns with it.
   * Negative turns the other way. A stage that does not spin has none.
   */
  spinPeriodS?: number
  /** How fast it leaves the stage, km/s. A burn's default is the engine's exhaust velocity. */
  speedKmPerS?: number
  /** Mass let go each second, kg. A burn's default is the engine's exhaust flow. */
  massKgPerS?: number
  /** What of it ends up as particles, their size, how fast a puff spreads and how long it lasts: as for the plume. */
  condensedShare?: number
  particleRadiusUm?: number
  expansionKmPerS?: number
  initialRadiusKm?: number
  lifetimeS?: number
}

export type LaunchJetKind = "burn" | "vent"

export interface LaunchVehicle {
  /** "Falcon 9". */
  name?: string
  /** "Starlink Group 10-49". */
  mission?: string
  /**
   * The engine whose exhaust it is. What the plume looks like follows from it: how much exhaust
   * leaves each second (thrust over exhaust velocity), how fast it leaves, which sets how wide the
   * collar round the stage spreads, and what the exhaust is made of, which sets how much of it
   * turns into particles that scatter light. Any of the plume's own values (`plume`) still wins.
   */
  engine?: LaunchEngine
}

/** What fuel the engine burns, which decides what its exhaust leaves behind. */
export type Propellant = "rp1-lox" | "methane-lox" | "hydrogen-lox" | "hypergolic" | "solid"

export interface LaunchEngine {
  /** Thrust in vacuum, kN: a Merlin Vacuum's 934, an RL10's 110, a solid booster's thousands. */
  thrustKN?: number
  /** Specific impulse in vacuum, seconds: 348 for a Merlin Vacuum, 465 for an RL10, 285 for a solid. */
  specificImpulseS?: number
  propellant?: Propellant
}

/** What the exhaust is made of and how it spreads. Each has a default (LaunchPlumeSighting) when absent. */
export interface LaunchPlumeJson {
  /** Mass of exhaust leaving the engine, kg per second. */
  exhaustKgPerS?: number
  /** The share of that exhaust that ends up as particles that scatter light, 0 to 1. */
  condensedShare?: number
  /** Radius of those particles, micrometres. */
  particleRadiusUm?: number
  /** How fast a puff's radius grows, km per second, from `initialRadiusKm`. */
  expansionKmPerS?: number
  initialRadiusKm?: number
  /** How long a puff lasts before the particles have gone, seconds. */
  lifetimeS?: number
  /**
   * The share of the particles that is the collar: exhaust just let go, which leaves the nozzle at
   * its exhaust velocity (3.4 km/s for a Merlin Vacuum) and, with almost no air to stop it, spreads
   * into a wide, short-lived shell round the stage, where the rest stays behind as the narrow trail.
   */
  collarShare?: number
  /** How fast the collar's radius grows, km per second, and how long it lasts, seconds. */
  collarExpansionKmPerS?: number
  collarLifetimeS?: number
}

/** A burn or a jet with every value it needs, the stated ones or the defaults (see LaunchPlumeSighting.releasesOf). */
export interface LaunchRelease {
  /** Names it among the launch's releases, so that its puffs are recognised from one frame to the next. */
  key: string
  fromT: number
  untilT: number
  angleDeg: number
  azimuthDeg: number
  spinPeriodS?: number
  speedKmPerS: number
  massKgPerS: number
  condensedShare: number
  particleRadiusUm: number
  initialRadiusKm: number
  /** The parts of what it lets go that spread and fade each at their own pace, with the share of the mass each is. */
  populations: { share: number; expansionKmPerS: number; lifetimeS: number }[]
}

/** One puff of a plume at one instant, as it is in space. */
export interface PlumePuff {
  launchId: string
  /** The burn or jet that let it go (see LaunchRelease.key). */
  release: string
  /** Where its centre is. */
  at: GeoPoint
  radiusKm: number
  /** The optical depth of the column through its middle in green light, what is left of it at its age included. */
  opticalDepth: number
  /** How much of each channel it scatters over the green: the colour of its particles' size (see LaunchPlumeSighting.scatteringColour). */
  colour: [number, number, number]
  ageS: number
}

/** One puff of a plume as an observer sees it at one instant. */
export interface PlumePuffView {
  launchId: string
  /** The burn or jet that let it go (see LaunchRelease.key): "burn" for the ascent's, "jet:…" for the others. */
  release?: string
  /** How high it is, km. */
  heightKm?: number
  /** Where its centre is in the observer's sky, and how far. */
  centre: SkyPoint
  /** The angle its radius subtends, degrees. */
  radiusDeg: number
  /**
   * The luminance of the middle of the puff before the air between it and the eye, cd/m²: the Sun's
   * light scattered once, after what the air has taken of it on the way (see sunTransmittance).
   */
  luminanceCdM2: number
  /** What the Sun's light kept of itself, per channel, on its way through the air's edge to this puff. */
  sunTransmittance: [number, number, number]
  /** How much of each channel its particles scatter over the green, which `luminanceCdM2` is of. White when absent. */
  colour?: [number, number, number]
  /** The share of the puff in the Sun's light: 0 in the Earth's shadow, 1 outside it. */
  lit: number
  ageS: number
}

/**
 * The geometry and the light of a rocket's plume seen from an observer.
 *
 * The scattering is single and in the optically thin case: the plume's optical depth is of the order
 * of a thousandth, and a thousandth of the light goes towards the eye in one bounce, so the light
 * that bounces twice is a millionth. Nothing here is a render: each puff is a cloud of particles
 * diffusing round its centre, seen from a distance, and the picture is what that column looks like.
 */
export class LaunchPlumeSighting {
  /** Mean radius of the Earth, km, and how much of it the air's lowest layers stop light at. */
  private static readonly EARTH_RADIUS_KM = 6371
  /**
   * The Earth's shadow, as a cylinder of its radius plus the layers of air that no sunlight crosses
   * (the troposphere holds three quarters of the air): a ray that grazes lower than this is gone.
   */
  private static readonly SHADOW_RADIUS_KM = LaunchPlumeSighting.EARTH_RADIUS_KM + 15
  /** The width of the Sun's edge in the shadow, km: 0.53 degrees of Sun over the distances here. */
  private static readonly PENUMBRA_KM = 10
  /** The Sun's illuminance above the air, lux. */
  static readonly SUN_ILLUMINANCE_LUX = 1.27e5
  /** Rayleigh scattering of air at sea level, per metre, red, green, blue. */
  private static readonly RAYLEIGH_PER_M: readonly [number, number, number] = [5.8e-6, 13.5e-6, 33.1e-6]
  /** The scale height of air, m, and how long a ray's path is through the air at a grazing height. */
  private static readonly SCALE_HEIGHT_M = 8000
  /**
   * Ozone's Chappuis band takes the orange and red and leaves the blue, which is why a twilight sky is
   * blue: the optical depth, red, green, blue, of a ray that grazes the middle of the ozone layer, a
   * zenith depth of a few hundredths over the thirty-odd airmasses of that slant.
   */
  private static readonly OZONE_GRAZING_DEPTH: readonly [number, number, number] = [2.4, 1.8, 0.24]
  /** The anisotropy of the light ice crystals and sooty droplets scatter: forward, as the Henyey-Greenstein g. */
  private static readonly ANISOTROPY = 0.7
  /** Single-scattering albedo: ice and water do not absorb visible light. */
  private static readonly ALBEDO = 0.99
  /** The wavelengths the red, green and blue channels stand for, µm, and the refractive index of ice. */
  private static readonly WAVELENGTHS_UM: readonly [number, number, number] = [0.61, 0.55, 0.465]
  private static readonly ICE_INDEX = 1.31

  static readonly DEFAULTS = {
    /** A Merlin Vacuum engine: 934 kN at a specific impulse of 348 s. */
    exhaustKgPerS: 273,
    /** Water from burning RP-1 is about a third of the exhaust; a part of it freezes. Not measured: the one free number. */
    condensedShare: 0.065,
    particleRadiusUm: 0.5,
    expansionKmPerS: 0.15,
    initialRadiusKm: 0.5,
    lifetimeS: 420,
    collarShare: 0.85,
    collarExpansionKmPerS: 2.5,
    collarLifetimeS: 20
  } as const satisfies Required<LaunchPlumeJson>

  /**
   * What each propellant's exhaust turns into, per mass of exhaust: the share that ends up as particles that scatter light, and their
   * radius. ASSUMED, not measured; the shares are what was first fitted with particles taken to scatter twice their area (the large-particle
   * limit), brought to the efficiency their size really has (see extinctionEfficiency) so that the plumes keep the light they were fitted to.
   */
  static readonly PROPELLANTS: Record<Propellant, { condensedShare: number; particleRadiusUm: number }> = {
    // Water is about a third of the exhaust of kerosene and oxygen, and a part of it freezes.
    "rp1-lox": { condensedShare: 0.065, particleRadiusUm: 0.5 },
    // Methane burns to more water and less carbon: a little more, and no soot.
    "methane-lox": { condensedShare: 0.09, particleRadiusUm: 0.5 },
    // Hydrogen and oxygen burn to water and nothing else, but the exhaust is mostly unburnt hydrogen.
    "hydrogen-lox": { condensedShare: 0.13, particleRadiusUm: 0.5 },
    // Nitrogen tetroxide and hydrazines: water, nitrogen and carbon dioxide, with a little soot.
    hypergolic: { condensedShare: 0.079, particleRadiusUm: 0.4 },
    // Aluminised solid propellant: a third of the exhaust is alumina, which is already solid and bright.
    solid: { condensedShare: 0.27, particleRadiusUm: 0.8 }
  }
  /** Standard gravity, m/s2, with which a specific impulse is an exhaust velocity. */
  private static readonly G0 = 9.80665
  /** How fast the collar spreads, as a share of the exhaust velocity: 2.5 km/s for a Merlin Vacuum's 3.4. */
  private static readonly COLLAR_SPREAD_OF_EXHAUST_VELOCITY = 0.735

  /**
   * The plume of a launch: the defaults of a Merlin Vacuum burning kerosene, then what the vehicle's
   * engine says (the exhaust per second is its thrust over its exhaust velocity; the collar spreads
   * as fast as the exhaust leaves; the propellant says what turns into particles), then what the
   * plume itself states.
   */
  static plumeOf(launch: LaunchJson): Required<LaunchPlumeJson> {
    const derived: LaunchPlumeJson = {}
    const engine = launch.vehicle?.engine
    if (engine) {
      const exhaustVelocity = engine.specificImpulseS === undefined ? undefined : engine.specificImpulseS * LaunchPlumeSighting.G0
      if (engine.thrustKN !== undefined && exhaustVelocity) derived.exhaustKgPerS = (engine.thrustKN * 1000) / exhaustVelocity
      if (exhaustVelocity) derived.collarExpansionKmPerS = (exhaustVelocity / 1000) * LaunchPlumeSighting.COLLAR_SPREAD_OF_EXHAUST_VELOCITY
      if (engine.propellant) Object.assign(derived, LaunchPlumeSighting.PROPELLANTS[engine.propellant])
    }
    return { ...LaunchPlumeSighting.DEFAULTS, ...derived, ...launch.plume }
  }

  /** How often a puff is let go, seconds: closer than the plume has spread in that time, they overlap smoothly. */
  static readonly PUFF_EVERY_S = 0.5
  /**
   * A puff is a diffusing cloud, its density a Gaussian round its centre, with a standard deviation of this share of what is called
   * its radius: the radius is where its column has fallen to a seventh of the middle's (see PlumeSystem).
   */
  static readonly SIGMA_OF_RADIUS = 0.5
  /** At most this many puffs are let go by one burn or one jet. */
  static readonly MAX_PUFFS = 320
  private static readonly DEG = Math.PI / 180
  /** The Earth's rotation, rad/s: a stage's heading is that of its velocity in space, not over the turning ground. */
  private static readonly EARTH_ROTATION = 7.2921159e-5

  /** What a vented propellant is when the jet does not say: liquid oxygen and kerosene let out of the tanks, ASSUMED. */
  static readonly VENT_DEFAULTS = {
    /** Gas and droplets flashing into vacuum leave at about the speed of sound of the cold gas. */
    speedKmPerS: 0.7,
    /** Some tonnes of residual propellant let go over a few minutes. */
    massKgPerS: 20,
    /** Liquid that boils off into vacuum freezes for the most part. */
    condensedShare: 0.5,
    particleRadiusUm: 0.5,
    expansionKmPerS: 0.1,
    initialRadiusKm: 0.2,
    lifetimeS: 600
  } as const

  /** The flights of the puffs of each launch, kept from one frame to the next (see ExhaustPath). */
  private static readonly paths = new WeakMap<LaunchJson, Map<string, ExhaustPath>>()

  /** The exhaust velocity of the launch's engine, km/s: its specific impulse times g0, a Merlin Vacuum's 348 s when not stated. */
  static exhaustVelocityKmPerS(launch: LaunchJson): number {
    return (launch.vehicle?.engine?.specificImpulseS ?? 348) * LaunchPlumeSighting.G0 / 1000
  }

  /**
   * Everything the stage lets go, as jets: the burn of the ascent, straight back at the exhaust
   * velocity, then each of `jets` (see releaseOf).
   */
  static releasesOf(launch: LaunchJson): LaunchRelease[] {
    const releases: LaunchRelease[] = []
    const jets = launch.jets ?? []
    if (jets.length === 0 || launch.burnFromT !== undefined || launch.burnUntilT !== undefined) {
      const first = launch.track[0]?.t ?? 0
      const last = launch.track[launch.track.length - 1]?.t ?? 0
      releases.push(LaunchPlumeSighting.engineRelease(launch, "burn", { fromT: launch.burnFromT ?? first, untilT: launch.burnUntilT ?? last }))
    }
    jets.forEach((jet, index) => releases.push(LaunchPlumeSighting.releaseOf(launch, jet, index)))
    return releases
  }

  /**
   * A jet of `launch` with what it does not state taken from the launch's plume (a burn) or from
   * VENT_DEFAULTS (a vent). `index` names it when it has no id.
   */
  static releaseOf(launch: LaunchJson, jet: LaunchJetJson, index: number): LaunchRelease {
    const key = `jet:${jet.id ?? index}`
    if ((jet.kind ?? "burn") === "burn") return LaunchPlumeSighting.engineRelease(launch, key, jet)
    const vent = LaunchPlumeSighting.VENT_DEFAULTS
    return {
      key, fromT: jet.fromT, untilT: jet.untilT,
      angleDeg: jet.angleDeg ?? 0, azimuthDeg: jet.azimuthDeg ?? 0, spinPeriodS: jet.spinPeriodS,
      speedKmPerS: jet.speedKmPerS ?? vent.speedKmPerS,
      massKgPerS: jet.massKgPerS ?? vent.massKgPerS,
      condensedShare: jet.condensedShare ?? vent.condensedShare,
      particleRadiusUm: jet.particleRadiusUm ?? vent.particleRadiusUm,
      initialRadiusKm: jet.initialRadiusKm ?? vent.initialRadiusKm,
      populations: [{ share: 1, expansionKmPerS: jet.expansionKmPerS ?? vent.expansionKmPerS, lifetimeS: jet.lifetimeS ?? vent.lifetimeS }]
    }
  }

  /** A burn of the launch's engine, with the plume's values where `jet` states none. */
  private static engineRelease(launch: LaunchJson, key: string, jet: Partial<LaunchJetJson> & { fromT: number; untilT: number }): LaunchRelease {
    const plume = LaunchPlumeSighting.plumeOf(launch)
    return {
      key, fromT: jet.fromT, untilT: jet.untilT,
      angleDeg: jet.angleDeg ?? 0, azimuthDeg: jet.azimuthDeg ?? 0, spinPeriodS: jet.spinPeriodS,
      speedKmPerS: jet.speedKmPerS ?? LaunchPlumeSighting.exhaustVelocityKmPerS(launch),
      massKgPerS: jet.massKgPerS ?? plume.exhaustKgPerS,
      condensedShare: jet.condensedShare ?? plume.condensedShare,
      particleRadiusUm: jet.particleRadiusUm ?? plume.particleRadiusUm,
      initialRadiusKm: jet.initialRadiusKm ?? plume.initialRadiusKm,
      // Two populations of the same exhaust: the narrow trail that lingers and the collar that
      // spreads fast and is gone in seconds.
      populations: [
        { share: 1 - plume.collarShare, expansionKmPerS: jet.expansionKmPerS ?? plume.expansionKmPerS, lifetimeS: jet.lifetimeS ?? plume.lifetimeS },
        { share: plume.collarShare, expansionKmPerS: plume.collarExpansionKmPerS, lifetimeS: plume.collarLifetimeS }
      ]
    }
  }

  /**
   * How much light a sphere of ice of `radiusUm` takes out of a beam of `wavelengthUm`, as a multiple of its cross-section. Two for
   * particles much larger than the wavelength, whatever its colour, which is why a plume of coarse ice is white (van de Hulst's
   * anomalous diffraction); for particles smaller than the wavelength, Rayleigh's law, which falls as the fourth power of the size
   * over the wavelength and so takes far more blue than red, which is why the fine ice of vented propellant is blue. The lesser of
   * the two, each being right where the other is not.
   */
  static extinctionEfficiency(radiusUm: number, wavelengthUm: number): number {
    const x = 2 * Math.PI * radiusUm / wavelengthUm
    const m2 = LaunchPlumeSighting.ICE_INDEX ** 2
    const rayleigh = (8 / 3) * x ** 4 * ((m2 - 1) / (m2 + 2)) ** 2
    const p = 2 * x * (LaunchPlumeSighting.ICE_INDEX - 1)
    const diffraction = p < 1e-3 ? p * p / 2 : 2 - (4 / p) * Math.sin(p) + (4 / (p * p)) * (1 - Math.cos(p))
    return Math.min(rayleigh, diffraction)
  }

  /** The efficiency of each channel over the green's: the colour particles of `radiusUm` give white light. */
  static scatteringColour(radiusUm: number): [number, number, number] {
    const green = LaunchPlumeSighting.extinctionEfficiency(radiusUm, LaunchPlumeSighting.WAVELENGTHS_UM[1])
    return LaunchPlumeSighting.WAVELENGTHS_UM.map(wavelength => LaunchPlumeSighting.extinctionEfficiency(radiusUm, wavelength) / green) as [number, number, number]
  }

  /**
   * Where the Sun is, as a unit vector in the Earth-fixed frame, at `date`. The parallax of the Sun
   * from the Earth's surface is nine seconds of arc, which is nothing next to a plume.
   */
  static sunDirectionAt(date: Date): [number, number, number] {
    const center = new Astronomy.Observer(0, 0, -6378137)
    const sun = Astronomy.Equator(Astronomy.Body.Sun, date, center, true, true)
    const lng = (sun.ra - Astronomy.SiderealTime(date)) * 15 * LaunchPlumeSighting.DEG
    const dec = sun.dec * LaunchPlumeSighting.DEG
    return [Math.cos(dec) * Math.cos(lng), Math.cos(dec) * Math.sin(lng), Math.sin(dec)]
  }

  /**
   * Every puff of every plume at `tMs`, where it is and how much of it there is, whoever looks at it:
   * the plume as a thing in space (see viewsAt for one observer's sight of it).
   */
  static puffsAt(launches: readonly LaunchJson[], tMs: number): PlumePuff[] {
    const puffs: PlumePuff[] = []
    for (const launch of launches) {
      let paths = LaunchPlumeSighting.paths.get(launch)
      if (!paths) LaunchPlumeSighting.paths.set(launch, paths = new Map())
      for (const release of LaunchPlumeSighting.releasesOf(launch)) {
        const until = Math.min(release.untilT, tMs)
        if (until <= release.fromT) continue
        // Puffs are let go on a grid of the whole jet, so that a puff is the same puff from one frame to
        // the next and its flight is worked out once; the last one is wherever the stage is now.
        const stepMs = Math.max(LaunchPlumeSighting.PUFF_EVERY_S * 1000, (release.untilT - release.fromT) / LaunchPlumeSighting.MAX_PUFFS)
        const emitted: number[] = []
        for (let at = release.fromT; at < until; at += stepMs) emitted.push(at)
        emitted.push(until)
        const massPerPuffKg = release.massKgPerS * (stepMs / 1000)
        // Extinction cross-section per kilogram of particles, in green light: the efficiency of a
        // particle of that size, over the mass of a sphere of ice of that radius.
        const efficiency = LaunchPlumeSighting.extinctionEfficiency(release.particleRadiusUm, LaunchPlumeSighting.WAVELENGTHS_UM[1])
        const areaPerKg = (3 * efficiency) / (4 * 917 * release.particleRadiusUm * 1e-6)
        const colour = LaunchPlumeSighting.scatteringColour(release.particleRadiusUm)
        release.populations.forEach((population, index) => {
          if (population.share <= 0) return
          const radiusAt = (ageS: number) => release.initialRadiusKm + population.expansionKmPerS * ageS
          // Oldest first, so that each puff knows where the one before it now is.
          const flown: { ageS: number; position: [number, number, number] }[] = []
          for (const at of emitted) {
            const ageS = (tMs - at) / 1000
            if (ageS > population.lifetimeS) continue
            const onGrid = at !== until || until === release.untilT
            const key = `${release.key}|${index}|${at}`
            let path = onGrid ? paths.get(key) : undefined
            if (!path) {
              path = LaunchPlumeSighting.launchPuff(launch, release, at, massPerPuffKg * population.share, radiusAt)
              if (!path) continue
              if (onGrid) paths.set(key, path)
            }
            flown.push({ ageS, position: path.at(ageS) })
          }
          for (let i = flown.length - 1; i >= 0; i--) {
            const { ageS, position } = flown[i]
            // A puff stands for the stretch of exhaust between it and the one let go before it: half
            // the distance between them now is its least radius, so a string of puffs is a continuous
            // trail, or a continuous arm of a spiral, and not a string of beads.
            const neighbour = flown[i - 1] ?? flown[i + 1]
            const gapKm = neighbour ? Math.hypot(position[0] - neighbour.position[0], position[1] - neighbour.position[1], position[2] - neighbour.position[2]) : 0
            const radiusKm = radiusAt(ageS) + gapKm / 2
            // The column through the middle of a puff spread as a diffusing cloud is, a Gaussian of a
            // standard deviation of half its radius, and what fraction of it is still there: the plume
            // thins out for good over its lifetime.
            const sigmaM = LaunchPlumeSighting.SIGMA_OF_RADIUS * radiusKm * 1000
            const opticalDepth = (massPerPuffKg * release.condensedShare * population.share * areaPerKg) / (2 * Math.PI * sigmaM * sigmaM)
            const remaining = Math.max(0, 1 - (ageS / population.lifetimeS) ** 2)
            if (opticalDepth * remaining <= 0) continue
            puffs.push({ launchId: launch.id, release: release.key, at: LaunchPlumeSighting.geoPoint(position), radiusKm, opticalDepth: opticalDepth * remaining, colour, ageS })
          }
        })
      }
    }
    return puffs
  }

  /**
   * The puffs of every plume the observer sees at `tMs`: above their horizon, in the Sun's light,
   * and not yet gone. `sun` is where the Sun is now (see sunDirectionAt).
   */
  static viewsAt(launches: readonly LaunchJson[], tMs: number, observer: GeoPoint, sun: readonly [number, number, number]): PlumePuffView[] {
    const views: PlumePuffView[] = []
    for (const puff of LaunchPlumeSighting.puffsAt(launches, tMs)) {
      const centre = ReentrySighting.seenFrom(observer, puff.at)
      if (centre.altitudeDeg < 0) continue
      const light = LaunchPlumeSighting.sunlightAt(puff.at, sun)
      if (light.lit <= 0) continue
      const phase = LaunchPlumeSighting.scatteringPhase(observer, puff.at, sun)
      const luminanceCdM2 = LaunchPlumeSighting.SUN_ILLUMINANCE_LUX * LaunchPlumeSighting.ALBEDO * phase * puff.opticalDepth * light.lit
      if (luminanceCdM2 <= 0) continue
      views.push({
        launchId: puff.launchId,
        release: puff.release,
        heightKm: puff.at.heightM / 1000,
        centre,
        radiusDeg: Math.atan2(puff.radiusKm, centre.distanceKm) / LaunchPlumeSighting.DEG,
        luminanceCdM2,
        sunTransmittance: light.transmittance,
        colour: puff.colour,
        lit: light.lit,
        ageS: puff.ageS
      })
    }
    return views
  }

  /**
   * The flight of the puff `release` lets go at `emitted`: from where the stage is then, at the
   * stage's velocity plus the jet's, in the direction the jet points then (see LaunchJetJson). The
   * stage is taken to point along its velocity in space.
   */
  private static launchPuff(launch: LaunchJson, release: LaunchRelease, emitted: number, massKg: number, radiusAt: (ageS: number) => number): ExhaustPath | undefined {
    const track = { id: launch.id, track: launch.track, fragments: [] }
    const at = ReentrySighting.leadAt(track, emitted)
    if (!at) return undefined
    const first = launch.track[0].t
    const last = launch.track[launch.track.length - 1].t
    const before = Math.max(first, emitted - 500)
    const after = Math.min(last, emitted + 500)
    const p = LaunchPlumeSighting.earthCentred(at)
    const p0 = LaunchPlumeSighting.earthCentred(ReentrySighting.leadAt(track, before)!)
    const p1 = LaunchPlumeSighting.earthCentred(ReentrySighting.leadAt(track, after)!)
    const seconds = Math.max(1e-3, (after - before) / 1000)
    const velocity = [0, 1, 2].map(c => (p1[c] - p0[c]) / seconds)
    // Its velocity in space: the ground's own, Ω × r with Ω along z, added.
    const w = LaunchPlumeSighting.EARTH_ROTATION
    const inSpace = [velocity[0] - w * p[1], velocity[1] + w * p[0], velocity[2]]
    const unit = (v: number[]) => {
      const length = Math.hypot(v[0], v[1], v[2]) || 1
      return v.map(c => c / length)
    }
    const forward = unit(inSpace)
    const up = unit(p)
    const along = up[0] * forward[0] + up[1] * forward[1] + up[2] * forward[2]
    // Across the motion: the side facing away from the Earth, then the right of the motion. A stage
    // climbing straight up has no such side, and takes the north for it.
    let side = [up[0] - along * forward[0], up[1] - along * forward[1], up[2] - along * forward[2]]
    if (Math.hypot(side[0], side[1], side[2]) < 1e-6) side = [-forward[2] * forward[0], -forward[2] * forward[1], 1 - forward[2] * forward[2]]
    side = unit(side)
    const right = [
      forward[1] * side[2] - forward[2] * side[1],
      forward[2] * side[0] - forward[0] * side[2],
      forward[0] * side[1] - forward[1] * side[0]
    ]
    const spin = release.spinPeriodS ? 360 * ((emitted - release.fromT) / 1000) / release.spinPeriodS : 0
    const azimuth = (release.azimuthDeg + spin) * LaunchPlumeSighting.DEG
    const angle = release.angleDeg * LaunchPlumeSighting.DEG
    const direction = [0, 1, 2].map(c =>
      -forward[c] * Math.cos(angle) + Math.sin(angle) * (Math.cos(azimuth) * side[c] + Math.sin(azimuth) * right[c]))
    const thrown = [0, 1, 2].map(c => velocity[c] + release.speedKmPerS * direction[c]) as [number, number, number]
    return new ExhaustPath(p, thrown, massKg, radiusAt, release.particleRadiusUm)
  }

  /** The point at these Earth-fixed coordinates, km, on the sphere earthCentred puts it on. */
  private static geoPoint(position: readonly [number, number, number]): GeoPoint {
    const radius = Math.hypot(position[0], position[1], position[2])
    return {
      lat: Math.asin(position[2] / radius) / LaunchPlumeSighting.DEG,
      lng: Math.atan2(position[1], position[0]) / LaunchPlumeSighting.DEG,
      heightM: (radius - ExhaustFlight.EARTH_RADIUS_KM) * 1000
    }
  }

  /**
   * How much of the Sun's light there is at `point`: the share outside the Earth's shadow, and what
   * the air did to the light on its way. Behind the Earth the light grazes the air at a height that
   * is the point's distance from the shadow's axis less the Earth's radius, and the lower that is,
   * the redder the light, down to nothing.
   */
  static sunlightAt(point: GeoPoint, sun: readonly [number, number, number]): { lit: number; transmittance: [number, number, number] } {
    const p = LaunchPlumeSighting.earthCentred(point)
    const along = p[0] * sun[0] + p[1] * sun[1] + p[2] * sun[2]
    if (along >= 0) return { lit: 1, transmittance: [1, 1, 1] }
    const perpendicular = Math.hypot(p[0] - along * sun[0], p[1] - along * sun[1], p[2] - along * sun[2])
    const penumbra = LaunchPlumeSighting.PENUMBRA_KM
    const lit = Math.min(1, Math.max(0, (perpendicular - (LaunchPlumeSighting.SHADOW_RADIUS_KM - penumbra / 2)) / penumbra))
    if (lit <= 0) return { lit: 0, transmittance: [0, 0, 0] }
    const grazingM = Math.max(0, (perpendicular - LaunchPlumeSighting.EARTH_RADIUS_KM) * 1000)
    const density = Math.exp(-grazingM / LaunchPlumeSighting.SCALE_HEIGHT_M)
    // A ray that skims the air at a height `h` travels through the air for sqrt(2 pi R H) of it at the
    // density at that height, the first term of Chapman's function.
    const path = Math.sqrt(2 * Math.PI * LaunchPlumeSighting.EARTH_RADIUS_KM * 1000 * LaunchPlumeSighting.SCALE_HEIGHT_M)
    const ozone = Math.exp(-(((grazingM / 1000 - 25) / 15) ** 2))
    const transmittance = [0, 1, 2].map(channel => Math.exp(
      -LaunchPlumeSighting.RAYLEIGH_PER_M[channel] * density * path - LaunchPlumeSighting.OZONE_GRAZING_DEPTH[channel] * ozone
    )) as [number, number, number]
    return { lit, transmittance }
  }

  /**
   * The Henyey-Greenstein phase function, per steradian, for the angle between the direction the light
   * goes in and the direction of the observer from the puff: how much of the light the particles send
   * that way. Forward scattering (a plume between the Sun and the observer) is the strongest.
   */
  static scatteringPhase(observer: GeoPoint, puff: GeoPoint, sun: readonly [number, number, number]): number {
    const o = LaunchPlumeSighting.earthCentred(observer)
    const p = LaunchPlumeSighting.earthCentred(puff)
    const toObserver = [o[0] - p[0], o[1] - p[1], o[2] - p[2]]
    const length = Math.hypot(toObserver[0], toObserver[1], toObserver[2]) || 1
    // The light travels away from the Sun, along minus its direction.
    const cosine = -(toObserver[0] * sun[0] + toObserver[1] * sun[1] + toObserver[2] * sun[2]) / length
    const g = LaunchPlumeSighting.ANISOTROPY
    return (1 - g * g) / (4 * Math.PI * (1 + g * g - 2 * g * cosine) ** 1.5)
  }

  /** Earth-centred, Earth-fixed coordinates of a point, km: the sphere is near enough for a shadow's geometry. */
  private static earthCentred(point: GeoPoint): [number, number, number] {
    const lat = point.lat * LaunchPlumeSighting.DEG
    const lng = point.lng * LaunchPlumeSighting.DEG
    const radius = LaunchPlumeSighting.EARTH_RADIUS_KM + point.heightM / 1000
    return [radius * Math.cos(lat) * Math.cos(lng), radius * Math.cos(lat) * Math.sin(lng), radius * Math.sin(lat)]
  }
}
