import { AtmosphereProfile } from "../../../src/engine/atmosphere/AtmosphereProfile.js"
import { SkyScattering, type Vector3Like } from "../../../src/engine/atmosphere/SkyScattering.js"

export type MonteCarloEstimator = "ray" | "collision"

export interface MonteCarloOptions {
  readonly paths: number
  readonly seed?: number
  readonly groundAlbedo?: number
  /** Stop after this many scattering events. */
  readonly maxOrder?: number
  /**
   * `ray` (the default): at every vertex, the sunlight scattered along the whole next segment is
   * integrated rather than sampled — the estimator that works in twilight. `collision`: sunlight is
   * only counted at the scattering events themselves, which is simpler, independent of the first,
   * and useless once the Sun is down; kept to check the other against in daylight.
   */
  readonly estimator?: MonteCarloEstimator
}

export interface MonteCarloEstimate {
  /** Spectral radiance per wavelength, for a Sun of unit irradiance. */
  readonly radiance: Float64Array
  /** Standard error of each. */
  readonly standardError: Float64Array
}

/**
 * The sky as the physics says it is, with no approximation but noise: light traced path by path
 * through the same spherical atmosphere SkyScattering describes, scattering as many times as it
 * happens to, into the Earth's shadow and out of it.
 *
 * Too slow to draw anything with, which is not its job. It exists to say how wrong the real-time
 * model is. Hillaire's isotropic, geometric-series treatment of every order past the first is at its
 * weakest in deep twilight, where there is nothing BUT multiple scattering, and no photometry covers
 * a witness in an aircraft or the sky opposite a Sun sixteen degrees down. This covers all of it,
 * from the same medium, so any difference is the approximation's alone.
 *
 * Traced backward from the eye. Free paths by delta tracking against a majorant (the medium thins
 * with height, and delta tracking needs no optical-depth inversion to cope with that); absorption as
 * a weight rather than an end; the ground Lambertian; Russian roulette for paths carrying little.
 *
 * WHY THE RAY ESTIMATOR. With the Sun ten degrees down, the zenith above a witness is in the Earth's
 * shadow up to a hundred and forty kilometres. Light reaches it only after scattering somewhere far
 * off toward the Sun that is still lit, so a path counting sunlight only where it happens to collide
 * almost never collides anywhere lit: twenty thousand of them found nothing at all. Integrating the
 * sunlight scattered along each whole segment instead collects the lit stretch of every sideways ray
 * deterministically, and is exactly as unbiased.
 *
 * The transmittance toward the Sun comes from SkyScattering's table, at a fine resolution. It is not
 * the approximation under test — that is the multiple-scattering one — and the planet's shadow is
 * decided exactly, not by the table.
 */
export class SkyMonteCarlo {
  private readonly profile: AtmosphereProfile
  private readonly tables: SkyScattering
  private state = 1

  constructor(profile: AtmosphereProfile) {
    this.profile = profile
    this.tables = new SkyScattering(profile, { transmittanceWidth: 1024, transmittanceHeight: 256, multipleSize: 0 })
  }

  estimate(altitudeM: number, view: Vector3Like, sun: Vector3Like, options: MonteCarloOptions): MonteCarloEstimate {
    const count = AtmosphereProfile.WAVELENGTHS_NM.length
    const radiance = new Float64Array(count)
    const standardError = new Float64Array(count)
    for (let w = 0; w < count; w++) {
      const { mean, error } = this.estimateAt(altitudeM, view, sun, w, options)
      radiance[w] = mean
      standardError[w] = error
    }
    return { radiance, standardError }
  }

  estimateAt(altitudeM: number, view: Vector3Like, sun: Vector3Like, w: number, options: MonteCarloOptions): { mean: number; error: number } {
    const origin = { x: 0, y: AtmosphereProfile.GROUND_RADIUS_M + Math.max(altitudeM, 0.5), z: 0 }
    // The same random stream for every wavelength: the noise is then shared between them, which is
    // what keeps a colour from being noisier than the brightness it is the colour of.
    this.state = (options.seed ?? 1) >>> 0 || 1
    let sum = 0
    let squares = 0
    for (let path = 0; path < options.paths; path++) {
      const value = this.tracePath(origin, view, sun, w, options)
      sum += value
      squares += value * value
    }
    const mean = sum / options.paths
    return { mean, error: Math.sqrt(Math.max(squares / options.paths - mean * mean, 0) / options.paths) }
  }

