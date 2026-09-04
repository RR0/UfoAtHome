/**
 * How bright the sky itself is — which is the only thing that decides whether a diffuse glow in it
 * can be seen at all.
 *
 * A star has a magnitude and either clears the eye's threshold or does not, which is what
 * visibleMagnitudeLimit already answers for the star field. The Milky Way and the zodiacal light
 * cannot be asked that question: they have no magnitude, only a brightness spread over the sky, and
 * an eye does not detect them by brightness but by CONTRAST against the sky they lie on. A band
 * twice as bright as its background is unmistakable at midnight and literally the same band, still
 * exactly as bright, is invisible an hour after sunset — not because it faded, but because the sky
 * behind it rose past it.
 *
 * So this file is the denominator. It answers "what was the sky worth, in the same unit", from the
 * two things that actually raise it for a witness standing outside at night: the Sun still being not
 * far enough down, and the Moon being up.
 *
 * MOONLIGHT IS THE PART THAT SURPRISES PEOPLE, and it is why it is modelled properly here rather
 * than as a flat penalty. A full Moon puts the sky at about eighteenth magnitude a square
 * arcsecond — four magnitudes, forty times, above a natural dark sky — and there is simply no Milky
 * Way on such a night, anywhere in the sky, for anybody. Half the "I have never seen the Milky Way
 * from here" of a witness's account is the Moon and not the town. And the glow is not uniform: the
 * sky within twenty degrees of the Moon is several times brighter again than the sky opposite it,
 * which is why the model below is a function of the angle from the Moon and not a single number.
 */
export class NightSkyBrightness {
  /**
   * One S10 unit, in nanolamberts — the bridge between the unit the two glow maps are computed in
   * and the unit the sky they compete with is modelled in.
   *
   * Derived rather than written down, because the two scales are both defined and the conversion
   * between them is therefore an identity, not a measurement. Linear, since both are linear in
   * light: the magnitudes are only a way of writing it.
   */
  static get NANOLAMBERTS_PER_S10(): number {
    return NightSkyBrightness.toNanolamberts(10 + 2.5 * Math.log10(3600 * 3600))
  }

  static nanolambertsOfS10(s10: number): number {
    return s10 * NightSkyBrightness.NANOLAMBERTS_PER_S10
  }

  /**
   * What the sky is worth with no Moon up, in magnitudes per square arcsecond, against how far the
   * Sun is above or below the horizon.
   *
   * Twilight photometry — the shape Patat et al. (2006) measured at Paranal — and not a curve
   * invented here — and the shape is the thing worth reading: the
   * sky loses about one and a third magnitudes for every degree the Sun sinks through nautical
   * twilight, then FLATTENS almost completely over the last few degrees. Between the end of
   * astronomical twilight and true midnight there is a tenth of a magnitude in it. That is why an
   * observer's rule of thumb is a solar depression and not a clock: eighteen degrees down is dark,
   * and nothing you wait for after that is going to help.
   *
   * The floor is 22.0, the natural moonless sky at a good site, and it is the value the rest of this
   * project's night sky is pinned to (see SkyGlowEffect.NIGHT_SKY_MAG_PER_ARCSEC2). It is not empty
   * sky: airglow, the integrated starlight of the Galaxy and the average zodiacal light are all
   * already in it, which is exactly why the two glow maps draw their EXCESS over their own faintest
   * level rather than their whole selves.
   */
  private static readonly TWILIGHT: { sunAltitudeDeg: number; magPerArcsec2: number }[] = [
    { sunAltitudeDeg: 90, magPerArcsec2: 3.5 },
    { sunAltitudeDeg: 10, magPerArcsec2: 4.2 },
    { sunAltitudeDeg: 0, magPerArcsec2: 7.5 },
    { sunAltitudeDeg: -4, magPerArcsec2: 13 },
    { sunAltitudeDeg: -6, magPerArcsec2: 15.6 },
    { sunAltitudeDeg: -8, magPerArcsec2: 17.2 },
    { sunAltitudeDeg: -10, magPerArcsec2: 18.5 },
    { sunAltitudeDeg: -12, magPerArcsec2: 19.7 },
    { sunAltitudeDeg: -14, magPerArcsec2: 20.8 },
    { sunAltitudeDeg: -16, magPerArcsec2: 21.6 },
    { sunAltitudeDeg: -18, magPerArcsec2: 21.9 },
    // The floor, reached a few degrees past the textbook end of astronomical twilight rather than
    // exactly at it, because that is what the photometry shows — and reached FLAT, which matters
    // more than the exact degree: below this the table must return the floor EXACTLY, or the
    // difference between it and the floor is read as a twilight excess and given a twilight's
    // angular shape (see twilightExcessNanolamberts), putting a faint arch in a midnight sky.
    { sunAltitudeDeg: -24, magPerArcsec2: 22 }
  ]

