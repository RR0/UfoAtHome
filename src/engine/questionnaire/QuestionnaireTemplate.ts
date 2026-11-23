import type { SaidText } from "../model/SaidText.js"
import type { InterviewAttachment, InterviewJson, InterviewRedaction, InterviewSegment } from "../persistence/interviewJson.js"
import type { SealRecipient } from "./QuestionnaireSeal.js"
import type { InterviewImportHints } from "../persistence/interviewImport.js"

/**
 * What a field's answer is for the form that asks it: a line, a text, a date, a time, one of several choices, a mark on a scale, or files (a map, a
 * sketch, a photo drawn over: see InterviewSegment.files).
 */
export type QuestionnaireFieldKind = "text" | "long" | "date" | "time" | "choice" | "scale" | "files"

/**
 * What a field's answer may set in the recording of the observation, once the witness has answered (see QuestionnaireFeed): the witness's account
 * in their words, where they were, when it began, how long it lasted, the colour, where it was at the beginning and at the end.
 */
export type QuestionnaireFeedTarget = "narrative" | "place" | "date" | "startTime" | "duration" | "color" | "startAzimuth" | "startElevation" | "endAzimuth" | "endElevation"

/**
 * A picture the questionnaire shows with a question or a section: a compass rose with the azimuths, the heights above the horizon, a thumb at arm's
 * length. `src` is relative to the questionnaire's own file (see QuestionnaireTemplates.load).
 */
export interface QuestionnaireImage {
  src: string
  /** What it shows, for whoever cannot see it. */
  alt: SaidText
  caption?: SaidText
}

export interface QuestionnaireTemplateField {
  /** Its number or name, as the questionnaire gives it: what the interview's turns name (see InterviewSegment.field). */
  id: string
  question: SaidText
  hint?: SaidText
  /** "long" when absent. */
  kind?: QuestionnaireFieldKind
  choices?: { value: string, label: SaidText }[]
  /** For files: the kinds of file it takes, as a file picker's `accept` says them ("image/*,.pdf,.kml"). */
  accept?: string
  /** For a choice: several may be ticked (a multiple-choice question), written one after another, separated by "; ". */
  multiple?: boolean
  /** True when absent: the questionnaire asks it of every witness. */
  required?: boolean
  feeds?: QuestionnaireFeedTarget
  /** Shown under the question, before the answer. */
  images?: QuestionnaireImage[]
  /**
   * An answer nobody but the questionnaire's recipient may read (a precise address, a name): written taken out of the interview, `reason` saying why,
   * and sealed for the recipient when the interview has one (see QuestionnaireSeal); kept in no file at all otherwise.
   */
  confidential?: { reason: SaidText }
}

export interface QuestionnaireTemplateSection {
  title: SaidText
  intro?: SaidText
  /** Shown under its intro, before its questions. */
  images?: QuestionnaireImage[]
  fields: QuestionnaireTemplateField[]
}

/**
 * The questions of a questionnaire, before anybody answered: what a witness is asked to fill in, as a form, and what its interview starts as, one turn
 * of the interviewer per question (see QuestionnaireTemplates.interview). Its id is what an interview names it by (see InterviewJson.questionnaire).
 */
export interface QuestionnaireTemplate {
  id: string
  /** The version of the questionnaire, as its publisher names it. */
  version?: string
  language?: string
  title: SaidText
  /** What the witness reads before the questions, paragraphs separated by a blank line; the form says what it is when there is none. */
  intro?: SaidText
  source?: { publisher?: string, title?: string, url?: string, date?: string }
  note?: SaidText
  /**
   * The titles of the parts of the printed questionnaire that ask nothing to put in a case (personal details, drawings to attach, a grant of rights):
   * what is under them in a filled one is no answer.
   */
  stops?: SaidText[]
  sections: QuestionnaireTemplateSection[]
}

/** The questionnaires UFO@home knows, each a file of its own loaded when first asked for. */
export class QuestionnaireTemplates {

  /** The one UFO@home ships with, which a case template names by its id (see CaseTemplate). */
  static readonly DEFAULT = "geipan-qt-2025"

