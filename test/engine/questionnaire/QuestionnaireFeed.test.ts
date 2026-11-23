import { describe, expect, it } from "vitest"
import { QuestionnaireFeed } from "../../../src/engine/questionnaire/QuestionnaireFeed.js"
import { QuestionnaireTemplates } from "../../../src/engine/questionnaire/QuestionnaireTemplate.js"
import { Provenance } from "../../../src/engine/persistence/Provenance.js"

const template = async () => (await QuestionnaireTemplates.load("geipan-qt-2025"))!

describe("QuestionnaireFeed", () => {
  it("reads dates, times, durations, colours, directions and heights as witnesses write them", () => {
    expect(["2024-03-12", "12/03/2024", "12.3.24", "12 mars 2024", "1er août 2023"].map(QuestionnaireFeed.date)).toEqual(["2024-03-12", "2024-03-12", "2024-03-12", "2024-03-12", "2023-08-01"])
    expect(["21:10", "21h10", "21 h", "9:10 pm", "21:10:30"].map(text => QuestionnaireFeed.clock(text))).toEqual([76200, 76200, 75600, 76200, 76230])
    expect(QuestionnaireFeed.duration("2 min 30 s")).toBe(150)
    expect(QuestionnaireFeed.duration("environ 30 à 45 secondes")).toBe(38)
    expect(QuestionnaireFeed.duration("jusqu'à 21h15", 76200)).toBe(300)
    expect(QuestionnaireFeed.duration("21:15", 76200)).toBe(300)
    expect(QuestionnaireFeed.duration("1h30", 76200)).toBe(5400)
    expect(QuestionnaireFeed.duration("une éternité")).toBeUndefined()
    expect(QuestionnaireFeed.color("orange puis rouge")).toBe("#ff8a1f")
    expect(["Sud-Ouest", "NNE", "230°", "azimut 90", "vers le clocher"].map(QuestionnaireFeed.azimuth)).toEqual([225, 22.5, 230, 90, undefined])
    expect(["30°", "à 45 degrés", "au zénith", "2 fois plus haut que le clocher"].map(QuestionnaireFeed.elevation)).toEqual([30, 45, 90, undefined])
  })

  it("sets in the observation what the answers say, each value stated and citing its answer, and a phenomenon seen where they say", async () => {
    const qt = QuestionnaireTemplates.interview(await template())
    for (const [field, answer] of [["recit", "Une boule orange."], ["B4", "12/03/2024"], ["B5", "21:10"], ["B6", "2 min"], ["C3", "orange"],
      ["C9", "Sud-Ouest"], ["C10", "30°"], ["C11", "Sud"], ["C12", "10°"], ["B14", "ciel dégagé"]]) QuestionnaireTemplates.answer(qt, field, answer)
    const recording: Record<string, unknown> = { version: 4, timeline: { keyframes: [] } }
    const fed = QuestionnaireFeed.apply(recording, qt, await template(), "interview-qt")
    expect(fed.map(item => item.path)).toEqual(["description", "time", "durationSeconds", "timeline.keyframes.0.shapes.0.shape.color", "timeline.keyframes.0.shapes.0.shape.aim", "timeline.keyframes.1.shapes.0.shape.aim"])
    const { recording: plain, provenance } = Provenance.strip(recording)
    expect(plain).toMatchObject({ description: { fr: "Une boule orange." }, time: "2024-03-12T21:10:00", durationSeconds: 120 })
    const timeline = (plain as { timeline: { keyframes: { t: number, shapes: { shape: { aim: unknown, color?: string } }[] }[] } }).timeline
    expect(timeline.keyframes.map(keyframe => keyframe.t)).toEqual([0, 120000])
    expect(timeline.keyframes[0].shapes[0].shape).toMatchObject({ color: "#ff8a1f", aim: { azimuthDeg: 225, altitudeDeg: 30 } })
    expect(timeline.keyframes[1].shapes[0].shape.aim).toEqual({ azimuthDeg: 180, altitudeDeg: 10 })
    const time = provenance.at("time")!
    expect(time.basis).toBe("stated")
    expect(time.source?.said?.interview).toBe("interview-qt")
    expect(qt.segments[time.source!.said!.segment]).toMatchObject({ speaker: "witness", field: "B5", text: "21:10" })
    // The size nobody gave is a guess, and says so.
    expect(provenance.at("timeline.keyframes.0.shapes.0.shape.angular")?.basis).toBe("assumed")
  })

  it("sets nothing from an answer it cannot read, nor from \"je ne sais pas\"", async () => {
    const qt = QuestionnaireTemplates.interview(await template())
    QuestionnaireTemplates.answer(qt, "B6", "Je ne sais pas")
    QuestionnaireTemplates.answer(qt, "C9", "vers le clocher")
    QuestionnaireTemplates.answer(qt, "C10", "30°")
    const recording: Record<string, unknown> = { version: 4 }
    expect(QuestionnaireFeed.apply(recording, qt, await template())).toEqual([])
    expect(recording).toEqual({ version: 4 })
  })
})

describe("QuestionnaireTemplates", () => {
  it("makes the interview a witness fills in, a question for each field and no answer, and writes, replaces and takes out an answer", async () => {
    const json = QuestionnaireTemplates.interview(await template(), { witnesses: [{ id: "w1", label: "Témoin 1" }] })
    expect(json).toMatchObject({ medium: "questionnaire", questionnaire: { id: "geipan-qt-2025" }, interviewOf: "w1" })
    expect(json.segments.every(segment => segment.speaker === "interviewer")).toBe(true)
    QuestionnaireTemplates.answer(json, "C2", "une boule")
    const at = json.segments.findIndex(segment => segment.field === "C2")
    expect(json.segments[at + 1]).toEqual({ speaker: "witness", field: "C2", text: "une boule" })
    QuestionnaireTemplates.answer(json, "C2", "un disque")
    expect(QuestionnaireTemplates.answerOf(json, "C2")).toBe("un disque")
    QuestionnaireTemplates.answer(json, "C2", "  ")
    expect(QuestionnaireTemplates.answerOf(json, "C2")).toBeUndefined()
    expect(json.segments.filter(segment => segment.field === "C2")).toHaveLength(1)
  })
})
