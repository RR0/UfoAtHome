import { describe, expect, test } from "vitest"
import { AircraftTile } from "../../src/engine/traffic/providers/AircraftTile.js"
import { AircraftTileWriter } from "../../scripts/AircraftTileWriter.js"

describe("AircraftTile", () => {
  test("a position is read back as it was written, to the precision of the format", () => {
    const writer = new AircraftTileWriter()
    writer.append(0x44046d, 2796, Math.round(48.86682 * 1e5), Math.round(2.9877 * 1e5), 1400, 4478, 2184)
    const [position] = AircraftTile.decode(writer.bytes())
    expect(position).toEqual({
      icao: 0x44046d, nonIcao: false, secondsInHour: 279.6, lat: 48.86682, lng: 2.9877,
      altitudeFt: 35000, groundSpeedKt: 447.8, trackDeg: 218.4
    })
  })

  test("southern and western positions, and altitudes under the sea, keep their sign", () => {
    const writer = new AircraftTileWriter()
    writer.append(1, 0, Math.round(-33.8688 * 1e5), Math.round(-70.6693 * 1e5), -12, 100, 0)
    const [position] = AircraftTile.decode(writer.bytes())
    expect(position.lat).toBe(-33.8688)
    expect(position.lng).toBe(-70.6693)
    expect(position.altitudeFt).toBe(-300)
  })

  test("a non-ICAO address is flagged and keeps its 24 bits", () => {
    const writer = new AircraftTileWriter()
    writer.append((0x123abc | AircraftTile.NON_ICAO_FLAG) >>> 0, 0, 0, 0, 0, 0, 0)
    const [position] = AircraftTile.decode(writer.bytes())
    expect(position.icao).toBe(0x123abc)
    expect(position.nonIcao).toBe(true)
  })

  test("an unknown speed or track is undefined, not zero", () => {
    const writer = new AircraftTileWriter()
    writer.append(1, AircraftTile.MAX_DT, 0, 0, 0, AircraftTile.UNKNOWN, AircraftTile.UNKNOWN)
    const [position] = AircraftTile.decode(writer.bytes())
    expect(position.groundSpeedKt).toBeUndefined()
    expect(position.trackDeg).toBeUndefined()
    expect(position.secondsInHour).toBe(3599.9)
  })

  test("a tile grows past its first allocation and keeps every record in order", () => {
    const writer = new AircraftTileWriter()
    for (let i = 0; i < 1000; i++) writer.append(i, i % 36000, i, -i, i % 100, i, i % 3600)
    expect(writer.count).toBe(1000)
    const positions = AircraftTile.decode(writer.bytes())
    expect(positions).toHaveLength(1000)
    expect(positions.map(position => position.icao)).toEqual(Array.from({ length: 1000 }, (_, i) => i))
    expect(positions[999].lng).toBe(-999 / 1e5)
  })

  test("a tile that is not a whole number of records is refused", () => {
    expect(() => AircraftTile.decode(new Uint8Array(21))).toThrow(/multiple of 20/)
  })
})
