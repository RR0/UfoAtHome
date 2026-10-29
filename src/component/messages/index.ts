import type { UfoMessages } from "./UfoMessages.js"
import type { SightingEditorMessages } from "./SightingEditorMessages.js"
import type { SightingMessages } from "./SightingMessages.js"
import type { TagNames } from "./TagNames.js"
import type { SceneNames } from "./SceneNames.js"
import type { CloudEditorMessages } from "./CloudEditorMessages.js"
import type { BodyEditorMessages } from "./BodyEditorMessages.js"
import type { LaunchEditorMessages } from "./LaunchEditorMessages.js"
import type { BeamEditorMessages } from "./BeamEditorMessages.js"
import type { LanternEditorMessages } from "./LanternEditorMessages.js"
import type { CaseEditorMessages } from "./CaseEditorMessages.js"
import type { InterviewMessages } from "./InterviewMessages.js"
import type { ShareMessages } from "./ShareMessages.js"

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

const shareLoaders: Record<UfoLanguage, () => Promise<ShareMessages>> = {
  en: () => import("./ShareMessages_en.js").then(m => m.shareMessages_en),
  fr: () => import("./ShareMessages_fr.js").then(m => m.shareMessages_fr),
  es: () => import("./ShareMessages_es.js").then(m => m.shareMessages_es),
  it: () => import("./ShareMessages_it.js").then(m => m.shareMessages_it)
}

export function loadShareMessages(language: UfoLanguage): Promise<ShareMessages> {
  return shareLoaders[language]()
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

const beamEditorLoaders: Record<UfoLanguage, () => Promise<BeamEditorMessages>> = {
  en: () => import("./BeamEditorMessages_en.js").then(m => m.beamEditorMessages_en),
  fr: () => import("./BeamEditorMessages_fr.js").then(m => m.beamEditorMessages_fr),
  es: () => import("./BeamEditorMessages_es.js").then(m => m.beamEditorMessages_es),
  it: () => import("./BeamEditorMessages_it.js").then(m => m.beamEditorMessages_it)
}

export function loadBeamEditorMessages(language: UfoLanguage): Promise<BeamEditorMessages> {
  return beamEditorLoaders[language]()
}

const lanternEditorLoaders: Record<UfoLanguage, () => Promise<LanternEditorMessages>> = {
  en: () => import("./LanternEditorMessages_en.js").then(m => m.lanternEditorMessages_en),
  fr: () => import("./LanternEditorMessages_fr.js").then(m => m.lanternEditorMessages_fr),
  es: () => import("./LanternEditorMessages_es.js").then(m => m.lanternEditorMessages_es),
  it: () => import("./LanternEditorMessages_it.js").then(m => m.lanternEditorMessages_it)
}

export function loadLanternEditorMessages(language: UfoLanguage): Promise<LanternEditorMessages> {
  return lanternEditorLoaders[language]()
}

const launchEditorLoaders: Record<UfoLanguage, () => Promise<LaunchEditorMessages>> = {
  en: () => import("./LaunchEditorMessages_en.js").then(m => m.launchEditorMessages_en),
  fr: () => import("./LaunchEditorMessages_fr.js").then(m => m.launchEditorMessages_fr),
  es: () => import("./LaunchEditorMessages_es.js").then(m => m.launchEditorMessages_es),
  it: () => import("./LaunchEditorMessages_it.js").then(m => m.launchEditorMessages_it)
}

export function loadLaunchEditorMessages(language: UfoLanguage): Promise<LaunchEditorMessages> {
  return launchEditorLoaders[language]()
}

const caseEditorLoaders: Record<UfoLanguage, () => Promise<CaseEditorMessages>> = {
  en: () => import("./CaseEditorMessages_en.js").then(m => m.caseEditorMessages_en),
  fr: () => import("./CaseEditorMessages_fr.js").then(m => m.caseEditorMessages_fr),
  es: () => import("./CaseEditorMessages_es.js").then(m => m.caseEditorMessages_es),
  it: () => import("./CaseEditorMessages_it.js").then(m => m.caseEditorMessages_it)
}

const interviewLoaders: Record<UfoLanguage, () => Promise<InterviewMessages>> = {
  en: () => import("./InterviewMessages_en.js").then(m => m.interviewMessages_en),
  fr: () => import("./InterviewMessages_fr.js").then(m => m.interviewMessages_fr),
  es: () => import("./InterviewMessages_es.js").then(m => m.interviewMessages_es),
  it: () => import("./InterviewMessages_it.js").then(m => m.interviewMessages_it)
}

export function loadInterviewMessages(language: UfoLanguage): Promise<InterviewMessages> {
  return interviewLoaders[language]()
}

export function loadCaseEditorMessages(language: UfoLanguage): Promise<CaseEditorMessages> {
  return caseEditorLoaders[language]()
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
