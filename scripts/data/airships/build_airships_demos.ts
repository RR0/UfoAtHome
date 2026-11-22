/**
 * Writes the airship demo (see src/modules/interpretations/airships): public/demo-data/sky-test-airships-night.json. A night in the Florida
 * Keys, seen from Sugarloaf Key: the tethered aerostat of Cudjoe Key (the site's, "Fat Albert" to the islanders) moored at 3 km, its red
 * obstruction lights flashing; a blimp cruising along the coast with its sign lit; a lightship glowing from within, passing near. The
 * aerostat's site is the real one; the date, its height, the wind and the two airships are ASSUMED.
 *
 * Run with: node --import tsx scripts/data/airships/build_airships_demos.ts
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import type { AirshipFlightJson } from "../../../src/modules/interpretations/airships/AirshipFlight.js"

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

const place = { name: "Sugarloaf Key, Florida (assumed)", lat: 24.648, lng: -81.565 }
// Cudjoe Key's aerostat site, metres east and north of the observer.
const cudjoe = { eastM: (-81.502 - place.lng) * 111320 * Math.cos(place.lat * Math.PI / 180), northM: (24.676 - place.lat) * 111320 }
const wind = { fromDeg: 90, speedMS: 5 }

const airships: AirshipFlightJson[] = [
  { id: "aerostat", airship: "aerostat", wind, seed: 4, path: [
    { t: 0, eastM: Math.round(cudjoe.eastM), northM: Math.round(cudjoe.northM), altitudeM: 3000 }, { t: 180_000, eastM: Math.round(cudjoe.eastM), northM: Math.round(cudjoe.northM), altitudeM: 3000 }
  ] },
  { id: "blimp", airship: "blimp", wind, seed: 2, path: [
    { t: 0, eastM: 2500, northM: -500, altitudeM: 300 }, { t: 120_000, eastM: 3500, northM: 1500, altitudeM: 300 }, { t: 180_000, eastM: 3000, northM: 2400, altitudeM: 320 }
  ] },
  { id: "lightship", airship: "lightship", wind, seed: 3, path: [
    { t: 0, eastM: 800, northM: -300, altitudeM: 200 }, { t: 180_000, eastM: 1500, northM: 1200, altitudeM: 250 }
  ] }
]

write("sky-test-airships-night.json", {
  version: 4, id: "sky-test-airships-night", tags: ["airships", "misidentification"],
  description: {
    en: "A night in the Florida Keys, from Sugarloaf Key: Cudjoe Key's tethered aerostat moored at 3 km, its red lights flashing; a blimp cruising along the coast with its sign lit; a lightship glowing from within, passing near. Date, height, wind and airships assumed.",
    fr: "Une nuit dans les Keys de Floride, depuis Sugarloaf Key : l'aérostat captif de Cudjoe Key amarré à 3 km, ses feux rouges clignotants ; un dirigeable qui longe la côte, son enseigne allumée ; un dirigeable lumineux, éclairé de l'intérieur, qui passe près. Date, hauteur, vent et dirigeables supposés.",
    es: "Una noche en los Cayos de Florida, desde Sugarloaf Key: el aeróstato cautivo de Cudjoe Key amarrado a 3 km, sus luces rojas destellando; un dirigible que bordea la costa con su letrero encendido; un dirigible luminoso, iluminado desde dentro, que pasa cerca. Fecha, altura, viento y dirigibles supuestos.",
    it: "Una notte nelle Keys della Florida, da Sugarloaf Key: l'aerostato frenato di Cudjoe Key ormeggiato a 3 km, le luci rosse lampeggianti; un dirigibile che costeggia la riva con l'insegna accesa; un dirigibile luminoso, illuminato dall'interno, che passa vicino. Data, quota, vento e dirigibili ipotizzati."
  },
  time: "2026-03-20T21:30:00", utcOffsetHours: -4, durationSeconds: 180,
  place: { name: place.name, locations: [{ lat: place.lat, lng: place.lng }] },
  instrument: "eye", lightPollution: 20.5,
  weatherTrack: { keyframes: [{ t: 0, weather: { cloudCover: { value: 0, basis: "assumed", rationale: "Assumed for the demo." }, cloudDarkness: 0, cloudBaseM: 2500, lowerCloudCover: 0, highCloudCover: 0, precipitationType: "none", precipitationIntensity: 0, windDirectionDeg: wind.fromDeg, windSpeed: wind.speedMS, storm: false } }] },
  timeline: { keyframes: [{ t: 0, shapes: [] }], order: [], groups: [] },
  observerTrack: { keyframes: [{ t: 0, pose: { lat: place.lat, lng: place.lng, elevationM: 0, headingDeg: 75, pitchDeg: 12, fovDeg: 60 } }] },
  soundTrack: { keyframes: [] },
  decor: [],
  interpretation: { title: { en: "Airships", fr: "Dirigeables", es: "Dirigibles", it: "Dirigibili" }, bodies: [], airships }
})
console.log("written")
