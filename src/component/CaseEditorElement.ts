import { CaseFile } from "../engine/persistence/caseJson.js"
import type { SightingRecordingJson } from "../engine/persistence/sightingJson.js"
import { SightingFetch } from "../engine/net/SightingFetch.js"
import { SaidTexts } from "../engine/model/SaidText.js"
import { HostLocale, selectLocale } from "../i18n/locale.js"
import { CaseSession } from "./CaseSession.js"
import type { CaseTrack } from "./CaseSession.js"
import { register as registerSightingEditor } from "./SightingEditorElement.js"
import type { SightingEditorElement } from "./SightingEditorElement.js"
import type { CaseEditorMessages } from "./messages/CaseEditorMessages.js"
import { caseEditorMessages_en } from "./messages/CaseEditorMessages_en.js"
import { loadCaseEditorMessages, UFO_SUPPORTED_LANGUAGES } from "./messages/index.js"
import type { UfoLanguage } from "./messages/index.js"

export const CASE_EDITOR_ELEMENT_NAME = "rr0-case-editor"

const TEMPLATE = `
<style>
  :host { display: block; }
  [hidden] { display: none !important; }
  /* The case, above: what it is, then its observations and what is done with them. */
  /* One container for the case, with its observation inside as a container of its own. */
  .case.in-case { border: 1px solid rgba(128, 128, 128, .45); border-radius: 8px; padding: .6em .9em .8em; }
  .case-panel { margin-bottom: .6em; }
  .case-panel h2 { margin: 0 0 .4em; font-size: 1.05em; }
  .case-panel h3 { margin: .6em 0 .3em; font-size: .95em; }
  .row { display: flex; align-items: center; gap: .5em; flex-wrap: wrap; margin-bottom: .5em; }
  .row label { display: flex; align-items: center; gap: .4em; }
  .row.recordings label { flex: 1 1 14em; min-width: 0; }
  .row.recordings select { flex: 1 1 auto; min-width: 0; max-width: 100%; text-overflow: ellipsis; }
  .row button { white-space: nowrap; }
  .icon-btn { width: 1.8em; height: 1.8em; padding: 0; line-height: 1; cursor: pointer; }
  /* The observation being edited, inside: a frame of its own once there is a case around it. */
  .recording.in-case { border: 1px solid rgba(128, 128, 128, .45); border-radius: 8px; padding: .5em .7em .7em; }
  .recording .heading { margin: 0 0 .5em; font-size: .9em; opacity: .8; }
  dialog { max-width: min(30em, 92vw); }
  dialog label { display: flex; align-items: center; gap: .5em; margin: .4em 0; }
  dialog label > span { flex: 0 0 9em; }
  dialog input[type="text"], dialog input[type="date"], dialog input[type="url"], dialog select { flex: 1 1 auto; min-width: 0; }
  dialog .actions { display: flex; gap: .5em; margin-top: .6em; }
  #dialog-error { color: #c00; }
</style>
<div id="case" class="case">
<section id="case-panel" class="case-panel" aria-labelledby="case-heading" hidden>
  <h2 id="case-heading">Case</h2>
  <div class="row fields">
    <label><span id="label-case-id">ID</span> <input id="case-id" type="text" size="18"/></label>
    <label><span id="label-case-title">Title</span> <input id="case-title" type="text" size="24"/></label>
    <label><span id="label-case-time">When</span> <input id="case-time" type="text" size="16" placeholder="1950-05-11 19:45"/></label>
  </div>
  <h3 id="recordings-heading">Observations</h3>
  <div class="row recordings">
    <label><span id="label-recording">Recording</span> <select id="track"></select></label>
    <button id="interpret" type="button">Interpret…</button>
    <button id="add" type="button">Add an observation…</button>
    <button id="delete" type="button" class="icon-btn">🗑</button>
    <button id="export" type="button">Export the case</button>
  </div>
</section>
<section id="recording" class="recording">
  <p id="recording-heading" class="heading" hidden></p>
  <rr0-sighting-editor id="editor"></rr0-sighting-editor>
</section>
</div>
<dialog id="dialog">
  <form method="dialog" id="form">
    <h3 id="dialog-title"></h3>
    <p id="dialog-message" hidden></p>
    <p id="dialog-error" role="alert" hidden></p>
    <div id="fields-interpret">
      <label><span id="label-title">Title</span> <input id="title" type="text"/></label>
      <label><span id="label-author">Author</span> <input id="author" type="text"/></label>
      <label><span id="label-date">Date</span> <input id="date" type="date"/></label>
      <label><span id="label-of">Interprets</span> <select id="of"></select></label>
    </div>
    <div id="fields-add">
      <label><span id="label-source">Source</span> <select id="source">
        <option value="blank"></option><option value="file"></option><option value="url"></option>
      </select></label>
      <label><span id="label-observer">Observer</span> <input id="observer" type="text"/></label>
      <label><span id="label-observed">Observed on</span> <input id="observed" type="date"/></label>
      <label id="row-file"><span id="label-file">File</span> <input id="file" type="file" accept="application/json,.json"/></label>
      <label id="row-url"><span id="label-url">Address</span> <input id="url" type="url" placeholder="https://…"/></label>
    </div>
    <div class="actions">
      <button id="ok" type="submit" value="ok">OK</button>
      <button id="cancel" type="button">Cancel</button>
    </div>
  </form>
</dialog>
`