  private tracePath(start: Vector3Like, view: Vector3Like, sun: Vector3Like, w: number, options: MonteCarloOptions): number {
    const profile = this.profile
    const albedo = options.groundAlbedo ?? 0.3
    const maxOrder = options.maxOrder ?? 1000
    const byRay = (options.estimator ?? "ray") === "ray"
    const majorant = profile.rayleighScattering[w] + profile.aerosolExtinction[w] + profile.ozoneAbsorption[w]
    let px = start.x
    let py = start.y
    let pz = start.z
    let dx = view.x
    let dy = view.y
    let dz = view.z
    let weight = 1
    let total = 0
    let order = 0
    for (;;) {
      if (byRay) total += weight * this.singleAlong(px, py, pz, dx, dy, dz, sun, w, albedo)
      // What was just added ends in one more event than this path has had so far.
      if (byRay && order + 1 >= maxOrder) return total
      const radius = Math.hypot(px, py, pz)
      const mu = (px * dx + py * dy + pz * dz) / radius
      const toGround = SkyScattering.distanceToGround(radius, mu)
      const toTop = SkyScattering.distanceToTop(radius, mu)
      // Delta tracking to the next real event on this segment.
      let t = 0
      let event: "top" | "ground" | "scatter" = "top"
      let rayleigh = 0
      let aerosol = 0
      let extinction = 0
      for (;;) {
        t += -Math.log(1 - this.random()) / majorant
        if (t >= Math.min(toGround, toTop)) {
          event = toGround < toTop ? "ground" : "top"
          break
        }
        const altitude = Math.hypot(px + dx * t, py + dy * t, pz + dz * t) - AtmosphereProfile.GROUND_RADIUS_M
        const aerosolDensity = AtmosphereProfile.aerosolDensity(altitude)
        rayleigh = profile.rayleighScattering[w] * AtmosphereProfile.rayleighDensity(altitude)
        aerosol = profile.aerosolScattering[w] * aerosolDensity
        extinction = rayleigh + profile.aerosolExtinction[w] * aerosolDensity + profile.ozoneAbsorption[w] * AtmosphereProfile.ozoneDensity(altitude)
        if (this.random() * majorant < extinction) {
          event = "scatter"
          break
        }
      }
      if (event === "top") return total
      if (order >= maxOrder) return total
      if (event === "ground") {
        px += dx * toGround
        py += dy * toGround
        pz += dz * toGround
        const groundRadius = Math.hypot(px, py, pz)
        const nx = px / groundRadius
        const ny = py / groundRadius
        const nz = pz / groundRadius
        if (!byRay) {
          const cosSun = nx * sun.x + ny * sun.y + nz * sun.z
          if (cosSun > 0) total += (weight * albedo * cosSun * this.sunTransmittance(px, py, pz, sun, w)) / Math.PI
        }
        order++
        weight *= albedo
        const [rx, ry, rz] = this.rotate(nx, ny, nz, Math.sqrt(this.random()))
        dx = rx
        dy = ry
        dz = rz
        // A millimetre up, so the next segment starts in the air.
        px += nx * 1e-3
        py += ny * 1e-3
        pz += nz * 1e-3
      } else {
        px += dx * t
        py += dy * t
        pz += dz * t
        weight *= (rayleigh + aerosol) / extinction
        order++
        if (!byRay) {
          const cosToSun = dx * sun.x + dy * sun.y + dz * sun.z
          const phase =
            (rayleigh * AtmosphereProfile.rayleighPhase(cosToSun) + aerosol * AtmosphereProfile.aerosolPhase(cosToSun)) / (rayleigh + aerosol)
          total += weight * phase * this.sunTransmittance(px, py, pz, sun, w)
        }
        const [nx, ny, nz] = this.random() * (rayleigh + aerosol) < rayleigh ? this.rayleighAround(dx, dy, dz) : this.aerosolAround(dx, dy, dz)
        dx = nx
        dy = ny
        dz = nz
      }
      if (weight < 1e-3) {
        if (this.random() > 0.1) return total
        weight *= 10
      }
    }
  }

