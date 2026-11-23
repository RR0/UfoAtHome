import type { QuestionnaireImage, QuestionnaireTemplate, QuestionnaireTemplateField } from "../engine/questionnaire/QuestionnaireTemplate.js"
import { QuestionnaireTemplates } from "../engine/questionnaire/QuestionnaireTemplate.js"
import type { InterviewAttachment, InterviewJson } from "../engine/persistence/interviewJson.js"
import { InterviewFile } from "../engine/persistence/interviewJson.js"
import { register as registerInputFile, type InputFileElement, type InputFileMessages, type InputFilePick } from "./InputFileElement.js"

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
  /**
   * How a date or a time is said, before its field, which swaps them: `precise` (a picker), `imprecise` (the witness's own words: "around 9 pm"); the
   * tooltip of each says what the other is for.
   */
  precise: string
  imprecise: string
  preciseHint: string
  impreciseHint: string
  /** What an imprecise date, or time, may read. */
  impreciseDate: string
  impreciseTime: string
  /**
   * Under a confidential question (see QuestionnaireTemplateField.confidential): sealed for its recipient `{name}`; an answer sealed already, which
   * cannot be shown again and another replaces; no recipient to seal it for, so that it is kept in no file.
   */
  confidentialSealed: string
  confidentialSealedBefore: string
  confidentialNowhere: string
  /** Before the picker of a files question: what it adds. */
  addFile: string
  /** The tooltip of the button that takes a file out of the answer: `{name}`. */
  removeFile: string
}

/**
 * Where the files a witness gives are kept (see QuestionnaireForm.show): a file of theirs made a file of the interview, kept in the page until the case
 * is saved; and where one of the interview's files is shown from.
 */
export interface QuestionnaireFormFiles {
  add(file: File): InterviewAttachment
  shown(file: InterviewAttachment): string
  /** The picker's words. */
  messages: InputFileMessages
}

/**
 * A questionnaire as a form to fill in: its sections and their questions, each answered in a field of the kind it asks (a line, a text, a date, a
 * time, one of several choices, a mark on a scale), the answers being the witness's turns of its interview (see QuestionnaireTemplates.answer).
 * Questions the interview has that the questionnaire does not (one imported from another) come last, as text. Draws, and says what was typed.
 */
export class QuestionnaireForm {

  private json?: InterviewJson
  private recalled: (field: string) => string | undefined = () => undefined
  private files?: QuestionnaireFormFiles

  /** @param gave Says the files now given in answer to a files question: all of them, after one is added or taken out. */
  constructor(private readonly container: HTMLElement, private readonly answered: (field: string, answer: string, question: string) => void,
    private readonly gave: (field: string, files: InterviewAttachment[], question: string) => void = () => undefined) {
  }

  /**
   * `recalled` gives a confidential answer typed in this page, which no file holds in clear: once the page is reloaded, a sealed answer cannot be
   * shown again.
   */
  show(template: QuestionnaireTemplate, json: InterviewJson | undefined, messages: QuestionnaireFormMessages, language: string, readonly: boolean,
    recalled: (field: string) => string | undefined = () => undefined, files?: QuestionnaireFormFiles): void {
    this.json = json
    this.recalled = recalled
    this.files = files
    const text = (said: Parameters<typeof QuestionnaireTemplates.text>[0]) => QuestionnaireTemplates.text(said, language)
    const parts: Node[] = []
    // The questionnaire's own words to the witness, else what the form is.
    const said = template.intro ? text(template.intro) : messages.intro.replace("{title}", text(template.title))
    for (const paragraph of said.split(/\n\s*\n/)) {
      const intro = document.createElement("p")
      intro.className = "form-intro"
      intro.textContent = paragraph.trim()
      parts.push(intro)
    }
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
    for (const section of template.sections) parts.push(this.section(text(section.title), section.intro ? text(section.intro) : undefined, section.fields, json, messages, language, readonly, section.images))
    // What the interview asks besides: its own questions, kept and answerable as text.
    const others = (json?.segments ?? [])
      .filter(segment => segment.field !== undefined && !known.has(segment.field) && json!.speakers[segment.speaker]?.role !== "witness")
      .map((segment): QuestionnaireTemplateField => ({ id: segment.field!, question: InterviewFile.plain(segment.text ?? segment.field!), kind: "long", required: false }))
    if (others.length > 0) parts.push(this.section(messages.other, undefined, others, json, messages, language, readonly))
    this.container.replaceChildren(...parts)
  }

