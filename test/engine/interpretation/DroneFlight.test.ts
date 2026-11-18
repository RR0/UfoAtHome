import { describe, expect, test } from "vitest"
import { DroneFlight } from "../../../src/modules/interpretations/drones/DroneFlight.js"
import type { DroneFlightJson } from "../../../src/modules/interpretations/drones/DroneFlight.js"
import { DroneAirframes } from "../../../src/modules/interpretations/drones/DroneAirframe.js"
import type { BodyKeyframe } from "../../../src/engine/interpretation/Interpretation.js"

/** A quadcopter that hovers 10 s at 60 m, flies 200 m north in 20 s, and hovers again. */
const quad = (more: Partial<DroneFlightJson> = {}): DroneFlightJson => ({
  id: "quad", airframe: "quadcopter",
  path: [
    { t: 0, eastM: 0, northM: 100, altitudeM: 60 }, { t: 10000, eastM: 0, northM: 100, altitudeM: 60 },
    { t: 30000, eastM: 0, northM: 300, altitudeM: 60 }, { t: 40000, eastM: 0, northM: 300, altitudeM: 60 }
  ],
  ...more
})

const keyAt = (track: BodyKeyframe[], t: number) => track.reduce((best, key) => Math.abs(key.t - t) < Math.abs(best.t - t) ? key : best)

describe("DroneFlight", () => {
  test("hovers where its path stops, within its positioning's error, and passes its points on time", () => {
    const [body] = DroneFlight.bodiesOf(quad())
    for (const t of [0, 5000, 10000]) {
      const key = keyAt(body.track, t)
      expect(Math.hypot(key.eastM!, key.northM! - 100)).toBeLessThan(DroneAirframes.byId("quadcopter")!.holdM.horizontalM * 1.5)
    }
    expect(keyAt(body.track, 30000).northM).toBeCloseTo(300, -0.5)
    expect(keyAt(body.track, 20000).northM).toBeCloseTo(200, -1)
  })

  test("leans nose down to set off, nose up to stop, and level while it hovers", () => {
    const [body] = DroneFlight.bodiesOf(quad())
    expect(Math.abs(keyAt(body.track, 5000).attitude!.pitchDeg!)).toBeLessThan(3)
    expect(keyAt(body.track, 11500).attitude!.pitchDeg!).toBeLessThan(-3)
    expect(keyAt(body.track, 28500).attitude!.pitchDeg!).toBeGreaterThan(3)
    // It faces where it goes: north.
    const heading = keyAt(body.track, 20000).attitude!.headingDeg!
    expect(Math.min(heading, 360 - heading)).toBeLessThan(5)
  })

  test("leans into the wind to hold its place: some 9° in 10 m/s", () => {
    const [body] = DroneFlight.bodiesOf(quad({ wind: { fromDeg: 0, speedMS: 10 }, headingDeg: 0 }))
    expect(keyAt(body.track, 5000).attitude!.pitchDeg!).toBeCloseTo(-9, 0)
  })

  test("flashes its strobe at 1.25 Hz for 60 ms, switched by keys a millisecond apart, and keeps its front lights steady", () => {
    const [body] = DroneFlight.bodiesOf(quad())
    const strobe = "light-strobe"
    const on = body.track.filter(key => key.lights![strobe] > 0)
    const flashes = body.track.filter((key, i) => i > 0 && i < body.track.length - 1 && key.lights![strobe] > 0 && !(body.track[i - 1].lights![strobe] > 0))
    expect(flashes.length).toBeGreaterThanOrEqual(49)
    expect(flashes.length).toBeLessThanOrEqual(51)
    for (const flash of flashes) {
      const before = body.track[body.track.indexOf(flash) - 1]
      expect(flash.t - before.t).toBe(1)
    }
    expect(on.length).toBeGreaterThan(0)
    // 40 cd over a 6 mm LED's disc.
    expect(on[0].lights![strobe]).toBeCloseTo(40 / (Math.PI * 0.006 ** 2), -1)
    expect(body.track.every(key => key.lights!["light-front-1"] > 0 && key.lights!["light-front-2"] > 0)).toBe(true)
  })

  test("puts out a light the interpretation puts out, recolours one it recolours, and is silent when it says so", () => {
    const [body] = DroneFlight.bodiesOf(quad({ lights: { strobe: false, front: { color: "#ffffff" } }, silent: true }))
    expect(body.track.every(key => key.lights!["light-strobe"] === undefined)).toBe(true)
    expect(body.modelParameters!.frontColor).toBe("#ffffff")
    expect(body.sound).toBeUndefined()
    expect(DroneFlight.bodiesOf(quad())[0].sound).toEqual({ kind: "unmanned" })
  })

  test("a swarm's strobes do not flash together, and it is measured as one against what it explains", () => {
    const bodies = DroneFlight.bodiesOf(quad({ count: 5, formation: { kind: "cluster" }, explains: ["lights"] }))
    expect(bodies).toHaveLength(5)
    expect(new Set(bodies.map(body => body.ensemble))).toEqual(new Set(["quad"]))
    const firstFlash = bodies.map(body => body.track.find(key => key.lights!["light-strobe"] > 0)!.t)
    expect(new Set(firstFlash).size).toBeGreaterThan(1)
  })

  test("a drone on a wing flies on and banks into its turns", () => {
    const [body] = DroneFlight.bodiesOf({
      id: "wing", airframe: "fixed-wing",
      path: [{ t: 0, eastM: 0, northM: 0, altitudeM: 300 }, { t: 10000, eastM: 0, northM: 200, altitudeM: 300 }, { t: 20000, eastM: 200, northM: 200, altitudeM: 300 }]
    })
    // Moving at its first point, and turning right (east) round its second: right side down.
    expect(keyAt(body.track, 1000).northM! - body.track[0].northM!).toBeGreaterThan(10)
    expect(keyAt(body.track, 10000).attitude!.rollDeg!).toBeGreaterThan(10)
  })
})
