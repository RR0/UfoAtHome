/**
 * Writes the bird demos (see src/modules/interpretations/birds): public/demo-data/sky-test-birds-*.json. Places, dates, flocks and their
 * lighting are ASSUMED, chosen to show what the birds look like, not taken from a case.
 *
 * Run with: node --import tsx scripts/data/birds/build_birds_demos.ts
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { BirdFlock } from "../../../src/modules/interpretations/birds/BirdFlock.js"
import type { BirdFlockJson } from "../../../src/modules/interpretations/birds/BirdFlock.js"
import type { BodyJson } from "../../../src/engine/interpretation/Interpretation.js"

const here = path.dirname(fileURLToPath(import.meta.url))
const out = (name: string) => path.join(here, "..", "..", "..", "public", "demo-data", name)

/**
 * A demo written over the one already there, keeping what other tools added to it: its surveyed scenery and the third-party data taken
 * beside it (`snapshots`, see scripts/fetch-surroundings.ts and scripts/snapshot), the surveys it came from (`sources`) and its cover.
 */
class DemoFile {
  static readonly KEPT = ["snapshots", "sources", "image", "summaryTime"] as const

  static write(name: string, recording: object): void {
    const file = out(name)
    const kept: Record<string, unknown> = {}
    if (existsSync(file)) {
      const before = JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>
      for (const key of DemoFile.KEPT) if (before[key] !== undefined) kept[key] = before[key]
    }
    const written: Record<string, unknown> = { ...recording, ...kept }
    // A surveyed scenery is in its annex (see annex_surroundings.py), which takes the recording's empty decor away.
    if ((kept.snapshots as { decor?: unknown } | undefined)?.decor && Array.isArray(written.decor) && written.decor.length === 0) delete written.decor
    writeFileSync(file, JSON.stringify(written, null, 2) + "\n")
  }
}

/**
 * Where a phone held by someone following birds points, second by second: at the middle of the flock it follows, which is handed from one
 * flock to the next over `handOverMs`. Each pose is `{ t, headingDeg, pitchDeg }`, the eye 1.6 m up (see BodyPlacement.EYE_HEIGHT_M).
 */
class Following {
  private static readonly EYE_M = 1.6

  /** Where `body` is at `t`, between its track's keyframes; undefined outside them. */
  private static at(body: BodyJson, t: number): { eastM: number, northM: number, upM: number } | undefined {
    const track = body.track as { t: number, eastM: number, northM: number, altitudeM: number }[]
    if (t < track[0].t || t > track[track.length - 1].t) return undefined
    const next = track.findIndex(key => key.t >= t)
    const b = track[next], a = track[Math.max(0, next - 1)]
    const f = b.t === a.t ? 0 : (t - a.t) / (b.t - a.t)
    return { eastM: a.eastM + (b.eastM - a.eastM) * f, northM: a.northM + (b.northM - a.northM) * f, upM: a.altitudeM + (b.altitudeM - a.altitudeM) * f }
  }

  /** The middle of the birds of `flock` there are at `t`. */
  private static middle(bodies: BodyJson[], t: number): { eastM: number, northM: number, upM: number } | undefined {
    const there = bodies.map(body => Following.at(body, t)).filter(point => point !== undefined)
    if (there.length === 0) return undefined
    const sum = there.reduce((acc, p) => ({ eastM: acc.eastM + p.eastM, northM: acc.northM + p.northM, upM: acc.upM + p.upM }), { eastM: 0, northM: 0, upM: 0 })
    return { eastM: sum.eastM / there.length, northM: sum.northM / there.length, upM: sum.upM / there.length }
  }

  private static aim(point: { eastM: number, northM: number, upM: number }): { headingDeg: number, pitchDeg: number } {
    const level = Math.hypot(point.eastM, point.northM)
    return { headingDeg: Math.atan2(point.eastM, point.northM) * 180 / Math.PI, pitchDeg: Math.atan2(point.upM - Following.EYE_M, level) * 180 / Math.PI }
  }

