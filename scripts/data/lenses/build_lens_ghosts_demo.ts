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
 * And the same crossroads filmed through a window as a shower comes and goes, to show the drops the rain leaves on the glass: none while
 * the wind blows it from behind, landing once the wind turns to throw it on the pane, faster in the downpour, the last ones running down
 * when it stops. The shower, the wind and the window are ASSUMED as the rest.
 *
 * Writes ../../../public/demo-data/sky-test-lens-ghosts.json and sky-test-lens-ghosts-rain.json. Run with `node --import tsx`.
 */
import { writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { LIGHT_RIGS, TrafficSignals } from "../../../src/engine/model/LightRig.js"

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "public", "demo-data", "sky-test-lens-ghosts.json")
const PLACE = { lat: 48.3, lng: 1.7, name: "Beauce" }
// Until the car has passed in front of the phone and left the frame on its left.
const DURATION_S = 51
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
  // A car coming from the east in the northern lane at about 35 km/h, dipped headlights on: from where the road comes out of a dip 200 m
  // off, which hid it until then, through the crossroads and past the phone, to the end of the road in the west.
  {
    id: "car", kind: "vehicle", eastM: 230, northM: 7.8, headingDeg: 270, sizeM: { widthM: 1.8, lengthM: 4.4, heightM: 1.5 }, headlights: "dipped", lit: true,
    // Its lamps, drawn: the dipped headlights seen from the lane they face, some 800 candela each (assumed), and its tail lights.
    lights: LIGHT_RIGS.find(rig => rig.id === "car-headlights")!.create().map(light => light.id.startsWith("head") ? { ...light, intensity: 8 } : light),
    track: [{ t: 26000, eastM: 230, northM: 7.8, headingDeg: 270 }, { t: 46000, eastM: 30, northM: 7.8, headingDeg: 270 }, { t: 79000, eastM: -300, northM: 7.8, headingDeg: 270 }]
  }
]