  static moonlessMagPerArcsec2(sunAltitudeDeg: number): number {
    const table = NightSkyBrightness.TWILIGHT
    for (let stop = 0; stop < table.length - 1; stop++) {
      const above = table[stop]
      const below = table[stop + 1]
      if (sunAltitudeDeg <= above.sunAltitudeDeg && sunAltitudeDeg >= below.sunAltitudeDeg) {
        const t = (above.sunAltitudeDeg - sunAltitudeDeg) / (above.sunAltitudeDeg - below.sunAltitudeDeg)
        return above.magPerArcsec2 + (below.magPerArcsec2 - above.magPerArcsec2) * t
      }
    }
    return sunAltitudeDeg > 0 ? table[0].magPerArcsec2 : table[table.length - 1].magPerArcsec2
  }

  /**
   * Nanolamberts, the unit the moonlight model below is written in, and back again.
   *
   * An awkward photometric unit, kept because it is the one Krisciunas and Schaefer wrote in and nothing else in this project uses. Converting the
   * model into some more agreeable unit would mean re-deriving its constants, and a re-derived
   * constant is a constant nobody can check against the paper it came from.
   */
  static toNanolamberts(magPerArcsec2: number): number {
    return 34.08 * Math.exp(NightSkyBrightness.NANOLAMBERT_OFFSET - NightSkyBrightness.PER_MAGNITUDE * magPerArcsec2)
  }

  static fromNanolamberts(nanolamberts: number): number {
    return (
      (NightSkyBrightness.NANOLAMBERT_OFFSET - Math.log(Math.max(nanolamberts, 1e-6) / 34.08)) /
      NightSkyBrightness.PER_MAGNITUDE
    )
  }

  /**
   * The two constants of that conversion, and they are not the same kind of thing.
   *
   * The offset is a measurement — where the paper's photometry pinned the scale. The other is not
   * measured at all: it is what one magnitude is worth in natural logarithms, ln(10)/2.5, and the
   * paper writes it rounded to five figures. Written out here instead, because rounded it disagrees
   * with this project's own magnitudes in the sixth digit, and a round trip through the two would
   * then come back a hundred-thousandth of a magnitude out — invisible, and exactly the kind of
   * thing that makes a test's tolerance a mystery later.
   */
  private static readonly NANOLAMBERT_OFFSET = 20.7233
  private static readonly PER_MAGNITUDE = Math.LN10 / 2.5

  /** Air masses along a line of sight at that altitude — the moonlight model's own approximation,
   * kept rather than swapped for this project's Kasten-Young one so its constants stay the paper's. */
  static airMass(altitudeDeg: number): number {
    const zenithSine = Math.cos((Math.max(altitudeDeg, 0) * Math.PI) / 180)
    return 1 / Math.sqrt(Math.max(1 - 0.96 * zenithSine * zenithSine, 1e-3))
  }

  /** Magnitudes lost per air mass, at the clear-sky value the moonlight model was fitted with. */
  static readonly EXTINCTION_PER_AIR_MASS = 0.172

  /**
   * How much brighter a line of sight is for standing that far round from a source of glow.
   *
   * Krisciunas and Schaefer (1991), "A model of the brightness of moonlight": their scattering
   * function, written for the Moon and used here for the Sun's
   * own twilight as well, because it is the same question asked of the same air: how much of the
   * light arriving from over there gets turned this way. Two terms — a broad one symmetric about
   * the source and the direction opposite it, which is Rayleigh scattering by the air itself, and a
   * narrow one that only reaches a few tens of degrees, which is the aerosol.
   */
  static scatteringAt(separationDeg: number): number {
    const separation = (Math.min(Math.max(separationDeg, 0), 180) * Math.PI) / 180
    return 10 ** 5.36 * (1.06 + Math.cos(separation) ** 2) + 10 ** (6.15 - Math.min(separationDeg, 180) / 40)
  }

  /** What share of the light passing overhead this line of sight has air enough to scatter — a
   * seventh at the zenith and most of it at the horizon, which is half of why a low sky is a bright
   * sky. */
  static scatteredFraction(altitudeDeg: number): number {
    return 1 - 10 ** (-0.4 * NightSkyBrightness.EXTINCTION_PER_AIR_MASS * NightSkyBrightness.airMass(altitudeDeg))
  }

  /**
   * The sky that is left when the Sun is far enough down to have stopped mattering: airglow, the
   * integrated starlight of the Galaxy and the average zodiacal light, all together.
   *
   * The floor of the twilight table, pulled out as its own thing because it behaves nothing like
   * the rest of it. Twilight is sunlight scattered, so it is brightest toward the Sun and faintest
   * away from it; this is the atmosphere and the sky themselves glowing, and it is very nearly the
   * same in every direction. Adding an angular shape to it — which is what happens if the whole
   * moonless sky is treated as one scattered source — puts a twilight arch in the middle of the
   * night.
   */
  static readonly AIRGLOW_MAG_PER_ARCSEC2 = 22

