import { describe, expect, it } from "vitest"
import { AtlasLightPollutionProvider } from "../../../../src/engine/atmosphere/providers/AtlasLightPollutionProvider.js"

/** A two-degree world with one lit tile, N33W118 (33°N to 35°N), whose cells all say `code`. */
class FakeAtlas {
  static readonly INDEX = {
    version: 1, tileDeg: 2, cells: 4, north: 85, south: -60, floorMcd: 0.00171168, subdivisions: 60
  }

  requests: string[] = []

  constructor(private readonly code: number, private readonly failTiles = false) {
  }

  get fetchImpl(): typeof fetch {
    return (async (url: string) => {
      this.requests.push(url)
      if (url.endsWith("index.json")) {
        const columns = 180
        const band = 25 // 35°N to 33°N: the bands start at 85°N
        const present = new Uint8Array(Math.ceil((columns * 73) / 8))
        const bit = band * columns + (-118 + 180) / 2
        present[bit >> 3] |= 1 << (bit & 7)
        return new Response(JSON.stringify({ ...FakeAtlas.INDEX, present: btoa(String.fromCharCode(...present)) }))
      }
      if (this.failTiles) return new Response(null, { status: 500 })
      if (url.endsWith("N33W118.bin")) // The standard stream, as the provider's own DecompressionStream reads it: node:zlib and Buffer
        // are not in the types this project compiles its tests against.
        return new Response(new Response(new Uint8Array(16).fill(this.code)).body!.pipeThrough(new CompressionStream("deflate-raw")))
      return new Response(null, { status: 404 })
    }) as typeof fetch
  }

  provider(): AtlasLightPollutionProvider {
    return new AtlasLightPollutionProvider({ fetchImpl: this.fetchImpl, indexUrls: ["https://example.org/light-pollution/index.json"] })
  }
}

describe("AtlasLightPollutionProvider", () => {
  it("converts the atlas's artificial brightness the way the atlas does: none is 22.0, Mission Viejo's 3.12 mcd/m² is 18.79", () => {
    expect(AtlasLightPollutionProvider.magPerArcsec2Of(0)).toBeCloseTo(22.0, 2)
    expect(AtlasLightPollutionProvider.magPerArcsec2Of(3.12095)).toBeCloseTo(18.79, 2)
  })

  it("decodes a byte back to within half a code of what was kept", () => {
    const code = 1 + Math.round(60 * Math.log10(3.12095 / 0.00171168))
    const mcd = AtlasLightPollutionProvider.mcdOf(code, FakeAtlas.INDEX)
    expect(Math.abs(Math.log10(mcd / 3.12095))).toBeLessThanOrEqual(0.5 / 60 + 1e-9)
    expect(AtlasLightPollutionProvider.mcdOf(0, FakeAtlas.INDEX)).toBe(0)
  })

  it("reads the cell a place falls in, from the tile beside the index", async () => {
    const atlas = new FakeAtlas(1 + Math.round(60 * Math.log10(3.12095 / 0.00171168)))
    const found = await atlas.provider().lookUp(33.6, -117.672)
    expect(found.status).toBe("found")
    if (found.status !== "found") return
    expect(found.lightPollution).toBeCloseTo(18.79, 1)
    expect(atlas.requests).toContain("https://example.org/light-pollution/N33W118.bin")
  })

  it("keeps a natural sky, a place beyond the atlas and an unreadable tile apart", async () => {
    const atlas = new FakeAtlas(0)
    expect((await atlas.provider().lookUp(33.6, -117.672)).status).toBe("natural")
    expect((await atlas.provider().lookUp(30, -40)).status).toBe("natural")
    expect((await atlas.provider().lookUp(88, 0)).status).toBe("outside")
    expect((await new FakeAtlas(100, true).provider().lookUp(33.6, -117.672)).status).toBe("failed")
    const offline = new AtlasLightPollutionProvider({
      fetchImpl: (async () => { throw new TypeError("offline") }) as typeof fetch,
      indexUrls: ["https://example.org/light-pollution/index.json"]
    })
    expect((await offline.lookUp(33.6, -117.672)).status).toBe("failed")
  })

  it("names tiles by their south-west corner", () => {
    expect(AtlasLightPollutionProvider.nameOf(33, -118)).toBe("N33W118")
    expect(AtlasLightPollutionProvider.nameOf(-34, 18)).toBe("S34E018")
  })
})
