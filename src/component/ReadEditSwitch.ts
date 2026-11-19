import { CaseFile } from "../engine/persistence/caseJson.js"
import { OpenFiles } from "../engine/net/OpenFiles.js"

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

/** The editor's side of it: what the switch needs of `<rr0-case-editor>`. */
export interface SwitchedEditor extends HTMLElement {
  /** Opens the recording of the open case at `url`, the editor being shown again on it. */
  openTrack(url: string): Promise<void>
}

/**
 * Switches, in place on a page, between an editor and a reader of what it holds.
 *
 * The editor stays where it is, hidden while the reader is on show, so that coming back to it finds it as it was left: its history, its
 * open panel, the event on show. The reader is made anew at each reading, on the files the editor holds (see OpenFiles), and goes when the
 * editor comes back. Which reader is the file's own: `<rr0-case>` for a case, `<rr0-sighting>` for a recording alone; both come in a bundle
 * of their own, fetched the first time something is read.
 */
export class ReadEditSwitch {

  private reader?: HTMLElement

  /** @param changed What the page does when it switches: its address, its title. */
  constructor(private readonly editor: SwitchedEditor, private readonly changed: (mode: ReadEditMode) => void = () => {}) {
    // Set only when missing: the editor makes its switch when the attribute comes, and would be asked to make it a second time.
    if (!editor.hasAttribute(IN_PLACE_ATTRIBUTE)) editor.setAttribute(IN_PLACE_ATTRIBUTE, "")
    editor.addEventListener(READ_EVENT, event => {
      event.preventDefault()
      void this.read((event as CustomEvent<ReadEditDetail>).detail)
    })
  }

  /** Whether the reader is the one on show. */
  get reading(): boolean {
    return this.reader !== undefined
  }

  private async read({ src, track }: ReadEditDetail): Promise<void> {
    const [{ register: registerCase, CASE_ELEMENT_NAME, OPEN_EVENTS_ATTRIBUTE }, { registerSighting, SIGHTING_ELEMENT_NAME }] = await Promise.all([
      import("./CaseElement.js"), import("./SightingElement.js")
    ])
    registerSighting()
    registerCase()
    const isCase = CaseFile.isCase(OpenFiles.read(src))
    const reader = document.createElement(isCase ? CASE_ELEMENT_NAME : SIGHTING_ELEMENT_NAME)
    reader.setAttribute(IN_PLACE_ATTRIBUTE, "")
    // The case opens on the event being edited, named by its file (see OPEN_EVENTS_ATTRIBUTE).
    if (isCase && track) reader.setAttribute(OPEN_EVENTS_ATTRIBUTE, ReadEditSwitch.fileKey(track))
    reader.setAttribute("src", src)
    reader.addEventListener(EDIT_EVENT, event => {
      event.preventDefault()
      void this.edit((event as CustomEvent<ReadEditDetail>).detail)
    })
    this.reader?.remove()
    this.editor.after(reader)
    this.editor.hidden = true
    this.reader = reader
    this.changed({ mode: "read", src, ...(track ? { track } : {}) })
  }

  private async edit({ track }: ReadEditDetail): Promise<void> {
    this.reader?.remove()
    this.reader = undefined
    OpenFiles.clear()
    this.editor.hidden = false
    this.changed({ mode: "edit" })
    if (track) await this.editor.openTrack(track)
  }

  /** How a case names one of its events by its file: its name without `.json` (see OPEN_EVENTS_ATTRIBUTE). */
  private static fileKey(url: string): string {
    return new URL(url, location.href).pathname.split("/").pop()!.replace(/\.json$/i, "")
  }
}
