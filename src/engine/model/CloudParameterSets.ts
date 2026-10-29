import type { NumberParameter, ParameterSet, ParameterSpec } from "../interpretation/Parameters.js"
import type { SaidText } from "./SaidText.js"
import { DEFAULT_ICE_CRYSTAL_ALIGNMENT } from "./Weather.js"

/** What the editor knows of the weather round a layer, which a layer alone cannot say. */
export interface CloudLayerContext {
  /** The weather's own shading, which a layer without one of its own takes. */
  generalDarkness: number
}

/**
 * What a cloud layer, and an individual cloud, let an author set, as descriptions the editor draws
 * generically (see ParameterSet): the keys are the properties of CloudLayer and CloudInstance, and a
 * value written is written where the renderer reads it.
 *
 * Values that cannot be absent (a base, a thickness) are `required`: emptying the field on the way to
 * another number leaves what was there. Those that can (a wind of the layer's own, a pattern seed, a
 * shading inherited from above) state nothing when emptied, and the field shows what is then in force.
 */
export class CloudParameterSets {

  private static readonly METRES = "m"

  private static number(key: string, label: SaidText, min: number, max: number, step: number, options: Partial<NumberParameter> = {}): NumberParameter {
    return { type: "number", key, label, min, max, step, ...options }
  }

  /** A cloud layer: its type, where and how thick it is, how much of the sky it covers, and its wind. */
  static readonly LAYER: ParameterSet = {
    kind: "cloud-layer",
    title: { en: "Cloud layer", fr: "Couche de nuages", es: "Capa de nubes", it: "Strato di nuvole" },
    parameters: ([
      {
        type: "choice", key: "type", required: true,
        label: { en: "Cloud type", fr: "Type de nuage", es: "Tipo de nube", it: "Tipo di nuvola" },
        choices: [
          { value: "cumulus", label: "Cumulus" },
          { value: "stratus", label: "Stratus" },
          { value: "stratocumulus", label: "Stratocumulus" },
          { value: "cirrus", label: "Cirrus" },
          { value: "unknown", label: { en: "Unknown", fr: "Inconnu", es: "Desconocido", it: "Sconosciuto" } }
        ]
      },
      CloudParameterSets.number("baseM", { en: "Base", fr: "Base", es: "Base", it: "Base" }, 0, 20000, 1, { unit: CloudParameterSets.METRES, required: true }),
      CloudParameterSets.number("thicknessM", { en: "Thickness", fr: "Épaisseur", es: "Espesor", it: "Spessore" }, 10, 8000, 1, { unit: CloudParameterSets.METRES, required: true }),
      CloudParameterSets.number("coverage", { en: "Coverage", fr: "Couverture", es: "Cobertura", it: "Copertura" }, 0, 100, 1, { unit: "%", scale: 100, required: true }),
      CloudParameterSets.number("sizeM", { en: "Cloud size", fr: "Taille des nuages", es: "Tamaño de las nubes", it: "Dimensione delle nuvole" }, 50, 20000, 10,
        { unit: CloudParameterSets.METRES, required: true }),
      CloudParameterSets.number("density", { en: "Density", fr: "Densité", es: "Densidad", it: "Densità" }, 0, 2, 0.01, { required: true }),
      CloudParameterSets.number("darkness", { en: "Darkness", fr: "Obscurité", es: "Oscuridad", it: "Oscurità" }, 0, 1, 0.01, {
        effective: (_layer, context) => (context as CloudLayerContext | undefined)?.generalDarkness
      }),
      CloudParameterSets.number("iceCrystalAlignment", { en: "Crystal alignment", fr: "Alignement des cristaux", es: "Alineación de los cristales", it: "Allineamento dei cristalli" }, 0, 1, 0.01, {
        // Only a cirrus has crystals that line up.
        visibleWhen: layer => layer.type === "cirrus", effective: () => DEFAULT_ICE_CRYSTAL_ALIGNMENT
      }),
      CloudParameterSets.number("windDirectionDeg", { en: "Layer wind direction", fr: "Direction du vent de la couche", es: "Dirección del viento de la capa", it: "Direzione del vento dello strato" }, 0, 360, 0.1, {
        unit: "°", placeholder: { en: "General wind", fr: "Vent général", es: "Viento general", it: "Vento generale" }
      }),
      CloudParameterSets.number("windSpeed", { en: "Layer wind speed", fr: "Vitesse du vent de la couche", es: "Velocidad del viento de la capa", it: "Velocità del vento dello strato" }, 0, 120, 0.01, {
        unit: "m/s", placeholder: { en: "General wind", fr: "Vent général", es: "Viento general", it: "Vento generale" }
      }),
      CloudParameterSets.number("seed", { en: "Pattern seed", fr: "Graine du motif", es: "Semilla del patrón", it: "Seme del motivo" }, 0, 9999, 1)
    ] satisfies ParameterSpec[])
  }

  /** An individual cloud: where it stands, how big it is, and how dark. */
  static readonly INSTANCE: ParameterSet = {
    kind: "cloud-instance",
    title: { en: "Individual cloud", fr: "Nuage individuel", es: "Nube individual", it: "Nuvola individuale" },
    parameters: ([
      // From the observer, from a decor object, or as degrees: see PositionInputElement.
      { type: "position", key: "eastM", secondKey: "northM", saidKey: "saidPosition", native: "local", step: 1, label: { en: "Position", fr: "Position", es: "Posición", it: "Posizione" } },
      CloudParameterSets.number("baseM", { en: "Cloud base", fr: "Base du nuage", es: "Base de la nube", it: "Base della nuvola" }, 0, 20000, 1, { unit: CloudParameterSets.METRES, required: true }),
      CloudParameterSets.number("thicknessM", { en: "Cloud thickness", fr: "Épaisseur du nuage", es: "Espesor de la nube", it: "Spessore della nuvola" }, 10, 8000, 1, { unit: CloudParameterSets.METRES, required: true }),
      CloudParameterSets.number("widthM", { en: "Cloud width", fr: "Largeur du nuage", es: "Anchura de la nube", it: "Larghezza della nuvola" }, 50, 20000, 10, { unit: CloudParameterSets.METRES, required: true }),
      CloudParameterSets.number("depthM", { en: "Cloud depth", fr: "Profondeur du nuage", es: "Profundidad de la nube", it: "Profondità della nuvola" }, 50, 20000, 10, { unit: CloudParameterSets.METRES, required: true }),
      CloudParameterSets.number("rotationDeg", { en: "Cloud rotation", fr: "Rotation du nuage", es: "Rotación de la nube", it: "Rotazione della nuvola" }, -360, 360, 1, { unit: "°", required: true }),
      CloudParameterSets.number("density", { en: "Cloud density", fr: "Densité du nuage", es: "Densidad de la nube", it: "Densità della nuvola" }, 0, 2, 0.01, { required: true }),
      CloudParameterSets.number("darkness", { en: "Darkness", fr: "Obscurité", es: "Oscuridad", it: "Oscurità" }, 0, 1, 0.01, {
        placeholder: { en: "Layer darkness", fr: "Obscurité de la couche", es: "Oscuridad de la capa", it: "Oscurità dello strato" }
      })
    ] satisfies ParameterSpec[])
  }
}