type DialogMode = "interpret" | "add" | "delete"

/**
 * Edits a case: the recordings its `case.json` lists, the accounts of the observers and the readings
 * of them, one on show at a time in an `<rr0-sighting-editor>` that it holds and that knows nothing
 * of the case. It gives that editor one recording at a time and takes it back when another is
 * chosen, keeps what was changed (see CaseSession), and puts on the editor's own render line the
 * picker and what is done with a recording: interpret an account (a reading is another observation,
 * see InterpretationEventJson), add an account — blank, from a file or from an address — and
 * delete one, which it refuses while a reading still interprets it. Exporting the case and what
 * changed as a zip stands in the editor's file group.
 *
 * `src` is passed to the editor, which fetches it: a `case.json` is handed back here (its
 * `caseloaded` event), a plain recording stays the editor's own and this element shows nothing more
 * than the editor. `track` names the recording a case opens on.
 */
export class CaseEditorElement extends HTMLElement {
  private readonly shadow = this.attachShadow({ mode: "open" })
  private readonly editor: SightingEditorElement
  private session?: CaseSession
  private current?: CaseTrack
  private messages: CaseEditorMessages = caseEditorMessages_en
  private said = new SaidTexts(["en"])
  private localeToken = 0
  private dialogMode: DialogMode = "interpret"

  constructor() {
    super()
    registerSightingEditor()
    this.shadow.innerHTML = TEMPLATE
    this.editor = this.shadow.getElementById("editor") as SightingEditorElement
    this.editor.addEventListener("caseloaded", event => {
      event.preventDefault()
      const { json, url } = (event as CustomEvent<{ json: unknown, url?: string }>).detail
      void this.openCase(json as Parameters<typeof CaseFile.sightingUrls>[0], url ?? location.href)
    })
    // A recording loaded into the editor by its own fields is not the case's any more.
    this.editor.addEventListener("recordingloaded", () => this.closeCase())
    for (const [id, field] of [["case-id", "id"], ["case-title", "title"], ["case-time", "time"]] as const) {
      this.input(id).addEventListener("input", () => this.writeCaseField(field, this.input(id).value))
    }
    this.byId("track").addEventListener("change", () => {
      const track = this.session?.tracks[Number((this.byId("track") as HTMLSelectElement).value)]
      if (track) void this.showTrack(track)
    })
    this.byId("interpret").addEventListener("click", () => this.askInterpret())
    this.byId("add").addEventListener("click", () => this.askAdd())
    this.byId("delete").addEventListener("click", () => this.askDelete())
    this.byId("export").addEventListener("click", () => void this.exportCase())
    this.byId("source").addEventListener("change", () => this.syncSourceFields())
    this.byId("cancel").addEventListener("click", () => this.closeDialog())
    this.byId("form").addEventListener("submit", event => {
      event.preventDefault()
      void this.submitDialog()
    })
  }

  static get observedAttributes(): string[] {
    return ["src"]
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null): void {
    if (name === "src" && value) this.editor.setAttribute("src", value)
  }

  connectedCallback(): void {
    const src = this.getAttribute("src")
    if (src && this.editor.getAttribute("src") !== src) this.editor.setAttribute("src", src)
    void this.loadLocale()
  }

  /** The recording on show, whichever it is. */
  get sightingData(): SightingRecordingJson {
    return this.editor.sightingData
  }

  set sightingData(json: SightingRecordingJson) {
    this.closeCase()
    this.editor.sightingData = json
  }

  /** The editor that holds the recording on show, for whoever needs more of it than this element offers. */
  get sightingEditor(): SightingEditorElement {
    return this.editor
  }

  /** The case being edited, if one is open. */
  get caseSession(): CaseSession | undefined {
    return this.session
  }

  private byId(id: string): HTMLElement {
    return this.shadow.getElementById(id)!
  }

