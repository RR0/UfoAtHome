import { describe, expect, test } from "vitest"
import { ParameterRegistry, Parameters } from "../../../src/engine/interpretation/Parameters.js"
import type { ParameterSet } from "../../../src/engine/interpretation/Parameters.js"

describe("Parameters", () => {
  test("reads a dotted key, and nothing where the path does not exist", () => {
    const element = { plume: { collarShare: 0.4 }, name: "x" }
    expect(Parameters.read(element, "plume.collarShare")).toBe(0.4)
    expect(Parameters.read(element, "name")).toBe("x")
    expect(Parameters.read(element, "plume.lifetimeS")).toBeUndefined()
    expect(Parameters.read(element, "vehicle.engine.thrustKN")).toBeUndefined()
    // A leaf is not a place to read a key from.
    expect(Parameters.read(element, "name.length")).toBeUndefined()
  })

  test("reads a value stated with its provenance as the value it states", () => {
    const element = { vehicle: { engine: { thrustKN: { value: 934, basis: "stated", rationale: "SpaceX" } } } }
    expect(Parameters.read(element, "vehicle.engine.thrustKN")).toBe(934)
  })

  test("writes a value, creating the path it needs", () => {
    const element: Record<string, unknown> = {}
    Parameters.write(element, "vehicle.engine.thrustKN", 934)
    expect(element).toEqual({ vehicle: { engine: { thrustKN: 934 } } })
  })

  test("replaces a value stated with its provenance by the bare one an author types", () => {
    const element: Record<string, unknown> = { plume: { collarShare: { value: 0.85, basis: "assumed", rationale: "by eye" } } }
    Parameters.write(element, "plume.collarShare", 0.5)
    expect(element).toEqual({ plume: { collarShare: 0.5 } })
  })

  test("clearing a value removes it, and what is left empty around it", () => {
    const element: Record<string, unknown> = { id: "a", plume: { collarShare: 0.5 }, vehicle: { name: "F9", engine: { thrustKN: 934 } } }
    Parameters.write(element, "plume.collarShare", undefined)
    expect(element).toEqual({ id: "a", vehicle: { name: "F9", engine: { thrustKN: 934 } } })
    Parameters.write(element, "vehicle.engine.thrustKN", undefined)
    expect(element).toEqual({ id: "a", vehicle: { name: "F9" } })
  })

  test("clearing a value that was never there creates nothing", () => {
    const element: Record<string, unknown> = { id: "a" }
    Parameters.write(element, "plume.collarShare", undefined)
    expect(element).toEqual({ id: "a" })
  })

  test("says whether an element states a value", () => {
    expect(Parameters.stated({ a: { b: 0 } }, "a.b")).toBe(true)
    expect(Parameters.stated({ a: {} }, "a.b")).toBe(false)
  })
})

describe("ParameterRegistry", () => {
  const set = (title: string): ParameterSet => ({ kind: "test-kind", title, parameters: [] })

  test("holds what a kind published, and the later publication replaces the earlier", () => {
    ParameterRegistry.publish(set("first"))
    expect(ParameterRegistry.of("test-kind")?.title).toBe("first")
    ParameterRegistry.publish(set("second"))
    expect(ParameterRegistry.of("test-kind")?.title).toBe("second")
    expect(ParameterRegistry.kinds()).toContain("test-kind")
    expect(ParameterRegistry.of("no-such-kind")).toBeUndefined()
  })
})