/** Where the phone looks at each instant: held still, then turned, so that the lights and their ghosts move against each other. */
const looks: [number, number, number][] = [
  // [t s, heading, pitch]
  [0, 112, 4], [7, 112, 4],
  [15, 66, 4],
  [17, 66, 9], [24, 66, 9],
  [27, 68, 4], [44, 68, 4],
  [46, 68, 4], [51, 68, 4]
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

/** The weather of the shower, at instants of the wet recording: overcast, the rain, and where the wind blows it from. */
const shower = (t: number, cover: number, rain: number, windFromDeg: number) => ({
  t,
  weather: {
    cloudCover: { value: cover, basis: "assumed", rationale: why },
    cloudDarkness: 0.5 * cover, cloudBaseM: 900, lowerCloudCover: cover, highCloudCover: 0,
    precipitationType: rain > 0 ? "rain" : "none", precipitationIntensity: rain, windDirectionDeg: windFromDeg, windSpeed: 6, storm: false
  }
})
/** Where the window faces, the way the observer looks through it: the wind from there throws the rain on it, the wind from behind does not. */
const FACING = 80
const WET_DURATION_S = 75
const wetPose = (headingDeg: number) => ({ lat: PLACE.lat, lng: PLACE.lng, elevationM: 1.6, headingDeg, pitchDeg: 4, fovDeg: 60 })
const wet = {
  ...recording,
  id: "sky-test-lens-ghosts-rain",
  summaryTime: 40,
  durationSeconds: WET_DURATION_S,
  description: {
    en: "The same crossroads filmed through a window as a shower comes and goes: dry, rain blown from behind that leaves the pane dry, the wind turning to throw it on the glass, a downpour, then the last drops running down.",
    fr: "Le même carrefour filmé à travers une vitre pendant une averse : sec, une pluie venant de dos qui laisse la vitre sèche, le vent qui tourne et la jette sur le verre, une pluie battante, puis les dernières gouttes qui coulent.",
    es: "El mismo cruce filmado a través de una ventana durante un chubasco: seco, una lluvia de espaldas que deja el cristal seco, el viento que gira y la lanza sobre el cristal, un aguacero, y las últimas gotas que bajan.",
    it: "Lo stesso incrocio filmato attraverso una finestra durante un acquazzone: asciutto, una pioggia alle spalle che lascia il vetro asciutto, il vento che gira e la getta sul vetro, un temporale, poi le ultime gocce che scendono."
  },
  lens: { glass: "window" },
  weatherTrack: {
    keyframes: [
      shower(0, 0.4, 0, FACING + 180),
      shower(8000, 1, 0, FACING + 180),
      // Light rain from behind the observer: the window faces away from it. (Rain starts and stops gradually: see PrecipitationRamp.)
      shower(9000, 1, 0.3, FACING + 180),
      shower(17000, 1, 0.3, FACING + 180),
      // The wind veers round, by the side, to the front: the rain comes onto the glass.
      shower(21000, 1, 0.3, FACING + 90),
      shower(25000, 1, 0.3, FACING),
      // The downpour.
      shower(27000, 1, 1, FACING),
      shower(42000, 1, 1, FACING),
      // It stops, over some twenty seconds: what is on the glass clings, or runs down.
      shower(43000, 1, 0, FACING),
      shower(WET_DURATION_S * 1000, 0.8, 0, FACING)
    ]
  },
  observerTrack: { keyframes: [{ t: 0, pose: wetPose(FACING) }, { t: WET_DURATION_S * 1000, pose: wetPose(FACING + 4) }] },
  decor: decor.map(object => object.id === "car"
    ? { ...object, track: [{ t: 36000, eastM: 230, northM: 7.8, headingDeg: 270 }, { t: 56000, eastM: 30, northM: 7.8, headingDeg: 270 }, { t: 89000, eastM: -300, northM: 7.8, headingDeg: 270 }] }
    : object),
  milestones: [
    {
      t: 0, label: "A", note: {
        en: "Dry: through the window, only the lens's own ghosts, across the centre from each light.",
        fr: "Au sec : à travers la vitre, seulement les reflets de l'objectif, de l'autre côté du centre de chaque lumière.",
        es: "En seco: a través de la ventana, solo los reflejos del objetivo, al otro lado del centro de cada luz.",
        it: "All'asciutto: attraverso la finestra, solo i riflessi dell'obiettivo, dall'altra parte del centro di ogni luce."
      }
    },
    {
      t: 10000, label: "B", note: {
        en: "It rains, blown from behind the observer: the outside of the window faces away from it and stays dry.",
        fr: "Il pleut, poussé par le vent depuis le dos de l'observateur : l'extérieur de la vitre lui tourne le dos et reste sec.",
        es: "Llueve, empujado por el viento desde la espalda del observador: el exterior del cristal le da la espalda y sigue seco.",
        it: "Piove, spinto dal vento dalle spalle dell'osservatore: l'esterno del vetro gli volta le spalle e resta asciutto."
      }
    },
    {
      t: 21000, label: "C", note: {
        en: "The wind veers to blow from the crossroads: the rain meets the glass and the first drops land, each light haloed where they are.",
        fr: "Le vent tourne et souffle du carrefour : la pluie frappe le verre et les premières gouttes se posent, chaque lumière auréolée là où elles sont.",
        es: "El viento gira y sopla desde el cruce: la lluvia golpea el cristal y caen las primeras gotas, cada luz con su halo allí donde están.",
        it: "Il vento gira e soffia dall'incrocio: la pioggia colpisce il vetro e si posano le prime gocce, ogni luce con un alone là dove sono."
      }
    },
    {
      t: 33000, label: "D", note: {
        en: "The downpour: drops land faster than they go, merge, and the large ones run down, wiping the glass behind them.",
        fr: "L'averse : les gouttes arrivent plus vite qu'elles ne partent, fusionnent, et les grosses coulent en essuyant le verre derrière elles.",
        es: "El aguacero: las gotas llegan más deprisa de lo que se van, se funden, y las grandes bajan limpiando el cristal tras ellas.",
        it: "L'acquazzone: le gocce arrivano più in fretta di quanto se ne vadano, si fondono, e le grandi scendono pulendo il vetro dietro di sé."
      }
    },
    {
      t: 58000, label: "E", note: {
        en: "The rain stops: nothing new lands, the last drops still clinging run down one after the other, the small ones dry.",
        fr: "La pluie s'arrête : plus rien ne se pose, les dernières gouttes accrochées coulent l'une après l'autre, les petites sèchent.",
        es: "Deja de llover: ya no cae nada, las últimas gotas aún pegadas bajan una tras otra, las pequeñas se secan.",
        it: "Smette di piovere: non si posa più nulla, le ultime gocce ancora attaccate scendono una dopo l'altra, le piccole si asciugano."
      }
    }
  ]
}
const WET_OUT = OUT.replace("sky-test-lens-ghosts.json", "sky-test-lens-ghosts-rain.json")
writeFileSync(WET_OUT, JSON.stringify(wet, null, 1) + "\n")
console.log(`→ ${WET_OUT}`)
