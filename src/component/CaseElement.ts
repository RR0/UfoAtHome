import { CaseFile } from "../engine/persistence/caseJson.js"
import { ReadingsComparisonElement, type ComparedReading } from "./ReadingsComparisonElement.js"
import { CaseExportElement } from "./CaseExportElement.js"
import type { SightingRecordingJson } from "../engine/persistence/sightingJson.js"
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
import { CASE_NAMED_ATTRIBUTE, HIDE_PICKERS_ATTRIBUTE, INTERPRETATION_ATTRIBUTE, INTERPRETATION_CHANGE_EVENT, OBSERVER_ATTRIBUTE, OBSERVER_CHANGE_EVENT, SHOW_INFO_ATTRIBUTE, SIGHTING_ELEMENT_NAME, registerSighting } from "./SightingElement.js"
import type { SightingElement } from "./SightingElement.js"
import { caseHtml, caseCss } from "./caseTemplate.js"
import { ShareDialogElement, type ShareSubject } from "./ShareDialogElement.js"
import { PlayerIcons } from "./PlayerIcons.js"
import { AppLocation } from "./AppLocation.js"
import { CaseTimeline, type CaseTimelineCard } from "./CaseTimeline.js"

export const CASE_ELEMENT_NAME = "rr0-case"
/** Whether the chronology is shown from the start: on unless the page says `show-timeline="false"`. What is open stays open either way. */
export const SHOW_TIMELINE_ATTRIBUTE = "show-timeline"
/**
 * What a page wants open from the start: `all`, every event the case holds, or some of them, by the id of their event in the case, else by
 * their file's name (`interpretation-mont-rainier-aaf`, with or without `.json`: most of a case's readings have no id), separated by commas.
 * Absent, or naming nothing the case holds, the case opens on its first observation. What a shared link says is open (see shareSubject).
 */
export const OPEN_EVENTS_ATTRIBUTE = "open-events"

/** Fired by `<rr0-case>` when what is open changes, by the reader's doing: an event opened or shut, another witness or another reading picked
 * in a player. `detail.events` is what OPEN_EVENTS_ATTRIBUTE would say of it, empty when it is what the case opens on anyway (see openKeys):
 * what a page puts in its own address, so that the address in the bar is the one the share dialog gives. */
