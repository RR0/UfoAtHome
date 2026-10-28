/**
 * Builds the lens ghosts demo: a phone filming a country crossroads at night, panned across what lights it — a traffic light, a row of
 * streetlamps, the full Moon, a car coming — so that each light's ghost shows where it lands and how it moves.
 *
 * What it shows is the rule a ghost obeys, which is what tells it from a light: it lies on the line from the centre of the picture through
 * the light, on the other side for a phone's main one, and moves the other way when the phone turns. The red disc mirrored across the frame
 * from a traffic light, in a night video taken in the street, is that.
 *
 * ASSUMED, all of it: the place (a crossroads in the Beauce plain, chosen for having nothing of its own nearby), the road, the lights and the
 * car. The night is chosen for the Moon: on 3 January 2026 at 19:00 (UTC+1) it is full, 16 degrees up in the east-north-east, in the same
 * frame as the crossroads. Computed by the engine: the Moon, the lights' light, the ghosts.
 *
 * And the same crossroads filmed through a car's windscreen in the rain: every light doubled by the pane, haloed by the drops on it and a
 * little condensation, the rain itself (and the windscreen, the drops' strength) ASSUMED as the rest.
 *
 * Writes ../../../public/demo-data/sky-test-lens-ghosts.json and sky-test-lens-ghosts-windscreen.json. Run with `node --import tsx`.
 */
import { writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { LIGHT_RIGS, TrafficSignals } from "../../../src/engine/model/LightRig.js"

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "public", "demo-data", "sky-test-lens-ghosts.json")
const PLACE = { lat: 48.3, lng: 1.7, name: "Beauce" }
const DURATION_S = 46
const why = "Assumed: a crossroads made up to show lens ghosts."

/** The road runs east and west, its centre 6 m north of the observer, who stands on its southern kerb; a lane goes north from 30 m east. */
const roads = [
  { id: "main-road", surface: "paved", widthM: 7, path: [{ eastM: -300, northM: 6 }, { eastM: 800, northM: 6 }] },
  { id: "side-road", surface: "paved", widthM: 5, path: [{ eastM: 30, northM: 6 }, { eastM: 30, northM: 400 }] }
]

const post = { widthM: 0.3, lengthM: 0.3, heightM: 4.5 }
const decor = [
  // The light that stops the traffic coming from the west at the crossroads, facing it, and so the observer.
  { id: "signal-near", kind: "trafficlight", eastM: 26, northM: 2, headingDeg: 270, sizeM: post, lights: TrafficSignals.vehicleLights(1) },
  // Its twin across the crossroads, for the traffic coming down the lane.
  { id: "signal-far", kind: "trafficlight", eastM: 34, northM: 10, headingDeg: 250, sizeM: post, lights: TrafficSignals.vehicleLights(0) },
  // A streetlamp every 30 m along the northern kerb.
  ...[15, 45, 75, 105, 135].map((eastM, i) => ({
    id: `lamp-${i + 1}`, kind: "streetlight", eastM, northM: 11, headingDeg: 180, sizeM: { widthM: 0.3, lengthM: 0.3, heightM: 8 }, lit: true,
    lamp: { lumens: 10000, colorTemperatureK: 4000 }
  })),
  // A car coming from the east in the northern lane, slowing for the crossroads (about 35 km/h), dipped headlights on: from where the road
  // comes out of a dip 200 m off, which hid it until then.
  {
    id: "car", kind: "vehicle", eastM: 230, northM: 7.8, headingDeg: 270, sizeM: { widthM: 1.8, lengthM: 4.4, heightM: 1.5 }, headlights: "dipped", lit: true,
    // Its lamps, drawn: the dipped headlights seen from the lane they face, some 800 candela each (assumed), and its tail lights.
    lights: LIGHT_RIGS.find(rig => rig.id === "car-headlights")!.create().map(light => light.id.startsWith("head") ? { ...light, intensity: 8 } : light),
    track: [{ t: 26000, eastM: 230, northM: 7.8, headingDeg: 270 }, { t: 46000, eastM: 30, northM: 7.8, headingDeg: 270 }]
  }
]

