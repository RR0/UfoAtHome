import { AtmosphereProfile } from "./AtmosphereProfile.js"

/** A direction or a position in the planet's frame: origin at its centre, y through the observer. */
export interface Vector3Like {
  readonly x: number
  readonly y: number
  readonly z: number
}

export interface SkyScatteringOptions {
  readonly transmittanceWidth?: number
  readonly transmittanceHeight?: number
  readonly multipleSize?: number
  /** Rows of the multiple-scattering table, when not as many as its columns. */
  readonly multipleRows?: number
  /** How the rows crowd toward the ground: height = span · v^power. 1 spaces them evenly. */
  readonly multipleHeightPower?: number
  /** Directions per side of the sphere sampled around each point of the multiple-scattering table. */
  readonly multipleDirections?: number
  readonly steps?: number
  /** Steps per ray while building the multiple-scattering table, which marches a thousand rays a texel. */
  readonly multipleSteps?: number
  readonly groundAlbedo?: number
}

/**
 * The light a clear sky sends a observer, traced through a spherical atmosphere — the reference
 * implementation, in plain numbers, of what the sky shaders compute on the GPU.
 *
 * Hillaire (2020), "A Scalable and Production Ready Sky and Atmosphere Rendering Technique", which
 * is Bruneton and Neyret (2008) made cheap: the sky is single scattering done properly, plus every
 * higher order of scattering folded into one table.
 *
 * - TRANSMITTANCE: how much light survives from a point to the top of the atmosphere, for every
 *   height and every angle. A table, because everything else asks it thousands of times.
 * - MULTIPLE SCATTERING: at a point, how much light arrives having scattered at least once already,
 *   from everywhere around it. Depends on nothing but the height and how high the Sun stands there,
 *   because the atmosphere is spherically symmetric — which is what makes it a table and not a
 *   simulation. Each order is taken as scattering evenly in every direction and the orders are
 *   summed as a geometric series; that is the approximation, and it is at its weakest in deep
 *   twilight, where nothing but multiply scattered light is left.
 * - The view itself: a march along the line of sight, adding at every step the sunlight scattered
 *   toward the eye there and taking away what the air in front of it stops.
 *
 * Everything is per wavelength and for a Sun of unit irradiance: multiply by the Sun's spectrum —
 * or the Moon's — afterwards. Two copies of these formulas exist, this one and the GLSL one, and
 * that is deliberate: the laws are tested here, where a number can be asked for, and the picture is
 * made there, where it is fast.
 */
export class SkyScattering {
  readonly profile: AtmosphereProfile
  readonly transmittanceWidth: number
  readonly transmittanceHeight: number
  readonly multipleSize: number
  readonly multipleRows: number
  readonly multipleHeightPower: number
  private readonly multipleDirections: number
  private readonly steps: number
  private readonly multipleSteps: number
  private readonly groundAlbedo: number
  private readonly count = AtmosphereProfile.WAVELENGTHS_NM.length
  /**
   * Optical depth to the top of the atmosphere, [row][column][wavelength] — the depth and not its
   * exponential, because the depth is smooth and interpolates well where the transmittance, near the
   * horizon, falls by orders of magnitude between two texels; and because it survives a half-float
   * texture, which is how the GPU keeps it.
   */
  readonly transmittance: Float64Array
  /** Multiple-scattering transfer, [row = height][column = cos of the Sun's zenith angle][wavelength]. */
  readonly multiple: Float64Array

  constructor(profile: AtmosphereProfile, options: SkyScatteringOptions = {}) {
    this.profile = profile
    this.transmittanceWidth = options.transmittanceWidth ?? 256
    this.transmittanceHeight = options.transmittanceHeight ?? 64
    this.multipleSize = options.multipleSize ?? 64
    this.multipleRows = options.multipleRows ?? 16
    this.multipleHeightPower = options.multipleHeightPower ?? 2
    this.multipleDirections = options.multipleDirections ?? 16
    this.steps = options.steps ?? 40
    this.multipleSteps = options.multipleSteps ?? 12
    this.groundAlbedo = options.groundAlbedo ?? 0.3
    this.transmittance = new Float64Array(this.transmittanceWidth * this.transmittanceHeight * this.count)
    this.multiple = new Float64Array(this.multipleSize * this.multipleRows * this.count)
    this.buildTransmittance()
    // Zero asks for the transmittance alone, for a caller that does its own scattering.
    if (this.multipleSize > 0) this.buildMultiple()
  }

