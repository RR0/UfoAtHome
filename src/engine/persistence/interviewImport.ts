import type { InterviewJson, InterviewSegment, InterviewSpeaker } from "./interviewJson.js"
import { InterviewFile } from "./interviewJson.js"
import type { TranscribedSegment } from "../transcription/TranscriptionProvider.js"

/** What the file being read is about, when the case already says: who held the interview, and with whom. */
export interface InterviewImportHints {
  /** The names of those who held it (ids of RR0 people, or what they are called). */
  by?: string[]
  /** The case's observers the interview may have been held with: the `id` of the account, and what it is called. */
  witnesses?: { id: string, label: string }[]
}

/** One turn as found in the file, before it is given a speaker of the interview. */
interface Turn {
  label?: string
  start?: number
  text: string
}

/**
 * Reads an interview from a file that is not in our format, as it usually comes: a transcript out of a recording tool or a subtitle file
 * (WebVTT, SRT), a text or Markdown file with a name before each turn (`Name: …`, `[00:12:34] Name: …`, `Q:` / `R:`), or plain paragraphs. It guesses
 * what it can (who speaks, when) and leaves out what the file does not say; what it gets wrong is for the author to correct in the file.
 *
 * Who speaks is mapped to the interview's speakers: a name that is one of those who held it (`hints.by`) is an interviewer, one that is a witness
 * of the case (`hints.witnesses`) is that witness; of those left, the first to speak is the interviewer and the others witnesses, as is usual.
 * `Q`, `Q.` and `Question` always ask, `R`, `A`, `Réponse` and `Answer` always answer.
 */
export class InterviewImport {

  private static readonly ASKS = /^(q|question|pregunta|domanda|interviewer|enquêteur|enqueteur|intervieweur|entrevistador|intervistatore)$/i
  private static readonly ANSWERS = /^(r|a|réponse|reponse|answer|respuesta|risposta|témoin|temoin|witness|testigo|testimone)$/i

  /** `hh:mm:ss`, `mm:ss` or `ss`, with a fraction after a dot or a comma, in seconds. */
  static seconds(stamp: string): number | undefined {
    const match = /^(?:(\d{1,2}):)?(\d{1,3}):(\d{1,2})(?:[.,](\d{1,3}))?$/.exec(stamp.trim())
    if (!match) return undefined
    const [, h, m, s, fraction] = match
    return Number(h ?? 0) * 3600 + Number(m) * 60 + Number(s) + (fraction ? Number(`0.${fraction}`) : 0)
  }

  /** The role of a voice a transcription found but nobody has said whose it is yet. */
  static readonly UNATTRIBUTED = InterviewFile.UNATTRIBUTED

  /**
   * The interview a transcription of its recording found (see TranscriptionProvider). Whose each voice is, a transcription does not know:
   * every stretch is given to a voice still to attribute (one per voice the service told apart, else one for all), never guessed to be the
   * interviewer's or the witness's. Those who held it (`hints.by`) and the witnesses it was held with (`hints.witnesses`) are speakers already,
   * for each stretch to be given to the right one; a voice nobody speaks with any more is then dropped (see InterviewImport.dropUnheard).
   */
  static transcribed(found: TranscribedSegment[], hints: InterviewImportHints = {}): InterviewJson | undefined {
    const said = found.filter(segment => segment.text.trim() !== "")
    if (said.length === 0) return undefined
    const speakers: Record<string, InterviewSpeaker> = {}
    hints.by?.forEach((person, n) => { speakers[n === 0 ? "interviewer" : `interviewer${n + 1}`] = { role: "interviewer", by: { people: person } } })
    hints.witnesses?.forEach((witness, n) => { speakers[n === 0 ? "witness" : `witness${n + 1}`] = { role: "witness", title: witness.label, of: witness.id } })
    const voices = new Map<string, string>()
    const voiceOf = (label: string | undefined): string => {
      const key = label ?? ""
      let id = voices.get(key)
      if (id === undefined) {
        id = voices.size === 0 ? "voice" : `voice${voices.size + 1}`
        voices.set(key, id)
        speakers[id] = { role: InterviewImport.UNATTRIBUTED, ...(label ? { title: label } : {}) }
      }
      return id
    }
    const segments: InterviewSegment[] = said.map(segment => ({
      speaker: voiceOf(segment.speaker),
      start: Math.round(segment.start * 100) / 100,
      end: Math.round(Math.max(segment.start, segment.end) * 100) / 100,
      text: segment.text.trim().replace(/\s+/g, " ")
    }))
    // A voice nobody has named cannot proofread: those it turns out to be will.
    const proofreading = Object.fromEntries(Object.entries(speakers).filter(([, speaker]) => speaker.role !== InterviewImport.UNATTRIBUTED).map(([id]) => [id, { status: "pending" as const }]))
    return { version: 1, speakers, proofreading, segments }
  }