/** Where the phone looks at each instant: held still, then turned, so that the lights and their ghosts move against each other. */
const looks: [number, number, number][] = [
  // [t s, heading, pitch]
  [0, 112, 4], [7, 112, 4],
  [15, 66, 4],
  [17, 66, 9], [24, 66, 9],
  [27, 68, 4], [44, 68, 4],
  [46, 68, 4]
]
const observerTrack = {
  keyframes: looks.map(([t, headingDeg, pitchDeg]) => ({ t: t * 1000, pose: { lat: PLACE.lat, lng: PLACE.lng, elevationM: 1.6, headingDeg, pitchDeg, fovDeg: 60 } }))
}

const milestones = [
  {
    t: 0, label: "A", note: {
      en: "A traffic light left of centre: its ghost is the red disc as far right of centre, on the same line. Nothing is there.",
      fr: "Un feu à gauche du centre : son reflet est le disque rouge aussi loin à droite du centre, sur la même droite. Il n'y a rien là-bas.",
      es: "Un semáforo a la izquierda del centro: su reflejo es el disco rojo igual de lejos a la derecha del centro, en la misma recta. Allí no hay nada.",
      it: "Un semaforo a sinistra del centro: il suo riflesso è il disco rosso altrettanto a destra del centro, sulla stessa retta. Lì non c'è niente."
    }
  },
  {
    t: 7000, label: "B", note: {
      en: "The phone turns right: the light goes left, its ghost right, through the centre. A ghost always moves against the light.",
      fr: "Le téléphone tourne à droite : le feu part à gauche, son reflet à droite, en passant par le centre. Un reflet va toujours à l'inverse de la lumière.",
      es: "El teléfono gira a la derecha: el semáforo se va a la izquierda y su reflejo a la derecha, pasando por el centro. Un reflejo va siempre al revés que la luz.",
      it: "Il telefono gira a destra: il semaforo va a sinistra, il suo riflesso a destra, passando per il centro. Un riflesso va sempre al contrario della luce."
    }
  },
  {
    t: 17000, label: "C", note: {
      en: "The full Moon and the streetlamps: each light has its ghost on the other side of the centre, the brighter and the nearer the light, the brighter the ghost.",
      fr: "La pleine Lune et les lampadaires : chaque lumière a son reflet de l'autre côté du centre, d'autant plus vif que la lumière est forte et proche.",
      es: "La luna llena y las farolas: cada luz tiene su reflejo al otro lado del centro, tanto más vivo cuanto más fuerte y cercana es la luz.",
      it: "La luna piena e i lampioni: ogni luce ha il suo riflesso dall'altra parte del centro, tanto più vivo quanto più la luce è forte e vicina."
    }
  },
  {
    t: 27000, label: "D", note: {
      en: "A car coming: the closer its headlights, the brighter their ghost, high in the sky across the centre — two lights hovering where there is nothing.",
      fr: "Une voiture arrive : plus ses phares approchent, plus leur reflet s'avive, haut dans le ciel de l'autre côté du centre — deux lumières qui planent là où il n'y a rien.",
      es: "Llega un coche: cuanto más se acercan sus faros, más se aviva su reflejo, alto en el cielo al otro lado del centro: dos luces que flotan donde no hay nada.",
      it: "Arriva un'auto: più i fari si avvicinano, più il loro riflesso si ravviva, alto nel cielo dall'altra parte del centro: due luci sospese dove non c'è niente."
    }
  }
]

const recording = {
  version: 1,
  id: "sky-test-lens-ghosts",
  summaryTime: 20,
  tags: ["lens flare", "lens ghost", "misidentification"],
  description: {
    en: "A phone filming a crossroads at night: the ghost of every light — a traffic light, the streetlamps, the full Moon, a car's headlights — lies across the centre of the picture, and moves against it.",
    fr: "Un téléphone filme un carrefour la nuit : le reflet de chaque lumière (un feu, les lampadaires, la pleine Lune, les phares d'une voiture) est de l'autre côté du centre de l'image, et se déplace à l'inverse.",
    es: "Un teléfono filma un cruce de noche: el reflejo de cada luz (un semáforo, las farolas, la luna llena, los faros de un coche) está al otro lado del centro de la imagen, y se mueve al revés.",
    it: "Un telefono filma un incrocio di notte: il riflesso di ogni luce (un semaforo, i lampioni, la luna piena, i fari di un'auto) sta dall'altra parte del centro dell'immagine, e si muove al contrario."
  },
  time: { year: 2026, month: 1, day: 3, hour: 19, minute: 0, second: 0 },
  utcOffsetHours: 1,
  durationSeconds: DURATION_S,
  place: [{ lat: PLACE.lat, lng: PLACE.lng, name: PLACE.name }],
  instrument: "phone-landscape",
  // Filmed: a video frame is exposed for at most a thirtieth of a second.
  exposureSeconds: 1 / 30,
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
  observerTrack,
  soundTrack: { keyframes: [] },
  milestones,
  roads,
  decor
}
writeFileSync(OUT, JSON.stringify(recording, null, 1) + "\n")
console.log(`→ ${OUT}`)