  // --- Transmittance ------------------------------------------------------------------------------

  /**
   * Where in the table a (radius, cos zenith) pair lives, Bruneton's mapping: evenly spaced in the
   * distance to the top rather than in the angle, so the rows crowd in near the horizon, where the
   * path through the air changes fastest.
   */
  static transmittanceUv(radiusM: number, mu: number): { u: number; v: number } {
    const top = AtmosphereProfile.TOP_RADIUS_M
    const ground = AtmosphereProfile.GROUND_RADIUS_M
    const horizon = Math.sqrt(top * top - ground * ground)
    const rho = Math.sqrt(Math.max(radiusM * radiusM - ground * ground, 0))
    const distance = SkyScattering.distanceToTop(radiusM, mu)
    const dMin = top - radiusM
    const dMax = rho + horizon
    return { u: dMax > dMin ? (distance - dMin) / (dMax - dMin) : 0, v: rho / horizon }
  }

  static radiusMuOfTransmittanceUv(u: number, v: number): { radiusM: number; mu: number } {
    const top = AtmosphereProfile.TOP_RADIUS_M
    const ground = AtmosphereProfile.GROUND_RADIUS_M
    const horizon = Math.sqrt(top * top - ground * ground)
    const rho = horizon * v
    const radiusM = Math.sqrt(rho * rho + ground * ground)
    const dMin = top - radiusM
    const dMax = rho + horizon
    const distance = dMin + u * (dMax - dMin)
    const mu = distance === 0 ? 1 : (horizon * horizon - rho * rho - distance * distance) / (2 * radiusM * distance)
    return { radiusM, mu: Math.min(Math.max(mu, -1), 1) }
  }

  static distanceToTop(radiusM: number, mu: number): number {
    const top = AtmosphereProfile.TOP_RADIUS_M
    const discriminant = radiusM * radiusM * (mu * mu - 1) + top * top
    return Math.max(0, -radiusM * mu + Math.sqrt(Math.max(discriminant, 0)))
  }

  /** The distance to the ground along that ray, or Infinity if it misses the planet. */
  static distanceToGround(radiusM: number, mu: number): number {
    const ground = AtmosphereProfile.GROUND_RADIUS_M
    const discriminant = radiusM * radiusM * (mu * mu - 1) + ground * ground
    if (mu >= 0 || discriminant < 0) return Infinity
    return -radiusM * mu - Math.sqrt(discriminant)
  }

  private buildTransmittance(): void {
    const opticalDepth = new Float64Array(this.count)
    for (let row = 0; row < this.transmittanceHeight; row++) {
      for (let column = 0; column < this.transmittanceWidth; column++) {
        const { radiusM, mu } = SkyScattering.radiusMuOfTransmittanceUv(
          (column + 0.5) / this.transmittanceWidth,
          (row + 0.5) / this.transmittanceHeight
        )
        this.opticalDepthToTop(radiusM, mu, opticalDepth)
        this.transmittance.set(opticalDepth, (row * this.transmittanceWidth + column) * this.count)
      }
    }
  }

