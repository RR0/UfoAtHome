/**
 * The pixels of a GeoTIFF, read by hand: the one layout a WMS answers with when asked for `image/geotiff`
 * (little-endian, uncompressed, in strips), which is all the canopy survey needs and not worth a library
 * of a hundred kilobytes in a browser that reads it once.
 *
 * Anything else (tiles, compression, big-endian) is refused loudly rather than read wrongly: a raster
 * read as the wrong layout is a canopy of noise, which looks like an answer.
 */
export class GeoTiffRaster {
  private constructor(
    readonly width: number,
    readonly height: number,
    /** How many values make a pixel (1 for a height, 4 for a picture with its transparency). */
    readonly samples: number,
    /** The values, pixel after pixel, `samples` of each, row after row from the north. */
    readonly values: Float32Array | Uint8Array
  ) {}

  /** The value of one sample of the pixel at column `x`, row `y`. */
  at(x: number, y: number, sample = 0): number {
    return this.values[(y * this.width + x) * this.samples + sample]
  }

  static parse(buffer: ArrayBuffer): GeoTiffRaster {
    const view = new DataView(buffer)
    if (buffer.byteLength < 8 || view.getUint16(0) !== 0x4949 || view.getUint16(2, true) !== 42) {
      throw new Error("Not a little-endian TIFF")
    }
    const ifd = view.getUint32(4, true)
    const count = view.getUint16(ifd, true)
    const tags = new Map<number, { type: number, count: number, value: number }>()
    for (let i = 0; i < count; i++) {
      const at = ifd + 2 + i * 12
      tags.set(view.getUint16(at, true), { type: view.getUint16(at + 2, true), count: view.getUint32(at + 4, true), value: view.getUint32(at + 8, true) })
    }
    const scalar = (tag: number, fallback?: number): number => {
      const entry = tags.get(tag)
      if (entry === undefined) {
        if (fallback === undefined) throw new Error(`TIFF without tag ${tag}`)
        return fallback
      }
      return entry.type === 3 ? entry.value & 0xffff : entry.value
    }
    const list = (tag: number): number[] => {
      const entry = tags.get(tag)
      if (entry === undefined) throw new Error(`TIFF without tag ${tag}`)
      const size = entry.type === 3 ? 2 : 4
      const result: number[] = []
      if (entry.count * size <= 4) {
        const inline = new DataView(new ArrayBuffer(4))
        inline.setUint32(0, entry.value, true)
        for (let i = 0; i < entry.count; i++) result.push(size === 2 ? inline.getUint16(i * 2, true) : inline.getUint32(0, true))
      } else {
        for (let i = 0; i < entry.count; i++) result.push(size === 2 ? view.getUint16(entry.value + i * 2, true) : view.getUint32(entry.value + i * 4, true))
      }
      return result
    }
    if (scalar(259, 1) !== 1) throw new Error("Compressed TIFF")
    if (tags.has(322)) throw new Error("Tiled TIFF")
    const width = scalar(256)
    const height = scalar(257)
    const samples = scalar(277, 1)
    const bits = list(258)[0]
    const floating = scalar(339, 1) === 3
    if (!((floating && bits === 32) || (!floating && bits === 8))) throw new Error(`Unsupported TIFF samples: ${bits} bits`)
    const offsets = list(273)
    const counts = list(279)
    const bytes = new Uint8Array(width * height * samples * (bits / 8))
    let filled = 0
    for (let i = 0; i < offsets.length && filled < bytes.length; i++) {
      const length = Math.min(counts[i], bytes.length - filled)
      bytes.set(new Uint8Array(buffer, offsets[i], length), filled)
      filled += length
    }
    if (filled < bytes.length) throw new Error("Truncated TIFF")
    return new GeoTiffRaster(width, height, samples, floating ? new Float32Array(bytes.buffer) : bytes)
  }
}
