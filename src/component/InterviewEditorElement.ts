import type { CaseEventJson } from "../engine/persistence/caseJson.js"
import { register as registerInputFile, type InputFileElement, type InputFilePick } from "./InputFileElement.js"
import type { AgentRef } from "../engine/interpretation/Interpretation.js"
import { SaidTexts } from "../engine/model/SaidText.js"
import type { SaidText } from "../engine/model/SaidText.js"
import { SightingFetch } from "../engine/net/SightingFetch.js"
import { HostLocale, selectLocale } from "../i18n/locale.js"
import { loadInterviewMessages, loadSightingEditorMessages, UFO_SUPPORTED_LANGUAGES } from "./messages/index.js"
import type { UfoLanguage } from "./messages/index.js"
import type { InterviewMessages } from "./messages/InterviewMessages.js"
import { interviewMessages_en } from "./messages/InterviewMessages_en.js"
import type { SightingFileEditor } from "./SightingFileEditor.js"
import { InterviewMedia } from "./messages/InterviewMedia.js"
import { INTERVIEW_CHANGE_EVENT, INTERVIEW_SEEK_EVENT } from "./interviewEvents.js"
import { register as registerInterview } from "./InterviewElement.js"
import type { InterviewElement } from "./InterviewElement.js"
import type { InterviewJson } from "../engine/persistence/interviewJson.js"
import { InputFont } from "./InputFont.js"
import { MessageStyle } from "./MessageStyle.js"

export const INTERVIEW_EDITOR_ELEMENT_NAME = "rr0-interview-editor"

export { INTERVIEW_CHANGE_EVENT, INTERVIEW_SEEK_EVENT }

type InterviewGroup = "summary" | "exchanges" | "file"

/** An observer of the case an interview may have been held with. */
export interface InterviewWitness {
  /** The id of the observer's sighting event in the case: what `interviewOf` names. */
  id: string
  label: string
}

export type InterviewEvent = CaseEventJson & { by?: AgentRef[] }

