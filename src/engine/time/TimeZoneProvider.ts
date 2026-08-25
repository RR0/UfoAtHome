/**
 * Which legal time zone governs a place — the IANA identifier, never an offset.
 *
 * The distinction is the whole point. An offset is what a zone happened to be doing at one instant;
 * the zone is the rule, and only the rule can say what the clocks read in 1965. Open-Meteo will
 * hand back both, and its offset is TODAY's: Valensole comes back at +2 because that is where
 * France stands this week, when the sighting itself happened at +1. So a provider returns the
 * identifier and nothing else, and TimeZones.offsetHoursAt works out the rest from the observation's
 * own date.
 */
export interface TimeZoneProvider {
  /** The IANA zone covering these coordinates, or undefined when the service cannot say. Never
   * throws for an ordinary "no answer": a place with no known zone is a normal outcome. */
  zoneAt(lat: number, lng: number): Promise<string | undefined>
}
