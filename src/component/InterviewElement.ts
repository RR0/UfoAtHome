import { SaidTexts } from "../engine/model/SaidText.js"
import type { SaidText } from "../engine/model/SaidText.js"
import { SightingFetch } from "../engine/net/SightingFetch.js"
import { HostLocale, selectLocale } from "../i18n/locale.js"
import { loadInterviewMessages, UFO_SUPPORTED_LANGUAGES } from "./messages/index.js"
import type { UfoLanguage } from "./messages/index.js"
import type { InterviewMessages } from "./messages/InterviewMessages.js"
import { interviewMessages_en } from "./messages/InterviewMessages_en.js"
import { INTERVIEW_SEEK_EVENT } from "./interviewEvents.js"
import { InterviewFile } from "../engine/persistence/interviewJson.js"
import type { InterviewJson, InterviewSightingRef } from "../engine/persistence/interviewJson.js"

export const INTERVIEW_ELEMENT_NAME = "rr0-interview"

export { INTERVIEW_SEEK_EVENT }

/** The style of the dialogue, put once in each root that holds one: the element draws in its own children, where the page's styles reach. */
const STYLE = `
rr0-interview { display: block; --rr0-interview-line: color-mix(in srgb, currentColor 35%, transparent); }
rr0-interview [hidden] { display: none !important; }
rr0-interview .rr0-interview-status { font-size: .85em; opacity: .85; margin: 0 0 .5em; }
/* Scrolling only where a height is asked for: a box that scrolls keeps clear of the page's floated figures for all its height. */
rr0-interview .rr0-interview-turns { max-height: var(--rr0-interview-max-height, none); overflow-y: var(--rr0-interview-overflow, visible); }
rr0-interview .turn { position: relative; padding: .2em .5em; margin: 0 0 .4em; border-left: 3px solid var(--speaker); --speaker: hsl(var(--speaker-hue, 0) 55% 38%); }
@media (prefers-color-scheme: dark) { rr0-interview .turn { --speaker: hsl(var(--speaker-hue, 0) 65% 70%); } }
rr0-interview .turn.flash { background: color-mix(in srgb, #fc3 28%, transparent); }
rr0-interview .turn .who { font-size: .85em; font-weight: 600; color: var(--speaker); overflow-wrap: anywhere; }
rr0-interview .turn.is-redacted .who, rr0-interview .turn.goes-on .who { display: none; }
rr0-interview .turn.goes-on { margin-top: -.4em; padding-top: .6em; }
rr0-interview .turn .said, rr0-interview .turn .redacted { margin: 0; padding: 0; text-indent: 0; white-space: pre-wrap; }
rr0-interview .turn .said::before, rr0-interview .turn .said::after { content: none; }
/* Tooltips drawn here rather than left to the browser's own, which some hosts (an embedded pane) never show. */
rr0-interview .turn[data-time]:hover:not(:has(.bar:hover, .bar:focus, .said a:hover))::after { content: attr(data-time); position: absolute; right: .3em; top: .2em; z-index: 2;
  padding: 0 .4em; border-radius: 3px; font-size: .8em; font-variant-numeric: tabular-nums; background: #222; color: #fff; pointer-events: none; }
rr0-interview .bar { position: relative; display: inline-block; width: 3em; height: .9em; vertical-align: -.1em; border-radius: 2px; background: currentColor; margin: 0 .2em; cursor: help; }
rr0-interview .bar::after { content: attr(data-tip); display: none; position: absolute; left: 0; top: 1.4em; z-index: 3; width: max-content; max-width: 22em; padding: .3em .5em;
  border-radius: 4px; background: #222; color: #fff; font-size: .85em; line-height: 1.3; white-space: normal; }
rr0-interview .bar:hover::after, rr0-interview .bar:focus::after { display: block; }
rr0-interview .turn .refs { display: flex; flex-wrap: wrap; gap: .25em; }
rr0-interview .turn .ref { font: inherit; font-size: .8em; cursor: pointer; border: 1px solid var(--rr0-interview-line); border-radius: 999px; background: transparent; color: inherit;
  padding: 0 .35em; font-variant-numeric: tabular-nums; white-space: nowrap; }
`

/** What a player of the observation offers to be followed to a moment of it (see SightingElement.seekTo). */
interface Seekable {
  seekTo(seconds: number, sighting?: string): void
}

/**
 * An interview, read as a dialogue: who said what, the passages taken out of the published transcript as bars that say why, the stretches that
 * link to a page as links, titles and foreign words in italics (what was said is plain text or HTML, shown as such), the time of each turn
 * when it is pointed at, and the passages that tell of a moment of the observation as buttons that go there.
 *
 * `src` is the interview's file (see InterviewJson), relative to the page; `interview` sets one directly, and `documentUrl` is then what its
 * links are relative to. Following a passage to the observation sends an `interviewseek` event; with `player="<id>"`, the `<rr0-sighting>` of
 * that id in the page is moreover shown at that moment. Who has not proofread the transcript is said above it, when the file says who has.
 *
 * It draws in its own children, not in a shadow root, so that the styles of the page it is put in reach the text and its links, as they do the
 * rest of the page. `--rr0-interview-max-height` with `--rr0-interview-overflow: auto` makes the dialogue scroll past that height.
 *
 * `<rr0-interview-editor>` (see InterviewEditorElement) shows one in its Exchanges group.
 */
