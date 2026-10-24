import type { SightingLabels } from "./SightingLabels.js"

/** Contract for `<rr0-sighting>`'s user-visible label strings — implemented per language
 * under this directory (`SightingMessages_en.ts`, `SightingMessages_fr.ts`) and loaded via
 * `loadSightingMessages`. */
/* `tags` is not repeated here: SightingLabels already names that field, and one string with two
 * homes is one string that can end up translated two ways. */
export interface SightingMessages extends SightingLabels {
  accountBy: string
  /** A listed observer with no name of any kind in their own recording, `{n}` being their place in
   * the list. Only ever needed for a MANIFEST — a single unnamed observer gets no line at all, see
   * SightingElement.updateAccountLine. */
  unnamedObserver: string
  about: string
  close: string
  observation: string
  date: string
  location: string
  case: string
  description: string
  /** The info panel's label for where the account can be read as given — see RecordingSource. */
  source: string
  /** The tag after a line of the info panel saying how it is known — see Basis. */
  basis: Record<"measured" | "stated" | "derived" | "assumed", string>
  credits: string
  /** Title of the info panel's app link, which opens the observation being shown in the editor. */
  editThisObservation: string
  /** Heading of the info panel's embed section. */
  embed: string
  /** The two things the generated markup can embed: a replay, or the full editor. */
  embedReplay: string
  embedEdit: string
  /** The copy button, and what it says once the markup is on the clipboard. */
  /** The button that opens the share dialog, its title, its embed view's title, and its way back. */
  share: string
  embedObservation: string
  back: string
  embedCopy: string
  /** The share dialog's option to open the link at the position on show, its value in seconds. */
  /** The share dialog's option giving the link, beside Embed. */
  shareLink: string
  /** The share dialog's choice of what is shared when the recording is one of a case's: the whole case, or one of its recordings. */
  shareScope: string
  shareScopeCase: string
  /** The recording the shared case opens on first. */
  shareOpensOn: string
  shareStartAt: string
  /** The share dialog's options on how the shared replay opens: the chips, the observer map, the named moments, the comparison. */
  shareOptionLabels: string
  shareOptionMap: string
  shareOptionMilestones: string
  shareOptionCompare: string
  embedCopied: string
  /** The share dialog's choice of embedding this version for good rather than the current one; `{version}` is this one. */
  embedFreeze: string
  /** What freezing does, said when the pointer rests on it. */
  embedFreezeHint: string
  /** The info panel's toggle for the parameter strip under the render — what the recording states,
   * field by field, in the same words the editor uses for the same fields. */
  showLabels: string
  hideLabels: string
  /** The choice of what to replay the account with — see SightingElement.interpretationSelect. */
  interpretation: string
  /** The recording's own account, as the choice offers it beside the analysts' interpretations. */
  account: string
  /** An analyst's, `{title}` being what the case calls it and `{by}` who claims it. */
  interpretationBy: string
  /** Heading of the lines that set the interpretation's bodies against what the observer said. */
  confrontation: string
  /** `{deg}` degrees between the direction the observer gave and the one the body is in. */
  confrontationDirection: string
  /** `{ratio}`: how many times wider (or taller) the body looks than the observer said. */
  confrontationWidth: string
  confrontationHeight: string
  /** The toggle that shows the account beside an interpretation, as it reads each way. */
  showComparison: string
  hideComparison: string
  /** A variant the recording keeps (see InterpretationJson.variant), as the choice and its chip under the render name it ({name}: its candidate). */
  variant: string
  /** What the search made of each variant, in the words of the editor's candidates. */
  verdicts: { consolidated: string, contested: string, incompatible: string }
  /** The values a variant moves, as the line under the render names them. */
  variantFields: { time: string, heading: string, elevation: string, size: string, duration: string, sweep: string }
  /** The structural readings a variant uses (see CandidateSearch's StructuralReading), as the line under the render says them. */
  variantReadings: Record<string, string>
}
