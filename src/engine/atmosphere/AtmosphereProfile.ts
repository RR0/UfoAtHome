/**
 * What the air above a observer is made of, wavelength by wavelength — the medium a sky is scattered
 * in, and nothing about any particular sky.
 *
 * Three constituents, because three are enough to give a clear sky every colour it has:
 *
 * - AIR ITSELF, which scatters as the inverse fourth power of the wavelength and is why the sky is
 *   blue. Its strength is not chosen: it follows from the refractive index of air, which is
 *   measured to many figures, and is taken here from Bodhaine et al. (1999).
 * - AEROSOL, the haze that whitens a horizon and puts a bright aureole round the Sun. The one
 *   constituent that really changes from day to day, so it is a parameter: an optical depth at
 *   550 nm, the number a sun photometer reports.
 * - OZONE, which scatters nothing and absorbs a little orange. Negligible at noon, and the whole
 *   reason a twilight zenith is deep blue rather than a greyish yellow: with the Sun down, the light
 *   reaching the zenith has come a long way sideways through the ozone layer, and the Chappuis band
 *   takes out exactly the colours Rayleigh scattering had left over (Hulburt, 1953). A model without
 *   it gets every sunset wrong in a way no colour table can fix.
 *
 * The Earth is a sphere here, not a plane, and that is not a refinement: once the Sun is down every
 * bit of light in the sky reaches it round the curve of the planet, and the Earth's shadow rising in
 * the east is that curve made visible.
 */
export interface AtmosphereConditions {
  /** Aerosol optical depth at 550 nm, straight up from sea level. */
  readonly aerosolOpticalDepth?: number
  /** Total ozone column, in Dobson units. */
  readonly ozoneDobson?: number
}

export class AtmosphereProfile {
  static readonly GROUND_RADIUS_M = 6360e3
  /** A hundred kilometres up: above it there is too little air to scatter anything an eye could see,
   * even from the deepest twilight. */
  static readonly TOP_RADIUS_M = 6460e3

  /**
   * The wavelengths the sky is traced at: fifteen, twenty nanometres apart across what an eye sees.
   *
   * Fifteen and not three, because a sky is the product of spectra that are nowhere near straight
   * lines — the Sun's, air's λ⁻⁴, and ozone's hump in the orange — and a product of curves sampled at
   * three points is not the curve of their product. It is also what makes a twilight zenith blue:
   * the colour is what is LEFT once ozone has taken its band out, and a red/green/blue triple cannot
   * say which part of green went.
   */
  static readonly WAVELENGTHS_NM: readonly number[] = Array.from({ length: 15 }, (_, index) => 410 + 20 * index)
  static readonly WAVELENGTH_STEP_NM = 20

  /**
   * Sunlight above the atmosphere, in W·m⁻²·nm⁻¹, at those wavelengths.
   *
   * Twenty-nanometre averages of the standard extraterrestrial spectrum, ASTM E 490-00a (reapproved
   * 2006), table 3, integrated over each band from the table's own points. The Fraunhofer lines are
   * averaged away, which is right for a sky and wrong for a spectrograph. The first version of this
   * table was written from memory and was within 3.2 % of these everywhere; the one number they add
   * up to — the Sun's illuminance above the atmosphere, 128 to 133 thousand lux — is checked by a
   * test without ever being written here.
   */
  static readonly SOLAR_IRRADIANCE: readonly number[] = [
    1.707, 1.676, 1.982, 2.02, 1.941, 1.87, 1.879, 1.856, 1.839, 1.799, 1.728, 1.668, 1.57, 1.532, 1.452
  ]

  /**
   * Ozone's absorption cross-section at those wavelengths, in units of 10⁻²¹ cm² per molecule.
   *
   * The Chappuis band, a broad hump that peaks near 600 nm and has all but gone by 420: twenty-
   * nanometre averages of the Serdyuchenko-Gorshelev cross-sections (Gorshelev et al. 2014,
   * Serdyuchenko et al. 2014; Zenodo 5793207), at 223 K, the temperature of the stratosphere where
   * the ozone is — the band barely depends on it, 3 % at most across 193 to 293 K. The first version
   * of this table was written from memory and was up to 30 % too strong between 460 and 500 nm and
   * 15 % too strong at 630: exactly the blue-green and orange a twilight zenith is made of.
   */
  static readonly OZONE_CROSS_SECTION: readonly number[] = [
    0.021, 0.069, 0.19, 0.418, 0.827, 1.531, 2.439, 3.291, 4.468, 4.55, 4.663, 3.477, 2.447, 1.658, 1.071
  ]

  /** How fast air thins with height: an e-fold every eight kilometres. */
  static readonly RAYLEIGH_SCALE_HEIGHT_M = 8000
  /** Haze lives in the lowest kilometre or two, which is why it whitens the horizon and not the zenith. */
  static readonly AEROSOL_SCALE_HEIGHT_M = 1200
  /** The ozone layer, as a tent peaking at 25 km and gone 15 km either side of it. */
  static readonly OZONE_PEAK_ALTITUDE_M = 25000
  static readonly OZONE_HALF_WIDTH_M = 15000

