import { describe, expect, it } from "vitest"
import { RouteFollowing } from "../../../src/render3d/terrain/RouteFollowing.js"

const METRES_PER_DEGREE = 111320
const LAT = 49.1
const LNG = 2.75
/** A place `east` and `north` metres from the origin of the tests. */
const at = (eastM: number, northM: number) => ({ lat: LAT + northM / METRES_PER_DEGREE, lng: LNG + eastM / (METRES_PER_DEGREE * Math.cos(LAT * Math.PI / 180)) })

describe("RouteFollowing", () => {
  const carriedRoad = [at(-30, 0), at(30, 0)]

  it("follows a road it goes along, whichever way it runs along it", () => {
    expect(RouteFollowing.follows([at(-200, 3), at(200, 3)], carriedRoad)).toBe(true)
    expect(RouteFollowing.follows([at(200, 3), at(-200, 3)], carriedRoad)).toBe(true)
  })

  it("does not follow a road it goes under: across it, at the bridge", () => {
    expect(RouteFollowing.follows([at(0, -200), at(0, 200)], carriedRoad)).toBe(false)
  })

  it("does not follow a road that runs beside it, farther than a track is wrong by", () => {
    expect(RouteFollowing.follows([at(-200, 60), at(200, 60)], carriedRoad)).toBe(false)
  })

  it("does not follow a road it only crosses at a slant, however close, and follows one it joins", () => {
    expect(RouteFollowing.follows([at(-50, -50), at(50, 50)], carriedRoad)).toBe(false)
    // A track whose points are a long way apart is a few degrees off a road's own line.
    expect(RouteFollowing.follows([at(-200, -8), at(200, 6)], carriedRoad)).toBe(true)
  })

  it("needs a route and a road: a place, or nothing, follows nothing", () => {
    expect(RouteFollowing.follows([at(0, 0)], carriedRoad)).toBe(false)
    expect(RouteFollowing.follows([], carriedRoad)).toBe(false)
    expect(RouteFollowing.follows([at(-200, 3), at(200, 3)], [at(0, 0)])).toBe(false)
  })
})
