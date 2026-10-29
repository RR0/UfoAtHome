import { describe, expect, it } from "vitest"
import { SkyLantern } from "../../../src/engine/interpretation/SkyLantern.js"
import type { LanternLaunchJson } from "../../../src/engine/interpretation/SkyLantern.js"

/** Three lanterns let go a minute apart from a garden 3 km north of the observer, at 200 m above sea level. */
const launch = (more: Partial<LanternLaunchJson> = {}): LanternLaunchJson => ({
  id: "wedding",
  site: { eastM: 0, northM: 3000, originElevationM: 200 },
  releases: [{ t: 0, explains: ["light-1"] }, { t: 60000 }, { t: 120000 }],
  ...more
})

describe("SkyLantern", () => {
  it("climbs at a metre or two a second, to some hundreds of metres, and goes out", () => {
    const path = SkyLantern.trajectory(launch(), launch().releases![0])
    const at = (s: number) => path.find(point => point.t === s * 1000)!
    const climbRate = (at(120).z - at(60).z) / 60
    expect(climbRate).toBeGreaterThan(0.7)
    expect(climbRate).toBeLessThan(2.5)
    const top = Math.max(...path.map(point => point.z))
    expect(top).toBeGreaterThan(300)
    expect(top).toBeLessThan(1500)
    expect(path[path.length - 1].light).toBeLessThan(0.05)
  })

  it("stays over where it was let go without wind, and goes with it otherwise", () => {
    // In a still, laminar air: no gust to stray from the mean wind.
    const laminar = { horizontalMS: 0, verticalMS: 0, timescaleS: 30 }
    const still = SkyLantern.trajectory(launch({ turbulence: laminar }), launch().releases![0])
    expect(Math.abs(still[still.length - 1].x)).toBeLessThan(1e-6)
    const blown = SkyLantern.trajectory(launch({ wind: { towardDeg: 90, speedMS: 3 }, turbulence: laminar }), launch().releases![0])
    const after = blown.find(point => point.t === 300000)!
    // Carried at nearly the wind's speed: it weighs next to nothing against the air it pushes aside.
    expect(after.x / 300).toBeGreaterThan(2.7)
    expect(after.x / 300).toBeLessThan(3.01)
  })

  it("parts from another let go at the same spot, each meeting its own gusts, the same way each time", () => {
    const windy = launch({ wind: { towardDeg: 90, speedMS: 3 }, releases: [{ t: 0, seed: 1 }, { t: 0, seed: 2 }] })
    const one = SkyLantern.trajectory(windy, windy.releases![0]), other = SkyLantern.trajectory(windy, windy.releases![1])
    const at = (path: typeof one, s: number) => path.find(point => point.t === s * 1000)!
    // A few metres apart after a minute, tens after five: a group stretches and shifts, it does not fly in formation.
    const apart = (s: number) => Math.hypot(at(one, s).x - at(other, s).x, at(one, s).y - at(other, s).y, at(one, s).z - at(other, s).z)
    expect(apart(300)).toBeGreaterThan(20)
    expect(apart(300)).toBeGreaterThan(apart(60))
    // Still with the wind on the whole: a gust strays from it, it does not carry the lantern off on its own.
    expect(at(one, 300).x / 300).toBeGreaterThan(2.3)
    expect(at(one, 300).x / 300).toBeLessThan(3.7)
    expect(SkyLantern.trajectory(windy, windy.releases![0])).toEqual(one)
  })

  it("is carried by the wind of the height it has reached", () => {
    const sheared = launch({ wind: { towardDeg: 90, speedMS: 2 }, windAloft: { towardDeg: 0, speedMS: 8, atM: 500 } })
    expect(SkyLantern.windAt(sheared, 0).x).toBeCloseTo(2, 6)
    expect(SkyLantern.windAt(sheared, 1000).y).toBeCloseTo(8, 6)
    const path = SkyLantern.trajectory(sheared, sheared.releases![0])
    const end = path[path.length - 1]
    expect(end.y - 3000).toBeGreaterThan(end.x)
  })

  it("climbs slower with a weaker flame", () => {
    const strong = SkyLantern.trajectory(launch(), { t: 0 })
    const weak = SkyLantern.trajectory(launch(), { t: 0, lantern: { insideExcessK: 120 } })
    expect(weak.find(point => point.t === 120000)!.z).toBeLessThan(strong.find(point => point.t === 120000)!.z)
  })

  it("burns fully, then dies down over the last quarter", () => {
    const type = SkyLantern.COMMON
    expect(SkyLantern.heatShare(type, 0)).toBe(1)
    expect(SkyLantern.heatShare(type, type.burnS * 0.5)).toBe(1)
    expect(SkyLantern.heatShare(type, type.burnS * 0.875)).toBeCloseTo(0.5, 6)
    expect(SkyLantern.heatShare(type, type.burnS)).toBe(0)
  })

  it("adds one glowing body per lantern, gone once out", () => {
    const expanded = SkyLantern.expand({ bodies: [], lanterns: [launch()] })
    expect(expanded.bodies.map(body => body.id)).toEqual(["wedding-lantern-1", "wedding-lantern-2", "wedding-lantern-3"])
    const first = expanded.bodies[0]
    expect(first.explains).toEqual(["light-1"])
    expect(first.track[0].appearance!.luminanceCdM2).toBeGreaterThan(0)
    expect(first.track[first.track.length - 1].present).toBe(false)
    expect(expanded.bodies[1].track[0].t).toBe(60000)
  })

  it("draws a group's lanterns within what it states, the same each time", () => {
    const grouped = launch({ releases: undefined, group: { count: 20, fromT: 0, untilT: 190000, radiusM: 30, burnS: { min: 500, max: 700 } } })
    const releases = SkyLantern.releasesOf(grouped)
    expect(releases).toHaveLength(20)
    for (const release of releases) {
      expect(release.t).toBeGreaterThanOrEqual(0)
      expect(release.t).toBeLessThanOrEqual(190000)
      expect(Math.hypot(release.eastM!, release.northM!)).toBeLessThanOrEqual(30)
      expect(release.lantern!.burnS).toBeGreaterThanOrEqual(500)
      expect(release.lantern!.burnS).toBeLessThanOrEqual(700)
    }
    // Not all alike, and in their order.
    expect(new Set(releases.map(release => release.lantern!.burnS)).size).toBeGreaterThan(10)
    expect(releases.map(release => release.t)).toEqual([...releases.map(release => release.t)].sort((a, b) => a - b))
    expect(SkyLantern.releasesOf(grouped)).toEqual(releases)
    expect(SkyLantern.releasesOf({ ...grouped, group: { ...grouped.group!, seed: 2 } })).not.toEqual(releases)
  })

  it("goes on from where one is first seen, with what is left of its burn", () => {
    const seen = SkyLantern.trajectory(launch(), { t: 5000, altitudeM: 400, burnedS: 300 })
    expect(seen[0]).toMatchObject({ t: 5000, z: 400 })
    // Out once its whole burn is spent: 300 s burned already, 300 s left.
    expect(seen[seen.length - 1].t - 5000).toBeLessThanOrEqual(300000)
    expect(seen[seen.length - 1].t - 5000).toBeGreaterThan(290000)
  })

  it("is drawn as the lantern of its shape, its paper of its colour, which tints its light", () => {
    const [classic] = SkyLantern.bodiesOf(launch())
    expect(classic.model.id).toBe("ufoathome-sky-lantern-classic")
    expect(classic.modelParameters).toEqual({ paperColor: "#ffffff" })
    expect(classic.track[0].appearance!.color).toBe(SkyLantern.COMMON.color)
    const [red] = SkyLantern.bodiesOf(launch({ lantern: { shape: "balloon", paperColor: "#ff0000" } }))
    expect(red.model.id).toBe("ufoathome-sky-lantern-balloon")
    expect(red.modelParameters).toEqual({ paperColor: "#ff0000" })
    expect(red.track[0].appearance!.color).toBe("#ff0000")
  })

  it("glows most by its flame: its paper brighter at its mouth than at its top, and dark once out", () => {
    const [body] = SkyLantern.bodiesOf(launch())
    const lit = body.track[10].lights!
    expect(lit["paper-0"]).toBeGreaterThan(lit["paper-3"] * 3)
    expect(lit["paper-inside"]).toBeGreaterThan(lit["paper-3"])
    expect(lit.flame).toBeGreaterThan(lit["paper-0"] * 10)
    const out = body.track[body.track.length - 2].lights!
    expect(out["paper-0"]).toBeLessThan(lit["paper-0"] * 0.05)
  })

  it("leans a few degrees the way the air going past pushes it, and stands upright in a still air", () => {
    const laminar = { horizontalMS: 0, verticalMS: 0, timescaleS: 30 }
    const still = SkyLantern.trajectory(launch({ turbulence: laminar }), launch().releases![0])
    expect(Math.max(...still.map(point => point.tiltDeg))).toBeLessThan(0.01)
    const gusty = SkyLantern.trajectory(launch({ wind: { towardDeg: 90, speedMS: 3 } }), launch().releases![0])
    const tilts = gusty.map(point => point.tiltDeg)
    expect(Math.max(...tilts)).toBeGreaterThan(1)
    expect(Math.max(...tilts)).toBeLessThan(35)
    // Let go into a wind, it is pushed the way the wind goes before it catches up with it.
    expect(Math.abs(((gusty[2].tiltTowardDeg - 90 + 540) % 360) - 180)).toBeLessThan(60)
    const [body] = SkyLantern.bodiesOf(launch({ wind: { towardDeg: 90, speedMS: 3 } }))
    expect(body.track[2].attitude!.pitchDeg).toBeLessThan(0)
  })

  it("leaves an interpretation without lanterns as it is", () => {
    const interpretation = { bodies: [] }
    expect(SkyLantern.expand(interpretation)).toBe(interpretation)
  })
})
