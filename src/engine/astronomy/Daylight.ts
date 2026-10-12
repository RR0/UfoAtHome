import { AircraftLighting } from "../traffic/AircraftLighting.js"

/**
 * Whether the Sun (or the Moon) lights the ground at all, which is not the same as being in the sky.
 *
 * A beam of sunlight reaches a surface only while the disc is above that surface's horizon. Once the whole of it has gone under, nothing on the
 * ground is lit by it, however dim: what is left is the sky's own light, scattered from the air above. A scene that went on lighting walls with the
 * Sun a few degrees under the horizon drew them lit on the side that faced it, in a deep orange, and an edge of the same orange at the foot of
 * every wall and trunk where the relief's shadow did not quite meet it.
 *
 * Clouds are not the ground: high ones are lit long after, since their horizon is far lower, which is why this is only for what stands on the
 * ground (see SceneRenderer.updateCelestialLight, which keeps the clouds' own light as it was).
 */
export class Daylight {
  /**
   * The share of the disc of the Sun or the Moon that stands above the horizon of something `heightM` above the sea, 0 to 1: none once the whole
   * disc is below it, all while the whole disc is above, a smooth passage over the width of the disc between.
   *
   * `apparentAltitudeDeg` is where the centre of the disc appears, which the air has already raised by its refraction (see
   * CelestialPositions.equatorialToHorizontal): a centre appearing a quarter of a degree below the horizon is the whole disc just gone. The
   * horizon of a place above the sea lies below the level one by the dip (see AircraftLighting.dipDeg), which keeps the Sun a little longer for a hill.
   */
  static directFraction(apparentAltitudeDeg: number, heightM: number): number {
    const above = apparentAltitudeDeg + AircraftLighting.dipDeg(heightM)
    const x = Math.min(1, Math.max(0, above / AircraftLighting.SUN_DISC_DEG + 0.5))
    return x * x * (3 - 2 * x)
  }
}
