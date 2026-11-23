import { describe, expect, it } from "vitest"
import { ScenarioSweep } from "../../../src/engine/scenario/ScenarioSweep.js"
import { ScenarioReadings } from "../../../src/engine/scenario/ScenarioReadings.js"
import type { WindProfile, WindSource } from "../../../src/engine/scenario/WindProfiles.js"
import type { CaseJson } from "../../../src/engine/persistence/caseJson.js"
import type { SightingRecordingJson } from "../../../src/engine/persistence/sightingJson.js"
import { Provenance } from "../../../src/engine/persistence/Provenance.js"
import { InterpretationKinds } from "../../../src/modules/interpretations/InterpretationKind.js"
import { INTERPRETATION_SOURCES } from "../../../src/modules/interpretations/interpretationSources.js"
import { computeBodyPosition } from "../../../src/engine/astronomy/CelestialPositions.js"
import { visibleMagnitudeLimit } from "../../../src/render3d/skyColors.js"

const kinds = INTERPRETATION_SOURCES.map(source => InterpretationKinds.of(source))
const said = (value: unknown) => ({ value, basis: "stated", rationale: "the witness's sketch" })

/** An account of a light due east, 10° up, for ten seconds, at the place and local time given (two hours ahead of UTC). */
const account = (aim: { azimuthDeg: number, altitudeDeg: number } = { azimuthDeg: 90, altitudeDeg: 10 }, time = "2020-04-15T22:00:00"): SightingRecordingJson => ({
  version: 4,
  id: "2020-04-15-Test",
  time,
  utcOffsetHours: 2,
  place: { name: "Home", locations: [{ lat: 48, lng: 2 }] },
  timeline: {
    keyframes: [0, 5000, 10000].map(t => ({
      t,
      shapes: [{
        sourceId: "light",
        shape: {
          kind: "oval", bounds: { x: 0, y: 0, width: 1, height: 1 }, color: "#fff", angle: 0, transparency: 0, haloScale: 0, selected: false,
          angular: { widthDeg: 0.1, heightDeg: 0.1 }, aim: said(aim)
        }
      }]
    })), order: ["light"], groups: []
  },
  observerTrack: { keyframes: [{ t: 0, pose: { lat: 48, lng: 2, elevationM: 0, headingDeg: 90, pitchDeg: 10, fovDeg: 60 } }] }
} as unknown as SightingRecordingJson)

/** A tuft of gossamer 100 m east, drifting north with a wind of 1 m/s: where the account puts the light, nearly, whatever the wind is light. */
const gossamer: SightingRecordingJson = {
  version: 4,
  id: "2020-04-15-Test-gossamer",
  time: "2020-04-15T22:00:00",
  place: { name: "Home", locations: [{ lat: 48, lng: 2 }] },
  interpretation: {
    title: { en: "Gossamer", fr: "Fils de la Vierge" },
    bodies: [{
      id: "tuft", explains: ["light"], model: { id: "ellipsoid" }, drifting: true,
      track: [0, 10000].map(t => ({ t, eastM: { value: 100, basis: "assumed", rationale: "where it is seen" }, northM: t / 1000, altitudeM: 17.6, sizeM: { widthM: 0.2, lengthM: 0.2, heightM: 0.2 } }))
    }]
  }
} as unknown as SightingRecordingJson

/** The wind is calm at home, and blows north at 40 m/s at the far place. */
const winds: WindSource = {
  profile: async (lat, lng, date): Promise<WindProfile> => ({
    lat, lng, elevationM: 0, hour: date.toISOString().slice(0, 16), credit: "test",
    levels: [{ aboveGroundM: 10, wind: { towardDeg: 0, speedMS: lat > 40 ? 0.2 : 40 } }]
  })
}

const caseOf = (conditions: CaseJson["conditions"], readings = true): CaseJson => ({
  conditions,
  events: [
    { type: "event", eventType: "sighting", id: "w1", url: "account.json" },
    ...(readings ? [{ type: "event" as const, eventType: "sighting", interpretationOf: "w1", by: [{ title: "RR0" }], url: "gossamer.json" }] : [])
  ]
})

const sweeper = (files: Record<string, SightingRecordingJson>) => new ScenarioSweep({
  wind: winds, kinds, load: async url => files[url], limitAt: sun => visibleMagnitudeLimit(sun),
  names: id => ({ Venus: "Vénus" } as Record<string, string>)[id]
})

const far = { id: "far", place: { name: "Far away", locations: [{ lat: 30, lng: 2 }] } }
const twoDays = { from: "2020-04-15T12:00", to: "2020-04-16T23:00" }

