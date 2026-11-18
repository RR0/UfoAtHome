import { ReadingSensitivity } from "../engine/interpretation/ReadingSensitivity.js"
import { Provenance } from "../engine/persistence/Provenance.js"
import type { SightingRecordingJson } from "../engine/persistence/sightingJson.js"
import { HostLocale, selectLocale } from "../i18n/locale.js"
import { HintElement } from "./HintElement.js"
import { ReadingSensitivityElement } from "./ReadingSensitivityElement.js"
import type { ReadingSensitivityMessages } from "./messages/ReadingSensitivityMessages.js"
import { READING_SENSITIVITY_MESSAGES, UFO_SUPPORTED_LANGUAGES, type UfoLanguage } from "./messages/index.js"

/** One reading of a case, as the table sets it beside the others. */
export interface ComparedReading {
  /** What the case calls the reading. */
  title: string
  /** Whose account it reads, as the case names it. */
  witness: string
  /** The account it reads and the reading itself, once they are loaded. */
  account?: SightingRecordingJson
  reading?: SightingRecordingJson
  /** Opens the reading where the host shows readings: the witness it is read for is a link when there is somewhere to go. */
  open?: () => void
}

/** What the table is ordered by: the case's own order, the readings' standing (the default, best first), or one of its columns. */
type SortKey = "case" | "reproduced" | "gap" | "robustness" | "supposed"

/** What a row is ordered by, once its recordings are loaded and it could be set against the account. */
interface RowStanding {
  agreement: number
  /** 0 sufficient, 1 no law to judge it on, 2 fine-tuned, 3 too little reproduced to measure. */
  robustness: number
  gapDeg?: number
  supposed: number
}

/**
 * A case's readings side by side, as the GEIPAN asked to compare hypotheses (A. Cousyn, November 2026): for each, how many of the
 * witness's indications it reproduces, how far from them it is, whether that rests on a fine-tuning, and how many values it supposed
 * (see ReadingSensitivity).
 *
 * One element for the case's player and its editor alike, folded until it is asked for: its recordings are loaded then, through what the
 * host gives {@link show} as `load`, and not before (a case's accounts can be megabytes).
 */
export class ReadingsComparisonElement extends HTMLElement {
  static readonly TAG = "rr0-readings-comparison"

  private static readonly CSS = `
:host { display: block; font-size: 13px; line-height: 1.4; }
:host([hidden]) { display: none; }
summary { cursor: pointer; list-style-position: inside; font: 600 12px/1.4 var(--rr0-sans, system-ui, sans-serif); letter-spacing: .08em; text-transform: uppercase; opacity: .8; }
.scroll { overflow-x: auto; margin-top: 6px; }
table { border-collapse: collapse; width: 100%; min-width: 34em; }
th, td { padding: 4px 8px; border-bottom: 1px solid color-mix(in srgb, currentColor 15%, transparent); text-align: left; vertical-align: top; }
th { font-weight: 600; opacity: .75; white-space: nowrap; }
td.number { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
td[data-robustness="sufficient"] { color: var(--ok, #2e8b3e); }
td[data-robustness="fine-tuned"], td[data-robustness="too-few"] { color: var(--warn, #d9822b); }
td[data-robustness="none"] { opacity: .6; }
th button.sort { padding: 0; border: 0; background: none; color: inherit; font: inherit; cursor: pointer; white-space: nowrap; }
th button.sort:hover, th[aria-sort] button.sort { text-decoration: underline; text-underline-offset: 2px; }
button.link { padding: 0; border: 0; background: none; color: inherit; font: inherit; text-align: left; text-decoration: underline; text-underline-offset: 2px; cursor: pointer; }
${HintElement.CSS}
`

  private messages?: ReadingSensitivityMessages
  private language: UfoLanguage = "en"
  private rows: ComparedReading[] = []
  private load?: () => Promise<ComparedReading[]>
  private loaded = false
  private opened = false
  /** Best first by default: what reproduces the most of the account, and the most robustly, at the top. */
  private sort: { key: SortKey, descending: boolean } = { key: "reproduced", descending: true }

  static register(): void {
    if (!customElements.get(ReadingsComparisonElement.TAG)) customElements.define(ReadingsComparisonElement.TAG, ReadingsComparisonElement)
  }

  static create(): ReadingsComparisonElement {
    ReadingsComparisonElement.register()
    return document.createElement(ReadingsComparisonElement.TAG) as ReadingsComparisonElement
  }

  constructor() {
    super()
    this.attachShadow({ mode: "open" })
  }

