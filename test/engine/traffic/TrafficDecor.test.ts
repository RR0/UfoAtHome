import { describe, expect, test } from "vitest"
import type { AircraftPoint, AircraftTrack } from "../../../src/engine/traffic/AircraftProvider.js"
import { AircraftModels } from "../../../src/engine/traffic/AircraftModels.js"
import { TrafficDecor } from "../../../src/engine/traffic/TrafficDecor.js"

const observer = { lat: 48, lng: 2, heightM: 0 }
const START = Date.UTC(2025, 11, 30, 12)
const FL350_M = 35000 * 0.3048

class Tracks {
  static of(icao: number, ...points: Partial<AircraftPoint>[]): AircraftTrack {
    return { icao, nonIcao: false, points: points.map(point => ({ t: START, lat: 48, lng: 2, altitudeFt: 35000, ...point })) }
  }

  /** Flying east at the observer's latitude, `kmEast` km from them, over `seconds` s from `fromS`. */
  static eastbound(icao: number, kmEast: number, fromS: number, seconds: number, altitudeFt = 35000): AircraftTrack {
    const dLng = kmEast / (111.32 * Math.cos((48 * Math.PI) / 180))
    const points: Partial<AircraftPoint>[] = []
    for (let s = fromS; s <= fromS + seconds; s += 5) points.push({ t: START + s * 1000, lng: 2 + dLng + (s - fromS) * 0.0001, altitudeFt })
    return Tracks.of(icao, ...points)
  }
}