const TEMPLATE = `
<style>
  :host { display: block; }
  /* The colours of the transcript's text editor (see SightingFileEditor): a key, a string, a number or a word, and a mistake. Dark mode redefines them. */
  :host { --file-key: #1a5fb4; --file-string: #26662f; --file-literal: #a5321f; --rr0-alert: #c33; }
  @media (prefers-color-scheme: dark) { :host { --file-key: #8cb8ff; --file-string: #8fd39a; --file-literal: #ffa08a; } }
  [hidden] { display: none !important; }
  /* Two groups as the recording's editor has its own (see sightingEditorTemplate): the open tab raised and joined to its panel. */
  .group-tabs { --tab-line: color-mix(in srgb, CanvasText 35%, transparent); --tab-surface: color-mix(in srgb, CanvasText 5%, Canvas);
    --tab-recessed: color-mix(in srgb, CanvasText 11%, Canvas); --tab-accent: #4a9eff;
    display: flex; flex-wrap: wrap; align-items: flex-end; gap: 0; margin: 0; padding: 0; border-bottom: 1px solid var(--tab-line); }
  .group-tab { font: inherit; font-weight: 600; cursor: pointer; color: color-mix(in srgb, CanvasText 70%, transparent); background: var(--tab-recessed);
    border: 1px solid var(--tab-line); border-radius: 8px 8px 0 0; padding: .4em .6em; margin: 0 0 -1px -1px; position: relative; }
  .group-tab:hover { color: CanvasText; background: color-mix(in srgb, CanvasText 16%, Canvas); }
  .group-tab[aria-expanded="true"] { color: CanvasText; background: var(--tab-surface); border-bottom-color: var(--tab-surface); box-shadow: inset 0 2px 0 var(--tab-accent); z-index: 1; }
  .group-tab:focus-visible { outline: 2px solid #4af; outline-offset: -2px; }
  .group-panel { border: 1px solid var(--tab-line, color-mix(in srgb, CanvasText 35%, transparent)); border-top: 0; border-radius: 0 0 4px 4px;
    background: color-mix(in srgb, CanvasText 5%, Canvas); padding: .5em .75em; margin: 0 0 .5em; }
  .row { display: flex; align-items: center; gap: .5em; flex-wrap: wrap; margin-bottom: .5em; }
  .group-panel > .row:last-child { margin-bottom: 0; }
  label { display: flex; align-items: center; gap: .4em; }
  label.wide { flex: 1 1 100%; align-items: flex-start; }
  label.wide textarea { flex: 1 1 auto; min-width: 0; min-height: 9em; }
  label.fill { flex: 1 1 100%; }
  label.fill input { flex: 1 1 auto; }
  input[type="text"] { min-width: 0; }
  #by { width: 16em; }
  input[type="url"] { width: 18em; max-width: 100%; }
  ${InputFont.CSS}
  select { min-width: 0; max-width: 100%; text-overflow: ellipsis; }
  fieldset.witnesses { display: flex; flex-wrap: wrap; align-items: center; gap: .25em .75em; border: 0; margin: 0; padding: 0; min-width: 0; }
  fieldset.witnesses legend { float: left; padding: 0; margin-right: .4em; }
  #exchanges { --rr0-interview-max-height: 32em; --rr0-interview-overflow: auto; }
  .file-note { margin: .3em 0; }
  ${MessageStyle.rules([".file-note"])}
  .file-editor { min-height: 18em; margin-top: .5em; }
</style>
<div id="tabs" class="group-tabs">
  <button class="group-tab" type="button" aria-controls="group-summary" aria-expanded="true"><span id="label-summary-group">Summary</span></button>
  <button class="group-tab" type="button" aria-controls="group-exchanges" aria-expanded="false"><span id="label-exchanges-group">Exchanges</span></button>
  <button class="group-tab" type="button" aria-controls="group-transcript" aria-expanded="false"><span id="label-file-group">File</span></button>
</div>
<section class="group-panel" id="group-summary" aria-labelledby="label-summary-group">
  <div class="row">
    <label class="fill"><span id="label-title">Title</span> <input id="title" type="text"/></label>
  </div>
  <div class="row">
    <fieldset id="witness" class="witnesses"><legend id="label-witness">Witness</legend></fieldset>
    <label><span id="label-medium">Medium</span> <select id="medium"></select></label>
    <label><span id="label-time">When</span> <input id="time" type="text" size="16" placeholder="2026-10-13 21:27"/></label>
    <label><span id="label-by">Interviewer</span> <input id="by" type="text" autocomplete="off" spellcheck="false"/></label>
  </div>
  <div class="row">
    <label class="wide"><span id="label-summary">What it established</span> <textarea id="summary"></textarea></label>
  </div>
</section>
<section class="group-panel" id="group-exchanges" aria-labelledby="label-exchanges-group" hidden>
  <rr0-interview id="exchanges"></rr0-interview>
</section>
<section class="group-panel" id="group-transcript" aria-labelledby="label-file-group" hidden>
  <div class="row">
    <label class="fill"><span id="label-url">Transcript</span> <input id="url" type="text" autocomplete="off" spellcheck="false" placeholder="interview-….json"/></label>
  </div>
  <div class="row toolbar">
    <span class="input-file-row"><span id="label-import-file">Load a file (JSON, text, WebVTT, SRT)</span> <rr0-input-file id="import" name="import" accept="application/json,.json,.txt,.md,.vtt,.srt,text/*" placeholder="https://…/interview.json"></rr0-input-file></span>
    <button id="save" type="button">Save</button>
  </div>
  <p id="file-note" class="file-note" hidden role="status"></p>
  <div id="file-editor" class="file-editor"></div>
</section>
`

/**
 * An interview of a case, as an event of type `interview` (see CaseFile.INTERVIEW_EVENT): who held it, with which witness, when, and what
 * it established. The counterpart, in a case, of what `<rr0-sighting-editor>` is for an observer's account: where the case editor shows an
 * account it puts that editor, where it shows an interview it puts this element.
 *
 * Two groups, as the recording's editor has its own. The SUMMARY holds the event's fields, which the element edits in place (`event`) and says
 * so with an `interviewchange` event; it keeps no copy. The FILE holds the interview's transcript, the file at the event's `url` (see
 * InterviewJson) with that address, as text to edit, to load from a file or an address, and to save; it is completed from the transcript's own schema
 * (interviewSchema.json). The transcript is the host's to keep: `transcriptText` gives it what the author has already edited, and
 * `documentUrl` is what the `url` is relative to, which is how the file is fetched the first time.
 *
 * `witnesses` are the case's observers, one of which the interview is `interviewOf`. With the `readonly` attribute it only shows.
 *
 * Titles and summaries are text that may be said in several languages (see SaidText): what is typed is written in the reader's language and
 * the other languages stay as they were.
 */