  /** The poses following `first` until `switchMs`, then `second`, turning from one to the other over `handOverMs`. */
  static poses(first: BirdFlockJson, second: BirdFlockJson, switchMs: number, handOverMs: number, durationMs: number, stepMs = 1000) {
    const a = BirdFlock.bodiesOf(first), b = BirdFlock.bodiesOf(second)
    const poses: { t: number, headingDeg: number, pitchDeg: number }[] = []
    let last: { headingDeg: number, pitchDeg: number } | undefined
    for (let t = 0; t <= durationMs; t += stepMs) {
      const onFirst = Following.middle(a, t), onSecond = Following.middle(b, t)
      const f = Math.min(1, Math.max(0, (t - switchMs) / handOverMs))
      const fromFirst = onFirst && Following.aim(onFirst), fromSecond = onSecond && Following.aim(onSecond)
      let aim = fromFirst && fromSecond
        ? { headingDeg: fromFirst.headingDeg + (fromSecond.headingDeg - fromFirst.headingDeg) * f, pitchDeg: fromFirst.pitchDeg + (fromSecond.pitchDeg - fromFirst.pitchDeg) * f }
        : (f > 0 ? fromSecond ?? fromFirst : fromFirst ?? fromSecond) ?? last
      if (t > switchMs && fromSecond) aim = f >= 1 ? fromSecond : aim
      if (!aim) continue
      last = aim
      poses.push({ t, headingDeg: Math.round(aim.headingDeg * 10) / 10, pitchDeg: Math.round(aim.pitchDeg * 10) / 10 })
    }
    return poses
  }
}

function recording(id: string, options: { time: string, utcOffsetHours: number, durationSeconds: number, place: { name: string, lat: number, lng: number },
  heading: number, pitch: number, fov: number, instrument: string, exposureSeconds?: number, title: Record<string, string>,
  description: Record<string, string>, birds: unknown[], decor?: unknown[], lightPollution?: number,
  poses?: { t: number, headingDeg: number, pitchDeg: number }[] }) {
  return {
    version: 4, id, tags: ["birds", "misidentification"], description: options.description,
    time: options.time, utcOffsetHours: options.utcOffsetHours, durationSeconds: options.durationSeconds,
    place: { name: options.place.name, locations: [{ lat: options.place.lat, lng: options.place.lng }] },
    instrument: options.instrument, ...(options.exposureSeconds ? { exposureSeconds: options.exposureSeconds } : {}),
    ...(options.lightPollution !== undefined ? { lightPollution: options.lightPollution } : {}),
    weatherTrack: { keyframes: [{ t: 0, weather: { cloudCover: { value: 0.1, basis: "assumed", rationale: "Assumed for the demo." }, cloudDarkness: 0, cloudBaseM: 2500, lowerCloudCover: 0, highCloudCover: 0.1, precipitationType: "none", precipitationIntensity: 0, windDirectionDeg: 250, windSpeed: 3, storm: false } }] },
    timeline: { keyframes: [{ t: 0, shapes: [] }], order: [], groups: [] },
    observerTrack: { keyframes: (options.poses ?? [{ t: 0, headingDeg: options.heading, pitchDeg: options.pitch }]).map(pose => ({
      t: pose.t, pose: { lat: options.place.lat, lng: options.place.lng, elevationM: 0, headingDeg: pose.headingDeg, pitchDeg: pose.pitchDeg, fovDeg: options.fov }
    })) },
    soundTrack: { keyframes: [] },
    decor: options.decor ?? [],
    interpretation: { title: options.title, bodies: [], birds: options.birds }
  }
}

// Gulls over a harbour in the afternoon: a V of herring gulls crossing close, then one gull alone passing a few tens of metres off the other
// way, as a phone at 1/60 s films it, following the V and then the one gull. The place is a real quay, the end of the Quai Eric Tabarly
// in Lorient's harbour, looking north over the basin at the Esplanade du Péristyle: its scenery is the IGN's survey of it.
const GULL_V: BirdFlockJson = { id: "gull-v", species: "herring-gull", count: 9, formation: { kind: "v", angleDeg: 80 }, seed: 3,
  path: [{ t: 0, eastM: -120, northM: 90, altitudeM: 30 }, { t: 12000, eastM: 0, northM: 80, altitudeM: 34 }, { t: 24000, eastM: 130, northM: 60, altitudeM: 30 }] }
