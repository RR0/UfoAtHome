/**
 * The unit the two diffuse glows of the night sky are measured in, and the grids they are stated on.
 *
 * A star has a magnitude; the Milky Way and the zodiacal light do not, because there is no "it" to
 * put a magnitude on — they are a brightness PER PATCH OF SKY, and the only honest way to compare
 * them with each other, with the sky they stand on, and with the moonlight that drowns them is to
 * put all four in the same unit.
 *
 * That unit is S10: the light of one tenth-magnitude star spread over one square degree. It is the
 * unit the measurements these models are anchored on are published in, which is the only reason to
 * prefer it over magnitudes per square arcsecond — the two are the same statement (see
 * S10_MAG_PER_ARCSEC2) and this file converts freely between them.
 *
 * Also here: the two warped grid mappings both glow maps use. A uniform grid spends its rows where
 * nothing happens (the galactic poles, the anti-solar sky) and starves the two places that carry
 * the whole shape — the plane of the Galaxy, where the dark rift is a couple of degrees wide, and
 * the sky near the Sun, where the zodiacal cone rises and falls within twenty. Warping the grid
 * instead of enlarging it buys that resolution for nothing, and costs one square root in the
 * shader that samples it.
 */
export interface SkyBrightnessMap {
  width: number
  height: number
  /** Surface brightness in S10 units, row-major, `data[row * width + column]`. */
  data: Float32Array
}

export class SurfaceBrightness {
  /**
   * What one S10 unit is worth in magnitudes per square arcsecond.
   *
   * A tenth-magnitude star spread over a square degree, and a square degree is 3600² square
   * arcseconds: 10 + 2.5·log10(12 960 000). Not a measurement, an identity — but worth writing out,
   * because it is the number that makes the published values legible. A dark natural sky is about
   * 220 S10, which this says is 22.0 magnitudes per square arcsecond, and that is the figure every
   * observer knows.
   */
  static readonly S10_MAG_PER_ARCSEC2 = 10 + 2.5 * Math.log10(3600 * 3600)

  static toMagPerArcsec2(s10: number): number {
    return SurfaceBrightness.S10_MAG_PER_ARCSEC2 - 2.5 * Math.log10(Math.max(s10, 1e-12))
  }

  static fromMagPerArcsec2(magPerArcsec2: number): number {
    return 10 ** (0.4 * (SurfaceBrightness.S10_MAG_PER_ARCSEC2 - magPerArcsec2))
  }

  /**
   * Latitude of a grid row, from its texture coordinate — the warp that puts the rows where the
   * structure is.
   *
   * Quadratic in the signed distance from the equator of whichever band is being mapped, so a
   * 128-row grid lands its innermost rows two hundredths of a degree from the plane and its
   * outermost a degree and a half apart near the poles. Both glows are flat things seen edge on:
   * everything they have to say is within ten degrees of a plane, and nothing at all happens at the
   * poles of it.
   *
   * The shader inverts this per fragment, which is why the inverse is written out below rather than
   * searched for: `t = sign(b)·sqrt(|b|/90)`, one square root.
   */
  static latitudeOfRowCoord(v: number): number {
    const t = 2 * v - 1
    return 90 * Math.sign(t) * t * t
  }

  static rowCoordOfLatitude(latitudeDeg: number): number {
    const t = Math.sign(latitudeDeg) * Math.sqrt(Math.min(Math.abs(latitudeDeg), 90) / 90)
    return (t + 1) / 2
  }

  /**
   * An angle from zero to half a turn, from a grid column's texture coordinate — the same trick
   * applied to the one axis the zodiacal light varies fast along.
   *
   * That axis is how far round the ecliptic a direction lies from the Sun's own longitude, and
   * quadratic again, warped TOWARD the Sun: the cone doubles in brightness between forty degrees
   * from the Sun and twenty, and does almost nothing at all across the whole far half of the sky
   * except for the faint brightening at the anti-solar point.
   */
  static angleOfColumnCoord(u: number): number {
    return 180 * u * u
  }

  static columnCoordOfAngle(angleDeg: number): number {
    return Math.sqrt(Math.min(Math.max(angleDeg, 0), 180) / 180)
  }
}
