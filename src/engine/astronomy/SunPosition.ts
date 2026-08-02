/**
 * Vanilla (no dependency) solar position calculation — the standard NOAA/
 * Spencer low-precision solar position approximation (equation of time +
 * solar declination from day-of-year, then altitude/azimuth from hour
 * angle and latitude). Accurate to within a fraction of a degree, which is
 * plenty for driving sky color/star visibility in an illustrative
 * reconstruction — not an ephemeris-grade implementation.
 *
 * `hour`/`minute`/`second` are treated as the witness's local clock time.
 * Since testimony rarely records a UTC offset and reconstructing the exact
 * historical timezone/DST rules for a given date is its own can of worms,
 * the local standard meridian is approximated from longitude
 * (round(lng / 15) hours) instead of a timezone database. This is a
 * deliberate simplification consistent with this project's "illustrative,
 * non-validated reconstruction" stance (see engine/model/Sighting.ts).
 */

const DEG_TO_RAD = Math.PI / 180
const RAD_TO_DEG = 180 / Math.PI

export interface SunPositionInput {
  lat: number
  lng: number
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second?: number
}

export interface SunPosition {
  /** Degrees above (positive) or below (negative) the horizon */
  altitudeDeg: number
  /** Degrees clockwise from true north */
  azimuthDeg: number
}

function dayOfYear(year: number, month: number, day: number): number {
  const start = Date.UTC(year, 0, 1)
  const current = Date.UTC(year, month - 1, day)
  return Math.round((current - start) / 86_400_000) + 1
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function computeSunPosition(input: SunPositionInput): SunPosition {
  const { lat, lng, year, month, day, hour, minute, second = 0 } = input
  const doy = dayOfYear(year, month, day)
  const localMinutes = hour * 60 + minute + second / 60

  const gamma = ((2 * Math.PI) / 365) * (doy - 1 + (hour - 12) / 24)

  const eqTimeMinutes =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma))

  const declRad =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma)

  const timezoneOffsetHours = Math.round(lng / 15)
  const trueSolarTimeMinutes = localMinutes + eqTimeMinutes + 4 * (lng - 15 * timezoneOffsetHours)
  const hourAngleDeg = trueSolarTimeMinutes / 4 - 180

  const latRad = lat * DEG_TO_RAD
  const hourAngleRad = hourAngleDeg * DEG_TO_RAD

  const sinAltitude = Math.sin(latRad) * Math.sin(declRad) + Math.cos(latRad) * Math.cos(declRad) * Math.cos(hourAngleRad)
  const altitudeRad = Math.asin(clamp(sinAltitude, -1, 1))

  const azimuthDenominator = Math.cos(latRad) * Math.cos(altitudeRad)
  const cosAzimuth =
    azimuthDenominator === 0 ? 0 : (Math.sin(declRad) - Math.sin(latRad) * Math.sin(altitudeRad)) / azimuthDenominator
  const azimuthRad = Math.acos(clamp(cosAzimuth, -1, 1))
  const azimuthDeg = hourAngleDeg > 0 ? 360 - azimuthRad * RAD_TO_DEG : azimuthRad * RAD_TO_DEG

  return {
    altitudeDeg: altitudeRad * RAD_TO_DEG,
    azimuthDeg
  }
}

export type SkyBrightness = "day" | "civil-twilight" | "nautical-twilight" | "astronomical-twilight" | "night"

/** Standard twilight altitude thresholds (degrees below the horizon). */
export function skyBrightness(altitudeDeg: number): SkyBrightness {
  if (altitudeDeg > 0) return "day"
  if (altitudeDeg > -6) return "civil-twilight"
  if (altitudeDeg > -12) return "nautical-twilight"
  if (altitudeDeg > -18) return "astronomical-twilight"
  return "night"
}
