import type { UfoMessages } from "./UfoMessages.js"
import type { UfoRecorderMessages } from "./UfoRecorderMessages.js"
import type { WitnessSelectorMessages } from "./WitnessSelectorMessages.js"

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

const recorderLoaders: Record<UfoLanguage, () => Promise<UfoRecorderMessages>> = {
  en: () => import("./UfoRecorderMessages_en.js").then(m => m.ufoRecorderMessages_en),
  fr: () => import("./UfoRecorderMessages_fr.js").then(m => m.ufoRecorderMessages_fr)
}

export function loadUfoRecorderMessages(language: UfoLanguage): Promise<UfoRecorderMessages> {
  return recorderLoaders[language]()
}

const witnessSelectorLoaders: Record<UfoLanguage, () => Promise<WitnessSelectorMessages>> = {
  en: () => import("./WitnessSelectorMessages_en.js").then(m => m.witnessSelectorMessages_en),
  fr: () => import("./WitnessSelectorMessages_fr.js").then(m => m.witnessSelectorMessages_fr)
}

export function loadWitnessSelectorMessages(language: UfoLanguage): Promise<WitnessSelectorMessages> {
  return witnessSelectorLoaders[language]()
}
