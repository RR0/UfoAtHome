/** The air an aircraft flies in, at its own height. */
export interface FlightAir {
  /** hPa. */
  pressureHpa: number
  temperatureC: number
  /** The humidity over liquid water, 0 to 1 and a little beyond: the way reanalyses state it. */
  relativeHumidity: number
}

/** What the air and the engine decide of the trail behind an aircraft. */
export interface ContrailForecast {
  /** Whether the exhaust cools and mixes into air it saturates over water on the way: a trail is seen at all. */
  forms: boolean
  /** Whether the air is supersaturated over ice, so that the trail's ice does not sublimate: it lasts, and spreads. */
  persistent: boolean
  /** The temperature under which an engine of that efficiency can make a trail at that pressure, C. */
  criticalTemperatureC: number
  /** The humidity over water the air needs for a trail at its temperature: above 1 where none can form. */
  requiredHumidity: number
  /** The humidity over ice of the air, 1 at saturation. */
  iceRelativeHumidity: number
}

/**
 * Whether an aircraft leaves a trail, and whether it lasts: the Schmidt-Appleman criterion, and the supersaturation of the air over ice.
 *
 * A trail is not smoke. The exhaust of a jet engine is hot and carries water; it cools as it mixes with the air around it, along a line
 * in the plane of temperature and vapour pressure whose slope depends on the engine (what fraction of the fuel's heat is turned into
 * thrust) and the pressure. If that line crosses the saturation curve over water, droplets form and freeze: a trail. It does not if
 * the air is warm (the line stays below the curve) and does, even in dry air, below the temperature at which the line cannot avoid it.
 * What happens next is another question: the ice survives only in air that is saturated over ice, and the air of the cruise levels
 * often is (and so a trail grows into a sheet of cirrus) and often is not (and the trail is a few hundred metres of white, gone in
 * a minute).
 *
 * The criterion is Schumann (1996) after Schmidt (1941) and Appleman (1953), with the saturation pressures of Murphy and Koop (2005).
 * It states a physical possibility, not a sighting: an engine that is not the one assumed, a thrust that is not the cruise's, the
 * air between the reanalysis's grid points, all move the threshold by a few degrees.
 */
export class ContrailPhysics {
  /** Kilograms of water in the exhaust per kilogram of kerosene burned. */
  static readonly EMISSION_INDEX_WATER = 1.25
  /** The heat of combustion of kerosene, J/kg. */
  static readonly COMBUSTION_HEAT = 43.2e6
  /** The specific heat of air at constant pressure, J/(kg K). */
  static readonly AIR_HEAT_CAPACITY = 1004
  /** The ratio of the molar masses of water and of air. */
  static readonly MOLAR_MASS_RATIO = 0.622

  private static readonly FT_TO_M = 0.3048
  private static readonly TROPOPAUSE_M = 11000
  private static readonly TROPOPAUSE_HPA = 226.32
  private static readonly ISOTHERMAL_SCALE_HEIGHT_M = 6341.62

  /** The pressure at a barometric altitude, hPa: that altitude IS a pressure, read on the standard atmosphere. */
  static pressureAtAltitudeFt(altitudeFt: number): number {
    const m = altitudeFt * ContrailPhysics.FT_TO_M
    if (m <= ContrailPhysics.TROPOPAUSE_M) return 1013.25 * (1 - 2.25577e-5 * m) ** 5.25588
    return ContrailPhysics.TROPOPAUSE_HPA * Math.exp(-(m - ContrailPhysics.TROPOPAUSE_M) / ContrailPhysics.ISOTHERMAL_SCALE_HEIGHT_M)
  }

  /** The saturation vapour pressure over liquid water, Pa, after Murphy and Koop (2005). */
  static saturationOverWaterPa(celsius: number): number {
    const T = celsius + 273.15
    return Math.exp(54.842763 - 6763.22 / T - 4.21 * Math.log(T) + 0.000367 * T
      + Math.tanh(0.0415 * (T - 218.8)) * (53.878 - 1331.22 / T - 9.44523 * Math.log(T) + 0.014025 * T))
  }

  /** The saturation vapour pressure over ice, Pa, after Murphy and Koop (2005). */
  static saturationOverIcePa(celsius: number): number {
    const T = celsius + 273.15
    return Math.exp(9.550426 - 5723.265 / T + 3.53068 * Math.log(T) - 0.00728332 * T)
  }

  /** The humidity over ice of air whose humidity over water is `relativeHumidity`. */
  static iceRelativeHumidity(celsius: number, relativeHumidity: number): number {
    return relativeHumidity * ContrailPhysics.saturationOverWaterPa(celsius) / ContrailPhysics.saturationOverIcePa(celsius)
  }

  /** The slope of the line along which the exhaust mixes, Pa/K: how much vapour pressure the engine's exhaust adds per degree it adds. */
  static mixingSlope(pressureHpa: number, efficiency: number): number {
    return ContrailPhysics.EMISSION_INDEX_WATER * ContrailPhysics.AIR_HEAT_CAPACITY * pressureHpa * 100
      / (ContrailPhysics.MOLAR_MASS_RATIO * ContrailPhysics.COMBUSTION_HEAT * (1 - efficiency))
  }

  /** The warmest air a trail can form in, whatever its humidity, C: the mixing line tangent to the saturation curve over water. */
  static criticalTemperatureC(pressureHpa: number, efficiency: number): number {
    const x = Math.log(ContrailPhysics.mixingSlope(pressureHpa, efficiency) - 0.053)
    return -46.46 + 9.43 * x + 0.72 * x * x
  }

  /**
   * The humidity over water the air needs for a trail, at that temperature: the one at which the mixing line, from that air to
   * the tangent point, just touches the curve. 1 at the critical temperature, less below it, nothing (zero or negative: any air will
   * do) some nine degrees under it. Only meaningful under the critical temperature: over it the tangent line passes under the curve
   * and no humidity makes a trail, which `evaluate` states by the temperature before it looks at this.
   */
  static requiredHumidity(pressureHpa: number, efficiency: number, celsius: number): number {
    const critical = ContrailPhysics.criticalTemperatureC(pressureHpa, efficiency)
    const slope = ContrailPhysics.mixingSlope(pressureHpa, efficiency)
    return (slope * (celsius - critical) + ContrailPhysics.saturationOverWaterPa(critical)) / ContrailPhysics.saturationOverWaterPa(celsius)
  }

  /** What `air` and an engine of that overall `efficiency` (the share of the fuel's heat that becomes thrust) make of the trail. */
  static evaluate(air: FlightAir, efficiency: number): ContrailForecast {
    const criticalTemperatureC = ContrailPhysics.criticalTemperatureC(air.pressureHpa, efficiency)
    const requiredHumidity = ContrailPhysics.requiredHumidity(air.pressureHpa, efficiency, air.temperatureC)
    const iceRelativeHumidity = ContrailPhysics.iceRelativeHumidity(air.temperatureC, air.relativeHumidity)
    const forms = air.temperatureC < criticalTemperatureC && air.relativeHumidity >= requiredHumidity
    return { forms, persistent: forms && iceRelativeHumidity >= 1, criticalTemperatureC, requiredHumidity, iceRelativeHumidity }
  }
}
