import type { UfoMessages } from "./UfoMessages.js"
import type { SightingEditorMessages } from "./SightingEditorMessages.js"
import type { SightingMessages } from "./SightingMessages.js"
import type { TagNames } from "./TagNames.js"
import type { SceneNames } from "./SceneNames.js"
import type { CloudEditorMessages } from "./CloudEditorMessages.js"
import type { BodyEditorMessages } from "./BodyEditorMessages.js"

export const UFO_SUPPORTED_LANGUAGES = ["en", "fr", "es", "it"] as const
export type UfoLanguage = (typeof UFO_SUPPORTED_LANGUAGES)[number]

/** Lazy-loaded so a page rendering in the fallback language (en, already baked into the
 * template's default text) never downloads the other language's messages module. */
const loaders: Record<UfoLanguage, () => Promise<UfoMessages>> = {
  en: () => import("./UfoMessages_en.js").then(m => m.ufoMessages_en),
  fr: () => import("./UfoMessages_fr.js").then(m => m.ufoMessages_fr),
  es: () => import("./UfoMessages_es.js").then(m => m.ufoMessages_es),
  it: () => import("./UfoMessages_it.js").then(m => m.ufoMessages_it)
}

export function loadUfoMessages(language: UfoLanguage): Promise<UfoMessages> {
  return loaders[language]()
}

const recorderLoaders: Record<UfoLanguage, () => Promise<SightingEditorMessages>> = {
  en: () => import("./SightingEditorMessages_en.js").then(m => m.sightingEditorMessages_en),
  fr: () => import("./SightingEditorMessages_fr.js").then(m => m.sightingEditorMessages_fr),
  es: () => import("./SightingEditorMessages_es.js").then(m => m.sightingEditorMessages_es),
  it: () => import("./SightingEditorMessages_it.js").then(m => m.sightingEditorMessages_it)
}

export function loadSightingEditorMessages(language: UfoLanguage): Promise<SightingEditorMessages> {
  return recorderLoaders[language]()
}

const sightingLoaders: Record<UfoLanguage, () => Promise<SightingMessages>> = {
  en: () => import("./SightingMessages_en.js").then(m => m.sightingMessages_en),
  fr: () => import("./SightingMessages_fr.js").then(m => m.sightingMessages_fr),
  es: () => import("./SightingMessages_es.js").then(m => m.sightingMessages_es),
  it: () => import("./SightingMessages_it.js").then(m => m.sightingMessages_it)
}

export function loadSightingMessages(language: UfoLanguage): Promise<SightingMessages> {
  return sightingLoaders[language]()
}

/**
 * What tags are called in `language` — empty for English, which is the language they are stored
 * in and therefore already shown in (see TagNames).
 *
 * Lazy like the message modules above, and for the same reason: a page reading in English never
 * downloads a dictionary that would only map every term onto itself.
 */
export function loadTagNames(language: UfoLanguage): Promise<TagNames> {
  switch (language) {
    case "fr": return import("./TagNames_fr.js").then(m => m.tagNames_fr)
    case "es": return import("./TagNames_es.js").then(m => m.tagNames_es)
    case "it": return import("./TagNames_it.js").then(m => m.tagNames_it)
    default: return Promise.resolve({})
  }
}

const bodyEditorLoaders: Record<UfoLanguage, () => Promise<BodyEditorMessages>> = {
  en: () => import("./BodyEditorMessages_en.js").then(m => m.bodyEditorMessages_en),
  fr: () => import("./BodyEditorMessages_fr.js").then(m => m.bodyEditorMessages_fr),
  es: () => import("./BodyEditorMessages_es.js").then(m => m.bodyEditorMessages_es),
  it: () => import("./BodyEditorMessages_it.js").then(m => m.bodyEditorMessages_it)
}

export function loadBodyEditorMessages(language: UfoLanguage): Promise<BodyEditorMessages> {
  return bodyEditorLoaders[language]()
}

/**
 * What the scene and its catalogues call things in `language` — undefined for English, the
 * language the catalogues are generated in and the code names things in (see SceneNames).
 *
 * Lazy like everything above: a page reading in English never downloads a table of names, and a
 * page reading in French downloads the French one alone.
 */
export function loadSceneNames(language: UfoLanguage): Promise<SceneNames | undefined> {
  switch (language) {
    case "fr": return import("./SceneNames_fr.js").then(m => m.sceneNames_fr)
    case "es": return import("./SceneNames_es.js").then(m => m.sceneNames_es)
    case "it": return import("./SceneNames_it.js").then(m => m.sceneNames_it)
    default: return Promise.resolve(undefined)
  }
}

/** The cloud editor's texts in `language` — undefined for English, which is the template's own
 * text (see CloudEditorMessages). */
export function loadCloudEditorMessages(language: UfoLanguage): Promise<CloudEditorMessages | undefined> {
  switch (language) {
    case "fr": return import("./CloudEditorMessages_fr.js").then(m => m.cloudEditorMessages_fr)
    case "es": return import("./CloudEditorMessages_es.js").then(m => m.cloudEditorMessages_es)
    case "it": return import("./CloudEditorMessages_it.js").then(m => m.cloudEditorMessages_it)
    default: return Promise.resolve(undefined)
  }
}
