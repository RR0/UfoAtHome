import { describe, expect, it } from "vitest"
import { TrafficModels } from "../../../src/engine/traffic/TrafficModels.js"

describe("TrafficModels", () => {
  it("gives the A320 family the A320's model, whatever its size or engine", () => {
    for (const type of ["A318", "A319", "A320", "A321", "A19N", "A20N", "A21N"]) expect(TrafficModels.idOf(type)).toBe("amvlab-a320")
  })

  it("gives the 737 family the 737's model, classic or next generation", () => {
    for (const type of ["B732", "B733", "B734", "B735", "B736", "B737", "B738", "B739", "B37M", "B38M", "B39M", "B3XM"]) expect(TrafficModels.idOf(type)).toBe("amvlab-b737")
  })

  it("reads a type designator in whichever case it was written", () => {
    expect(TrafficModels.idOf("a320")).toBe("amvlab-a320")
  })

  it("has none for a type with no model of its own, nor for no type: the aircraft keeps its built-in shape", () => {
    expect(TrafficModels.idOf("B77W")).toBeUndefined()
    expect(TrafficModels.idOf("C172")).toBeUndefined()
    expect(TrafficModels.idOf(undefined)).toBeUndefined()
  })
})
