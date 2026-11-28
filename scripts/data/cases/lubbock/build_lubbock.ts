/**
 * Writes the Lubbock case (public/demo-data/case-lubbock.json and the files it names): the first flight the four Texas Tech professors saw
 * from Dr Robinson's back yard on 25 August 1951 at 21:20, one recording per professor, and two readings of it for each, the Air Force's
 * ducks and the plovers of Ruppelt's lead, birds lit from below by the mercury-vapour lamps of the boulevard near by.
 *
 * Source: Edward J. Ruppelt, The Report on Unidentified Flying Objects (1956), chapter 8, "The Lubbock Lights, Unabridged", as rr0.org
 * keeps it (time/1/9/5/6/Ruppelt_TheReportOnUFOs/08), what the four told him in Lubbock in late September 1951; the rr0.org dossier
 * (science/crypto/ufo/enquete/dossier/Lubbock) for the Air Force's conclusion.
 *
 * What is STATED: the place (Robinson's back yard), the hour (nine twenty), the four of them sitting there drinking tea, the lights
 * "directly over their heads", north to south, a "weird bluish green", fifteen to thirty of them in a semicircle, no sound, too fast
 * for anyone to get a good look. What is ASSUMED, the account giving none of it for that first flight: where in Lubbock the yard is,
 * where each sat, who saw them first, that they came into sight 45° up in the north and went out 45° up in the south and crossed the 90°
 * between in three seconds (what the professors measured of their later flights), and how wide the semicircle was (the ten degrees that
 * Ruppelt's own figures for it imply).
 *
 * Run with: node --import tsx scripts/data/cases/lubbock/build_lubbock.ts
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(here, "..", "..", "..", "..")
const demoData = path.join(root, "public", "demo-data")

/** A recording written over the one already there, keeping what other tools added to it: its cover, its snapshots taken by scripts/snapshot. */
function write(name: string, recording: Record<string, unknown>): void {
  const file = path.join(demoData, name)
  const kept: Record<string, unknown> = {}
  if (existsSync(file)) {
    const before = JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>
    if (before.image !== undefined) kept.image = before.image
    if (before.summaryTime !== undefined && recording.summaryTime === undefined) kept.summaryTime = before.summaryTime
    const snapshots = { ...(before.snapshots as object | undefined), ...(recording.snapshots as object | undefined) }
    if (Object.keys(snapshots).length > 0) kept.snapshots = snapshots
  }
  writeFileSync(file, JSON.stringify({ ...recording, ...kept }) + "\n")
}

type Text = { en: string, fr: string, es?: string, it?: string }
interface ValueSourceJson { document: Text, at?: string, url: string }
/** A value with its provenance: its basis, why, and, where it rests on a document, which (see ValueSource). */
const said = (value: unknown, basis: string, en: string, fr: string, source?: ValueSourceJson) => ({ value, basis, rationale: { en, fr }, ...(source ? { source } : {}) })
const r1 = (value: number) => Math.round(value * 10) / 10
const r2 = (value: number) => Math.round(value * 100) / 100
const DEG = Math.PI / 180

const RUPPELT_URL = "https://rr0.org/time/1/9/5/6/Ruppelt_TheReportOnUFOs/08/"
const RUPPELT: ValueSourceJson = {
  document: { en: "Edward J. Ruppelt, The Report on Unidentified Flying Objects (1956), ch. 8, \"The Lubbock Lights, Unabridged\"", fr: "Edward J. Ruppelt, The Report on Unidentified Flying Objects (1956), chap. 8, « Les lumières de Lubbock, intégral »" },
  url: RUPPELT_URL
}
const DOSSIER_URL = "https://rr0.org/science/crypto/ufo/enquete/dossier/Lubbock/"
const SOURCES = [
  { title: "The Lubbock Lights, Unabridged (The Report on Unidentified Flying Objects, ch. 8)", authors: ["Edward J. Ruppelt"], url: RUPPELT_URL, publication: { publisher: "Doubleday", time: "1956" } },
  { title: "Have We Visitors From Space?", authors: ["H. B. Darrach Jr.", "Robert Ginna"], url: "https://rr0.org/time/1/9/5/2/04/07/HaveWeVisitorsFromSpace_Life/", publication: { publisher: "Life", time: "1952-04-07" } },
  { title: "Les lumières de Lubbock", url: DOSSIER_URL, publication: { publisher: "RR0" } }
]

// ---- Where and when ----

/**
 * The back yard, ASSUMED: Ruppelt does not give Robinson's address, only that "the place where the professors had made their observations
 * was close to" a boulevard lit by mercury-vapour lamps. Taken behind a house on the south side of 19th Street, the boulevard along the
 * south of the Texas Tech campus, some 60 m from it.
 */
const YARD = { lat: 33.577328, lng: -101.878274, groundM: 990 }
/** Where the fetch of the houses round it was centred (scripts/fetch-surroundings.ts, --osm, 250 m): the yard is 8 m east and 12 m north of it. */
const FETCH_CENTRE_OFFSET = { eastM: 8, northM: 12 }
/** A seated man's eye, 1.35 m above the ground as the seated figures have it (scripts/people/build_seated.py): 0.25 m under a standing one's (see BodyPlacement.EYE_HEIGHT_M). */
const SEATED_M = -0.25
const EYE_UP_M = 1.6 + SEATED_M
/** "At nine twenty". Central Standard Time: Texas kept no summer time in 1951. */
const TIME = "1951-08-25T21:20:00"
const FOV = 65

// ---- What they saw ----

/** The ms of the recording at which the lights come into sight (45° up in the north), and the three seconds they take to go out 45° up in the south. */
const T0 = 1500
const CROSSING_MS = 3000
const T_OUT = T0 + CROSSING_MS
const DURATION_MS = 8500
const LIGHTS = 20
/** Half the semicircle's width, degrees: Ruppelt's 1,750 feet across at 10,000 feet is ten degrees across. */
const HALF_WIDTH_DEG = 5

type Vec = [number, number, number]
const norm = (v: Vec): Vec => { const l = Math.hypot(...v); return [v[0] / l, v[1] / l, v[2] / l] }
const add = (a: Vec, b: Vec, k = 1): Vec => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k]
const cross = (a: Vec, b: Vec): Vec => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
/** East, north, up of a direction, from its azimuth and elevation. */
const direction = (azimuthDeg: number, altitudeDeg: number): Vec =>
  [Math.cos(altitudeDeg * DEG) * Math.sin(azimuthDeg * DEG), Math.cos(altitudeDeg * DEG) * Math.cos(azimuthDeg * DEG), Math.sin(altitudeDeg * DEG)]
const aimOf = (v: Vec) => {
  const [e, n, u] = norm(v)
  const altitudeDeg = Math.asin(Math.max(-1, Math.min(1, u))) / DEG
  let azimuthDeg = Math.atan2(e, n) / DEG
  if (azimuthDeg < 0) azimuthDeg += 360
  return { azimuthDeg: r2(azimuthDeg), altitudeDeg: r2(altitudeDeg) }
}

/** How far along the meridian, degrees from the northern horizon over the zenith, the middle of the formation is at `t`: 45 at T0, 135 when it goes out. */
const along = (t: number) => 45 + 90 * (t - T0) / CROSSING_MS
/** The middle of the formation at `t`, and the way it goes (south along the meridian, over the zenith). */
function centre(t: number): { at: Vec, ahead: Vec } {
  const phi = along(t) * DEG
  return { at: [0, Math.cos(phi), Math.sin(phi)], ahead: [0, Math.sin(phi), -Math.cos(phi)] }
}

