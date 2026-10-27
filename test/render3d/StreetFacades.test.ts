import { describe, expect, it } from "vitest"
import { StreetFacades } from "../../src/render3d/StreetFacades.js"
import type { Footprint } from "../../src/render3d/StreetFacades.js"

/** A row of houses along x, its wall nearest the street `wallZ` from the street's line, on the side `wallZ` is. */
function row(wallZ: number, depthM = 10): Footprint {
  return { x: 0, z: wallZ + Math.sign(wallZ) * depthM / 2, alongX: 1, alongZ: 0, halfAlongM: 60, halfAcrossM: depthM / 2 }
}

describe("StreetFacades", () => {
  it("measures the walls either side of a street, left of the direction of travel and right of it", () => {
    // Going east (+x), the left is +z.
    const facades = new StreetFacades([row(6.9), row(-4.2)])
    const across = facades.across(0, 0, 1, 0)
    expect(across.leftM).toBeCloseTo(6.9, 5)
    expect(across.rightM).toBeCloseTo(4.2, 5)
  })

  it("finds no wall past its reach, a square rather than a street", () => {
    const facades = new StreetFacades([row(StreetFacades.REACH_M + 2)])
    expect(facades.across(0, 0, 1, 0).leftM).toBeUndefined()
  })

  it("takes no wall the line runs into for a façade: a map and a survey that disagree", () => {
    const facades = new StreetFacades([{ x: 0, z: 0, alongX: 1, alongZ: 0, halfAlongM: 60, halfAcrossM: 3 }])
    expect(facades.across(0, 0, 1, 0)).toEqual({ leftM: undefined, rightM: undefined })
  })

  it("reads past the gap between two houses: the walls on either side of it agree", () => {
    const left: Footprint = { x: -10, z: 9, alongX: 1, alongZ: 0, halfAlongM: 9.5, halfAcrossM: 4 }
    const right: Footprint = { x: 10, z: 9, alongX: 1, alongZ: 0, halfAlongM: 9.5, halfAcrossM: 4 }
    // At x = 0 the street's own reading falls in the gap, the readings three metres either side do not.
    expect(new StreetFacades([left, right]).across(0, 0, 1, 0).leftM).toBeCloseTo(5, 5)
  })

  it("follows a building that is turned: a wall at an angle to the street is met where it is", () => {
    const heading = Math.PI / 4
    const facades = new StreetFacades([{ x: 0, z: 10, alongX: Math.cos(heading), alongZ: Math.sin(heading), halfAlongM: 3, halfAcrossM: 3 }])
    // A square turned 45° about (0, 10): its nearest corner is 3√2 short of its centre.
    expect(facades.wall(0, 0, 0, 1)).toBeCloseTo(10 - 3 * Math.SQRT2, 5)
  })

  it("gives the surveyed lamps along a street as how far left of it each stands, not one past its ends", () => {
    const facades = new StreetFacades([], [{ x: 50, z: 2 }, { x: 20, z: -3 }, { x: 120, z: 0 }])
    expect(facades.lampsAlong([{ x: 0, z: 0 }, { x: 100, z: 0 }])).toEqual([2, -3])
    expect(facades.near([{ x: 0, z: 0 }, { x: 100, z: 0 }])).toBe(true)
  })
})
