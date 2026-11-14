import type { ReadingCheck } from "../interpretation/ReadingCheck.js"
import { ReadingSensitivity, type ReadingComparison, type ReadingSensitivityResult } from "../interpretation/ReadingSensitivity.js"
import type { AgentRef, BodyJson, FindingGround, FindingOutcome } from "../interpretation/Interpretation.js"
import type { SaidTexts } from "../model/SaidText.js"
import { Provenance, type Basis, type ValueSource } from "../persistence/Provenance.js"
import type { CaseEventJson, CaseJson } from "../persistence/caseJson.js"
import type { SightingRecordingJson } from "../persistence/sightingJson.js"
import { WitnessError } from "../witness/WitnessError.js"
import { BodyPlacement, type BodyState } from "../interpretation/BodyPlacement.js"
import { fromSightingJson } from "../persistence/sightingJson.js"
import { geoToLocalMeters } from "../../render3d/terrain/GeoProjection.js"

/** A value of a recording with what it rests on: a row of a report's traceability table. */
export interface ReportValue {
  /** Where it is in the recording, dotted (see Provenance). */
  path: string
  value: unknown
  basis: Basis
  rationale?: string
  source?: ValueSource
}

/** A direction or a size the witness gave of a phenomenon at an instant, and how far it may be off. */
export interface ReportIndication {
  t: number
  sourceId: string
  /** What the account calls that phenomenon. */
  phenomenon?: string
  aim?: { azimuthDeg: number, altitudeDeg: number }
  angular?: { widthDeg?: number, heightDeg?: number }
  /** Whether the direction, and the size, are traced to the witness (see ReadingSensitivity.traced): only those are compared. */
  directionSaid: boolean
  sizeSaid: boolean
  /** How far the true direction may be from the one said, by the witness error laws: azimuth and altitude, least and greatest. */
  uncertainty?: { azimuthDeg: [number, number], altitudeDeg: [number, number] }
  basis?: Basis
  rationale?: string
  source?: ValueSource
}

/** Where an account can be read as it was given (see RecordingSource): what a report lists so that a reader can go and look. */
export interface ReportSource {
  title?: string
  authors?: string[]
  publisher?: string
  time?: string
  url?: string
  /** Where in it: pages, a section. */
  index?: string
}

/** A moment the account names (see Milestone): a letter or a few words, and what happened then. */
export interface ReportMoment {
  t: number
  label: string
  note?: string
}

/** A point of the map a report draws, metres east and north of the first witness, where the case was seen from. */
export interface ReportPoint {
  eastM: number
  northM: number
}

/** A witness's account, as the report sets it out. */
export interface ReportWitness {
  id?: string
  title: string
  url: string
  time?: string
  /** The witness's account in their words, or as the recording tells it. */
  description?: string
  place?: string
  /** How long it lasted, seconds. */
  durationSeconds?: number
  /** What it was seen through: the eye, a camera, binoculars. */
  instrument?: string
  sources: ReportSource[]
  moments: ReportMoment[]
  /** Where the witness stood, on the map of the report: absent when the recording does not say. */
  at?: ReportPoint
  /** Where they stood on the Earth, for the map to put the witnesses together. */
  lat?: number
  lng?: number
  indications: ReportIndication[]
  /** What the account calls each of its phenomena, by its id. */
  phenomena?: Record<string, string>
  /** Every value of the account that says what it rests on. */
  values: ReportValue[]
}

/** One of a reading's findings, its words in the reader's language. */
export interface ReportFinding {
  text: string
  outcome: FindingOutcome
  against?: FindingGround
  /** Whether its author wrote it, or it came of setting the reading against the account by itself (see ReadingCheck). */
  written: boolean
}

/** A reading of a witness's account, as the report sets it out. */
export interface ReportReading {
  id?: string
  title: string
  url: string
  /** The witness whose account it reads, by their title in the report. */
  reads: string
  by: string[]
  time?: string
  /** What it supposed or fitted, in its interpretation: the values a likeness owes to. */
  supposed: ReportValue[]
  findings: ReportFinding[]
  /** Its sensitivity (see ReadingSensitivity), absent when it places no body. */
  sensitivity?: ReadingSensitivityResult
  comparisons: ReadingComparison[]
  /** What the reading says of itself, when its recording says it. */
  description?: string
  /** Where each of its bodies goes, on the map of the report (see ReportPoint): one line per body that explains something. */
  paths: { bodyId: string, points: (ReportPoint & { t: number })[] }[]
}

/** An interview of the case. */
export interface ReportInterview {
  title: string
  witness?: string
  time?: string
  by: string[]
  medium?: string
}