/** Each light of the semicircle at `t`: its middle light ahead, the two ends trailing by a half-width (ASSUMED: which way it was open is not said). */
function lightsAt(t: number) {
  const { at, ahead } = centre(t)
  const side = cross(at, ahead)
  const out = []
  for (let k = 0; k < LIGHTS; k++) {
    const a = (-90 + 180 * k / (LIGHTS - 1)) * DEG
    const sideDeg = HALF_WIDTH_DEG * Math.sin(a), aheadDeg = HALF_WIDTH_DEG * (Math.cos(a) - 1) + HALF_WIDTH_DEG / 2
    out.push(aimOf(add(add(at, ahead, Math.tan(aheadDeg * DEG)), side, Math.tan(sideDeg * DEG))))
  }
  return out
}

const LIGHT_IDS = Array.from({ length: LIGHTS }, (_, k) => `light-${k + 1}`)
const BLUISH_GREEN = "#86e3c9"

/** The lights as they told them: twenty points of a weird bluish green in a semicircle, crossing the sky overhead from north to south in three seconds. */
function timeline() {
  const keyframes: { t: number, shapes: unknown[] }[] = []
  const first = lightsAt(T0)
  keyframes.push({
    t: T0 - 40,
    shapes: LIGHT_IDS.map((sourceId, k) => ({
      sourceId,
      shape: {
        kind: "oval", bounds: { x: 0, y: 0, width: 2, height: 2 }, angle: 0, transparency: 1, haloScale: 0.9, selected: false,
        brightness: k === 0 ? said(0, "stated", "\"soft, glowing\" lights (Ruppelt, ch. 8), \"dull\" ones as everybody in Lubbock told them: lights one could look at, whose colour did not go white", "des lumières « douces, luisantes » (Ruppelt, chap. 8), « ternes » comme tout Lubbock les décrivit : des lumières qu'on pouvait regarder, dont la couleur ne blanchissait pas", RUPPELT) : 0,
        color: k === 0 ? said(BLUISH_GREEN, "stated", "\"The lights were a weird bluish green color\" (Ruppelt, ch. 8)", "« Les lumières étaient d'une étrange couleur bleu-vert » (Ruppelt, chap. 8)", RUPPELT) : BLUISH_GREEN,
        title: { en: `Bluish green light ${k + 1}`, fr: `Lumière bleu-vert ${k + 1}`, es: `Luz verdiazul ${k + 1}`, it: `Luce verde-azzurra ${k + 1}` },
        aim: k === 0 ? said(first[k], "assumed",
          "where it came into sight: 45° up in the northern sky, as the professors measured their later flights (\"suddenly appeared 45 degrees above the northern horizon\"); for this first one Ruppelt says only that it went over \"directly over their heads\"",
          "où elle est apparue : à 45° de hauteur au nord, comme les professeurs le mesurèrent pour leurs vols suivants ; pour ce premier vol Ruppelt dit seulement qu'il passa « juste au-dessus de leurs têtes »", RUPPELT) : first[k],
        angular: k === 0 ? said({ widthDeg: 0.25, heightDeg: 0.25 }, "assumed", "points: none of them had \"a chance to get a good look\"", "des points : aucun n'eut « l'occasion de bien les voir »", RUPPELT) : { widthDeg: 0.25, heightDeg: 0.25 }
      }
    }))
  })
  for (let t = T0; t <= T_OUT; t += 250) {
    const aims = lightsAt(t)
    keyframes.push({ t, shapes: LIGHT_IDS.map((sourceId, k) => ({ sourceId, shape: { aim: aims[k], transparency: 0 } })) })
  }
  // "abruptly went out 45 degrees above the southern horizon"
  const last = lightsAt(T_OUT)
  keyframes.push({ t: T_OUT + 40, shapes: LIGHT_IDS.map((sourceId, k) => ({ sourceId, shape: { aim: last[k], transparency: 1 } })) })
  return { keyframes, order: LIGHT_IDS, groups: [{ id: "formation", members: LIGHT_IDS }] }
}

// ---- The four of them ----

interface Professor {
  key: string
  id: string
  name: string
  occupation: Text
  /** Where his chair is, metres from the middle of the four, and the way he faces: the middle of the four. ASSUMED. */
  seat: { eastM: number, northM: number, headingDeg: number }
  /** The first to see them, facing north. ASSUMED: Ruppelt does not say who did. */
  first?: boolean
  model: string
}
const CHAIR_M = 1.1
const PROFESSORS: Professor[] = [
  { key: "robinson", id: "RobinsonWI", name: "W. I. Robinson", first: true, model: "makehuman-seated-man-1951-a",
    occupation: { en: "professor of geology, Texas Technological College", fr: "professeur de géologie, Texas Technological College", es: "profesor de geología, Texas Technological College", it: "professore di geologia, Texas Technological College" },
    seat: { eastM: 0, northM: -CHAIR_M, headingDeg: 0 } },
  { key: "oberg", id: "ObergAG", name: "A. G. Oberg", model: "makehuman-seated-man-1951-b",
    occupation: { en: "professor of chemical engineering, Texas Technological College", fr: "professeur de génie chimique, Texas Technological College", es: "profesor de ingeniería química, Texas Technological College", it: "professore di ingegneria chimica, Texas Technological College" },
    seat: { eastM: -CHAIR_M, northM: 0, headingDeg: 90 } },
  { key: "ducker", id: "DuckerWL", name: "W. L. Ducker", model: "makehuman-seated-man-1951-c",
    occupation: { en: "head of the petroleum engineering department, Texas Technological College", fr: "chef du département de génie pétrolier, Texas Technological College", es: "jefe del departamento de ingeniería petrolera, Texas Technological College", it: "capo del dipartimento di ingegneria petrolifera, Texas Technological College" },
    seat: { eastM: 0, northM: CHAIR_M, headingDeg: 180 } },
  { key: "george", id: "GeorgeEL", name: "E. L. George", model: "makehuman-seated-man-1951-d",
    occupation: { en: "professor of physics, Texas Technological College", fr: "professeur de physique, Texas Technological College", es: "profesor de física, Texas Technological College", it: "professore di fisica, Texas Technological College" },
    seat: { eastM: CHAIR_M, northM: 0, headingDeg: 270 } }
]

/** Where `p`'s eye is from the recording's origin, which is his own place. */
const placeOf = (p: Professor) => ({ lat: YARD.lat + p.seat.northM / 111320, lng: YARD.lng + p.seat.eastM / (111320 * Math.cos(YARD.lat * DEG)) })
const pose = (p: Professor, headingDeg: unknown, pitchDeg: unknown) => ({ ...placeOf(p), elevationM: SEATED_M, fovDeg: FOV, headingDeg, pitchDeg })

