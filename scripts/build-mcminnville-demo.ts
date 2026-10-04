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
  /** The model: "11 à 14 cm", about 12, and as thick as the stand-in's dome, base and stub make it
   * (see build-mcminnville-object.ts). */
  static readonly MODEL_WIDTH_M = 0.12
  static readonly MODEL_HEIGHT_M = 0.041
  /** Its swing between the photographs, in the vertical plane of the sightline, away from the lens. */
  static readonly SWING_DEG = 9
  /** How much it tips: the base seen from below on the first (d1 = 21.2 degrees, of which 17.7 are
   * the camera's own view up to it), and the dome's side with the base out of sight on the second
   * (d2 = 3.6 degrees past edge on), 25 degrees in all. */
  static readonly TIP_FIRST_DEG = -3.2
  static readonly TIP_SECOND_DEG = 21.6
  /** How the object's axis leans in the image, c: 19 degrees on the first photograph and 17 on the
   * second (the study), clockwise, its right end the lower. The study gives the size of the angle and
   * not its sense, which the plates do: measured on the prints' blob (second moments), the long axis
   * runs 19.2 degrees clockwise on plate 23 and 14.7 to 9.2 on plate 24, the right end down. */
  static readonly LEAN_FIRST_DEG = 19
  static readonly LEAN_SECOND_DEG = 17
  /** The sightline's bearing from each camera, and the camera's pitch. The 13 degrees between the
   * two lines of sight are the study's; which way Trent faced is Condon's "north-east". */
  static readonly BEARING_FIRST_DEG = 45
  static readonly BEARING_SECOND_DEG = 32
  /** Where the object lies in each plate (Condon's plates 23 and 24, 19.3 px per degree, 645 px for
   * the 33.4 degrees of the frame): 3.7 degrees right of the centre and 2.9 above on the first,
   * 2.7 left and 1.3 above on the second. That gives the camera's own axis: the same 14.85 degrees
   * of pitch from both (so the two photographs agree, which is the check), and a heading that is
   * the object's bearing less its offset. */
  static readonly OFFSET_FIRST = { azimuthDeg: 3.7, altitudeDeg: 2.9 }
  static readonly OFFSET_SECOND = { azimuthDeg: -2.7, altitudeDeg: 1.3 }
  static readonly PITCH_DEG = 14.85
  /** The object's angular width on each photograph, c: 1.630 and 1.470 degrees. */
  static readonly WIDTH_FIRST_DEG = 1.63
  static readonly WIDTH_SECOND_DEG = 1.47
  /** Eccentricity of the base on the first photograph, e1 = 0.362: its height over its width. */
  static readonly ECCENTRICITY_FIRST = 0.362
  /** The negative, over the lens: 33 degrees up. */
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

/** The timeline: the object seen coming on, the first photograph, the step to the right and the second
 * 30 seconds later (Trent's estimate), then the departure. The lead-in and the departure are the
 * testimony's, with no measure: the lengths given here are ASSUMED. */
const T_FIRST_MS = 12000
const T_SECOND_MS = T_FIRST_MS + 30000
const T_STEP_MS = T_SECOND_MS - 4000
const T_END_MS = T_SECOND_MS + 8000

const title = (fr: string, en: string, es: string, it: string): Said<string> => ({ fr, en, es, it })

// -- The account: what the photographs show, each as one keyframe -------------------------------------

/** An oval of the object at a bearing and height, `widthDeg` wide. */
const ovalAt = (widthDeg: number, heightDeg: number, altitudeDeg: number, azimuthDeg: number, rationale: string, transparency?: number, leanDeg = 0) => ({
  sourceId: "ufo-1",
  shape: {
    aim: Claim.of({ azimuthDeg: Geometry.round(azimuthDeg, 2), altitudeDeg: Geometry.round(altitudeDeg, 2) }, "derived", rationale),
    kind: "oval",
    angular: { widthDeg: Geometry.round(widthDeg, 3), heightDeg: Geometry.round(heightDeg, 3) },
    ...(leanDeg === 0 ? {} : { angle: Geometry.round(leanDeg * Geometry.DEG, 4) }),
    // The prints show it dark against the sky, its base in shadow: the witnesses' "silvery" is the account, this is the photograph.
    color: "#2c2c2e",
    ...(transparency === undefined ? {} : { transparency }),
    title: title("Objet", "Object", "Objeto", "Oggetto")
  }
})

/** The small stub on top of the object that Cousyn's model has too, and that plate 26 shows: about
 * 0.08 degrees wide and 0.05 high on the first photograph, a little left of the middle. Scaled with
 * the object. Where it is on the second is not measured, and it is kept in the same place on it. */
