import { describe, expect, it } from "vitest"
import { SearchlightSighting } from "../../../src/modules/sky-events/searchlights/Searchlight.js"
import type { SearchlightJson } from "../../../src/modules/sky-events/searchlights/Searchlight.js"

const SKYTRACKER: SearchlightJson = { id: "s", lat: 45.75, lng: 4.95, beams: 4, tiltDeg: 30, periodS: 12 }

describe("SearchlightSighting", () => {
  it("gives a skytracker's four heads a cloverleaf, a single head a sweep, a sheaf a turn, unless the recording says", () => {
    expect(SearchlightSighting.motionOf(SKYTRACKER)).toBe("cloverleaf")
    expect(SearchlightSighting.motionOf({ ...SKYTRACKER, beams: undefined })).toBe("sweep")
    expect(SearchlightSighting.motionOf({ ...SKYTRACKER, beams: 8 })).toBe("rotate")
    expect(SearchlightSighting.motionOf({ ...SKYTRACKER, motion: "fixed" })).toBe("fixed")
  })

  it("leans a cloverleaf's beams out at its leaves' tips and back to the vertical between them, round and round", () => {
    const at = (t: number) => SearchlightSighting.aimsAt(SKYTRACKER, t)
    expect(at(0)).toHaveLength(4)
    expect(at(0)[0].tiltDeg).toBeCloseTo(30, 6)
    // An eighth of a turn later, between two leaves: upright.
    expect(at(1500)[0].tiltDeg).toBeCloseTo(0, 6)
    // The base has turned by 45°.
    expect(at(1500)[0].azimuthDeg).toBeCloseTo(45, 6)
    // A whole period brings everything back.
    at(12000).forEach((aim, i) => {
      expect(aim.tiltDeg).toBeCloseTo(at(0)[i].tiltDeg, 6)
      expect(aim.azimuthDeg).toBeCloseTo(at(0)[i].azimuthDeg, 6)
    })
  })

  it("swings a single head across its sweep and back, and turns a sheaf at an even spacing", () => {
    const head: SearchlightJson = { id: "h", lat: 0, lng: 0, motion: "sweep", azimuthDeg: 90, spreadDeg: 60, periodS: 8 }
    expect(SearchlightSighting.aimsAt(head, 2000)[0].azimuthDeg).toBeCloseTo(120, 6)
    expect(SearchlightSighting.aimsAt(head, 6000)[0].azimuthDeg).toBeCloseTo(60, 6)
    const sheaf = SearchlightSighting.aimsAt({ id: "r", lat: 0, lng: 0, beams: 6, motion: "rotate", periodS: 10 }, 2500)
    expect(sheaf.map(aim => aim.azimuthDeg)).toEqual([90, 150, 210, 270, 330, 30].map(expected => expect.closeTo(expected, 6)))
  })

  it("puts a skytracker head's light at some 10⁵ lm, and some 300 lux on a cloud base a kilometre up", () => {
    expect(SearchlightSighting.fluxLm(3e8, 1)).toBeGreaterThan(9e4)
    expect(SearchlightSighting.fluxLm(3e8, 1)).toBeLessThan(1.2e5)
    expect(SearchlightSighting.illuminanceLux(3e8, 1, 1000)).toBeCloseTo(300, 6)
    // At its half width, half of it.
    expect(SearchlightSighting.illuminanceLux(3e8, 1, 1000, (0.5 * Math.PI) / 180)).toBeCloseTo(150, 6)
  })

  it("runs a patch on a cloud base a kilometre up at hundreds of metres a second", () => {
    const light: SearchlightJson = { id: "r", lat: 0, lng: 0, beams: 1, motion: "rotate", tiltDeg: 25, periodS: 10 }
    const a = SearchlightSighting.patchOn(SearchlightSighting.aimsAt(light, 0)[0], 1000)!
    const b = SearchlightSighting.patchOn(SearchlightSighting.aimsAt(light, 100)[0], 1000)!
    const speed = Math.hypot(b.eastM - a.eastM, b.northM - a.northM) / 0.1
    expect(Math.hypot(a.eastM, a.northM)).toBeCloseTo(1000 * Math.tan((25 * Math.PI) / 180), 3)
    expect(speed).toBeGreaterThan(280)
    expect(speed).toBeLessThan(310)
    expect(SearchlightSighting.patchOn({ tiltDeg: 90, azimuthDeg: 0 }, 1000)).toBeUndefined()
  })

  it("is on only between its instants, and reaches as far as its beams are followed", () => {
    const timed = { ...SKYTRACKER, fromT: 1000, untilT: 2000 }
    expect(SearchlightSighting.onAt([timed], 500)).toEqual([])
    expect(SearchlightSighting.onAt([timed], 1500)).toEqual([timed])
    const reach = SearchlightSighting.reachM([SKYTRACKER], { lat: 45.73, lng: 4.98 })
    expect(reach).toBeGreaterThan(SearchlightSighting.RANGE_M + 2500)
    expect(reach).toBeLessThan(SearchlightSighting.RANGE_M + 3500)
  })
})
