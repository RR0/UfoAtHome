/**
 * Builds the demo of the photograph of the Capitol in Washington, July 1952: the dome at night with a string of lights above it, published
 * later as a picture of the "Washington carousel" (rr0.org's case file, which has the photograph and the matching of its lights).
 *
 * Every light in the sky of the photograph lies on a line from one of the lamps at its foot, through the same point of the picture, and as
 * far beyond it: each is the ghost of a lamp, mirrored through the lens's axis. MEASURED on the photograph (a 2000 x 1322 px scan): the
 * eleven lights of its sky and the globes at its foot, fitted together, put that point at (864.5, 678.5), not the picture's centre (so even
 * this scan is a crop), and the ghosts at exactly -1 times their lamp's offset from it (4.8 px rms over ten of them: the eleventh's lamp is
 * lost in the lit facade).
 * Each light of the sky is a horizontal pair of points: the lamps of the Capitol's grounds are standards of several globes, two of which
 * stand side by side seen from the front, and a ghost this sharp shows them both. A ghost mirrored through the axis and nearly in focus is
 * the one a flat glass on the lens makes (a filter sends back the image the film reflects): the camera is given one.
 *
 * The scene is laid out to the photograph, laid over it: the dome's size in it (some 13 px a metre) and a standpoint 250 m west of it, on
 * the lawn below the west front, give the focal length (3274 px); the lens's axis is where the ghosts say it is; and each lamp stands on the
 * line of sight of its own image in the photograph, at the foot of the west front's terraces, as high as its image is above the axis.
 *
 * ASSUMED: the night and the hour (the photograph is undated beyond "July 1952"), the standpoint's distance, the camera, the filter, how far
 * off each row of lamps is (the terrace's balustrade, and the walks below it), and the globes' light. The Capitol is a photogrammetric model
 * of today's building and grounds (see public/models/ycpan3468-us-capitol/CREDITS.md), whose daylight is baked into its texture: it stands
 * for the floodlit building of the photograph, and its east front is the one extended in 1958-1962, which the photograph does not show.
 *
 * Writes ../../../public/demo-data/sky-test-washington-capitol.json. Run with `node --import tsx`.
 */
import { writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "public", "demo-data", "sky-test-washington-capitol.json")
/** The photograph, at 2000 x 1322 px: a scan wider and finer than rr0.org's 344 x 286 crop of it, hosted beside the demo. */
const PHOTO = "/demo-data/washington-capitol-1952.jpg"
const DURATION_S = 12
const why = "Assumed: the photograph is undated beyond July 1952, and its photographer, camera and standpoint are unknown."
const stone = "#e6e0d2"

/**
 * The centre of the dome, and the standpoint west of it: MEASURED on the photograph against the model, which three of its features pin down
 * (see PICTURE): the statue's top, the cornice of the central block's west front 40 m before the dome's axis, and the drum's width. How high
 * the dome stands over the front depends on how far off it is seen from, and only 228.5 m gives both heights at once.
 */
const DOME = { lat: 38.88992, lng: -77.00906 }
const DISTANCE_M = 228.5
const METRES_PER_DEG_LNG = 111320 * Math.cos(DOME.lat * Math.PI / 180)
const OBSERVER = { lat: DOME.lat, lng: DOME.lng - DISTANCE_M / METRES_PER_DEG_LNG }

/**
 * The photograph, as measured on it: its size, the lens's axis in it, and its focal length in its own pixels. The focal length is the drum's
 * width in it (533 px) over the model's (35 m) at the standpoint's distance; with the statue's top at v = 29 and the cornice at v = 787
 * (the model's 101.4 m and 39 m over the old standpoint's ground, 40 m nearer for the cornice), it fixes the distance (above) and the pitch.
 */
const PICTURE = { width: 2000, height: 1322, axis: { u: 864.5, v: 678.5 }, focalPx: 533 / 35 * DISTANCE_M }
/** The statue atop the dome, in the photograph. */
const DOME_TOP = { u: 979.5, v: 29 }

/**
 * What the relief of the scene puts under each place, metres above the ground at the standpoint: MEASURED in the scene once (its relief, as
 * the player loads it), so that each lamp is as high as its image says. The dome's top is the Capitol's 88 m over the east plaza.
 */
const TERRAIN = { statueM: 100.3, rows: [10.0, 7.38] }
/** How far the model is moved from where its stated geometry puts it, to lie on the photograph: MEASURED by laying it over. */
const MODEL_SHIFT = { eastM: 0, northM: 0, altitudeM: 0 }