const antennaAt = (objectWidthDeg: number, objectHeightDeg: number, altitudeDeg: number, azimuthDeg: number, transparency?: number) => {
  const scale = objectWidthDeg / Study.WIDTH_FIRST_DEG
  return {
    sourceId: "antenna",
    shape: {
      aim: Claim.of({
        azimuthDeg: Geometry.round(azimuthDeg - 0.1 * scale, 3),
        altitudeDeg: Geometry.round(altitudeDeg + objectHeightDeg / 2 + 0.02 * scale, 3)
      }, "assumed", "Plate 26 (MM1 enlarged): a stub about 22 px wide on the 470 px of the disc, 28 px left of its centre, standing just over its top edge."),
      kind: "oval",
      angular: { widthDeg: Geometry.round(0.077 * scale, 4), heightDeg: Geometry.round(0.05 * scale, 4) },
      color: "#2c2c2e",
      ...(transparency === undefined ? {} : { transparency }),
      title: title("Petite antenne", "Small antenna", "Pequeña antena", "Piccola antenna")
    }
  }
}

/** Both shapes of the object at one instant. */
const objectAt = (widthDeg: number, heightDeg: number, altitudeDeg: number, azimuthDeg: number, rationale: string, transparency?: number, leanDeg = 0) =>
  [ovalAt(widthDeg, heightDeg, altitudeDeg, azimuthDeg, rationale, transparency, leanDeg), antennaAt(widthDeg, heightDeg, altitudeDeg, azimuthDeg, transparency)]

/** The Trents' house, from where its right-hand end shows in plate 23 (13.6 degrees left of the
 * centre) and plate 24 (10.2 left): the parallax of the two puts that corner about 15 m off, with
 * wide error bars (a degree of reading is 5 m), and a roof edge 14 degrees up in plate 23, which at
 * that distance is 5 m up: a big roof, as the overlay shows it. Its front is square to the
 * first sightline. The plans (Maccabee's) are not in the study, so this is a placement, not a measure. */
class House {
  static readonly CORNER_DISTANCE_M = 15
  static readonly WIDTH_M = 12
  static readonly DEPTH_M = 8
  static readonly RIDGE_M = 8
  static readonly CORNER_BEARING_DEG = Study.BEARING_FIRST_DEG - Study.OFFSET_FIRST.azimuthDeg - 13.6
}
const houseCorner = Geometry.along(first, House.CORNER_BEARING_DEG, House.CORNER_DISTANCE_M)
const house = (() => {
  const toLeft = Geometry.along({ e: 0, n: 0 }, Study.BEARING_FIRST_DEG - Study.OFFSET_FIRST.azimuthDeg - 90, 1)
  const away = Geometry.along({ e: 0, n: 0 }, Study.BEARING_FIRST_DEG - Study.OFFSET_FIRST.azimuthDeg, 1)
  return {
    centre: {
      e: Geometry.round(houseCorner.e + toLeft.e * House.WIDTH_M / 2 + away.e * House.DEPTH_M / 2, 2),
      n: Geometry.round(houseCorner.n + toLeft.n * House.WIDTH_M / 2 + away.n * House.DEPTH_M / 2, 2)
    }
  }
})()

const headingFirst = Study.BEARING_FIRST_DEG - Study.OFFSET_FIRST.azimuthDeg
const headingSecond = Study.BEARING_SECOND_DEG - Study.OFFSET_SECOND.azimuthDeg

/** The line: it runs across the first sightline, as in both plates, from the house's eave (anchored
 * 2.2 m along it from the point above the model, where it meets the house's front) to an end the
 * plates do not show and that is made long enough to leave the frame. */
const lineBearingDeg = Study.BEARING_FIRST_DEG + 90
const towardHouse = Geometry.along({ e: 0, n: 0 }, lineBearingDeg + 180, 1)
const lineFrom = 6
const lineTo = -9
const lineLength = lineFrom - lineTo
const lineCentre = {
  e: Geometry.round(pivot.e + towardHouse.e * (lineFrom + lineTo) / 2, 2),
  n: Geometry.round(pivot.n + towardHouse.n * (lineFrom + lineTo) / 2, 2)
}

