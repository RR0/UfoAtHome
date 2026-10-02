/** A byte stream read in chunks, from which exact lengths can be taken or skipped. */
export class ByteStream {
  private chunks: Buffer[] = []
  private offset = 0
  private available = 0

  constructor(private readonly source: AsyncIterator<Buffer>) {}

  /** The next `length` bytes, or undefined when the stream ends before them. */
  async take(length: number): Promise<Buffer | undefined> {
    if (!await this.fill(length)) return undefined
    const out = Buffer.allocUnsafe(length)
    let written = 0
    while (written < length) {
      const chunk = this.chunks[0]
      const n = Math.min(chunk.length - this.offset, length - written)
      chunk.copy(out, written, this.offset, this.offset + n)
      written += n
      this.consume(n)
    }
    return out
  }

  /** Drops the next `length` bytes without building them; false when the stream ends first. */
  async skip(length: number): Promise<boolean> {
    let left = length
    while (left > 0) {
      if (!await this.fill(1)) return false
      const n = Math.min(this.chunks[0].length - this.offset, left)
      this.consume(n)
      left -= n
    }
    return true
  }

  private consume(n: number): void {
    this.offset += n
    this.available -= n
    if (this.offset === this.chunks[0].length) {
      this.chunks.shift()
      this.offset = 0
    }
  }

  private async fill(length: number): Promise<boolean> {
    while (this.available < length) {
      const { value, done } = await this.source.next()
      if (done) return false
      this.chunks.push(value)
      this.available += value.length
    }
    return true
  }
}

/** One file of a tar stream. */
export interface TarEntry {
  name: string
  size: number
  /** Reads the entry's content; each entry must be either read or skipped before the next. */
  read(): Promise<Buffer>
}

/** A minimal reader of (GNU/ustar) tar streams: regular files and long names, which is what readsb writes. */
export class TarReader {
  private static readonly BLOCK = 512

  constructor(private readonly stream: ByteStream) {}

  async *entries(): AsyncGenerator<TarEntry & { skip(): Promise<void> }> {
    let longName: string | undefined
    for (;;) {
      const header = await this.stream.take(TarReader.BLOCK)
      if (!header || header.every(byte => byte === 0)) return
      const field = (from: number, to: number) => header.toString("utf8", from, to).replace(/\0.*$/s, "")
      const size = parseInt(field(124, 136).trim() || "0", 8)
      const type = String.fromCharCode(header[156] || 0x30)
      const padded = Math.ceil(size / TarReader.BLOCK) * TarReader.BLOCK
      if (type === "L") {
        const data = await this.stream.take(padded)
        if (!data) return
        longName = data.toString("utf8", 0, size).replace(/\0.*$/s, "")
        continue
      }
      if (type !== "0") {
        // A directory, link, pax header...: nothing a caller reads, and its content, if any, is dropped.
        if (!await this.stream.skip(padded)) return
        continue
      }
      const prefix = field(345, 500)
      const name = longName ?? (prefix ? `${prefix}/${field(0, 100)}` : field(0, 100))
      longName = undefined
      let consumed = false
      yield {
        name,
        size,
        read: async () => {
          consumed = true
          const data = await this.stream.take(padded)
          if (!data) throw new Error(`Tar ends inside ${name}`)
          return data.subarray(0, size)
        },
        skip: async () => {
          consumed = true
          await this.stream.skip(padded)
        }
      }
      if (!consumed) await this.stream.skip(padded)
    }
  }
}
