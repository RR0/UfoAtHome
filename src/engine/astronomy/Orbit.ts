/**
 * A two-body orbit around the Sun, propagated from its own perihelion.
 *
 * Written for comets, which is why it is here rather than left to `astronomy-engine`: that library
 * carries the planets, the Moon and the Sun, and nothing else — a comet has no ephemeris in it at
 * all. What a comet does have is a published set of osculating elements per apparition, and those
 * plus Kepler's problem give a position good to a fraction of a degree over the months a comet is
 * worth talking about. Checked against JPL Horizons for every apparition in the catalog; see
 * scripts/build-comet-catalog.ts.
 *
 * TWO-BODY, and the word is the whole caveat. Planetary perturbations are ignored, so an element
 * set osculating at perihelion drifts as the date moves away from it. That is exactly why the
 * catalog stores elements taken AT each apparition's perihelion rather than one modern set
 * propagated backwards: the useful window is the few months around perihelion, which is also the
 * only stretch a comet is bright enough for anybody to have mistaken it for anything.
 *
 * Solved in UNIVERSAL VARIABLES rather than by the usual eccentric-anomaly Kepler equation, and
 * that is not a flourish. Comets are the one family where the eccentricity sits on top of 1 —
 * Ikeya-Seki's is 0.99991, Hale-Bopp's 0.99513, and several in the catalog are formally hyperbolic
 * — and the elliptic and hyperbolic forms both degenerate exactly there. The universal formulation
 * has no such seam: one equation covers ellipse, parabola and hyperbola, and the near-parabolic
 * case that would break either of the others is simply an ordinary point in it.
 */

export interface Vector3 {
  x: number
  y: number
  z: number
}

/** Heliocentric osculating elements, ecliptic and equinox of J2000 — the form JPL Horizons and the
 * Minor Planet Center both publish, so nothing has to be converted before it is stored. */
export interface OrbitalElements {
  /** 0 is a circle, 1 a parabola, more than 1 a hyperbola. Comets sit within a whisker of 1. */
  eccentricity: number
  /** Perihelion distance, astronomical units. */
  perihelionAu: number
  inclinationDeg: number
  /** Longitude of the ascending node, degrees. */
  ascendingNodeDeg: number
  /** Argument of perihelion, degrees. */
  argumentOfPerihelionDeg: number
  /** Time of perihelion passage, as a Julian day in barycentric dynamical time. */
  perihelionJd: number
}

export class KeplerOrbit {
  /** The Sun's gravitational parameter in the units everything here is in: au³/day². The square of
   * the Gaussian gravitational constant, which is what makes these the natural units for an orbit
   * given in au and days. */
  static readonly SUN_GM_AU3_PER_DAY2 = 2.959122082855911e-4
  /** Newton's method would be quicker and is not worth it: the bracketed search below cannot
   * diverge, and the whole thing runs for at most a handful of comets per frame. */
  private static readonly MAX_ITERATIONS = 200

  private readonly perihelionPosition: Vector3
  private readonly perihelionVelocity: Vector3
  /** The reciprocal of the semi-major axis: positive for an ellipse, zero for a parabola, negative
   * for a hyperbola. The one number the universal formulation needs to tell the three apart, and it
   * passes through zero without the arithmetic noticing. */
  private readonly inverseSemiMajorAxis: number

  constructor(private readonly elements: OrbitalElements) {
    const { eccentricity: e, perihelionAu: q } = elements
    const [perihelionDirection, motionDirection] = this.perifocalAxes()
    const speed = Math.sqrt((KeplerOrbit.SUN_GM_AU3_PER_DAY2 * (1 + e)) / q)
    this.perihelionPosition = this.scale(perihelionDirection, q)
    this.perihelionVelocity = this.scale(motionDirection, speed)
    this.inverseSemiMajorAxis = (1 - e) / q
  }

  /**
   * Where the body was, heliocentric ecliptic J2000, in astronomical units.
   *
   * Propagated from perihelion rather than from an arbitrary epoch, which makes the starting state
   * exact and free: at perihelion the body is `q` from the Sun along the perihelion direction, and
   * moving exactly perpendicular to it. No radial-velocity term survives into the equation below,
   * which is the reason it reads as simply as it does.
   */
  positionAt(julianDay: number): Vector3 {
    const days = julianDay - this.elements.perihelionJd
    const chi = this.universalAnomaly(days)
    const z = this.inverseSemiMajorAxis * chi * chi
    const q = this.elements.perihelionAu
    // Lagrange coefficients: the position is a fixed combination of where the body started and how
    // it was moving, whatever conic it is on.
    const f = 1 - ((chi * chi) / q) * KeplerOrbit.stumpffC(z)
    const g = days - ((chi * chi * chi) / Math.sqrt(KeplerOrbit.SUN_GM_AU3_PER_DAY2)) * KeplerOrbit.stumpffS(z)
    return {
      x: f * this.perihelionPosition.x + g * this.perihelionVelocity.x,
      y: f * this.perihelionPosition.y + g * this.perihelionVelocity.y,
      z: f * this.perihelionPosition.z + g * this.perihelionVelocity.z
    }
  }

