import { describe, expect, it } from "vitest"
import type { DecorObject } from "../../src/engine/model/Decor.js"
import type { RecordingSource } from "../../src/engine/model/RecordingSource.js"
import { sightingEditorMessages_en } from "../../src/component/messages/SightingEditorMessages_en.js"
import { SurroundingsPlanter } from "../../src/component/SurroundingsPlanter.js"
import type { Surroundings, SurroundingsProvider } from "../../src/render3d/terrain/SurroundingsProvider.js"
import { SurroundingsUnavailableError } from "../../src/render3d/terrain/SurroundingsProvider.js"
import { Scene } from "../render3d/terrain/Scene.js"

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
    await editor.planter(new FakeSurvey(Scene.of([OAK, BEECH], [HOUSE]))).survey(PLACE.lat, PLACE.lng)
    expect(editor.decor.map(object => object.kind)).toEqual(["tree", "tree", "building"])
    expect(editor.decor[0]).toMatchObject({ eastM: 8.5, northM: 15.5, origin: "fake-lidar", title: "tree 1", sizeM: { widthM: 12.5, lengthM: 12.5, heightM: 13.8 } })
    expect(editor.decor[2]).toMatchObject({ eastM: 30, northM: -12, headingDeg: 40, floors: 2, title: "building 1", sizeM: { widthM: 14, lengthM: 8, heightM: 7.4 } })
    expect(new Set(editor.decor.map(object => object.id)).size).toBe(3)
    expect(editor.text).toContain("trees 2, buildings 1")
    expect(editor.text).toContain("Fake LiDAR")
    expect(editor.sources).toEqual([expect.objectContaining({ url: "https://survey.example/" })])
  })

  it("calls what the survey names by its name, the parts of it after the first numbered, and a bridge by the road it carries and a line by its voltage", async () => {
    const editor = new FakeEditor()
    const hall = { eastM: 30, northM: -12, widthM: 14, lengthM: 8, heightM: 7.4, headingDeg: 40, name: "Mairie de Saint-Lô" }
    const bridge = { eastM: -20, northM: 5, lengthM: 24, widthM: 9.4, heightM: 6.2, headingDeg: 80, name: "Rue de Carentan" }
    const span = { eastM: 10, northM: 60, lengthM: 180, headingDeg: 95, heightM: 18.5, poleHeightM: 22, acrossM: [0], voltage: "90 kV" }
    await editor.planter(new FakeSurvey(Scene.of([OAK], [hall, { ...hall, eastM: 50 }, HOUSE], [bridge], [span]))).survey(PLACE.lat, PLACE.lng)
    expect(editor.decor.map(object => object.title)).toEqual([
      "tree 1", "Mairie de Saint-Lô", "Mairie de Saint-Lô (2)", "building 1", "bridge (Rue de Carentan)", "wire (90 kV)"
    ])
  })

  it("takes away what a survey brought when it is withdrawn, and nothing the author placed", async () => {
    const editor = new FakeEditor()
    editor.decor = [{ id: "decor-1", kind: "wall", title: "Wall 1", eastM: 3, northM: 4, headingDeg: 0, lit: false }]
    const planter = editor.planter(new FakeSurvey(Scene.of([OAK, BEECH], [HOUSE])))
    await planter.survey(PLACE.lat, PLACE.lng)
    expect(editor.decor).toHaveLength(4)
    planter.withdraw()
    expect(editor.decor.map(object => object.id)).toEqual(["decor-1"])
    expect(editor.text).toBe("")
  })

  it("plants the bridges and the spans of electric line as the survey drew them, a line with its conductors and its poles", async () => {
    const editor = new FakeEditor()
    const bridge = { eastM: -20, northM: 5, lengthM: 24, widthM: 9.4, heightM: 6.2, headingDeg: 80 }
    const span = { eastM: 10, northM: 60, lengthM: 180, headingDeg: 95, heightM: 18.5, poleHeightM: 22, acrossM: [-3.5, 0, 3.5], voltage: "90 kV" }
    await editor.planter(new FakeSurvey(Scene.of([], [], [bridge], [span]))).survey(PLACE.lat, PLACE.lng)
    expect(editor.decor.map(object => object.kind)).toEqual(["bridge", "wire"])
    expect(editor.decor[0]).toMatchObject({ eastM: -20, northM: 5, headingDeg: 80, origin: "fake-lidar", sizeM: { lengthM: 24, widthM: 9.4, heightM: 6.2 } })
    expect(editor.decor[1]).toMatchObject({
      headingDeg: 95, sizeM: { lengthM: 180, heightM: 18.5 },
      wire: { poles: "both", poleHeightM: 22, strands: [{ heightM: 18.5, acrossM: -3.5 }, { heightM: 18.5, acrossM: 0 }, { heightM: 18.5, acrossM: 3.5 }] }
    })
    expect(editor.text).toContain("bridges 1, electric lines 1")
  })

  it("plants no bridge where the author placed one, no line where the author placed one", async () => {
    const editor = new FakeEditor()
    editor.decor = [
      { id: "decor-1", kind: "bridge", title: "Bridge 1", eastM: 3, northM: 4, headingDeg: 0, lit: false },
      { id: "decor-2", kind: "wire", title: "Overhead line 1", eastM: 9, northM: 4, headingDeg: 0, lit: false }
    ]
    const bridge = { eastM: -20, northM: 5, lengthM: 24, widthM: 9.4, heightM: 6.2, headingDeg: 80 }
    const span = { eastM: 10, northM: 60, lengthM: 180, headingDeg: 95, heightM: 18.5, poleHeightM: 22, acrossM: [0], voltage: "90 kV" }
    await editor.planter(new FakeSurvey(Scene.of([OAK], [], [bridge], [span]))).survey(PLACE.lat, PLACE.lng)
    expect(editor.decor.map(object => object.kind)).toEqual(["bridge", "wire", "tree"])
  })

  it("can be turned off, then asks nothing of a place that is given, and is asked for a place again when turned on", async () => {
    const editor = new FakeEditor()
    const survey = new FakeSurvey(Scene.of([OAK]))
    const planter = editor.planter(survey)
    planter.setEnabled(false)
    planter.placeChanged(PLACE.lat, PLACE.lng)
    await new Promise(resolve => setTimeout(resolve, 40))
    expect(survey.asked).toEqual([])
    expect(editor.decor).toEqual([])
    planter.setEnabled(true)
    // Turned on, nothing is asked until a place is given: another survey is chosen by asking for the place it stands at.
    await new Promise(resolve => setTimeout(resolve, 20))
    expect(survey.asked).toEqual([])
    await planter.survey(PLACE.lat, PLACE.lng)
    expect(survey.asked).toHaveLength(1)
    expect(editor.decor).toHaveLength(1)
    // Turned off again, what it planted stays.
    planter.setEnabled(false)
    expect(editor.decor).toHaveLength(1)
  })

  it("asks by itself, once the place has stayed where it is, and not again for the same place", async () => {
    const editor = new FakeEditor()
    const survey = new FakeSurvey(Scene.of([OAK], []))
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
    const survey = new FakeSurvey(Scene.of([OAK], []))
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
    const survey = new FakeSurvey(Scene.of([OAK, BEECH], [HOUSE]))
    const planter = editor.planter(survey)
    await planter.survey(PLACE.lat, PLACE.lng)
    expect(editor.decor).toHaveLength(4)
    survey.answer = Scene.of([BEECH], [])
    await planter.survey(PLACE.lat + 0.01, PLACE.lng)
    expect(editor.decor.map(object => object.kind)).toEqual(["wall", "tree"])
    expect(editor.decor[0].origin).toBeUndefined()
  })

  it("plants no tree where the author has placed trees, nor building where the author has placed buildings, and says so", async () => {
    const editor = new FakeEditor()
    editor.decor = [{ id: "decor-1", kind: "tree", title: "Tree 1", eastM: 3, northM: 4, headingDeg: 0, lit: false }]
    await editor.planter(new FakeSurvey(Scene.of([OAK, BEECH], [HOUSE]))).survey(PLACE.lat, PLACE.lng)
    expect(editor.decor.map(object => object.kind)).toEqual(["tree", "building"])
    expect(editor.decor[0].id).toBe("decor-1")
    expect(editor.text).toContain("left as it is")

    const careful = new FakeEditor()
    careful.decor = [{ id: "decor-1", kind: "tree", title: "Tree 1", eastM: 3, northM: 4, headingDeg: 0, lit: false }]
    await careful.planter(new FakeSurvey(Scene.of([OAK], []))).survey(PLACE.lat, PLACE.lng)
    expect(careful.decor).toHaveLength(1)
    expect(careful.text).toContain("left as it is")
  })

  it("says nothing where no survey covers the place, and takes away what an earlier place had brought", async () => {
    const editor = new FakeEditor()
    const survey = new FakeSurvey(Scene.of([OAK], []))
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
    await editor.planter(new FakeSurvey(Scene.of([], []))).survey(PLACE.lat, PLACE.lng)
    expect(editor.text).toBe("No tree, building, bridge or electric line found within 100 m.")

    // Two questions in a row, the second answered first: only the second is what the author last asked.
    const slowEditor = new FakeEditor()
    const answers: (() => void)[] = []
    const slow = new FakeSurvey(Scene.of([], []))
    slow.getSurroundings = () => new Promise<Surroundings>(resolve => {
      const mine = answers.length === 0 ? [OAK] : [BEECH, OAK]
      answers.push(() => resolve(Scene.of(mine)))
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
