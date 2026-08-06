import { html, css } from "./eyewitnessTemplate.js"
import { SceneElement, registerScene, SCENE_ELEMENT_NAME } from "./SceneElement.js"
import type { SightingRecordingJson } from "../engine/persistence/sightingJson.js"
import type { People } from "../engine/model/People.js"
import { selectLocale } from "../i18n/locale.js"
import { sightingTimeToDate } from "../engine/astronomy/CelestialPositions.js"
import { loadEyewitnessMessages, UFO_SUPPORTED_LANGUAGES } from "./messages/index.js"
import type { UfoLanguage } from "./messages/index.js"
import { eyewitnessMessages_en } from "./messages/EyewitnessMessages_en.js"
import type { EyewitnessMessages } from "./messages/EyewitnessMessages.js"

registerScene()

interface WitnessEntry {
  src: string
  sighting: SightingRecordingJson
}

/** The only bundled audio asset that actually requires attribution (rain.ogg/wind.ogg are CC0)
 * — see CREDITS.md. Always listed (the asset is always bundled, regardless of whether this
 * particular sighting's weather ever triggers a lightning flash). */
const THUNDER_CREDIT_TEXT = '“Thunder” by Jerimee'
const THUNDER_CREDIT_LICENSE_URL = "https://creativecommons.org/licenses/by/3.0/"
const THUNDER_CREDIT_LICENSE = "CC BY 3.0"

const APP_HOME_URL = "https://ufoathome.org"

/**
 * Vanilla Web Component displaying one or more witnesses' recordings of the same sighting (a
 * case can have more than one `sighting.json`, one per witness) — composes a nested `<rr0-scene>`
 * for the actual canvas/playback instead of duplicating it, the same way `<rr0-ufo-recorder>`
 * does. This is the standard way to display *any* real sighting, whether it has one witness or
 * several: a witness recording is always a real sighting (real date/time/location), so it always
 * needs the real sky/ground backdrop `<rr0-scene>` provides — a bare `<rr0-ufo>` (just the
 * recorded shape, no astronomy) would misrepresent what the witness actually reported seeing.
 * Read-only playback only, no recording/editing UI.
 *
 * The `src` attribute (or `witnessUrls` property) accepts either a witness manifest (a plain
 * JSON array of each witness's own `sighting.json` URL) or, for the common single-witness case,
 * a `sighting.json` URL directly — no manifest file needs to exist just to describe one entry.
 * No separately-maintained labels either way, since a witness's display name
 * (`SightingRecordingJson.witness`) and the shared `caseId` linking them together already
 * live inside each witness's own file (single source of truth: an external manifest duplicating
 * those would risk drifting out of sync with the actual data). Every listed witness's recording
 * is fetched upfront (to read its name), not lazily on selection — fine at the scale a case's
 * witness list actually has (a handful of small JSON files).
 *
 * The toolbar (testimony line + the "about" info button) is hidden only when nothing has loaded
 * yet. The testimony line itself — "Testimony by <witness>" — is always shown once something has
 * loaded, even for a single witness: the `<select>` only replaces the plain witness name once
 * there's actually more than one to choose between (a one-option dropdown would be pointless), but
 * the sentence around it never disappears. Date/location/case live only in the info panel's own
 * Observation section, not duplicated here.
 */
