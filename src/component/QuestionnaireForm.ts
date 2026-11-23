import type { QuestionnaireTemplate, QuestionnaireTemplateField } from "../engine/questionnaire/QuestionnaireTemplate.js"
import { QuestionnaireTemplates } from "../engine/questionnaire/QuestionnaireTemplate.js"
import type { InterviewJson } from "../engine/persistence/interviewJson.js"
import { InterviewFile } from "../engine/persistence/interviewJson.js"

/** The words of the form (see InterviewMessages.questionnaire). */
export interface QuestionnaireFormMessages {
  /** Before the questions: what the form is, `{title}` of the questionnaire. */
  intro: string
  /** Under it, linked to the questionnaire's own file: `{publisher}`. */
  source: string
  /** The heading of the questions the interview asks that its questionnaire does not. */
  other: string
  /** Said of a field the questionnaire asks of every witness. */
  required: string
}

/**
 * A questionnaire as a form to fill in: its sections and their questions, each answered in a field of the kind it asks (a line, a text, a date, a
 * time, one of several choices, a mark on a scale), the answers being the witness's turns of its interview (see QuestionnaireTemplates.answer).
 * Questions the interview has that the questionnaire does not (one imported from another) come last, as text. Draws, and says what was typed.
 */
export class QuestionnaireForm {

  constructor(private readonly container: HTMLElement, private readonly answered: (field: string, answer: string, question: string) => void) {
  }

  show(template: QuestionnaireTemplate, json: InterviewJson | undefined, messages: QuestionnaireFormMessages, language: string, readonly: boolean): void {
    const text = (said: Parameters<typeof QuestionnaireTemplates.text>[0]) => QuestionnaireTemplates.text(said, language)
    const parts: Node[] = []
    const intro = document.createElement("p")
    intro.className = "form-intro"
    intro.textContent = messages.intro.replace("{title}", text(template.title))
    parts.push(intro)
    if (template.source?.url) {
      const source = document.createElement("p")
      source.className = "form-source"
      const link = document.createElement("a")
      link.href = template.source.url
      link.target = "_blank"
      link.rel = "noopener noreferrer"
      link.textContent = messages.source.replace("{publisher}", template.source.publisher ?? template.source.title ?? template.source.url)
      source.append(link)
      parts.push(source)
    }
    const known = new Set(QuestionnaireTemplates.fields(template).map(field => field.id))
    for (const section of template.sections) parts.push(this.section(text(section.title), section.intro ? text(section.intro) : undefined, section.fields, json, messages, language, readonly))
    // What the interview asks besides: its own questions, kept and answerable as text.
    const others = (json?.segments ?? [])
      .filter(segment => segment.field !== undefined && !known.has(segment.field) && json!.speakers[segment.speaker]?.role !== "witness")
      .map((segment): QuestionnaireTemplateField => ({ id: segment.field!, question: InterviewFile.plain(segment.text ?? segment.field!), kind: "long", required: false }))
    if (others.length > 0) parts.push(this.section(messages.other, undefined, others, json, messages, language, readonly))
    this.container.replaceChildren(...parts)
  }

  private section(title: string, intro: string | undefined, fields: QuestionnaireTemplateField[], json: InterviewJson | undefined, messages: QuestionnaireFormMessages, language: string, readonly: boolean): HTMLElement {
    const set = document.createElement("fieldset")
    set.className = "form-section"
    const legend = document.createElement("legend")
    legend.textContent = title
    set.append(legend)
    if (intro) {
      const p = document.createElement("p")
      p.className = "form-section-intro"
      p.textContent = intro
      set.append(p)
    }
    for (const field of fields) set.append(this.field(field, json ? QuestionnaireTemplates.answerOf(json, field.id) ?? "" : "", messages, language, readonly))
    return set
  }

  private field(field: QuestionnaireTemplateField, value: string, messages: QuestionnaireFormMessages, language: string, readonly: boolean): HTMLElement {
    const question = QuestionnaireTemplates.text(field.question, language)
    const row = document.createElement("div")
    row.className = "form-field"
    row.dataset.field = field.id
    const label = document.createElement("label")
    const id = `form-${field.id.replace(/[^A-Za-z0-9_-]/g, "_")}`
    label.htmlFor = id
    const number = /^[A-Za-z]?\d/.test(field.id) ? `${field.id}. ` : ""
    label.textContent = `${number}${question}`
    if (field.required !== false) {
      const mark = document.createElement("span")
      mark.className = "required"
      mark.textContent = " *"
      mark.title = messages.required
      label.append(mark)
    }
    row.append(label)
    if (field.hint) {
      const hint = document.createElement("p")
      hint.className = "form-hint"
      hint.textContent = QuestionnaireTemplates.text(field.hint, language)
      row.append(hint)
    }
    const say = (answer: string) => this.answered(field.id, answer, question)
    const kind = field.kind ?? "long"
    if ((kind === "choice" || kind === "scale") && field.choices) {
      const choices = document.createElement("div")
      choices.className = `form-choices ${kind}`
      choices.id = id
      choices.setAttribute("role", "radiogroup")
      for (const choice of field.choices) {
        const option = document.createElement("label")
        const input = document.createElement("input")
        input.type = "radio"
        input.name = id
        input.value = choice.value
        input.checked = value.trim() === choice.value
        input.disabled = readonly
        input.addEventListener("change", () => { if (input.checked) say(choice.value) })
        option.append(input, ` ${QuestionnaireTemplates.text(choice.label, language)}`)
        choices.append(option)
      }
      row.append(choices)
      return row
    }
    const input = kind === "long" ? document.createElement("textarea") : document.createElement("input")
    input.id = id
    if (input instanceof HTMLInputElement) {
      // A date or a time the browser's picker writes as ISO when the answer reads as one; a witness's own words otherwise stay as text.
      const iso = kind === "date" ? /^\d{4}-\d{2}-\d{2}$/.test(value) || value === "" : kind === "time" ? /^\d{2}:\d{2}(:\d{2})?$/.test(value) || value === "" : false
      input.type = iso ? kind : "text"
      if (kind === "time") input.step = "1"
    }
    input.value = value
    input.disabled = readonly
    input.addEventListener("change", () => say(input.value))
    row.append(input)
    return row
  }
}