  private section(title: string, intro: string | undefined, fields: QuestionnaireTemplateField[], json: InterviewJson | undefined, messages: QuestionnaireFormMessages, language: string, readonly: boolean,
    images?: QuestionnaireImage[]): HTMLElement {
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
    if (images) set.append(...QuestionnaireForm.figures(images, language))
    for (const field of fields) {
      const value = field.confidential ? this.recalled(field.id) ?? "" : json ? QuestionnaireTemplates.answerOf(json, field.id) ?? "" : ""
      set.append(this.field(field, value, messages, language, readonly))
    }
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
    if (field.images) row.append(...QuestionnaireForm.figures(field.images, language))
    if (field.confidential) row.append(this.confidentialNote(field, value, messages, language))
    const say = (answer: string) => this.answered(field.id, answer, question)
    const kind = field.kind ?? "long"
    if (kind === "files") {
      row.append(this.attached(field, id, question, messages, readonly))
      return row
    }
    if ((kind === "choice" || kind === "scale") && field.choices) {
      const choices = document.createElement("div")
      choices.className = `form-choices ${kind}`
      choices.id = id
      const multiple = kind === "choice" && field.multiple === true
      choices.setAttribute("role", multiple ? "group" : "radiogroup")
      const ticked = multiple ? value.split(";").map(part => part.trim()) : [value.trim()]
      for (const choice of field.choices) {
        const option = document.createElement("label")
        const input = document.createElement("input")
        input.type = multiple ? "checkbox" : "radio"
        input.name = id
        input.value = choice.value
        input.checked = ticked.includes(choice.value)
        input.disabled = readonly
        input.addEventListener("change", () => {
          if (multiple) say([...choices.querySelectorAll<HTMLInputElement>("input:checked")].map(box => box.value).join("; "))
          else if (input.checked) say(choice.value)
        })
        option.append(input, ` ${QuestionnaireTemplates.text(choice.label, language)}`)
        choices.append(option)
      }
      row.append(choices)
      return row
    }
    const input = kind === "long" ? document.createElement("textarea") : document.createElement("input")
    input.id = id
    input.value = value
    input.disabled = readonly
    input.addEventListener("change", () => say(input.value))
    if (input instanceof HTMLInputElement && (kind === "date" || kind === "time")) row.append(this.when(input, kind, value, messages, label))
    else row.append(input)
    return row
  }

  /**
   * A date or a time, always offered two ways, as the editor offers the date of a case: `precise`, the browser's picker, which writes it as ISO; or
   * `imprecise`, in the witness's own words ("around 9 pm", "early July"), which a precise picker would force into a figure they never gave. Opens
   * on the way its answer is in. The link that says which, before the field, swaps them; the answer stays until it is changed.
   */
  private when(input: HTMLInputElement, kind: "date" | "time", value: string, messages: QuestionnaireFormMessages, label: HTMLLabelElement): HTMLElement {
    const iso = kind === "date" ? /^\d{4}-\d{2}-\d{2}$/ : /^\d{2}:\d{2}(:\d{2})?$/
    const box = document.createElement("div")
    box.className = "form-when"
    const mode = document.createElement("button")
    mode.type = "button"
    mode.className = "form-when-mode"
    mode.disabled = input.disabled
    const show = (precise: boolean) => {
      const typed = input.value
      input.type = precise ? kind : "text"
      if (kind === "time") input.step = precise ? "1" : ""
      input.placeholder = precise ? "" : kind === "date" ? messages.impreciseDate : messages.impreciseTime
      // A picker cannot show words: what was said stays the answer, out of sight, until a figure is picked.
      input.value = precise && !iso.test(typed) ? "" : typed
      if (!precise && typed === "" && value !== "") input.value = value
      box.dataset.mode = precise ? "precise" : "imprecise"
      mode.textContent = precise ? messages.precise : messages.imprecise
      mode.title = precise ? messages.preciseHint : messages.impreciseHint
    }
    mode.addEventListener("click", () => show(box.dataset.mode !== "precise"))
    show(value === "" || iso.test(value.trim()))
    label.append(" ", mode)
    box.append(input)
    return box
  }