  /** A clear continental day. */
  static readonly DEFAULT_AEROSOL_OPTICAL_DEPTH = 0.1
  /** The global average column. */
  static readonly DEFAULT_OZONE_DOBSON = 300
  /** How much of what a haze particle intercepts it scatters rather than absorbs. */
  static readonly AEROSOL_SINGLE_SCATTERING_ALBEDO = 0.9
  /** How steeply haze scattering falls with wavelength — far flatter than air's four, which is why
   * haze is white. A typical continental value. */
  static readonly AEROSOL_ANGSTROM_EXPONENT = 1.3
  /** The asymmetry of the haze phase function: strongly forward, hence the aureole. */
  static readonly AEROSOL_ASYMMETRY = 0.8

  /** Sea-level scattering coefficients per wavelength, per metre. */
  readonly rayleighScattering: Float64Array
  readonly aerosolScattering: Float64Array
  readonly aerosolExtinction: Float64Array
  /** Ozone absorption per metre, at the peak of the layer. */
  readonly ozoneAbsorption: Float64Array

  constructor(conditions: AtmosphereConditions = {}) {
    const count = AtmosphereProfile.WAVELENGTHS_NM.length
    const opticalDepth = conditions.aerosolOpticalDepth ?? AtmosphereProfile.DEFAULT_AEROSOL_OPTICAL_DEPTH
    const dobson = conditions.ozoneDobson ?? AtmosphereProfile.DEFAULT_OZONE_DOBSON
    this.rayleighScattering = new Float64Array(count)
    this.aerosolScattering = new Float64Array(count)
    this.aerosolExtinction = new Float64Array(count)
    this.ozoneAbsorption = new Float64Array(count)
    // One Dobson unit is 2.687e16 molecules per cm² of column, i.e. 2.687e20 per m². Spread over a
    // tent whose area is its half-width times its peak, that fixes the peak density.
    const ozonePeakPerM3 = (dobson * 2.687e20) / AtmosphereProfile.OZONE_HALF_WIDTH_M
    for (let index = 0; index < count; index++) {
      const wavelengthNm = AtmosphereProfile.WAVELENGTHS_NM[index]
      this.rayleighScattering[index] = AtmosphereProfile.rayleighAt(wavelengthNm)
      const extinction =
        (opticalDepth / AtmosphereProfile.AEROSOL_SCALE_HEIGHT_M) *
        (wavelengthNm / 550) ** -AtmosphereProfile.AEROSOL_ANGSTROM_EXPONENT
      this.aerosolExtinction[index] = extinction
      this.aerosolScattering[index] = extinction * AtmosphereProfile.AEROSOL_SINGLE_SCATTERING_ALBEDO
      this.ozoneAbsorption[index] = AtmosphereProfile.OZONE_CROSS_SECTION[index] * 1e-25 * ozonePeakPerM3
    }
  }

  /**
   * Rayleigh scattering by sea-level air at 288.15 K, per metre.
   *
   * Bodhaine et al. (1999), equation 29: the cross-section per molecule, with the King factor for
   * the anisotropy of N₂ and O₂ already folded in, times the number of molecules in a cubic metre.
   */
  static rayleighAt(wavelengthNm: number): number {
    const micrometres = wavelengthNm / 1000
    const inverseSquare = 1 / (micrometres * micrometres)
    const square = micrometres * micrometres
    const crossSectionCm2 =
      ((1.0455996 - 341.29061 * inverseSquare - 0.9023085 * square) /
        (1 + 0.0027059889 * inverseSquare - 85.968563 * square)) *
      1e-28
    return crossSectionCm2 * 1e-4 * 2.546899e25
  }

  static rayleighDensity(altitudeM: number): number {
    return Math.exp(-Math.max(altitudeM, 0) / AtmosphereProfile.RAYLEIGH_SCALE_HEIGHT_M)
  }

  static aerosolDensity(altitudeM: number): number {
    return Math.exp(-Math.max(altitudeM, 0) / AtmosphereProfile.AEROSOL_SCALE_HEIGHT_M)
  }

  static ozoneDensity(altitudeM: number): number {
    return Math.max(
      0,
      1 - Math.abs(altitudeM - AtmosphereProfile.OZONE_PEAK_ALTITUDE_M) / AtmosphereProfile.OZONE_HALF_WIDTH_M
    )
  }

  /** Air's phase function: as much light forward as back, least at right angles. */
  static rayleighPhase(cosAngle: number): number {
    return (3 / (16 * Math.PI)) * (1 + cosAngle * cosAngle)
  }

  /**
   * The haze phase function — Cornette and Shanks (1992), a Henyey-Greenstein lobe corrected so it
   * tends to Rayleigh's shape as the asymmetry goes to zero.
   */
  static aerosolPhase(cosAngle: number, asymmetry = AtmosphereProfile.AEROSOL_ASYMMETRY): number {
    const g2 = asymmetry * asymmetry
    const k = 3 / (8 * Math.PI)
    return (
      (k * (1 - g2) * (1 + cosAngle * cosAngle)) /
      ((2 + g2) * Math.pow(Math.max(1 + g2 - 2 * asymmetry * cosAngle, 1e-6), 1.5))
    )
  }
}
