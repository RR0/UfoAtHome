export const INPUT_FILE_ELEMENT_NAME = "rr0-input-file"

/** What the element says: which of the two ways a file is given it is in, and how to switch. */
export interface InputFileMessages {
  /** The way of a file on the reader's own disk ("from your disk"). */
  inputFileFromFile: string
  /** The way of a file at an address ("from an address"). */
  inputFileFromUrl: string
  /** The tooltip of the switch: that it switches. */
  inputFileModeHint: string
  /** The button that reads the address typed. */
  inputFileLoad: string
}

export const inputFileMessages_en: InputFileMessages = {
  inputFileFromFile: "from your disk",
  inputFileFromUrl: "from an address",
  inputFileModeHint: "Click to give it the other way: a file of yours, or an address",
  inputFileLoad: "Load"
}

/** What a pick gives: a file of the reader's, or an address. */
export type InputFilePick = { file: File; url?: undefined } | { url: string; file?: undefined }

const STYLE = `
rr0-input-file { display: inline-flex; align-items: center; gap: .3em; }
/* As the date's own switch (see DateInputElement): it reads as part of the label, before the field. */
rr0-input-file .input-file-mode { order: -1; font: inherit; color: inherit; background: none; border: 0; padding: 0; margin: 0; cursor: pointer; text-decoration: underline; text-underline-offset: .15em; }
rr0-input-file .input-file-mode:hover { text-decoration-thickness: 2px; }
rr0-input-file .input-file-mode:focus-visible { outline: 2px solid #4af; outline-offset: 2px; border-radius: 2px; }
rr0-input-file input[type="url"] { width: 18em; max-width: 60vw; }
rr0-input-file [hidden] { display: none !important; }
`

/**
 * A file, given either way it can be: one of the reader's own (a picker) or one at an address (a field and Load), with a switch between
 * the two that reads as part of the label, as a date says whether it is precise (see DateInputElement).
 *
 * `<rr0-input-file name="import" accept=".json">` makes, in its own light DOM so that the page's styles reach them, a file input
 * (`import-file`), an address field (`import-url`) and its button (`import-url-button`): the ids derive from `name`. `mode="url"` starts on
 * the address, `no-button` reads the address as it is committed (Enter, or leaving the field) instead of on a button, and `placeholder` is the
 * address field's. `keep-file` keeps the file picked shown (a form that reads it when submitted, see `file`) rather than emptying the picker.
 *
 * It says what was picked by a `filepick` event whose `detail` is an InputFilePick. The picker is emptied once it has said it, so that the
 * same file picked again is said again. `url` sets the address shown, telling nobody; `file` is the file the picker holds, if it keeps it.
 */
export class InputFileElement extends HTMLElement {
  private fileInput?: HTMLInputElement
  private urlInput?: HTMLInputElement
  private loadButton?: HTMLButtonElement
  private modeButton?: HTMLButtonElement
  private wording: InputFileMessages = inputFileMessages_en
  private shownMode: "file" | "url" = "file"

  /** Makes the controls, once: an element in a template is not upgraded until it is in a page, and its host has to reach them before that. */
  build(): void {
    if (this.fileInput) return
    const name = this.getAttribute("name")
    const doc = this.ownerDocument
    const style = doc.createElement("style")
    style.textContent = STYLE
    const file = this.fileInput = doc.createElement("input")
    file.type = "file"
    const accept = this.getAttribute("accept")
    if (accept) file.accept = accept
    const url = this.urlInput = doc.createElement("input")
    url.type = "url"
    url.placeholder = this.getAttribute("placeholder") ?? "https://…"
    const load = this.loadButton = doc.createElement("button")
    load.type = "button"
    load.hidden = this.hasAttribute("no-button")
    const mode = this.modeButton = doc.createElement("button")
    mode.type = "button"
    mode.className = "input-file-mode"
    if (name) {
      file.id = `${name}-file`
      url.id = `${name}-url`
      load.id = `${name}-url-button`
      mode.id = `${name}-mode`
    }
    this.append(style, file, url, load, mode)
    file.addEventListener("change", () => {
      const picked = file.files?.[0]
      if (!picked) return
      this.pick({ file: picked })
      if (!this.hasAttribute("keep-file")) file.value = ""
    })
    load.addEventListener("click", () => this.commitUrl())
    url.addEventListener("keydown", event => {
      if (event.key !== "Enter") return
      event.preventDefault()
      this.commitUrl()
    })
    if (this.hasAttribute("no-button")) url.addEventListener("change", () => this.commitUrl())
    mode.addEventListener("click", () => {
      this.mode = this.shownMode === "file" ? "url" : "file"
      ;(this.shownMode === "file" ? file : url).focus()
    })
    this.shownMode = this.getAttribute("mode") === "url" ? "url" : "file"
    this.render()
  }

