/**
 * How a parcel of exhaust moves once it has left a rocket: on its own, at the stage's velocity plus
 * the one it was thrown at, pulled by the Earth and, where there is enough air to touch it, stopped
 * by the air it sweeps.
 *
 * This is what makes a plume look the same from any side: nothing here knows where the observer is.
 * A puff thrown backwards from a stage climbing through 150 km meets its own mass of air within a
 * second or two and stays where it was let go, which is the trail; a puff let go 1 000 km up meets
 * almost nothing and keeps its velocity for minutes, so propellant vented sideways from a spinning
 * stage draws a spiral that moves on with the stage, seen face on as a spiral, edge on as a helix.
 *
 * Everything is worked out in the Earth-fixed frame, where the air is at rest: gravity, the
 * Coriolis and centrifugal pulls of the turning frame, and the drag of the air.
 */
export class ExhaustFlight {
  /** The Earth's gravitational parameter, km³/s², its rotation, rad/s, and its mean radius, km. */
  private static readonly MU = 398600.4418
  private static readonly OMEGA = 7.2921159e-5
  static readonly EARTH_RADIUS_KM = 6371
  /** The integration step, seconds: the fastest thing here, a puff stopped by thick air, is integrated implicitly. */
  static readonly STEP_S = 1

  /**
   * Density of the air, kg/m³, every so many kilometres up: the U.S. Standard Atmosphere 1976 (its
   * thermosphere for a moderate Sun). Between two heights the density falls exponentially.
   */
  private static readonly DENSITY: ReadonlyArray<readonly [number, number]> = [
    [0, 1.225], [20, 8.89e-2], [40, 4.0e-3], [60, 3.1e-4], [80, 1.85e-5], [100, 5.6e-7], [120, 2.22e-8],
    [150, 2.08e-9], [200, 2.54e-10], [250, 6.07e-11], [300, 1.92e-11], [400, 2.8e-12], [500, 5.22e-13],
    [600, 1.14e-13], [700, 3.07e-14], [800, 1.14e-14], [900, 5.76e-15], [1000, 3.56e-15]
  ]
  /**
   * The mean free path of air, m, is this over its density in kg/m³: the mass of a molecule of air
   * over √2 π d² with d = 0.365 nm. It is 30 m at 150 km and some 20 000 km at 1 000 km.
   */
  private static readonly FREE_PATH_TIMES_DENSITY = 6.8e-8
  /** kg/m³. */
  private static readonly ICE_DENSITY = 917

  /** The density of the air at `heightKm`, kg/m³. */
  static airDensity(heightKm: number): number {
    const table = ExhaustFlight.DENSITY
    if (heightKm <= table[0][0]) return table[0][1]
    let i = 0
    while (i < table.length - 2 && table[i + 1][0] < heightKm) i++
    const [h0, d0] = table[i]
    const [h1, d1] = table[i + 1]
    return d0 * Math.exp(Math.log(d1 / d0) * (heightKm - h0) / (h1 - h0))
  }

  /**
   * How much the air holds a puff of `massKg` and `radiusKm` going through it back, per kilometre (the
   * `k` of dv/dt = -k |v| v). Where the air's mean free path is short beside the puff, the air flows
   * round it as a fluid and the puff stops once it has swept its own mass of it. Where the path is
   * longer, the air's molecules go through the puff and only hit its particles one by one, each of
   * radius `particleRadiusUm` and as dense as ice, which at 1 000 km is nothing.
   */
  static dragPerKm(heightKm: number, radiusKm: number, massKg: number, particleRadiusUm = 0.5): number {
    const density = ExhaustFlight.airDensity(heightKm)
    const freePathKm = ExhaustFlight.FREE_PATH_TIMES_DENSITY / density / 1000
    const fluid = Math.exp(-freePathKm / radiusKm)
    // kg/m³ is 1e9 kg/km³.
    const swept = density * 1e9 * Math.PI * radiusKm * radiusKm / Math.max(massKg, 1e-9)
    // A sphere of ice taking the full momentum of the molecules it meets: 3 rho / (4 r rho_ice), per metre.
    const particles = 3 * density / (4 * particleRadiusUm * 1e-6 * ExhaustFlight.ICE_DENSITY) * 1000
    return fluid * swept + (1 - fluid) * particles
  }