  /** The pictures of the questionnaires UFO@home ships, each by an address the bundler knows (written whole, as it asks). */
  private static readonly IMAGES: Record<string, Record<string, string>> = {
    "geipan-qt-2025": {
      "azimuth.png": new URL("../../assets/questionnaires/geipan-qt-2025/azimuth.png", import.meta.url).href,
      "elevation.png": new URL("../../assets/questionnaires/geipan-qt-2025/elevation.png", import.meta.url).href,
      "angular-size.png": new URL("../../assets/questionnaires/geipan-qt-2025/angular-size.png", import.meta.url).href,
      "protractor.png": new URL("../../assets/questionnaires/geipan-qt-2025/protractor.png", import.meta.url).href
    }
  }

  private static readonly LOADERS: Record<string, () => Promise<QuestionnaireTemplate>> = {
    "geipan-qt-2025": () => import("./templates/geipan-qt-2025.json").then(module => QuestionnaireTemplates.withImages(
      structuredClone(module.default) as QuestionnaireTemplate, src => QuestionnaireTemplates.IMAGES["geipan-qt-2025"][src] ?? src))
  }

  /** `template`, each of its pictures at the address `where` gives its `src`. */
  static withImages(template: QuestionnaireTemplate, where: (src: string) => string): QuestionnaireTemplate {
    const move = (images?: QuestionnaireImage[]) => images?.forEach(image => { image.src = where(image.src) })
    for (const section of template.sections) {
      move(section.images)
      for (const field of section.fields) move(field.images)
    }
    return template
  }

  private static readonly added = new Map<string, QuestionnaireTemplate>()

  /** The ids of the questionnaires known, the default first. */
  static ids(): string[] {
    return [...new Set([...Object.keys(QuestionnaireTemplates.LOADERS), ...QuestionnaireTemplates.added.keys()])]
  }

  /** Makes a questionnaire known: one a module or a page brings. */
  static add(template: QuestionnaireTemplate): void {
    QuestionnaireTemplates.added.set(template.id, template)
  }

  private static readonly fetched = new Map<string, Promise<QuestionnaireTemplate | undefined>>()

  /**
   * The questionnaire `id`, or undefined when none is known by it. An address (see CaseTemplates.isAddress) is the file of one, read once and made
   * known by its own id.
   */
  static async load(id: string): Promise<QuestionnaireTemplate | undefined> {
    const known = QuestionnaireTemplates.added.get(id) ?? await QuestionnaireTemplates.LOADERS[id]?.()
    if (known || !/[/:]|\.json$/i.test(id)) return known
    let reading = QuestionnaireTemplates.fetched.get(id)
    if (!reading) {
      reading = fetch(id).then(response => response.ok ? response.json() : undefined).then((json: QuestionnaireTemplate | undefined) => {
        if (!json || typeof json.id !== "string" || !Array.isArray(json.sections)) return undefined
        QuestionnaireTemplates.add(QuestionnaireTemplates.withImages(json, src => new URL(src, id).href))
        return json
      }).catch(() => undefined)
      QuestionnaireTemplates.fetched.set(id, reading)
    }
    return reading
  }

  /** Every field, in order. */
  static fields(template: QuestionnaireTemplate): QuestionnaireTemplateField[] {
    return template.sections.flatMap(section => section.fields)
  }

  static field(template: QuestionnaireTemplate, id: string): QuestionnaireTemplateField | undefined {
    return QuestionnaireTemplates.fields(template).find(field => field.id === id)
  }

  /** A text of the questionnaire in `language`, else in its own. */
  static text(said: SaidText | undefined, language?: string): string {
    if (said === undefined) return ""
    if (typeof said === "string") return said
    const texts = said as Record<string, string>
    return (language && texts[language]) ?? Object.values(texts)[0] ?? ""
  }

