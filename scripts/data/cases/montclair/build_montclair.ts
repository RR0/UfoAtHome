/**
 * Writes Evan Cutler's sighting over Montclair, New Jersey, of the night of 29 to 30 November 2024, as a case (case-montclair.json): his account,
 * on each of the two nights it may have been, and the readings of it the Metabunk thread made, each against the aircraft the ADS-B record has
 * there at that time.
 *
 * Sources: the Metabunk thread "Claimed sighting of large drone, Montclair, New Jersey, 29th November 2024" (TEEJ, Mick West, Trailblazer), which
 * quotes his NewsNation interview; the ADS-B record of ADSB.lol (ODbL 1.0); Microsoft's building footprints (ODbL 1.0) for the houses round the
 * spot; ERA5 through Open-Meteo for the weather. Everything else is ASSUMED and says so.
 *
 * What he said: driving into Montclair on Grove Street at "about 1240 at night" on "Friday night", "right over the horizon I see what looks like
 * the full Moon", which then "is starting to move to the left and heading towards me", "way too big and way too low in the sky" for a plane. Where
 * he stood is where the thread puts him (TEEJ's map link, the point Trailblazer marks). "Friday night" is the night of Friday 29 November into
 * Saturday 30 (Trailblazer) or the small hours of Friday 29 (TEEJ's first reading): both are recorded, as two sightings of the case.
 *
 * The aircraft are not drawn here: the scene draws every aircraft the record has (a slice of it lies in public/aircraft, see
 * scripts/build-aircraft-demo-slice.ts), with its lights. A reading puts the one it names as a body where the record has it, of its type's model
 * and size, so that it can be set against what he saw (see BodyConfrontation).
 *
 * Needs the ADS-B archive of those two days: npm run fetch:aircraft -- --build 2024-11-29 2024-11-30, then the slice:
 *   node --import tsx scripts/build-aircraft-demo-slice.ts scripts/data/adsb/out <tmp> 2024-11-30 5 40.8517 -74.1944 (and 2024-11-29), merged into
 *   public/aircraft (its index.json lists every day it holds).
 * And the footprints of New Jersey, cut to 500 m round the spot (ms-buildings-500m.json, from NewJersey.geojson of
 * https://github.com/microsoft/USBuildingFootprints).
 *
 * Run with: node --import tsx scripts/data/cases/montclair/build_montclair.ts
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { gunzipSync } from "node:zlib"
import { AircraftTile } from "../../../../src/modules/providers/traffic/AircraftTile.js"
import { AircraftModels } from "../../../../src/engine/traffic/AircraftModels.js"
import { TrafficDecor } from "../../../../src/engine/traffic/TrafficDecor.js"
import { TrafficModels } from "../../../../src/engine/traffic/TrafficModels.js"
import { TrafficLights } from "../../../../src/engine/traffic/TrafficLights.js"
import { DroneAirframes } from "../../../../src/modules/interpretations/drones/DroneAirframe.js"
import type { AircraftDescription, AircraftPoint } from "../../../../src/engine/traffic/AircraftProvider.js"
import { TopoBuildings } from "../../../../src/render3d/terrain/TopoBuildings.js"
import { SurveyedDecor } from "../../../../src/render3d/terrain/SurveyedDecor.js"

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(here, "..", "..", "..", "..")
const demoData = path.join(root, "public", "demo-data")
const adsb = path.join(root, "scripts", "data", "adsb", "out")

/** A recording written over the one already there, keeping what other tools added to it: its cover, its snapshots taken by scripts/snapshot. */
function write(name: string, recording: Record<string, unknown>): void {
  const file = path.join(demoData, name)
  const kept: Record<string, unknown> = {}
  if (existsSync(file)) {
    const before = JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>
    if (before.image !== undefined) kept.image = before.image
    const snapshots = { ...(before.snapshots as object | undefined), ...(recording.snapshots as object | undefined) }
    if (Object.keys(snapshots).length > 0) kept.snapshots = snapshots
  }
  writeFileSync(file, JSON.stringify({ ...recording, ...kept }) + "\n")
}

type Text = { en: string, fr: string }
interface ValueSourceJson { document: Text, at?: string, url: string }
/** A value with its provenance: its basis, why, and, where it rests on a document, which (see ValueSource). */
const said = (value: unknown, basis: string, en: string, fr: string, source?: ValueSourceJson) => ({ value, basis, rationale: { en, fr }, ...(source ? { source } : {}) })
const r1 = (value: number) => Math.round(value * 10) / 10
const r3 = (value: number) => Math.round(value * 1000) / 1000

