import type { InterviewJson } from "../persistence/interviewJson.js"
import type { SaidText } from "../model/SaidText.js"

/**
 * One account of a case, as a statistical orientation tool is asked to code it: the recording as its file has it, values with their basis and
 * their source (see StatedValue), and the interviews held with its witness, a filled questionnaire among them (see QuestionnaireImport).
 *
 * The witness's words come first from the interviews, synchronised with the simulation; what is drawn in the recording is the last resort, for
 * what nobody wrote down. A tool that codes the account says which it took, per value (see OrientationCoding.origin).
 */
export interface OrientationAccount {
  /** The `id` of the case's sighting event. */
  event: string
  /** The recording, as in its file (StatedValue wrappers kept): what is coded is what the file says, nothing the editor made of it. */
  recording: object
  /** The SHA-256 of the recording as coded (see RecordingDigest): what a result says it was computed on. */
  digest: string
  /** Whether the case has frozen the event (see the case's `sealed`): a result on a frozen recording cannot go stale. */
  sealed?: boolean
  /** The case's interviews held with this account's witness, by the `id` of their event. */
  interviews: { id?: string, json: InterviewJson }[]
}

/**
 * An episode of a profile: an account, or the part of it between two instants. Repeats of one phenomenon are one profile for a statistic and two
 * recordings for a geometry, each with its own direction and time; and one recording may hold two phenomena a statistic tells apart.
 */
export interface OrientationEpisode {
  /** The `id` of the case's sighting event. */
  event: string
  /** The SHA-256 of its recording as coded (see RecordingDigest). */
  digest?: string
  /** The part of it, as `[from, to)` seconds since the beginning of the observation: the whole of it when omitted. */
  within?: [number, number]
}

/** How the investigator groups the episodes of a case into the profiles a tool codes, each by an id of theirs: never inferred. */
export interface OrientationGrouping {
  id: string
  title?: SaidText
  episodes: OrientationEpisode[]
}

/** What a tool is asked to code: the accounts of a case, and the profiles they make (see OrientationProfile). */
export interface OrientationRequest {
  /** The case's `id`, when it has one. */
  case?: string
  accounts: OrientationAccount[]
  /** The profiles to code: one per account, under its event's id, when omitted. */
  profiles?: OrientationGrouping[]
}

/** Where one coded value came from, from the strongest to the weakest. */
export type OrientationOrigin =
  /** A turn of an interview: what the witness said or answered (see SaidIn). */
  | "said"
  /** A value of the recording whose basis is the witness's (stated, measured), or a deterministic derivation of one (the weekday of a certain date). */
  | "stated"
  /** What is drawn in the recording, for want of anything the witness said about it: the last resort. */
  | "drawn"

/** One value of what a tool was sent, and what it rests on. */
export interface OrientationCoding {
  /** The tool's own name of the field. */
  field: string
  /** The tool's code; several when the value lies across a boundary of its classes (see OrientationExport.variants); null when not known. */
  codes: (string | null)[]
  origin?: OrientationOrigin
  /** Where it was read: a path of the recording, or the interview and turn. */
  from?: string
  /** The witness's words it was coded from, when there are. */
  said?: string
  /** Why it was left unknown, when it was: an assumed or fitted value, an answer "I don't know", nothing said. */
  why?: string
}

/** What is to be handed to the tool: a file, and what it holds, value by value. */
export interface OrientationExport {
  fileName: string
  mediaType: string
  text: string
  /** Per profile, what was coded and why, for a person to check before sending it. */
  codings: { profile: string, episodes: OrientationEpisode[], values: OrientationCoding[] }[]
}

/** One family of explanation a tool ranks, and its score. A score of compatibility with past cases, never a probability of the cause. */
export interface OrientationRank {
  rank: number
  /** The tool's own code of the family. */
  family: string
  /** What it is called, when the tool says. */
  label?: SaidText
  score: number
}

/** The ranks a tool gave under one of its settings: a corpus, a selection of it. */
export interface OrientationConfiguration {
  /** The setting's id, when the tool has a stable one. */
  id?: string
  /** What it is called. */
  label: SaidText
  /** How many past cases it holds. */
  population?: number
  top: OrientationRank[]
}

/**
 * A statistical profile and the ranks it was given. A profile may gather several episodes (repeats of one phenomenon are statistically one), and an
 * episode may be cut into several profiles: which ones it is, each by the event and the digest of the recording that was coded, is said
 * explicitly, never inferred from a likeness of names.
 */
export interface OrientationProfile {
  id: string
  title?: SaidText
  episodes: OrientationEpisode[]
  configurations: OrientationConfiguration[]
}

/**
 * What a statistical orientation tool gave back, kept as it was given: the version of its engine, the reference its frequencies were read from
 * (its digest and date), when it was computed and, per profile and per setting, its first ranks with their scores.
 *
 * Indicators, shown apart from what a simulation finds and never merged with it: a score says how the description compares with the cases of a
 * corpus, not whether the explanation it ranks is the cause, and a value rare in a corpus is not an impossibility.
 */
export interface OrientationResults {
  /** The `id` of the source that read it (see OrientationProvider). */
  provider: string
  engine: { name: string, version?: string }
  reference?: { sha256?: string, date?: string, note?: SaidText }
  /** When the ranks were computed, as RR0 writes a time. */
  computed?: string
  /** What the tool says its scores are, and are not. */
  caution?: SaidText
  profiles: OrientationProfile[]
}

/**
 * A tool that gives a statistical orientation for the accounts of a case: what it is sent (only what the witness said, or what follows from it
 * without doubt), and what it gives back. Nothing in UFO@home ranks explanations by frequency: a module brings such a tool, at the extension point
 * `orientation`, and the indicators it gives back are shown as such (see OrientationResults).
 */
export interface OrientationProvider {
  /** What the tool is called, as its authors name it. */
  readonly engine: string
  /** The file to hand to the tool for these accounts. */
  exportCase(request: OrientationRequest): OrientationExport | Promise<OrientationExport>
  /** What the tool gave back, read from its file. */
  readResults(text: string): OrientationResults | Promise<OrientationResults>
}

/** Reading results back. */
export class Orientation {

  /**
   * The episodes of `results` that were coded on a recording other than the one now in the case: a result says what it was computed on, and
   * one whose recording changed since is no longer about the account as it stands. An episode coded with no digest cannot be told apart, and
   * is not listed.
   */
  static stale(results: OrientationResults, digests: ReadonlyMap<string, string>): { profile: string, event: string }[] {
    const stale: { profile: string, event: string }[] = []
    for (const profile of results.profiles) {
      for (const episode of profile.episodes) {
        const now = digests.get(episode.event)
        if (episode.digest !== undefined && now !== undefined && now !== episode.digest) stale.push({ profile: profile.id, event: episode.event })
      }
    }
    return stale
  }

  /** The profiles to code for `request`: those it names, else one per account. */
  static profilesTo(request: OrientationRequest): OrientationGrouping[] {
    return request.profiles ?? request.accounts.map(account => ({ id: account.event, episodes: [{ event: account.event, digest: account.digest }] }))
  }

  /** The profiles an episode is in. */
  static profilesOf(results: OrientationResults, event: string): OrientationProfile[] {
    return results.profiles.filter(profile => profile.episodes.some(episode => episode.event === event))
  }
}
