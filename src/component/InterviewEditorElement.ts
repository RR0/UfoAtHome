import type { CaseEventJson } from "../engine/persistence/caseJson.js"
import { EditorTheme } from "./EditorTheme.js"
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
import type { InterviewJson, InterviewSegment } from "../engine/persistence/interviewJson.js"
import { InterviewFile } from "../engine/persistence/interviewJson.js"
import { InterviewEdits } from "../engine/persistence/InterviewEdits.js"
import { InterviewPlayer } from "./InterviewPlayer.js"
import { AddMenu } from "./AddMenu.js"
import { Icons } from "./Icons.js"
import { WindowClose } from "./WindowClose.js"
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
  /** The named moments of that observation (see Milestone), which a passage of the witness's can be linked to. */
  moments?: InterviewMoment[]
}

/** A named moment of an observation, as an interview links to it: when, in seconds of the observation, its letter, and what happens then. */
export interface InterviewMoment {
  at: number
  label: string
  note?: string
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
  /* ---- The design handoff's look (design_handoff_editeurs_ufoathome, §2 and §5) ---- */
  :host {
    ${EditorTheme.TOKENS}
    --rr0-field-radius: 8px;
    --rr0-input-font-size: 15px;
    container-type: inline-size;
    font: 400 15px/1.5 var(--sans);
    color: var(--ink);
  }
  ${EditorTheme.HEAD}
  ${EditorTheme.fields(".interview-app")}
  .recordings-window :is(button, input, select) { font: inherit; }
  .recordings-window .pill-btn { min-height: 36px; }
  /* Its parts, underlined, as the case's are. */
  #tabs { display: flex; gap: 6px; padding: 0; border-bottom: 1px solid var(--line); }
  #tabs .group-tab {
    display: inline-flex; align-items: center; gap: 8px; min-height: 0; margin: 0 0 -1px; padding: 12px 10px;
    border: 0; border-bottom: 2px solid transparent; border-radius: 0; background: none; box-shadow: none; color: var(--ink-dim); font: 600 15px/1.2 var(--sans);
  }
  #tabs .group-tab:hover { background: none; color: var(--ink); }
  #tabs .group-tab[aria-expanded="true"] { color: var(--ink); border-bottom-color: var(--glow-solid); background: none; box-shadow: none; }
  .interview-app > .group-panel { margin: 0; padding: 18px 0 0; border: 0; border-radius: 0; background: none; color: var(--ink); }
  /* Fields: the label above, the value under it, on a grid that fills the width; the title and what was established the whole width. */
  #group-summary { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 14px 16px; }
  #group-summary > .row { display: contents; }
  #group-summary label, #group-transcript label { display: flex; flex-direction: column; align-items: stretch; gap: 6px; font: 600 13px/1.3 var(--sans); color: var(--ink-dim); }
  #group-summary :is(label.fill, label.wide) { grid-column: 1 / -1; }
  #group-summary :is(input, select, textarea), #group-transcript input[type="text"] { box-sizing: border-box; width: 100%; font-weight: 400; }
  #group-summary input[type="text"], #group-transcript input[type="text"] { height: 38px; }
  #group-summary textarea { min-height: 9em; }
  fieldset.witnesses { flex-direction: column; align-items: flex-start; gap: 6px; font: 600 13px/1.3 var(--sans); color: var(--ink-dim); }
  #group-summary fieldset.witnesses label { flex-direction: row; align-items: center; gap: 8px; font-weight: 400; color: var(--ink); }
  /* The exchanges, one card an intervention, the speaker's colour down its side: a list that scrolls past 520 px (440 on a phone). */
  #exchanges { --rr0-interview-max-height: 520px; --rr0-interview-line: var(--line-strong); }
  #exchanges .rr0-interview-turns { padding-right: 4px; }
  #exchanges .intervention { margin: 0 0 10px; padding: 6px 4px; border: 1px solid var(--line-strong); border-left: 3px solid var(--speaker); border-radius: 10px; background: var(--ground); }
  #exchanges .intervention:hover { background: var(--ground-sunken); }
  #exchanges .turn .who { display: inline-block; margin-bottom: 4px; padding: 1px 9px; border-radius: 999px; background: color-mix(in srgb, var(--speaker) 18%, transparent); color: var(--ink); font: 700 12px/1.5 var(--sans); }
  #exchanges .turn .said { font-size: 15px; line-height: 1.55; color: var(--ink); }
  #exchanges .turn .ref { border-color: var(--glow-dim); background: var(--warn-bg); color: var(--ink); font: 600 12px/1.6 var(--sans); padding: 1px 9px; }
  #exchanges .turn.flash { background: var(--warn-bg); }
  #exchanges .rr0-interview-status { padding: 8px 12px; border-radius: 8px; background: var(--warn-bg); color: var(--ink-dim); font-size: 13px; }
  #group-transcript > .row { margin-bottom: 12px; }
  @container (max-width: 640px) { #exchanges { --rr0-interview-max-height: 440px; } }
  ${InterviewPlayer.CSS}
  ${WindowClose.CSS}
  ${AddMenu.CSS}
  ${Icons.CSS}
  /* Who has proofread it, said once above the exchanges, with a box each to say they have (see renderReview); the reader's own line goes. */
  #exchanges .rr0-interview-status { display: none; }
  .review { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 16px; margin: 0 0 10px; padding: 10px 14px;
    border-radius: 10px; background: var(--warn-bg); font-size: 13px; color: var(--ink-dim); }
  .review[data-done] { background: var(--neutral-bg); }
  .review-boxes { display: flex; flex-wrap: wrap; gap: 14px; }
  .review-boxes label { display: inline-flex; align-items: center; gap: 6px; color: var(--ink); }
  .redact-row { display: flex; align-items: center; gap: 10px; margin: 0 0 10px; }
  .redact-note { font-size: 13px; color: var(--ink-faint); }
  .redact-note.error { color: var(--error); }
  /* Each turn: its time, which plays from there; what is taken out as a label that says how much, and puts it back while it is known. */
  #exchanges .turn { display: grid; grid-template-columns: 7.5em minmax(0, 1fr); column-gap: 14px; padding: 8px 10px; }
  #exchanges .turn > .turn-time { grid-row: 1; grid-column: 1; }
  #exchanges .turn > .who { grid-column: 1; align-self: start; }
  #exchanges .turn > :not(.who, .turn-time) { grid-column: 2; }
  #exchanges .turn > .said, #exchanges .turn > .redacted { grid-row: 1 / span 2; }
  #exchanges .turn.goes-on > .who, #exchanges .turn.is-redacted > .who { display: block; visibility: hidden; }
  /* The time is on the turn itself here: the reader's tooltip of it would say it twice. */
  #exchanges .turn[data-time]::after { content: none !important; display: none !important; }
  .turn-time { justify-self: start; min-height: 0; padding: 0; border: 0; background: none; color: var(--sky); font: 600 13px/1.4 var(--mono); cursor: pointer; }
  .turn-time:hover:not(:disabled) { background: none; text-decoration: underline; }
  #exchanges .bar.redacted-label { width: auto; height: auto; padding: 0 8px; border: 1px dashed var(--line-strong); border-radius: 999px; background: none; color: var(--ink-faint);
    font: 600 12px/1.6 var(--sans); vertical-align: baseline; cursor: default; }
  #exchanges .bar.redacted-label[data-restorable] { cursor: pointer; }
  #exchanges .bar.redacted-label[data-restorable]:hover { border-color: var(--glow-dim); color: var(--ink); }
  .turn-tools { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 4px 12px; margin-top: 6px; }
  .turn-tools button { min-height: 0; padding: 2px 4px; border: 0; background: none; color: var(--ink-faint); font: 600 13px/1.4 var(--sans); }
  .turn-tools button:hover:not(:disabled) { background: none; color: var(--ink); }
  .turn-tools .icon-btn { min-width: 0; }
  #exchanges .turn.current { background: var(--warn-bg); border-radius: 8px; }
  #exchanges .intervention:has(.turn.current) { border-color: var(--glow-dim); }
  #exchanges .turn .refs { align-items: center; }
  #exchanges .turn .ref { display: inline-block; max-width: calc(100% - 2em); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #exchanges .turn .ref .moment-letter { display: inline-grid; place-items: center; width: 1.4em; height: 1.4em; margin-right: 4px; border-radius: 50%; background: var(--glow-solid); color: var(--glow-on-solid); font: 700 11px/1 var(--sans); }
  #exchanges .turn .ref-unlink { min-height: 0; padding: 0 4px; border: 0; background: none; color: var(--ink-faint); font: 600 13px/1 var(--sans); }
  .turn-edit { display: flex; flex-direction: column; gap: 6px; }
  .turn-edit textarea { box-sizing: border-box; width: 100%; min-height: 6em; }
  .turn-edit .hint { font-size: 12px; color: var(--ink-faint); }
  .turn-edit .buttons { display: flex; gap: 8px; }