  private opticalDepthToTop(radiusM: number, mu: number, out: Float64Array): void {
    out.fill(0)
    const length = SkyScattering.distanceToTop(radiusM, mu)
    const samples = 64
    const dt = length / samples
    const profile = this.profile
    for (let step = 0; step < samples; step++) {
      const t = (step + 0.5) * dt
      const altitude = Math.sqrt(t * t + 2 * radiusM * mu * t + radiusM * radiusM) - AtmosphereProfile.GROUND_RADIUS_M
      const rayleigh = AtmosphereProfile.rayleighDensity(altitude) * dt
      const aerosol = AtmosphereProfile.aerosolDensity(altitude) * dt
      const ozone = AtmosphereProfile.ozoneDensity(altitude) * dt
      for (let w = 0; w < this.count; w++) {
        out[w] +=
          profile.rayleighScattering[w] * rayleigh + profile.aerosolExtinction[w] * aerosol + profile.ozoneAbsorption[w] * ozone
      }
    }
  }

  /** Transmittance from a point to the top of the atmosphere, interpolated from the table. */
  transmittanceToTop(radiusM: number, mu: number, out: Float64Array): void {
    const { u, v } = SkyScattering.transmittanceUv(radiusM, mu)
    this.bilinear(this.transmittance, this.transmittanceWidth, this.transmittanceHeight, u, v, out)
    for (let w = 0; w < this.count; w++) out[w] = Math.exp(-out[w])
  }

  /** The same, for one wavelength only. */
  transmittanceToTopAt(radiusM: number, mu: number, wavelengthIndex: number): number {
    const { u, v } = SkyScattering.transmittanceUv(radiusM, mu)
    const width = this.transmittanceWidth
    const height = this.transmittanceHeight
    const x = Math.min(Math.max(u * width - 0.5, 0), width - 1)
    const y = Math.min(Math.max(v * height - 0.5, 0), height - 1)
    const x0 = Math.floor(x)
    const y0 = Math.floor(y)
    const x1 = Math.min(x0 + 1, width - 1)
    const y1 = Math.min(y0 + 1, height - 1)
    const fx = x - x0
    const fy = y - y0
    const table = this.transmittance
    const at = (row: number, column: number) => table[(row * width + column) * this.count + wavelengthIndex]
    return Math.exp(-((at(y0, x0) * (1 - fx) + at(y0, x1) * fx) * (1 - fy) + (at(y1, x0) * (1 - fx) + at(y1, x1) * fx) * fy))
  }

  // --- Multiple scattering ------------------------------------------------------------------------

  private buildMultiple(): void {
    const size = this.multipleSize
    const texel = new Float64Array(this.count)
    for (let row = 0; row < this.multipleRows; row++) {
      for (let column = 0; column < size; column++) {
        this.multipleTexel(row, column, size, this.multipleDirections, texel, this.multipleRows, this.multipleHeightPower)
        this.multiple.set(texel, (row * size + column) * this.count)
      }
    }
  }

  /**
   * One texel of a multiple-scattering table of `size` × `size`, from `directions` × `directions`
   * rays — public so a table built elsewhere (the GPU's) can be checked a texel at a time without
   * building this one whole.
   */
  multipleTexel(
    row: number,
    column: number,
    size: number,
    directions: number,
    out: Float64Array,
    rows = size,
    heightPower = 1
  ): void {
    // Held a metre off the ground and a metre under the top, so no ray starts outside the shell.
    const radiusM = Math.min(
      Math.max(
        AtmosphereProfile.GROUND_RADIUS_M + ((row + 0.5) / rows) ** heightPower * (AtmosphereProfile.TOP_RADIUS_M - AtmosphereProfile.GROUND_RADIUS_M),
        AtmosphereProfile.GROUND_RADIUS_M + 1
      ),
      AtmosphereProfile.TOP_RADIUS_M - 1
    )
    const muSun = ((column + 0.5) / size) * 2 - 1
    const origin = { x: 0, y: radiusM, z: 0 }
    const sun = { x: 0, y: muSun, z: Math.sqrt(Math.max(1 - muSun * muSun, 0)) }
    const radiance = new Float64Array(this.count)
    const scattered = new Float64Array(this.count)
    const secondOrder = new Float64Array(this.count)
    const transfer = new Float64Array(this.count)
    for (let i = 0; i < directions; i++) {
      for (let j = 0; j < directions; j++) {
        const theta = (2 * Math.PI * (i + 0.5)) / directions
        const cosPhi = 1 - (2 * (j + 0.5)) / directions
        const sinPhi = Math.sqrt(Math.max(1 - cosPhi * cosPhi, 0))
        const direction = { x: Math.cos(theta) * sinPhi, y: cosPhi, z: Math.sin(theta) * sinPhi }
        this.march(origin, direction, sun, false, radiance, scattered, this.multipleSteps)
        for (let w = 0; w < this.count; w++) {
          secondOrder[w] += radiance[w]
          transfer[w] += scattered[w]
        }
      }
    }
    const samples = directions * directions
    for (let w = 0; w < this.count; w++) {
      // The average over the sphere of the once-scattered light arriving at this point, times the
      // isotropic phase of scattering it again, is that average itself (4π of solid angle, one
      // 4π-th of phase). Every further order takes the same share again: the fraction of light
      // leaving this point in a random direction that scatters before it escapes.
      const share = Math.min(transfer[w] / samples, 0.99)
      out[w] = secondOrder[w] / samples / (1 - share)
    }
  }