export class InterviewEditorElement extends HTMLElement {
  private readonly shadow = this.attachShadow({ mode: "open" })

  /** Where a transcript comes in: a file of the author's, or an address (see InputFileElement). */
  private get importInput(): InputFileElement {
    return this.shadow.getElementById("import") as InputFileElement
  }
  private messages: InterviewMessages = interviewMessages_en
  private said = new SaidTexts(["en"])
  private language: UfoLanguage = "en"
  private localeToken = 0
  private current?: InterviewEvent
  private options: InterviewWitness[] = []
  private group: InterviewGroup = "summary"
  /** What the transcript's address is relative to: the case's. */
  private base?: string
  /** The transcript as edited or loaded since the interview was shown; undefined until it is, when it is fetched from the event's `url`. */
  private text?: string
  private fileEditor?: SightingFileEditor
  private fileEditorLoading?: Promise<SightingFileEditor>
  /** The interview the file editor shows the transcript of. */
  private shownFor?: InterviewEvent

  constructor() {
    super()
    this.shadow.innerHTML = TEMPLATE
    // Made now, since its controls are looked up below and an element of a shadow root is not upgraded before the root is in a page.
    customElements.upgrade(this.shadow)
    this.importInput.build()
    for (const id of ["title", "time", "by", "url", "summary", "witness", "medium"]) {
      this.shadow.getElementById(id)!.addEventListener(id === "witness" || id === "medium" ? "change" : "input", () => this.write(id))
    }
    for (const tab of this.shadow.querySelectorAll<HTMLButtonElement>("#tabs .group-tab")) {
      tab.addEventListener("click", () => this.openGroup(InterviewEditorElement.GROUPS[tab.getAttribute("aria-controls")!] ?? "summary"))
    }
    // A new address for the transcript, once typed: the file there is what is shown, unless the author has already worked on the text.
    this.shadow.getElementById("url")!.addEventListener("change", () => {
      this.shownFor = undefined
      if (this.text === undefined && this.group === "file") void this.showTranscript()
    })
    this.importInput.addEventListener("filepick", event => {
      const pick = (event as CustomEvent<InputFilePick>).detail
      if (pick.file) void this.importFromFile(pick.file)
      else void this.importFromUrl(pick.url)
    })
    this.shadow.getElementById("save")!.addEventListener("click", () => this.save())
  }

  private static readonly GROUPS: Record<string, InterviewGroup> = { "group-summary": "summary", "group-exchanges": "exchanges", "group-transcript": "file" }

  static get observedAttributes(): string[] {
    return ["readonly"]
  }

  attributeChangedCallback(): void {
    this.applyReadonly()
  }

  connectedCallback(): void {
    void this.loadLocale()
  }

  disconnectedCallback(): void {
    // Moving the editor in the page disconnects it and connects it again within the same task: only an editor still out of the page after
    // that has gone, and its text editor must stop (its linter keeps a timer that dispatches on the view, which fails once the window it
    // measured against is closed). See SightingEditorElement's.
    queueMicrotask(() => { if (!this.isConnected) this.releaseFileEditor() })
  }

  /** Frees the File group's text editor of an editor that left the page, keeping its text; it is made again when it is needed. */
  private releaseFileEditor(): void {
    if (!this.fileEditor) return
    this.text = this.fileEditor.text
    this.fileEditor.destroy()
    this.fileEditor = undefined
    this.fileEditorLoading = undefined
    this.shownFor = undefined
  }

  /** The event of the case shown, edited in place. */
  get event(): InterviewEvent | undefined {
    return this.current
  }

  set event(event: InterviewEvent | undefined) {
    if (event !== this.current) this.shownFor = undefined
    this.current = event
    this.render()
    if (this.group === "file") void this.showTranscript()
    if (this.group === "exchanges") void this.showExchanges()
  }

