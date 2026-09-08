import { describe, expect, it } from "vitest"
import { PhenomenonDepth } from "../../src/engine/shape/PhenomenonDepth.js"

describe("PhenomenonDepth.resolve", () => {
  it("draws a phenomenon nothing constrains a few metres out, and says so", () => {
    expect(PhenomenonDepth.resolve({})).toEqual({ distanceM: PhenomenonDepth.CONVENTIONAL_M, basis: "conventional" })
  })

  it("puts a reader's hypothesis above everything the data establishes", () => {
    const depth = PhenomenonDepth.resolve({ hypothesisM: 500, derivedM: 6.5, range: { minM: 100, maxM: 200 } })
    expect(depth).toEqual({ distanceM: 500, basis: "hypothesis" })
  })

  it("prefers the witness's own walk to a crossing", () => {
    const depth = PhenomenonDepth.resolve({ derivedM: 6.5, range: { minM: 100 } })
    expect(depth).toEqual({ distanceM: 6.5, basis: "derived" })
  })

  it("draws a shape declared behind decor just past that decor", () => {
    const depth = PhenomenonDepth.resolve({ crossing: { behindM: 200 } })
    expect(depth.basis).toBe("bounded")
    expect(depth.distanceM).toBeCloseTo(220, 5)
  })

  it("draws a shape crossing undeclared decor just in front of it", () => {
    const depth = PhenomenonDepth.resolve({ crossing: { inFrontM: 2 } })
    expect(depth.basis).toBe("bounded")
    expect(depth.distanceM).toBeCloseTo(2 / 1.1, 5)
  })

  it("leaves the conventional distance alone when the ceiling is beyond it", () => {
    expect(PhenomenonDepth.resolve({ crossing: { inFrontM: 200 } })).toEqual({
      distanceM: PhenomenonDepth.CONVENTIONAL_M,
      basis: "conventional"
    })
  })

  it("takes the geometric middle of a two-sided interval", () => {
    const depth = PhenomenonDepth.resolve({ range: { minM: 10, maxM: 1000 } })
    expect(depth.basis).toBe("bounded")
    expect(depth.distanceM).toBeCloseTo(Math.sqrt(11 * (1000 / 1.1)), 5)
  })

  it("draws a contradiction behind, as the declared occluder wins", () => {
    const depth = PhenomenonDepth.resolve({ crossing: { behindM: 200, inFrontM: 40 } })
    expect(depth.basis).toBe("bounded")
    expect(depth.distanceM).toBeCloseTo(220, 5)
  })

  it("tightens a crossing with the recording's accumulated range", () => {
    const depth = PhenomenonDepth.resolve({ range: { minM: 300 }, crossing: { behindM: 200 } })
    expect(depth.basis).toBe("bounded")
    expect(depth.distanceM).toBeCloseTo(330, 5)
  })

  it("never draws nearer than the camera can see", () => {
    expect(PhenomenonDepth.resolve({ hypothesisM: 0.01 }).distanceM).toBe(PhenomenonDepth.NEAREST_M)
    expect(PhenomenonDepth.resolve({ crossing: { inFrontM: 0.1 } }).distanceM).toBe(PhenomenonDepth.NEAREST_M)
  })

  it("ignores a stated or hypothesised zero as nothing said", () => {
    expect(PhenomenonDepth.resolve({ hypothesisM: 0, statedM: 0 }).basis).toBe("conventional")
  })
})
