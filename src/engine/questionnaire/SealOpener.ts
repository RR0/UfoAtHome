import type { InterviewSeal } from "./QuestionnaireSeal.js"

/**
 * What opens the answers sealed for one recipient (see QuestionnaireSeal): that recipient's own module, holding or asking for its private key. None is
 * built in: UFO@home seals, it never holds a key that opens.
 *
 * `open` is called on the reader's click, before anything is awaited, so that it may itself ask for a file (the key) as the browser asks a click to.
 * What it opens is shown in the page it was opened in, and written nowhere.
 */
export interface SealOpener {
  /** The id of the recipient whose seals it opens (see SealRecipient.id, InterviewSeal.for). */
  recipient: string
  /** The sealed text, or undefined when the reader gave no key; an error when the key is not the one it was sealed for. */
  open(seal: InterviewSeal): Promise<string | undefined>
}
