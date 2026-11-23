/**
 * Plays every reading of a case over the scenarios its uncertain conditions give (see docs/uncertain-conditions.md, ScenarioSweep), and
 * prints, reading by reading, its verdict over them (robust plausible explanation, robust exclusion, or conditional, and where), how it
 * moved from the verdict as written, and the alerts of the sky (the Moon, the planets, the bright stars and the ISS searched for from each
 * candidate place, at each candidate instant).
 *
 *   node --import tsx scripts/scenario-sweep.ts public/demo-data/case-western-us-event.json
 *
 * Options:
 *   --lang=fr                  the language it speaks (en, fr, es, it); en when absent
 *   --keep=telling             which scenarios to keep as readings: telling (the default, or the case's conditions.keep), robust,
 *                              conditional, all, none
 *   --write                    writes the kept scenarios as readings beside the case, and adds them to it, after its account's readings
 *   --json=out.json            writes the whole sweep as JSON
 *   --readings=a.json,b.json   only these readings; --accounts=w1-1,w3-1 only these accounts; --no-sky: no candidate of the sky
 *   --conditions=c.json        the uncertain conditions to sweep, instead of the case's own
 *   --cache=dir                where the winds fetched are kept (node_modules/.cache/scenario-wind when absent): Open-Meteo is asked
 *                              each day of each place once, again later when it refuses (429)
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs"
import { dirname, join } from "node:path"
import { ScenarioSweep, type CaseSweep } from "../src/engine/scenario/ScenarioSweep.js"
import { ScenarioReadings } from "../src/engine/scenario/ScenarioReadings.js"
import { OpenMeteoWindProfiles, type ResponseCache } from "../src/engine/scenario/WindProfiles.js"
import type { ScenarioKeep, UncertainConditionsJson } from "../src/engine/scenario/UncertainConditions.js"
import { TleArchive, UFOATHOME_TLE_INDEX_URL } from "../src/engine/astronomy/TleArchive.js"
import { visibleMagnitudeLimit } from "../src/render3d/skyColors.js"
import { InterpretationKinds } from "../src/modules/interpretations/InterpretationKind.js"
import { INTERPRETATION_SOURCES } from "../src/modules/interpretations/interpretationSources.js"
import type { CaseJson, CaseEventJson } from "../src/engine/persistence/caseJson.js"
import type { SightingRecordingJson } from "../src/engine/persistence/sightingJson.js"
import { Provenance } from "../src/engine/persistence/Provenance.js"
import { ScenarioSweepWords } from "../src/component/ScenarioSweepWords.js"
import type { ScenarioSweepMessages } from "../src/component/messages/ScenarioSweepMessages.js"
import { scenarioSweepMessages_en } from "../src/component/messages/ScenarioSweepMessages_en.js"
import { scenarioSweepMessages_fr } from "../src/component/messages/ScenarioSweepMessages_fr.js"
import { scenarioSweepMessages_es } from "../src/component/messages/ScenarioSweepMessages_es.js"
import { scenarioSweepMessages_it } from "../src/component/messages/ScenarioSweepMessages_it.js"
const LANGUAGES = ["en", "fr", "es", "it"] as const
type Language = typeof LANGUAGES[number]
const WORDS: Record<Language, ScenarioSweepMessages> = { en: scenarioSweepMessages_en, fr: scenarioSweepMessages_fr, es: scenarioSweepMessages_es, it: scenarioSweepMessages_it }

const args = process.argv.slice(2)
const option = (name: string) => args.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3)
const flag = (name: string) => args.includes(`--${name}`)
const casePath = args.find(arg => !arg.startsWith("--"))
if (!casePath) {
  console.error("usage: scenario-sweep.ts <case.json> [--lang=fr] [--keep=telling] [--write] [--json=out.json]")
  process.exit(1)
}
const language = (option("lang") ?? "en") as Language
const m = WORDS[language] ?? WORDS.en
const dir = dirname(casePath)
const json: CaseJson = JSON.parse(readFileSync(casePath, "utf8"))
const conditionsFile = option("conditions")
const conditions: UncertainConditionsJson | undefined = conditionsFile ? JSON.parse(readFileSync(conditionsFile, "utf8")) : undefined

const cacheDir = option("cache") ?? "node_modules/.cache/scenario-wind"
mkdirSync(cacheDir, { recursive: true })
const cache: ResponseCache = {
  get: async key => { const file = join(cacheDir, `${key.replace(/[^0-9A-Za-z.,-]+/g, "_")}.json`); return existsSync(file) ? readFileSync(file, "utf8") : undefined },
  set: async (key, text) => writeFileSync(join(cacheDir, `${key.replace(/[^0-9A-Za-z.,-]+/g, "_")}.json`), text)
}
const wind = new OpenMeteoWindProfiles({ cache })
const tle = new TleArchive({ indexUrls: [UFOATHOME_TLE_INDEX_URL] })
const kinds = INTERPRETATION_SOURCES.map(source => InterpretationKinds.of(source))
const recordings = new Map<string, SightingRecordingJson>()
const load = async (url: string) => {
  if (!recordings.has(url)) recordings.set(url, JSON.parse(readFileSync(join(dir, url), "utf8")))
  return recordings.get(url)!
}
const sweeper = new ScenarioSweep({
  wind, kinds, load, limitAt: sun => visibleMagnitudeLimit(sun),
  satellites: async date => (await tle.at(date))?.objects,
  names: id => (m.bodies as Record<string, string>)[id]
})

const keep = option("keep") as ScenarioKeep | undefined
let lastShown = 0
const result: CaseSweep = await sweeper.sweep(json, {
  ...(keep ? { keep } : {}), ...(conditions ? { conditions } : {}),
  ...(option("readings") ? { readings: option("readings")!.split(",") } : {}),
  ...(option("accounts") ? { accounts: option("accounts")!.split(",") } : {}),
  sky: !flag("no-sky"),
  progress: (done, total) => {
    if (done === total || Date.now() - lastShown > 2000) {
      lastShown = Date.now()
      process.stderr.write(`${m.running.replace("{done}", String(done)).replace("{total}", String(total))}\r`)
    }
  }
})
process.stderr.write("\n")

/** What a SaidText says in the language spoken. */
const said = (text: unknown): string => typeof text === "string" ? text
  : typeof text === "object" && text !== null ? String((text as Record<string, string>)[language] ?? Object.values(text)[0] ?? "") : ""
