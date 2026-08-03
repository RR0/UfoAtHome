import { html, css } from "./witnessesTemplate.js"
import { UfoElement, registerUfo, UFO_ELEMENT_NAME } from "./UfoElement.js"
import type { SightingRecordingJson } from "../engine/persistence/sightingJson.js"
import { selectLocale } from "../i18n/locale.js"
import { loadWitnessSelectorMessages, UFO_SUPPORTED_LANGUAGES } from "./messages/index.js"
import type { UfoLanguage } from "./messages/index.js"

registerUfo()

interface WitnessEntry {
  src: string
  sighting: SightingRecordingJson
}

/**
 * Vanilla Web Component letting a page switch between several witnesses' recordings of the
 * same sighting (a case can have more than one `sighting.json`, one per witness) — composes a
 * nested `<rr0-ufo>` for the actual canvas/playback instead of duplicating it, same pattern as
 * `<rr0-scene>`. Read-only playback only, no recording/editing UI, matching `<rr0-ufo>`'s own
 * "lightweight, embeddable in a content page" intent.
 *
 * The `src` attribute (or `witnessUrls` property) is just a plain list of each witness's own
 * `sighting.json` URL — no separately-maintained labels, since a witness's display name
 * (`SightingRecordingJson.witnessName`) and the shared `caseId` linking them together already
 * live inside each witness's own file (single source of truth: an external manifest
 * duplicating those would risk drifting out of sync with the actual data). This does mean every
 * listed witness's recording is fetched upfront (to read its name), not lazily on selection —
 * fine at the scale a case's witness list actually has (a handful of small JSON files).
 *
 * The selector UI is hidden entirely when there's nothing to choose between (0 or 1 witness).
 */
export class WitnessSelectorElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ["src"]
  }

  private readonly shadow: ShadowRoot
  private readonly ufoElement: UfoElement
  private readonly selectorContainer: HTMLElement
  private readonly witnessSelect: HTMLSelectElement
  private readonly labelWitness: HTMLElement

  private entries: WitnessEntry[] = []
  private currentSrc?: string

  constructor() {
    super()
    this.shadow = this.attachShadow({ mode: "open" })
    const template = document.createElement("template")
    template.innerHTML = `<style>${css}</style>${html}`
    this.shadow.appendChild(template.content.cloneNode(true))

    // Created imperatively rather than left inline in the template markup — see
    // UfoRecorderElement's constructor for why (an inline tag parsed from
    // template.content.cloneNode(true) isn't upgraded to its class instance yet at this point).
    this.ufoElement = document.createElement(UFO_ELEMENT_NAME) as UfoElement
    this.shadow.getElementById("ufo-slot")!.replaceWith(this.ufoElement)

    this.selectorContainer = this.shadow.getElementById("witness-selector")!
    this.witnessSelect = this.shadow.getElementById("witness") as HTMLSelectElement
    this.labelWitness = this.shadow.getElementById("label-witness")!
    this.witnessSelect.addEventListener("change", () => this.selectWitness(this.witnessSelect.value))

    void this.loadLocaleMessages()
  }

  /** Auto-detects the visitor's preferred UI language from `navigator.languages`, falling back
   * to English (already baked into the template) when none of their preferences are
   * supported — see selectLocale. There is deliberately no language-picker UI, matching
   * `<rr0-ufo>`'s own approach. */
  private async loadLocaleMessages(): Promise<void> {
    const language = selectLocale(navigator.languages, UFO_SUPPORTED_LANGUAGES) as UfoLanguage
    if (language === "en") return
    const messages = await loadWitnessSelectorMessages(language)
    this.labelWitness.textContent = messages.witness
  }

  connectedCallback(): void {
    const src = this.getAttribute("src")
    if (src) {
      void this.loadFromSrc(src)
    }
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string): void {
    if (name === "src" && newValue && newValue !== oldValue && this.isConnected) {
      void this.loadFromSrc(newValue)
    }
  }

  /** Fetches a witness manifest — a plain JSON array of each witness's own sighting.json URL —
   * from `url` and loads it. What the `src` attribute uses. */
  async loadFromSrc(url: string): Promise<void> {
    const response = await fetch(url)
    const urls = (await response.json()) as string[]
    await this.loadWitnessUrls(urls)
  }

  get witnessUrls(): string[] {
    return this.entries.map(entry => entry.src)
  }

  set witnessUrls(urls: string[]) {
    void this.loadWitnessUrls(urls)
  }

  private async loadWitnessUrls(urls: string[]): Promise<void> {
    const entries = await Promise.all(
      urls.map(async (src): Promise<WitnessEntry> => {
        const response = await fetch(src)
        return { src, sighting: (await response.json()) as SightingRecordingJson }
      })
    )
    this.setEntries(entries)
  }

  private setEntries(entries: WitnessEntry[]): void {
    this.entries = entries
    this.warnOnMismatchedCaseIds(entries)

    this.selectorContainer.hidden = entries.length <= 1
    this.witnessSelect.innerHTML = ""
    for (const entry of entries) {
      const option = document.createElement("option")
      option.value = entry.src
      option.textContent = entry.sighting.witnessName ?? entry.sighting.witnessId ?? entry.src
      this.witnessSelect.appendChild(option)
    }

    // Keeps the current witness selected if the new list still has them (e.g. a manifest
    // refresh), otherwise falls back to the first witness.
    const next = entries.find(entry => entry.src === this.currentSrc) ?? entries[0]
    if (next) {
      this.selectWitness(next.src)
    }
  }

  /** Cases are grouped by listing several witnesses together — warns (doesn't block) if their
   * declared caseIds actually disagree, since that likely means the page author listed
   * unrelated recordings together by mistake. Witnesses with no caseId at all are ignored. */
  private warnOnMismatchedCaseIds(entries: WitnessEntry[]): void {
    const caseIds = new Set(entries.map(entry => entry.sighting.caseId).filter((id): id is string => id !== undefined))
    if (caseIds.size > 1) {
      console.warn(`<rr0-ufo-witnesses>: witnesses declare different case ids (${[...caseIds].join(", ")}) — they may not belong to the same case.`)
    }
  }

  private selectWitness(src: string): void {
    const entry = this.entries.find(e => e.src === src)
    if (!entry) return
    this.currentSrc = src
    this.witnessSelect.value = src
    // Already fetched by loadWitnessUrls — no need to re-fetch on every selection change.
    this.ufoElement.sightingData = entry.sighting
  }
}

export const WITNESS_SELECTOR_ELEMENT_NAME = "rr0-ufo-witnesses"

export function registerWitnessSelector(): void {
  registerUfo()
  if (!customElements.get(WITNESS_SELECTOR_ELEMENT_NAME)) {
    customElements.define(WITNESS_SELECTOR_ELEMENT_NAME, WitnessSelectorElement)
  }
}
