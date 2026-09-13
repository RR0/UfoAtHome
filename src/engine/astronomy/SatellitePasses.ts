import {
  degreesToRadians, ecfToEci, ecfToLookAngles, eciToEcf, geodeticToEcf, gstime, jday, json2satrec, propagate, sunPos
} from "satellite.js"
import type { EciVec3, SatRec } from "satellite.js"
import type { ObserverGeo } from "./CelestialPositions.js"
import type { OrbitingObject } from "./TleArchive.js"

/** Where one object stood, seen from the witness, at one instant. */
export interface SatellitePosition {
  object: OrbitingObject
  /** Degrees clockwise from true north. */
  azimuthDeg: number
  /** Degrees above the horizon, geometric (no refraction). */
  altitudeDeg: number
  rangeKm: number
  /** Height above the ellipsoid. */
  heightKm: number
  /** How much of the Sun's disc the object sees: 1 in full sunlight, 0 in the Earth's umbra. */
  sunlitFraction: number
  /** Sun–object–witness angle. 0 is the object seen fully lit, 180 is seen from its night side. */
  phaseAngleDeg: number
  /** Apparent visual magnitude, when the object has a known brightness and is lit at all. */
  magnitude?: number
}

/** One object's time above the horizon and in sunlight, within the span that was scanned. */
export interface SatellitePass {
  object: OrbitingObject
  /** First and last scanned instant where the object was up and lit. */
  start: Date
  end: Date
  /** The scanned instant where it was brightest, or highest when its brightness is unknown. */
  peak: SatellitePosition & { date: Date }
}

/**
 * How bright a satellite looks, from the measurements that exist.
 *
 * Two conventions, because the two sources measure differently, and mixing them would move every
 * magnitude by up to a magnitude:
 *
 * - McCants' STANDARD MAGNITUDE is the brightness at 1000 km, half illuminated. The phase is then
 *   applied as the lit fraction of a sphere, `m = std − 15.75 + 2.5·log10(range² / litFraction)`,
 *   the formula his files are used with (15.75 is what makes it return `std` at 1000 km, half lit).
 * - STARLINKS are not in his file. Mallama measured them from thousands of visual observations and
 *   reports a "1000-km magnitude": the observed magnitudes brought to 1000 km by distance only, with
 *   the phase left in the average. So only the distance is applied: `m = m1000 + 5·log10(range/1000)`.
 *
 * What is NOT modelled: specular glints (an Iridium flare, a Starlink catching the Sun on its panel)
 * and the attitude of a satellite still raising its orbit, which flies edge-on in "open book" mode and
 * is brighter than these averages. Both make a real satellite brighter than this, never fainter.
 */
export class SatelliteMagnitude {
  /**
   * Starlink designs, dated by launch, each with its measured mean 1000-km magnitude.
   *
   * 5.93 for the original design (Mallama 2020, arXiv:2006.08422), 7.21 for VisorSats, whose sunshades
   * make them about a third as bright (Mallama 2021, arXiv:2101.00374). The first full VisorSat batch
   * launched on 2020-08-07. Later designs (V1.5, V2 Mini) are given the VisorSat value: no measured
   * mean for them is adopted here, and the same author reports VisorSats themselves brightening by
   * about 0.6 magnitude between 2021 and 2026 (arXiv:2604.13145), so this is an approximation stated
   * as one.
   */
  static readonly STARLINK_ERAS: { launchedFrom: string; magnitude1000Km: number }[] = [
    { launchedFrom: "2019-05-24", magnitude1000Km: 5.93 },
    { launchedFrom: "2020-08-07", magnitude1000Km: 7.21 }
  ]

  /**
   * A Starlink still raising its orbit, below the height where its brightness mitigation starts.
   *
   * This is the TRAIN, the Starlink sighting that gets reported, and the averages above miss it by
   * three magnitudes: Mallama et al. (2024, arXiv:2405.12007) measured V2 Minis below 357 km at a
   * mean 1000-km magnitude of 4.58 (an apparent 2.68), against 7.52 above. Applied to every Starlink
   * below that height, whatever its design: the earlier trains were at least as bright.
   */
  static readonly STARLINK_ORBIT_RAISING = { belowKm: 357, magnitude1000Km: 4.58 }

