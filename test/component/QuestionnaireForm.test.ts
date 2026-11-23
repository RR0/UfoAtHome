import { describe, expect, it } from "vitest"
import { QuestionnaireForm, type QuestionnaireFormMessages } from "../../src/component/QuestionnaireForm.js"
import { QuestionnaireTemplates, type QuestionnaireTemplate } from "../../src/engine/questionnaire/QuestionnaireTemplate.js"
import { interviewMessages_fr } from "../../src/component/messages/InterviewMessages_fr.js"

const messages: QuestionnaireFormMessages = interviewMessages_fr.questionnaire

const template: QuestionnaireTemplate = {
  id: "t", title: { en: "T" }, intro: { en: "First.\n\nSecond." },
  sections: [{
    title: { en: "S" }, images: [{ src: "https://a.example/rose.png", alt: { en: "Compass rose" } }],
    fields: [
      { id: "1", question: { en: "Date" }, kind: "date" },
      { id: "2", question: { en: "Time" }, kind: "time" },
      { id: "3", question: { en: "Heard" }, kind: "choice", multiple: true, choices: [{ value: "nothing", label: { en: "Nothing" } }, { value: "hum", label: { en: "A hum" } }],
        images: [{ src: "https://a.example/ear.png", alt: { en: "An ear" }, caption: { en: "Listen" } }] }
    ]
  }]
}

const form = () => {
  const container = document.createElement("div")
  const said: [string, string][] = []
  const json = QuestionnaireTemplates.interview(template)
  QuestionnaireTemplates.answer(json, "2", "vers 21 h")
  new QuestionnaireForm(container, (field, answer) => said.push([field, answer])).show(template, json, messages, "en", false)
  return { container, said }
}

describe("QuestionnaireForm", () => {
  it("says the questionnaire's own intro, paragraph by paragraph, and shows its pictures with what they show and their caption", () => {
    const { container } = form()
    expect([...container.querySelectorAll(".form-intro")].map(p => p.textContent)).toEqual(["First.", "Second."])
    const images = [...container.querySelectorAll<HTMLImageElement>(".form-figure img")]
    expect(images.map(image => [image.src, image.alt])).toEqual([["https://a.example/rose.png", "Compass rose"], ["https://a.example/ear.png", "An ear"]])
    expect(container.querySelector("[data-field='3'] figcaption")!.textContent).toBe("Listen")
  })

  it("always offers a date or a time precise or imprecise, opening on the way its answer is in, the witness's words kept", () => {
    const { container, said } = form()
    const date = container.querySelector<HTMLElement>("[data-field='1'] .form-when")!
    const time = container.querySelector<HTMLElement>("[data-field='2'] .form-when")!
    expect([date.dataset.mode, time.dataset.mode]).toEqual(["precise", "imprecise"])
    expect(time.querySelector("input")!.value).toBe("vers 21 h")
    const dateMode = container.querySelector<HTMLButtonElement>("[data-field='1'] .form-when-mode")!
    expect(dateMode.textContent).toBe(messages.precise)
    dateMode.click()
    const input = date.querySelector("input")!
    expect([date.dataset.mode, input.type, input.placeholder]).toEqual(["imprecise", "text", messages.impreciseDate])
    input.value = "début juillet 1965"
    input.dispatchEvent(new Event("change"))
    expect(said).toEqual([["1", "début juillet 1965"]])
  })

  it("lets several choices be ticked when the question says so, written one after another", () => {
    const { container, said } = form()
    const boxes = [...container.querySelectorAll<HTMLInputElement>("[data-field='3'] input")]
    expect(boxes.map(box => box.type)).toEqual(["checkbox", "checkbox"])
    for (const box of boxes) {
      box.checked = true
      box.dispatchEvent(new Event("change"))
    }
    expect(said.at(-1)).toEqual(["3", "nothing; hum"])
  })
})
