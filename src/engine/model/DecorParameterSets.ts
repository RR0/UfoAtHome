import { Parameters } from "../interpretation/Parameters.js"
import type { ChoiceParameter, NumberParameter, ParameterHolder, ParameterSet, ParameterSpec } from "../interpretation/Parameters.js"
import type { DecorObject, DecorSide } from "./Decor.js"
import { DEFAULT_BUILDING_FLOORS, decorSidesFor, FIXED_WINDOW_MIN_OPACITY_PERCENT, hasWindows, isWindowOpenable } from "./Decor.js"
import { DecorTraits } from "./DecorTraits.js"
import type { ModelParameters } from "./DecorTraits.js"
import type { SaidText } from "./SaidText.js"

/**
 * What a decor object lets an author set beyond where it stands and how big it is, said as a
 * description the editor draws generically (see ParameterSet): a building's floors and windows, a
 * car's windows, a bridge's deck and railing, an overhead line's poles.
 *
 * What applies to an object is what it is: its kind, and what it is drawn as (a model keeps the
 * materials, floors and windows of its file, so the shape's own do not apply: see DecorTraits). A
 * catalogue model can add parameters of its own (see ModelParameters.parameters), which is how an
 * asset brings a setting the editor has never heard of.
 *
 * Each key is a path into the object, so a value is written where the renderer reads it
 * (`windows.front`, `bridge.railing.heightM`). A field left empty states nothing, and the renderer's
 * own default stands: the form shows it greyed.
 */
export class DecorParameterSets {

  /** What a side of an object is called, relative to its heading — used by windows and by the seat of an observer alike. */
  static sideLabel(side: DecorSide): SaidText {
    return DecorParameterSets.SIDE_LABELS[side]
  }

  private static readonly SIDE_LABELS: Record<DecorSide, SaidText> = {
    front: { en: "Front", fr: "Avant", es: "Frente", it: "Fronte" },
    behind: { en: "Behind", fr: "Arrière", es: "Detrás", it: "Dietro" },
    left: { en: "Left", fr: "Gauche", es: "Izquierda", it: "Sinistra" },
    right: { en: "Right", fr: "Droite", es: "Derecha", it: "Destra" },
    "front-left": { en: "Front-left", fr: "Avant gauche", es: "Delantero izquierdo", it: "Anteriore sinistro" },
    "front-right": { en: "Front-right", fr: "Avant droit", es: "Delantero derecho", it: "Anteriore destro" },
    "behind-left": { en: "Behind-left", fr: "Arrière gauche", es: "Trasero izquierdo", it: "Posteriore sinistro" },
    "behind-right": { en: "Behind-right", fr: "Arrière droit", es: "Trasero derecho", it: "Posteriore destro" }
  }

  private static readonly WINDOWS: SaidText = { en: "Windows", fr: "Fenêtres", es: "Ventanas", it: "Finestre" }
  private static readonly BUILDING: SaidText = { en: "Building", fr: "Bâtiment", es: "Edificio", it: "Edificio" }
  private static readonly BRIDGE: SaidText = { en: "Bridge", fr: "Pont", es: "Puente", it: "Ponte" }
  private static readonly RAILING: SaidText = { en: "Railing", fr: "Garde-corps", es: "Barandilla", it: "Parapetto" }
  private static readonly WIRE: SaidText = { en: "Overhead line", fr: "Ligne aérienne", es: "Línea aérea", it: "Linea aerea" }

  /** Two texts as one, language by language ("Windows" and "Front" are "Windows Front", "Fenêtres Avant"). */
  private static together(first: SaidText, second: SaidText): SaidText {
    const languages = ["en", "fr", "es", "it"]
    const part = (text: SaidText, language: string) => typeof text === "string" ? text : (text[language] ?? text.en)
    return Object.fromEntries(languages.map(language => [language, `${part(first, language)} ${part(second, language)}`]))
  }

