import type { InterviewJson, InterviewSegment, InterviewSpeaker } from "./interviewJson.js"
import { InterviewFile } from "./interviewJson.js"
import type { InterviewImportHints } from "./interviewImport.js"
import type { ValueSource } from "./Provenance.js"

/** One field of a questionnaire as it was filled in: what it asks, and what the witness wrote, if anything. */
export interface QuestionnaireField {
  /** Its number or its name, as the questionnaire gives it. */
  id: string
  question: string
  /** What the witness wrote; absent, or empty, when they wrote nothing. */
  answer?: string
}

/** A field the witness answered (see QuestionnaireImport.answers): where the answer is, and what it says. */
export interface QuestionnaireAnswer {
  field: string
  /** The index of the witness's turn in the interview's `segments`, which is what a value's source points at (see SaidIn). */
  segment: number
  text: string
}

/**
 * Reads a questionnaire the witness filled in as an interview: each field is a question of the interviewer and, when the witness wrote something, the
 * answer of the witness, both of them naming the field (see InterviewSegment.field). A value of the recording can then rest on what the witness
 * answered as it rests on what they said in any interview, by citing that turn (see ValueSource.said and QuestionnaireImport.sourceOf).
 *
 * Any questionnaire: nothing here knows the questions of a particular one, whose fields are named as it names them. It reads
 * - JSON: a list of fields (`{ id | number | field, question | label, answer | value }`), or an object with such a list under `fields`, `questions`
 *   or `answers` (and a `title`, a `time`, a `language`), or an object whose keys are the questions and whose values are the answers;
 * - CSV or TSV: a question and its answer per line, or a field's number, its question and its answer;
 * - text: a numbered question (`12. …`, `Q12 …`) or one ending with a question mark, its answer on the lines after it or after it on the same line; or
 *   `Question: answer` on each line.
 *
 * What the witness did not answer is kept as a question with no answer, and what they answered "I don't know" as the answer they gave: the words
 * are theirs and stay in the transcript. Neither is an answer to build on (see informed): a field left empty, or a "don't know", says nothing
 * of the phenomenon, and is never read as an absence. Only a "no" written by the witness is that.
 */
export class QuestionnaireImport {

  /**
   * What says the witness did not know, in the languages the components speak: nothing to build a value on. A "no" is not one of them: it is an
   * answer.
   */
  private static readonly UNINFORMED = new RegExp("^(?:" + [
    "je ne sais pas", "j'?sais pas", "sais pas", "ne sait pas", "nsp", "inconnu", "inconnue", "aucune id[ée]e", "je ne (?:me )?souviens (?:pas|plus)", "ne se souvient pas", "non renseign[ée]e?",
    "i don'?t know", "don'?t know", "do not know", "dunno", "unknown", "not known", "dk", "n/?a", "i don'?t remember", "can'?t remember", "not sure",
    "no s[ée]", "no lo s[ée]", "desconocido", "no recuerdo",
    "non so", "non lo so", "sconosciuto", "non ricordo",
    "\\?+", "-+", "[—–]", "…", "\\.{2,}"
  ].join("|") + ")[.!]?$", "iu")

  /** Whether `answer` tells something: neither empty nor a "don't know" (see UNINFORMED). */
  static informed(answer: string | undefined): boolean {
    if (answer === undefined) return false
    const plain = InterviewFile.plain(answer).trim().replace(/\s+/g, " ").replace(/[’]/g, "'")
    return plain !== "" && !QuestionnaireImport.UNINFORMED.test(plain)
  }

  /**
   * The interview a filled questionnaire is, or undefined when the file holds no field. `hints` name those who sent it (the interviewer) and the
   * witness who filled it in, as for any interview (see InterviewImportHints).
   */
  static parse(content: string | unknown, hints: InterviewImportHints = {}): InterviewJson | undefined {
    const read = typeof content === "string" ? QuestionnaireImport.fromText(content) : QuestionnaireImport.fromJson(content)
    if (!read || read.fields.length === 0) return undefined
    return QuestionnaireImport.interview(read.fields, hints, read.about)
  }

