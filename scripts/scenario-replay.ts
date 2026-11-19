/**
 * A reading replayed over the scenarios its case leaves open (see docs/uncertain-conditions.md): the same reading, with what it takes from
 * the place and the date (here the wind) replaced by what each candidate place and date gives, set against the account each time.
 *
 *   node --import tsx scripts/scenario-replay.ts western/scenarios/scenarios.json
 *
 * The readings and accounts are read from public/demo-data (DIR=… for another directory). The scenarios file says the candidate
 * conditions, the wind each gives, and which readings to replay against which account.
 */
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { ReadingSensitivity, type ReadingComparison } from "../src/engine/interpretation/ReadingSensitivity.js"
import { Provenance } from "../src/engine/persistence/Provenance.js"
import { fromSightingJson } from "../src/engine/persistence/sightingJson.js"
import { DecoyFlare } from "../src/modules/interpretations/flares/DecoyFlare.js"
import { SkyLantern } from "../src/modules/interpretations/lanterns/SkyLantern.js"
import type { BodyJson, InterpretationJson } from "../src/engine/interpretation/Interpretation.js"

/** A wind as the readings write it: where it blows towards, and how fast. */
interface Wind { towardDeg: number, speedMS: number }

/** The wind of one scenario, at the heights the archive gives (metres above sea level), lowest first. */
interface ScenarioWind { levels: { altitudeM: number, wind: Wind }[] }

interface Scenario { id: string, place: string, time: string, wind: ScenarioWind }

interface Replay {
  /** The reading to replay; none for a reading the case does not hold yet, that `lanterns` builds for each scenario. */
  reading?: string
  account: string
  /** Which of the case's scenarios apply: those of the same moment of the night, at each candidate place. */
  scenarios: string[]
  /** Whether the reading's bodies drift with the ground wind, their tracks written with the drift of one wind (see drifted). */
  drifts?: boolean
  /** A sky-lantern reading built for each scenario, at its best (see lanternReading): lanterns seen first where the account first has the
   * phenomena they claim to be, at each of `distancesM` along that line of sight, the distance that keeps them nearest kept. */
  lanterns?: { explains: string[], azimuthDeg: number, altitudeDeg: number, releasesT: number[], distancesM: number[], burnedS: number }
}

interface ScenariosFile { scenarios: Scenario[], replays: Replay[] }

const file = process.argv[2]
/** Where the readings and accounts are: the case's directory, public/demo-data unless DIR says otherwise. */
const dir = process.env.DIR ?? "public/demo-data"
const spec: ScenariosFile = JSON.parse(readFileSync(file, "utf8"))
const byId = new Map(spec.scenarios.map(s => [s.id, s]))

/** The wind at `altitudeM` above sea level, interpolated between the archive's levels (as written, to compare vectors). */
function windAt(wind: ScenarioWind, altitudeM: number): Wind {
  const levels = wind.levels
  if (altitudeM <= levels[0].altitudeM) return levels[0].wind
  for (let i = 1; i < levels.length; i++) {
    const lo = levels[i - 1], hi = levels[i]
    if (altitudeM <= hi.altitudeM) {
      const f = (altitudeM - lo.altitudeM) / (hi.altitudeM - lo.altitudeM)
      const [ax, ay] = vector(lo.wind), [bx, by] = vector(hi.wind)
      return fromVector(ax + f * (bx - ax), ay + f * (by - ay))
    }
  }
  return levels[levels.length - 1].wind
}

function vector(w: Wind): [number, number] {
  const r = w.towardDeg * Math.PI / 180
  return [w.speedMS * Math.sin(r), w.speedMS * Math.cos(r)]
}

function fromVector(east: number, north: number): Wind {
  return { towardDeg: (Math.atan2(east, north) * 180 / Math.PI + 360) % 360, speedMS: Math.hypot(east, north) }
}

/** The reading's interpretation with each wind it states replaced by the scenario's at the height it applies at. */
function withWind(interpretation: InterpretationJson, wind: ScenarioWind, drifts: boolean): InterpretationJson {
  const flares = interpretation.flares?.map(salvo => {
    const altitude = (salvo.aircraft.originElevationM ?? 0) + salvo.aircraft.altitudeM
    return salvo.wind ? { ...salvo, wind: windAt(wind, altitude) } : salvo
  })
  const lanterns = interpretation.lanterns?.map(launch => {
    const ground = (launch.site.originElevationM ?? 0) + (launch.site.altitudeM ?? 0)
    return {
      ...launch,
      wind: windAt(wind, ground + 10),
      ...(launch.windAloft ? { windAloft: { ...windAt(wind, ground + launch.windAloft.atM), atM: launch.windAloft.atM } } : {})
    }
  })
  const bodies = drifts ? interpretation.bodies.map(body => drifted(body, wind.levels[0].wind)) : interpretation.bodies
  return { ...interpretation, bodies, ...(flares ? { flares } : {}), ...(lanterns ? { lanterns } : {}) }
}

/**
 * A body whose track was written drifting with one wind, moved to drift with `wind` instead: the drift it was written with is taken from
 * its track's first and last keyframes (what a body carried by the air does over the whole of it), and each keyframe is shifted by the
 * difference over the time since the first. Its height, attitude and look are kept: only where the air takes it changes.
 */
