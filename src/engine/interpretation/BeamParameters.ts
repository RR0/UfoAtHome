import { LaserBeamSighting } from "./LaserBeam.js"
import type { BeamJson } from "./LaserBeam.js"
import { ParameterRegistry } from "./Parameters.js"
import type { ParameterSet, ParameterSpec } from "./Parameters.js"

/**
 * What a beam of light lets its author set (see BeamJson): its colour, its power, how it widens and when it is on, and the points of its path.
 * The beam kind's whole contribution to the editor: the form is built from it (see ParameterForm) and nothing in the editor knows what a beam is.
 * Nothing of its brightness is offered: that is what the air makes of it (see LaserBeamSighting).
 */
export class BeamParameters {
  private static readonly LIGHT_TITLE = { en: "Light", fr: "Lumière", es: "Luz", it: "Luce" }
  private static readonly BEAM = { en: "Beam", fr: "Faisceau", es: "Haz", it: "Fascio" }
  private static readonly WHEN = { en: "When", fr: "Quand", es: "Cuándo", it: "Quando" }

  /** The path goes on as it was going: the step between the last two points taken once more, or half a kilometre east of a single one. */
  static nextPlace(rows: ReadonlyArray<Record<string, number>>): Record<string, number> {
    const last = rows[rows.length - 1] ?? { lat: 0, lng: 0, altitudeM: 0 }
    const before = rows[rows.length - 2]
    if (!before) return { lat: last.lat, lng: last.lng + 500 / (111320 * Math.max(0.05, Math.cos(last.lat * Math.PI / 180))), altitudeM: last.altitudeM }
    return { lat: 2 * last.lat - before.lat, lng: 2 * last.lng - before.lng, altitudeM: 2 * last.altitudeM - before.altitudeM }
  }

  /** An instant of the recording: stored in milliseconds, typed in seconds; empty is its start, or its end. */
  private static instant(key: string, label: ParameterSpec["label"], hint: ParameterSpec["label"], required = false): ParameterSpec {
    return { type: "number", key, min: -3600, max: 36000, step: 0.1, unit: "s", scale: 0.001, label, hint, ...(required ? { required } : {}) }
  }

  /** What does not change while the beam is on: its name, how it widens, and the haze it crosses. */
  static readonly SET: ParameterSet = {
    kind: "beam",
    title: { en: "Beam", fr: "Faisceau", es: "Haz", it: "Fascio" },
    parameters: ([
      { type: "said", key: "title", label: { en: "Name", fr: "Nom", es: "Nombre", it: "Nome" }, group: BeamParameters.BEAM },
      {
        type: "number", key: "divergenceMrad", min: 0.001, max: 1000, step: 0.001, unit: "mrad", group: BeamParameters.BEAM,
        effective: () => LaserBeamSighting.DEFAULT_DIVERGENCE_MRAD,
        label: { en: "Divergence", fr: "Divergence", es: "Divergencia", it: "Divergenza" },
        hint: { en: "How fast it widens, full angle: 0.1 mrad is a metre wide at 10 km.", fr: "À quelle vitesse il s'élargit, angle total : 0,1 mrad fait un mètre de large à 10 km.",
          es: "Lo rápido que se ensancha, ángulo total: 0,1 mrad es un metro de ancho a 10 km.", it: "Quanto in fretta si allarga, angolo totale: 0,1 mrad è un metro di larghezza a 10 km." }
      },
      {
        type: "number", key: "apertureM", min: 0.001, max: 10, step: 0.001, unit: "m", group: BeamParameters.BEAM,
        effective: () => LaserBeamSighting.DEFAULT_APERTURE_M,
        label: { en: "Width at the emitter", fr: "Largeur à l'émetteur", es: "Anchura en el emisor", it: "Larghezza all'emettitore" }
      },
      {
        type: "number", key: "patchiness", min: 0, max: 100, step: 1, unit: "%", scale: 100, group: BeamParameters.BEAM,
        effective: () => LaserBeamSighting.DEFAULT_PATCHINESS,
        label: { en: "Uneven haze", fr: "Brume irrégulière", es: "Bruma irregular", it: "Foschia irregolare" },
        hint: { en: "How unevenly the haze it crosses is spread: the beam seen from the side is brighter where it crosses a denser patch, the patches drifting with the wind. 0 is an even haze; the default is judged on photographs, not measured.",
          fr: "À quel point la brume qu'il traverse est inégale : vu de côté, le faisceau est plus brillant là où il traverse une poche plus dense, les poches dérivant avec le vent. 0 est une brume égale ; la valeur par défaut est jugée sur des photographies, pas mesurée.",
          es: "Lo desigual que es la bruma que cruza: visto de lado, el haz es más brillante donde cruza una bolsa más densa, y las bolsas derivan con el viento. 0 es una bruma uniforme; el valor por defecto se juzga en fotografías, no se mide.",
          it: "Quanto è irregolare la foschia che attraversa: visto di lato, il fascio è più brillante dove attraversa una sacca più densa, e le sacche derivano col vento. 0 è una foschia uniforme; il valore predefinito è giudicato su fotografie, non misurato." }
      }
    ] satisfies ParameterSpec[])
  }

