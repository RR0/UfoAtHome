import { Messages } from "../../../i18n/MessageCatalog.js"

/**
 * The names and notes a KML export writes, with `{…}` for their values: one chunk per language (see
 * MessageCatalog).
 *
 * Written into a file that leaves the tool, so the language is the author's writing language rather
 * than the reader's — whoever opens the file in Google Earth reads what the author wrote.
 */
export interface KmlExportTexts {
  /** The document's own name: `{name}` is the recording's file name. */
  document: string
  /** What the document says it is, under its name. */
  documentNote: string
  folderObserver: string
  folderSightLines: string
  folderBodies: string
  folderTraces: string
  /** `{s}`: seconds into the observation. */
  observerPoint: string
  observerPath: string
  /** `{elevation}`: metres above the ground; `{heading}`: degrees from north. */
  observerNote: string
  /** `{what}` the phenomenon's name or id, `{s}` seconds. */
  sightLine: string
  /** `{azimuth}`, `{altitude}`: degrees; `{km}`: the length drawn. */
  sightLineNote: string
  /** `{what}`: the body's name or id. */
  bodyPoint: string
  bodyPath: string
  bodyNote: string
  /** What a height in this file is counted from. */
  heightNote: string
  /** A phenomenon or a body its author named nothing: `{id}` is its id. */
  unnamed: string
}

export const KML_EXPORT_TEXTS = Messages.catalog<KmlExportTexts>({
  en: () => import("./KmlExportTexts_en.js").then(m => m.kmlExportTexts_en),
  fr: () => import("./KmlExportTexts_fr.js").then(m => m.kmlExportTexts_fr),
  es: () => import("./KmlExportTexts_es.js").then(m => m.kmlExportTexts_es),
  it: () => import("./KmlExportTexts_it.js").then(m => m.kmlExportTexts_it)
})
