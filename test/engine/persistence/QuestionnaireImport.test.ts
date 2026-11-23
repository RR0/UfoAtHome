import { describe, expect, it } from "vitest"
import { QuestionnaireImport } from "../../../src/engine/persistence/QuestionnaireImport.js"
import { InterviewFile } from "../../../src/engine/persistence/interviewJson.js"

describe("QuestionnaireImport", () => {
  it("makes each field a question of the interviewer and the witness's answer, both naming the field", () => {
    const json = QuestionnaireImport.parse({ title: "Technical questionnaire", fields: [
      { number: 12, question: "How long did it last?", answer: "About ten seconds" },
      { number: 13, question: "Did it make a noise?", answer: "No" }
    ] }, { witnesses: [{ id: "w1", label: "W1" }] })!
    expect(json.medium).toBe("questionnaire")
    expect(json.title).toBe("Technical questionnaire")
    expect(json.interviewOf).toBe("w1")
    expect(json.speakers.witness).toEqual({ role: "witness", title: "W1", of: "w1" })
    expect(json.segments).toEqual([
      { speaker: "interviewer", field: "12", text: "How long did it last?" },
      { speaker: "witness", field: "12", text: "About ten seconds" },
      { speaker: "interviewer", field: "13", text: "Did it make a noise?" },
      { speaker: "witness", field: "13", text: "No" }
    ])
    expect(() => InterviewFile.read(json)).not.toThrow()
  })

  it("keeps a field left empty as a question with no answer, and a list of ticked boxes as one answer", () => {
    const json = QuestionnaireImport.parse([
      { id: "shape", question: "Shape", answer: "" },
      { id: "colours", question: "Colours", answer: ["orange", "red"] },
      { id: "count", question: "How many", answer: 4 },
      { id: "sound", question: "Sound", answer: null }
    ])!
    expect(json.segments.map(segment => [segment.speaker, segment.field, segment.text])).toEqual([
      ["interviewer", "shape", "Shape"],
      ["interviewer", "colours", "Colours"], ["witness", "colours", "orange, red"],
      ["interviewer", "count", "How many"], ["witness", "count", "4"],
      ["interviewer", "sound", "Sound"]
    ])
  })

  it("reads an object whose keys are the questions", () => {
    const json = QuestionnaireImport.parse({ "Date?": "2023-10-14", "Weather?": "clear" })!
    expect(json.segments.filter(segment => segment.speaker === "witness").map(segment => [segment.field, segment.text])).toEqual([["1", "2023-10-14"], ["2", "clear"]])
  })

  it("reads CSV with a header, quoted cells keeping their separators, and TSV with a field's number first", () => {
    const csv = QuestionnaireImport.parse("Question,Answer\nWhat did you see?,\"A light, then three\"\nNoise?,no\n")!
    expect(csv.segments.map(segment => segment.text)).toEqual(["What did you see?", "A light, then three", "Noise?", "no"])
    const tsv = QuestionnaireImport.parse("7\tDuration\t30 s\n8\tColour\t\n")!
    expect(tsv.segments.map(segment => [segment.field, segment.text])).toEqual([["7", "Duration"], ["7", "30 s"], ["8", "Colour"]])
  })

  it("reads a text of numbered questions, their answers on the lines after or on the same line", () => {
    const json = QuestionnaireImport.parse("1. Où étiez-vous ?\nSur la route,\nvers le sud.\n\n2) Durée ? une minute\n\nQ3 - Couleur ?\n")!
    expect(json.segments.map(segment => [segment.speaker, segment.field, segment.text])).toEqual([
      ["interviewer", "1", "Où étiez-vous ?"], ["witness", "1", "Sur la route, vers le sud."],
      ["interviewer", "2", "Durée ?"], ["witness", "2", "une minute"],
      ["interviewer", "3", "Couleur ?"]
    ])
  })

  it("reads `Question: answer` lines", () => {
    const json = QuestionnaireImport.parse("Forme : boule\nCouleur : orange\nBruit :")!
    expect(json.segments.map(segment => segment.text)).toEqual(["Forme", "boule", "Couleur", "orange", "Bruit"])
  })

  it("never takes a \"don't know\" or an empty answer for an answer, but takes a \"no\" for one", () => {
    for (const said of ["Je ne sais pas", "je ne sais pas.", "NSP", "I don't know", "don’t know", "No sé", "non lo so", "?", "-", "", "  ", "Je ne me souviens pas"]) {
      expect(QuestionnaireImport.informed(said), said).toBe(false)
    }
    for (const said of ["Non", "No", "aucun bruit", "0", "Je ne sais pas trop, peut-être 10 s"]) expect(QuestionnaireImport.informed(said), said).toBe(true)
  })

  it("lists the fields answered, with the turn a value can cite, and gives no source for one the witness did not answer", () => {
    const json = QuestionnaireImport.parse([
      { id: "duration", question: "Duration?", answer: "Je ne sais pas" },
      { id: "noise", question: "Noise?", answer: "aucun" },
      { id: "shape", question: "Shape?" }
    ])!
    const answers = QuestionnaireImport.answers(json)
    expect([...answers.keys()]).toEqual(["noise"])
    expect(answers.get("noise")).toEqual({ field: "noise", segment: 3, text: "aucun" })
    // The words are kept as said, even those that tell nothing.
    expect(json.segments[1]).toEqual({ speaker: "witness", field: "duration", text: "Je ne sais pas" })
    expect(QuestionnaireImport.sourceOf(json, "noise", "interview-qt")).toEqual({ said: { interview: "interview-qt", segment: 3 } })
    expect(QuestionnaireImport.sourceOf(json, "noise")).toEqual({ said: { segment: 3 } })
    expect(QuestionnaireImport.sourceOf(json, "duration")).toBeUndefined()
    expect(QuestionnaireImport.sourceOf(json, "shape")).toBeUndefined()
  })

  it("reads nothing from a file with no field", () => {
    expect(QuestionnaireImport.parse("")).toBeUndefined()
    expect(QuestionnaireImport.parse({ fields: [] })).toBeUndefined()
    expect(QuestionnaireImport.parse(42)).toBeUndefined()
  })
})