  /** The observers an interview may be held with. */
  set witnesses(witnesses: InterviewWitness[]) {
    this.options = witnesses
    this.render()
  }

  /** What the transcript's `url` is relative to: the address of the case. */
  set documentUrl(url: string | undefined) {
    this.base = url
  }

  /** The transcript as the host has it, once the author has edited or loaded it; undefined when it has not been, and the file is fetched. */
  get transcriptText(): string | undefined {
    return this.text
  }

  set transcriptText(text: string | undefined) {
    this.text = text
    this.shownFor = undefined
  }

  private field(id: string): HTMLInputElement {
    return this.shadow.getElementById(id) as HTMLInputElement
  }

  private async loadLocale(): Promise<void> {
    const token = ++this.localeToken
    const preferences = HostLocale.preferencesFor(this)
    const language = selectLocale(preferences, UFO_SUPPORTED_LANGUAGES) as UfoLanguage
    const messages = language === "en" ? interviewMessages_en : await loadInterviewMessages(language)
    if (token !== this.localeToken) return
    this.language = language
    this.said = new SaidTexts(preferences)
    this.messages = messages
    this.render()
  }

  private applyReadonly(): void {
    const readonly = this.hasAttribute("readonly")
    for (const id of ["title", "time", "by", "url", "summary"]) this.field(id).readOnly = readonly
    for (const box of this.shadow.querySelectorAll<HTMLInputElement>("#witness input")) box.disabled = readonly
    this.field("medium").disabled = readonly
    this.importInput.disabled = readonly
  }

  /** What `by` says as one line: the ids of the people, the names of the organizations, separated by commas. */
  static byText(by: AgentRef[] | undefined): string {
    return (by ?? []).map(agent => "people" in agent ? agent.people : "org" in agent ? agent.org : (agent as { title?: string }).title ?? "")
      .filter(name => name !== "").join(", ")
  }

  private render(): void {
    const m = this.messages
    const text = (id: string, value: string): void => { this.shadow.getElementById(id)!.textContent = value }
    text("label-summary-group", m.summaryTab)
    text("label-file-group", m.fileTab)
    text("label-exchanges-group", m.exchangesTab)
    text("label-title", m.title)
    text("label-witness", m.witness)
    text("label-medium", m.medium)
    text("label-time", m.time)
    text("label-by", m.by)
    text("label-summary", m.summary)
    text("label-url", m.transcript)
    text("label-import-file", m.importFile)
    this.importInput.messages = m
    text("save", m.saveButton)
    this.field("url").title = m.transcriptHint
    this.field("by").title = m.byHint
    const event = this.current
    const active = this.shadow.activeElement
    const set = (id: string, value: string): void => { if (this.field(id) !== active) this.field(id).value = value }
    set("title", this.said.read(event?.title as SaidText | undefined) ?? "")
    set("time", event?.time ?? "")
    set("by", InterviewEditorElement.byText(event?.by))
    set("url", event?.url ?? "")
    set("summary", this.said.read(event?.summary) ?? "")
    // The witnesses: one box per observer of the case, those the interview was held with checked. An interview has at least one, and may have
    // several. A witness the case does not list is kept as it is rather than silently dropped.
    const named = [event?.interviewOf].flat().filter((id): id is string => typeof id === "string")
    const boxes = this.shadow.getElementById("witness")!
    const options = [...this.options, ...named.filter(id => !this.options.some(witness => witness.id === id)).map(id => ({ id, label: id }))]
    boxes.replaceChildren(boxes.querySelector("legend")!, ...options.map(witness => {
      const label = document.createElement("label")
      const box = document.createElement("input")
      box.type = "checkbox"
      box.value = witness.id
      box.checked = named.includes(witness.id)
      label.append(box, witness.label)
      return label
    }))
    // What it was held through: one of the media, and not nothing once one is said. An event that says none shows a placeholder, as for the witness.
    const way = this.shadow.getElementById("medium") as HTMLSelectElement
    way.replaceChildren(...InterviewMedia.ALL.map(medium => new Option(InterviewMedia.label(medium, this.language), medium)))
    if (event?.medium !== undefined && !InterviewMedia.ALL.includes(event.medium)) way.append(new Option(String(event.medium), String(event.medium)))
    if (event?.medium === undefined) {
      const none = new Option(m.witnessNone, "")
      none.disabled = true
      none.hidden = true
      way.prepend(none)
    }
    way.value = event?.medium ?? ""
    this.applyReadonly()
  }

