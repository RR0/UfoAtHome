import { describe, expect, it } from "vitest"
import saintLo from "../../../public/demo-data/observer-saint-lo.json"
import drawn from "./saint-lo-drawn.json"
import { fromSightingJson, toSightingJson, type SightingRecordingJson } from "../../../src/engine/persistence/sightingJson.js"

const angle = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180)

type Drawn = { aim: { azimuthDeg: number, altitudeDeg: number }, angle: number, angular?: { widthDeg: number, heightDeg: number }, transparency?: number }
/** Saint-Lô as its events say it (events_saint_lo.py), against how build_saint_lo.py drew it before (saint-lo-drawn.json, every 50 ms). */
const told = fromSightingJson(structuredClone(saintLo) as unknown as SightingRecordingJson)
const keyframes = drawn.keyframes as { t: number, shapes: Record<string, Drawn> }[]

describe("SkyPath", () => {
  it("states Q. B.'s account as its events, and writes them back alone", () => {
    expect(told.events!.map(event => event.eventType)).toEqual(
      ["look", "follow", "travel", "turn", "turn", "turn", "roll", "roll", "roll", "vibrate", "spiral", "appearance", "vanish"])
    const written = toSightingJson(told)
    expect(written.timeline!.keyframes).toEqual([])
    expect(written.timeline!.groups).toEqual([{ id: "phenomenon", title: { fr: "L'aile", en: "The wing" }, members: ["rim", "veil", "teeth", "filaments", "aura"] }])
    expect(written.observerTrack).toBeUndefined()
  })

  it("has his eyes follow the wing as build_saint_lo.py did: from where he looked, after his reaction, a little behind it", () => {
    expect(drawn.poses.length).toBeGreaterThan(100)
    let worst = 0
    for (const key of drawn.poses) {
      const pose = told.observerTrack.getInterpolatedPoseAt(key.t)!
      worst = Math.max(worst, angle(pose.headingDeg!, key.headingDeg), Math.abs(pose.pitchDeg! - key.pitchDeg))
    }
    expect(worst).toBeLessThan(0.05)
  })

  it("takes the wing across his sky as build_saint_lo.py did: up to the zenith, its three turns, its vibration, down to the tree tops due south, its spiral", () => {
    let worst = 0, worstTurn = 0
    // Where his look is written, every 50 ms: the generator turned the shapes with a look it worked out every 25 ms, and wrote one in two.
    for (const keyframe of keyframes) {
      if (keyframe.t > 5000) continue
      const a = keyframe.shapes.rim, b = told.timeline.getInterpolatedShapeAt(keyframe.t, "rim")!
      const cos = Math.cos(a.aim.altitudeDeg * Math.PI / 180)
      worst = Math.max(worst, Math.abs(a.aim.altitudeDeg - b.aim!.altitudeDeg), angle(a.aim.azimuthDeg, b.aim!.azimuthDeg) * cos)
      worstTurn = Math.max(worstTurn, Math.abs(((a.angle - b.angle + 3 * Math.PI) % (2 * Math.PI)) - Math.PI))
    }
    expect(worst).toBeLessThan(0.02)
    expect(worstTurn).toBeLessThan(0.01)
  })

  it("draws its parts at the size they had, smaller away from the zenith, narrower as it banks", () => {
    const first = keyframes[0].shapes
    for (const keyframe of keyframes) {
      if (keyframe.t > 5000 || keyframe.t % 250 !== 0) continue
      for (const id of ["rim", "veil", "teeth", "filaments", "aura"]) {
        // The generator did not narrow its filaments as it banked (a leftover of the separate threads they once were): they are as wide
        // as the rim they hang from.
        if (id === "filaments" && keyframe.t >= 1000) continue
        const a = keyframe.shapes[id], b = told.timeline.getInterpolatedShapeAt(keyframe.t, id)!
        const at = `${id} at ${keyframe.t}`
        expect(b.angular!.widthDeg, at).toBeCloseTo(a.angular!.widthDeg, 2)
        expect(b.angular!.heightDeg, at).toBeCloseTo(a.angular!.heightDeg, 2)
        expect(angle(b.aim!.azimuthDeg, a.aim.azimuthDeg) * Math.cos(a.aim.altitudeDeg * Math.PI / 180), at).toBeLessThan(0.02)
        expect(b.transparency, at).toBeCloseTo(first[id].transparency!, 5)
      }
    }
  })

  it("is gone once it has gone behind the trees", () => {
    expect(told.timeline.getInterpolatedShapeAt(5200, "rim")!.transparency).toBe(1)
    expect(told.timeline.getInterpolatedShapeAt(4900, "rim")!.transparency).toBeLessThan(1)
  })
})

describe("a table of instants", () => {
  it("goes from one row to the next gradually, or at once at a row that says so", async () => {
    const { DriveExpansion } = await import("../../../src/engine/events/DriveExpansion.js")
    const rows = [{ t: 0, value: 10 }, { t: 1000, value: 20 }, { t: 2000, value: 5, step: true }]
    expect(DriveExpansion.linear(rows, 500)).toBe(15)
    expect(DriveExpansion.linear(rows, 1999)).toBe(20)
    expect(DriveExpansion.linear(rows, 2000)).toBe(5)
    expect(DriveExpansion.linear(rows, 3000)).toBe(5)
  })

  it("has Saint-Lô slow down at once as it starts spiralling, in one row", () => {
    const travel = saintLo.events.find(event => event.eventType === "travel")!
    const speeds = (travel.params as unknown as { speeds: { value: { t: number, step?: boolean }[] } }).speeds.value
    expect(speeds.map(row => row.t)).toEqual([0, 500, 1100, 4300])
    expect(speeds[3].step).toBe(true)
  })
})