const observer = {
  version: 1,
  id: "1950-05-11-TrentPaul",
  time: Claim.of({ year: 1950, month: 5, day: 11, hour: 19, minute: 45, second: 0 }, "derived",
    "Condon's case 46 gives 19:45 (Evelyn Trent: \"about 8 o'clock less a quarter\"), others 19:30. Read as Pacific STANDARD time the Sun would already be 2.4 degrees below the horizon (sunset 19:27) and the sky of the photographs is in daylight, so the clock the Trents read is taken to be summer time, as the Sun's height in the plates needs."),
  durationSeconds: Claim.of(T_END_MS / 1000, "assumed", "Trent: both photographs \"within 30 seconds\" (Condon, case 46, from the Telephone Register of 8 June 1950); the object's coming on before the first and its leaving after the second are the account's, and their lengths are not given."),
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
        shapes: objectAt(1.2, 0.54, seenFirst.altitudeDeg + 1.5, Study.BEARING_FIRST_DEG + 13,
          "Condon: first seen \"apparently towards the north-east\", coming towards the Trents and \"moving slowly towards the west\". Where and how big it was then is not given: a little to the right of where the first photograph finds it, a little smaller and higher, ASSUMED.")
      },
      {
        t: T_FIRST_MS,
        shapes: objectAt(Study.WIDTH_FIRST_DEG, Study.WIDTH_FIRST_DEG * Study.ECCENTRICITY_FIRST, seenFirst.altitudeDeg, Study.BEARING_FIRST_DEG,
          "MM1: where the object lies in plate 23 (3.7 degrees right of the centre, 2.9 above), on the camera's axis: its bearing is the one the wire geometry gives (the lower line 3.5 m up, the model 0.7 m under it, the camera at 1.5 m and 4 m from the line). Its width is the study's c, 1.630 degrees, its height the base's eccentricity e1 = 0.362 times that. Its axis leans 19 degrees clockwise (the study's c1, its sense measured on the plate).", undefined, Study.LEAN_FIRST_DEG)
      },
      {
        t: T_SECOND_MS,
        shapes: objectAt(Study.WIDTH_SECOND_DEG, Study.WIDTH_SECOND_DEG * 0.4, seenSecond.altitudeDeg, Study.BEARING_SECOND_DEG,
          "MM2: where the object lies in plate 24 (2.7 degrees left of the centre, 1.3 above), from the second position, 4.3 m from the line, the model swung 9 degrees away. Its width is c = 1.470 degrees. Its height, 0.4 of that, is ASSUMED: the base is no longer seen (e2 = 0.063), the dome's side is, and the study does not measure its height. Its axis leans 17 degrees clockwise (the study's c2, the sense measured on the plate).", undefined, Study.LEAN_SECOND_DEG)
      },
      {
        t: T_SECOND_MS + 2000,
        shapes: objectAt(1.3, 0.52, seenSecond.altitudeDeg - 2, 8,
          "Condon: after the second photograph it \"accelerated slowly\" and went off \"rapidly towards the west\". How fast is not given: a swing to the left, out of the frame, in two seconds, ASSUMED.")
      },
      {
        t: T_SECOND_MS + 5000,
        shapes: objectAt(0.6, 0.24, 8, 300, "As above: still going west, smaller as it goes. ASSUMED.")
      },
      {
        t: T_END_MS,
        shapes: objectAt(0.3, 0.12, 3, 270, "\"Fading faintly towards the west\" (Condon, from Mrs Trent): gone, due west, low. ASSUMED.", 1)
      }
    ],
    order: ["ufo-1", "antenna"],
    groups: []
  },
  milestones: [
    {
      t: 0,
      label: "A",
      note: title("Evelyn Trent voit l'objet au nord-est et appelle son mari ; il vient vers eux.", "Evelyn Trent sees the object to the north-east and calls her husband; it comes towards them.",
        "Evelyn Trent ve el objeto al nordeste y llama a su marido; viene hacia ellos.", "Evelyn Trent vede l'oggetto a nord-est e chiama il marito; viene verso di loro.")
    },
    {
      t: T_FIRST_MS,
      label: "MM1",
      note: title("La première photographie.", "The first photograph.", "La primera fotografía.", "La prima fotografia.")
    },
    {
      t: T_SECOND_MS,
      label: "MM2",
      note: title("La seconde, après un pas à droite : l'objet a « tourné vers le nord-ouest ».", "The second, after a step to his right: the object has \"turned towards the north-west\".",
        "La segunda, tras un paso a la derecha: el objeto ha \"girado hacia el noroeste\".", "La seconda, dopo un passo a destra: l'oggetto \"ha girato verso nord-ovest\".")
    },
    {
      t: T_END_MS,
      label: "B",
      note: title("L'objet s'éloigne rapidement vers l'ouest.", "The object leaves quickly to the west.", "El objeto se aleja rápidamente hacia el oeste.", "L'oggetto si allontana rapidamente verso ovest.")
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
          headingDeg: Claim.of(Geometry.round(headingFirst, 2), "derived", "Condon, case 46: \"apparently towards the north-east\"; the heading is the object's bearing less its 3.7 degrees right of the centre in plate 23."),
          pitchDeg: Claim.of(Study.PITCH_DEG, "derived", "The object is at 17.7 degrees by the wire geometry and 2.9 above the centre in plate 23, 16.2 and 1.3 in plate 24: 14.85 degrees both times, which is how the two plates agree. The study gives a line of sight of about 11.5 degrees.")
        }
      },
      {
        t: T_STEP_MS,
        pose: {
          ...geographic(first),
          elevationM: Geometry.round(Study.CAMERA_HEIGHT_M - 1.6, 2),
          fovDeg: Geometry.round(Study.FIELD_DEG, 2),
          headingDeg: Geometry.round(headingFirst, 2),
          pitchDeg: Study.PITCH_DEG
        }
      },
      {
        t: T_SECOND_MS,
        pose: {
          ...geographic(second),
          elevationM: Geometry.round(Study.CAMERA_HEIGHT_M - 1.6, 2),
          fovDeg: Geometry.round(Study.FIELD_DEG, 2),
          headingDeg: Claim.of(Geometry.round(headingSecond, 2), "derived", "The object's bearing from the second position (13 degrees from the first, the study's turn of the line of sight) less its 2.7 degrees left of the centre in plate 24."),
          pitchDeg: Study.PITCH_DEG
        }
      }
    ]
  },
  references: [1, 2].map(number => {
    const isSecond = number === 2
    return {
      id: `mm${number}`,
      kind: "photo",
      src: `mcminnville/mm${number}.jpg`,
      title: title(
        `MM${number}, planche ${22 + number} du rapport Condon (annotée à la craie par l'équipe)`,
        `MM${number}, plate ${22 + number} of the Condon report (chalk-marked by the team)`,
        `MM${number}, lámina ${22 + number} del informe Condon (marcada con tiza por el equipo)`,
        `MM${number}, tavola ${22 + number} del rapporto Condon (segnata a gesso dal gruppo)`),
      credit: `Condon report, case 46, plate ${22 + number} (photograph: UPI)`,
      creditUrl: "https://rr0.org/time/1/9/6/8/CondonReport/s4/c3/46/case46.html",
      t: isSecond ? T_SECOND_MS : T_FIRST_MS,
      from: geographic(isSecond ? second : first),
      drawing: true,
      opacity: 0.5,
      registration: {
        headingDeg: Geometry.round(isSecond ? headingSecond : headingFirst, 2),
        pitchDeg: Study.PITCH_DEG,
        fovDeg: Geometry.round(Study.FIELD_DEG, 2)
      }
    }
  }),
  decor: [
    {
      id: "house",
      kind: "building",
      title: title("Maison des Trent (avec sa citerne, à gauche des deux photographies)", "The Trents' house (with its tank, at the left of both photographs)",
        "Casa de los Trent (con su depósito, a la izquierda de las dos fotografías)", "Casa dei Trent (con la sua cisterna, a sinistra nelle due fotografie)"),
      eastM: house.centre.e,
      northM: house.centre.n,
      headingDeg: Geometry.round(headingFirst, 1),
      sizeM: { widthM: House.WIDTH_M, lengthM: House.DEPTH_M, heightM: House.RIDGE_M },
      model: { id: "kenney-suburban-house" }
    },
    {
      id: "line",
      kind: "wire",
      title: title("Ligne électrique (deux fils superposés, 3,5 m et 3,64 m)", "The electric line (two stacked wires, 3.5 m and 3.64 m)",
        "La línea eléctrica (dos cables superpuestos, 3,5 m y 3,64 m)", "La linea elettrica (due fili sovrapposti, 3,5 m e 3,64 m)"),
      eastM: lineCentre.e,
      northM: lineCentre.n,
      // Pointing to the south-east end, where its pole stands; the other end is anchored on the house.
      headingDeg: lineBearingDeg,
      sizeM: { widthM: 1, lengthM: lineLength, heightM: Study.LOWER_LINE_M },
      wire: { strands: [{ heightM: Study.LOWER_LINE_M }, { heightM: Study.LOWER_LINE_M + Study.LINE_SPACING_M }], poles: "end", diameterM: 0.006 }
    }
  ],
  weatherTrack: {
    keyframes: [
      {
        t: 0,
        weather: {
          cloudLayers: [{ id: "ceiling", type: "stratus", baseM: 1500, thicknessM: 500, coverage: 0.4, sizeM: 2500, density: 1 }],
          cloudCover: 0.4,
          cloudDarkness: 0.3,
          cloudBaseM: 1500,
          highCloudCover: 0,
          lowerCloudCover: 0.4,
          relativeHumidity: 0.7,
          precipitationType: "none",
          precipitationIntensity: 0,
          // A light breeze (IPACO: earlier investigators noted one); where it blew from is not given, and a wind
          // with no direction drove the clouds, and so the Sun's light through them, to NaN: west, ASSUMED.
          windDirectionDeg: 270,
          windSpeed: 1.5,
          storm: false
        }
      }
    ]
  },
  weatherSource: {
    id: "condon-46",
    name: "Condon, case 46: overcast, ceiling about 5,000 ft \"confirmed by the photographs\" (the recording takes 4/10: the prints' shadows need a Sun that shone through, which a full overcast does not allow, and the study itself suspects the cloud changed between the two); light wind noted by earlier investigators (IPACO), its direction not given (west assumed)",
    url: "https://rr0.org/time/1/9/6/8/CondonReport/s4/c3/46/case46.html"
  },
  instrument: "roamer-1-120",
  exposureSeconds: 0.02,
  iso: Claim.of(125, "assumed", "A box camera's black and white roll film of 1950 (Verichrome, ASA 125): the study gives the camera and the 1/50 s, not the film.")
}