const THREAD = "https://www.metabunk.org/threads/claimed-sighting-of-large-drone-montclair-new-jersey-29th-november-2024.13826/"
const DOCUMENTS = {
  interview: { document: { en: "Evan Cutler interviewed by NewsNation, as quoted by TEEJ on Metabunk (post 5)", fr: "Evan Cutler interviewé par NewsNation, cité par TEEJ sur Metabunk (message 5)" }, url: THREAD },
  teej: { document: { en: "TEEJ on Metabunk (post 1): the spot on Grove Street, Newark's departures", fr: "TEEJ sur Metabunk (message 1) : le lieu sur Grove Street, les départs de Newark" }, url: THREAD },
  trailblazer: { document: { en: "Trailblazer on Metabunk (posts 16 and 17): Saturday 30 November, the Spirit flight lined up at 00:40", fr: "Trailblazer sur Metabunk (messages 16 et 17) : samedi 30 novembre, le vol Spirit aligné à 0 h 40" }, url: THREAD },
  calter: { document: { en: "Calter on Metabunk (post 14), on the size and height claimed", fr: "Calter sur Metabunk (message 14), sur la taille et la hauteur avancées" }, url: THREAD }
} satisfies Record<string, ValueSourceJson>

// ---- Where he was ----

/** The point of TEEJ's map link, on Grove Street at Mount Hebron Road, and the ground there (USGS 3DEP, 1 m). */
const SPOT = { lat: 40.8517119, lng: -74.1944201, groundM: 76.8 }
/**
 * Where he looked, which he does not say: two variants of his account, each a recording of the case.
 *
 * - "photo": the direction of TEEJ's Street View link (121°), which frames the view as his photograph does. It is also the one low gap in the
 *   roofs round the spot, 1 to 2.5 degrees high from 115 to 125.
 * - "road": ahead of him, driving south into Montclair down Grove Street (which runs from 17 to 28 degrees here, OpenStreetMap), where the roofs
 *   leave the lowest gap, 2.8 degrees high at 205 (the houses either side of the street stand 10).
 *
 * "right over the horizon" is just over the roofs in that direction (see the houses of surroundings()).
 */
interface Look { id: "photo" | "road", azimuthDeg: number, horizonDeg: number, title: Text, why: Text }
const LOOKS: Look[] = [
  {
    id: "road", azimuthDeg: 205, horizonDeg: 3.5,
    title: { en: "looking ahead down Grove Street", fr: "regardant devant lui dans Grove Street" },
    why: {
      en: "ASSUMED: ahead of him as he drove south into Montclair, where the roofs down the street leave the lowest gap",
      fr: "SUPPOSÉ : devant lui alors qu'il roulait vers le sud pour entrer dans Montclair, là où les toits de la rue laissent la trouée la plus basse"
    }
  },
  {
    id: "photo", azimuthDeg: 121, horizonDeg: 2.5,
    title: { en: "looking where his photograph does", fr: "regardant où regarde sa photo" },
    why: {
      en: "ASSUMED: the direction of the Street View TEEJ framed as the photograph is, the one low gap in the roofs round the spot",
      fr: "SUPPOSÉ : la direction de la vue Street View que TEEJ a cadrée comme la photo, la seule trouée basse dans les toits alentour"
    }
  }
]
const UTC_OFFSET_H = -5

// ---- The air traffic of the record ----

interface Flight { hex: string, description: AircraftDescription, points: AircraftPoint[] }

/** Every point the archive has of `hex` in `hours` (UTC) of `day`, in the tiles round the spot. */
function flightOf(day: string, hours: number[], hex: string): Flight {
  const points: AircraftPoint[] = []
  for (const hour of hours) {
    const name = String(hour).padStart(2, "0")
    const offsets = JSON.parse(readFileSync(path.join(adsb, day, `${name}.json`), "utf8")) as Record<string, [number, number]>
    const pack = readFileSync(path.join(adsb, day, `${name}.pack`))
    const hourMs = Date.parse(`${day}T${name}:00:00Z`)
    for (const key of ["40_-75", "40_-74", "41_-75", "41_-74"]) {
      const at = offsets[key]
      if (!at) continue
      for (const position of AircraftTile.decode(gunzipSync(pack.subarray(at[0], at[0] + at[1])))) {
        if (position.icao.toString(16).padStart(6, "0") !== hex) continue
        points.push({ t: hourMs + position.secondsInHour * 1000, lat: position.lat, lng: position.lng, altitudeFt: position.altitudeFt, groundSpeedKt: position.groundSpeedKt, trackDeg: position.trackDeg })
      }
    }
  }
  points.sort((a, b) => a.t - b.t)
  const shard = JSON.parse(readFileSync(path.join(adsb, day, "aircraft", `${hex.slice(0, 2)}.json`), "utf8")) as Record<string, [string, string, string, number]>
  const [registration, type, category] = shard[hex] ?? []
  if (points.length === 0) throw new Error(`${hex} is nowhere on ${day}`)
  return { hex, description: { registration, type, category }, points }
}

const OBSERVER_POINT = { lat: SPOT.lat, lng: SPOT.lng, heightM: SPOT.groundM }

