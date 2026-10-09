import * as Astronomy from "astronomy-engine"
import type { ObserverGeo } from "./CelestialPositions.js"

/**
 * The Moon's global relief, as the lunar limb needs it: the height of the surface above a sphere of
 * 1737.4 km, on a grid of 16 samples a degree, in units of 100 metres, east longitude from 0 to 360 and
 * latitude from the north pole down (the layout of NASA's LOLA LDEM_16, which scripts/build-lunar-limb.ts
 * makes this from). Only a band round the Moon's limb is kept — the part that libration and the
 * observer's parallax can ever bring to the edge of the disc — and every other sample is zero.
 */
export class LunarRelief {
  static readonly SAMPLES_PER_DEGREE = 16
  static readonly WIDTH = 360 * LunarRelief.SAMPLES_PER_DEGREE
  static readonly HEIGHT = 180 * LunarRelief.SAMPLES_PER_DEGREE
  /** One unit of the grid, kilometres. */
  static readonly UNIT_KM = 0.1
  /** The sphere heights are measured from, kilometres (the Moon's mean radius, as LOLA's own reference). */
  static readonly REFERENCE_RADIUS_KM = 1737.4
  /** The band kept, in degrees from the point of the Moon facing the Earth on average: its limb at 90°, and what librations and parallax add on either side. */
  static readonly BAND_FROM_DEG = 74
  static readonly BAND_TO_DEG = 106

  constructor(private readonly heights: Int8Array) {
    if (heights.length !== LunarRelief.WIDTH * LunarRelief.HEIGHT) {
      throw new Error(`a lunar relief has ${LunarRelief.WIDTH * LunarRelief.HEIGHT} samples, not ${heights.length}`)
    }
  }

  /** Height above the reference sphere at this selenographic point (degrees, east longitude), kilometres — bilinear between samples. */
  heightKm(latDeg: number, lonDeg: number): number {
    const ppd = LunarRelief.SAMPLES_PER_DEGREE
    // Sample centres sit at half-degrees of a sixteenth: pixel registration.
    const x = (((lonDeg % 360) + 360) % 360) * ppd - 0.5
    const y = (90 - latDeg) * ppd - 0.5
    const x0 = Math.floor(x)
    const y0 = Math.floor(y)
    const fx = x - x0
    const fy = y - y0
    const at = (column: number, row: number): number => {
      const wrapped = ((column % LunarRelief.WIDTH) + LunarRelief.WIDTH) % LunarRelief.WIDTH
      const clamped = Math.min(LunarRelief.HEIGHT - 1, Math.max(0, row))
      return this.heights[clamped * LunarRelief.WIDTH + wrapped]
    }
    const top = at(x0, y0) * (1 - fx) + at(x0 + 1, y0) * fx
    const bottom = at(x0, y0 + 1) * (1 - fx) + at(x0 + 1, y0 + 1) * fx
    return (top * (1 - fy) + bottom * fy) * LunarRelief.UNIT_KM
  }

  /** Whether a sample is within the band the grid keeps. */
  static inBand(latDeg: number, lonDeg: number): boolean {
    const rad = Math.PI / 180
    const distance = (Math.acos(Math.cos(latDeg * rad) * Math.cos(lonDeg * rad)) * 180) / Math.PI
    return distance >= LunarRelief.BAND_FROM_DEG && distance <= LunarRelief.BAND_TO_DEG
  }

  /** A grid with one raised point, for tests: `heightKm` high at this latitude and longitude. */
  static withBump(latDeg: number, lonDeg: number, heightKm: number, radiusDeg = 0.4): LunarRelief {
    const grid = new Int8Array(LunarRelief.WIDTH * LunarRelief.HEIGHT)
    const ppd = LunarRelief.SAMPLES_PER_DEGREE
    const reach = Math.ceil(radiusDeg * ppd)
    const cx = Math.floor(lonDeg * ppd)
    const cy = Math.floor((90 - latDeg) * ppd)
    for (let dy = -reach; dy <= reach; dy++) {
      for (let dx = -reach; dx <= reach; dx++) {
        if (Math.hypot(dx, dy) <= reach) grid[(cy + dy) * LunarRelief.WIDTH + ((cx + dx + LunarRelief.WIDTH) % LunarRelief.WIDTH)] = Math.round(heightKm / LunarRelief.UNIT_KM)
      }
    }
    return new LunarRelief(grid)
  }