// -- The interpretation: the study's model, its thread and the line, in metres ---------------------

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

/** How the object stands at each photograph, in the body's own terms. Its heading is the bearing of
 * the sightline, so that a tip (pitch) is along the line of sight, which is what shows or hides the
 * base, and a roll is about it, which is the lean in the image. */
class Pose {
  static readonly FIRST = { headingDeg: Study.BEARING_FIRST_DEG, pitchDeg: Study.TIP_FIRST_DEG, rollDeg: Study.LEAN_FIRST_DEG }
  static readonly SECOND = { headingDeg: Study.BEARING_SECOND_DEG, pitchDeg: Study.TIP_SECOND_DEG, rollDeg: Study.LEAN_SECOND_DEG }
}

/** The model, with its small stub on top, as both studies have it: the position and the tip
 * come from the geometry of the photographs, which both parts of the study share. */
const modelBodies = () => [
  {
    id: "model",
    title: title("La maquette", "The model", "La maqueta", "Il modellino"),
    explains: ["ufo-1"],
    model: { id: "ufoathome-mcminnville-object" },
    track: [
      {
        t: 0,
        eastM: Geometry.round(pivot.e, 3),
        northM: Geometry.round(pivot.n, 3),
        altitudeAboveGroundM: Geometry.round(restTop - Study.MODEL_HEIGHT_M, 3),
        sizeM: { widthM: Study.MODEL_WIDTH_M, lengthM: Study.MODEL_WIDTH_M, heightM: Study.MODEL_HEIGHT_M },
        attitude: Pose.FIRST,
        appearance: { color: "#8a8d91", albedo: 0.3 }
      },
      { t: T_STEP_MS, attitude: Pose.FIRST },
      {
        t: T_SECOND_MS,
        eastM: Geometry.round(swungTo.e, 3),
        northM: Geometry.round(swungTo.n, 3),
        altitudeAboveGroundM: Geometry.round(swungTop - Study.MODEL_HEIGHT_M, 3),
        attitude: Pose.SECOND
      }
    ]
  }
]

