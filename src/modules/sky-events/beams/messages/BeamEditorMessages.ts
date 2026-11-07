import { Messages } from "../../../../i18n/MessageCatalog.js"
/** What the Beams part of the Sky group says — see BeamEditor. */
export interface BeamEditorMessages {
  intro: string
  none: string
  beam: string
  deleteBeam: string
  addBeam: string
  /** The path of a beam: its legend, the picker of its points, what adds, removes and steps through them. */
  path: string
  place: string
  addPlace: string
  deletePlace: string
  previousPlace: string
  nextPlace: string
  /** The adding button when the recording has no place to put a beam at. */
  addBeamNowhere: string
  /** Under the fields: what an empty field means. */
  derivedNote: string
  /** The rows of its timeline and what they show under it, what their "+" does, and how to zoom it. */
  on: string
  zoomHint: string
  light: string
  colour: string
  colourHint: string
  deleteKey: string
  timelineNote: string
  addHere: string
  here: string
  lightKeyNote: string
  lightNoKeyNote: string
  pathKeyNote: string
  pathNoKeyNote: string
}

/** The texts of the part, one chunk per language (see MessageCatalog). */
export const BEAM_EDITOR_MESSAGES = Messages.catalog<BeamEditorMessages>({
  en: () => import("./BeamEditorMessages_en.js").then(m => m.beamEditorMessages_en),
  fr: () => import("./BeamEditorMessages_fr.js").then(m => m.beamEditorMessages_fr),
  es: () => import("./BeamEditorMessages_es.js").then(m => m.beamEditorMessages_es),
  it: () => import("./BeamEditorMessages_it.js").then(m => m.beamEditorMessages_it)
})
