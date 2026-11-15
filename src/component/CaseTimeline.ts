import { Icons } from "./Icons.js"

/** What kind an event of a case is, for its pill, its mark and its colour. */
export type CaseEventKind = "observation" | "reading" | "interview"

/** The words a chronology says, which the reader's catalog (CaseMessages) and the editor's (CaseEditorMessages) both hold. */
export interface CaseTimelineWords {
  kindObservation: string
  kindReading: string
  kindInterview: string
  /** What opens the event a card is about. */
  openEvent: string
  /** Between the last two things a card names. */
  linkAnd: string
  /** Before the authors a card names: "… by Z". */
  byAuthor: string
}

/** One card of the chronology, as its host says it: nothing here knows a case file. */
export interface CaseTimelineCard {
  /** The event's place among the case's, which a renvoi aims at and every callback receives. */
  at: number
  kind: CaseEventKind
  title: string
  /** When it was, and whatever else the host says under the title (the editor adds the event's id). */
  meta: string
  /** Whether it is open below the chronology, lit then. */
  open?: boolean
  /** The other events it names: what a reading reads, the interviews an observation was told in. */
  links?: { heading: string, to: { at: number, title: string }[] }
  /** Its authors, as a sentence says them; none for an observation, whose author is its witness. */
  by?: string
}

/** The parts of a card drawn, for a host that adds its own to them (the editor's findings, tools, padlock). */
export interface CaseTimelineParts {
  card: HTMLLIElement
  body: HTMLElement
  links: HTMLElement
}

/** What a host's events are, to put them in the order of time. */
export interface CaseTimelineOrder<T> {
  /** Its own time as the case writes it, or "" when nobody dated it. */
  when(item: T): string
  kind(item: T): CaseEventKind
  /** The accounts a reading reads, among the case's events. */
  read(item: T): T[]
}

/**
 * A case's chronology: every event on one rail, in the order of time, the kind of each said by an icon on the rail and by a word on its
 * pill, the events it names as renvois that open them.
 *
 * Common to the case's reader (CaseElement) and its editor (CaseEditorElement), which each mount it in their shadow root, with its CSS,
 * and dress its cards with what is their own: the reader lights what is open, the editor adds a reading's findings and what can be done
 * to an event. What a reader cannot do is absent from it, not greyed out: it is the editor that adds it.
 */
