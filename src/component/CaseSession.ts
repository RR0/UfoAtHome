import type { CaseEventJson, CaseJson } from "../engine/persistence/caseJson.js"
import { CaseFile } from "../engine/persistence/caseJson.js"
import type { SightingRecordingJson } from "../engine/persistence/sightingJson.js"
import type { AgentRef } from "../engine/interpretation/Interpretation.js"
import type { SaidText } from "../engine/model/SaidText.js"

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

  constructor(readonly json: CaseJson, readonly url: string) {
    this.tracks = (json.events ?? [])
      .filter(event => event.eventType === CaseFile.SIGHTING_EVENT && typeof event.url === "string" && event.url !== "")
      .map(event => ({
        event,
        url: new URL(event.url!, url).href,
        kind: event.interpretationOf === undefined ? "observer" : "reading"
      }))
  }

  /** The account a reading reads: the first recording it names that the case lists. */
  accountOf(track: CaseTrack): CaseTrack | undefined {
    if (track.kind !== "reading") return undefined
    const ids = [track.event.interpretationOf].flat()
    return this.tracks.find(other => other.kind === "observer" && other.recording?.id !== undefined && ids.includes(other.recording.id))
      ?? this.tracks.find(other => other.kind === "observer")
  }

  /** Remembers what a track's recording is now, as loaded or as edited. */
  keep(track: CaseTrack, recording: SightingRecordingJson, fresh = false): void {
    track.recording = recording
    if (fresh) track.loaded = JSON.stringify(recording)
    // What a reading is called is what its own interpretation says: the case's event follows it.
    if (track.kind === "reading" && recording.interpretation?.title !== undefined) track.event.title = recording.interpretation.title
  }

  /** Whether a track has to be written: added here, or changed since it was loaded. */
  changed(track: CaseTrack): boolean {
    return track.recording !== undefined && (track.loaded === undefined || JSON.stringify(track.recording) !== track.loaded)
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
      interpretationOf: base.id ?? stem,
      time: when,
      ...(by !== undefined && by.length > 0 ? { by } : {}),
      ...(title !== undefined ? { title } : {}),
      url: directory + file
    }
    this.json.events = [...(this.json.events ?? []), event]
    const track: CaseTrack = { event, url: new URL(event.url!, this.url).href, kind: "reading", recording }
    this.tracks.push(track)
    return track
  }

  /** The ids a reading may name an account by: its recording's own, once loaded. */
  private idsOf(account: CaseTrack): string[] {
    return account.recording?.id !== undefined ? [account.recording.id] : []
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
      ...(reads ? { interpretationOf: reads.account.recording?.id ?? id } : {}),
      ...(when !== undefined ? { time: when } : {}),
      ...(reads?.by && reads.by.length > 0 ? { by: reads.by } : {}),
      ...(title !== undefined ? { title } : {}),
      url: directory + file
    }
    this.json.events = [...(this.json.events ?? []), event]
    const track: CaseTrack = { event, url: new URL(event.url!, this.url).href, kind: reads ? "reading" : "observer", recording: stated }
    this.tracks.push(track)
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
    return { deleted: true }
  }

  /** Removes a reading from the case. An account is not removed: a case is its sightings. */
  deleteReading(track: CaseTrack): boolean {
    if (track.kind !== "reading") return false
    const index = this.tracks.indexOf(track)
    if (index < 0) return false
    this.tracks.splice(index, 1)
    this.json.events = (this.json.events ?? []).filter(event => event !== track.event)
    return true
  }

  /** What has to be written: the case, and (unless asked not to) every recording added or changed. Paths are relative to the case. */
  files(withRecordings = true): { path: string, content: string }[] {
    const directory = this.url.replace(/[^/]*$/, "")
    const relative = (url: string): string => url.startsWith(directory) ? url.slice(directory.length) : url
    const written = this.tracks.filter(track => withRecordings && this.changed(track))
      .map(track => ({ path: relative(track.url), content: JSON.stringify(track.recording, null, 2) + "\n" }))
    const name = decodeURIComponent(this.url.replace(/[?#].*$/, "").replace(/^.*\//, "")) || "case.json"
    return [{ path: name, content: JSON.stringify(this.json, null, 2) + "\n" }, ...written]
  }
}
