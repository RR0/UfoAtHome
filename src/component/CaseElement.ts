import { CaseFile } from "../engine/persistence/caseJson.js"
import type { CaseEventJson, CaseJson } from "../engine/persistence/caseJson.js"
import { SightingFetch } from "../engine/net/SightingFetch.js"
import { SaidTexts } from "../engine/model/SaidText.js"
import type { SaidText } from "../engine/model/SaidText.js"
import type { AgentRef } from "../engine/interpretation/Interpretation.js"
import { HostLocale, selectLocale } from "../i18n/locale.js"
import { loadCaseMessages, UFO_SUPPORTED_LANGUAGES } from "./messages/index.js"
import type { UfoLanguage } from "./messages/index.js"
import type { CaseMessages } from "./messages/CaseMessages.js"
import { Icons } from "./Icons.js"
import { INTERVIEW_SEEK_EVENT } from "./interviewEvents.js"
import { CASE_NAMED_ATTRIBUTE, OBSERVER_ATTRIBUTE, OBSERVER_CHANGE_EVENT, SIGHTING_ELEMENT_NAME, registerSighting } from "./SightingElement.js"
import type { SightingElement } from "./SightingElement.js"
import { caseHtml, caseCss } from "./caseTemplate.js"

export const CASE_ELEMENT_NAME = "rr0-case"

/** One event of the case, as the reader shows it: what the case says of it, and nothing fetched. */
interface CaseEntry {
  event: CaseEventJson
  kind: "observation" | "reading" | "interview"
  /** Where its own file is, absolute: a recording for an observation or a reading, a transcript for an interview. */
  url?: string
  title: string
  /** When it was, as the case writes it. */
  when: string
}

/**
 * A case, read.
 *
 * The reader's half of the pair the editor already had: `<rr0-case>` is to `<rr0-case-editor>` what
 * `<rr0-sighting>` is to `<rr0-sighting-editor>`. It shows what the case holds — its name, and its
 * events in the order of time — and whichever one is being read: an observation or a reading in the
 * player it wraps, an interview in the dialogue reader. Nothing here writes: what a reader cannot
 * change is not shown greyed out, it is not shown at all, and the way to change it is the one button
 * that leads to the editor on the very event being read.
 *
 * It owns the case; the player it wraps owns one observation. That boundary is why this element
 * exists: `<rr0-sighting>` reads a case.json too (an older, published way of showing all of a case's
 * witnesses, which still works), but a case's chronology, its interviews and its readings are the
 * case's own matter.
 */
