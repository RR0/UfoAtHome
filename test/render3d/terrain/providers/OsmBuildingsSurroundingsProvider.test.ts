import { describe, expect, it, vi } from "vitest"
import { OsmBuildingsSurroundingsProvider } from "../../../../src/render3d/terrain/providers/OsmBuildingsSurroundingsProvider.js"
import { OsmStreetLamps } from "../../../../src/render3d/terrain/providers/OsmStreetLamps.js"
import { SURROUNDINGS_SOURCES, SurroundingsSources } from "../../../../src/render3d/terrain/surroundingsSources.js"

const BRAINE = { lat: 50.6055, lng: 4.1400 }
const METRES = 111320

/** A building outline, in metres east and north of the test place, as Overpass gives a way: a closed ring of latitudes and longitudes. */
function way(id: number, tags: Record<string, string>, east: number, north: number, width: number, depth: number): unknown {
  const point = (e: number, n: number): { lat: number, lon: number } => ({
    lat: BRAINE.lat + n / METRES, lon: BRAINE.lng + e / (METRES * Math.cos(BRAINE.lat * Math.PI / 180))
  })
  return { type: "way", id, tags: { building: "yes", ...tags },
    geometry: [point(east, north), point(east + width, north), point(east + width, north + depth), point(east, north + depth), point(east, north)] }
}

function overpass(elements: unknown[], base = "2026-10-13T08:51:51Z"): typeof fetch {
  return vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ elements, osm3s: { timestamp_osm_base: base } }) }) as Response) as unknown as typeof fetch
}

const provider = (elements: unknown[]): OsmBuildingsSurroundingsProvider =>
  new OsmBuildingsSurroundingsProvider({ fetchImpl: overpass(elements), endpoints: ["https://overpass.test/api"] })

