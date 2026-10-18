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

/**
 * A place in the interview that points at a moment of the observation it is about: a part of what was said (`range`, as character offsets
 * in the segment's `text`, the whole segment when omitted) that tells of what happened `at` that moment. A player can follow it to show the
 * observation then, and an observation can list, at that moment, the passages of the interview that tell of it.
 */
export interface InterviewSightingRef {
  /** The `id` of the sighting event of the case; the interview's own `interviewOf` when omitted. */
  sighting?: string
  /** Seconds since the beginning of the observation. */
  at: number
  /** The part of the segment's text it is about, as `[from, to)` character offsets. */
  range?: [number, number]
}

/** Why a passage was taken out of a published interview. */
export interface InterviewRedaction {
  /** Why, in the languages it has: what kind of passage (private life, identifying detail, small talk, recognition error). */
  reason: SaidText
}

/** A stretch of a segment: said, or taken out (see InterviewSegment.parts). */
export type InterviewSegmentPart = { text: string } | { redacted: InterviewRedaction }

/**
 * One turn of speech: one speaker, from `start` to `end` seconds after the beginning of the recording, and what was said.
 *
 * A passage taken out of the published file keeps its place (speaker and times) but loses its `text`, and says why in `redacted`: a reader can
 * show it as blacked out rather than hide that it existed.
 *
 * Only a stretch of it may be taken out, the rest staying (the answer to a question, without the detail that would identify): then it has
 * `parts` instead of `text`, in order, each said or redacted. `refs[].range` counts in `text`, so a segment with `parts` has none.
 */
export interface InterviewSegment {
  speaker: string
  start: number
  end: number
  text?: string
  redacted?: InterviewRedaction
  parts?: InterviewSegmentPart[]
  /** The moments of the observation this passage tells of. */
  refs?: InterviewSightingRef[]
}

/**
 * Whether a participant has approved the transcript as it is published.
 * `pending`: not asked or not answered. `approved`: read and approved. `covered`: approved through a FULLER version, since a file that holds
 * less than one they approved (passages removed, nothing added) needs no new approval; `coveredBy` says which one (its `id`).
 */
export interface InterviewProofreading {
  status: "pending" | "approved" | "covered"
  /** When, as RR0 writes a time. */
  date?: string
  /** For `covered`: the `id` of the fuller version they approved. */
  coveredBy?: string
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
  transcription?: { method?: "automatic" | "manual", engine?: string, note?: string }
  /**
   * Who approved the transcript, by speaker id. The transcript is proofread when EVERY speaker has (see InterviewFile.isProofread); a
   * speaker not listed has not.
   */
  proofreading?: Record<string, InterviewProofreading>
  /** What was taken out to anonymise it, and what stands in its place. */
  anonymization?: { replaced?: string[], marker?: string }
  segments: InterviewSegment[]
}

/** A passage of an interview that tells of a moment of an observation (see InterviewSightingRef). */
export interface InterviewPassage {
  /** Where the segment is in the transcript. */
  index: number
  speaker: string
  /** Seconds since the beginning of the observation. */
  at: number
  /** What it says, when it has not been taken out. */
  text?: string
  /** The part of `text` it is about. */
  range?: [number, number]
}

/** Reading an interview transcript. */
export class InterviewFile {

  /** True when every speaker has approved the transcript (`approved`, or `covered` by a fuller version they approved). */
  static isProofread(json: InterviewJson): boolean {
    const ids = Object.keys(json.speakers)
    return ids.length > 0 && ids.every(id => {
      const status = json.proofreading?.[id]?.status
      return status === "approved" || status === "covered"
    })
  }

  /** What a segment says as published: its text, or its said parts joined with `…` where a stretch was taken out; undefined when it is taken out whole. */
  static said(segment: InterviewSegment): string | undefined {
    if (segment.parts) return segment.parts.map(part => "text" in part ? part.text : "…").join(" ")
    return segment.redacted ? undefined : segment.text ?? ""
  }

  /** The `id`s of the sightings the interview was held with. */
  static sightingsOf(json: InterviewJson): string[] {
    return [json.interviewOf].flat().filter((id): id is string => typeof id === "string")
  }

  /**
   * The passages that tell of moments of the observation `sighting`, in the order of those moments: what an observation can list at the time they
   * are about, each a link back to its segment. A reference that names no sighting is about those the interview was held with.
   */
  static passagesAbout(json: InterviewJson, sighting: string): InterviewPassage[] {
    const held = InterviewFile.sightingsOf(json)
    const passages: InterviewPassage[] = []
    json.segments.forEach((segment, index) => {
      for (const ref of segment.refs ?? []) {
        if (ref.sighting === undefined ? !held.includes(sighting) : ref.sighting !== sighting) continue
        const text = InterviewFile.said(segment)
        passages.push({ index, speaker: segment.speaker, at: ref.at, ...(text !== undefined ? { text } : {}), ...(ref.range ? { range: ref.range } : {}) })
      }
    })
    return passages.sort((a, b) => a.at - b.at || a.index - b.index)
  }

  /** A length of time as it reads on a clock: `1:02:05` for an hour, `2:05` otherwise, with tenths of a second when there are. */
  static clock(seconds: number): string {
    const tenths = Math.round(seconds * 10)
    const whole = Math.floor(tenths / 10)
    const pad = (n: number): string => String(n).padStart(2, "0")
    const hours = Math.floor(whole / 3600)
    const rest = `${hours > 0 ? pad(Math.floor(whole / 60) % 60) : Math.floor(whole / 60)}:${pad(whole % 60)}`
    return `${hours > 0 ? `${hours}:` : ""}${rest}${tenths % 10 === 0 ? "" : `.${tenths % 10}`}`
  }

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
      return `${InterviewFile.stamp(segment.start)} --> ${InterviewFile.stamp(end)}\n<v ${escape(InterviewFile.speakerName(json, segment.speaker))}>${escape(InterviewFile.said(segment) ?? "[…]")}`
    })
    return `WEBVTT\n\n${cues.join("\n\n")}\n`
  }
}