  multipleAt(radiusM: number, muSun: number, out: Float64Array): void {
    const u = (muSun + 1) / 2
    const height = Math.max(radiusM - AtmosphereProfile.GROUND_RADIUS_M, 0) / (AtmosphereProfile.TOP_RADIUS_M - AtmosphereProfile.GROUND_RADIUS_M)
    const v = height ** (1 / this.multipleHeightPower)
    this.bilinear(this.multiple, this.multipleSize, this.multipleRows, u, v, out)
  }

  // --- The view -----------------------------------------------------------------------------------

  /**
   * Spectral radiance arriving at a observer `altitudeM` above the ground, looking along `view`,
   * with the Sun in direction `sun` (both unit vectors, y up), for a Sun of unit irradiance.
   */
  radiance(altitudeM: number, view: Vector3Like, sun: Vector3Like, out: Float64Array): void {
    const origin = { x: 0, y: AtmosphereProfile.GROUND_RADIUS_M + Math.max(altitudeM, 0.5), z: 0 }
    this.march(origin, view, sun, true, out, undefined, this.steps)
  }

  private readonly marchTransmittance = new Float64Array(AtmosphereProfile.WAVELENGTHS_NM.length)
  private readonly marchMultiple = new Float64Array(AtmosphereProfile.WAVELENGTHS_NM.length)
  private readonly marchThroughput = new Float64Array(AtmosphereProfile.WAVELENGTHS_NM.length)

