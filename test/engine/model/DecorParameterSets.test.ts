import { describe, expect, test } from "vitest"
import { DecorParameterSets } from "../../../src/engine/model/DecorParameterSets.js"
import { FIXED_WINDOW_MIN_OPACITY_PERCENT } from "../../../src/engine/model/Decor.js"
import type { DecorKind } from "../../../src/engine/model/Decor.js"
import { Parameters } from "../../../src/engine/interpretation/Parameters.js"
import type { NumberParameter } from "../../../src/engine/interpretation/Parameters.js"

const keys = (kind: DecorKind, extra: object = {}) => DecorParameterSets.of({ kind, ...extra })?.parameters.map(spec => spec.key)

describe("DecorParameterSets", () => {
  test("a building has floors, the floor occupied, its walls, its roof, and a window on each of its four sides", () => {
    expect(keys("building")).toEqual(["floors", "occupiedFloor", "facade.color", "facade.plain", "roof.shape", "roof.riseM", "roof.ridge", "roof.color",
      "windows.front", "windows.behind", "windows.left", "windows.right"])
  })

  test("the rise of a roof is asked of a pitched one only, and the side of its ridge of a gable only", () => {
    const set = DecorParameterSets.of({ kind: "building" })!
    const shown = (key: string, element: object): boolean => set.parameters.find(spec => spec.key === key)!.visibleWhen?.(element as never) ?? true
    expect(shown("roof.riseM", {})).toBe(false)
    expect(shown("roof.riseM", { roof: { shape: "hip" } })).toBe(true)
    expect(shown("roof.ridge", { roof: { shape: "hip" } })).toBe(false)
    expect(shown("roof.ridge", { roof: { shape: "gable" } })).toBe(true)
    expect(shown("facade.plain", {})).toBe(false)
    expect(shown("facade.plain", { facade: { color: "#ffffff" } })).toBe(true)
  })

  test("a building drawn as a model has neither the walls nor the roof of the built-in shape", () => {
    expect(DecorParameterSets.of({ kind: "building", model: { id: "house" } })).toBeUndefined()
  })

  test("a vehicle has windows on its six openings, and the windscreen and rear window never open", () => {
    const set = DecorParameterSets.of({ kind: "vehicle" })!
    const bound = (key: string) => (set.parameters.find(spec => spec.key === key) as NumberParameter).min
    expect(set.parameters.map(spec => spec.key).filter(key => key.startsWith("windows."))).toEqual(["windows.front", "windows.behind", "windows.front-left", "windows.front-right", "windows.behind-left", "windows.behind-right"])
    expect(bound("windows.front")).toBe(FIXED_WINDOW_MIN_OPACITY_PERCENT)
    expect(bound("windows.behind")).toBe(FIXED_WINDOW_MIN_OPACITY_PERCENT)
    expect(bound("windows.front-left")).toBe(0)
  })

  test("a vehicle is heard running or not, and how loud, whatever it is drawn as", () => {
    expect(keys("vehicle", { model: { id: "kenney-car-kit-sedan" } })).toEqual(["engine.kind", "engine.noise"])
    const noise = DecorParameterSets.of({ kind: "vehicle", model: { id: "kenney-car-kit-sedan" } })!.parameters.find(spec => spec.key === "engine.noise")!
    // Its loudness means nothing for a parked car: it is not drawn until there is an engine.
    expect(noise.visibleWhen!({})).toBe(false)
    expect(noise.visibleWhen!({ engine: { kind: "van" } })).toBe(true)
    expect(noise.visibleWhen!({ engine: {} })).toBe(true)
  })

  test("another observer says where their own recording is", () => {
    expect(keys("observer")).toEqual(["sightingUrl"])
  })

  test("an aircraft says what it sounds like in flight, and silent is one of the answers", () => {
    const set = DecorParameterSets.of({ kind: "aircraft" })!
    expect(set.parameters.map(spec => spec.key)).toEqual(["aircraftSound"])
    const sound = set.parameters[0] as unknown as { choices: { value: string }[] }
    expect(sound.choices.map(choice => choice.value)).toContain("silent")
    expect(sound.choices.map(choice => choice.value)).toContain("helicopter-light")
  })

  test("a bridge and an overhead line have the settings their structure takes", () => {
    expect(keys("bridge")).toEqual(["bridge.spanM", "bridge.deckThicknessM", "bridge.railing.heightM", "bridge.railing.postSpacingM", "bridge.railing.rails"])
    expect(keys("wire")).toEqual(["wire.poles", "wire.diameterM", "wire.poleHeightM"])
  })

  test("kinds that have none say none, and a model drops what belonged to the shape", () => {
    expect(DecorParameterSets.of({ kind: "tree" })).toBeUndefined()
    expect(DecorParameterSets.of({ kind: "building", model: { id: "catalogue-house" } })).toBeUndefined()
    // A bridge's structure is its own, whatever the shape of a model that stands in for it.
    expect(keys("bridge", { model: { id: "catalogue-bridge" } })).toContain("bridge.spanM")
  })

  test("what a model publishes is added to what its kind has", () => {
    const published = { parameters: [{ type: "number" as const, key: "mastM", label: "Mast", min: 1, max: 30, step: 1 }] }
    expect(DecorParameterSets.of({ kind: "tree", model: { id: "catalogue-mast" } }, published)?.parameters.map(spec => spec.key)).toEqual(["modelParameters.mastM"])
    expect(keys("building", { model: { id: "catalogue-house" } })).toBeUndefined()
  })

  test("the floor occupied goes no higher than the floors there are, whatever they are now", () => {
    const set = DecorParameterSets.of({ kind: "building" })!
    const occupied = set.parameters.find(spec => spec.key === "occupiedFloor") as NumberParameter
    expect(occupied.bounds!({}).max).toBe(2)
    expect(occupied.bounds!({ floors: 7 }).max).toBe(7)
    expect(Parameters.read({ floors: { value: 7, basis: "stated" } }, "floors")).toBe(7)
  })

  test("every label is said in the four languages, so none has to fall back", () => {
    for (const kind of ["building", "vehicle", "bridge", "wire"] as DecorKind[]) {
      for (const spec of DecorParameterSets.of({ kind })!.parameters) {
        for (const text of [spec.label, spec.group, spec.hint].filter((value): value is Record<string, string> => typeof value === "object")) {
          expect(Object.keys(text).sort(), `${spec.key}`).toEqual(["en", "es", "fr", "it"])
        }
      }
    }
  })
})