  static of(object: OrbitingObject, rangeKm: number, phaseAngleDeg: number, sunlitFraction: number, heightKm = Infinity): number | undefined {
    if (sunlitFraction <= 0) return undefined
    let magnitude: number | undefined
    if (object.stdMag !== undefined) {
      const litFraction = (1 + Math.cos(degreesToRadians(phaseAngleDeg))) / 2
      if (litFraction <= 0) return undefined
      magnitude = object.stdMag - 15.75 + 2.5 * Math.log10((rangeKm * rangeKm) / litFraction)
    } else if (object.kind === "starlink") {
      const raising = SatelliteMagnitude.STARLINK_ORBIT_RAISING
      const magnitude1000Km = heightKm < raising.belowKm ? raising.magnitude1000Km : SatelliteMagnitude.starlinkMagnitude1000Km(object.launch)
      magnitude = magnitude1000Km + 5 * Math.log10(rangeKm / 1000)
    }
    // Partly in the penumbra: the object receives that fraction of the Sun's light.
    return magnitude === undefined ? undefined : magnitude - 2.5 * Math.log10(sunlitFraction)
  }

  static starlinkMagnitude1000Km(launch: string | undefined): number {
    const eras = SatelliteMagnitude.STARLINK_ERAS
    const era = [...eras].reverse().find(candidate => launch !== undefined && launch >= candidate.launchedFrom)
    return (era ?? eras[eras.length - 1]).magnitude1000Km
  }
}

/**
 * Real passes, from dated elements: which object was where, lit or not, and how bright.
 *
 * SGP4 (satellite.js, the Vallado implementation) for the orbit, the real Sun for the illumination,
 * the Earth's umbra and penumbra from the object's own position rather than from the "height of the
 * shadow overhead" Satellites.ts states for a whole sky. This file states geometry and brightness;
 * whether that brightness beat the sky's own is the caller's question, answered with the same
 * visibleMagnitudeLimit as every star.
 */
export class SatellitePasses {
  /** Seconds between two re-selections of the objects worth propagating. */
  static readonly CANDIDATE_WINDOW_S = 60

  /**
   * How far below the horizon an object may be and still be propagated for the coming window.
   *
   * An object in low orbit moves about 7 km/s over the ground, 420 km in a minute, which lowers or
   * raises it by under 4 degrees near the horizon (the Earth's curvature, 420 / 6371 radians). Ten
   * degrees keeps everything that can rise within the window, with margin, and skips the nine tenths
   * of a constellation that is on the other side of the planet.
   */
  static readonly CANDIDATE_BELOW_HORIZON_DEG = -10

  private readonly records: { object: OrbitingObject; satrec: SatRec }[]
  private candidates?: { windowStart: number; observerKey: string; indices: number[] }

  constructor(objects: OrbitingObject[]) {
    this.records = []
    for (const object of objects) {
      const satrec = SatellitePasses.satrecOf(object)
      if (satrec) this.records.push({ object, satrec })
    }
  }

  get size(): number {
    return this.records.length
  }

  static satrecOf(object: OrbitingObject): SatRec | undefined {
    const e = object.elements
    try {
      const satrec = json2satrec({
        OBJECT_NAME: object.name,
        OBJECT_ID: String(object.norad),
        EPOCH: new Date(e.epochMs).toISOString().replace("Z", ""),
        MEAN_MOTION: e.meanMotion,
        ECCENTRICITY: e.eccentricity,
        INCLINATION: e.inclinationDeg,
        RA_OF_ASC_NODE: e.raanDeg,
        ARG_OF_PERICENTER: e.argOfPerigeeDeg,
        MEAN_ANOMALY: e.meanAnomalyDeg,
        NORAD_CAT_ID: object.norad,
        ELEMENT_SET_NO: 999,
        BSTAR: e.bstar,
        MEAN_MOTION_DOT: 0,
        MEAN_MOTION_DDOT: 0
      })
      return satrec.error ? undefined : satrec
    } catch {
      return undefined
    }
  }