/** Everything a report says, worked out once and written out as HTML, JSON or CSV (see CaseReportHtml, CaseReportJson, CaseReportCsv). */
export interface CaseReportData {
  /** When it was worked out, ISO 8601: a report is true of the case as it was then. */
  generatedAt: string
  case: { id?: string, title?: string, time?: string, url?: string, summary?: string }
  witnesses: ReportWitness[]
  readings: ReportReading[]
  interviews: ReportInterview[]
}

/**
 * Works out what a report on a case says: each witness's indications and what they rest on, each reading's suppositions, findings and
 * sensitivity, and how each compares with what was said.
 *
 * Asked for by the GEIPAN (A. Cousyn, November 2026): an export of the parameters, the computed gaps, the intermediate conclusions and the
 * figures, usable in a report. This is the content, worked out from the case and its recordings as they are; how it is written out is the
 * writers' (HTML for a report and its PDF, JSON for the data, CSV for a spreadsheet). Nothing here is drawn or worded but the titles the
 * case gives and the findings' sentences, which are in the reader's language.
 */
export class CaseReport {

  /**
   * @param recordings The case's recordings, by their absolute address. One missing leaves out what needed it, and is not an error: a
   *   report on what could be read.
   * @param check What sets a reading against its account, in the reader's language (see ReadingCheck).
   */
  static of(caseJson: CaseJson, caseUrl: string, recordings: ReadonlyMap<string, SightingRecordingJson>, said: SaidTexts, check?: ReadingCheck,
            now = new Date()): CaseReportData {
    const events = caseJson.events ?? []
    const urlOf = (event: CaseEventJson) => event.url ? new URL(event.url, caseUrl).href : undefined
    const sightings = events.filter(event => event.eventType === "sighting" && urlOf(event))
    const accounts = sightings.filter(event => event.interpretationOf === undefined)
    const witnesses = accounts.map(event => CaseReport.witnessOf(event, urlOf(event)!, recordings.get(urlOf(event)!), said))
    const accountOf = (event: CaseEventJson) => {
      const ids = [event.interpretationOf].flat().filter((id): id is string => typeof id === "string")
      return accounts.find(other => other.id !== undefined && ids.includes(other.id))
        ?? accounts.find(other => ids.includes(recordings.get(urlOf(other)!)?.id ?? ""))
    }
    const readings = sightings.filter(event => event.interpretationOf !== undefined).map(event => {
      const account = accountOf(event)
      const witness = account ? witnesses[accounts.indexOf(account)] : undefined
      return CaseReport.readingOf(event, urlOf(event)!, recordings.get(urlOf(event)!), witness, account ? recordings.get(urlOf(account)!) : undefined, said, check)
    })
    const interviews = events.filter(event => event.eventType === "interview").map(event => {
      const witness = accounts.find(account => account.id !== undefined && [event.interviewOf].flat().includes(account.id))
      return {
        title: said.read(event.title as never) ?? event.id ?? "",
        ...(witness ? { witness: witnesses[accounts.indexOf(witness)].title } : {}),
        ...(event.time ? { time: event.time } : {}),
        by: CaseReport.names(event.by, said),
        ...(event.medium ? { medium: event.medium } : {})
      }
    })
    CaseReport.placeOnMap(witnesses, readings)
    const summary = said.read(caseJson.summary as never)
    return {
      generatedAt: now.toISOString(),
      case: { ...(caseJson.id ? { id: caseJson.id } : {}), ...(caseJson.title ? { title: caseJson.title } : {}), ...(caseJson.time ? { time: caseJson.time } : {}), url: caseUrl,
        ...(summary ? { summary } : {}) },
      witnesses, readings, interviews
    }
  }

