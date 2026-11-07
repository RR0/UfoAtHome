import { describe, expect, test } from "vitest"
import { CloudParameterSets } from "../../../src/engine/model/CloudParameterSets.js"
import type { CloudLayer } from "../../../src/engine/model/CloudLayer.js"
import type { NumberParameter, ParameterHolder } from "../../../src/engine/interpretation/Parameters.js"
import { UFO_LANGUAGES } from "../../../src/i18n/MessageCatalog.js"
import { ParameterTexts } from "../../../src/engine/interpretation/Parameters.js"
import { CLOUD_PARAMETER_TEXTS } from "../../../src/engine/model/messages/CloudParameterTexts.js"

const layer: CloudLayer = { id: "l", type: "cumulus", baseM: 1500, thicknessM: 800, coverage: 0.5, sizeM: 1400, density: 1 }
const holder = layer as unknown as ParameterHolder
const spec = (key: string) => CloudParameterSets.LAYER.parameters.find(candidate => candidate.key === key)!

describe("CloudParameterSets", () => {
  test("a layer has the properties the renderer reads, in the order the editor always showed them", () => {
    expect(CloudParameterSets.LAYER.parameters.map(p => p.key)).toEqual(
      ["type", "baseM", "thicknessM", "coverage", "sizeM", "density", "darkness", "iceCrystalAlignment", "windDirectionDeg", "windSpeed", "seed"])
  })

  test("an individual cloud has a place, a size, a turn and a density", () => {
    // The place is one field, east and north together (see PositionParameter).
    expect(CloudParameterSets.INSTANCE.parameters.map(p => p.type === "position" ? `${p.key}+${p.secondKey}` : p.key)).toEqual(
      ["eastM+northM", "baseM", "thicknessM", "widthM", "depthM", "rotationDeg", "density", "darkness"])
  })

  test("coverage is stored from 0 to 1 and typed in percent", () => {
    const coverage = spec("coverage") as NumberParameter
    expect([coverage.scale, coverage.min, coverage.max, coverage.unit]).toEqual([100, 0, 100, "%"])
  })

  test("only a cirrus has crystals that line up", () => {
    const alignment = spec("iceCrystalAlignment")
    expect(alignment.visibleWhen!({ ...holder, type: "cirrus" })).toBe(true)
    expect(alignment.visibleWhen!({ ...holder, type: "cumulus" })).toBe(false)
  })

  test("a layer's shading, left empty, is the weather's own", () => {
    const darkness = spec("darkness") as NumberParameter
    expect(darkness.effective!(holder, { generalDarkness: 0.35 })).toBe(0.35)
    expect(darkness.effective!(holder, undefined)).toBeUndefined()
  })

  test("what cannot be absent is required, and what can inherit is not", () => {
    const required = (key: string) => (spec(key) as NumberParameter).required === true
    expect(["baseM", "thicknessM", "coverage", "sizeM", "density"].every(required)).toBe(true)
    expect(["darkness", "windDirectionDeg", "windSpeed", "seed"].some(required)).toBe(false)
  })

  test("a layer's own wind, left empty, says it takes the general wind", async () => {
    const wind = spec("windSpeed") as NumberParameter
    const shown = async (language: string) => (ParameterTexts.resolve(CloudParameterSets.LAYER, await CLOUD_PARAMETER_TEXTS.load(language)).parameters
      .find(candidate => candidate.key === wind.key) as NumberParameter).placeholder
    expect([await shown("en"), await shown("fr")]).toEqual(["General wind", "Vent général"])
  })

  test("every label is said in the four languages, so none has to fall back", async () => {
    for (const language of UFO_LANGUAGES) {
      const texts = await CLOUD_PARAMETER_TEXTS.load(language)
      for (const set of [CloudParameterSets.LAYER, CloudParameterSets.INSTANCE]) expect(ParameterTexts.missing(set, texts), language).toEqual([])
    }
  })
})