  /** Every object above `minAltitudeDeg` at that instant, lit or not. */
  positionsAt(date: Date, observer: ObserverGeo, minAltitudeDeg = 0): SatellitePosition[] {
    const frame = this.frameAt(date, observer)
    const positions: SatellitePosition[] = []
    for (const index of this.candidateIndices(date, observer)) {
      const position = this.positionOf(this.records[index], date, frame)
      if (position && position.altitudeDeg >= minAltitudeDeg) positions.push(position)
    }
    return positions
  }

  /**
   * Every object that was above the horizon AND in sunlight at some scanned instant between `start`
   * and `end`, with the instant it was brightest.
   *
   * Scanned every `stepS` seconds: a pass lasts minutes, so ten seconds finds every one, and the
   * peak is within five seconds of the true one.
   */
  passesDuring(start: Date, end: Date, observer: ObserverGeo, stepS = 10): SatellitePass[] {
    const passes: SatellitePass[] = []
    const ongoing = new Map<number, SatellitePass>()
    for (let t = start.getTime(); t <= end.getTime(); t += stepS * 1000) {
      const date = new Date(t)
      for (const position of this.positionsAt(date, observer)) {
        if (position.sunlitFraction <= 0) continue
        const pass = ongoing.get(position.object.norad)
        // A scanned instant missed means the object set, or went into shadow: what follows is
        // another pass, an orbit later at the soonest.
        if (!pass || t - pass.end.getTime() > stepS * 1000) {
          const next = { object: position.object, start: date, end: date, peak: { ...position, date } }
          ongoing.set(position.object.norad, next)
          passes.push(next)
          continue
        }
        pass.end = date
        if (SatellitePasses.outshines(position, pass.peak)) pass.peak = { ...position, date }
      }
    }
    return passes
  }

  private static outshines(a: SatellitePosition, b: SatellitePosition): boolean {
    if (a.magnitude !== undefined && b.magnitude !== undefined) return a.magnitude < b.magnitude
    if (a.magnitude !== undefined) return true
    if (b.magnitude !== undefined) return false
    return a.altitudeDeg > b.altitudeDeg
  }

  private frameAt(date: Date, observer: ObserverGeo) {
    const gmst = gstime(date)
    const geodetic = {
      latitude: degreesToRadians(observer.lat),
      longitude: degreesToRadians(observer.lng),
      height: observer.elevationM / 1000
    }
    const observerEci = ecfToEci(geodeticToEcf(geodetic), gmst)
    const [x, y, z] = sunPos(jday(date)).rsun
    const sunEciAu = { x, y, z }
    return { gmst, geodetic, observerEci, sunEciAu }
  }

  private positionOf(record: { object: OrbitingObject; satrec: SatRec }, date: Date,
                     frame: ReturnType<SatellitePasses["frameAt"]>): SatellitePosition | undefined {
    const state = propagate(record.satrec, date)
    if (!state || !state.position || Number.isNaN(state.position.x)) return undefined
    const eci = state.position as EciVec3<number>
    const look = ecfToLookAngles(frame.geodetic, eciToEcf(eci, frame.gmst))
    const sunlitFraction = 1 - SatellitePasses.shadowFraction(eci, frame.sunEciAu)
    const phaseAngleDeg = SatellitePasses.phaseAngleDeg(eci, frame.sunEciAu, frame.observerEci)
    const heightKm = Math.hypot(eci.x, eci.y, eci.z) - 6371
    return {
      object: record.object,
      azimuthDeg: (look.azimuth * 180) / Math.PI,
      altitudeDeg: (look.elevation * 180) / Math.PI,
      rangeKm: look.rangeSat,
      heightKm,
      sunlitFraction,
      phaseAngleDeg,
      magnitude: SatelliteMagnitude.of(record.object, look.rangeSat, phaseAngleDeg, sunlitFraction, heightKm)
    }
  }

