import { Messages } from "../../../../i18n/MessageCatalog.js"

/** What the beams are called, and what the scene's tooltip says of one (see BEAM_KIND). */
export interface BeamKindMessages {
  /** The editor's part. */
  title: string
  /** What a beam with no title of its own is called. */
  name: string
  /** The tooltip's detail: {name}, {wavelength} (nm), {power} (W), {distance}. */
  detail: string
}

/** One chunk per language (see MessageCatalog). */
export const BEAM_KIND_MESSAGES = Messages.catalog<BeamKindMessages>({
  en: () => import("./BeamKindMessages_en.js").then(m => m.beamKindMessages_en),
  fr: () => import("./BeamKindMessages_fr.js").then(m => m.beamKindMessages_fr),
  es: () => import("./BeamKindMessages_es.js").then(m => m.beamKindMessages_es),
  it: () => import("./BeamKindMessages_it.js").then(m => m.beamKindMessages_it)
})
