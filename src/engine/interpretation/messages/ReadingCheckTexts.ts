import { Messages } from "../../../i18n/MessageCatalog.js"

/**
 * The words of ReadingCheck's findings, with `{…}` for their values: one chunk per language (see MessageCatalog). Computed for whoever reads
 * them, never written into a recording, so the reader's language is enough.
 */
export interface ReadingCheckTexts {
  timeWithin: string
  timeOutside: string
  timeChanged: string
  valueWithin: string
  valueOutside: string
  valueChanged: string
  lightingHolds: string
  lightingFails: string
  altitudes: string
  latitude: string
  longitude: string
  /** The most favourable configurations a search finds for a reading that says its mechanism (see BestCaseSearch). */
  bestFixed: string
  bestOneWay: string
  bestGhost: string
  bestGhostNeeds: string
  bestStatedGhost: string
  bestNoGhost: string
  bestGhostOf: string
  bestRealObject: string
  /** The decimal mark of the language. */
  decimal: string
}

export const READING_CHECK_TEXTS = Messages.catalog<ReadingCheckTexts>({
  en: () => import("./ReadingCheckTexts_en.js").then(m => m.readingCheckTexts_en),
  fr: () => import("./ReadingCheckTexts_fr.js").then(m => m.readingCheckTexts_fr),
  es: () => import("./ReadingCheckTexts_es.js").then(m => m.readingCheckTexts_es),
  it: () => import("./ReadingCheckTexts_it.js").then(m => m.readingCheckTexts_it)
})
