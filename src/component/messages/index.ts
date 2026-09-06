import type { UfoMessages } from "./UfoMessages.js"
import type { SightingEditorMessages } from "./SightingEditorMessages.js"
import type { SightingMessages } from "./SightingMessages.js"
import type { TagNames } from "./TagNames.js"

export const UFO_SUPPORTED_LANGUAGES = ["en", "fr"] as const
export type UfoLanguage = (typeof UFO_SUPPORTED_LANGUAGES)[number]

/** Lazy-loaded so a page rendering in the fallback language (en, already baked into the
 * template's default text) never downloads the other language's messages module. */
const loaders: Record<UfoLanguage, () => Promise<UfoMessages>> = {
  en: () => import("./UfoMessages_en.js").then(m => m.ufoMessages_en),
  fr: () => import("./UfoMessages_fr.js").then(m => m.ufoMessages_fr)
}

export function loadUfoMessages(language: UfoLanguage): Promise<UfoMessages> {
  return loaders[language]()
}

const recorderLoaders: Record<UfoLanguage, () => Promise<SightingEditorMessages>> = {
  en: () => import("./SightingEditorMessages_en.js").then(m => m.sightingEditorMessages_en),
  fr: () => import("./SightingEditorMessages_fr.js").then(m => m.sightingEditorMessages_fr)
}

export function loadSightingEditorMessages(language: UfoLanguage): Promise<SightingEditorMessages> {
  return recorderLoaders[language]()
}

const sightingLoaders: Record<UfoLanguage, () => Promise<SightingMessages>> = {
  en: () => import("./SightingMessages_en.js").then(m => m.sightingMessages_en),
  fr: () => import("./SightingMessages_fr.js").then(m => m.sightingMessages_fr)
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
  return language === "fr"
    ? import("./TagNames_fr.js").then(m => m.tagNames_fr)
    : Promise.resolve({})
}