  /** What was typed goes to the event, as it was typed; an emptied field is not kept. */
  private write(id: string): void {
    const event = this.current
    if (!event) return
    const value = id === "witness" ? "" : this.field(id).value
    switch (id) {
      case "title": {
        const written = this.said.write(event.title as SaidText | undefined, value, this.language)
        if (written === undefined) delete event.title
        else event.title = written
        break
      }
      case "summary": {
        const written = this.said.write(event.summary, value, this.language)
        if (written === undefined) delete event.summary
        else event.summary = written
        break
      }
      case "time":
        if (value.trim() === "") delete event.time
        else event.time = value.trim()
        break
      case "url":
        if (value.trim() === "") delete event.url
        else event.url = value.trim()
        break
      case "by": {
        const people = value.split(",").map(name => name.trim()).filter(name => name !== "")
        if (people.length === 0) delete event.by
        else event.by = people.map(name => ({ people: name }))
        break
      }
      case "witness": {
        // Nothing is not a choice: an interview is held with somebody, so the last box cannot be unchecked.
        const ids = [...this.shadow.querySelectorAll<HTMLInputElement>("#witness input:checked")].map(box => box.value)
        if (ids.length === 0) {
          this.render()
          return
        }
        event.interviewOf = ids.length === 1 ? ids[0] : ids
        break
      }
      case "medium":
        if (value === "") delete event.medium
        else event.medium = value as InterviewEvent["medium"]
        break
    }
    this.dispatchEvent(new CustomEvent(INTERVIEW_CHANGE_EVENT, { bubbles: true, composed: true, detail: { field: id, event } }))
    // The placeholder of a witness or a medium not chosen yet goes once one is.
    if (id === "medium") this.render()
    // The file holds what the summary shows: it says the same.
    if (id !== "url") this.syncFileFromEvent()
  }

  // -- The groups -----------------------------------------------------------------------------------

  private openGroup(group: InterviewGroup): void {
    this.group = group
    const panels: Record<InterviewGroup, string> = { summary: "group-summary", exchanges: "group-exchanges", file: "group-transcript" }
    for (const tab of this.shadow.querySelectorAll<HTMLButtonElement>("#tabs .group-tab")) {
      tab.setAttribute("aria-expanded", String(tab.getAttribute("aria-controls") === panels[group]))
    }
    for (const [name, id] of Object.entries(panels)) this.shadow.getElementById(id)!.hidden = name !== group
    if (group === "file") void this.showTranscript()
    if (group === "exchanges") void this.showExchanges()
  }

  // -- The exchanges --------------------------------------------------------------------------------

  private exchangesToken = 0

  /** The transcript as an object: the text the author has edited or loaded, else the file at the event's address. Undefined when there is none or it does not read. */
  private async transcriptJson(event: InterviewEvent): Promise<InterviewJson | undefined> {
    try {
      const text = this.fileEditor?.text ?? this.text
      if (text !== undefined) return JSON.parse(text) as InterviewJson
      const url = this.transcriptUrl(event)
      if (url !== undefined) return await SightingFetch.json(url) as InterviewJson
    } catch {
      // not readable: there is nothing to show of it
    }
    return undefined
  }

  /** Reads the interview as a dialogue: who said what, the passages taken out blacked out with their reason, the times when Alt is held. */
  private async showExchanges(): Promise<void> {
    const event = this.current
    if (!event) return
    const token = ++this.exchangesToken
    const json = await this.transcriptJson(event)
    if (token !== this.exchangesToken || this.current !== event) return
    this.drawExchanges(json)
  }

  private drawExchanges(json: InterviewJson | undefined): void {
    const reader = this.shadow.getElementById("exchanges") as InterviewElement
    reader.documentUrl = this.current ? this.transcriptUrl(this.current) : undefined
    reader.interview = json
  }

  /** Opens the dialogue at the segment that tells of an observation's moment, and shows where it is. */
  async revealSegment(index: number): Promise<void> {
    this.openGroup("exchanges")
    await this.showExchanges()
    const reader = this.shadow.getElementById("exchanges") as InterviewElement
    reader.revealSegment(index)
  }

