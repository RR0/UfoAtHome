import { describe, expect, it } from "vitest"
import type { DecorObject } from "../../src/engine/model/Decor.js"
import type { RecordingSource } from "../../src/engine/model/RecordingSource.js"
import { sightingEditorMessages_en } from "../../src/component/messages/SightingEditorMessages_en.js"
import { SurroundingsPlanter } from "../../src/component/SurroundingsPlanter.js"
import type { Surroundings, SurroundingsProvider } from "../../src/render3d/terrain/SurroundingsProvider.js"
import { SurroundingsUnavailableError } from "../../src/render3d/terrain/SurroundingsProvider.js"

const OAK = { eastM: 8.5, northM: 15.5, heightM: 13.8, widthM: 12.5 }
const BEECH = { eastM: -53, northM: -55.5, heightM: 19.9, widthM: 15.1 }
const HOUSE = { eastM: 30, northM: -12, widthM: 14, lengthM: 8, heightM: 7.4, headingDeg: 40 }

/** A survey that answers with this, or fails with this, and remembers what it was asked. */
class FakeSurvey implements SurroundingsProvider {
  readonly id = "fake-lidar"
  readonly name = "Fake LiDAR"
  readonly attribution = "© nobody"
  readonly creditUrl = "https://survey.example/"
  readonly contemporary = true
  asked: { centre: { lat: number, lng: number }, radiusM: number }[] = []

  constructor(public answer: Surroundings | SurroundingsUnavailableError) {}

  covers(): boolean {
    return true
  }

  async getSurroundings(centre: { lat: number, lng: number }, radiusM: number): Promise<Surroundings> {
    this.asked.push({ centre, radiusM })
    if (this.answer instanceof Error) throw this.answer
    return this.answer
  }
}

/** The editor a planter stands in, reduced to what it reads and writes. */
class FakeEditor {
  decor: DecorObject[] = []
  sources: RecordingSource[] = []
  readonly status = document.createElement("span")

  planter(survey: SurroundingsProvider | undefined): SurroundingsPlanter {
    return new SurroundingsPlanter(this.status, {
      decor: () => this.decor,
      setDecor: decor => { this.decor = decor },
      label: (kind, number) => `${kind} ${number}`,
      cite: source => { this.sources.push(source) }
    }, sightingEditorMessages_en, async () => survey, { debounceMs: 5 })
  }

  get text(): string {
    return this.status.textContent ?? ""
  }
}

const PLACE = { lat: 49.1049, lng: -1.0754 }

