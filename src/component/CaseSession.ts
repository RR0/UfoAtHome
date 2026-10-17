import type { CaseEventJson, CaseJson } from "../engine/persistence/caseJson.js"
import { CaseFile } from "../engine/persistence/caseJson.js"
import type { SightingRecordingJson } from "../engine/persistence/sightingJson.js"
import type { AgentRef } from "../engine/interpretation/Interpretation.js"
import type { SaidText } from "../engine/model/SaidText.js"
import type { InterviewMedium } from "../engine/persistence/interviewJson.js"

/** One recording a case lists: an observer's account, or a reading of one. */
export interface CaseTrack {
  /** The event of the case that lists it — the one place its title, its date and its author live. */
  event: CaseEventJson & { by?: AgentRef[] }
  /** Where the recording is, absolute. */
  url: string
  kind: "observer" | "reading"
  /** The recording as loaded or as edited since, once it has been fetched. */
  recording?: SightingRecordingJson
  /** The recording as it was when loaded, to tell what was changed. Absent for one added here. */
  loaded?: string
  /**
   * What the recording's relative addresses (a model, a picture) are relative to, when that is not `url`: a recording
   * that was open before a case was made around it still stands where it came from.
   */
  base?: { url: string | undefined }
}

/**
 * A case being edited: the recordings it lists, the ones fetched so far and what was changed in them.
 *
 * The case is what the editor opens when it is given a `case.json`, since a reading of a sighting is
 * another observation (see InterpretationEventJson) and the case is where they are all listed. Each
 * track is a recording the editor edits as any other; this keeps them between visits, adds a reading
 * (a recording of its own, with the place, the time and the pose of the account it reads), deletes
 * one, and says what has to be written back.
 */
export class CaseSession {
  readonly tracks: CaseTrack[]
  /** Whether the case itself was changed since it was opened or exported: a recording added or deleted, a field edited. */
  private caseChanged = false
  /**
   * The transcripts of interviews the author edited or loaded, as the text of their file, by the event that lists them. `loaded` is the text last
   * written by an export: a transcript is written once it differs from it, as a recording is once it differs from what was loaded.
   */
  private readonly transcripts = new Map<CaseEventJson, { text: string, loaded?: string }>()

  constructor(public json: CaseJson, readonly url: string) {
    this.tracks = (json.events ?? [])
      .filter(event => event.eventType === CaseFile.SIGHTING_EVENT && typeof event.url === "string" && event.url !== "")
      .map(event => ({
        event,
        url: new URL(event.url!, url).href,
        kind: event.interpretationOf === undefined ? "observer" : "reading"
      }))
  }

  /**
   * A case made around a recording that is already open: one event of type `sighting` listing it, at a file of its own
   * beside a `case.json` that does not exist yet. The recording is kept as it stands — it is the editor's, edited — and
   * counts as added, so that the case and it are what an export writes.
   *
   * @param from Where the recording came from, if it came from an address: what its relative addresses stay relative to.
   */
  static around(recording: SightingRecordingJson, time: string | undefined, title: SaidText | undefined, from: string | undefined, here: string): CaseSession {
    const stem = (recording.observer?.id ?? recording.id ?? "observation").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "observation"
    const json: CaseJson = {
      id: recording.id ?? "case",
      ...(time !== undefined ? { time } : {}),
      events: [{
        type: "event",
        eventType: CaseFile.SIGHTING_EVENT,
        ...(time !== undefined ? { time } : {}),
        ...(title !== undefined ? { title } : {}),
        url: `observer-${stem}.json`
      }]
    }
    const session = new CaseSession(json, new URL("case.json", here).href)
    const track = session.tracks[0]
    track.recording = recording
    track.base = { url: from }
    track.event.id = session.proposedId(track)
    session.caseChanged = true
    return session
  }

  /**
   * The account a reading reads: the first observer's track it names, by the `id` of its event in the case or (the older form) by the `id`
   * its recording states. None when it names nothing the case lists: that is a fault of the case (see problems), not a reason to read
   * some other account.
   */
  accountOf(track: CaseTrack): CaseTrack | undefined {
    if (track.kind !== "reading") return undefined
    const references = [track.event.interpretationOf].flat()
    const observers = this.tracks.filter(other => other.kind === "observer")
    return observers.find(other => other.event.id !== undefined && references.includes(other.event.id))
      ?? observers.find(other => other.recording?.id !== undefined && references.includes(other.recording.id))
  }

