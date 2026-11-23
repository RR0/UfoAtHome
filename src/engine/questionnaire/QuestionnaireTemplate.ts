import type { SaidText } from "../model/SaidText.js"
import type { InterviewJson, InterviewSegment } from "../persistence/interviewJson.js"
import type { InterviewImportHints } from "../persistence/interviewImport.js"

/** What a field's answer is for the form that asks it: a line, a text, a date, a time, one of several choices, a mark on a scale. */
export type QuestionnaireFieldKind = "text" | "long" | "date" | "time" | "choice" | "scale"

/**
 * What a field's answer may set in the recording of the observation, once the witness has answered (see QuestionnaireFeed): the witness's account
 * in their words, where they were, when it began, how long it lasted, the colour, where it was at the beginning and at the end.
 */
export type QuestionnaireFeedTarget = "narrative" | "place" | "date" | "startTime" | "duration" | "color" | "startAzimuth" | "startElevation" | "endAzimuth" | "endElevation"

export interface QuestionnaireTemplateField {
  /** Its number or name, as the questionnaire gives it: what the interview's turns name (see InterviewSegment.field). */
  id: string
  question: SaidText
  hint?: SaidText
  /** "long" when absent. */
  kind?: QuestionnaireFieldKind
  choices?: { value: string, label: SaidText }[]
  /** True when absent: the questionnaire asks it of every witness. */
  required?: boolean
  feeds?: QuestionnaireFeedTarget
}

export interface QuestionnaireTemplateSection {
  title: SaidText
  intro?: SaidText
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

  private static readonly LOADERS: Record<string, () => Promise<QuestionnaireTemplate>> = {
    "geipan-qt-2025": () => import("./templates/geipan-qt-2025.json").then(module => module.default as QuestionnaireTemplate)
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
        QuestionnaireTemplates.add(json)
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
  static interview(template: QuestionnaireTemplate, hints: InterviewImportHints = {}): InterviewJson {
    const witness = hints.witnesses?.length === 1 ? hints.witnesses[0] : undefined
    return {
      version: 1,
      ...(template.language ? { language: template.language } : {}),
      title: template.title,
      medium: "questionnaire",
      questionnaire: { id: template.id, ...(template.version ? { version: template.version } : {}) },
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
    const segment = json.segments.find(candidate => candidate.field === field && json.speakers[candidate.speaker]?.role === "witness")
    return segment?.text
  }

  /**
   * Writes the witness's answer to `field`: its turn after the question, replaced when there was one, taken out when the answer is emptied (a field
   * left empty has its question only). A question the interview does not have yet is added at the end, with `question` as its text.
   */
  static answer(json: InterviewJson, field: string, answer: string, question?: string): void {
    const witness = Object.entries(json.speakers).find(([, speaker]) => speaker.role === "witness")?.[0] ?? "witness"
    if (!json.speakers[witness]) json.speakers[witness] = { role: "witness" }
    const at = json.segments.findIndex(segment => segment.field === field && json.speakers[segment.speaker]?.role === "witness")
    const text = answer.trim()
    if (at >= 0) {
      if (text === "") json.segments.splice(at, 1)
      else json.segments[at] = { ...json.segments[at], text }
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
    json.segments.splice(asked + 1, 0, { speaker: witness, field, text })
  }
}
