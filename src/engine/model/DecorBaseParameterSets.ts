import type { NumberParameter, ParameterSet, ParameterSpec } from "../interpretation/Parameters.js"
import type { DecorKind } from "./Decor.js"
import { observerSidesFor } from "./Decor.js"
import type { DecorBaseContext } from "./DecorBase.js"
import { DecorParameterSets } from "./DecorParameterSets.js"
import type { SaidText } from "./SaidText.js"
import { Headlights } from "./Headlights.js"
import type { HeadlightMode } from "./Headlights.js"

/**
 * The properties every decor object has, said as descriptions the editor draws (see ParameterSet): its name, where it
 * stands and which way it faces, its colour and its measures; and what it can be, at an instant: lit, carrying a rig
 * of lamps, with an observer sitting in it.
 *
 * Which of them mean anything for an object is what the object says (see DecorTraits): a colour paints only the
 * built-in shape, a lamp switch needs something to switch, a seat needs a room. The editor gives that as the context
 * (see DecorBaseContext) and the field is drawn or not.
 *
 * Kept in two sets because the model an object is drawn as is chosen between them, in a window of pictures that stays
 * the editor's own; and because the properties its kind has (floors, windows, a bridge's railing) come between the
 * two (see DecorParameterSets).
 */
export class DecorBaseParameterSets {

  private static number(key: string, label: SaidText, min: number, max: number, step: number, unit: string, options: Partial<NumberParameter> = {}): NumberParameter {
    return { type: "number", key, label, min, max, step, unit, required: true, ...options }
  }

  private static natural(axis: "widthM" | "lengthM" | "heightM"): NumberParameter["effective"] {
    return (_view, context) => (context as DecorBaseContext | undefined)?.natural?.[axis]
  }

  /** Name, place, heading, colour, measures. */
  static readonly BASE: ParameterSet = {
    kind: "decor-base",
    title: { en: "Object", fr: "Objet", es: "Objeto", it: "Oggetto" },
    parameters: ([
      { type: "said", key: "title", required: true, label: { en: "Name", fr: "Nom", es: "Nombre", it: "Nome" } },
      DecorBaseParameterSets.number("eastM", { en: "Distance east", fr: "Distance à l'est", es: "Distancia al este", it: "Distanza a est" }, -30000, 30000, 0.5, "m"),
      DecorBaseParameterSets.number("northM", { en: "Distance north", fr: "Distance au nord", es: "Distancia al norte", it: "Distanza a nord" }, -30000, 30000, 0.5, "m"),
      DecorBaseParameterSets.number("altitudeM", { en: "Altitude", fr: "Altitude", es: "Altitud", it: "Altitudine" }, -1000, 30000, 1, "m"),
      DecorBaseParameterSets.number("headingDeg", { en: "Heading", fr: "Orientation", es: "Orientación", it: "Orientamento" }, 0, 360, 1, "°"),
      {
        // Grey while the object states none, which is what "the kind's own colour" looks like in a control with no empty value of its own.
        type: "colour", key: "color", label: { en: "Colour", fr: "Couleur", es: "Color", it: "Colore" }, fallback: "#808080",
        visibleWhen: (_view, context) => (context as DecorBaseContext | undefined)?.traits.color === true
      },
      // Left EMPTY when the recording states no size, with the built-in shape's own measure as the placeholder: a real number typed
      // into a field nobody measured would be a measurement invented by the form, which is the one thing this project's data refuses
      // to hold (see DecorSize).
      DecorBaseParameterSets.number("sizeM.widthM", { en: "Width", fr: "Largeur", es: "Anchura", it: "Larghezza" }, 0.1, 1000, 0.1, "m", { required: false, effective: DecorBaseParameterSets.natural("widthM") }),
      DecorBaseParameterSets.number("sizeM.lengthM", { en: "Length", fr: "Longueur", es: "Longitud", it: "Lunghezza" }, 0.1, 1000, 0.1, "m", { required: false, effective: DecorBaseParameterSets.natural("lengthM") }),
      DecorBaseParameterSets.number("sizeM.heightM", { en: "Height", fr: "Hauteur", es: "Altura", it: "Altezza" }, 0.1, 1000, 0.1, "m", { required: false, effective: DecorBaseParameterSets.natural("heightM") }),
      {
        // The catalogue's models for the kind, drawn in a window of pictures (the editor turns the choice into one). The empty choice is the
        // kind's default model where it has one, and the built-in shape where it does not; a model at an address is no choice of the list.
        type: "choice", key: "model.id", label: { en: "3D model", fr: "Modèle 3D", es: "Modelo 3D", it: "Modello 3D" }, choices: [],
        empty: { en: "No model (built-in shape)", fr: "Aucun modèle (forme de base)", es: "Sin modelo (forma básica)", it: "Nessun modello (forma di base)" },
        optionsOf: (_view, context) => [...((context as DecorBaseContext | undefined)?.models ?? [])],
        effective: (_view, context) => (context as DecorBaseContext | undefined)?.defaultModelId
      }
    ] satisfies ParameterSpec[])
  }

