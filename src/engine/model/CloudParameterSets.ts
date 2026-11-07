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
    title: "cloudLayer",
    parameters: ([
      {
        type: "choice", key: "type", required: true,
        label: "cloudType",
        choices: [
          { value: "cumulus", label: "cumulus" },
          { value: "stratus", label: "stratus" },
          { value: "stratocumulus", label: "stratocumulus" },
          { value: "cirrus", label: "cirrus" },
          { value: "unknown", label: "unknown" }
        ]
      },
      CloudParameterSets.number("baseM", "base", 0, 20000, 1, { unit: CloudParameterSets.METRES, required: true }),
      CloudParameterSets.number("thicknessM", "thickness", 10, 8000, 1, { unit: CloudParameterSets.METRES, required: true }),
      CloudParameterSets.number("coverage", "coverage", 0, 100, 1, { unit: "%", scale: 100, required: true }),
      CloudParameterSets.number("sizeM", "cloudSize", 50, 20000, 10,
        { unit: CloudParameterSets.METRES, required: true }),
      CloudParameterSets.number("density", "density", 0, 2, 0.01, { required: true }),
      CloudParameterSets.number("darkness", "darkness", 0, 1, 0.01, {
        effective: (_layer, context) => (context as CloudLayerContext | undefined)?.generalDarkness
      }),
      CloudParameterSets.number("iceCrystalAlignment", "crystalAlignment", 0, 1, 0.01, {
        // Only a cirrus has crystals that line up.
        visibleWhen: layer => layer.type === "cirrus", effective: () => DEFAULT_ICE_CRYSTAL_ALIGNMENT
      }),
      CloudParameterSets.number("windDirectionDeg", "layerWindDirection", 0, 360, 0.1, {
        unit: "°", placeholder: "generalWind"
      }),
      CloudParameterSets.number("windSpeed", "layerWindSpeed", 0, 120, 0.01, {
        unit: "m/s", placeholder: "generalWind"
      }),
      CloudParameterSets.number("seed", "patternSeed", 0, 9999, 1)
    ] satisfies ParameterSpec[])
  }

  /** An individual cloud: where it stands, how big it is, and how dark. */
  static readonly INSTANCE: ParameterSet = {
    kind: "cloud-instance",
    title: "individualCloud",
    parameters: ([
      // From the observer, from a decor object, or as degrees: see PositionInputElement.
      { type: "position", key: "eastM", secondKey: "northM", saidKey: "saidPosition", native: "local", step: 1, label: "position" },
      CloudParameterSets.number("baseM", "cloudBase", 0, 20000, 1, { unit: CloudParameterSets.METRES, required: true }),
      CloudParameterSets.number("thicknessM", "cloudThickness", 10, 8000, 1, { unit: CloudParameterSets.METRES, required: true }),
      CloudParameterSets.number("widthM", "cloudWidth", 50, 20000, 10, { unit: CloudParameterSets.METRES, required: true }),
      CloudParameterSets.number("depthM", "cloudDepth", 50, 20000, 10, { unit: CloudParameterSets.METRES, required: true }),
      CloudParameterSets.number("rotationDeg", "cloudRotation", -360, 360, 1, { unit: "°", required: true }),
      CloudParameterSets.number("density", "cloudDensity", 0, 2, 0.01, { required: true }),
      CloudParameterSets.number("darkness", "darkness", 0, 1, 0.01, {
        placeholder: "layerDarkness"
      })
    ] satisfies ParameterSpec[])
  }
}