/** Where the flight is seen from the spot at `ms`, between the record's two nearest points. */
function seen(flight: Flight, ms: number): { azimuthDeg: number, altitudeDeg: number, distanceKm: number, altitudeFt: number } {
  const after = flight.points.findIndex(point => point.t >= ms)
  const b = flight.points[Math.max(0, after)]
  const a = flight.points[Math.max(0, after - 1)]
  const f = b.t === a.t ? 0 : (ms - a.t) / (b.t - a.t)
  const point = { t: ms, lat: a.lat + (b.lat - a.lat) * f, lng: a.lng + (b.lng - a.lng) * f, altitudeFt: a.altitudeFt + (b.altitudeFt - a.altitudeFt) * f }
  const at = TrafficDecor.offsetOf(OBSERVER_POINT, point)
  return { azimuthDeg: (Math.atan2(at.eastM, at.northM) * 180 / Math.PI + 360) % 360, altitudeDeg: at.altitudeDeg, distanceKm: at.distanceKm, altitudeFt: point.altitudeFt }
}

/**
 * The flight as a body of a reading, from `startMs` for `durationS`: its type's model and size, where the record has it, keyed at each of its points,
 * so that it lies on the aircraft the scene draws from the same record (see TrafficDecor.from, whose placement this is).
 */
function bodyOf(flight: Flight, id: string, title: Text, startMs: number, durationS: number, explains: string[]) {
  const model = AircraftModels.of(flight.description)
  const size = TrafficDecor.sizeOf(model)
  const inside = flight.points.filter(point => point.t >= startMs - 10000 && point.t <= startMs + durationS * 1000 + 10000)
  const track = inside.map((point, i) => {
    const at = TrafficDecor.offsetOf(OBSERVER_POINT, point)
    const next = inside[Math.min(i + 1, inside.length - 1)]
    const heading = point.trackDeg ?? TrafficDecor.bearingDeg(at, TrafficDecor.offsetOf(OBSERVER_POINT, next))
    return {
      t: point.t - startMs, eastM: r1(at.eastM), northM: r1(at.northM), altitudeM: r1(at.upM),
      attitude: { headingDeg: r1(heading) },
      ...(i === 0 ? { sizeM: size, appearance: { color: "#dde0e4", albedo: 0.6 } } : {})
    }
  })
  const modelId = TrafficModels.idOf(model.code)
  // The lamps the scene draws on it from the record (see TrafficDecor), which the confrontation sizes the light he saw by (see BodyGlare).
  const lamps = [
    ...TrafficLights.lights(model, -30),
    ...TrafficLights.landingLights(model, -30, inside.map(point => ({ t: point.t - startMs, altitudeFt: point.altitudeFt })))
  ]
  return { id, title, explains, ...(modelId ? { model: { id: modelId } } : { model: { id: "poly-google-airliner" } }), lamps, track }
}

// ---- The houses round the spot ----

/** Microsoft's footprints within 500 m, as the boxes the scene draws a building as; two storeys and a pitched roof, ASSUMED: the footprints give no height. */
function surroundings() {
  const rings = JSON.parse(readFileSync(path.join(here, "ms-buildings-500m.json"), "utf8")) as [number, number][][]
  const features = rings.map(ring => ({ geometry: { type: "Polygon", coordinates: [ring] }, properties: { nombre_d_etages: 2 } }))
  const buildings = TopoBuildings.buildings(features as never, SPOT, 500, 12, 600).map(building => {
    const riseM = r1(Math.min(4, Math.max(1.5, 0.29 * Math.min(building.widthM, building.lengthM))))
    return { ...building, heightM: r1(building.heightM + riseM), roof: { shape: "gable" as const, riseM, color: "#5b5550" }, facade: { color: "#d9d2c3" } }
  })
  const { planted } = SurveyedDecor.of("ms-buildings", { trees: [], buildings, bridges: [], lines: [] }, { kept: [], kindName: () => "Building" })
  let n = 0
  return planted.map(object => ({ ...object, title: { en: `House ${++n}`, fr: `Maison ${n}`, es: `Casa ${n}`, it: `Casa ${n}` }, origin: "ms-buildings" }))
}

// ---- What he saw ----

