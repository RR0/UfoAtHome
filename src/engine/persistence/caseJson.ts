import type { AgentRef, InterpretationEventJson, InterpretationJson } from "../interpretation/Interpretation.js"
import type { InterviewMedium } from "./interviewJson.js"
import { Provenance } from "./Provenance.js"
import type { SaidText } from "../model/SaidText.js"

/**
 * A case, as RR0 writes it: the `case.json` of a dossier.
 *
 * Only what UFO@home reads is declared. A case holds far more (its classification, its place, an
 * image, sources) and is RR0's to define; those fields pass through here unread. What matters here
 * is its EVENTS: a case is a chronology — the sightings, then the analyses, the articles and films,
 * the confessions — and the accounts a reconstruction replays are its events of type `sighting`,
 * each pointing at one observer's recording.
 */
export interface CaseJson {
  /** The case's identifier. On rr0.org it is the dossier's directory name and may be left out; a
   * case file standing alone states it. No recording carries it: a case names its accounts, a
   * account does not name its case (see Sighting.id). */
  id?: string
  title?: string
  /** What a link to this case says of it where it is shared as a card (see the Player's share card): a sentence or
   * two, translatable. Absent, the card says the date and what can be replayed, which is all a case file states. */
  summary?: SaidText
  /** A picture standing for the case where it is only linked to — see SightingEvent.image. */
  image?: string
  /** When it happened, as RR0 writes a time ("1948-07-24 02:45", "1954"). */
  time?: string
  events?: CaseEventJson[]
}

/** One event of a case. A `sighting` points at a observer's recording by `url`; an
 * `interpretation` names the recording it interprets by its `id` (see InterpretationEventJson). */
export interface CaseEventJson {
  type?: "event"
  /**
   * What kind of event it is. A case may have kinds of its own: those UFO@home reads are `sighting` (an observer's account, or a reading of
   * one), and `interview` (see CaseFile.INTERVIEW_EVENT).
   *
   * @suggest sighting, interview, interpretation, article, image, book
   */
  eventType: string
  /**
   * What a reading names an account by (`interpretationOf`), local to the case: it has to be unique among the case's events
   * and nowhere else, so that a reference can be read in the file that writes it. Only an event that is referred to needs one.
   * A reference that no event of the case bears is read as the `id` of a recording the case lists (the older form).
   */
  id?: string
  url?: string
  time?: string
  /** Where it happened, as RR0 names a place. */
  place?: string
  /** Who did it: who held an interview, who made a reading. */
  by?: AgentRef[]
  /** An interview's: what it was held through (see InterviewMedium). */
  medium?: InterviewMedium
  title?: unknown
  /** An interpretation's, in the older form: the `id` of the recording it interprets. */
  sighting?: string
  /** An interpretation's: the `id`, or the ids, of the sightings this one is a reading of. Set on an
   * event of type `sighting` whose recording is a reading and not an observer's account. */
  interpretationOf?: string | string[]
  /** An interview's: the `id`, or the ids, of the sighting events of the witnesses it was held with (see CaseFile.INTERVIEW_EVENT). */
  interviewOf?: string | string[]
  /** What an event says of itself where its title is not enough: an interview's, what it established. Translatable. */
  summary?: SaidText
}

/** Reading a case file for what UFO@home replays of it. */
export class CaseFile {

  static readonly SIGHTING_EVENT = "sighting"
  static readonly INTERPRETATION_EVENT = "interpretation"
  /**
   * An interview about the case, held with the witness of one of its sightings: the first event of a case that is neither a
   * sighting nor a reading of one. It points at the sighting by `interviewOf`, as a reading does by `interpretationOf`, and says
   * what it established in its `summary`. UFO@home replays nothing of it: a recording is only a sighting's.
   */
  static readonly INTERVIEW_EVENT = "interview"

  /**
   * Whether a fetched JSON is a case rather than one observer's recording: an object with events,
   * and no timeline (which every recording has, and a case never does).
   */
  static isCase(json: unknown): json is CaseJson {
    return typeof json === "object" && json !== null && !Array.isArray(json)
      && Array.isArray((json as CaseJson).events) && !("timeline" in json)
  }

  /**
   * The addresses of the recordings a case holds, in the order its events list them, read relative
   * to the case file's own address: a case lists the recordings beside it, so "observer-chiles.json"
   * means the file next to it wherever the case is served from. An absolute address is untouched.
   */
  static sightingUrls(json: CaseJson, caseUrl: string): string[] {
    return (json.events ?? [])
      // An event that is a reading of a sighting has a recording too, which is not an observer's.
      .filter(event => event.eventType === CaseFile.SIGHTING_EVENT && !event.interpretationOf && typeof event.url === "string" && event.url !== "")
      .map(event => new URL(event.url!, caseUrl).href)
  }

