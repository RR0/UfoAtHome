import type { SaidText } from "../model/SaidText.js"
import type { BodyJson, BodyKeyframe } from "./Interpretation.js"
import type { NumberParameter, ParameterSet, ParameterSpec } from "./Parameters.js"

/** What the editor knows of the bodies round the one on show, which a body alone cannot say. */
export interface BodyContext {
  /** The ids the bodies have, to refuse one a body already holds. */
  ids: readonly string[]
  /** The shapes of the recording a body can stand for. */
  shapes: ReadonlyArray<{ value: string, label: string }>
}

/** What the editor knows of the instant on show. */
export interface BodyKeyframeContext {
  /** Drawn as a model, which keeps the materials of its file: a colour picked for it would change nothing. */
  drawnFromModel: boolean
}

/**
 * A body at one instant, flat, in the terms the fields of that instant use: where it is (from the
 * observer, or in the world), how big, how turned, what it looks like. It is what the form edits.
 *
 * A body's track states these as keyframes, each stating only what it says (see BodyKeyframe); the
 * form shows the body AS IT STANDS at the playhead, interpolated between keyframes, and an edit writes
 * a keyframe there. So the view is made from a reading of the body at that instant, and what an edit
 * of it becomes is a keyframe (see keyframeOf), never the view itself.
 */
export interface BodyKeyframeView {
  mode: "observer" | "world"
  azimuthDeg: number
  elevationDeg: number
  distanceM: number
  eastM: number
  northM: number
  aboveGroundM: number
  onGround: boolean
  widthM: number
  lengthM: number
  heightM: number
  headingDeg: number
  pitchDeg: number
  rollDeg: number
  color: string
  albedo: number
  luminanceCdM2: number
  transparency: number
  haloScale: number
}

/** Where a body stands at the playhead, as the scene reads it. */
export interface BodyReadingLike {
  azimuthDeg: number
  altitudeDeg: number
  distanceM: number
  eastM: number
  northM: number
  aboveGroundM: number
  sizeM: { widthM: number, lengthM: number, heightM: number }
  attitude: { headingDeg: number, pitchDeg: number, rollDeg: number }
  appearance: { color: string, albedo: number, luminanceCdM2: number, transparency?: number, haloScale?: number }
}

export class BodyKeyframes {

  /** The keyframe in force at `t` — the last at or before it, else the first. */
  static before(body: BodyJson, t: number): BodyKeyframe | undefined {
    const sorted = [...body.track].sort((a, b) => a.t - b.t)
    return [...sorted].reverse().find(key => key.t <= t) ?? sorted[0]
  }

  /**
   * The view of a body at `t`: in the form its own keyframes use there (world when the one in force is stated in metres,
   * from the observer otherwise), with every number as a field shows it — a hundredth, since what an interpolation holds
   * (89.43046058333363) is not what anybody typed.
   */
  static viewOf(body: BodyJson, t: number, reading: BodyReadingLike): BodyKeyframeView {
    const base = BodyKeyframes.before(body, t)
    const round = (value: number) => Number(value.toFixed(2))
    return {
      mode: base?.eastM !== undefined && base.northM !== undefined ? "world" : "observer",
      azimuthDeg: round(reading.azimuthDeg),
      elevationDeg: round(reading.altitudeDeg),
      distanceM: round(reading.distanceM),
      eastM: round(reading.eastM),
      northM: round(reading.northM),
      aboveGroundM: round(reading.aboveGroundM),
      onGround: base?.onGround === true,
      widthM: round(reading.sizeM.widthM),
      lengthM: round(reading.sizeM.lengthM),
      heightM: round(reading.sizeM.heightM),
      headingDeg: round(reading.attitude.headingDeg),
      pitchDeg: round(reading.attitude.pitchDeg),
      rollDeg: round(reading.attitude.rollDeg),
      color: reading.appearance.color,
      albedo: round(reading.appearance.albedo),
      luminanceCdM2: round(reading.appearance.luminanceCdM2),
      transparency: round(reading.appearance.transparency ?? 0),
      haloScale: round(reading.appearance.haloScale ?? 1)
    }
  }