  /**
   * The interviews the case holds: its events of type `interview`, which are not recordings and so are not tracks. They are read from the
   * case each time, since the element that edits one writes into its event in place.
   */
  get interviews(): (CaseEventJson & { by?: AgentRef[] })[] {
    return (this.json.events ?? []).filter(event => event.eventType === CaseFile.INTERVIEW_EVENT)
  }

  /** The observer's track an interview was held with: the first the event names by its id, else by the id its recording states. */
  intervieweeOf(interview: CaseEventJson): CaseTrack | undefined {
    const references = [interview.interviewOf].flat().filter((id): id is string => typeof id === "string")
    const observers = this.tracks.filter(track => track.kind === "observer")
    return observers.find(track => track.event.id !== undefined && references.includes(track.event.id))
      ?? observers.find(track => track.recording?.id !== undefined && references.includes(track.recording.id))
  }

  /**
   * Adds an interview to the case: an event of type `interview`, held with an observer's account (`interviewOf`, which gives that account the id it
   * lacks), at a time, by whom, with a title. It has no transcript yet: its `url` is for whoever has one to write.
   */
  addInterview(witness: CaseTrack | undefined, when: string, title?: SaidText, by?: AgentRef[], medium?: InterviewMedium): CaseEventJson & { by?: AgentRef[] } {
    const taken = this.eventIds()
    const stem = witness ? (witness.event.id ?? this.proposedId(witness)) : "case"
    let n = 1
    while (taken.has(`interview-${stem}-${n}`)) n++
    const event: CaseEventJson & { by?: AgentRef[] } = {
      type: "event",
      eventType: CaseFile.INTERVIEW_EVENT,
      id: `interview-${stem}-${n}`,
      ...(witness ? { interviewOf: this.ensureId(witness) } : {}),
      time: when,
      ...(medium !== undefined ? { medium } : {}),
      ...(by !== undefined && by.length > 0 ? { by } : {}),
      ...(title !== undefined ? { title } : {})
    }
    this.json.events = [...(this.json.events ?? []), event]
    this.caseChanged = true
    return event
  }

  /** The transcript of an interview as edited or loaded since the case was opened; undefined when it was not, and the file at its address is the transcript. */
  transcriptText(interview: CaseEventJson): string | undefined {
    return this.transcripts.get(interview)?.text
  }

  /** Keeps the transcript of an interview as the author has it now: to be shown again, and written with the case. */
  keepTranscript(interview: CaseEventJson, text: string): void {
    this.transcripts.set(interview, { text, loaded: this.transcripts.get(interview)?.loaded })
  }

  private transcriptChanged(entry: { text: string, loaded?: string }): boolean {
    return entry.loaded !== entry.text
  }

  /** Removes an interview from the case. Nothing refers to one, so none is refused. */
  deleteInterview(interview: CaseEventJson): boolean {
    if (!this.interviews.includes(interview)) return false
    this.json.events = (this.json.events ?? []).filter(event => event !== interview)
    this.transcripts.delete(interview)
    this.caseChanged = true
    return true
  }

  /** Remembers what a track's recording is now, as loaded or as edited. */
  keep(track: CaseTrack, recording: SightingRecordingJson, fresh = false): void {
    track.recording = recording
    if (fresh) track.loaded = JSON.stringify(recording)
    // What a reading is called is what its own interpretation says: the case's event follows it.
    if (track.kind === "reading" && recording.interpretation?.title !== undefined) track.event.title = recording.interpretation.title
  }