describe("SurroundingsPlanter", () => {
  it("puts the trees and the buildings of the survey at their measured place, height and width, and says which survey", async () => {
    const editor = new FakeEditor()
    await editor.planter(new FakeSurvey({ trees: [OAK, BEECH], buildings: [HOUSE] })).survey(PLACE.lat, PLACE.lng)
    expect(editor.decor.map(object => object.kind)).toEqual(["tree", "tree", "building"])
    expect(editor.decor[0]).toMatchObject({ eastM: 8.5, northM: 15.5, origin: "fake-lidar", title: "tree 1", sizeM: { widthM: 12.5, lengthM: 12.5, heightM: 13.8 } })
    expect(editor.decor[2]).toMatchObject({ eastM: 30, northM: -12, headingDeg: 40, floors: 2, title: "building 1", sizeM: { widthM: 14, lengthM: 8, heightM: 7.4 } })
    expect(new Set(editor.decor.map(object => object.id)).size).toBe(3)
    expect(editor.text).toContain("trees 2, buildings 1")
    expect(editor.text).toContain("Fake LiDAR")
    expect(editor.sources).toEqual([expect.objectContaining({ url: "https://survey.example/" })])
  })

  it("asks by itself, once the place has stayed where it is, and not again for the same place", async () => {
    const editor = new FakeEditor()
    const survey = new FakeSurvey({ trees: [OAK], buildings: [] })
    const planter = editor.planter(survey)
    // Typed digit by digit: a place after each one, and only the last is asked.
    for (const lng of [-1, -1.07, -1.0754]) planter.placeChanged(PLACE.lat, lng)
    await new Promise(resolve => setTimeout(resolve, 40))
    expect(survey.asked).toHaveLength(1)
    expect(survey.asked[0].centre.lng).toBe(-1.0754)
    expect(editor.decor).toHaveLength(1)
    // The same place, a few metres off: not another question.
    planter.placeChanged(PLACE.lat + 0.00005, -1.0754)
    await new Promise(resolve => setTimeout(resolve, 40))
    expect(survey.asked).toHaveLength(1)
  })

  it("does not ask for a recording that was loaded, whose scenery is its own, but asks when the author then moves it elsewhere", async () => {
    const editor = new FakeEditor()
    editor.decor = [{ id: "decor-1", kind: "wall", title: "Wall 1", eastM: 3, northM: 4, headingDeg: 0, lit: false }]
    const survey = new FakeSurvey({ trees: [OAK], buildings: [] })
    const planter = editor.planter(survey)
    planter.placeLoaded(PLACE.lat, PLACE.lng)
    planter.placeChanged(PLACE.lat, PLACE.lng)
    await new Promise(resolve => setTimeout(resolve, 40))
    expect(survey.asked).toEqual([])
    planter.placeChanged(PLACE.lat + 0.01, PLACE.lng)
    await new Promise(resolve => setTimeout(resolve, 40))
    expect(survey.asked).toHaveLength(1)
    expect(editor.decor.map(object => object.kind)).toEqual(["wall", "tree"])
  })

  it("replaces what a survey planted when the place changes, and never touches what the author placed", async () => {
    const editor = new FakeEditor()
    editor.decor = [{ id: "decor-1", kind: "wall", title: "Wall 1", eastM: 3, northM: 4, headingDeg: 0, lit: false }]
    const survey = new FakeSurvey({ trees: [OAK, BEECH], buildings: [HOUSE] })
    const planter = editor.planter(survey)
    await planter.survey(PLACE.lat, PLACE.lng)
    expect(editor.decor).toHaveLength(4)
    survey.answer = { trees: [BEECH], buildings: [] }
    await planter.survey(PLACE.lat + 0.01, PLACE.lng)
    expect(editor.decor.map(object => object.kind)).toEqual(["wall", "tree"])
    expect(editor.decor[0].origin).toBeUndefined()
  })

  it("plants no tree where the author has placed trees, nor building where the author has placed buildings, and says so", async () => {
    const editor = new FakeEditor()
    editor.decor = [{ id: "decor-1", kind: "tree", title: "Tree 1", eastM: 3, northM: 4, headingDeg: 0, lit: false }]
    await editor.planter(new FakeSurvey({ trees: [OAK, BEECH], buildings: [HOUSE] })).survey(PLACE.lat, PLACE.lng)
    expect(editor.decor.map(object => object.kind)).toEqual(["tree", "building"])
    expect(editor.decor[0].id).toBe("decor-1")
    expect(editor.text).toContain("left as it is")

    const careful = new FakeEditor()
    careful.decor = [{ id: "decor-1", kind: "tree", title: "Tree 1", eastM: 3, northM: 4, headingDeg: 0, lit: false }]
    await careful.planter(new FakeSurvey({ trees: [OAK], buildings: [] })).survey(PLACE.lat, PLACE.lng)
    expect(careful.decor).toHaveLength(1)
    expect(careful.text).toContain("left as it is")
  })

  it("says nothing where no survey covers the place, and takes away what an earlier place had brought", async () => {
    const editor = new FakeEditor()
    const survey = new FakeSurvey({ trees: [OAK], buildings: [] })
    await editor.planter(survey).survey(PLACE.lat, PLACE.lng)
    expect(editor.decor).toHaveLength(1)

    const nowhere = editor.planter(undefined)
    await nowhere.survey(40.4, -3.7)
    expect(editor.decor).toEqual([])
    expect(editor.text).toBe("")

    survey.answer = new SurroundingsUnavailableError("no-coverage", "not here")
    await editor.planter(survey).survey(50.85, 4.35)
    expect(editor.text).toBe("")
  })

  it("says the survey is out of reach when it is, and leaves the scenery as it was", async () => {
    const editor = new FakeEditor()
    editor.decor = [{ id: "decor-1", kind: "wall", title: "Wall 1", eastM: 3, northM: 4, headingDeg: 0, lit: false }]
    await editor.planter(new FakeSurvey(new SurroundingsUnavailableError("unreachable", "503"))).survey(PLACE.lat, PLACE.lng)
    expect(editor.text).toContain("could not be reached")
    expect(editor.decor).toHaveLength(1)
  })

  it("says there is nothing when there is no tree and no building, and drops an answer that a later question has overtaken", async () => {
    const editor = new FakeEditor()
    await editor.planter(new FakeSurvey({ trees: [], buildings: [] })).survey(PLACE.lat, PLACE.lng)
    expect(editor.text).toBe("No tree or building found within 100 m.")

    // Two questions in a row, the second answered first: only the second is what the author last asked.
    const slowEditor = new FakeEditor()
    const answers: (() => void)[] = []
    const slow = new FakeSurvey({ trees: [], buildings: [] })
    slow.getSurroundings = () => new Promise<Surroundings>(resolve => {
      const mine = answers.length === 0 ? [OAK] : [BEECH, OAK]
      answers.push(() => resolve({ trees: mine, buildings: [] }))
    })
    const planter = slowEditor.planter(slow)
    const first = planter.survey(PLACE.lat, PLACE.lng)
    await new Promise(resolve => setTimeout(resolve, 0))
    const second = planter.survey(PLACE.lat + 0.01, PLACE.lng)
    await new Promise(resolve => setTimeout(resolve, 0))
    answers[1]()
    await second
    answers[0]()
    await first
    expect(slowEditor.decor).toHaveLength(2)
  })
})
