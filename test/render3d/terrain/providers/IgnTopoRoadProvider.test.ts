import { describe, expect, it, vi } from "vitest"
import { IgnTopoRoadProvider } from "../../../../src/render3d/terrain/providers/IgnTopoRoadProvider.js"
import { RegionalRoadProvider } from "../../../../src/render3d/terrain/providers/RegionalRoadProvider.js"
import type { RoadProvider, RoadWay } from "../../../../src/render3d/terrain/RoadProvider.js"

const SAINT_LO = { south: 49.113, north: 49.118, west: -1.095, east: -1.086 }
const ABROAD = { south: 50.84, north: 50.86, west: 4.34, east: 4.36 }

function road(properties: Record<string, unknown>, ...points: [number, number][]): unknown {
  return { type: "Feature", properties, geometry: { type: "LineString", coordinates: points } }
}

function answering(features: unknown[]): typeof fetch {
  return vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ features }) }) as Response) as unknown as typeof fetch
}

describe("IgnTopoRoadProvider", () => {
  it("asks the map for the roads of the box, longitude first, without the footpaths, the stairs and the tunnels", async () => {
    const fetchImpl = answering([])
    await new IgnTopoRoadProvider({ fetchImpl }).getRoads(SAINT_LO)
    const url = new URL(String((fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0]))
    expect(url.searchParams.get("TYPENAMES")).toBe("BDTOPO_V3:troncon_de_route")
    const filter = url.searchParams.get("CQL_FILTER")!
    expect(filter).toContain("BBOX(geometrie,-1.095000,49.113000,-1.086000,49.118000,'EPSG:4326')")
    expect(filter).toContain("nature<>'Sentier'")
    expect(filter).toContain("nature<>'Escalier'")
    expect(filter).toContain("position_par_rapport_au_sol>='0'")
  })

  it("makes a road of each section: its name, what it is made of, its stated width or what its kind has", async () => {
    const provider = new IgnTopoRoadProvider({
      fetchImpl: answering([
        road({ cleabs: "A", nature: "Route à 1 chaussée", largeur_de_chaussee: 7, nom_voie_ban_gauche: "Rue de Carentan" }, [-1.09, 49.115], [-1.089, 49.115]),
        road({ cleabs: "B", nature: "Chemin" }, [-1.09, 49.116], [-1.089, 49.116]),
        road({ cleabs: "C", nature: "Route empierrée", cpx_toponyme_route_nommee: "Voie de la Liberté" }, [-1.09, 49.117], [-1.089, 49.117]),
        road({ cleabs: "D", nature: "Nature inconnue" }, [-1.09, 49.1175], [-1.089, 49.1175]),
        road({ cleabs: "E", nature: "Route à 1 chaussée" }, [-1.09, 49.118])
      ])
    })
    const ways = await provider.getRoads(SAINT_LO)
    expect(ways.map(way => way.id)).toEqual(["A", "B", "C", "D"])
    expect(ways[0]).toMatchObject({ name: "Rue de Carentan", surface: "paved", widthM: 7, points: [{ lat: 49.115, lng: -1.09 }, { lat: 49.115, lng: -1.089 }] })
    expect(ways[1]).toMatchObject({ surface: "dirt", widthM: 3 })
    expect(ways[1].name).toBeUndefined()
    expect(ways[2]).toMatchObject({ name: "Voie de la Liberté", surface: "gravel", widthM: 3.5 })
    expect(ways[3]).toMatchObject({ surface: "paved", widthM: 5 })
  })

  it("says a street is urban where the map does, and nothing where it does not", async () => {
    const provider = new IgnTopoRoadProvider({
      fetchImpl: answering([
        road({ cleabs: "A", nature: "Route à 1 chaussée", urbain: true }, [-1.09, 49.115], [-1.089, 49.115]),
        road({ cleabs: "B", nature: "Route à 1 chaussée", urbain: false }, [-1.09, 49.116], [-1.089, 49.116])
      ])
    })
    const [urban, country] = await provider.getRoads(SAINT_LO)
    expect(urban.urban).toBe(true)
    expect(country.urban).toBeUndefined()
  })

  it("says plainly that its roads are today's", () => {
    const provider = new IgnTopoRoadProvider()
    expect(provider.contemporary).toBe(true)
    expect(provider.attribution).toContain("IGN")
  })
})

describe("RegionalRoadProvider", () => {
  const way = (id: string): RoadWay => ({ id, surface: "paved", widthM: 5, points: [{ lat: 0, lng: 0 }, { lat: 0, lng: 1 }] })
  const provider = (ways: RoadWay[] | Error): RoadProvider & { asked: number } => {
    const own = { asked: 0, attribution: "", contemporary: true, async getRoads() { own.asked++; if (ways instanceof Error) throw ways; return ways } }
    return own
  }

  it("asks the regional source in its region, and the worldwide one everywhere else", async () => {
    const regional = provider([way("ign")])
    const worldwide = provider([way("osm")])
    const roads = new RegionalRoadProvider(regional, worldwide)
    expect((await roads.getRoads(SAINT_LO)).map(w => w.id)).toEqual(["ign"])
    expect((await roads.getRoads(ABROAD.south > 60 ? SAINT_LO : { south: 40.3, north: 40.5, west: -3.8, east: -3.6 })).map(w => w.id)).toEqual(["osm"])
    expect(regional.asked).toBe(1)
  })

  it("falls back on the worldwide source where the regional one fails or has nothing", async () => {
    expect((await new RegionalRoadProvider(provider(new Error("down")), provider([way("osm")])).getRoads(SAINT_LO)).map(w => w.id)).toEqual(["osm"])
    expect((await new RegionalRoadProvider(provider([]), provider([way("osm")])).getRoads(SAINT_LO)).map(w => w.id)).toEqual(["osm"])
  })

  it("names both in its attribution", () => {
    const roads = new RegionalRoadProvider(provider([]), provider([]))
    expect(roads.attribution).toContain("IGN")
    expect(roads.attribution).toContain("OpenStreetMap")
  })
})
