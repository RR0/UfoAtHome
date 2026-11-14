/**
 * How much each reading of a case owes to the values it chose (see ReadingSensitivity), printed reading by reading.
 *
 *   node --import tsx scripts/reading-sensitivity.ts case-braine-le-comte.json
 *
 * The case is read from public/demo-data, and its readings and accounts beside it. Judged as ReadingSensitivity.forAccount judges it;
 * with ALL=1, against everything the timelines draw, with the fixed tolerances.
 */
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { ReadingSensitivity } from "../src/engine/interpretation/ReadingSensitivity.js"
import { Provenance } from "../src/engine/persistence/Provenance.js"
import { BodyConfrontation } from "../src/engine/interpretation/BodyConfrontation.js"
import { WitnessError } from "../src/engine/witness/WitnessError.js"
import { fromSightingJson } from "../src/engine/persistence/sightingJson.js"

const dir = "public/demo-data"
const casePath = process.argv[2]
const kase = JSON.parse(readFileSync(join(dir, casePath), "utf8"))
const byId = new Map<string, string>()
for (const e of kase.events) if (e.id && !e.interpretationOf) byId.set(e.id, e.url)
for (const e of kase.events) {
  if (!e.interpretationOf) continue
  const ofs = [e.interpretationOf].flat()
  const accountJson = JSON.parse(readFileSync(join(dir, byId.get(ofs[0])!), "utf8"))
  const account = fromSightingJson(accountJson)
  const instants = Provenance.strip(accountJson).recording.timeline.keyframes.map((k: { t: number }) => k.t)
  const readingJson = JSON.parse(readFileSync(join(dir, e.url), "utf8"))
  const { recording, provenance } = Provenance.strip(readingJson)
  const bodies = recording.interpretation?.bodies ?? []
  const started = performance.now()
  const r = (process.env.ALL ? new ReadingSensitivity(account, instants) : ReadingSensitivity.forAccount(accountJson)).of(bodies, provenance)
  const ms = Math.round(performance.now() - started)
  console.log(`\n${e.url} (${ms} ms, ${instants.length} instants, ${bodies.length} bodies)`)
  console.log(`  agreement ${(r.agreement*100).toFixed(0)} % of ${r.compared}${r.better ? `, better: ${r.better.bodyId} ${r.better.knob} ${r.better.amount.toFixed(2)} -> ${(r.better.agreement*100).toFixed(0)} %` : ""}`)
  console.log(`  sufficient=${r.sufficient}`)
  console.log(`  holds=${r.holds} compared at ${r.instants} instants, median ${r.medianSeparationDeg?.toFixed(1)}°, free=${r.freeBodies.length} fixed=${r.fixedBodies.length}`)
  for (const m of r.margins.slice(0, 6)) {
    const f = (v: number) => m.knob === "distance" || m.knob === "size" ? `×${v.toFixed(2)}` : m.knob === "time" ? `${Math.round(v)} ms` : `${v.toFixed(1)}°`
    console.log(`  ${m.bodyId} ${m.knob}: ${f(m.lower)}${m.lowerReached ? "+" : ""} .. ${f(m.upper)}${m.upperReached ? "+" : ""}  share ${m.share.toFixed(2)}${m.reference ? `  vs ${f(m.reference.lower)} .. ${f(m.reference.upper)} covers ${Math.round(m.coverage! * 100)} %` : ""}`)
  }
}