  /** How far from the Sun the body was, in astronomical units — the `r` every comet brightness
   * formula is written in terms of. */
  heliocentricDistanceAt(julianDay: number): number {
    const position = this.positionAt(julianDay)
    return Math.hypot(position.x, position.y, position.z)
  }

  /**
   * The universal anomaly `chi` at `days` from perihelion: the one unknown of Kepler's problem in
   * this formulation, in units of square-root astronomical units.
   *
   * Solved by bracketing and bisection rather than by Newton. The function below is strictly
   * increasing in chi — its derivative is `(1 - q/a)·chi²·C(z) + q`, and both terms are positive —
   * so a bracket can always be found by doubling and can never be lost. Newton on the same function
   * is faster and, for the near-parabolic orbits this exists to handle, is exactly where it
   * misbehaves; a solver that cannot fail is worth more here than one that converges in four steps
   * instead of sixty.
   *
   * Odd in `days`, so a date before perihelion is solved as its mirror after it.
   */
  private universalAnomaly(days: number): number {
    if (days === 0) return 0
    const sign = Math.sign(days)
    const target = Math.sqrt(KeplerOrbit.SUN_GM_AU3_PER_DAY2) * Math.abs(days)
    const timeAt = (chi: number): number => {
      const z = this.inverseSemiMajorAxis * chi * chi
      const q = this.elements.perihelionAu
      return (1 - this.inverseSemiMajorAxis * q) * chi * chi * chi * KeplerOrbit.stumpffS(z) + q * chi
    }
    let high = Math.max(1, target / this.elements.perihelionAu)
    while (timeAt(high) < target) high *= 2
    let low = 0
    for (let i = 0; i < KeplerOrbit.MAX_ITERATIONS && high - low > 1e-13 * Math.max(1, high); i++) {
      const middle = (low + high) / 2
      if (timeAt(middle) < target) low = middle
      else high = middle
    }
    return (sign * (low + high)) / 2
  }

  /**
   * The perihelion direction and the direction of motion there, as unit vectors in ecliptic J2000.
   *
   * The standard three rotations — argument of perihelion within the orbital plane, inclination,
   * then longitude of the ascending node — written out rather than composed from matrices, since
   * only two of the three columns are ever needed.
   */
  private perifocalAxes(): [Vector3, Vector3] {
    const node = (this.elements.ascendingNodeDeg * Math.PI) / 180
    const argument = (this.elements.argumentOfPerihelionDeg * Math.PI) / 180
    const inclination = (this.elements.inclinationDeg * Math.PI) / 180
    const cosNode = Math.cos(node)
    const sinNode = Math.sin(node)
    const cosArgument = Math.cos(argument)
    const sinArgument = Math.sin(argument)
    const cosInclination = Math.cos(inclination)
    const sinInclination = Math.sin(inclination)
    return [
      {
        x: cosNode * cosArgument - sinNode * sinArgument * cosInclination,
        y: sinNode * cosArgument + cosNode * sinArgument * cosInclination,
        z: sinArgument * sinInclination
      },
      {
        x: -cosNode * sinArgument - sinNode * cosArgument * cosInclination,
        y: -sinNode * sinArgument + cosNode * cosArgument * cosInclination,
        z: cosArgument * sinInclination
      }
    ]
  }

  private scale(vector: Vector3, factor: number): Vector3 {
    return { x: vector.x * factor, y: vector.y * factor, z: vector.z * factor }
  }

  /**
   * The Stumpff function C — the series that becomes `(1 - cos)/z` on an ellipse and
   * `(cosh - 1)/(-z)` on a hyperbola, and is simply 1/2 at the parabola between them.
   *
   * The series is used near zero rather than the closed forms, because there both closed forms are
   * a difference of two nearly equal numbers divided by a nearly zero one, and double precision
   * quietly falls apart: by `z` of a thousandth of a billionth, `(1 - cos)` has lost most of its
   * significant digits. Every orbit here passes through that region at its own perihelion, and one
   * whose eccentricity sits within a few parts in a million of 1 — Seki-Lines, Kohoutek, West —
   * stays in it for hours either side.
   */
  static stumpffC(z: number): number {
    if (Math.abs(z) < 1e-6) return 1 / 2 - z / 24 + (z * z) / 720
    if (z > 0) return (1 - Math.cos(Math.sqrt(z))) / z
    const root = Math.sqrt(-z)
    return (Math.cosh(root) - 1) / -z
  }

  /** The Stumpff function S, the companion of C: `(sqrt(z) - sin)/z^1.5` on an ellipse, 1/6 at the
   * parabola, and the hyperbolic sine form beyond it. Series near zero for the same reason. */
  static stumpffS(z: number): number {
    if (Math.abs(z) < 1e-6) return 1 / 6 - z / 120 + (z * z) / 5040
    if (z > 0) {
      const root = Math.sqrt(z)
      return (root - Math.sin(root)) / (root * root * root)
    }
    const root = Math.sqrt(-z)
    return (Math.sinh(root) - root) / (root * root * root)
  }
}
