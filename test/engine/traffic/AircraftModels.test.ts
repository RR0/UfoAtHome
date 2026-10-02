import { describe, expect, test } from "vitest"
import { AircraftModels } from "../../../src/engine/traffic/AircraftModels.js"

describe("AircraftModels", () => {
  test("a type designator gives the real thing: its name, class and dimensions", () => {
    expect(AircraftModels.of({ type: "A320" })).toEqual({ code: "A320", name: "Airbus A320", kind: "airliner-narrow", spanM: 34.1, lengthM: 37.6, basis: "type" })
    expect(AircraftModels.of({ type: "B77W" })).toMatchObject({ kind: "airliner-wide", spanM: 64.8, lengthM: 73.9 })
    expect(AircraftModels.of({ type: "C172" })).toMatchObject({ kind: "light-piston", spanM: 11.0 })
    expect(AircraftModels.of({ type: "a320" }).code).toBe("A320")
  })

  test("a helicopter's span is its rotor", () => {
    const h135 = AircraftModels.of({ type: "EC35" })
    expect(AircraftModels.isHelicopter(h135)).toBe(true)
    expect(h135.spanM).toBeCloseTo(10.2)
    expect(AircraftModels.isHelicopter(AircraftModels.of({ type: "S92" }))).toBe(true)
    expect(AircraftModels.of({ type: "S92" }).kind).toBe("helicopter-heavy")
    expect(AircraftModels.isHelicopter(AircraftModels.of({ type: "A320" }))).toBe(false)
  })

  test("without a type, the category it states says what class it is", () => {
    expect(AircraftModels.of({ category: "A7" })).toMatchObject({ kind: "helicopter-medium", basis: "category" })
    expect(AircraftModels.of({ category: "A1" })).toMatchObject({ kind: "light-piston", basis: "category" })
    expect(AircraftModels.of({ category: "A5" })).toMatchObject({ kind: "airliner-wide" })
    expect(AircraftModels.of({ category: "B2" })).toMatchObject({ kind: "balloon" })
    expect(AircraftModels.of({ category: "B6" })).toMatchObject({ kind: "unmanned" })
  })

  test("the type wins over the category, which it knows better", () => {
    expect(AircraftModels.of({ type: "EC35", category: "A1" }).kind).toBe("helicopter-light")
  })

  test("a type that is not in the table falls back on the category, and then on an airliner", () => {
    expect(AircraftModels.of({ type: "ZZZZ", category: "A7" })).toMatchObject({ kind: "helicopter-medium", basis: "category" })
    expect(AircraftModels.of({ type: "ZZZZ" })).toMatchObject({ kind: "airliner-narrow", basis: "nothing" })
    expect(AircraftModels.of(undefined)).toMatchObject({ kind: "airliner-narrow", basis: "nothing" })
    expect(AircraftModels.of({})).toMatchObject({ basis: "nothing" })
  })

  test("what is stated is not made up: every dimension is positive and a wide-body is bigger than a narrow-body", () => {
    expect(AircraftModels.of({ type: "B77W" }).spanM).toBeGreaterThan(AircraftModels.of({ type: "B738" }).spanM)
    expect(AircraftModels.of({ type: "A388" }).spanM).toBeGreaterThan(79)
    for (const type of ["A320", "E190", "AT72", "C25A", "C172", "EC45", "T38", "GLID", "DRON"]) {
      const model = AircraftModels.of({ type })
      expect(model.spanM).toBeGreaterThan(0)
      expect(model.lengthM).toBeGreaterThan(0)
    }
  })
})
