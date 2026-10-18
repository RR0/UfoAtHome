import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { IgnTopoRailwayProvider } from "../../../../src/render3d/terrain/providers/IgnTopoRailwayProvider.js"
import { OverpassRailwayProvider } from "../../../../src/render3d/terrain/providers/OverpassRailwayProvider.js"
import { RegionalRailwayProvider } from "../../../../src/render3d/terrain/providers/RegionalRailwayProvider.js"
import { CachedRailwayProvider } from "../../../../src/render3d/terrain/providers/CachedRailwayProvider.js"
import type { RailwayLine, RailwayProvider } from "../../../../src/render3d/terrain/RailwayProvider.js"

const GARE_DE_LYON = { south: 48.832, north: 48.848, west: 2.366, east: 2.39 }
const BRUSSELS = { south: 50.83, north: 50.85, west: 4.33, east: 4.36 }
const TYROL = { south: 47.37, north: 47.39, west: 10.5, east: 10.55 }

function section(properties: Record<string, unknown>, ...points: number[][]): unknown {
  return { type: "Feature", properties, geometry: { type: "LineString", coordinates: points } }
}

function answering(body: unknown): typeof fetch {
  return vi.fn(async () => ({ ok: true, status: 200, json: async () => body }) as Response) as unknown as typeof fetch
}

const LINE: RailwayLine = { id: "a", kind: "rail", gaugeMm: 1435, tracks: 1, level: 0, points: [{ lat: 48.84, lng: 2.37 }, { lat: 48.841, lng: 2.371 }] }

/** A source that counts how often it is asked, and fails while `failing` says so. */
class Counting implements RailwayProvider {
  readonly attribution = "©"
  readonly contemporary = true
  asked = 0
  failing = false
  constructor(private readonly lines: RailwayLine[] = [LINE]) {}
  async getRailways(): Promise<RailwayLine[]> {
    this.asked++
    if (this.failing) throw new Error("down")
    return structuredClone(this.lines)
  }
}

/** The Cache API, enough of it for one cache (see CachedSurroundingsProvider.test.ts). */
class FakeCache {
  readonly entries = new Map<string, string>()
  async match(request: Request): Promise<Response | undefined> {
    const body = this.entries.get(request.url)
    return body === undefined ? undefined : new Response(body)
  }
  async put(request: Request, response: Response): Promise<void> {
    this.entries.delete(request.url)
    this.entries.set(request.url, await response.text())
  }
  async delete(request: Request): Promise<boolean> {
    return this.entries.delete(request.url)
  }
  async keys(): Promise<Request[]> {
    return [...this.entries.keys()].map(url => new Request(url))
  }
}

const settled = () => new Promise(resolve => setTimeout(resolve, 0))