/** The thread, the second part's finding: drawn only there, since the first found no trace of one. */
const threadBody = () => ({
  id: "thread",
  title: title("Le fil de suspension (mis en évidence)", "The suspension thread (detected)", "El hilo de suspensión (detectado)", "Il filo di sospensione (rilevato)"),
  explains: [],
  model: { id: "cylinder" },
  track: [
    { t: 0, ...thread(false), appearance: { color: "#303030", albedo: 0.1 } },
    { t: T_STEP_MS, ...thread(false) },
    { t: T_SECOND_MS, ...thread(true) }
  ]
})

/**
 * The same object, as something else: what the photographs say is an angular width (c, 1.63 and 1.47
 * degrees) and an aspect (the base seen from below on the first, not on the second), and both are
 * the same for an object of any size at the distance that fits it. So each comparison keeps the
 * model's tip and its look and changes only its size and, with it, its distance along the very
 * direction the photographs give: a hubcap, a car mirror, a disc 25 m wide. What separates them is
 * the lines (a model hung under them is 4 m off, a disc 900 m away is not) and the photometry, which
 * is what the study measures.
 */
/** One instant of an object seen at a bearing and a height, `widthDeg` wide: what the account gives. */
interface Station {
  t: number
  azimuthDeg: number
  altitudeDeg: number
  widthDeg: number
  pose?: { headingDeg: number, pitchDeg: number, rollDeg: number }
  present?: boolean
}