export class EyewitnessElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ["src"]
  }

  private readonly shadow: ShadowRoot
  private readonly sceneElement: SceneElement
  private readonly toolbarElement: HTMLElement
  private readonly testimonyPrefix: HTMLElement
  private readonly witnessText: HTMLElement
  private readonly witnessSelect: HTMLSelectElement
  private readonly infoButton: HTMLButtonElement
  private readonly infoPanel: HTMLElement
  private readonly infoAppLink: HTMLAnchorElement
  private readonly infoObservationHeading: HTMLElement
  private readonly infoObservationList: HTMLElement
  private readonly infoCreditsToggle: HTMLButtonElement
  private readonly infoCreditsList: HTMLElement
  private readonly infoCloseButton: HTMLButtonElement

  private entries: WitnessEntry[] = []
  private currentSrc?: string
  private infoOpen = false
  private creditsOpen = false
  private language: UfoLanguage = "en"
  private messages: EyewitnessMessages = eyewitnessMessages_en

  constructor() {
    super()
    this.shadow = this.attachShadow({ mode: "open" })
    const template = document.createElement("template")
    template.innerHTML = `<style>${css}</style>${html}`
    this.shadow.appendChild(template.content.cloneNode(true))

    // Created imperatively rather than left inline in the template markup — see
    // UfoRecorderElement's constructor for why (an inline tag parsed from
    // template.content.cloneNode(true) isn't upgraded to its class instance yet at this point).
    this.sceneElement = document.createElement(SCENE_ELEMENT_NAME) as SceneElement
    this.shadow.getElementById("ufo-slot")!.replaceWith(this.sceneElement)

    this.toolbarElement = this.shadow.getElementById("toolbar")!
    this.testimonyPrefix = this.shadow.getElementById("testimony-prefix")!
    this.witnessText = this.shadow.getElementById("witness-text")!
    this.witnessSelect = this.shadow.getElementById("witness") as HTMLSelectElement
    this.infoButton = this.shadow.getElementById("info-button") as HTMLButtonElement
    this.infoPanel = this.shadow.getElementById("info-panel")!
    this.infoAppLink = this.shadow.getElementById("info-app-link") as HTMLAnchorElement
    this.infoObservationHeading = this.shadow.getElementById("info-observation-heading")!
    this.infoObservationList = this.shadow.getElementById("info-observation-list")!
    this.infoCreditsToggle = this.shadow.getElementById("info-credits-toggle") as HTMLButtonElement
    this.infoCreditsList = this.shadow.getElementById("info-credits-list")!
    this.infoCloseButton = this.shadow.getElementById("info-close") as HTMLButtonElement

    this.witnessSelect.addEventListener("change", () => this.selectWitness(this.witnessSelect.value))
    this.infoButton.addEventListener("click", () => this.toggleInfoPanel())
    this.infoCloseButton.addEventListener("click", () => this.toggleInfoPanel())
    this.infoCreditsToggle.addEventListener("click", () => this.toggleCredits())

    void this.loadLocaleMessages()
  }

  /** Auto-detects the visitor's preferred UI language from `navigator.languages`, falling back
   * to English (already baked into the template) when none of their preferences are
   * supported — see selectLocale. There is deliberately no language-picker UI, matching
   * `<rr0-ufo>`'s own approach. */
  private async loadLocaleMessages(): Promise<void> {
    this.language = selectLocale(navigator.languages, UFO_SUPPORTED_LANGUAGES) as UfoLanguage
    if (this.language === "en") return
    this.messages = await loadEyewitnessMessages(this.language)
    this.testimonyPrefix.textContent = this.messages.testimonyBy
    this.infoButton.title = this.messages.about
    this.infoButton.setAttribute("aria-label", this.messages.about)
    this.infoCloseButton.setAttribute("aria-label", this.messages.close)
    this.infoObservationHeading.textContent = this.messages.observation
    this.infoCreditsToggle.textContent = this.messages.credits
    if (this.infoOpen) this.populateInfoPanel()
    this.updateTestimonyLine()
  }

  connectedCallback(): void {
    const src = this.getAttribute("src")
    if (src) {
      void this.loadFromSrc(src)
    }
  }

  /** Only matters if this element gets removed while the info panel is still open — otherwise
   * toggleInfoPanel() already removes handleOutsideClick itself on close. Without this, that
   * document-level listener would outlive the element, referencing now-detached nodes forever. */
  disconnectedCallback(): void {
    document.removeEventListener("click", this.handleOutsideClick)
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string): void {
    if (name === "src" && newValue && newValue !== oldValue && this.isConnected) {
      void this.loadFromSrc(newValue)
    }
  }

  /** Fetches `url` and loads it — what the `src` attribute uses. Accepts either a witness
   * manifest (a plain JSON array of each witness's own `sighting.json` URL) or a single
   * `sighting.json` directly (detected by shape: an array is a manifest, an object is one
   * witness's own recording) — the common single-witness case needs no manifest file at all. */
  async loadFromSrc(url: string): Promise<void> {
    const response = await fetch(url)
    const json = (await response.json()) as string[] | SightingRecordingJson
    if (Array.isArray(json)) {
      await this.loadWitnessUrls(json)
    } else {
      this.setEntries([{ src: url, sighting: json }])
    }
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

    this.toolbarElement.hidden = entries.length === 0
    const showSelect = entries.length > 1
    this.witnessSelect.hidden = !showSelect
    this.witnessText.hidden = showSelect
    this.witnessSelect.innerHTML = ""
    for (const entry of entries) {
      const option = document.createElement("option")
      option.value = entry.src
      option.textContent = this.witnessDisplayName(entry.sighting.witness) ?? entry.src
      this.witnessSelect.appendChild(option)
    }

    // Keeps the current witness selected if the new list still has them (e.g. a manifest
    // refresh), otherwise falls back to the first witness.
    const next = entries.find(entry => entry.src === this.currentSrc) ?? entries[0]
    if (next) {
      this.selectWitness(next.src)
    } else {
      this.updateTestimonyLine()
    }
  }

  /** Cases are grouped by listing several witnesses together — warns (doesn't block) if their
   * declared caseIds actually disagree, since that likely means the page author listed
   * unrelated recordings together by mistake. Witnesses with no caseId at all are ignored. */
  private warnOnMismatchedCaseIds(entries: WitnessEntry[]): void {
    const caseIds = new Set(entries.map(entry => entry.sighting.caseId).filter((id): id is string => id !== undefined))
    if (caseIds.size > 1) {
      console.warn(`<rr0-eyewitness>: witnesses declare different case ids (${[...caseIds].join(", ")}) — they may not belong to the same case.`)
    }
  }

  private selectWitness(src: string): void {
    const entry = this.entries.find(e => e.src === src)
    if (!entry) return
    this.currentSrc = src
    this.witnessSelect.value = src
    // Already fetched by loadWitnessUrls — no need to re-fetch on every selection change.
    // SceneElement's own setter updates astronomy/weather/terrain for the new sighting too.
    this.sceneElement.sightingData = entry.sighting
    this.updateTestimonyLine()
    if (this.infoOpen) this.populateInfoPanel()
  }

  /** Keeps the toolbar's "Testimony by <witness>" line in sync with the currently selected
   * entry — plain text for a single witness (the `<select>` would be pointless with nothing to
   * choose between), the live `<select>`'s own display once there's more than one. */
  private updateTestimonyLine(): void {
    const entry = this.entries.find(e => e.src === this.currentSrc)
    if (entry) {
      this.witnessText.textContent = this.witnessDisplayName(entry.sighting.witness) ?? entry.src
    }
  }

  /** Picks the best available display string out of a People reference — a full name (built from
   * firstNames+lastName) reads more naturally than a raw title in the common case, but `title` is
   * honored first since it's the field a caller sets when they explicitly want a specific display
   * string (e.g. a name that doesn't decompose cleanly into first/last). `id`/`dirName` are
   * last-resort, machine-oriented fallbacks — better than nothing, not meant to be end-user
   * copy. Returns undefined (letting the caller fall back to entry.src) only when witness itself
   * is undefined or empty. */
  private witnessDisplayName(witness?: People): string | undefined {
    if (!witness) return undefined
    const fullName = [...(witness.firstNames ?? []), witness.lastName].filter(Boolean).join(" ")
    return witness.title || fullName || witness.id || witness.dirName
  }

  private formatDate(sighting: SightingRecordingJson): string | undefined {
    const place = sighting.place?.[0]
    const date = sightingTimeToDate(sighting.time ?? {}, place?.lng ?? 0)
    if (!date) return undefined
    return new Intl.DateTimeFormat(this.language === "fr" ? "fr-FR" : "en-US", { dateStyle: "long", timeStyle: "short" }).format(date)
  }

  private formatLocation(sighting: SightingRecordingJson): string | undefined {
    const place = sighting.place?.[0]
    if (!place) return undefined
    return `${place.lat.toFixed(4)}, ${place.lng.toFixed(4)}`
  }

  private toggleInfoPanel(): void {
    this.infoOpen = !this.infoOpen
    this.infoPanel.hidden = !this.infoOpen
    this.infoButton.setAttribute("aria-expanded", String(this.infoOpen))
    if (this.infoOpen) {
      this.populateInfoPanel()
      // Registered only while actually open, not for the component's whole lifetime — a global
      // listener that's a no-op almost all the time would be pure overhead. Safe to add from
      // inside this same click handler: the click that opened the panel (on infoButton) is still
      // bubbling when this listener gets attached, so it *will* see that same event once it
      // reaches document — handleOutsideClick's own composedPath() check is what stops that from
      // immediately closing the panel it just opened.
      document.addEventListener("click", this.handleOutsideClick)
    } else {
      this.creditsOpen = false
      this.infoCreditsList.hidden = true
      this.infoCreditsToggle.setAttribute("aria-expanded", "false")
      document.removeEventListener("click", this.handleOutsideClick)
    }
  }

  /** Closes the panel on any click outside it (and outside the "?" button itself, which has its
   * own toggle already). composedPath() — not event.target — is what makes this work correctly
   * across this element's own shadow boundary: a click's target gets retargeted to the shadow
   * host from outside, losing exactly the distinction (inside the panel vs. not) this needs. */
  private readonly handleOutsideClick = (event: MouseEvent): void => {
    const path = event.composedPath()
    if (!path.includes(this.infoPanel) && !path.includes(this.infoButton)) {
      this.toggleInfoPanel()
    }
  }

  private toggleCredits(): void {
    this.creditsOpen = !this.creditsOpen
    this.infoCreditsList.hidden = !this.creditsOpen
    this.infoCreditsToggle.setAttribute("aria-expanded", String(this.creditsOpen))
  }

  /** Fills the info panel in one pass: the currently-selected witness's observation metadata
   * (the primary content, shown first), then the smaller footer row below it — app identity
   * (linking to the tool's own home, not this specific recording) and the credits toggle. The
   * credits list itself (live terrain imagery attribution once a real patch has resolved, plus
   * the always-bundled thunder sound credit) is populated here too but stays collapsed until
   * toggleCredits() reveals it — no point building visible DOM for content nobody asked to see
   * yet. Re-run on open and whenever the selected witness changes while the panel is already
   * open — cheap enough not to bother with a more granular per-section update path. */
  private populateInfoPanel(): void {
    const entry = this.entries.find(e => e.src === this.currentSrc)
    this.infoObservationList.innerHTML = ""
    if (entry) {
      const date = this.formatDate(entry.sighting)
      if (date) {
        this.appendInfoRow(this.infoObservationList, this.messages.date, date)
      }
      const location = this.formatLocation(entry.sighting)
      if (location) {
        this.appendInfoRow(this.infoObservationList, this.messages.location, location)
      }
      if (entry.sighting.caseId) {
        this.appendInfoRow(this.infoObservationList, this.messages.case, entry.sighting.caseId)
      }
      if (entry.sighting.description) {
        this.appendInfoRow(this.infoObservationList, this.messages.description, entry.sighting.description)
      }
      if (entry.sighting.tags && entry.sighting.tags.length > 0) {
        this.appendInfoRow(this.infoObservationList, this.messages.tags, entry.sighting.tags.join(", "))
      }
    }

    this.infoAppLink.href = APP_HOME_URL
    this.infoAppLink.textContent = `UFO@home v${__APP_VERSION__}`

    this.infoCreditsList.innerHTML = ""
    const terrainAttribution = this.sceneElement.currentTerrainAttribution
    if (terrainAttribution) {
      const item = document.createElement("li")
      item.textContent = terrainAttribution
      this.infoCreditsList.appendChild(item)
    }
    const thunderItem = document.createElement("li")
    thunderItem.textContent = `${THUNDER_CREDIT_TEXT} (`
    const licenseLink = document.createElement("a")
    licenseLink.href = THUNDER_CREDIT_LICENSE_URL
    licenseLink.target = "_blank"
    licenseLink.rel = "noopener"
    licenseLink.textContent = THUNDER_CREDIT_LICENSE
    thunderItem.appendChild(licenseLink)
    thunderItem.appendChild(document.createTextNode(")"))
    this.infoCreditsList.appendChild(thunderItem)
  }

  private appendInfoRow(list: HTMLElement, label: string, value: string): void {
    const dt = document.createElement("dt")
    dt.textContent = label
    const dd = document.createElement("dd")
    dd.textContent = value
    list.appendChild(dt)
    list.appendChild(dd)
  }
}

export const EYEWITNESS_ELEMENT_NAME = "rr0-eyewitness"

export function registerEyewitness(): void {
  registerScene()
  if (!customElements.get(EYEWITNESS_ELEMENT_NAME)) {
    customElements.define(EYEWITNESS_ELEMENT_NAME, EyewitnessElement)
  }
}
