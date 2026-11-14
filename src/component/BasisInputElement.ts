import { SaidTexts, type SaidText } from "../engine/model/SaidText.js"
import { HostLocale, selectLocale } from "../i18n/locale.js"
import { UFO_SUPPORTED_LANGUAGES } from "./messages/index.js"
import { Provenance, type Basis, type ValueSource } from "../engine/persistence/Provenance.js"
import { WindowClose } from "./WindowClose.js"

/** What the element says: the window's title, what each basis is called, and its fields. */
export interface BasisInputMessages {
  title: string
  basis: Record<Basis, string>
  basisField: string
  howField: string
  rationaleField: string
}

/**
 * What the window says of what a value rests on (see ValueSource): the kinds of source, and the fields of each.
 *
 * Its own catalog, and not a part of BasisInputMessages, because the pill's own words are said twice over in the editor (once of an
 * observer's values, once of an event's parameters) while these are said once: the same words wherever a source is written.
 */
export interface BasisSourceMessages {
  /** The heading of the part: what this value rests on. */
  field: string
  /** The kinds of source, in the order the window offers them. */
  kinds: Record<SourceKind, string>
  interviewField: string
  segmentField: string
  documentField: string
  atField: string
  urlField: string
  pictureField: string
  toolField: string
  /** Said in place of the fields when the basis is a free one: a working hypothesis rests on nothing (see Provenance.free). */
  free: string
  /** A turn of speech whose text is not known yet, in the list of passages ({n} its number). */
  segmentUnnamed: string
  /** The one interview of a case that says nothing of which it is. */
  interviewOnly: string
}

/** Which kind of thing a value rests on: one of ValueSource's, or none. */
export type SourceKind = "none" | "said" | "document" | "picture" | "tool"

/**
 * What the window can offer to point at, which only its host knows: the interviews belong to the CASE (so they come through the case
 * editor) and the pictures to the recording. Neither is offered when there is none, rather than offered empty.
 */
export interface SourceChoices {
  interviews?: {
    /** The id of the case's interview event; absent for the only interview a case holds (see SaidIn.interview). */
    id?: string
    label: string
    /** The turns of speech of its transcript, as the list of passages shows them. */
    segments: { index: number, label: string }[]
  }[]
  pictures?: { id: string, label: string }[]
}

/** What a value stands on, as the element shows and edits it (see ProvenanceEntry, without the value it is about). */
export interface BasisEntry {
  basis: Basis
  how?: string
  /** A plain string, or one per language (see StatedValue.rationale). */
  rationale?: SaidText
  /** What it rests on, named (see ValueSource). */
  source?: ValueSource
}

/**
 * What a value stands on (see Basis), beside the value: a pill that says its basis, hidden at rest but on the hover of what holds it or
 * while it is edited, and always when the basis is not "stated"; its rationale as its tooltip. Pressed, it opens a window where its basis,
 * how it was obtained (when the host gives a list of ways, `hows`), and why, are said. Each change is reported by a `basischange` event
 * whose `detail.entry` is what it now stands on, or undefined for "stated" with nothing more said: the host keeps it (in the recording's
 * provenance, at the value's path).
 *
 * Used wherever a value of a recording is edited (the observer's fields, see WitnessErrorView; the events' parameters, see EventsPanel).
 */
export class BasisInputElement extends HTMLElement {
  static readonly TAG = "rr0-input-basis"

