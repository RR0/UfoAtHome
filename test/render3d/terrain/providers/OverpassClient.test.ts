import { describe, expect, it, vi } from "vitest"
import { OverpassClient } from "../../../../src/render3d/terrain/providers/OverpassClient.js"

const NANTERRE = '[out:json][timeout:25];(node["highway"="street_lamp"](48.893500,2.199000,48.897500,2.205000););out geom;'
const SOCORRO = '[out:json][timeout:25];(node["highway"="street_lamp"](34.000000,-106.900000,34.010000,-106.890000););out geom;'

describe("OverpassClient", () => {
  it("asks OpenStreetMap France's instance first about a place in France, then the general ones", () => {
    const endpoints = OverpassClient.endpointsFor(NANTERRE)
    expect(endpoints[0]).toBe(OverpassClient.FRANCE_ENDPOINT)
    expect(endpoints.length).toBeGreaterThan(1)
    expect(endpoints.filter(endpoint => endpoint === OverpassClient.FRANCE_ENDPOINT)).toHaveLength(1)
  })

  it("asks the general instances alone elsewhere, or where the query says no box", () => {
    expect(OverpassClient.endpointsFor(SOCORRO)).not.toContain(OverpassClient.FRANCE_ENDPOINT)
    expect(OverpassClient.endpointsFor("[out:json];node(1);out;")).not.toContain(OverpassClient.FRANCE_ENDPOINT)
  })

  it("goes to the next instance when the first cannot be reached, and is answered by it", async () => {
    const asked: string[] = []
    const fetchImpl = vi.fn(async (url: string) => {
      asked.push(new URL(url).host)
      if (asked.length === 1) throw new TypeError("Failed to fetch")
      return new Response(JSON.stringify({ elements: [{ type: "node", id: 1, lat: 48.895, lon: 2.2, tags: { highway: "street_lamp" } }] }))
    }) as unknown as typeof fetch
    const answer = await new OverpassClient({ fetchImpl, endpoints: ["https://a.example/api/interpreter", "https://b.example/api/interpreter"] }).query(NANTERRE)
    expect(asked).toEqual(["a.example", "b.example"])
    expect(answer.elements).toHaveLength(1)
  })
})
