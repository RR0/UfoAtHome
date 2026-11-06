import type { Basis } from "../engine/persistence/Provenance.js"
import { WindowClose } from "./WindowClose.js"

/** What the element says: the window's title, what each basis is called, and its fields. */
export interface BasisInputMessages {
  title: string
  basis: Record<Basis, string>
  basisField: string
  howField: string
  rationaleField: string
}

/** What a value stands on, as the element shows and edits it (see ProvenanceEntry, without the value it is about). */
export interface BasisEntry {
  basis: Basis
  how?: string
  rationale?: string
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
  font: 600 11px/1.6 var(--sans); color: var(--glow); cursor: pointer; visibility: hidden; vertical-align: .05em; user-select: none;
}
:is(label, .field):is(:hover, :focus-within) .basis-mark, rr0-input-basis:focus-within .basis-mark, .basis-mark:not([data-basis="stated"]) { visibility: visible; }
.basis-mark[data-basis="assumed"], .basis-mark[data-basis="derived"] { font-style: italic; }
.basis-window { width: min(26em, 92vw); padding: 18px 20px; border: 1px solid var(--line-strong); border-radius: 12px; background: var(--ground-raised); color: var(--ink); box-shadow: 0 12px 32px rgba(0, 0, 0, .3); }
.basis-window h3 { margin: 0 0 12px; font: 600 19px/1.3 var(--serif); }
.basis-window label { display: flex; flex-direction: column; gap: 5px; margin: 0 0 12px; font: 600 13px/1.3 var(--sans); color: var(--ink-dim); }
.basis-window :is(select, textarea) { box-sizing: border-box; width: 100%; font-weight: 400; }
.basis-window textarea { min-height: 8em; font: 400 14px/1.45 var(--sans, sans-serif); resize: vertical; }
`

  /** The ways a value of its kind can have been obtained, for the window's list (none: the list is not shown). */
  hows: { value: string, label: string }[] = []

  private wording?: BasisInputMessages
  private shown?: BasisEntry
  private mark?: HTMLElement
  private window?: HTMLElement

  /** Builds it, once: a host may need its pill before it is in the page. */
  build(): void {
    if (this.mark) return
    const mark = document.createElement("span")
    mark.className = "basis-mark"
    // A role and not a <button>: a button before a field in its label would become what the label labels.
    mark.setAttribute("role", "button")
    mark.tabIndex = 0
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

  /** What the value stands on; undefined is "stated", with nothing more said. */
  get entry(): BasisEntry | undefined {
    return this.shown
  }

  set entry(entry: BasisEntry | undefined) {
    this.shown = entry && (entry.basis !== "stated" || entry.how !== undefined || entry.rationale !== undefined) ? { ...entry } : undefined
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
    mark.title = this.shown?.rationale ? `${m.title} : ${this.shown.rationale}` : m.title
    mark.setAttribute("aria-label", `${m.title} : ${m.basis[basis]}`)
  }

  /** The window where what the value stands on is said: its basis, how (from the host's list), and why. */
  open(): void {
    const m = this.wording
    if (!m) return
    const heading = Object.assign(document.createElement("h3"), { textContent: m.title })
    const basis = document.createElement("select")
    for (const value of ["measured", "stated", "derived", "assumed"] as const) basis.append(new Option(m.basis[value], value))
    basis.value = this.shown?.basis ?? "stated"
    const how = document.createElement("select")
    how.append(new Option("—", ""))
    for (const way of this.hows) how.append(new Option(way.label, way.value))
    how.value = this.shown?.how ?? ""
    const rationale = document.createElement("textarea")
    rationale.value = this.shown?.rationale ?? ""
    const write = () => {
      this.entry = { basis: basis.value as Basis, ...(how.value ? { how: how.value } : {}), ...(rationale.value.trim() ? { rationale: rationale.value.trim() } : {}) }
      this.dispatchEvent(new CustomEvent("basischange", { detail: { entry: this.shown }, bubbles: true, composed: true }))
    }
    for (const control of [basis, how]) control.addEventListener("change", write)
    rationale.addEventListener("change", write)
    const labelled = (text: string, control: HTMLElement) => {
      const label = document.createElement("label")
      label.append(Object.assign(document.createElement("span"), { textContent: text }), control)
      return label
    }
    const window = this.windowElement()
    window.replaceChildren(heading, labelled(m.basisField, basis), ...(this.hows.length > 0 ? [labelled(m.howField, how)] : []), labelled(m.rationaleField, rationale))
    WindowClose.popover(window, m.title)
    if (typeof window.showPopover === "function" && window.isConnected) window.showPopover()
    else window.hidden = false
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
