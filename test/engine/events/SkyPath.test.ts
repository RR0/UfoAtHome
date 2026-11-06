import { describe, expect, it } from "vitest"
import saintLo from "../../../public/demo-data/observer-saint-lo.json"
import stated from "./saint-lo-events.json"
import { fromSightingJson, type SightingRecordingJson } from "../../../src/engine/persistence/sightingJson.js"
import type { Sighting } from "../../../src/engine/model/Sighting.js"

const angle = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180)

/** Saint-Lô as its generator wrote it (shapes and poses), and as its events say it (events_saint_lo.py). */
const drawn = fromSightingJson(structuredClone(saintLo) as unknown as SightingRecordingJson)
const told = fromSightingJson({
  ...(structuredClone(saintLo) as unknown as SightingRecordingJson),
  events: structuredClone(stated.events),
  timeline: { keyframes: [], groups: structuredClone(stated.groups) },
  observerTrack: { keyframes: [] }
} as unknown as SightingRecordingJson)

const shapeAt = (sighting: Sighting, t: number, id: string) => sighting.timeline.getInterpolatedShapeAt(t, id)!

describe("SkyPath", () => {
  it("has Q. B.'s eyes follow the wing as build_saint_lo.py did: from where he looked, after his reaction, a little behind it", () => {
    const keys = drawn.observerTrack.allKeyframes
    expect(keys.length).toBeGreaterThan(100)
    let worst = 0
    for (const key of keys) {
      const pose = told.observerTrack.getInterpolatedPoseAt(key.t)!
      worst = Math.max(worst, angle(pose.headingDeg!, key.pose.headingDeg!), Math.abs(pose.pitchDeg! - key.pose.pitchDeg!))
    }
    expect(worst).toBeLessThan(0.05)
  })

  it("takes the wing across his sky as build_saint_lo.py did: up to the zenith, its three turns, down to the tree tops due south", () => {
    let worst = 0, worstTurn = 0
    // Outside what is still to be stated as events: its vibration (2.3 to 3.5 s) and its spiral (from 4.3 s). Where his look is written, every
    // 50 ms: the generator turned the shapes with a look it worked out every 25 ms, and wrote one in two.
    for (let t = 0; t < 4300; t += 50) {
      if (t >= 2300 && t < 3550) continue
      const a = shapeAt(drawn, t, "rim"), b = shapeAt(told, t, "rim")
      const cos = Math.cos(a.aim!.altitudeDeg * Math.PI / 180)
      worst = Math.max(worst, Math.abs(a.aim!.altitudeDeg - b.aim!.altitudeDeg), angle(a.aim!.azimuthDeg, b.aim!.azimuthDeg) * cos)
      worstTurn = Math.max(worstTurn, Math.abs(((a.angle - b.angle + 3 * Math.PI) % (2 * Math.PI)) - Math.PI))
    }
    expect(worst).toBeLessThan(0.02)
    expect(worstTurn).toBeLessThan(0.01)
  })

  it("draws its parts at the size they had, smaller away from the zenith, while it is not banked (before its first turn)", () => {
    for (const t of [0, 250, 500, 750, 975]) {
      for (const id of ["rim", "veil", "teeth", "filaments", "aura"]) {
        const a = shapeAt(drawn, t, id), b = shapeAt(told, t, id)
        expect(b.angular!.widthDeg, `${id} at ${t}`).toBeCloseTo(a.angular!.widthDeg, 2)
        expect(b.angular!.heightDeg, `${id} at ${t}`).toBeCloseTo(a.angular!.heightDeg, 2)
        expect(angle(b.aim!.azimuthDeg, a.aim!.azimuthDeg) * Math.cos(a.aim!.altitudeDeg * Math.PI / 180), `${id} at ${t}`).toBeLessThan(0.02)
        expect(b.transparency, `${id} at ${t}`).toBeCloseTo(a.transparency, 5)
      }
    }
  })

  it("is gone once it has gone behind the trees", () => {
    expect(shapeAt(told, 5200, "rim").transparency).toBe(1)
    expect(shapeAt(told, 4900, "rim").transparency).toBeLessThan(1)
  })
})
