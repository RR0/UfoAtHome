/**
 * Builds the demo of the photograph of the Capitol in Washington, July 1952: the dome at night with a string of lights above it, published
 * later as a picture of the "Washington carousel" (rr0.org's case file, which has the photograph and the matching of its lights).
 *
 * Every light in the sky of the photograph lies on a line from one of the lamps of the plaza below, through the same point near the centre of
 * the picture, and as far beyond it: each is the ghost of a lamp, mirrored through the centre. That is the ghost a flat glass in front of the
 * lens makes (a filter sends back the image the film reflects, upside down and nearly in focus), not a pane farther off, which doubles a light
 * just beside it. So the camera is given a filter.
 *
 * ASSUMED, all of it: the night and the hour (the photograph is undated beyond "July 1952"), where the photographer stood (on the axis of the
 * east front, some 170 m off, where the dome fills the frame as in the photograph), the camera (unknown) and its settings, the filter, and the plaza's
 * lamps (posts of the 1950s, warm incandescent globes, set out to fill the foot of the frame as the photograph's do). The Capitol is drawn as
 * plain volumes of about its size (the wings, the drum and its dome), unlit: the floodlighting that made it white in the photograph is not
 * drawn, and is not what the demo is about.
 *
 * Writes ../../../public/demo-data/sky-test-washington-capitol.json. Run with `node --import tsx`.
 */
import { writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "public", "demo-data", "sky-test-washington-capitol.json")
/** The centre of the dome, and the observer some 170 m east of it on the axis of the east front. */
const DOME = { lat: 38.88992, lng: -77.00906 }
const EAST_M = 170
const OBSERVER = { lat: DOME.lat, lng: DOME.lng + EAST_M / (111320 * Math.cos(DOME.lat * Math.PI / 180)) }
const DURATION_S = 12
const why = "Assumed: the photograph is undated beyond July 1952, and its photographer, camera and standpoint are unknown."
const stone = "#e6e0d2"

const decor = [
  // The building: its wings north and south of the centre, and the drum carrying the dome, about their own sizes.
  {
    id: "capitol", kind: "building", title: { en: "Capitol", fr: "Capitole", es: "Capitolio", it: "Campidoglio" },
    eastM: -EAST_M, northM: 0, headingDeg: 90, sizeM: { widthM: 229, lengthM: 100, heightM: 27 }, floors: 4,
    facade: { color: stone, plain: true }, roof: { shape: "flat", color: stone }
  },
  {
    id: "dome", kind: "building", title: { en: "Capitol dome", fr: "Dôme du Capitole", es: "Cúpula del Capitolio", it: "Cupola del Campidoglio" },
    eastM: -EAST_M - 5, northM: 0, headingDeg: 90, sizeM: { widthM: 38, lengthM: 38, heightM: 80 }, floors: 2,
    facade: { color: stone, plain: true }, roof: { shape: "dome", riseM: 26, color: stone }
  },
  // The lamps of the east plaza and its approach: the lights at the foot of the photograph, whose ghosts are the lights above the dome.
  ...[
    ...[-90, -60, -30, 30, 60, 90].map(northM => ({ eastM: -110, northM })),
    ...[-55, -25, 25, 55].map(northM => ({ eastM: -70, northM })),
    ...[-15, 15].map(northM => ({ eastM: -35, northM }))
  ].map(({ eastM, northM }, i) => ({
    id: `lamp-${i + 1}`, kind: "streetlight", eastM, northM, headingDeg: 90, sizeM: { widthM: 0.4, lengthM: 0.4, heightM: 4.5 }, lit: true,
    lamp: { lumens: 6000, colorTemperatureK: 2800 }
  }))
]

const pose = { lat: OBSERVER.lat, lng: OBSERVER.lng, elevationM: 1.6, headingDeg: 270, pitchDeg: 16, fovDeg: 46, fNumber: 4 }
const recording = {
  version: 1,
  id: "sky-test-washington-capitol",
  summaryTime: 6,
  tags: ["lens flare", "lens ghost", "photograph", "Washington 1952"],
  description: {
    en: "The Capitol at night, July 1952, with lights above the dome: each the ghost of a lamp of the plaza, mirrored through the centre of the picture by a filter on the lens.",
    fr: "Le Capitole la nuit, juillet 1952, avec des lumières au-dessus du dôme : chacune est le reflet d'un lampadaire de la place, renvoyé à l'opposé par rapport au centre de l'image par un filtre sur l'objectif.",
    es: "El Capitolio de noche, julio de 1952, con luces sobre la cúpula: cada una es el reflejo de una farola de la plaza, devuelto al lado opuesto del centro de la imagen por un filtro en el objetivo.",
    it: "Il Campidoglio di notte, luglio 1952, con luci sopra la cupola: ognuna è il riflesso di un lampione della piazza, rimandato dalla parte opposta del centro dell'immagine da un filtro sull'obiettivo."
  },
  sources: [{ type: "article", title: "Le carousel de Washington", url: "https://rr0.org/science/crypto/ufo/enquete/dossier/Washington/" }],
  time: { year: 1952, month: 7, day: 19, hour: 23, minute: 30, second: 0 },
  utcOffsetHours: -4,
  durationSeconds: DURATION_S,
  place: [{ lat: OBSERVER.lat, lng: OBSERVER.lng, name: "Washington, D.C." }],
  instrument: "rectilinear-lens",
  exposureSeconds: 2,
  iso: 32,
  lens: { glass: { value: "filter", basis: "assumed", rationale: "The lights of the sky lie across the centre of the picture from the lamps, nearly in focus: the ghost a flat glass on the lens makes." } },
  weatherTrack: {
    keyframes: [{
      t: 0,
      weather: {
        cloudCover: { value: 0, basis: "assumed", rationale: why },
        cloudDarkness: 0, cloudBaseM: 2000, lowerCloudCover: 0, highCloudCover: 0,
        precipitationType: "none", precipitationIntensity: 0, windDirectionDeg: 0, windSpeed: 1, storm: false
      }
    }]
  },
  timeline: { keyframes: [{ t: 0, shapes: [] }], order: [], groups: [] },
  observerTrack: { keyframes: [{ t: 0, pose }, { t: DURATION_S * 1000, pose }] },
  soundTrack: { keyframes: [] },
  milestones: [
    {
      t: 0, label: "A", note: {
        en: "Point at a light above the dome: it is named after the lamp below whose ghost it is, and the line drawn to it passes through the centre.",
        fr: "Pointez une lumière au-dessus du dôme : elle porte le nom du lampadaire dont elle est le reflet, et la ligne tracée jusqu'à lui passe par le centre.",
        es: "Señala una luz sobre la cúpula: lleva el nombre de la farola de abajo de la que es el reflejo, y la línea trazada hasta ella pasa por el centro.",
        it: "Indica una luce sopra la cupola: porta il nome del lampione di sotto di cui è il riflesso, e la linea tracciata fino a esso passa per il centro."
      }
    }
  ],
  decor
}
writeFileSync(OUT, JSON.stringify(recording, null, 1) + "\n")
console.log(`→ ${OUT}`)