export class CaseTimeline {
  /**
   * The rail and its cards. Their colours are tokens of their own (`--tl-*`), set from the page's `--rr0-*` ones by default and from its
   * theme by a host that has one (see EDITOR_TOKENS): named as the editor's are, they would have reached the player a reader wraps too.
   */
  static readonly CSS = `
:host {
  --tl-ink: currentColor;
  --tl-ink-dim: color-mix(in srgb, currentColor 80%, transparent);
  --tl-ink-faint: color-mix(in srgb, currentColor 65%, transparent);
  --tl-line: color-mix(in srgb, currentColor 18%, transparent);
  --tl-ground: transparent;
  /* The disc takes the page's own background, not a dark one: on a light page every mark was a dark coin, where a reading's dimmed
     grey icon simply did not show. The Canvas system colour is the page's own, so this follows light and dark by itself. */
  --tl-disc: var(--rr0-ground, Canvas);
  --tl-hover: color-mix(in srgb, currentColor 5%, transparent);
  --tl-sky: var(--rr0-sky, #7fd4ff);
  --tl-glow: var(--rr0-glow, #e8b84b);
  --tl-sans: var(--rr0-sans, system-ui, sans-serif);
}
.event-card, .kind-pill { --kind: var(--tl-glow); --kind-bg: color-mix(in srgb, var(--kind) 16%, transparent); }
:is(.event-card, .kind-pill)[data-kind="interview"] { --kind: var(--tl-sky); }
:is(.event-card, .kind-pill)[data-kind="reading"] { --kind: var(--tl-ink-faint); }
/* The line runs through the centre of every mark: each event draws its own stretch of it, from the one above to the one below, the
   first from its mark down and the last down to its mark, and none when it is the only one. Both are placed from the card's outer edge,
   past its 1px border. The mark stands level with the kind's pill: the card's middle while the card is one row, the pill's line once it
   wraps. */
.event-list { --rail: 7px; --gap: 10px; display: grid; gap: var(--gap); margin: 0; padding: 0 0 0 24px; list-style: none; }
.event-card { --dot-y: 50%; position: relative; border: 1px solid var(--tl-line); border-radius: 10px; background: var(--tl-ground); color: var(--tl-ink); }
.event-card::after { content: ""; position: absolute; left: calc(var(--rail) - 24px - 1px); top: calc(-1px - var(--gap) / 2);
  bottom: calc(-1px - var(--gap) / 2); width: 1px; transform: translateX(-50%); background: var(--tl-line); }
.event-card:first-child::after { top: calc(var(--dot-y) - 1px); }
.event-card:last-child::after { bottom: calc(100% - var(--dot-y) - 1px); }
.event-card:only-child::after { display: none; }
/* On the rail, in the colour of its kind: what kind of event it is, rather than a dot that says only that there is one. */
.event-mark { position: absolute; z-index: 1; left: calc(var(--rail) - 24px - 1px); top: calc(var(--dot-y) - 1px); display: grid; place-items: center;
  width: 22px; height: 22px; transform: translate(-50%, -50%); border-radius: 50%; background: var(--tl-disc); color: var(--kind); }
.event-mark svg { width: 14px; height: 14px; }
/* What the card is linked to goes UNDER what it says, across the card: beside the title it had a third of the width and wrapped on every
   reference, below it has the whole of it. */
.event-body { display: grid; grid-template-columns: minmax(96px, auto) minmax(0, 1fr); grid-template-areas: "pill main" "links links";
  align-items: center; gap: 4px 12px; min-width: 0; padding: 12px 14px; }
.kind-pill { grid-area: pill; justify-self: start; padding: 2px 10px; border-radius: 999px; background: var(--kind-bg); color: var(--tl-ink);
  font: 700 12px/1.5 var(--tl-sans); white-space: nowrap; }
.event-main { grid-area: main; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
/* The title opens the event, and the whole card with it: its hit area is stretched over the card. */
.event-open { min-height: 0; padding: 0; border: 0; background: none; color: var(--tl-ink); font: 600 15px/1.35 var(--tl-sans); text-align: left; cursor: pointer; }
.event-open::after { content: ""; position: absolute; inset: 0; border-radius: 10px; }
.event-open:hover:not(:disabled) { background: none; }
.event-open:focus-visible { outline: none; }
.event-card:has(.event-open:hover) { background: var(--tl-hover); }
.event-card:has(.event-open:focus-visible) { outline: 2px solid var(--tl-sky); outline-offset: 2px; }
.event-meta { font-size: 13px; color: var(--tl-ink-faint); overflow-wrap: anywhere; }
.event-links { grid-area: links; font-size: 13px; color: var(--tl-ink-dim); }
.event-links:empty { display: none; }
/* Open, it is lit: the card and what it opened below are the same thing seen twice. */
.event-card[data-open] { border-color: var(--kind); background: color-mix(in srgb, var(--kind) 8%, transparent); }
/* A renvoi to another event of the case: it opens it, so it looks like what it is. Above the hit area the title stretches over the whole
   card: otherwise the card swallows the click and opens itself, which is exactly not where the renvoi leads. */
.event-ref { position: relative; z-index: 1; padding: 0; border: 0; background: none; font: inherit; color: var(--tl-sky);
  text-decoration: underline; text-underline-offset: 2px; cursor: pointer; }
.event-ref:hover { color: var(--tl-ink); }
.event-ref:focus-visible { outline: 2px solid var(--tl-sky); outline-offset: 2px; border-radius: 3px; }
/* The card a renvoi is pointing at, while it is pointed at. */
.event-card.event-aimed { outline: 2px solid var(--tl-sky); outline-offset: 2px; background: var(--tl-hover); }
@container (max-width: 640px) {
  .event-card { --dot-y: 24px; }
  .event-body { grid-template-columns: minmax(0, 1fr); grid-template-areas: "pill" "main" "links"; gap: 6px 10px; }
}
`

  /** The `--tl-*` tokens from the editors' theme (see EditorTheme.TOKENS), for a `:host` rule placed after CSS. */
  static readonly EDITOR_TOKENS = `
  --tl-ink: var(--ink);
  --tl-ink-dim: var(--ink-dim);
  --tl-ink-faint: var(--ink-faint);
  --tl-line: var(--line-strong);
  --tl-ground: var(--ground);
  --tl-disc: var(--ground-raised);
  --tl-hover: var(--ground-sunken);
  --tl-sky: var(--sky);
  --tl-glow: var(--glow-solid);
  --tl-sans: var(--sans);
`

  private static readonly MARKS: Record<CaseEventKind, string> = { observation: Icons.WITNESS, reading: Icons.SUMMARY, interview: Icons.INTERVIEW }