  /**
   * Puts in the case the text of its file as the author edited it: the events are those of `next`, the tracks follow them. A recording the
   * case still lists by the same address keeps what was loaded or edited of it, and its event is the new one; one it no longer lists is
   * dropped from the tracks, one it newly lists is a track not loaded yet. The recordings themselves are not touched.
   */
  replaceJson(next: CaseJson): void {
    const wanted = (next.events ?? []).filter(event => event.eventType === CaseFile.SIGHTING_EVENT && typeof event.url === "string" && event.url !== "")
    const tracks: CaseTrack[] = wanted.map(event => {
      const url = new URL(event.url!, this.url).href
      const kind = event.interpretationOf === undefined ? "observer" : "reading"
      const existing = this.tracks.find(track => track.url === url)
      if (!existing) return { event, url, kind }
      existing.event = event
      existing.kind = kind
      return existing
    })
    this.tracks.splice(0, this.tracks.length, ...tracks)
    // The transcripts follow the interviews of the new text: by their id, else by the address they are written at.
    const moved = new Map<CaseEventJson, { text: string, loaded?: string }>()
    for (const [old, entry] of this.transcripts) {
      const same = (next.events ?? []).find(event => event.eventType === CaseFile.INTERVIEW_EVENT
        && ((old.id !== undefined && event.id === old.id) || (old.url !== undefined && event.url === old.url)))
      if (same) moved.set(same, entry)
    }
    this.transcripts.clear()
    for (const [event, entry] of moved) this.transcripts.set(event, entry)
    this.json = next
    this.caseChanged = true
  }

  /** Says the case itself was edited — a field of it, which the session cannot see being written. */
  touch(): void {
    this.caseChanged = true
  }

  /** Whether anything would be lost by leaving: the case was changed, or a recording of it added or edited, and not exported. */
  get dirty(): boolean {
    return this.caseChanged || this.tracks.some(track => this.changed(track)) || [...this.transcripts.values()].some(entry => this.transcriptChanged(entry))
  }

  /**
   * Says what an export wrote: the case, and, when `withRecordings`, the recordings that were added or changed — which are then
   * what they were exported as. A recording not exported is still changed, and leaving would still lose it.
   */
  markExported(withRecordings: boolean): void {
    this.caseChanged = false
    if (!withRecordings) return
    for (const track of this.tracks) if (track.recording) track.loaded = JSON.stringify(track.recording)
    for (const entry of this.transcripts.values()) entry.loaded = entry.text
  }

  /** Whether a track has to be written: added here, or changed since it was loaded. */
  changed(track: CaseTrack): boolean {
    return track.recording !== undefined && (track.loaded === undefined || JSON.stringify(track.recording) !== track.loaded)
  }