  /** A flat Moon, for tests. */
  static smooth(): LunarRelief {
    return new LunarRelief(new Int8Array(LunarRelief.WIDTH * LunarRelief.HEIGHT))
  }
}

/**
 * The Moon's edge as it is seen from one place at one instant: its apparent angular radius at every
 * position angle round the disc, which is a circle only on a smooth sphere. Round the real Moon it is
 * ragged by a second of arc or two — peaks a few kilometres high on a body 1737 km in radius — and that
 * is the whole of Baily's beads: the last rays of the Sun reaching the observer through the valleys of
 * the limb, for a second or two either side of totality.
 *
 * POSITION ANGLE here is measured on the sky from the direction of the zenith (0°) towards increasing
 * azimuth (90°), which is the frame a scene stands in, not the celestial north of the usual convention:
 * the same angle is available to anything that knows where up is, with no precession to settle.
 */
export interface LimbProfile {
  /** Angular radius of the Moon at position angle `i · 360 / radiusDeg.length`, degrees. */
  radiusDeg: Float32Array
  /** The radius of the smooth sphere at this distance, degrees. */
  meanRadiusDeg: number
}

export class LunarLimb {
  static readonly SAMPLES = 5760
  /** Where, round the point of the surface facing the observer, the edge is looked for: the limb is where a sphere's surface is 90° from it. */
  private static readonly SEARCH_FROM_DEG = 87
  private static readonly SEARCH_TO_DEG = 90.2
  private static readonly SEARCH_STEP_DEG = 0.0625

  /**
   * The ragged edge of the Moon from this place, at this time.
   *
   * For each position angle round the disc, the surface points on the great circle leaving the point
   * facing the observer in that direction are taken a step at a time out to the limb, and the edge is the
   * one that stands furthest from the line to the Moon's centre: height counts, because a peak 3 km
   * high on the near side of the limb stands out from a valley behind it.
   */
  static profile(date: Date, observer: ObserverGeo, relief: LunarRelief, samples = LunarLimb.SAMPLES): LimbProfile {
    const { s, u, w, distanceKm } = LunarLimb.frame(date, observer)
    const rad = Math.PI / 180
    const radiusDeg = new Float32Array(samples)
    const reference = LunarRelief.REFERENCE_RADIUS_KM
    for (let i = 0; i < samples; i++) {
      const angle = (i / samples) * 2 * Math.PI
      const cosA = Math.cos(angle)
      const sinA = Math.sin(angle)
      // The direction on the sky at this position angle, as a surface direction: ⟂ s.
      const dx = cosA * u[0] + sinA * w[0]
      const dy = cosA * u[1] + sinA * w[1]
      const dz = cosA * u[2] + sinA * w[2]
      let widest = 0
      for (let theta = LunarLimb.SEARCH_FROM_DEG; theta <= LunarLimb.SEARCH_TO_DEG; theta += LunarLimb.SEARCH_STEP_DEG) {
        const cosT = Math.cos(theta * rad)
        const sinT = Math.sin(theta * rad)
        const px = cosT * s[0] + sinT * dx
        const py = cosT * s[1] + sinT * dy
        const pz = cosT * s[2] + sinT * dz
        const lat = Math.asin(Math.max(-1, Math.min(1, pz))) / rad
        const lon = Math.atan2(py, px) / rad
        const radius = reference + relief.heightKm(lat, lon)
        // The point's angle from the line to the Moon's centre, as seen from the observer.
        const apparent = Math.atan2(radius * sinT, distanceKm - radius * cosT)
        if (apparent > widest) widest = apparent
      }
      radiusDeg[i] = widest / rad
    }
    return { radiusDeg, meanRadiusDeg: Math.asin(reference / distanceKm) / rad }
  }