  /** What each setting of a vehicle's lights is called, by the reader's language. */
  static readonly HEADLIGHT_LABELS: Readonly<Record<HeadlightMode, SaidText>> = {
    off: { en: "Off", fr: "Éteints", es: "Apagados", it: "Spenti" },
    position: { en: "Position lights", fr: "Feux de position", es: "Luces de posición", it: "Luci di posizione" },
    dipped: { en: "Dipped beam", fr: "Feux de croisement", es: "Luces de cruce", it: "Anabbaglianti" },
    main: { en: "Main beam", fr: "Feux de route", es: "Luces de carretera", it: "Abbaglianti" },
    fog: { en: "Fog lamps", fr: "Antibrouillards", es: "Faros antiniebla", it: "Fendinebbia" }
  }

  /** Lit, lamps, and where the observer sits. */
  static readonly STATE: ParameterSet = {
    kind: "decor-state",
    title: { en: "State", fr: "État", es: "Estado", it: "Stato" },
    parameters: ([
      {
        // A vehicle's lights are a setting, not a switch (see HeadlightMode): the switch is for what has none, a street lamp.
        type: "boolean", key: "lit", required: true, label: { en: "Lit", fr: "Allumé", es: "Encendido", it: "Acceso" },
        visibleWhen: (_view, context) => (context as DecorBaseContext | undefined)?.traits.lit === true && (context as DecorBaseContext | undefined)?.traits.headlights !== true
      },
      {
        type: "choice", key: "headlights", required: true, label: { en: "Headlights", fr: "Phares", es: "Faros", it: "Fari" },
        choices: Headlights.MODES.map(mode => ({ value: mode, label: DecorBaseParameterSets.HEADLIGHT_LABELS[mode] })),
        visibleWhen: (_view, context) => (context as DecorBaseContext | undefined)?.traits.headlights === true
      },
      {
        // The rigs that make sense on this object's kind, plus none; the one its own lamps came from is selected.
        type: "choice", key: "lightRig", label: { en: "Lights", fr: "Feux", es: "Luces", it: "Luci" }, choices: [],
        empty: { en: "none", fr: "aucun", es: "ninguna", it: "nessuna" },
        optionsOf: (_view, context) => ((context as DecorBaseContext | undefined)?.lightRigs ?? []).map(rig => ({ value: rig.value, label: rig.label })),
        visibleWhen: (_view, context) => (context as DecorBaseContext | undefined)?.traits.lights === true
      },
      {
        type: "choice", key: "observerSide", label: { en: "Observer location", fr: "Emplacement de l'observateur", es: "Ubicación del observador", it: "Posizione dell'osservatore" },
        choices: [], empty: { en: "Not present", fr: "Non présent", es: "No presente", it: "Non presente" },
        optionsOf: (_view, context) => [...((context as DecorBaseContext | undefined)?.seats ?? [])],
        visibleWhen: (_view, context) => (context as DecorBaseContext | undefined)?.traits.observerSide === true
      }
    ] satisfies ParameterSpec[])
  }

  /**
   * The seats an observer can have in this kind of object: a subset of where a window can be (see observerSidesFor — a
   * vehicle's occupant sits at one of its four doors, never "at the windshield").
   */
  static seatsFor(kind: DecorKind): Array<{ value: string, label: SaidText }> {
    return observerSidesFor(kind).map(side => ({ value: side, label: DecorParameterSets.sideLabel(side) }))
  }
}