describe("A reading played over the scenarios its case leaves open", () => {
  it("is conditional when only some places' winds keep it where the witness saw the light, and says where", async () => {
    const sweep = await sweeper({ "account.json": account(), "gossamer.json": gossamer }).sweep(caseOf({ time: twoDays, places: { candidates: [far] } }), { sky: false })
    const replay = sweep.accounts[0].readings[0]
    expect(replay.depends).toEqual(["wind"])
    expect(replay.asWritten.plausible).toBe(true)
    expect(replay.outcomes.map(o => [o.scenario.id, o.plausible])).toEqual([
      ["own@2020-04-15T22:00", true], ["own@2020-04-16T22:00", true], ["far@2020-04-15T22:00", false], ["far@2020-04-16T22:00", false]
    ])
    expect(replay.verdict).toMatchObject({ robustness: "conditional", asWritten: "plausible", onlyIf: { places: ["own"] }, holds: 2, played: 4 })
    // The telling ones: the best where it holds, the worst where it fails.
    expect(replay.kept.map(s => s.placeId)).toEqual(["own", "far"])
  })

  it("is robust when every scenario gives the same verdict, and says it depends on nothing played when nothing it takes is moved", async () => {
    const still = structuredClone(gossamer) as unknown as { interpretation: { bodies: { drifting?: boolean }[] } }
    delete still.interpretation.bodies[0].drifting
    const sweep = await sweeper({ "account.json": account(), "gossamer.json": still as unknown as SightingRecordingJson })
      .sweep(caseOf({ time: twoDays, places: { candidates: [far] } }), { sky: false })
    const replay = sweep.accounts[0].readings[0]
    expect(replay.depends).toEqual([])
    expect(replay.verdict).toMatchObject({ robustness: "robust-plausible", independent: true })
    expect(replay.kept).toEqual([])
  })

  it("plays nothing it wrote itself under a scenario again", async () => {
    const played = structuredClone(gossamer) as SightingRecordingJson
    played.interpretation!.scenario = { id: "far@2020-04-15T22:00", of: "gossamer.json" }
    const sweep = await sweeper({ "account.json": account(), "gossamer.json": played }).sweep(caseOf({ time: twoDays }), { sky: false })
    expect(sweep.accounts[0].readings).toEqual([])
  })

  it("keeps what it is told to keep", async () => {
    const files = { "account.json": account(), "gossamer.json": gossamer }
    const conditions = { time: twoDays, places: { candidates: [far] } }
    const kept = async (keep: "all" | "none" | "robust" | "conditional") => (await sweeper(files).sweep(caseOf(conditions), { sky: false, keep })).accounts[0].readings[0].kept.length
    expect(await kept("all")).toBe(4)
    expect(await kept("none")).toBe(0)
    expect(await kept("robust")).toBe(0)
    expect(await kept("conditional")).toBe(2)
  })

  it("writes a scenario's reading with its place and time assumed, its wind established given the scenario, and its body moved", async () => {
    const sweep = await sweeper({ "account.json": account(), "gossamer.json": gossamer }).sweep(caseOf({ time: twoDays, places: { candidates: [far] } }), { sky: false, keep: "all" })
    const scenario = sweep.accounts[0].readings[0].kept.find(s => s.id === "far@2020-04-16T22:00")!
    const withSnapshots = { ...structuredClone(gossamer), snapshots: { relief: "x" }, image: "x.jpg" } as unknown as SightingRecordingJson
    const profile = await winds.profile(scenario.lat, scenario.lng, scenario.date)
    const written = ScenarioReadings.recording(withSnapshots, "gossamer.json", scenario, profile, kinds, { title: { en: "Gossamer far away" }, verdict: "conditional" }) as unknown as Record<string, any>
    expect(written.place.basis).toBe("assumed")
    expect(written.place.value.locations).toEqual([{ lat: 30, lng: 2 }])
    expect(written.time).toMatchObject({ value: "2020-04-16T22:00:00", basis: "assumed" })
    expect(written.snapshots).toBeUndefined()
    expect(written.image).toBeUndefined()
    expect(written.interpretation.scenario).toEqual({ id: "far@2020-04-16T22:00", of: "gossamer.json", verdict: "conditional" })
    const track = written.interpretation.bodies[0].track
    // 40 m/s north for ten seconds, its provenance kept.
    expect(track[1].northM).toBeCloseTo(400, 1)
    expect(track[0].eastM.basis).toBe("assumed")
    expect(track[0].eastM.rationale).toMatch(/established given scenario far@2020-04-16T22:00/)
    expect(ScenarioReadings.fileName("gossamer.json", scenario)).toBe("gossamer-scenario-far-20200416-2200.json")
    // And it reads back as a reading under that scenario.
    expect(Provenance.strip(written as SightingRecordingJson).recording.interpretation?.scenario?.id).toBe(scenario.id)
  })

  it("replaces the wind of a kind the air carries, at the heights the kind says", () => {
    const sweep = sweeper({})
    const profile: WindProfile = { lat: 0, lng: 0, elevationM: 0, hour: "", credit: "test", levels: [
      { aboveGroundM: 10, wind: { towardDeg: 90, speedMS: 2 } }, { aboveGroundM: 5000, wind: { towardDeg: 180, speedMS: 10 } }] }
    const moved = sweep.inWind({
      bodies: [],
      flares: [{ aircraft: { t: 0, eastM: 0, northM: 0, altitudeM: 5000, headingDeg: 0, speedMS: 100 }, wind: { towardDeg: 0, speedMS: 0 } }],
      lanterns: [{ site: { eastM: 0, northM: 0 }, releases: [] }]
    } as never, profile)
    expect((moved.flares as { wind: unknown }[])[0].wind).toEqual({ towardDeg: 180, speedMS: 10 })
    const lantern = (moved.lanterns as { wind: { towardDeg: number }, windAloft: { atM: number } }[])[0]
    expect(lantern.wind.towardDeg).toBe(90)
    expect(lantern.windAloft.atM).toBe(1000)
    expect(sweep.dependsOn({ bodies: [], flares: [{}] } as never)).toEqual(["wind"])
    expect(sweep.dependsOn({ bodies: [] })).toEqual([])
  })
})