  private static witnessOf(event: CaseEventJson, url: string, json: SightingRecordingJson | undefined, said: SaidTexts): ReportWitness {
    const title = said.read(event.title as never) ?? said.read(json?.observer?.title as never) ?? event.id ?? url
    const witness: ReportWitness = { ...(event.id ? { id: event.id } : {}), title, url, ...(event.time ? { time: event.time } : {}), indications: [], values: [], sources: [], moments: [] }
    if (!json) return witness
    const { recording, provenance } = Provenance.strip(json)
    const description = said.read(recording.description as never)
    if (description) witness.description = description
    const place = (recording.place as { name?: string } | undefined)?.name
    if (place) witness.place = place
    if (!witness.time && recording.time) witness.time = recording.time
    if (typeof recording.durationSeconds === "number") witness.durationSeconds = recording.durationSeconds
    if (recording.instrument) witness.instrument = recording.instrument
    witness.sources = (recording.sources ?? []).map(source => {
      const s = source as { title?: unknown, authors?: string[], url?: string, index?: string, publication?: { publisher?: string, time?: string } }
      const sourceTitle = said.read(s.title as never)
      return {
        ...(sourceTitle ? { title: sourceTitle } : {}), ...(s.authors?.length ? { authors: s.authors } : {}),
        ...(s.publication?.publisher ? { publisher: s.publication.publisher } : {}), ...(s.publication?.time ? { time: s.publication.time } : {}),
        ...(s.url ? { url: s.url } : {}), ...(s.index ? { index: s.index } : {})
      }
    })
    witness.moments = [...(recording.milestones ?? [])].sort((a, b) => a.t - b.t).map(milestone => {
      const note = said.read(milestone.note as never)
      return { t: milestone.t, label: said.read(milestone.label as never) ?? "", ...(note ? { note } : {}) }
    })
    const start = recording.observerTrack?.keyframes?.[0]?.pose as { lat?: number, lng?: number } | undefined
    const location = recording.place?.locations?.[0] as { lat?: number, lng?: number } | undefined
    const lat = start?.lat ?? location?.lat, lng = start?.lng ?? location?.lng
    if (typeof lat === "number" && typeof lng === "number") Object.assign(witness, { lat, lng })
    witness.values = CaseReport.valuesOf(provenance, recording, () => true)
    const model = WitnessError.MODELS[0]
    const conditions = (recording as { account?: { conditions?: never } }).account?.conditions
    // What each phenomenon is called, from wherever the account names it: a title is stated once, not at every instant.
    const titles = new Map<string, string>()
    for (const key of recording.timeline?.keyframes ?? []) for (const state of key.shapes) {
      const named = said.read((state.shape as { title?: unknown }).title as never)
      if (named && !titles.has(state.sourceId)) titles.set(state.sourceId, named)
    }
    witness.phenomena = Object.fromEntries(titles)
    ;(recording.timeline?.keyframes ?? []).forEach((key, k) => key.shapes.forEach((state, n) => {
      const at = `timeline.keyframes.${k}.shapes.${n}.shape`
      const directionSaid = ReadingSensitivity.traced(provenance, `${at}.aim`)
      const sizeSaid = ReadingSensitivity.traced(provenance, `${at}.angular`)
      if (!directionSaid && !sizeSaid) return
      const shape = state.shape as { aim?: { azimuthDeg: number, altitudeDeg: number }, angular?: { widthDeg?: number, heightDeg?: number }, title?: unknown }
      const entry = provenance.at(`${at}.aim`) ?? provenance.at(`${at}.angular`)
      const indication: ReportIndication = {
        t: key.t, sourceId: state.sourceId, directionSaid, sizeSaid,
        ...(titles.has(state.sourceId) ? { phenomenon: titles.get(state.sourceId) } : {}),
        ...(shape.aim ? { aim: { azimuthDeg: shape.aim.azimuthDeg, altitudeDeg: shape.aim.altitudeDeg } } : {}),
        ...(shape.angular ? { angular: shape.angular } : {}),
        ...(entry ? { basis: entry.basis } : {}),
        ...(entry?.rationale ? { rationale: entry.rationale } : {}),
        ...(entry?.source ? { source: entry.source } : {})
      }
      if (directionSaid && shape.aim) {
        const lawOf = (kind: "heading" | "elevation", value: number, axis: string) => {
          const of = provenance.at(`${at}.aim.${axis}`) ?? provenance.at(`${at}.aim`)
          const law = model.law({ kind, value, basis: of?.basis, how: of?.how }, conditions)
          return [law.low ?? value, law.high ?? value] as [number, number]
        }
        indication.uncertainty = {
          azimuthDeg: lawOf("heading", shape.aim.azimuthDeg, "azimuthDeg"),
          altitudeDeg: lawOf("elevation", shape.aim.altitudeDeg, "altitudeDeg")
        }
      }
      witness.indications.push(indication)
    }))
    return witness
  }

