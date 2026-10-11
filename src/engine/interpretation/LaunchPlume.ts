import * as Astronomy from "astronomy-engine"
import type { SaidText } from "../model/SaidText.js"
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
}

export interface LaunchVehicle {
  /** "Falcon 9". */
  name?: string
  /** "Starlink Group 10-49". */
  mission?: string
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

/** One puff of a plume as an observer sees it at one instant. */
export interface PlumePuffView {
  launchId: string
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
  /** The share of the puff in the Sun's light: 0 in the Earth's shadow, 1 outside it. */
  lit: number
  ageS: number
}

/**
 * The geometry and the light of a rocket's plume seen from an observer.
 *
 * The scattering is single and in the optically thin case: the plume's optical depth is of the order
 * of a thousandth, and a thousandth of the light goes towards the eye in one bounce, so the light
 * that bounces twice is a millionth. Nothing here is a render: each puff is a sphere of particles,
 * seen from a distance, and the picture is what a sphere of that column looks like.
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

  static readonly DEFAULTS = {
    /** A Merlin Vacuum engine: 934 kN at a specific impulse of 348 s. */
    exhaustKgPerS: 273,
    /** Water from burning RP-1 is about a third of the exhaust; a part of it freezes. Not measured: the one free number. */
    condensedShare: 0.1,
    particleRadiusUm: 0.5,
    expansionKmPerS: 0.3,
    initialRadiusKm: 0.5,
    lifetimeS: 420,
    collarShare: 0.9,
    collarExpansionKmPerS: 1,
    collarLifetimeS: 6
  } as const satisfies Required<LaunchPlumeJson>

  /** How often a puff is let go, seconds: closer than the plume has spread in that time, they overlap smoothly. */
  static readonly PUFF_EVERY_S = 0.5
  /** At most this many puffs are drawn for one launch. */
  static readonly MAX_PUFFS = 320
  private static readonly DEG = Math.PI / 180

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
   * The puffs of every plume the observer sees at `tMs`: above their horizon, in the Sun's light,
   * and not yet gone. `sun` is where the Sun is now (see sunDirectionAt).
   */
  static viewsAt(launches: readonly LaunchJson[], tMs: number, observer: GeoPoint, sun: readonly [number, number, number]): PlumePuffView[] {
    const views: PlumePuffView[] = []
    for (const launch of launches) {
      const plume = { ...LaunchPlumeSighting.DEFAULTS, ...launch.plume }
      const first = launch.track[0]?.t ?? 0
      const last = launch.track[launch.track.length - 1]?.t ?? 0
      const from = launch.burnFromT ?? first
      const until = Math.min(launch.burnUntilT ?? last, tMs)
      if (until <= from) continue
      const stepMs = Math.max(LaunchPlumeSighting.PUFF_EVERY_S * 1000, (until - from) / LaunchPlumeSighting.MAX_PUFFS)
      // Extinction cross-section per kilogram of particles: two for the efficiency of a particle a
      // few wavelengths across, over the mass of a sphere of ice of that radius.
      const radiusM = plume.particleRadiusUm * 1e-6
      const areaPerKg = (3 * 2) / (4 * 917 * radiusM)
      const massPerPuffKg = plume.exhaustKgPerS * (stepMs / 1000) * plume.condensedShare
      // Two populations of the same exhaust: the narrow trail that lingers and the collar that
      // spreads fast and is gone in seconds.
      const populations = [
        { share: 1 - plume.collarShare, expansionKmPerS: plume.expansionKmPerS, lifetimeS: plume.lifetimeS },
        { share: plume.collarShare, expansionKmPerS: plume.collarExpansionKmPerS, lifetimeS: plume.collarLifetimeS }
      ]
      for (let emitted = until; emitted >= from; emitted -= stepMs) {
        const ageS = (tMs - emitted) / 1000
        if (ageS > plume.lifetimeS) break
        const at = ReentrySighting.leadAt({ id: launch.id, track: launch.track, fragments: [] }, emitted)
        if (!at) continue
        const centre = ReentrySighting.seenFrom(observer, at)
        if (centre.altitudeDeg < 0) continue
        const light = LaunchPlumeSighting.sunlightAt(at, sun)
        if (light.lit <= 0) continue
        // A puff stands for the stretch of the burn between two of them, which the stage flew in that
        // time: half that length is its least radius, so a string of puffs is a continuous trail and
        // not a string of beads.
        const before = ReentrySighting.leadAt({ id: launch.id, track: launch.track, fragments: [] }, Math.max(first, emitted - stepMs))
        const stretchKm = before ? LaunchPlumeSighting.distanceKm(at, before) : 0
        const phase = LaunchPlumeSighting.scatteringPhase(observer, at, sun)
        for (const population of populations) {
          if (population.share <= 0 || ageS > population.lifetimeS) continue
          const radiusKm = plume.initialRadiusKm + population.expansionKmPerS * ageS + stretchKm / 2
          // The column through the middle of a uniform sphere of particles, and what fraction of
          // it is still there: the plume thins out for good over its lifetime.
          const opticalDepth = (3 * massPerPuffKg * population.share * areaPerKg) / (2 * Math.PI * (radiusKm * 1000) ** 2)
          const remaining = Math.max(0, 1 - (ageS / population.lifetimeS) ** 2)
          const luminanceCdM2 = LaunchPlumeSighting.SUN_ILLUMINANCE_LUX * LaunchPlumeSighting.ALBEDO * phase * opticalDepth * remaining * light.lit
          if (luminanceCdM2 <= 0) continue
          views.push({
            launchId: launch.id,
            centre,
            radiusDeg: Math.atan2(radiusKm, centre.distanceKm) / LaunchPlumeSighting.DEG,
            luminanceCdM2,
            sunTransmittance: light.transmittance,
            lit: light.lit,
            ageS
          })
        }
      }
    }
    return views
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

  private static distanceKm(a: GeoPoint, b: GeoPoint): number {
    const p = LaunchPlumeSighting.earthCentred(a)
    const q = LaunchPlumeSighting.earthCentred(b)
    return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2])
  }

  /** Earth-centred, Earth-fixed coordinates of a point, km: the sphere is near enough for a shadow's geometry. */
  private static earthCentred(point: GeoPoint): [number, number, number] {
    const lat = point.lat * LaunchPlumeSighting.DEG
    const lng = point.lng * LaunchPlumeSighting.DEG
    const radius = LaunchPlumeSighting.EARTH_RADIUS_KM + point.heightM / 1000
    return [radius * Math.cos(lat) * Math.cos(lng), radius * Math.cos(lat) * Math.sin(lng), radius * Math.sin(lat)]
  }
}
