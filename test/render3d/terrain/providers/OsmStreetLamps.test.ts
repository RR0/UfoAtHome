import { beforeEach, describe, expect, it, vi } from "vitest"
import { OsmStreetLamps } from "../../../../src/render3d/terrain/providers/OsmStreetLamps.js"
import { OsmStreetFurniture } from "../../../../src/render3d/terrain/providers/OsmStreetFurniture.js"
import { IgnTopoSurroundingsProvider } from "../../../../src/render3d/terrain/providers/IgnTopoSurroundingsProvider.js"
import { SAINT_LO, Survey } from "./IgnSurvey.js"

const METRES = 111320
const at = (east: number, north: number, tags: Record<string, string> = { highway: "street_lamp" }): { type: string, lat: number, lon: number, tags: Record<string, string> } =>
  ({ type: "node", lat: SAINT_LO.lat + north / METRES, lon: SAINT_LO.lng + east / (METRES * Math.cos(SAINT_LO.lat * Math.PI / 180)), tags })

function overpass(elements: unknown[]): typeof fetch {
  return vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ elements }) }) as Response) as unknown as typeof fetch
}

describe("OsmStreetLamps", () => {
  beforeEach(() => OsmStreetFurniture.forget())

  it("gives each mapped lamp at its place in metres, nearest first, and not those outside the circle", () => {
    const lamps = OsmStreetLamps.lampsFrom({ elements: [at(30, 40), at(-5, 3), at(300, 0)] }, SAINT_LO, 100)
    expect(lamps).toEqual([{ eastM: -5, northM: 3 }, { eastM: 30, northM: 40 }])
  })

  it("takes a height the map states within what a lamp can be, and ignores one it cannot", () => {
    const lamps = OsmStreetLamps.lampsFrom({ elements: [at(1, 1, { highway: "street_lamp", height: "8" }), at(2, 2, { highway: "street_lamp", height: "800" }), at(3, 3, { highway: "street_lamp", height: "high" })] }, SAINT_LO, 50)
    expect(lamps.map(lamp => lamp.heightM)).toEqual([8, undefined, undefined])
  })

  it("asks Overpass for the lamps of the square, and says the survey is not whole when it cannot be reached", async () => {
    const fetchImpl = overpass([at(10, 10)])
    const { lamps } = await new OsmStreetFurniture({ fetchImpl, endpoints: ["https://overpass.test/api"] }).near(SAINT_LO, 100)
    expect(lamps).toHaveLength(1)
    const url = decodeURIComponent(String((fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0]))
    expect(url).toContain('node["highway"="street_lamp"]')
    // The page keeps what it was told of the square: a page that never asked it before.
    OsmStreetFurniture.forget()
    const down = vi.fn(async () => { throw new Error("offline") }) as unknown as typeof fetch
    expect(await new OsmStreetFurniture({ fetchImpl: down, endpoints: ["https://overpass.test/api"] }).near(SAINT_LO, 100)).toEqual({ incomplete: true })
  })

  it("is added to a survey that is given it, and absent from one that is not", async () => {
    const survey = new Survey(40)
    const lamps = new OsmStreetFurniture({ fetchImpl: overpass([at(10, 10)]), endpoints: ["https://overpass.test/api"] })
    expect((await new IgnTopoSurroundingsProvider({ fetchImpl: survey.fetch() }, lamps).getSurroundings(SAINT_LO, 40)).lamps).toHaveLength(1)
    expect((await new IgnTopoSurroundingsProvider({ fetchImpl: survey.fetch() }).getSurroundings(SAINT_LO, 40)).lamps).toBeUndefined()
  })

  it("draws a lamp every so many metres along a street the map says is lit, on alternate sides a kerb off its edge, and none along an unlit one", () => {
    const street = (tags: Record<string, string>): { type: string, tags: Record<string, string>, geometry: { lat: number, lon: number }[] } => ({
      type: "way", tags,
      geometry: [0, 100].map(east => ({ lat: SAINT_LO.lat, lon: SAINT_LO.lng + east / (METRES * Math.cos(SAINT_LO.lat * Math.PI / 180)) }))
    })
    const lamps = OsmStreetLamps.lampsFrom({ elements: [street({ highway: "residential", lit: "yes", width: "6" })] }, SAINT_LO, 200)
    // A street of 100 m: the first lamp at half a spacing, then each spacing on.
    expect(lamps).toHaveLength(3)
    expect(lamps.map(lamp => Math.round(lamp.eastM))).toEqual([18, 53, 88])
    // Three metres of half-width and one of kerb: 4 m off the axis (a street running east, so the offset is north or south), alternately.
    expect(lamps.map(lamp => lamp.northM)).toEqual([-4, 4, -4])
    expect(OsmStreetLamps.lampsFrom({ elements: [] }, SAINT_LO, 200)).toEqual([])
  })

  it("does not hold a survey up for an instance that does not answer: it goes on without the lamps after a few seconds", async () => {
    vi.useFakeTimers()
    try {
      const hung = vi.fn(() => new Promise<Response>(() => {})) as unknown as typeof fetch
      const lamps = new OsmStreetFurniture({ fetchImpl: hung, endpoints: ["https://overpass.test/api"] }).near(SAINT_LO, 100)
      await vi.advanceTimersByTimeAsync(OsmStreetLamps.PATIENCE_MS + 10)
      expect(await lamps).toEqual({ incomplete: true })
    } finally {
      vi.useRealTimers()
    }
  })
})