describe("TrafficDecor", () => {
  test("an aircraft becomes a moving decor object of kind aircraft, with an airliner's lamps", () => {
    const set = TrafficDecor.from([Tracks.eastbound(0xabc123, 30, 0, 30)], observer, START)
    expect(set.shown).toBe(1)
    const [object] = set.objects
    expect(object).toMatchObject({ id: "traffic-abc123-0", kind: "aircraft" })
    expect(object.track).toHaveLength(7)
    expect(object.lights!.map(light => light.id)).toContain("strobe-port")
    expect(object.lights!.filter(light => light.pattern.kind === "flash")).toHaveLength(4)
  })

  test("an aircraft of a type that has a model names it, for the renderer to draw it with when it is near; any other keeps the built-in shape", () => {
    const track = Tracks.eastbound(0xabc123, 30, 0, 30)
    const named = (code: string) => TrafficDecor.from([track], observer, START, undefined, { models: new Map([["abc123", AircraftModels.of({ type: code })]]) }).objects[0]
    expect(named("A320").model).toEqual({ id: "amvlab-a320" })
    expect(named("B738").model).toEqual({ id: "amvlab-b737" })
    expect(named("B77W").model).toBeUndefined()
    expect(TrafficDecor.from([track], observer, START).objects[0].model).toBeUndefined()
  })

  test("its keyframes are in ms from the start of the recording, and it exists only between the first and the last", () => {
    const set = TrafficDecor.from([Tracks.eastbound(1, 30, 10, 20)], observer, START)
    const [object] = set.objects
    expect(object.track![0].t).toBe(10_000)
    expect(object.track![object.track!.length - 1].t).toBe(30_000)
    expect(set.presence.get(object.id)).toEqual({ fromMs: 10_000, untilMs: 30_000 })
  })

  test("an aircraft overhead is placed straight above the observer, at its height", () => {
    const [object] = TrafficDecor.from([Tracks.of(1, { t: START }, { t: START + 5000 })], observer, START).objects
    expect(Math.abs(object.track![0].eastM)).toBeLessThan(1)
    expect(Math.abs(object.track![0].northM)).toBeLessThan(1)
    expect(object.track![0].altitudeM).toBeCloseTo(FL350_M, -1)
  })

  test("one 100 km off is east of the observer and lower than its altitude, by the Earth's curvature", () => {
    const [object] = TrafficDecor.from([Tracks.eastbound(1, 100, 0, 10)], observer, START).objects
    const first = object.track![0]
    expect(first.eastM).toBeGreaterThan(99_000)
    expect(Math.abs(first.northM)).toBeLessThan(1500)
    // 100^2 / (2 x 6371) = 0.78 km under the tangent plane.
    expect(first.altitudeM).toBeGreaterThan(FL350_M - 900)
    expect(first.altitudeM).toBeLessThan(FL350_M - 650)
  })

  test("it heads the way the record says, or the way it goes", () => {
    const stated = Tracks.of(1, { t: START, trackDeg: 123 }, { t: START + 5000, trackDeg: 125 })
    expect(TrafficDecor.from([stated], observer, START).objects[0].track!.map(keyframe => keyframe.headingDeg)).toEqual([123, 125])
    const east = TrafficDecor.from([Tracks.eastbound(2, 30, 0, 10)], observer, START).objects[0]
    for (const keyframe of east.track!) expect(keyframe.headingDeg).toBeCloseTo(90, 0)
  })

  test("a gap in the record makes two flights, not a line across what nobody recorded", () => {
    const a = Tracks.eastbound(1, 30, 0, 20)
    const b = Tracks.eastbound(1, 30, 200, 20)
    const set = TrafficDecor.from([{ ...a, points: [...a.points, ...b.points] }], observer, START)
    expect(set.objects.map(object => object.id)).toEqual(["traffic-000001-0", "traffic-000001-1"])
    expect(set.presence.get("traffic-000001-0")!.untilMs).toBeLessThan(set.presence.get("traffic-000001-1")!.fromMs)
  })

  test("an aircraft that never rises above the horizon is not drawn, nor is one position alone", () => {
    const below = Tracks.of(1, { t: START, lat: 50.7, altitudeFt: 500 }, { t: START + 5000, lat: 50.7, altitudeFt: 500 })
    const alone = Tracks.of(2, { t: START })
    const set = TrafficDecor.from([below, alone], observer, START)
    expect(set.objects).toHaveLength(0)
    expect(set.total).toBe(0)
  })

  test("beyond the most that are drawn, the nearest are kept, and the count says how many there were", () => {
    const tracks = [Tracks.eastbound(1, 120, 0, 10), Tracks.eastbound(2, 20, 0, 10), Tracks.eastbound(3, 60, 0, 10)]
    const set = TrafficDecor.from(tracks, observer, START, 2)
    expect(set.total).toBe(3)
    expect(set.shown).toBe(2)
    expect(set.objects.map(object => object.id)).toEqual(["traffic-000002-0", "traffic-000003-0"])
  })

  test("a pseudo-address does not collide with an aircraft's own", () => {
    const own = Tracks.eastbound(0x123abc, 30, 0, 10)
    const pseudo = { ...Tracks.eastbound(0x123abc, 40, 0, 10), nonIcao: true }
    const ids = TrafficDecor.from([own, pseudo], observer, START).objects.map(object => object.id)
    expect(new Set(ids).size).toBe(2)
  })

  describe("what each aircraft is", () => {
    const models = (type: string, category?: string) => new Map([[TrafficDecor.keyOf({ icao: 1, nonIcao: false }), AircraftModels.of({ type, category })]])

    test("its size is its type's real one, and its colour is a livery's", () => {
      const [object] = TrafficDecor.from([Tracks.eastbound(1, 30, 0, 20)], observer, START, 40, { models: models("B77W") }).objects
      expect(object.sizeM).toMatchObject({ widthM: 64.8, lengthM: 73.9 })
      expect(object.color).toBe("#dde0e4")
    })

    test("an aircraft of unknown type is a generic airliner", () => {
      const [object] = TrafficDecor.from([Tracks.eastbound(1, 30, 0, 20)], observer, START).objects
      expect(object.sizeM).toMatchObject({ widthM: 34.1, lengthM: 37.6 })
    })

    test("a helicopter carries a helicopter's lamps on its own frame, from dusk", () => {
      const dusk = TrafficDecor.from([Tracks.eastbound(1, 30, 0, 20)], observer, START, 40, { models: models("EC35"), sunElevationAt: () => -8 }).objects[0]
      expect(dusk.sizeM).toMatchObject({ widthM: 10.2 })
      expect(dusk.lights!.map(light => light.id)).toContain("strobe")
      expect(dusk.lights!.some(light => light.id.startsWith("strobe-"))).toBe(false)
    })

    test("a light aircraft is dark by day and lit at dusk, an airliner lit at both", () => {
      const lamps = (type: string, sun: number) => TrafficDecor.from([Tracks.eastbound(1, 30, 0, 20)], observer, START, 40, { models: models(type), sunElevationAt: () => sun }).objects[0].lights!.length
      expect(lamps("C172", 40)).toBe(0)
      expect(lamps("C172", -8)).toBeGreaterThan(0)
      expect(lamps("A320", 40)).toBeGreaterThan(0)
      expect(lamps("A320", -8)).toBeGreaterThan(0)
    })

    test("the Sun that lights the lamps is the one at the aircraft's own place, half-way through its flight", () => {
      const seen: number[] = []
      TrafficDecor.from([Tracks.eastbound(1, 30, 0, 40)], observer, START, 40, { sunElevationAt: point => { seen.push(point.t - START); return 0 } })
      expect(seen).toEqual([20_000])
    })
  })
})
