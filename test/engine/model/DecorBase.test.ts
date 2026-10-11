import { describe, expect, test } from "vitest"
import { DecorBase } from "../../../src/engine/model/DecorBase.js"
import { DecorBaseParameterSets } from "../../../src/engine/model/DecorBaseParameterSets.js"
import type { DecorObject } from "../../../src/engine/model/Decor.js"
import type { DecorBaseContext } from "../../../src/engine/model/DecorBase.js"
import type { NumberParameter } from "../../../src/engine/interpretation/Parameters.js"

const still = (extra: Partial<DecorObject> = {}): DecorObject => ({ id: "d", kind: "building", eastM: 10, northM: 20, headingDeg: 30, ...extra })
const aircraft = (): DecorObject => ({
  id: "a", kind: "aircraft", eastM: 0, northM: 0,
  track: [{ t: 0, eastM: 0, northM: 0, altitudeM: 100, headingDeg: 90 }, { t: 10000, eastM: 1000, northM: 0, altitudeM: 200, headingDeg: 90 }]
})

describe("DecorBase", () => {
  test("the view of a still object is where it stands, a hundredth of a metre at most", () => {
    const view = DecorBase.viewOf(still({ eastM: 10.123456 }), 5000)
    expect([view.eastM, view.northM, view.altitudeM, view.headingDeg]).toEqual([10.12, 20, 0, 30])
  })

  test("the view of an object that moves is where it is at the playhead", () => {
    const view = DecorBase.viewOf(aircraft(), 5000)
    expect([view.eastM, view.altitudeM]).toEqual([500, 150])
  })

  test("editing the east of a still object writes its own field and leaves the rest of what it states alone", () => {
    const decor = still({ color: "#ff0000", sizeM: { widthM: 6 } })
    const view = DecorBase.viewOf(decor, 0)
    view.eastM = 12
    expect(DecorBase.apply(decor, view, "eastM", 0)).toEqual({ ...decor, eastM: 12, northM: 20, headingDeg: 30 })
  })

  test("giving a still object an altitude starts a trajectory of a single keyframe, which is what 'it sits up there' means", () => {
    const decor = still()
    const view = DecorBase.viewOf(decor, 2000)
    view.altitudeM = 50
    const edited = DecorBase.apply(decor, view, "altitudeM", 2000)
    expect(edited.track).toEqual([{ t: 2000, eastM: 10, northM: 20, altitudeM: 50, headingDeg: 30 }])
    expect(edited.eastM).toBe(10)
  })

  test("an edit of an object that moves is a keyframe at the playhead, replacing one there", () => {
    const decor = aircraft()
    const view = DecorBase.viewOf(decor, 10000)
    view.eastM = 1500
    const edited = DecorBase.apply(decor, view, "eastM", 10000)
    expect(edited.track!.map(keyframe => [keyframe.t, keyframe.eastM])).toEqual([[0, 0], [10000, 1500]])
  })

  test("the heading is kept within a turn", () => {
    const decor = still()
    const view = DecorBase.viewOf(decor, 0)
    view.headingDeg = -90
    expect(DecorBase.apply(decor, view, "headingDeg", 0).headingDeg).toBe(270)
  })

  test("a width states one axis and the others stay unmeasured; clearing the last states no size", () => {
    const decor = still()
    const view = DecorBase.viewOf(decor, 0)
    view.sizeM = { widthM: 8 }
    const sized = DecorBase.apply(decor, view, "sizeM.widthM", 0)
    expect(sized.sizeM).toEqual({ widthM: 8, lengthM: undefined, heightM: undefined })
    const cleared = DecorBase.viewOf(sized, 0)
    cleared.sizeM = undefined
    expect(DecorBase.apply(sized, cleared, "sizeM.widthM", 0).sizeM).toBeUndefined()
  })

  test("renaming an object restates nothing else", () => {
    const decor = still({ color: "#00ff00" })
    const view = DecorBase.viewOf(decor, 0)
    view.title = { fr: "Grange" }
    view.color = "#123456"
    expect(DecorBase.apply(decor, view, "title", 0)).toEqual({ ...decor, title: { fr: "Grange" } })
  })

  test("the lamp switch is a keyframe at this instant, replacing one there and keeping the others sorted", () => {
    const decor = still({ kind: "streetlight", litKeyframes: [{ t: 5000, lit: true }, { t: 0, lit: false }] })
    const view = DecorBase.viewOf(decor, 5000)
    view.lit = false
    expect(DecorBase.apply(decor, view, "lit", 5000).litKeyframes).toEqual([{ t: 0, lit: false }, { t: 5000, lit: false }])
  })

  test("a rig of lamps is recognised by the lamps it made, and the rig 'none' takes them away", () => {
    const decor = aircraft()
    const view = DecorBase.viewOf(decor, 0)
    expect(view.lightRig).toBe("")
    view.lightRig = "airliner"
    const lit = DecorBase.apply(decor, view, "lightRig", 0)
    expect(lit.lights!.length).toBeGreaterThan(0)
    expect(DecorBase.rigOf(lit)).toBe("airliner")
    const stripped = DecorBase.viewOf(lit, 0)
    stripped.lightRig = ""
    expect(DecorBase.apply(lit, stripped, "lightRig", 0).lights).toBeUndefined()
  })

  test("only a kind that can hold an observer states a seat", () => {
    const tree = still({ kind: "tree" })
    const view = DecorBase.viewOf(tree, 0)
    view.observerSide = "front"
    expect(DecorBase.apply(tree, view, "observerSide", 0).observerSide).toBeUndefined()
    const house = still()
    const inside = DecorBase.viewOf(house, 0)
    inside.observerSide = "front"
    expect(DecorBase.apply(house, inside, "observerSide", 0).observerSide).toBe("front")
  })
})

