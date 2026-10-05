import { CaseFile } from "../engine/persistence/caseJson.js"
import type { SightingRecordingJson } from "../engine/persistence/sightingJson.js"
import { SightingFetch } from "../engine/net/SightingFetch.js"
import { SaidTexts } from "../engine/model/SaidText.js"
import { HostLocale, selectLocale } from "../i18n/locale.js"
import { formatEdtfTime, parseEdtfTime } from "../engine/model/Sighting.js"
import { CaseSession } from "./CaseSession.js"
import { EdtfDateField } from "./EdtfDateField.js"
import { register as registerDateInput } from "./DateInputElement.js"
import type { DateInputElement } from "./DateInputElement.js"
import type { SightingTime } from "../engine/model/Sighting.js"
import { sightingEditorMessages_en } from "./messages/SightingEditorMessages_en.js"
import type { CaseTrack } from "./CaseSession.js"
import { register as registerSightingEditor } from "./SightingEditorElement.js"
import type { SightingEditorElement } from "./SightingEditorElement.js"
import type { CaseEditorMessages } from "./messages/CaseEditorMessages.js"
import { caseEditorMessages_en } from "./messages/CaseEditorMessages_en.js"
import { loadCaseEditorMessages, loadSightingEditorMessages, UFO_SUPPORTED_LANGUAGES } from "./messages/index.js"
import type { UfoLanguage } from "./messages/index.js"

export const CASE_EDITOR_ELEMENT_NAME = "rr0-case-editor"

