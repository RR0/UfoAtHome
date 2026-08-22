/** One candidate for a searched place name. */
export interface PlaceMatch {
  /** Fully qualified and unambiguous — "Valensole, Forcalquier, Alpes-de-Haute-Provence, …,
   * France", not just "Valensole". It is what gets stored as the sighting's place name, and what
   * a reader (or a second search years later) needs in order to land on the same spot: half the
   * interesting cases happen near a village that shares its name with four others. */
  name: string
  lat: number
  lng: number
}

export interface PlaceSearchOptions {
  /** How many candidates to return at most — a name is often ambiguous, and the witness is the
   * one who knows which Springfield it was. */
  limit?: number
  /** BCP-47 tag the results should be named in, when the source can (e.g. "fr" for "Londres"). */
  language?: string
  signal?: AbortSignal
}

/** What a UI must credit the results to — every open geocoder requires it, and the recorder shows
 * it next to the matches rather than burying it in a licence file. */
export interface PlaceAttribution {
  text: string
  url: string
}

/**
 * Turns a place NAME into coordinates — the missing half of the Location group, which until now
 * could only be filled by someone who already had a latitude and a longitude to hand. Testimony
 * never comes that way: it says "on the Valensole plateau", "near Socorro", "over Montgomery".
 *
 * Same "one interface, interchangeable implementations" arrangement as ElevationProvider and
 * WeatherProvider (see providers/ and defaultPlaceProvider): the recorder never names a concrete
 * geocoder, so swapping to a keyed or national one later touches one function.
 *
 * Returns an empty array when nothing matched — a normal answer, not an error. A network or HTTP
 * failure throws, so the UI can tell "no such place" from "we couldn't ask".
 */
export interface PlaceProvider {
  readonly attribution: PlaceAttribution

  search(query: string, options?: PlaceSearchOptions): Promise<PlaceMatch[]>

  /**
   * The place AT those coordinates — the same relation read the other way, so a name and a pair of
   * coordinates can never drift apart. Editing a latitude by hand leaves whatever name was shown
   * describing somewhere else entirely, which is worse than showing no name at all: the recording
   * would then state, in writing, that a sighting happened somewhere it did not.
   *
   * undefined when the source knows of no place there (mid-ocean, Antarctica) — a real answer, and
   * one the caller shows as such rather than leaving the old name standing.
   */
  reverse(lat: number, lng: number, options?: PlaceSearchOptions): Promise<PlaceMatch | undefined>
}
