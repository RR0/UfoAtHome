import type { AgentRef } from "../interpretation/Interpretation.js"
import type { SaidText } from "../model/SaidText.js"

/** What an interview was held through. */
export type InterviewMedium = "in-person" | "phone" | "video" | "chat" | "email" | "letter" | "other"

/** Who speaks in an interview. */
export interface InterviewSpeaker {
  role: "interviewer" | "witness" | string
  /** The interviewer, as the case names an agent. */
  by?: AgentRef
  /** What the witness is called: initials where the witness is not named. */
  title?: SaidText
  /** The `id` of the sighting event of the case this witness is the observer of. */
  of?: string
}

/** One turn of speech: one speaker, from `start` to `end` seconds after the beginning of the recording, and what was said. */
export interface InterviewSegment {
  speaker: string
  start: number
  end: number
  text: string
}

/**
 * The transcript of an interview of a case, the file the `url` of an event of type `interview` points at: who spoke, when, and what was said.
 *
 * Its own format, rather than WebVTT, because a transcript a case publishes needs what WebVTT has no place for: who each speaker IS (the
 * interviewer an agent of RR0, the witness the observer of one of the case's sightings, named or not), how the text was obtained (automatic
 * recognition, proofread or not), what was removed to anonymise it, and a language. A case is JSON; so is this. WebVTT stays what it is best
 * at, subtitles over the recording: see InterviewFile.toVtt, which makes one from it.
 *
 * It holds the whole of the interview: what the event of the case lists of it (its title, its time, who held it, with whom, what it established: the
 * summary the case editor shows) AND what was said. The two are kept the same, whichever is edited. `@rr0/data` reads and writes the same file
 * (`RR0Interview.fromFileJson`, `toFileJson`).
 *
 * Times are those of the recording, which may not be kept: they stay meaningful as a way to say where in the interview something was said.
 */
export interface InterviewJson {
  version: 1
  id?: string
  language?: string
  /** What the interview is called, in the languages it has. */
  title?: SaidText
  /** When it was held, as RR0 writes a time. */
  time?: string
  /** What it was held through: face to face (`in-person`), by `phone`, in a `video` call, by `chat`, by `email`, by `letter`, or `other`. */
  medium?: InterviewMedium
  /** Who held it. */
  by?: AgentRef[]
  /** The `id`, or the ids, of the sighting events of the case it was held with. */
  interviewOf?: string | string[]
  /** What it established, in the languages it has. */
  summary?: SaidText
  speakers: Record<string, InterviewSpeaker>
  transcription?: { method?: "automatic" | "manual", engine?: string, proofread?: boolean, note?: string }
  /** What was taken out to anonymise it, and what stands in its place. */
  anonymization?: { replaced?: string[], marker?: string }
  segments: InterviewSegment[]
}

/** Reading an interview transcript. */
export class InterviewFile {

  /** How a speaker is named in a subtitle: the witness's title, else the interviewer's agent, else the role. */
  static speakerName(json: InterviewJson, id: string): string {
    const speaker = json.speakers[id]
    if (!speaker) return id
    const title = typeof speaker.title === "string" ? speaker.title : speaker.title ? Object.values(speaker.title)[0] : undefined
    if (title) return title
    if (speaker.by) return "people" in speaker.by ? speaker.by.people : "org" in speaker.by ? speaker.by.org : (speaker.by as { title?: string }).title ?? speaker.role
    return speaker.role
  }

  private static stamp(seconds: number): string {
    const ms = Math.round(seconds * 1000)
    const pad = (n: number, width = 2): string => String(n).padStart(width, "0")
    return `${pad(Math.floor(ms / 3600000))}:${pad(Math.floor(ms / 60000) % 60)}:${pad(Math.floor(ms / 1000) % 60)}.${pad(ms % 1000, 3)}`
  }

  /**
   * The transcript as WebVTT, the speaker in a voice tag (`<v Q. B.>`) as the format has it, so that a player can show it as subtitles
   * over the recording. A cue ends where the next begins at the latest, since WebVTT does not let a cue overlap in a track of turns.
   */
  static toVtt(json: InterviewJson): string {
    const escape = (text: string): string => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    const cues = json.segments.map((segment, index) => {
      const next = json.segments[index + 1]
      const end = next && next.start < segment.end ? Math.max(segment.start, next.start) : segment.end
      return `${InterviewFile.stamp(segment.start)} --> ${InterviewFile.stamp(end)}\n<v ${escape(InterviewFile.speakerName(json, segment.speaker))}>${escape(segment.text)}`
    })
    return `WEBVTT\n\n${cues.join("\n\n")}\n`
  }
}
