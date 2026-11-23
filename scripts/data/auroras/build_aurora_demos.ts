/**
 * Writes the aurora demos into public/demo-data: a night of a disturbed field from Tromsø, and the storm of 10 May 2024 from Brittany, both
 * with no aurora stated — the scene shows the one the GFZ's archived Kp implies (see GeomagneticArchive) — and the same storm by a phone.
 *
 * Run with: node --import tsx scripts/data/auroras/build_aurora_demos.ts
 */
import { writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "public", "demo-data")

interface Demo {
  id: string
  description: Record<"en" | "fr" | "es" | "it", string>
  time: string
  utcOffsetHours: number
  durationSeconds: number
  place: string
  lat: number
  lng: number
  headingDeg: number
  pitchDeg: number
  fovDeg: number
  instrument?: string
  /** A phone's night mode: a pose of a few seconds. */
  exposureSeconds?: number
  lightPollution: number
  tags: string[]
  /**
   * Where the witness looks, in turn, as one looking about the sky: [seconds, heading, pitch], gone round again until the end. Without it, the one
   * direction of headingDeg and pitchDeg.
   */
  gaze?: [number, number, number][]
}

/** The poses of a gaze going round the sky again and again until `durationSeconds`, ms by ms as the track counts. */
function gazeKeyframes(demo: Demo): unknown[] {
  const pose = (headingDeg: number, pitchDeg: number) => ({ lat: demo.lat, lng: demo.lng, elevationM: 0, headingDeg, pitchDeg, fovDeg: demo.fovDeg })
  if (!demo.gaze) return [{ t: 0, pose: pose(demo.headingDeg, demo.pitchDeg) }]
  const round = demo.gaze[demo.gaze.length - 1][0]
  const keyframes: unknown[] = []
  for (let start = 0; start < demo.durationSeconds; start += round) {
    for (const [seconds, heading, pitch] of demo.gaze) {
      if (start > 0 && seconds === 0) continue
      const t = start + seconds
      if (t > demo.durationSeconds) break
      keyframes.push({ t: t * 1000, pose: pose(heading, pitch) })
    }
  }
  return keyframes
}

const assumed = { basis: "assumed", rationale: "Assumed for the demo." }

function recording(demo: Demo): unknown {
  return {
    version: 4,
    id: demo.id,
    tags: demo.tags,
    description: demo.description,
    time: demo.time,
    utcOffsetHours: demo.utcOffsetHours,
    durationSeconds: demo.durationSeconds,
    place: { name: demo.place, locations: [{ lat: demo.lat, lng: demo.lng }] },
    instrument: demo.instrument ?? "eye",
    ...(demo.exposureSeconds !== undefined ? { exposureSeconds: demo.exposureSeconds } : {}),
    lightPollution: demo.lightPollution,
    weatherTrack: {
      keyframes: [{
        t: 0,
        weather: {
          cloudCover: { value: 0, ...assumed }, cloudDarkness: 0, cloudBaseM: 2500, lowerCloudCover: 0, highCloudCover: 0,
          precipitationType: "none", precipitationIntensity: 0, windDirectionDeg: 0, windSpeed: 2, storm: false
        }
      }]
    },
    timeline: { keyframes: [{ t: 0, shapes: [] }], order: [], groups: [] },
    observerTrack: { keyframes: gazeKeyframes(demo) },
    soundTrack: { keyframes: [] }
  }
}