  connectedCallback(): void {
    if (!this.messages) void this.loadLocale()
  }

  /**
   * The readings to set side by side, and how to load what they lack: called the first time the table is unfolded, its rows then
   * replacing these.
   */
  show(rows: ComparedReading[], load?: () => Promise<ComparedReading[]>): void {
    this.rows = rows
    this.load = load
    this.loaded = rows.every(row => row.account && row.reading)
    this.draw()
    if (this.opened) void this.loadRows()
  }

  private async loadLocale(): Promise<void> {
    const language = selectLocale(HostLocale.preferencesFor(this), UFO_SUPPORTED_LANGUAGES) as UfoLanguage
    this.messages = await READING_SENSITIVITY_MESSAGES.load(language)
    this.language = language
    this.draw()
  }

  private async loadRows(): Promise<void> {
    if (this.loaded || !this.load) return
    this.loaded = true
    this.rows = await this.load()
    this.draw()
  }

  private draw(): void {
    const m = this.messages
    this.hidden = this.rows.length === 0
    if (!m || this.rows.length === 0) {
      this.shadowRoot!.replaceChildren()
      return
    }
    const c = m.comparison
    const style = document.createElement("style")
    style.textContent = ReadingsComparisonElement.CSS
    const details = document.createElement("details")
    details.open = this.opened
    details.addEventListener("toggle", () => {
      this.opened = details.open
      if (details.open) void this.loadRows()
    })
    const summary = document.createElement("summary")
    summary.append(c.heading.replace("{n}", String(this.rows.length)), HintElement.of(c.hint))
    const table = document.createElement("table")
    const head = table.createTHead().insertRow()
    const columns: [string, SortKey | undefined][] = [[c.reading, "case"], [c.witness, undefined], [c.reproduced, "reproduced"], [c.gap, "gap"],
      [c.robustness, "robustness"], [c.supposed, "supposed"]]
    for (const [label, key] of columns) {
      const cell = document.createElement("th")
      cell.scope = "col"
      if (!key) {
        cell.textContent = label
      } else {
        const sorted = this.sort.key === key
        if (sorted && key !== "case") cell.setAttribute("aria-sort", this.sort.descending ? "descending" : "ascending")
        if (sorted && key === "case") cell.setAttribute("aria-sort", "other")
        const button = document.createElement("button")
        button.type = "button"
        button.className = "sort"
        button.title = c.sortBy.replace("{column}", label)
        button.textContent = sorted && key !== "case" ? `${label} ${this.sort.descending ? "▾" : "▴"}` : label
        button.addEventListener("click", () => {
          // The same column again turns it round; another one starts from what is best in it.
          this.sort = sorted ? { key, descending: !this.sort.descending } : { key, descending: key !== "gap" && key !== "supposed" ? true : false }
          this.draw()
        })
        cell.append(button)
      }
      head.append(cell)
    }
    const body = table.createTBody()
    const ordered = this.ordered()
    // One hypothesis read for each witness is one title on several rows: grouped, it is compared across witnesses at a glance. Grouped when
    // the order is the case's or the readings' standing (a group where its best row stands); one row each when it is a single column's.
    const grouping = this.sort.key === "case" || this.sort.key === "reproduced"
    const titles = [...new Set(ordered.map(row => row.title))]
    const grouped = grouping ? titles.flatMap(title => ordered.filter(row => row.title === title)) : ordered
    grouped.forEach((row, index) => {
      const first = !grouping || index === 0 || grouped[index - 1].title !== row.title
      const span = !first ? 0 : grouping ? grouped.filter(other => other.title === row.title).length : 1
      this.drawRow(body.insertRow(), row, m, span)
    })
    const scroll = document.createElement("div")
    scroll.className = "scroll"
    scroll.append(table)
    details.append(summary, scroll)
    this.shadowRoot!.replaceChildren(style, details)
  }

