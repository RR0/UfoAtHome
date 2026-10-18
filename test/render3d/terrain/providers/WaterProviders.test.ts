import { describe, expect, it, vi } from "vitest"
import { IgnTopoWaterProvider } from "../../../../src/render3d/terrain/providers/IgnTopoWaterProvider.js"
import { OverpassWaterProvider } from "../../../../src/render3d/terrain/providers/OverpassWaterProvider.js"
import { RegionalWaterProvider } from "../../../../src/render3d/terrain/providers/RegionalWaterProvider.js"
import type { WaterProvider } from "../../../../src/render3d/terrain/WaterProvider.js"

const PARIS = { south: 48.851, north: 48.855, west: 2.346, east: 2.352 }
// Socorro, well out of the box that says France.
const ABROAD = { south: 34.05, north: 34.07, west: -106.9, east: -106.88 }

function answering(body: unknown): typeof fetch {
  return vi.fn(async () => ({ ok: true, status: 200, json: async () => body }) as Response) as unknown as typeof fetch
}

describe("IgnTopoWaterProvider", () => {
  it("asks the map for the permanent water on the ground, and gives each polygon its outline and its islands, without the repeated closing point", async () => {
    const fetchImpl = answering({
      features: [{
        properties: { cleabs: "SURF_EAU1", nature: "Ecoulement naturel" },
        geometry: {
          type: "MultiPolygon",
          coordinates: [
            [[[2.346, 48.852, 27], [2.352, 48.852, 27], [2.352, 48.853, 27], [2.346, 48.853, 27], [2.346, 48.852, 27]],
              [[2.348, 48.8524], [2.349, 48.8524], [2.349, 48.8526], [2.348, 48.8524]]],
            [[[2.35, 48.854], [2.351, 48.854], [2.351, 48.8545], [2.35, 48.854]]]
          ]
        }
      }]
    })
    const surfaces = await new IgnTopoWaterProvider({ fetchImpl }).getWater(PARIS)
    const asked = decodeURIComponent(String((fetchImpl as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][0]))
    expect(asked).toContain("surface_hydrographique")
    expect(asked).toContain("persistance='Permanent'")
    expect(surfaces.map(surface => surface.id)).toEqual(["SURF_EAU1-0", "SURF_EAU1-1"])
    expect(surfaces[0].rings).toHaveLength(2)
    expect(surfaces[0].rings[0]).toHaveLength(4)
    expect(surfaces[0].rings[0][1]).toEqual({ lat: 48.852, lng: 2.352 })
    expect(surfaces[1].rings).toEqual([[{ lat: 48.854, lng: 2.35 }, { lat: 48.854, lng: 2.351 }, { lat: 48.8545, lng: 2.351 }]])
  })
})

describe("OverpassWaterProvider", () => {
  const p = (lat: number, lon: number) => ({ lat, lon })

  it("joins the parts of a multipolygon into rings whichever way each is drawn, with its islands, and leaves out what does not close", () => {
    const surfaces = OverpassWaterProvider.surfacesFrom({
      elements: [
        { type: "way", id: 1, geometry: [p(0, 0), p(0, 2), p(2, 2)] },
        // Drawn the other way round from where the first ends.
        { type: "way", id: 2, geometry: [p(0, 0), p(2, 0), p(2, 2)] },
        { type: "way", id: 3, geometry: [p(1, 1), p(1, 1.5), p(1.5, 1.5), p(1, 1)] },
        // A river that goes on beyond the place: its banks never meet.
        { type: "way", id: 4, geometry: [p(5, 0), p(5, 3)] },
        { type: "relation", id: 10, tags: { natural: "water" }, members: [{ type: "way", ref: 1, role: "outer" }, { type: "way", ref: 2, role: "outer" }, { type: "way", ref: 3, role: "inner" }] },
        { type: "relation", id: 11, tags: { natural: "water" }, members: [{ type: "way", ref: 4, role: "outer" }] }
      ]
    })
    expect(surfaces).toHaveLength(1)
    expect(surfaces[0].id).toBe("osm-r10-0")
    expect(surfaces[0].rings[0]).toHaveLength(4)
    expect(surfaces[0].rings[1]).toHaveLength(3)
  })

  it("takes a closed way that is water as a lake of its own, and not one that is only a member", () => {
    const pond = [p(0, 0), p(0, 1), p(1, 1), p(0, 0)]
    const surfaces = OverpassWaterProvider.surfacesFrom({
      elements: [
        { type: "way", id: 1, tags: { natural: "water" }, geometry: pond },
        { type: "way", id: 2, tags: { waterway: "riverbank" }, geometry: pond },
        { type: "way", id: 3, tags: { highway: "residential" }, geometry: pond }
      ]
    })
    expect(surfaces.map(surface => surface.id)).toEqual(["osm-w1", "osm-w2"])
  })
})

describe("RegionalWaterProvider", () => {
  const giving = (id: string): WaterProvider => ({ attribution: id, getWater: vi.fn(async () => [{ id, rings: [] }]) })

  it("asks the IGN in France, and the worldwide map elsewhere or when the IGN does not answer", async () => {
    const ign = giving("ign")
    const osm = giving("osm")
    const regional = new RegionalWaterProvider(ign, osm)
    expect((await regional.getWater(PARIS))[0].id).toBe("ign")
    expect((await regional.getWater(ABROAD))[0].id).toBe("osm")
    const failing: WaterProvider = { attribution: "ign", getWater: vi.fn(async () => { throw new Error("down") }) }
    expect((await new RegionalWaterProvider(failing, osm).getWater(PARIS))[0].id).toBe("osm")
  })

  it("asks the worldwide map where the IGN has nothing: the box that says France takes in a corner of Belgium", async () => {
    const none: WaterProvider = { attribution: "ign", getWater: vi.fn(async () => []) }
    expect((await new RegionalWaterProvider(none, giving("osm")).getWater(PARIS))[0].id).toBe("osm")
  })
})
