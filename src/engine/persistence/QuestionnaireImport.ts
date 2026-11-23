import type { InterviewJson, InterviewSegment, InterviewSpeaker } from "./interviewJson.js"
import { InterviewFile } from "./interviewJson.js"
import type { InterviewImportHints } from "./interviewImport.js"
import type { ValueSource } from "./Provenance.js"
import type { QuestionnaireTemplate } from "../questionnaire/QuestionnaireTemplate.js"
import { QuestionnaireTemplates } from "../questionnaire/QuestionnaireTemplate.js"

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
  static parse(content: string | unknown, hints: InterviewImportHints = {}, template?: QuestionnaireTemplate): InterviewJson | undefined {
    const read = typeof content === "string" ? QuestionnaireImport.fromText(content, template) : QuestionnaireImport.fromJson(content)
    if (!read || read.fields.length === 0) return undefined
    const json = QuestionnaireImport.interview(read.fields, hints, read.about)
    if (template) json.questionnaire = { id: template.id, ...(template.version ? { version: template.version } : {}) }
    return json
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

  private static fromText(text: string, template?: QuestionnaireTemplate): { fields: QuestionnaireField[], about: object } | undefined {
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
    return { fields: QuestionnaireImport.lines(clean, template), about: {} }
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

  /**
   * A numbered question (`12.`, `Q12`, `B5.`, `E1'.`), or one that ends with a question mark, then its answer, on the lines after it or after it on the
   * same line; else `Question: answer` on each line. A page's footer (`page : 3`) is not part of an answer.
   *
   * With the questionnaire's `template`, a question is read as the template words it, however many lines it takes in the file, and what follows it
   * is the answer: the only way to tell where a question that ends with neither "?" nor ":" ends. A field the template asks without a number (a
   * free account) is found by its question; a title of the template's sections is no answer.
   */
  private static lines(text: string, template?: QuestionnaireTemplate): QuestionnaireField[] {
    const plain = (value: string): string => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "")
    const fields = template ? QuestionnaireTemplates.fields(template) : []
    const unnumbered = fields.filter(field => !/^[A-Za-z]?\d/.test(field.id)).map(field => ({ id: field.id, key: plain(QuestionnaireTemplates.text(field.question, template?.language)) }))
    const stops = (template?.stops ?? []).map(said => plain(QuestionnaireTemplates.text(said, template?.language))).filter(stop => stop !== "")
    const headings = new Set((template?.sections ?? []).flatMap(section => [section.title, section.intro]).filter(said => said !== undefined).map(said => plain(QuestionnaireTemplates.text(said, template?.language))))
    const numbered = /^(?:q(?:uestion)?\s*)?([A-Za-z]?\d+[a-z]?['’]?)\s*[.)\-–:]\s*(.*)$/u
    const footer = /\bpage\s*:?\s*\d+(?:\s*\/\s*\d+)?\s*$/i
    const blocks: { id: string, lines: string[] }[] = []
    let current: { id: string, lines: string[] } | undefined
    const loose: QuestionnaireField[] = []
    for (const raw of text.split("\n")) {
      const line = raw.trim()
      if (footer.test(line)) continue
      if (stops.some(stop => plain(line).startsWith(stop))) {
        current = undefined
        continue
      }
      // With a template, only its own numbers start a field: a numbered list in an answer, or in a part that asks nothing, does not.
      const found = numbered.exec(line)
      const number = found && (!template || QuestionnaireTemplates.field(template, QuestionnaireImport.idOf(found[1]))) ? found : null
      const named = number ? undefined : unnumbered.find(field => field.key !== "" && plain(line).startsWith(field.key))
      if (number || named) {
        current = { id: number ? QuestionnaireImport.idOf(number[1]) : named!.id, lines: [number ? number[2] : line] }
        blocks.push(current)
        continue
      }
      if (headings.has(plain(line)) && line !== "") continue
      if (current) {
        current.lines.push(line)
        continue
      }
      if (line === "" || template) continue
      const asked = QuestionnaireImport.split(line)
      if (asked) loose.push({ id: String(loose.length + 1), ...asked })
    }
    if (blocks.length === 0) return loose
    return blocks.map(block => {
      const body = block.lines.join("\n")
      const field = template ? QuestionnaireTemplates.field(template, block.id) ?? QuestionnaireTemplates.field(template, block.id.toLowerCase()) : undefined
      const id = field?.id ?? block.id
      const read = (field ? QuestionnaireImport.after(body, QuestionnaireTemplates.text(field.question, template?.language), plain, field.hint === undefined ? undefined : QuestionnaireTemplates.text(field.hint, template?.language)) : undefined) ?? QuestionnaireImport.asked(block.lines)
      const answer = field?.choices ? QuestionnaireImport.chosen(read.answer, field.choices.map(choice => choice.value)) : read.answer
      return { id, question: field ? QuestionnaireTemplates.text(field.question, template?.language) : read.question, ...QuestionnaireImport.answerOf(answer) }
    })
  }

  /**
   * What follows `question` in `body`, the question read letter by letter whatever spaces, stars and line breaks the file puts in it; and what follows
   * the `hint` printed after it, when it is.
   */
  private static after(body: string, question: string, plain: (value: string) => string, hint?: string): { question: string, answer?: string } | undefined {
    const consume = (from: number, words: string): number | undefined => {
      const wanted = plain(words)
      let matched = 0
      let at = from
      for (; at < body.length && matched < wanted.length; at++) {
        const letter = plain(body[at])
        if (letter === "") continue
        if (letter !== wanted[matched]) return undefined
        matched++
      }
      return matched < wanted.length ? undefined : at
    }
    const asked = consume(0, question)
    if (asked === undefined) return undefined
    const end = (hint !== undefined ? consume(asked, hint) : undefined) ?? asked
    // What the printed form puts round its question (stars, colons, the end of a parenthesis, an ellipsis) is not the witness's.
    const answer = body.slice(end).replace(/^[\s*:?.,;…)\]]+/u, "").replace(/\s+/g, " ").trim()
    return { question, ...(answer !== "" ? { answer } : {}) }
  }

  /**
   * The answer to a field of choices: the boxes ticked (☒, ☑, ✓, [x]) when the form has boxes, else what was written. A label the form prints before a
   * box to fill (`1:`) is no answer.
   */
  private static chosen(answer: string | undefined, choices: string[]): string | undefined {
    if (answer === undefined) return undefined
    const ticked = [...answer.matchAll(/(?:[☒☑✓✔]|\[[xX]\])\s*([^\s☐☒☑✓✔[\]]+)/gu)].map(match => match[1]).filter(value => choices.includes(value))
    if (ticked.length > 0) return ticked.join(", ")
    if (/[☐]/u.test(answer)) return undefined
    if (/^\S+:$/.test(answer.trim())) return undefined
    return answer
  }

  /** A field's number as the questionnaire writes it: `b5` is `B5`, `Q12` is `12`, `E1’` is `E1'`. */
  private static idOf(number: string): string {
    return number.replace("’", "'").toUpperCase().replace(/^Q(?=\d)/, "")
  }

  /** A question and its answer when nothing says where the question ends: at its first line that ends with "?", ":" or "*", else at its first " : " or "? ". */
  private static asked(lines: string[]): { question: string, answer?: string } {
    const end = lines.findIndex(line => /[?:*]\s*$/.test(line))
    if (end >= 0 && end < 3) {
      const answer = lines.slice(end + 1).join(" ").replace(/\s+/g, " ").trim()
      return { question: lines.slice(0, end + 1).join(" ").replace(/[\s*:]+$/, "").replace(/\s+/g, " ").trim(), ...(answer !== "" ? { answer } : {}) }
    }
    const first = QuestionnaireImport.split(lines[0]) ?? { question: lines[0].trim() }
    const rest = lines.slice(1).join(" ").replace(/\s+/g, " ").trim()
    const answer = [first.answer, rest].filter(part => part !== undefined && part !== "").join(" ")
    return { question: first.question, ...(answer !== "" ? { answer } : {}) }
  }

  /** `Question ? answer` or `Question : answer` on one line. */
  private static split(line: string): { question: string, answer?: string } | undefined {
    const mark = /\?(?:\s*\*)?(\s|$)|\s?:\s*\*?(\s|$)/.exec(line)
    if (!mark || mark.index === 0) return undefined
    const question = line.slice(0, mark.index + (line[mark.index] === "?" ? 1 : 0)).replace(/[\s*]+$/, "").trim()
    const answer = line.slice(mark.index + mark[0].length).trim()
    return { question, ...(answer !== "" ? { answer } : {}) }
  }
}