  private note(message: string | undefined, kind: "info" | "error" = "info"): void {
    MessageStyle.show(this.shadow.getElementById("file-note")!, message, kind)
  }

  /** The address the transcript is fetched from, absolute. */
  private transcriptUrl(event: InterviewEvent): string | undefined {
    return event.url ? new URL(event.url, this.base ?? location.href).href : undefined
  }

  private static pretty(json: unknown): string {
    return JSON.stringify(json, null, 2) + "\n"
  }

  /**
   * What the summary shows and the file holds, which the two say the same of: in the file's own words. A change of one is a change of the other.
   */
  private static readonly SHARED = ["title", "time", "medium", "by", "interviewOf", "summary"] as const

  /** The order a file reads best in: what the interview is, then who speaks, then what was said. Whatever else it holds follows. */
  private static readonly ORDER = ["version", "id", "language", "title", "time", "medium", "by", "interviewOf", "summary", "speakers", "transcription", "proofreading", "anonymization", "segments"]

  private static ordered(json: Record<string, unknown>): Record<string, unknown> {
    const ordered: Record<string, unknown> = {}
    for (const key of InterviewEditorElement.ORDER) if (key in json) ordered[key] = json[key]
    for (const key of Object.keys(json)) if (!(key in ordered)) ordered[key] = json[key]
    return ordered
  }

  /** The ids of the sightings the interview was held with. */
  private static witnessesOf(interviewOf: unknown): string[] {
    return [interviewOf].flat().filter((id): id is string => typeof id === "string")
  }

  /** The shared fields the event has, as they go in the file; and the speakers the file names, kept to the interviewer and the witness the event names. */
  private static withEventFields(json: Record<string, unknown>, event: InterviewEvent): Record<string, unknown> {
    const next: Record<string, unknown> = { ...json }
    for (const key of InterviewEditorElement.SHARED) {
      if (event[key] === undefined) delete next[key]
      else next[key] = structuredClone(event[key])
    }
    const speakers = next.speakers
    if (typeof speakers === "object" && speakers !== null) {
      const kept = { ...(speakers as Record<string, Record<string, unknown>>) }
      // Several interviewers and several witnesses: the first of each is `interviewer` and `witness`, the others `interviewer2`, `witness2`… A
      // speaker the event names and the file does not is added; one the file has and the event no longer names stays, since segments may be his.
      const sync = (role: "interviewer" | "witness", key: "by" | "of", values: unknown[]): void => {
        values.forEach((value, index) => {
          const id = index === 0 ? role : `${role}${index + 1}`
          if (kept[id]) kept[id] = { ...kept[id], [key]: value }
          else if (index > 0) kept[id] = { role, [key]: value }
        })
      }
      sync("interviewer", "by", event.by ?? [])
      sync("witness", "of", InterviewEditorElement.witnessesOf(event.interviewOf))
      next.speakers = kept
    }
    return InterviewEditorElement.ordered(next)
  }

  /**
   * Puts the shared fields the file holds in the event: all of them when the author edited the text (what is not in it is no longer in the
   * summary), or only those it says when the file was loaded (a file that does not say its title leaves the one the case gave).
   * Says whether the event changed.
   */
  private applyFileToEvent(json: Record<string, unknown>, removeMissing: boolean): boolean {
    const event = this.current
    if (!event) return false
    const before = JSON.stringify(InterviewEditorElement.SHARED.map(key => event[key]))
    const said = (value: unknown): boolean => typeof value === "string" || (typeof value === "object" && value !== null && !Array.isArray(value))
    const accepted: Record<(typeof InterviewEditorElement.SHARED)[number], (value: unknown) => boolean> = {
      title: said, summary: said, time: value => typeof value === "string", medium: value => typeof value === "string",
      by: value => Array.isArray(value), interviewOf: value => typeof value === "string" || Array.isArray(value)
    }
    for (const key of InterviewEditorElement.SHARED) {
      const value = json[key]
      if (value !== undefined && accepted[key](value)) (event as unknown as Record<string, unknown>)[key] = structuredClone(value)
      else if (removeMissing) delete event[key]
    }
    return JSON.stringify(InterviewEditorElement.SHARED.map(key => event[key])) !== before
  }

