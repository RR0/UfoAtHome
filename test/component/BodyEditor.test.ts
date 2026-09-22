import { describe, expect, it } from "vitest"
import { BodyEditor } from "../../src/component/BodyEditor.js"
import type { BodyEditorHost } from "../../src/component/BodyEditor.js"
import type { InterpretationJson } from "../../src/engine/interpretation/Interpretation.js"
import { SaidTexts } from "../../src/engine/model/SaidText.js"
import type { Sighting } from "../../src/engine/model/Sighting.js"
import type { DecorModelProvider } from "../../src/render3d/decor/DecorModelProvider.js"

const interpretation: InterpretationJson = {
  title: { en: "A craft on its legs" },
  bodies: [
    { id: "craft", title: "The craft", explains: ["ufo-1"], model: { id: "catalogue-craft" }, outlineNode: "hull", track: [{ t: 0, eastM: 0, northM: 100 }, { t: 5000, eastM: 0, northM: 90 }] },
    { id: "figure-1", model: { url: "figure.gltf", credit: { title: "A figure", license: "CC0 1.0" } }, track: [] }
  ]
}

const airliner = { id: "catalogue-airliner", kind: "aircraft" as const, name: "Airliner", url: "https://x/airliner.glb", credit: { title: "Airliner", license: "CC0 1.0" }, sizeM: { widthM: 35, lengthM: 37, heightM: 12 } }
const provider: DecorModelProvider = {
  attribution: "",
  entries: async () => [{ id: "catalogue-craft", kind: "aircraft", name: "Catalogue craft", url: "https://x/craft.gltf", credit: { title: "Craft", license: "CC0 1.0" } }, airliner],
  entry: async id => id === airliner.id ? airliner : undefined
}

class Fixture {
  readonly container = document.createElement("div")
  readonly sighting: Sighting
  changes = 0
  lookedAt?: string
  start: ReturnType<BodyEditorHost["newBodyStart"]> = { sourceId: "flame", label: "Flame", keyframe: { t: 2000, azimuthDeg: 120, altitudeDeg: 5, distanceM: 100, sizeM: { widthM: 3, lengthM: 3, heightM: 1 } } }
  readonly editor: BodyEditor

  constructor(stated: InterpretationJson | null = interpretation) {
    this.sighting = { interpretation: stated === null ? undefined : structuredClone(stated) } as Sighting
    document.body.append(this.container)
    const host: BodyEditorHost = {
      sighting: () => this.sighting,
      said: () => new SaidTexts(["en"]),
      writingLanguage: () => "en",
      modelProvider: () => provider,
      shapes: () => [{ id: "ufo-1", label: "Object" }, { id: "flame", label: "Flame" }],
      changed: () => { this.changes++ },
      newBodyStart: () => this.start,
      lookAt: body => { this.lookedAt = body.id }
    }
    this.editor = new BodyEditor(this.container, host, "en")
  }

  field(id: string): HTMLInputElement {
    return this.container.querySelector<HTMLInputElement>("#" + id)!
  }

  type(id: string, value: string): void {
    this.field(id).value = value
    this.field(id).dispatchEvent(new Event("change"))
  }
}

