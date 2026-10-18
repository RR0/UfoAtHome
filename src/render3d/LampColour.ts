import type { RgbColor } from "./skyColors.js"

/**
 * The colour of a lamp's light from its colour temperature: the point of the Planckian locus at that temperature (Kim et al.'s cubic fits, 1 667 K
 * to 25 000 K), as linear sRGB of unit luminance. What a town's inventory says of its lamps is their colour temperature, and a sodium lamp's 2 000 K is
 * an orange that a 3 000 K LED's warm white is not: the street of an account from the sodium years and the same street today do not light alike.
 */
export class LampColour {
  private static readonly MIN_K = 1667
  private static readonly MAX_K = 25000

  /** Linear sRGB of unit luminance (0.2126 R + 0.7152 G + 0.0722 B = 1) of the light of a lamp at `kelvins`. */
  static ofTemperature(kelvins: number): RgbColor {
    const t = Math.min(LampColour.MAX_K, Math.max(LampColour.MIN_K, kelvins))
    const x = t <= 4000
      ? -0.2661239e9 / t ** 3 - 0.2343589e6 / t ** 2 + 0.8776956e3 / t + 0.17991
      : -3.0258469e9 / t ** 3 + 2.1070379e6 / t ** 2 + 0.2226347e3 / t + 0.24039
    const y = t <= 2222
      ? -1.1063814 * x ** 3 - 1.3481102 * x ** 2 + 2.18555832 * x - 0.20219683
      : t <= 4000
        ? -0.9549476 * x ** 3 - 1.37418593 * x ** 2 + 2.09137015 * x - 0.16748867
        : 3.081758 * x ** 3 - 5.8733867 * x ** 2 + 3.75112997 * x - 0.37001483
    // XYZ of unit luminance, then linear sRGB (D65), what is outside the gamut held at its edge.
    const X = x / y
    const Z = (1 - x - y) / y
    const rgb = [3.2406 * X - 1.5372 - 0.4986 * Z, -0.9689 * X + 1.8758 + 0.0415 * Z, 0.0557 * X - 0.204 + 1.057 * Z].map(value => Math.max(0, value))
    const luminance = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]
    return [rgb[0] / luminance, rgb[1] / luminance, rgb[2] / luminance]
  }
}