const TEMPLATE = `
<style>
  :host { display: block; }
  [hidden] { display: none !important; }
  /* The case, above: what it is, then its observations and what is done with them. */
  /* The case is the container the element stands in (the page's own frame, when there is one): it draws none of its own, so that
     there is one container for the case and one inside it for the observation. */
  .case-panel { margin-bottom: .6em; }
  .case-panel h2 { margin: 0 0 .4em; font-size: 1.05em; }
  .case-panel h3 { margin: .6em 0 .3em; font-size: .95em; }
  .row { display: flex; align-items: center; gap: .5em; flex-wrap: wrap; margin-bottom: .5em; }
  .row label, .row .field { display: flex; align-items: center; gap: .4em; }
  rr0-date-input { display: inline-flex; align-items: center; gap: .3em; flex-wrap: wrap; }
  .row.recordings label { flex: 1 1 14em; min-width: 0; }
  .row.recordings select { flex: 1 1 auto; min-width: 0; max-width: 100%; text-overflow: ellipsis; }
  .row button { white-space: nowrap; }
  .make-case { margin: .5em 0 0; }
  button.link { border: 0; background: none; padding: 0; color: inherit; text-decoration: underline; cursor: pointer; font: inherit; }
  .icon-btn { width: 1.8em; height: 1.8em; padding: 0; line-height: 1; cursor: pointer; }
  /* The observation being edited, inside: a frame of its own once there is a case around it. */
  .recording.in-case { border: 1px solid rgba(128, 128, 128, .45); border-radius: 8px; padding: .5em .7em .7em; }
  dialog { max-width: min(30em, 92vw); }
  dialog label { display: flex; align-items: center; gap: .5em; margin: .4em 0; }
  dialog label > span { flex: 0 0 9em; }
  dialog label.check > span { flex: 1 1 auto; }
  .row.header { justify-content: space-between; }
  /* A dot after what it speaks of — the case's title, the recording's last tab. It takes its room whether it shows or not, so that
     it comes and goes without moving anything. */
  .title { display: flex; align-items: center; gap: .35em; }
  .dirty { color: #b45309; line-height: 1; cursor: help; align-self: center; margin-left: .3em; }
  .dirty[hidden] { display: inline !important; visibility: hidden; }
  .row.header h2 { margin: 0; }
  dialog input[type="text"], dialog input[type="date"], dialog input[type="url"], dialog select { flex: 1 1 auto; min-width: 0; }
  dialog .actions { display: flex; gap: .5em; margin-top: .6em; }
  #dialog-error { color: #c00; }
</style>
<div id="case" class="case">
<section id="case-panel" class="case-panel" aria-labelledby="case-heading" hidden>
  <div class="row header">
    <div class="title"><h2 id="case-heading">Case</h2><span id="dirty" class="dirty" role="status" title="Changes not saved" hidden>●</span></div>
    <button id="export" type="button">Save</button>
  </div>
  <div class="row fields">
    <label><span id="label-case-id">ID</span> <input id="case-id" type="text" size="18"/></label>
    <label><span id="label-case-title">Title</span> <input id="case-title" type="text" size="24"/></label>
    <div class="field"><span id="label-case-time">When</span> <rr0-date-input id="case-date" name="case-time" toggle></rr0-date-input></div>
  </div>
  <h3 id="recordings-heading">Observations</h3>
  <div class="row recordings">
    <label><span id="label-recording">Recording</span> <select id="track"></select></label>
    <button id="add" type="button" class="icon-btn">+</button>
    <button id="delete" type="button" class="icon-btn">🗑</button>
  </div>
</section>
<section id="recording" class="recording">
  <rr0-sighting-editor id="editor"><span id="recording-dirty" slot="tab-status" class="dirty" role="status" title="Changes not saved" hidden>●</span></rr0-sighting-editor>
</section>
<p id="make-case-row" class="make-case"><button id="make-case" type="button" class="link">Add to a case</button></p>
</div>
<dialog id="dialog">
  <form method="dialog" id="form">
    <h3 id="dialog-title"></h3>
    <p id="dialog-message" hidden></p>
    <p id="dialog-error" role="alert" hidden></p>
    <div id="fields-add">
      <label><span id="label-source">Source</span> <select id="source">
        <option value="blank"></option><option value="file"></option><option value="url"></option>
      </select></label>
      <label id="row-observer"><span id="label-observer">Observer</span> <input id="observer" type="text"/></label>
      <label id="row-title"><span id="label-title">Title</span> <input id="title" type="text"/></label>
      <label id="row-author"><span id="label-author">Author</span> <input id="author" type="text"/></label>
      <label><span id="label-date">Date</span> <input id="date" type="date"/></label>
      <label id="row-file"><span id="label-file">File</span> <input id="file" type="file" accept="application/json,.json"/></label>
      <label id="row-url"><span id="label-url">Address</span> <input id="url" type="url" placeholder="https://…"/></label>
      <label><span id="label-of">Interpretation of</span> <select id="of"></select></label>
    </div>
    <div id="fields-export">
      <label class="check"><input id="export-recordings" type="checkbox" checked/> <span id="label-export-recordings">Also export the observations</span></label>
    </div>
    <div class="actions">
      <button id="ok" type="submit" value="ok">OK</button>
      <button id="cancel" type="button">Cancel</button>
    </div>
  </form>
</dialog>
`

