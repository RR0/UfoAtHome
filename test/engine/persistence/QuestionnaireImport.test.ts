import { describe, expect, it } from "vitest"
import { QuestionnaireImport } from "../../../src/engine/persistence/QuestionnaireImport.js"
import { InterviewFile } from "../../../src/engine/persistence/interviewJson.js"
import { QuestionnaireTemplates } from "../../../src/engine/questionnaire/QuestionnaireTemplate.js"

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

  it("reads a questionnaire numbered by section (B5., C13., E1'.), its footers left out, a question over two lines told from its answer by the template", async () => {
    const filled = [
      "                                 Votre récit libre de l’observation :*",
      "J'ai vu une boule orange au-dessus des arbres.",
      "",
      " Selon DTN/DA/GP 2025. 0001275                                                                   page : 3",
      "                        Conditions d’observation du phénomène",
      "B2. Où vous trouviez-vous exactement ?* (Extérieur ou intérieur d’un bâtiment ? quel étage ? si vous regardiez à",
      "travers une vitre? si vous étiez dans un véhicule? le cas échéant à quelle vitesse rouliez-vous?):* Dans mon jardin",
      "B4. Date de l’observation* : 12/03/2024",
      "B5. Heure précise de début* (en heure locale HH:MM:ss) : 21:10",
      "B6. Durée de l’observation ou heure de fin* (en heures, minutes, secondes) :",
      "Je ne sais pas",
      "C3. Couleur *:",
      "orange",
      "                           Début d’observation (position initiale du PAN dans le ciel)",
      "C9. Indiquer un point cardinal (Nord, Sud …), ou un azimut en degrés par rapport au Nord, ou un repère visuel",
      "ou géographique local (bâtiment, village) *",
      "Sud-Ouest",
      "E1’. Quelle est votre perception du niveau d’étrangeté de votre observation de 1 à 5 (1 peu étrange, 5",
      "très étrange)*",
      "             4"
    ].join("\n")
    const template = (await QuestionnaireTemplates.load("geipan-qt-2025"))!
    const json = QuestionnaireImport.parse(filled, {}, template)!
    expect(json.questionnaire).toEqual({ id: "geipan-qt-2025", version: "DTN/DA/GP 2025.0001275" })
    const answers = Object.fromEntries([...QuestionnaireImport.answers(json)].map(([field, answer]) => [field, answer.text]))
    expect(answers).toEqual({ recit: "J'ai vu une boule orange au-dessus des arbres.", B2: "Dans mon jardin", B4: "12/03/2024", B5: "21:10", C3: "orange", C9: "Sud-Ouest", "E1'": "4" })
    // The witness's "don't know" is kept as said, and the question as the template words it.
    expect(json.segments.find(segment => segment.field === "B6" && segment.speaker === "witness")?.text).toBe("Je ne sais pas")
    expect(json.segments.find(segment => segment.field === "C9")?.text).toMatch(/^Indiquer un point cardinal/)
    const boxes = QuestionnaireImport.parse("B9. L’observation s’est faite de façon :* ☐ Continue ☒ Discontinue\nB12. Avez-vous vu le phénomène directement de vos yeux ?* ☐ Oui ☐ Non", {}, template)!
    expect(Object.fromEntries([...QuestionnaireImport.answers(boxes)].map(([field, answer]) => [field, answer.text]))).toEqual({ B9: "Discontinue" })
  })

  it("reads a questionnaire numbered by section with no template, a question ending at its line's \"?\", \":\" or \"*\"", () => {
    const json = QuestionnaireImport.parse("B4. Date de l’observation* : 12/03/2024\nC2. Forme *:\nune boule\npage : 5\nC7. Bruit ? aucun")!
    expect(json.segments.map(segment => [segment.field, segment.text])).toEqual([["B4", "Date de l’observation"], ["B4", "12/03/2024"], ["C2", "Forme"], ["C2", "une boule"], ["C7", "Bruit ?"], ["C7", "aucun"]])
  })

  it("reads nothing from a file with no field", () => {
    expect(QuestionnaireImport.parse("")).toBeUndefined()
    expect(QuestionnaireImport.parse({ fields: [] })).toBeUndefined()
    expect(QuestionnaireImport.parse(42)).toBeUndefined()
  })
})
