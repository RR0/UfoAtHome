import { describe, expect, it } from "vitest"
import { ContrailEngines } from "../../../src/engine/traffic/ContrailEngines.js"
import type { AircraftKind } from "../../../src/engine/traffic/AircraftModels.js"

describe("ContrailEngines", () => {
  it("gives a share of the fuel's heat that becomes thrust to every machine that burns kerosene in a turbofan", () => {
    for (const kind of ["airliner-narrow", "airliner-wide", "regional-jet", "business-jet", "military-jet"] as AircraftKind[]) {
      const efficiency = ContrailEngines.efficiencyOf(kind)!
      expect(efficiency).toBeGreaterThan(0.15)
      expect(efficiency).toBeLessThan(0.45)
    }
  })

  it("rates a wide-body's large bypass engines above a fighter's", () => {
    expect(ContrailEngines.efficiencyOf("airliner-wide")!).toBeGreaterThan(ContrailEngines.efficiencyOf("military-jet")!)
  })

  it("takes an aircraft of an unknown kind for an airliner, as the scene does", () => {
    expect(ContrailEngines.efficiencyOf("unknown")).toBe(ContrailEngines.efficiencyOf("airliner-narrow"))
  })

  it("models no trail for what does not fly high enough on a jet engine: propellers, rotors, gliders, balloons, drones", () => {
    for (const kind of ["regional-turboprop", "light-piston", "turboprop-light", "helicopter-light", "helicopter-medium", "helicopter-heavy", "glider", "balloon", "ultralight", "unmanned"] as AircraftKind[]) {
      expect(ContrailEngines.efficiencyOf(kind)).toBeUndefined()
    }
  })
})
