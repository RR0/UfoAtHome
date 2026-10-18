import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ArchivedWaterProvider } from "../../../../src/render3d/terrain/providers/ArchivedWaterProvider.js"
import { CachedWaterProvider } from "../../../../src/render3d/terrain/providers/CachedWaterProvider.js"
import type { WaterProvider, WaterSurface } from "../../../../src/render3d/terrain/WaterProvider.js"

const INDEX_URL = "https://example.org/water/index.json"
const POND: WaterSurface = { id: "pond", rings: [[{ lat: 50.6, lng: 4.1 }, { lat: 50.601, lng: 4.1 }, { lat: 50.601, lng: 4.101 }]] }
const INSIDE = { north: 50.605, south: 50.595, east: 4.11, west: 4.09 }

/** A live source that counts how often it is asked, and fails while `failing` says so. */
class Counting implements WaterProvider {
  readonly attribution = "live"
  asked = 0
  failing = false
  async getWater(): Promise<WaterSurface[]> {
    this.asked++
    if (this.failing) throw new Error("down")
    return [structuredClone(POND)]
  }
}

function serving(files: Record<string, unknown>): typeof fetch {
  return vi.fn(async (url: string) => {
    const body = files[String(url)]
    return { ok: body !== undefined, status: body === undefined ? 404 : 200, json: async () => body } as Response
  }) as unknown as typeof fetch
}

describe("ArchivedWaterProvider", () => {
  const index = { version: 1, entries: [{ file: "braine.json", north: 50.61, south: 50.59, east: 4.12, west: 4.08, about: "braine" }, { file: "dry.json", north: 34.1, south: 34.0, east: -106.8, west: -106.9 }] }
  const files = {
    [INDEX_URL]: index,
    "https://example.org/water/braine.json": { version: 1, attribution: "Water © OpenStreetMap contributors", surfaces: [POND] },
    "https://example.org/water/dry.json": { version: 1, attribution: "Water © OpenStreetMap contributors", surfaces: [] }
  }

  it("answers a ground its archive holds whole from the frozen file, without asking the live source", async () => {
    const live = new Counting()
    const provider = new ArchivedWaterProvider({ indexUrls: [INDEX_URL], fetchImpl: serving(files), fallback: live })
    expect(await provider.getWater(INSIDE)).toEqual([POND])
    expect(provider.attribution).toBe("Water © OpenStreetMap contributors")
    expect(live.asked).toBe(0)
  })

  it("takes a place frozen dry for an answer: no water, and nothing asked", async () => {
    const live = new Counting()
    const provider = new ArchivedWaterProvider({ indexUrls: [INDEX_URL], fetchImpl: serving(files), fallback: live })
    expect(await provider.getWater({ north: 34.06, south: 34.04, east: -106.88, west: -106.9 })).toEqual([])
    expect(live.asked).toBe(0)
  })

  it("asks the live source for a ground no entry holds whole, or when there is no archive", async () => {
    const live = new Counting()
    const provider = new ArchivedWaterProvider({ indexUrls: [INDEX_URL], fetchImpl: serving(files), fallback: live })
    // Reaching past the frozen box by a little: a patch the archive does not cover.
    expect(await provider.getWater({ ...INSIDE, north: 50.62 })).toEqual([POND])
    const unarchived = new ArchivedWaterProvider({ indexUrls: [INDEX_URL], fetchImpl: serving({}), fallback: live })
    expect(await unarchived.getWater(INSIDE)).toEqual([POND])
    expect(live.asked).toBe(2)
    expect(unarchived.attribution).toBe("live")
  })
})

describe("CachedWaterProvider", () => {
  beforeEach(() => CachedWaterProvider.forget())
  afterEach(() => vi.unstubAllGlobals())

  it("asks the live source once for a box it was already asked about, even by another instance, and gives a copy", async () => {
    const live = new Counting()
    const first = await new CachedWaterProvider(live).getWater(INSIDE)
    first[0].id = "changed"
    const again = await new CachedWaterProvider(live).getWater({ ...INSIDE, north: INSIDE.north + 0.000001 })
    expect(live.asked).toBe(1)
    expect(again).toEqual([POND])
  })

  it("does not keep a failure", async () => {
    const live = new Counting()
    live.failing = true
    await expect(new CachedWaterProvider(live).getWater(INSIDE)).rejects.toThrow("down")
    live.failing = false
    expect(await new CachedWaterProvider(live).getWater(INSIDE)).toEqual([POND])
    expect(live.asked).toBe(2)
  })

  it("answers the next visit from the disk, under a name the site's worker leaves alone", async () => {
    const stored = new Map<string, string>()
    const cache = {
      match: async (request: Request) => (stored.has(request.url) ? new Response(stored.get(request.url)) : undefined),
      put: async (request: Request, response: Response) => { stored.set(request.url, await response.text()) },
      delete: async (request: Request) => stored.delete(request.url),
      keys: async () => [...stored.keys()].map(url => new Request(url))
    }
    const open = vi.fn(async () => cache)
    vi.stubGlobal("caches", { open })
    const live = new Counting()
    await new CachedWaterProvider(live).getWater(INSIDE)
    await new Promise(resolve => setTimeout(resolve, 0))
    CachedWaterProvider.forget()
    expect(await new CachedWaterProvider(live).getWater(INSIDE)).toEqual([POND])
    expect(live.asked).toBe(1)
    expect(open).toHaveBeenCalledWith("rr0-water")
    expect(CachedWaterProvider.CACHE_NAME.startsWith("ufoathome")).toBe(false)
  })
})