  /** The parameters of this decor object, or none: the kinds the editor needs nothing more for. */
  static of(object: Pick<DecorObject, "kind" | "model" | "observerSide">, published?: ModelParameters): ParameterSet | undefined {
    const parameters: ParameterSpec[] = []
    const model = DecorTraits.drawnAsModel(object)
    if (!model && object.kind === "building") parameters.push(...DecorParameterSets.floors())
    if (!model && hasWindows(object.kind)) parameters.push(...DecorParameterSets.windows(object.kind))
    if (object.kind === "bridge") parameters.push(...DecorParameterSets.bridge())
    if (object.kind === "wire") parameters.push(...DecorParameterSets.wire())
    // What the model publishes is written under `modelParameters`, so that no key of its can be taken for one of the object's own.
    if (published?.parameters) parameters.push(...published.parameters.map(spec => ({ ...spec, key: `modelParameters.${spec.key}` })))
    if (parameters.length === 0) return undefined
    return { kind: `decor-${object.kind}`, title: { en: "Properties", fr: "Propriétés", es: "Propiedades", it: "Proprietà" }, parameters }
  }

  /** The floors of a building, and the one the observer is on. */
  private static floors(): NumberParameter[] {
    const floorsOf = (element: ParameterHolder) => (Parameters.read(element, "floors") as number | undefined) ?? DEFAULT_BUILDING_FLOORS
    return [
      {
        type: "number", key: "floors", min: 0, max: 20, step: 1, effective: () => DEFAULT_BUILDING_FLOORS,
        label: { en: "Floors", fr: "Étages", es: "Plantas", it: "Piani" },
        hint: { en: "Upper stories above the ground floor.", fr: "Étages au-dessus du rez-de-chaussée.", es: "Plantas sobre la planta baja.", it: "Piani sopra il pianterreno." },
        group: DecorParameterSets.BUILDING
      },
      {
        type: "number", key: "occupiedFloor", min: 0, max: 20, step: 1, effective: () => 0,
        bounds: element => ({ max: floorsOf(element) }),
        label: { en: "Occupied floor", fr: "Étage occupé", es: "Planta ocupada", it: "Piano occupato" },
        hint: { en: "The floor the observer is on, from 0 (ground floor).", fr: "L'étage où se tient l'observateur, à partir de 0 (rez-de-chaussée).",
          es: "La planta donde está el observador, desde 0 (planta baja).", it: "Il piano dove si trova l'osservatore, da 0 (pianterreno)." },
        group: DecorParameterSets.BUILDING
      }
    ]
  }

  /** The opacity of the window on each side, 0 (open) to 100 (shut), empty for no window there. A fixed pane never opens. */
  private static windows(kind: DecorObject["kind"]): NumberParameter[] {
    return decorSidesFor(kind).map((side): NumberParameter => ({
      type: "number", key: `windows.${side}`, step: 5, unit: "%",
      min: isWindowOpenable(kind, side) ? 0 : FIXED_WINDOW_MIN_OPACITY_PERCENT, max: 100,
      label: DecorParameterSets.SIDE_LABELS[side],
      summary: DecorParameterSets.together(DecorParameterSets.WINDOWS, DecorParameterSets.SIDE_LABELS[side]),
      hint: { en: "Opacity of the window on this side: 0 is open, 100 shut. Empty: no window.", fr: "Opacité de la fenêtre de ce côté : 0 ouverte, 100 fermée. Vide : pas de fenêtre.",
        es: "Opacidad de la ventana de este lado: 0 abierta, 100 cerrada. Vacío: sin ventana.", it: "Opacità della finestra di questo lato: 0 aperta, 100 chiusa. Vuoto: nessuna finestra." },
      group: DecorParameterSets.WINDOWS
    }))
  }