  /**
   * The summary was edited: the file says it too. Nothing to say it in until there is a transcript text, which is made from the event when it is
   * first needed (see template).
   */
  private syncFileFromEvent(): void {
    const event = this.current
    const text = this.fileEditor?.text ?? this.text
    if (!event || text === undefined) return
    let json: unknown
    try {
      json = JSON.parse(text)
    } catch {
      return
    }
    if (typeof json !== "object" || json === null || Array.isArray(json)) return
    const next = InterviewEditorElement.pretty(InterviewEditorElement.withEventFields(json as Record<string, unknown>, event))
    if (next === text) return
    this.text = next
    this.fileEditor?.replaceText(next, false)
    this.dispatchEvent(new CustomEvent(INTERVIEW_CHANGE_EVENT, { bubbles: true, composed: true, detail: { field: "transcript", event, text: next } }))
  }

  /** A transcript with nobody saying anything yet, naming the interview's speakers as far as the event knows them. */
  private template(event: InterviewEvent): string {
    return InterviewEditorElement.pretty(InterviewEditorElement.withEventFields({
      version: 1,
      language: this.language,
      speakers: { interviewer: { role: "interviewer" }, witness: { role: "witness" } },
      segments: []
    }, event))
  }

  /** The file editor, a chunk of its own fetched the first time the File group is opened (CodeMirror is heavy and most authors never need it). */
  private loadFileEditor(text: string): Promise<SightingFileEditor> {
    this.fileEditorLoading ??= (async () => {
      try {
        const [{ SightingFileEditor }, { default: schema }, editorMessages] = await Promise.all([
          import("./SightingFileEditor.js"), import("../generated/interviewSchema.json"), loadSightingEditorMessages(this.language)])
        this.fileEditor = new SightingFileEditor(this.shadow.getElementById("file-editor")!, text, edited => this.onEdited(edited), this.messages.editorLabel,
          { baseline: text, phrases: editorMessages.fileSearchPhrases, schema: schema as never })
        return this.fileEditor
      } catch (error) {
        this.fileEditorLoading = undefined
        throw error
      }
    })()
    return this.fileEditorLoading
  }

  /**
   * Shows the transcript of the interview in the text: what the author has edited or loaded, else what the file at its address holds (fetched
   * relative to the case), else a transcript with nobody speaking yet. Said while it loads, and when it cannot be read.
   */
  private async showTranscript(): Promise<void> {
    const event = this.current
    if (!event || this.shownFor === event) return
    this.note(this.messages.loading)
    let text = this.text
    if (text === undefined) {
      const url = this.transcriptUrl(event)
      if (url !== undefined) {
        try {
          const json = await SightingFetch.json(url) as Record<string, unknown>
          // The file is the whole interview: what it says of it is what the summary shows, and what the summary has that it does not say it gets.
          if (this.current === event && typeof json === "object" && json !== null && !Array.isArray(json)) {
            if (this.applyFileToEvent(json, false)) this.fileChangedEvent()
            text = InterviewEditorElement.pretty(InterviewEditorElement.withEventFields(json, event))
          } else {
            text = InterviewEditorElement.pretty(json)
          }
        } catch {
          this.note(this.messages.loadFailed, "error")
        }
      }
      text ??= this.template(event)
    }
    if (this.current !== event) return
    try {
      const editor = await this.loadFileEditor(text)
      if (this.current !== event) return
      editor.replaceText(text, false)
      this.shownFor = event
      if (this.text !== undefined || this.transcriptUrl(event) === undefined) this.note(undefined)
      else if (this.shadow.getElementById("file-note")!.textContent === this.messages.loading) this.note(undefined)
    } catch {
      this.note(this.messages.loadFailed, "error")
    }
  }

