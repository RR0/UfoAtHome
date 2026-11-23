import type { SightingRecordingJson } from "../persistence/sightingJson.js"
import { Provenance } from "../persistence/Provenance.js"
import type { InterpretationJson } from "../interpretation/Interpretation.js"
import { InterpretationKinds, type InterpretationKind, type KindWind } from "../../modules/interpretations/InterpretationKind.js"
import type { Robustness } from "./ScenarioSweep.js"
import { ScenarioSweep } from "./ScenarioSweep.js"
import type { Scenario } from "./UncertainConditions.js"
import { Winds, type WindProfile } from "./WindProfiles.js"

type Json = Record<string, unknown>

/**
 * A reading written again as it was played under one scenario (see ScenarioSweep): what the sweep keeps of the scenarios it played, as a
 * reading of the case that can be opened and watched like any other.
 *
 * It is the reading itself, its provenance kept, with what the scenario changes: its place and time when they moved (assumed, with the
 * candidate they were taken from), each wind it states replaced by the one archived there and then (established, given the scenario only),
 * each drifting body moved with that wind. A reading moved to another place leaves behind what was copied from its account's place
 * (`snapshots`) and its picture: the scene fetches the other place's own.
 */
export class ScenarioReadings {

  /** The file a scenario's reading is written to, beside the reading it was played from. */
  static fileName(readingUrl: string, scenario: Scenario): string {
    const stem = readingUrl.replace(/\.json$/, "")
    const place = scenario.placeId.replace(/[^A-Za-z0-9-]+/g, "-")
    const when = scenario.local.replace(/[-:]/g, "").replace("T", "-")
    return `${stem}-scenario-${place}-${when}.json`
  }

  /**
   * @param readingJson The reading as its file has it, provenance and all.
   * @param readingUrl Its address as the case lists it.
   * @param title What the reading under the scenario is called.
   * @param placeRationale Why its place was a candidate, when it moved.
   */
  static recording(readingJson: SightingRecordingJson, readingUrl: string, scenario: Scenario, profile: WindProfile | undefined,
                   kinds: readonly InterpretationKind[], options: { title?: unknown, placeRationale?: string, timeRationale?: string, verdict?: Robustness } = {}): SightingRecordingJson {
    const raw = structuredClone(readingJson) as unknown as Json
    const plain = Provenance.strip(readingJson).recording
    const interpretation = raw.interpretation as Json | undefined
    if (!interpretation || !plain.interpretation) throw new Error(`${readingUrl} states no interpretation`)
    raw.id = `${plain.id ?? readingUrl.replace(/\.json$/, "")}-scenario-${scenario.id}`
    if (!scenario.ownPlace) {
      raw.place = {
        value: { ...(scenario.placeName ? { name: scenario.placeName } : {}), locations: [{ lat: scenario.lat, lng: scenario.lng }] },
        basis: "assumed",
        rationale: `one of the candidate places of the case, played as scenario ${scenario.id}${options.placeRationale ? `: ${options.placeRationale}` : ""}`
      }
      delete raw.snapshots
    }
    const ownLocal = plain.time ? plain.time.replace(/[~?%]$/, "").slice(0, 16) : undefined
    if (scenario.local !== ownLocal) {
      raw.time = { value: `${scenario.local}:00`, basis: "assumed", rationale: `one of the candidate instants of the case, played as scenario ${scenario.id}${options.timeRationale ? `: ${options.timeRationale}` : ""}` }
    }
    delete raw.image
    if (profile) ScenarioReadings.rewind(interpretation, plain.interpretation, profile, scenario, kinds)
    interpretation.scenario = { id: scenario.id, of: readingUrl, ...(options.verdict ? { verdict: options.verdict } : {}) }
    if (options.title !== undefined) interpretation.title = options.title
    return raw as unknown as SightingRecordingJson
  }

  /** Each wind of `raw` (the interpretation as its file has it) replaced by the profile's, and each drifting body moved with it. */
  private static rewind(raw: Json, plain: InterpretationJson, profile: WindProfile, scenario: Scenario, kinds: readonly InterpretationKind[]): void {
    const wind: KindWind = { at: height => Winds.at(profile, height), levels: profile.levels.map(level => level.aboveGroundM) }
    const rationale = (what: string) => `${what} archived at ${profile.hour} UTC at this place (${profile.credit}, grid point ${profile.lat.toFixed(3)}, ${profile.lng.toFixed(3)}): established given scenario ${scenario.id} only`
    for (const kind of kinds) {
      const items = InterpretationKinds.itemsOf(plain, kind.key)
      if (!kind.inWind || items.length === 0) continue
      const rawItems = raw[kind.key] as Json[]
      items.forEach((item, i) => {
        const moved = kind.inWind!(item, wind) as Json
        for (const key of Object.keys(moved)) {
          if (JSON.stringify(moved[key]) === JSON.stringify((item as Json)[key])) continue
          rawItems[i][key] = key === "wind" ? { value: moved[key], basis: "established", rationale: rationale("the wind at the ground") } : moved[key]
        }
      })
    }
    const ground = Winds.at(profile, 10)
    const bodies = raw.bodies as Json[]
    plain.bodies.forEach((body, i) => {
      if (!body.drifting) return
      const moved = ScenarioSweep.drifted(body, ground)
      const rawTrack = (bodies[i] as { track?: Json[] }).track
      if (!rawTrack || !moved.track) return
      moved.track.forEach((key, k) => {
        for (const axis of ["eastM", "northM"] as const) {
          const value = key[axis]
          if (value === undefined) continue
          const rounded = Math.round(value * 100) / 100
          const at = rawTrack[k][axis]
          rawTrack[k][axis] = typeof at === "object" && at !== null && "value" in at
            ? { ...(at as Json), value: rounded, ...(k === 0 ? { rationale: rationale(`drifting with the wind at the ground, ${Winds.rounded(ground).speedMS} m/s towards ${Winds.rounded(ground).towardDeg}°,`) } : {}) }
            : rounded
        }
      })
    })
  }
}
