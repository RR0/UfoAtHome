import { describe, expect, test } from "vitest"
import { ExhaustFlight, ExhaustPath } from "../../../src/engine/interpretation/ExhaustFlight.js"

/** A point `heightKm` up over the equator at longitude 0, Earth-fixed km. */
const over = (heightKm: number): [number, number, number] => [ExhaustFlight.EARTH_RADIUS_KM + heightKm, 0, 0]

describe("ExhaustFlight", () => {
  test("the air thins as the Standard Atmosphere says", () => {
    expect(ExhaustFlight.airDensity(0)).toBeCloseTo(1.225, 3)
    expect(ExhaustFlight.airDensity(150) / 2.08e-9).toBeCloseTo(1, 3)
    expect(ExhaustFlight.airDensity(175)).toBeLessThan(ExhaustFlight.airDensity(150))
    expect(ExhaustFlight.airDensity(175)).toBeGreaterThan(ExhaustFlight.airDensity(200))
  })

  test("the air holds a puff back where it is thick enough for its molecules to hit it, and not 1 000 km up", () => {
    const low = ExhaustFlight.dragPerKm(150, 2, 10)
    const high = ExhaustFlight.dragPerKm(1000, 50, 10)
    // At 150 km a 2 km puff of 10 kg sweeps its own mass of air in about a kilometre.
    expect(low).toBeGreaterThan(0.5)
    // At 1000 km the molecules fly thousands of kilometres between two collisions: they go through.
    expect(high).toBeLessThan(1e-6)
  })

  test("thrown backwards at 3 km/s at 150 km, a puff stops within a few kilometres", () => {
    const start = over(150)
    const path = new ExhaustPath(start, [0, -3, 0], 10, age => 1 + 2.5 * age)
    const a = path.at(10)
    const b = path.at(20)
    expect(Math.hypot(a[1] - start[1], a[2] - start[2])).toBeLessThan(5)
    expect(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2])).toBeLessThan(0.5)
  })

  test("1 000 km up, a puff flies on as a body in orbit does", () => {
    const r = ExhaustFlight.EARTH_RADIUS_KM + 1000
    // A circular orbit's speed there, in space; over the turning ground, less the ground's own.
    const speed = Math.sqrt(398600.4418 / r) - 7.2921159e-5 * r
    const path = new ExhaustPath(over(1000), [0, speed, 0], 10, age => 0.2 + 0.1 * age)
    for (const age of [60, 300]) {
      const p = path.at(age)
      // Still at its height, having gone the way an orbit goes.
      expect(Math.hypot(...p) - ExhaustFlight.EARTH_RADIUS_KM).toBeCloseTo(1000, -1)
    }
    const minute = path.at(60)
    expect(Math.hypot(minute[0] - r, minute[1], minute[2])).toBeGreaterThan(speed * 60 * 0.98)
  })

  test("a path asked again for an age it has already flown gives the same place", () => {
    const path = new ExhaustPath(over(500), [1, 2, 3], 10, () => 1)
    const later = path.at(42.5)
    path.at(100)
    expect(path.at(42.5)).toEqual(later)
  })
})