  /**
   * The events in the order of time, with where each stood. A reading nobody dated came after the account it reads at least: it takes that
   * account's time, where undated it stood before every observation of the case (Braine-le-Comte's six readings, McMinnville's, Socorro's,
   * the Concorde's). At the same time an account comes before the readings of it; otherwise the order is the case's own.
   */
  static inTime<T>(items: readonly T[], order: CaseTimelineOrder<T>): { item: T, index: number }[] {
    const timeOf = (item: T): string => {
      const own = order.when(item)
      if (own !== "" || order.kind(item) !== "reading") return own
      return order.read(item).map(account => order.when(account)).find(when => when !== "") ?? ""
    }
    const reads = (item: T) => order.kind(item) === "reading" ? 1 : 0
    return items.map((item, index) => ({ item, index, when: timeOf(item) }))
      .sort((a, b) => a.when.localeCompare(b.when) || reads(a.item) - reads(b.item) || a.index - b.index)
      .map(({ item, index }) => ({ item, index }))
  }

  /** The word a kind of event goes by, on its pill. */
  static kindLabel(kind: CaseEventKind, words: CaseTimelineWords): string {
    return { observation: words.kindObservation, reading: words.kindReading, interview: words.kindInterview }[kind]
  }

  /**
   * @param list The `<ol class="event-list">` the cards are drawn in.
   * @param choose What its title does: opens the event (the editor), or opens it and shuts it again (the reader).
   * @param follow What a renvoi to another event does: opens it.
   */
  constructor(private readonly list: HTMLElement, private readonly choose: (at: number) => void,
              private readonly follow: (at: number) => void = choose) {
  }

  /** Draws `cards` in the list, each dressed by `dress` once drawn, when the host has something of its own to add to it. */
  render(cards: readonly CaseTimelineCard[], words: CaseTimelineWords, dress?: (card: CaseTimelineCard, parts: CaseTimelineParts) => void): void {
    this.list.replaceChildren(...cards.map(card => {
      const parts = this.card(card, words)
      dress?.(card, parts)
      return parts.card
    }))
  }

  private card(card: CaseTimelineCard, words: CaseTimelineWords): CaseTimelineParts {
    const item = document.createElement("li")
    item.className = "event-card"
    item.dataset.kind = card.kind
    item.dataset.at = String(card.at)
    if (card.open) item.dataset.open = ""
    const pill = document.createElement("span")
    pill.className = "kind-pill"
    pill.dataset.kind = card.kind
    pill.textContent = CaseTimeline.kindLabel(card.kind, words)
    const main = document.createElement("div")
    main.className = "event-main"
    // The title is what opens it: a button, so that the keyboard opens it as the pointer does (see .event-open).
    const title = document.createElement("button")
    title.type = "button"
    title.className = "event-open"
    title.textContent = card.title
    title.title = words.openEvent
    title.addEventListener("click", () => this.choose(card.at))
    const meta = document.createElement("span")
    meta.className = "event-meta"
    meta.textContent = card.meta
    main.append(title, meta)
    const links = document.createElement("span")
    links.className = "event-links"
    links.append(...this.said(card, words))
    const body = document.createElement("div")
    body.className = "event-body"
    body.append(pill, main, links)
    // On the rail, in the card's own colour: what kind of event it is. Said twice, here and on the pill, as a word and as a picture.
    const mark = document.createElement("span")
    mark.className = "event-mark"
    mark.innerHTML = CaseTimeline.MARKS[card.kind]
    mark.setAttribute("aria-hidden", "true")
    item.append(body, mark)
    return { card: item, body, links }
  }

  /** What a card says of the others and of its authors, as a sentence: "Interpretation of X, Y and Z by W". */
  private said(card: CaseTimelineCard, words: CaseTimelineWords): (string | Node)[] {
    const said: (string | Node)[] = []
    const to = card.links?.to ?? []
    if (card.links && to.length > 0) {
      const refs = to.map(other => this.renvoi(other.at, other.title, words))
      said.push(`${card.links.heading} `, ...refs.flatMap((ref, rank) =>
        rank === 0 ? [ref] : [document.createTextNode(rank === refs.length - 1 ? ` ${words.linkAnd} ` : ", "), ref]))
    }
    if (card.by) said.push(`${said.length > 0 ? " " : ""}${words.byAuthor} ${card.by}`)
    return said
  }

  /** A renvoi to the event at `at`: a reference the reader can only read is one they have to go and find. */
  private renvoi(at: number, label: string, words: CaseTimelineWords): HTMLButtonElement {
    const link = document.createElement("button")
    link.type = "button"
    link.className = "event-ref"
    link.textContent = label
    link.title = words.openEvent
    link.addEventListener("click", () => this.follow(at))
    // Pointed at or focused, the card it leads to is lit, so that a reference is found without reading the whole chronology — and nothing
    // is lit when that card is filtered out, which is answer enough.
    const aim = (lit: boolean) => this.list.querySelector<HTMLElement>(`.event-card[data-at="${at}"]`)?.classList.toggle("event-aimed", lit)
    for (const [name, lit] of [["mouseenter", true], ["mouseleave", false], ["focus", true], ["blur", false]] as const) {
      link.addEventListener(name, () => aim(lit))
    }
    return link
  }
}