  /**
   * Where the observer stands on the Moon's sky, in the Moon's own frame: the unit vector to the point
   * of the surface facing them (`s`), the direction of the zenith as seen from the Moon (`u`, position
   * angle 0°), the direction of increasing azimuth (`w`, 90°), and the distance, kilometres.
   */
  private static frame(date: Date, observer: ObserverGeo): { s: Vec; u: Vec; w: Vec; distanceKm: number } {
    const place = new Astronomy.Observer(observer.lat, observer.lng, observer.elevationM)
    const moon = Astronomy.GeoMoon(date)
    const eye = Astronomy.ObserverVector(date, place, false)
    // From the Moon to the observer, equator of J2000, then into the Moon's own frame.
    const toEye = new Astronomy.Vector(eye.x - moon.x, eye.y - moon.y, eye.z - moon.z, moon.t)
    const distanceKm = Math.hypot(toEye.x, toEye.y, toEye.z) * LunarLimb.AU_KM
    const body = LunarLimb.bodyFixed(date)
    const sight = body(toEye)
    const length = Math.hypot(sight[0], sight[1], sight[2])
    const s: Vec = [sight[0] / length, sight[1] / length, sight[2] / length]

    // The sky basis at the Moon: up (0°) and towards increasing azimuth (90°), from where it stands.
    const toHorizon = Astronomy.Rotation_EQJ_HOR(date, place)
    const fromHorizon = Astronomy.InverseRotation(toHorizon)
    const toMoon = Astronomy.RotateVector(toHorizon, new Astronomy.Vector(-toEye.x, -toEye.y, -toEye.z, moon.t))
    // The geometric direction: no refraction is wanted in the shape of an edge.
    const altitude = Math.asin(toMoon.z / Math.hypot(toMoon.x, toMoon.y, toMoon.z))
    const azimuth = Math.atan2(-toMoon.y, toMoon.x)
    // Horizon frame: x north, y west, z up.
    const up = new Astronomy.Vector(-Math.sin(altitude) * Math.cos(azimuth), Math.sin(altitude) * Math.sin(azimuth), Math.cos(altitude), moon.t)
    const right = new Astronomy.Vector(-Math.sin(azimuth), -Math.cos(azimuth), 0, moon.t)
    return {
      s,
      u: body(Astronomy.RotateVector(fromHorizon, up)),
      w: body(Astronomy.RotateVector(fromHorizon, right)),
      distanceKm
    }
  }

  /** The point of the surface `theta` degrees from the one facing the observer, towards this position angle: latitude and east longitude, degrees. */
  static surfacePoint(date: Date, observer: ObserverGeo, positionAngleDeg: number, thetaDeg: number): { latDeg: number; lonDeg: number } {
    const { s, u, w } = LunarLimb.frame(date, observer)
    const rad = Math.PI / 180
    const dir = [0, 1, 2].map(k => Math.cos(positionAngleDeg * rad) * u[k] + Math.sin(positionAngleDeg * rad) * w[k])
    const p = [0, 1, 2].map(k => Math.cos(thetaDeg * rad) * s[k] + Math.sin(thetaDeg * rad) * dir[k])
    return { latDeg: Math.asin(p[2]) / rad, lonDeg: Math.atan2(p[1], p[0]) / rad }
  }

  /** The apparent radius of the edge at this position angle, degrees — linear between samples. */
  static radiusAt(profile: LimbProfile, positionAngleDeg: number): number {
    const n = profile.radiusDeg.length
    const at = ((((positionAngleDeg / 360) * n) % n) + n) % n
    const i = Math.floor(at)
    const f = at - i
    return profile.radiusDeg[i] * (1 - f) + profile.radiusDeg[(i + 1) % n] * f
  }