  /**
   * The interview a witness fills the questionnaire in as: held through it, naming it, a turn of the interviewer for each question and none yet of the
   * witness. Answering a field adds the witness's turn after its question (see QuestionnaireTemplates.answer).
   */
  static interview(template: QuestionnaireTemplate, hints: InterviewImportHints = {}, recipient?: SealRecipient): InterviewJson {
    const witness = hints.witnesses?.length === 1 ? hints.witnesses[0] : undefined
    return {
      version: 1,
      ...(template.language ? { language: template.language } : {}),
      title: template.title,
      medium: "questionnaire",
      questionnaire: { id: template.id, ...(template.version ? { version: template.version } : {}), ...(recipient ? { recipient } : {}) },
      ...(witness ? { interviewOf: witness.id } : {}),
      speakers: {
        interviewer: { role: "interviewer", ...(hints.by?.[0] !== undefined ? { by: { people: hints.by[0] } } : {}) },
        witness: { role: "witness", ...(witness ? { title: witness.label, of: witness.id } : {}) }
      },
      transcription: { method: "manual" },
      proofreading: { interviewer: { status: "pending" }, witness: { status: "pending" } },
      segments: QuestionnaireTemplates.fields(template).map((field): InterviewSegment => ({ speaker: "interviewer", field: field.id, text: QuestionnaireTemplates.text(field.question, template.language) }))
    }
  }

  /** The witness's answer to `field` in `json`, as written; undefined when there is none. */
  static answerOf(json: InterviewJson, field: string): string | undefined {
    return QuestionnaireTemplates.answerTurn(json, field)?.text
  }

  /** The files the witness gave in answer to `field` in `json` (see InterviewSegment.files). */
  static filesOf(json: InterviewJson, field: string): InterviewAttachment[] {
    return QuestionnaireTemplates.answerTurn(json, field)?.files ?? []
  }

  private static answerTurn(json: InterviewJson, field: string): InterviewSegment | undefined {
    return json.segments.find(candidate => candidate.field === field && json.speakers[candidate.speaker]?.role === "witness")
  }

  /** The name a file goes by: its own, else the end of its address. */
  static fileName(file: InterviewAttachment): string {
    return file.name ?? (decodeURIComponent(file.src.replace(/[?#].*$/, "").replace(/\/+$/, "").replace(/^.*\//, "")) || file.src)
  }

  /**
   * Writes the files the witness gives in answer to `field`: its turn names them, one after another separated by "; ", and holds them; taken out when
   * there are none left.
   */
  static answerFiles(json: InterviewJson, field: string, files: InterviewAttachment[], question?: string): void {
    QuestionnaireTemplates.answer(json, field, files.map(file => QuestionnaireTemplates.fileName(file)).join("; "), question, undefined, files)
  }

  /**
   * Writes the witness's answer to `field`: its turn after the question, replaced when there was one, taken out when the answer is emptied (a field
   * left empty has its question only). A question the interview does not have yet is added at the end, with `question` as its text.
   */
  static answer(json: InterviewJson, field: string, answer: string, question?: string, redacted?: InterviewRedaction, files?: InterviewAttachment[]): void {
    const witness = Object.entries(json.speakers).find(([, speaker]) => speaker.role === "witness")?.[0] ?? "witness"
    if (!json.speakers[witness]) json.speakers[witness] = { role: "witness" }
    const at = json.segments.findIndex(segment => segment.field === field && json.speakers[segment.speaker]?.role === "witness")
    const text = answer.trim()
    // A confidential answer is written taken out, its text sealed or nowhere.
    const said = (segment: InterviewSegment): InterviewSegment => {
      const { text: _text, redacted: _redacted, files: _files, ...rest } = segment
      return redacted ? { ...rest, redacted } : { ...rest, text, ...(files?.length ? { files } : {}) }
    }
    if (at >= 0) {
      if (text === "") json.segments.splice(at, 1)
      else json.segments[at] = said(json.segments[at])
      return
    }
    if (text === "") return
    let asked = json.segments.findIndex(segment => segment.field === field && json.speakers[segment.speaker]?.role !== "witness")
    if (asked < 0) {
      const interviewer = Object.entries(json.speakers).find(([, speaker]) => speaker.role === "interviewer")?.[0] ?? "interviewer"
      if (!json.speakers[interviewer]) json.speakers[interviewer] = { role: "interviewer" }
      json.segments.push({ speaker: interviewer, field, text: question ?? field })
      asked = json.segments.length - 1
    }
    json.segments.splice(asked + 1, 0, said({ speaker: witness, field }))
  }
}
