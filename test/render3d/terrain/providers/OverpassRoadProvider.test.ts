import { describe, expect, it, vi } from "vitest"
import { OverpassRoadProvider } from "../../../../src/render3d/terrain/providers/OverpassRoadProvider.js"

const BOUNDS = { north: 34.059, south: 34.043, east: -106.882, west: -106.902 }

function answering(body: unknown): typeof fetch {
  return vi.fn(async () => ({ ok: true, status: 200, json: async () => body }) as Response) as unknown as typeof fetch
}

function way(id: number, tags: Record<string, string>) {
  return { type: "way", id, tags, geometry: [{ lat: 34.05, lon: -106.89 }, { lat: 34.051, lon: -106.889 }] }
}

describe("OverpassRoadProvider", () => {
  it("asks only for ways somebody could drive", async () => {
    const fetchImpl = answering({ elements: [] })
    await new OverpassRoadProvider({ fetchImpl }).getRoads(BOUNDS)
    const url = decodeURIComponent(String((fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0]))
    // A town's footways outnumber its roads five to one, and none of them is what a reader asking
    // where the road went is looking for.
    expect(url).toContain("motorway")
    expect(url).toContain("track")
    expect(url).not.toContain("footway")
    expect(url).toContain("34.043,-106.902,34.059,-106.882")
  })

  it("says plainly that its roads are today's, not the recording's", () => {
    const provider = new OverpassRoadProvider()
    expect(provider.contemporary).toBe(true)
    expect(provider.attribution).toContain("OpenStreetMap")
  })

  it("takes a stated width over a counted one, and a counted one over the class's own", async () => {
    const provider = new OverpassRoadProvider({
      fetchImpl: answering({ elements: [
        way(1, { highway: "residential", width: "6.5" }),
        way(2, { highway: "residential", lanes: "4" }),
        way(3, { highway: "residential" })
      ] })
    })
    expect((await provider.getRoads(BOUNDS)).map(road => road.widthM)).toEqual([6.5, 14, 5.5])
  })

  it("reads a track as unsealed even when nothing says so — which is the road Zamora turned onto", async () => {
    const provider = new OverpassRoadProvider({
      fetchImpl: answering({ elements: [
        way(1, { highway: "track" }),
        way(2, { highway: "residential" }),
        way(3, { highway: "service", surface: "dirt" }),
        way(4, { highway: "unclassified", surface: "compacted" })
      ] })
    })
    expect((await provider.getRoads(BOUNDS)).map(road => road.surface)).toEqual(["gravel", "paved", "dirt", "gravel"])
  })

  it("drops what cannot be drawn rather than drawing it wrong", async () => {
    const provider = new OverpassRoadProvider({
      fetchImpl: answering({ elements: [
        { type: "way", id: 1, tags: { highway: "residential" }, geometry: [{ lat: 34.05, lon: -106.89 }] },
        { type: "way", id: 2, tags: { highway: "residential" } },
        way(3, { highway: "residential", name: "A Street" })
      ] })
    })
    const roads = await provider.getRoads(BOUNDS)
    expect(roads).toHaveLength(1)
    expect(roads[0].name).toBe("A Street")
  })

  it("throws on a refusal, so the caller can decide that no roads is not an error", async () => {
    const provider = new OverpassRoadProvider({
      fetchImpl: (async () => ({ ok: false, status: 429, json: async () => ({}) }) as Response) as unknown as typeof fetch
    })
    await expect(provider.getRoads(BOUNDS)).rejects.toThrow("429")
  })
})