/** Where his look goes, second by second: on a colleague, then up to the lights and after them, and, once they are out, a while on the spot and back. */
function gaze(p: Professor) {
  const keys: { t: number, pose: unknown }[] = []
  const h0 = p.seat.headingDeg
  keys.push({ t: 0, pose: pose(p,
    said(h0, "assumed", "sitting round with the others in Dr Robinson's back yard, facing the one across from him (where each sat is not said)", "assis avec les autres dans le jardin du Dr Robinson, face à celui d'en face (la place de chacun n'est pas dite)", RUPPELT),
    said(-3, "assumed", "they \"were discussing micro meteorites and drinking tea\": looking at a colleague", "ils « discutaient de micrométéorites en buvant du thé » : il regarde un collègue", RUPPELT)) })
  keys.push({ t: 900, pose: pose(p, h0 + (p.first ? 18 : -22), -5) })
  // Looking along the lights with them, a tenth of a second behind them, as eyes that pursue do.
  const follow = (t: number) => aimOf(centre(t - 100).at)
  if (p.first) {
    // He sees them come in at the edge of his sight, and looks up a quarter of a second later.
    keys.push({ t: T0 + 250, pose: pose(p, h0 + 10, 2) })
    keys.push({ t: T0 + 650, pose: pose(p, 0, along(T0 + 550)) })
    for (let t = T0 + 900; t <= T0 + 1300; t += 200) keys.push({ t, pose: pose(p, 0, r1(Math.min(84, along(t - 100)))) })
    // Over the top: his head as far back as it goes, then round after them.
    keys.push({ t: T0 + 1550, pose: pose(p, 90, 87) })
    keys.push({ t: T0 + 1800, pose: pose(p, 180, 84) })
  } else {
    // "Look!": they look up at his word, half a second after he did, and find them past the top of the sky.
    keys.push({ t: T0 + 700, pose: pose(p, h0, -2) })
    const meet = p.seat.headingDeg === 180 ? 180 : h0
    keys.push({ t: T0 + 1350, pose: pose(p, meet, 82) })
    keys.push({ t: T0 + 1750, pose: pose(p, p.seat.headingDeg === 180 ? 180 : (h0 + 180) / 2, 82) })
  }
  for (let t = T0 + 2000; t <= T_OUT; t += 250) {
    const aim = follow(t)
    keys.push({ t, pose: pose(p, 180, r1(aim.altitudeDeg)) })
  }
  // "abruptly went out": the look stays where they went out, searches a little, then comes back down to the others.
  keys.push({ t: T_OUT + 900, pose: pose(p, 180, 45) })
  keys.push({ t: T_OUT + 1700, pose: pose(p, 172, 50) })
  keys.push({ t: T_OUT + 2600, pose: pose(p, 188, 40) })
  keys.push({ t: DURATION_MS, pose: pose(p, h0 + (p.seat.headingDeg === 180 ? 0 : (p.seat.headingDeg === 0 ? 150 : (p.seat.headingDeg === 90 ? 60 : -60))), 2) })
  return { keyframes: keys }
}

const milestones = [
  { t: T0, label: "A", note: { en: "21:20: a formation of lights appears in the north, 45° up.", fr: "21 h 20 : une formation de lumières apparaît au nord, à 45° de hauteur.", es: "21:20: una formación de luces aparece al norte, a 45° de altura.", it: "21:20: una formazione di luci appare a nord, a 45° di altezza." } },
  { t: T0 + CROSSING_MS / 2, label: "B", note: { en: "Directly over their heads, without a sound.", fr: "Juste au-dessus de leurs têtes, sans un bruit.", es: "Justo encima de sus cabezas, sin un ruido.", it: "Proprio sopra le loro teste, senza un rumore." } },
  { t: T_OUT, label: "C", note: { en: "They go out abruptly, 45° up in the south: three seconds.", fr: "Elles s'éteignent d'un coup à 45° de hauteur au sud : trois secondes.", es: "Se apagan de golpe a 45° de altura al sur: tres segundos.", it: "Si spengono di colpo a 45° di altezza a sud: tre secondi." } }
]

// ---- The scenery ----

/**
 * The houses round the yard, from the volunteers' map of today (scripts/data/cases/lubbock/surroundings.json): the neighbourhood was built
 * between the 1920s and the 1950s, but which of today's houses stood in 1951 is not known. Moved so that they are measured from the yard.
 */
function surroundings() {
  const found = JSON.parse(readFileSync(path.join(here, "surroundings.json"), "utf8")) as { decor: Record<string, unknown>[], fetchedOn: string, provider: { attribution: string } }
  let n = 0
  const decor = found.decor.map(object => ({
    ...object,
    eastM: r1((object.eastM as number) - FETCH_CENTRE_OFFSET.eastM),
    northM: r1((object.northM as number) - FETCH_CENTRE_OFFSET.northM),
    title: { en: `House ${++n}`, fr: `Maison ${n}`, es: `Casa ${n}`, it: `Casa ${n}` },
    roof: { shape: "hip", riseM: 1.8, color: "#5d5650" }
  }))
  return { decor, takenOn: found.fetchedOn, attribution: found.provider.attribution }
}

/**
 * The mercury-vapour lamps of 19th Street, the boulevard north of the yard, ASSUMED where they stood: Ruppelt was sent "a city map of Lubbock
 * with the mercury-vapor-lighted streets marked", and does not say which. A 400 W clear mercury lamp of the time, 21,000 lm, a bluish white.
 */
function lamps() {
  const out = []
  for (let k = -5; k <= 5; k++) {
    out.push({
      id: `lamp-${k + 6}`, kind: "streetlight", eastM: k * 45, northM: 55.5, headingDeg: 0, lit: true,
      lamp: { colorTemperatureK: 5700, lumens: 21000 }, sizeM: { heightM: 9 },
      title: { en: `Mercury-vapour lamp ${k + 6}, 19th Street`, fr: `Lampe à vapeur de mercure ${k + 6}, 19th Street`, es: `Lámpara de vapor de mercurio ${k + 6}, 19th Street`, it: `Lampada a vapori di mercurio ${k + 6}, 19th Street` }
    })
  }
  return out
}

/** The three others, sitting where `p` sees them, each a link to his own recording. */
function colleagues(p: Professor) {
  return PROFESSORS.filter(other => other !== p).map(other => {
    const eastM = r2(other.seat.eastM - p.seat.eastM), northM = r2(other.seat.northM - p.seat.northM)
    const away = Math.hypot(eastM, northM)
    return {
      id: `observer-${other.key}`, kind: "observer", eastM, northM, headingDeg: other.seat.headingDeg,
      title: { en: `${other.name}, ${r1(away)} m away`, fr: `${other.name}, à ${String(r1(away)).replace(".", ",")} m`, es: `${other.name}, a ${String(r1(away)).replace(".", ",")} m`, it: `${other.name}, a ${String(r1(away)).replace(".", ",")} m` },
      sightingUrl: `observer-lubbock-${other.key}.json`,
      note: { en: "Seated: where each of the four sat, and how he looked, are assumed.", fr: "Assis : la place de chacun des quatre, et son allure, sont supposées." },
      model: { id: other.model }
    }
  })
}

const weatherTrack = {
  keyframes: [{
    t: 0,
    weather: {
      cloudCover: said(0, "stated", "\"a clear night sky\" (Ruppelt, of the nights of the lights); the professors \"tried to compare the lights to the height of clouds\" on other nights", "« un ciel nocturne clair » (Ruppelt, des nuits des lumières) ; les professeurs tentèrent d'autres soirs de comparer les lumières à la hauteur des nuages", RUPPELT),
      cloudDarkness: 0, cloudBaseM: 3000, lowerCloudCover: 0, highCloudCover: 0, relativeHumidity: 0.45, precipitationType: "none", precipitationIntensity: 0,
      windDirectionDeg: said(180, "assumed", "the southerly of a late-summer evening on the Llano Estacado: no observation of that evening was found", "le vent du sud d'un soir de fin d'été sur le Llano Estacado : aucune observation de ce soir n'a été trouvée"),
      windSpeed: 4, storm: false
    }
  }]
}
const soundTrack = { keyframes: [{ t: 0, sound: said({ kind: "none", volume: 0, pitchHz: 0 }, "stated", "\"the fact that the lights didn't make any perceivable sound\" (Ruppelt, ch. 8)", "« le fait que les lumières ne faisaient aucun bruit perceptible » (Ruppelt, chap. 8)", RUPPELT) }] }

