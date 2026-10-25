import { describe, expect, test } from "vitest"
import { BodyHearing } from "../../../src/engine/interpretation/BodyHearing.js"
import type { BodyJson } from "../../../src/engine/interpretation/Interpretation.js"
import type { LocalPoint } from "../../../src/engine/interpretation/BodyPlacement.js"

/** A body flying due west at 200 m/s, 750 m up, passing over the observer at t = 10 s. */
const jet = (sound: BodyJson["sound"]): BodyJson => ({ id: "jet", model: { id: "sphere" }, track: [], sound })
const positionAt = (_body: BodyJson, t: number): LocalPoint => ({ eastM: -200 * (t - 10000) / 1000, northM: 0, upM: 750 })
const ear: LocalPoint = { eastM: 0, northM: 0, upM: 1.6 }
const origin = { lat: 36.55, lng: -115.4 }

describe("BodyHearing", () => {
  test("a body that says nothing of its sound is silent", () => {
    expect(new BodyHearing().voices([jet(undefined)], positionAt, ear, origin, 10000, 30000)).toEqual([])
  })

  test("a fighter a kilometre away is heard, late by the time its sound takes to come, and higher in pitch as it comes", () => {
    const voices = new BodyHearing().voices([jet({ kind: "military-jet" })], positionAt, ear, origin, 6000, 30000, { ambientDbA: 30 })
    expect(voices).toHaveLength(1)
    // At 6 s it is 800 m east and coming; what is heard left it some 6.5 s before, when it was 2 km east: 2.2 km away with its height.
    expect(voices[0].distanceKm).toBeGreaterThan(2.1)
    expect(voices[0].distanceKm).toBeLessThan(2.35)
    expect(voices[0].azimuthDeg).toBeCloseTo(90, 0)
    expect(voices[0].dopplerRatio).toBeGreaterThan(1.1)
    // Some 67 dB(A) from 2.2 km: a loud roar on a quiet night.
    expect(voices[0].levelDbA).toBeGreaterThan(60)
  })

  test("going away, it is lower in pitch", () => {
    const voices = new BodyHearing().voices([jet({ kind: "military-jet" })], positionAt, ear, origin, 20000, 30000, { ambientDbA: 30 })
    expect(voices[0].dopplerRatio).toBeLessThan(0.9)
  })

  test("a machine claimed 45 dB quieter than a fighter is not heard there", () => {
    const loud = new BodyHearing().voices([jet({ kind: "military-jet" })], positionAt, ear, origin, 6000, 30000, { ambientDbA: 35 })
    const quiet = new BodyHearing().voices([jet({ kind: "military-jet", quieterDb: 45 })], positionAt, ear, origin, 6000, 30000, { ambientDbA: 35 })
    expect(loud).toHaveLength(1)
    expect(quiet).toEqual([])
    expect(BodyHearing.noiseOf({ kind: "military-jet", quieterDb: 45 }).soundPowerA[3]).toBeCloseTo(BodyHearing.noiseOf({ kind: "military-jet" }).soundPowerA[3] - 45, 6)
  })
})