/** The stations the photographs fix, and between them the testimony's coming on and leaving. */
const PHOTOGRAPHED: Station[] = [
  { t: T_FIRST_MS, azimuthDeg: Study.BEARING_FIRST_DEG, altitudeDeg: seenFirst.altitudeDeg, widthDeg: Study.WIDTH_FIRST_DEG, pose: Pose.FIRST },
  { t: T_STEP_MS, azimuthDeg: Study.BEARING_FIRST_DEG, altitudeDeg: seenFirst.altitudeDeg, widthDeg: Study.WIDTH_FIRST_DEG, pose: Pose.FIRST },
  { t: T_SECOND_MS, azimuthDeg: Study.BEARING_SECOND_DEG, altitudeDeg: seenSecond.altitudeDeg, widthDeg: Study.WIDTH_SECOND_DEG, pose: Pose.SECOND }
]

/** A comparison stands where the first photograph has it from the start of the recording: a body
 * is hidden before its first keyframe, and one that began at the first photograph was not there at
 * the very instant the print is laid over it. */
const HELD_FROM_START: Station[] = [{ ...PHOTOGRAPHED[0], t: 0 }, ...PHOTOGRAPHED]

const sameAngleBody = (id: string, label: Said<string>, sizeM: number, stations: Station[] = HELD_FROM_START) => {
  const size = { widthM: sizeM, lengthM: sizeM, heightM: Geometry.round(sizeM * Study.MODEL_HEIGHT_M / Study.MODEL_WIDTH_M, 3) }
  return {
    id,
    title: label,
    explains: ["ufo-1"],
    model: { id: "ufoathome-mcminnville-object" },
    track: stations.map((station, index) => ({
      t: station.t,
      // Stationary stations are held by the keyframe before: only what changes is restated.
      ...(index === 0 || station.azimuthDeg !== stations[index - 1].azimuthDeg || station.altitudeDeg !== stations[index - 1].altitudeDeg || station.widthDeg !== stations[index - 1].widthDeg
        ? {
          azimuthDeg: Geometry.round(station.azimuthDeg, 2),
          altitudeDeg: Geometry.round(station.altitudeDeg, 2),
          // The size is the same all through, so the distance is what makes the angle.
          distanceM: Geometry.round(sizeM / (station.widthDeg * Geometry.DEG), 1)
        } : {}),
      ...(index === 0 ? { sizeM: size, appearance: { color: "#8a8d91", albedo: 0.3 } } : {}),
      ...(station.pose ? { attitude: station.pose } : {}),
      ...(station.present === undefined ? {} : { present: station.present })
    }))
  }
}

const comparison = (sizeCm: number, fr: string, en: string, es: string, it: string, by?: { people: string }[]) => {
  const metres = sizeCm / 100
  const metresAway = Geometry.round(metres / (Study.WIDTH_FIRST_DEG * Geometry.DEG), 1)
  const fmt = (value: number, language: string): string => value.toLocaleString(language, { maximumFractionDigits: value >= 100 ? 0 : 1 })
  const label = (text: string, language: string): string => text.replace("{d}", fmt(metresAway, language))
  return {
    type: "event",
    eventType: "interpretation",
    sighting: observer.id,
    ...(by ? { by } : {}),
    title: title(label(fr, "fr"), label(en, "en"), label(es, "es"), label(it, "it")),
    bodies: [sameAngleBody("object", title(label(fr, "fr"), label(en, "en"), label(es, "es"), label(it, "it")), metres)]
  }
}

const authors = [{ people: "CousynAntoine" }, { people: "LouangeFrancois" }, { people: "QuickGeoff" }]

const firstPart = {
  type: "event",
  eventType: "interpretation",
  sighting: observer.id,
  time: "2013-04",
  title: title(
    "Avril 2013 : une maquette d'environ 12 cm sous le fil inférieur de la ligne, qui oscille de 9° entre les deux photographies (aucun fil visible)",
    "April 2013: a model about 12 cm across under the lower wire of the line, swinging 9° between the two photographs (no thread seen)",
    "Abril de 2013: una maqueta de unos 12 cm bajo el cable inferior de la línea, que oscila 9° entre las dos fotografías (ningún hilo visible)",
    "Aprile 2013: un modellino di circa 12 cm sotto il filo inferiore della linea, che oscilla di 9° fra le due fotografie (nessun filo visibile)"),
  by: authors,
  bodies: modelBodies()
}

