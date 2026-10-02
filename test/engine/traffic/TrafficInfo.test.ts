import { describe, expect, test } from "vitest"
import type { AircraftPoint, AircraftTrack } from "../../../src/engine/traffic/AircraftProvider.js"
import { TrafficInfos } from "../../../src/engine/traffic/TrafficInfo.js"

const observer = { lat: 48, lng: 2, heightM: 0 }
const T0 = Date.UTC(2025, 11, 30, 12)
const KM_LNG = 1 / (111.32 * Math.cos((48 * Math.PI) / 180))

/** An airliner flying east at 450 kt at 3 km, passing 2 km north of the observer at 200 s, recorded from -400 to 600 s. */
function flight(): AircraftTrack {
  const points: AircraftPoint[] = []
  for (let s = -400; s <= 600; s += 5) {
    points.push({ t: T0 + s * 1000, lat: 48 + 2 / 111.32, lng: 2 + ((s - 200) * 231.5 / 1000) * KM_LNG, altitudeFt: 9840, groundSpeedKt: 450, trackDeg: 90 })
  }
  return { icao: 0x3944ed, nonIcao: false, points }
}

describe("TrafficInfos", () => {
  test("names the aircraft by its registration and type when the record gives them", () => {
    const info = TrafficInfos.at(flight(), { registration: "F-GKXA", type: "A320", category: "A3" }, observer, T0 + 200_000)!
    expect(info).toMatchObject({ hex: "3944ed", registration: "F-GKXA", typeCode: "A320", name: "Airbus A320", kind: "airliner-narrow", basis: "type", military: false, restricted: false })
  })

  test("says what it flies like, as it is in the sky now", () => {
    const info = TrafficInfos.at(flight(), undefined, observer, T0 + 200_000)!
    expect(info.altitudeFt).toBeCloseTo(9840, 0)
    expect(info.groundSpeedKt).toBe(450)
    expect(info.trackDeg).toBe(90)
    expect(info.sky.altitudeDeg).toBeGreaterThan(50)
    expect(info.sky.distanceKm).toBeGreaterThan(3)
    expect(info.angularRateDegPerS).toBeGreaterThan(0)
  })

  test("without a description it is not named, and is a generic airliner", () => {
    const info = TrafficInfos.at(flight(), undefined, observer, T0 + 200_000)!
    expect(info.name).toBeUndefined()
    expect(info.registration).toBeUndefined()
    expect(info).toMatchObject({ kind: "airliner-narrow", basis: "nothing" })
  })

  test("only a class when the record gives a category and no type", () => {
    const info = TrafficInfos.at(flight(), { category: "A7" }, observer, T0 + 200_000)!
    expect(info).toMatchObject({ kind: "helicopter-medium", basis: "category", name: "Rotorcraft" })
  })

  test("carries what the database says of whose it is", () => {
    const info = TrafficInfos.at(flight(), { type: "H60", military: true, restricted: true }, observer, T0 + 200_000)!
    expect(info).toMatchObject({ military: true, restricted: true, kind: "helicopter-heavy" })
  })

  test("works out its sound with the noise of what it is: a helicopter is not heard as an airliner", () => {
    const airliner = TrafficInfos.at(flight(), { type: "A320" }, observer, T0 + 200_000)!.hearing!
    const heli = TrafficInfos.at(flight(), { type: "EC35" }, observer, T0 + 200_000)!.hearing!
    expect(airliner.levelDbA).toBeGreaterThan(heli.levelDbA)
    expect(airliner.delayS).toBeGreaterThan(5)
    expect(airliner.lagDeg).toBeGreaterThan(5)
    expect(heli.dominantHz).toBeLessThan(airliner.dominantHz + 1)
  })

  test("says when its sound cannot be worked out: it was not recorded yet when the sound left it", () => {
    const late = { ...flight(), points: flight().points.filter(point => point.t >= T0 + 195_000) }
    const info = TrafficInfos.at(late, undefined, observer, T0 + 200_000)!
    expect(info.hearing).toBeUndefined()
    expect(info.altitudeFt).toBeGreaterThan(0)
  })

  test("is not there when it is not in the sky then", () => {
    expect(TrafficInfos.at(flight(), undefined, observer, T0 - 900_000)).toBeUndefined()
    expect(TrafficInfos.at(flight(), undefined, observer, T0 + 900_000)).toBeUndefined()
  })

  test("a pseudo-address is marked as one", () => {
    expect(TrafficInfos.at({ ...flight(), nonIcao: true }, undefined, observer, T0 + 200_000)!.hex).toBe("~3944ed")
  })
})
