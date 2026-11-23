import { SearchlightSighting } from "./Searchlight.js"
import type { SearchlightJson } from "./Searchlight.js"
import { ParameterRegistry } from "../../../engine/interpretation/Parameters.js"
import type { NumberParameter, ParameterHolder, ParameterSet, ParameterSpec } from "../../../engine/interpretation/Parameters.js"

/**
 * What a searchlight lets its author set: where it stands, its lamp (how many beams, how bright, how wide, what colour) and how its beams move.
 * An empty field shows what is in force: a four-kilowatt xenon skytracker's head, and the motion its number of beams implies.
 */
export class SearchlightParameters {
  private static time(key: "fromT" | "untilT", label: string, hint: string): NumberParameter {
    return { type: "number", key, min: -36000, max: 36000, step: 1, unit: "s", scale: 0.001, label, hint, group: "when" }
  }

  private static of(element: ParameterHolder): SearchlightJson {
    return element as unknown as SearchlightJson
  }

  static readonly SET: ParameterSet = {
    kind: "searchlight",
    title: "searchlight",
    parameters: ([
      { type: "said", key: "title", label: "name", group: "searchlight" },
      // As degrees, or from the observer or a decor object (the club's roof): see PositionInputElement.
      { type: "position", key: "lat", secondKey: "lng", saidKey: "saidPosition", native: "geo", step: 1, label: "position", group: "searchlight" },
      {
        type: "number", key: "heightM", min: 0, max: 500, step: 0.5, unit: "m", label: "height", hint: "heightHint", group: "searchlight",
        effective: () => SearchlightSighting.DEFAULT_HEIGHT_M
      },
      {
        type: "number", key: "beams", min: 1, max: SearchlightSighting.MAX_BEAMS, step: 1, label: "beams", hint: "beamsHint", group: "lamp",
        effective: () => 1
      },
      {
        type: "number", key: "intensityCd", min: 1e4, max: 1e10, step: 1e6, unit: "cd", label: "intensity", hint: "intensityHint", group: "lamp",
        effective: () => SearchlightSighting.DEFAULT_INTENSITY_CD
      },
      {
        type: "number", key: "divergenceDeg", min: 0.1, max: 20, step: 0.1, unit: "°", label: "divergence", hint: "divergenceHint", group: "lamp",
        effective: () => SearchlightSighting.DEFAULT_DIVERGENCE_DEG
      },
      {
        type: "number", key: "colourTemperatureK", min: 2000, max: 10000, step: 100, unit: "K", label: "temperature", hint: "temperatureHint", group: "lamp",
        effective: () => SearchlightSighting.DEFAULT_TEMPERATURE_K
      },
      {
        type: "choice", key: "motion", label: "pattern", hint: "patternHint", group: "motion",
        effective: element => SearchlightSighting.motionOf(SearchlightParameters.of(element)),
        choices: [
          { value: "fixed", label: "fixed" },
          { value: "sweep", label: "sweep" },
          { value: "rotate", label: "rotate" },
          { value: "cloverleaf", label: "cloverleaf" }
        ]
      },
      {
        type: "number", key: "tiltDeg", min: 0, max: 85, step: 1, unit: "°", label: "tilt", hint: "tiltHint", group: "motion",
        effective: () => SearchlightSighting.DEFAULT_TILT_DEG
      },
      {
        type: "number", key: "spreadDeg", min: 0, max: 360, step: 1, unit: "°", label: "spread", hint: "spreadHint", group: "motion",
        effective: () => SearchlightSighting.DEFAULT_SPREAD_DEG,
        visibleWhen: element => SearchlightSighting.motionOf(SearchlightParameters.of(element)) === "sweep"
      },
      {
        type: "number", key: "azimuthDeg", min: 0, max: 360, step: 1, unit: "°", label: "azimuth", hint: "azimuthHint", group: "motion",
        effective: () => 0
      },
      {
        type: "number", key: "periodS", min: 0.5, max: 600, step: 0.5, unit: "s", label: "period", hint: "periodHint", group: "motion",
        effective: () => SearchlightSighting.DEFAULT_PERIOD_S,
        visibleWhen: element => SearchlightSighting.motionOf(SearchlightParameters.of(element)) !== "fixed"
      },
      SearchlightParameters.time("fromT", "from", "fromHint"),
      SearchlightParameters.time("untilT", "until", "untilHint")
    ] satisfies ParameterSpec[])
  }

  static publish(): void {
    ParameterRegistry.publish(SearchlightParameters.SET)
  }
}