describe("OsmBuildingsSurroundingsProvider", () => {
  it("covers everywhere, finds no tree, and says the day of the data", async () => {
    const found = await provider([way(1, {}, 10, 10, 12, 8)]).getSurroundings(BRAINE, 200)
    expect(new OsmBuildingsSurroundingsProvider().covers()).toBe(true)
    expect(found.trees).toEqual([])
    expect(found.buildings).toHaveLength(1)
    expect(found.dates).toEqual({ map: "2026-10-13" })
  })

  it("gives a building tagged with nothing the scene's ordinary measures, and a plaster", async () => {
    const [house] = (await provider([way(1, {}, 10, 10, 12, 8)]).getSurroundings(BRAINE, 200)).buildings
    expect(Math.max(house.widthM, house.lengthM)).toBeCloseTo(12, 0)
    expect(house.roof).toBeUndefined()
    expect(house.facade?.color).toMatch(/^#[0-9a-f]{6}$/)
  })

  it("reads the height to the roof, the walls' colour and material, the name and the roof's colour from the tags", async () => {
    const [house] = (await provider([way(1, {
      height: "14.5 m", "building:levels": "4", "building:colour": "#c0a37a", "building:material": "brick", "roof:colour": "red", name: "Hôtel de ville"
    }, 10, 10, 20, 10)]).getSurroundings(BRAINE, 200)).buildings
    expect(house.heightM).toBe(14.5)
    expect(house.name).toBe("Hôtel de ville")
    expect(house.wallMaterial).toBe("brick")
    // Its four levels make its storeys: 14.5 m over four.
    expect(house.facade).toEqual({ color: "#c0a37a", storeyM: 3.63 })
    expect(house.roof).toEqual({ shape: "flat", riseM: 0, color: "#a8483a" })
  })

  it("draws a church a volunteer tagged as one with a church's walls and roof, not a house's", async () => {
    const [church] = (await provider([way(1, { building: "church", height: "20" }, 10, 10, 40, 14)]).getSurroundings(BRAINE, 200)).buildings
    expect(church.style).toBe("church")
    expect(church.facade?.openings).toBe("lancet")
    expect(church.roof?.shape).toBe("gable")
  })

  it("draws a gabled roof on the walls the levels give, or on the height that is said to be to the ridge", async () => {
    const [byLevels] = (await provider([way(1, { "building:levels": "2", "roof:shape": "gabled" }, 10, 10, 14, 9)]).getSurroundings(BRAINE, 200)).buildings
    expect(byLevels.roof?.shape).toBe("gable")
    // Two levels of three metres, with the roof above them.
    expect(byLevels.heightM).toBeCloseTo(6 + byLevels.roof!.riseM!, 0)
    const [byHeight] = (await provider([way(2, { height: "10", "roof:shape": "hipped", "roof:height": "3" }, 10, 10, 14, 9)]).getSurroundings(BRAINE, 200)).buildings
    expect(byHeight.roof).toEqual({ shape: "hip", riseM: 3 })
    expect(byHeight.heightM).toBe(10)
    const [across] = (await provider([way(3, { "roof:shape": "gabled", "roof:orientation": "across" }, 10, 10, 14, 9)]).getSurroundings(BRAINE, 200)).buildings
    expect(across.roof?.ridge).toBe("depth")
  })

  it("leaves a roof shape it does not draw (a skillion, a dome) to the box, and a building that is not closed to nothing", async () => {
    const [skillion] = (await provider([way(1, { "roof:shape": "skillion" }, 10, 10, 14, 9)]).getSurroundings(BRAINE, 200)).buildings
    expect(skillion.roof).toBeUndefined()
    const open = way(2, {}, 30, 30, 10, 10) as { geometry: unknown[] }
    open.geometry.pop()
    expect((await provider([open]).getSurroundings(BRAINE, 200)).buildings).toHaveLength(0)
  })

  it("takes the outer outline of a relation, and keeps the nearest 300 when there are more", async () => {
    const outer = (way(5, {}, 10, 10, 14, 9) as { geometry: unknown[] }).geometry
    const relation = { type: "relation", id: 99, tags: { building: "yes", type: "multipolygon" }, members: [{ type: "way", role: "outer", geometry: outer }] }
    expect((await provider([relation]).getSurroundings(BRAINE, 200)).buildings).toHaveLength(1)
    const many = Array.from({ length: 330 }, (_, i) => way(1000 + i, {}, (i % 20) * 15, Math.floor(i / 20) * 15, 8, 8))
    const found = (await provider(many).getSurroundings(BRAINE, 400)).buildings
    expect(found.length).toBeLessThanOrEqual(300)
    expect(Math.hypot(found[0].eastM, found[0].northM)).toBeLessThan(Math.hypot(found.at(-1)!.eastM, found.at(-1)!.northM))
  })

  it("asks Overpass for the buildings round the place, and says it cannot be reached when it is not", async () => {
    const fetchImpl = overpass([])
    await new OsmBuildingsSurroundingsProvider({ fetchImpl, endpoints: ["https://overpass.test/api"] }).getSurroundings(BRAINE, 200)
    const url = decodeURIComponent(String((fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0]))
    expect(url).toContain(`way["building"](around:200,${BRAINE.lat},${BRAINE.lng})`)
    const down = vi.fn(async () => { throw new Error("offline") }) as unknown as typeof fetch
    await expect(new OsmBuildingsSurroundingsProvider({ fetchImpl: down, endpoints: ["https://overpass.test/api"] }).getSurroundings(BRAINE, 200)).rejects.toMatchObject({ reason: "unreachable" })
  })

  it("adds the lamps it is given, with the day they were asked", async () => {
    const lamps = new OsmStreetLamps({ fetchImpl: overpass([{ type: "node", lat: BRAINE.lat + 10 / METRES, lon: BRAINE.lng, tags: {} }]), endpoints: ["https://overpass.test/api"] })
    const found = await new OsmBuildingsSurroundingsProvider({ fetchImpl: overpass([]), endpoints: ["https://overpass.test/api"] }, lamps).getSurroundings(BRAINE, 200)
    expect(found.lamps).toHaveLength(1)
    expect(found.dates?.lamps).toBe(OsmStreetLamps.today())
  })
})

describe("SurroundingsSources outside France", () => {
  const NEW_MEXICO = { lat: 34.05, lng: -106.89 }

  it("offers the world's buildings", () => {
    expect(SURROUNDINGS_SOURCES.map(source => source.id)).toContain(SurroundingsSources.WORLD_ID)
  })

  it("gives the default where it reaches, with the world's buildings behind it for the corner of the box that holds a part of Belgium", () => {
    const france = SurroundingsSources.providerFor(undefined, 48.1, -1.07)!
    expect(france.id).toBe("ign-lidar-topo")
    expect(SurroundingsSources.providerFor(SurroundingsSources.DEFAULT_ID, BRAINE.lat, BRAINE.lng)?.covers(BRAINE.lat, BRAINE.lng)).toBe(true)
  })

  it("gives the world's buildings to a place the default does not reach, when none was chosen", () => {
    expect(SurroundingsSources.providerFor(undefined, NEW_MEXICO.lat, NEW_MEXICO.lng)?.id).toBe("osm-buildings")
  })

  it("gives an author who chose a source that source or nothing", () => {
    expect(SurroundingsSources.providerFor("ign-bd-topo", NEW_MEXICO.lat, NEW_MEXICO.lng)).toBeUndefined()
    expect(SurroundingsSources.providerFor("osm-buildings", 48.1, -1.07)?.id).toBe("osm-buildings")
    expect(SurroundingsSources.providerFor("none", 48.1, -1.07)).toBeUndefined()
  })
})
