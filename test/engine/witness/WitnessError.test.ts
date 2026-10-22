import { describe, expect, it } from "vitest"
import { WitnessError } from "../../../src/engine/witness/WitnessError.js"

const consolidated = WitnessError.byId("consolidated")
const keul = WitnessError.byId("keul")

describe("WitnessError", () => {
  it("reads a time within 6 minutes, 2 when anchored, 1 on a clock", () => {
    expect(consolidated.law({ kind: "time", value: 0 })).toMatchObject({ low: -6, high: 6, status: "single" })
    expect(consolidated.law({ kind: "time", value: 0, how: "anchored" })).toMatchObject({ low: -2, high: 2, status: "argued" })
    expect(consolidated.law({ kind: "time", value: 0, basis: "measured" })).toMatchObject({ low: -1, high: 1 })
  })

  it("reads a duration ×/÷3, log-normal", () => {
    expect(consolidated.law({ kind: "duration", value: 120 })).toMatchObject({ low: 40, high: 360, status: "consolidated" })
  })

  it("reads an elevation as overestimated, never as underestimated", () => {
    const law = consolidated.law({ kind: "elevation", value: 30 })
    expect(law.high).toBe(30)
    expect(law.low).toBeLessThan(30)
  })

  it("makes a distance no data unless anchored", () => {
    expect(consolidated.law({ kind: "distance", value: 300 }).shape).toBe("uninformative")
    expect(consolidated.law({ kind: "distance", value: 300, how: "occlusion" }).shape).toBe("anchored")
  })

  it("sizes by the observer's own factor once the Moon gauge is taken, whatever the model", () => {
    const conditions = { moonShownDeg: 1.56 }
    expect(WitnessError.moonFactor(conditions)).toBeCloseTo(3)
    for (const model of [consolidated, keul]) {
      const law = model.law({ kind: "angularSize", value: 6 }, conditions)
      expect(law.status).toBe("individual")
      expect((law.low! + law.high!) / 2).toBeCloseTo(2, 1)
    }
  })

  it("lets the models disagree on an angular size given without the gauge", () => {
    expect(consolidated.law({ kind: "angularSize", value: 4 })).toMatchObject({ low: 1, high: 4 / 3, note: "sizeArm" })
    expect(keul.law({ kind: "angularSize", value: 4 }).note).toBe("sizeShown")
    expect(keul.parameters().find(parameter => parameter.id === "size")!.note).toBe("sizeShown")
  })

  it("ties an observer's errors with six parameters, the clock's from how the time was given", () => {
    const parameters = consolidated.parameters(undefined, "anchored")
    expect(parameters.map(parameter => parameter.id)).toEqual(["clock", "date", "heading", "elevation", "size", "duration"])
    expect(parameters[0].note).toBe("clockAnchored")
  })

  it("rounds a law's figures to 2 significant figures", () => {
    expect(WitnessError.rounded(1234)).toBe(1200)
    expect(WitnessError.rounded(0.04567)).toBe(0.046)
  })
})

describe("BodyConfrontation with an error model", () => {
  it("contradicts a direction only outside the laws, not merely beside the account", async () => {
    const { BodyConfrontation } = await import("../../../src/engine/interpretation/BodyConfrontation.js")
    const laws = BodyConfrontation.lawsOf(consolidated)
    const stated = { aim: { azimuthDeg: 200, altitudeDeg: 20 }, angular: { widthDeg: 1, heightDeg: 1 } }
    const at = (azimuthDeg: number, altitudeDeg: number, widthDeg = 0.3) => ({ aim: { azimuthDeg, altitudeDeg }, angular: { widthDeg, heightDeg: widthDeg } })
    // 20° off and lower: wrong to the fixed tolerances, within the laws.
    expect(BodyConfrontation.compare("s", "b", stated, at(220, 12)).disagreements).toContain("direction")
    expect(BodyConfrontation.compare("s", "b", stated, at(220, 12), laws).disagreements).not.toContain("direction")
    // Higher than said: elevation is overestimated, never under, so this is contradicted.
    expect(BodyConfrontation.compare("s", "b", stated, at(200, 35), laws).disagreements).toContain("direction")
    // A third of the stated size is what an arm's-length overestimate makes of it.
    expect(BodyConfrontation.compare("s", "b", stated, at(200, 15, 0.3), laws).disagreements).not.toContain("width")
  })
})
