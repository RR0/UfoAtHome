/**
 * A case, as RR0 writes it: the `case.json` of a dossier.
 *
 * Only what UFO@home reads is declared. A case holds far more (its classification, its place, an
 * image, sources) and is RR0's to define; those fields pass through here unread. What matters here
 * is its EVENTS: a case is a chronology — the sightings, then the analyses, the articles and films,
 * the confessions — and the testimonies a reconstruction replays are its events of type `sighting`,
 * each pointing at one witness's recording.
 */
export interface CaseJson {
  /** The case's identifier. On rr0.org it is the dossier's directory name and may be left out; a
   * case file standing alone states it. No recording carries it: a case names its testimonies, a
   * testimony does not name its case (see Sighting.id). */
  id?: string
  title?: string
  /** When it happened, as RR0 writes a time ("1948-07-24 02:45", "1954"). */
  time?: string
  events?: CaseEventJson[]
}

/** One event of a case. A `sighting` points at a witness's recording by `url`. */
export interface CaseEventJson {
  type?: "event"
  eventType: string
  url?: string
  time?: string
  title?: string
}

/** Reading a case file for what UFO@home replays of it. */
export class CaseFile {

  static readonly SIGHTING_EVENT = "sighting"

  /**
   * Whether a fetched JSON is a case rather than one witness's recording: an object with events,
   * and no timeline (which every recording has, and a case never does).
   */
  static isCase(json: unknown): json is CaseJson {
    return typeof json === "object" && json !== null && !Array.isArray(json)
      && Array.isArray((json as CaseJson).events) && !("timeline" in json)
  }

  /**
   * The addresses of the recordings a case holds, in the order its events list them, read relative
   * to the case file's own address: a case lists the recordings beside it, so "witness-chiles.json"
   * means the file next to it wherever the case is served from. An absolute address is untouched.
   */
  static sightingUrls(json: CaseJson, caseUrl: string): string[] {
    return (json.events ?? [])
      .filter(event => event.eventType === CaseFile.SIGHTING_EVENT && typeof event.url === "string" && event.url !== "")
      .map(event => new URL(event.url!, caseUrl).href)
  }
}