  /** The rows in the order asked: the case's, or by a column, the rows that cannot be set against their account last whatever the way. */
  private ordered(): ComparedReading[] {
    const { key, descending } = this.sort
    if (key === "case") return [...this.rows]
    const standings = new Map(this.rows.map(row => [row, this.standingOf(row)]))
    const way = descending ? -1 : 1
    const compare = {
      reproduced: (a: RowStanding, b: RowStanding) => way * (a.agreement - b.agreement)
        || (b.robustness - a.robustness) * way || ((a.gapDeg ?? Infinity) - (b.gapDeg ?? Infinity)) * -way || (a.supposed - b.supposed) * -way,
      gap: (a: RowStanding, b: RowStanding) => (a.gapDeg === undefined ? 1 : 0) - (b.gapDeg === undefined ? 1 : 0) || way * ((a.gapDeg ?? 0) - (b.gapDeg ?? 0)),
      robustness: (a: RowStanding, b: RowStanding) => -way * (a.robustness - b.robustness),
      supposed: (a: RowStanding, b: RowStanding) => way * (a.supposed - b.supposed)
    }[key]
    // Sorted stably: rows that stand alike keep the case's order.
    return this.rows.map((row, index) => ({ row, index })).sort((a, b) => {
      const sa = standings.get(a.row)
      const sb = standings.get(b.row)
      if (!sa || !sb) return (sa ? 0 : 1) - (sb ? 0 : 1) || a.index - b.index
      return compare(sa, sb) || a.index - b.index
    }).map(entry => entry.row)
  }

  /** What a row stands by, as its cells show it; undefined for one not loaded yet or with nothing to set against its account. */
  private standingOf(row: ComparedReading): RowStanding | undefined {
    if (!row.account || !row.reading) return undefined
    const result = ReadingSensitivityElement.resultOf(row.account, row.reading)
    if (!result || result.compared === 0) return undefined
    const { provenance } = Provenance.strip(row.reading)
    const supposed = provenance.paths().filter(path => path.startsWith("interpretation") && Provenance.free(provenance.at(path))).length
    const robustness = !ReadingSensitivity.measurable(result) ? 3 : result.sufficient === true ? 0 : result.sufficient === false ? 2 : 1
    return { agreement: result.agreement, robustness, ...(result.medianSeparationDeg === undefined ? {} : { gapDeg: result.medianSeparationDeg }), supposed }
  }

  /** The title of a hypothesis, over the `span` rows of the witnesses it is read for. */
  private drawTitle(line: HTMLTableRowElement, row: ComparedReading, span: number): void {
    const title = line.insertCell()
    title.rowSpan = span
    title.textContent = row.title
  }

  /** Whose account a row's reading reads: a link to that reading, where it can be opened. */
  private drawWitness(line: HTMLTableRowElement, row: ComparedReading): void {
    const witness = line.insertCell()
    if (!row.open) {
      witness.textContent = row.witness
      return
    }
    const link = document.createElement("button")
    link.type = "button"
    link.className = "link"
    link.textContent = row.witness
    link.addEventListener("click", row.open)
    witness.append(link)
  }

  /** @param span How many rows its title spans, from this one: 0 for a row whose title the one above already gives. */
  private drawRow(line: HTMLTableRowElement, row: ComparedReading, m: ReadingSensitivityMessages, span: number): void {
    const c = m.comparison
    const cell = (text: string, number = false) => {
      const td = line.insertCell()
      td.textContent = text
      if (number) td.className = "number"
      return td
    }
    if (span > 0) this.drawTitle(line, row, span)
    this.drawWitness(line, row)
    if (!row.account || !row.reading) {
      for (let i = 0; i < 4; i++) cell(c.loading)
      return
    }
    const result = ReadingSensitivityElement.resultOf(row.account, row.reading)
    // Every value the reading says it supposed or fitted in what it puts forward, its interpretation: the more of them, the easier a
    // likeness is to make. What it copied of the account (the place, the pose) is the account's, supposed or not, and the same for all.
    const { provenance } = Provenance.strip(row.reading)
    const supposed = provenance.paths().filter(path => path.startsWith("interpretation") && Provenance.free(provenance.at(path)))
    if (!result || result.compared === 0) {
      const nothing = cell(c.nothing)
      nothing.colSpan = 3
      nothing.dataset.robustness = "none"
      cell(String(supposed.length), true)
      return
    }
    const agreed = Math.round(result.agreement * result.compared)
    cell(`${agreed} / ${result.compared}`, true)
    const number = new Intl.NumberFormat(this.language, { maximumFractionDigits: 1 })
    cell(result.medianSeparationDeg === undefined ? "–" : `${number.format(result.medianSeparationDeg)}°`, true)
    const robustness = !ReadingSensitivity.measurable(result) ? { kind: "too-few", text: c.tooFew }
      : result.sufficient === true ? { kind: "sufficient", text: c.sufficient }
        : result.sufficient === false ? { kind: "fine-tuned", text: c.fineTuned.replace("{knob}", m.knobs[result.margins[0].knob]) }
          : { kind: "none", text: c.unjudged }
    cell(robustness.text).dataset.robustness = robustness.kind
    cell(String(supposed.length), true)
  }
}