/** Each light of the sky of the photograph, and the row of lamps its own lamp stands in (0 the balustrade, farther; 1 the walks, nearer). */
const GHOSTS: { u: number, v: number, row: 0 | 1 }[] = [
  { u: 481.1, v: 306.8, row: 0 }, { u: 578.4, v: 306.6, row: 0 }, { u: 668.6, v: 306.6, row: 0 }, { u: 758.5, v: 306.9, row: 0 },
  { u: 848.8, v: 306.4, row: 0 }, { u: 1119.8, v: 307.3, row: 0 }, { u: 747.3, v: 291.8, row: 0 }, { u: 818.8, v: 291.8, row: 0 },
  { u: 590, v: 212.8, row: 1 }, { u: 791.2, v: 219.3, row: 1 }, { u: 1051.6, v: 212.8, row: 1 }
]
/** How far each row of lamps is from the dome's axis, m: the west front's balustrade, and the walks at the foot of its terraces. */
const ROW_FROM_DOME_M = [75, 110]
/** The height of a globe above its standard's foot, m: what the standard is drawn up to. */
const GLOBE_HEIGHT_M = 4.5
const EYE_M = 1.6

const toDeg = (rad: number) => rad * 180 / Math.PI
/** The angles of a point of the photograph off the lens's axis, degrees: right and up. */
const offAxis = (u: number, v: number) => ({ right: toDeg(Math.atan((u - PICTURE.axis.u) / PICTURE.focalPx)), up: toDeg(Math.atan((PICTURE.axis.v - v) / PICTURE.focalPx)) })

// The lens's axis: turned off the dome by as much as the dome is off the axis in the photograph, and pitched so that the dome's top is as high.
const domeTop = offAxis(DOME_TOP.u, DOME_TOP.v)
const headingDeg = 90 - domeTop.right
const domeTopUpDeg = toDeg(Math.atan((TERRAIN.statueM - EYE_M) / DISTANCE_M))
const pitchDeg = domeTopUpDeg - domeTop.up

// Each lamp: on the line of sight of its image, the ghost mirrored through the axis, as high as that line is at its distance.
const lamps = GHOSTS.map((ghost, i) => {
  const image = offAxis(2 * PICTURE.axis.u - ghost.u, 2 * PICTURE.axis.v - ghost.v)
  const azimuth = (headingDeg + image.right) * Math.PI / 180
  const distance = DISTANCE_M - ROW_FROM_DOME_M[ghost.row]
  const globeAboveEye = distance * Math.tan((pitchDeg + image.up) * Math.PI / 180)
  const footAboveStandpoint = TERRAIN.rows[ghost.row]
  const heightM = Math.round((EYE_M + globeAboveEye - footAboveStandpoint) * 10) / 10
  return {
    id: `lamp-${i + 1}`, kind: "streetlight",
    title: { en: "Lamp standard", fr: "Candélabre", es: "Candelabro", it: "Candelabro" },
    eastM: Math.round(distance * Math.sin(azimuth) * 10) / 10, northM: Math.round(distance * Math.cos(azimuth) * 10) / 10,
    // Facing the standpoint, so that its globes side by side are side by side in the picture.
    headingDeg: 270,
    sizeM: { widthM: 0.5, lengthM: 0.5, heightM },
    lit: false,
    // Two globes side by side, as a standard of several shows them from the front: some 150 cd each (an incandescent globe of the 1950s).
    // A lamp of a standard is placed from its foot: the globes are at its top.
    lights: [-0.35, 0.35].map((x, j) => ({ id: `globe-${j + 1}`, offsetM: { x, y: heightM, z: 0 }, color: "#ffd9a8", intensity: 1.5, radiusM: 0.2, pattern: { kind: "steady" } }))
  }
})

const decor = [
  // The Capitol and its grounds, a photogrammetric model (see public/models/ycpan3468-us-capitol/CREDITS.md): turned so that its long axis
  // runs north and south and its west front faces the standpoint, and set so that the dome's axis is where the dome is. The model's box is
  // centred on the object, the dome's axis 7.2 m off its centre.
  {
    id: "capitol", kind: "building", title: { en: "Capitol", fr: "Capitole", es: "Capitolio", it: "Campidoglio" },
    eastM: DISTANCE_M - 2.7 + MODEL_SHIFT.eastM, northM: 6.7 + MODEL_SHIFT.northM, headingDeg: 142.7,
    sizeM: { widthM: 367.7, lengthM: 383, heightM: 101.9 },
    model: { id: "ycpan3468-us-capitol" },
    track: [{ t: 0, eastM: DISTANCE_M - 2.7 + MODEL_SHIFT.eastM, northM: 6.7 + MODEL_SHIFT.northM, altitudeM: MODEL_SHIFT.altitudeM, headingDeg: 142.7 }]
  },
  ...lamps
]

