/** Contract for `<rr0-eyewitness>`'s user-visible label strings — implemented per language
 * under this directory (`EyewitnessMessages_en.ts`, `EyewitnessMessages_fr.ts`) and loaded via
 * `loadEyewitnessMessages`. */
export interface EyewitnessMessages {
  testimonyBy: string
  about: string
  close: string
  observation: string
  date: string
  location: string
  case: string
  description: string
  tags: string
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
}
