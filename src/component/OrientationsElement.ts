import type { OrientationResults } from "../engine/orientation/OrientationProvider.js"
import { Orientation } from "../engine/orientation/OrientationProvider.js"
import { SaidTexts } from "../engine/model/SaidText.js"
import type { SaidText } from "../engine/model/SaidText.js"
import { Messages } from "../i18n/MessageCatalog.js"
import { orientationMessages } from "./messages/OrientationMessages.js"
import type { OrientationMessages } from "./messages/OrientationMessages.js"

const STYLE = `
:host { display: block; font: inherit; color: inherit; }
.caution { font-size: 0.9em; margin: 0.25em 0 0.75em; padding: 0.4em 0.6em; border-left: 3px solid currentColor; opacity: 0.85; }
.meta { font-size: 0.85em; opacity: 0.8; margin: 0.2em 0; }
.profile { margin: 0.75em 0; }
.profile h4 { margin: 0 0 0.25em; font-size: 1em; }
.episodes { font-size: 0.9em; margin: 0 0 0.4em; }
.stale { color: #b45309; }
@media (prefers-color-scheme: dark) { .stale { color: #fbbf24; } }
.configurations { display: flex; flex-wrap: wrap; gap: 0.75em; }
table { border-collapse: collapse; font-size: 0.9em; }
caption { text-align: start; font-weight: 600; padding-bottom: 0.2em; }
th, td { padding: 0.1em 0.5em; text-align: start; border-bottom: 1px solid color-mix(in srgb, currentColor 20%, transparent); }
td.score { text-align: end; font-variant-numeric: tabular-nums; }
`

/**
 * The statistical indicators a case was given by a tool of statistical orientation (see OrientationProvider), each result as the tool gave it: its
 * engine and version, the reference its frequencies were read from, when it was computed, and per profile the episodes it codes and the first ranks
 * under each setting.
 *
 * A part of its own, never mixed with what a simulation finds: a score says how a description compares with the cases of a corpus, not what the
 * phenomenon was, and the caution saying so is always shown with it. An episode coded on a recording that changed since says so (see
 * Orientation.stale): a score cites the version it coded.
 */
export class OrientationsElement extends HTMLElement {
  static readonly TAG = "rr0-orientations"

  private readonly shadow = this.attachShadow({ mode: "open" })
  private resultsValue: OrientationResults[] = []
  private digestsValue: ReadonlyMap<string, string> = new Map()
  private labelsValue: ReadonlyMap<string, string> = new Map()
  private texts?: OrientationMessages
  private token = 0
  /** Resolved once what is shown is drawn in the reader's language. */
  ready: Promise<void> = Promise.resolve()

  static get observedAttributes(): string[] {
    return ["lang"]
  }

  attributeChangedCallback(): void {
    this.texts = undefined
    this.update()
  }

  connectedCallback(): void {
    this.update()
  }

  set results(results: OrientationResults[]) {
    this.resultsValue = results
    this.update()
  }

  get results(): OrientationResults[] {
    return this.resultsValue
  }

  /** The SHA-256 of each recording of the case as it is now, by the `id` of its event (see RecordingDigest). */
  set digests(digests: ReadonlyMap<string, string>) {
    this.digestsValue = digests
    this.update()
  }

  /** What each event of the case is called, by its `id`, for an episode to be named as the case names it. */
  set labels(labels: ReadonlyMap<string, string>) {
    this.labelsValue = labels
    this.update()
  }

  private get language(): string {
    return this.closest("[lang]")?.getAttribute("lang") ?? document.documentElement.lang ?? "en"
  }

  private update(): void {
    const token = ++this.token
    this.ready = (async () => {
      const texts = this.texts ??= await orientationMessages.load(Messages.languageOf(this.language))
      if (token === this.token) this.render(texts)
    })()
  }

  private render(m: OrientationMessages): void {
    const said = new SaidTexts([this.language])
    const read = (text: SaidText | undefined): string => said.read(text) ?? ""
    const element = <K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, className?: string): HTMLElementTagNameMap[K] => {
      const made = document.createElement(tag)
      if (text !== undefined) made.textContent = text
      if (className) made.className = className
      return made
    }
    const style = element("style", STYLE)
    const heading = element("h3", m.heading)
    const caution = element("p", m.caution, "caution")
    caution.setAttribute("role", "note")
    const parts: Node[] = [style, heading, caution]
    if (this.resultsValue.length === 0) parts.push(element("p", m.empty))
    for (const result of this.resultsValue) {
      const section = element("section")
      section.className = "result"
      const meta = [m.engine.replace("{engine}", result.engine.name).replace("{version}", result.engine.version ?? "?")]
      if (result.reference?.sha256) meta.push(`${m.reference.replace("{sha256}", result.reference.sha256)}${result.reference.date ? ` ${m.referenceDate.replace("{date}", result.reference.date)}` : ""}`)
      if (result.computed) meta.push(m.computed.replace("{date}", result.computed))
      if (result.reference?.note) meta.push(read(result.reference.note))
      for (const line of meta) section.append(element("p", line, "meta"))
      if (result.caution) section.append(element("p", read(result.caution), "meta"))
      const stale = Orientation.stale(result, this.digestsValue)
      for (const profile of result.profiles) {
        const block = element("div", undefined, "profile")
        block.dataset.profile = profile.id
        block.append(element("h4", profile.title ? `${profile.id} · ${read(profile.title)}` : profile.id))
        const episodes = element("p", `${m.episodes} `, "episodes")
        profile.episodes.forEach((episode, index) => {
          if (index > 0) episodes.append(", ")
          const name = element("span", this.labelsValue.get(episode.event) ?? episode.event)
          name.dataset.event = episode.event
          episodes.append(name)
          const changed = stale.some(item => item.profile === profile.id && item.event === episode.event)
          if (changed) episodes.append(" (", element("span", m.stale, "stale"), ")")
          else if (episode.digest === undefined) episodes.append(` (${m.undated})`)
        })
        block.append(episodes)
        const configurations = element("div", undefined, "configurations")
        for (const configuration of profile.configurations) {
          const table = element("table")
          table.append(element("caption", configuration.population !== undefined
            ? `${read(configuration.label)} · ${m.population.replace("{population}", configuration.population.toLocaleString(this.language))}`
            : read(configuration.label)))
          const head = element("tr")
          head.append(element("th", m.rank), element("th", m.family), element("th", m.score))
          table.append(head)
          for (const rank of configuration.top) {
            const row = element("tr")
            row.append(element("td", String(rank.rank)), element("td", rank.label ? read(rank.label) : rank.family), element("td", rank.score.toFixed(4), "score"))
            table.append(row)
          }
          configurations.append(table)
        }
        block.append(profile.configurations.length > 0 ? configurations : element("p", m.unranked, "meta"))
        section.append(block)
      }
      parts.push(section)
    }
    this.shadow.replaceChildren(...parts)
  }
}

export function register(): void {
  if (!customElements.get(OrientationsElement.TAG)) customElements.define(OrientationsElement.TAG, OrientationsElement)
}
