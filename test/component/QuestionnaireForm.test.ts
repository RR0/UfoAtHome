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

describe("QuestionnaireForm confidential answers", () => {
  const secret: QuestionnaireTemplate = {
    id: "s", title: { en: "S" },
    sections: [{ title: { en: "Where" }, fields: [{ id: "A1", question: { en: "Address" }, kind: "text", confidential: { reason: { en: "Precise address" } } }] }]
  }
  const shown = (recipient: boolean, sealedBefore: boolean, recalled?: string) => {
    const container = document.createElement("div")
    const json = QuestionnaireTemplates.interview(secret, {}, recipient ? { id: "geipan", name: "GEIPAN", publicKey: { kty: "RSA", n: "x", e: "AQAB" } } : undefined)
    if (sealedBefore) QuestionnaireTemplates.answer(json, "A1", "x", undefined, { reason: { en: "Precise address" }, sealed: { for: "geipan", alg: "RSA-OAEP-256+A256GCM", key: "", iv: "", data: "" } })
    new QuestionnaireForm(container, () => undefined).show(secret, json, messages, "en", false, () => recalled)
    return container
  }

  it("says a confidential answer is sealed for the recipient, shows it only while typed in this page, and says when it is kept nowhere", () => {
    expect(shown(true, false).querySelector(".form-confidential")!.textContent).toBe(messages.confidentialSealed.replace("{name}", "GEIPAN"))
    const before = shown(true, true)
    expect(before.querySelector(".form-confidential")!.textContent).toBe(messages.confidentialSealedBefore.replace("{name}", "GEIPAN"))
    expect(before.querySelector<HTMLInputElement>("[data-field='A1'] input")!.value).toBe("")
    expect(shown(true, true, "12 rue des Lilas").querySelector<HTMLInputElement>("[data-field='A1'] input")!.value).toBe("12 rue des Lilas")
    const nowhere = shown(false, false).querySelector(".form-confidential")!
    expect([nowhere.textContent, nowhere.classList.contains("nowhere")]).toEqual([messages.confidentialNowhere, true])
  })
})

describe("QuestionnaireForm files", () => {
  const withFiles: QuestionnaireTemplate = {
    id: "f", title: { en: "F" },
    sections: [{ title: { en: "Pictures" }, fields: [{ id: "plan", question: { en: "A map" }, kind: "files", accept: "image/*,.kml", required: false }] }]
  }
  const interviewUrl = "https://a.example/case/interview-qb.json"

  it("gives a witness's files in answer, each named in their turn and held by it, a picture shown as one, and takes one out", async () => {
    const { InterviewAttachments } = await import("../../src/engine/persistence/InterviewAttachments.js")
    // jsdom has no object URLs.
    let made = 0
    Object.assign(URL, { createObjectURL: () => `blob:given/${++made}`, revokeObjectURL: () => undefined })
    InterviewAttachments.clear()
    const container = document.createElement("div")
    const json = QuestionnaireTemplates.interview(withFiles)
    const form = new QuestionnaireForm(container, () => undefined, (field, files, question) => QuestionnaireTemplates.answerFiles(json, field, files, question))
    const files = { add: (file: File) => InterviewAttachments.add(file, interviewUrl), shown: (file: { src: string }) => InterviewAttachments.shown(file, interviewUrl), messages: interviewMessages_fr }
    form.show(withFiles, json, messages, "en", false, undefined, files)
    const picker = container.querySelector("[data-field='plan'] rr0-input-file")!
    expect(picker.getAttribute("accept")).toBe("image/*,.kml")
    const sketch = new File(["png"], "sketch 1.png", { type: "image/png" })
    picker.dispatchEvent(new CustomEvent("filepick", { detail: { file: sketch, files: [sketch, new File(["<kml/>"], "route.kml")] } }))
    picker.dispatchEvent(new CustomEvent("filepick", { detail: { url: "https://maps.example/mine.kml" } }))
    const turn = json.segments.find(segment => segment.field === "plan" && segment.speaker === "witness")!
    expect(turn.text).toBe("sketch 1.png; route.kml; mine.kml")
    expect(turn.files).toEqual([
      { src: "interview-qb-files/sketch 1.png", name: "sketch 1.png", type: "image/png" },
      { src: "interview-qb-files/route.kml", name: "route.kml" },
      { src: "https://maps.example/mine.kml" }
    ])
    // Kept in the page until the case is saved, at the address it will have beside the interview.
    expect(InterviewAttachments.blob("https://a.example/case/interview-qb-files/sketch%201.png")).toBe(sketch)
    expect([...container.querySelectorAll<HTMLImageElement>(".form-file-list img")].map(img => img.getAttribute("src"))).toEqual(["blob:given/1"])
    // Shown again from the interview, and one taken out.
    form.show(withFiles, json, messages, "en", false, undefined, files)
    const removes = container.querySelectorAll<HTMLButtonElement>(".form-file-remove")
    expect([...removes].map(button => button.title)).toEqual(["Retirer sketch 1.png de la réponse", "Retirer route.kml de la réponse", "Retirer mine.kml de la réponse"])
    removes[1].click()
    expect(json.segments.find(segment => segment.field === "plan" && segment.speaker === "witness")!.text).toBe("sketch 1.png; mine.kml")
    container.querySelectorAll<HTMLButtonElement>(".form-file-remove")[0].click()
    container.querySelectorAll<HTMLButtonElement>(".form-file-remove")[0].click()
    expect(json.segments.some(segment => segment.field === "plan" && segment.speaker === "witness")).toBe(false)
  })

  it("shows the files of a read-only interview without a picker", () => {
    const container = document.createElement("div")
    const json = QuestionnaireTemplates.interview(withFiles)
    QuestionnaireTemplates.answerFiles(json, "plan", [{ src: "https://maps.example/mine.kml" }])
    new QuestionnaireForm(container, () => undefined).show(withFiles, json, messages, "en", true)
    expect(container.querySelector(".form-file-list a")!.getAttribute("href")).toBe("https://maps.example/mine.kml")
    expect(container.querySelector("rr0-input-file, .form-file-remove")).toBeNull()
  })
})