function common(p: Professor) {
  return {
    version: 4,
    time: said(TIME, "stated", "\"At nine twenty\" on the evening of August 25 (Ruppelt, ch. 8); the rr0.org dossier says 21:10. Central Standard Time", "« À neuf heures vingt » le soir du 25 août (Ruppelt, chap. 8) ; le dossier de rr0.org dit 21 h 10. Heure normale du Centre", RUPPELT),
    utcOffsetHours: said(-6, "derived", "Central Standard Time: Texas kept no summer time in 1951", "heure normale du Centre : le Texas n'avait pas d'heure d'été en 1951"),
    timeZone: "America/Chicago",
    durationSeconds: said(DURATION_MS / 1000, "derived", "three seconds of the lights (\"through 90 degrees of sky in three seconds\", measured on the later flights), with what came before and after", "trois secondes de lumières (« 90 degrés de ciel en trois secondes », mesurés sur les vols suivants), avec ce qui précède et suit", RUPPELT),
    place: said({ name: "Dr W. I. Robinson's back yard, Lubbock, Texas", locations: [placeOf(p)] }, "assumed",
      "\"sitting in Dr. Robinson's back yard\" (Ruppelt, ch. 8), whose address is not given; taken behind a house on the south side of 19th Street, the boulevard along Texas Tech, since \"the place where the professors had made their observations was close to\" one lit by mercury-vapour lamps",
      "« assis dans le jardin du Dr Robinson » (Ruppelt, chap. 8), dont l'adresse n'est pas donnée ; pris derrière une maison du côté sud de la 19th Street, le boulevard qui longe Texas Tech, car « l'endroit où les professeurs avaient fait leurs observations était proche » d'une rue éclairée à la vapeur de mercure", RUPPELT),
    lightPollution: said(20, "assumed", "a town of 70,000 in 1951, from a garden: \"La nuit est claire et sombre\" (rr0.org dossier)", "une ville de 70 000 habitants en 1951, depuis un jardin : « La nuit est claire et sombre » (dossier de rr0.org)"),
    instrument: "eye",
    observerTrack: gaze(p),
    soundTrack,
    weatherTrack,
    snapshots: { decor: { src: "lubbock.decor.json", takenOn: surroundings().takenOn, attribution: "Buildings © OpenStreetMap contributors (ODbL), as drawn on the day of the data, not in 1951; hipped roofs assumed" } },
    decor: [...colleagues(p), ...lamps()]
  }
}

function observer(p: Professor) {
  return {
    ...common(p),
    id: `1951-08-25-Lubbock-${p.id}`,
    summaryTime: r2((T0 + 1900) / 1000),
    observer: { id: p.id, title: p.name },
    account: {
      observerOccupation: p.occupation,
      source: said("interview", "stated", "the four told it to Edward J. Ruppelt and the intelligence officer of Reese AFB at Lubbock, in late September 1951, a month after", "les quatre la racontèrent à Edward J. Ruppelt et à l'officier de renseignement de la base de Reese à Lubbock, fin septembre 1951, un mois après", RUPPELT)
    },
    description: {
      en: `What the four professors told Ruppelt of their first sighting, as he wrote it: on the evening of 25 August 1951, sitting in Dr Robinson's back yard over tea, at about nine twenty, they saw a formation of lights go over "directly over their heads" so fast that none had a good look. The lights were of "a weird bluish green", fifteen to thirty of them, in a semicircle, going north to south, without a sound. ${p.name}'s view${p.first ? ", taken here as the one who saw them first" : ""}; where each sat, and the lights' way in and out of the sky, are assumed.`,
      fr: `Ce que les quatre professeurs racontèrent à Ruppelt de leur première observation, tel qu'il l'écrivit : le soir du 25 août 1951, assis à prendre le thé dans le jardin du Dr Robinson, vers neuf heures vingt, ils virent une formation de lumières passer « juste au-dessus de leurs têtes », si vite qu'aucun ne put bien la voir. Les lumières étaient d'un « étrange bleu-vert », quinze à trente, en demi-cercle, allant du nord au sud, sans un bruit. Le point de vue de ${p.name}${p.first ? ", pris ici pour celui qui les vit le premier" : ""} ; la place de chacun, et le chemin des lumières dans le ciel, sont supposés.`
    },
    tags: ["NL", "formation", "Blue Book"],
    sources: SOURCES,
    timeline: timeline(),
    milestones
  }
}

// ---- The two readings ----

interface Reading {
  key: string
  species: string
  count: number
  formation: Record<string, unknown>
  /** The height of their flight above the eyes, m, and therefore their speed: 2 × height in the three seconds of the crossing. */
  heightM: number
  seed: number
  title: Text
  rationale: Text
}
const READINGS: Reading[] = [
  {
    key: "ducks", species: "mallard", count: 20, formation: { kind: "v", angleDeg: 130, spacing: 1 }, heightM: 40, seed: 19,
    title: {
      en: "Twenty ducks in a wide V, 40 m up, lit from below by the boulevard's mercury-vapour lamps (the Air Force's conclusion)",
      fr: "Vingt canards en V très ouvert, à 40 m, éclairés par en dessous par les lampes à vapeur de mercure du boulevard (conclusion de l'Air Force)",
      es: "Veinte patos en una V muy abierta, a 40 m, iluminados desde abajo por las lámparas de vapor de mercurio del bulevar (conclusión de la Air Force)",
      it: "Venti anatre in una V molto aperta, a 40 m, illuminate dal basso dalle lampade a vapori di mercurio del viale (conclusione della Air Force)"
    },
    rationale: {
      en: "Project Blue Book: \"the objects of this sighting were migratory birds\", ducks more likely than plovers, which seldom fly more than six or seven together. Species unknown: drawn as mallards; the late-August migrant of the region is the blue-winged teal. 40 m up, they cross the 90° in three seconds at 27 m/s (96 km/h), the top of a duck's speeds; their wide V, a wingspan apart, is some 24° across overhead, against the ten degrees Ruppelt's figures imply. The light from below, 1 lux of mercury-vapour bluish white, is ASSUMED.",
      fr: "Projet Blue Book : « les objets de cette observation étaient des oiseaux migrateurs », des canards plutôt que des pluviers, qui volent rarement à plus de six ou sept. Espèce inconnue : dessinés en colverts ; le migrateur de fin août de la région est la sarcelle à ailes bleues. À 40 m, ils traversent les 90° en trois secondes à 27 m/s (96 km/h), le haut des vitesses d'un canard ; leur V très ouvert, à une envergure l'un de l'autre, fait quelque 24° au zénith, contre les dix degrés qu'impliquent les chiffres de Ruppelt. La lumière d'en dessous, 1 lux de blanc bleuté de vapeur de mercure, est SUPPOSÉE."
    }
  },
  {
    key: "plovers", species: "killdeer", count: 20, formation: { kind: "front", spacing: 1.2 }, heightM: 38, seed: 23,
    title: {
      en: "Twenty plovers in a ragged front, 38 m up, their white bellies lit by the boulevard's mercury-vapour lamps (Ruppelt's lead at Lamesa)",
      fr: "Vingt pluviers en front irrégulier, à 38 m, leur ventre blanc éclairé par les lampes à vapeur de mercure du boulevard (la piste de Ruppelt à Lamesa)",
      es: "Veinte chorlitos en un frente irregular, a 38 m, el vientre blanco iluminado por las lámparas de vapor de mercurio del bulevar (la pista de Ruppelt en Lamesa)",
      it: "Venti pivieri in un fronte irregolare, a 38 m, il ventre bianco illuminato dalle lampade a vapori di mercurio del viale (la pista di Ruppelt a Lamesa)"
    },
    rationale: {
      en: "At Lamesa an old man and his wife saw the same lights, and one of them called out: a plover (Ruppelt, ch. 8); \"the oily white breast of a plover could easily reflect light\", said the game warden, who added that there were more plovers than usual that fall, but that they seldom flew in more than pairs or threes. Drawn as killdeer, the plover of West Texas; flying abreast, as waders do. 38 m up, 25 m/s. Ruppelt wrote in 1956 that he had been wrong to think them birds. The light from below, 1 lux of mercury-vapour bluish white, is ASSUMED.",
      fr: "À Lamesa, un vieil homme et sa femme virent les mêmes lumières, et l'une d'elles cria : un pluvier (Ruppelt, chap. 8) ; « la poitrine blanche et huileuse d'un pluvier pouvait facilement réfléchir la lumière », dit le garde-chasse, qui ajouta qu'il y avait plus de pluviers que d'habitude cet automne-là, mais qu'ils volaient rarement à plus de deux ou trois. Dessinés en pluviers kildir, le pluvier de l'ouest du Texas ; de front, comme volent les limicoles. À 38 m, 25 m/s. Ruppelt écrivit en 1956 qu'il avait eu tort de les croire des oiseaux. La lumière d'en dessous, 1 lux de blanc bleuté de vapeur de mercure, est SUPPOSÉE."
    }
  }
]