const secondPart = {
  type: "event",
  eventType: "interpretation",
  sighting: observer.id,
  time: "2013-06",
  title: title(
    "Juin 2013 : la même maquette au bout d'un fil de 70 cm, mis en évidence sur les deux photographies",
    "June 2013: the same model at the end of a 70 cm thread, detected on both photographs",
    "Junio de 2013: la misma maqueta al extremo de un hilo de 70 cm, detectado en las dos fotografías",
    "Giugno 2013: lo stesso modellino all'estremità di un filo di 70 cm, rilevato su entrambe le fotografie"),
  by: authors,
  bodies: [...modelBodies(), threadBody()]
}

/**
 * What Trent himself said it was, so that the account is drawn in the round and not only as angles.
 *
 * He would not guess its size or distance, "the only thing I know is that it was moving terribly
 * fast", but one early reference has him estimating a diameter of "20 or 30 feet" (Condon, case 46,
 * reference 3): a disc 7.6 m across, the middle of it. That is all the size there is, and the
 * distance follows from it and the angle the photographs measure (1.63 degrees: 267 m). It comes on,
 * is photographed twice and leaves, as the shapes do.
 */
const WITNESS_SIZE_M = 7.62
const WITNESS_STATIONS: Station[] = [
  { t: 0, azimuthDeg: Study.BEARING_FIRST_DEG + 13, altitudeDeg: seenFirst.altitudeDeg + 1.5, widthDeg: 1.2, pose: Pose.FIRST },
  ...PHOTOGRAPHED,
  { t: T_SECOND_MS + 2000, azimuthDeg: 8, altitudeDeg: seenSecond.altitudeDeg - 2, widthDeg: 1.3, pose: Pose.SECOND },
  { t: T_SECOND_MS + 5000, azimuthDeg: 300, altitudeDeg: 8, widthDeg: 0.6, pose: Pose.SECOND },
  { t: T_END_MS, azimuthDeg: 270, altitudeDeg: 3, widthDeg: 0.3, pose: Pose.SECOND },
  { t: T_END_MS + 500, azimuthDeg: 270, altitudeDeg: 3, widthDeg: 0.3, present: false }
]
const witnessMetres = Math.round(WITNESS_SIZE_M / (Study.WIDTH_FIRST_DEG * Geometry.DEG))
const witnessReading = {
  title: title(
    `Selon Trent : un disque de 20 à 30 pieds (environ 8 m), donc à ${witnessMetres} m pour la largeur mesurée`,
    `As Trent put it: a disc 20 or 30 feet across (about 8 m), so ${witnessMetres} m off for the measured width`,
    `Según Trent: un disco de 20 o 30 pies (unos 8 m), es decir a ${witnessMetres} m para el ancho medido`,
    `Secondo Trent: un disco di 20 o 30 piedi (circa 8 m), dunque a ${witnessMetres} m per la larghezza misurata`),
  bodies: [sameAngleBody("disc", title("Le disque de Trent", "Trent's disc", "El disco de Trent", "Il disco di Trent"), WITNESS_SIZE_M, WITNESS_STATIONS)]
}

/**
 * The same account seen close up: a view 2.4 degrees across, kept on the object, so that its form can
 * be looked at. At the 33 degrees of the photographs it is 25 pixels wide, and a dome, a base and a
 * lean are only a shape; at 2.4 it is a third of the screen, and the hypotheses that match its angular
 * width (a model, a hubcap, a disc) are seen to be one look at three sizes. It looks through no
 * instrument, since an enlargement is not a camera, and keeps the plates over it.
 */
const observerWithReading = { ...observer, interpretation: witnessReading }

const closeUp = (() => {
  const centred = (headingDeg: number, altitudeDeg: number) => ({ headingDeg: Geometry.round(headingDeg, 2), pitchDeg: Geometry.round(altitudeDeg, 2), fovDeg: 2.4 })
  const keyframes = observer.observerTrack.keyframes.map((key, index) => ({
    t: key.t,
    pose: {
      lat: key.pose.lat,
      lng: key.pose.lng,
      elevationM: key.pose.elevationM,
      ...(index < 2 ? centred(Study.BEARING_FIRST_DEG, seenFirst.altitudeDeg) : centred(Study.BEARING_SECOND_DEG, seenSecond.altitudeDeg))
    }
  }))
  const { exposureSeconds, iso, ...rest } = observerWithReading
  void exposureSeconds
  void iso
  return {
    ...rest,
    id: `${observer.id}-closeup`,
    observer: { id: "TrentPaul-closeup", title: "Gros plan sur l'objet (champ de 2,4°)" },
    description: {
      fr: "Le même compte rendu, agrandi : une vue de 2,4° de large, gardée sur l'objet, pour en voir la forme (base sombre, dôme, petite antenne, inclinaison) à la taille où chacune des hypothèses la montre.",
      en: "The same account, enlarged: a view 2.4° across, kept on the object, to see its form (dark base, dome, small stub, lean) at the size where each hypothesis shows it.",
      es: "El mismo relato, ampliado: una vista de 2,4° de ancho, mantenida sobre el objeto, para ver su forma (base oscura, cúpula, pequeña antena, inclinación) al tamaño en que cada hipótesis la muestra.",
      it: "Lo stesso resoconto, ingrandito: una vista di 2,4° di larghezza, tenuta sull'oggetto, per vederne la forma (base scura, cupola, piccola antenna, inclinazione) alla dimensione in cui ogni ipotesi la mostra."
    },
    instrument: "eye",
    // An enlargement is held by nobody: the sway a standing observer's view has would shake a field
    // 2.4 degrees across by a third of its width.
    sway: 0,
    // The plates are magnified with it, fourteen-fold: kept faint, so that they do not wash the
    // object's form out, and fully there under the slider.
    references: observer.references.map(reference => ({ ...reference, opacity: 0.15 })),
    observerTrack: { keyframes }
  }
})()