const LIGHT = "light"
/** "what looks like the full Moon", "right over the horizon", then "starting to move to the left and heading towards me". */
function timeline(look: Look, atS: number, endS: number) {
  // Compared with an object he knows, not estimated at arm's length: what its law of error is (see WitnessError, "recalled-object").
  const fullMoon = {
    ...said({ widthDeg: 0.52, heightDeg: 0.52 }, "stated",
      "\"what looks like the full Moon\": as large as the full Moon looks, half a degree",
      "« ce qui ressemble à la pleine Lune » : aussi grand que la pleine Lune paraît, un demi-degré", DOCUMENTS.interview),
    how: "recalled-object"
  }
  return {
    keyframes: [
      {
        t: atS * 1000,
        shapes: [{
          sourceId: LIGHT,
          shape: {
            kind: "oval", bounds: { x: 0, y: 0, width: 10, height: 10 }, color: "#fff6e6", angle: 0, transparency: 0, haloScale: 1.2, brightness: 0.8, selected: false,
            title: { en: "The light \"like the full Moon\"", fr: "La lumière « comme la pleine Lune »", es: "La luz «como la luna llena»", it: "La luce «come la luna piena»" },
            // "right over the horizon": the direction is ASSUMED (he names none, see LOOKS), the height is his, over the roofs there.
            aim: { azimuthDeg: look.azimuthDeg, altitudeDeg: look.horizonDeg },
            angular: fullMoon
          }
        }]
      },
      // "starting to move to the left and heading towards me": left, higher, larger by the end of the recording; how far and how fast is ASSUMED, the
      // account saying no more.
      { t: endS * 1000, shapes: [{ sourceId: LIGHT, shape: { aim: { azimuthDeg: look.azimuthDeg - 8, altitudeDeg: look.horizonDeg + 4 }, angular: { widthDeg: 0.8, heightDeg: 0.8 } } }] }
    ],
    order: [LIGHT],
    groups: []
  }
}

/** His own reading: "a large drone the size of a school bus or two car garage", "way too low": as large as that at the distance where it looks as the Moon does. */
function hisReading(look: Look, startS: number, endS: number) {
  const widthM = 12
  const distanceM = Math.round(widthM / (0.52 * Math.PI / 180))
  const heightM = Math.round(distanceM * Math.sin(look.horizonDeg * Math.PI / 180))
  return {
    title: {
      en: `A drone the size of a school bus (some ${widthM} m), ${(distanceM / 1000).toFixed(1)} km off and ${heightM} m up, as large as he said it was and as near as that makes it (his own reading)`,
      fr: `Un drone de la taille d'un bus scolaire (quelque ${widthM} m), à ${(distanceM / 1000).toFixed(1).replace(".", ",")} km et ${heightM} m de haut, aussi grand qu'il l'a dit et aussi proche que cela l'impose (sa propre lecture)`
    },
    bodies: [{
      id: "drone",
      title: { en: "A drone the size of a school bus", fr: "Un drone de la taille d'un bus scolaire" },
      explains: [LIGHT],
      // As round as he saw it, "like the full Moon": the size he gave every way.
      model: { id: "sphere" },
      track: [
        {
          t: startS * 1000, azimuthDeg: look.azimuthDeg, altitudeDeg: look.horizonDeg, distanceM,
          sizeM: said({ widthM, lengthM: widthM, heightM: widthM }, "stated",
            "\"the size of a school bus or two car garage\": some 12 m across, round as he saw it",
            "« de la taille d'un bus scolaire ou d'un garage double » : quelque 12 m de large, rond comme il l'a vu", DOCUMENTS.teej),
          appearance: { color: "#fff6e6", luminanceCdM2: 2500 }
        },
        { t: endS * 1000, azimuthDeg: look.azimuthDeg - 8, altitudeDeg: look.horizonDeg + 4, distanceM: Math.round(distanceM * 0.52 / 0.8) }
      ]
    }]
  }
}

// ---- What would look as large: the size comparisons ----

/** The full Moon's half degree, which is what he said the light looked: the angle every comparison is made at. */
const MOON_RAD = 0.52 * Math.PI / 180
const APPROACH_MS = 75

/** East, north and up from his eye of a point `distanceM` off towards `azimuthDeg`, `altitudeDeg`. */
function towards(azimuthDeg: number, altitudeDeg: number, distanceM: number): { eastM: number, northM: number, upM: number } {
  const a = azimuthDeg * Math.PI / 180, e = altitudeDeg * Math.PI / 180
  return { eastM: distanceM * Math.cos(e) * Math.sin(a), northM: distanceM * Math.cos(e) * Math.cos(a), upM: distanceM * Math.sin(e) }
}

/**
 * An airliner of `type` as large as the light looked, half a degree across its span, where he first saw it, flying level straight at him at an
 * approach speed with its landing lights on, over him and on: what an aircraft that size has to be that near for, and how soon it would be on him.
 * Drawn as the scene draws a recorded aircraft (a decor object with the lights of its type, see TrafficLights), with the body that claims the light.
 */
