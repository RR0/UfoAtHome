import type { InterpretationEventJson, InterpretationJson } from "../interpretation/Interpretation.js"
import { Provenance } from "./Provenance.js"

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
  /** When it happened, as RR0 writes a time ("1948-07-24 02:45", "1954"). */
  time?: string
  events?: CaseEventJson[]
}

/** One event of a case. A `sighting` points at a observer's recording by `url`; an
 * `interpretation` names the recording it interprets by its `id` (see InterpretationEventJson). */
export interface CaseEventJson {
  type?: "event"
  eventType: string
  url?: string
  time?: string
  title?: unknown
  /** An interpretation's: the `id` of the recording it interprets. */
  sighting?: string
}

/** Reading a case file for what UFO@home replays of it. */
export class CaseFile {

  static readonly SIGHTING_EVENT = "sighting"
  static readonly INTERPRETATION_EVENT = "interpretation"

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
      .filter(event => event.eventType === CaseFile.SIGHTING_EVENT && typeof event.url === "string" && event.url !== "")
      .map(event => new URL(event.url!, caseUrl).href)
  }

  /** The analysts' interpretations of one recording, in the order the case lists them: its events
   * of type `interpretation` naming that recording's `id`. A recording with no id is named by
   * none. */
  static interpretationEvents(json: CaseJson, sightingId: string | undefined): InterpretationEventJson[] {
    if (!sightingId) return []
    return (json.events ?? [])
      .filter(event => event.eventType === CaseFile.INTERPRETATION_EVENT && event.sighting === sightingId)
      .map(event => event as unknown as InterpretationEventJson)
  }

  /**
   * What an interpretation event claims: its bodies where it states them itself, or the file at its
   * `url`, read relative to the case file's own address as a sighting's is. Its title is the
   * event's, which is what the case calls it.
   */
  static async interpretationOf(event: InterpretationEventJson, caseUrl: string, fetchJson: (url: string) => Promise<unknown>): Promise<InterpretationJson> {
    // Any value may be written with its provenance beside it, as in a recording (see Provenance);
    // what the scene reads is the bare value.
    if (event.bodies) {
      return CaseFile.withModelsFrom(Provenance.strip({ title: event.title, bodies: event.bodies, smoke: event.smoke }).recording, caseUrl)
    }
    if (!event.url) return { title: event.title, bodies: [] }
    const fileUrl = new URL(event.url, caseUrl).href
    const file = await fetchJson(fileUrl) as InterpretationJson
    return CaseFile.withModelsFrom(Provenance.strip({ title: event.title ?? file.title, bodies: file.bodies ?? [], smoke: file.smoke }).recording, fileUrl)
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