  /** The interview of `fields`, in their order. */
  static interview(fields: QuestionnaireField[], hints: InterviewImportHints = {}, about: { title?: string, time?: string, language?: string } = {}): InterviewJson {
    const speakers: Record<string, InterviewSpeaker> = {}
    const by = hints.by?.[0]
    speakers.interviewer = { role: "interviewer", ...(by !== undefined ? { by: { people: by } } : {}) }
    const witness = hints.witnesses?.length === 1 ? hints.witnesses[0] : undefined
    speakers.witness = { role: "witness", ...(witness ? { title: witness.label, of: witness.id } : {}) }
    const segments: InterviewSegment[] = []
    for (const field of fields) {
      segments.push({ speaker: "interviewer", field: field.id, text: field.question })
      const answer = field.answer?.trim()
      if (answer) segments.push({ speaker: "witness", field: field.id, text: answer })
    }
    return {
      version: 1,
      ...(about.language ? { language: about.language } : {}),
      ...(about.title ? { title: about.title } : {}),
      ...(about.time ? { time: about.time } : {}),
      medium: "questionnaire",
      ...(witness ? { interviewOf: witness.id } : {}),
      speakers,
      transcription: { method: "manual" },
      proofreading: { interviewer: { status: "pending" }, witness: { status: "pending" } },
      segments
    }
  }

  /**
   * The fields of an interview the witness answered, by field, with the turn of the answer: what a value can rest on. A field answered "I don't know"
   * or not at all is not there (see informed). A field answered over several turns has the first.
   */
  static answers(json: InterviewJson): Map<string, QuestionnaireAnswer> {
    const found = new Map<string, QuestionnaireAnswer>()
    json.segments.forEach((segment, index) => {
      if (segment.field === undefined || found.has(segment.field)) return
      if (json.speakers[segment.speaker]?.role !== "witness") return
      const text = InterviewFile.said(segment)
      if (text !== undefined && QuestionnaireImport.informed(text)) found.set(segment.field, { field: segment.field, segment: index, text: text.trim() })
    })
    return found
  }

  /**
   * What a value of the recording rests on when it is the witness's answer to `field`: that turn of the interview `interview` (the id of the case's
   * interview event, left out when the case holds only that one). Undefined when the witness did not answer it, since a value taken from
   * nothing they said rests on nothing they said.
   */
  static sourceOf(json: InterviewJson, field: string, interview?: string): ValueSource | undefined {
    const answer = QuestionnaireImport.answers(json).get(field)
    if (!answer) return undefined
    return { said: { ...(interview !== undefined ? { interview } : {}), segment: answer.segment } }
  }

  private static fromJson(json: unknown): { fields: QuestionnaireField[], about: { title?: string, time?: string, language?: string } } | undefined {
    const about: { title?: string, time?: string, language?: string } = {}
    let list: unknown = json
    if (json !== null && typeof json === "object" && !Array.isArray(json)) {
      const object = json as Record<string, unknown>
      const key = ["fields", "questions", "answers"].find(name => Array.isArray(object[name]))
      if (key) {
        list = object[key]
        for (const name of ["title", "time", "language"] as const) if (typeof object[name] === "string") about[name] = object[name] as string
      } else {
        // The questions as keys, the answers as values.
        const entries = Object.entries(object)
        if (entries.length === 0 || !entries.every(([, value]) => QuestionnaireImport.isAnswer(value))) return undefined
        return { fields: entries.map(([question, value], index) => ({ id: String(index + 1), question, ...QuestionnaireImport.answerOf(value) })), about }
      }
    }
    if (!Array.isArray(list)) return undefined
    const fields: QuestionnaireField[] = []
    list.forEach((item, index) => {
      if (item === null || typeof item !== "object" || Array.isArray(item)) return
      const field = item as Record<string, unknown>
      const pick = (...names: string[]): unknown => names.map(name => field[name]).find(value => value !== undefined)
      const id = pick("id", "number", "field", "key", "name")
      const question = pick("question", "label", "title", "text", "q")
      const answer = pick("answer", "value", "response", "a", "reply")
      if (question === undefined && id === undefined) return
      fields.push({
        id: id !== undefined ? String(id) : String(index + 1),
        question: typeof question === "string" && question.trim() !== "" ? question.trim() : String(id),
        ...(QuestionnaireImport.isAnswer(answer) ? QuestionnaireImport.answerOf(answer) : {})
      })
    })
    return { fields, about }
  }

  private static isAnswer(value: unknown): boolean {
    return value === null || value === undefined || ["string", "number", "boolean"].includes(typeof value)
      || (Array.isArray(value) && value.every(item => ["string", "number", "boolean"].includes(typeof item)))
  }