  private static readonly WAVELENGTH_HINT = { en: "Its colour: 532 for the green of a frequency-doubled laser, 520 for a green diode, 638 for a red one, 450 for a blue one.",
    fr: "Sa couleur : 532 pour le vert d'un laser doublé en fréquence, 520 pour une diode verte, 638 pour une rouge, 450 pour une bleue.",
    es: "Su color: 532 para el verde de un láser doblado en frecuencia, 520 para un diodo verde, 638 para uno rojo, 450 para uno azul.",
    it: "Il suo colore: 532 per il verde di un laser a frequenza raddoppiata, 520 per un diodo verde, 638 per uno rosso, 450 per uno blu." }
  private static readonly POWER_HINT = { en: "The optical power it carries, its mean for a pulsed laser, whose pulses no eye tells apart. What is seen of it is what the air scatters.",
    fr: "La puissance optique qu'il porte, sa moyenne pour un laser pulsé, dont aucun œil ne distingue les impulsions. Ce qui s'en voit est ce que l'air en diffuse.",
    es: "La potencia óptica que lleva, su media para un láser pulsado, cuyos pulsos ningún ojo distingue. Lo que se ve de él es lo que el aire difunde.",
    it: "La potenza ottica che porta, la sua media per un laser pulsato, i cui impulsi nessun occhio distingue. Ciò che se ne vede è ciò che l'aria diffonde." }
  private static readonly WAVELENGTH_LABEL = { en: "Wavelength", fr: "Longueur d'onde", es: "Longitud de onda", it: "Lunghezza d'onda" }
  private static readonly POWER_LABEL = { en: "Power", fr: "Puissance", es: "Potencia", it: "Potenza" }

  /** Its light where it does not change in time, or before and after its keys: the beam's own colour and power. */
  static readonly LIGHT: ParameterSet = {
    kind: "beam-light",
    title: BeamParameters.LIGHT_TITLE,
    parameters: ([
      { type: "number", key: "wavelengthNm", min: 380, max: 780, step: 1, unit: "nm", required: true, label: BeamParameters.WAVELENGTH_LABEL, hint: BeamParameters.WAVELENGTH_HINT },
      { type: "number", key: "powerW", min: 0.001, max: 100000, step: 0.001, unit: "W", required: true, label: BeamParameters.POWER_LABEL, hint: BeamParameters.POWER_HINT }
    ] satisfies ParameterSpec[])
  }

  /** Its light at an instant (see BeamJson.light): what a key leaves empty is the beam's own, which the form is told. */
  static readonly LIGHT_KEY: ParameterSet = {
    kind: "beam-light-key",
    title: BeamParameters.LIGHT_TITLE,
    parameters: ([
      BeamParameters.instant("t", { en: "Time", fr: "Instant", es: "Instante", it: "Istante" },
        { en: "Seconds of the recording.", fr: "Secondes de l'enregistrement.", es: "Segundos de la grabación.", it: "Secondi della registrazione." }, true),
      { type: "number", key: "wavelengthNm", min: 380, max: 780, step: 1, unit: "nm", label: BeamParameters.WAVELENGTH_LABEL, hint: BeamParameters.WAVELENGTH_HINT,
        effective: (_, context) => (context as BeamJson | undefined)?.wavelengthNm },
      { type: "number", key: "powerW", min: 0.001, max: 100000, step: 0.001, unit: "W", label: BeamParameters.POWER_LABEL, hint: BeamParameters.POWER_HINT,
        effective: (_, context) => (context as BeamJson | undefined)?.powerW }
    ] satisfies ParameterSpec[])
  }