  /**
   * How much of the Sun's disc the Earth hides from an object: 0 in full sunlight, 1 in the umbra.
   *
   * The two discs as the object sees them — the Sun's, a quarter of a degree across, and the
   * Earth's, most of the sky from low orbit — and the area where they overlap, as a fraction of the
   * Sun's (Montenbruck and Gill, "Satellite Orbits", 3.4). The penumbra is what this adds to the
   * "height of the shadow" Satellites.ts states: a few seconds of fading, not a switch. Atmospheric
   * refraction into the shadow is left out, as it is there.
   */
  static shadowFraction(objectKm: EciVec3<number>, sunAu: EciVec3<number>): number {
    const AU_KM = 149_597_870.7
    const SUN_RADIUS_KM = 696_000
    const EARTH_RADIUS_KM = 6378.137
    const toSun = [sunAu.x * AU_KM - objectKm.x, sunAu.y * AU_KM - objectKm.y, sunAu.z * AU_KM - objectKm.z]
    const sunDistance = Math.hypot(toSun[0], toSun[1], toSun[2])
    const earthDistance = Math.hypot(objectKm.x, objectKm.y, objectKm.z)
    const a = Math.asin(Math.min(1, SUN_RADIUS_KM / sunDistance))
    const b = Math.asin(Math.min(1, EARTH_RADIUS_KM / earthDistance))
    const cos = -(objectKm.x * toSun[0] + objectKm.y * toSun[1] + objectKm.z * toSun[2]) / (earthDistance * sunDistance)
    const c = Math.acos(Math.max(-1, Math.min(1, cos)))
    if (c >= a + b) return 0
    if (c <= b - a) return 1
    // Partial overlap of two circles of radii a and b whose centres are c apart.
    const x = (c * c + a * a - b * b) / (2 * c)
    const y = Math.sqrt(Math.max(0, a * a - x * x))
    const overlap = a * a * Math.acos(Math.max(-1, Math.min(1, x / a))) + b * b * Math.acos(Math.max(-1, Math.min(1, (c - x) / b))) - c * y
    return Math.min(1, Math.max(0, overlap / (Math.PI * a * a)))
  }

  /** The angle, at the object, between the directions to the Sun and to the witness. */
  static phaseAngleDeg(objectKm: EciVec3<number>, sunAu: EciVec3<number>, observerKm: EciVec3<number>): number {
    const AU_KM = 149_597_870.7
    const toSun = [sunAu.x * AU_KM - objectKm.x, sunAu.y * AU_KM - objectKm.y, sunAu.z * AU_KM - objectKm.z]
    const toObserver = [observerKm.x - objectKm.x, observerKm.y - objectKm.y, observerKm.z - objectKm.z]
    const dot = toSun[0] * toObserver[0] + toSun[1] * toObserver[1] + toSun[2] * toObserver[2]
    const cos = dot / (Math.hypot(toSun[0], toSun[1], toSun[2]) * Math.hypot(toObserver[0], toObserver[1], toObserver[2]))
    return (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI
  }

  /** The objects worth propagating for the window holding `date`, reselected once per window. */
  private candidateIndices(date: Date, observer: ObserverGeo): number[] {
    const windowMs = SatellitePasses.CANDIDATE_WINDOW_S * 1000
    const windowStart = Math.floor(date.getTime() / windowMs) * windowMs
    const observerKey = `${observer.lat.toFixed(2)},${observer.lng.toFixed(2)}`
    if (this.candidates?.windowStart === windowStart && this.candidates.observerKey === observerKey) {
      return this.candidates.indices
    }
    const middle = new Date(windowStart + windowMs / 2)
    const frame = this.frameAt(middle, observer)
    const indices: number[] = []
    this.records.forEach((record, index) => {
      const state = propagate(record.satrec, middle)
      if (!state || !state.position || Number.isNaN(state.position.x)) return
      const look = ecfToLookAngles(frame.geodetic, eciToEcf(state.position as EciVec3<number>, frame.gmst))
      if ((look.elevation * 180) / Math.PI >= SatellitePasses.CANDIDATE_BELOW_HORIZON_DEG) indices.push(index)
    })
    this.candidates = { windowStart, observerKey, indices }
    return indices
  }
}
