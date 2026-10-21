import { LaserBeamSighting } from "./LaserBeam.js"
import { ParameterRegistry } from "./Parameters.js"
import type { ParameterSet, ParameterSpec } from "./Parameters.js"

/**
 * What a beam of light lets its author set (see BeamJson): its colour, its power, how it widens and when it is on, and the points of its path.
 * The beam kind's whole contribution to the editor: the form is built from it (see ParameterForm) and nothing in the editor knows what a beam is.
 * Nothing of its brightness is offered: that is what the air makes of it (see LaserBeamSighting).
 */
export class BeamParameters {
  private static readonly LIGHT = { en: "Light", fr: "Lumière", es: "Luz", it: "Luce" }
  private static readonly WHEN = { en: "When", fr: "Quand", es: "Cuándo", it: "Quando" }

  /** The path goes on as it was going: the step between the last two points taken once more, or half a kilometre east of a single one. */
  static nextPlace(rows: ReadonlyArray<Record<string, number>>): Record<string, number> {
    const last = rows[rows.length - 1] ?? { lat: 0, lng: 0, altitudeM: 0 }
    const before = rows[rows.length - 2]
    if (!before) return { lat: last.lat, lng: last.lng + 500 / (111320 * Math.max(0.05, Math.cos(last.lat * Math.PI / 180))), altitudeM: last.altitudeM }
    return { lat: 2 * last.lat - before.lat, lng: 2 * last.lng - before.lng, altitudeM: 2 * last.altitudeM - before.altitudeM }
  }

  /** An instant of the recording: stored in milliseconds, typed in seconds; empty is its start, or its end. */
  private static instant(key: "fromT" | "untilT", label: ParameterSpec["label"], hint: ParameterSpec["label"]): ParameterSpec {
    return { type: "number", key, min: -3600, max: 36000, step: 0.1, unit: "s", scale: 0.001, label, hint, group: BeamParameters.WHEN }
  }