  private async loadLocale(): Promise<void> {
    const token = ++this.localeToken
    const preferences = HostLocale.preferencesFor(this)
    const language = selectLocale(preferences, UFO_SUPPORTED_LANGUAGES) as UfoLanguage
    const messages = language === "en" ? caseEditorMessages_en : await loadCaseEditorMessages(language)
    if (token !== this.localeToken) return
    this.said = new SaidTexts(preferences)
    this.messages = messages
    this.applyMessages()
    this.refreshRow()
  }

  private applyMessages(): void {
    const m = this.messages
    const text = (id: string, value: string): void => { this.byId(id).textContent = value }
    text("case-heading", m.caseHeading)
    text("label-case-id", m.caseId)
    text("label-case-title", m.caseTitle)
    text("label-case-time", m.caseTime)
    text("recordings-heading", m.recordingsHeading)
    text("label-recording", m.recording)
    text("interpret", m.interpret)
    text("add", m.addObservation)
    text("export", m.export)
    text("label-title", m.titleField)
    text("label-author", m.authorField)
    text("label-date", m.dateField)
    text("label-of", m.ofField)
    text("label-source", m.sourceField)
    text("label-observer", m.observerField)
    text("label-observed", m.observedField)
    text("label-file", m.fileField)
    text("label-url", m.urlField)
    text("ok", m.ok)
    text("cancel", m.cancel)
    const source = this.byId("source") as HTMLSelectElement
    ;[m.sourceBlank, m.sourceFile, m.sourceUrl].forEach((label, index) => { source.options[index].textContent = label })
    this.byId("interpret").title = m.interpretHint
    this.byId("add").title = m.addObservationHint
    this.byId("delete").title = m.deleteRecording
    this.byId("delete").setAttribute("aria-label", m.deleteRecording)
  }

  // -- The case ------------------------------------------------------------------------------------

  /**
   * Opens a case: the recordings it lists are the tracks, one on show at a time. Opens on the one the
   * `track` attribute names, else the first account.
   */
  private async openCase(json: Parameters<typeof CaseFile.sightingUrls>[0], url: string): Promise<void> {
    const session = new CaseSession(json, url)
    if (session.tracks.length === 0) throw new Error("A case with no recording has nothing to edit")
    this.session = session
    this.current = undefined
    const wanted = this.getAttribute("track")
    // Relative to the case, as a recording of it is.
    const absolute = wanted ? new URL(wanted, url).href : undefined
    const start = session.tracks.find(track => track.url === absolute) ?? session.tracks.find(track => track.kind === "observer") ?? session.tracks[0]
    await this.showTrack(start)
  }

  private closeCase(): void {
    if (!this.session) return
    this.session = undefined
    this.current = undefined
    this.editor.reading = false
    this.editor.accountShapeIds = undefined
    this.refreshRow()
  }

  /** Keeps what the editor holds in the track on show, to be put back when it is shown again. */
  private commit(): void {
    if (this.session && this.current) this.session.keep(this.current, this.editor.sightingData)
  }

  private async loadTrack(track: CaseTrack): Promise<void> {
    if (track.recording) return
    track.recording = (await SightingFetch.json(track.url)) as SightingRecordingJson
    track.loaded = undefined
  }

  /** Shows a recording of the case in the editor, the one on show having been kept first. */
  private async showTrack(track: CaseTrack): Promise<void> {
    const session = this.session
    if (!session) return
    this.commit()
    try {
      const fresh = !track.recording
      await this.loadTrack(track)
      // A reading's `explains` are the shapes of the account it reads: that one is loaded too.
      const account = session.accountOf(track)
      if (account) await this.loadTrack(account)
      this.current = track
      this.editor.documentUrl = track.url
      this.editor.reading = track.kind === "reading"
      this.editor.accountShapeIds = track.kind === "reading" && account?.recording ? CaseEditorElement.shapesOf(account.recording) : undefined
      this.editor.sightingData = structuredClone(track.recording!)
      // What the editor holds right after loading is what "changed" is measured from: it does not
      // write a recording back byte for byte, and a track only looked at is not one to write.
      if (fresh) session.keep(track, this.editor.sightingData, true)
      if (account && account.loaded === undefined) session.keep(account, account.recording!, true)
    } catch {
      this.showError(this.messages.loadFailed)
    }
    this.refreshRow()
  }

  private static shapesOf(recording: SightingRecordingJson): string[] {
    const ids = new Set<string>()
    for (const keyframe of recording.timeline?.keyframes ?? []) for (const entry of keyframe.shapes ?? []) ids.add(entry.sourceId)
    return [...ids]
  }

