import { describe, expect, it, vi } from "vitest"
import { SurroundingsUnavailableError } from "../../../../src/render3d/terrain/SurroundingsProvider.js"
import { IgnLidarSurroundingsProvider } from "../../../../src/render3d/terrain/providers/IgnLidarSurroundingsProvider.js"
import { TiffFixture } from "../TiffFixture.js"
import { Scene } from "../Scene.js"

const SAINT_LO = { lat: 49.10489, lng: -1.075382 }
const GREEN = [70, 150, 60, 255]
const GROUND = [207, 150, 70, 255]
const ROOF = [180, 20, 20, 255]

/** The vectors of the map a place has, by layer, as a WFS answers in GeoJSON. */
type Vectors = Partial<Record<"construction_lineaire" | "troncon_de_route" | "ligne_electrique", unknown[]>>

/** What the service answers for a square of `size` pixels: heights, the picture of what each pixel is, and the vectors of the map. */
class Survey {
  readonly heights: number[]
  readonly pictures: number[]
  vectors: Vectors = {}
  /** The map does not answer. */
  mapDown = false

  constructor(readonly size: number, fill = 0) {
    this.heights = new Array(size * size).fill(fill)
    this.pictures = new Array(size * size).fill(0).flatMap(() => GROUND)
  }

  /** A square block of `side` pixels at (x, y) of this height, of this kind of thing. */
  block(x: number, y: number, side: number, height: number, picture: number[]): this {
    for (let j = y; j < y + side; j++) {
      for (let i = x; i < x + side; i++) {
        this.heights[j * this.size + i] = height
        this.pictures.splice((j * this.size + i) * 4, 4, ...picture)
      }
    }
    return this
  }

  /** The fetch of a service that answers each layer of this survey, and records what it was asked. */
  fetch(): typeof fetch {
    return vi.fn(async (url: string) => {
      const parameters = new URL(url).searchParams
      if (parameters.get("SERVICE") === "WFS") {
        if (this.mapDown) return { ok: false, status: 503, json: async () => ({}) } as Response
        const layer = (parameters.get("TYPENAMES") ?? "").replace("BDTOPO_V3:", "") as keyof Vectors
        return { ok: true, status: 200, json: async () => ({ features: this.vectors[layer] ?? [] }) } as Response
      }
      const layer = parameters.get("LAYERS") ?? ""
      const body = layer.includes("CLASS") ? TiffFixture.bytes(this.size, this.size, 4, this.pictures) : TiffFixture.floats(this.size, this.size, this.heights)
      return { ok: true, status: 200, arrayBuffer: async () => body } as Response
    }) as unknown as typeof fetch
  }
}

/** A LineString feature from points given as metres east and north of the test place, longitude then latitude as the map has them. */
function line(properties: Record<string, unknown>, ...points: [number, number][]): unknown {
  const metres = 111320
  return {
    type: "Feature", properties,
    geometry: { type: "LineString", coordinates: points.map(([east, north]) => [SAINT_LO.lng + east / (metres * Math.cos(SAINT_LO.lat * Math.PI / 180)), SAINT_LO.lat + north / metres]) }
  }
}