export class InterviewElement extends HTMLElement {
  private messages: InterviewMessages = interviewMessages_en
  private said = new SaidTexts(["en"])
  private localeToken = 0
  private loadToken = 0
  private json?: InterviewJson
  private base?: string
  private readonly status = document.createElement("p")
  private readonly turns = document.createElement("div")
  /** The block that shows each segment (several segments taken out in a row share one), by the segment's index. */
  private readonly blocks = new Map<number, HTMLElement>()

  constructor() {
    super()
    this.status.className = "rr0-interview-status"
    this.status.setAttribute("role", "status")
    this.turns.className = "rr0-interview-turns"
  }

  static get observedAttributes(): string[] {
    return ["src"]
  }

  attributeChangedCallback(name: string, oldValue: string | null, value: string | null): void {
    if (name === "src" && value !== oldValue && this.isConnected) void this.load()
  }

  connectedCallback(): void {
    InterviewElement.styleRoot(this.getRootNode())
    if (!this.contains(this.turns)) this.replaceChildren(this.status, this.turns)
    void this.loadLocale()
    if (this.hasAttribute("src") && this.json === undefined) void this.load()
  }

  /** The interview shown. */
  get interview(): InterviewJson | undefined {
    return this.json
  }

  set interview(json: InterviewJson | undefined) {
    this.loadToken++
    this.json = json
    this.draw()
  }

  /** What the links of an interview set directly are relative to: its file's address. */
  set documentUrl(url: string | undefined) {
    this.base = url
  }

  /** Puts the dialogue's style in `root`, once. */
  private static styleRoot(root: Node): void {
    const holder = root instanceof ShadowRoot ? root : document.head
    if (holder.querySelector("style[data-rr0-interview]")) return
    const style = document.createElement("style")
    style.dataset.rr0Interview = ""
    style.textContent = STYLE
    holder.append(style)
  }

  private async load(): Promise<void> {
    const src = this.getAttribute("src")
    const token = ++this.loadToken
    if (!src) return
    const url = new URL(src, location.href).href
    let json: InterviewJson | undefined
    try {
      json = await SightingFetch.json(url) as InterviewJson
    } catch {
      json = undefined
    }
    if (token !== this.loadToken) return
    this.base = url
    this.json = json
    this.draw()
  }

  private async loadLocale(): Promise<void> {
    const token = ++this.localeToken
    const preferences = HostLocale.preferencesFor(this)
    const language = selectLocale(preferences, UFO_SUPPORTED_LANGUAGES) as UfoLanguage
    const messages = language === "en" ? interviewMessages_en : await loadInterviewMessages(language)
    if (token !== this.localeToken) return
    this.said = new SaidTexts(preferences)
    this.messages = messages
    this.draw()
  }

  /** How a speaker is named: as the transcript names them, else by their role in the reader's language. */
  private speakerName(json: InterviewJson, id: string): string {
    const name = InterviewFile.speakerName(json, id)
    const role = json.speakers?.[id]?.role
    return name === role && role in this.messages.roles ? this.messages.roles[role as keyof InterviewMessages["roles"]] : name
  }

  /** Follows a passage to the moment of the observation it tells of: told to the page, and shown by the player the page names. */
  private seek(ref: InterviewSightingRef): void {
    const json = this.json!
    const detail = { sighting: ref.sighting ?? InterviewFile.sightingsOf(json)[0], at: ref.at }
    this.dispatchEvent(new CustomEvent(INTERVIEW_SEEK_EVENT, { bubbles: true, composed: true, detail }))
    const id = this.getAttribute("player")
    if (!id) return
    const root = this.getRootNode() as Document | ShadowRoot
    const player = root.getElementById?.(id) as (HTMLElement & Partial<Seekable>) | null
    if (typeof player?.seekTo !== "function") return
    player.scrollIntoView?.({ block: "center", behavior: "smooth" })
    player.seekTo(detail.at, detail.sighting)
  }

  /** What stands in the place of a stretch taken out: a bar, which says why when it is pointed at or focused. */
  private gap(reason: SaidText, tag: "p" | "span"): HTMLElement {
    const node = document.createElement(tag)
    const bar = document.createElement("span")
    bar.className = "bar"
    const why = `${this.messages.redacted} : ${this.said.read(reason) ?? ""}`
    bar.dataset.tip = why
    bar.tabIndex = 0
    bar.setAttribute("role", "img")
    bar.setAttribute("aria-label", why)
    node.append(bar)
    return node
  }

