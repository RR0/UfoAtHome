import { IGRF_EPOCHS, IGRF_TERMS, IGRF_VALUES, IGRF_VARIATION } from "./igrfCoefficients.js"

/**
 * The Earth's main magnetic field as the IAGA's International Geomagnetic Reference Field gives it (IGRF-14, every five years since 1900),
 * and the one thing the aurora needs of it here: how far a place is from the magnetic equator along its own field line.
 *
 * A centred dipole (see Geomagnetism) puts Paris at 50° of magnetic latitude; the real field, whose line through Paris rises only to some
 * 2.1 Earth radii before it comes down again, puts it nearer 46°. That is two steps of Kp, the difference between an aurora seen from
 * Paris once a decade and every other winter. The latitude a field line's top gives (the apex latitude, Richmond 1995: cos²λ = a / r_apex,
 * as a dipole's line would have it) is what the auroral oval's tables are close to (the corrected geomagnetic latitudes are within a
 * degree of it), so it is what a place's aurora is placed by (see AuroraSighting).
 */
export class Igrf {
  /** The reference radius of the model, km. */
  static readonly A_KM = 6371.2
  static readonly MAX_DEGREE = 13

  /** The coefficients at a date: joined linearly between epochs, carried on by the secular variation past the last one. */
  static coefficientsAt(date: Date): { g: number[][], h: number[][] } {
    const year = date.getUTCFullYear() + (date.getUTCMonth() + date.getUTCDate() / 31) / 12
    const epochs = IGRF_EPOCHS
    let row: number[]
    if (year <= epochs[0]) row = [...IGRF_VALUES[0]]
    else if (year >= epochs[epochs.length - 1]) {
      const years = Math.min(year - epochs[epochs.length - 1], 5)
      row = IGRF_VALUES[epochs.length - 1].map((value, index) => value + IGRF_VARIATION[index] * years)
    } else {
      const index = epochs.findIndex(epoch => epoch > year)
      const f = (year - epochs[index - 1]) / (epochs[index] - epochs[index - 1])
      row = IGRF_VALUES[index - 1].map((value, k) => value + (IGRF_VALUES[index][k] - value) * f)
    }
    const g = Array.from({ length: Igrf.MAX_DEGREE + 1 }, () => new Array<number>(Igrf.MAX_DEGREE + 1).fill(0))
    const h = Array.from({ length: Igrf.MAX_DEGREE + 1 }, () => new Array<number>(Igrf.MAX_DEGREE + 1).fill(0))
    IGRF_TERMS.forEach(([kind, n, m], index) => {
      ;(kind === "g" ? g : h)[n][m] = row[index]
    })
    return { g, h }
  }

  /**
   * The field at a point given from the Earth's centre in its own frame (x to 0° 0°, z to the north pole), km: nT, in the same frame.
   * Schmidt semi-normalised Legendre functions by their usual recursion.
   */
  static fieldAt(coefficients: { g: number[][], h: number[][] }, x: number, y: number, z: number, degree = Igrf.MAX_DEGREE): [number, number, number] {
    const r = Math.hypot(x, y, z)
    const c = z / r
    const s = Math.max(Math.sqrt(Math.max(0, 1 - c * c)), 1e-9)
    const phi = Math.atan2(y, x)
    const P = Igrf.p, dP = Igrf.dp
    P[0][0] = 1
    dP[0][0] = 0
    let br = 0, bt = 0, bp = 0
    let ratio = (Igrf.A_KM / r) ** 2
    for (let n = 1; n <= degree; n++) {
      ratio *= Igrf.A_KM / r
      for (let m = 0; m <= n; m++) {
        if (n === m) {
          const k = n === 1 ? 1 : Math.sqrt(1 - 1 / (2 * n))
          P[n][n] = k * s * P[n - 1][n - 1]
          dP[n][n] = k * (s * dP[n - 1][n - 1] + c * P[n - 1][n - 1])
        } else {
          const k = Math.sqrt(n * n - m * m)
          const back = n - 2 >= m ? Math.sqrt((n - 1) ** 2 - m * m) : 0
          const p2 = n - 2 >= m ? P[n - 2][m] : 0
          const d2 = n - 2 >= m ? dP[n - 2][m] : 0
          P[n][m] = ((2 * n - 1) * c * P[n - 1][m] - back * p2) / k
          dP[n][m] = ((2 * n - 1) * (c * dP[n - 1][m] - s * P[n - 1][m]) - back * d2) / k
        }
        const cos = Math.cos(m * phi), sin = Math.sin(m * phi)
        const g = coefficients.g[n][m], h = coefficients.h[n][m]
        const along = g * cos + h * sin
        br += (n + 1) * ratio * along * P[n][m]
        bt -= ratio * along * dP[n][m]
        bp += (ratio * m * (g * sin - h * cos) * P[n][m]) / s
      }
    }
    const cp = Math.cos(phi), sp = Math.sin(phi)
    // r̂, θ̂ (southward), φ̂ (eastward) in the Earth's frame.
    return [
      br * s * cp + bt * c * cp - bp * sp,
      br * s * sp + bt * c * sp + bp * cp,
      br * c - bt * s
    ]
  }