  static readonly SET: ParameterSet = {
    kind: "beam",
    title: { en: "Beam", fr: "Faisceau", es: "Haz", it: "Fascio" },
    parameters: ([
      { type: "said", key: "title", label: { en: "Name", fr: "Nom", es: "Nombre", it: "Nome" }, group: BeamParameters.LIGHT },
      {
        type: "number", key: "wavelengthNm", min: 380, max: 780, step: 1, unit: "nm", required: true, group: BeamParameters.LIGHT,
        label: { en: "Wavelength", fr: "Longueur d'onde", es: "Longitud de onda", it: "Lunghezza d'onda" },
        hint: { en: "Its colour: 532 for the green of a frequency-doubled laser, 520 for a green diode, 638 for a red one, 450 for a blue one.",
          fr: "Sa couleur : 532 pour le vert d'un laser doublé en fréquence, 520 pour une diode verte, 638 pour une rouge, 450 pour une bleue.",
          es: "Su color: 532 para el verde de un láser doblado en frecuencia, 520 para un diodo verde, 638 para uno rojo, 450 para uno azul.",
          it: "Il suo colore: 532 per il verde di un laser a frequenza raddoppiata, 520 per un diodo verde, 638 per uno rosso, 450 per uno blu." }
      },
      {
        type: "number", key: "powerW", min: 0.001, max: 100000, step: 0.001, unit: "W", required: true, group: BeamParameters.LIGHT,
        label: { en: "Power", fr: "Puissance", es: "Potencia", it: "Potenza" },
        hint: { en: "The optical power it carries, its mean for a pulsed laser, whose pulses no eye tells apart. What is seen of it is what the air scatters.",
          fr: "La puissance optique qu'il porte, sa moyenne pour un laser pulsé, dont aucun œil ne distingue les impulsions. Ce qui s'en voit est ce que l'air en diffuse.",
          es: "La potencia óptica que lleva, su media para un láser pulsado, cuyos pulsos ningún ojo distingue. Lo que se ve de él es lo que el aire difunde.",
          it: "La potenza ottica che porta, la sua media per un laser pulsato, i cui impulsi nessun occhio distingue. Ciò che se ne vede è ciò che l'aria diffonde." }
      },
      {
        type: "number", key: "divergenceMrad", min: 0.001, max: 1000, step: 0.001, unit: "mrad", group: BeamParameters.LIGHT,
        effective: () => LaserBeamSighting.DEFAULT_DIVERGENCE_MRAD,
        label: { en: "Divergence", fr: "Divergence", es: "Divergencia", it: "Divergenza" },
        hint: { en: "How fast it widens, full angle: 0.1 mrad is a metre wide at 10 km.", fr: "À quelle vitesse il s'élargit, angle total : 0,1 mrad fait un mètre de large à 10 km.",
          es: "Lo rápido que se ensancha, ángulo total: 0,1 mrad es un metro de ancho a 10 km.", it: "Quanto in fretta si allarga, angolo totale: 0,1 mrad è un metro di larghezza a 10 km." }
      },
      {
        type: "number", key: "apertureM", min: 0.001, max: 10, step: 0.001, unit: "m", group: BeamParameters.LIGHT,
        effective: () => LaserBeamSighting.DEFAULT_APERTURE_M,
        label: { en: "Width at the emitter", fr: "Largeur à l'émetteur", es: "Anchura en el emisor", it: "Larghezza all'emettitore" }
      },
      BeamParameters.instant("fromT", { en: "On from", fr: "Allumé à", es: "Encendido a", it: "Acceso a" },
        { en: "Seconds of the recording; empty, from its start.", fr: "Secondes de l'enregistrement ; vide, dès son début.", es: "Segundos de la grabación; vacío, desde su inicio.", it: "Secondi della registrazione; vuoto, dal suo inizio." }),
      BeamParameters.instant("untilT", { en: "Off at", fr: "Éteint à", es: "Apagado a", it: "Spento a" },
        { en: "Seconds of the recording; empty, until its end.", fr: "Secondes de l'enregistrement ; vide, jusqu'à sa fin.", es: "Segundos de la grabación; vacío, hasta su final.", it: "Secondi della registrazione; vuoto, fino alla sua fine." })
    ] satisfies ParameterSpec[])
  }

  /** A point of the path: where the light leaves the emitter, is turned by a mirror, or ends. */
  static readonly PLACE: ParameterSet = {
    kind: "beam-place",
    title: { en: "Point of the path", fr: "Point du trajet", es: "Punto del trayecto", it: "Punto del percorso" },
    parameters: ([
      { type: "number", key: "lat", min: -90, max: 90, step: 0.000001, unit: "°", required: true, label: { en: "Latitude", fr: "Latitude", es: "Latitud", it: "Latitudine" } },
      { type: "number", key: "lng", min: -180, max: 180, step: 0.000001, unit: "°", required: true, label: { en: "Longitude", fr: "Longitude", es: "Longitud", it: "Longitudine" } },
      {
        type: "number", key: "altitudeM", min: -500, max: 100000, step: 0.1, unit: "m", required: true,
        label: { en: "Altitude", fr: "Altitude", es: "Altitud", it: "Altitudine" },
        hint: { en: "Above the sea, not the ground: an emitter at a window twelve metres up a building on ground at 160 m is at 172 m.",
          fr: "Au-dessus de la mer, pas du sol : un émetteur à une fenêtre à douze mètres de haut, sur un sol à 160 m, est à 172 m.",
          es: "Sobre el mar, no sobre el suelo: un emisor en una ventana a doce metros de altura, sobre un suelo a 160 m, está a 172 m.",
          it: "Sul mare, non sul suolo: un emettitore a una finestra a dodici metri d'altezza, su un suolo a 160 m, è a 172 m." }
      }
    ] satisfies ParameterSpec[])
  }

  /** Makes the beam kind known to the editor. */
  static publish(): void {
    ParameterRegistry.publish(BeamParameters.SET)
  }
}