describe("IgnTopoRailwayProvider", () => {
  it("reads what the map says of a section: its nature, gauge, tracks, current, level and altitudes", async () => {
    const provider = new IgnTopoRailwayProvider({
      fetchImpl: answering({
        features: [
          section({ cleabs: "MAIN", nature: "Voie ferrée principale", electrifie: true, largeur: "Normale", nombre_de_voies: 2, position_par_rapport_au_sol: "0" }, [2.38, 48.84, 39.4], [2.381, 48.841, 39]),
          section({ cleabs: "LGV", nature: "LGV", electrifie: true, largeur: "Normale", nombre_de_voies: 2, position_par_rapport_au_sol: "1" }, [2.38, 48.84, 40], [2.381, 48.841, -1000]),
          section({ cleabs: "YARD", nature: "Voie de service", electrifie: false, largeur: "Normale", nombre_de_voies: 1, position_par_rapport_au_sol: "0" }, [2.38, 48.84], [2.381, 48.841]),
          section({ cleabs: "METRO", nature: "Métro", electrifie: true, largeur: "Normale", nombre_de_voies: 2, position_par_rapport_au_sol: "-2" }, [2.38, 48.84], [2.381, 48.841]),
          section({ cleabs: "TRAM", nature: "Tramway", electrifie: true, largeur: "Normale", nombre_de_voies: 2, position_par_rapport_au_sol: "0" }, [2.38, 48.84], [2.381, 48.841]),
          section({ cleabs: "MOUNTAIN", nature: "Voie ferrée principale", electrifie: true, largeur: "Etroite", nombre_de_voies: 1, position_par_rapport_au_sol: "0" }, [2.38, 48.84], [2.381, 48.841]),
          section({ cleabs: "NOTHING", nature: "Sans objet" }, [2.38, 48.84], [2.381, 48.841])
        ]
      })
    })
    const [main, lgv, yard, metro, tram, mountain, ...rest] = await provider.getRailways(GARE_DE_LYON)
    expect(rest).toEqual([])
    expect(main).toMatchObject({ id: "MAIN", kind: "rail", gaugeMm: 1435, tracks: 2, electrification: "overhead", level: 0 })
    expect(main.points[0]).toEqual({ lat: 48.84, lng: 2.38, altitudeM: 39.4 })
    // -1000 is the map's "not known".
    expect(lgv).toMatchObject({ highSpeed: true, level: 1 })
    expect(lgv.points[1].altitudeM).toBeUndefined()
    expect(yard).toMatchObject({ service: true, electrification: "none" })
    expect(metro).toMatchObject({ kind: "subway", electrification: "third_rail", level: -2 })
    expect(tram).toMatchObject({ kind: "tram", electrification: "overhead" })
    // A metre-gauge line may run on a third rail or under a wire: not known.
    expect(mountain.gaugeMm).toBe(1000)
    expect(mountain.electrification).toBeUndefined()
  })

  it("asks only for what is in service, with the attributes it reads", async () => {
    const fetchImpl = answering({ features: [] })
    await new IgnTopoRailwayProvider({ fetchImpl }).getRailways(GARE_DE_LYON)
    const url = new URL(String((fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0]))
    expect(url.searchParams.get("TYPENAMES")).toBe("BDTOPO_V3:troncon_de_voie_ferree")
    expect(url.searchParams.get("CQL_FILTER")).toContain("etat_de_l_objet='En service'")
    for (const name of ["electrifie", "nombre_de_voies", "position_par_rapport_au_sol", "largeur"]) expect(url.searchParams.get("PROPERTYNAME")).toContain(name)
  })
})