export const OPEN_CHANGE_EVENT = "openchange"

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

  /**
   * The options a page sets on this element and that its players wear too: what to show from the start. Not `show-info`: it opens what the
   * CASE says of itself, and a demo linked with `info=1` would otherwise open every observation's own panel over its picture as well.
   */
  private static readonly PASSED_ON = ["show-labels"] as const

  private readonly shadow: ShadowRoot
  private readonly openEvents: HTMLElement
  /** The chronology, drawn as the editor draws its own (see CaseTimeline): its title opens an event or shuts it, a renvoi opens one. */
  private readonly timeline: CaseTimeline
  /** What is open, by the event's place in `entries`: the element showing it, a player or a dialogue reader. */
  private readonly shown = new Map<number, HTMLElement>()
  private messages?: CaseMessages
  private said = new SaidTexts(["en"])
  private json?: CaseJson
  private url?: string
  private entries: CaseEntry[] = []
  /** Whether the history sets each reading under the observation it reads (see CaseTimeline.grouped), rather than in the order of time. */
  private grouping = false
  /** The observations whose readings are folded away while grouped, by their place in `entries`: none until the reader folds one. */
  private readonly folded = new Set<number>()
  /** Where the reader's choice of grouping is kept, in their browser alone: a convenience, which a page without storage simply forgets. */
  private static readonly GROUPING_KEY = "rr0-case-group-readings"

  private static remembered(): boolean {
    try {
      return localStorage.getItem(CaseElement.GROUPING_KEY) === "1"
    } catch {
      return false
    }
  }

  private static remember(grouping: boolean): void {
    try {
      localStorage.setItem(CaseElement.GROUPING_KEY, grouping ? "1" : "0")
    } catch {
      // Not kept: the next case opens in the order of time, which is no harm.
    }
  }

  constructor() {
    super()
    this.shadow = this.attachShadow({ mode: "open" })
    const style = document.createElement("style")
    style.textContent = caseCss
    const frame = document.createElement("div")
    frame.innerHTML = caseHtml
    this.shadow.append(style, frame)
    registerSighting()
    // The card opens its event alone, and so does a renvoi; only the mark on the rail adds one to what is open, or puts one away.
    this.timeline = new CaseTimeline(this.byId("case-events"), at => void this.only(at), at => void this.only(at), at => void this.toggle(at),
      at => {
        if (!this.folded.delete(at)) this.folded.add(at)
        this.draw()
      })
    this.grouping = CaseElement.remembered()
    this.byId("group-readings").addEventListener("click", () => {
      this.grouping = !this.grouping
      CaseElement.remember(this.grouping)
      this.order()
      this.draw()
    })
    ReadingsComparisonElement.register()
    CaseExportElement.register()
    // What a report is made from: the case and every recording it lists, fetched only when a report is asked for.
    ;(this.byId("export") as CaseExportElement).source = async () => {
      const json = this.json!
      const recordings = new Map<string, SightingRecordingJson>()
      await Promise.all(this.entries.filter(entry => entry.kind !== "interview" && entry.url).map(async entry => {
        try {
          recordings.set(entry.url!, await SightingFetch.recording(entry.url!) as SightingRecordingJson)
        } catch {
          // One that cannot be read leaves out what needed it: the report is on what could be read.
        }
      }))
      return { caseJson: json, caseUrl: this.url!, recordings }
    }
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
    // The case is shared from here, its observations from their players: two things, each where it is shown.
    ShareDialogElement.register()
    const share = this.byId("share")
    share.innerHTML = PlayerIcons.SHARE
    const dialog = this.byId("share-dialog") as ShareDialogElement
    dialog.subject = this.shareSubject
    share.addEventListener("click", () => {
      if (this.url) dialog.open()
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

  /**
   * What the case's share dialog shares: the case, read whole. The link opens the site's player on its case.json, which mounts this very
   * element; the embed is this element on the case's absolute address. The player loads it: the case reader comes in its bundle.
   */
  private readonly shareSubject: ShareSubject = {
    module: "rr0-sighting",
    link: () => {
      const open = this.openKeys()
      return `${AppLocation.home()}/play/?file=${encodeURIComponent(this.url ?? "")}${open ? `&events=${encodeURIComponent(open)}` : ""}`
        + (this.timelineShown() ? "" : "&timeline=0")
    },
    element: () => {
      const open = this.openKeys()
      return `<${CASE_ELEMENT_NAME} src="${this.url ?? ""}"${open ? ` ${OPEN_EVENTS_ATTRIBUTE}="${open}"` : ""}`
        + `${this.timelineShown() ? "" : ` ${SHOW_TIMELINE_ATTRIBUTE}="false"`}></${CASE_ELEMENT_NAME}>`
    }
  }

  /** Whether the history is on show: a case shared with it put away opens with it put away, on what is open alone. */
  private timelineShown(): boolean {
    return !this.byId("case-events").parentElement!.hidden
  }

  /**
   * What is open, as OPEN_EVENTS_ATTRIBUTE says it, for a link to open the case as it is looked at: a reading chosen, an interview beside
   * its observation. Nothing when it is what the case opens on anyway (its first observation alone), so that the plain case keeps its
   * plain address.
   */
  private openKeys(): string {
    const open = [...this.shown.keys()].sort((a, b) => a - b)
    if (open.length === 1 && open[0] === this.firstObservation()) return ""
    return open.map(at => CaseElement.keyOf(this.entries[at])).join(",")
  }

  /** How a link names an event of the case: the id of its event, else its file's name (see OPEN_EVENTS_ATTRIBUTE). */
  private static keyOf(entry: CaseEntry): string {
    return entry.event.id ?? CaseElement.fileNameOf(entry)
  }

  /** Its file's name, without `.json`: what a link may name it by whether it has an id or not. */
  private static fileNameOf(entry: CaseEntry): string {
    return (entry.url ?? "").split("/").pop()!.replace(/[.]json$/i, "")
  }

  /** The events OPEN_EVENTS_ATTRIBUTE names, in the order of time: every one for `all`, none for an attribute naming nothing. */
  private asked(value: string | null): number[] {
    if (value === null) return []
    if (value.trim() === "all") return this.entries.map((_, at) => at)
    const keys = value.split(",").map(key => key.trim().replace(/[.]json$/i, "")).filter(key => key !== "")
    return this.entries.map((entry, at) => ({ entry, at }))
      .filter(({ entry }) => keys.some(key => key === entry.event.id || key === CaseElement.fileNameOf(entry)))
      .map(({ at }) => at)
  }

  /** Where the case opens when nothing is asked: its first observation, or reading. */
  private firstObservation(): number {
    return this.entries.findIndex(entry => entry.kind !== "interview")
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
      for (const at of this.asked(value)) void this.open(at)
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
    await (this.byId("share-dialog") as ShareDialogElement).useLanguage(language)
    this.draw()
  }

  /** The case at `url`, and the player pointed at the same file: it lists the case's recordings itself. */
  async load(url: string): Promise<void> {
    this.url = new URL(url, location.href).href
    // By its full address, as the recordings it lists will be: the same case works read from its dossier's page and from anywhere else.
    const json = await SightingFetch.recording(this.url) as CaseJson
    if (!CaseFile.isCase(json)) throw new Error(`${url} is not a case: <${CASE_ELEMENT_NAME}> reads a case.json`)
    this.json = json
    this.entries = CaseElement.inTime((json.events ?? []).map(event => this.entryOf(event)).filter((entry): entry is CaseEntry => entry !== undefined))
    this.shown.clear()
    this.folded.clear()
    this.openEvents.replaceChildren()
    this.draw()
    this.compareReadings()
    // Everything at once where the page asked for it (a demo of a case shows all of it), else the first observation, as the editor opens
    // on one: a case shown with nothing in it says nothing.
    const asked = this.asked(this.getAttribute(OPEN_EVENTS_ATTRIBUTE))
    if (asked.length > 0) {
      for (const at of asked) await this.open(at)
      return
    }
    const first = this.firstObservation()
    if (first >= 0) void this.open(first)
  }

  /** The events in the order of time, as the case editor lists them (see CaseTimeline.inTime). */
  private static inTime(entries: CaseEntry[]): CaseEntry[] {
    const byId = new Map(entries.filter(entry => entry.event.id !== undefined).map(entry => [entry.event.id, entry]))
    return CaseTimeline.inTime(entries, {
      when: entry => entry.when,
      kind: entry => entry.kind,
      read: entry => [entry.event.interpretationOf].flat().map(id => id === undefined ? undefined : byId.get(id))
        .filter((account): account is CaseEntry => account !== undefined)
    }).map(({ item }) => item)
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

  /**
   * Sets the case's readings side by side under the history (see ReadingsComparisonElement), their recordings fetched only when the table
   * is unfolded. A reading's title opens it below, as its card does.
   */
  private compareReadings(): void {
    const table = this.byId("readings-comparison") as ReadingsComparisonElement
    const fetched = new Map<string, Promise<SightingRecordingJson | undefined>>()
    const fetch = (url: string) => {
      let known = fetched.get(url)
      if (!known) {
        known = SightingFetch.recording(url).then(json => json as SightingRecordingJson, () => undefined)
        fetched.set(url, known)
      }
      return known
    }
    const rowsOf = async (load: boolean): Promise<ComparedReading[]> => Promise.all(this.entries.flatMap((entry, at) => {
      if (entry.kind !== "reading") return []
      const account = this.accountOf(entry)
      const row = async (): Promise<ComparedReading> => ({
        title: entry.title, witness: account?.title ?? "",
        ...(load && account?.url && entry.url ? { account: await fetch(account.url), reading: await fetch(entry.url) } : {}),
        open: () => void this.only(at).then(() => this.shown.get(at)?.scrollIntoView({ block: "start", behavior: "smooth" }))
      })
      return [row()]
    }))
    void rowsOf(false).then(rows => table.show(rows, () => rowsOf(true)))
  }

  /** The account a reading reads, among the case's events: what the player has to be pointed at to replay that reading. */
  private accountOf(entry: CaseEntry): CaseEntry | undefined {
    return this.accountsOf(entry)[0]
  }

  /** Every account a reading reads, among the case's events, in the order of time. */
  private accountsOf(entry: CaseEntry): CaseEntry[] {
    const ids = [entry.event.interpretationOf].flat().filter((id): id is string => id !== undefined)
    return this.entries.filter(other => other.kind === "observation" && ids.includes(other.event.id ?? ""))
  }


  /**
   * The editor on the case itself, its events listed: the pencil of the case edits the case. What is open below has a pencil of its own,
   * on its player, for that observation or that reading.
   */
  private editorUrl(): string | undefined {
    if (!this.url) return undefined
    const editor = new URL("/edit/", location.href)
    editor.searchParams.set("file", this.url)
    return editor.href
  }

  /** Opens the event at `at` alone: whatever else was open is put away. */
  private async only(at: number): Promise<void> {
    for (const other of [...this.shown.keys()]) if (other !== at) this.shut(other)
    await this.open(at)
  }

  /** Opens the event at `at` beside what is open, or shuts it: what is open is shown below, in the history's order, however many there are. */
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
      //
      // A reading is not one of the player's entries — those are the case's accounts — it is an interpretation OF one. So it opens the
      // account it reads and asks for itself among that account's readings; otherwise opening a reading showed an account instead.
      const read = entry.kind === "reading" ? this.accountOf(entry) : undefined
      player.setAttribute(OBSERVER_ATTRIBUTE, (read ?? entry).url ?? "")
      if (entry.kind === "reading") player.setAttribute(INTERPRETATION_ATTRIBUTE, entry.url)
      // After it is in the document, not before: an option that opens something (the information panel is a popover) cannot act on an
      // element nobody has inserted yet, and threw where it tried.
      queueMicrotask(() => {
        for (const option of CaseElement.PASSED_ON) {
          const asked = this.getAttribute(option)
          if (asked !== null) player.setAttribute(option, asked)
        }
      })
      // What a page around this element listens for, as it would on the player itself: the wrapper is not a wall.
      player.addEventListener(OBSERVER_CHANGE_EVENT, event => {
        this.dispatchEvent(new CustomEvent(OBSERVER_CHANGE_EVENT, { detail: (event as CustomEvent).detail }))
        this.follow(block, player)
      })
      // Another reading picked in the player is another event of the case open: the share dialog and the page's address have to say it.
      player.addEventListener(INTERPRETATION_CHANGE_EVENT, () => this.follow(block, player))
      block.append(player)
    }
    this.shown.set(at, block)
    this.order()
    this.draw()
    if (entry.kind !== "interview") window.setTimeout(() => this.markCitedMoments(), 300)
    this.announceOpen()
  }

  /**
   * Files the player of `block` under the event it shows now: the reading picked in its menu, else the witness's recording. A player opened on
   * one reading and turned to another by its own menu went on being shared, and its event marked in the history, as the one it opened on.
   */
  private follow(block: HTMLElement, player: SightingElement): void {
    const was = Number(block.dataset.at)
    const reading = player.shownReadingUrl
    const account = player.shownRecordingUrl
    const same = (url: string | undefined, other: string | undefined) => url !== undefined && other !== undefined
      && new URL(url, this.url ?? location.href).href === new URL(other, this.url ?? location.href).href
    const at = reading
      ? this.entries.findIndex(entry => entry.kind === "reading" && same(entry.url, reading))
      : this.entries.findIndex(entry => entry.kind === "observation" && same(entry.url, account))
    if (at < 0 || at === was || this.shown.get(was) !== block || this.shown.has(at)) return
    this.shown.delete(was)
    this.shown.set(at, block)
    block.dataset.at = String(at)
    // What the player was asked to open on follows what it shows: asked again (by being moved in the page, say), it would put back the
    // reading it was opened on, which wins over what is chosen (see SightingElement.offerInterpretations).
    const entry = this.entries[at]!
    if (entry.kind === "reading") player.setAttribute(INTERPRETATION_ATTRIBUTE, entry.url!)
    else {
      player.removeAttribute(INTERPRETATION_ATTRIBUTE)
      if (entry.url) player.setAttribute(OBSERVER_ATTRIBUTE, entry.url)
    }
    this.order()
    this.draw()
    this.announceOpen()
  }

  /** Tells the page around what is open now (see OPEN_CHANGE_EVENT). */
  private announceOpen(): void {
    this.dispatchEvent(new CustomEvent(OPEN_CHANGE_EVENT, { detail: { events: this.openKeys() } }))
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
    this.announceOpen()
  }

  /**
   * What is open, in the history's order: the order they were opened in is the reader's doing, not the case's. Moved only when that
   * order changes: put back in the page, a player is read again.
   */
  private order(): void {
    // Its first place: a reading grouped under two observations is listed twice.
    const rank = new Map<number, number>()
    this.listed().forEach(({ index }, place) => { if (!rank.has(index)) rank.set(index, place) })
    const blocks = [...this.shown.entries()].sort(([a], [b]) => (rank.get(a) ?? a) - (rank.get(b) ?? b)).map(([, block]) => block)
    if (blocks.length === this.openEvents.children.length && blocks.every((block, place) => this.openEvents.children[place] === block)) return
    this.openEvents.replaceChildren(...blocks)
  }

  /** The events as the history lists them: in the order of time, or each reading under the observation it reads (see grouping). */
  private listed(): { item: CaseEntry, index: number, under?: CaseEntry }[] {
    const inTime = this.entries.map((item, index) => ({ item, index }))
    if (!this.grouping) return inTime
    return CaseTimeline.grouped(inTime, { kind: entry => entry.kind, read: entry => this.accountsOf(entry) })
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
    const share = this.byId("share")
    share.title = m.shareCase
    share.setAttribute("aria-label", m.shareCase)
    const edit = this.byId("edit")
    edit.title = m.editCase
    edit.setAttribute("aria-label", m.editCase)
    const group = this.byId("group-readings")
    group.title = m.groupReadings
    group.setAttribute("aria-label", m.groupReadings)
    group.setAttribute("aria-pressed", String(this.grouping))
    group.hidden = !this.entries.some(entry => entry.kind === "reading")
    const listed = this.listed()
    const readingsOf = (account: CaseEntry) => listed.filter(({ under }) => under === account).length
    const accountAt = new Map(this.entries.map((entry, at) => [entry, at]))
    this.timeline.render(listed
      .filter(({ under }) => under === undefined || !this.folded.has(accountAt.get(under)!))
      .map(({ item, index, under }) => {
        const card = this.card(item, index, under)
        const count = this.grouping && item.kind === "observation" ? readingsOf(item) : 0
        return count > 0 ? { ...card, readings: { count, folded: this.folded.has(index) } } : card
      }), m)
  }

  /**
   * What the card of the entry at `index` says: its kind, its name, its date, what it names and who made it. Set under an observation
   * `under` it reads, it names none of those it reads: it stands under each of them (see CaseTimeline.grouped), which says it.
   */
  private card(entry: CaseEntry, index: number, under?: CaseEntry): CaseTimelineCard {
    const linked = this.linkedTo(entry)
    const to = under ? [] : linked?.to ?? []
    return {
      at: index, kind: entry.kind, title: entry.title, meta: entry.when.replace("T", " "), open: this.shown.has(index),
      ...(linked && to.length > 0 ? { links: { heading: linked.heading, to: to.map(other => ({ at: other, title: this.entries[other].title })) } } : {}),
      by: entry.kind === "observation" ? "" : this.authors(entry.event.by),
      ...(under ? { nested: true } : {})
    }
  }

  /** The door a page uses, the same the player offers: fetch this case and show it. */
  async loadFromSrc(url: string): Promise<void> {
    await this.load(url)
    // Its first player read too, as a player's own loadFromSrc is: the page plays it next, and a player with no recording yet does not.
    await this.player?.loaded
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
