import { LunarRelief } from "./LunarLimb.js"

/**
 * Fetches the Moon's limb relief (see LunarRelief) once per URL, and says nothing but "absent" when it
 * cannot: an eclipse without it is drawn with a circular Moon, which is nearly right, and a missing
 * asset is not a reason for a scene to fail. Only ever asked for when an eclipse is within a few seconds of
 * totality, which is a few minutes in a lifetime of recordings.
 */
export class LunarReliefLoader {
  private static readonly cache = new Map<string, Promise<LunarRelief | undefined>>()

  static load(url: string): Promise<LunarRelief | undefined> {
    let cached = LunarReliefLoader.cache.get(url)
    if (!cached) {
      cached = LunarReliefLoader.fetchRelief(url).catch(() => undefined)
      LunarReliefLoader.cache.set(url, cached)
    }
    return cached
  }

  private static async fetchRelief(url: string): Promise<LunarRelief | undefined> {
    const response = await fetch(url)
    if (!response.ok) return undefined
    let bytes = new Uint8Array(await response.arrayBuffer())
    // Gzipped on disk, and left so by a host that does not know to say so: a server that does has
    // already undone it, and what arrives is the grid itself.
    if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
      if (typeof DecompressionStream === "undefined") return undefined
      const unpacked = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"))
      bytes = new Uint8Array(await new Response(unpacked).arrayBuffer())
    }
    return new LunarRelief(new Int8Array(bytes.buffer, bytes.byteOffset, bytes.length))
  }
}
