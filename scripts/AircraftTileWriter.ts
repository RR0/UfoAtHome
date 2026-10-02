import { AircraftTile } from "../src/engine/traffic/providers/AircraftTile.js"

/** Writes the 20-byte records of one tile and hour that AircraftTile.decode reads. */
export class AircraftTileWriter {
  private data = Buffer.allocUnsafe(AircraftTile.RECORD_BYTES * 256)
  private length = 0

  append(icao: number, dt: number, lat: number, lng: number, alt: number, gs: number, track: number): void {
    if (this.length + AircraftTile.RECORD_BYTES > this.data.length) {
      const grown = Buffer.allocUnsafe(this.data.length * 2)
      this.data.copy(grown, 0, 0, this.length)
      this.data = grown
    }
    const at = this.length
    this.data.writeUInt32LE(icao, at)
    this.data.writeUInt16LE(dt, at + 4)
    this.data.writeInt32LE(lat, at + 6)
    this.data.writeInt32LE(lng, at + 10)
    this.data.writeInt16LE(alt, at + 14)
    this.data.writeUInt16LE(gs, at + 16)
    this.data.writeUInt16LE(track, at + 18)
    this.length += AircraftTile.RECORD_BYTES
  }

  get count(): number {
    return this.length / AircraftTile.RECORD_BYTES
  }

  bytes(): Buffer {
    return this.data.subarray(0, this.length)
  }
}