const pose = { lat: OBSERVER.lat, lng: OBSERVER.lng, elevationM: 0, headingDeg, pitchDeg, fovDeg: 30, fNumber: 4 }
// The photograph laid over the scene: its own centre is off the lens's axis by as much as it was cropped.
const centre = offAxis(PICTURE.width / 2, PICTURE.height / 2)
const recording = {
  version: 1,
  id: "sky-test-washington-capitol",
  summaryTime: 6,
  tags: ["lens flare", "lens ghost", "photograph", "Washington 1952"],
  description: {
    en: "The Capitol at night, July 1952, with lights above the dome: each the ghost of a lamp standard at its foot, mirrored through the lens's axis by a filter, laid out to the photograph laid over it.",
    fr: "Le Capitole la nuit, juillet 1952, avec des lumières au-dessus du dôme : chacune est le reflet d'un candélabre à son pied, renvoyé à l'opposé de l'axe de l'objectif par un filtre, la scène étant calée sur la photo posée par-dessus.",
    es: "El Capitolio de noche, julio de 1952, con luces sobre la cúpula: cada una es el reflejo de un candelabro a su pie, devuelto al otro lado del eje del objetivo por un filtro, con la escena ajustada a la foto superpuesta.",
    it: "Il Campidoglio di notte, luglio 1952, con luci sopra la cupola: ognuna è il riflesso di un candelabro ai suoi piedi, rimandato dalla parte opposta dell'asse dell'obiettivo da un filtro, con la scena allineata alla foto sovrapposta."
  },
  sources: [{ type: "article", title: "Le carousel de Washington", url: "https://rr0.org/science/crypto/ufo/enquete/dossier/Washington/" }],
  time: { year: 1952, month: 7, day: 19, hour: 23, minute: 30, second: 0 },
  utcOffsetHours: -4,
  durationSeconds: DURATION_S,
  place: [{ lat: OBSERVER.lat, lng: OBSERVER.lng, name: "Washington, D.C." }],
  instrument: "rectilinear-lens",
  exposureSeconds: 2,
  iso: 32,
  lens: { glass: { value: "filter", basis: "assumed", rationale: "The lights of the sky lie across the lens's axis from the lamps, nearly in focus: the ghost a flat glass on the lens makes." } },
  references: [{
    id: "capitol-1952", kind: "photo", src: PHOTO,
    title: { en: "The Capitol, July 1952", fr: "Le Capitole, juillet 1952", es: "El Capitolio, julio de 1952", it: "Il Campidoglio, luglio 1952" },
    credit: "rr0.org", creditUrl: "https://rr0.org/science/crypto/ufo/enquete/dossier/Washington/",
    t: 0, from: { lat: OBSERVER.lat, lng: OBSERVER.lng }, opacity: 0.5,
    registration: {
      headingDeg: Math.round((headingDeg + centre.right) * 100) / 100,
      pitchDeg: Math.round((pitchDeg + centre.up) * 100) / 100,
      fovDeg: Math.round(2 * toDeg(Math.atan(PICTURE.height / 2 / PICTURE.focalPx)) * 100) / 100
    }
  }],
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
        en: "Slide the photograph in and out: each light above the dome falls on the ghost of a lamp at its foot. Point at one to see which, and the line through the lens's axis.",
        fr: "Faites varier l'opacité de la photo : chaque lumière au-dessus du dôme tombe sur le reflet d'un candélabre à son pied. Pointez-en une pour voir lequel, et la ligne qui passe par l'axe de l'objectif.",
        es: "Varía la opacidad de la foto: cada luz sobre la cúpula cae sobre el reflejo de un candelabro a su pie. Señala una para ver cuál, y la línea que pasa por el eje del objetivo.",
        it: "Varia l'opacità della foto: ogni luce sopra la cupola cade sul riflesso di un candelabro ai suoi piedi. Indicane una per vedere quale, e la linea che passa per l'asse dell'obiettivo."
      }
    },
    // MEASURED in the scene (the light of the ghosts against the scene's own under them): over the facade the ghosts add a median 3 % of its
    // light, and the brightest of them there is 70 times fainter than those of the lamps over the sky, which outshine the black sky behind
    // them by up to 500 times.
    {
      t: 6000, label: "B", note: {
        en: "Why no lights in front of the Capitol? There are ghosts there too, of the lit dome above, sent down: but a ghost carries a thousandth of its light, spread. Measured here, they add 3 % to the lit facade, invisible; the lamps' ghosts, points on a black sky, outshine it up to 500 times.",
        fr: "Pourquoi pas de lumières devant le Capitole ? Il y a des reflets là aussi, ceux du dôme éclairé, renvoyés vers le bas : mais un reflet porte un millième de sa lumière, étalé. Mesurés ici, ils ajoutent 3 % à la façade éclairée, invisibles ; ceux des candélabres, des points sur un ciel noir, y brillent jusqu'à 500 fois plus que lui.",
        es: "¿Por qué no hay luces delante del Capitolio? También hay reflejos ahí, los de la cúpula iluminada, devueltos hacia abajo: pero un reflejo lleva una milésima de su luz, extendida. Medidos aquí, añaden un 3 % a la fachada iluminada, invisibles; los de los candelabros, puntos sobre un cielo negro, brillan hasta 500 veces más que él.",
        it: "Perché nessuna luce davanti al Campidoglio? Anche lì ci sono riflessi, quelli della cupola illuminata, rimandati verso il basso: ma un riflesso porta un millesimo della sua luce, sparsa. Misurati qui, aggiungono il 3 % alla facciata illuminata, invisibili; quelli dei candelabri, punti su un cielo nero, brillano fino a 500 volte più di esso."
      }
    }
  ],
  decor
}
writeFileSync(OUT, JSON.stringify(recording, null, 1) + "\n")
console.log(`heading ${headingDeg.toFixed(2)}, pitch ${pitchDeg.toFixed(2)} → ${OUT}`)
