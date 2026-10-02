/** A few tiles of a packed hour of the aircraft archive, with the offsets that find them in their own, smaller, pack. */
export interface AircraftSliceResult {
  bytes: Buffer
  offsets: Record<string, [number, number]>
}

/**
 * Cuts some tiles out of a pack (see AircraftArchiveBuild): each is one gzip member, so it is copied as it is and only its offset changes.
 * What a demonstration needs of an archive that is hundreds of gigabytes: the tiles round one place, for one hour.
 */
export class AircraftSlice {
  static of(bytes: Buffer, offsets: Record<string, [number, number]>, keys: readonly string[]): AircraftSliceResult {
    const kept: Record<string, [number, number]> = {}
    const parts: Buffer[] = []
    let at = 0
    for (const key of keys) {
      const found = offsets[key]
      if (!found || kept[key]) continue
      const [offset, length] = found
      parts.push(bytes.subarray(offset, offset + length))
      kept[key] = [at, length]
      at += length
    }
    return { bytes: Buffer.concat(parts), offsets: kept }
  }
}
