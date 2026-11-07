import { describe, expect, it } from "vitest"
import { ParameterTexts } from "../../src/engine/interpretation/Parameters.js"
import { UFO_LANGUAGES } from "../../src/i18n/MessageCatalog.js"
import { BeamParameters } from "../../src/modules/sky-events/beams/BeamParameters.js"
import { BEAM_PARAMETER_TEXTS } from "../../src/modules/sky-events/beams/messages/BeamParameterTexts.js"
import { LaunchParameters } from "../../src/modules/sky-events/launches/LaunchParameters.js"
import { LAUNCH_PARAMETER_TEXTS } from "../../src/modules/sky-events/launches/messages/LaunchParameterTexts.js"
import { ReentryParameters } from "../../src/modules/sky-events/reentries/ReentryParameters.js"
import { REENTRY_PARAMETER_TEXTS } from "../../src/modules/sky-events/reentries/messages/ReentryParameterTexts.js"
import { LanternParameters } from "../../src/modules/interpretations/lanterns/LanternParameters.js"
import { LANTERN_PARAMETER_TEXTS } from "../../src/modules/interpretations/lanterns/messages/LanternParameterTexts.js"

/*
 * The rule of MessageCatalog, enforced: whatever shows a reader words takes them from a catalog, one module per language, loaded only in
 * the reader's. Nothing decides case by case: a word written inline, or a language imported up front, fails here.
 *
 * What still does is listed below, each with why, and the list only shrinks: a file that no longer breaks the rule fails until it is
 * taken off it.
 */

/** Every source file, by its path under src/, with its text (see Vite's import.meta.glob): read, not run. */
const SOURCES = Object.fromEntries(Object.entries(import.meta.glob("../../src/**/*.ts", { query: "?raw", import: "default", eager: true }) as Record<string, string>)
  .map(([file, text]) => [file.replace("../../src/", ""), text]))

/** Texts in several languages written in code. */
const INLINE_STILL = new Map<string, string>([
  ["component/SightingEditorElement.ts", "to move to catalogs with the components (step 2)"],
  ["component/SightingElement.ts", "to move to catalogs with the components (step 2)"],
  ["engine/interpretation/BodyParameterSets.ts", "the core's sets of parameters (step 3)"],
  ["engine/model/CloudParameterSets.ts", "the core's sets of parameters (step 3)"],
  ["engine/model/DecorBaseParameterSets.ts", "the core's sets of parameters (step 3)"],
  ["engine/model/DecorParameterSets.ts", "the core's sets of parameters (step 3)"],
  // Not words of the interface: the title the bodies computed from a launch carry, as a recording's own bodies carry theirs (SaidText is
  // the content's form), computed synchronously whenever the interpretation is shown.
  ["modules/interpretations/lanterns/SkyLantern.ts", "content: the computed bodies' title"]
])

/** Components that still import English up front. */
const ENGLISH_UP_FRONT_STILL = new Set([
  "component/BodyEditor.ts", "component/CaseEditorElement.ts", "component/CloudEditor.ts", "component/DateInputElement.ts",
  "component/DurationInputElement.ts", "component/InterviewEditorElement.ts", "component/InterviewElement.ts", "component/ShareDialogElement.ts",
  "component/SightingEditorElement.ts", "component/SightingElement.ts", "component/UfoElement.ts"
])

const code = Object.entries(SOURCES).map(([file, text]) => ({ file, text }))
  .filter(({ file }) => !file.includes("/messages/") && !file.startsWith("generated/") && !file.startsWith("i18n/"))

describe("the words of the interface", () => {
  it("are never written inline in several languages", () => {
    const inline = code.filter(({ text }) => /\{\s*en:\s*["'`]/.test(text)).map(({ file }) => file)
    expect(inline.filter(file => !INLINE_STILL.has(file))).toEqual([])
    expect([...INLINE_STILL.keys()].filter(file => !inline.includes(file))).toEqual([])
  })

  it("are never imported in English up front", () => {
    const upFront = code.filter(({ text }) => /import \{[^}]*_en \} from/.test(text)).map(({ file }) => file)
    expect(upFront.filter(file => !ENGLISH_UP_FRONT_STILL.has(file))).toEqual([])
    expect([...ENGLISH_UP_FRONT_STILL].filter(file => !upFront.includes(file))).toEqual([])
  })

  it("have a module in every language wherever they have one in English", () => {
    const english = Object.keys(SOURCES).filter(file => file.includes("/messages/") && file.endsWith("_en.ts"))
    const lacking = english.flatMap(file => UFO_LANGUAGES.filter(language => !(file.replace(/_en\.ts$/, `_${language}.ts`) in SOURCES))
      .map(language => `${file} → ${language}`))
    expect(english.length).toBeGreaterThan(20)
    expect(lacking).toEqual([])
  })

  it("of the modules' sets of parameters are all there, in every language", async () => {
    const sets = [
      { texts: BEAM_PARAMETER_TEXTS, sets: [BeamParameters.SET, BeamParameters.LIGHT, BeamParameters.LIGHT_KEY, BeamParameters.ON, BeamParameters.MOVE_KEY, BeamParameters.PLACE] },
      { texts: LAUNCH_PARAMETER_TEXTS, sets: [LaunchParameters.SET, LaunchParameters.PLACE, LaunchParameters.JET] },
      { texts: REENTRY_PARAMETER_TEXTS, sets: [ReentryParameters.SET, ReentryParameters.PLACE, ReentryParameters.FRAGMENT, ReentryParameters.CURVE_POINT] },
      { texts: LANTERN_PARAMETER_TEXTS, sets: [LanternParameters.SET] }
    ]
    // The check is one: with no words at all, every key is said to be missing.
    expect(ParameterTexts.missing(BeamParameters.SET, {}).length).toBeGreaterThan(5)
    for (const language of UFO_LANGUAGES) {
      for (const { texts, sets: of } of sets) {
        const loaded = await texts.load(language)
        for (const set of of) expect({ language, kind: set.kind, missing: ParameterTexts.missing(set, loaded) }).toEqual({ language, kind: set.kind, missing: [] })
      }
    }
  })
})