  /**
   * The keyframe an edit of the view writes at `t`: where it is, how big, how turned, and nothing else — its flame and
   * its movements hold from the keyframe before, and a movement is only read from keyframes that state it, so an added
   * keyframe moves the body and leaves those alone. A keyframe already at this instant keeps the rest of what it states.
   *
   * Its look is written only when it is this instant's own: one the author has just changed (`appearanceEdited`), or one this
   * keyframe already stated. A move must not fix a colour the body was only holding.
   */
  static keyframeOf(view: BodyKeyframeView, t: number, existing: BodyKeyframe | undefined, appearanceEdited: boolean): BodyKeyframe {
    const finite = (value: number) => Number.isFinite(value) ? value : 0
    const position: BodyKeyframe = view.mode === "world"
      ? { t, eastM: finite(view.eastM), northM: finite(view.northM), ...(view.onGround ? { onGround: true } : { altitudeAboveGroundM: finite(view.aboveGroundM) }) }
      : { t, azimuthDeg: finite(view.azimuthDeg), altitudeDeg: finite(view.elevationDeg), distanceM: Math.max(0.1, finite(view.distanceM)), ...(view.onGround ? { onGround: true } : {}) }
    const appearance = appearanceEdited
      ? { color: view.color, albedo: Math.max(0, Math.min(1, finite(view.albedo))), luminanceCdM2: Math.max(0, finite(view.luminanceCdM2)),
          transparency: Math.max(0, Math.min(1, finite(view.transparency))), haloScale: Math.max(0, finite(view.haloScale)) }
      : existing?.appearance
    return {
      ...BodyKeyframes.withoutPlacement(existing),
      ...position,
      sizeM: { widthM: Math.max(0.01, finite(view.widthM)), lengthM: Math.max(0.01, finite(view.lengthM)), heightM: Math.max(0.01, finite(view.heightM)) },
      attitude: { headingDeg: finite(view.headingDeg), pitchDeg: finite(view.pitchDeg), rollDeg: finite(view.rollDeg) },
      ...(appearance ? { appearance } : {})
    }
  }

  /** A keyframe's statements other than where it is, how big and how turned. */
  private static withoutPlacement(key: BodyKeyframe | undefined): Partial<BodyKeyframe> {
    if (!key) return {}
    const { eastM, northM, azimuthDeg, altitudeDeg, distanceM, onGround, altitudeAboveGroundM, sizeM, attitude, appearance, ...rest } = key
    return rest
  }
}

/**
 * What a body lets an author set, as descriptions the editor draws generically (see ParameterSet): what the body IS
 * (its id, its name, the shapes it stands for, the part of its model the observer drew), and what it is at an instant
 * (see BodyKeyframeView). The model it is drawn as — a built-in shape, a catalogue entry, a file at an address, with its
 * credit — is chosen in a window of pictures and stays the editor's own.
 */
export class BodyParameterSets {

  private static number(key: string, label: SaidText, min: number, max: number, step: number, unit: string | undefined,
    options: Partial<NumberParameter> = {}): NumberParameter {
    return { type: "number", key, label, min, max, step, unit, required: true, ...options }
  }

  static readonly BODY: ParameterSet = {
    kind: "body",
    title: { en: "Body", fr: "Corps", es: "Cuerpo", it: "Corpo" },
    parameters: ([
      {
        type: "text", key: "id", required: true,
        label: { en: "ID", fr: "Identifiant", es: "Identificador", it: "Identificativo" },
        // An id is what the confrontation of the shapes and a case's interpretations name the body by: an empty one, or one another body has, is refused.
        validate: (value, body, context) => !((context as BodyContext | undefined)?.ids ?? []).some(id => id === value && id !== (body as { id?: string }).id)
      },
      { type: "said", key: "title", label: { en: "Name", fr: "Nom", es: "Nombre", it: "Nome" } },
      {
        type: "set", key: "explains",
        label: { en: "Stands for the shapes", fr: "Représente les formes", es: "Representa las formas", it: "Rappresenta le forme" },
        // A shape the body names that the recording no longer holds is still listed: dropping it silently would be an edit nobody made.
        options: (body, context) => {
          const shapes = (context as BodyContext | undefined)?.shapes ?? []
          const named = ((body as { explains?: string[] }).explains ?? []).filter(id => !shapes.some(shape => shape.value === id))
          return [...shapes, ...named.map(value => ({ value, label: value }))]
        },
        empty: { en: "No shape", fr: "Aucune forme", es: "Ninguna forma", it: "Nessuna forma" }
      },
      {
        type: "text", key: "outlineNode",
        label: { en: "Part drawn by the observer", fr: "Partie dessinée par l'observateur", es: "Parte dibujada por el observador", it: "Parte disegnata dall'osservatore" },
        placeholder: { en: "Node of the model, e.g. hull", fr: "Nœud du modèle, par ex. hull", es: "Nodo del modelo, p. ej. hull", it: "Nodo del modello, ad es. hull" }
      }
    ] satisfies ParameterSpec[])
  }

