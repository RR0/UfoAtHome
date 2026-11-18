import { describe, expect, test } from "vitest"
import { EngineDirectivity } from "../../../src/engine/traffic/EngineDirectivity.js"

const LOW = 0
const HIGH = 6

describe("EngineDirectivity", () => {
  test("changes nothing abeam, where the classes' levels were set", () => {
    for (const regime of ["takeoff", "overflight", "approach"] as const) {
      for (const level of EngineDirectivity.bandsDb(90, regime)) expect(level).toBeCloseTo(0, 9)
    }
  })

  test("a jet taking off roars behind: its lows some 8 dB stronger at 140 to 160° than abeam, and 3 to 4 dB weaker ahead", () => {
    const behind = EngineDirectivity.bandsDb(150, "takeoff")[LOW]
    const ahead = EngineDirectivity.bandsDb(0, "takeoff")[LOW]
    expect(behind).toBeGreaterThan(7)
    expect(behind).toBeLessThan(11)
    expect(ahead).toBeLessThan(-3)
    expect(behind - ahead).toBeGreaterThan(10)
  })

  test("on the jet's axis its highs are refracted away: a cone of silence", () => {
    expect(EngineDirectivity.bandsDb(175, "takeoff")[HIGH]).toBeLessThan(-10)
    expect(EngineDirectivity.bandsDb(175, "takeoff")[LOW]).toBeGreaterThan(EngineDirectivity.bandsDb(175, "takeoff")[HIGH] + 10)
  })

  test("the slower the jet against the air, the less it roars behind: least on approach", () => {
    const rear = (regime: "takeoff" | "overflight" | "approach") => EngineDirectivity.bandsDb(145, regime)[LOW]
    expect(rear("takeoff")).toBeGreaterThan(rear("overflight"))
    expect(rear("overflight")).toBeGreaterThan(rear("approach"))
  })

  test("the fan sings ahead out of its inlet and behind out of its duct, and least abeam: as Heidmann's tables have it", () => {
    // In the highs, which are the fan's alone.
    const fan = (angle: number) => EngineDirectivity.bandsDb(angle, "approach")[HIGH]
    expect(fan(30)).toBeGreaterThan(2)
    expect(fan(125)).toBeGreaterThan(4)
    expect(fan(60)).toBeLessThan(0)
    // Heidmann's discharge falls 20 dB from its peak to the axis; with the inlet's floor under it, some 15 dB under abeam.
    expect(fan(180)).toBeCloseTo(-15.3, 0)
  })

  test("the angle between a heading and the way to a listener", () => {
    expect(EngineDirectivity.angleDeg([1, 0, 0], [1, 0, 0])).toBeCloseTo(0, 9)
    expect(EngineDirectivity.angleDeg([1, 0, 0], [0, 0, -1])).toBeCloseTo(90, 9)
    expect(EngineDirectivity.angleDeg([1, 0, 0], [-1, 0, 0])).toBeCloseTo(180, 9)
    expect(EngineDirectivity.angleDeg([0, 0, 0], [1, 0, 0])).toBe(90)
  })

  test("the loudest each band gets in any direction is behind for the lows", () => {
    const loudest = EngineDirectivity.loudestDb("takeoff")
    expect(loudest[LOW]).toBeCloseTo(Math.max(...Array.from({ length: 37 }, (_, i) => EngineDirectivity.bandsDb(i * 5, "takeoff")[LOW])), 9)
    expect(loudest[LOW]).toBeGreaterThan(8)
  })
})