describe("QuestionnaireForm sections", () => {
  const two: QuestionnaireTemplate = {
    id: "n", title: { en: "N" },
    sections: [
      { number: "A", title: { en: "First" }, fields: [{ id: "1", question: { en: "One" }, kind: "text" }, { id: "2", question: { en: "Two" }, kind: "text" }] },
      { title: { en: "Second" }, fields: [{ id: "3", question: { en: "Three" }, kind: "text" }] }
    ]
  }

  it("shows each section closed, named with its number and saying how much of it is answered, and goes from one question to the next by ▲ and ▼ on its edges", () => {
    const container = document.createElement("div")
    document.body.append(container)
    const json = QuestionnaireTemplates.interview(two)
    QuestionnaireTemplates.answer(json, "2", "yes")
    const form = new QuestionnaireForm(container, () => undefined)
    form.show(two, json, messages, "en", false)
    const sections = [...container.querySelectorAll<HTMLDetailsElement>("details.form-section")]
    expect(sections.map(section => [section.open, section.querySelector(".form-section-title")!.textContent, section.querySelector(".form-section-count")!.textContent]))
      .toEqual([[false, "A. First", "1/2 répondues"], [false, "Second", "0/1 répondues"]])
    // The buttons are beside the question being answered, the first until another is gone into.
    const step = () => container.querySelector<HTMLElement>(".form-step")!
    const at = () => [step().closest<HTMLElement>(".form-field")!.dataset.field, step().querySelector(".form-step-where")!.textContent]
    expect(at()).toEqual(["1", "Question 1 sur 3"])
    expect(step().querySelector<HTMLButtonElement>(".form-step-previous")!.disabled).toBe(true)
    step().querySelector<HTMLButtonElement>(".form-step-next")!.click()
    expect([sections[0].open, sections[1].open, ...at()]).toEqual([true, false, "2", "Question 2 sur 3"])
    step().querySelector<HTMLButtonElement>(".form-step-next")!.click()
    expect([sections[0].open, sections[1].open, ...at()]).toEqual([false, true, "3", "Question 3 sur 3"])
    expect(step().querySelector<HTMLButtonElement>(".form-step-next")!.disabled).toBe(true)
    expect(document.activeElement?.id).toBe("form-3")
    step().querySelector<HTMLButtonElement>(".form-step-previous")!.click()
    expect([sections[0].open, sections[1].open, ...at()]).toEqual([true, false, "2", "Question 2 sur 3"])
    container.remove()
  })

  it("closes a section once its last question is answered", () => {
    const container = document.createElement("div")
    document.body.append(container)
    const json = QuestionnaireTemplates.interview(two)
    QuestionnaireTemplates.answer(json, "2", "yes")
    new QuestionnaireForm(container, () => undefined).show(two, json, messages, "en", false)
    const first = container.querySelector<HTMLDetailsElement>("details.form-section")!
    first.open = true
    const one = container.querySelector<HTMLInputElement>("#form-1")!
    one.value = "Here"
    one.dispatchEvent(new Event("change", { bubbles: true }))
    expect([first.open, first.querySelector(".form-section-count")!.textContent]).toEqual([false, "2/2 répondues"])
    // Opened again to change an answer, it stays open while it is answered.
    first.open = true
    one.dispatchEvent(new Event("change", { bubbles: true }))
    expect(first.open).toBe(true)
    container.remove()
  })
})