/** The flock as `p` would have seen it: overhead the yard, north to south, where his lights were at the three instants of the account. */
function flock(p: Professor, reading: Reading) {
  const speed = 2 * reading.heightM / (CROSSING_MS / 1000)
  // At T0 the middle of the flock is 45° up in the north from the middle of the four: as far north as it is high.
  const northAt = (t: number) => reading.heightM - speed * (t - T0) / 1000
  const altitudeM = r1(reading.heightM + EYE_UP_M)
  const path = [-9000, T0, T_OUT, DURATION_MS + 3000].map(t => ({ t: Math.max(0, t === -9000 ? 0 : t), eastM: r1(-p.seat.eastM), northM: r1(northAt(t === -9000 ? 0 : t) - p.seat.northM), altitudeM }))
  return {
    id: reading.key, species: reading.species, count: reading.count, formation: reading.formation, seed: reading.seed,
    title: reading.title, lightFromBelow: { lux: 1, color: "#d4ece6" }, originElevationM: YARD.groundM,
    explainsEach: LIGHT_IDS, path
  }
}

function interpretation(p: Professor, reading: Reading) {
  return {
    ...common(p),
    id: `1951-08-25-Lubbock-${p.id}-${reading.key}`,
    tags: ["NL", "birds", "misidentification"],
    timeline: { keyframes: [], order: [], groups: [] },
    interpretation: said({ title: reading.title, bodies: [], birds: [flock(p, reading)] }, "assumed", reading.rationale.en, reading.rationale.fr, RUPPELT)
  }
}

// ---- Carl Hart Jr., six nights later ----

/**
 * What Hart told Ruppelt and the intelligence officer the day after they met the professors (Ruppelt, ch. 8): on the night of 31 August,
 * lying in bed by the open window of an upstairs room, he saw a formation of the lights appear in the north, cross an open patch of sky and
 * disappear over the house; he took his loaded Kodak 35, set at f/3.5 and a tenth of a second, went out to the middle of the back yard,
 * got two pictures of a second pass and, a few minutes later, three of a third. Re-enacted in the yard with them: the lights came up over
 * trees in the north and went over the house, about 120° of sky in four seconds; "the same dull, glowing bluish green color" as the
 * professors', "always flying in a perfect V", so dim that he thought he had nothing on the film. The rr0.org dossier dates it the night of
 * the 30th. One recording through two instruments: his eyes for the first pass and between the others, the camera for those two.
 */
const HART_SOURCE = RUPPELT
const HART_YARD = { lat: 33.5689, lng: -101.8706 }
/** Ms of the recording at which each pass comes into sight, 30° up in the north, ASSUMED: "before long" for the second, "a few minutes later" for the third. */
const HART_PASSES = [4000, 95000, 275000]
const HART_CROSSING_MS = 4000
const HART_DURATION_MS = HART_PASSES[2] + HART_CROSSING_MS + 6000
const HART_LIGHTS = 19
/** Half the V's width, degrees, ASSUMED: about fifteen degrees across on his prints, taken as uncropped through the 50 mm lens's forty. */
const HART_HALF_WIDTH_DEG = 7.5
/** The angle at the V's apex, degrees, as his prints show it: two straight arms some 27° off the line across. */
const HART_APEX_DEG = 125
/** The window he lay by, on the north wall of the house, 9 m south of the middle of the yard; his eye 3.6 m up, lying in an upstairs bed. */
const WINDOW = { northM: -9, elevationM: 2 }
const KODAK = "kodak-35"
/** Ms the camera is at his eye in each pass he photographed, and the instants of his pictures, ASSUMED: a Kodak 35 wound by hand, a second
 * and a half a frame, raised half a second after the lights came in for the second pass, ready for the third. */
const HART_CAMERA = [
  { from: HART_PASSES[1] + 500, to: HART_PASSES[1] + HART_CROSSING_MS, shots: [HART_PASSES[1] + 1100, HART_PASSES[1] + 2700] },
  { from: HART_PASSES[2] - 1500, to: HART_PASSES[2] + HART_CROSSING_MS, shots: [HART_PASSES[2] + 500, HART_PASSES[2] + 1900, HART_PASSES[2] + 3300] }
]

/** Degrees along the meridian from the northern horizon of the middle of the V, `ms` into a pass: 30 in, 150 out (120° in four seconds). */
const hartAlong = (ms: number) => 30 + 120 * ms / HART_CROSSING_MS

/** Each light of the V `ms` into a pass: the apex ahead (the Air Force's lab found "an inverted V" on his negatives, the camera pointed up at them coming), both arms straight. */
function hartLightsAt(ms: number) {
  const phi = hartAlong(ms) * DEG
  // Ahead is the way it goes: south over the top of the sky, the derivative of `at` along the meridian.
  const at: Vec = [0, Math.cos(phi), Math.sin(phi)], ahead: Vec = [0, -Math.sin(phi), Math.cos(phi)]
  const side = cross(at, ahead)
  const depth = HART_HALF_WIDTH_DEG / Math.tan(HART_APEX_DEG / 2 * DEG)
  return Array.from({ length: HART_LIGHTS }, (_, k) => {
    const u = -1 + 2 * k / (HART_LIGHTS - 1)
    return aimOf(add(add(at, ahead, Math.tan(depth * (0.5 - Math.abs(u)) * DEG)), side, Math.tan(HART_HALF_WIDTH_DEG * u * DEG)))
  })
}

const HART_IDS = Array.from({ length: HART_LIGHTS }, (_, k) => `light-${k + 1}`)