const wet = {
  ...recording,
  id: "sky-test-lens-ghosts-windscreen",
  summaryTime: 42,
  description: {
    en: "The same crossroads filmed through a car's windscreen in the rain: every light doubled by the pane, and haloed by the drops on it.",
    fr: "Le même carrefour filmé à travers le pare-brise d'une voiture sous la pluie : chaque lumière doublée par la vitre, et auréolée par les gouttes.",
    es: "El mismo cruce filmado a través del parabrisas de un coche bajo la lluvia: cada luz duplicada por el cristal, y con un halo por las gotas.",
    it: "Lo stesso incrocio filmato attraverso il parabrezza di un'auto sotto la pioggia: ogni luce raddoppiata dal vetro, e aureolata dalle gocce."
  },
  lens: { glass: "windscreen", condensation: { value: 0.1, basis: "assumed", rationale: why } },
  weatherTrack: {
    keyframes: [{
      t: 0,
      weather: {
        cloudCover: { value: 1, basis: "assumed", rationale: why },
        cloudDarkness: 0.6, cloudBaseM: 800, lowerCloudCover: 1, highCloudCover: 0,
        precipitationType: "rain", precipitationIntensity: { value: 0.5, basis: "assumed", rationale: why }, windDirectionDeg: 0, windSpeed: 3, storm: false
      }
    }]
  },
  milestones: [
    {
      t: 0, label: "A", note: {
        en: "Through the windscreen, every light has a twin just above it: the light that bounced between the two faces of the slanted glass.",
        fr: "À travers le pare-brise, chaque lumière a un double juste au-dessus : la lumière renvoyée entre les deux faces du verre incliné.",
        es: "A través del parabrisas, cada luz tiene un doble justo encima: la luz devuelta entre las dos caras del cristal inclinado.",
        it: "Attraverso il parabrezza, ogni luce ha un doppio appena sopra: la luce rimandata tra le due facce del vetro inclinato."
      }
    },
    {
      t: 15000, label: "B", note: {
        en: "The drops on the glass break each light's halo into blotches, which stay where the drops are when the view turns.",
        fr: "Les gouttes sur le verre morcellent le halo de chaque lumière en taches, qui restent là où sont les gouttes quand la vue tourne.",
        es: "Las gotas sobre el cristal rompen el halo de cada luz en manchas, que se quedan donde están las gotas cuando la vista gira.",
        it: "Le gocce sul vetro spezzano l'alone di ogni luce in macchie, che restano dove sono le gocce quando la vista gira."
      }
    },
    {
      t: 27000, label: "C", note: {
        en: "A car's headlights: two blazing blotches and their twins, with the lens's own ghosts high on the other side of the centre.",
        fr: "Les phares d'une voiture : deux taches éclatantes et leurs doubles, avec les reflets de l'objectif haut de l'autre côté du centre.",
        es: "Los faros de un coche: dos manchas deslumbrantes y sus dobles, con los reflejos del objetivo arriba al otro lado del centro.",
        it: "I fari di un'auto: due macchie abbaglianti e i loro doppi, con i riflessi dell'obiettivo in alto dall'altra parte del centro."
      }
    }
  ]
}
const WET_OUT = OUT.replace("sky-test-lens-ghosts.json", "sky-test-lens-ghosts-windscreen.json")
writeFileSync(WET_OUT, JSON.stringify(wet, null, 1) + "\n")
console.log(`→ ${WET_OUT}`)