function airlinerAsLarge(look: Look, night: Night, type: string, name: Text) {
  const model = AircraftModels.of({ type })
  const size = TrafficDecor.sizeOf(model)
  const distanceM = size.widthM / MOON_RAD
  const seenAt = towards(look.azimuthDeg, look.horizonDeg, distanceM)
  const headingDeg = (look.azimuthDeg + 180) % 360
  const along = (t: number) => {
    const run = APPROACH_MS * (t - night.lightAtS)
    const h = headingDeg * Math.PI / 180
    return { eastM: r1(seenAt.eastM + run * Math.sin(h)), northM: r1(seenAt.northM + run * Math.cos(h)) }
  }
  const altitudeM = r1(seenAt.upM + 1.6)
  const times = [0, night.lightAtS, night.durationS]
  const modelId = TrafficModels.idOf(model.code) ?? "poly-google-airliner"
  const lights = [
    ...TrafficLights.lights(model, -30),
    ...TrafficLights.landingLights(model, -30, [{ t: 0, altitudeFt: altitudeM / 0.3048 }, { t: night.durationS * 1000, altitudeFt: altitudeM / 0.3048 }])
  ]
  const decor = {
    id: `${type.toLowerCase()}-as-large`, kind: "aircraft", title: name, ...along(0), headingDeg, sizeM: size, model: { id: modelId },
    color: TrafficLights.bodyColor(model), lights, aircraftSound: model.kind,
    track: times.map(t => ({ t: t * 1000, ...along(t), altitudeM, headingDeg }))
  }
  const km = (distanceM / 1000).toFixed(1)
  const meetS = Math.round(distanceM / APPROACH_MS)
  const title = {
    en: `Size comparison: an ${name.en} (${size.widthM} m span) as large as he said the light looked, half a degree, is ${km} km off and ${Math.round(seenAt.upM)} m up; flying at him at ${APPROACH_MS} m/s, it is over him ${meetS} s later`,
    fr: `Comparaison de taille : un ${name.fr} (${String(size.widthM).replace(".", ",")} m d'envergure) aussi grand qu'il a dit que la lumière paraissait, un demi-degré, est à ${km.replace(".", ",")} km et ${Math.round(seenAt.upM)} m de haut ; volant vers lui à ${APPROACH_MS} m/s, il est au-dessus de lui ${meetS} s plus tard`
  }
  const body = {
    id: `${type.toLowerCase()}-as-large`, title: name, explains: [LIGHT], model: { id: modelId }, lamps: lights,
    track: times.map((t, i) => ({
      t: t * 1000, ...along(t), altitudeM: r1(altitudeM - size.heightM / 2), attitude: { headingDeg },
      ...(i === 0 ? { sizeM: size, appearance: { color: "#dde0e4", albedo: 0.6 } } : {})
    }))
  }
  return { title, decor, bodies: [body] }
}

/**
 * A consumer quadcopter (a DJI Mavic 3, see DroneAirframes) as large as the light looked: where it has to be for its 51 cm to fill half a degree,
 * hovering there, then drifting left and nearer as the light did: the drone the wave was about, at the distance his words put it.
 */
function quadcopterAsLarge(look: Look, night: Night) {
  const airframe = DroneAirframes.byId("quadcopter")
  const distanceM = airframe.sizeM.widthM / MOON_RAD
  const point = (azimuthDeg: number, altitudeDeg: number, d: number, t: number) => {
    const at = towards(azimuthDeg, altitudeDeg, d)
    return { t: t * 1000, eastM: r1(at.eastM), northM: r1(at.northM), altitudeM: r1(at.upM + 1.6) }
  }
  const first = point(look.azimuthDeg, look.horizonDeg, distanceM, night.lightAtS)
  const last = point(look.azimuthDeg - 8, look.horizonDeg + 4, distanceM * 0.52 / 0.8, night.durationS)
  const title = {
    en: `Size comparison: a consumer quadcopter (a Mavic 3, 51 cm) as large as he said the light looked, half a degree, is ${Math.round(distanceM)} m from him and ${Math.round(first.altitudeM)} m up, its lights a few points`,
    fr: `Comparaison de taille : un quadricoptère grand public (un Mavic 3, 51 cm) aussi grand qu'il a dit que la lumière paraissait, un demi-degré, est à ${Math.round(distanceM)} m de lui et ${Math.round(first.altitudeM)} m de haut, ses feux quelques points`
  }
  return {
    title,
    drones: [{ id: "mavic", title: { en: "A Mavic 3", fr: "Un Mavic 3" }, airframe: "quadcopter", explains: [LIGHT], seed: 3, path: [{ ...first, t: 0 }, first, last] }]
  }
}

// ---- The nights ----

interface Night { day: string, id: string, start: string, durationS: number, lightAtS: number, title: Text, summary: Text }

/** ERA5 at the spot (Open-Meteo, 05:00 UTC): clear both nights, a westerly of some 3 m/s. */
const WEATHER = {
  "2024-11-29": { relativeHumidity: 0.7, windDirectionDeg: 300, windSpeed: 4 },
  "2024-11-30": { relativeHumidity: 0.63, windDirectionDeg: 279, windSpeed: 3.2 }
} as const

