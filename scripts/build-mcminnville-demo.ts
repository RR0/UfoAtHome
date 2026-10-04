/**
 * Builds the McMinnville demo: Paul Trent's two photographs of 11 May 1950, and the investigation
 * Antoine Cousyn, François Louange and Geoff Quick (IPACO) made of them in 2013, which found a
 * small model hung from a wire under the electric line.
 *
 * Writes public/demo-data/observer-mcminnville.json (the account: two exposures through a Roamer 1,
 * each photograph one keyframe) and public/demo-data/case-mcminnville.json (the case that lists it
 * and the interpretation that places the model, its thread and the line in metres).
 *
 * Every number comes from the study (https://www.ipaco.fr/RapportMcMinnville.pdf, local copy in
 * scripts/data/cases/mcminnville/) and the Condon report's case 46, and each is stated with where it
 * comes from. The one that is not theirs is the layout of the yard (where the garage and the house
 * stand, and so where each photograph was taken from): Maccabee's site plan is not in either, so the
 * line is laid across the sightline at the 4.0 m and 4.3 m the study gives, and the rest follows.
 *
 * The geometry: the two lines are one above the other and the model hangs from the lower, so its
 * position IS the point of the line the camera sees it under. The first camera stands at the origin
 * facing the object; the second is where it has to stand for the object to be 13 degrees to the
 * other side, 4.3 m from the line, which comes out a metre to its right, as Trent said he stepped.
 * The model then swings 9 degrees on its thread, away from the lens, between the two.
 *
 * Run with: node --import tsx scripts/build-mcminnville-demo.ts
 */
import { mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

type Said<T> = { fr: T, en: T, es: T, it: T }

/** What a value is worth: said by a source, worked out from one, or put there to have something. */
class Claim {
  static of<T>(value: T, basis: "stated" | "derived" | "assumed", rationale: string): { value: T, basis: string, rationale: string } {
    return { value, basis, rationale }
  }
}

/** The study's figures, metres and degrees. */
class Study {
  /** Where the line stands from each camera, horizontally (plan of Maccabee, quoted by the study). */
  static readonly LINE_FROM_FIRST_M = 4.0
  static readonly LINE_FROM_SECOND_M = 4.3
  /** The camera's height, and the lower line's: "environ 3,5 m", the camera "2 m plus bas". */
  static readonly CAMERA_HEIGHT_M = 1.5
  static readonly LOWER_LINE_M = 3.5
  /** Between the two lines: AB, 0.142 m on the first photograph and 0.131 on the second. */
  static readonly LINE_SPACING_M = 0.14
  /** The thread: "60 à 80 cm", about 70. */
  static readonly THREAD_M = 0.7
  /** The model: "11 à 14 cm", about 12, and a lens a third as thick as it is wide. */
  static readonly MODEL_WIDTH_M = 0.12
  static readonly MODEL_HEIGHT_M = 0.05
  /** Its swing between the photographs, in the vertical plane of the sightline, away from the lens. */
  static readonly SWING_DEG = 9
  /** How much it tips: the base seen from below on the first (d1 = 21.2 degrees, of which 17.7 are
   * the camera's own view up to it), and the dome's side with the base out of sight on the second
   * (d2 = 3.6 degrees past edge on), 25 degrees in all. */
  static readonly TIP_FIRST_DEG = -3.2
  static readonly TIP_SECOND_DEG = 21.6
  /** The sightline's bearing from each camera, and the camera's pitch. The 13 degrees between the
   * two lines of sight are the study's; which way Trent faced is Condon's "north-east". */
  static readonly BEARING_FIRST_DEG = 45
  static readonly BEARING_SECOND_DEG = 32
  static readonly PITCH_DEG = 12
  /** The object's angular width on each photograph, c: 1.630 and 1.470 degrees. */
  static readonly WIDTH_FIRST_DEG = 1.63
  static readonly WIDTH_SECOND_DEG = 1.47
  /** Eccentricity of the base on the first photograph, e1 = 0.362: its height over its width. */
  static readonly ECCENTRICITY_FIRST = 0.362
  /** The negative as Maccabee measured it, over the lens: 33 degrees up. */
  static readonly FIELD_DEG = 2 * Math.atan(30 / 100) * 180 / Math.PI
}

class Geometry {
  static readonly DEG = Math.PI / 180

  /** East and north of a point `distanceM` along a bearing from `from`. */
  static along(from: { e: number, n: number }, bearingDeg: number, distanceM: number): { e: number, n: number } {
    return { e: from.e + distanceM * Math.sin(bearingDeg * Geometry.DEG), n: from.n + distanceM * Math.cos(bearingDeg * Geometry.DEG) }
  }

  static round(value: number, digits = 3): number {
    const factor = 10 ** digits
    return Math.round(value * factor) / factor
  }
}

const place = { lat: 45 + 6 / 60 + 15 / 3600, lng: -(123 + 19 / 60 + 50 / 3600) }
const metresPerDegree = 111320

// The first camera is the origin. The point of the line the model hangs from is straight along its sightline.
const first = { e: 0, n: 0 }
const pivot = Geometry.along(first, Study.BEARING_FIRST_DEG, Study.LINE_FROM_FIRST_M)
// The second camera: 4.3 m from that point, back along ITS sightline.
const second = Geometry.along(pivot, Study.BEARING_SECOND_DEG + 180, Study.LINE_FROM_SECOND_M)
// The model, on its thread from the pivot: below it at rest, swung away from the second lens after.
const swing = Study.THREAD_M * Math.sin(Study.SWING_DEG * Geometry.DEG)
const swungTo = Geometry.along(pivot, Study.BEARING_SECOND_DEG, swing)
const dropAtRest = Study.THREAD_M
const dropSwung = Study.THREAD_M * Math.cos(Study.SWING_DEG * Geometry.DEG)

const geographic = (point: { e: number, n: number }): { lat: number, lng: number } => ({
  lat: Geometry.round(place.lat + point.n / metresPerDegree, 7),
  lng: Geometry.round(place.lng + point.e / (metresPerDegree * Math.cos(place.lat * Geometry.DEG)), 7)
})

/** The altitude and size of the model's silhouette, from where each camera stands. */
const view = (camera: { e: number, n: number }, model: { e: number, n: number }, topM: number): { distanceM: number, altitudeDeg: number } => {
  const horizontal = Math.hypot(model.e - camera.e, model.n - camera.n)
  const centre = topM - Study.MODEL_HEIGHT_M / 2
  return { distanceM: horizontal, altitudeDeg: Math.atan2(centre - Study.CAMERA_HEIGHT_M, horizontal) / Geometry.DEG }
}
const restTop = Study.LOWER_LINE_M - dropAtRest
const swungTop = Study.LOWER_LINE_M - dropSwung
const seenFirst = view(first, pivot, restTop)
const seenSecond = view(second, swungTo, swungTop)

const T_SECOND_MS = 30000

const title = (fr: string, en: string, es: string, it: string): Said<string> => ({ fr, en, es, it })

// -- The account: what the photographs show, each as one keyframe -------------------------------------

const shapeAt = (widthDeg: number, heightDeg: number, altitudeDeg: number, azimuthDeg: number, rationale: string) => ({
  sourceId: "ufo-1",
  shape: {
    aim: Claim.of({ azimuthDeg: Geometry.round(azimuthDeg, 2), altitudeDeg: Geometry.round(altitudeDeg, 2) }, "derived", rationale),
    kind: "oval",
    angular: { widthDeg, heightDeg: Geometry.round(heightDeg, 3) },
    // The prints show it dark against the sky, its base in shadow: the witnesses' "silvery" is the account, this is the photograph.
    color: "#2c2c2e",
    title: title("Objet", "Object", "Objeto", "Oggetto")
  }
})

const observer = {
  version: 1,
  id: "1950-05-11-TrentPaul",
  time: Claim.of({ year: 1950, month: 5, day: 11, hour: 19, minute: 45, second: 0 }, "derived",
    "Condon's case 46 gives 19:45 (Evelyn Trent: \"about 8 o'clock less a quarter\"), others 19:30. Read as Pacific STANDARD time the Sun would already be 2.4 degrees below the horizon (sunset 19:27) and the sky of the photographs is in daylight, so the clock the Trents read is taken to be summer time, as the Sun's height in the plates needs."),
  durationSeconds: Claim.of(30, "stated", "Trent: both photographs \"within 30 seconds\" (Condon, case 46, from the Telephone Register of 8 June 1950)."),
  utcOffsetHours: Claim.of(-7, "assumed", "See the time: daylight time. In standard time (-8) the Sun has set."),
  place: [{
    value: { lat: Geometry.round(place.lat, 6), lng: Geometry.round(place.lng, 6), name: "Trent farm, Sheridan road, Yamhill County, Oregon, USA" },
    basis: "stated",
    rationale: "Condon, case 46: 123°19'50\" W, 45°06'15\" N, elevation 210 ft, the farm's own yard, 0.2 mile south of the Salmon River highway (U.S. 99 W)."
  }],
  observer: { id: "TrentPaul", title: "Paul Trent (MM1 and MM2)" },
  account: {
    observerOccupation: { fr: "fermier", en: "farmer", es: "granjero", it: "agricoltore" },
    observerAgeYears: Claim.of(33, "derived", "Born 28 February 1917 (RR0), so 33 on 11 May 1950."),
    source: Claim.of("press", "stated", "The account comes from the Telephone Register of 8 June 1950 and the interviews Hartmann, Maccabee and others made afterwards."),
    followedUp: Claim.of(true, "stated", "Hartmann (1967), Maccabee (1975 on) and Poher (1977) went back to the Trents, who gave their account again each time.")
  },
  description: {
    fr: "Au soir du 11 mai 1950, Evelyn Trent donne à manger aux lapins dans la cour de la ferme quand elle voit un objet au nord-est, qu'elle montre à son mari Paul. Il va chercher l'appareil, un Roamer 1 déjà chargé, prend une première photographie (MM1) de l'objet qui vient vers eux, rembobine, fait un pas vers sa droite quand l'objet « tourne vers le nord-ouest » et prend la seconde (MM2), le tout en 30 secondes environ. L'objet est « argenté, un peu bronze », sans bruit ni fumée ; il se serait éloigné vite vers l'ouest. Ici, ce que montrent les deux clichés : un disque sombre de 1,6° de large, au-dessus de deux fils électriques.",
    en: "On the evening of 11 May 1950, Evelyn Trent is feeding the rabbits in the farmyard when she sees an object to the north-east, and calls her husband Paul. He fetches the camera, a Roamer 1 already loaded, takes a first photograph (MM1) of the object coming towards them, winds on, steps to his right as the object \"turns towards the north-west\" and takes the second (MM2), all within about 30 seconds. The object is \"silvery with some bronze\", with no noise or smoke; it is said to have left fast to the west. Here, what the two prints show: a dark disc 1.6° wide, above two electric wires.",
    es: "En la tarde del 11 de mayo de 1950, Evelyn Trent da de comer a los conejos en el patio de la granja cuando ve un objeto al nordeste y llama a su marido Paul. Él va a buscar la cámara, una Roamer 1 ya cargada, hace una primera fotografía (MM1) del objeto que viene hacia ellos, rebobina, da un paso a su derecha cuando el objeto \"gira hacia el noroeste\" y hace la segunda (MM2), todo en unos 30 segundos. El objeto es \"plateado con algo de bronce\", sin ruido ni humo; se habría alejado rápido hacia el oeste. Aquí, lo que muestran las dos copias: un disco oscuro de 1,6° de ancho, sobre dos cables eléctricos.",
    it: "La sera dell'11 maggio 1950, Evelyn Trent dà da mangiare ai conigli nel cortile della fattoria quando vede un oggetto a nord-est e chiama il marito Paul. Lui va a prendere la macchina fotografica, una Roamer 1 già carica, scatta una prima fotografia (MM1) dell'oggetto che viene verso di loro, riavvolge, fa un passo a destra quando l'oggetto \"gira verso nord-ovest\" e scatta la seconda (MM2), il tutto in circa 30 secondi. L'oggetto è \"argenteo con un po' di bronzo\", senza rumore né fumo; si sarebbe allontanato veloce verso ovest. Qui, ciò che mostrano le due stampe: un disco scuro largo 1,6°, sopra due fili elettrici."
  },
  tags: ["photograph", "aerial observation", "McMinnville", "Condon 46"],
  sources: [
    {
      type: "article",
      title: "Retour sur les photos de McMinnville",
      authors: ["Antoine Cousyn", "François Louange", "Geoff Quick"],
      url: "https://www.ipaco.fr/RapportMcMinnville.pdf",
      publication: { publisher: "IPACO", time: "2013-04" },
      index: "pp. 3-14"
    },
    {
      title: "Case 46 - McMinnville (Oregon)",
      authors: ["William K. Hartmann"],
      url: "https://rr0.org/time/1/9/6/8/CondonReport/s4/c3/46/case46.html",
      publication: { publisher: "Scientific Study of Unidentified Flying Objects (Condon Report)", time: "1969" }
    }
  ],
  timeline: {
    keyframes: [
      {
        t: 0,
        shapes: [shapeAt(Study.WIDTH_FIRST_DEG, Study.WIDTH_FIRST_DEG * Study.ECCENTRICITY_FIRST, seenFirst.altitudeDeg, Study.BEARING_FIRST_DEG,
          "MM1: the study measures sizes, not where the object lies in the frame, so it is put on the camera's axis horizontally, and at the height the wire geometry gives (the lower line 3.5 m up, the model 0.7 m under it, the camera at 1.5 m and 4 m from the line). Its width is the study's c, 1.630 degrees, its height the base's eccentricity e1 = 0.362 times that.")]
      },
      {
        t: T_SECOND_MS,
        shapes: [shapeAt(Study.WIDTH_SECOND_DEG, Study.WIDTH_SECOND_DEG * 0.4, seenSecond.altitudeDeg, Study.BEARING_SECOND_DEG,
          "MM2: the same, from the second position, 4.3 m from the line, the model swung 9 degrees away. Its width is c = 1.470 degrees. Its height, 0.4 of that, is ASSUMED: the base is no longer seen (e2 = 0.063), the dome's side is, and the study does not measure its height.")]
      }
    ],
    order: ["ufo-1"],
    groups: []
  },
  milestones: [
    {
      t: 0,
      label: "MM1",
      note: title("La première photographie : l'objet vient vers eux.", "The first photograph: the object comes towards them.",
        "La primera fotografía: el objeto viene hacia ellos.", "La prima fotografia: l'oggetto viene verso di loro.")
    },
    {
      t: T_SECOND_MS,
      label: "MM2",
      note: title("La seconde, après un pas à droite : l'objet a « tourné vers le nord-ouest ».", "The second, after a step to his right: the object has \"turned towards the north-west\".",
        "La segunda, tras un paso a la derecha: el objeto ha \"girado hacia el noroeste\".", "La seconda, dopo un passo a destra: l'oggetto \"ha girato verso nord-ovest\".")
    }
  ],
  observerTrack: {
    keyframes: [
      {
        t: 0,
        pose: {
          ...geographic(first),
          elevationM: Geometry.round(Study.CAMERA_HEIGHT_M - 1.6, 2),
          fovDeg: Geometry.round(Study.FIELD_DEG, 2),
          headingDeg: Claim.of(Study.BEARING_FIRST_DEG, "stated", "Condon, case 46: \"apparently towards the north-east\" when first seen, and the first photograph taken as the object came on."),
          pitchDeg: Claim.of(Study.PITCH_DEG, "derived", "The study gives the line of sight a rise of about 11.5 degrees; 12 puts both lines inside the 33-degree frame, as they are in the plates.")
        }
      },
      {
        t: T_SECOND_MS,
        pose: {
          ...geographic(second),
          elevationM: Geometry.round(Study.CAMERA_HEIGHT_M - 1.6, 2),
          fovDeg: Geometry.round(Study.FIELD_DEG, 2),
          headingDeg: Claim.of(Study.BEARING_SECOND_DEG, "derived", "13 degrees from the first (the study: the line of sight turns by 13 degrees between the photographs), to the left while Trent steps right, as he must to keep a thing that has not moved in the frame."),
          pitchDeg: Study.PITCH_DEG
        }
      }
    ]
  },
  weatherTrack: {
    keyframes: [
      {
        t: 0,
        weather: {
          cloudLayers: [{ id: "ceiling", type: "stratus", baseM: 1500, thicknessM: 500, coverage: 0.7, sizeM: 2500, density: 1 }],
          cloudCover: 0.7,
          cloudDarkness: 0.4,
          cloudBaseM: 1500,
          highCloudCover: 0,
          lowerCloudCover: 0.7,
          relativeHumidity: 0.7,
          precipitationType: "none",
          precipitationIntensity: 0,
          windSpeed: 1.5,
          storm: false
        }
      }
    ]
  },
  weatherSource: {
    id: "condon-46",
    name: "Condon, case 46: overcast, ceiling about 5,000 ft \"confirmed by the photographs\"; light wind noted by earlier investigators (IPACO)",
    url: "https://rr0.org/time/1/9/6/8/CondonReport/s4/c3/46/case46.html"
  },
  instrument: "roamer-1-120",
  exposureSeconds: 0.02,
  iso: Claim.of(125, "assumed", "A box camera's black and white roll film of 1950 (Verichrome, ASA 125): the study gives the camera and the 1/50 s, not the film.")
}

// -- The interpretation: the study's model, its thread and the line, in metres ---------------------

/** The line's length: the study gives none (its ends are anchored on the house and the garage, which
 * Maccabee's plan places and the study does not quote), so it is made long enough to leave the frame
 * on both sides. It runs across the first sightline, as in both plates. */
const lineLength = 14
const lineBearingDeg = Study.BEARING_FIRST_DEG + 90
const lineCentre = { e: Geometry.round(pivot.e, 2), n: Geometry.round(pivot.n, 2) }

/** A cylinder (the primitive's axis is up) laid along the east-west line, centred where it is. */
const wireBody = (id: string, heightM: number, label: Said<string>) => ({
  id,
  title: label,
  explains: [],
  model: { id: "cylinder" },
  track: [{
    t: 0,
    eastM: lineCentre.e,
    northM: lineCentre.n,
    // altitudeAboveGroundM is the lowest point of the body UNturned, so it is the height minus half of its length.
    altitudeAboveGroundM: Geometry.round(heightM - lineLength / 2, 3),
    sizeM: { widthM: 0.006, lengthM: 0.006, heightM: lineLength },
    // Laid flat (a quarter turn about its own axis of the up-pointing primitive), then turned onto the line's bearing.
    attitude: { headingDeg: lineBearingDeg - 90, pitchDeg: 0, rollDeg: 90 },
    appearance: { color: "#202020", albedo: 0.05 }
  }]
})

/** The thread, from the pivot on the lower line down to the top of the model. */
const thread = (swungAway: boolean) => {
  const drop = swungAway ? dropSwung : dropAtRest
  const end = swungAway ? swungTo : pivot
  const middle = { e: (pivot.e + end.e) / 2, n: (pivot.n + end.n) / 2 }
  return {
    eastM: Geometry.round(middle.e, 3),
    northM: Geometry.round(middle.n, 3),
    altitudeAboveGroundM: Geometry.round(Study.LOWER_LINE_M - drop / 2 - Study.THREAD_M / 2, 3),
    sizeM: { widthM: 0.0004, lengthM: 0.0004, heightM: Study.THREAD_M },
    // Top displaced the way it hangs back from: the same rule as the model's tip.
    attitude: { headingDeg: Study.BEARING_SECOND_DEG, pitchDeg: swungAway ? Study.SWING_DEG : 0, rollDeg: 0 }
  }
}

const interpretation = {
  type: "event",
  eventType: "interpretation",
  sighting: observer.id,
  title: title(
    "Une maquette d'environ 12 cm suspendue à un fil de 70 cm sous la ligne électrique, qui oscille de 9° entre les deux photographies",
    "A model about 12 cm across, hung on a 70 cm thread under the electric line, swinging 9° between the two photographs",
    "Una maqueta de unos 12 cm colgada de un hilo de 70 cm bajo la línea eléctrica, que oscila 9° entre las dos fotografías",
    "Un modellino di circa 12 cm appeso a un filo di 70 cm sotto la linea elettrica, che oscilla di 9° fra le due fotografie"),
  by: [{ people: "CousynAntoine" }, { people: "LouangeFrancois" }, { people: "QuickGeoff" }],
  bodies: [
    {
      id: "model",
      title: title("La maquette", "The model", "La maqueta", "Il modellino"),
      explains: ["ufo-1"],
      model: { id: "disc" },
      track: [
        {
          t: 0,
          eastM: Geometry.round(pivot.e, 3),
          northM: Geometry.round(pivot.n, 3),
          altitudeAboveGroundM: Geometry.round(restTop - Study.MODEL_HEIGHT_M, 3),
          sizeM: { widthM: Study.MODEL_WIDTH_M, lengthM: Study.MODEL_WIDTH_M, heightM: Study.MODEL_HEIGHT_M },
          attitude: { headingDeg: Study.BEARING_SECOND_DEG, pitchDeg: Study.TIP_FIRST_DEG },
          appearance: { color: "#8a8d91", albedo: 0.3 }
        },
        {
          t: T_SECOND_MS,
          eastM: Geometry.round(swungTo.e, 3),
          northM: Geometry.round(swungTo.n, 3),
          altitudeAboveGroundM: Geometry.round(swungTop - Study.MODEL_HEIGHT_M, 3),
          attitude: { headingDeg: Study.BEARING_SECOND_DEG, pitchDeg: Study.TIP_SECOND_DEG }
        }
      ]
    },
    {
      id: "thread",
      title: title("Le fil de suspension (supposé)", "The suspension thread (supposed)", "El hilo de suspensión (supuesto)", "Il filo di sospensione (supposto)"),
      explains: [],
      model: { id: "cylinder" },
      track: [
        { t: 0, ...thread(false), appearance: { color: "#303030", albedo: 0.1 } },
        { t: T_SECOND_MS, ...thread(true) }
      ]
    },
    wireBody("line-lower", Study.LOWER_LINE_M, title("Fil électrique inférieur (3,5 m)", "Lower electric wire (3.5 m)", "Cable eléctrico inferior (3,5 m)", "Filo elettrico inferiore (3,5 m)")),
    wireBody("line-upper", Study.LOWER_LINE_M + Study.LINE_SPACING_M, title("Fil électrique supérieur", "Upper electric wire", "Cable eléctrico superior", "Filo elettrico superiore"))
  ]
}

const caseJson = {
  id: "McMinnville1950",
  title: "McMinnville",
  time: "1950-05-11 19:45",
  events: [
    { type: "event", eventType: "sighting", time: "1950-05-11 19:45", title: "Paul Trent", url: "observer-mcminnville.json" },
    interpretation
  ]
}

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const directory = path.join(root, "public", "demo-data")
mkdirSync(directory, { recursive: true })
const write = (name: string, json: unknown): void => {
  writeFileSync(path.join(directory, name), JSON.stringify(json, null, 1) + "\n")
  console.log(`Wrote public/demo-data/${name}`)
}
write("observer-mcminnville.json", observer)
write("case-mcminnville.json", caseJson)
console.log(`second camera ${Geometry.round(second.e, 2)} E ${Geometry.round(second.n, 2)} N; model seen at ${seenFirst.altitudeDeg.toFixed(1)} deg from ${seenFirst.distanceM.toFixed(2)} m, then ${seenSecond.altitudeDeg.toFixed(1)} deg from ${seenSecond.distanceM.toFixed(2)} m`)