  /** An answer as text: a list (several boxes ticked) joined, a number or a yes/no written out. */
  private static answerOf(value: unknown): { answer?: string } {
    if (value === null || value === undefined) return {}
    const text = Array.isArray(value) ? value.map(String).join(", ") : String(value)
    return text.trim() === "" ? {} : { answer: text.trim() }
  }

  private static fromText(text: string): { fields: QuestionnaireField[], about: object } | undefined {
    // Only the blank lines round it are taken off: a last cell left empty is a tab or a comma at the end of its line.
    const clean = text.replace(/^﻿/, "").replace(/\r\n?/g, "\n").replace(/^(?:[ \t]*\n)+|(?:\n[ \t]*)+$/g, "")
    if (clean.trim() === "") return undefined
    if (/^\s*[{[]/.test(clean)) {
      try {
        return QuestionnaireImport.fromJson(JSON.parse(clean))
      } catch {
        // not JSON after all: read as text
      }
    }
    const table = QuestionnaireImport.table(clean)
    if (table) return { fields: table, about: {} }
    return { fields: QuestionnaireImport.lines(clean), about: {} }
  }

  /** CSV or TSV, when every line has the same number of cells, two or more. A first line that names the columns is left out. */
  private static table(text: string): QuestionnaireField[] | undefined {
    const lines = text.split("\n").filter(line => line.trim() !== "")
    for (const separator of ["\t", ";", ","]) {
      const rows = lines.map(line => QuestionnaireImport.cells(line, separator))
      const width = rows[0].length
      if (width < 2 || !rows.every(row => row.length === width)) continue
      const header = rows[0].some(cell => /^(question|questions|answer|answers|r[ée]ponse|r[ée]ponses|field|champ|n°|no|num[ée]ro|id)$/i.test(cell.trim()))
      return rows.slice(header ? 1 : 0).map((row, index) => width === 2
        ? { id: String(index + 1), question: row[0].trim(), ...QuestionnaireImport.answerOf(row[1]) }
        : { id: row[0].trim() || String(index + 1), question: row[1].trim() || row[0].trim(), ...QuestionnaireImport.answerOf(row.slice(2).join(separator === "\t" ? " " : `${separator} `)) })
    }
    return undefined
  }

  /** The cells of a line, a cell in double quotes keeping its separators and its doubled quotes. */
  private static cells(line: string, separator: string): string[] {
    const cells: string[] = []
    let cell = ""
    let quoted = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (quoted) {
        if (c === "\"" && line[i + 1] === "\"") {
          cell += "\""
          i++
        } else if (c === "\"") quoted = false
        else cell += c
      } else if (c === "\"" && cell.trim() === "") {
        quoted = true
        cell = ""
      } else if (c === separator) {
        cells.push(cell)
        cell = ""
      } else cell += c
    }
    cells.push(cell)
    return cells
  }

  /** A numbered question, or one that ends with a question mark, then its answer; else `Question: answer` on each line. */
  private static lines(text: string): QuestionnaireField[] {
    const fields: QuestionnaireField[] = []
    const numbered = /^(?:q(?:uestion)?\s*)?(\d+[a-z]?)\s*[.)\-–:]\s*(.+)$/iu
    let current: QuestionnaireField | undefined
    const add = (field: QuestionnaireField): void => {
      fields.push(field)
      current = field
    }
    const asks = (line: string): { question: string, answer?: string } | undefined => {
      const mark = line.search(/\?(\s|$)/)
      if (mark < 0) return undefined
      const after = line.slice(mark + 1).trim()
      return { question: line.slice(0, mark + 1).trim(), ...(after !== "" ? { answer: after } : {}) }
    }
    for (const raw of text.split("\n")) {
      const line = raw.trim()
      if (line === "") {
        current = undefined
        continue
      }
      const number = numbered.exec(line)
      if (number) {
        const asked = asks(number[2])
        add({ id: number[1], question: asked?.question ?? number[2].trim(), ...(asked?.answer ? { answer: asked.answer } : {}) })
        continue
      }
      const asked = asks(line)
      if (asked) {
        add({ id: String(fields.length + 1), ...asked })
        continue
      }
      const colon = /^([^:]{1,80}?)\s*:\s*(.*)$/u.exec(line)
      if (!current && colon) {
        fields.push({ id: String(fields.length + 1), question: colon[1].trim(), ...QuestionnaireImport.answerOf(colon[2]) })
        continue
      }
      if (current) current.answer = current.answer ? `${current.answer} ${line}` : line
    }
    return fields
  }
}
