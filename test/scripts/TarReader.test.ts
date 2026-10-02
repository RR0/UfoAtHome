import { describe, expect, test } from "vitest"
import { ByteStream, TarReader } from "../../scripts/TarReader.js"
import { TarFixture } from "./TarFixture.js"

class Chunks {
  /** The archive, delivered in chunks of awkward sizes, as a file stream would. */
  static of(archive: Buffer, size: number): AsyncIterator<Buffer> {
    return (async function* () {
      for (let at = 0; at < archive.length; at += size) yield archive.subarray(at, at + size)
    })()
  }
}

class Read {
  static async all(archive: Buffer, chunkSize: number): Promise<{ name: string; content: string }[]> {
    const found: { name: string; content: string }[] = []
    for await (const entry of new TarReader(new ByteStream(Chunks.of(archive, chunkSize))).entries()) {
      found.push({ name: entry.name, content: (await entry.read()).toString() })
    }
    return found
  }
}

describe("TarReader", () => {
  const archive = new TarFixture()
    .directory("./traces/")
    .file("./traces/1c/trace_full_a9e61c.json", "first")
    .file("./empty", "")
    .file("name", "ustar prefix", { prefix: "a/long/prefix" })
    .file("./" + "deep/".repeat(30) + "file.json", "long name", { longName: true })
    .file("./exactly-one-block", "x".repeat(512))
    .build()

  const expected = [
    { name: "./traces/1c/trace_full_a9e61c.json", content: "first" },
    { name: "./empty", content: "" },
    { name: "a/long/prefix/name", content: "ustar prefix" },
    { name: "./" + "deep/".repeat(30) + "file.json", content: "long name" },
    { name: "./exactly-one-block", content: "x".repeat(512) }
  ]

  test.each([1, 7, 511, 512, 513, 100_000])("reads the files, not the directories, with chunks of %i bytes", async size => {
    expect(await Read.all(archive, size)).toEqual(expected)
  })

  test("an entry that is not read is skipped, without losing the next one", async () => {
    const reader = new TarReader(new ByteStream(Chunks.of(archive, 300)))
    const names: string[] = []
    for await (const entry of reader.entries()) {
      names.push(entry.name)
      if (names.length % 2 === 0) await entry.skip()
      if (names.length === 3) expect((await entry.read()).toString()).toBe("ustar prefix")
    }
    expect(names).toEqual(expected.map(entry => entry.name))
  })

  test("an archive cut inside a file is reported, not silently shortened", async () => {
    const cut = new TarFixture().file("big", "y".repeat(2000)).build().subarray(0, 1024)
    await expect(Read.all(cut, 100)).rejects.toThrow(/ends inside big/)
  })

  test("an empty stream holds no entries", async () => {
    expect(await Read.all(Buffer.alloc(0), 100)).toEqual([])
    expect(await Read.all(Buffer.alloc(1024), 100)).toEqual([])
  })
})