describe("IgnLidarSurroundingsProvider", () => {
  it("asks for the height model and the classification of the same square, latitude first", async () => {
    const fetchImpl = new Survey(40).fetch()
    await new IgnLidarSurroundingsProvider({ fetchImpl }).getSurroundings(SAINT_LO, 10)
    const urls = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls.map(call => new URL(String(call[0]))).filter(url => url.searchParams.get("SERVICE") === "WMS")
    expect(urls.map(url => url.searchParams.get("LAYERS")).sort()).toEqual(["IGNF_LIDAR-HD_CLASS", "IGNF_LIDAR-HD_MNH_ELEVATION.ELEVATIONGRIDCOVERAGE.LAMB93"])
    expect(urls[0].searchParams.get("BBOX")).toBe(urls[1].searchParams.get("BBOX"))
    const [south, west, north, east] = urls[0].searchParams.get("BBOX")!.split(",").map(Number)
    // WMS 1.3.0 gives the axes of EPSG:4326 as latitude then longitude.
    expect(south).toBeLessThan(SAINT_LO.lat)
    expect(north).toBeGreaterThan(SAINT_LO.lat)
    expect(west).toBeLessThan(SAINT_LO.lng)
    expect(east).toBeGreaterThan(SAINT_LO.lng)
    // Half a metre a pixel: 20 m across is 40 pixels.
    expect(urls[0].searchParams.get("WIDTH")).toBe("40")
  })

  it("takes a tree where the classification says plant and a building where it says roof, never the one for the other", async () => {
    // 100 pixels of 0.5 m. A tree 8 m east of the middle, and a house of the same height 8 m west.
    const survey = new Survey(100).block(66, 46, 8, 12, GREEN).block(18, 40, 16, 12, ROOF)
    const { trees, buildings } = await new IgnLidarSurroundingsProvider({ fetchImpl: survey.fetch() }).getSurroundings(SAINT_LO, 25)
    expect(trees).toHaveLength(1)
    expect(trees[0].eastM).toBeGreaterThan(3)
    expect(trees[0].heightM).toBeCloseTo(12, 0)
    expect(buildings).toHaveLength(1)
    expect(buildings[0].eastM).toBeLessThan(-3)
    expect(buildings[0].heightM).toBeCloseTo(12, 0)
  })

  it("asks the map for its bridges, the roads that are over the ground and its electric lines, longitude first, by a filter", async () => {
    const fetchImpl = new Survey(40).fetch()
    await new IgnLidarSurroundingsProvider({ fetchImpl }).getSurroundings(SAINT_LO, 10)
    const maps = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls.map(call => new URL(String(call[0]))).filter(url => url.searchParams.get("SERVICE") === "WFS")
    expect(maps.map(url => url.searchParams.get("TYPENAMES")).sort()).toEqual(["BDTOPO_V3:construction_lineaire", "BDTOPO_V3:ligne_electrique", "BDTOPO_V3:troncon_de_route"])
    const bridges = decodeURIComponent(maps.find(url => url.searchParams.get("TYPENAMES")?.includes("construction"))!.searchParams.get("CQL_FILTER")!)
    expect(bridges).toContain("nature='Pont'")
    // BBOX(geometrie, west, south, east, north): this service has the longitude first.
    const [west, south, east, north] = /BBOX\(geometrie,([^,]+),([^,]+),([^,]+),([^,]+),/.exec(bridges)!.slice(1).map(Number)
    expect(west).toBeLessThan(SAINT_LO.lng)
    expect(east).toBeGreaterThan(SAINT_LO.lng)
    expect(south).toBeLessThan(SAINT_LO.lat)
    expect(north).toBeGreaterThan(SAINT_LO.lat)
  })

  it("gives a bridge its length and direction from the map, its width from the road it carries, and the height of its deck from the laser", async () => {
    // A 40 m bridge running east, over a deck the laser measured at 6 m, carrying a road 7 m wide.
    const survey = new Survey(100).block(30, 48, 40, 6, [240, 240, 0, 255])
    survey.vectors = {
      construction_lineaire: [line({ nature: "Pont" }, [-20, 0], [20, 0])],
      troncon_de_route: [line({ nature: "Route à 1 chaussée", largeur_de_chaussee: 7, position_par_rapport_au_sol: "1" }, [-30, 0], [30, 0])]
    }
    const { bridges } = await new IgnLidarSurroundingsProvider({ fetchImpl: survey.fetch() }).getSurroundings(SAINT_LO, 25)
    expect(bridges).toHaveLength(1)
    expect(bridges[0].lengthM).toBeCloseTo(40, 0)
    expect(bridges[0].headingDeg).toBeCloseTo(90, 0)
    expect(bridges[0].widthM).toBeCloseTo(9.4, 1)
    expect(bridges[0].heightM).toBeCloseTo(6, 0)
  })

  it("gives each span of an electric line its voltage's build, and passes by a line that is not under tension", async () => {
    const survey = new Survey(100)
    survey.vectors = {
      ligne_electrique: [
        line({ voltage: "90 kV" }, [-60, 15], [0, 15], [60, 18]),
        line({ voltage: "Hors tension" }, [-60, -15], [60, -15])
      ]
    }
    const { lines } = await new IgnLidarSurroundingsProvider({ fetchImpl: survey.fetch() }).getSurroundings(SAINT_LO, 25)
    expect(lines).toHaveLength(2)
    expect(lines.every(span => span.voltage === "90 kV")).toBe(true)
    expect(lines[0].lengthM).toBeCloseTo(60, 0)
    // Nothing measured the poles: the ordinary 90 kV pylon, its conductors 3.5 m below its top.
    expect(lines[0].poleHeightM).toBe(22)
    expect(lines[0].heightM).toBeCloseTo(18.5, 1)
    expect(lines[0].acrossM).toEqual([-3.5, 0, 3.5])
  })

  it("takes the height of a pole from the laser where it measured one, and not a tree's", async () => {
    // A 19 m pylon at the east end of the span, and a 25 m tree beside the west end, which is not a structure.
    const survey = new Survey(100).block(89, 49, 2, 19, GROUND).block(8, 48, 4, 25, GREEN)
    survey.vectors = { ligne_electrique: [line({ voltage: "63 kV" }, [-20, 0], [20, 0])] }
    const { lines } = await new IgnLidarSurroundingsProvider({ fetchImpl: survey.fetch() }).getSurroundings(SAINT_LO, 25)
    expect(lines[0].poleHeightM).toBeCloseTo(19, 0)
  })

  it("still gives the trees and the buildings when the map does not answer", async () => {
    const survey = new Survey(100).block(66, 46, 8, 12, GREEN)
    survey.mapDown = true
    const found = await new IgnLidarSurroundingsProvider({ fetchImpl: survey.fetch() }).getSurroundings(SAINT_LO, 25)
    expect(found.trees).toHaveLength(1)
    expect(found.bridges).toEqual([])
    expect(found.lines).toEqual([])
  })

  it("tells a place the survey does not cover from a place with no tree", async () => {
    await expect(new IgnLidarSurroundingsProvider({ fetchImpl: new Survey(40, -9999).fetch() }).getSurroundings(SAINT_LO, 10))
      .rejects.toMatchObject({ reason: "no-coverage" })
    await expect(new IgnLidarSurroundingsProvider({ fetchImpl: new Survey(40, 0).fetch() }).getSurroundings(SAINT_LO, 10)).resolves.toEqual(Scene.of([], []))
  })

  it("does not ask for what it cannot cover", async () => {
    const fetchImpl = new Survey(40).fetch()
    const provider = new IgnLidarSurroundingsProvider({ fetchImpl })
    // A box round France, which is only a first filter: Brussels is inside it, and it is the survey that answers "nothing here".
    expect(provider.covers(40.4, -3.7)).toBe(false)
    expect(provider.covers(40.7, -74)).toBe(false)
    await expect(provider.getSurroundings({ lat: 40.4, lng: -3.7 }, 10)).rejects.toBeInstanceOf(SurroundingsUnavailableError)
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it("says the service is unreachable when it does not answer, or answers something else", async () => {
    const down = vi.fn(async () => { throw new Error("offline") }) as unknown as typeof fetch
    await expect(new IgnLidarSurroundingsProvider({ fetchImpl: down }).getSurroundings(SAINT_LO, 10)).rejects.toMatchObject({ reason: "unreachable" })
    const html = vi.fn(async () => ({ ok: true, status: 200, arrayBuffer: async () => new TextEncoder().encode("<html>busy</html>").buffer }) as Response) as unknown as typeof fetch
    await expect(new IgnLidarSurroundingsProvider({ fetchImpl: html }).getSurroundings(SAINT_LO, 10)).rejects.toMatchObject({ reason: "unreachable" })
  })

  it("says plainly that its trees and buildings are those of the survey, not of the recording's day", () => {
    const provider = new IgnLidarSurroundingsProvider()
    expect(provider.contemporary).toBe(true)
    expect(provider.attribution).toContain("IGN")
  })
})