function hartTimeline() {
  const keyframes: { t: number, shapes: unknown[] }[] = []
  const shown = (aims: { azimuthDeg: number, altitudeDeg: number }[], transparency: number) => HART_IDS.map((sourceId, k) => ({ sourceId, shape: { aim: aims[k], transparency } }))
  HART_PASSES.forEach((start, pass) => {
    const first = hartLightsAt(0)
    keyframes.push({
      t: start - 40,
      shapes: pass > 0 ? shown(first, 1) : HART_IDS.map((sourceId, k) => ({
        sourceId,
        shape: {
          kind: "oval", bounds: { x: 0, y: 0, width: 2, height: 2 }, angle: 0, transparency: 1, haloScale: 0.9, selected: false,
          brightness: k === 0 ? said(0, "stated", "\"dull, glowing\", and \"so dim that he was sure he didn't have anything on the negatives\" (Ruppelt, ch. 8): lights one could look at, whose colour did not go white", "« ternes, luisantes », et « si faibles qu'il était sûr de n'avoir rien sur ses négatifs » (Ruppelt, chap. 8) : des lumières qu'on pouvait regarder, dont la couleur ne blanchissait pas", HART_SOURCE) : 0,
          color: k === 0 ? said(BLUISH_GREEN, "stated", "\"the same dull, glowing bluish green color as those seen by the professors\" (Ruppelt, ch. 8)", "« la même couleur bleu-vert terne et luisante que celles vues par les professeurs » (Ruppelt, chap. 8)", HART_SOURCE) : BLUISH_GREEN,
          title: { en: `Bluish green light ${k + 1}`, fr: `Lumière bleu-vert ${k + 1}`, es: `Luz verdiazul ${k + 1}`, it: `Luce verde-azzurra ${k + 1}` },
          aim: k === 0 ? said(first[k], "assumed",
            "where they came in: \"over some trees in the north\", 30° up so that 120° of sky crossed ends as far down in the south, over the house (Ruppelt, ch. 8)",
            "où elles sont apparues : « au-dessus d'arbres au nord », à 30° de hauteur pour que les 120° de ciel traversés finissent aussi bas au sud, au-dessus de la maison (Ruppelt, chap. 8)", HART_SOURCE) : first[k],
          angular: k === 0 ? said({ widthDeg: 0.2, heightDeg: 0.2 }, "derived", "\"circular, near pinpoint sources of light\", as the Air Force's lab read his negatives", "des « sources de lumière circulaires, presque ponctuelles », comme le laboratoire de l'Air Force lut ses négatifs", HART_SOURCE) : { widthDeg: 0.2, heightDeg: 0.2 }
        }
      }))
    })
    for (let ms = 0; ms <= HART_CROSSING_MS; ms += 250) keyframes.push({ t: start + ms, shapes: shown(hartLightsAt(ms), 0) })
    keyframes.push({ t: start + HART_CROSSING_MS + 40, shapes: shown(hartLightsAt(HART_CROSSING_MS), 1) })
  })
  return { keyframes, order: HART_IDS, groups: [{ id: "formation", members: HART_IDS }] }
}

/** Metres north of the yard's middle to latitude and longitude. */
const hartPlace = (northM: number, eastM = 0) => ({ lat: HART_YARD.lat + northM / 111320, lng: HART_YARD.lng + eastM / (111320 * Math.cos(HART_YARD.lat * DEG)) })

/** Where he is, where he looks and through what, from his bed to the yard and through the three passes. */
function hartTrack() {
  const keys: { t: number, pose: Record<string, unknown> }[] = []
  const eyeFov = FOV, cameraFov = 27
  const atWindow = (headingDeg: number, pitchDeg: number) => ({ ...hartPlace(WINDOW.northM), elevationM: WINDOW.elevationM, headingDeg, pitchDeg, fovDeg: eyeFov, instrument: "eye" })
  const inYard = (headingDeg: number, pitchDeg: number, camera = false) => ({ ...hartPlace(0), elevationM: 0, headingDeg, pitchDeg,
    ...(camera ? { fovDeg: cameraFov, fNumber: 3.5 } : { fovDeg: eyeFov, instrument: "eye" }) })
  // Following the middle of the V a tenth of a second behind, as eyes and a hand that pursue do; over the top, round to the south.
  const follow = (start: number, ms: number) => {
    const along = hartAlong(Math.max(0, ms - 100))
    return along <= 84 ? { headingDeg: 0, pitchDeg: r1(along) } : along >= 96 ? { headingDeg: 180, pitchDeg: r1(180 - along) } : { headingDeg: 90, pitchDeg: 86 }
  }
  keys.push({ t: 0, pose: atWindow(
    said(0, "assumed", "lying in bed \"looking out at the clear night sky\" through the open window by his bed, which faced the back yard to the north (Ruppelt, ch. 8)", "couché, « regardant le ciel nocturne clair » par la fenêtre ouverte près de son lit, qui donnait au nord sur le jardin (Ruppelt, chap. 8)", HART_SOURCE) as unknown as number,
    said(20, "assumed", "the sky above the trees, from a bed under the window", "le ciel au-dessus des arbres, depuis un lit sous la fenêtre", HART_SOURCE) as unknown as number) })
  // The first pass, seen from his bed: lost to the window's top past 60°, "over his house".
  const p0 = HART_PASSES[0]
  keys.push({ t: p0 + 300, pose: atWindow(0, 28) })
  for (let ms = 600; ms <= 1600; ms += 500) keys.push({ t: p0 + ms, pose: atWindow(0, Math.min(60, follow(p0, ms).pitchDeg)) })
  keys.push({ t: p0 + 2600, pose: atWindow(0, 60) })
  keys.push({ t: p0 + 4500, pose: atWindow(0, 40) })
  // Up, the camera, down the stairs, and out to the middle of the yard.
  keys.push({ t: p0 + 9000, pose: atWindow(180, 0) })
  keys.push({ t: 45000, pose: inYard(0, 5) })
  keys.push({ t: 60000, pose: inYard(0, 25) })
  // The second pass: he sees them come, raises the camera, and follows them through it.
  const [second, third] = HART_CAMERA
  const p1 = HART_PASSES[1]
  keys.push({ t: p1 - 2000, pose: inYard(0, 28) })
  keys.push({ t: p1 + 200, pose: inYard(0, 30) })
  for (let t = second.from; t <= second.to; t += 250) keys.push({ t, pose: inYard(follow(p1, t - p1).headingDeg, follow(p1, t - p1).pitchDeg, true) })
  keys.push({ t: second.to + 500, pose: inYard(180, 30) })
  keys.push({ t: second.to + 4000, pose: inYard(0, 20) })
  // The third: ready, the camera already up, pointed north.
  const p2 = HART_PASSES[2]
  keys.push({ t: third.from - 1500, pose: inYard(0, 28) })
  keys.push({ t: third.from, pose: inYard(0, 30, true) })
  for (let t = p2; t <= third.to; t += 250) keys.push({ t, pose: inYard(follow(p2, t - p2).headingDeg, follow(p2, t - p2).pitchDeg, true) })
  keys.push({ t: third.to + 600, pose: inYard(180, 28) })
  keys.push({ t: HART_DURATION_MS, pose: inYard(180, 15) })
  return { keyframes: keys.sort((a, b) => a.t - b.t) }
}