</style>
<div class="interview-app">
<!-- The player: what plays the interview's recordings, with who speaks along it (see InterviewPlayer). -->
<div id="player"></div>
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
  <div id="review" class="review" hidden></div>
  <div class="redact-row">
    <button id="redact-selection" type="button" class="pill-btn">Take out the selection</button>
    <span id="redact-note" class="redact-note" role="status"></span>
  </div>
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
</div>
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
  /** The player over the tabs (see InterviewPlayer). */
  private readonly player: InterviewPlayer
  /** The transcript as last drawn: what the exchanges' tools act on. */
  private drawn?: InterviewJson
  /**
   * What was taken out in this session, to put it back while the page stays: by `segment:nth` for a stretch (the nth taken out of that
   * segment), `segment:all` for a whole turn. Never written anywhere: the file published keeps no trace of it.
   */
  private readonly takenOut = new Map<string, string>()

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
    this.player = new InterviewPlayer(this.shadow.getElementById("player")!, {
      timeChanged: t => this.markCurrentTurn(t),
      recordingsChanged: recordings => void this.editTranscript(json => {
        if (recordings.length === 0) delete json.recordings
        else json.recordings = recordings
      })
    }, this.messages)
    this.shadow.getElementById("redact-selection")!.addEventListener("click", () => void this.redactSelection())
    // A press on a passage taken out puts it back, while its text is still known.
    this.shadow.getElementById("exchanges")!.addEventListener("click", event => {
      const bar = (event.target as HTMLElement).closest<HTMLElement>(".bar[data-restorable]")
      if (bar) void this.restore(bar.dataset.restorable!)
    })
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
    this.takenOut.clear()
    if (this.group === "file") void this.showTranscript()
    // Loaded whichever group is open, for the player over them — once the host has said, in the same breath, what it kept of it.
    queueMicrotask(() => { if (this.current === event) void this.showExchanges() })
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
    text("redact-selection", m.redactSelection)
    this.player?.setMessages(m)
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
    this.drawn = json
    this.player.show(json, this.current ? this.transcriptUrl(this.current) : undefined)
    this.renderReview(json)
    this.decorateExchanges(json)
  }

  // -- Editing the exchanges (see the design handoff, §5) --------------------------------------------------------------------------

  /**
   * Changes the transcript as `change` says, as an edit of the author's: the text the File group holds is written again (with the summary's
   * fields, as always), the host is told, and the exchanges and the player are drawn again from it.
   */
  private async editTranscript(change: (json: InterviewJson) => void): Promise<void> {
    const event = this.current
    if (!event || this.hasAttribute("readonly")) return
    const json = await this.transcriptJson(event) ?? JSON.parse(this.template(event)) as InterviewJson
    if (!Array.isArray(json.segments)) json.segments = []
    change(json)
    const text = InterviewEditorElement.pretty(InterviewEditorElement.withEventFields(json as unknown as Record<string, unknown>, event))
    this.fileEditor?.replaceText(text, false)
    this.onEdited(text)
  }

  /** What a passage taken out here is said to be: taken out at proofreading, in the reader's language. */
  private get redactReason(): SaidText {
    return this.said.write(undefined, this.messages.redactReason, this.language) ?? this.messages.redactReason
  }

  /** What a speaker is called: their name or initials, else their role. */
  private speakerLabel(json: InterviewJson, id: string): string {
    const name = InterviewFile.speakerName(json, id)
    const role = json.speakers?.[id]?.role
    return name === role && role in this.messages.roles ? this.messages.roles[role as keyof InterviewMessages["roles"]] : name
  }

  /** Who has not proofread the transcript yet, and a box each participant ticks once they have. */
  private renderReview(json: InterviewJson | undefined): void {
    const review = this.shadow.getElementById("review")!
    const ids = Object.keys(json?.speakers ?? {})
    review.hidden = !json || ids.length === 0
    if (!json || ids.length === 0) return
    const done = (id: string) => ["approved", "covered"].includes(json.proofreading?.[id]?.status ?? "")
    const waiting = ids.filter(id => !done(id))
    const text = document.createElement("span")
    text.textContent = waiting.length === 0 ? this.messages.proofreadAll : this.messages.proofreadPending.replace("{names}", waiting.map(id => this.speakerLabel(json, id)).join(", "))
    review.toggleAttribute("data-done", waiting.length === 0)
    const boxes = document.createElement("span")
    boxes.className = "review-boxes"
    for (const id of ids) {
      const label = document.createElement("label")
      const box = document.createElement("input")
      box.type = "checkbox"
      box.checked = done(id)
      box.disabled = this.hasAttribute("readonly")
      box.addEventListener("change", () => void this.editTranscript(next => {
        next.proofreading ??= {}
        if (box.checked) next.proofreading[id] = { status: "approved", date: new Date().toISOString().slice(0, 10) }
        else next.proofreading[id] = { status: "pending" }
      }))
      label.append(box, this.messages.reviewedBy.replace("{name}", this.speakerLabel(json, id)))
      boxes.append(label)
    }
    review.replaceChildren(text, boxes)
  }

  /** The moments the passages of the witness `speaker` can be linked to: those of the observation they are the observer of. */
  private momentsOf(json: InterviewJson, speaker: string): InterviewMoment[] {
    const of = json.speakers?.[speaker]?.of ?? InterviewFile.sightingsOf(json)[0]
    return this.options.find(witness => witness.id === of)?.moments ?? this.options.flatMap(witness => witness.moments ?? [])
  }

  /** Puts on each turn drawn what the editor does with it: its time, its passages taken out said, its links to moments named, and its tools. */
  private decorateExchanges(json: InterviewJson | undefined): void {
    if (!json) return
    const m = this.messages
    const readonly = this.hasAttribute("readonly")
    for (const turn of this.shadow.querySelectorAll<HTMLElement>("#exchanges .turn[data-segment]")) {
      const index = Number(turn.dataset.segment)
      const segment = json.segments[index]
      if (!segment) continue
      if (segment.start !== undefined) {
        const time = document.createElement("button")
        time.type = "button"
        time.className = "turn-time"
        time.textContent = InterviewFile.clock(segment.start)
        time.addEventListener("click", () => this.player.seek(segment.start!))
        turn.prepend(time)
      }
      // The passages taken out, in order: each says how much was, and can be put back while its text is known.
      const redactions = segment.redacted ? [segment.redacted] : InterviewEdits.partsOf(segment).flatMap(part => "redacted" in part ? [part.redacted] : [])
      turn.querySelectorAll<HTMLElement>(".bar").forEach((bar, nth) => {
        const words = redactions[nth]?.words
        bar.textContent = words !== undefined ? m.redactedWords.replace("{n}", String(words)) : m.redacted
        bar.classList.add("redacted-label")
        const key = segment.redacted ? `${index}:all` : `${index}:${nth}`
        if (this.takenOut.has(key)) bar.dataset.restorable = key
      })
      // The links to moments, named after the moment rather than its time, each with its own way out.
      const moments = this.momentsOf(json, segment.speaker)
      turn.querySelectorAll<HTMLButtonElement>(".ref").forEach((button, k) => {
        const ref = segment.refs?.[k]
        if (!ref) return
        const moment = moments.find(candidate => Math.abs(candidate.at - ref.at) < 0.05)
        if (moment) {
          const letter = document.createElement("span")
          letter.className = "moment-letter"
          letter.textContent = moment.label.slice(0, 2)
          button.replaceChildren(letter, m.momentLabel.replace("{k}", moment.label).replace("{text}", moment.note ?? InterviewFile.clock(ref.at)))
        }
        if (readonly) return
        const unlink = document.createElement("button")
        unlink.type = "button"
        unlink.className = "ref-unlink"
        unlink.textContent = "×"
        unlink.title = m.unlinkMoment
        unlink.setAttribute("aria-label", m.unlinkMoment)
        unlink.addEventListener("click", () => void this.editTranscript(next => {
          next.segments[index].refs?.splice(k, 1)
          if (next.segments[index].refs?.length === 0) delete next.segments[index].refs
        }))
        button.after(unlink)
      })
      if (!readonly) turn.append(this.turnTools(json, index, segment, moments))
    }
  }

  /** What can be done to a turn: link it to a moment (a witness's), edit it as text, take it all out or back, delete it. */
  private turnTools(json: InterviewJson, index: number, segment: InterviewSegment, moments: InterviewMoment[]): HTMLElement {
    const m = this.messages
    const tools = document.createElement("div")
    tools.className = "turn-tools"
    const button = (label: string, act: () => void): HTMLButtonElement => {
      const element = document.createElement("button")
      element.type = "button"
      element.textContent = label
      element.addEventListener("click", act)
      return element
    }
    if (json.speakers?.[segment.speaker]?.role === "witness" && !segment.redacted) {
      const link = button(m.linkMoment, () => undefined)
      // In its place first: the menu is put beside its button.
      tools.append(link)
      const menu = new AddMenu(link, `moment-menu-${index}`, at => void this.editTranscript(next => {
        const refs = next.segments[index].refs ?? []
        if (!refs.some(ref => Math.abs(ref.at - Number(at)) < 0.05)) refs.push({ at: Number(at) })
        next.segments[index].refs = refs
      }), at => `moment-${index}-${at}`)
      menu.setKinds(moments.length > 0
        ? moments.map(moment => ({ value: String(moment.at), label: m.momentLabel.replace("{k}", moment.label).replace("{text}", moment.note ?? InterviewFile.clock(moment.at)) }))
        : [{ value: "", label: m.noMoments, disabledReason: m.noMoments }])
    }
    if (!segment.redacted) tools.append(button(m.editTurn, () => this.editTurn(index)))
    const restorable = this.takenOut.has(`${index}:all`) || [...this.takenOut.keys()].some(key => key.startsWith(`${index}:`))
    if (segment.redacted || (segment.parts && restorable)) {
      const back = button(m.restoreAll, () => void this.restoreAll(index))
      back.disabled = !restorable
      tools.append(back)
    } else {
      tools.append(button(m.redactAll, () => void this.editTranscript(next => {
        this.forget(index)
        this.takenOut.set(`${index}:all`, InterviewEdits.redactWhole(next.segments[index], this.redactReason))
      })))
    }
    const remove = button("", () => void this.editTranscript(next => {
      next.segments.splice(index, 1)
      this.shiftTakenOut(index)
    }))
    remove.className = "icon-btn"
    remove.innerHTML = Icons.TRASH
    remove.title = m.deleteTurn
    remove.setAttribute("aria-label", m.deleteTurn)
    tools.append(remove)
    return tools
  }

  /** Takes out the words selected in one passage said (see InterviewEdits.redact), or says why it cannot. */
  private async redactSelection(): Promise<void> {
    const m = this.messages
    const note = this.shadow.getElementById("redact-note")!
    const say = (text: string, error = false) => {
      note.textContent = text
      note.classList.toggle("error", error)
    }
    const selection = (this.shadow as ShadowRoot & { getSelection?: () => Selection | null }).getSelection?.() ?? document.getSelection()
    const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : undefined
    if (!range || range.collapsed) {
      say(m.selectionNone)
      return
    }
    const element = (node: Node) => (node instanceof Element ? node : node.parentElement)
    const said = element(range.startContainer)?.closest<HTMLElement>(".said")
    if (!said || element(range.endContainer)?.closest(".said") !== said || element(range.startContainer)?.closest(".bar") || element(range.endContainer)?.closest(".bar")) {
      say(m.selectionOnePassage, true)
      return
    }
    const index = Number(said.closest<HTMLElement>(".turn")!.dataset.segment)
    const from = InterviewEditorElement.offsetIn(said, range.startContainer, range.startOffset)
    const to = InterviewEditorElement.offsetIn(said, range.endContainer, range.endOffset)
    let done = false
    await this.editTranscript(json => {
      const taken = InterviewEdits.redact(json.segments[index], Math.min(from, to), Math.max(from, to), this.redactReason)
      if (!taken) return
      done = true
      this.shiftParts(index, taken.nth)
      this.takenOut.set(`${index}:${taken.nth}`, taken.text)
    })
    selection?.removeAllRanges()
    say(done ? "" : m.selectionOnePassage, !done)
  }

  /** Where `node`'s `offset` falls in what `said` shows, counted as the reader's text is (the labels of passages taken out are no text of it). */
  private static offsetIn(said: HTMLElement, node: Node, offset: number): number {
    let at = 0
    const walker = document.createTreeWalker(said, NodeFilter.SHOW_TEXT, {
      acceptNode: text => (text.parentElement?.closest(".bar") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT)
    })
    for (let text = walker.nextNode(); text; text = walker.nextNode()) {
      if (text === node) return at + offset
      if (node.contains(text) && node !== text) {
        const children = [...node.childNodes]
        const before = children.slice(0, offset)
        return at + before.reduce((sum, child) => sum + (child instanceof Element && child.closest(".bar") ? 0 : (child.textContent ?? "").length), 0)
      }
      at += (text.textContent ?? "").length
    }
    return at
  }

  /** Puts back what `key` (see takenOut) says was taken out. */
  private async restore(key: string): Promise<void> {
    const kept = this.takenOut.get(key)
    if (kept === undefined) return
    const [segment, nth] = key.split(":")
    const index = Number(segment)
    await this.editTranscript(json => {
      if (nth === "all") InterviewEdits.restoreWhole(json.segments[index], kept)
      else {
        InterviewEdits.restorePart(json.segments[index], Number(nth), kept)
        this.shiftParts(index, Number(nth), -1)
      }
      this.takenOut.delete(key)
    })
  }

  /** Puts back all that is known of what was taken out of turn `index`. */
  private async restoreAll(index: number): Promise<void> {
    if (this.takenOut.has(`${index}:all`)) {
      await this.restore(`${index}:all`)
      return
    }
    const parts = [...this.takenOut.keys()].filter(key => key.startsWith(`${index}:`)).map(key => Number(key.split(":")[1])).sort((a, b) => b - a)
    for (const nth of parts) await this.restore(`${index}:${nth}`)
  }

  /** The turn `index` as raw text, `⟦ … ⟧` for what is taken out, to edit in place of what it says. */
  private editTurn(index: number): void {
    const json = this.drawn
    const segment = json?.segments[index]
    const said = this.shadow.querySelector<HTMLElement>(`#exchanges .turn[data-segment="${index}"] .said`)
    if (!segment || !said) return
    const m = this.messages
    const box = document.createElement("div")
    box.className = "turn-edit"
    const area = document.createElement("textarea")
    area.value = InterviewEdits.raw(segment, nth => this.takenOut.get(`${index}:${nth}`))
    const hint = document.createElement("span")
    hint.className = "hint"
    hint.textContent = m.turnEditHint
    const buttons = document.createElement("div")
    buttons.className = "buttons"
    const save = document.createElement("button")
    save.type = "button"
    save.className = "pill-btn primary"
    save.textContent = m.saveTurn
    save.addEventListener("click", () => void this.editTranscript(next => {
      const removed = InterviewEdits.fromRaw(next.segments[index], area.value, this.redactReason)
      this.forget(index)
      for (const [nth, text] of removed) this.takenOut.set(`${index}:${nth}`, text)
    }))
    const cancel = document.createElement("button")
    cancel.type = "button"
    cancel.className = "pill-btn"
    cancel.textContent = m.cancelTurn
    cancel.addEventListener("click", () => this.drawExchanges(this.drawn))
    buttons.append(save, cancel)
    box.append(area, hint, buttons)
    said.replaceWith(box)
    area.focus()
  }

  /** Forgets what was taken out of turn `index`. */
  private forget(index: number): void {
    for (const key of [...this.takenOut.keys()]) if (key.startsWith(`${index}:`)) this.takenOut.delete(key)
  }

  /** A passage taken out (or put back, `by` -1) at `nth` of turn `index` moves those after it by one. */
  private shiftParts(index: number, nth: number, by = 1): void {
    const moved = [...this.takenOut].filter(([key]) => key.startsWith(`${index}:`) && key !== `${index}:all` && Number(key.split(":")[1]) >= nth + (by < 0 ? 1 : 0))
    for (const [key] of moved) this.takenOut.delete(key)
    for (const [key, text] of moved) this.takenOut.set(`${index}:${Number(key.split(":")[1]) + by}`, text)
  }

  /** Turn `index` was deleted: what was taken out of it goes, and of those after it moves up by one. */
  private shiftTakenOut(index: number): void {
    const entries = [...this.takenOut]
    this.takenOut.clear()
    for (const [key, text] of entries) {
      const [segment, nth] = key.split(":")
      const at = Number(segment)
      if (at < index) this.takenOut.set(key, text)
      else if (at > index) this.takenOut.set(`${at - 1}:${nth}`, text)
    }
  }

  /** The turn being said at `t` seconds of the transcript is marked, and kept in view in the list while it plays. */
  private markCurrentTurn(t: number): void {
    const segments = this.drawn?.segments ?? []
    let current = -1
    segments.forEach((segment, index) => { if (segment.start !== undefined && segment.start <= t) current = index })
    for (const turn of this.shadow.querySelectorAll<HTMLElement>("#exchanges .turn.current")) turn.classList.remove("current")
    const turn = this.shadow.querySelector<HTMLElement>(`#exchanges .turn[data-segment="${current}"]`)
    if (!turn) return
    turn.classList.add("current")
    const list = turn.closest<HTMLElement>(".rr0-interview-turns")
    if (list && (turn.offsetTop < list.scrollTop || turn.offsetTop > list.scrollTop + list.clientHeight - turn.offsetHeight)) {
      list.scrollTo({ top: turn.offsetTop - list.clientHeight / 3, behavior: "smooth" })
    }
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
  private static readonly ORDER = ["version", "id", "language", "title", "time", "medium", "by", "interviewOf", "summary", "speakers", "transcription", "proofreading", "anonymization", "recordings", "segments"]

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
    void this.showExchanges()
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