  static readonly CSS = `
rr0-input-basis { display: inline-block; }
rr0-input-basis[hidden] { display: none; }
.basis-mark {
  display: inline-block; margin-left: 8px; padding: 0 8px; border: 1px solid var(--glow-dim); border-radius: 999px;
  font: 600 11px/1.6 var(--sans); color: var(--glow); cursor: pointer; vertical-align: .05em; user-select: none;
}
/* Always there, so that nothing moves when it shows: "stated", the default, said quietly, and fully on the hover of its field. */
.basis-mark[data-basis="stated"] { border-style: dashed; opacity: .55; }
:is(label, .field, .event-param-label):is(:hover, :focus-within) .basis-mark, .basis-mark:is(:hover, :focus-visible) { opacity: 1; }
.basis-mark[data-basis="assumed"], .basis-mark[data-basis="derived"] { font-style: italic; }
/* Turned to make a hypothesis fit: nothing is judged against it (see Basis), and it does not read as one of the account's own. */
.basis-mark[data-basis="fitted"] { font-style: italic; border-style: dotted; }
.basis-window { width: min(26em, 92vw); padding: 18px 20px; border: 1px solid var(--line-strong); border-radius: 12px; background: var(--ground-raised); color: var(--ink); box-shadow: 0 12px 32px rgba(0, 0, 0, .3); }
.basis-window h3 { margin: 0 0 12px; font: 600 19px/1.3 var(--serif); }
.basis-window label { display: flex; flex-direction: column; gap: 5px; margin: 0 0 12px; font: 600 13px/1.3 var(--sans); color: var(--ink-dim); }
.basis-window :is(select, textarea) { box-sizing: border-box; width: 100%; font-weight: 400; }
/* Beside its pill, under it or above it where there is room (anchored, see open); centred where anchors are not known. Fixed, against a
   window's own rule (WindowClose), which makes a popover with a ✕ relative, and so drawn at the top of the page. */
.basis-window.basis-window:popover-open { position: fixed; inset: auto; margin: 6px 0; max-height: calc(100vh - 24px); overflow: auto;
  position-area: bottom span-right; position-try-fallbacks: flip-block, flip-inline, flip-block flip-inline; }
@supports not (position-area: bottom) { .basis-window.basis-window:popover-open { inset: 0; margin: auto; height: fit-content; } }
.basis-window textarea { min-height: 8em; font: 400 14px/1.45 var(--sans, sans-serif); resize: vertical; }
/* A value that names what it rests on (see ValueSource): said on the pill itself, so that a reader sees which values can be gone and
   looked at without opening anything. */
.basis-mark[data-sourced] { text-decoration: underline dotted; text-underline-offset: 2px; }
.basis-source { margin: 14px 0 0; padding-top: 12px; border-top: 1px solid var(--line); }
.basis-source h4 { margin: 0 0 10px; font: 600 13px/1.3 var(--sans); color: var(--ink-dim); }
.basis-source-free { margin: 0; font: 400 13px/1.45 var(--sans); color: var(--ink-dim); }
.basis-window input { box-sizing: border-box; width: 100%; font-weight: 400; }
`

  /** The ways a value of its kind can have been obtained, for the window's list (none: the list is not shown). */
  hows: { value: string, label: string }[] = []
  /** Whether the host keeps a rationale (a position's host keeps its basis alone): its field is shown only then. */
  rationaleKept = true
  /** Whether the host keeps what the value rests on: the source part is shown only then, and only once its words have come. */
  sourceKept = true
  /** What the window can offer to point at (see SourceChoices): none makes the kinds that need a list not be offered. */
  choices: SourceChoices = {}

  private wording?: BasisInputMessages
  private sourceWording?: BasisSourceMessages
  private shown?: BasisEntry
  private mark?: HTMLElement
  private window?: HTMLElement
  private static count = 0
  /** The name its window is anchored to its pill by. */
  private anchor = `--rr0-basis-${++BasisInputElement.count}`

  /**
   * Names its anchor after what it is about (the value's path), before it is built: a host that draws its fields anew after a change makes
   * a new pill of the same name, which the window still open stays beside.
   */
  set anchorKey(key: string) {
    this.anchor = `--rr0-basis-${key.replace(/[^a-zA-Z0-9_-]/g, "-")}`
    this.mark?.style.setProperty("anchor-name", this.anchor)
  }

  /** Builds it, once: a host may need its pill before it is in the page. */
  build(): void {
    if (this.mark) return
    const mark = document.createElement("span")
    mark.className = "basis-mark"
    // A role and not a <button>: a button before a field in its label would become what the label labels.
    mark.setAttribute("role", "button")
    mark.tabIndex = 0
    mark.style.setProperty("anchor-name", this.anchor)
    const open = (event: Event) => {
      event.preventDefault()
      event.stopPropagation()
      this.open()
    }
    mark.addEventListener("click", open)
    mark.addEventListener("keydown", event => { if (event.key === "Enter" || event.key === " ") open(event) })
    this.append(mark)
    this.mark = mark
    this.say()
  }