  /**
   * Sunlight scattered once toward the start of a segment, integrated along all of it, plus the
   * sunlight the ground at its end sends back along it.
   */
  private singleAlong(px: number, py: number, pz: number, dx: number, dy: number, dz: number, sun: Vector3Like, w: number, albedo: number): number {
    const profile = this.profile
    const radius = Math.hypot(px, py, pz)
    const mu = (px * dx + py * dy + pz * dz) / radius
    const toGround = SkyScattering.distanceToGround(radius, mu)
    const hitsGround = Number.isFinite(toGround)
    const length = hitsGround ? toGround : SkyScattering.distanceToTop(radius, mu)
    const cosToSun = dx * sun.x + dy * sun.y + dz * sun.z
    const rayleighPhase = AtmosphereProfile.rayleighPhase(cosToSun)
    const aerosolPhase = AtmosphereProfile.aerosolPhase(cosToSun)
    const steps = 96
    let throughput = 1
    let sum = 0
    for (let step = 0; step < steps; step++) {
      const t0 = length * (step / steps) ** 2
      const t1 = length * ((step + 1) / steps) ** 2
      const t = (t0 + t1) / 2
      const dt = t1 - t0
      const x = px + dx * t
      const y = py + dy * t
      const z = pz + dz * t
      const altitude = Math.hypot(x, y, z) - AtmosphereProfile.GROUND_RADIUS_M
      const aerosolDensity = AtmosphereProfile.aerosolDensity(altitude)
      const rayleigh = profile.rayleighScattering[w] * AtmosphereProfile.rayleighDensity(altitude)
      const aerosol = profile.aerosolScattering[w] * aerosolDensity
      const extinction = rayleigh + profile.aerosolExtinction[w] * aerosolDensity + profile.ozoneAbsorption[w] * AtmosphereProfile.ozoneDensity(altitude)
      const sampleTransmittance = Math.exp(-extinction * dt)
      const source = (rayleigh * rayleighPhase + aerosol * aerosolPhase) * this.sunTransmittance(x, y, z, sun, w)
      sum += throughput * (extinction > 0 ? (source * (1 - sampleTransmittance)) / extinction : source * dt)
      throughput *= sampleTransmittance
    }
    if (hitsGround && albedo > 0) {
      const x = px + dx * length
      const y = py + dy * length
      const z = pz + dz * length
      const r = Math.hypot(x, y, z)
      const cosSun = (x * sun.x + y * sun.y + z * sun.z) / r
      if (cosSun > 0) sum += (throughput * albedo * cosSun * this.sunTransmittance(x, y, z, sun, w)) / Math.PI
    }
    return sum
  }

  /** Sunlight surviving from a point to the top of the atmosphere, or nothing if the planet is in the way. */
  private sunTransmittance(px: number, py: number, pz: number, sun: Vector3Like, w: number): number {
    const radius = Math.hypot(px, py, pz)
    const mu = (px * sun.x + py * sun.y + pz * sun.z) / radius
    if (Number.isFinite(SkyScattering.distanceToGround(radius, mu))) return 0
    return this.tables.transmittanceToTopAt(radius, mu, w)
  }

  /** A direction at angle acos(μ) from (dx, dy, dz), with a uniformly random azimuth round it. */
  private rotate(dx: number, dy: number, dz: number, mu: number): [number, number, number] {
    const sinTheta = Math.sqrt(Math.max(1 - mu * mu, 0))
    const phi = 2 * Math.PI * this.random()
    const ax = Math.abs(dx) < 0.9 ? 1 : 0
    const ay = ax === 1 ? 0 : 1
    let ux = ay * dz
    let uy = -ax * dz
    let uz = ax * dy - ay * dx
    const length = Math.hypot(ux, uy, uz)
    ux /= length
    uy /= length
    uz /= length
    const vx = dy * uz - dz * uy
    const vy = dz * ux - dx * uz
    const vz = dx * uy - dy * ux
    const c = Math.cos(phi) * sinTheta
    const s = Math.sin(phi) * sinTheta
    return [dx * mu + ux * c + vx * s, dy * mu + uy * c + vy * s, dz * mu + uz * c + vz * s]
  }

  private rayleighAround(dx: number, dy: number, dz: number): [number, number, number] {
    // Rejection against 1 + μ², whose largest value is 2.
    for (;;) {
      const mu = 2 * this.random() - 1
      if (2 * this.random() < 1 + mu * mu) return this.rotate(dx, dy, dz, mu)
    }
  }

  private aerosolAround(dx: number, dy: number, dz: number): [number, number, number] {
    // Proposed from Henyey-Greenstein with the same g and accepted against Cornette-Shanks: the ratio
    // of the two is (3/2)(1 + μ²)/(2 + g²), largest at μ = ±1.
    const g = AtmosphereProfile.AEROSOL_ASYMMETRY
    const bound = 3 / (2 + g * g)
    for (;;) {
      const square = (1 - g * g) / (1 - g + 2 * g * this.random())
      const mu = Math.min(Math.max((1 + g * g - square * square) / (2 * g), -1), 1)
      if (this.random() * bound < (3 * (1 + mu * mu)) / (2 * (2 + g * g))) return this.rotate(dx, dy, dz, mu)
    }
  }

  /** Mulberry32: small, fast, and the same numbers on every machine for the same seed. */
  private random(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0
    let t = this.state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
