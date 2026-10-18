import { beforeEach, describe, expect, it, vi } from "vitest"
import { ParisStreetLamps } from "../../../../src/render3d/terrain/providers/ParisStreetLamps.js"
import { OsmStreetFurniture } from "../../../../src/render3d/terrain/providers/OsmStreetFurniture.js"

const NOTRE_DAME = { lat: 48.85335, lng: 2.34775 }
const METRES = 111320
const at = (east: number, north: number) => ({ lat: NOTRE_DAME.lat + north / METRES, lon: NOTRE_DAME.lng + east / (METRES * Math.cos(NOTRE_DAME.lat * Math.PI / 180)) })
const record = (east: number, north: number, fields: Record<string, string | null> = {}) => ({ geo_point_2d: at(east, north), lib_ouvrag: "Candélabre", lampe_temperature_couleur: "2800.0", lampe_flux: "7500.0", support_hauteur: "None", ...fields })
const answering = (...pages: unknown[][]) => {
  let page = 0
  return vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ results: pages[page++] ?? [] }) }) as Response) as unknown as typeof fetch
}

describe("ParisStreetLamps", () => {
  beforeEach(() => OsmStreetFurniture.forget())

  it("gives each lamp of the city's inventory at its place, with the colour and the flux of its light, a wall bracket as one", () => {
    const lamps = ParisStreetLamps.lampsFrom([record(3, 4), record(-10, 2, { lib_ouvrag: "Console", lampe_temperature_couleur: "2000.0", lampe_flux: "1630.0", support_hauteur: "3.75" })], NOTRE_DAME)
    expect(lamps).toEqual([
      { eastM: 3, northM: 4, colorTemperatureK: 2800, lumens: 7500 },
      { eastM: -10, northM: 2, heightM: 3.75, colorTemperatureK: 2000, lumens: 1630, mount: "wall" }
    ])
  })

  it("leaves out the floodlights, takes the heads of one column as one lamp of their summed flux, and no height the inventory writes as 0", () => {
    const lamps = ParisStreetLamps.lampsFrom([record(0, 10), record(0.1, 10.1, { lampe_flux: "5250.0" }), record(5, 5, { lib_ouvrag: "Projecteur" }), record(20, 0, { support_hauteur: "0.0" })], NOTRE_DAME)
    expect(lamps.map(lamp => [lamp.eastM, lamp.lumens, lamp.heightM])).toEqual([[0, 12750, undefined], [20, 7500, undefined]])
  })

  it("asks for the nearest lamps first, a page at a time until it has as many columns as it keeps, and only within the city", async () => {
    // Two heads to a column: a page of a hundred records is fifty lamps, and the third page brings the last of the hundred and fifty.
    const columns = (from: number) => Array.from({ length: 100 }, (_, k) => record(from + Math.floor(k / 2), 0))
    const fetchImpl = answering(columns(0), columns(50), columns(100), columns(150))
    const lamps = await new ParisStreetLamps(fetchImpl).lampsNear(NOTRE_DAME, 150)
    expect(lamps).toHaveLength(ParisStreetLamps.MAX)
    // A form's encoding, as the service reads it: a space is a "+".
    const urls = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls.map(call => decodeURIComponent(String(call[0]).replace(/\+/g, " ")))
    expect(urls).toHaveLength(3)
    expect(urls[0]).toContain("within_distance(geo_point_2d,geom'POINT(2.347750 48.853350)',150m)")
    expect(urls[0]).toContain("order_by=distance(geo_point_2d,geom'POINT(2.347750 48.853350)')")
    expect(urls[1]).toContain("offset=100")
    expect(urls[2]).toContain("offset=200")
    const paris = new ParisStreetLamps(fetchImpl)
    expect(paris.covers(NOTRE_DAME.lat, NOTRE_DAME.lng)).toBe(true)
    expect(paris.covers(49.1156, -1.0905)).toBe(false)
  })

  it("is asked before the volunteers' map, whose lamps it replaces, and both are credited", async () => {
    const overpass = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ elements: [{ type: "node", id: 1, ...at(1, 1), tags: { highway: "street_lamp" } }, { type: "way", id: 3, tags: { highway: "footway", footway: "crossing" }, geometry: [at(30, 26), at(30, 34)] }] }) }) as Response) as unknown as typeof fetch
    const paris = new ParisStreetLamps(answering([record(3, 4), record(8, 9)]))
    const found = await new OsmStreetFurniture({ fetchImpl: overpass, endpoints: ["https://overpass.test/api"] }, [paris]).near(NOTRE_DAME, 150)
    expect(found.lamps?.map(lamp => lamp.lumens)).toEqual([7500, 7500])
    expect(found.credits?.map(credit => credit.name)).toEqual(["OpenStreetMap", "Ville de Paris, Éclairage public"])
  })

  it("gives the city's lamps when the volunteers' map does not answer, the rest to come", async () => {
    const down = vi.fn(async () => { throw new Error("down") }) as unknown as typeof fetch
    const paris = new ParisStreetLamps(answering([record(3, 4)]))
    const found = await new OsmStreetFurniture({ fetchImpl: down, endpoints: ["https://overpass.test/api"] }, [paris]).near(NOTRE_DAME, 150)
    expect(found).toEqual({ lamps: [{ eastM: 3, northM: 4, colorTemperatureK: 2800, lumens: 7500 }], credits: [paris.credit], incomplete: true })
  })
})