  /**
   * Gives the turn at `index` to the speaker `id`. When it was a voice a service told apart (an unattributed voice it named, "A"), every
   * turn of that voice goes with it: the service heard them as one person, and saying who once is enough. A voice nobody told apart
   * (Whisper's, which holds every turn) is said turn by turn. A voice left with no turn is then dropped.
   */
  static attribute(json: InterviewJson, index: number, id: string): void {
    const from = json.segments[index]?.speaker
    if (from === undefined) return
    const voice = json.speakers[from]
    const whole = voice?.role === InterviewImport.UNATTRIBUTED && voice.title !== undefined
    json.segments.forEach((segment, n) => { if (n === index || (whole && segment.speaker === from)) segment.speaker = id })
    InterviewImport.dropUnheard(json)
  }

  /** Drops from `json` the voices still to attribute that no stretch is given to any more, and what is said of their proofreading. */
  static dropUnheard(json: InterviewJson): void {
    const heard = new Set(json.segments.map(segment => segment.speaker))
    for (const [id, speaker] of Object.entries(json.speakers)) {
      if (speaker.role !== InterviewImport.UNATTRIBUTED || heard.has(id)) continue
      delete json.speakers[id]
      if (json.proofreading) delete json.proofreading[id]
    }
  }

  /** The interview a file holds, or undefined when it holds nothing that reads as one. */
  static parse(text: string, hints: InterviewImportHints = {}): InterviewJson | undefined {
    const clean = text.replace(/^﻿/, "").replace(/\r\n?/g, "\n").trim()
    if (clean === "") return undefined
    const turns = /-->/.test(clean) ? InterviewImport.cues(clean) : InterviewImport.labelled(clean) ?? InterviewImport.paragraphs(clean)
    if (turns.length === 0) return undefined
    return InterviewImport.build(turns, hints)
  }

  /** WebVTT and SRT: numbered or not, a `-->` line, then the text, the speaker in a `<v Name>` tag or a `Name:` before it. */
  private static cues(text: string): Turn[] {
    const turns: Turn[] = []
    for (const block of text.split(/\n{2,}/)) {
      const lines = block.split("\n")
      const at = lines.findIndex(line => line.includes("-->"))
      if (at < 0) continue
      const start = InterviewImport.seconds(lines[at].split("-->")[0].trim().split(/\s+/)[0])
      const body = lines.slice(at + 1).join(" ").trim()
      const voice = /^<v(?:\.[^\s>]*)?\s+([^>]+)>/.exec(body)
      const said = body.replace(/<\/?[^>]+>/g, "").replace(/\s+/g, " ").trim()
      if (said === "") continue
      if (voice) {
        turns.push({ label: voice[1].trim(), start, text: said })
        continue
      }
      const named = InterviewImport.label(said)
      turns.push(named ? { label: named.label, start, text: named.text } : { start, text: said })
    }
    return InterviewImport.joined(turns)
  }

  /** `Name: …` and its timed variants, a turn going on over the lines that have no name. Undefined when the file is not laid out like that. */
  private static labelled(text: string): Turn[] | undefined {
    const turns: Turn[] = []
    let named = 0
    let lines = 0
    for (const line of text.split("\n")) {
      const trimmed = line.trim()
      if (trimmed === "") continue
      lines++
      const found = InterviewImport.label(trimmed)
      if (found) {
        named++
        turns.push(found)
      } else if (turns.length > 0) turns[turns.length - 1].text += ` ${trimmed}`
      else turns.push({ text: trimmed })
    }
    const labels = new Set(turns.map(turn => turn.label).filter((label): label is string => label !== undefined))
    // A few names that come back, on most of the lines (or the Q and the R, which need not): otherwise a colon in a sentence is only a colon.
    const times = new Map<string, number>()
    for (const turn of turns) if (turn.label !== undefined) times.set(turn.label, (times.get(turn.label) ?? 0) + 1)
    const comesBack = [...times.values()].some(count => count >= 2) || [...labels].every(label => InterviewImport.ASKS.test(label) || InterviewImport.ANSWERS.test(label))
    if (named < 2 || labels.size > 10 || named / lines < 0.3 || !comesBack) return undefined
    return InterviewImport.joined(turns)
  }

