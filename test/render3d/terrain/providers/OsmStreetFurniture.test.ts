import { beforeEach, describe, expect, it, vi } from "vitest"
import { OsmStreetFurniture } from "../../../../src/render3d/terrain/providers/OsmStreetFurniture.js"
import { SAINT_LO } from "./IgnSurvey.js"

const METRES = 111320
const COSINE = Math.cos(SAINT_LO.lat * Math.PI / 180)
const point = (east: number, north: number) => ({ lat: SAINT_LO.lat + north / METRES, lon: SAINT_LO.lng + east / (METRES * COSINE) })
const node = (id: number, east: number, north: number, tags: Record<string, string>) => ({ type: "node", id, ...point(east, north), tags })
const way = (id: number, tags: Record<string, string>, ...points: [number, number][]) => ({ type: "way", id, tags, geometry: points.map(([east, north]) => point(east, north)) })
/** A street six metres wide running east through the place, with a node of it at the place itself. */
const street = (tags: Record<string, string> = {}) => way(1, { highway: "residential", width: "6", ...tags }, [-50, 0], [0, 0], [50, 0])

describe("OsmStreetFurniture", () => {
  beforeEach(() => OsmStreetFurniture.forget())

  it("puts a traffic light on a two-way street at each kerb, before the node, each looking at the traffic it stops", () => {
    const { signals } = OsmStreetFurniture.from({ elements: [node(10, 0, 0, { highway: "traffic_signals" }), street()] }, SAINT_LO, 100)
    // Three metres of half-width and 0.6 of kerb: the head for the traffic going east is on its right (south), half a metre before the node, looking west.
    expect(signals).toEqual([
      { eastM: -0.5, northM: -3.6, headingDeg: 270, for: "vehicles", phase: 1 },
      { eastM: 0.5, northM: 3.6, headingDeg: 90, for: "vehicles", phase: 1 }
    ])
  })

  it("puts one on a one-way street, and one where the map says which way it is for", () => {
    expect(OsmStreetFurniture.from({ elements: [node(10, 0, 0, { highway: "traffic_signals" }), street({ oneway: "yes" })] }, SAINT_LO, 100).signals).toHaveLength(1)
    const backward = OsmStreetFurniture.from({ elements: [node(10, 0, 0, { highway: "traffic_signals", "traffic_signals:direction": "backward" }), street()] }, SAINT_LO, 100).signals
    expect(backward?.map(signal => signal.headingDeg)).toEqual([90])
  })

  it("puts a head on each road of a junction, the crossing road in the other phase", () => {
    const across = way(2, { highway: "residential", width: "6" }, [0, -50], [0, 0], [0, 50])
    const { signals } = OsmStreetFurniture.from({ elements: [node(10, 0, 0, { highway: "traffic_signals" }), street(), across] }, SAINT_LO, 100)
    expect(signals).toHaveLength(4)
    expect(signals!.map(signal => signal.phase).sort()).toEqual([0, 0, 1, 1])
  })

  it("lays a crossing across the road at its node, as wide as the road and along it, and none the map says is unmarked", () => {
    const { crossings } = OsmStreetFurniture.from({ elements: [node(10, 0, 0, { highway: "crossing", crossing: "marked" }), street()] }, SAINT_LO, 100)
    expect(crossings).toEqual([{ eastM: 0, northM: 0, headingDeg: 90, widthM: 6 }])
    expect(OsmStreetFurniture.from({ elements: [node(10, 0, 0, { highway: "crossing", crossing: "unmarked" }), street()] }, SAINT_LO, 100).crossings).toBeUndefined()
  })

  it("gives a crossing with lights a pedestrian's head at each kerb, each looking across the road", () => {
    const { signals } = OsmStreetFurniture.from({ elements: [node(10, 0, 0, { highway: "crossing", crossing: "traffic_signals" }), street()] }, SAINT_LO, 100)
    expect(signals).toEqual([
      { eastM: 0, northM: -3.6, headingDeg: 0, for: "pedestrians", phase: 1 },
      { eastM: 0, northM: 3.6, headingDeg: 180, for: "pedestrians", phase: 1 }
    ])
  })

  it("lays a crossing the map draws as a footway's line across the road at its middle, once when it has a node as well", () => {
    const footway = way(3, { highway: "footway", footway: "crossing" }, [20, -4], [20, 4])
    expect(OsmStreetFurniture.from({ elements: [footway] }, SAINT_LO, 100).crossings).toEqual([{ eastM: 20, northM: 0, headingDeg: 90, widthM: 8 }])
    const both = OsmStreetFurniture.from({ elements: [footway, node(10, 20, 0, { highway: "crossing" }), way(1, { highway: "residential" }, [0, 0], [20, 0], [50, 0])] }, SAINT_LO, 100)
    expect(both.crossings).toHaveLength(1)
  })

  it("puts a stop at the kerb of the traffic coming to the nearer end of its road, facing it", () => {
    const { signs } = OsmStreetFurniture.from({ elements: [node(10, 45, 0, { highway: "stop" }), way(1, { highway: "residential", width: "6" }, [-50, 0], [45, 0], [50, 0])] }, SAINT_LO, 100)
    expect(signs).toEqual([{ eastM: 44.5, northM: -3.6, headingDeg: 270, face: "stop" }])
  })

  it("reads the face of a sign from its code, and places one beside the road only where the map says which way it faces", () => {
    expect(OsmStreetFurniture.faceOf({ traffic_sign: "FR:B14[50]" })).toEqual({ face: "speed-limit", value: 50 })
    expect(OsmStreetFurniture.faceOf({ traffic_sign: "FR:AB4" })).toEqual({ face: "stop" })
    expect(OsmStreetFurniture.faceOf({ traffic_sign: "FR:AB3a;FR:M9z" })).toEqual({ face: "give-way" })
    expect(OsmStreetFurniture.faceOf({ traffic_sign: "FR:C12" })).toEqual({ face: "other" })
    const beside = OsmStreetFurniture.from({ elements: [node(10, 5, 8, { traffic_sign: "FR:C12", direction: "N" }), node(11, 9, 8, { traffic_sign: "FR:C12" })] }, SAINT_LO, 100)
    expect(beside.signs).toEqual([{ eastM: 5, northM: 8, headingDeg: 180, face: "other", code: "FR:C12" }])
  })

  it("does not draw the lamps of a lit street twice when the street comes back as the road of a light", () => {
    const lit = street({ lit: "yes" })
    const once = OsmStreetFurniture.from({ elements: [lit] }, SAINT_LO, 100).lamps
    expect(OsmStreetFurniture.from({ elements: [lit, node(10, 0, 0, { highway: "traffic_signals" }), lit] }, SAINT_LO, 100).lamps).toEqual(once)
  })

  it("keeps an answer that came after the survey stopped waiting, for the next survey of the place, which asks nothing again", async () => {
    vi.useFakeTimers()
    try {
      let answer: (value: Response) => void = () => {}
      const fetchImpl = vi.fn(() => new Promise<Response>(resolve => { answer = resolve })) as unknown as typeof fetch
      const furniture = new OsmStreetFurniture({ fetchImpl, endpoints: ["https://overpass.test/api"] })
      const first = furniture.near(SAINT_LO, 100)
      await vi.advanceTimersByTimeAsync(20000)
      expect(await first).toEqual({ incomplete: true })
      answer({ ok: true, status: 200, json: async () => ({ elements: [node(10, 0, 0, { highway: "traffic_signals" }), street()] }) } as Response)
      await vi.advanceTimersByTimeAsync(0)
      expect((await furniture.near(SAINT_LO, 100)).signals).toHaveLength(2)
      expect((fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it("asks again after longer and longer waits when Overpass fails, and gives the furniture when it answers", async () => {
    vi.useFakeTimers()
    try {
      let calls = 0
      const fetchImpl = vi.fn(async () => {
        calls++
        if (calls < 3) throw new Error("down")
        return { ok: true, status: 200, json: async () => ({ elements: [node(10, 0, 0, { highway: "traffic_signals" }), street()] }) } as Response
      }) as unknown as typeof fetch
      const answered = new OsmStreetFurniture({ fetchImpl, endpoints: ["https://overpass.test/api"] }).answered(SAINT_LO, 100)
      await vi.advanceTimersByTimeAsync(OsmStreetFurniture.RETRY_DELAYS_MS[0] + OsmStreetFurniture.RETRY_DELAYS_MS[1] + 10)
      expect((await answered).signals).toHaveLength(2)
      expect(calls).toBe(3)
    } finally {
      vi.useRealTimers()
    }
  })

  it("gives up for now after its last try, and starts over when asked again", async () => {
    vi.useFakeTimers()
    try {
      const fetchImpl = vi.fn(async () => { throw new Error("down") }) as unknown as typeof fetch
      const furniture = new OsmStreetFurniture({ fetchImpl, endpoints: ["https://overpass.test/api"] })
      const answered = furniture.answered(SAINT_LO, 100)
      const failed = expect(answered).rejects.toThrow("did not answer")
      await vi.advanceTimersByTimeAsync(OsmStreetFurniture.RETRY_DELAYS_MS.reduce((sum, ms) => sum + ms, 0) + 10)
      await failed
      expect((fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(OsmStreetFurniture.RETRY_DELAYS_MS.length + 1)
    } finally {
      vi.useRealTimers()
    }
  })

  it("asks for everything in one question, with the roads the furniture stands on", async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ elements: [node(10, 0, 0, { highway: "traffic_signals" }), street()] }) }) as Response) as unknown as typeof fetch
    const found = await new OsmStreetFurniture({ fetchImpl, endpoints: ["https://overpass.test/api"] }).near(SAINT_LO, 100)
    expect(found.signals).toHaveLength(2)
    expect((fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1)
    const url = decodeURIComponent(String((fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0]))
    expect(url).toContain('node["highway"="street_lamp"]')
    expect(url).toContain('way(bn.kerb)["highway"]')
  })
})