  /** What an event's id may be: letters, digits, hyphens and underscores, starting with a letter or a digit, so that it can be read anywhere. */
  static readonly ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]*$/

  private eventIds(except?: CaseTrack): Set<string> {
    return new Set((this.json.events ?? []).filter(event => event !== except?.event).map(event => event.id).filter((id): id is string => id !== undefined))
  }

  /**
   * The id an event of the case would be given: the observer's family name as a slug (`trent`), else the title as the case words it, else
   * `sighting-1`, `sighting-2`; suffixed (`trent-2`) when the case already has it.
   */
  proposedId(track: CaseTrack): string {
    const slug = (text: string | undefined): string => (text ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
    const title = typeof track.event.title === "string" ? track.event.title : undefined
    const base = slug(track.recording?.observer?.lastName) || slug(track.recording?.observer?.id) || slug(title)
    const taken = this.eventIds(track)
    if (base !== "") {
      let id = base
      for (let n = 2; taken.has(id); n++) id = `${base}-${n}`
      return id
    }
    let n = 1
    while (taken.has(`sighting-${n}`)) n++
    return `sighting-${n}`
  }

  /** The id of an event, given the proposed one when it has none: what a reading that names it needs the case to say. */
  ensureId(track: CaseTrack): string {
    if (track.event.id === undefined) {
      track.event.id = this.proposedId(track)
      this.caseChanged = true
    }
    return track.event.id
  }

  /**
   * Gives an event the id typed for it. Refused when empty while a reading names it, when it is not a plain id, or when another event of
   * the case has it. A reading that named the event by its old id, or by the id its recording states, now names it by the new one.
   */
  setId(track: CaseTrack, id: string): "ok" | "empty" | "invalid" | "taken" {
    const previous = track.event.id
    const named = (reference: string): boolean => reference === previous || reference === track.recording?.id
    const readers = (this.json.events ?? []).filter(event => event.eventType === CaseFile.SIGHTING_EVENT && event.interpretationOf !== undefined
      && [event.interpretationOf].flat().some(reference => reference !== undefined && named(reference)))
    // The interviews held with this observer name it as a reading does.
    const interviewers = this.interviews.filter(event => [event.interviewOf].flat().some(reference => reference !== undefined && named(reference)))
    if (id === "") {
      if (previous === undefined) return "ok"
      if (readers.length > 0 || interviewers.length > 0) return "empty"
      delete track.event.id
      this.caseChanged = true
      return "ok"
    }
    if (!CaseSession.ID_PATTERN.test(id)) return "invalid"
    if (this.eventIds(track).has(id)) return "taken"
    if (id === previous) return "ok"
    for (const reader of readers) {
      const references = [reader.interpretationOf!].flat().map(reference => named(reference) ? id : reference)
      reader.interpretationOf = Array.isArray(reader.interpretationOf) ? references : references[0]
    }
    for (const interviewer of interviewers) {
      const references = [interviewer.interviewOf!].flat().map(reference => reference !== undefined && named(reference) ? id : reference)
      interviewer.interviewOf = Array.isArray(interviewer.interviewOf) ? references : references[0]
    }
    track.event.id = id
    this.caseChanged = true
    return "ok"
  }

  /** What the case gets wrong about its own references (see CaseFile.problems), over the recordings loaded so far. */
  problems(): ReturnType<typeof CaseFile.problems> {
    return CaseFile.problems(this.json, this.tracks.map(track => track.recording?.id).filter((id): id is string => id !== undefined))
  }

  /**
   * Adds a reading of an account: an event of type `sighting` marked `interpretationOf`, and a recording
   * of its own that shares the account's whole scene (place, time, pose, instrument, weather, decor, pictures)
   * and holds no body yet.
   */
  addReading(account: CaseTrack, when: string, title?: SaidText, by?: AgentRef[]): CaseTrack {
    const base = account.recording
    if (!base) throw new Error("A reading is added to an account that has been loaded")
    const stem = account.event.url!.replace(/^.*\//, "").replace(/^observer-/, "").replace(/\.json$/, "")
    const files = new Set(this.tracks.map(track => track.event.url))
    const ids = new Set(this.tracks.map(track => track.recording?.id))
    // After the readings the case already has, and past any file or id that is taken.
    let number = this.tracks.filter(track => track.kind === "reading").length + 1
    while (files.has(`interpretation-${stem}-${number}.json`) || ids.has(`${base.id ?? stem}-interpretation-${number}`)) number++
    const file = `interpretation-${stem}-${number}.json`
    const directory = account.event.url!.includes("/") ? account.event.url!.replace(/[^/]*$/, "") : ""
    // The scene the account is in, whole: its place, time, pose, instrument, weather, decor, pictures.
    // A reading edited without them shows bodies over bare ground, and a reading is a recording of its own.
    const { id: _id, version: _version, observer: _observer, account: _account, description: _description, sources: _sources,
      tags: _tags, timeline: _timeline, milestones: _milestones, interpretation: _interpretation, ...scene } = structuredClone(base)
    void [_id, _version, _observer, _account, _description, _sources, _tags, _timeline, _milestones, _interpretation]
    const recording = {
      version: 1,
      id: `${base.id ?? stem}-interpretation-${number}`,
      ...scene,
      tags: ["interpretation"],
      timeline: { keyframes: [], order: [], groups: [] },
      interpretation: { ...(title !== undefined ? { title } : {}), bodies: [] }
    } as SightingRecordingJson
    const event: CaseTrack["event"] = {
      type: "event",
      eventType: "sighting",
      interpretationOf: this.ensureId(account),
      time: when,
      ...(by !== undefined && by.length > 0 ? { by } : {}),
      ...(title !== undefined ? { title } : {}),
      url: directory + file
    }
    this.json.events = [...(this.json.events ?? []), event]
    this.caseChanged = true
    const track: CaseTrack = { event, url: new URL(event.url!, this.url).href, kind: "reading", recording }
    this.tracks.push(track)
    return track
  }

  /** The ids a reading may name an account by: its event's own, and its recording's once loaded (the older form). */
  private idsOf(account: CaseTrack): string[] {
    return [account.event.id, account.recording?.id].filter((id): id is string => id !== undefined)
  }

  /** The readings that interpret an account. */
  readingsOf(account: CaseTrack): CaseTrack[] {
    const ids = this.idsOf(account)
    return this.tracks.filter(track => track.kind === "reading" && [track.event.interpretationOf].flat().some(id => id !== undefined && ids.includes(id)))
  }

  /**
   * Adds an observer's account to the case — a recording of its own and an event of type `sighting`
   * listing it, as the case's others are. Its file and its id are made unique among the case's.
   */
  addObservation(recording: SightingRecordingJson, when?: string, title?: SaidText, reads?: { account: CaseTrack, by?: AgentRef[] }): CaseTrack {
    const names = new Set(this.tracks.map(track => track.event.url))
    const ids = new Set(this.tracks.map(track => track.recording?.id))
    const slug = (recording.id ?? "observation").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "observation"
    const prefix = reads ? "interpretation" : "observer"
    let file = `${prefix}-${slug}.json`
    let id = recording.id ?? slug
    for (let n = 2; names.has(file) || ids.has(id); n++) {
      file = `${prefix}-${slug}-${n}.json`
      id = `${recording.id ?? slug}-${n}`
    }
    const stated = { ...recording, id }
    const directory = this.tracks[0]?.event.url?.includes("/") ? this.tracks[0].event.url.replace(/[^/]*$/, "") : ""
    const event: CaseTrack["event"] = {
      type: "event",
      eventType: "sighting",
      ...(reads ? { interpretationOf: this.ensureId(reads.account) } : {}),
      ...(when !== undefined ? { time: when } : {}),
      ...(reads?.by && reads.by.length > 0 ? { by: reads.by } : {}),
      ...(title !== undefined ? { title } : {}),
      url: directory + file
    }
    this.json.events = [...(this.json.events ?? []), event]
    this.caseChanged = true
    const track: CaseTrack = { event, url: new URL(event.url!, this.url).href, kind: reads ? "reading" : "observer", recording: stated }
    this.tracks.push(track)
    if (!reads) event.id = this.proposedId(track)
    return track
  }

  /**
   * Removes an observer's account from the case — unless a reading still interprets it, which would
   * be left reading nothing. Says how many do, so that they can be deleted first.
   */
  deleteObservation(track: CaseTrack): { deleted: true } | { deleted: false, readings: number } {
    if (track.kind !== "observer") return { deleted: false, readings: 0 }
    const readings = this.readingsOf(track).length
    if (readings > 0) return { deleted: false, readings }
    const index = this.tracks.indexOf(track)
    if (index < 0) return { deleted: false, readings: 0 }
    this.tracks.splice(index, 1)
    this.json.events = (this.json.events ?? []).filter(event => event !== track.event)
    this.caseChanged = true
    return { deleted: true }
  }

  /** Removes a reading from the case. An account is not removed: a case is its sightings. */
  deleteReading(track: CaseTrack): boolean {
    if (track.kind !== "reading") return false
    const index = this.tracks.indexOf(track)
    if (index < 0) return false
    this.tracks.splice(index, 1)
    this.json.events = (this.json.events ?? []).filter(event => event !== track.event)
    this.caseChanged = true
    return true
  }

  /** What has to be written: the case, and (unless asked not to) every recording added or changed. Paths are relative to the case. */
  files(withRecordings = true, every = false): { path: string, content: string }[] {
    const directory = this.url.replace(/[^/]*$/, "")
    const relative = (url: string): string => url.startsWith(directory) ? url.slice(directory.length) : url
    // Every recording the case lists once asked for, or just the ones added or changed: the others are already where the case is.
    const written = this.tracks.filter(track => withRecordings && track.recording !== undefined && (every || this.changed(track)))
      .map(track => ({ path: relative(track.url), content: JSON.stringify(track.recording, null, 2) + "\n" }))
    const name = decodeURIComponent(this.url.replace(/[?#].*$/, "").replace(/^.*\//, "")) || "case.json"
    // The transcripts of the interviews, at the address each is listed at.
    const transcribed = [...this.transcripts].filter(([event, entry]) => withRecordings && event.url !== undefined && (every || this.transcriptChanged(entry)))
      .map(([event, entry]) => ({ path: relative(new URL(event.url!, this.url).href), content: entry.text }))
    return [{ path: name, content: JSON.stringify(this.json, null, 2) + "\n" }, ...written, ...transcribed]
  }
}
