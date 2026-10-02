import { describe, expect, it } from "vitest"
import { AircraftContrails } from "../../../src/engine/traffic/AircraftContrails.js"
import { AircraftModels } from "../../../src/engine/traffic/AircraftModels.js"
import type { AircraftPoint, AircraftTrack } from "../../../src/engine/traffic/AircraftProvider.js"
import { ContrailPhysics } from "../../../src/engine/traffic/ContrailPhysics.js"
import { TrafficDecor } from "../../../src/engine/traffic/TrafficDecor.js"
import type { UpperAirLevel, UpperAirSample } from "../../../src/engine/traffic/UpperAirProvider.js"

const observer = { lat: 48, lng: 2, heightM: 0 }
const START = Date.UTC(2025, 11, 30, 16)

/** Flying east, 30 km off, a position every 5 s over `seconds`. */
function flight(icao: number, altitudeFt: number, seconds = 30): AircraftTrack {
  const points: AircraftPoint[] = []
  for (let s = 0; s <= seconds; s += 5) points.push({ t: START + s * 1000, lat: 48, lng: 2.4 + s * 0.0001, altitudeFt })
  return { icao, nonIcao: false, points }
}

const ice = (c: number) => ContrailPhysics.saturationOverIcePa(c) / ContrailPhysics.saturationOverWaterPa(c)

/** The same air at every level, so what an aircraft flies in does not depend on where between them it is. */
function air(temperatureC: number, relativeHumidity: number, windSpeedMs = 20, windFromDeg = 270): UpperAirSample[] {
  const level = (pressureHpa: number): UpperAirLevel => ({ pressureHpa, temperatureC, relativeHumidity, windSpeedMs, windFromDeg })
  return [{ t: START - 3_600_000, levels: [500, 400, 300, 250, 200, 150].map(level) }, { t: START + 3_600_000, levels: [500, 400, 300, 250, 200, 150].map(level) }]
}

describe("AircraftContrails", () => {
  it("makes a trail of an airliner cruising in cold air, which lasts where the air is supersaturated over ice", () => {
    const track = flight(1, 36000)
    const set = TrafficDecor.from([track], observer, START)
    const trails = AircraftContrails.plan(set, new Map([["000001", AircraftModels.of({ type: "A320" })]]), air(-58, ice(-58) * 1.2), START)
    expect(trails).toHaveLength(1)
    expect(trails[0].id).toBe("traffic-000001-0")
    expect(trails[0].points.every(point => point.forms && point.persistent)).toBe(true)
    expect(trails[0].spanM).toBeCloseTo(34.1, 1)
  })

  it("makes one that does not last in dry air", () => {
    const set = TrafficDecor.from([flight(1, 36000)], observer, START)
    const [trail] = AircraftContrails.plan(set, undefined, air(-58, ice(-58) * 0.3), START)
    expect(trail.points.every(point => point.forms && !point.persistent)).toBe(true)
    expect(trail.points[0].lifetimeS).toBeGreaterThan(15)
    expect(trail.points[0].lifetimeS).toBeLessThan(135)
  })

  it("makes none in air that is too warm", () => {
    const set = TrafficDecor.from([flight(1, 36000)], observer, START)
    expect(AircraftContrails.plan(set, undefined, air(-30, 1), START)).toEqual([])
  })

  it("makes none for an aircraft below the levels the record states, which no trail forms at", () => {
    const set = TrafficDecor.from([flight(1, 3000)], observer, START)
    expect(AircraftContrails.plan(set, undefined, air(-58, 1), START)).toEqual([])
  })

  it("makes none for what has no jet engine", () => {
    const set = TrafficDecor.from([flight(1, 36000)], observer, START)
    expect(AircraftContrails.plan(set, new Map([["000001", AircraftModels.of({ type: "AT72" })]]), air(-58, 1), START)).toEqual([])
  })

  it("takes the aircraft's own positions, in the scene's frame and in ms from the start", () => {
    const set = TrafficDecor.from([flight(1, 36000)], observer, START)
    const [trail] = AircraftContrails.plan(set, undefined, air(-58, 1), START)
    const keyframes = set.objects[0].track!
    expect(trail.points).toHaveLength(keyframes.length)
    trail.points.forEach((point, i) => {
      expect(point.tMs).toBe(keyframes[i].t)
      expect(point.eastM).toBe(keyframes[i].eastM)
      expect(point.northM).toBe(keyframes[i].northM)
      expect(point.upM).toBe(keyframes[i].altitudeM)
    })
  })

  it("lets the wind carry what the aircraft left", () => {
    const set = TrafficDecor.from([flight(1, 36000)], observer, START)
    const [trail] = AircraftContrails.plan(set, undefined, air(-58, 1, 30, 270), START)
    expect(trail.points[0].driftEastMs).toBeCloseTo(30, 3)
    expect(Math.abs(trail.points[0].driftNorthMs)).toBeLessThan(1e-6)
  })

  it("starts a trail only where the air allows one: a climb into the cold makes it begin on the way", () => {
    const points: AircraftPoint[] = []
    for (let s = 0; s <= 60; s += 5) points.push({ t: START + s * 1000, lat: 48, lng: 2.4 + s * 0.0001, altitudeFt: 20000 + s * 300 })
    const set = TrafficDecor.from([{ icao: 1, nonIcao: false, points }], observer, START)
    // Warm at 20 000 ft's pressure, cold higher: a profile that cools with height.
    const level = (pressureHpa: number, temperatureC: number): UpperAirLevel => ({ pressureHpa, temperatureC, relativeHumidity: 1, windSpeedMs: 0, windFromDeg: 0 })
    const samples: UpperAirSample[] = [{ t: START, levels: [level(500, -20), level(400, -32), level(300, -45), level(250, -55), level(200, -58), level(150, -60)] }]
    const [trail] = AircraftContrails.plan(set, undefined, samples, START)
    expect(trail.points.some(point => !point.forms)).toBe(true)
    expect(trail.points[trail.points.length - 1].forms).toBe(true)
    expect(trail.points[0].forms).toBe(false)
  })

  it("makes nothing from no air", () => {
    const set = TrafficDecor.from([flight(1, 36000)], observer, START)
    expect(AircraftContrails.plan(set, undefined, [], START)).toEqual([])
  })
})