function recording(night: Night, look: Look, decorFile: string) {
  const startMs = Date.parse(`${night.start}Z`) - UTC_OFFSET_H * 3600000
  const weather = WEATHER[night.day as keyof typeof WEATHER]
  return {
    startMs,
    json: {
      version: 4,
      id: `${night.id}-${look.id}`,
      time: night.start,
      utcOffsetHours: UTC_OFFSET_H,
      timeZone: "America/New_York",
      durationSeconds: night.durationS,
      place: { name: "Grove Street at Mount Hebron Road, Montclair, New Jersey", locations: [{ lat: SPOT.lat, lng: SPOT.lng }] },
      observer: { id: "CutlerEvan", title: "Evan Cutler" },
      description: { en: `${night.summary.en} Seen ${look.title.en}: ${look.why.en}.`, fr: `${night.summary.fr} Vu ${look.title.fr} : ${look.why.fr}.` },
      tags: ["US", "NJ drone wave 2024", "aircraft", "misidentification"],
      sources: [
        { title: "Claimed sighting of large drone, Montclair, New Jersey, 29th November 2024", url: THREAD, publication: { publisher: "Metabunk", time: "2024-12-12" } },
        { title: "Interview of Evan Cutler", url: "https://www.youtube.com/watch?v=fLJrYbcIkiI", publication: { publisher: "NewsNation", time: "2024-12" } },
        { title: "Aircraft positions (ADS-B) of the night, globe_history releases", url: "https://github.com/adsblol", publication: { publisher: "ADSB.lol feeders and contributors (ODbL 1.0)" } },
        { title: "US Building Footprints (the houses round the spot; their heights are assumed)", url: "https://github.com/microsoft/USBuildingFootprints", publication: { publisher: "Microsoft (ODbL 1.0)" } },
        { title: "ERA5 reanalysis, hourly, through the Open-Meteo archive", url: "https://open-meteo.com/en/docs/historical-weather-api", publication: { publisher: "Copernicus / ECMWF, Open-Meteo" } }
      ],
      instrument: "eye",
      lightPollution: 18.46,
      weatherTrack: {
        keyframes: [{
          t: 0,
          weather: {
            cloudCover: said(0, "measured", "ERA5 at the spot, 05:00 UTC: no cloud", "ERA5 au lieu, 5 h UTC : aucun nuage"),
            cloudDarkness: 0, cloudBaseM: 2500, lowerCloudCover: 0, highCloudCover: 0, relativeHumidity: weather.relativeHumidity,
            precipitationType: "none", precipitationIntensity: 0, windDirectionDeg: weather.windDirectionDeg, windSpeed: weather.windSpeed, storm: false
          }
        }]
      },
      observerTrack: {
        keyframes: [{ t: 0, pose: { lat: SPOT.lat, lng: SPOT.lng, elevationM: 0, headingDeg: look.azimuthDeg, pitchDeg: 4, fovDeg: 60 } }]
      },
      timeline: timeline(look, night.lightAtS, night.durationS),
      soundTrack: { keyframes: [] },
      snapshots: {
        decor: {
          src: decorFile, takenOn: "2026-11-18",
          attribution: "Building footprints © Microsoft, US Building Footprints (ODbL 1.0); two storeys and a pitched roof assumed for each"
        }
      },
      interpretation: hisReading(look, night.lightAtS, night.durationS)
    }
  }
}

