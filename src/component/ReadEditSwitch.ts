import { CaseFile } from "../engine/persistence/caseJson.js"
import { OpenFiles } from "../engine/net/OpenFiles.js"
import { SightingFetch } from "../engine/net/SightingFetch.js"

import { EDIT_EVENT, IN_PLACE_ATTRIBUTE, READ_EVENT, type ReadEditDetail, type ReadEditMode } from "./ReadEditEvents.js"

/** The editor's side of it: what the switch needs of `<rr0-case-editor>`. */
export interface SwitchedEditor extends HTMLElement {
  /** Opens the recording of the open case at `url`, the editor being shown again on it. */
  openTrack(url: string): Promise<void>
  /** The switch the editor is in, set before IN_PLACE_ATTRIBUTE so that it does not make one of its own. */
  switcher?: ReadEditSwitch
}

/**
 * Switches, in place on a page, between an editor and a reader of the same file, each loaded the first time it is asked for.
 *
 * Two ways in, one switch. A page that opens on the editor (`<rr0-case-editor in-place>`) gives it: the reader comes the first time
 * something is read. A page that may open on the reader (`<rr0-ufoathome>`) gives none: the editor comes the first time something is
 * edited, and a page that is only read never fetches it. Each is fetched by `import()`, so that a bundle holds the other as a chunk of
 * its own (see UfoAtHomeElement).
 *
 * The editor, once there, stays, hidden while the reader is on show, so that coming back to it finds it as it was left: its history, its
 * open panel, the event on show. The reader is made anew at each reading, on the files the editor holds (see OpenFiles), and goes when the
 * editor comes back. Which reader is the file's own: `<rr0-case>` for a case, `<rr0-sighting>` for a recording alone.
 */
export class ReadEditSwitch {

  private reader?: HTMLElement
  private editor?: SwitchedEditor

  /**
   * @param place Puts a reader or an editor made here where the page wants it.
   * @param editor The editor the page opened on, if it opened on one.
   * @param changed What the page does when it switches: its address, its title.
   */
  constructor(private readonly place: (element: HTMLElement) => void, editor?: SwitchedEditor,
              private readonly changed: (mode: ReadEditMode) => void = () => {}) {
    if (editor) this.adopt(editor)
  }

  /** Whether the reader is the one on show. */
  get reading(): boolean {
    return this.reader !== undefined
  }

  /** Whether the editor was ever asked for: until then, it is not even loaded. */
  get editorLoaded(): boolean {
    return this.editor !== undefined
  }

  /** Makes `editor` the one this switches with, and it the switch of the editor. */
  private adopt(editor: SwitchedEditor): void {
    this.editor = editor
    editor.switcher = this
    // Set only when missing, and after the switcher: the editor makes a switch of its own when the attribute comes without one.
    if (!editor.hasAttribute(IN_PLACE_ATTRIBUTE)) editor.setAttribute(IN_PLACE_ATTRIBUTE, "")
    editor.addEventListener(READ_EVENT, event => {
      event.preventDefault()
      void this.read((event as CustomEvent<ReadEditDetail>).detail)
    })
  }

  /**
   * Shows the reader of the file at `src`, opening a case on `track`: the case's reader for a case, the observation's for a recording, told
   * apart by what the file holds.
   */
  async read({ src, track }: ReadEditDetail): Promise<void> {
    const [{ register: registerCase, CASE_ELEMENT_NAME, OPEN_EVENTS_ATTRIBUTE }, { registerSighting, SIGHTING_ELEMENT_NAME }] = await Promise.all([
      import("./CaseElement.js"), import("./SightingElement.js")
    ])
    registerSighting()
    registerCase()
    const isCase = CaseFile.isCase(OpenFiles.read(src) ?? await SightingFetch.json(src))
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
    this.place(reader)
    if (this.editor) this.editor.hidden = true
    this.reader = reader
    this.changed({ mode: "read", src, ...(track ? { track } : {}) })
  }

  /**
   * Shows the editor: the one there was, as it was left, on the recording asked for; else one made now on `src` (none for a blank one),
   * loaded the first time it is asked for.
   */
  async edit(detail?: Partial<ReadEditDetail>): Promise<void> {
    const editor = this.editor
    if (editor) {
      this.dropReader()
      // What the editor holds is what was read: what was handed over is not needed any more.
      OpenFiles.clear()
      editor.hidden = false
      this.changed({ mode: "edit" })
      if (detail?.track) await editor.openTrack(detail.track)
      return
    }
    const { register, CASE_EDITOR_ELEMENT_NAME } = await import("./CaseEditorElement.js")
    register()
    const made = document.createElement(CASE_EDITOR_ELEMENT_NAME) as SwitchedEditor
    this.adopt(made)
    // Read by the same paths as the reader read it: what was handed over stays held until the next reading replaces it (see OpenFiles).
    if (detail?.track) made.setAttribute("track", detail.track)
    if (detail?.src) made.setAttribute("src", detail.src)
    this.dropReader()
    this.place(made)
    this.changed({ mode: "edit" })
  }

  private dropReader(): void {
    this.reader?.remove()
    this.reader = undefined
  }

  /** How a case names one of its events by its file: its name without `.json` (see OPEN_EVENTS_ATTRIBUTE). */
  private static fileKey(url: string): string {
    return new URL(url, location.href).pathname.split("/").pop()!.replace(/\.json$/i, "")
  }
}
