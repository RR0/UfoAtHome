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
import { TIME_CHANGE_EVENT } from "./UfoElement.js"
import { CASE_NAMED_ATTRIBUTE, HIDE_PICKERS_ATTRIBUTE, OBSERVER_ATTRIBUTE, OBSERVER_CHANGE_EVENT, SHOW_INFO_ATTRIBUTE, SIGHTING_ELEMENT_NAME, registerSighting } from "./SightingElement.js"
import type { SightingElement } from "./SightingElement.js"
import { caseHtml, caseCss } from "./caseTemplate.js"

export const CASE_ELEMENT_NAME = "rr0-case"
/** Whether the chronology is shown from the start: on unless the page says `show-timeline="false"`. What is open stays open either way. */
export const SHOW_TIMELINE_ATTRIBUTE = "show-timeline"
/** What a page wants open from the start: `all`, every event the case holds. Absent, the case opens on its first observation. */
export const OPEN_EVENTS_ATTRIBUTE = "open-events"

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
    return ["src", "show-labels", SHOW_INFO_ATTRIBUTE, SHOW_TIMELINE_ATTRIBUTE, OPEN_EVENTS_ATTRIBUTE, OBSERVER_ATTRIBUTE]
  }

  /** The options a page sets on this element and that its players wear too: what to show from the start. */
  private static readonly PASSED_ON = ["show-labels", SHOW_INFO_ATTRIBUTE] as const

  private readonly shadow: ShadowRoot
  private readonly openEvents: HTMLElement
  private readonly eventList: HTMLElement
  /** What is open, by the event's place in `entries`: the element showing it, a player or a dialogue reader. */
  private readonly shown = new Map<number, HTMLElement>()
  private messages?: CaseMessages
  private said = new SaidTexts(["en"])
  private json?: CaseJson
  private url?: string
  private entries: CaseEntry[] = []

  constructor() {
    super()
    this.shadow = this.attachShadow({ mode: "open" })
    const style = document.createElement("style")
    style.textContent = caseCss
    const frame = document.createElement("div")
    frame.innerHTML = caseHtml
    this.shadow.append(style, frame)
    registerSighting()
    this.eventList = this.byId("case-events")
    this.openEvents = this.byId("open-events")
    // A passage of a dialogue that tells of a moment of an observation takes that observation there, opening it if it was shut.
    this.openEvents.addEventListener(INTERVIEW_SEEK_EVENT, event => {
      const { at, sighting } = (event as CustomEvent<{ at: number, sighting?: string }>).detail
      void this.seekObservation(at, sighting)
    })
    // The other way round: while a replay runs, the dialogues open beside it follow it, each showing the passage that tells of where it
    // stands. Only when that passage changes, so that reading one is not a scroll that never settles.
    this.openEvents.addEventListener(TIME_CHANGE_EVENT, event => {
      const block = (event.target as HTMLElement | null)?.closest?.(".open-event") as HTMLElement | null
      this.followReplay(block ?? undefined)
    })
    this.byId("edit").addEventListener("click", () => {
      const where = this.editorUrl()
      if (where) window.open(where, "_blank", "noopener")
    })
    const info = this.byId("info")
    info.addEventListener("click", () => this.showSummary(this.byId("case-summary").hidden))
    this.byId("timeline-button").addEventListener("click", () => {
      this.showTimeline(this.byId("case-events").parentElement!.hidden)
    })
  }

  private byId(id: string): HTMLElement {
    return this.shadow.getElementById(id)!
  }

  /** Shows what the case says of itself, or hides it: what the i asks for, and what `show-info` asks for from the start. */
  private showSummary(shown: boolean): void {
    this.byId("case-summary").hidden = !shown
    this.byId("info").setAttribute("aria-expanded", String(shown))
  }

  /**
   * Shows the history, or hides it: what is open stays open and visible, the list of what could be opened is what goes.
   *
   * The players follow: while the history is there, it is the way through the case, and a player repeating it in its own toolbar — the
   * picker of witnesses, the picker of readings — would offer the same choice twice. Hidden, they are the only way left, so they come back.
   */
  private showTimeline(shown: boolean): void {
    this.byId("case-events").parentElement!.hidden = !shown
    this.byId("timeline-button").setAttribute("aria-pressed", String(shown))
    for (const player of this.players()) player.toggleAttribute(HIDE_PICKERS_ATTRIBUTE, shown)
  }

  connectedCallback(): void {
    void this.loadMessages()
    this.showTimeline(this.getAttribute(SHOW_TIMELINE_ATTRIBUTE) !== "false")
    this.showSummary(this.hasAttribute(SHOW_INFO_ATTRIBUTE))
    const src = this.getAttribute("src")
    // Said on the console rather than swallowed: a case that cannot be read leaves an empty frame, which says nothing by itself.
    if (src) void this.load(src).catch(error => console.warn(`<${CASE_ELEMENT_NAME}> could not read ${src}:`, error))
  }

  attributeChangedCallback(name: string, old: string | null, value: string | null): void {
    if (!this.isConnected || value === old) return
    if (name === "src" && value) void this.load(value)
    else if (name === SHOW_TIMELINE_ATTRIBUTE) this.showTimeline(value !== "false")
    else if (name === OPEN_EVENTS_ATTRIBUTE) {
      if (value === "all") for (let at = 0; at < this.entries.length; at++) void this.open(at)
    }
    // Passed on to every player open, and to the next one opened (see open): the host says it of the case, not of one recording.
    else for (const player of this.players()) {
      if (value === null) player.removeAttribute(name)
      else player.setAttribute(name, value)
    }
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
    this.shown.clear()
    this.openEvents.replaceChildren()
    this.draw()
    // Everything at once where the page asked for it (a demo of a case shows all of it), else the first observation, as the editor opens
    // on one: a case shown with nothing in it says nothing.
    if (this.getAttribute(OPEN_EVENTS_ATTRIBUTE) === "all") {
      for (let at = 0; at < this.entries.length; at++) await this.open(at)
      return
    }
    const first = this.entries.findIndex(entry => entry.kind !== "interview")
    if (first >= 0) void this.open(first)
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

  /** What the editor is pointed at: the first recording open, else the case alone. */
  private get reading(): CaseEntry | undefined {
    const open = [...this.shown.keys()].sort((a, b) => a - b).map(at => this.entries[at])
    return open.find(entry => entry?.kind !== "interview")
  }

  private editorUrl(): string | undefined {
    if (!this.url) return undefined
    const editor = new URL("/edit/", location.href)
    editor.searchParams.set("file", this.url)
    const read = this.reading
    if (read?.url && read.kind !== "interview") editor.searchParams.set("track", read.url)
    return editor.href
  }

  /** Opens the event at `at`, or shuts it: what is open is shown below, in the order of time, however many there are. */
  private async toggle(at: number): Promise<void> {
    if (this.shown.has(at)) this.shut(at)
    else await this.open(at)
  }

  /**
   * Shows the event at `at` under the chronology: a recording in a player of its own, an interview in the dialogue reader, which is
   * fetched only now. Several events stay open together — an observation beside the interview it was given in is the whole point.
   */
  private async open(at: number): Promise<void> {
    const entry = this.entries[at]
    if (!entry || !entry.url || this.shown.has(at)) return
    const block = document.createElement("section")
    block.className = "open-event"
    block.dataset.at = String(at)
    // A player names its own observation on its toolbar; the dialogue reader names nothing, so the block says which interview it is.
    if (entry.kind === "interview") {
      const title = document.createElement("p")
      title.className = "open-title"
      title.textContent = entry.title
      block.append(title)
    }
    if (entry.kind === "interview") {
      const { register } = await import("./InterviewElement.js")
      register()
      const reader = document.createElement("rr0-interview") as HTMLElement & { revealAt?: (s: number, of?: string) => number | undefined }
      reader.setAttribute("src", entry.url)
      block.append(reader)
      // Opened while a replay is under way, it starts where that replay stands rather than at the top of the transcript.
      window.setTimeout(() => {
        this.followReplay()
        this.markCitedMoments()
      }, 300)
    } else {
      const player = document.createElement(SIGHTING_ELEMENT_NAME) as SightingElement
      // Pointed at the case, not at the file alone: a recording read from its case carries the case's readings and its other witnesses.
      player.setAttribute(CASE_NAMED_ATTRIBUTE, "")
      // While the history is on show, it is the way through the case: this player's own pickers would say it a second time.
      player.toggleAttribute(HIDE_PICKERS_ATTRIBUTE, !this.byId("case-events").parentElement!.hidden)
      player.setAttribute("src", this.url ?? "")
      // By its address: the id of an event of the case is not what the player looked for (it reads the witness's own id, a file name or a
      // rank), so two recordings of one witness both opened on the first.
      player.setAttribute(OBSERVER_ATTRIBUTE, entry.url)
      for (const option of CaseElement.PASSED_ON) {
        const asked = this.getAttribute(option)
        if (asked !== null) player.setAttribute(option, asked)
      }
      // What a page around this element listens for, as it would on the player itself: the wrapper is not a wall.
      player.addEventListener(OBSERVER_CHANGE_EVENT, event => {
        this.dispatchEvent(new CustomEvent(OBSERVER_CHANGE_EVENT, { detail: (event as CustomEvent).detail }))
      })
      block.append(player)
    }
    this.shown.set(at, block)
    this.order()
    this.draw()
    if (entry.kind !== "interview") window.setTimeout(() => this.markCitedMoments(), 300)
  }

  /**
   * Shows, in every dialogue open, the passage that tells of where a replay stands. `block` is the one that moved; with none, the first
   * player open is taken, which is what an interview opened in the middle of a replay needs to catch up with it.
   */
  private followReplay(block?: HTMLElement): HTMLElement | undefined {
    const moved = block ?? [...this.shown.values()].find(other => other.querySelector(SIGHTING_ELEMENT_NAME))
    const at = moved ? Number(moved.dataset.at) : NaN
    const entry = Number.isNaN(at) ? undefined : this.entries[at]
    const player = moved?.querySelector(SIGHTING_ELEMENT_NAME) as SightingElement | null
    if (!entry || !player) return undefined
    for (const [index, other] of this.shown) {
      if (this.entries[index]?.kind !== "interview") continue
      const reader = other.querySelector("rr0-interview") as (HTMLElement & { revealAt?: (s: number, of?: string) => number | undefined }) | null
      // The reader shows a passage once and stays there while the replay is still inside it (see InterviewElement.revealAt).
      reader?.revealAt?.(player.playedSeconds, entry.event.id)
    }
    return moved
  }

  /**
   * Puts on each player's bar the moments its observation is cited at, gathered from the dialogues open beside it: a reader sees from the
   * bar alone where the witness said something about, and goes there in one click.
   */
  private markCitedMoments(): void {
    for (const [index, block] of this.shown) {
      const entry = this.entries[index]
      const player = block.querySelector(SIGHTING_ELEMENT_NAME) as SightingElement | null
      if (!entry || !player) continue
      const moments: { at: number, quote?: string }[] = []
      for (const [other, mounted] of this.shown) {
        if (this.entries[other]?.kind !== "interview") continue
        const reader = mounted.querySelector("rr0-interview") as (HTMLElement & { momentsCited?: (of?: string) => { at: number, quote: string }[] }) | null
        moments.push(...(reader?.momentsCited?.(entry.event.id) ?? []))
      }
      player.citedMoments = moments.sort((a, b) => a.at - b.at)
    }
  }

  private shut(at: number): void {
    this.shown.get(at)?.remove()
    this.shown.delete(at)
    this.markCitedMoments()
    this.draw()
  }

  /** What is open, in the order of time: the order they were opened in is the reader's doing, not the case's. */
  private order(): void {
    const blocks = [...this.shown.entries()].sort(([a], [b]) => a - b).map(([, block]) => block)
    this.openEvents.replaceChildren(...blocks)
  }

  /** Takes the observation `sighting` names to `at` seconds, opening it when it was shut: what a passage of an interview leads to. */
  private async seekObservation(at: number, sighting?: string): Promise<void> {
    const index = this.entries.findIndex(entry => entry.kind !== "interview"
      && (entry.event.id === sighting || (sighting !== undefined && entry.url?.endsWith(`/${sighting}.json`))))
    const shown = index >= 0 ? index : this.entries.findIndex(entry => entry.kind !== "interview")
    if (shown < 0) return
    if (!this.shown.has(shown)) await this.open(shown)
    const player = this.shown.get(shown)?.querySelector(SIGHTING_ELEMENT_NAME) as SightingElement | null
    player?.seekTo(at, sighting)
    this.shown.get(shown)?.scrollIntoView({ block: "nearest", behavior: "smooth" })
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
    // What the case says of itself is behind the i, as a recording's is behind the player's own: a reader who wants it asks for it.
    const summary = this.said.read((json as { summary?: unknown }).summary as SaidText | undefined) ?? ""
    const summaryElement = this.byId("case-summary")
    summaryElement.textContent = summary
    const info = this.byId("info")
    info.hidden = summary === ""
    info.title = m.caseSummary
    info.setAttribute("aria-label", m.caseSummary)
    if (summary === "") this.showSummary(false)
    this.byId("events-heading").textContent = m.eventsHeading
    this.byId("events-icon").innerHTML = Icons.CLOCK
    const edit = this.byId("edit")
    edit.title = m.editCase
    edit.setAttribute("aria-label", m.editCase)
    this.eventList.replaceChildren(...this.entries.map((entry, index) => this.card(entry, index, m)))
  }

  private card(entry: CaseEntry, index: number, m: CaseMessages): HTMLElement {
    const item = document.createElement("li")
    item.className = "event"
    item.dataset.kind = entry.kind
    item.dataset.at = String(index)
    if (this.shown.has(index)) item.dataset.open = ""
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
    open.addEventListener("click", () => void this.toggle(index))
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
        link.addEventListener("click", () => void this.open(to))
        // Pointed at or focused, the card it leads to is lit, so that a reference is found without reading the whole history.
        const aim = (lit: boolean) => this.eventList.querySelector<HTMLElement>(`.event[data-at="${to}"]`)?.classList.toggle("aimed", lit)
        for (const [name, lit] of [["mouseenter", true], ["mouseleave", false], ["focus", true], ["blur", false]] as const) {
          link.addEventListener(name, () => aim(lit))
        }
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

  /** The door a page uses, the same the player offers: fetch this case and show it. */
  async loadFromSrc(url: string): Promise<void> {
    await this.load(url)
  }

  /** The scene of the first player open, for a page that starts the replay itself. */
  get scene(): unknown {
    return (this.players()[0] as unknown as { scene?: unknown })?.scene
  }

  /** Every player open, in the order of time. */
  private players(): SightingElement[] {
    return [...this.shown.entries()].sort(([a], [b]) => a - b)
      .map(([, block]) => block.querySelector(SIGHTING_ELEMENT_NAME) as SightingElement | null)
      .filter((player): player is SightingElement => player !== null)
  }

  /** The recording the first player open is showing: what a page around this element reads, as it would off a player. */
  get sightingData(): unknown {
    return this.players()[0]?.sightingData
  }

  /** The first player open, for a page that has to reach one (the share dialog, a start time). */
  get player(): SightingElement | undefined {
    return this.players()[0]
  }
}

export function register(): void {
  if (!customElements.get(CASE_ELEMENT_NAME)) customElements.define(CASE_ELEMENT_NAME, CaseElement)
}