  connectedCallback(): void {
    this.build()
  }

  set messages(messages: BasisInputMessages) {
    this.wording = messages
    this.say()
  }

  /** The words of the source part (see BasisSourceMessages): without them the part is not shown, and nothing is lost. */
  set sourceMessages(messages: BasisSourceMessages | undefined) {
    this.sourceWording = messages
  }

  /** What the value stands on; undefined is "stated", with nothing more said. */
  get entry(): BasisEntry | undefined {
    return this.shown
  }

  set entry(entry: BasisEntry | undefined) {
    this.shown = entry && (entry.basis !== "stated" || entry.how !== undefined || entry.rationale !== undefined || entry.source !== undefined)
      ? { ...entry } : undefined
    this.say()
  }

  /** The pill, as `.basis-mark` (for a host that lays it out). */
  get pill(): HTMLElement {
    this.build()
    return this.mark!
  }

  private say(): void {
    const mark = this.mark
    const m = this.wording
    if (!mark || !m) return
    const basis: Basis = this.shown?.basis ?? "stated"
    mark.dataset.basis = basis
    this.dataset.basis = basis
    // Written only when it changes: a text set anew is a node inserted anew.
    if (mark.textContent !== m.basis[basis]) mark.textContent = m.basis[basis]
    if (this.shown?.source) mark.dataset.sourced = "yes"
    else delete mark.dataset.sourced
    const why = this.rationaleRead()
    mark.title = why ? `${m.title} : ${why}` : m.title
    mark.setAttribute("aria-label", `${m.title} : ${m.basis[basis]}`)
  }

  /** The justification in the reader's language, or the one it has. */
  private rationaleRead(): string | undefined {
    return new SaidTexts(HostLocale.preferencesFor(this)).read(this.shown?.rationale as never)
  }

  /** The language a justification typed here is in: the interface's. */
  private rationaleLanguage(): string {
    return selectLocale(HostLocale.preferencesFor(this), UFO_SUPPORTED_LANGUAGES)
  }

  /**
   * A justification as typed, in `language`, written back as the file held it: a plain string stays one; one per language keeps the
   * others and has this one replaced, or dropped when it is emptied (the last one dropped leaves none).
   */
  static rationaleWritten(was: SaidText | undefined, typed: string, language: string): { rationale?: SaidText } {
    if (was === undefined || typeof was === "string") return typed ? { rationale: typed } : {}
    const kept = Object.fromEntries(Object.entries(was).filter(([tag]) => tag !== language))
    const next = typed ? { ...kept, [language]: typed } : kept
    return Object.keys(next).length > 0 ? { rationale: next } : {}
  }

  /** The window where what the value stands on is said: its basis, how (from the host's list), and why. */
  open(): void {
    const m = this.wording
    if (!m) return
    const heading = Object.assign(document.createElement("h3"), { textContent: m.title })
    const basis = document.createElement("select")
    for (const value of ["established", "measured", "stated", "derived", "assumed", "fitted"] as const) basis.append(new Option(m.basis[value], value))
    basis.value = this.shown?.basis ?? "stated"
    const how = document.createElement("select")
    how.append(new Option("—", ""))
    for (const way of this.hows) how.append(new Option(way.label, way.value))
    how.value = this.shown?.how ?? ""
    const rationale = document.createElement("textarea")
    rationale.value = this.rationaleRead() ?? ""
    const labelled = (text: string, control: HTMLElement) => {
      const label = document.createElement("label")
      label.append(Object.assign(document.createElement("span"), { textContent: text }), control)
      return label
    }
    // What the value rests on, read by whatever the source part drew, and nothing when it drew none.
    let readSource: () => ValueSource | undefined = () => this.shown?.source
    const write = () => {
      const picked = basis.value as Basis
      const source = readSource()
      this.entry = {
        basis: picked,
        ...(how.value ? { how: how.value } : {}),
        ...BasisInputElement.rationaleWritten(this.shown?.rationale, rationale.value.trim(), this.rationaleLanguage()),
        ...(source ? { source } : {})
      }
      this.dispatchEvent(new CustomEvent("basischange", { detail: { entry: this.shown }, bubbles: true, composed: true }))
    }
    how.addEventListener("change", write)
    rationale.addEventListener("change", write)
    const source = document.createElement("div")
    source.className = "basis-source"
    const drawSource = () => {
      readSource = this.drawSource(source, basis.value as Basis, labelled, () => write())
    }
    // A basis turned to a free one takes its source away with it: a hypothesis rests on nothing (see ValueSource).
    basis.addEventListener("change", () => { drawSource(); write() })
    const window = this.windowElement()
    const sourceShown = this.sourceKept && this.sourceWording !== undefined
    if (sourceShown) drawSource()
    window.replaceChildren(heading, labelled(m.basisField, basis), ...(this.hows.length > 0 ? [labelled(m.howField, how)] : []), ...(this.rationaleKept ? [labelled(m.rationaleField, rationale)] : []), ...(sourceShown ? [source] : []))
    WindowClose.popover(window, m.title)
    if (typeof window.showPopover === "function" && window.isConnected) window.showPopover()
    else window.hidden = false
  }

