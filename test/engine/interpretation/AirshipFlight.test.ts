import { describe, expect, test } from "vitest"
import { AirshipFlight } from "../../../src/modules/interpretations/airships/AirshipFlight.js"
import type { AirshipFlightJson } from "../../../src/modules/interpretations/airships/AirshipFlight.js"
import { AirshipTypes } from "../../../src/modules/interpretations/airships/AirshipType.js"
import type { BodyKeyframe } from "../../../src/engine/interpretation/Interpretation.js"

/** A blimp flying 1 800 m east in two minutes at 300 m, then turning north. */
const blimp = (more: Partial<AirshipFlightJson> = {}): AirshipFlightJson => ({
  id: "blimp", airship: "blimp",
  path: [
    { t: 0, eastM: 0, northM: 1000, altitudeM: 300 }, { t: 120_000, eastM: 1800, northM: 1000, altitudeM: 300 },
    { t: 240_000, eastM: 1800, northM: 2800, altitudeM: 400 }
  ],
  ...more
})
const keyAt = (track: BodyKeyframe[], t: number) => track.reduce((best, key) => Math.abs(key.t - t) < Math.abs(best.t - t) ? key : best)

describe("AirshipFlight", () => {
  test("goes through its points on time, its nose where it goes through the air", () => {
    const [body] = AirshipFlight.bodiesOf(blimp())
    const half = AirshipTypes.byId("blimp")!.sizeM.heightM / 2
    expect(keyAt(body.track, 120_000).eastM).toBeCloseTo(1800, -1)
    expect(keyAt(body.track, 120_000).altitudeM! + half).toBeCloseTo(300, 0)
    // Its path is smooth: it already bends a little towards the turn to come.
    expect(Math.abs(keyAt(body.track, 60_000).attitude!.headingDeg! - 90)).toBeLessThan(10)
    const late = keyAt(body.track, 200_000).attitude!.headingDeg!
    expect(Math.min(late, 360 - late)).toBeLessThan(10)
    // Climbing towards the last point, its nose is up.
    expect(keyAt(body.track, 200_000).attitude!.pitchDeg!).toBeGreaterThan(0)
  })

  test("noses into the air it goes through: crabbing in a crosswind", () => {
    const [body] = AirshipFlight.bodiesOf(blimp({ wind: { fromDeg: 0, speedMS: 5 } }))
    // Going east at 15 m/s with the wind from the north, it points a little north of east.
    const heading = keyAt(body.track, 60_000).attitude!.headingDeg!
    expect(heading).toBeLessThan(85)
    expect(heading).toBeGreaterThan(60)
  })

  test("keeps a tethered aerostat where it is moored, its nose swinging about the wind", () => {
    const [body] = AirshipFlight.bodiesOf({ id: "a", airship: "aerostat", wind: { fromDeg: 270, speedMS: 8 },
      path: [{ t: 0, eastM: 5000, northM: 0, altitudeM: 3000 }, { t: 300_000, eastM: 9000, northM: 0, altitudeM: 3000 }] })
    for (const key of body.track) {
      expect(Math.abs(key.eastM! - 5000)).toBeLessThan(5)
      expect(Math.abs(key.attitude!.headingDeg! - 270)).toBeLessThan(10)
    }
    expect(new Set(body.track.map(key => Math.round(key.attitude!.headingDeg!))).size).toBeGreaterThan(5)
    expect(body.sound).toBeUndefined()
  })

  test("lights its sign unless the recording puts it out, and a Zeppelin NT's only when it lights it", () => {
    const [lit] = AirshipFlight.bodiesOf(blimp())
    expect(lit.track[0].lights!["light-sign-left"]).toBe(300)
    const [dark] = AirshipFlight.bodiesOf(blimp({ sign: false }))
    expect(dark.track[0].lights!["light-sign-right"]).toBe(0)
    const [nt] = AirshipFlight.bodiesOf({ id: "nt", airship: "zeppelin-nt", path: blimp().path })
    expect(nt.track[0].lights!["light-sign-left"]).toBe(0)
    const [ntLit] = AirshipFlight.bodiesOf({ id: "nt", airship: "zeppelin-nt", path: blimp().path, sign: { color: "#40a0ff" } })
    expect(ntLit.track[0].lights!["light-sign-left"]).toBe(300)
    expect(ntLit.modelParameters!.signColor).toBe("#40a0ff")
  })

  test("blinks its strobe, its navigation lights steady, and glows a lightship's envelope", () => {
    const [body] = AirshipFlight.bodiesOf(blimp())
    const strobe = body.track.map(key => key.lights!["light-strobe"])
    expect(strobe.some(value => value > 0)).toBe(true)
    expect(strobe.some(value => value === 0)).toBe(true)
    expect(body.track.every(key => key.lights!["light-nav-left"] > 0)).toBe(true)
    expect(body.lamps?.length).toBe(4)
    const [lightship] = AirshipFlight.bodiesOf({ id: "l", airship: "lightship", path: blimp().path })
    expect(lightship.track[0].lights!.envelope).toBe(20)
    const [out] = AirshipFlight.bodiesOf({ id: "l", airship: "lightship", path: blimp().path, lit: false })
    expect(out.track[0].lights!.envelope).toBe(0)
  })

  test("is heard as its engines are, and named for its type", () => {
    const [body] = AirshipFlight.bodiesOf({ id: "r", airship: "rigid", path: blimp().path })
    expect(body.sound).toEqual({ kind: "piston-heavy" })
    expect((body.title as { fr: string }).fr).toBe("Dirigeable rigide")
    expect(body.model).toEqual({ id: "ufoathome-airship-rigid" })
    expect(body.track[0].sizeM).toEqual(AirshipTypes.byId("rigid")!.sizeM)
  })
})