type DialogMode = "add" | "delete" | "export" | "discard"

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
  private dialogMode: DialogMode = "add"
  /** What loading waits for, while the author is asked about changes that would be lost. */
  private pendingLoad?: () => void
  private dirtyTimer?: number
  private caseDate!: DateInputElement
  /** The case the date field last opened its way in for: a mode is the author's once it is shown. */
  private dateModeFor?: CaseSession

  constructor() {
    super()
    registerSightingEditor()
    registerDateInput()
    this.shadow.innerHTML = TEMPLATE
    customElements.upgrade(this.shadow)
    ;(this.shadow.getElementById("case-date") as DateInputElement).build()
    this.editor = this.shadow.getElementById("editor") as SightingEditorElement
    this.editor.addEventListener("caseloaded", event => {
      event.preventDefault()
      const { json, url } = (event as CustomEvent<{ json: unknown, url?: string }>).detail
      void this.openCase(json as Parameters<typeof CaseFile.sightingUrls>[0], url ?? location.href)
    })
    // A recording loaded into the editor by its own fields is not the case's any more.
    this.editor.addEventListener("recordingloaded", () => this.closeCase())
    // The case keeps the watch over what would be lost by leaving, for the recordings it holds: the editor does not.
    this.editor.guardsLeaving = false
    // Loading a recording or a case into the editor replaces what is open: asked first when changes were not exported.
    this.editor.addEventListener("beforeload", event => {
      if (!this.dirty) return
      event.preventDefault()
      this.pendingLoad = (event as CustomEvent<{ proceed: () => void }>).detail.proceed
      this.openDialog("discard", this.messages.discardTitle, this.messages.discardQuestion)
    })
    for (const type of ["input", "change", "datechange", "click", "pointerup", "keyup"]) this.shadow.addEventListener(type, () => this.scheduleDirtyCheck(), true)
    for (const [id, field] of [["case-id", "id"], ["case-title", "title"]] as const) {
      this.input(id).addEventListener("input", () => this.writeCaseField(field, this.input(id).value))
    }
    // A case dates itself as a recording does — see DateInputElement — and writes the date as RR0 does.
    this.caseDate = this.byId("case-date") as DateInputElement
    this.caseDate.addEventListener("datechange", event => {
      const { time } = (event as CustomEvent<{ time: SightingTime | undefined }>).detail
      this.writeCaseField("time", time ? CaseEditorElement.rr0TimeOf(formatEdtfTime(time)) : "")
    })
    this.byId("track").addEventListener("change", () => {
      const track = this.session?.tracks[Number((this.byId("track") as HTMLSelectElement).value)]
      if (track) void this.showTrack(track)
    })
    this.byId("add").addEventListener("click", () => this.askAdd())
    this.byId("make-case").addEventListener("click", () => this.makeCase())
    this.byId("delete").addEventListener("click", () => this.askDelete())
    this.byId("export").addEventListener("click", () => this.askExport())
    this.byId("source").addEventListener("change", () => this.syncSourceFields())
    this.byId("of").addEventListener("change", () => this.syncSourceFields())
    this.byId("cancel").addEventListener("click", () => this.closeDialog())
    // Escape closes the dialog without going through the button.
    this.byId("dialog").addEventListener("close", () => { this.pendingLoad = undefined })
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

  private readonly warnBeforeLeaving = (event: BeforeUnloadEvent): void => {
    if (this.leaving || !this.dirty) return
    event.preventDefault()
    event.returnValue = ""
  }

  disconnectedCallback(): void {
    document.removeEventListener("click", this.askBeforeFollowing, true)
    window.removeEventListener("beforeunload", this.warnBeforeLeaving)
    window.clearTimeout(this.dirtyTimer)
  }

  /**
   * Whether anything would be lost by leaving: in a case, the case or any recording of it changed and not exported; and for a
   * recording alone, the recording. What the editor holds is read first, since the case only sees it when asked.
   */
  get dirty(): boolean {
    if (!this.session) return this.editor.dirty
    this.commit()
    return this.session.dirty
  }

  /** Shows whether there is something to lose, a moment after the author stops: a recording is large, and this reads all of it. */
  private scheduleDirtyCheck(): void {
    window.clearTimeout(this.dirtyTimer)
    this.dirtyTimer = window.setTimeout(() => this.refreshDirty(), 600)
  }

  /**
   * Shows what there is to lose, at the two levels it is lost at: the case (anything of it, or of any recording, not
   * exported) and the recording on show (changed since it was loaded, in a case, or since it was loaded or exported, alone).
   */
  private refreshDirty(): void {
    const session = this.session
    if (session) this.commit()
    this.byId("dirty").hidden = !(session && session.dirty)
    const recording = session ? (this.current !== undefined && session.changed(this.current)) : this.editor.dirty
    this.byId("recording-dirty").hidden = !recording
  }

  /** Set once the author agreed to leave, so that the page going away is not asked about a second time. */
  private leaving = false

  /**
   * Leaving by one of the page's own links is asked here, in the page, since a browser asks for the page being left
   * only when it chooses to — and not at all of a page nobody typed in. A modified click, a new tab, a link to the
   * same page are left alone.
   */
  private readonly askBeforeFollowing = (event: MouseEvent): void => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    const anchor = event.composedPath().find((node): node is HTMLAnchorElement => node instanceof HTMLAnchorElement)
    if (!anchor || !anchor.href || (anchor.target && anchor.target !== "_self") || anchor.hasAttribute("download")) return
    const target = new URL(anchor.href, location.href)
    if (target.href === location.href || (target.origin === location.origin && target.pathname === location.pathname && target.search === location.search && target.hash !== "")) return
    if (!this.dirty) return
    event.preventDefault()
    event.stopPropagation()
    this.pendingLoad = () => {
      this.leaving = true
      location.assign(target.href)
    }
    this.openDialog("discard", this.messages.discardTitle, this.messages.leaveQuestion, this.messages.leaveOk)
  }

  connectedCallback(): void {
    document.addEventListener("click", this.askBeforeFollowing, true)
    window.addEventListener("beforeunload", this.warnBeforeLeaving)
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
    const [messages, editorMessages] = language === "en"
      ? [caseEditorMessages_en, sightingEditorMessages_en]
      : await Promise.all([loadCaseEditorMessages(language), loadSightingEditorMessages(language)])
    if (token !== this.localeToken) return
    this.said = new SaidTexts(preferences)
    this.messages = messages
    this.caseDate.messages = editorMessages
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
    text("make-case", m.addToCase)
    for (const id of ["dirty", "recording-dirty"]) {
      this.byId(id).title = m.unsavedChanges
      this.byId(id).setAttribute("aria-label", m.unsavedChanges)
    }
    text("add", "+")
    text("export", m.exportButton)
    text("label-export-recordings", m.exportAlso)
    text("label-title", m.titleField)
    text("label-author", m.authorField)
    text("label-date", m.caseTime)
    text("label-of", m.interpretationOf)
    text("label-source", m.sourceField)
    text("label-observer", m.observerField)
    text("label-file", m.fileField)
    text("label-url", m.urlField)
    text("ok", m.ok)
    text("cancel", m.cancel)
    const source = this.byId("source") as HTMLSelectElement
    ;[m.sourceBlank, m.sourceFile, m.sourceUrl].forEach((label, index) => { source.options[index].textContent = label })
    this.byId("add").title = m.addHint
    this.byId("add").setAttribute("aria-label", m.addHint)
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

  /**
   * Keeps what the editor holds in the track on show, to be put back when it is shown again — once the author has done
   * something to it. A recording only looked at keeps what was loaded: the editor fills in what it can derive (a weather, a
   * zone) a moment after, and that is not a change anybody made, nor one worth warning about.
   */
  private commit(): void {
    if (this.session && this.current && this.editor.edited) this.session.keep(this.current, this.editor.sightingData)
  }

  private async loadTrack(track: CaseTrack): Promise<void> {
    if (track.recording) return
    track.recording = (await SightingFetch.json(track.url)) as SightingRecordingJson
    // As it was fetched: what a recording is changed from. A recording shown has it taken again from the form (see showTrack).
    track.loaded = JSON.stringify(track.recording)
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
      this.editor.documentUrl = track.base ? track.base.url : track.url
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

  /**
   * Makes a case around the recording on show, which stays exactly where it is: the editor is not given it again, so what is
   * being edited is not lost, and the case appears above it. Nothing is written anywhere: the case is the one an export makes.
   */
  private makeCase(): void {
    if (this.session) return
    const recording = this.editor.sightingData
    const when = recording.time ? CaseEditorElement.rr0TimeOf(formatEdtfTime(recording.time)) : undefined
    const title = this.said.read(recording.observer?.title as never)
    const from = this.getAttribute("src") ? new URL(this.getAttribute("src")!, location.href).href : undefined
    this.session = CaseSession.around(recording, when, title, from, location.href)
    this.current = this.session.tracks[0]
    this.session.keep(this.current, recording)
    this.dateModeFor = undefined
    this.refreshRow()
  }

  /** The case's own fields, written back as typed: a case holds them as plain text, and an empty one is not kept. */
  private writeCaseField(field: "id" | "title" | "time", value: string): void {
    const json = this.session?.json as Record<string, unknown> | undefined
    if (!json) return
    if (value.trim() === "") delete json[field]
    else json[field] = value
    this.session?.touch()
    this.scheduleDirtyCheck()
  }

  /** RR0 writes "1950-05-11 19:45" where EDTF writes "1950-05-11T19:45". */
  private static rr0TimeOf(edtf: string): string {
    return edtf.replace(/^(\d{4}-\d\d-\d\d)T/, "$1 ")
  }

  private static edtfOf(rr0: string): string {
    return rr0.replace(/^(\d{4}-\d\d-\d\d) (?=\d)/, "$1T")
  }

  /** Shows the case's date in the field: opens in the picker for a full instant, in the text for anything less (or anything it cannot read). */
  private showCaseTime(session: CaseSession): void {
    const raw = String((session.json as Record<string, unknown>).time ?? "")
    const time = raw === "" ? undefined : parseEdtfTime(CaseEditorElement.edtfOf(raw))
    this.caseDate.time = time
    if (raw !== "" && !time) {
      // A date this field cannot read is shown as it is written, in the text, and left alone until it is edited.
      const text = this.input("case-time")
      text.value = raw
    }
    if (this.dateModeFor !== session) {
      this.caseDate.setMode(raw !== "" && !time || !EdtfDateField.opensInPicker(time))
      this.dateModeFor = session
    }
  }

  /** The case on top, when there is one, and the picker of its recordings with what can be done with the one on show. */
  private refreshRow(): void {
    const session = this.session
    this.byId("case-panel").hidden = session === undefined
    this.byId("make-case-row").hidden = session !== undefined
    this.byId("case").classList.toggle("in-case", session !== undefined)
    this.byId("recording").classList.toggle("in-case", session !== undefined)
    if (!session) {
      this.refreshDirty()
      return
    }
    const active = this.shadow.activeElement
    for (const [id, field] of [["case-id", "id"], ["case-title", "title"]] as const) {
      const input = this.input(id)
      if (input !== active) input.value = String((session.json as Record<string, unknown>)[field] ?? "")
    }
    if (!active?.closest?.("rr0-date-input")) this.showCaseTime(session)
    const select = this.byId("track") as HTMLSelectElement
    select.replaceChildren(...session.tracks.map((track, index) => new Option(this.labelOf(track, index), String(index))))
    select.value = String(Math.max(0, this.current ? session.tracks.indexOf(this.current) : 0))
    // Any recording can leave the case, while the case keeps one.
    this.byId("delete").hidden = session.tracks.length <= 1
    this.refreshDirty()
  }

  // -- The dialog ----------------------------------------------------------------------------------

  private get dialog(): HTMLDialogElement {
    return this.byId("dialog") as HTMLDialogElement
  }

  private openDialog(mode: DialogMode, heading: string, message?: string, okLabel?: string): void {
    this.dialogMode = mode
    this.byId("dialog-title").textContent = heading
    const note = this.byId("dialog-message")
    note.textContent = message ?? ""
    note.hidden = message === undefined
    this.showError(undefined)
    this.byId("fields-add").hidden = mode !== "add"
    this.byId("fields-export").hidden = mode !== "export"
    this.byId("ok").hidden = false
    this.byId("ok").textContent = okLabel ?? (mode === "discard" ? this.messages.discardOk : this.messages.ok)
    if (typeof this.dialog.showModal === "function") this.dialog.showModal()
    else this.dialog.setAttribute("open", "")
  }

  private closeDialog(): void {
    // Leaving the dialog, agreeing or not, ends what waited for it: agreeing took it first.
    this.pendingLoad = undefined
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

  /** Adds a recording: an observation, or, when an account is named, a reading of it (another observation, see InterpretationEventJson). */
  private askAdd(): void {
    const session = this.session
    if (!session) return
    this.openDialog("add", this.messages.addTitle)
    const of = this.byId("of") as HTMLSelectElement
    of.replaceChildren(new Option(this.messages.interpretationOfNone, ""),
      ...session.tracks.filter(track => track.kind === "observer")
        .map(track => new Option(this.labelOf(track, session.tracks.indexOf(track)), String(session.tracks.indexOf(track)))))
    of.value = ""
    ;(this.byId("source") as HTMLSelectElement).value = "blank"
    for (const id of ["observer", "title", "author", "file", "url"]) this.input(id).value = ""
    this.input("date").value = ""
    this.syncSourceFields()
  }

  /** What the dialog asks depends on what is added: an observer for an observation, a title and an author for a reading. */
  private syncSourceFields(): void {
    const source = (this.byId("source") as HTMLSelectElement).value
    const reading = (this.byId("of") as HTMLSelectElement).value !== ""
    this.byId("row-file").hidden = source !== "file"
    this.byId("row-url").hidden = source !== "url"
    this.byId("row-observer").hidden = reading
    this.byId("row-title").hidden = !reading
    this.byId("row-author").hidden = !reading
  }

  private askExport(): void {
    if (!this.session) return
    this.openDialog("export", this.messages.exportTitle)
    ;(this.input("export-recordings")).checked = true
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
      case "delete":
        this.closeDialog()
        this.deleteCurrent()
        return
      case "discard": {
        const proceed = this.pendingLoad
        this.closeDialog()
        proceed?.()
        return
      }
      case "export":
        if (await this.exportCase(this.input("export-recordings").checked)) this.closeDialog()
        else this.showError(this.messages.loadFailed)
        return
      case "add":
        if (await this.addRecording()) this.closeDialog()
    }
  }

  // -- What is done to the case --------------------------------------------------------------------

  /**
   * Adds what the dialog describes — blank, or read from a file or an address — as an observation, or
   * as a reading of the account it names. A blank reading shares the whole scene of that account; says
   * what went wrong in the dialog.
   */
  private async addRecording(): Promise<boolean> {
    const session = this.session
    if (!session) return false
    const of = (this.byId("of") as HTMLSelectElement).value
    const account = of === "" ? undefined : session.tracks[Number(of)]
    const source = (this.byId("source") as HTMLSelectElement).value
    this.commit()
    if (account && source === "blank") {
      if (account.kind !== "observer" || !account.recording) return false
      const title = this.input("title").value.trim()
      const author = this.input("author").value.trim()
      const reading = session.addReading(account, this.input("date").value || this.today(),
        title !== "" ? title : undefined, author !== "" ? [{ title: author }] : undefined)
      void this.showTrack(reading)
      return true
    }
    const observer = this.input("observer").value.trim()
    const when = this.input("date").value.trim()
    let recording: SightingRecordingJson
    try {
      if (source === "blank") {
        const stem = (observer || "observation").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "observation"
        recording = {
          version: 1,
          id: `${when ? `${when}-` : ""}${stem}`,
          ...(observer ? { observer: { title: observer } } : {}),
          ...(when ? { time: when } : {}),
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
    const typedTitle = (account ? this.input("title").value : observer).trim()
    const title = typedTitle !== "" ? typedTitle : this.said.read(recording.observer?.title as never)
    const author = this.input("author").value.trim()
    const track = session.addObservation(recording, when !== "" ? when : undefined, title,
      account ? { account, by: author !== "" ? [{ title: author }] : undefined } : undefined)
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

  /**
   * The case, and with `withRecordings` every recording it lists beside it — the ones not looked at yet are fetched for it —
   * as one zip laid out as the case is; the case alone as the plain file. Says whether it could be written.
   */
  private async exportCase(withRecordings = true): Promise<boolean> {
    const session = this.session
    if (!session) return true
    this.commit()
    if (withRecordings) {
      try {
        for (const track of session.tracks) await this.loadTrack(track)
      } catch {
        return false
      }
    }
    const files = session.files(withRecordings, true)
    session.markExported(withRecordings)
    this.refreshDirty()
    // The case alone is the one file it is: no archive around it.
    if (files.length === 1) {
      this.download(new Blob([files[0].content], { type: "application/json" }), files[0].path)
      return true
    }
    const { zipSync, strToU8 } = await import("fflate")
    const archive: Record<string, Uint8Array> = {}
    for (const file of files) archive[file.path] = strToU8(file.content)
    this.download(new Blob([zipSync(archive) as BlobPart], { type: "application/zip" }), `${session.json.id ?? "case"}.zip`)
    return true
  }

  private download(blob: Blob, name: string): void {
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = name
    link.click()
    URL.revokeObjectURL(url)
  }
}

export function register(): void {
  registerSightingEditor()
  if (!customElements.get(CASE_EDITOR_ELEMENT_NAME)) customElements.define(CASE_EDITOR_ELEMENT_NAME, CaseEditorElement)
}
