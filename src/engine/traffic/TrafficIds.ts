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
}
