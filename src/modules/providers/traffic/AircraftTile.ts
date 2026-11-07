/**
 * The aircraft positions of one 1° tile and one hour, as scripts/build-aircraft-archive.ts writes them
 * (see its header for where they come from and how the archive is laid out) and a scene reads them.
 *
 * Gunzipped, a tile is a series of 20-byte little-endian records, sorted by aircraft then time:
 *   u32 icao   the 24-bit address; bit 24 set for a non-ICAO address (the source's "~" ones)
 *   u16 dt     deciseconds since the start of the hour (0 to 35999)
 *   i32 lat    1e-5 degrees
 *   i32 lng    1e-5 degrees
 *   i16 alt    barometric altitude in units of 25 ft
 *   u16 gs     ground speed, 0.1 kt; 0xFFFF when unknown
 *   u16 track  0.1 degree; 0xFFFF when unknown
 */

/** One position of one aircraft, in physical units. */
export interface AircraftPosition {
  /** The 24-bit address. */
  icao: number
  /** True when the address is not an ICAO one (a TIS-B or other pseudo-address). */
  nonIcao: boolean
  /** Seconds since the start of the hour, to a tenth. */
  secondsInHour: number
  lat: number
  lng: number
  /** Barometric altitude, feet (to 25 ft). */
  altitudeFt: number
  groundSpeedKt?: number
  trackDeg?: number
}

export class AircraftTile {
  static readonly RECORD_BYTES = 20
  static readonly NON_ICAO_FLAG = 1 << 24
  static readonly UNKNOWN = 0xffff
  /** The last decisecond of an hour. */
  static readonly MAX_DT = 35999

  static decode(bytes: Uint8Array): AircraftPosition[] {
    if (bytes.length % AircraftTile.RECORD_BYTES !== 0) throw new Error(`An aircraft tile is a multiple of ${AircraftTile.RECORD_BYTES} bytes, not ${bytes.length}`)
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    const positions: AircraftPosition[] = []
    for (let at = 0; at < bytes.length; at += AircraftTile.RECORD_BYTES) {
      const address = view.getUint32(at, true)
      const speed = view.getUint16(at + 16, true)
      const track = view.getUint16(at + 18, true)
      positions.push({
        icao: address & 0xffffff,
        nonIcao: (address & AircraftTile.NON_ICAO_FLAG) !== 0,
        secondsInHour: view.getUint16(at + 4, true) / 10,
        lat: view.getInt32(at + 6, true) / 1e5,
        lng: view.getInt32(at + 10, true) / 1e5,
        altitudeFt: view.getInt16(at + 14, true) * 25,
        groundSpeedKt: speed === AircraftTile.UNKNOWN ? undefined : speed / 10,
        trackDeg: track === AircraftTile.UNKNOWN ? undefined : track / 10
      })
    }
    return positions
  }
}