  /** When it is on. */
  static readonly ON: ParameterSet = {
    kind: "beam-on",
    title: BeamParameters.WHEN,
    parameters: ([
      BeamParameters.instant("fromT", { en: "On from", fr: "Allumé à", es: "Encendido a", it: "Acceso a" },
        { en: "Seconds of the recording; empty, from its start.", fr: "Secondes de l'enregistrement ; vide, dès son début.", es: "Segundos de la grabación; vacío, desde su inicio.", it: "Secondi della registrazione; vuoto, dal suo inizio." }),
      BeamParameters.instant("untilT", { en: "Off at", fr: "Éteint à", es: "Apagado a", it: "Spento a" },
        { en: "Seconds of the recording; empty, until its end.", fr: "Secondes de l'enregistrement ; vide, jusqu'à sa fin.", es: "Segundos de la grabación; vacío, hasta su final.", it: "Secondi della registrazione; vuoto, fino alla sua fine." })
    ] satisfies ParameterSpec[])
  }

  /** The instant of a key of the path (see BeamJson.moves): its points are edited below it, as the path's are. */
  static readonly MOVE_KEY: ParameterSet = {
    kind: "beam-move-key",
    title: { en: "Path at an instant", fr: "Trajet à un instant", es: "Trayecto en un instante", it: "Percorso a un istante" },
    parameters: ([
      BeamParameters.instant("t", { en: "Time", fr: "Instant", es: "Instante", it: "Istante" },
        { en: "Seconds of the recording.", fr: "Secondes de l'enregistrement.", es: "Segundos de la grabación.", it: "Secondi della registrazione." }, true)
    ] satisfies ParameterSpec[])
  }

  /** The colour a light of `wavelengthNm` is shown as, as a CSS hex colour: its most saturated, at its brightest. */
  static hexOf(wavelengthNm: number): string {
    const rgb = LaserBeamSighting.colourOf(wavelengthNm)
    const top = Math.max(...rgb, 1e-9)
    const encode = (linear: number) => {
      const c = Math.min(1, Math.max(0, linear / top))
      const srgb = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055
      return Math.round(srgb * 255).toString(16).padStart(2, "0")
    }
    return `#${rgb.map(encode).join("")}`
  }

  /**
   * The wavelength whose colour is nearest `hex` in hue, nm: what a colour picked stands for, a laser's light being of one wavelength. A
   * purple or a magenta, which no single wavelength is, gives the end of the spectrum nearest it.
   */
  static wavelengthOf(hex: string): number {
    const hue = BeamParameters.hueOf(hex)
    let best = 532
    let distance = Infinity
    for (let nm = 400; nm <= 700; nm++) {
      const gap = Math.abs(((BeamParameters.hueOf(BeamParameters.hexOf(nm)) - hue + 540) % 360) - 180)
      if (gap < distance) {
        distance = gap
        best = nm
      }
    }
    return best
  }

  private static hueOf(hex: string): number {
    const value = Number.parseInt(hex.replace("#", ""), 16)
    const [r, g, b] = [(value >> 16) & 255, (value >> 8) & 255, value & 255].map(channel => channel / 255)
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    if (max === min) return 0
    const d = max - min
    const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
    return (h * 60 + 360) % 360
  }

  /** A point of the path: where the light leaves the emitter, is turned by a mirror, or ends. */
  static readonly PLACE: ParameterSet = {
    kind: "beam-place",
    title: { en: "Point of the path", fr: "Point du trajet", es: "Punto del trayecto", it: "Punto del percorso" },
    parameters: ([
      // As degrees, or from the observer or a decor object (the house the laser was shot from): see PositionInputElement.
      { type: "position", key: "lat", secondKey: "lng", saidKey: "saidPosition", native: "geo", step: 0.1, label: { en: "Position", fr: "Position", es: "Posición", it: "Posizione" } },
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