  /** How a bridge is built: the defaults are those of an ordinary French overpass (see BridgeStructure). */
  private static bridge(): ParameterSpec[] {
    const field = (key: string, label: SaidText, min: number, max: number, step: number, unit: string, effective: number | undefined,
      group: SaidText, hint?: SaidText): NumberParameter => ({ type: "number", key, label, min, max, step, unit, group, hint, effective: effective === undefined ? undefined : () => effective })
    return [
      field("bridge.spanM", { en: "Span", fr: "Portée", es: "Luz", it: "Luce" }, 0.1, 5000, 0.1, "m", undefined, DecorParameterSets.BRIDGE,
        { en: "Metres of open span under the deck, centred. Empty: the whole length, no embankments.", fr: "Mètres de portée libre sous le tablier, centrés. Vide : toute la longueur, sans remblais.",
          es: "Metros de luz libre bajo el tablero, centrados. Vacío: toda la longitud, sin terraplenes.", it: "Metri di luce libera sotto l'impalcato, centrati. Vuoto: tutta la lunghezza, senza rilevati." }),
      field("bridge.deckThicknessM", { en: "Deck thickness", fr: "Épaisseur du tablier", es: "Espesor del tablero", it: "Spessore dell'impalcato" }, 0.1, 20, 0.1, "m", 1.2, DecorParameterSets.BRIDGE),
      field("bridge.railing.heightM", { en: "Height", fr: "Hauteur", es: "Altura", it: "Altezza" }, 0.1, 5, 0.05, "m", 1.05, DecorParameterSets.RAILING),
      field("bridge.railing.postSpacingM", { en: "Post spacing", fr: "Espacement des poteaux", es: "Separación de postes", it: "Distanza dei montanti" }, 0.2, 20, 0.1, "m", 1.5, DecorParameterSets.RAILING),
      field("bridge.railing.rails", { en: "Rails", fr: "Lisses", es: "Barandas", it: "Correnti" }, 0, 8, 1, "", 2, DecorParameterSets.RAILING)
    ]
  }

  /** How an overhead line is built: the strands are a table, stated in the file; the rest is set here. */
  private static wire(): ParameterSpec[] {
    const poles: ChoiceParameter = {
      type: "choice", key: "wire.poles", group: DecorParameterSets.WIRE,
      label: { en: "Poles", fr: "Poteaux", es: "Postes", it: "Pali" },
      hint: { en: "Which ends stand on a pole: both, the one the heading points away from, the one it points towards, or none (a line anchored on buildings).",
        fr: "Quelles extrémités reposent sur un poteau : les deux, celle dont le cap s'éloigne, celle vers laquelle il pointe, ou aucune (une ligne ancrée sur des bâtiments).",
        es: "Qué extremos se apoyan en un poste: ambos, aquel del que se aleja el rumbo, aquel hacia el que apunta, o ninguno (una línea anclada en edificios).",
        it: "Quali estremità poggiano su un palo: entrambe, quella da cui si allontana la direzione, quella verso cui punta, o nessuna (una linea ancorata a edifici)." },
      choices: [
        { value: "both", label: { en: "Both", fr: "Les deux", es: "Ambos", it: "Entrambi" } },
        { value: "start", label: { en: "Start", fr: "Début", es: "Inicio", it: "Inizio" } },
        { value: "end", label: { en: "End", fr: "Fin", es: "Fin", it: "Fine" } },
        { value: "none", label: { en: "None", fr: "Aucun", es: "Ninguno", it: "Nessuno" } }
      ],
      effective: () => "both"
    }
    return [
      poles,
      {
        type: "number", key: "wire.diameterM", min: 0.001, max: 0.2, step: 0.001, unit: "m", effective: () => 0.008, group: DecorParameterSets.WIRE,
        label: { en: "Strand thickness", fr: "Épaisseur du brin", es: "Grosor del hilo", it: "Spessore del filo" }
      },
      {
        type: "number", key: "wire.poleHeightM", min: 0.5, max: 100, step: 0.1, unit: "m", group: DecorParameterSets.WIRE,
        label: { en: "Pole height", fr: "Hauteur des poteaux", es: "Altura de los postes", it: "Altezza dei pali" },
        hint: { en: "Empty: half a metre over the highest strand.", fr: "Vide : un demi-mètre au-dessus du brin le plus haut.", es: "Vacío: medio metro sobre el hilo más alto.", it: "Vuoto: mezzo metro sopra il filo più alto." }
      }
    ]
  }
}