  private static readingOf(event: CaseEventJson, url: string, json: SightingRecordingJson | undefined, witness: ReportWitness | undefined,
                           accountJson: SightingRecordingJson | undefined, said: SaidTexts, check?: ReadingCheck): ReportReading {
    const reading: ReportReading = {
      ...(event.id ? { id: event.id } : {}),
      title: said.read(event.title as never) ?? said.read(json?.interpretation?.title as never) ?? url,
      url, reads: witness?.title ?? "", by: CaseReport.names(event.by, said), ...(event.time ? { time: event.time } : {}),
      supposed: [], findings: [], comparisons: [], paths: []
    }
    if (!json) return reading
    const { recording, provenance } = Provenance.strip(json)
    const description = said.read(recording.description as never) ?? said.read(recording.summary as never)
    if (description) reading.description = description
    reading.supposed = CaseReport.valuesOf(provenance, recording, (path, basis) => path.startsWith("interpretation") && (basis === "assumed" || basis === "fitted"))
    const words = (text: unknown) => typeof text === "string" ? text : said.read(text as never) ?? ""
    reading.findings = (recording.interpretation?.findings ?? []).map(finding => ({
      text: words(finding.text), outcome: finding.outcome, ...(finding.against ? { against: finding.against } : {}), written: true
    }))
    if (!accountJson) return reading
    if (check) {
      reading.findings.push(...check.findingsOf(accountJson, json).map(finding => ({
        text: words(finding.text), outcome: finding.outcome, ...(finding.against ? { against: finding.against } : {}), written: false
      })))
    }
    const bodies = recording.interpretation?.bodies ?? []
    if (bodies.length > 0) {
      try {
        const sensitivity = ReadingSensitivity.forAccount(accountJson)
        reading.sensitivity = sensitivity.of(bodies, provenance)
        reading.comparisons = sensitivity.comparisons(bodies)
        reading.paths = CaseReport.pathsOf(bodies, accountJson, reading.comparisons.map(comparison => comparison.t))
      } catch {
        // An account this version cannot read: the reading is reported without what it would have been compared with.
      }
    }
    return reading
  }

  /**
   * Where each body that explains something goes, metres east and north of where the witness stood at the start: at each of its track's
   * keyframes and each instant it is compared at, on flat ground (see ReadingSensitivity).
   */
  private static pathsOf(bodies: readonly BodyJson[], accountJson: SightingRecordingJson, instants: readonly number[]): ReportReading["paths"] {
    const account = fromSightingJson(accountJson)
    const flat = { heightAt: () => 0 }
    const eyeAt = (t: number) => BodyPlacement.eyeOf(account, t, flat)
    return bodies.filter(body => (body.explains?.length ?? 0) > 0).map(body => {
      const placement = new BodyPlacement(body, flat, eyeAt)
      const times = [...new Set([...body.track.map(key => key.t), ...instants])].sort((a, b) => a - b)
      const points = times.map(t => ({ t, state: placement.at(t) })).filter((point): point is { t: number, state: BodyState } => point.state !== undefined)
        .map(({ t, state }) => ({ t, eastM: state.eastM, northM: state.northM }))
      return { bodyId: body.id, points }
    }).filter(path => path.points.length > 0)
  }

  /** Puts every witness and every reading's paths on one map: metres east and north of the first witness who says where they stood. */
  private static placeOnMap(witnesses: ReportWitness[], readings: ReportReading[]): void {
    const origin = witnesses.find(witness => witness.lat !== undefined && witness.lng !== undefined)
    if (!origin) return
    for (const witness of witnesses) {
      if (witness.lat === undefined || witness.lng === undefined) continue
      const local = geoToLocalMeters(witness.lat, witness.lng, origin.lat!, origin.lng!)
      witness.at = { eastM: local.x, northM: -local.z }
    }
    for (const reading of readings) {
      const at = witnesses.find(witness => witness.title === reading.reads)?.at
      if (!at) {
        reading.paths = []
        continue
      }
      for (const path of reading.paths) for (const point of path.points) {
        point.eastM += at.eastM
        point.northM += at.northM
      }
    }
  }

  /** The values `provenance` knows that `keep` keeps, with their value as the recording holds it. */
  private static valuesOf(provenance: Provenance, recording: unknown, keep: (path: string, basis: Basis) => boolean): ReportValue[] {
    return provenance.paths().flatMap(path => {
      const entry = provenance.at(path)!
      if (!keep(path, entry.basis)) return []
      return [{
        path, value: path.split(".").reduce<unknown>((at, step) => (at as Record<string, unknown> | undefined)?.[step], recording), basis: entry.basis,
        ...(entry.rationale ? { rationale: entry.rationale } : {}), ...(entry.source ? { source: entry.source } : {})
      }]
    })
  }

  /** Who did it, as a reader would name them: a person's RR0 id ("CousynAntoine") spelled first names first, an organisation's spelled out. */
  static names(by: AgentRef[] | undefined, said: SaidTexts): string[] {
    const spelled = (id: string) => id.replace(/([a-z])([A-Z])/g, "$1 $2")
    return (by ?? []).map(agent => {
      if ("people" in agent) {
        const [last, ...first] = spelled(agent.people).split(" ")
        return [...first, last].join(" ")
      }
      if ("org" in agent) return spelled(agent.org)
      const described = agent as { title?: unknown, id?: string }
      return said.read(described.title as never) ?? described.id ?? ""
    }).filter(name => name !== "")
  }
}