  /**
   * A question answered by files (a map, a sketch, a photo drawn over): those given, each shown (a picture as a picture) with what takes it out, and a
   * picker that adds others, from the witness's disk or from an address.
   */
  private attached(field: QuestionnaireTemplateField, id: string, question: string, messages: QuestionnaireFormMessages, readonly: boolean): HTMLElement {
    const box = document.createElement("div")
    box.className = "form-files"
    const given = this.json ? [...QuestionnaireTemplates.filesOf(this.json, field.id)] : []
    const list = document.createElement("ul")
    list.className = "form-file-list"
    const draw = () => {
      list.replaceChildren(...given.map((file, index) => {
        const item = document.createElement("li")
        const name = QuestionnaireTemplates.fileName(file)
        const where = this.files?.shown(file) ?? file.src
        const link = document.createElement("a")
        link.href = where
        link.target = "_blank"
        link.rel = "noopener noreferrer"
        if ((file.type ?? "").startsWith("image/") || /\.(png|jpe?g|gif|webp|avif|svg)$/i.test(name)) {
          const img = document.createElement("img")
          img.src = where
          img.alt = name
          img.loading = "lazy"
          link.append(img)
        }
        link.append(name)
        item.append(link)
        if (!readonly) {
          const remove = document.createElement("button")
          remove.type = "button"
          remove.className = "form-file-remove"
          remove.textContent = "×"
          remove.title = messages.removeFile.replace("{name}", name)
          remove.setAttribute("aria-label", remove.title)
          remove.addEventListener("click", () => {
            given.splice(index, 1)
            draw()
            this.gave(field.id, [...given], question)
          })
          item.append(remove)
        }
        return item
      }))
      list.hidden = given.length === 0
    }
    draw()
    box.append(list)
    if (readonly || !this.files) return box
    registerInputFile()
    const add = document.createElement("label")
    add.className = "form-file-add"
    const picker = document.createElement("rr0-input-file") as InputFileElement
    picker.setAttribute("name", id)
    picker.setAttribute("multiple", "")
    picker.setAttribute("no-button", "")
    if (field.accept) picker.setAttribute("accept", field.accept)
    picker.build()
    picker.messages = this.files.messages
    const files = this.files
    picker.addEventListener("filepick", event => {
      const pick = (event as CustomEvent<InputFilePick>).detail
      if (pick.url !== undefined) {
        if (pick.url.trim() === "") return
        given.push({ src: pick.url.trim() })
        picker.url = ""
      } else for (const file of pick.files ?? [pick.file]) given.push(files.add(file))
      draw()
      this.gave(field.id, [...given], question)
    })
    add.append(`${messages.addFile} `, picker)
    box.append(add)
    return box
  }

  /** What becomes of a confidential answer: sealed for the recipient the interview names, or kept nowhere. */
  private confidentialNote(field: QuestionnaireTemplateField, value: string, messages: QuestionnaireFormMessages, language: string): HTMLElement {
    const note = document.createElement("p")
    note.className = "form-confidential"
    const recipient = this.json?.questionnaire?.recipient
    const sealedBefore = value === "" && this.json?.segments.some(segment => segment.field === field.id && segment.redacted?.sealed !== undefined)
    if (recipient) {
      const name = QuestionnaireTemplates.text(recipient.name, language)
      note.textContent = (sealedBefore ? messages.confidentialSealedBefore : messages.confidentialSealed).replace("{name}", name)
    } else {
      note.textContent = messages.confidentialNowhere
      note.classList.add("nowhere")
    }
    return note
  }

  /** The pictures of a question or a section, each with what it shows for whoever cannot see it, and its caption. */
  private static figures(images: QuestionnaireImage[], language: string): HTMLElement[] {
    return images.map(image => {
      const figure = document.createElement("figure")
      figure.className = "form-figure"
      const img = document.createElement("img")
      img.src = image.src
      img.alt = QuestionnaireTemplates.text(image.alt, language)
      img.loading = "lazy"
      figure.append(img)
      if (image.caption) {
        const caption = document.createElement("figcaption")
        caption.textContent = QuestionnaireTemplates.text(image.caption, language)
        figure.append(caption)
      }
      return figure
    })
  }
}
