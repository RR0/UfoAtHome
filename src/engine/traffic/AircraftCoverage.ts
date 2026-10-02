/**
 * What the archive of air traffic cannot hold, known without loading it: nearly every recording here is older than any record of air
 * traffic, and the code that reads one must not be fetched, nor a request made, to be told so.
 */
export class AircraftCoverage {
  /** The first day of ADSB.lol's open history, which begins in 2022 at the earliest. */
  static readonly FIRST_DAY = "2022-01-01"

  static mayCover(ms: number): boolean {
    return new Date(ms).toISOString().slice(0, 10) >= AircraftCoverage.FIRST_DAY
  }
}