function main(): void {
  const decorFile = "montclair.decor.json"
  const decor = surroundings()
  writeFileSync(path.join(demoData, decorFile), JSON.stringify({ version: 4, takenOn: "2026-11-18", attribution: "Building footprints © Microsoft, US Building Footprints (ODbL 1.0)", decor }) + "\n")
  console.log(`${decor.length} houses`)

  // Saturday 30 November, the night Trailblazer argues for: from 00:38 to the Spirit flight's pass over him.
  const saturday: Night = {
    day: "2024-11-30", id: "2024-11-30-CutlerEvan", start: "2024-11-30T00:38:00", durationS: 420, lightAtS: 120,
    title: { en: "Evan Cutler, the night of Friday to Saturday 30 November", fr: "Evan Cutler, la nuit du vendredi au samedi 30 novembre" },
    summary: {
      en: "Driving into Montclair on Grove Street at about 00:40, Evan Cutler sees \"what looks like the full Moon\" right over the horizon, which starts to move to the left and comes towards him: too big and too low to be a plane, he says. The night of Friday into Saturday 30 November, as Trailblazer reads \"Friday night\".",
      fr: "Entrant dans Montclair par Grove Street vers 0 h 40, Evan Cutler voit « ce qui ressemble à la pleine Lune » juste au-dessus de l'horizon, qui se met à aller vers la gauche et vient vers lui : trop grand et trop bas pour un avion, dit-il. La nuit du vendredi au samedi 30 novembre, comme Trailblazer lit « vendredi soir »."
    }
  }
  // Friday 29 November, the small hours TEEJ first took: from TAP's departure at 00:28 to Turkish's climb past him.
  const friday: Night = {
    day: "2024-11-29", id: "2024-11-29-CutlerEvan", start: "2024-11-29T00:27:00", durationS: 1200, lightAtS: 780,
    title: { en: "Evan Cutler, the small hours of Friday 29 November", fr: "Evan Cutler, au petit matin du vendredi 29 novembre" },
    summary: {
      en: "The same account, set on the small hours of Friday 29 November, as TEEJ first read \"Friday night\", from 00:27: two departures from Newark climb east past Montclair, TAP's A321neo at 00:28 and Turkish's A350 at 00:39.",
      fr: "Le même récit, placé au petit matin du vendredi 29 novembre, comme TEEJ a d'abord lu « vendredi soir », à partir de 0 h 27 : deux départs de Newark montent vers l'est en passant Montclair, l'A321neo de TAP à 0 h 28 et l'A350 de Turkish à 0 h 39."
    }
  }
  const accounts = (night: Night, short: string) => LOOKS.map(look => {
    const made = recording(night, look, decorFile)
    const file = `observer-montclair-${night.day}-${look.id}.json`
    write(file, made.json)
    const event = { type: "event", eventType: "sighting", id: `cutler-${short}-${look.id}`, time: `${night.start.slice(0, 10)} ${night.start.slice(11, 16)}`, title: { en: `${night.title.en}, ${look.title.en}`, fr: `${night.title.fr}, ${look.title.fr}` }, url: file }
    return { ...made, look, event }
  })
  const sat = accounts(saturday, "30")
  const fri = accounts(friday, "29")

  // ---- The readings ----
  const spirit = flightOf("2024-11-30", [5], "acca85")
  const turkish = flightOf("2024-11-29", [5], "4bb0e2")
  const tap = flightOf("2024-11-29", [5], "49530a")
  const at = (flight: Flight, local: string) => seen(flight, Date.parse(`${local}Z`) - UTC_OFFSET_H * 3600000)
  const lined = at(spirit, "2024-11-30T00:40:00")
  const over = spirit.points.map(point => ({ point, at: seen(spirit, point.t) })).filter(entry => entry.point.t < Date.parse("2024-11-30T05:46:00Z")).reduce((a, b) => a.at.distanceKm < b.at.distanceKm ? a : b)
  console.log(`Spirit at 00:40: az ${lined.azimuthDeg.toFixed(1)} alt ${lined.altitudeDeg.toFixed(2)} at ${lined.distanceKm.toFixed(1)} km, ${Math.round(lined.altitudeFt)} ft; nearest ${over.at.distanceKm.toFixed(2)} km at ${new Date(over.point.t).toISOString()}`)
  const spanDeg = (flight: Flight, km: number) => AircraftModels.of(flight.description).spanM / (km * 1000) * 180 / Math.PI
  console.log(`span seen: ${spanDeg(spirit, lined.distanceKm).toFixed(2)} deg at 00:40, ${spanDeg(spirit, over.at.distanceKm).toFixed(2)} deg overhead`)

  /** The same reading of each variant of the account: a recording each, as a reading is the account it reads with the bodies it claims. */
  const reading = (accounts: { json: Record<string, unknown>, startMs: number, look: Look, event: { id: string } }[], file: string, id: string, title: Text, bodies: (startMs: number) => unknown[]) =>
    accounts.map(account => {
      const named = `${file}-${account.look.id}.json`
      write(named, { ...account.json, id: `${account.json.id}-${id}`, interpretation: { title, bodies: bodies(account.startMs) } })
      return { type: "event", eventType: "sighting", interpretationOf: account.event.id, title, url: named }
    })
  const nearKm = over.at.distanceKm.toFixed(1)
  const spiritReading = reading(sat, "interpretation-montclair-spirit-nks1862", "nks1862", {
    en: `Spirit NKS1862, an A320neo (N923NK) coming down to Newark at ${Math.round(lined.altitudeFt / 50) * 50} ft, flying straight at him at 00:40 with its landing lights on, and passing ${nearKm} km from him three minutes later (Trailblazer)`,
    fr: `Spirit NKS1862, un A320neo (N923NK) qui descend vers Newark à ${Math.round(lined.altitudeFt / 50) * 50} ft, volant droit sur lui à 0 h 40 phares d'atterrissage allumés, et passant à ${nearKm.replace(".", ",")} km de lui trois minutes plus tard (Trailblazer)`
  }, startMs => [bodyOf(spirit, "nks1862", { en: "Spirit NKS1862 (A320neo N923NK)", fr: "Spirit NKS1862 (A320neo N923NK)" }, startMs, saturday.durationS, [LIGHT])])
  const turkishReading = reading(fri, "interpretation-montclair-turkish-tc-lgb", "tc-lgb", {
    en: "Turkish Airlines' A350-900 TC-LGB, off Newark at 00:39 and climbing east past him, 11.6 km off at its nearest (TEEJ)",
    fr: "L'A350-900 TC-LGB de Turkish Airlines, parti de Newark à 0 h 39 et montant vers l'est en le dépassant, à 11,6 km au plus près (TEEJ)"
  }, startMs => [bodyOf(turkish, "tc-lgb", { en: "Turkish Airlines A350-900 TC-LGB", fr: "A350-900 TC-LGB de Turkish Airlines" }, startMs, friday.durationS, [LIGHT])])
  const tapReading = reading(fri, "interpretation-montclair-tap-cs-txj", "cs-txj", {
    en: "TAP Air Portugal's A321neo CS-TXJ, off Newark at 00:28 and turning towards him as it climbs, which makes it bright and still for a while (TEEJ, Mick West)",
    fr: "L'A321neo CS-TXJ de TAP Air Portugal, parti de Newark à 0 h 28 et tournant vers lui en montant, ce qui le rend brillant et immobile un moment (TEEJ, Mick West)"
  }, startMs => [bodyOf(tap, "cs-txj", { en: "TAP Air Portugal A321neo CS-TXJ", fr: "A321neo CS-TXJ de TAP Air Portugal" }, startMs, friday.durationS, [LIGHT])])

  // The size comparisons, on the night the Spirit reading is about, each direction: what is as large as he said at once, and how near it then is.
  const comparison = (file: string, id: string, made: (look: Look) => { title: Text, decor?: object, bodies?: unknown[], drones?: unknown[] }) =>
    sat.map(account => {
      const { title, decor, ...rest } = made(account.look)
      const named = `${file}-${account.look.id}.json`
      const stated = decor ? { decor: [decor] } : {}
      write(named, { ...account.json, ...stated, id: `${account.json.id}-${id}`, interpretation: { title, bodies: [], ...rest } })
      return { type: "event", eventType: "sighting", interpretationOf: account.event.id, title, url: named }
    })
  const asQuadcopter = comparison("interpretation-montclair-size-quadcopter", "size-quadcopter", look => quadcopterAsLarge(look, saturday))
  const asA320 = comparison("interpretation-montclair-size-a320", "size-a320", look => airlinerAsLarge(look, saturday, "A320", { en: "Airbus A320", fr: "Airbus A320" }))
  const asA350 = comparison("interpretation-montclair-size-a350", "size-a350", look => airlinerAsLarge(look, saturday, "A359", { en: "Airbus A350-900", fr: "Airbus A350-900" }))
  console.log(asA320[0].title.en)
  console.log(asQuadcopter[0].title.en)

  const caseJson = {
    id: "Montclair2024",
    title: "Montclair",
    summary: {
      en: "Night of 29 to 30 November 2024, New Jersey's drone wave. Driving into Montclair, Evan Cutler sees a light \"like the full Moon\" right over the horizon, which comes towards him, and takes it for a drone the size of a school bus. Replayed on both nights \"Friday night\" may mean, looking either ahead down the street or where his photograph looks, with every aircraft of the ADS-B record and the readings of the Metabunk thread: the Spirit A320neo lined up with him at 00:40 on the 30th, the Newark departures of the 29th, and his own drone.",
      fr: "Nuit du 29 au 30 novembre 2024, vague de drones du New Jersey. En entrant dans Montclair, Evan Cutler voit une lumière « comme la pleine Lune » juste au-dessus de l'horizon, qui vient vers lui, et la prend pour un drone de la taille d'un bus scolaire. Rejoué sur les deux nuits que « vendredi soir » peut désigner, regardant soit devant lui dans la rue, soit où regarde sa photo, avec tous les avions du relevé ADS-B et les lectures du fil Metabunk : l'A320neo de Spirit aligné sur lui à 0 h 40 le 30, les départs de Newark du 29, et son propre drone."
    },
    time: "2024-11-30 00:40",
    events: [
      ...sat.map(account => account.event),
      ...spiritReading,
      ...asQuadcopter,
      ...asA320,
      ...asA350,
      ...fri.map(account => account.event),
      ...turkishReading,
      ...tapReading
    ]
  }
  writeFileSync(path.join(demoData, "case-montclair.json"), JSON.stringify(caseJson, null, 1) + "\n")
  for (const [name, flight, local] of [["TC-LGB", turkish, "2024-11-29T00:43:26"], ["CS-TXJ", tap, "2024-11-29T00:32:29"]] as const) {
    const s = at(flight, local)
    console.log(`${name} at ${local}: az ${s.azimuthDeg.toFixed(1)} alt ${s.altitudeDeg.toFixed(2)} ${s.distanceKm.toFixed(1)} km, span ${spanDeg(flight, s.distanceKm).toFixed(2)} deg`)
  }
}

main()
