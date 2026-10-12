/**
 * A TIFF built by hand, in the one layout GeoTiffRaster reads: little-endian, uncompressed, one strip.
 * What a WMS answers with is this shape; building it here keeps the tests off the network.
 */
export class TiffFixture {
  /** A grid of 32-bit heights, row after row from the north. */
  static floats(width: number, height: number, values: number[]): ArrayBuffer {
    return TiffFixture.build(width, height, 1, 32, 3, new Uint8Array(new Float32Array(values).buffer))
  }

  /** A picture of `samples` 8-bit values a pixel (4 for red, green, blue and opacity). */
  static bytes(width: number, height: number, samples: number, values: number[]): ArrayBuffer {
    return TiffFixture.build(width, height, samples, 8, 1, new Uint8Array(values))
  }

  private static build(width: number, height: number, samples: number, bits: number, format: number, data: Uint8Array): ArrayBuffer {
    const entries: [number, number, number, number][] = [
      [256, 4, 1, width], [257, 4, 1, height], [258, 3, 1, bits], [259, 3, 1, 1], [262, 3, 1, samples >= 3 ? 2 : 1],
      [273, 4, 1, 0], [277, 3, 1, samples], [278, 4, 1, height], [279, 4, 1, data.length], [339, 3, 1, format]
    ]
    const ifdAt = 8
    const dataAt = ifdAt + 2 + entries.length * 12 + 4
    const buffer = new ArrayBuffer(dataAt + data.length)
    const view = new DataView(buffer)
    view.setUint16(0, 0x4949)
    view.setUint16(2, 42, true)
    view.setUint32(4, ifdAt, true)
    view.setUint16(ifdAt, entries.length, true)
    entries.forEach(([tag, type, count, value], i) => {
      const at = ifdAt + 2 + i * 12
      view.setUint16(at, tag, true)
      view.setUint16(at + 2, type, true)
      view.setUint32(at + 4, count, true)
      if (type === 3) view.setUint16(at + 8, tag === 273 ? 0 : value, true)
      else view.setUint32(at + 8, tag === 273 ? dataAt : value, true)
    })
    new Uint8Array(buffer, dataAt).set(data)
    return buffer
  }
}
