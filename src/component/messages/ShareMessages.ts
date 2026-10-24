/** What the share dialog says (see ShareDialogElement), whichever element it shares. */
export interface ShareMessages {
  /** The dialog's title, and the button that opens it. */
  share: string
  close: string
  /** The two ways of sharing: a link, or the code that puts the element on another page. */
  link: string
  embed: string
  copy: string
  copied: string
  /** Embedding this version for good rather than the current one; `{version}` is this one. */
  freeze: string
  /** What freezing does, said when the pointer rests on it. */
  freezeHint: string
  /** Said in an editor whose changes are not saved: what is shared is the file at its address, not what is on screen. */
  unsaved: string
  /** Why an editor cannot share: what it holds has no address (a new recording, a file picked from the disk). */
  unavailable: string
}