  /** The speaker and time a line starts with, if it does: `[00:12:34] Name: …`, `Name (00:12:34): …`, `Name: …`, `00:12:34 Name: …`. */
  private static label(line: string): Turn | undefined {
    const stamp = String.raw`(?:\d{1,2}:)?\d{1,3}:\d{1,2}(?:[.,]\d{1,3})?`
    const name = String.raw`[\p{L}][\p{L}\p{N} .'’\-]{0,38}?`
    const patterns: [RegExp, (m: RegExpExecArray) => Turn][] = [
      [new RegExp(String.raw`^[\[(]?(${stamp})[\])]?\s*[-–]?\s*(${name})\s*:\s*(.+)$`, "u"), m => ({ label: m[2].trim(), start: InterviewImport.seconds(m[1]), text: m[3].trim() })],
      [new RegExp(String.raw`^(${name})\s*[\[(](${stamp})[\])]\s*:?\s*(.+)$`, "u"), m => ({ label: m[1].trim(), start: InterviewImport.seconds(m[2]), text: m[3].trim() })],
      [new RegExp(String.raw`^(${name})\s*:\s*(.+)$`, "u"), m => ({ label: m[1].trim(), text: m[2].trim() })]
    ]
    for (const [pattern, turn] of patterns) {
      const match = pattern.exec(line)
      if (match) return turn(match)
    }
    return undefined
  }

  /** Paragraphs, nobody named: one turn each, as they come. */
  private static paragraphs(text: string): Turn[] {
    return text.split(/\n{2,}/).map(paragraph => paragraph.replace(/\s+/g, " ").trim()).filter(paragraph => paragraph !== "").map(paragraph => ({ text: paragraph }))
  }

  /** Neighbouring turns of one speaker are one turn. */
  private static joined(turns: Turn[]): Turn[] {
    const joined: Turn[] = []
    for (const turn of turns) {
      const last = joined[joined.length - 1]
      if (last && last.label === turn.label && turn.label !== undefined) last.text += ` ${turn.text}`
      else joined.push({ ...turn })
    }
    return joined
  }

  private static same(a: string, b: string): boolean {
    const plain = (value: string): string => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "")
    const x = plain(a)
    const y = plain(b)
    return x !== "" && y !== "" && (x === y || x.includes(y) || y.includes(x))
  }

  /** Gives the speakers of the file those of the interview, and the turns their times. */
  private static build(turns: Turn[], hints: InterviewImportHints): InterviewJson {
    const labels = [...new Set(turns.map(turn => turn.label ?? ""))]
    const speakers: Record<string, InterviewSpeaker> = {}
    const ids = new Map<string, string>()
    const counts = { interviewer: 0, witness: 0, other: 0 }
    const take = (role: "interviewer" | "witness" | "other", speaker: Omit<InterviewSpeaker, "role">): string => {
      const n = counts[role]++
      const id = n === 0 ? role : `${role}${n + 1}`
      speakers[id] = { ...speaker, role }
      return id
    }
    const interviewers = hints.by ?? []
    let first = true
    for (const label of labels) {
      const person = interviewers.find(name => label !== "" && InterviewImport.same(label, name))
      const witness = hints.witnesses?.find(candidate => label !== "" && InterviewImport.same(label, candidate.label))
      if (label === "") ids.set(label, take(first ? "interviewer" : "witness", {}))
      else if (person !== undefined || InterviewImport.ASKS.test(label)) ids.set(label, take("interviewer", person !== undefined ? { by: { people: person } } : {}))
      else if (witness || InterviewImport.ANSWERS.test(label)) ids.set(label, take("witness", witness ? { title: witness.label, of: witness.id } : {}))
      else ids.set(label, take(first && interviewers.length === 0 ? "interviewer" : "witness", {}))
      first = false
    }
    // A name the file gives that is not one of the interview's is kept as what the speaker is called.
    labels.forEach(label => {
      const speaker = speakers[ids.get(label)!]
      if (label !== "" && !InterviewImport.ASKS.test(label) && !InterviewImport.ANSWERS.test(label) && speaker.title === undefined && speaker.by === undefined) speaker.title = label
    })
    const segments: InterviewSegment[] = turns.map((turn, index) => {
      const next = turns.slice(index + 1).find(candidate => candidate.start !== undefined)
      return {
        speaker: ids.get(turn.label ?? "")!,
        ...(turn.start !== undefined ? { start: turn.start } : {}),
        ...(turn.start !== undefined && next?.start !== undefined && next.start >= turn.start ? { end: next.start } : {}),
        text: turn.text
      }
    })
    const proofreading = Object.fromEntries(Object.keys(speakers).map(id => [id, { status: "pending" as const }]))
    return { version: 1, speakers, proofreading, segments }
  }
}
