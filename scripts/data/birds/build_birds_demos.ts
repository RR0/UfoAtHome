/**
 * Writes the bird demos (see src/modules/interpretations/birds): public/demo-data/sky-test-birds-*.json. Places, dates, flocks and their
 * lighting are ASSUMED, chosen to show what the birds look like, not taken from a case.
 *
 * Run with: node --import tsx scripts/data/birds/build_birds_demos.ts
 */
import { writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const here = path.dirname(fileURLToPath(import.meta.url))
const out = (name: string) => path.join(here, "..", "..", "..", "public", "demo-data", name)

function recording(id: string, options: { time: string, utcOffsetHours: number, durationSeconds: number, place: { name: string, lat: number, lng: number },
  heading: number, pitch: number, fov: number, instrument: string, exposureSeconds?: number, title: Record<string, string>,
  description: Record<string, string>, birds: unknown[], decor?: unknown[], lightPollution?: number }) {
  return {
    version: 4, id, tags: ["birds", "misidentification"], description: options.description,
    time: options.time, utcOffsetHours: options.utcOffsetHours, durationSeconds: options.durationSeconds,
    place: { name: options.place.name, locations: [{ lat: options.place.lat, lng: options.place.lng }] },
    instrument: options.instrument, ...(options.exposureSeconds ? { exposureSeconds: options.exposureSeconds } : {}),
    ...(options.lightPollution !== undefined ? { lightPollution: options.lightPollution } : {}),
    weatherTrack: { keyframes: [{ t: 0, weather: { cloudCover: { value: 0.1, basis: "assumed", rationale: "Assumed for the demo." }, cloudDarkness: 0, cloudBaseM: 2500, lowerCloudCover: 0, highCloudCover: 0.1, precipitationType: "none", precipitationIntensity: 0, windDirectionDeg: 250, windSpeed: 3, storm: false } }] },
    timeline: { keyframes: [{ t: 0, shapes: [] }], order: [], groups: [] },
    observerTrack: { keyframes: [{ t: 0, pose: { lat: options.place.lat, lng: options.place.lng, elevationM: 0, headingDeg: options.heading, pitchDeg: options.pitch, fovDeg: options.fov } }] },
    soundTrack: { keyframes: [] },
    decor: options.decor ?? [],
    interpretation: { title: options.title, bodies: [], birds: options.birds }
  }
}

// Gulls over a harbour in the afternoon: a V of herring gulls crossing close, then one gull alone passing a few tens of metres off, as a
// phone at 1/60 s films it.
writeFileSync(out("sky-test-birds-gulls.json"), JSON.stringify(recording("sky-test-birds-gulls", {
  time: "2025-09-14T16:30:00", utcOffsetHours: 2, durationSeconds: 40, place: { name: "Harbour, Brittany coast (assumed)", lat: 47.75, lng: -3.37 },
  heading: 0, pitch: 12, fov: 50, instrument: "phone-landscape", exposureSeconds: 1 / 60,
  title: { en: "Gulls", fr: "Goélands", es: "Gaviotas", it: "Gabbiani" },
  description: {
    en: "Herring gulls over a harbour in the afternoon: a V of nine crossing in front, then one alone passing close to the phone.",
    fr: "Des goélands argentés au-dessus d'un port l'après-midi : un V de neuf qui passe devant, puis un seul tout près du téléphone.",
    es: "Gaviotas argénteas sobre un puerto por la tarde: una V de nueve que cruza delante, y luego una sola que pasa cerca del teléfono.",
    it: "Gabbiani reali sopra un porto nel pomeriggio: una V di nove che passa davanti, poi uno solo vicino al telefono."
  },
  birds: [
    { id: "gull-v", species: "herring-gull", count: 9, formation: { kind: "v", angleDeg: 80 }, seed: 3,
      path: [{ t: 0, eastM: -120, northM: 90, altitudeM: 30 }, { t: 12000, eastM: 0, northM: 80, altitudeM: 34 }, { t: 24000, eastM: 130, northM: 60, altitudeM: 30 }] },
    { id: "gull-alone", species: "herring-gull", formation: { kind: "single" }, seed: 7,
      path: [{ t: 18000, eastM: 40, northM: 25, altitudeM: 8 }, { t: 26000, eastM: 0, northM: 18, altitudeM: 9 }, { t: 34000, eastM: -45, northM: 22, altitudeM: 8 }] }
  ]
}), null, 2) + "\n")

// Geese at night over a town, their bellies lit from below by its street lamps: a V crossing the sky, as at Lubbock, and a crowd that flies
// itself. The light from below, 0.5 lux of mercury-vapour white, is ASSUMED.
writeFileSync(out("sky-test-birds-night.json"), JSON.stringify(recording("sky-test-birds-night", {
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
}), null, 2) + "\n")
console.log("written")
