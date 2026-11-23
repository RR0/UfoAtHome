/**
 * The Earth's magnetic field as the aurora goes by it: a centred dipole, its axis where the IGRF put it at the date.
 *
 * An aurora stands where the field lines that reach into the magnetosphere's tail come down: a ring round the magnetic pole, not the
 * geographic one, which is why Montreal sees more of them than Paris at a lower latitude. What decides whether a place sees one is its
 * GEOMAGNETIC latitude, and the latitude of the aurora is stated in the same terms (see AuroralOval). A centred dipole is the first term of the
 * field, and what the shader walks the sky by: over the few thousand kilometres an observer sees, its lines are the real field's but for
 * a shift of latitude. That shift is not small (Paris is at 50° of the dipole's latitude and 44° of the real field's, see Igrf), so the
 * place's own is taken out (see AuroraSighting.viewAt).
 *
 * The axis moved: its northern end went from 78.7° N, 68.8° W in 1900 to 80.8° N, 72.7° W in 2025 — a little over two degrees in a century,
 * which over the Atlantic is a degree of magnetic latitude, a fifth of a Kp step.
 */
export class Geomagnetism {
  /**
   * The northern end of the dipole's axis (the geomagnetic north pole), by epoch: from the IGRF's first three coefficients, as the NOAA's
   * and the Kyoto WDC's tables give it, rounded to a tenth of a degree (1925 and 1975 read between their neighbours). Linearly joined
   * between epochs, held past either end.
   */
  static readonly POLES: readonly { year: number, lat: number, lng: number }[] = [
    { year: 1900, lat: 78.7, lng: -68.8 },
    { year: 1925, lat: 78.6, lng: -68.6 },
    { year: 1950, lat: 78.5, lng: -68.8 },
    { year: 1975, lat: 78.8, lng: -70.0 },
    { year: 1990, lat: 79.2, lng: -71.1 },
    { year: 2000, lat: 79.6, lng: -71.6 },
    { year: 2010, lat: 80.1, lng: -72.2 },
    { year: 2015, lat: 80.4, lng: -72.6 },
    { year: 2020, lat: 80.7, lng: -72.7 },
    { year: 2025, lat: 80.8, lng: -72.7 }
  ]

  /** The geomagnetic north pole at a date, geographic degrees. */
  static poleAt(date: Date): { lat: number, lng: number } {
    const year = date.getUTCFullYear() + date.getUTCMonth() / 12
    const poles = Geomagnetism.POLES
    if (year <= poles[0].year) return { lat: poles[0].lat, lng: poles[0].lng }
    for (let i = 1; i < poles.length; i++) {
      if (year > poles[i].year) continue
      const a = poles[i - 1], b = poles[i]
      const f = (year - a.year) / (b.year - a.year)
      return { lat: a.lat + (b.lat - a.lat) * f, lng: a.lng + (b.lng - a.lng) * f }
    }
    const last = poles[poles.length - 1]
    return { lat: last.lat, lng: last.lng }
  }

  /** The unit vector from the Earth's centre towards a place, in the Earth's own frame (x to 0° 0°, z to the north pole). */
  static earthVector(latDeg: number, lngDeg: number): [number, number, number] {
    const lat = (latDeg * Math.PI) / 180, lng = (lngDeg * Math.PI) / 180
    return [Math.cos(lat) * Math.cos(lng), Math.cos(lat) * Math.sin(lng), Math.sin(lat)]
  }

  /** The geomagnetic latitude of a place at a date, degrees: how far it is from the dipole's equator. */
  static latitudeOf(latDeg: number, lngDeg: number, date: Date): number {
    const pole = Geomagnetism.poleAt(date)
    const [px, py, pz] = Geomagnetism.earthVector(pole.lat, pole.lng)
    const [x, y, z] = Geomagnetism.earthVector(latDeg, lngDeg)
    return (Math.asin(Math.max(-1, Math.min(1, px * x + py * y + pz * z))) * 180) / Math.PI
  }

  /**
   * The dipole's northern axis seen from a place, in the scene's own frame: x to the east, y up, z to the south (see horizontalToCartesian).
   * A vector of unit length; its y is the sine of the place's geomagnetic latitude.
   */
  static axisAt(latDeg: number, lngDeg: number, date: Date): [number, number, number] {
    const pole = Geomagnetism.poleAt(date)
    const p = Geomagnetism.earthVector(pole.lat, pole.lng)
    const lat = (latDeg * Math.PI) / 180, lng = (lngDeg * Math.PI) / 180
    const east: [number, number, number] = [-Math.sin(lng), Math.cos(lng), 0]
    const north: [number, number, number] = [-Math.sin(lat) * Math.cos(lng), -Math.sin(lat) * Math.sin(lng), Math.cos(lat)]
    const up: [number, number, number] = [Math.cos(lat) * Math.cos(lng), Math.cos(lat) * Math.sin(lng), Math.sin(lat)]
    const dot = (a: readonly number[], b: readonly number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
    return [dot(p, east), dot(p, up), -dot(p, north)]
  }

  /**
   * The magnetic local time of a point, hours: where it stands round the dipole's axis from the Sun, as a clock reads it — noon under the
   * Sun's magnetic meridian, midnight opposite it. `point`, `axis` and `sun` in any one frame; `point` and `sun` from the Earth's centre.
   * The aurora's oval is fixed in this clock, not in the Earth's: the Earth turns under it.
   */
  static localTime(point: readonly number[], axis: readonly number[], sun: readonly number[]): number {
    const dot = (a: readonly number[], b: readonly number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
    const flat = (v: readonly number[]) => {
      const d = dot(v, axis)
      return [v[0] - d * axis[0], v[1] - d * axis[1], v[2] - d * axis[2]]
    }
    const p = flat(point), s = flat(sun)
    // East of the Sun's meridian: the axis crossed with the way to the Sun.
    const east = [axis[1] * s[2] - axis[2] * s[1], axis[2] * s[0] - axis[0] * s[2], axis[0] * s[1] - axis[1] * s[0]]
    const angle = Math.atan2(dot(east, p), dot(s, p))
    return ((12 + (angle * 12) / Math.PI) % 24 + 24) % 24
  }

  /**
   * The magnetic latitude the field line through a point comes down to at `footKm` above the ground, degrees: a dipole's line keeps
   * r / cos²λ, so it leans towards the equator as it rises. An auroral curtain lies along these lines, which is what makes its rays lean
   * and, seen from under it, meet at one point of the sky (the corona).
   */
  static footLatitude(latitudeDeg: number, heightKm: number, footKm = 100, earthKm = 6371): number {
    const cos = Math.cos((latitudeDeg * Math.PI) / 180)
    const footCos = Math.sqrt(Math.min(1, (cos * cos * (earthKm + footKm)) / (earthKm + heightKm)))
    return Math.sign(latitudeDeg) * (Math.acos(footCos) * 180) / Math.PI
  }
}
