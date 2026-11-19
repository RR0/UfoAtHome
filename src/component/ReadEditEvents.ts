/*
 * What readers and editors say to the page around them to switch in place, and nothing else: a reader imports this, never the switch
 * (ReadEditSwitch), which would bring the editor into its bundle as a chunk and every module it shares with it into its entry.
 */

/**
 * Fired by an editor (`<rr0-case-editor>`) when its author asks to read what it holds, by a reader (`<rr0-case>`, `<rr0-sighting>`) when its
 * reader asks to edit what it shows. Both bubble out of the element and can be cancelled: a page that switches between the two in place
 * takes it (`preventDefault()`), and the element then does nothing more. Not taken, the element opens the other on the file's address, in a
 * tab of its own, as it always did.
 */
export const READ_EVENT = "rr0-read"
export const EDIT_EVENT = "rr0-edit"

/**
 * Set on `<rr0-case-editor>` for it to switch in place with a reader (see ReadEditSwitch), and on the reader it is switched with: the editor
 * then offers to read what it holds even when it has no address, since what it holds is handed over in memory (see OpenFiles).
 */
export const IN_PLACE_ATTRIBUTE = "in-place"

/** Fired by `<rr0-case-editor in-place>` when it switches, `detail` a ReadEditMode: what a page puts in its address or its title. */
export const MODE_CHANGE_EVENT = "rr0-mode"

/** What a switch is asked for: the file, by the address it is read by, and the recording of a case to open on, if one is named. */
export interface ReadEditDetail {
  readonly src: string
  readonly track?: string
}

/** What a reader or an editor needs of the event: whether the page took it. */
export class ReadEdit {

  /** Asks the page around `from` to switch in place: true when it did, and the element is to do nothing more. */
  static ask(from: HTMLElement, type: typeof READ_EVENT | typeof EDIT_EVENT, detail: ReadEditDetail): boolean {
    const event = new CustomEvent<ReadEditDetail>(type, { detail, bubbles: true, composed: true, cancelable: true })
    from.dispatchEvent(event)
    return event.defaultPrevented
  }
}

/** What the page is told when it switches: which of the two is on show now, and on what. */
export type ReadEditMode = { readonly mode: "edit" } | { readonly mode: "read", readonly src: string, readonly track?: string }
