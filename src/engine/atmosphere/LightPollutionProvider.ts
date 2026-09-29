/**
 * What a record of artificial sky brightness answered for one place.
 *
 * Four answers and not two, for the reason every lookup in this project keeps them apart: "the
 * record says the sky here is natural", "the record does not cover this place" and "the record
 * could not be read" are different sentences, and only the first may leave a recording saying
 * nothing about its sky as though that were a finding.
 */
export type LightPollutionLookup =
  /** The zenith of a moonless night there, towns and all, mag/arcsec² — what Sighting.lightPollution
   * states — with the artificial share it was worked out from, and the cell it was read at. */
  | { status: "found"; lightPollution: number; artificialMcdPerM2: number; lat: number; lng: number }
  /** The record covers the place and has no artificial light there worth a hundredth of the sky. */
  | { status: "natural" }
  /** The place is outside what the record covers (the atlas stops at 85°N and 60°S). */
  | { status: "outside" }
  /** The record could not be read — offline, a server error. Nothing is known. */
  | { status: "failed" }

/**
 * Source of a place's artificial night sky brightness — the same "one interface, interchangeable
 * implementations" seam as the weather and the terrain (see WeatherProvider): how a record is
 * fetched and decoded lives in providers/, and the editor only ever names this.
 */
export interface LightPollutionProvider {
  /** What the figures describe the sky of: a single year for an atlas. A sighting before it had a
   * darker sky than the record, and is not given the record's (see SightingEditorElement). */
  readonly year: number
  /** The citation the record's licence requires, for the rationale written beside the value. */
  readonly citation: string
  lookUp(lat: number, lng: number): Promise<LightPollutionLookup>
}