  /**
   * How much of the moonless sky is the Sun's doing, at the zenith, in nanolamberts.
   *
   * Zero once astronomical twilight is over, which is the point: below that the whole sky is the
   * floor above and nothing here has a direction any more.
   */
  static twilightExcessNanolamberts(sunAltitudeDeg: number): number {
    return Math.max(
      0,
      NightSkyBrightness.toNanolamberts(NightSkyBrightness.moonlessMagPerArcsec2(sunAltitudeDeg)) -
        NightSkyBrightness.toNanolamberts(NightSkyBrightness.AIRGLOW_MAG_PER_ARCSEC2)
    )
  }

  /**
   * The strength to give the Sun as a source of scattered glow, so that the zenith comes out at
   * exactly what the twilight photometry measured.
   *
   * THE MEASUREMENT IS OF ONE DIRECTION and the scattering function supplies the others; dividing
   * the first by the second is what turns a table into a sky. It matters more than it looks: a
   * glow low in the west an hour after sunset is standing in the brightest part of the sky there
   * is, and dividing it by the zenith instead — which is what this file did before the twilight was
   * given a shape — overstates what a witness could have seen there several times over.
   */
  static twilightOutput(sunAltitudeDeg: number): number {
    const atZenith = NightSkyBrightness.scatteringAt(90 - sunAltitudeDeg) * NightSkyBrightness.scatteredFraction(90)
    return NightSkyBrightness.twilightExcessNanolamberts(sunAltitudeDeg) / atZenith
  }

  /**
   * The Moon's own share of the sky glow, in nanolamberts, at a given angle from it.
   *
   * Krisciunas and Schaefer (1991) again, and it factors the way the physics does: how much light the
   * Moon is putting out at that phase, how much of it survives the air between the Moon and the
   * observer, how much of it a line of sight scatters toward the eye at that angle, and how much
   * air that line of sight has to scatter in.
   *
   * `phaseAngleDeg` is zero at full Moon and 180 at new. Note how heavily it is weighted: the model
   * loses a magnitude for every forty degrees off full, so a half Moon is not half a full Moon's
   * glow but a fifth of it.
   */
  static moonNanolamberts(phaseAngleDeg: number, moonAltitudeDeg: number, separationDeg: number, altitudeDeg: number): number {
    return (
      NightSkyBrightness.scatteringAt(separationDeg) *
      NightSkyBrightness.moonOutput(phaseAngleDeg, moonAltitudeDeg) *
      NightSkyBrightness.scatteredFraction(altitudeDeg)
    )
  }

  /** Everything about the Moon that does not depend on which way the witness is looking: what it
   * puts out at that phase, less what the air between it and them takes away. A Moon that has set
   * puts out nothing — there is no glow from below the horizon. */
  static moonOutput(phaseAngleDeg: number, moonAltitudeDeg: number): number {
    if (moonAltitudeDeg <= 0) return 0
    const phase = Math.min(Math.abs(phaseAngleDeg), 180)
    return (
      10 ** (-0.4 * (3.84 + 0.026 * phase + 4e-9 * phase ** 4)) *
      10 ** (-0.4 * NightSkyBrightness.EXTINCTION_PER_AIR_MASS * NightSkyBrightness.airMass(moonAltitudeDeg))
    )
  }

  /** The phase angle a lit fraction implies — zero when the disc is full. */
  static phaseAngleOf(illuminatedFraction: number): number {
    return (Math.acos(Math.min(Math.max(2 * illuminatedFraction - 1, -1), 1)) * 180) / Math.PI
  }

  /**
   * Everything at once: what the sky is worth at one place in it, in magnitudes per square
   * arcsecond, with the Sun where it is and the Moon where it is.
   *
   * Three terms, added as LIGHT and not as magnitudes — which is the whole reason this needs a
   * function, since the magnitude of a sum is not any kind of average of the magnitudes. The floor
   * that is there whatever happens, the Sun's twilight scattered from wherever it has got to, and
   * the Moon's glow scattered the same way.
   */
  static magPerArcsec2(
    sun: { altitudeDeg: number; separationDeg: number },
    moon: { phaseAngleDeg: number; altitudeDeg: number; separationDeg: number },
    altitudeDeg: number
  ): number {
    const scattered = NightSkyBrightness.scatteredFraction(altitudeDeg)
    const twilight =
      NightSkyBrightness.scatteringAt(sun.separationDeg) * NightSkyBrightness.twilightOutput(sun.altitudeDeg) * scattered
    const lunar =
      NightSkyBrightness.scatteringAt(moon.separationDeg) *
      NightSkyBrightness.moonOutput(moon.phaseAngleDeg, moon.altitudeDeg) *
      scattered
    return NightSkyBrightness.fromNanolamberts(
      NightSkyBrightness.toNanolamberts(NightSkyBrightness.AIRGLOW_MAG_PER_ARCSEC2) + twilight + lunar
    )
  }
}