  /** Which kind of thing a source names (see ValueSource): one at a time, which is how it is written. */
  static kindOf(source: ValueSource | undefined): SourceKind {
    if (source?.said) return "said"
    if (source?.picture) return "picture"
    if (source?.document !== undefined || source?.at || source?.url) return "document"
    if (source?.tool) return "tool"
    return "none"
  }

  /**
   * The part of the window where what the value rests on is said: the kind of source, then the fields of that kind. Answers a reader of
   * what it now says, for the window to write it.
   *
   * A free basis gets no fields at all, only the line that says why (see Provenance.free): a working hypothesis rests on nothing, and
   * letting one be given a source would be the one lie this field exists to prevent.
   */
  private drawSource(container: HTMLElement, basis: Basis, labelled: (text: string, control: HTMLElement) => HTMLElement, write: () => void): () => ValueSource | undefined {
    const m = this.sourceWording
    if (!m) {
      container.replaceChildren()
      return () => undefined
    }
    if (Provenance.free({ basis })) {
      container.replaceChildren(Object.assign(document.createElement("p"), { className: "basis-source-free", textContent: m.free }))
      return () => undefined
    }
    const interviews = this.choices.interviews ?? []
    const pictures = this.choices.pictures ?? []
    // Only the kinds there is something to point at: a recording outside a case has no interviews, and one without pictures no pictures.
    const kinds: SourceKind[] = ["none", ...(interviews.length > 0 ? ["said" as const] : []), "document", ...(pictures.length > 0 ? ["picture" as const] : []), "tool"]
    const kind = document.createElement("select")
    for (const value of kinds) kind.append(new Option(m.kinds[value], value))
    const held = this.shown?.source
    const wanted = BasisInputElement.kindOf(held)
    kind.value = kinds.includes(wanted) ? wanted : "none"
    const fields = document.createElement("div")
    let read: () => ValueSource | undefined = () => undefined
    const draw = () => { read = this.drawSourceFields(fields, kind.value as SourceKind, held, labelled, write) }
    kind.addEventListener("change", () => { draw(); write() })
    draw()
    container.replaceChildren(labelled(m.field, kind), fields)
    return () => read()
  }

