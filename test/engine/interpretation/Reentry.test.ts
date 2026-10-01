import { describe, expect, test } from "vitest"
import { ReentrySighting } from "../../../src/engine/interpretation/Reentry.js"
import type { ReentryJson } from "../../../src/engine/interpretation/Reentry.js"

/** Due east along the equator, 1 degree (111 km) every 15 s, at a constant 80 km. */
const reentry = (fragments: ReentryJson["fragments"]): ReentryJson => ({
  id: "test",
  track: [
    { t: 0, lat: 0, lng: 0, altitudeKm: 80 },
    { t: 15000, lat: 0, lng: 1, altitudeKm: 80 },
    { t: 30000, lat: 0, lng: 2, altitudeKm: 80 }
  ],
  fragments
})

describe("ReentrySighting", () => {
  test("a point straight overhead is at the zenith, at its height", () => {
    const seen = ReentrySighting.seenFrom({ lat: 45, lng: 5, heightM: 0 }, { lat: 45, lng: 5, heightM: 80000 })
    expect(seen.altitudeDeg).toBeCloseTo(90, 6)
    expect(seen.distanceKm).toBeCloseTo(80, 6)
  })

  test("the Earth's curvature lowers a distant piece, and sinks one past the horizon", () => {
    // 80 km up and 300 km north: flat reckoning says atan(80/300) = 14.9 degrees; the sphere says
    // about 1.3 degrees less.
    const north = 300 / 111.2
    const near = ReentrySighting.seenFrom({ lat: 0, lng: 0, heightM: 0 }, { lat: north, lng: 0, heightM: 80000 })
    expect(near.azimuthDeg).toBeCloseTo(0, 3)
    expect(near.altitudeDeg).toBeGreaterThan(13)
    expect(near.altitudeDeg).toBeLessThan(14)
    // The horizon distance of a point 80 km up is about 1010 km: at 1200 km it is under it.
    const far = ReentrySighting.seenFrom({ lat: 0, lng: 0, heightM: 0 }, { lat: 1200 / 111.2, lng: 0, heightM: 80000 })
    expect(far.altitudeDeg).toBeLessThan(0)
  })

  test("east is azimuth 90", () => {
    const seen = ReentrySighting.seenFrom({ lat: 0, lng: 0, heightM: 0 }, { lat: 0, lng: 1, heightM: 80000 })
    expect(seen.azimuthDeg).toBeCloseTo(90, 3)
  })

  test("the leading point moves along its track and is absent outside it", () => {
    const r = reentry([{ absoluteMagnitude: -2 }])
    expect(ReentrySighting.leadAt(r, 7500)?.lng).toBeCloseTo(0.5, 6)
    expect(ReentrySighting.leadAt(r, 22500)?.lng).toBeCloseTo(1.5, 6)
    expect(ReentrySighting.leadAt(r, -1)).toBeUndefined()
    expect(ReentrySighting.leadAt(r, 30001)).toBeUndefined()
  })

  test("a piece lags behind on the same path, and is seen only between its appearing and going out", () => {
    const r = reentry([{ id: "lead", absoluteMagnitude: -2 }, { id: "late", lagS: 3, fromT: 10000, untilT: 20000, absoluteMagnitude: 0 }])
    const observer = { lat: 0, lng: 1, heightM: 0 }
    expect(ReentrySighting.viewsAt([r], 5000, observer).map(v => v.fragmentId)).toEqual(["lead"])
    const both = ReentrySighting.viewsAt([r], 15000, observer)
    expect(both.map(v => v.fragmentId)).toEqual(["lead", "late"])
    // The lead is overhead at 15 s; the late piece, 3 s behind, is west of it.
    expect(both[0].head.altitudeDeg).toBeCloseTo(90, 3)
    expect(both[1].head.azimuthDeg).toBeCloseTo(270, 1)
    expect(ReentrySighting.viewsAt([r], 21000, observer).map(v => v.fragmentId)).toEqual(["lead"])
  })

  test("its magnitude is its absolute one moved to its real distance", () => {
    const r = reentry([{ absoluteMagnitude: -2 }])
    // Overhead at 80 km: 5 log(0.8) brighter than at the standard 100 km.
    const [view] = ReentrySighting.viewsAt([r], 15000, { lat: 0, lng: 1, heightM: 0 })
    expect(view.magnitude).toBeCloseTo(-2 + 5 * Math.log10(0.8), 6)
  })

  test("it brightens as it appears rather than between two frames", () => {
    const r = reentry([{ absoluteMagnitude: -2, fromT: 10000 }])
    const observer = { lat: 0, lng: 1, heightM: 0 }
    const [early] = ReentrySighting.viewsAt([r], 10100, observer)
    const [later] = ReentrySighting.viewsAt([r], 12000, observer)
    expect(early.magnitude).toBeGreaterThan(later.magnitude + 1)
  })

  test("its train runs back along its own path, never before it appeared", () => {
    const r = reentry([{ absoluteMagnitude: -2, trainS: 2, fromT: 14000 }])
    const [view] = ReentrySighting.viewsAt([r], 15000, { lat: 0, lng: 1, heightM: 0 })
    // Only one second of past at 15 s: the train stops where it appeared, 1 s back (1/15 degree west).
    const last = view.train[view.train.length - 1]
    expect(last.azimuthDeg).toBeCloseTo(270, 1)
    const westKm = 111.32 / 15
    expect(last.altitudeDeg).toBeCloseTo((Math.atan2(80, westKm) * 180) / Math.PI, 0)
  })

  test("a piece under the observer's horizon is not seen", () => {
    const r = reentry([{ absoluteMagnitude: -2 }])
    expect(ReentrySighting.viewsAt([r], 15000, { lat: 0, lng: 20, heightM: 0 })).toEqual([])
  })
})
