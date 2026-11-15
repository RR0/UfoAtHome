/**
 * What identifies an aircraft drawn from a record of air traffic, in the scene's decor and out of it. Its own module, a few lines
 * long, because the scene needs it whether or not there are any aircraft, and the code that draws them does not (see trafficRuntime).
 */
export class TrafficIds {
  /** What every id of an aircraft drawn from a record begins with, which is how the scene tells them from what a recording states. */
  static readonly ID_PREFIX = "traffic-"

  /** What identifies an aircraft among the rest: its address, and whether that address is its own. */
  static keyOf(track: { icao: number; nonIcao: boolean }): string {
    return `${track.nonIcao ? "x" : ""}${track.icao.toString(16).padStart(6, "0")}`
  }

  /** The id of the decor object for one flight (segment) of an aircraft. */
  static idOf(track: { icao: number; nonIcao: boolean }, segment: number): string {
    return `${TrafficIds.ID_PREFIX}${TrafficIds.keyOf(track)}-${segment}`
  }

  /**
   * What the key of an aircraft the recording itself declares in its decor begins with, so that it is listed beside the flights of a record
   * (see SceneElement.aircraftFlights) without its key ever being taken for an address: an address is hexadecimal, and this is not.
   */
  static readonly DECLARED_PREFIX = "decor:"

  /** The key of an aircraft declared in the decor, from its decor id. */
  static declaredKeyOf(decorId: string): string {
    return `${TrafficIds.DECLARED_PREFIX}${decorId}`
  }

  /** The decor id of a declared aircraft's key; undefined for the key of a flight of a record. */
  static declaredIdOf(key: string): string | undefined {
    return key.startsWith(TrafficIds.DECLARED_PREFIX) ? key.slice(TrafficIds.DECLARED_PREFIX.length) : undefined
  }
}
