import { describe, expect, test } from "vitest"
import { sceneNames_fr } from "../../src/component/messages/SceneNames_fr.js"
import { TrafficTooltip } from "../../src/component/TrafficTooltip.js"
import type { TrafficInfo } from "../../src/engine/traffic/TrafficInfo.js"

const info = (overrides: Partial<TrafficInfo> = {}): TrafficInfo => ({
  hex: "3944ed", registration: "F-GKXA", typeCode: "A320", name: "Airbus A320", kind: "airliner-narrow", basis: "type",
  military: false, restricted: false, altitudeFt: 35023, groundSpeedKt: 447.8, trackDeg: 218.4,
  sky: { altitudeDeg: 41.6, azimuthDeg: 212, distanceKm: 14.2 },
  hearing: { audible: true, levelDbA: 41.4, ambientDbA: 35, delayS: 28.7, lagDeg: 36.4, dopplerRatio: 1, cutoffHz: 250, dominantHz: 250 },
  ...overrides
})
const towards = (azimuth: number) => `towards ${Math.round(azimuth)}`
const english = (overrides?: Partial<TrafficInfo>) => TrafficTooltip.text(info(overrides), TrafficTooltip.ENGLISH, towards, "en")

describe("TrafficTooltip", () => {
  test("says who it is, how it flies, where it is and how it sounds, one line each", () => {
    expect(english().split("\n")).toEqual([
      "F-GKXA · Airbus A320",
      "35,000 ft · 448 kt · heading 218°",
      "14 km away, 42° above the horizon, towards 212",
      "Heard at 41 dB(A), left the aircraft 29 s ago, 36° behind it: a low rumble, nothing above 250 Hz",
      "A compatible candidate, not an identification"
    ])
  })

  test("says no more than the record gives: an unnamed aircraft has its address, one with no speed no speed", () => {
    const lines = english({ registration: undefined, name: undefined, groundSpeedKt: undefined, trackDeg: undefined }).split("\n")
    expect(lines[0]).toBe("Aircraft 3944ed")
    expect(lines[1]).toBe("35,000 ft")
  })

  test("a registration alone names it, a type alone too", () => {
    expect(english({ name: undefined }).split("\n")[0]).toBe("F-GKXA")
    expect(english({ registration: undefined }).split("\n")[0]).toBe("Airbus A320")
  })

  test("a distance under ten kilometres has its decimal, over ten none", () => {
    expect(english({ sky: { altitudeDeg: 80, azimuthDeg: 10, distanceKm: 3.46 } })).toContain("3.5 km away")
    expect(english({ sky: { altitudeDeg: 30, azimuthDeg: 10, distanceKm: 23.6 } })).toContain("24 km away")
  })

  test("what is too faint is not heard, and says against what", () => {
    const text = english({ hearing: { audible: false, levelDbA: 28.4, ambientDbA: 35, delayS: 40, lagDeg: 50, dopplerRatio: 1, dominantHz: 250 } })
    expect(text).toContain("Not audible here: 28 dB(A) against 35 dB(A) of ambient noise")
    expect(text).not.toContain("Heard at")
  })

  test("a sound that cannot be worked out is said so, not made up", () => {
    expect(english({ hearing: undefined })).toContain("Its sound cannot be worked out")
  })

  test("how it sounds follows how far up the sound goes: a rumble, a dull noise, a broad roar", () => {
    const heard = (cutoffHz: number) => english({ hearing: { audible: true, levelDbA: 60, ambientDbA: 35, delayS: 3, lagDeg: 10, dopplerRatio: 1, cutoffHz, dominantHz: 1000 } })
    expect(heard(250)).toContain("a low rumble, nothing above 250 Hz")
    expect(heard(1000)).toContain("a dull noise, nothing above 1,000 Hz")
    expect(heard(8000)).toContain("a broad roar")
  })

  test("the pitch is said when it is shifted by more than a few per cent, and which way", () => {
    const heard = (dopplerRatio: number) => english({ hearing: { audible: true, levelDbA: 60, ambientDbA: 35, delayS: 3, lagDeg: 10, dopplerRatio, cutoffHz: 4000, dominantHz: 1000 } })
    expect(heard(1.12)).toContain(", pitch 12 % higher")
    expect(heard(0.85)).toContain(", pitch 15 % lower")
    expect(heard(1.01)).not.toContain("pitch")
  })

  test("says whose it is when the database does: military, identity withheld", () => {
    const text = english({ military: true, restricted: true })
    expect(text).toContain("military · identity withheld by its owner")
    expect(english()).not.toContain("military")
  })

  test("is said in the reader's language, with their number format", () => {
    const text = TrafficTooltip.text(info(), sceneNames_fr.trafficTooltip, azimuth => `au ${Math.round(azimuth)}`, "fr")
    const lines = text.split("\n")
    expect(lines[1]).toMatch(/^35[\s  ]000 ft · 448 kt · cap 218°$/)
    expect(lines[2]).toBe("à 14 km, 42° au-dessus de l'horizon, au 212")
    expect(lines[3]).toBe("Entendu à 41 dB(A), parti de l'avion il y a 29 s, 36° derrière lui : un grondement grave, rien au-delà de 250 Hz")
    expect(lines[4]).toBe("Un candidat compatible, pas une identification")
  })
})
