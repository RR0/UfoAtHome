import { describe, expect, it } from "vitest"
import { TrackProfile } from "../../src/render3d/TrackProfile.js"
import type { TrackLayout } from "../../src/render3d/TrackProfile.js"

/** A straight line along x, a rung every `step` metres, with an altitude at each rung where `altitude` gives one. */
function straight(fromX: number, toX: number, overrides: Partial<TrackLayout> = {}, altitude?: (x: number) => number, step = 3): TrackLayout {
  const centre: TrackLayout["centre"] = []
  const along: number[] = []
  const count = Math.round((toX - fromX) / step)
  for (let i = 0; i <= count; i++) {
    const x = fromX + (toX - fromX) * i / count
    centre.push({ x, z: 0, ...(altitude ? { altitudeM: altitude(x) } : {}) })
    along.push(Math.abs(x - fromX))
  }
  return { kind: "rail", level: 0, centre, along, ...overrides }
}

describe("TrackProfile", () => {
  it("passes over the hollow of an underpass in the bare relief, with no altitude to say so", () => {
    // Level ground at 10 m, and the road under the track 6 m down over 16 m.
    const ground = (x: number): number => Math.abs(x) < 8 ? 4 : 10
    const [y] = TrackProfile.heights([straight(-200, 200)], ground, undefined)
    expect(Math.min(...y)).toBeCloseTo(10, 5)
  })

  it("takes the map's altitude where it stands over a hole in the relief, and meets the bridge at it", () => {
    // The relief dips into the road cut 20 m each side of the bridge; the map says the track is level at 16 (the scene's zero is 6 m lower).
    const ground = (x: number): number => Math.abs(x) < 20 ? 6 + Math.abs(x) / 5 : 10
    const map = (): number => 16
    const [west, bridge, east] = TrackProfile.heights([
      straight(-200, -11, {}, map),
      straight(-11, 11, { level: 1 }, map),
      straight(11, 200, {}, map)
    ], ground, -6)
    expect(west[west.length - 1]).toBeCloseTo(10, 5)
    expect(bridge[0]).toBeCloseTo(10, 5)
    expect(Math.min(...bridge)).toBeCloseTo(10, 5)
    expect(east[0]).toBeCloseTo(10, 5)
  })

  it("follows a long slope exactly, and holds a line to the grade of its kind", () => {
    const slope = (x: number): number => x * 0.01
    const [y] = TrackProfile.heights([straight(0, 300)], slope, undefined)
    y.forEach((height, i) => i > 12 && i < y.length - 12 && expect(height).toBeCloseTo(slope(i * 3), 1))
    // A bump of the relief steeper than 25 ‰ is held to it.
    const graded = TrackProfile.graded([0, 0, 3, 0, 0], [0, 10, 20, 30, 40], 0.025)
    expect(graded[2]).toBeCloseTo(0.25, 5)
  })

  it("gives the lines that meet at a node the same height there", () => {
    const ground = (x: number, z: number): number => 10 + Math.sin(x / 7) + z * 0.01
    const a = straight(-150, 0)
    const b = straight(0, 150)
    const c: TrackLayout = { kind: "rail", level: 0, centre: [{ x: 0, z: 0 }, { x: 60, z: 40 }, { x: 120, z: 80 }], along: [0, 72.1, 144.2] }
    const [ya, yb, yc] = TrackProfile.heights([a, b, c], ground, undefined)
    expect(yb[0]).toBeCloseTo(ya[ya.length - 1], 9)
    expect(yc[0]).toBeCloseTo(ya[ya.length - 1], 9)
  })
})