  private labelOf(track: CaseTrack, index: number): string {
    const said = this.said.read(track.event.title as never) ?? this.said.read(track.recording?.interpretation?.title as never)
    if (said) return said
    if (track.kind === "observer") return this.said.read(track.recording?.observer?.title as never) ?? track.event.url ?? ""
    const number = this.session!.tracks.filter(other => other.kind === "reading").indexOf(track) + 1
    return this.messages.untitledReading.replace("{n}", String(number || index + 1))
  }

  /** The case's own fields, written back as typed: a case holds them as plain text, and an empty one is not kept. */
  private writeCaseField(field: "id" | "title" | "time", value: string): void {
    const json = this.session?.json as Record<string, unknown> | undefined
    if (!json) return
    if (value.trim() === "") delete json[field]
    else json[field] = value
  }

  /** The case on top, when there is one, and the picker of its recordings with what can be done with the one on show. */
  private refreshRow(): void {
    const session = this.session
    this.byId("case-panel").hidden = session === undefined
    this.byId("case").classList.toggle("in-case", session !== undefined)
    this.byId("recording").classList.toggle("in-case", session !== undefined)
    this.byId("recording-heading").hidden = session === undefined
    if (!session) return
    const active = this.shadow.activeElement
    for (const [id, field] of [["case-id", "id"], ["case-title", "title"], ["case-time", "time"]] as const) {
      const input = this.input(id)
      if (input !== active) input.value = String((session.json as Record<string, unknown>)[field] ?? "")
    }
    const select = this.byId("track") as HTMLSelectElement
    select.replaceChildren(...session.tracks.map((track, index) => new Option(this.labelOf(track, index), String(index))))
    select.value = String(Math.max(0, this.current ? session.tracks.indexOf(this.current) : 0))
    // Only an account is interpreted; any recording can leave the case, while the case keeps one.
    this.byId("interpret").hidden = this.current?.kind !== "observer"
    this.byId("delete").hidden = session.tracks.length <= 1
    const kind = this.current?.kind === "reading" ? this.messages.kindReading : this.messages.kindObservation
    const label = this.current ? this.labelOf(this.current, session.tracks.indexOf(this.current)) : ""
    this.byId("recording-heading").textContent = `${this.messages.editing} ${kind}${label ? ` — ${label}` : ""}`
  }

  // -- The dialog ----------------------------------------------------------------------------------

  private get dialog(): HTMLDialogElement {
    return this.byId("dialog") as HTMLDialogElement
  }

  private openDialog(mode: DialogMode, heading: string, message?: string): void {
    this.dialogMode = mode
    this.byId("dialog-title").textContent = heading
    const note = this.byId("dialog-message")
    note.textContent = message ?? ""
    note.hidden = message === undefined
    this.showError(undefined)
    this.byId("fields-interpret").hidden = mode !== "interpret"
    this.byId("fields-add").hidden = mode !== "add"
    this.byId("ok").hidden = false
    if (typeof this.dialog.showModal === "function") this.dialog.showModal()
    else this.dialog.setAttribute("open", "")
  }

  private closeDialog(): void {
    if (typeof this.dialog.close === "function") this.dialog.close()
    else this.dialog.removeAttribute("open")
  }

  private showError(message: string | undefined): void {
    const error = this.byId("dialog-error")
    error.textContent = message ?? ""
    error.hidden = message === undefined
  }