  /** One step of `state` (x, y, z, vx, vy, vz), in place. */
  static step(state: Float64Array, dt: number, radiusKm: number, massKg: number, particleRadiusUm: number): void {
    const [x, y, z, vx, vy, vz] = state
    const r = Math.hypot(x, y, z)
    const w = ExhaustFlight.OMEGA
    const g = -ExhaustFlight.MU / (r * r * r)
    // Gravity, Coriolis (-2 Ω × v) and centrifugal (-Ω × (Ω × r)) with Ω along z.
    const ax = g * x + 2 * w * vy + w * w * x
    const ay = g * y - 2 * w * vx + w * w * y
    const az = g * z
    const speed = Math.hypot(vx, vy, vz)
    const k = ExhaustFlight.dragPerKm(r - ExhaustFlight.EARTH_RADIUS_KM, radiusKm, massKg, particleRadiusUm)
    // Implicit in the drag, which in thick air stops a puff far faster than a step.
    const hold = 1 / (1 + k * speed * dt)
    state[3] = (vx + ax * dt) * hold
    state[4] = (vy + ay * dt) * hold
    state[5] = (vz + az * dt) * hold
    state[0] = x + state[3] * dt
    state[1] = y + state[4] * dt
    state[2] = z + state[5] * dt
    // Nothing goes through the ground.
    const after = Math.hypot(state[0], state[1], state[2])
    if (after < ExhaustFlight.EARTH_RADIUS_KM) {
      const lift = ExhaustFlight.EARTH_RADIUS_KM / after
      state[0] *= lift
      state[1] *= lift
      state[2] *= lift
      state[3] = state[4] = state[5] = 0
    }
  }
}

/**
 * The flight of one puff of exhaust, from where it was let go (km, Earth-fixed) at the velocity it
 * left with (km/s, Earth-fixed), sampled every STEP_S. It is worked out as far as it is asked and no
 * further, and kept: a plume is asked for the same puffs at a slightly later age every frame.
 */
export class ExhaustPath {
  private positions: Float64Array
  private steps = 0
  private readonly state: Float64Array

  constructor(position: readonly [number, number, number], velocity: readonly [number, number, number],
    private readonly massKg: number, private readonly radiusAt: (ageS: number) => number, private readonly particleRadiusUm = 0.5) {
    this.state = Float64Array.of(...position, ...velocity)
    this.positions = new Float64Array(3 * 64)
    this.positions.set(position, 0)
  }

  /** Where the puff is at `ageS` seconds after it was let go, km, Earth-fixed. */
  at(ageS: number): [number, number, number] {
    const dt = ExhaustFlight.STEP_S
    const index = Math.max(0, ageS / dt)
    const needed = Math.ceil(index)
    while (this.steps < needed) {
      ExhaustFlight.step(this.state, dt, this.radiusAt(this.steps * dt), this.massKg, this.particleRadiusUm)
      this.steps++
      if (3 * (this.steps + 1) > this.positions.length) {
        const grown = new Float64Array(this.positions.length * 2)
        grown.set(this.positions)
        this.positions = grown
      }
      this.positions.set(this.state.subarray(0, 3), 3 * this.steps)
    }
    const i = Math.floor(index)
    const f = index - i
    const p = this.positions
    if (f === 0 || i >= this.steps) return [p[3 * i], p[3 * i + 1], p[3 * i + 2]]
    return [0, 1, 2].map(c => p[3 * i + c] + (p[3 * i + 3 + c] - p[3 * i + c]) * f) as [number, number, number]
  }
}