export class CaseElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ["src", "show-labels", OBSERVER_ATTRIBUTE]
  }

  private readonly shadow: ShadowRoot
  private readonly stage: SightingElement
  private readonly interviewHost: HTMLElement
  private readonly eventList: HTMLElement
  private messages?: CaseMessages
  private said = new SaidTexts(["en"])
  private json?: CaseJson
  private url?: string
  private entries: CaseEntry[] = []
  /** What is being read: an event of the case, by its place in `entries`. */
  private at = 0

  constructor() {
    super()
    this.shadow = this.attachShadow({ mode: "open" })
    const style = document.createElement("style")
    style.textContent = caseCss
    const frame = document.createElement("div")
    frame.innerHTML = caseHtml
    this.shadow.append(style, frame)
    registerSighting()
    this.stage = document.createElement(SIGHTING_ELEMENT_NAME) as SightingElement
    // This element names the case above it: the player would otherwise say it a second time on its own toolbar.
    this.stage.setAttribute(CASE_NAMED_ATTRIBUTE, "")
    this.byId("stage-box").append(this.stage)
    this.eventList = this.byId("case-events")
    this.interviewHost = this.byId("interview-host")
    // What the page around it listens for, as it would on the player itself: the wrapper is not a wall.
    this.stage.addEventListener(OBSERVER_CHANGE_EVENT, event => {
      this.dispatchEvent(new CustomEvent(OBSERVER_CHANGE_EVENT, { detail: (event as CustomEvent).detail }))
    })
    // A passage of a dialogue that tells of a moment of the observation takes the player to it.
    this.interviewHost.addEventListener(INTERVIEW_SEEK_EVENT, event => {
      const { at, sighting } = (event as CustomEvent<{ at: number, sighting?: string }>).detail
      const observation = this.entries.findIndex(entry => entry.kind !== "interview"
        && (entry.event.id === sighting || entry.url?.endsWith(`/${String(sighting)}.json`)))
      if (observation >= 0) this.read(observation)
      this.stage.seekTo(at, sighting)
    })
    this.byId("edit").addEventListener("click", () => {
      const where = this.editorUrl()
      if (where) window.open(where, "_blank", "noopener")
    })
  }

  private byId(id: string): HTMLElement {
    return this.shadow.getElementById(id)!
  }

  connectedCallback(): void {
    void this.loadMessages()
    const src = this.getAttribute("src")
    // Said on the console rather than swallowed: a case that cannot be read leaves an empty frame, which says nothing by itself.
    if (src) void this.load(src).catch(error => console.warn(`<${CASE_ELEMENT_NAME}> could not read ${src}:`, error))
  }

  attributeChangedCallback(name: string, old: string | null, value: string | null): void {
    if (!this.isConnected || value === old) return
    if (name === "src" && value) void this.load(value)
    else if (value === null) this.stage.removeAttribute(name)
    else this.stage.setAttribute(name, value)
  }

  private async loadMessages(): Promise<void> {
    const language = selectLocale(HostLocale.preferencesFor(this), UFO_SUPPORTED_LANGUAGES) as UfoLanguage
    this.said = new SaidTexts([language, "en"])
    this.messages = await loadCaseMessages(language)
    this.draw()
  }

  /** The case at `url`, and the player pointed at the same file: it lists the case's recordings itself. */
  async load(url: string): Promise<void> {
    this.url = new URL(url, location.href).href
    // By its full address, as the recordings it lists will be: the same case works read from its dossier's page and from anywhere else.
    const json = await SightingFetch.recording(this.url) as CaseJson
    if (!CaseFile.isCase(json)) throw new Error(`${url} is not a case: <${CASE_ELEMENT_NAME}> reads a case.json`)
    this.json = json
    this.entries = (json.events ?? []).map(event => this.entryOf(event)).filter((entry): entry is CaseEntry => entry !== undefined)
      .sort((a, b) => a.when.localeCompare(b.when))
    this.at = Math.max(0, this.entries.findIndex(entry => entry.kind !== "interview"))
    this.stage.setAttribute("src", this.url)
    this.draw()
  }

  private entryOf(event: CaseEventJson): CaseEntry | undefined {
    if (typeof event.url !== "string" || event.url === "") return undefined
    const kind = event.eventType === CaseFile.INTERVIEW_EVENT ? "interview"
      : event.eventType === CaseFile.SIGHTING_EVENT ? (event.interpretationOf === undefined ? "observation" : "reading")
        : undefined
    if (!kind) return undefined
    return {
      event, kind,
      url: new URL(event.url, this.url ?? location.href).href,
      title: this.said.read(event.title as SaidText | undefined) ?? event.id ?? "",
      when: String(event.time ?? "")
    }
  }

  /** What the player and the editor are pointed at: the event being read, when it has a recording. */
  private get reading(): CaseEntry | undefined {
    return this.entries[this.at]
  }

  private editorUrl(): string | undefined {
    if (!this.url) return undefined
    const editor = new URL("/edit/", location.href)
    editor.searchParams.set("file", this.url)
    const read = this.reading
    if (read?.url && read.kind !== "interview") editor.searchParams.set("track", read.url)
    return editor.href
  }

  /** Reads the event at `at`: an observation or a reading in the player, an interview in the dialogue reader. */
  private read(at: number): void {
    const entry = this.entries[at]
    if (!entry) return
    this.at = at
    if (entry.kind === "interview") void this.showInterview(entry)
    else {
      this.interviewHost.replaceChildren()
      this.byId("interview-box").hidden = true
      // By the id the case gives it, else by its file: what the player takes to pick one of a case's recordings.
      this.stage.setAttribute(OBSERVER_ATTRIBUTE, entry.event.id ?? entry.url ?? "")
    }
    this.draw()
  }

  /** The dialogue of an interview, its reader fetched only now: a case nobody opens an interview in never loads it. */
  private async showInterview(entry: CaseEntry): Promise<void> {
    if (!entry.url) return
    this.byId("interview-box").hidden = false
    const { register } = await import("./InterviewElement.js")
    register()
    const reader = document.createElement("rr0-interview")
    reader.setAttribute("src", entry.url)
    this.interviewHost.replaceChildren(reader)
  }

  /** The names an event's authors go by, the last two joined by the language's own word. */
  private authors(by: AgentRef[] | undefined): string {
    const m = this.messages
    const names = (by ?? []).map(agent => "people" in agent ? agent.people : "org" in agent ? agent.org
      : (this.said.read((agent as { title?: unknown }).title as SaidText | undefined) ?? "")).filter(name => name !== "")
    if (names.length < 2 || !m) return names.join(", ")
    return `${names.slice(0, -1).join(", ")} ${m.linkAnd} ${names[names.length - 1]}`
  }

  /** The events the entry at `at` names: what a reading reads, what an observation was told in. */
  private linkedTo(entry: CaseEntry): { heading: string, to: number[] } | undefined {
    const m = this.messages
    if (!m) return undefined
    if (entry.kind === "reading") {
      const ids = [entry.event.interpretationOf].flat().filter((id): id is string => id !== undefined)
      const to = this.entries.map((other, index) => ids.includes(other.event.id ?? "") ? index : -1).filter(index => index >= 0)
      return to.length > 0 ? { heading: m.interpretationOf, to } : undefined
    }
    if (entry.kind === "observation") {
      const to = this.entries.map((other, index) => other.kind === "interview"
        && [other.event.interviewOf].flat().includes(entry.event.id) ? index : -1).filter(index => index >= 0)
      return to.length > 0 ? { heading: m.passagesHeading, to } : undefined
    }
    return undefined
  }

  private draw(): void {
    const m = this.messages
    const json = this.json
    if (!m || !json) return
    this.byId("case-kind").textContent = m.caseHeading
    this.byId("case-title").textContent = this.said.read(json.title as SaidText | undefined) ?? json.id ?? ""
    const summary = this.said.read((json as { summary?: unknown }).summary as SaidText | undefined) ?? ""
    const summaryElement = this.byId("case-summary")
    summaryElement.textContent = summary
    summaryElement.hidden = summary === ""
    this.byId("events-heading").textContent = m.eventsHeading
    const edit = this.byId("edit")
    edit.textContent = m.editCase
    edit.title = m.editCase
    this.eventList.replaceChildren(...this.entries.map((entry, index) => this.card(entry, index, m)))
  }

  private card(entry: CaseEntry, index: number, m: CaseMessages): HTMLElement {
    const item = document.createElement("li")
    item.className = "event"
    item.dataset.kind = entry.kind
    item.dataset.at = String(index)
    if (index === this.at) item.dataset.reading = ""
    const mark = document.createElement("span")
    mark.className = "event-mark"
    mark.innerHTML = { observation: Icons.WITNESS, reading: Icons.SUMMARY, interview: Icons.INTERVIEW }[entry.kind]
    mark.setAttribute("aria-hidden", "true")
    const pill = document.createElement("span")
    pill.className = "kind-pill"
    pill.dataset.kind = entry.kind
    pill.textContent = { observation: m.kindObservation, reading: m.kindReading, interview: m.kindInterview }[entry.kind]
    const open = document.createElement("button")
    open.type = "button"
    open.className = "event-open"
    open.textContent = entry.title
    open.title = m.openEvent
    open.addEventListener("click", () => this.read(index))
    const meta = document.createElement("span")
    meta.className = "event-meta"
    meta.textContent = entry.when.replace("T", " ")
    const links = document.createElement("span")
    links.className = "event-links"
    const linked = this.linkedTo(entry)
    if (linked) {
      links.append(`${linked.heading} `, ...linked.to.flatMap((to, rank) => {
        const link = document.createElement("button")
        link.type = "button"
        link.className = "event-ref"
        link.textContent = this.entries[to].title
        link.title = m.openEvent
        link.addEventListener("click", () => this.read(to))
        return rank === 0 ? [link] : [document.createTextNode(` ${m.linkAnd} `), link]
      }))
    }
    const by = entry.kind === "observation" ? "" : this.authors(entry.event.by)
    if (by !== "") links.append(`${linked ? " " : ""}${m.byAuthor} ${by}`)
    const body = document.createElement("div")
    body.className = "event-body"
    body.append(pill, open, meta, links)
    item.append(mark, body)
    return item
  }

  /** The recording the player is showing: what a page around this element reads, as it would off the player. */
  get sightingData(): unknown {
    return this.stage.sightingData
  }

  /** The player it wraps, for a page that has to reach it (the share dialog, a start time). */
  get player(): SightingElement {
    return this.stage
  }
}

export function register(): void {
  if (!customElements.get(CASE_ELEMENT_NAME)) customElements.define(CASE_ELEMENT_NAME, CaseElement)
}