describe("The Bodies part of the editor", () => {
  it("shows what a loaded recording states of its bodies", async () => {
    const fixture = new Fixture()
    await new Promise(resolve => setTimeout(resolve))
    expect(fixture.field("body-interpretation-title").value).toBe("A craft on its legs")
    expect([...fixture.container.querySelectorAll<HTMLOptionElement>("#body-select option")].map(option => option.value)).toEqual(["craft", "figure-1"])
    expect(fixture.field("body-id").value).toBe("craft")
    expect(fixture.field("body-title").value).toBe("The craft")
    expect(fixture.field("body-outline-node").value).toBe("hull")
    expect(fixture.field("body-model").value).toBe("catalogue-craft")
    const checked = [...fixture.container.querySelectorAll<HTMLInputElement>("#body-explains input")].filter(check => check.checked).map(check => check.value)
    expect(checked).toEqual(["ufo-1"])
    expect(fixture.field("body-track").textContent).toBe("2 keyframes, from 0 s to 5 s")
  })

  it("shows a model given by address, with its credit", () => {
    const fixture = new Fixture()
    fixture.type("body-select", "figure-1")
    expect(fixture.field("body-model-url").value).toBe("figure.gltf")
    expect(fixture.field("body-model-title").value).toBe("A figure")
    expect(fixture.field("body-model-license").value).toBe("CC0 1.0")
  })

  it("keeps a credit being typed field by field, and stores it once complete", () => {
    const fixture = new Fixture()
    fixture.type("body-model-url", "craft.gltf")
    fixture.type("body-model-title", "Socorro craft")
    // Not stored yet (no licence), but not erased from the form either.
    expect(fixture.field("body-model-title").value).toBe("Socorro craft")
    fixture.type("body-model-license", "CC0 1.0")
    expect(fixture.sighting.interpretation!.bodies[0].model).toEqual({ url: "craft.gltf", headingOffsetDeg: undefined, credit: { title: "Socorro craft", license: "CC0 1.0", author: undefined, sourceUrl: undefined } })
    // The track is not the form's to touch.
    expect(fixture.sighting.interpretation!.bodies[0].track).toHaveLength(2)
    expect(fixture.changes).toBeGreaterThan(0)
  })

  it("refuses an id another body already has", () => {
    const fixture = new Fixture()
    fixture.type("body-id", "figure-1")
    expect(fixture.sighting.interpretation!.bodies.map(body => body.id)).toEqual(["craft", "figure-1"])
    expect(fixture.field("body-id").value).toBe("craft")
    fixture.type("body-id", "engin")
    expect(fixture.sighting.interpretation!.bodies.map(body => body.id)).toEqual(["engin", "figure-1"])
  })

  it("deletes a body", () => {
    const fixture = new Fixture()
    fixture.container.querySelector<HTMLButtonElement>("#body-delete")!.click()
    expect(fixture.sighting.interpretation!.bodies.map(body => body.id)).toEqual(["figure-1"])
    expect(fixture.field("body-id").value).toBe("figure-1")
  })

  it("adds a body standing for the selected shape, creating the interpretation a recording lacks", () => {
    const fixture = new Fixture(null)
    expect(fixture.container.querySelector<HTMLElement>("#body-none")!.hidden).toBe(false)
    fixture.container.querySelector<HTMLButtonElement>("#body-add")!.click()
    expect(fixture.sighting.interpretation).toEqual({
      bodies: [{ id: "body-1", explains: ["flame"], model: { id: "ellipsoid" }, track: [{ t: 2000, azimuthDeg: 120, altitudeDeg: 5, distanceM: 100, sizeM: { widthM: 3, lengthM: 3, heightM: 1 } }] }]
    })
    expect(fixture.field("body-id").value).toBe("body-1")
    fixture.container.querySelector<HTMLButtonElement>("#body-add")!.click()
    expect(fixture.sighting.interpretation!.bodies.map(body => body.id)).toEqual(["body-1", "body-2"])
  })

  it("drops an interpretation left with no body and no title", () => {
    const fixture = new Fixture({ bodies: [interpretation.bodies[0]] })
    fixture.container.querySelector<HTMLButtonElement>("#body-delete")!.click()
    expect(fixture.sighting.interpretation).toBeUndefined()
  })

  it("asks for no interpretation title before there is an interpretation", () => {
    const fixture = new Fixture(null)
    expect(fixture.field("body-interpretation-title").closest("label")!.hidden).toBe(true)
    fixture.container.querySelector<HTMLButtonElement>("#body-add")!.click()
    expect(fixture.field("body-interpretation-title").closest("label")!.hidden).toBe(false)
  })

  it("adds a body where the witness is looking when no shape is drawn", () => {
    const fixture = new Fixture(null)
    fixture.start = { keyframe: { t: 0, azimuthDeg: 90, altitudeDeg: -2, onGround: true } }
    fixture.container.querySelector<HTMLButtonElement>("#body-add")!.click()
    expect(fixture.sighting.interpretation!.bodies[0].explains).toBeUndefined()
    expect(fixture.sighting.interpretation!.bodies[0].track).toEqual([{ t: 0, azimuthDeg: 90, altitudeDeg: -2, onGround: true }])
  })

  it("turns the witness towards the body on show", () => {
    const fixture = new Fixture()
    fixture.type("body-select", "figure-1")
    fixture.container.querySelector<HTMLButtonElement>("#body-look")!.click()
    expect(fixture.lookedAt).toBe("figure-1")
  })

  it("gives a body a catalogue model's real size, farther along its line of sight so it spans the same angle", async () => {
    const fixture = new Fixture(null)
    fixture.start = { keyframe: { t: 0, azimuthDeg: 90, altitudeDeg: 10, distanceM: 5, sizeM: { widthM: 0.7, lengthM: 0.7, heightM: 0.4 } } }
    fixture.container.querySelector<HTMLButtonElement>("#body-add")!.click()
    await new Promise(resolve => setTimeout(resolve))
    fixture.type("body-model", "catalogue-airliner")
    await new Promise(resolve => setTimeout(resolve))
    expect(fixture.sighting.interpretation!.bodies[0].track).toEqual([{ t: 0, azimuthDeg: 90, altitudeDeg: 10, distanceM: 250, sizeM: { widthM: 35, lengthM: 37, heightM: 12 } }])
  })
})
