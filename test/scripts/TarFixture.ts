/** Builds tar archives the way GNU tar writes them, for the tests of what reads them. */
export class TarFixture {
  private readonly blocks: Buffer[] = []

  /** A regular file; `prefix` is ustar's, `longName` makes a GNU long-name entry before it. */
  file(name: string, content: Buffer | string, options: { prefix?: string; longName?: boolean } = {}): this {
    const data = Buffer.isBuffer(content) ? content : Buffer.from(content)
    if (options.longName) {
      const long = Buffer.from(name + "\0")
      this.blocks.push(this.header("././@LongLink", long.length, "L"), this.padded(long))
      this.blocks.push(this.header(name.slice(0, 99), data.length, "0"), this.padded(data))
    } else {
      this.blocks.push(this.header(name, data.length, "0", options.prefix), this.padded(data))
    }
    return this
  }

  directory(name: string): this {
    this.blocks.push(this.header(name, 0, "5"))
    return this
  }

  /** The archive, ended by the two empty blocks, optionally cut into parts of the given sizes. */
  build(): Buffer {
    return Buffer.concat([...this.blocks, Buffer.alloc(1024)])
  }

  static split(archive: Buffer, size: number): Buffer[] {
    const parts: Buffer[] = []
    for (let at = 0; at < archive.length; at += size) parts.push(archive.subarray(at, at + size))
    return parts
  }

  private header(name: string, size: number, type: string, prefix = ""): Buffer {
    const header = Buffer.alloc(512)
    header.write(name, 0, 100)
    header.write("0000644\0", 100)
    header.write(size.toString(8).padStart(11, "0") + "\0", 124)
    header.write("        ", 148)
    header.write(type, 156)
    header.write("ustar\0" + "00", 257)
    header.write(prefix, 345, 155)
    const sum = header.reduce((total, byte) => total + byte, 0)
    header.write(sum.toString(8).padStart(6, "0") + "\0 ", 148)
    return header
  }

  private padded(data: Buffer): Buffer {
    return Buffer.concat([data, Buffer.alloc((512 - (data.length % 512)) % 512)])
  }
}
