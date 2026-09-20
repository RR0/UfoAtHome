import { describe, expect, it, vi } from "vitest"
import { ArchivedRoadProvider } from "../../../../src/render3d/terrain/providers/ArchivedRoadProvider.js"
import type { RoadProvider, RoadWay } from "../../../../src/render3d/terrain/RoadProvider.js"

const INDEX_URL = "https://example.test/roads/index.json"
const PATCH = { north: 34.059, south: 34.043, east: -106.882, west: -106.902 }

const ARCHIVED: RoadWay[] = [
  { id: "osm-1", name: "US 85", surface: "paved", widthM: 9, points: [{ lat: 34.05, lng: -106.89 }, { lat: 34.052, lng: -106.888 }] }
]

function serving(bodyByUrl: Record<string, unknown>): typeof fetch {
  return vi.fn(async (input: RequestInfo | URL) => {
    const body = bodyByUrl[String(input)]
    return body === undefined
      ? ({ ok: false, status: 404, json: async () => ({}) } as Response)
      : ({ ok: true, status: 200, json: async () => body } as Response)
  }) as unknown as typeof fetch
}

/** An index holding one square, wide enough to contain the patch above. */
function index(file = "socorro.json") {
  return { version: 1, entries: [{ file, north: 34.07, south: 34.03, east: -106.87, west: -106.92, about: "socorro" }] }
}

const LIVE: RoadProvider = {
  attribution: "Roads © OpenStreetMap contributors, as surveyed today",
  contemporary: true,
  getRoads: async () => [{ id: "live-1", surface: "gravel", widthM: 4, points: [{ lat: 1, lng: 1 }, { lat: 2, lng: 2 }] }]
}

describe("ArchivedRoadProvider", () => {
  it("answers from the frozen copy, so no reader's browser has to ask Overpass", async () => {
    const fetchImpl = serving({
      [INDEX_URL]: index(),
      "https://example.test/roads/socorro.json": { version: 1, attribution: "Roads © OpenStreetMap contributors, surveyed 2026-09-20", contemporary: true, ways: ARCHIVED }
    })
    const provider = new ArchivedRoadProvider({ indexUrls: [INDEX_URL], fetchImpl, fallback: LIVE })
    const roads = await provider.getRoads(PATCH)
    expect(roads.map(road => road.id)).toEqual(["osm-1"])
    // The credit belongs to the survey the ways came from, not to the host that kept them.
    expect(provider.attribution).toContain("surveyed 2026-09-20")
    expect(provider.contemporary).toBe(true)
  })

  it("only answers for a square that holds the whole patch, never a part of one", async () => {
    const fetchImpl = serving({
      [INDEX_URL]: { version: 1, entries: [{ file: "small.json", north: 34.05, south: 34.045, east: -106.89, west: -106.895 }] },
      "https://example.test/roads/small.json": { version: 1, attribution: "x", contemporary: true, ways: ARCHIVED }
    })
    const provider = new ArchivedRoadProvider({ indexUrls: [INDEX_URL], fetchImpl, fallback: LIVE })
    expect((await provider.getRoads(PATCH)).map(road => road.id)).toEqual(["live-1"])
  })

  it("falls through to the live source where nothing has been frozen — which is the editor's case", async () => {
    const provider = new ArchivedRoadProvider({
      indexUrls: [INDEX_URL],
      fetchImpl: serving({}),
      fallback: LIVE
    })
    expect((await provider.getRoads(PATCH)).map(road => road.id)).toEqual(["live-1"])
    expect(provider.attribution).toBe(LIVE.attribution)
  })

  it("comes back empty rather than throwing when there is no archive and no fallback", async () => {
    // Offline, or a host that mirrors nothing: every scene then draws no roads, which is what
    // every scene did before roads existed.
    const provider = new ArchivedRoadProvider({ indexUrls: [INDEX_URL], fetchImpl: serving({}) })
    expect(await provider.getRoads(PATCH)).toEqual([])
  })

  it("reads the index once however many patches are built", async () => {
    const fetchImpl = serving({
      [INDEX_URL]: index(),
      "https://example.test/roads/socorro.json": { version: 1, attribution: "x", contemporary: true, ways: ARCHIVED }
    })
    const provider = new ArchivedRoadProvider({ indexUrls: [INDEX_URL], fetchImpl })
    await provider.getRoads(PATCH)
    await provider.getRoads(PATCH)
    const indexReads = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls
      .filter(call => String(call[0]) === INDEX_URL)
    expect(indexReads).toHaveLength(1)
  })
})