const demos: Demo[] = [
  {
    id: "sky-test-aurora-tromso",
    tags: ["aurora", "misidentification"],
    description: {
      en: "Near Tromsø, 1 January 2025 at nine in the evening, a moonless night: the field disturbed (the GFZ's Hp60 at 5⅓), the oval come over the fjords, its arcs and curtains across the sky. No aurora is stated: the scene shows the one the index implies; its arcs' details are assumed.",
      fr: "Près de Tromsø, le 1er janvier 2025 à vingt et une heures, une nuit sans Lune : le champ agité (l'indice Hp60 du GFZ à 5⅓), l'ovale venu au-dessus des fjords, ses arcs et ses draperies à travers le ciel. Aucune aurore n'est donnée : la scène montre celle qu'implique l'indice ; le détail de ses arcs est supposé.",
      es: "Cerca de Tromsø, el 1 de enero de 2025 a las nueve de la noche, sin luna: el campo agitado (el índice Hp60 del GFZ en 5⅓), el óvalo llegado sobre los fiordos, sus arcos y cortinas a través del cielo. No se indica ninguna aurora: la escena muestra la que implica el índice; el detalle de sus arcos es supuesto.",
      it: "Vicino a Tromsø, il 1º gennaio 2025 alle nove di sera, una notte senza luna: il campo agitato (l'indice Hp60 del GFZ a 5⅓), l'ovale giunto sopra i fiordi, i suoi archi e drappeggi attraverso il cielo. Nessuna aurora è indicata: la scena mostra quella che l'indice implica; il dettaglio dei suoi archi è ipotizzato."
    },
    time: "2025-01-01T21:00:00", utcOffsetHours: 1, durationSeconds: 600,
    place: "Ersfjordbotn, near Tromsø (assumed)", lat: 69.6955, lng: 18.6248,
    headingDeg: 0, pitchDeg: 50, fovDeg: 100, lightPollution: 21.5
  },
  {
    id: "sky-test-aurora-2023-03-23",
    tags: ["aurora", "misidentification"],
    description: {
      en: "Ekerö, west of Stockholm, 23 March 2023 at eleven in the evening, during the storm of 23 and 24 March: the GFZ's Hp60 at 6⅓, the oval's edge come down to the latitude of the Mälaren, its brightest arcs across the eastern and south-eastern sky, the two-day-old Moon set. The witness looks about the whole sky, again and again: the north, up to the zenith, the east, the south, the west. Seen by an eye adapted to the night, the brightest arcs are a pale green, the fainter ones grey. No aurora is stated: the scene shows the one the index implies; its arcs' details are assumed.",
      fr: "Ekerö, à l'ouest de Stockholm, le 23 mars 2023 à vingt-trois heures, pendant l'orage des 23 et 24 mars : l'indice Hp60 du GFZ à 6⅓, le bord de l'ovale descendu à la latitude du lac Mälar, ses arcs les plus vifs à travers le ciel de l'est et du sud-est, la Lune de deux jours couchée. Le témoin regarde tout le ciel, encore et encore : le nord, jusqu'au zénith, l'est, le sud, l'ouest. Vus par un œil adapté à la nuit, les arcs les plus vifs sont d'un vert pâle, les plus faibles gris. Aucune aurore n'est donnée : la scène montre celle qu'implique l'indice ; le détail de ses arcs est supposé.",
      es: "Ekerö, al oeste de Estocolmo, el 23 de marzo de 2023 a las once de la noche, durante la tormenta del 23 y 24 de marzo: el índice Hp60 del GFZ en 6⅓, el borde del óvalo bajado hasta la latitud del lago Mälaren, sus arcos más vivos a través del cielo del este y del sureste, la Luna de dos días ya puesta. El testigo mira todo el cielo, una y otra vez: el norte, hasta el cénit, el este, el sur, el oeste. Vistos por un ojo adaptado a la noche, los arcos más vivos son de un verde pálido, los más débiles grises. No se indica ninguna aurora: la escena muestra la que implica el índice; el detalle de sus arcos es supuesto.",
      it: "Ekerö, a ovest di Stoccolma, il 23 marzo 2023 alle undici di sera, durante la tempesta del 23 e 24 marzo: l'indice Hp60 del GFZ a 6⅓, il bordo dell'ovale sceso alla latitudine del lago Mälaren, i suoi archi più vivi attraverso il cielo dell'est e del sud-est, la Luna di due giorni tramontata. Il testimone guarda tutto il cielo, più e più volte: il nord, fino allo zenit, l'est, il sud, l'ovest. Visti da un occhio adattato alla notte, gli archi più vivi sono di un verde pallido, i più deboli grigi. Nessuna aurora è indicata: la scena mostra quella che l'indice implica; il dettaglio dei suoi archi è ipotizzato."
    },
    time: "2023-03-23T23:00:00", utcOffsetHours: 1, durationSeconds: 600,
    place: "Ekerö, west of Stockholm (assumed)", lat: 59.29, lng: 17.81,
    headingDeg: 0, pitchDeg: 20, fovDeg: 100, lightPollution: 21.0,
    gaze: [[0, 0, 20], [8, 0, 55], [16, 20, 85], [24, 90, 50], [34, 180, 35], [44, 270, 40], [54, 360, 20]]
  },
  {
    id: "sky-test-aurora-2024-05-10",
    tags: ["aurora", "misidentification"],
    description: {
      en: "The great storm of 10 May 2024, from a beach of northern Brittany at a quarter to one in the morning: Kp at 9, the GFZ's open-ended Hp60 at 10⅔, the oval's edge a degree or two of latitude north of Brittany; to the eye adapted to the night, a pale grey glow over the northern horizon, its red too faint for the cones. No aurora is stated: the scene shows the one the index implies.",
      fr: "Le grand orage du 10 mai 2024, depuis une plage du nord de la Bretagne à une heure moins le quart : Kp à 9, l'indice Hp60 du GFZ, sans plafond, à 10⅔, le bord de l'ovale à un ou deux degrés de latitude au nord de la Bretagne ; pour l'œil adapté à la nuit, une lueur gris pâle au-dessus de l'horizon nord, son rouge trop faible pour les cônes. Aucune aurore n'est donnée : la scène montre celle qu'implique l'indice.",
      es: "La gran tormenta del 10 de mayo de 2024, desde una playa del norte de Bretaña a la una menos cuarto de la madrugada: Kp en 9, el índice Hp60 del GFZ, sin techo, en 10⅔, el borde del óvalo a uno o dos grados de latitud al norte de Bretaña; para el ojo adaptado a la noche, un resplandor gris pálido sobre el horizonte norte, su rojo demasiado débil para los conos. No se indica ninguna aurora: la escena muestra la que implica Kp.",
      it: "La grande tempesta del 10 maggio 2024, da una spiaggia della Bretagna settentrionale all'una meno un quarto: Kp a 9, l'indice Hp60 del GFZ, senza tetto, a 10⅔, il bordo dell'ovale a uno o due gradi di latitudine a nord della Bretagna; per l'occhio adattato alla notte, un bagliore grigio pallido sopra l'orizzonte nord, il suo rosso troppo debole per i coni. Nessuna aurora è indicata: la scena mostra quella che Kp implica."
    },
    time: "2024-05-11T00:45:00", utcOffsetHours: 2, durationSeconds: 600,
    place: "Plage de Trestraou, Perros-Guirec (assumed)", lat: 48.8205, lng: -3.4545,
    headingDeg: 0, pitchDeg: 18, fovDeg: 90, lightPollution: 20.8
  },
  {
    id: "sky-test-aurora-2024-05-10-phone",
    tags: ["aurora", "misidentification"],
    description: {
      en: "The same storm of 10 May 2024 from the same beach, by a phone's night mode: what the eye saw grey comes out pink and red, the high red line the phone records and the eye's rods do not.",
      fr: "Le même orage du 10 mai 2024 depuis la même plage, par le mode nuit d'un téléphone : ce que l'œil voyait gris sort rose et rouge, la raie rouge haute que le téléphone enregistre et que les bâtonnets de l'œil ne voient pas.",
      es: "La misma tormenta del 10 de mayo de 2024 desde la misma playa, con el modo noche de un teléfono: lo que el ojo veía gris sale rosa y rojo, la línea roja alta que el teléfono registra y que los bastones del ojo no ven.",
      it: "La stessa tempesta del 10 maggio 2024 dalla stessa spiaggia, con la modalità notte di un telefono: ciò che l'occhio vedeva grigio esce rosa e rosso, la riga rossa alta che il telefono registra e che i bastoncelli dell'occhio non vedono."
    },
    time: "2024-05-11T00:45:00", utcOffsetHours: 2, durationSeconds: 600,
    place: "Plage de Trestraou, Perros-Guirec (assumed)", lat: 48.8205, lng: -3.4545,
    headingDeg: 0, pitchDeg: 18, fovDeg: 67, instrument: "phone-landscape", exposureSeconds: 3, lightPollution: 20.8
  }
]

for (const demo of demos) writeFileSync(path.join(OUT, `${demo.id}.json`), JSON.stringify(recording(demo), null, 1) + "\n")
console.log(demos.map(demo => demo.id).join("\n"))