  /**
   * The author edited the text, or loaded another. The transcript is kept as it is, and says so: a text that does not read yet as JSON is kept
   * too (it is theirs), with a word of warning. An interview that had no address for it is given one beside the case, since the transcript is
   * a file the case then lists.
   */
  private onEdited(text: string): void {
    this.text = text
    let parsed: unknown
    let valid = true
    try {
      parsed = JSON.parse(text)
    } catch {
      valid = false
    }
    this.note(valid ? undefined : this.messages.invalid, "error")
    const event = this.current
    // What the text says of the interview is what the summary shows: a field it no longer has is cleared there.
    if (valid && event && typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) && this.applyFileToEvent(parsed as Record<string, unknown>, true)) {
      this.fileChangedEvent()
    }
    if (event && !event.url && text.trim() !== "") {
      const id = event.id ?? "1"
      event.url = `${id.startsWith("interview") ? id : `interview-${id}`}.json`
      this.field("url").value = event.url
      this.dispatchEvent(new CustomEvent(INTERVIEW_CHANGE_EVENT, { bubbles: true, composed: true, detail: { field: "url", event } }))
    }
    this.dispatchEvent(new CustomEvent(INTERVIEW_CHANGE_EVENT, { bubbles: true, composed: true, detail: { field: "transcript", event, text } }))
    if (this.group === "exchanges") void this.showExchanges()
  }

  /** The file changed what the summary shows: shown there, and told to the host. */
  private fileChangedEvent(): void {
    this.render()
    this.dispatchEvent(new CustomEvent(INTERVIEW_CHANGE_EVENT, { bubbles: true, composed: true, detail: { field: "file", event: this.current } }))
  }

  /** Puts a transcript read from a file or an address in the text, as an edit of the author's. */
  private async take(json: unknown): Promise<void> {
    if (typeof json !== "object" || json === null || !Array.isArray((json as { segments?: unknown }).segments)) {
      this.note(this.messages.notATranscript, "error")
      return
    }
    // The file replaces the text, and what it says of the interview is what the summary then shows; what the summary has that it does not say stays.
    const event = this.current
    if (event && this.applyFileToEvent(json as Record<string, unknown>, false)) this.fileChangedEvent()
    const text = InterviewEditorElement.pretty(event ? InterviewEditorElement.withEventFields(json as Record<string, unknown>, event) : json)
    await this.loadFileEditor(text).then(editor => editor.replaceText(text, false), () => undefined)
    this.shownFor = this.current
    this.note(undefined)
    this.onEdited(text)
  }

  private async importFromFile(file: File): Promise<void> {
    try {
      const text = await file.text()
      let json: unknown
      try {
        json = JSON.parse(text)
      } catch {
        json = undefined
      }
      // A file that is not ours (a transcript out of a recording tool, subtitles, a text with a name before each turn) is read as best it can be.
      if (typeof json !== "object" || json === null) {
        const { InterviewImport } = await import("../engine/persistence/interviewImport.js")
        const event = this.current
        const held = [event?.interviewOf].flat().filter((id): id is string => typeof id === "string")
        const imported = InterviewImport.parse(text, {
          by: (event?.by ?? []).map(agent => InterviewEditorElement.byText([agent])).filter(name => name !== ""),
          witnesses: this.options.filter(witness => held.length === 0 || held.includes(witness.id))
        })
        json = imported && { ...imported, transcription: { note: `Imported from ${file.name}: who speaks and when are as the file gave them, to be checked.` } }
      }
      if (json === undefined) this.note(this.messages.notATranscript, "error")
      else await this.take(json)
    } catch {
      this.note(this.messages.loadFailed, "error")
    }
  }

  private async importFromUrl(value: string): Promise<void> {
    try {
      await this.take(await SightingFetch.json(new URL(value, this.base ?? location.href).href))
    } catch {
      this.note(this.messages.loadFailed, "error")
    }
  }

  /** The transcript as a file, named as the interview's address names it. */
  private save(): void {
    const text = this.fileEditor?.text ?? this.text
    if (text === undefined) return
    const name = (this.current?.url ?? "").split("/").pop() || `${this.current?.id ?? "interview"}.json`
    const url = URL.createObjectURL(new Blob([text], { type: "application/json" }))
    const link = document.createElement("a")
    link.href = url
    link.download = name
    link.click()
    URL.revokeObjectURL(url)
  }
}

export function register(): void {
  registerInterview()
  registerInputFile()
  if (!customElements.get(INTERVIEW_EDITOR_ELEMENT_NAME)) customElements.define(INTERVIEW_EDITOR_ELEMENT_NAME, InterviewEditorElement)
}