describe("The candidates of the sky over the scenarios", () => {
  /** Where Venus was from home on the evening of 15 April 2020: bright in the west. */
  const venus = computeBodyPosition("Venus", new Date("2020-04-15T20:00:00Z"), { lat: 48, lng: 2, elevationM: 0 })

  it("finds Venus compatible in every scenario when the light is where Venus was, and Mars incompatible", async () => {
    const sweep = await sweeper({ "account.json": account(venus) }).sweep(caseOf({ time: twoDays }, false))
    const of = (id: string) => sweep.accounts[0].sky.find(replay => replay.candidate === id)!
    expect(of("Venus").verdict.robustness).toBe("robust-plausible")
    expect(of("Venus").label).toBe("Vénus")
    expect(of("Mars").verdict.robustness).toBe("robust-exclusion")
    expect(ScenarioSweep.grouped(sweep.alerts).find(alert => alert.candidate === "Venus")).toMatchObject({ robustness: "robust-plausible", accounts: ["w1"] })
  })

  it("finds Venus compatible only at the places where it was up then", async () => {
    // At the same local time on the other side of the world, Venus has set.
    const antipodes = { id: "antipodes", place: { name: "Antipodes", locations: [{ lat: -48, lng: -178 }] } }
    const sweep = await sweeper({ "account.json": account(venus) }).sweep(caseOf({ time: twoDays, places: { candidates: [antipodes] } }, false))
    const replay = sweep.accounts[0].sky.find(r => r.candidate === "Venus")!
    expect(replay.verdict).toMatchObject({ robustness: "conditional", asWritten: "plausible", onlyIf: { places: ["own"] } })
  })

  it("says why the sky was not searched for an account that gives no direction", async () => {
    const none = account()
    ;(none as unknown as { timeline: { keyframes: unknown[] } }).timeline.keyframes = []
    const sweep = await sweeper({ "account.json": none }).sweep(caseOf({ time: twoDays }, false))
    expect(sweep.accounts[0].skyNote).toBe("no-direction")
  })
})

describe("The verdict over the scenarios", () => {
  const scenario = (placeId: string, local: string) => ({ id: `${placeId}@${local}`, placeId, lat: 0, lng: 0, local, date: new Date(0), own: false, ownPlace: placeId === "own" })

  it("says a conditional verdict holds on some dates whatever the place, when that is what the scenarios show", () => {
    const outcomes = [["own", "2020-04-15T22:00", true], ["own", "2020-04-16T22:00", false], ["far", "2020-04-15T22:00", true], ["far", "2020-04-16T22:00", false]] as const
    const verdict = ScenarioSweep.verdict("excluded", outcomes.map(([p, l, plausible]) => ({ scenario: scenario(p, l), plausible })))
    expect(verdict).toMatchObject({ robustness: "conditional", asWritten: "excluded", onlyIf: { dates: ["2020-04-15"] } })
  })

  it("lists the scenarios when neither the places nor the dates say it", () => {
    const outcomes = [["own", "2020-04-15T22:00", true], ["own", "2020-04-16T22:00", false], ["far", "2020-04-15T22:00", false], ["far", "2020-04-16T22:00", false]] as const
    const verdict = ScenarioSweep.verdict("plausible", outcomes.map(([p, l, plausible]) => ({ scenario: scenario(p, l), plausible })))
    expect(verdict.onlyIf).toEqual({ scenarios: ["own@2020-04-15T22:00"] })
  })
})