const GULL_ALONE: BirdFlockJson = { id: "gull-alone", species: "herring-gull", formation: { kind: "single" }, seed: 7,
  path: [{ t: 18000, eastM: 40, northM: 25, altitudeM: 8 }, { t: 26000, eastM: 0, northM: 18, altitudeM: 9 }, { t: 34000, eastM: -45, northM: 22, altitudeM: 8 }] }
DemoFile.write("sky-test-birds-gulls.json", recording("sky-test-birds-gulls", {
  time: "2025-09-14T16:30:00", utcOffsetHours: 2, durationSeconds: 40, place: { name: "Quai Éric Tabarly, Lorient harbour", lat: 47.73993, lng: -3.34987 },
  heading: 0, pitch: 12, fov: 50, instrument: "phone-landscape", exposureSeconds: 1 / 60,
  poses: Following.poses(GULL_V, GULL_ALONE, 18000, 3000, 40000),
  title: { en: "Gulls", fr: "Goélands", es: "Gaviotas", it: "Gabbiani" },
  description: {
    en: "Herring gulls over Lorient's harbour in the afternoon: the phone follows a V of nine crossing in front, then one alone passing close the other way.",
    fr: "Des goélands argentés au-dessus du port de Lorient l'après-midi : le téléphone suit un V de neuf qui passe devant, puis un seul qui passe tout près dans l'autre sens.",
    es: "Gaviotas argénteas sobre el puerto de Lorient por la tarde: el teléfono sigue una V de nueve que cruza delante, y luego una sola que pasa muy cerca en sentido contrario.",
    it: "Gabbiani reali sopra il porto di Lorient nel pomeriggio: il telefono segue una V di nove che passa davanti, poi uno solo che passa vicinissimo nell'altro senso."
  },
  birds: [GULL_V, GULL_ALONE]
}))

// Geese at night over a town, their bellies lit from below by its street lamps: a V crossing the sky, as at Lubbock, and a crowd that flies
// itself. The light from below, 0.5 lux of mercury-vapour white, is ASSUMED.
DemoFile.write("sky-test-birds-night.json", recording("sky-test-birds-night", {
  time: "2025-09-02T21:10:00", utcOffsetHours: -5, durationSeconds: 60, place: { name: "Town in West Texas (assumed)", lat: 33.58, lng: -101.85 },
  heading: 0, pitch: 55, fov: 70, instrument: "eye", lightPollution: 18.5,
  title: { en: "Birds lit from below", fr: "Oiseaux éclairés par-dessous", es: "Aves iluminadas desde abajo", it: "Uccelli illuminati dal basso" },
  description: {
    en: "A V of snow geese crossing the night sky over a town, their white bellies lit by its street lamps, then a crowd of plovers flying itself.",
    fr: "Un V d'oies des neiges traverse le ciel nocturne d'une ville, leur ventre blanc éclairé par les lampadaires, puis une nuée de pluviers qui vole d'elle-même.",
    es: "Una V de gansos nivales cruza el cielo nocturno de una ciudad, con el vientre blanco iluminado por las farolas, y luego una bandada de chorlitos que vuela por sí sola.",
    it: "Una V di oche delle nevi attraversa il cielo notturno di una città, il ventre bianco illuminato dai lampioni, poi uno stormo di pivieri che vola da sé."
  },
  birds: [
    { id: "geese", species: "snow-goose", count: 21, formation: { kind: "v", angleDeg: 70, asymmetry: 0.6 }, seed: 11,
      lightFromBelow: { lux: 0.5, color: "#dfe8ff" },
      path: [{ t: 0, eastM: 0, northM: -250, altitudeM: 200 }, { t: 25000, eastM: 0, northM: 230, altitudeM: 210 }] },
    { id: "plovers", species: "american-golden-plover", count: 60, formation: { kind: "flock" }, seed: 5,
      lightFromBelow: { lux: 0.5, color: "#dfe8ff" },
      path: [{ t: 25000, eastM: -300, northM: 150, altitudeM: 120 }, { t: 40000, eastM: -40, northM: 120, altitudeM: 110 }, { t: 50000, eastM: 30, northM: 220, altitudeM: 120 }, { t: 60000, eastM: 250, northM: 150, altitudeM: 120 }] }
  ]
}))
console.log("written")