  /**
   * The ids one recording of a case goes by: its event's own `id` in the case, and the `id` its recording states (the older
   * form of a reference). Whichever is absent is left out.
   *
   * @param recordingUrl The address the recording was read from, resolved, to tell which event lists it.
   */
  static accountIds(json: CaseJson, caseUrl: string, recordingUrl: string | undefined, recordingId: string | undefined): string[] {
    const ids = (json.events ?? [])
      .filter(event => event.eventType === CaseFile.SIGHTING_EVENT && event.id !== undefined && typeof event.url === "string"
        && recordingUrl !== undefined && new URL(event.url, caseUrl).href === recordingUrl)
      .map(event => event.id!)
    if (recordingId !== undefined) ids.push(recordingId)
    return ids
  }

  /** The interpretations of one recording, in the order the case lists them: its events of type
   * `sighting` that name it in `interpretationOf` (by any of its ids, see accountIds), and (the older form) its events of type
   * `interpretation` naming it in `sighting`. A recording with no id is named by none. */
  static interpretationEvents(json: CaseJson, sightingIds: string | string[] | undefined): InterpretationEventJson[] {
    const ids = [sightingIds].flat().filter((id): id is string => !!id)
    if (ids.length === 0) return []
    return (json.events ?? [])
      .filter(event => {
        if (event.eventType === CaseFile.INTERPRETATION_EVENT) return event.sighting !== undefined && ids.includes(event.sighting)
        if (event.eventType !== CaseFile.SIGHTING_EVENT || event.interpretationOf === undefined) return false
        return [event.interpretationOf].flat().some(id => ids.includes(id))
      })
      .map(event => event as unknown as InterpretationEventJson)
  }

  /**
   * What a case says wrongly about its own references: the ids more than one event bears, and the `interpretationOf` that name
   * nothing: neither an event's `id` nor, among `recordingIds` (those of the recordings read so far), a recording's.
   */
  static problems(json: CaseJson, recordingIds: string[]): { duplicateIds: string[], unresolved: { reading: string, reference: string }[] } {
    const events = json.events ?? []
    const seen = new Set<string>()
    const duplicateIds = new Set<string>()
    for (const event of events) {
      if (event.id === undefined) continue
      if (seen.has(event.id)) duplicateIds.add(event.id)
      seen.add(event.id)
    }
    const unresolved: { reading: string, reference: string }[] = []
    for (const event of events) {
      const references = event.eventType === CaseFile.SIGHTING_EVENT ? event.interpretationOf
        : event.eventType === CaseFile.INTERVIEW_EVENT ? event.interviewOf : undefined
      if (references === undefined) continue
      for (const reference of [references].flat()) {
        if (!seen.has(reference) && !recordingIds.includes(reference)) unresolved.push({ reading: event.url ?? event.id ?? "", reference })
      }
    }
    return { duplicateIds: [...duplicateIds], unresolved }
  }

  /**
   * What an interpretation claims. Its event's title is what the case calls it.
   *
   * Newer form: the recording at the event's `url`, read relative to the case file's own address as
   * a sighting's is, whose `interpretation` holds the bodies. Older form: the bodies stated in the
   * event itself, or in a file at `url` that holds them directly.
   */
  static async interpretationOf(event: InterpretationEventJson, caseUrl: string, fetchJson: (url: string) => Promise<unknown>): Promise<InterpretationJson> {
    // Any value may be written with its provenance beside it, as in a recording (see Provenance);
    // what the scene reads is the bare value.
    if (event.bodies) {
      return CaseFile.withModelsFrom(Provenance.strip({ title: event.title, bodies: event.bodies ?? [], smoke: event.smoke }).recording, caseUrl)
    }
    if (!event.url) return { title: event.title, bodies: [] }
    const fileUrl = new URL(event.url, caseUrl).href
    const file = await fetchJson(fileUrl) as InterpretationJson & { interpretation?: InterpretationJson }
    // A recording keeps its bodies in its own `interpretation`; an older file is the interpretation.
    const stated = "timeline" in file && file.interpretation ? file.interpretation : file
    return CaseFile.withModelsFrom(Provenance.strip({ title: event.title ?? stated.title, bodies: stated.bodies ?? [], smoke: stated.smoke }).recording, fileUrl)
  }

  /** An interpretation with its bodies' model addresses made absolute against the file that states
   * them: the case, or the interpretation's own file. The scene resolves the rest against the
   * recording's address, which is not where these were written. */
  private static withModelsFrom(interpretation: InterpretationJson, fileUrl: string): InterpretationJson {
    return {
      ...interpretation,
      bodies: interpretation.bodies.map(body => body.model?.url
        ? { ...body, model: { ...body.model, url: new URL(body.model.url, fileUrl).href } }
        : body)
    }
  }
}
