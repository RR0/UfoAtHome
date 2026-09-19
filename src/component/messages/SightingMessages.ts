import type { SightingLabels } from "./SightingLabels.js"

/** Contract for `<rr0-sighting>`'s user-visible label strings — implemented per language
 * under this directory (`SightingMessages_en.ts`, `SightingMessages_fr.ts`) and loaded via
 * `loadSightingMessages`. */
/* `tags` is not repeated here: SightingLabels already names that field, and one string with two
 * homes is one string that can end up translated two ways. */
export interface SightingMessages extends SightingLabels {
  testimonyBy: string
  /** A listed witness with no name of any kind in their own recording, `{n}` being their place in
   * the list. Only ever needed for a MANIFEST — a single unnamed witness gets no line at all, see
   * SightingElement.updateTestimonyLine. */
  unnamedWitness: string
  about: string
  close: string
  observation: string
  date: string
  location: string
  case: string
  description: string
  credits: string
  /** Title of the info panel's app link, which opens the observation being shown in the editor. */
  editThisObservation: string
  /** Heading of the info panel's embed section. */
  embed: string
  /** The two things the generated markup can embed: a replay, or the full editor. */
  embedReplay: string
  embedEdit: string
  /** The copy button, and what it says once the markup is on the clipboard. */
  embedCopy: string
  embedCopied: string
  /** The info panel's toggle for the parameter strip under the render — what the recording states,
   * field by field, in the same words the editor uses for the same fields. */
  showLabels: string
  hideLabels: string
  /** The choice of what to replay the testimony with — see SightingElement.interpretationSelect. */
  interpretation: string
  rawTestimony: string
  /** The witness's own reading of what they saw — see SightingRecordingJson.interpretation. */
  witnessInterpretation: string
  /** An analyst's, `{title}` being what the case calls it and `{by}` who claims it. */
  interpretationBy: string
  /** Heading of the lines that set the interpretation's bodies against what the witness said. */
  confrontation: string
  /** `{deg}` degrees between the direction the witness gave and the one the body is in. */
  confrontationDirection: string
  /** `{ratio}`: how many times wider (or taller) the body looks than the witness said. */
  confrontationWidth: string
  confrontationHeight: string
  /** The toggle that shows the testimony beside an interpretation, as it reads each way. */
  showComparison: string
  hideComparison: string
}