const hartMilestones = [
  { t: HART_PASSES[0], label: "A", note: { en: "From his bed, by the open window: a formation of lights comes up in the north and goes over the house.", fr: "De son lit, par la fenêtre ouverte : une formation de lumières monte au nord et passe au-dessus de la maison.", es: "Desde su cama, por la ventana abierta: una formación de luces sube por el norte y pasa sobre la casa.", it: "Dal letto, dalla finestra aperta: una formazione di luci sale a nord e passa sopra la casa." } },
  { t: 45000, label: "B", note: { en: "He has taken his Kodak 35, set at f/3.5 and a tenth of a second, and waits in the middle of the back yard.", fr: "Il a pris son Kodak 35, réglé à f/3,5 et un dixième de seconde, et attend au milieu du jardin.", es: "Ha cogido su Kodak 35, a f/3,5 y una décima de segundo, y espera en medio del jardín.", it: "Ha preso la sua Kodak 35, a f/3,5 e un decimo di secondo, e aspetta in mezzo al giardino." } },
  ...HART_CAMERA.flatMap(pass => pass.shots).map((t, k) => ({ t, label: `${k + 1}`, note: { en: `Picture ${k + 1} of 5.`, fr: `Photo ${k + 1} sur 5.`, es: `Foto ${k + 1} de 5.`, it: `Foto ${k + 1} di 5.` } })),
  { t: HART_PASSES[1], label: "C", note: { en: "The second pass: two pictures.", fr: "Deuxième passage : deux photos.", es: "Segundo paso: dos fotos.", it: "Secondo passaggio: due foto." } },
  { t: HART_PASSES[2], label: "D", note: { en: "A few minutes later, the third: three pictures.", fr: "Quelques minutes plus tard, le troisième : trois photos.", es: "Unos minutos después, el tercero: tres fotos.", it: "Qualche minuto dopo, il terzo: tre foto." } }
].sort((a, b) => a.t - b.t)

/** His house south of the yard, the window he lay by in its north wall, and the trees the lights came up over in the north: what he described, where it stood ASSUMED. */
function hartDecor() {
  return [
    { id: "hart-house", kind: "building", eastM: 0, northM: WINDOW.northM - 5.5, headingDeg: 0, lit: true, sizeM: { widthM: 11, lengthM: 11, heightM: 6 }, floors: 2,
      roof: { shape: "hip", riseM: 1.8, color: "#5d5650" }, facade: { color: "#cdc4b3" },
      title: { en: "The Hart house: \"an upstairs room\", the lights \"disappear over his house\"", fr: "La maison des Hart : « une chambre à l'étage », les lumières « disparaissent au-dessus de sa maison »" } },
    ...[-9, -2, 6].map((eastM, k) => ({ id: `tree-north-${k + 1}`, kind: "tree", eastM, northM: 26 + k * 2, sizeM: { widthM: 7, lengthM: 7, heightM: 11 }, model: { id: "jagobo-tree-maple-a" },
      title: { en: `Tree in the north ${k + 1}: the lights came \"over some trees in the north\"`, fr: `Arbre au nord ${k + 1} : les lumières vinrent « au-dessus d'arbres au nord »` } }))
  ]
}

function hart() {
  return {
    version: 4,
    id: "1951-08-31-Lubbock-HartCarlJr",
    time: said("1951-08-31T22:30:00", "assumed", "\"on the night of August 31\" (Ruppelt, ch. 8; the rr0.org dossier says the night of the 30th), after \"about a half hour\" in bed: the hour is not given", "« la nuit du 31 août » (Ruppelt, chap. 8 ; le dossier de rr0.org dit la nuit du 30), après « environ une demi-heure » au lit : l'heure n'est pas donnée", HART_SOURCE),
    utcOffsetHours: said(-6, "derived", "Central Standard Time: Texas kept no summer time in 1951", "heure normale du Centre : le Texas n'avait pas d'heure d'été en 1951"),
    timeZone: "America/Chicago",
    durationSeconds: said(HART_DURATION_MS / 1000, "assumed", "three passes of four seconds each; \"before long\" between the first two and \"a few minutes\" before the third", "trois passages de quatre secondes ; « peu après » entre les deux premiers et « quelques minutes » avant le troisième", HART_SOURCE),
    place: said({ name: "The Hart home, Lubbock, Texas", locations: [hartPlace(0)] }, "assumed", "the back yard of the Hart home, whose address Ruppelt does not give: placed in a residential street of Lubbock", "le jardin de la maison des Hart, dont Ruppelt ne donne pas l'adresse : placé dans une rue résidentielle de Lubbock", HART_SOURCE),
    lightPollution: said(20, "assumed", "a town of 70,000 in 1951, from a back yard", "une ville de 70 000 habitants en 1951, depuis un jardin"),
    instrument: said(KODAK, "stated", "\"he grabbed his loaded Kodak 35\" (Ruppelt, ch. 8); his eyes for the first pass and between the others (see each pose)", "« il attrapa son Kodak 35 chargé » (Ruppelt, chap. 8) ; ses yeux pour le premier passage et entre les autres (voir chaque pose)", HART_SOURCE),
    exposureSeconds: said(0.1, "stated", "\"set the lens and shutter at f 3.5 and one tenth of a second\" (Ruppelt, ch. 8)", "« régla l'objectif et l'obturateur à f 3,5 et un dixième de seconde » (Ruppelt, chap. 8)", HART_SOURCE),
    observer: { id: "HartCarlJr", title: "Carl Hart Jr." },
    account: {
      observerOccupation: { en: "freshman at Texas Technological College, amateur photographer", fr: "étudiant de première année au Texas Technological College, photographe amateur", es: "estudiante de primer año del Texas Technological College, fotógrafo aficionado", it: "matricola del Texas Technological College, fotografo dilettante" },
      source: said("interview", "stated", "told to Edward J. Ruppelt and the intelligence officer of Reese AFB in Lubbock, in late September 1951, and re-enacted with them in his back yard", "racontée à Edward J. Ruppelt et à l'officier de renseignement de la base de Reese à Lubbock, fin septembre 1951, et rejouée avec eux dans son jardin", HART_SOURCE)
    },
    description: {
      en: "What Carl Hart Jr. told Ruppelt: on the night of 31 August 1951, lying in bed by the open window of an upstairs room, he saw a formation of the lights appear in the north, cross an open patch of sky and disappear over his house. He grabbed his loaded Kodak 35, set it at f/3.5 and a tenth of a second, went out to the middle of the back yard, got two pictures of a second pass and, a few minutes later, three of a third. The lights were the professors' dull, glowing bluish green, \"always flying in a perfect V\", 120° of sky in four seconds, so dim that he thought he had nothing on his film. Where the house stood, the hour, the time between the passes and the instants of his pictures are assumed.",
      fr: "Ce que Carl Hart Jr. raconta à Ruppelt : la nuit du 31 août 1951, couché près de la fenêtre ouverte d'une chambre à l'étage, il vit une formation de lumières apparaître au nord, traverser un coin de ciel dégagé et disparaître au-dessus de sa maison. Il attrapa son Kodak 35 chargé, le régla à f/3,5 et un dixième de seconde, sortit au milieu du jardin, prit deux photos d'un deuxième passage et, quelques minutes plus tard, trois d'un troisième. Les lumières étaient du bleu-vert terne et luisant des professeurs, « toujours en V parfait », 120° de ciel en quatre secondes, si faibles qu'il crut n'avoir rien sur son film. L'emplacement de la maison, l'heure, le temps entre les passages et les instants de ses photos sont supposés."
    },
    tags: ["NL", "formation", "photo", "Blue Book"],
    sources: SOURCES,
    observerTrack: hartTrack(),
    soundTrack,
    weatherTrack,
    decor: hartDecor(),
    timeline: hartTimeline(),
    milestones: hartMilestones
  }
}

/**
 * The height that makes `reading`'s birds cross Hart's 120° in four seconds at the speed they fly at the professors' (see flock): 30° up in
 * the north to 30° up in the south is twice h / tan 30° in four seconds, 0.87 h a second. Lower than over the professors, whose 90° in three
 * seconds took 0.67 h a second.
 */
const hartHeightM = (reading: Reading) => r1((2 * reading.heightM / (CROSSING_MS / 1000)) / (2 / Math.tan(30 * DEG) / (HART_CROSSING_MS / 1000)))