  /**
   * What was said, plain text or HTML, as nodes: HTML is HTML's to say (a link, a title in italics, a foreign word), the addresses in it relative
   * to the interview's file. Scripts and handlers are no part of what was said, and are left out.
   */
  private saidNodes(text: string): Node[] {
    if (!/[<&]/.test(text)) return [document.createTextNode(text)]
    const template = document.createElement("template")
    template.innerHTML = text
    for (const element of template.content.querySelectorAll("*")) {
      if (["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED"].includes(element.tagName)) {
        element.remove()
        continue
      }
      for (const attribute of [...element.attributes]) {
        if (/^on/i.test(attribute.name) || /^\s*javascript:/i.test(attribute.value)) element.removeAttribute(attribute.name)
        else if (["href", "src"].includes(attribute.name)) {
          try {
            attribute.value = new URL(attribute.value, this.base ?? location.href).href
          } catch {
            // left as written
          }
        }
      }
    }
    return [...template.content.childNodes]
  }

  private draw(): void {
    const m = this.messages
    const json = this.json
    this.blocks.clear()
    const segments = Array.isArray(json?.segments) ? json!.segments : []
    if (!json || segments.length === 0) {
      this.status.hidden = true
      const empty = document.createElement("p")
      empty.textContent = m.exchangesEmpty
      this.turns.replaceChildren(empty)
      return
    }
    const speakers = json.speakers ?? {}
    const ids = Object.keys(speakers)
    // Who has not proofread it, when the file says who has: a transcript published before anybody was asked says nothing of it.
    if (json.proofreading) {
      const waiting = ids.filter(id => !["approved", "covered"].includes(json.proofreading?.[id]?.status ?? ""))
      this.status.textContent = waiting.length === 0 ? m.proofreadAll : m.proofreadPending.replace("{names}", waiting.map(id => this.speakerName(json, id)).join(", "))
      this.status.hidden = false
    } else this.status.hidden = true
    const turns: HTMLElement[] = []
    let previous: { block: HTMLElement, reason: string } | undefined
    let speakerBefore: string | undefined
    segments.forEach((segment, index) => {
      const reason = segment.redacted ? JSON.stringify(segment.redacted.reason) : undefined
      // Passages taken out one after the other read as one gap.
      if (reason !== undefined && previous?.reason === reason) {
        this.blocks.set(index, previous.block)
        return
      }
      const turn = document.createElement("div")
      turn.className = "turn"
      turn.dataset.segment = String(index)
      turn.style.setProperty("--speaker-hue", String((Math.max(0, ids.indexOf(segment.speaker)) * 67 + 210) % 360))
      const who = document.createElement("div")
      who.className = "who"
      const name = document.createElement("span")
      name.textContent = segment.redacted ? "" : this.speakerName(json, segment.speaker)
      // The time is a tooltip over the whole turn, not in the layout.
      if (segment.start !== undefined) turn.dataset.time = InterviewFile.clock(segment.start, true)
      // The same speaker going on is not named again.
      if (!segment.redacted && speakerBefore === segment.speaker) turn.classList.add("goes-on")
      speakerBefore = segment.redacted ? undefined : segment.speaker
      who.append(name)
      if (segment.redacted) {
        turn.classList.add("is-redacted")
        const gone = this.gap(segment.redacted.reason, "p")
        gone.className = "redacted"
        previous = { block: turn, reason: reason! }
        turn.append(who, gone)
      } else {
        const said = document.createElement("p")
        said.className = "said"
        if (segment.parts) {
          // Stretches follow each other as they were said, with their own spaces; two words they leave touching get one between them.
          let before = ""
          for (const part of segment.parts) {
            const text = "redacted" in part ? "▮" : InterviewFile.plain(part.text)
            if (/[\p{L}\p{N}.,;:!?)»”…▮]$/u.test(before) && /^[\p{L}\p{N}(«“▮]/u.test(text)) said.append(" ")
            if ("redacted" in part) said.append(this.gap(part.redacted.reason, "span"))
            else said.append(...this.saidNodes(part.text))
            before = text
          }
        } else said.append(...this.saidNodes(segment.text ?? ""))
        previous = undefined
        turn.append(who, said)
      }
      if (segment.refs?.length) {
        const refs = document.createElement("div")
        refs.className = "refs"
        for (const ref of segment.refs) {
          const button = document.createElement("button")
          button.type = "button"
          button.className = "ref"
          button.textContent = `↗ ${InterviewFile.clock(ref.at, true)}`
          button.addEventListener("click", () => this.seek(ref))
          refs.append(button)
        }
        turn.append(refs)
      }
      this.blocks.set(index, turn)
      turns.push(turn)
    })
    this.turns.replaceChildren(...turns)
  }

  /** Shows the segment that tells of an observation's moment, and where it is. */
  revealSegment(index: number): void {
    const block = this.blocks.get(index)
    if (!block) return
    block.scrollIntoView?.({ block: "center" })
    block.classList.add("flash")
    window.setTimeout(() => block.classList.remove("flash"), 1600)
  }
}

export function register(): void {
  if (!customElements.get(INTERVIEW_ELEMENT_NAME)) customElements.define(INTERVIEW_ELEMENT_NAME, InterviewElement)
}
