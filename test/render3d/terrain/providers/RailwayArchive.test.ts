import { describe, expect, it, vi } from "vitest"
import { ArchivedRailwayProvider } from "../../../../src/render3d/terrain/providers/ArchivedRailwayProvider.js"
import type { RailwayLine, RailwayProvider } from "../../../../src/render3d/terrain/RailwayProvider.js"

const INDEX_URL = "https://example.org/railways/index.json"
const LINE: RailwayLine = { id: "l", kind: "rail", gaugeMm: 1435, tracks: 2, level: 0, electrification: "overhead", points: [{ lat: 50.6, lng: 4.1 }, { lat: 50.601, lng: 4.101 }] }
const INSIDE = { north: 50.605, south: 50.595, east: 4.11, west: 4.09 }

/** A live source that counts how often it is asked. */
class Counting implements RailwayProvider {
  readonly attribution = "live"
  readonly contemporary = true
  asked = 0
  async getRailways(): Promise<RailwayLine[]> {
    this.asked++
    return [structuredClone(LINE)]
  }
}

function serving(files: Record<string, unknown>): typeof fetch {
  return vi.fn(async (url: string) => {
    const body = files[String(url)]
    return { ok: body !== undefined, status: body === undefined ? 404 : 200, json: async () => body } as Response
  }) as unknown as typeof fetch
}

describe("ArchivedRailwayProvider", () => {
  const files = {
    [INDEX_URL]: { version: 1, entries: [{ file: "braine.json", north: 50.61, south: 50.59, east: 4.12, west: 4.08, about: "braine" }, { file: "none.json", north: 34.1, south: 34.0, east: -106.8, west: -106.9 }] },
    "https://example.org/railways/braine.json": { version: 1, attribution: "Railways © OpenStreetMap contributors, as surveyed today", lines: [LINE] },
    "https://example.org/railways/none.json": { version: 1, attribution: "Railways © OpenStreetMap contributors, as surveyed today", lines: [] }
  }

  it("answers a ground its archive holds whole from the frozen file, without asking the live source", async () => {
    const live = new Counting()
    const provider = new ArchivedRailwayProvider({ indexUrls: [INDEX_URL], fetchImpl: serving(files), fallback: live })
    expect(await provider.getRailways(INSIDE)).toEqual([LINE])
    expect(provider.attribution).toBe("Railways © OpenStreetMap contributors, as surveyed today")
    expect(live.asked).toBe(0)
  })

  it("takes a place frozen with no line for an answer: none, and nothing asked", async () => {
    const live = new Counting()
    const provider = new ArchivedRailwayProvider({ indexUrls: [INDEX_URL], fetchImpl: serving(files), fallback: live })
    expect(await provider.getRailways({ north: 34.06, south: 34.04, east: -106.88, west: -106.9 })).toEqual([])
    expect(live.asked).toBe(0)
  })

  it("asks the live source for a ground no entry holds whole, or when there is no archive", async () => {
    const live = new Counting()
    const provider = new ArchivedRailwayProvider({ indexUrls: [INDEX_URL], fetchImpl: serving(files), fallback: live })
    expect(await provider.getRailways({ ...INSIDE, north: 50.62 })).toEqual([LINE])
    const unarchived = new ArchivedRailwayProvider({ indexUrls: [INDEX_URL], fetchImpl: serving({}), fallback: live })
    expect(await unarchived.getRailways(INSIDE)).toEqual([LINE])
    expect(live.asked).toBe(2)
    expect(unarchived.attribution).toBe("live")
  })
})