describe("DecorBase model", () => {
  const house = (): DecorObject => ({ id: "h", kind: "building", eastM: 0, northM: 10 })

  test("choosing a catalogue model states its id and no more", () => {
    const view = DecorBase.viewOf(house(), 0)
    view.model = { id: "some-house" }
    expect(DecorBase.apply(house(), view, "model.id", 0).model).toEqual({ id: "some-house" })
  })

  test("choosing a catalogue model replaces a model at an address, and emptying the choice leaves none", () => {
    const addressed = { ...house(), model: { url: "https://example.test/shed.glb", credit: { title: "Shed", license: "CC0 1.0" } } }
    const view = DecorBase.viewOf(addressed, 0)
    view.model = { ...view.model, id: "some-house" }
    expect(DecorBase.apply(addressed, view, "model.id", 0).model).toEqual({ id: "some-house" })
    view.model = undefined
    expect(DecorBase.apply(addressed, view, "model.id", 0).model).toBeUndefined()
  })

  test("an address is stated whole, with its credit", () => {
    const view = DecorBase.viewOf(house(), 0)
    view.model = { url: "https://example.test/shed.glb", credit: { title: "Shed", license: "CC0 1.0" } }
    expect(DecorBase.apply(house(), view, "model", 0).model).toEqual(view.model)
  })
})

describe("DecorBaseParameterSets", () => {
  const context = (traits: Partial<DecorBaseContext["traits"]> = {}): DecorBaseContext => ({
    kind: "building", natural: { widthM: 6, lengthM: 7, heightM: 9 }, traits: { color: true, lit: false, lights: false, observerSide: true, ...traits },
    lightRigs: [], seats: DecorBaseParameterSets.seatsFor("building"), models: []
  })
  const spec = (key: string) => [...DecorBaseParameterSets.BASE.parameters, ...DecorBaseParameterSets.STATE.parameters].find(candidate => candidate.key === key)!

  test("a size is left empty with the shape's own measure to show, greyed", () => {
    const width = spec("sizeM.widthM") as NumberParameter
    expect(width.effective!({}, context())).toBe(6)
    expect(width.required).toBe(false)
  })

  test("a colour is for the built-in shape, a lamp switch for what has one, a seat for what has a room", () => {
    expect(spec("color").visibleWhen!({}, context({ color: true }))).toBe(true)
    expect(spec("color").visibleWhen!({}, context({ color: false }))).toBe(false)
    expect(spec("lit").visibleWhen!({}, context({ lit: false }))).toBe(false)
    expect(spec("observerSide").visibleWhen!({}, context({ observerSide: false }))).toBe(false)
  })

  test("the seats are those of the kind: a vehicle's are its four doors, never the windscreen", () => {
    expect(DecorBaseParameterSets.seatsFor("vehicle").map(seat => seat.value)).toEqual(["front-left", "front-right", "behind-left", "behind-right"])
  })

  test("every label is said in the four languages", () => {
    for (const set of [DecorBaseParameterSets.BASE, DecorBaseParameterSets.STATE]) {
      for (const parameter of set.parameters) expect(Object.keys(parameter.label as object).sort(), parameter.key).toEqual(["en", "es", "fr", "it"])
    }
  })
})
