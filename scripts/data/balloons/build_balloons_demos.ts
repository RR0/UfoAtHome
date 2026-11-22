/**
 * Writes the balloon demos (see src/modules/interpretations/balloons), each over the one already there:
 *
 * - public/demo-data/sky-test-balloons-dusk.json: twenty minutes after sunset over the plains of eastern New Mexico, the Sun 5° under the
 *   horizon: a stratospheric balloon floating at 30 km, the kind the Columbia Scientific Balloon Facility lets go from Fort Sumner, and
 *   a weather balloon a few hundred metres under its burst, both still in the Sun while the ground is in the dusk.
 * - public/demo-data/sky-test-balloons-day.json: a morning's mass ascension of hot-air balloons, their burners firing as they climb, and a
 *   foil party balloon lost high over them, flashing the Sun as it turns.
 * - public/demo-data/sky-test-balloons-night.json: LED balloons let go one after the other from a garden in the Beauce on a summer night, drifting off
 *   in a loose line, red, white and blue.
 *
 * The places, the dates and the balloons are ASSUMED, chosen to show what such balloons look like, not taken from a case.
 *
 * Run with: node --import tsx scripts/data/balloons/build_balloons_demos.ts
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import type { BalloonFlightJson } from "../../../src/modules/interpretations/balloons/BalloonFlight.js"

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

const clear = (windDirectionDeg: number, windSpeed: number) => ({
  keyframes: [{ t: 0, weather: { cloudCover: { value: 0, basis: "assumed", rationale: "Assumed for the demo." }, cloudDarkness: 0, cloudBaseM: 3000, lowerCloudCover: 0, highCloudCover: 0, precipitationType: "none", precipitationIntensity: 0, windDirectionDeg, windSpeed, storm: false } }]
})

const recording = (id: string, description: Record<string, string>, time: string, utcOffsetHours: number, durationSeconds: number,
  place: { name: string, lat: number, lng: number }, pose: { headingDeg: number, pitchDeg: number, fovDeg: number }, lightPollution: number,
  weatherTrack: object, title: Record<string, string>, balloons: BalloonFlightJson[]) => ({
  version: 4, id, tags: ["balloons", "misidentification"], description,
  time, utcOffsetHours, durationSeconds,
  place: { name: place.name, locations: [{ lat: place.lat, lng: place.lng }] },
  instrument: "eye", lightPollution, weatherTrack,
  timeline: { keyframes: [{ t: 0, shapes: [] }], order: [], groups: [] },
  observerTrack: { keyframes: [{ t: 0, pose: { lat: place.lat, lng: place.lng, elevationM: 0, ...pose } }] },
  soundTrack: { keyframes: [] },
  decor: [],
  interpretation: { title, bodies: [], balloons }
})

// Clovis, New Mexico, 1 300 m above the sea, 140 km east of Fort Sumner.
const plains = { name: "East of Clovis, New Mexico (assumed)", lat: 34.40, lng: -103.20 }
write("sky-test-balloons-dusk.json", recording("sky-test-balloons-dusk", {
  en: "Twenty minutes after sunset over the plains of eastern New Mexico: a stratospheric balloon floating at 30 km and a weather balloon nearing its burst, both still in the Sun while the ground is in the dusk. Place, date and balloons assumed.",
  fr: "Vingt minutes après le coucher du Soleil sur les plaines de l'est du Nouveau-Mexique : un ballon stratosphérique qui flotte à 30 km et un ballon-sonde près d'éclater, tous deux encore au Soleil alors que le sol est dans le crépuscule. Lieu, date et ballons supposés.",
  es: "Veinte minutos después de la puesta del Sol sobre las llanuras del este de Nuevo México: un globo estratosférico que flota a 30 km y un globo sonda a punto de estallar, ambos todavía al Sol mientras el suelo está en el crepúsculo. Lugar, fecha y globos supuestos.",
  it: "Venti minuti dopo il tramonto sulle pianure del Nuovo Messico orientale: un pallone stratosferico che galleggia a 30 km e un pallone sonda prossimo a scoppiare, entrambi ancora al Sole mentre il suolo è nel crepuscolo. Luogo, data e palloni ipotizzati."
}, "2026-09-16T19:20:00", -6, 150, plains, { headingDeg: 58, pitchDeg: 25, fovDeg: 60 }, 21.5, clear(200, 3),
{ en: "Balloons in the Sun", fr: "Ballons au Soleil", es: "Globos al Sol", it: "Palloni al Sole" }, [
  { id: "stratospheric", balloon: "stratospheric", site: { eastM: 38000, northM: 14000, originElevationM: 1300 }, releases: [{ t: 0, altitudeM: 28900 }],
    wind: { towardDeg: 30, speedMS: 3 }, windsAloft: [{ atM: 10000, towardDeg: 60, speedMS: 15 }, { atM: 25000, towardDeg: 270, speedMS: 8 }], durationS: 600 },
  { id: "weather", balloon: "weather", site: { eastM: 30000, northM: 30000, originElevationM: 1300 }, releases: [{ t: 0, altitudeM: 28000 }],
    wind: { towardDeg: 30, speedMS: 3 }, windsAloft: [{ atM: 10000, towardDeg: 60, speedMS: 15 }, { atM: 25000, towardDeg: 270, speedMS: 8 }], durationS: 600 }
]))

// The field of a balloon fiesta's mass ascension, its balloons let go a few at a time; a lost foil balloon high over them.
const field = { name: "South of a balloon field, Albuquerque, New Mexico (assumed)", lat: 35.180, lng: -106.597 }
write("sky-test-balloons-day.json", recording("sky-test-balloons-day", {
  en: "A morning's mass ascension of hot-air balloons, their burners firing as they climb and level off at a few hundred metres, and a foil party balloon lost high over them, flashing the Sun as it turns. Place, date and balloons assumed.",
  fr: "L'envol groupé matinal de montgolfières, leurs brûleurs qui s'allument tandis qu'elles montent puis se stabilisent à quelques centaines de mètres, et un ballon métallisé perdu haut au-dessus d'elles, qui renvoie le Soleil en tournant. Lieu, date et ballons supposés.",
  es: "El despegue matinal en masa de globos aerostáticos, sus quemadores encendiéndose mientras suben y se estabilizan a unos cientos de metros, y un globo metalizado perdido muy por encima, que refleja el Sol al girar. Lugar, fecha y globos supuestos.",
  it: "Il decollo mattutino in massa di mongolfiere, i bruciatori che si accendono mentre salgono e si stabilizzano a qualche centinaio di metri, e un palloncino metallizzato perso in alto sopra di loro, che riflette il Sole girando. Luogo, data e palloni ipotizzati."
}, "2026-10-03T07:40:00", -6, 180, field, { headingDeg: 5, pitchDeg: 16, fovDeg: 60 }, 19, clear(180, 2),
{ en: "Balloons by day", fr: "Ballons de jour", es: "Globos de día", it: "Palloni di giorno" }, [
  // Let go from four minutes before the recording starts: some are already up, others still on the ground.
  { id: "ascension", balloon: "hot-air", site: { eastM: 0, northM: 700, originElevationM: 1520 },
    group: { count: 8, fromT: -240_000, untilT: 60_000, radiusM: 200, colors: ["#c8202f", "#1f5fbf", "#f08a00", "#2f9e44", "#7b2fbf", "#e0e0e0", "#d43f8d", "#14a3a3"], seed: 3 },
    plan: [{ t: 0, altitudeM: 350 }], wind: { towardDeg: 200, speedMS: 2 }, windsAloft: [{ atM: 400, towardDeg: 20, speedMS: 3 }], durationS: 300 },
  { id: "foil", balloon: "foil", site: { eastM: 500, northM: 1800, originElevationM: 1520 }, releases: [{ t: 0, altitudeM: 1200 }],
    wind: { towardDeg: 200, speedMS: 2 }, windsAloft: [{ atM: 1500, towardDeg: 60, speedMS: 6 }], durationS: 300 }
]))

// A garden on a summer night, some 400 m away across the flat fields of the Beauce: a party lets its LED balloons go one after the other.
const village = { name: "Edge of a village in the Beauce (assumed)", lat: 48.30, lng: 1.70 }
write("sky-test-balloons-night.json", recording("sky-test-balloons-night", {
  en: "LED balloons let go one after the other from a garden some 400 m away on a summer night, drifting off over the fields in a loose line, red, white and blue. Place, date and balloons assumed.",
  fr: "Des ballons à LED lâchés l'un après l'autre depuis un jardin à quelque 400 m par une nuit d'été, qui s'éloignent au-dessus des champs en une ligne lâche, rouges, blancs et bleus. Lieu, date et ballons supposés.",
  es: "Globos de LED soltados uno tras otro desde un jardín a unos 400 m en una noche de verano, que se alejan sobre los campos en una línea suelta, rojos, blancos y azules. Lugar, fecha y globos supuestos.",
  it: "Palloncini a LED lasciati andare uno dopo l'altro da un giardino a circa 400 m in una notte d'estate, che si allontanano sopra i campi in una fila irregolare, rossi, bianchi e blu. Luogo, data e palloni ipotizzati."
}, "2026-07-04T23:30:00", 2, 180, village, { headingDeg: 20, pitchDeg: 10, fovDeg: 60 }, 20, clear(240, 3),
{ en: "LED balloons", fr: "Ballons à LED", es: "Globos de LED", it: "Palloncini a LED" }, [
  { id: "led", balloon: "led", site: { eastM: 120, northM: 380, originElevationM: 140 },
    group: { count: 15, fromT: -30_000, untilT: 60_000, radiusM: 6, colors: ["#ff3030", "#ffffff", "#3070ff"], seed: 11 },
    wind: { towardDeg: 60, speedMS: 3 }, windsAloft: [{ atM: 500, towardDeg: 75, speedMS: 6 }], durationS: 240 }
]))
console.log("written")
