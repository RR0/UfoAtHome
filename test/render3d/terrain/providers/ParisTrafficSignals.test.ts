import { beforeEach, describe, expect, it, vi } from "vitest"
import { ParisTrafficSignals } from "../../../../src/render3d/terrain/providers/ParisTrafficSignals.js"
import { OsmStreetFurniture } from "../../../../src/render3d/terrain/providers/OsmStreetFurniture.js"
import type { RoadProvider, RoadWay } from "../../../../src/render3d/terrain/RoadProvider.js"

const CENTRE = { lat: 48.85335, lng: 2.34775 }
const METRES = 111320
const at = (east: number, north: number) => ({ lat: CENTRE.lat + north / METRES, lng: CENTRE.lng + east / (METRES * Math.cos(CENTRE.lat * Math.PI / 180)) })
const lens = (east: number, north: number, regime: string) => { const point = at(east, north); return { geo_point_2d: { lat: point.lat, lon: point.lng }, lib_regime: `REGIME ${regime}` } }
/** A street running north through the place. */
const street = (direction?: RoadWay["direction"]): RoadWay => ({ id: "s", surface: "paved", widthM: 8, points: [at(0, -100), at(0, 100)], ...(direction ? { direction } : {}) })
const roads = (...ways: RoadWay[]): RoadProvider => ({ attribution: "", contemporary: true, getRoads: async () => ways })

describe("ParisTrafficSignals", () => {
  beforeEach(() => OsmStreetFurniture.forget())

  it("puts one traffic head on each post, looking at the traffic that comes on its side of the street", () => {
    const signals = ParisTrafficSignals.signalsFrom([lens(5, 0, "ROUGE"), lens(5, 0, "JAUNE"), lens(5, 0, "VERT"), lens(5.2, 0, "ROUGE"), lens(-5, 10, "VERT")], [street()], CENTRE)
    // East of a street going north is the right of the traffic going north: its head looks south at it. West, the traffic going south.
    expect(signals).toEqual([
      { eastM: 5, northM: 0, headingDeg: 180, for: "vehicles", phase: 0 },
      { eastM: -5, northM: 10, headingDeg: 0, for: "vehicles", phase: 0 }
    ])
  })

  it("looks at the only way the traffic comes on a one-way street, whichever side the post is on", () => {
    const signals = ParisTrafficSignals.signalsFrom([lens(5, 0, "ROUGE"), lens(-5, 10, "VERT")], [street("backward")], CENTRE)
    expect(signals.map(signal => signal.headingDeg)).toEqual([0, 0])
  })

  it("turns a pedestrian's head across the street, a little along the kerb from the traffic's of the same post, in the other phase", () => {
    const signals = ParisTrafficSignals.signalsFrom([lens(5, 0, "ROUGE"), lens(5, 0, "ATTENDEZ"), lens(5, 0, "PASSEZ"), lens(-5, 20, "PASSEZ")], [street()], CENTRE)
    const pedestrians = signals.filter(signal => signal.for === "pedestrians")
    expect(pedestrians).toEqual([
      { eastM: 5, northM: 0.4, headingDeg: 270, for: "pedestrians", phase: 0 },
      { eastM: -5, northM: 20, headingDeg: 90, for: "pedestrians", phase: 0 }
    ])
  })

  it("leaves out a post with no street near enough to say which way it looks", () => {
    expect(ParisTrafficSignals.signalsFrom([lens(ParisTrafficSignals.SEARCH_M + 5, 0, "ROUGE")], [street()], CENTRE)).toEqual([])
  })

  it("asks for the lenses nearest first and the roads round the place, and its heads replace the map's, credited", async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ results: [lens(5, 0, "ROUGE")] }) }) as Response) as unknown as typeof fetch
    const paris = new ParisTrafficSignals(roads(street()), fetchImpl)
    expect(paris.covers(CENTRE.lat, CENTRE.lng)).toBe(true)
    expect(paris.covers(49.1156, -1.0905)).toBe(false)
    const down = vi.fn(async () => { throw new Error("down") }) as unknown as typeof fetch
    const found = await new OsmStreetFurniture({ fetchImpl: down, endpoints: ["https://overpass.test/api"] }, [], [paris]).near(CENTRE, 150)
    expect(found).toEqual({ signals: [{ eastM: 5, northM: 0, headingDeg: 180, for: "vehicles", phase: 0 }], credits: [paris.credit], incomplete: true })
    const url = decodeURIComponent(String((fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0]).replace(/\+/g, " "))
    expect(url).toContain("signalisation-tricolore")
    expect(url).toContain("order_by=distance(geo_point_2d,geom'POINT(2.347750 48.853350)')")
  })
})
