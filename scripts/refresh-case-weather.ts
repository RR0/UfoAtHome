/**
 * Asks the weather record again for every published case recording whose weather came from one.
 *
 * A recording keeps the record's answer, not a link to it: the player never asks a service, so a
 * reader gets the same sky whether or not Open-Meteo is up, and the file says (weatherSource) which
 * query produced it. The price is that the answer is as old as the last lookup — when the provider
 * learns to say more (0.57.0: the three cloud bands as layers of their own, where there had been one
 * total cover), a recording written before that still holds the old shape until somebody asks
 * again. This is the asking, for all of them at once, so that the dossiers on both hosts (see
 * sync-case-recordings.ts, to run after this) describe the same sky the editor would.
 *
 * Only the weather track and its source are rewritten, into the file's own text — nothing else in
 * the recording is round-tripped, so a refresh is a diff a reviewer can read. And only a recording
 * whose weather IS a record's is touched: one with no weatherSource holds what the witness said,
 * which no lookup may replace (the editor's own gate, see WeatherInference.applyTo).
 *
 * Usage: npx tsx scripts/refresh-case-weather.ts
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { fromSightingJson } from "../src/engine/persistence/sightingJson.js"
import type { SightingRecordingJson } from "../src/engine/persistence/sightingJson.js"
import { WeatherInference } from "../src/engine/weather/WeatherInference.js"
import { OpenMeteoWeatherProvider } from "../src/engine/weather/providers/OpenMeteoWeatherProvider.js"

class CaseWeatherRefresh {

  private readonly inference = new WeatherInference(new OpenMeteoWeatherProvider())

  constructor(private readonly directory: string) {
  }

  async run(): Promise<number> {
    let failures = 0
    for (const name of fs.readdirSync(this.directory).filter(name => /^witness-.*\.json$/.test(name)).sort()) {
      const file = path.join(this.directory, name)
      const text = fs.readFileSync(file, "utf8")
      const json = JSON.parse(text) as SightingRecordingJson
      if (!json.weatherSource) {
        console.log(`${name}: the witness's own weather, left alone`)
        continue
      }
      const result = await this.inference.infer(fromSightingJson(json))
      if (result.status !== "inferred" || !result.keyframes || !result.source) {
        console.error(`${name}: ${result.status}`)
        failures++
        continue
      }
      json.weatherTrack = { keyframes: result.keyframes }
      json.weatherSource = result.source
      fs.writeFileSync(file, JSON.stringify(json, null, this.indentOf(text)) + (text.endsWith("\n") ? "\n" : ""))
      const layers = result.keyframes[0].weather.cloudLayers?.length ?? 0
      console.log(`${name}: ${result.keyframes.length} keyframes, ${layers} cloud layers, from ${result.source.name}`)
    }
    return failures
  }

  /** The file's own indentation, so the rewrite reads as a change of weather and nothing else. */
  private indentOf(text: string): number {
    return /\n( +)"/.exec(text)?.[1].length ?? 2
  }
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
new CaseWeatherRefresh(path.join(root, "public", "demo-data")).run().then(failures => {
  process.exitCode = failures > 0 ? 1 : 0
})
