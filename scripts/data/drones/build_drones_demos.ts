/**
 * Writes the drone demo (see src/modules/interpretations/drones): public/demo-data/sky-test-drones-night.json. The place, the date and the
 * drones are ASSUMED, chosen to show what drones look like at night, not taken from a case: a suburb of New Jersey on a clear December
 * night, as in the wave of drone reports there in 2024.
 *
 * Run with: node --import tsx scripts/data/drones/build_drones_demos.ts
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import type { DroneFlightJson } from "../../../src/modules/interpretations/drones/DroneFlight.js"

const here = path.dirname(fileURLToPath(import.meta.url))
const out = (name: string) => path.join(here, "..", "..", "..", "public", "demo-data", name)

/** A demo written over the one already there, keeping what other tools added to it (see scripts/data/birds/build_birds_demos.ts). */
function write(name: string, recording: object): void {
  const file = out(name)
  const kept: Record<string, unknown> = {}
  if (existsSync(file)) {
    const before = JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>
    for (const key of ["snapshots", "sources", "image", "summaryTime"]) if (before[key] !== undefined) kept[key] = before[key]
  }
  writeFileSync(file, JSON.stringify({ ...recording, ...kept }, null, 2) + "\n")
}

const place = { name: "Suburb of Somerset County, New Jersey (assumed)", lat: 40.5925, lng: -74.6235 }

const drones: DroneFlightJson[] = [
  // Close, hovering over the field across the road, then going off and hovering again farther: strobe, red front, blinking green back.
  { id: "hovering", airframe: "quadcopter", seed: 2, path: [
    { t: 0, eastM: 20, northM: 150, altitudeM: 60 }, { t: 25000, eastM: 20, northM: 150, altitudeM: 60 },
    { t: 45000, eastM: -150, northM: 400, altitudeM: 90 }, { t: 55000, eastM: -150, northM: 400, altitudeM: 90 },
    { t: 85000, eastM: -600, northM: 900, altitudeM: 110 }
  ] },
  // Far off, a "cluster of lights": six drifting slowly west, each strobe at its own phase.
  { id: "cluster", airframe: "quadcopter", count: 6, formation: { kind: "cluster", spacingM: 25 }, seed: 5, path: [
    { t: 0, eastM: 450, northM: 1500, altitudeM: 150 }, { t: 90000, eastM: 50, northM: 1450, altitudeM: 160 }
  ] },
  // A saucer-shaped drone, low and near, its rim ringed with cyan LEDs, crossing slowly.
  { id: "drufo", airframe: "saucer", seed: 3, path: [
    { t: 0, eastM: -40, northM: 70, altitudeM: 25 }, { t: 15000, eastM: -40, northM: 70, altitudeM: 25 },
    { t: 60000, eastM: 45, northM: 80, altitudeM: 30 }, { t: 90000, eastM: 45, northM: 80, altitudeM: 30 }
  ] },
  // A drone on a wing, high, crossing at 30 m/s with an aeroplane's lights.
  { id: "wing", airframe: "fixed-wing", seed: 1, path: [
    { t: 0, eastM: -1500, northM: 1200, altitudeM: 400 }, { t: 100000, eastM: 1500, northM: 1200, altitudeM: 400 }
  ] }
]

write("sky-test-drones-night.json", {
  version: 4, id: "sky-test-drones-night", tags: ["drones", "misidentification"],
  description: {
    en: "Drones over a New Jersey suburb on a clear December night: a quadcopter hovering across the road, then going off; a far cluster of six; a saucer-shaped \"drufo\" ringed with LEDs, low and near; a fixed-wing drone crossing high. Place, date and drones assumed.",
    fr: "Des drones au-dessus d'une banlieue du New Jersey par une nuit claire de décembre : un quadricoptère en vol stationnaire de l'autre côté de la route, qui repart ; un groupe lointain de six ; un « drufo » en forme de soucoupe cerclé de LED, bas et proche ; un drone à voilure fixe qui passe haut. Lieu, date et drones supposés.",
    es: "Drones sobre un suburbio de Nueva Jersey en una noche clara de diciembre: un cuadricóptero suspendido al otro lado de la carretera, que luego se va; un grupo lejano de seis; un «drufo» en forma de platillo rodeado de LED, bajo y cercano; un dron de ala fija que pasa alto. Lugar, fecha y drones supuestos.",
    it: "Droni sopra un sobborgo del New Jersey in una notte limpida di dicembre: un quadricottero in volo stazionario dall'altra parte della strada, che poi riparte; un gruppo lontano di sei; un «drufo» a forma di disco cerchiato di LED, basso e vicino; un drone ad ala fissa che passa alto. Luogo, data e droni ipotizzati."
  },
  time: "2024-12-12T21:00:00", utcOffsetHours: -5, durationSeconds: 90,
  place: { name: place.name, locations: [{ lat: place.lat, lng: place.lng }] },
  instrument: "eye", lightPollution: 19.5,
  weatherTrack: { keyframes: [{ t: 0, weather: { cloudCover: { value: 0, basis: "assumed", rationale: "Assumed for the demo." }, cloudDarkness: 0, cloudBaseM: 2500, lowerCloudCover: 0, highCloudCover: 0, precipitationType: "none", precipitationIntensity: 0, windDirectionDeg: 300, windSpeed: 3, storm: false } }] },
  timeline: { keyframes: [{ t: 0, shapes: [] }], order: [], groups: [] },
  observerTrack: { keyframes: [{ t: 0, pose: { lat: place.lat, lng: place.lng, elevationM: 0, headingDeg: 0, pitchDeg: 12, fovDeg: 75 } }] },
  soundTrack: { keyframes: [] },
  decor: [],
  interpretation: { title: { en: "Drones", fr: "Drones", es: "Drones", it: "Droni" }, bodies: [], drones }
})
console.log("written")