  /** The position, size, attitude and look of a body at the playhead. */
  static readonly KEYFRAME: ParameterSet = {
    kind: "body-keyframe",
    title: { en: "At the playhead", fr: "À l'instant courant", es: "En el instante actual", it: "All'istante corrente" },
    parameters: ([
      {
        type: "choice", key: "mode", required: true,
        label: { en: "Position", fr: "Position", es: "Posición", it: "Posizione" },
        choices: [
          { value: "observer", label: { en: "From the observer", fr: "Depuis l'observateur", es: "Desde el observador", it: "Dall'osservatore" } },
          { value: "world", label: { en: "In the world", fr: "Dans le monde", es: "En el mundo", it: "Nel mondo" } }
        ]
      },
      BodyParameterSets.number("azimuthDeg", { en: "Azimuth", fr: "Azimut", es: "Acimut", it: "Azimut" }, 0, 360, 0.01, "°", { visibleWhen: view => view.mode === "observer" }),
      BodyParameterSets.number("elevationDeg", { en: "Elevation", fr: "Hauteur", es: "Elevación", it: "Elevazione" }, -90, 90, 0.01, "°", { visibleWhen: view => view.mode === "observer" }),
      BodyParameterSets.number("distanceM", { en: "Distance", fr: "Distance", es: "Distancia", it: "Distanza" }, 0.1, 30000, 0.1, "m", { visibleWhen: view => view.mode === "observer" }),
      BodyParameterSets.number("eastM", { en: "East", fr: "Est", es: "Este", it: "Est" }, -30000, 30000, 0.1, "m", { visibleWhen: view => view.mode === "world" }),
      BodyParameterSets.number("northM", { en: "North", fr: "Nord", es: "Norte", it: "Nord" }, -30000, 30000, 0.1, "m", { visibleWhen: view => view.mode === "world" }),
      { type: "boolean", key: "onGround", label: { en: "On the ground", fr: "Au sol", es: "En el suelo", it: "A terra" } },
      BodyParameterSets.number("aboveGroundM", { en: "Above the ground", fr: "Au-dessus du sol", es: "Sobre el suelo", it: "Sopra il suolo" }, 0, 30000, 0.1, "m",
        { visibleWhen: view => view.mode === "world" && view.onGround !== true }),
      BodyParameterSets.number("widthM", { en: "Width", fr: "Largeur", es: "Ancho", it: "Larghezza" }, 0.01, 1000, 0.01, "m"),
      BodyParameterSets.number("lengthM", { en: "Length", fr: "Longueur", es: "Largo", it: "Lunghezza" }, 0.01, 1000, 0.01, "m"),
      BodyParameterSets.number("heightM", { en: "Height", fr: "Hauteur", es: "Alto", it: "Altezza" }, 0.01, 1000, 0.01, "m"),
      BodyParameterSets.number("headingDeg", { en: "Heading", fr: "Cap", es: "Rumbo", it: "Rotta" }, 0, 360, 0.1, "°"),
      BodyParameterSets.number("pitchDeg", { en: "Pitch", fr: "Tangage", es: "Cabeceo", it: "Beccheggio" }, -90, 90, 0.1, "°"),
      BodyParameterSets.number("rollDeg", { en: "Roll", fr: "Roulis", es: "Alabeo", it: "Rollio" }, -180, 180, 0.1, "°"),
      // Only the built-in shapes are painted: a model keeps the materials of its file, so a colour picked for it would change nothing.
      {
        type: "colour", key: "color", label: { en: "Colour", fr: "Couleur", es: "Color", it: "Colore" },
        // What a colour field cannot show (a name, a three-digit form it takes) stands as this grey until the author picks one.
        fallback: "#c8c8c8",
        visibleWhen: (_view, context) => (context as BodyKeyframeContext | undefined)?.drawnFromModel !== true
      },
      BodyParameterSets.number("albedo", { en: "Albedo", fr: "Albédo", es: "Albedo", it: "Albedo" }, 0, 1, 0.01, undefined),
      BodyParameterSets.number("luminanceCdM2", { en: "Light of its own", fr: "Lumière propre", es: "Luz propia", it: "Luce propria" }, 0, 1e10, 0.1, "cd/m²"),
      BodyParameterSets.number("transparency", { en: "Transparency", fr: "Transparence", es: "Transparencia", it: "Trasparenza" }, 0, 1, 0.01, undefined),
      BodyParameterSets.number("haloScale", { en: "Halo", fr: "Halo", es: "Halo", it: "Alone" }, 0, 20, 0.1, "×")
    ] satisfies ParameterSpec[])
  }
}
