import { describe, expect, it } from "vitest"
import { decorModelOf } from "../../src/engine/model/Decor.js"
import { DecorTraits } from "../../src/engine/model/DecorTraits.js"

describe("DecorTraits", () => {
  it("offers a person nothing to switch, light or paint once it is a model", () => {
    expect(DecorTraits.of({ kind: "entity", model: { id: "makehuman-woman" } })).toEqual({
      color: false, lit: false, lights: false, windows: false, floors: false, observerSide: false
    })
  })

  it("offers a built-in shape its colour", () => {
    expect(DecorTraits.of({ kind: "entity" }).color).toBe(true)
  })

  it("gives an aircraft its lamp rigs and no single switch, model or not", () => {
    const traits = DecorTraits.of({ kind: "aircraft", model: { id: "amvlab-a320" } })
    expect(traits.lights).toBe(true)
    expect(traits.lit).toBe(false)
    expect(traits.color).toBe(false)
  })

  it("keeps a car's headlights switch for its built-in shape only, and its lamp rigs for both", () => {
    expect(DecorTraits.of({ kind: "vehicle" })).toMatchObject({ lit: true, lights: true, windows: true, color: true })
    expect(DecorTraits.of({ kind: "vehicle", model: { id: "kenney-car-kit-sedan" } })).toMatchObject({ lit: false, lights: true, windows: false, color: false })
  })

  it("keeps a street lamp's switch whatever it is drawn as", () => {
    expect(DecorTraits.of({ kind: "streetlight", model: { id: "kenney-street-light-curved" } }).lit).toBe(true)
  })

  it("draws a building as its shape again, with windows and floors, once the observer is inside", () => {
    expect(DecorTraits.of({ kind: "building", model: { id: "kenney-suburban-house" } })).toMatchObject({ windows: false, floors: false })
    expect(DecorTraits.of({ kind: "building", model: { id: "kenney-suburban-house" }, observerSide: "front" })).toMatchObject({ windows: true, floors: true, color: true })
  })

  it("lets a model publish what it supports", () => {
    expect(DecorTraits.of({ kind: "tree", model: { id: "repaintable" } }, { color: true }).color).toBe(true)
    expect(DecorTraits.of({ kind: "vehicle", model: { id: "with-lamps" } }, { lit: true }).lit).toBe(true)
    expect(DecorTraits.of({ kind: "aircraft", model: { id: "no-lamps" } }, { lights: false }).lights).toBe(false)
  })

  it("draws an aircraft that names no model as the generic airliner, and nothing else by default", () => {
    expect(decorModelOf({ kind: "aircraft" })).toEqual({ id: "poly-google-airliner" })
    expect(decorModelOf({ kind: "aircraft", model: { id: "amvlab-a320" } })).toEqual({ id: "amvlab-a320" })
    expect(decorModelOf({ kind: "tree", id: "tree-1" })?.id).toMatch(/^jungle-jim-tree-/)
    expect(decorModelOf({ kind: "tree", id: "tree-1" })).toEqual(decorModelOf({ kind: "tree", id: "tree-1" }))
    expect(new Set(Array.from({ length: 40 }, (_, i) => decorModelOf({ kind: "tree", id: `tree-${i}` })?.id)).size).toBeGreaterThan(3)
    expect(decorModelOf({ kind: "tree", id: "tree-1", model: { id: "kenney-tree-conifer" } })).toEqual({ id: "kenney-tree-conifer" })
    expect(DecorTraits.of({ kind: "aircraft" })).toMatchObject({ color: false, windows: false, lights: true })
  })
})
