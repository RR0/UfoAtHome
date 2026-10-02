import { describe, expect, test } from "vitest"
import { ReentrySighting } from "../../../src/engine/interpretation/Reentry.js"
import type { AircraftPoint, AircraftTrack } from "../../../src/engine/traffic/AircraftProvider.js"
import { AircraftSighting } from "../../../src/engine/traffic/AircraftSighting.js"

const FL350_FT = 35000
const FL350_KM = 10.668
const observer = { lat: 48, lng: 2, heightM: 0 }

class Tracks {
  static of(...points: Partial<AircraftPoint>[]): AircraftTrack {
    return { icao: 0xabcdef, nonIcao: false, points: points.map(point => ({ t: 0, lat: 48, lng: 2, altitudeFt: FL350_FT, ...point })) }
  }
}

describe("AircraftSighting", () => {
  test("an aircraft overhead is at the zenith, at its height", () => {
    const seen = AircraftSighting.seenFrom(Tracks.of({ t: 0 }, { t: 10_000 }), observer, 5000)!
    expect(seen.sky.altitudeDeg).toBeGreaterThan(89.9)
    expect(seen.sky.distanceKm).toBeCloseTo(FL350_KM, 2)
    expect(seen.altitudeFt).toBe(FL350_FT)
  })

  test("an airliner 100 km off stands a few degrees up, as the Earth's curvature lets it", () => {
    const east = 100 / (111.32 * Math.cos((48 * Math.PI) / 180))
    const seen = AircraftSighting.seenFrom(Tracks.of({ t: 0, lng: 2 + east }, { t: 10_000, lng: 2 + east }), observer, 0)!
    // 10.7 km of height over 100 km is 6.1 degrees on a flat Earth; the curvature takes 0.45 off.
    expect(seen.sky.altitudeDeg).toBeGreaterThan(5.2)
    expect(seen.sky.altitudeDeg).toBeLessThan(6)
    expect(seen.sky.azimuthDeg).toBeGreaterThan(87)
    expect(seen.sky.azimuthDeg).toBeLessThan(91)
  })

  test("one under the horizon is not seen", () => {
    expect(AircraftSighting.seenFrom(Tracks.of({ t: 0, lat: 50.7, altitudeFt: 500 }, { t: 10_000, lat: 50.7, altitudeFt: 500 }), observer, 0)).toBeUndefined()
  })

  test("between two positions it is on the line between them", () => {
    const track = Tracks.of({ t: 0, lat: 48.2, lng: 2 }, { t: 10_000, lat: 48.2, lng: 3 })
    const seen = AircraftSighting.seenFrom(track, observer, 5000)!
    const expected = ReentrySighting.seenFrom(observer, { lat: 48.2, lng: 2.5, heightM: FL350_FT * 0.3048 })
    expect(seen.sky.azimuthDeg).toBeCloseTo(expected.azimuthDeg, 1)
    expect(seen.sky.altitudeDeg).toBeCloseTo(expected.altitudeDeg, 1)
  })

  test("before its first position, after its last, or across a long gap, it is not known", () => {
    const track = Tracks.of({ t: 10_000 }, { t: 20_000 }, { t: 20_000 + (AircraftSighting.MAX_GAP_S + 1) * 1000 })
    expect(AircraftSighting.seenFrom(track, observer, 5000)).toBeUndefined()
    expect(AircraftSighting.seenFrom(track, observer, 15_000)).toBeDefined()
    expect(AircraftSighting.seenFrom(track, observer, 50_000)).toBeUndefined()
    expect(AircraftSighting.seenFrom(track, observer, 20_000 + (AircraftSighting.MAX_GAP_S + 5) * 1000)).toBeUndefined()
  })

  test("an airliner crossing the zenith sweeps about a degree a second", () => {
    // 450 kt is 231.5 m/s: at 10.67 km that is v / h = 0.0217 rad/s.
    const track = Tracks.of({ t: 0, lat: 47.9896 }, { t: 10_000, lat: 48.0104 })
    const seen = AircraftSighting.seenFrom(track, observer, 5000)!
    expect(seen.angularRateDegPerS).toBeGreaterThan(1.2)
    expect(seen.angularRateDegPerS).toBeLessThan(1.3)
  })

  test("the speed and heading the record gives come along", () => {
    const seen = AircraftSighting.seenFrom(Tracks.of({ t: 0, groundSpeedKt: 447.8, trackDeg: 218.4 }, { t: 10_000 }), observer, 5000)!
    expect(seen.groundSpeedKt).toBe(447.8)
    expect(seen.trackDeg).toBe(218.4)
  })

  test("across the antimeridian it goes the short way round", () => {
    const here = { lat: 0, lng: 179.95, heightM: 0 }
    const track = Tracks.of({ t: 0, lat: 0, lng: 179.9 }, { t: 10_000, lat: 0, lng: -179.9 })
    const seen = AircraftSighting.seenFrom(track, here, 5000)!
    // Halfway it is at 180: 0.05 degrees, 5.6 km, due east, at 10.7 km.
    expect(seen.sky.azimuthDeg).toBeGreaterThan(88)
    expect(seen.sky.azimuthDeg).toBeLessThan(92)
    expect(seen.sky.altitudeDeg).toBeGreaterThan(58)
    expect(seen.sky.altitudeDeg).toBeLessThan(66)
  })

  test("viewsAt keeps the aircraft that are in the sky at that instant", () => {
    const up = Tracks.of({ t: 0 }, { t: 10_000 })
    const down = Tracks.of({ t: 0, lat: 50.7, altitudeFt: 500 }, { t: 10_000, lat: 50.7, altitudeFt: 500 })
    const late = Tracks.of({ t: 60_000 }, { t: 70_000 })
    expect(AircraftSighting.viewsAt([up, down, late], observer, 5000)).toHaveLength(1)
  })

  test("a longitude is brought to [-180, 180)", () => {
    expect(AircraftSighting.wrapLongitude(190)).toBe(-170)
    expect(AircraftSighting.wrapLongitude(-190)).toBe(170)
    expect(AircraftSighting.wrapLongitude(180)).toBe(-180)
    expect(AircraftSighting.wrapLongitude(2)).toBe(2)
  })

  test("the ground distance is the great circle's", () => {
    expect(AircraftSighting.groundDistanceKm({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(111.19, 1)
    expect(AircraftSighting.groundDistanceKm({ lat: 48.85, lng: 2.35 }, { lat: 51.5, lng: -0.12 })).toBeGreaterThan(330)
    expect(AircraftSighting.groundDistanceKm({ lat: 48.85, lng: 2.35 }, { lat: 51.5, lng: -0.12 })).toBeLessThan(350)
  })
})