  /**
   * One march along a ray. `view` true: the real phase functions and the multiple-scattering table,
   * which is a observer's line of sight. `view` false: isotropic scattering and single scattering
   * only, which is what the multiple-scattering table is built from — and then `scattered` receives,
   * per wavelength, the share of light that ray scatters before it leaves.
   */
  private march(
    origin: Vector3Like,
    direction: Vector3Like,
    sun: Vector3Like,
    view: boolean,
    out: Float64Array,
    scattered: Float64Array | undefined,
    steps: number
  ): void {
    out.fill(0)
    scattered?.fill(0)
    const profile = this.profile
    const radius = Math.hypot(origin.x, origin.y, origin.z)
    const mu = (origin.x * direction.x + origin.y * direction.y + origin.z * direction.z) / radius
    const toGround = SkyScattering.distanceToGround(radius, mu)
    const hitsGround = Number.isFinite(toGround)
    const length = hitsGround ? toGround : SkyScattering.distanceToTop(radius, mu)
    const cosAngle = direction.x * sun.x + direction.y * sun.y + direction.z * sun.z
    const rayleighPhase = view ? AtmosphereProfile.rayleighPhase(cosAngle) : 1 / (4 * Math.PI)
    const aerosolPhase = view ? AtmosphereProfile.aerosolPhase(cosAngle) : 1 / (4 * Math.PI)
    const throughput = this.marchThroughput.fill(1)
    const toSun = this.marchTransmittance
    const multiple = this.marchMultiple
    for (let step = 0; step < steps; step++) {
      // Crowded near the eye, quadratically: along a low line of sight that is where the air is
      // thickest, and a uniform march spends most of its samples in near-vacuum.
      const t0 = length * (step / steps) ** 2
      const t1 = length * ((step + 1) / steps) ** 2
      const t = (t0 + t1) / 2
      const dt = t1 - t0
      const px = origin.x + direction.x * t
      const py = origin.y + direction.y * t
      const pz = origin.z + direction.z * t
      const pRadius = Math.hypot(px, py, pz)
      const altitude = pRadius - AtmosphereProfile.GROUND_RADIUS_M
      const muSun = (px * sun.x + py * sun.y + pz * sun.z) / pRadius
      const rayleigh = AtmosphereProfile.rayleighDensity(altitude)
      const aerosol = AtmosphereProfile.aerosolDensity(altitude)
      const ozone = AtmosphereProfile.ozoneDensity(altitude)
      // The planet's shadow: the Sun is gone for this point once the ground stands between them.
      const lit = Number.isFinite(SkyScattering.distanceToGround(pRadius, muSun)) ? 0 : 1
      this.transmittanceToTop(pRadius, muSun, toSun)
      if (view) this.multipleAt(pRadius, muSun, multiple)
      for (let w = 0; w < this.count; w++) {
        const rayleighScattering = profile.rayleighScattering[w] * rayleigh
        const aerosolScattering = profile.aerosolScattering[w] * aerosol
        const extinction = rayleighScattering + profile.aerosolExtinction[w] * aerosol + profile.ozoneAbsorption[w] * ozone
        const source =
          lit * toSun[w] * (rayleighScattering * rayleighPhase + aerosolScattering * aerosolPhase) +
          (view ? multiple[w] * (rayleighScattering + aerosolScattering) : 0)
        const sampleTransmittance = Math.exp(-extinction * dt)
        // The source integrated exactly over the step, against the step's own extinction — stable
        // where a plain source·dt overshoots in thick air near the horizon.
        const integrated = extinction > 0 ? (source * (1 - sampleTransmittance)) / extinction : source * dt
        out[w] += throughput[w] * integrated
        if (scattered) scattered[w] += throughput[w] * (rayleighScattering + aerosolScattering) * dt
        throughput[w] *= sampleTransmittance
      }
    }
    if (hitsGround && this.groundAlbedo > 0) {
      // Sunlight off the ground, seen from above it — part of every higher order, and most of what
      // lights the underside of the sky over a bright surface.
      const px = origin.x + direction.x * length
      const py = origin.y + direction.y * length
      const pz = origin.z + direction.z * length
      const pRadius = Math.hypot(px, py, pz)
      const muSun = (px * sun.x + py * sun.y + pz * sun.z) / pRadius
      if (muSun > 0) {
        this.transmittanceToTop(pRadius, muSun, toSun)
        for (let w = 0; w < this.count; w++) out[w] += (throughput[w] * toSun[w] * muSun * this.groundAlbedo) / Math.PI
      }
    }
  }

  private bilinear(table: Float64Array, width: number, height: number, u: number, v: number, out: Float64Array): void {
    const x = Math.min(Math.max(u * width - 0.5, 0), width - 1)
    const y = Math.min(Math.max(v * height - 0.5, 0), height - 1)
    const x0 = Math.floor(x)
    const y0 = Math.floor(y)
    const x1 = Math.min(x0 + 1, width - 1)
    const y1 = Math.min(y0 + 1, height - 1)
    const fx = x - x0
    const fy = y - y0
    const count = this.count
    const a = (y0 * width + x0) * count
    const b = (y0 * width + x1) * count
    const c = (y1 * width + x0) * count
    const d = (y1 * width + x1) * count
    for (let w = 0; w < count; w++) {
      out[w] = (table[a + w] * (1 - fx) + table[b + w] * fx) * (1 - fy) + (table[c + w] * (1 - fx) + table[d + w] * fx) * fy
    }
  }
}