  connectedCallback(): void {
    this.build()
  }

  private commitUrl(): void {
    const url = this.urlInput!.value.trim()
    if (url) this.pick({ url })
  }

  private pick(pick: InputFilePick): void {
    this.dispatchEvent(new CustomEvent<InputFilePick>("filepick", { detail: pick, bubbles: true, composed: true }))
  }

  private render(): void {
    const byFile = this.shownMode === "file"
    this.fileInput!.hidden = !byFile
    this.urlInput!.hidden = byFile
    this.loadButton!.hidden = byFile || this.hasAttribute("no-button")
    this.modeButton!.textContent = byFile ? this.wording.inputFileFromFile : this.wording.inputFileFromUrl
    this.modeButton!.title = this.wording.inputFileModeHint
    this.loadButton!.textContent = this.wording.inputFileLoad
  }

  /** Which of the two ways is shown. Changing it picks nothing. */
  get mode(): "file" | "url" {
    return this.shownMode
  }

  set mode(mode: "file" | "url") {
    this.build()
    this.shownMode = mode
    this.render()
  }

  /** The address shown. Setting one shows the address way; setting it picks nothing and tells nobody. */
  get url(): string {
    this.build()
    return this.urlInput!.value.trim()
  }

  set url(url: string) {
    this.build()
    this.urlInput!.value = url
    if (url) this.mode = "url"
  }

  /** The file the picker holds: only one picked with `keep-file`, the picker being emptied otherwise. */
  get file(): File | undefined {
    this.build()
    return this.fileInput!.files?.[0] ?? undefined
  }

  /** What the element now gives, as a form reads it when submitted: the file held, or the address typed, by the way shown. */
  get value(): InputFilePick | undefined {
    if (this.mode === "file") {
      const file = this.file
      return file ? { file } : undefined
    }
    return this.url ? { url: this.url } : undefined
  }

  /** Empties both ways, telling nobody. */
  clear(): void {
    this.build()
    this.fileInput!.value = ""
    this.urlInput!.value = ""
  }

  get disabled(): boolean {
    return this.hasAttribute("disabled")
  }

  set disabled(disabled: boolean) {
    this.build()
    this.toggleAttribute("disabled", disabled)
    for (const control of [this.fileInput!, this.urlInput!, this.loadButton!, this.modeButton!]) control.disabled = disabled
  }

  /** Opens the reader's file picker, as a "+" that adds from a file does. */
  openPicker(): void {
    this.build()
    this.fileInput!.click()
  }

  /** Puts the caret in the field shown. */
  override focus(): void {
    this.build()
    ;(this.shownMode === "file" ? this.fileInput! : this.urlInput!).focus()
  }

  /** The two controls, for a host that needs the detail of them (a test, a label). */
  get controls(): { file: HTMLInputElement; url: HTMLInputElement; load: HTMLButtonElement; mode: HTMLButtonElement } {
    this.build()
    return { file: this.fileInput!, url: this.urlInput!, load: this.loadButton!, mode: this.modeButton! }
  }

  set messages(messages: InputFileMessages) {
    this.wording = messages
    if (this.fileInput) this.render()
  }

  /** The address field's placeholder. */
  set placeholder(placeholder: string) {
    this.build()
    this.urlInput!.placeholder = placeholder
  }

  /** Reads `file` as bytes: what a host does with most picks. */
  static async bytesOf(pick: InputFilePick, fetchImpl: typeof fetch = fetch.bind(globalThis)): Promise<Uint8Array> {
    if (pick.file) {
      return new Uint8Array(await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as ArrayBuffer)
        reader.onerror = () => reject(reader.error)
        reader.readAsArrayBuffer(pick.file!)
      }))
    }
    const response = await fetchImpl(pick.url)
    if (!response.ok) throw new Error(`${response.status} ${pick.url}`)
    return new Uint8Array(await response.arrayBuffer())
  }
}

export function register(): void {
  if (!customElements.get(INPUT_FILE_ELEMENT_NAME)) customElements.define(INPUT_FILE_ELEMENT_NAME, InputFileElement)
}
