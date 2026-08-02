import type { UfoMessages } from "./UfoMessages.js"

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