const interpretations = [
  firstPart,
  secondPart,
  comparison(30, "Pour comparer : un enjoliveur de 30 cm à {d} m, même largeur angulaire et même aspect",
    "For comparison: a 30 cm hubcap at {d} m, the same angular width and the same look",
    "Para comparar: un tapacubos de 30 cm a {d} m, misma anchura angular y mismo aspecto",
    "Per confronto: un copricerchio di 30 cm a {d} m, stessa larghezza angolare e stesso aspetto"),
  comparison(18, "Pour comparer : un rétroviseur de voiture de 18 cm à {d} m, même largeur angulaire et même aspect",
    "For comparison: an 18 cm car mirror at {d} m, the same angular width and the same look",
    "Para comparar: un retrovisor de coche de 18 cm a {d} m, misma anchura angular y mismo aspecto",
    "Per confronto: uno specchietto retrovisore di 18 cm a {d} m, stessa larghezza angolare e stesso aspetto"),
  comparison(1200, "Rapport Condon : un disque de l'ordre de la dizaine de mètres, ici 12 m à {d} m (Hartmann donne 0,44 km), même largeur angulaire et même aspect",
    "Condon report: a disc of the order of ten metres, here 12 m at {d} m (Hartmann gives 0.44 km), the same angular width and the same look",
    "Informe Condon: un disco del orden de diez metros, aquí 12 m a {d} m (Hartmann da 0,44 km), misma anchura angular y mismo aspecto",
    "Rapporto Condon: un disco dell'ordine di una decina di metri, qui 12 m a {d} m (Hartmann dà 0,44 km), stessa larghezza angolare e stesso aspetto",
    [{ people: "HartmannWilliam" }])
]

/** A reading as the recording files it: the event without its envelope. */
const filed = (event: { title: Said<string>, by?: unknown, time?: string, bodies: unknown[] }) => ({
  title: event.title,
  ...(event.by ? { by: event.by } : {}),
  ...(event.time ? { time: event.time } : {}),
  bodies: event.bodies
})

// The readings live in the recording itself, so that it is a sighting with several interpretations
// whether or not a case is around it: the observer's own (the account) and these.
const withReadings = <T extends object>(recording: T) => ({ ...recording, interpretations: interpretations.map(filed) })

const caseJson = {
  id: "McMinnville1950",
  title: "McMinnville",
  time: "1950-05-11 19:45",
  events: [
    { type: "event", eventType: "sighting", time: "1950-05-11 19:45", title: "Paul Trent", url: "observer-mcminnville.json" },
    { type: "event", eventType: "sighting", time: "1950-05-11 19:45", title: "Paul Trent, gros plan", url: "observer-mcminnville-closeup.json" }
  ]
}

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const directory = path.join(root, "public", "demo-data")
mkdirSync(directory, { recursive: true })
const write = (name: string, json: unknown): void => {
  writeFileSync(path.join(directory, name), JSON.stringify(json, null, 1) + "\n")
  console.log(`Wrote public/demo-data/${name}`)
}
write("observer-mcminnville.json", withReadings(observerWithReading))
write("observer-mcminnville-closeup.json", withReadings(closeUp))
write("case-mcminnville.json", caseJson)
console.log(`second camera ${Geometry.round(second.e, 2)} E ${Geometry.round(second.n, 2)} N; model seen at ${seenFirst.altitudeDeg.toFixed(1)} deg from ${seenFirst.distanceM.toFixed(2)} m, then ${seenSecond.altitudeDeg.toFixed(1)} deg from ${seenSecond.distanceM.toFixed(2)} m`)