const candidates = new Map((json.conditions?.places?.candidates ?? conditions?.places?.candidates ?? []).map(candidate => [candidate.id, candidate]))
const wordsIn = (lang: Language) => new ScenarioSweepWords(WORDS[lang], id => id === "own" ? WORDS[lang].ownPlace : candidates.get(id)?.place.name ?? id, lang)
const words = wordsIn(language)
const number = (value: number | undefined) => value === undefined ? "–" : `${value.toFixed(1)}°`
const summary = (s: { agreedDirection: number, compared: number, medianDeg?: number }) =>
  m.summary.replace("{agreed}", String(s.agreedDirection)).replace("{compared}", String(s.compared)).replace("{median}", number(s.medianDeg))

for (const account of result.accounts) {
  console.log(`\n${m.account} ${account.eventId ?? account.url}: ${said(account.title)}`)
  for (const reading of account.readings) {
    console.log(`  ${m.reading} ${reading.url}`)
    console.log(`    ${words.sentence(reading.verdict)}${reading.depends.includes("wind") ? ` — ${m.dependsWind}` : ""}`)
    if (reading.verdict.independent) continue
    console.log(`    ${m.asWritten.padEnd(44)} ${m.said} ${summary(reading.asWritten.said)} | ${m.drawn} ${summary(reading.asWritten.drawn)}`)
    for (const outcome of reading.outcomes) {
      const w = outcome.groundWind ? m.windValue.replace("{toward}", String(Math.round(outcome.groundWind.towardDeg))).replace("{speed}", outcome.groundWind.speedMS.toFixed(1)) : ""
      const kept = reading.kept.includes(outcome.scenario) ? " *" : ""
      console.log(`    ${(outcome.scenario.id + kept).padEnd(44)} ${outcome.error ? outcome.error : `${outcome.plausible ? "+" : "-"} ${m.said} ${summary(outcome.said)} | ${m.drawn} ${summary(outcome.drawn)} | ${w}`}`)
    }
  }
  if (account.skyNote) console.log(`  (${account.skyNote})`)
}
console.log(`\n${m.alertsHeading}`)
for (const alert of ScenarioSweepWords.grouped(result.alerts)) console.log(`  ${words.alert(alert)}: ${alert.accounts.join(", ")}`)
if (result.alerts.length === 0) console.log(`  ${m.noAlert}`)

const out = option("json")
if (out) writeFileSync(out, JSON.stringify(result, null, 1))

if (flag("write")) {
  const today = new Date().toISOString().slice(0, 10)
  let added = 0
  for (const account of result.accounts) {
    for (const reading of account.readings) {
      const event = json.events!.find(e => e.url === reading.url)!
      for (const scenario of reading.kept) {
        const readingJson = await load(reading.url)
        const profile = reading.depends.includes("wind") ? await wind.profile(scenario.lat, scenario.lng, scenario.date) : undefined
        const base = event.title ?? Provenance.strip(readingJson).recording.interpretation?.title
        const title = Object.fromEntries(LANGUAGES.map(lang => {
          const w = wordsIn(lang)
          const text = typeof base === "string" ? base : (base as Record<string, string> | undefined)?.[lang] ?? (base as Record<string, string> | undefined)?.en ?? reading.url
          return [lang, WORDS[lang].scenarioTitle.replace("{title}", text).replace("{place}", w.scenario(scenario).split(", ")[0]).replace("{date}", w.instant(scenario.local))]
        }))
        const candidate = candidates.get(scenario.placeId)
        const recording = ScenarioReadings.recording(readingJson, reading.url, scenario, profile, kinds, {
          title, verdict: reading.verdict.robustness,
          ...(candidate?.rationale ? { placeRationale: candidate.rationale } : {}),
          ...(json.conditions?.time?.rationale ? { timeRationale: json.conditions.time.rationale } : {})
        })
        const file = ScenarioReadings.fileName(reading.url, scenario)
        writeFileSync(join(dir, file), `${JSON.stringify(recording, null, 1)}\n`)
        const events = json.events!.filter(e => e.url !== file)
        const entry: CaseEventJson = { type: "event", eventType: "sighting", interpretationOf: event.interpretationOf, ...(event.by ? { by: event.by } : {}), time: today, title, url: file }
        // After the readings of its account already in the case.
        const ofs = [event.interpretationOf].flat()
        const at = Math.max(...events.map((e, i) => e.id !== undefined && ofs.includes(e.id) || [e.interpretationOf].flat().some(id => id !== undefined && ofs.includes(id)) ? i : -1))
        events.splice(at + 1, 0, entry)
        json.events = events
        added++
      }
    }
  }
  writeFileSync(casePath, `${JSON.stringify(json, null, 1)}\n`)
  console.log(`\n${m.kept.replace("{n}", String(added))}`)
}