  /**
   * The share of the Sun's disc still uncovered, 0..1, with the Moon's edge as the profile has it.
   *
   * `sun` is where the Sun's centre is from the Moon's, in degrees on the sky: `upDeg` towards the
   * zenith and `rightDeg` towards increasing azimuth (the frame the profile's position angles are
   * in). Worked out exactly along each ray from the Moon's centre, the ray taking its part of the
   * Sun's disc between where it enters and where it leaves, less what the Moon's radius there covers:
   * a sum over position angles of half the difference of two squares, with nothing to sample across
   * the disc — so that a sliver of a millionth of the Sun, which is what a bead is, is measured as
   * such and not lost between the points of a grid.
   */
  static uncoveredFraction(profile: LimbProfile, sunRadiusDeg: number, sun: { upDeg: number; rightDeg: number }): number {
    const n = profile.radiusDeg.length
    const distance2 = sun.upDeg * sun.upDeg + sun.rightDeg * sun.rightDeg
    let area = 0
    for (let i = 0; i < n; i++) {
      const angle = (i / n) * 2 * Math.PI
      const up = Math.cos(angle)
      const right = Math.sin(angle)
      // The ray from the Moon's centre meets the Sun's circle where |t·dir − centre|² = R².
      const along = up * sun.upDeg + right * sun.rightDeg
      const discriminant = along * along - distance2 + sunRadiusDeg * sunRadiusDeg
      if (discriminant <= 0) continue
      const root = Math.sqrt(discriminant)
      const far = along + root
      if (far <= 0) continue
      const near = Math.max(0, along - root)
      const edge = Math.max(near, profile.radiusDeg[i])
      if (far > edge) area += 0.5 * (far * far - edge * edge)
    }
    return Math.min(1, Math.max(0, (area * ((2 * Math.PI) / n)) / (Math.PI * sunRadiusDeg * sunRadiusDeg)))
  }

  private static readonly AU_KM = 149_597_870.7

  /**
   * The rotation from J2000 equatorial coordinates to the Moon's own frame (IAU 2015, which carries
   * the physical librations): x towards its prime meridian, z along its pole, y east. It agrees with
   * astronomy-engine's Libration to a few hundredths of a degree at the Earth's centre.
   */
  private static bodyFixed(date: Date): (v: Astronomy.Vector) => Vec {
    const axis = Astronomy.RotationAxis(Astronomy.Body.Moon, date)
    const rad = Math.PI / 180
    const ra = axis.ra * 15 * rad
    const dec = axis.dec * rad
    const spin = axis.spin * rad
    const rotateZ = (t: number, [x, y, z]: Vec): Vec => [Math.cos(t) * x + Math.sin(t) * y, -Math.sin(t) * x + Math.cos(t) * y, z]
    const rotateX = (t: number, [x, y, z]: Vec): Vec => [x, Math.cos(t) * y + Math.sin(t) * z, -Math.sin(t) * y + Math.cos(t) * z]
    return v => rotateZ(spin, rotateX(Math.PI / 2 - dec, rotateZ(Math.PI / 2 + ra, [v.x, v.y, v.z])))
  }

  /** The sub-observer point on the Moon, for tests: where its surface faces this place, latitude and east longitude, degrees. */
  static subObserverPoint(date: Date, observer: ObserverGeo): { latDeg: number; lonDeg: number } {
    const place = new Astronomy.Observer(observer.lat, observer.lng, observer.elevationM)
    const moon = Astronomy.GeoMoon(date)
    const eye = Astronomy.ObserverVector(date, place, false)
    const v = LunarLimb.bodyFixed(date)(new Astronomy.Vector(eye.x - moon.x, eye.y - moon.y, eye.z - moon.z, moon.t))
    const length = Math.hypot(v[0], v[1], v[2])
    return { latDeg: (Math.asin(v[2] / length) * 180) / Math.PI, lonDeg: (Math.atan2(v[1], v[0]) * 180) / Math.PI }
  }
}

type Vec = [number, number, number]