describe("OverpassRailwayProvider", () => {
  it("asks once for every kind of track, and reads gauge, current, bridges and tunnels from the tags", async () => {
    const fetchImpl = answering({
      elements: [
        { id: 1, tags: { railway: "rail", electrified: "contact_line", gauge: "1435", bridge: "yes" }, geometry: [{ lat: 50.84, lon: 4.34 }, { lat: 50.841, lon: 4.341 }] },
        { id: 2, tags: { railway: "subway", electrified: "rail", tunnel: "yes", layer: "-2" }, geometry: [{ lat: 50.84, lon: 4.34 }, { lat: 50.841, lon: 4.341 }] },
        { id: 3, tags: { railway: "narrow_gauge", service: "siding" }, geometry: [{ lat: 50.84, lon: 4.34 }, { lat: 50.841, lon: 4.341 }] },
        { id: 4, tags: { railway: "tram", electrified: "contact_line", gauge: "1000", tracks: "2" }, geometry: [{ lat: 50.84, lon: 4.34 }, { lat: 50.841, lon: 4.341 }] }
      ]
    })
    const lines = await new OverpassRailwayProvider({ fetchImpl, endpoints: ["https://overpass.example/api/interpreter"] }).getRailways(BRUSSELS)
    expect((fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1)
    const query = new URL(String((fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0])).searchParams.get("data")!
    for (const kind of ["rail", "light_rail", "tram", "subway"]) expect(query).toContain(kind)
    expect(lines[0]).toMatchObject({ kind: "rail", electrification: "overhead", level: 1, gaugeMm: 1435 })
    expect(lines[1]).toMatchObject({ kind: "subway", electrification: "third_rail", level: -2 })
    expect(lines[2]).toMatchObject({ kind: "rail", gaugeMm: 1000, service: true })
    expect(lines[2].electrification).toBeUndefined()
    expect(lines[3]).toMatchObject({ kind: "tram", gaugeMm: 1000, tracks: 2 })
  })
})

describe("RegionalRailwayProvider", () => {
  it("takes the IGN's map in France and asks nobody else", async () => {
    const ign = new Counting()
    const osm = new Counting()
    expect(await new RegionalRailwayProvider(ign, osm).getRailways(GARE_DE_LYON)).toHaveLength(1)
    expect(osm.asked).toBe(0)
  })

  it("asks OpenStreetMap outside France, and where the IGN's box takes in another country it draws nothing of", async () => {
    const osm = new Counting()
    await new RegionalRailwayProvider(new Counting([]), osm).getRailways(TYROL)
    await new RegionalRailwayProvider(new Counting([]), osm).getRailways(BRUSSELS)
    expect(osm.asked).toBe(2)
  })

  it("keeps the map's nothing when OpenStreetMap does not answer: no line here is not a failure", async () => {
    const osm = new Counting()
    osm.failing = true
    expect(await new RegionalRailwayProvider(new Counting([]), osm).getRailways(GARE_DE_LYON)).toEqual([])
  })

  it("fails where neither answers", async () => {
    const ign = new Counting()
    ign.failing = true
    const osm = new Counting()
    osm.failing = true
    await expect(new RegionalRailwayProvider(ign, osm).getRailways(GARE_DE_LYON)).rejects.toThrow()
  })
})

describe("CachedRailwayProvider", () => {
  beforeEach(() => CachedRailwayProvider.forget())
  afterEach(() => vi.unstubAllGlobals())

  it("answers a box inside one already answered without asking", async () => {
    const source = new Counting()
    await new CachedRailwayProvider(source).getRailways(GARE_DE_LYON)
    const inside = { south: 48.835, north: 48.845, west: 2.37, east: 2.385 }
    expect(await new CachedRailwayProvider(source).getRailways(inside)).toHaveLength(1)
    expect(source.asked).toBe(1)
  })

  it("after a failure, lets the source be for a while whatever the box, then asks again", async () => {
    let now = 1_000_000
    const source = new Counting()
    source.failing = true
    const cached = new CachedRailwayProvider(source, () => now)
    await expect(cached.getRailways(GARE_DE_LYON)).rejects.toThrow()
    await expect(cached.getRailways(BRUSSELS)).rejects.toThrow()
    expect(source.asked).toBe(1)
    now += CachedRailwayProvider.RETRY_AFTER_MS + 1
    source.failing = false
    expect(await cached.getRailways(BRUSSELS)).toHaveLength(1)
    expect(source.asked).toBe(2)
  })

  it("gives last month's answer when the source fails, rather than none", async () => {
    const cache = new FakeCache()
    vi.stubGlobal("caches", { open: async () => cache })
    let now = 1_000_000
    const source = new Counting()
    await new CachedRailwayProvider(source, () => now).getRailways(GARE_DE_LYON)
    await settled()
    expect(cache.entries.size).toBe(1)
    CachedRailwayProvider.forget()
    now += CachedRailwayProvider.MAX_AGE_MS + 1
    source.failing = true
    const lines = await new CachedRailwayProvider(source, () => now).getRailways(GARE_DE_LYON)
    expect(lines.map(line => line.id)).toEqual(["a"])
    expect(source.asked).toBe(2)
  })

  it("answers from disk within a month without asking", async () => {
    const cache = new FakeCache()
    vi.stubGlobal("caches", { open: async () => cache })
    const source = new Counting()
    await new CachedRailwayProvider(source).getRailways(GARE_DE_LYON)
    await settled()
    CachedRailwayProvider.forget()
    await new CachedRailwayProvider(source).getRailways(GARE_DE_LYON)
    expect(source.asked).toBe(1)
  })
})
