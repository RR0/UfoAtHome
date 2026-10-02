import type { AircraftKind } from "./AircraftModels.js"

/**
 * How much of the fuel's heat an engine turns into thrust, which decides how warm the air can be for its exhaust to leave a trail
 * (see ContrailPhysics): the more efficient, the less heat is left in the exhaust and the warmer the air can be.
 *
 * By kind of machine, and a DATUM table: typical values of the overall efficiency in cruise of the engines each kind flies with
 * (Schumann 2000, Sausen et al.). More types are more rows when the record states them, never more code.
 */
export class ContrailEngines {
  private static readonly EFFICIENCY: Partial<Record<AircraftKind, number>> = {
    "airliner-narrow": 0.34,
    "airliner-wide": 0.38,
    "regional-jet": 0.32,
    "business-jet": 0.30,
    "military-jet": 0.22,
    // What the record does not say is drawn as an airliner (see AircraftModels.of).
    unknown: 0.34
  }

  /** The overall propulsion efficiency, 0 to 1, or undefined for what leaves no trail worth modelling: it has no jet engine, or flies too low and too warm. */
  static efficiencyOf(kind: AircraftKind): number | undefined {
    return ContrailEngines.EFFICIENCY[kind]
  }
}