  /** The fields of one kind of source, filled with what the value already said when it is of that kind. */
  private drawSourceFields(fields: HTMLElement, kind: SourceKind, held: ValueSource | undefined, labelled: (text: string, control: HTMLElement) => HTMLElement, write: () => void): () => ValueSource | undefined {
    const m = this.sourceWording!
    const of = (kind === BasisInputElement.kindOf(held) ? held : undefined) ?? {}
    const text = (value?: string) => {
      const input = document.createElement("input")
      input.type = "text"
      input.value = value ?? ""
      input.addEventListener("change", write)
      return input
    }
    const trimmed = (input: HTMLInputElement) => input.value.trim() || undefined
    if (kind === "said") {
      const interviews = this.choices.interviews ?? []
      const which = document.createElement("select")
      for (const interview of interviews) which.append(new Option(interview.id === undefined ? m.interviewOnly : interview.label, interview.id ?? ""))
      which.value = of.said?.interview ?? interviews[0]?.id ?? ""
      // A source may name the case's only interview, which the list offers without its id: that one is still the one meant.
      if (which.selectedIndex < 0 && interviews.length === 1) which.selectedIndex = 0
      const segment = document.createElement("select")
      const fill = () => {
        const chosen = interviews.find(candidate => (candidate.id ?? "") === which.value) ?? interviews[0]
        segment.replaceChildren(...(chosen?.segments ?? []).map(turn => new Option(turn.label || m.segmentUnnamed.replace("{n}", String(turn.index + 1)), String(turn.index))))
        if (of.said && segment.querySelector(`option[value="${of.said.segment}"]`)) segment.value = String(of.said.segment)
      }
      fill()
      which.addEventListener("change", () => { fill(); write() })
      segment.addEventListener("change", write)
      fields.replaceChildren(labelled(m.interviewField, which), labelled(m.segmentField, segment))
      return () => {
        if (segment.value === "") return undefined
        const chosen = interviews.find(candidate => (candidate.id ?? "") === which.value)
        // The range of the passage is not picked here: what is said is the turn of speech, which is what a reader is taken to.
        return { said: { ...(chosen?.id !== undefined ? { interview: chosen.id } : {}), segment: Number(segment.value), ...(of.said?.range ? { range: of.said.range } : {}) } }
      }
    }
    if (kind === "picture") {
      const pictures = this.choices.pictures ?? []
      const which = document.createElement("select")
      which.append(new Option("—", ""))
      for (const picture of pictures) which.append(new Option(picture.label, picture.id))
      which.value = of.picture ?? ""
      which.addEventListener("change", write)
      fields.replaceChildren(labelled(m.pictureField, which))
      return () => which.value ? { picture: which.value } : undefined
    }
    if (kind === "tool") {
      const tool = text(of.tool)
      fields.replaceChildren(labelled(m.toolField, tool))
      return () => trimmed(tool) ? { tool: trimmed(tool)! } : undefined
    }
    if (kind === "document") {
      // A title as the author writes it: a SaidText in one language is that language's string (see SaidText).
      const title = text(typeof of.document === "string" ? of.document : undefined)
      const at = text(of.at)
      const url = text(of.url)
      fields.replaceChildren(labelled(m.documentField, title), labelled(m.atField, at), labelled(m.urlField, url))
      return () => {
        const said = { ...(trimmed(title) ? { document: trimmed(title)! } : {}), ...(trimmed(at) ? { at: trimmed(at)! } : {}), ...(trimmed(url) ? { url: trimmed(url)! } : {}) }
        // A document kept as it was said in several languages, with its title untouched here, stays whole.
        if (typeof of.document === "object" && of.document !== null && trimmed(title) === undefined) return Object.keys(said).length > 0 || of.document ? { ...said, document: of.document } : undefined
        return Object.keys(said).length > 0 ? said : undefined
      }
    }
    fields.replaceChildren()
    return () => undefined
  }

  /**
   * Its window: out of the label or the row it is in (a click in a label goes to what it labels), at the root it is in; a popover, so
   * that a panel that scrolls does not cut it off. Taken away once closed: the host may have drawn its fields anew meanwhile.
   */
  private windowElement(): HTMLElement {
    if (this.window) return this.window
    const window = document.createElement("div")
    window.className = "basis-window"
    window.setAttribute("popover", "")
    window.setAttribute("role", "dialog")
    window.style.setProperty("position-anchor", this.anchor)
    window.addEventListener("toggle", event => {
      if ((event as ToggleEvent).newState !== "closed") return
      window.remove()
      this.window = undefined
    })
    const root = this.getRootNode()
    if (root instanceof ShadowRoot) root.append(window)
    else (root instanceof Document ? root.body : this).append(window)
    this.window = window
    return window
  }

  /** Its window, while it is open (for a host's tests). */
  get openWindow(): HTMLElement | undefined {
    return this.window
  }
}

export function register(): void {
  if (!customElements.get(BasisInputElement.TAG)) customElements.define(BasisInputElement.TAG, BasisInputElement)
}