/** One flock for each pass Hart saw: over the yard, north to south, where his lights were at the start and end of each pass. */
/** What each reading is called over Hart's yard: his nineteen lights, the height his crossing asks, and no boulevard known to light them. */
function hartTitle(reading: Reading) {
  const h = hartHeightM(reading), hFr = String(h).replace(".", ",")
  return reading.key === "ducks" ? {
    en: `Nineteen ducks in a wide V, ${h} m up, lit from below by the town (the Air Force's conclusion)`,
    fr: `Dix-neuf canards en V très ouvert, à ${hFr} m, éclairés par en dessous par la ville (conclusion de l'Air Force)`,
    es: `Diecinueve patos en una V muy abierta, a ${hFr} m, iluminados desde abajo por la ciudad (conclusión de la Air Force)`,
    it: `Diciannove anatre in una V molto aperta, a ${hFr} m, illuminate dal basso dalla città (conclusione della Air Force)`
  } : {
    en: `Nineteen plovers in a ragged front, ${h} m up, their white bellies lit by the town (Ruppelt's lead at Lamesa)`,
    fr: `Dix-neuf pluviers en front irrégulier, à ${hFr} m, leur ventre blanc éclairé par la ville (la piste de Ruppelt à Lamesa)`,
    es: `Diecinueve chorlitos en un frente irregular, a ${hFr} m, el vientre blanco iluminado por la ciudad (la pista de Ruppelt en Lamesa)`,
    it: `Diciannove pivieri in un fronte irregolare, a ${hFr} m, il ventre bianco illuminato dalla città (la pista di Ruppelt a Lamesa)`
  }
}

function hartFlocks(reading: Reading) {
  const heightM = hartHeightM(reading)
  const reachM = heightM / Math.tan(30 * DEG)
  const speed = 2 * reachM / (HART_CROSSING_MS / 1000)
  const altitudeM = r1(heightM + 1.6)
  return HART_PASSES.map((start, pass) => {
    const northAt = (t: number) => r1(reachM - speed * (t - start) / 1000)
    return {
      id: `${reading.key}-${pass + 1}`, species: reading.species, count: HART_LIGHTS, formation: reading.formation, seed: reading.seed + pass,
      title: hartTitle(reading), lightFromBelow: { lux: 1, color: "#d4ece6" }, originElevationM: YARD.groundM,
      explainsEach: HART_IDS, path: [start - 3000, start, start + HART_CROSSING_MS, start + HART_CROSSING_MS + 3000].map(t => ({ t: Math.max(0, t), eastM: 0, northM: northAt(t), altitudeM }))
    }
  })
}

function hartInterpretation(reading: Reading) {
  const heightM = hartHeightM(reading)
  const { timeline: _timeline, milestones: _milestones, description: _description, ...seen } = hart()
  return {
    ...seen,
    id: `1951-08-31-Lubbock-HartCarlJr-${reading.key}`,
    tags: ["NL", "birds", "misidentification"],
    timeline: { keyframes: [], order: [], groups: [] },
    interpretation: said({ title: hartTitle(reading), bodies: [], birds: hartFlocks(reading) }, "assumed",
      `${reading.rationale.en} Over Hart's yard, three flocks, one a pass, ${heightM} m up to cross his 120° in four seconds at the same speed; the light from below is the town's, his street lamps not being known.`,
      `${reading.rationale.fr} Au-dessus du jardin de Hart, trois vols, un par passage, à ${String(heightM).replace(".", ",")} m pour traverser ses 120° en quatre secondes à la même vitesse ; la lumière d'en dessous est celle de la ville, ses lampadaires n'étant pas connus.`, RUPPELT)
  }
}

function main(): void {
  const { decor, takenOn, attribution } = surroundings()
  writeFileSync(path.join(demoData, "lubbock.decor.json"), JSON.stringify({ version: 4, takenOn, attribution, decor }) + "\n")
  console.log(`${decor.length} houses`)
  const events: unknown[] = []
  for (const p of PROFESSORS) {
    write(`observer-lubbock-${p.key}.json`, observer(p))
    events.push({ type: "event", eventType: "sighting", id: p.key, time: "1951-08-25 21:20", title: p.name, url: `observer-lubbock-${p.key}.json` })
  }
  write("observer-lubbock-hart.json", hart())
  events.push({ type: "event", eventType: "sighting", id: "hart", time: "1951-08-31", title: "Carl Hart Jr.", url: "observer-lubbock-hart.json" })
  for (const reading of READINGS) {
    write(`interpretation-lubbock-hart-${reading.key}.json`, hartInterpretation(reading))
    events.push({ type: "event", eventType: "sighting", interpretationOf: "hart", title: hartTitle(reading), url: `interpretation-lubbock-hart-${reading.key}.json` })
  }
  for (const p of PROFESSORS) {
    for (const reading of READINGS) {
      write(`interpretation-lubbock-${p.key}-${reading.key}.json`, interpretation(p, reading))
      events.push({ type: "event", eventType: "sighting", interpretationOf: p.key, title: reading.title, url: `interpretation-lubbock-${p.key}-${reading.key}.json` })
    }
  }
  writeFileSync(path.join(demoData, "case-lubbock.json"), JSON.stringify({
    id: "Lubbock1951",
    title: "Lubbock",
    summary: {
      en: "25 August 1951, 21:20. Four Texas Tech professors drinking tea in a back yard see a semicircle of bluish green lights cross the sky over their heads from north to south in a few seconds, without a sound. Replayed for each of them, with the two bird readings: the Air Force's ducks and Ruppelt's plovers, lit from below by the mercury-vapour lamps of the boulevard. Six nights later, Carl Hart Jr. saw three passes from his home, the first by eye and the next two through his Kodak 35, and photographed a perfect V.",
      fr: "25 août 1951, 21 h 20. Quatre professeurs de Texas Tech prenant le thé dans un jardin voient un demi-cercle de lumières bleu-vert traverser le ciel au-dessus de leurs têtes du nord au sud en quelques secondes, sans un bruit. Rejoué pour chacun d'eux, avec les deux lectures oiseaux : les canards de l'Air Force et les pluviers de Ruppelt, éclairés par en dessous par les lampes à vapeur de mercure du boulevard. Six nuits plus tard, Carl Hart Jr. voit trois passages de chez lui, le premier à l'œil et les deux suivants à travers son Kodak 35, et photographie un V parfait.",
      es: "25 de agosto de 1951, 21:20. Cuatro profesores de Texas Tech tomando té en un jardín ven un semicírculo de luces verdiazules cruzar el cielo sobre sus cabezas de norte a sur en pocos segundos, sin un ruido. Reproducido para cada uno, con las dos lecturas de aves: los patos de la Air Force y los chorlitos de Ruppelt, iluminados desde abajo por las lámparas de vapor de mercurio del bulevar. Seis noches después, Carl Hart Jr. ve tres pasos desde su casa, el primero a simple vista y los dos siguientes a través de su Kodak 35, y fotografía una V perfecta.",
      it: "25 agosto 1951, 21:20. Quattro professori della Texas Tech che prendono il tè in un giardino vedono un semicerchio di luci verde-azzurre attraversare il cielo sopra le loro teste da nord a sud in pochi secondi, senza un rumore. Riprodotto per ciascuno di loro, con le due letture degli uccelli: le anatre della Air Force e i pivieri di Ruppelt, illuminati dal basso dalle lampade a vapori di mercurio del viale. Sei notti dopo, Carl Hart Jr. vede tre passaggi da casa sua, il primo a occhio nudo e i due seguenti attraverso la sua Kodak 35, e fotografa una V perfetta."
    },
    time: "1951-08-25 21:20",
    events
  }, null, 1) + "\n")
  console.log("written")
}

main()