  private input(id: string): HTMLInputElement {
    return this.byId(id) as HTMLInputElement
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10)
  }

  private askInterpret(): void {
    const session = this.session
    if (!session || this.current?.kind !== "observer") return
    this.openDialog("interpret", this.messages.interpretTitle)
    this.input("title").value = ""
    this.input("author").value = ""
    this.input("date").value = this.today()
    const of = this.byId("of") as HTMLSelectElement
    of.replaceChildren(...session.tracks.filter(track => track.kind === "observer")
      .map(track => new Option(this.labelOf(track, session.tracks.indexOf(track)), String(session.tracks.indexOf(track)))))
    of.value = String(session.tracks.indexOf(this.current))
    this.input("title").focus()
  }

  private askAdd(): void {
    if (!this.session) return
    this.openDialog("add", this.messages.addTitle)
    ;(this.byId("source") as HTMLSelectElement).value = "blank"
    this.input("observer").value = ""
    this.input("observed").value = ""
    this.input("file").value = ""
    this.input("url").value = ""
    this.syncSourceFields()
  }

  private syncSourceFields(): void {
    const source = (this.byId("source") as HTMLSelectElement).value
    this.byId("row-file").hidden = source !== "file"
    this.byId("row-url").hidden = source !== "url"
  }

  private askDelete(): void {
    const session = this.session
    const track = this.current
    if (!session || !track) return
    if (track.kind === "observer") {
      const readings = session.readingsOf(track).length
      if (readings > 0) {
        this.openDialog("delete", this.messages.deleteRecording, this.messages.deleteRefused.replace("{n}", String(readings)))
        this.byId("ok").hidden = true
        return
      }
    }
    this.openDialog("delete", this.messages.deleteRecording, track.kind === "reading" ? this.messages.deleteReadingQuestion : this.messages.deleteObservationQuestion)
  }

  private async submitDialog(): Promise<void> {
    switch (this.dialogMode) {
      case "interpret":
        this.closeDialog()
        this.addReading()
        return
      case "delete":
        this.closeDialog()
        this.deleteCurrent()
        return
      case "add":
        if (await this.addObservation()) this.closeDialog()
    }
  }

  // -- What is done to the case --------------------------------------------------------------------

  /** Adds a reading of the account chosen in the dialog, and opens it. */
  private addReading(): void {
    const session = this.session
    if (!session) return
    this.commit()
    const account = session.tracks[Number((this.byId("of") as HTMLSelectElement).value)]
    if (account?.kind !== "observer" || !account.recording) return
    const title = this.input("title").value.trim()
    const author = this.input("author").value.trim()
    const reading = session.addReading(account, this.input("date").value || this.today(),
      title !== "" ? title : undefined, author !== "" ? [{ title: author }] : undefined)
    void this.showTrack(reading)
  }

  /** Adds an account of another observer: blank, or read from a file or an address. Says what went wrong in the dialog. */
  private async addObservation(): Promise<boolean> {
    const session = this.session
    if (!session) return false
    const source = (this.byId("source") as HTMLSelectElement).value
    const observer = this.input("observer").value.trim()
    const observed = this.input("observed").value.trim()
    let recording: SightingRecordingJson
    try {
      if (source === "blank") {
        const stem = (observer || "observation").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "observation"
        recording = {
          version: 1,
          id: `${observed ? `${observed}-` : ""}${stem}`,
          ...(observer ? { observer: { title: observer } } : {}),
          ...(observed ? { time: observed } : {}),
          timeline: { keyframes: [], order: [], groups: [] }
        } as unknown as SightingRecordingJson
      } else {
        const loaded = source === "file" ? await this.readFile() : await SightingFetch.json(this.input("url").value.trim())
        if (CaseFile.isCase(loaded)) {
          this.showError(this.messages.isACase)
          return false
        }
        recording = loaded as SightingRecordingJson
        if (observer && !recording.observer?.title) recording = { ...recording, observer: { ...recording.observer, title: observer } }
      }
    } catch {
      this.showError(this.messages.loadFailed)
      return false
    }
    this.commit()
    const title = observer !== "" ? observer : this.said.read(recording.observer?.title as never)
    const track = session.addObservation(recording, observed !== "" ? observed : undefined, title)
    void this.showTrack(track)
    return true
  }

  private async readFile(): Promise<unknown> {
    const file = this.input("file").files?.[0]
    if (!file) throw new Error("No file")
    const text = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(reader.error)
      reader.readAsText(file)
    })
    return JSON.parse(text)
  }

  /** Deletes the recording on show — a reading, or an account no reading interprets — and shows another. */
  private deleteCurrent(): void {
    const session = this.session
    const track = this.current
    if (!session || !track) return
    const next = track.kind === "reading"
      ? session.accountOf(track) ?? session.tracks.find(other => other.kind === "observer")
      : session.tracks.find(other => other !== track)
    const removed = track.kind === "reading" ? session.deleteReading(track) : session.deleteObservation(track).deleted
    if (!removed) return
    this.current = undefined
    if (next) void this.showTrack(next)
  }

  /** The case, and every recording of it added or changed, as one zip laid out as the case is. */
  private async exportCase(): Promise<void> {
    const session = this.session
    if (!session) return
    this.commit()
    const { zipSync, strToU8 } = await import("fflate")
    const archive: Record<string, Uint8Array> = {}
    for (const file of session.files()) archive[file.path] = strToU8(file.content)
    const blob = new Blob([zipSync(archive) as BlobPart], { type: "application/zip" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${session.json.id ?? "case"}.zip`
    link.click()
    URL.revokeObjectURL(url)
  }
}

export function register(): void {
  registerSightingEditor()
  if (!customElements.get(CASE_EDITOR_ELEMENT_NAME)) customElements.define(CASE_EDITOR_ELEMENT_NAME, CaseEditorElement)
}
