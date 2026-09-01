/**
 * The visible spectrum, and what an eye makes of each part of it.
 *
 * Every coloured thing the air does to sunlight — the red inside of a halo, the blue outside of it,
 * the whole span of a rainbow — is one fact: the refractive index of a substance is not the same
 * for every wavelength. Modelling that means tracing light one colour at a time and then asking
 * what the sum of those colours looks like, which is what this is for: a handful of wavelengths,
 * each carrying the response it produces in the three channels a screen has.
 *
 * Shared by the ice family and the water one because it is a fact about EYES, not about either
 * substance. Two copies of it would be two chances for a halo and a rainbow to disagree about what
 * six hundred nanometres looks like, which they cannot do in the sky.
 */
export interface SpectralSample {
  readonly wavelengthNm: number
  readonly r: number
  readonly g: number
  readonly b: number
}

export class VisibleSpectrum {
  /** The ends of what an eye responds to. Nothing outside them is traced, because nothing outside
   * them would be seen. */
  static readonly VIOLET_NM = 400
  static readonly DEEP_RED_NM = 700

  /**
   * The spectrum sampled at even steps, each sample given the colour an eye assigns it: the 1931
   * colour-matching functions turned into screen primaries and normalised so that a flat spectrum
   * comes back white.
   *
   * That normalisation is the test that the WHITE parts of a display — the ones made by reflection,
   * which bends no colour away from any other — come out white and not tinted, while the refracted
   * parts come out with the spectrum the substance actually spreads.
   */
  static readonly SAMPLES: readonly SpectralSample[] = VisibleSpectrum.build(24)

  private static build(samples: number): readonly SpectralSample[] {
    const spectrum: { wavelengthNm: number; r: number; g: number; b: number }[] = []
    let totalR = 0
    let totalG = 0
    let totalB = 0
    for (let index = 0; index < samples; index++) {
      const wavelengthNm =
        VisibleSpectrum.VIOLET_NM +
        ((index + 0.5) / samples) * (VisibleSpectrum.DEEP_RED_NM - VisibleSpectrum.VIOLET_NM)
      const [x, y, z] = VisibleSpectrum.colourMatching(wavelengthNm)
      // CIE XYZ to linear sRGB.
      const entry = {
        wavelengthNm,
        r: Math.max(0, 3.2406 * x - 1.5372 * y - 0.4986 * z),
        g: Math.max(0, -0.9689 * x + 1.8758 * y + 0.0415 * z),
        b: Math.max(0, 0.0557 * x - 0.204 * y + 1.057 * z)
      }
      totalR += entry.r
      totalG += entry.g
      totalB += entry.b
      spectrum.push(entry)
    }
    for (const entry of spectrum) {
      entry.r /= totalR
      entry.g /= totalG
      entry.b /= totalB
    }
    return spectrum
  }

  /** A standard multi-lobe fit to the 1931 observer — how strongly one wavelength excites each of
   * the three responses an eye has. */
  private static colourMatching(wavelengthNm: number): [number, number, number] {
    const lobe = (centre: number, below: number, above: number): number => {
      const t = (wavelengthNm - centre) / (wavelengthNm < centre ? below : above)
      return Math.exp(-0.5 * t * t)
    }
    return [
      1.056 * lobe(599.8, 37.9, 31.0) + 0.362 * lobe(442.0, 16.0, 26.7) - 0.065 * lobe(501.1, 20.4, 26.2),
      0.821 * lobe(568.8, 46.9, 40.5) + 0.286 * lobe(530.9, 16.3, 31.1),
      1.217 * lobe(437.0, 11.8, 36.0) + 0.681 * lobe(459.0, 26.0, 13.8)
    ]
  }
}