  private static readonly p = Array.from({ length: Igrf.MAX_DEGREE + 1 }, () => new Array<number>(Igrf.MAX_DEGREE + 1).fill(0))
  private static readonly dp = Array.from({ length: Igrf.MAX_DEGREE + 1 }, () => new Array<number>(Igrf.MAX_DEGREE + 1).fill(0))

  /**
   * The apex latitude of a place at the ground, degrees, negative in the south: the field line through it is followed up until it stops
   * rising, and cos²λ = a / r of that top. A line that goes past 30 Earth radii is taken as open: its place is nearer the pole than any
   * oval, and the latitude its top would give is past 79°.
   */
  static apexLatitude(latDeg: number, lngDeg: number, date: Date): number {
    const coefficients = Igrf.coefficientsAt(date)
    const lat = (latDeg * Math.PI) / 180, lng = (lngDeg * Math.PI) / 180
    let p: [number, number, number] = [Igrf.A_KM * Math.cos(lat) * Math.cos(lng), Igrf.A_KM * Math.cos(lat) * Math.sin(lng), Igrf.A_KM * Math.sin(lat)]
    // Up the line: against the field in the north, where it points into the ground, along it in the south.
    const b0 = Igrf.fieldAt(coefficients, ...p)
    const sign = b0[0] * p[0] + b0[1] * p[1] + b0[2] * p[2] < 0 ? -1 : 1
    const direction = (q: readonly number[]): [number, number, number] => {
      const b = Igrf.fieldAt(coefficients, q[0], q[1], q[2], 8)
      const length = Math.hypot(b[0], b[1], b[2])
      return [(sign * b[0]) / length, (sign * b[1]) / length, (sign * b[2]) / length]
    }
    let r = Igrf.A_KM, top = r
    for (let step = 0; step < 4000; step++) {
      const ds = 0.01 * r
      const k1 = direction(p)
      const k2 = direction([p[0] + k1[0] * ds / 2, p[1] + k1[1] * ds / 2, p[2] + k1[2] * ds / 2])
      const k3 = direction([p[0] + k2[0] * ds / 2, p[1] + k2[1] * ds / 2, p[2] + k2[2] * ds / 2])
      const k4 = direction([p[0] + k3[0] * ds, p[1] + k3[1] * ds, p[2] + k3[2] * ds])
      p = [0, 1, 2].map(i => p[i] + (ds / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i])) as [number, number, number]
      r = Math.hypot(p[0], p[1], p[2])
      if (r > 30 * Igrf.A_KM) return Math.sign(latDeg || 1) * 80
      if (r < top) break
      top = r
    }
    return Math.sign(sign === -1 ? 1 : -1) * (Math.acos(Math.sqrt(Math.min(1, Igrf.A_KM / top))) * 180) / Math.PI
  }
}