function drifted(body: BodyJson, wind: Wind): BodyJson {
  const track = body.track
  if (!track || track.length < 2) return body
  const first = track[0], last = track[track.length - 1]
  const spanS = (last.t - first.t) / 1000
  if (spanS <= 0 || first.eastM === undefined || last.eastM === undefined || first.northM === undefined || last.northM === undefined) return body
  const [we, wn] = vector(wind)
  const de = we - (last.eastM - first.eastM) / spanS, dn = wn - (last.northM - first.northM) / spanS
  return {
    ...body,
    track: track.map(key => key.eastM === undefined || key.northM === undefined ? key
      : { ...key, eastM: key.eastM + de * (key.t - first.t) / 1000, northM: key.northM + dn * (key.t - first.t) / 1000 })
  }
}

/**
 * Sky lanterns already aloft when the account first has its phenomena: one per phenomenon, each where the witness first saw it, `distanceM`
 * away along that line of sight, carried from then on by the scenario's wind (laminar: no gust scatters them off a common course, which is
 * their best chance to look like orbs moving together in a straight line).
 */
function lanternReading(spec: NonNullable<Replay["lanterns"]>, wind: ScenarioWind, distanceM: number): InterpretationJson {
  const ground = wind.levels[0].altitudeM - 10
  const az = spec.azimuthDeg * Math.PI / 180, alt = spec.altitudeDeg * Math.PI / 180
  const horizontal = distanceM * Math.cos(alt), height = distanceM * Math.sin(alt)
  return {
    bodies: [],
    lanterns: [{
      id: "lanterns",
      site: { eastM: horizontal * Math.sin(az), northM: horizontal * Math.cos(az), altitudeM: height, originElevationM: ground },
      releases: spec.releasesT.map((t, i) => ({ t, explains: [spec.explains[i]], altitudeM: height, burnedS: spec.burnedS })),
      wind: windAt(wind, ground + 10),
      windAloft: { ...windAt(wind, ground + 1000), atM: 1000 },
      turbulence: { horizontalMS: 0, verticalMS: 0, timescaleS: 10 }
    }]
  } as InterpretationJson
}

function expanded(interpretation: InterpretationJson): BodyJson[] {
  return SkyLantern.expand(DecoyFlare.expand(interpretation))!.bodies
}

function summary(comparisons: ReadingComparison[]): string {
  const said = comparisons.filter(c => c.separationDeg !== undefined)
  const agree = comparisons.filter(c => c.agrees).length
  const seps = said.map(c => c.separationDeg!).sort((a, b) => a - b)
  const median = seps.length ? seps[Math.floor(seps.length / 2)] : undefined
  const worst = seps.length ? seps[seps.length - 1] : undefined
  return `agrees ${agree}/${comparisons.length}, median ${median?.toFixed(1)}°, worst ${worst?.toFixed(1)}°`
}

for (const replay of spec.replays) {
  const accountJson = JSON.parse(readFileSync(join(dir, replay.account), "utf8"))
  // Two judges: against what the witness is on record as having said (as the GEIPAN would have it), and against everything the timeline
  // draws, every half second, which shows how a body strays between the instants anything was said.
  const said = ReadingSensitivity.forAccount(accountJson)
  const account = fromSightingJson(accountJson)
  const lastT = Math.max(...Provenance.strip(accountJson).recording.timeline.keyframes.map((k: { t: number }) => k.t))
  const drawn = new ReadingSensitivity(account, Array.from({ length: Math.floor(lastT / 500) + 1 }, (_, i) => i * 500))
  const line = (bodies: BodyJson[]) => `said: ${summary(said.comparisons(bodies))} | drawn: ${summary(drawn.comparisons(bodies))}`
  const median = (bodies: BodyJson[]) => {
    const seps = drawn.comparisons(bodies).filter(c => c.separationDeg !== undefined).map(c => c.separationDeg!).sort((a, b) => a - b)
    return seps.length ? seps[Math.floor(seps.length / 2)] : Infinity
  }
  if (replay.lanterns) {
    const spec = replay.lanterns
    console.log(`\nsky lanterns for ${replay.account}`)
    for (const id of replay.scenarios) {
      const scenario = byId.get(id)!
      const tried = spec.distancesM.map(d => ({ d, bodies: expanded(lanternReading(spec, scenario.wind, d)) }))
      const best = tried.reduce((a, b) => median(b.bodies) < median(a.bodies) ? b : a)
      const w = scenario.wind.levels[0].wind
      console.log(`  ${id.padEnd(26)} wind toward ${Math.round(w.towardDeg)}° ${w.speedMS.toFixed(1)} m/s, best at ${best.d} m: ${line(best.bodies)}`)
    }
    continue
  }
  const interpretation = Provenance.strip(JSON.parse(readFileSync(join(dir, replay.reading!), "utf8"))).recording.interpretation as InterpretationJson
  console.log(`\n${replay.reading}`)
  console.log(`  ${"as written".padEnd(26)} ${line(expanded(interpretation))}`)
  for (const id of replay.scenarios) {
    const scenario = byId.get(id)!
    const bodies = expanded(withWind(interpretation, scenario.wind, replay.drifts === true))
    console.log(`  ${id.padEnd(26)} ${line(bodies)}`)
  }
}
