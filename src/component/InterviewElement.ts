import type { CaseEventJson } from "../engine/persistence/caseJson.js"
import type { AgentRef } from "../engine/interpretation/Interpretation.js"
import { SaidTexts } from "../engine/model/SaidText.js"
import type { SaidText } from "../engine/model/SaidText.js"
import { HostLocale, selectLocale } from "../i18n/locale.js"
import { loadInterviewMessages, UFO_SUPPORTED_LANGUAGES } from "./messages/index.js"
import type { UfoLanguage } from "./messages/index.js"
import type { InterviewMessages } from "./messages/InterviewMessages.js"
import { interviewMessages_en } from "./messages/InterviewMessages_en.js"

export const INTERVIEW_ELEMENT_NAME = "rr0-interview"

/** Sent, and bubbling, each time the interview is edited: what changed is the event the element holds, in place. */
export const INTERVIEW_CHANGE_EVENT = "interviewchange"

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
  .row { display: flex; align-items: center; gap: .5em; flex-wrap: wrap; margin-bottom: .5em; }
  label { display: flex; align-items: center; gap: .4em; }
  label.wide { flex: 1 1 100%; align-items: flex-start; }
  label.wide textarea { flex: 1 1 auto; min-width: 0; min-height: 9em; font: inherit; }
  input[type="text"] { min-width: 0; }
  label.fill { flex: 1 1 100%; }
  label.fill input { flex: 1 1 auto; }
  #by { width: 16em; }
  select { min-width: 0; max-width: 100%; text-overflow: ellipsis; }
</style>
<div class="row">
  <label class="fill"><span id="label-title">Title</span> <input id="title" type="text"/></label>
</div>
<div class="row">
  <label><span id="label-witness">Witness</span> <select id="witness"></select></label>
  <label><span id="label-time">When</span> <input id="time" type="text" size="16" placeholder="2026-10-13 21:27"/></label>
  <label><span id="label-by">Interviewer</span> <input id="by" type="text" autocomplete="off" spellcheck="false"/></label>
</div>
<div class="row">
  <label class="fill"><span id="label-url">Transcript</span> <input id="url" type="text" autocomplete="off" spellcheck="false" placeholder="interview-….json"/></label>
</div>
<div class="row">
  <label class="wide"><span id="label-summary">What it established</span> <textarea id="summary"></textarea></label>
</div>
`

/**
 * An interview of a case, as an event of type `interview` (see CaseFile.INTERVIEW_EVENT): who held it, with which witness, when, and what
 * it established. The counterpart, in a case, of what `<rr0-sighting-editor>` is for an observer's account: where the case editor shows an
 * account it puts that editor, where it shows an interview it puts this element.
 *
 * It edits the event it is given in place (`event`), and says so with an `interviewchange` event; it keeps no copy. `witnesses` are the case's
 * observers, one of which the interview is `interviewOf`. Its `url`, optional, is the transcript file of the interview (see InterviewJson), anonymised:
 * what the case publishes of what was said. With the `readonly` attribute it only shows.
 *
 * Titles and summaries are text that may be said in several languages (see SaidText): what is typed is written in the reader's language and
 * the other languages stay as they were.
 */
export class InterviewElement extends HTMLElement {
  private readonly shadow = this.attachShadow({ mode: "open" })
  private messages: InterviewMessages = interviewMessages_en
  private said = new SaidTexts(["en"])
  private language: UfoLanguage = "en"
  private localeToken = 0
  private current?: InterviewEvent
  private options: InterviewWitness[] = []

  constructor() {
    super()
    this.shadow.innerHTML = TEMPLATE
    for (const id of ["title", "time", "by", "url", "summary", "witness"]) {
      this.shadow.getElementById(id)!.addEventListener(id === "witness" ? "change" : "input", () => this.write(id))
    }
  }

  static get observedAttributes(): string[] {
    return ["readonly"]
  }

  attributeChangedCallback(): void {
    this.applyReadonly()
  }

  connectedCallback(): void {
    void this.loadLocale()
  }

  /** The event of the case shown, edited in place. */
  get event(): InterviewEvent | undefined {
    return this.current
  }

  set event(event: InterviewEvent | undefined) {
    this.current = event
    this.render()
  }

  /** The observers an interview may be held with. */
  set witnesses(witnesses: InterviewWitness[]) {
    this.options = witnesses
    this.render()
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
    this.field("witness").disabled = readonly
  }

  /** What `by` says as one line: the ids of the people, the names of the organizations, separated by commas. */
  static byText(by: AgentRef[] | undefined): string {
    return (by ?? []).map(agent => "people" in agent ? agent.people : "org" in agent ? agent.org : (agent as { title?: string }).title ?? "")
      .filter(name => name !== "").join(", ")
  }

  private render(): void {
    const m = this.messages
    const text = (id: string, value: string): void => { this.shadow.getElementById(id)!.textContent = value }
    text("label-title", m.title)
    text("label-witness", m.witness)
    text("label-time", m.time)
    text("label-by", m.by)
    text("label-summary", m.summary)
    text("label-url", m.transcript)
    this.field("url").title = m.transcriptHint
    this.field("by").title = m.byHint
    const event = this.current
    const active = this.shadow.activeElement
    const set = (id: string, value: string): void => { if (this.field(id) !== active) this.field(id).value = value }
    set("title", this.said.read(event?.title as SaidText | undefined) ?? "")
    set("time", event?.time ?? "")
    set("by", InterviewElement.byText(event?.by))
    set("url", event?.url ?? "")
    set("summary", this.said.read(event?.summary) ?? "")
    const select = this.shadow.getElementById("witness") as HTMLSelectElement
    const named = [event?.interviewOf].flat().find((id): id is string => typeof id === "string")
    select.replaceChildren(new Option(m.witnessNone, ""), ...this.options.map(witness => new Option(witness.label, witness.id)))
    // A witness the case does not list is kept as it is rather than silently dropped.
    if (named !== undefined && !this.options.some(witness => witness.id === named)) select.append(new Option(named, named))
    select.value = named ?? ""
    this.applyReadonly()
  }

  /** What was typed goes to the event, as it was typed; an emptied field is not kept. */
  private write(id: string): void {
    const event = this.current
    if (!event) return
    const value = this.field(id).value
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
      case "witness":
        if (value === "") delete event.interviewOf
        else event.interviewOf = value
        break
    }
    this.dispatchEvent(new CustomEvent(INTERVIEW_CHANGE_EVENT, { bubbles: true, composed: true, detail: { field: id, event } }))
  }
}

export function register(): void {
  if (!customElements.get(INTERVIEW_ELEMENT_NAME)) customElements.define(INTERVIEW_ELEMENT_NAME, InterviewElement)
}
