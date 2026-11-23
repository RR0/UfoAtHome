import { describe, expect, test } from "vitest"
import { AuroraRadiance, AuroralLines, AuroralOval, AuroraSighting } from "../../../src/modules/sky-events/auroras/Aurora.js"
import type { AuroraJson } from "../../../src/modules/sky-events/auroras/Aurora.js"

const direction = (altitudeDeg: number, azimuthDeg: number): [number, number, number] => {
  const a = (altitudeDeg * Math.PI) / 180, z = (azimuthDeg * Math.PI) / 180
  return [Math.cos(a) * Math.sin(z), Math.sin(a), -Math.cos(a) * Math.cos(z)]
}
/** The Sun well under the horizon, to the north-west at magnetic midnight's side of the sky. */
const night: [number, number, number] = direction(-30, 0)

/** The light along a line of sight, cd/m² for the cones, before the air. */
const luminance = (aurora: AuroraJson, place: { lat: number, lng: number }, altitudeDeg: number, azimuthDeg: number, date = new Date("2024-05-10T22:00:00Z")) => {
  const view = AuroraSighting.viewAt(aurora, 0, { ...place, heightM: 0 }, date, night)
  if (!view) return 0
  const [green, red, blue] = AuroraRadiance.along(view, direction(altitudeDeg, azimuthDeg))
  return green * AuroralLines.GREEN.cdM2PerKR + red * AuroralLines.RED.cdM2PerKR + blue * AuroralLines.BLUE.cdM2PerKR
}

const PARIS = { lat: 48.85, lng: 2.35 }
/** A dark sky: 22 magnitudes a square arcsecond. */
const DARK_SKY_CD_M2 = 1.7e-4

describe("AuroralLines", () => {
  test("puts a kilorayleigh of the green line at the Milky Way's brightness, as the brightness classes are defined", () => {
    expect(AuroralLines.GREEN.cdM2PerKR).toBeGreaterThan(1e-4)
    expect(AuroralLines.GREEN.cdM2PerKR).toBeLessThan(3e-4)
    // The red is far less bright to the cones for as many photons.
    expect(AuroralLines.RED.cdM2PerKR).toBeLessThan(AuroralLines.GREEN.cdM2PerKR / 3)
  })
})

describe("AuroralOval", () => {
  test("moves the edge some two degrees towards the equator for every step of Kp, past 9 for Hp", () => {
    expect(AuroralOval.equatorwardEdgeDeg(0)).toBeCloseTo(66.5, 1)
    expect(AuroralOval.equatorwardEdgeDeg(9)).toBeCloseTo(48.1, 0)
    expect(AuroralOval.equatorwardEdgeDeg(10.67)).toBeLessThan(45)
  })

  test("stands nearer the pole at magnetic noon than at midnight", () => {
    expect(AuroralOval.edgeAt(60, 12)).toBeCloseTo(60 + AuroralOval.NOON_SHIFT_DEG, 6)
    expect(AuroralOval.edgeAt(60, 0)).toBeCloseTo(60, 6)
  })
})

describe("AuroraSighting", () => {
  test("follows the archive's activity between its instants", () => {
    const aurora: AuroraJson = { id: "a", activity: [{ t: 0, kp: 3 }, { t: 3_600_000, kp: 6 }] }
    expect(AuroraSighting.kpAt(aurora, 1_800_000)).toBeCloseTo(4.5, 6)
    expect(AuroraSighting.kpAt(aurora, 9_000_000)).toBe(6)
  })

  test("comes on and goes out over a minute", () => {
    const aurora: AuroraJson = { id: "a", fromT: 0, untilT: 600_000 }
    expect(AuroraSighting.fadeAt(aurora, 30_000)).toBeCloseTo(0.5, 6)
    expect(AuroraSighting.fadeAt(aurora, 300_000)).toBe(1)
    expect(AuroraSighting.viewAt(aurora, 700_000, { ...PARIS, heightM: 0 }, new Date("2024-05-10T22:00:00Z"), night)).toBeUndefined()
  })

  test("is nothing from where even its highest red stays under the horizon", () => {
    expect(AuroraSighting.viewAt({ id: "a", kp: 2 }, 0, { lat: 36.8, lng: 10.2, heightM: 0 }, new Date("2024-05-10T22:00:00Z"), night)).toBeUndefined()
  })
})

describe("AuroraRadiance", () => {
  test("from Paris, an aurora of Kp 5 stays far under a dark sky's light even on the northern horizon", () => {
    expect(luminance({ id: "a", kp: 5 }, PARIS, 3, 0)).toBeLessThan(DARK_SKY_CD_M2 * 5)
    expect(luminance({ id: "a", kp: 5 }, PARIS, 15, 0)).toBeLessThan(DARK_SKY_CD_M2 / 10)
  })

  test("from Paris, the storm of 10 May 2024 (Hp 10⅔) outshines a dark sky over the whole northern sky", () => {
    for (const altitude of [5, 15, 30]) expect(luminance({ id: "a", kp: 10.67 }, PARIS, altitude, 0)).toBeGreaterThan(DARK_SKY_CD_M2 * 2)
    // And a storm's red stands high over it, where the green no longer reaches.
    const view = AuroraSighting.viewAt({ id: "a", kp: 10.67 }, 0, { ...PARIS, heightM: 0 }, new Date("2024-05-10T22:00:00Z"), night)!
    const [green, red] = AuroraRadiance.along(view, direction(60, 0))
    expect(red).toBeGreaterThan(green)
  })

  test("a diffuse glow seen through its whole height overhead holds what its column states, and more towards the horizon", () => {
    const view = AuroraSighting.viewAt({ id: "a", kp: 3, arcs: 0 }, 0, { lat: 69.7, lng: 18.6, heightM: 0 }, new Date("2025-01-01T21:00:00Z"), night)!
    const overhead = AuroraRadiance.along(view, direction(90, 0))[0]
    expect(overhead).toBeCloseTo(AuroralOval.diffuseKR(3), 0)
  })

  test("an arc overhead, seen low along its length, is many times brighter than seen low across it", () => {
    const place = { lat: 69.7, lng: 18.6, heightM: 0 }
    const date = new Date("2025-01-01T21:00:00Z")
    // Its edge put for its one arc to stand over the observer (see AuroraSighting.viewAt, the first arc at 0.15 of the oval's width).
    const apex = AuroraSighting.apexLatitude(place.lat, place.lng, date)
    const edgeLatDeg = apex - 0.15 * AuroralOval.widthDeg(3)
    const arc = AuroraSighting.viewAt({ id: "a", kp: 3, arcs: 1, arcKR: 20, edgeLatDeg }, 0, place, date, night)!
    const glow = AuroraSighting.viewAt({ id: "a", kp: 3, arcs: 0, edgeLatDeg }, 0, place, date, night)!
    const ofArc = (azimuth: number) => AuroraRadiance.along(arc, direction(20, azimuth))[0] - AuroraRadiance.along(glow, direction(20, azimuth))[0]
    const seen = Array.from({ length: 36 }, (_, i) => ofArc(i * 10))
    expect(Math.max(...seen)).toBeGreaterThan(4 * Math.min(...seen))
  })
})
