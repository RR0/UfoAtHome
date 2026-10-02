/**
 * The Sun on an aircraft, which is not the Sun on the ground under it.
 *
 * An aircraft at cruising height sees the Sun set long after the ground has: its horizon lies below
 * the geometric one by the dip, 3.3 degrees at 10.7 km, so it stays lit while the observer is already
 * in the dusk, and the sky around it is dark. At the end of the day that is a bright orange body against
 * a darkening sky — the commonest reason an aircraft is taken for something else — and at dawn the
 * same, in reverse.
 *
 * Pure geometry, on a spherical Earth: what colour the light is, and how much of it, is the renderer's
 * to say (see SceneRenderer.setDecorSunlight), from the air above the aircraft.
 */
export class AircraftLighting {
  private static readonly EARTH_RADIUS_M = 6371000
  private static readonly DEG = Math.PI / 180
  /** The Sun's apparent diameter, degrees: it sets over this much. */
  static readonly SUN_DISC_DEG = 0.54
  /** What the air bends its light by at the horizon, degrees, which keeps it up a little longer. */
  static readonly HORIZON_REFRACTION_DEG = 0.57

  /** How far the horizon of something at `heightM` is below the geometric one, degrees. */
  static dipDeg(heightM: number): number {
    return Math.acos(AircraftLighting.EARTH_RADIUS_M / (AircraftLighting.EARTH_RADIUS_M + Math.max(heightM, 0))) / AircraftLighting.DEG
  }

  /**
   * How high the Sun stands at the place of the aircraft, degrees above the horizontal THERE: the same
   * Sun, but a different horizontal, tilted by the distance over the curved Earth. An aircraft a hundred
   * kilometres towards the Sun stands a degree nearer its zenith than the observer does.
   *
   * `sun` is where the Sun is from the observer, as the astronomy gives it.
   */
  static sunElevationDeg(sun: { altitudeDeg: number; azimuthDeg: number }, observer: { lat: number; lng: number }, aircraft: { lat: number; lng: number }): number {
    const d = AircraftLighting.DEG
    const lat = observer.lat * d
    const lng = observer.lng * d
    const alt = sun.altitudeDeg * d
    const az = sun.azimuthDeg * d
    const east = [-Math.sin(lng), Math.cos(lng), 0]
    const north = [-Math.sin(lat) * Math.cos(lng), -Math.sin(lat) * Math.sin(lng), Math.cos(lat)]
    const up = [Math.cos(lat) * Math.cos(lng), Math.cos(lat) * Math.sin(lng), Math.sin(lat)]
    const toSun = [0, 1, 2].map(i => east[i] * Math.sin(az) * Math.cos(alt) + north[i] * Math.cos(az) * Math.cos(alt) + up[i] * Math.sin(alt))
    const latA = aircraft.lat * d
    const lngA = aircraft.lng * d
    const upA = [Math.cos(latA) * Math.cos(lngA), Math.cos(latA) * Math.sin(lngA), Math.sin(latA)]
    const dot = toSun[0] * upA[0] + toSun[1] * upA[1] + toSun[2] * upA[2]
    return Math.asin(Math.max(-1, Math.min(1, dot))) / d
  }

  /**
   * The share of the Sun's disc an aircraft at `heightM` sees over the Earth, 0 to 1, when the Sun is at
   * `sunElevationDeg` over the horizontal at its place: none once the whole disc is under its horizon,
   * all while the whole disc is above, and a smooth passage over the half degree between.
   */
  static litFraction(sunElevationDeg: number, heightM: number): number {
    const above = sunElevationDeg + AircraftLighting.dipDeg(heightM) + AircraftLighting.HORIZON_REFRACTION_DEG
    const x = Math.min(1, Math.max(0, above / AircraftLighting.SUN_DISC_DEG + 0.5))
    return x * x * (3 - 2 * x)
  }
}
