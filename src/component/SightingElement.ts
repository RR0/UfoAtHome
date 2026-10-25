import { PlayerIcons } from "./PlayerIcons.js"
import type { RecordingSource } from "../engine/model/RecordingSource.js"
import { html, css } from "./sightingTemplate.js"
import { SightingFetch } from "../engine/net/SightingFetch.js"
import { CaseFile } from "../engine/persistence/caseJson.js"
import type { CaseJson } from "../engine/persistence/caseJson.js"
import type { AgentRef, InterpretationJson } from "../engine/interpretation/Interpretation.js"
import type { ConfrontationReading } from "../engine/interpretation/BodyConfrontation.js"
import { SightingSummary } from "./SightingSummary.js"
import { SceneCredits } from "./SceneCredits.js"
import { SightingAssessments } from "./SightingAssessments.js"
import type { SummaryEntry } from "./SightingSummary.js"
import { SceneElement, registerScene, SCENE_ELEMENT_NAME, CONFRONTATION_EVENT } from "./SceneElement.js"
import { OBSERVER_MAP_ATTRIBUTE, MILESTONES_ATTRIBUTE } from "./UfoElement.js"
import type { SightingRecordingJson } from "../engine/persistence/sightingJson.js"
import { Provenance } from "../engine/persistence/Provenance.js"
import type { Basis } from "../engine/persistence/Provenance.js"
import type { People } from "../engine/model/People.js"
import { HostLocale, selectLocale } from "../i18n/locale.js"
import { SaidTexts } from "../engine/model/SaidText.js"
import type { SaidText } from "../engine/model/SaidText.js"
import { SightingTags } from "./messages/TagNames.js"
import { sightingTimeToDate } from "../engine/astronomy/CelestialPositions.js"
import { loadSceneNames, loadSightingMessages, loadTagNames, UFO_SUPPORTED_LANGUAGES } from "./messages/index.js"
import { SceneNaming } from "./messages/SceneNames.js"
import type { UfoLanguage } from "./messages/index.js"
import { sightingMessages_en } from "./messages/SightingMessages_en.js"
import { ShareDialogElement, type ShareSubject } from "./ShareDialogElement.js"
import { AppLocation } from "./AppLocation.js"
import type { SightingMessages } from "./messages/SightingMessages.js"
import { SummaryDescription } from "./SummaryDescription.js"
import { PlaybackPosition } from "../engine/model/PlaybackPosition.js"
import type { SightingTime } from "../engine/model/Sighting.js"

registerScene()
ShareDialogElement.register()

interface ObserverEntry {
  src: string
  sighting: SightingRecordingJson
}


const APP_HOME_URL = AppLocation.home()

/**
 * Asks the player to start with the account shown beside any interpretation chosen, and measured
 * against it — see SceneElement.compareAccount. A reader can still turn it off, as with the map.
 */
export const COMPARE_ACCOUNT_ATTRIBUTE = "compare-account"

/**
 * Where the recording opens, as a length of time from its start: `start-time="125"`, in seconds, or as durations are said (see
 * PlaybackPosition.delta): `1:30`, `1m30s`, `PT1M30S`. Applied once, to the recording the element loads next (`src`, or one set directly),
 * not to each observer the reader then picks. A value past the end opens at the end, an unreadable one at the start. The link's `d=`.
 */
export const START_TIME_ATTRIBUTE = "start-time"

/**
 * Where the recording opens, as a time said during the observation: `start-clock="02:33:15"` (its local time) or with the day,
 * `start-clock="2026-08-11T02:33:15"`, which the recording's own start turns into a position (see PlaybackPosition.elapsedSince). It wins over
 * `start-time` when it can be worked out, and is ignored when it cannot (a recording that does not say its time of day). The link's `t=`.
 */
export const START_CLOCK_ATTRIBUTE = "start-clock"

/**
 * Which recording of a case opens first: `observer="ChauffourValerie"` — the observer's id, the recording's file name,
 * or its place in the case's list (1 is the first). Without it, or with one that names nothing, the first opens. Applied
 * when the case is read, and again whenever it changes, so a link can say which account it is about.
 */
export const OBSERVER_ATTRIBUTE = "observer"

/** The share dialog's choice of the whole case, as opposed to one recording's address. */
const CASE_SCOPE = "case"

/** The choice's value for the recording's own account — see offerInterpretations. */
const ACCOUNT_OPTION = "account"
/** The value of a kept variant in the choice, followed by where it is in the recording's `variants`. */
const VARIANT_OPTION = "variant-"

/** Where a recording is opened for editing on that site. */
const APP_EDITOR_URL = `${APP_HOME_URL}/edit/`

/**
 * Vanilla Web Component displaying one or more observers' recordings of the same sighting (a
 * case can have more than one `sighting.json`, one per observer) — composes a nested `<rr0-scene>`
 * for the actual canvas/playback instead of duplicating it, the same way `<rr0-sighting-editor>`
 * does. This is the standard way to display *any* real sighting, whether it has one observer or
 * several: a observer recording is always a real sighting (real date/time/location), so it always
 * needs the real sky/ground backdrop `<rr0-scene>` provides — a bare `<rr0-ufo>` (just the
 * recorded shape, no astronomy) would misrepresent what the observer actually reported seeing.
 * Read-only playback only, no recording/editing UI.
 *
 * The `src` attribute accepts either a CASE (RR0's `case.json`, whose events of type `sighting`
 * point at each observer's recording — see CaseFile) or one observer's `sighting.json` directly.
 * The `observerUrls` property takes the list of recordings itself. No separately-maintained labels
 * either way, since a observer's display name (`SightingRecordingJson.observer`) lives inside each
 * observer's own file, and what gathers them is the case, which a recording never names. Every listed observer's recording
 * is fetched upfront (to read its name), not lazily on selection — fine at the scale a case's
 * observer list actually has (a handful of small JSON files).
 *
 * The toolbar (account line + the "about" info button) is hidden only when nothing has loaded
 * yet. The account line itself — "Account by <observer>" — is always shown once something has
 * loaded, even for a single observer: the `<select>` only replaces the plain observer name once
 * there's actually more than one to choose between (a one-option dropdown would be pointless), but
 * the sentence around it never disappears. Date/location/case live only in the info panel's own
 * Observation section, not duplicated here.
 */
export class SightingElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ["src", "show-labels", START_TIME_ATTRIBUTE, START_CLOCK_ATTRIBUTE, OBSERVER_ATTRIBUTE, OBSERVER_MAP_ATTRIBUTE, MILESTONES_ATTRIBUTE, COMPARE_ACCOUNT_ATTRIBUTE]
  }

  private readonly shadow: ShadowRoot
  private readonly sceneElement: SceneElement
  private readonly toolbarElement: HTMLElement
  private readonly accountElement: HTMLElement
  private readonly accountPrefix: HTMLElement
  private readonly observerText: HTMLElement
  private readonly observerSelect: HTMLSelectElement
  private readonly infoButton: HTMLButtonElement
  private readonly infoPanel: HTMLElement
  private readonly infoAppLink: HTMLAnchorElement
  private readonly editLink: HTMLAnchorElement
  private readonly infoObservationHeading: HTMLElement
  private readonly infoObservationList: HTMLElement
  private readonly infoCreditsToggle: HTMLButtonElement
  private readonly infoCreditsList: HTMLElement
  private readonly infoCloseButton: HTMLButtonElement
  private readonly shareButton: HTMLButtonElement
  private readonly shareDialog: ShareDialogElement
  private readonly shareStartOn: HTMLInputElement
  private readonly shareStart: HTMLInputElement
  private readonly shareScopeRow: HTMLElement
  private readonly shareScopeLabel: HTMLElement
  private readonly shareScope: HTMLSelectElement
  private readonly shareOpensRow: HTMLElement
  private readonly shareOpensLabel: HTMLElement
  private readonly shareOpens: HTMLSelectElement
  private readonly shareStartLabel: HTMLElement
  private readonly shareOptions: Record<"labels" | "map" | "milestones" | "compare", { input: HTMLInputElement, label: HTMLElement }>
  private readonly labelsToggle: HTMLButtonElement
  private readonly paramSummary: HTMLElement
  private summaryBuilder = new SightingSummary(sightingMessages_en, new SceneNaming(), new SaidTexts(["en"]), new SightingTags({}), { messages: sightingMessages_en, locale: "en" })
  /** What the strip last rendered. It refreshes on every playback tick (see the timeupdate
   * listener), and replacing forty elements sixty times a second — under a reader's own text
   * selection, at that — for values that changed in none of them is not free. */
  private summarySignature = ""

  /** What the assessors made of the recording on show, kept between renders because it arrives
   * after it — see runAssessments. */
  private assessmentEntries: SummaryEntry[] = []

  /** Drops a reading that resolved after the recording it described was already replaced. */
  private assessmentToken = 0

  /** Whether this browser has the popover API — where it does, the info panel lives in the top
   * layer and cannot be clipped by the host page; where it doesn't (anything older than 2024), it
   * stays the absolutely-positioned overlay it has always been. */
  private readonly supportsPopover = typeof (HTMLElement.prototype as { showPopover?: unknown }).showPopover === "function"

  private entries: ObserverEntry[] = []
  /** The case these recordings were read from, when they were, and its own address: what names
   * them as a case (a recording cannot say, see Sighting.id) and what holds the analysts'
   * interpretations of each. */
  private caseSource?: { json: CaseJson, url: string }
  private readonly interpretationChoice: HTMLElement
  private readonly interpretationLabel: HTMLElement
  private readonly interpretationSelect: HTMLSelectElement
  private readonly confrontationElement: HTMLElement
  private readonly confrontationHeading: HTMLElement
  private readonly confrontationList: HTMLElement
  private readonly compareButton: HTMLButtonElement
  private readonly variantChips: HTMLElement
  private readonly variantMoved: HTMLElement
  /** How to get each interpretation the choice offers, by option value — fetched only once chosen,
   * since an analyst's may be a file of its own. */
  private interpretationLoaders = new Map<string, () => Promise<InterpretationJson | undefined>>()
  /** Bumped on every choice, so an interpretation that arrives after another was chosen is dropped. */
  private interpretationToken = 0
  /** The recording the choice was last built for — see offerInterpretations. */
  private offeredFor?: SightingRecordingJson
  private currentSrc?: string
  private infoOpen = false
  private creditsOpen = false
  /** Whether the parameter strip under the render is showing. Off by default: a player dropped
   * into an article is there to be watched. Turned on by the `show-labels` attribute (a page
   * deciding for its readers) or by the info panel's own toggle (a reader deciding for
   * themselves) — the two are the same switch, so a reader can always close what a page opened. */
  private labelsShown = false
  private language: UfoLanguage = "en"
  private messages: SightingMessages = sightingMessages_en

  constructor() {
    super()
    this.shadow = this.attachShadow({ mode: "open" })
    const template = document.createElement("template")
    template.innerHTML = `<style>${css}</style>${html}`
    this.shadow.appendChild(template.content.cloneNode(true))
    // The share dialog, a cloned tag: upgraded now so that it can be told what it shares.
    customElements.upgrade(this.shadow)

    // Created imperatively rather than left inline in the template markup — see
    // SightingEditorElement's constructor for why (an inline tag parsed from
    // template.content.cloneNode(true) isn't upgraded to its class instance yet at this point).
    this.sceneElement = document.createElement(SCENE_ELEMENT_NAME) as SceneElement
    // Already-set attributes fired no callback: the scene did not exist when they were parsed.
    this.forwardPlayerAttributes()
    // This element has an info panel with a credits list in it, so the map need not print its own
    // licence over the ground in 8-pixel type — see UfoElement.creditShownExternally.
    this.sceneElement.ufoElement.creditShownExternally = true
    // Listed in this element's own info panel: the scene's own credits button would say it twice.
    this.sceneElement.ownCredits = false
    // The playback layer's toggles stay under the timeline, among the player's own buttons (see
    // UfoElement.hostControls): this row keeps what belongs to the account, not to the playback.
    this.shadow.getElementById("ufo-slot")!.replaceWith(this.sceneElement)

    this.toolbarElement = this.shadow.getElementById("toolbar")!
    this.accountElement = this.shadow.getElementById("account")!
    this.accountPrefix = this.shadow.getElementById("account-prefix")!
    this.observerText = this.shadow.getElementById("observer-text")!
    this.observerSelect = this.shadow.getElementById("observer") as HTMLSelectElement
    this.infoButton = this.shadow.getElementById("info-button") as HTMLButtonElement
    this.infoPanel = this.shadow.getElementById("info-panel")!
    this.infoAppLink = this.shadow.getElementById("info-app-link") as HTMLAnchorElement
    this.editLink = this.shadow.getElementById("edit-link") as HTMLAnchorElement
    this.infoObservationHeading = this.shadow.getElementById("info-observation-heading")!
    this.infoObservationList = this.shadow.getElementById("info-observation-list")!
    this.infoCreditsToggle = this.shadow.getElementById("info-credits-toggle") as HTMLButtonElement
    this.infoCreditsList = this.shadow.getElementById("info-credits-list")!
    this.infoCloseButton = this.shadow.getElementById("info-close") as HTMLButtonElement
    this.labelsToggle = this.shadow.getElementById("info-labels-toggle") as HTMLButtonElement
    this.paramSummary = this.shadow.getElementById("param-summary")!
    this.labelsToggle.addEventListener("click", () => { this.showLabels = !this.showLabels })
    // Among the player's own buttons under the picture, as on the video sites — not in this header.
    // Created here and lent to the player's row (see UfoElement.addControl); the dialog it opens is
    // this element's own.
    this.shareButton = document.createElement("button")
    this.shareButton.type = "button"
    this.shareButton.id = "share-button"
    this.shareButton.setAttribute("aria-haspopup", "dialog")
    this.shareButton.innerHTML = PlayerIcons.SHARE
    this.sceneElement.ufoElement.addControl(this.shareButton)
    this.shareDialog = this.shadow.getElementById("share-dialog") as ShareDialogElement
    this.shareDialog.subject = this.shareSubject
    this.shareStartOn = this.shadow.getElementById("share-start-on") as HTMLInputElement
    this.shareStart = this.shadow.getElementById("share-start") as HTMLInputElement
    this.shareStartLabel = this.shadow.getElementById("share-start-label")!
    this.shareScopeRow = this.shadow.getElementById("share-scope-row")!
    this.shareScopeLabel = this.shadow.getElementById("share-scope-label")!
    this.shareScope = this.shadow.getElementById("share-scope") as HTMLSelectElement
    this.shareOpensRow = this.shadow.getElementById("share-opens-row")!
    this.shareOpensLabel = this.shadow.getElementById("share-opens-label")!
    this.shareOpens = this.shadow.getElementById("share-opens") as HTMLSelectElement
    const option = (name: string) => ({
      input: this.shadow.getElementById(`share-opt-${name}`) as HTMLInputElement,
      label: this.shadow.getElementById(`share-opt-${name}-label`)!
    })
    this.shareOptions = { labels: option("labels"), map: option("map"), milestones: option("milestones"), compare: option("compare") }

    this.interpretationChoice = this.shadow.getElementById("interpretation-choice")!
    this.interpretationLabel = this.shadow.getElementById("interpretation-label")!
    this.interpretationSelect = this.shadow.getElementById("interpretation") as HTMLSelectElement
    this.confrontationElement = this.shadow.getElementById("confrontation")!
    this.confrontationHeading = this.shadow.getElementById("confrontation-heading")!
    this.confrontationList = this.shadow.getElementById("confrontation-list")!
    this.compareButton = this.shadow.getElementById("compare-account") as HTMLButtonElement
    this.variantChips = this.shadow.getElementById("variant-chips")!
    this.variantMoved = this.shadow.getElementById("variant-moved")!
    this.compareButton.addEventListener("click", () => this.setComparing(!this.sceneElement.compareAccount))

    this.observerSelect.addEventListener("change", () => this.selectObserver(this.observerSelect.value))
    this.interpretationSelect.addEventListener("change", () => void this.chooseInterpretation(this.interpretationSelect.value))
    this.sceneElement.addEventListener(CONFRONTATION_EVENT, event =>
      this.showConfrontation((event as CustomEvent<ConfrontationReading[]>).detail))
    // Weather, sound and the observer's own pose are keyframed, so what the recording states at
    // one instant isn't what it states at another — a strip frozen on the opening frame would be
    // wrong for the rest of the replay. Cheap: refreshParamSummary does nothing at all while the
    // strip is hidden, which is the default.
    this.sceneElement.ufoElement.addEventListener("timeupdate", () => this.refreshParamSummary())
    if (this.supportsPopover) {
      // Promoted to the TOP LAYER, the one placement an ancestor's overflow:hidden cannot clip —
      // see the .info-panel:popover-open rules. Opening is left to the browser's own invoker
      // (popovertarget) rather than a click handler of ours: a manual toggle races with light
      // dismiss, which closes the panel on the very click that would reopen it. Our own state
      // follows the element instead, through beforetoggle/toggle below.
      this.infoPanel.setAttribute("popover", "auto")
      this.infoPanel.removeAttribute("hidden")
      this.infoButton.setAttribute("popovertarget", "info-panel")
      this.infoPanel.addEventListener("beforetoggle", event => {
        // Filled in before it becomes visible, never after — no flash of the previous observer.
        if ((event as ToggleEvent).newState !== "open") return
        this.populateInfoPanel()
        this.bringInfoButtonIntoView()
      })
      this.infoPanel.addEventListener("toggle", event => this.syncInfoOpen((event as ToggleEvent).newState === "open"))
    } else {
      this.infoButton.addEventListener("click", () => this.toggleInfoPanel())
    }
    this.infoCloseButton.addEventListener("click", () => this.toggleInfoPanel())
    this.infoCreditsToggle.addEventListener("click", () => this.toggleCredits())
    this.shareButton.addEventListener("click", () => this.openShare())
    for (const control of [this.shareStartOn, this.shareStart, ...Object.values(this.shareOptions).map(o => o.input)]) {
      control.addEventListener("input", () => this.refreshShareLinks())
    }
    for (const select of [this.shareScope, this.shareOpens]) select.addEventListener("change", () => this.refreshShareLinks())

    // Only when already in the page (an element upgraded in place): a detached one has no
    // ancestor to read the page's language from, and would fetch the browser's language before
    // connectedCallback fetches the right one.
    if (this.isConnected) void this.loadLocaleMessages()
  }

  /** The scene this view composes, and through it (`.ufoElement`) the playback controls — what a
   * page sequencing several reconstructions needs to start one and to stop it looping. Read-only:
   * the composition itself is this element's own business. */
  get scene(): SceneElement {
    return this.sceneElement
  }

  /** Auto-detects the visitor's preferred UI language from `navigator.languages`, falling back
   * to English (already baked into the template) when none of their preferences are
   * supported — see selectLocale. There is deliberately no language-picker UI, matching
   * `<rr0-ufo>`'s own approach.
   *
   * ONE decision for everything this element says: its own messages, the tag names, and which of
   * the recording's languages it reads (see said). They were taken apart once — the messages here
   * at construction, the recording's texts lazily on first read — and an element created by
   * `document.createElement` before being put in a `lang="en"` page decided French for the first
   * (it had no `[lang]` ancestor yet, so only the browser's list) and English for the second:
   * "Celle du observateur : A craft standing on its legs". Hence the preferences are read once, here,
   * and read again on connection (see connectedCallback) rather than anywhere else.
   */
  private async loadLocaleMessages(): Promise<void> {
    const token = ++this.localeToken
    const preferences = HostLocale.preferencesFor(this)
    this.preferences = preferences
    const language = selectLocale(preferences, UFO_SUPPORTED_LANGUAGES) as UfoLanguage
    const [messages, tagNames, sceneNames] = language === "en"
      ? [sightingMessages_en, {}, undefined]
      : await Promise.all([loadSightingMessages(language), loadTagNames(language), loadSceneNames(language)])
    // Superseded by a later decision (the element was connected while this one was loading).
    if (token !== this.localeToken) return
    const changed = language !== this.language
    this.language = language
    this.messages = messages
    this.tags = new SightingTags(tagNames)
    this.said = new SaidTexts(preferences)
    this.summaryBuilder = new SightingSummary(this.messages, new SceneNaming(sceneNames), this.said, this.tags, { messages: this.messages, locale: language })
    this.accountPrefix.textContent = this.messages.accountBy
    this.interpretationLabel.textContent = this.messages.interpretation
    this.confrontationHeading.textContent = this.messages.confrontation
    const shown = this.entries.find(entry => entry.src === this.currentSrc)
    if (shown) this.offerInterpretations(shown)
    this.updateCompareButton()
    this.infoButton.title = this.messages.about
    this.infoButton.setAttribute("aria-label", this.messages.about)
    this.editLink.title = this.messages.editThisObservation
    this.editLink.setAttribute("aria-label", this.messages.editThisObservation)
    this.infoCloseButton.setAttribute("aria-label", this.messages.close)
    this.infoObservationHeading.textContent = this.messages.observation
    this.infoCreditsToggle.textContent = this.messages.credits
    this.syncLabelsToggle()
    this.refreshParamSummary()
    // An assessment names ids ("coverage", "ce3") through these same messages, so a reading taken
    // before they arrived is in the wrong language — read it again rather than translating chips.
    if (changed && this.currentSrc) void this.runAssessments()
    this.shareButton.title = this.messages.share
    this.shareButton.setAttribute("aria-label", this.messages.share)
    this.shareStartLabel.textContent = this.messages.shareStartAt
    this.shareScopeLabel.textContent = this.messages.shareScope
    this.shareOpensLabel.textContent = this.messages.shareOpensOn
    this.shareOptions.labels.label.textContent = this.messages.shareOptionLabels
    this.shareOptions.map.label.textContent = this.messages.shareOptionMap
    this.shareOptions.milestones.label.textContent = this.messages.shareOptionMilestones
    this.shareOptions.compare.label.textContent = this.messages.shareOptionCompare
    this.shareStart.setAttribute("aria-label", this.messages.shareStartAt)
    void this.shareDialog.useLanguage(language)
    if (this.infoOpen) this.populateInfoPanel()
    this.updateAccountLine()
  }

  /** The reader's languages as loadLocaleMessages last read them — what connectedCallback compares
   * against to tell whether being put somewhere changed the answer. */
  private preferences: readonly string[] = []

  /** Drops a language decision that resolved after a later one was taken. */
  private localeToken = 0

  /**
   * Which of a recording's languages this reader reads — see SaidText.
   *
   * Set by loadLocaleMessages together with the messages, never on its own: the interface and the
   * account it frames must be in the same language.
   */
  private said = new SaidTexts(["en"])

  /** Names the recording's tags for this reader — English until the dictionary is loaded, which
   * is exactly what an English reader keeps (see TagNames). */
  private tags = new SightingTags({})

  connectedCallback(): void {
    // The constructor could only read the browser's list if this element was created before being
    // put anywhere; the page it now stands in may declare a language (see HostLocale).
    if (HostLocale.preferencesFor(this).join() !== this.preferences.join()) void this.loadLocaleMessages()
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
    if (name === "show-labels") {
      this.applyLabels(this.hasAttribute("show-labels"))
    }
    if (name === OBSERVER_MAP_ATTRIBUTE || name === MILESTONES_ATTRIBUTE) {
      this.forwardPlayerAttributes()
    }
    if (name === OBSERVER_ATTRIBUTE && this.entries.length > 1) {
      const asked = this.entryAsked(this.entries)
      if (asked && asked.src !== this.currentSrc) this.selectObserver(asked.src)
    }
    if (name === COMPARE_ACCOUNT_ATTRIBUTE) {
      this.setComparing(this.hasAttribute(COMPARE_ACCOUNT_ATTRIBUTE))
    }
  }

  /** Hands the page's instructions about the player's overlays down the stack it wrote none of —
   * see SceneElement.forwardPlayerAttributes, which passes them on again to the player that owns
   * them. A page embedding `<rr0-sighting>` writes that tag and nothing else. */
  private forwardPlayerAttributes(): void {
    for (const attribute of [OBSERVER_MAP_ATTRIBUTE, MILESTONES_ATTRIBUTE]) {
      // The value too, not only the presence: `show-observer-map="false"` says something.
      const value = this.getAttribute(attribute)
      if (value === null) this.sceneElement.removeAttribute(attribute)
      else this.sceneElement.setAttribute(attribute, value)
    }
  }

  /** Fetches `url` and loads it — what the `src` attribute uses. Accepts a case (`case.json`),
   * whose sighting events name the recordings to show, or one observer's recording directly: told
   * apart by shape (see CaseFile.isCase). A bare JSON array, the observer list this element read
   * before cases, is refused by name rather than misread. */
  async loadFromSrc(url: string): Promise<void> {
    this.startPending = true
    const fetching = SightingFetch.recording(url)
    // The loader from the moment a recording is asked for — see SceneElement.holdForNewScene.
    this.sceneElement.holdForNewScene(fetching)
    const json = await fetching
    if (Array.isArray(json)) {
      throw new Error(`${url} is a bare list of recordings, which is no longer read: list them as the sighting events of a case.json`)
    }
    if (CaseFile.isCase(json)) {
      CaseFile.check(json)
      // Resolved against the CASE's own address, not the page's: the recordings sit beside it, so
      // the same case.json works read from its dossier's page and from anywhere else.
      const urls = CaseFile.sightingUrls(json, new URL(url, location.href).href)
      if (urls.length === 0) throw new Error(`${url} is a case with no sighting event: no recording to show`)
      await this.loadObserverUrls(urls, { json, url: new URL(url, location.href).href })
    } else {
      this.setEntries([{ src: url, sighting: json as SightingRecordingJson }], undefined)
    }
  }

  /**
   * One observer's recording, set directly instead of fetched.
   *
   * The same door `<rr0-ufo>` and `<rr0-scene>` already offer, and what a page holding a recording
   * in memory needs — text pasted into a form, a file the reader picked, a recording just built by
   * script. Its entry carries no URL, so the info panel's "open in the editor" and embed lines have
   * nothing to point at and fall back to the bare application, which is the honest answer for
   * something that is not published anywhere.
   */
  get sightingData(): SightingRecordingJson | undefined {
    return this.entries.find(entry => entry.src === this.currentSrc)?.sighting
  }

  set sightingData(sighting: SightingRecordingJson) {
    this.startPending = true
    this.currentSrc = ""
    this.setEntries([{ src: "", sighting }], undefined)
  }

  /**
   * Shows the moment `seconds` after the start of an observation: of the account `sighting` names (the id of its event in the case, or the one its
   * recording states) when the element shows it, else of the account on show. What a passage of an interview links to (see InterviewElement).
   */
  seekTo(seconds: number, sighting?: string): void {
    const caseSource = this.caseSource
    const entry = sighting === undefined ? undefined : this.entries.find(candidate => {
      const id = this.plain(candidate).id
      const ids = caseSource ? CaseFile.accountIds(caseSource.json, caseSource.url, candidate.src, id) : [id]
      return ids.includes(sighting)
    })
    if (entry && entry.src !== this.currentSrc) this.selectObserver(entry.src)
    this.sceneElement.ufoElement.currentTime = Math.max(0, seconds) * 1000
  }

  get observerUrls(): string[] {
    return this.entries.map(entry => entry.src)
  }

  set observerUrls(urls: string[]) {
    void this.loadObserverUrls(urls)
  }

  private async loadObserverUrls(urls: string[], caseSource?: { json: CaseJson, url: string }): Promise<void> {
    const entries = await Promise.all(
      urls.map(async (src): Promise<ObserverEntry> => (
        { src, sighting: (await SightingFetch.recording(src)) as SightingRecordingJson }
      ))
    )
    this.setEntries(entries, caseSource)
  }

  /** Says on the console what a case gets wrong about its own references, which would otherwise only show as a reading missing from the menu. */
  private reportCaseProblems(json: CaseJson, entries: ObserverEntry[]): void {
    const { duplicateIds, unresolved } = CaseFile.problems(json, entries.map(entry => this.plain(entry).id).filter((id): id is string => id !== undefined))
    for (const id of duplicateIds) console.warn(`The case ${json.id ?? ""} gives the id "${id}" to more than one event: a reference to it is ambiguous.`)
    for (const { reading, reference } of unresolved) console.warn(`The reading ${reading} of the case ${json.id ?? ""} is "interpretationOf" "${reference}", which no event of the case has as its id, nor any recording it lists.`)
  }

  private setEntries(entries: ObserverEntry[], caseSource: { json: CaseJson, url: string } | undefined): void {
    this.entries = entries
    this.caseSource = caseSource
    if (caseSource) this.reportCaseProblems(caseSource.json, entries)

    this.toolbarElement.hidden = entries.length === 0
    const showSelect = entries.length > 1
    this.observerSelect.hidden = !showSelect
    this.observerText.hidden = showSelect
    this.observerSelect.innerHTML = ""
    // Never the URL: a recording that names nobody is listed by its place in the list, which at
    // least says what it is. `/demo-data/sky-test-halos.json` as a observer's name said nothing
    // and looked like a fault.
    const names = entries.map((entry, index) => this.observerDisplayName(this.plain(entry).observer)
      ?? this.messages.unnamedObserver.replace("{n}", String(index + 1)))
    for (const [index, entry] of entries.entries()) {
      const option = document.createElement("option")
      option.value = entry.src
      // One observer who saw several things has several recordings: each is then told by what the case calls it.
      const shared = names.filter(name => name === names[index]).length > 1
      option.textContent = (shared ? this.caseTitleOf(entry) : undefined) ?? names[index]
      this.observerSelect.appendChild(option)
    }

    // Keeps the current observer selected if the new list still has them (e.g. a case
    // re-read), otherwise falls back to the first observer.
    const next = entries.find(entry => entry.src === this.currentSrc) ?? this.entryAsked(entries) ?? entries[0]
    if (next) {
      this.selectObserver(next.src)
    } else {
      this.updateAccountLine()
    }
  }

  /** The recording the `observer` attribute names among `entries`, if it names one — see OBSERVER_ATTRIBUTE. */
  private entryAsked(entries: ObserverEntry[]): ObserverEntry | undefined {
    const asked = this.getAttribute(OBSERVER_ATTRIBUTE)?.trim()
    if (!asked) return undefined
    const byId = entries.find(entry => this.plain(entry).observer?.id === asked)
    if (byId) return byId
    const byFile = entries.find(entry => entry.src.split("/").pop() === asked.split("/").pop())
    if (byFile) return byFile
    return /^\d+$/.test(asked) ? entries[Number(asked) - 1] : undefined
  }

  /** What names `entry` in a link or an embed: the observer's id, else its place in the case's list. */
  private observerKeyOf(entry: ObserverEntry): string {
    return this.plain(entry).observer?.id ?? String(this.entries.indexOf(entry) + 1)
  }

  /** The entry the share dialog is about — see shareScopeUrl. */
  private sharedEntry(): ObserverEntry | undefined {
    const chosen = this.shareScope.value
    if (!this.caseSource || chosen === CASE_SCOPE) return undefined
    return this.entries.find(entry => entry.src === chosen)
  }

  /** Whether the dialog shares the case, opening on `shareOpens`, rather than one recording. */
  private get sharesCase(): boolean {
    return this.caseSource !== undefined && !this.shareScopeRow.hidden && this.shareScope.value === CASE_SCOPE
  }

  /**
   * Where to open THIS observation for editing — the app link in the info panel, which used to
   * point at the application's bare home page and so dropped the one thing the reader was looking
   * at.
   *
   * Always the explicit `?file=` form, with an absolute URL. It used to shorten a same-origin
   * recording to a bare path on the app's own domain, relying on that domain redirecting any
   * unknown path into the editor — which stopped being true the day ufoathome.org became a site
   * with files of its own: `/demo-data/observer-socorro.json` now resolves to the recording itself,
   * and the reader would have been handed raw JSON instead of an editor. The parameter names the
   * recording whatever the host does with its paths.
   */
  private editorUrl(): string {
    if (!this.currentSrc) return APP_EDITOR_URL
    const url = new URL(this.currentSrc, location.href)
    // A recording that is one of a case's is opened in its case: the readings are recordings of their
    // own, listed there, and the editor shows them all and opens on the one on show.
    const source = this.caseSource
    if (source) {
      return `${APP_EDITOR_URL}?file=${encodeURIComponent(source.url)}&track=${encodeURIComponent(this.shownTrackUrl() ?? url.href)}`
    }
    return `${APP_EDITOR_URL}?file=${encodeURIComponent(url.href)}`
  }

  /** Where to open the editor for what is on show: the recording of the reading chosen, else the account's own. */
  get editorHref(): string {
    return this.editorUrl()
  }

  /** The address of the recording of the reading chosen in the menu, when one is (see offerInterpretations). */
  private shownTrackUrl(): string | undefined {
    const source = this.caseSource
    const entry = this.entries.find(e => e.src === this.currentSrc)
    const chosen = /^case-(\d+)$/.exec(this.interpretationSelect.value)
    if (!source || !entry || !chosen) return undefined
    const event = CaseFile.interpretationEvents(source.json, CaseFile.accountIds(source.json, source.url, entry.src, this.plain(entry).id))[Number(chosen[1])]
    return event?.url ? new URL(event.url, source.url).href : undefined
  }

  /**
   * What the share dialog shares: the replay, and nothing else (an editor shares the editor). The link opens the site's player on what is on
   * show, the embed is this very element, so that what is pasted is what is looked at.
   */
  private readonly shareSubject: ShareSubject = {
    module: "rr0-sighting",
    link: () => this.playUrl(),
    element: () => this.replayElement()
  }

  /** `<rr0-sighting>` on what is shared, with an absolute `src`, opening as the dialog's options say: at a position, on a recording of a case. */
  private replayElement(): string {
    const shared = this.sharedAddress()
    const attributes = [...(shared.observer ? [[OBSERVER_ATTRIBUTE, shared.observer]] : []), ...this.replayAttributes()]
    const start = attributes.map(([name, value]) => value === "" ? ` ${name}` : ` ${name}="${value}"`).join("")
    return `<rr0-sighting src="${shared.src}"${start}></rr0-sighting>`
  }

  /**
   * The address that replays THIS observation for whoever is given it: the site's own player with the
   * recording's absolute address in it (the `?file=` convention every "open it" link on the site
   * already follows). A recording with no address (set by script, pasted) has none to give, and the
   * link is the player's own page.
   */
  private playUrl(): string {
    const shared = this.sharedAddress()
    const query = [...(shared.observer ? [`${OBSERVER_ATTRIBUTE}=${encodeURIComponent(shared.observer)}`] : []), ...this.replayQuery()].join("&")
    if (!shared.src) return `${APP_HOME_URL}/play/${query && "?" + query}`
    return `${APP_HOME_URL}/play/?file=${encodeURIComponent(shared.src)}${query && "&" + query}`
  }

  /**
   * What the share dialog gives the address of: the recording on show, or — for a recording that is one of a case's,
   * where the dialog offers the choice — the whole case, opening on the recording asked for, or another of its recordings.
   */
  private sharedAddress(): { src: string, observer?: string } {
    const absolute = (src: string) => src ? new URL(src, location.href).href : ""
    if (this.sharesCase) {
      const opening = this.entries.find(entry => entry.src === this.shareOpens.value) ?? this.entries.find(entry => entry.src === this.currentSrc)
      return { src: this.caseSource!.url, observer: opening ? this.observerKeyOf(opening) : undefined }
    }
    return { src: absolute(this.sharedEntry()?.src ?? this.currentSrc ?? "") }
  }

  /**
   * What the share dialog's options say about how the replay opens, as attributes: the chips
   * (`show-labels`, on unless unticked), the observer map, the named moments (`hide-milestones` once
   * unticked), the comparison, and the position. The editor takes none of them, only its `src`.
   */
  private replayAttributes(): [string, string][] {
    const options = this.shareOptions
    const attributes: [string, string][] = []
    if (this.shareStartSeconds !== undefined) attributes.push([START_TIME_ATTRIBUTE, String(this.shareStartSeconds)])
    if (options.labels.input.checked) attributes.push(["show-labels", ""])
    if (options.map.input.checked) attributes.push([OBSERVER_MAP_ATTRIBUTE, ""])
    if (!options.milestones.input.checked) attributes.push([MILESTONES_ATTRIBUTE, ""])
    if (options.compare.input.checked) attributes.push([COMPARE_ACCOUNT_ATTRIBUTE, ""])
    return attributes
  }

  /** The same options as the player's address takes them: `d=` (the position), `labels=0`, `map=1`, `moments=0`, `compare=1`. */
  private replayQuery(): string[] {
    const options = this.shareOptions
    const query: string[] = []
    // A length of time from the start (`d=`): `t=` is a time said during the observation, which the dialog does not ask for.
    if (this.shareStartSeconds !== undefined) query.push(`d=${this.shareStartSeconds}`)
    // The player shows them unless told not to, so it is the absence that is said.
    if (!options.labels.input.checked) query.push("labels=0")
    if (options.map.input.checked) query.push("map=1")
    if (!options.milestones.input.checked) query.push("moments=0")
    if (options.compare.input.checked) query.push("compare=1")
    return query
  }

  /** The position the shared link opens at, in whole seconds, when the reader asked for one. */
  private get shareStartSeconds(): number | undefined {
    const seconds = Math.floor(Number(this.shareStart.value))
    return this.shareStartOn.checked && Number.isFinite(seconds) && seconds >= 0 ? seconds : undefined
  }

  private refreshShareLinks(): void {
    this.shareOpensRow.hidden = !this.sharesCase
    this.shareDialog.refresh()
  }

  private openShare(): void {
    // Offered at the position on show, as the video sites do, and off until the reader wants it.
    const ufo = this.sceneElement.ufoElement
    this.shareStart.max = String(Math.floor(ufo.seekableDuration / 1000))
    this.shareStart.value = String(Math.floor(ufo.currentTime / 1000))
    this.shareStartOn.checked = false
    // Each option offered as the player is NOW, so that what is shared is what is on show.
    this.shareOptions.labels.input.checked = this.labelsShown
    this.shareOptions.map.input.checked = ufo.observerMapOpen
    this.shareOptions.milestones.input.checked = ufo.milestonesVisible
    this.shareOptions.compare.input.checked = this.sceneElement.compareAccount
    this.offerShareScope()
    this.shareOpensRow.hidden = !this.sharesCase
    this.shareDialog.open()
  }

  /**
   * For a recording that is one of a case's: the choice of what is shared — the whole case, which opens on one of its
   * recordings (the one on show to begin with), or one recording on its own. Not shown for a recording that stands alone.
   */
  private offerShareScope(): void {
    const inCase = this.caseSource !== undefined && this.entries.length > 1
    this.shareScopeRow.hidden = !inCase
    this.shareScope.innerHTML = ""
    this.shareOpens.innerHTML = ""
    if (!inCase) return
    const add = (select: HTMLSelectElement, value: string, label: string) => {
      const option = document.createElement("option")
      option.value = value
      option.textContent = label
      select.appendChild(option)
    }
    add(this.shareScope, CASE_SCOPE, this.messages.shareScopeCase)
    for (const entry of this.entries) {
      const name = this.observerDisplayName(this.plain(entry).observer) ?? this.messages.unnamedObserver.replace("{n}", String(this.entries.indexOf(entry) + 1))
      add(this.shareScope, entry.src, name)
      add(this.shareOpens, entry.src, name)
    }
    this.shareScope.value = CASE_SCOPE
    this.shareOpens.value = this.currentSrc ?? this.entries[0]!.src
  }

  /**
   * What the recording on show can be replayed as: its account, and every analyst's
   * interpretation of it the case holds (see CaseFile.interpretationEvents). No choice is shown when
   * the account is all there is.
   *
   * The account is ONE thing, drawn the way the observer gave it: in the round when they said what
   * it was (their own `interpretation` — a craft on its legs, a hundred feet away), flat, as the
   * angles they saw, when they did not. What they saw is still there in the first case, as what
   * the comparison lays over it (see SceneElement.compareAccount): the angles and the metres are
   * not two versions of one account but the account and the test of it.
   *
   * The same recording offered again (its labels in another language) keeps what is chosen; a
   * different one starts from its account.
   */
  private offerInterpretations(entry: ObserverEntry): void {
    const sameRecording = this.offeredFor === entry.sighting
    const previous = this.interpretationSelect.value
    this.offeredFor = entry.sighting
    this.interpretationToken++
    this.interpretationLoaders = new Map()
    this.interpretationSelect.innerHTML = ""
    const offer = (value: string, label: string, load: () => Promise<InterpretationJson | undefined>) => {
      const option = document.createElement("option")
      option.value = value
      option.textContent = label
      this.interpretationSelect.appendChild(option)
      this.interpretationLoaders.set(value, load)
    }
    // The recording's own, as the scene read it: its values with their provenance taken off (see
    // Provenance), the same object the scene is showing.
    const current = entry === this.entries.find(e => e.src === this.currentSrc)
    const own = current ? this.sceneElement.ufoElement.sighting.interpretation : undefined
    offer(ACCOUNT_OPTION, this.messages.account, () => Promise.resolve(own))
    const source = this.caseSource
    if (source) {
      CaseFile.interpretationEvents(source.json, CaseFile.accountIds(source.json, source.url, entry.src, this.plain(entry).id)).forEach((event, index) => {
        const title = this.said.read(event.title) ?? `#${index + 1}`
        const by = (event.by ?? []).map(agent => this.agentName(agent)).filter(Boolean).join(", ")
        offer(`case-${index}`, by ? this.messages.interpretationBy.replace("{title}", title).replace("{by}", by) : title,
          () => CaseFile.interpretationOf(event, source.url, url => SightingFetch.recording(url)))
      })
    }
    // The variants the recording keeps, by verdict and cost: one that draws no body of its own (a body of the sky, which the sky has)
    // replays the account itself, its moved values said under the render.
    const variants = current ? this.keptVariants(entry) : []
    for (const { index, kept } of variants) {
      offer(`${VARIANT_OPTION}${index}`, `${this.variantLabel(kept)} (${this.messages.verdicts[kept.variant!.verdict]})`,
        () => Promise.resolve(kept.bodies.length > 0 ? kept : undefined))
    }
    const kept = sameRecording && [...this.interpretationSelect.options].some(option => option.value === previous)
    const value = kept ? previous : ACCOUNT_OPTION
    this.interpretationSelect.value = value
    // The scene follows whatever is chosen, including when it was just emptied by the recording
    // being read again (see SceneElement.sightingData) while the choice stayed the same.
    if (value === ACCOUNT_OPTION) {
      if (this.sceneElement.interpretation !== own) this.sceneElement.interpretation = own
    } else if (!this.sceneElement.interpretation) {
      void this.chooseInterpretation(value)
    }
    this.interpretationChoice.hidden = this.interpretationSelect.options.length < 2
    this.showConfrontation(this.sceneElement.confrontation)
    this.updateCompareButton()
    this.showVariants(variants)
  }

  /** The variants the recording on show keeps (see InterpretationJson.variant), with where each is in it, by verdict and then by cost. */
  private keptVariants(entry: ObserverEntry): { index: number, kept: InterpretationJson }[] {
    const rank = { consolidated: 0, contested: 1, incompatible: 2 }
    return (entry.sighting.variants ?? []).map((kept, index) => ({ index, kept }))
      .filter(({ kept }) => kept.variant)
      .sort((a, b) => rank[a.kept.variant!.verdict] - rank[b.kept.variant!.verdict] || a.kept.variant!.cost - b.kept.variant!.cost)
  }

  private variantLabel(kept: InterpretationJson): string {
    return this.messages.variant.replace("{name}", kept.variant!.label ?? kept.variant!.candidate)
  }

  /** One chip a kept variant under the render, with its verdict, choosing it; the account's own first, to come back to. Then what the one on show moves. */
  private showVariants(variants: { index: number, kept: InterpretationJson }[]): void {
    this.variantChips.innerHTML = ""
    this.variantChips.hidden = variants.length === 0
    if (variants.length === 0) {
      this.showVariantMoved()
      return
    }
    const chip = (value: string, label: string, verdict?: string) => {
      const button = document.createElement("button")
      button.type = "button"
      button.dataset.value = value
      if (verdict) {
        button.dataset.verdict = verdict
        button.title = this.messages.verdicts[verdict as keyof SightingMessages["verdicts"]]
        button.append(Object.assign(document.createElement("span"), { className: "dot" }))
      }
      button.append(label)
      button.addEventListener("click", () => {
        if (this.interpretationSelect.value === value) return
        this.interpretationSelect.value = value
        void this.chooseInterpretation(value)
      })
      this.variantChips.append(button)
    }
    chip(ACCOUNT_OPTION, this.messages.account)
    for (const { index, kept } of variants) chip(`${VARIANT_OPTION}${index}`, kept.variant!.label ?? kept.variant!.candidate, kept.variant!.verdict)
    this.showVariantMoved()
  }

  /** The chip of what is on show pressed, and the values the variant on show moves: the account's struck, the variant's beside it. */
  private showVariantMoved(): void {
    const value = this.interpretationSelect.value
    for (const button of this.variantChips.querySelectorAll<HTMLButtonElement>("button")) button.setAttribute("aria-pressed", String(button.dataset.value === value))
    this.variantMoved.innerHTML = ""
    const index = value.startsWith(VARIANT_OPTION) ? Number(value.slice(VARIANT_OPTION.length)) : -1
    const variant = this.sceneElement.ufoElement.sighting.variants?.[index]?.variant
    this.variantMoved.hidden = !variant || variant.moved.length + (variant.readings?.length ?? 0) === 0
    if (!variant) return
    const degrees = new Intl.NumberFormat(this.language, { maximumFractionDigits: 1 })
    for (const moved of variant.moved) {
      const [stated, read] = moved.field === "time"
        ? ["0 min", `${moved.variant > 0 ? "+" : ""}${degrees.format(moved.variant)} min`]
        : moved.field === "duration" ? [`${degrees.format(moved.stated)} s`, `${degrees.format(moved.variant)} s`]
        : [`${degrees.format(moved.stated)}°`, `${degrees.format(moved.variant)}°`]
      const line = document.createElement("span")
      line.append(`${this.messages.variantFields[moved.field]}${this.colon}`, Object.assign(document.createElement("s"), { textContent: stated }), " → ",
        Object.assign(document.createElement("b"), { textContent: read }))
      this.variantMoved.append(line)
    }
    for (const used of variant.readings ?? []) {
      const reading = this.messages.variantReadings[used.reading]
      if (reading) this.variantMoved.append(Object.assign(document.createElement("span"), { className: "reading", textContent: reading }))
    }
  }

  /** Shows the account beside the interpretation, or not — see SceneElement.compareAccount. The
   * choice holds across interpretations and observers, like the map's: it is the reader's way of
   * looking, not a property of what is looked at. */
  private setComparing(comparing: boolean): void {
    this.sceneElement.compareAccount = comparing
    this.updateCompareButton()
    // The scene has just measured (or stopped measuring) at the instant on show; what it found is
    // shown now rather than on its next change, which a paused player may never make.
    this.showConfrontation(this.sceneElement.confrontation)
  }

  /** Offered only while an interpretation is on show: the raw account has nothing to be compared
   * with. */
  private updateCompareButton(): void {
    const comparing = this.sceneElement.compareAccount
    this.compareButton.hidden = !this.sceneElement.interpretation
    this.compareButton.setAttribute("aria-pressed", String(comparing))
    const label = comparing ? this.messages.hideComparison : this.messages.showComparison
    this.compareButton.title = label
    this.compareButton.setAttribute("aria-label", label)
  }

  /** The locale a date is written in, for each interface language. */
  private static readonly DATE_LOCALES: Record<UfoLanguage, string> = { en: "en-US", fr: "fr-FR", es: "es-ES", it: "it-IT" }

  /** A colon as the reader's language writes one: French puts a no-break space before it, and
   * Spanish and Italian write it as English does. */
  private get colon(): string {
    return this.language === "fr" ? "\u00a0: " : ": "
  }

  private async chooseInterpretation(value: string): Promise<void> {
    const token = ++this.interpretationToken
    const load = this.interpretationLoaders.get(value)
    const interpretation = load ? await load().catch(error => {
      console.warn(`<rr0-sighting>: could not read interpretation "${value}":`, error)
      return undefined
    }) : undefined
    if (token !== this.interpretationToken) return
    this.sceneElement.interpretation = interpretation
    this.editLink.href = this.editorUrl()
    this.dispatchEvent(new CustomEvent("interpretationchange", { detail: { track: this.shownTrackUrl() } }))
    this.updateCompareButton()
    this.showConfrontation(this.sceneElement.confrontation)
    this.showVariantMoved()
  }

  /** Who made a claim, as a reader would name them: a person's id, which RR0 writes last name first
   * ("StanfordRay"), is spelled out first names first ("Ray Stanford"); an organisation's is only
   * spelled out; a description is read like a observer's. */
  private agentName(agent: AgentRef): string {
    if ("people" in agent) {
      const [last, ...first] = agent.people.replace(/([a-z])([A-Z])/g, "$1 $2").split(" ")
      return [...first, last].join(" ")
    }
    if ("org" in agent) return agent.org.replace(/([a-z])([A-Z])/g, "$1 $2")
    return this.observerDisplayName(agent) ?? ""
  }

  /**
   * One line per phenomenon a body claims to be: how far off the direction the observer gave it is,
   * and how many times wider and taller than they said it looks — each in red when it is further
   * off than a observer could be (see BodyConfrontation). Hidden for the raw account.
   */
  private showConfrontation(readings: ConfrontationReading[]): void {
    this.confrontationList.innerHTML = ""
    this.confrontationElement.hidden = !this.sceneElement.interpretation || !this.sceneElement.compareAccount
    const degrees = new Intl.NumberFormat(this.language, { maximumFractionDigits: 1, minimumFractionDigits: 1 })
    const times = new Intl.NumberFormat(this.language, { maximumFractionDigits: 2, minimumFractionDigits: 2 })
    for (const reading of readings) {
      const item = document.createElement("li")
      item.append(`${this.said.read(reading.title) ?? reading.sourceId}${this.colon}`)
      const parts: [string, boolean][] = []
      if (reading.separationDeg !== undefined) {
        parts.push([this.messages.confrontationDirection.replace("{deg}", degrees.format(reading.separationDeg)), reading.disagreements.includes("direction")])
      }
      if (reading.widthRatio !== undefined) {
        parts.push([this.messages.confrontationWidth.replace("{ratio}", times.format(reading.widthRatio)), reading.disagreements.includes("width")])
      }
      if (reading.heightRatio !== undefined) {
        parts.push([this.messages.confrontationHeight.replace("{ratio}", times.format(reading.heightRatio)), reading.disagreements.includes("height")])
      }
      parts.forEach(([text, disagrees], index) => {
        if (index > 0) item.append(" · ")
        const span = document.createElement("span")
        span.textContent = text
        if (disagrees) span.className = "disagrees"
        item.append(span)
      })
      this.confrontationList.appendChild(item)
    }
  }

  /** Whether the next recording shown is the one `start-time` is about — see START_TIME_ATTRIBUTE. */
  private startPending = false

  /**
   * Where `entry` opens, in seconds from its start, as the attributes ask: the time said during the observation when the recording can place it,
   * else the length of time from the start. None when neither is given or readable.
   */
  private startSeconds(entry: ObserverEntry): number | undefined {
    const clock = PlaybackPosition.clock(this.getAttribute(START_CLOCK_ATTRIBUTE))
    const placed = clock ? PlaybackPosition.elapsedSince(this.plain(entry).time as SightingTime | undefined, clock) : undefined
    return placed ?? PlaybackPosition.delta(this.getAttribute(START_TIME_ATTRIBUTE))
  }

  private selectObserver(src: string): void {
    const entry = this.entries.find(e => e.src === src)
    if (!entry) return
    this.currentSrc = src
    this.observerSelect.value = src
    // Already fetched by loadObserverUrls — no need to re-fetch on every selection change.
    // SceneElement's own setter updates astronomy/weather/terrain for the new sighting too.
    // A recording read from an address states its models' addresses relative to it; one set in
    // memory (src "") has none, and the page's own address is all its relative ones can mean.
    this.sceneElement.documentUrl = entry.src ? new URL(entry.src, location.href).href : undefined
    // Its cover picture stands in for the loader until play is asked, unless it already was (another observer picked while playing).
    // The recording's own picture, else the case's; relative to the file stating it.
    // Kept even then, for a thumbnail to put it back when the mouse leaves (see ScenePoster.restore).
    const up = !this.sceneElement.ufoElement.playRequested
    if (entry.sighting.image) this.sceneElement.showPoster(entry.sighting.image, entry.src ? new URL(entry.src, location.href).href : undefined, up)
    else this.sceneElement.showPoster(this.caseSource?.json.image, this.caseSource?.url, up)
    // Another recording: shown once it is whole, not built in view — see SceneElement.holdForNewScene.
    this.sceneElement.holdForNewScene()
    this.sceneElement.sightingData = entry.sighting
    if (this.startPending) {
      this.startPending = false
      const seconds = this.startSeconds(entry)
      if (seconds !== undefined) this.sceneElement.ufoElement.currentTime = Math.max(0, seconds) * 1000
    }
    this.offerInterpretations(entry)
    this.updateAccountLine()
    // A different observer is a different recording: what it states, and what an assessor makes of
    // it, both change with it.
    this.refreshParamSummary()
    void this.runAssessments()
    if (this.infoOpen) this.populateInfoPanel()
    // For the page around the player: whatever it says about the recording on show (its
    // description, its title) has to follow a change of observer, and `sightingData` alone cannot
    // tell it when to look again.
    this.dispatchEvent(new CustomEvent(OBSERVER_CHANGE_EVENT, { detail: { src } }))
  }

  /**
   * Asks every registered assessor what it makes of the recording on show, and puts each answer on
   * the strip inside the Assessment nest.
   *
   * Here as much as in the editor, through the same SightingAssessments, because what a scheme
   * concludes is a fact about the OBSERVATION: "CE3 — with entities" is as true of a published
   * account as of one being typed. It lived in the editor alone at first, which meant every reader
   * on a page embedding this player saw none of it.
   *
   * Fired on a change of recording and never on a playback tick: an assessment reads the whole
   * account, so it does not vary with the playhead, and the assessors arrive by dynamic import
   * (see ASSESSMENT_SOURCES) — a reader who never opens the strip still pays for that import, once,
   * which is the price of the chips being there when they do.
   */
  private async runAssessments(): Promise<void> {
    const token = ++this.assessmentToken
    const reading = await new SightingAssessments(this.messages).read(this.sceneElement.ufoElement.sighting)
    if (token !== this.assessmentToken) return
    this.assessmentEntries = reading.entries
    // The strip redraws only when its signature changes, and that signature is over the entries —
    // so the new readings have to be in place before it is asked to compare (see
    // refreshParamSummary).
    this.refreshParamSummary()
  }

  /**
   * Keeps the toolbar's "Account by <observer>" line in sync — and takes it away entirely when
   * there is no observer to name.
   *
   * Several of the recordings this component is pointed at are not account at all: a sky set up
   * to show what a halo or a comet looked like on a given night has no observer, and "Account by
   * /demo-data/sky-test-halos.json" was three wrong things at once — it claimed a account, it
   * claimed a observer, and it named them with a URL. Saying nothing is the accurate answer, and the
   * ? button that carries the observation's own metadata stays either way.
   */
  private updateAccountLine(): void {
    const entry = this.entries.find(e => e.src === this.currentSrc)
    const name = entry ? this.observerDisplayName(this.plain(entry).observer) : undefined
    // With several listed, the picker is the point even where one of them is unnamed.
    const named = name !== undefined || this.entries.length > 1
    this.accountElement.hidden = !named
    // Cleared rather than left alone: a hidden node holding the PREVIOUS observer's name is one
    // stylesheet away from being read out, and a screen reader does not need the stylesheet's
    // permission to reach it.
    this.observerText.textContent = name ?? ""
    this.editLink.hidden = !this.currentSrc
    this.editLink.href = this.editorUrl()
    this.editLink.title = this.messages.editThisObservation
    this.editLink.setAttribute("aria-label", this.messages.editThisObservation)
  }

  /** Picks the best available display string out of a People reference — a full name (built from
   * firstNames+lastName) reads more naturally than a raw title in the common case, but `title` is
   * honored first since it's the field a caller sets when they explicitly want a specific display
   * string (e.g. a name that doesn't decompose cleanly into first/last). `id` is the
   * last-resort, machine-oriented fallback — better than nothing, not meant to be end-user
   * copy. Returns undefined (letting the caller fall back to entry.src) only when observer itself
   * is undefined or empty. */
  /** What the case calls the event whose recording `entry` is, when it is read from a case that names it. */
  private caseTitleOf(entry: ObserverEntry): string | undefined {
    const source = this.caseSource
    if (!source) return undefined
    const event = source.json.events?.find(candidate => candidate.url !== undefined && !candidate.interpretationOf
      && new URL(candidate.url, source.url).href === new URL(entry.src, location.href).href)
    return event ? this.said.read(event.title as SaidText | undefined) : undefined
  }

  private observerDisplayName(observer?: People): string | undefined {
    if (!observer) return undefined
    const fullName = [...(observer.firstNames ?? []), observer.lastName].filter(Boolean).join(" ")
    return this.said.read(observer.title) || fullName || observer.id
  }

  /**
   * The date and time the OBSERVER reported, on their own clock — never converted into the
   * reader's time zone. `sighting.time` is already a local wall-clock reading ("02:45" over
   * Montgomery), so it is formatted as UTC here purely to stop the platform from shifting it:
   * rendered through the reader's zone instead, Chiles and Whitted's 02:45 sighting reads
   * "09:45" in Paris, which is not a fact about the observation but about whoever is reading it.
   */
  /** Recordings already read without their provenance wrappers, by the file they came from. */
  private readonly plainRecordings = new WeakMap<SightingRecordingJson, { recording: SightingRecordingJson, provenance: Provenance }>()

  /**
   * `entry`'s recording with every `{ value, basis, rationale }` replaced by its value — what this
   * element reads names, dates, places and sources from.
   *
   * Any value of a file may carry its provenance (see Provenance), and the scene unwraps it on load;
   * this element reads the same file for its own lines and used to take it as it came, so a derived
   * UTC offset reached the date formatter as an object and threw — leaving the info panel empty.
   */
  private plain(entry: ObserverEntry): SightingRecordingJson {
    return this.stripped(entry).recording
  }

  private stripped(entry: ObserverEntry): { recording: SightingRecordingJson, provenance: Provenance } {
    let stripped = this.plainRecordings.get(entry.sighting)
    if (!stripped) {
      stripped = Provenance.strip(entry.sighting)
      this.plainRecordings.set(entry.sighting, stripped)
    }
    return stripped
  }

  /**
   * How far a line of the panel can be trusted: the WEAKEST basis among the fields it is made of
   * (see Basis), with the reasons given for each. A date whose hour was stated but whose offset was
   * worked out is a derived date; one resting on any guess is an assumed one. Nothing said about
   * any of them means stated, as the format itself reads it.
   */
  private basisOf(entry: ObserverEntry, prefixes: readonly string[]): { basis: Basis, rationales: string[] } {
    const provenance = this.stripped(entry).provenance
    const rank: Record<Basis, number> = { measured: -1, stated: 0, derived: 1, assumed: 2 }
    const known = provenance.paths()
      .filter(path => prefixes.some(prefix => path === prefix || path.startsWith(`${prefix}.`)))
      .map(path => provenance.at(path)!)
    const basis = known.reduce<Basis>((weakest, entry) => rank[entry.basis] > rank[weakest] ? entry.basis : weakest, "stated")
    // The reasons for the basis shown, not for the stronger ones beside it.
    const rationales = known.filter(entry => entry.basis === basis && entry.rationale).map(entry => entry.rationale!)
    return { basis, rationales }
  }

  private formatDate(sighting: SightingRecordingJson): string | undefined {
    const place = sighting.place?.[0]
    const date = sightingTimeToDate(sighting.time ?? {}, place?.lng ?? 0, sighting.utcOffsetHours)
    if (!date) return undefined
    const localMs = date.getTime() + this.utcOffsetHoursOf(sighting, place?.lng ?? 0) * 3_600_000
    // A date the file states wrongly is one missing line, not an empty panel: formatting throws on it.
    if (!Number.isFinite(localMs)) return undefined
    return new Intl.DateTimeFormat(SightingElement.DATE_LOCALES[this.language], {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: "UTC"
    }).format(new Date(localMs))
  }

  /** The offset sightingTimeToDate itself applied — declared when the recording knows it, else
   * the same longitude approximation that function falls back to (see SightingEvent.
   * utcOffsetHours). Undoing exactly it is what recovers the observer's own wall clock. */
  private utcOffsetHoursOf(sighting: SightingRecordingJson, lng: number): number {
    return sighting.utcOffsetHours ?? Math.round(lng / 15)
  }

  private formatLocation(sighting: SightingRecordingJson): string | undefined {
    const place = sighting.place?.[0]
    if (!place) return undefined
    return `${place.lat.toFixed(4)}, ${place.lng.toFixed(4)}`
  }

  /** The close button's own path, and the whole path on browsers without the popover API. Where
   * there IS one, opening goes through the browser's invoker instead (see the constructor) and
   * this only ever runs to close. */
  private toggleInfoPanel(): void {
    const open = !this.infoOpen
    if (this.supportsPopover) {
      // hidePopover/showPopover throw if the element is already in the requested state, so ask it
      // rather than assume: light dismiss may have closed the panel without going through here.
      const showing = this.infoPanel.matches(":popover-open")
      if (open && !showing) this.infoPanel.showPopover()
      else if (!open && showing) this.infoPanel.hidePopover()
      return // the toggle event syncs the rest
    }
    if (open) this.bringInfoButtonIntoView()
    this.syncInfoOpen(open)
    this.infoPanel.hidden = !open
    if (open) {
      // Registered only while actually open, not for the component's whole lifetime — a global
      // listener that's a no-op almost all the time would be pure overhead. Safe to add from
      // inside this same click handler: the click that opened the panel (on infoButton) is still
      // bubbling when this listener gets attached, so it *will* see that same event once it
      // reaches document — handleOutsideClick's own composedPath() check is what stops that from
      // immediately closing the panel it just opened. The popover path needs none of this: light
      // dismiss is the browser's own.
      document.addEventListener("click", this.handleOutsideClick)
    } else {
      document.removeEventListener("click", this.handleOutsideClick)
    }
  }

  /** Brings this element's own state in line with whether the panel is open — driven BY the panel
   * on the popover path (it can be closed by Escape or a click anywhere outside, neither of which
   * goes through any code of ours), and by toggleInfoPanel itself otherwise. */
  /**
   * Scrolls the "?" button fully into view before its panel opens.
   *
   * The panel sizes itself to the room its own anchor leaves (`max-height: stretch`, see the
   * template) — and a partly-scrolled-out anchor offers a region that runs past the bottom of the
   * window. The panel then hangs off the screen with nothing to scroll: its box was never overfull,
   * only partly invisible, which is exactly how a long description became unreachable. Put the
   * anchor where it can be measured and the same rules do the right thing on their own.
   *
   * Nothing when the button is already fully visible, which is nearly always — a reader clicking it
   * had to see it. It is the other ways in that need this: a page opening the panel from script, a
   * keyboard user arriving on the button from a shortcut, a click that also moved the page under
   * itself.
   */
  private bringInfoButtonIntoView(): void {
    const rect = this.infoButton.getBoundingClientRect()
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight
    if (rect.top >= 0 && rect.bottom <= viewportHeight) return
    this.infoButton.scrollIntoView({ block: "center" })
  }

  private syncInfoOpen(open: boolean): void {
    if (open === this.infoOpen) return
    this.infoOpen = open
    this.infoButton.setAttribute("aria-expanded", String(open))
    if (open) {
      if (!this.supportsPopover) this.populateInfoPanel() // the popover path fills it on beforetoggle
    } else {
      this.creditsOpen = false
      this.infoCreditsList.hidden = true
      this.infoCreditsToggle.setAttribute("aria-expanded", "false")
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
    if (this.creditsOpen) this.revealInPanel(this.infoCreditsList)
  }

  /** Scrolls a just-revealed block into the panel's own visible area. The panel is sized to
   * whatever space the button has (see .info-panel:popover-open), so unfolding something at its
   * bottom otherwise adds content below the fold — indistinguishable, to the reader, from a
   * toggle that does nothing. */
  private revealInPanel(block: HTMLElement): void {
    // Optional call: this is a pure layout concern, and jsdom (where this component's own tests
    // run) implements no layout and so no scrollIntoView at all — throwing there would fail a
    // suite over something that has no meaning without a rendering engine.
    block.scrollIntoView?.({ block: "nearest" })
  }

  /** Fills the info panel in one pass: the currently-selected observer's observation metadata
   * (the primary content, shown first), then the smaller footer row below it — app identity
   * (linking to the tool's own home, not this specific recording) and the credits toggle. The
   * credits list itself (live terrain imagery attribution once a real patch has resolved, plus
   * the always-bundled thunder sound credit) is populated here too but stays collapsed until
   * toggleCredits() reveals it — no point building visible DOM for content nobody asked to see
   * yet. Re-run on open and whenever the selected observer changes while the panel is already
   * open — cheap enough not to bother with a more granular per-section update path. */
  /**
   * Whether the parameter strip under the render is showing — what the recording states, field by
   * field, in the same words the editor uses for the same fields.
   *
   * Reflected onto the `show-labels` attribute, so a page can declare it in markup, a script can
   * set it, and the info panel's own toggle can flip it, without the three ever disagreeing about
   * what is on screen. The same relationship `<details>` has with its own `open`: the attribute
   * IS the state, not a one-time instruction that a reader's click then silently invalidates.
   *
   * Off unless asked for: a player dropped into an article is there to be watched, and forty
   * labels under it is a data sheet.
   */
  get showLabels(): boolean {
    return this.labelsShown
  }

  set showLabels(show: boolean) {
    this.toggleAttribute("show-labels", show)
  }

  /**
   * Applies that state: the strip appears, and the info panel is re-cut around it.
   *
   * The two move together on purpose. With the strip showing, the panel's Date/Place/Case/Tags
   * rows say again, in a worse form, what is already spelled out under the render — so they step
   * aside and the panel is left holding the one thing the strip deliberately refuses: the
   * description, which is prose and belongs in a panel rather than on a chip.
   */
  private applyLabels(shown: boolean): void {
    this.labelsShown = shown
    this.syncLabelsToggle()
    this.refreshParamSummary()
    // Unconditionally, not just while the panel happens to be open: the toggle that changes what
    // the panel should hold is IN the panel, so guarding on infoOpen (as selectObserver does, for a
    // change that comes from outside it) left the rows the strip had taken over missing after the
    // strip was turned back off.
    this.populateInfoPanel()
  }

  private syncLabelsToggle(): void {
    this.labelsToggle.textContent = this.labelsShown ? this.messages.hideLabels : this.messages.showLabels
    this.labelsToggle.setAttribute("aria-pressed", String(this.labelsShown))
  }

  /** Rebuilds the strip from the recording itself, through the same SightingSummary the editor
   * shows the same file with. Read-only here: there is no form behind a player to send anyone
   * back to, so a label is a statement and not a way in. */
  private refreshParamSummary(): void {
    this.paramSummary.hidden = !this.labelsShown
    if (!this.labelsShown) {
      this.paramSummary.replaceChildren()
      this.summarySignature = ""
      return
    }
    const sighting = this.sceneElement.ufoElement.sighting
    // No decorId and no sourceId: a reader isn't pointing at one building or one shape, so the
    // summary describes the observation and lists what stood around rather than detailing a
    // selection nobody made. No ground height either — the scene doesn't resolve one, so the
    // observer's own height is stated as height above the ground rather than as a sea-level
    // altitude that would be wrong by the whole relief (see SummaryContext).
    // The assessments last: it is what was made of the recording, and reads after it. They come
    // from the assessors rather than from the file, so they are held here and appended (see
    // runAssessments) instead of being emitted by the summary.
    const entries = [
      ...this.summaryBuilder.entriesFor(sighting, this.sceneElement.ufoElement.currentTime, { roadGradeDeg: this.sceneElement.roadGradeDeg }),
      ...this.assessmentEntries
    ]
    const signature = entries.map(entry => `${entry.field}=${entry.label}=${entry.value}${entry.unit}${entry.full ?? ""}${entry.fromSource ? "*" : ""}`).join("|")
    if (signature === this.summarySignature) {
      return
    }
    this.summarySignature = signature
    // Chips describing a sub-element sit INSIDE one bearing its name — the observer who gave this
    // account — so that "Heading" inside that box needs no other way of saying whose heading it
    // is. The summary emits its groups in one run each, so a box opens when a run starts and
    // closes when it ends.
    //
    // The decor is not among them: its chips are a picker, and a player has nothing to pick with
    // (see SummaryContext.decorPicker), so the summary emits none here. What stood around the
    // observer is in the render, where it can be looked at rather than counted.
    const strip: HTMLElement[] = []
    let open: { group: string, element: HTMLElement } | undefined
    for (const entry of entries) {
      if (open && open.group !== entry.group) {
        open = undefined
      }
      const boxName = entry.group === "summary" ? this.messages.summaryGroup
        : entry.group === "observer" ? this.messages.observerGroup
        : entry.group in this.messages.summaryGroups ? this.messages.summaryGroups[entry.group as keyof typeof this.messages.summaryGroups]
        // Named by its GROUP and never by what it leads to — an assessment of the observer's own
        // account still belongs in a box saying Assessment.
        : entry.group === "assessment" ? this.messages.assessmentGroup : undefined
      if (boxName !== undefined && !open) {
        const box = document.createElement("span")
        box.className = "param-nest"
        const name = document.createElement("span")
        name.className = "param-nest-label"
        name.textContent = boxName
        box.append(name)
        open = { group: entry.group, element: box }
        strip.push(box)
      }
      const item = this.paramItem(entry)
      if (open) {
        open.element.append(item)
      } else {
        strip.push(item)
      }
    }
    this.paramSummary.replaceChildren(...strip)
    this.syncDescription(entries)
  }

  /** The whole description on show in place of the chips, while one has been opened from its chip. */
  private openDescription: string | undefined

  private syncDescription(entries: SummaryEntry[]): void {
    // A description that is no longer the recording's (another observer, another language) closes.
    if (this.openDescription !== undefined && !entries.some(entry => entry.full === this.openDescription)) {
      this.openDescription = undefined
    }
    SummaryDescription.sync(this.paramSummary, this.openDescription, this.messages.summaryDescription,
      this.messages.closeDescription, () => {
        this.openDescription = undefined
        this.syncDescription(entries)
      })
  }

  private paramItem(entry: SummaryEntry): HTMLElement {
    const item = document.createElement("span")
    item.className = entry.fromSource ? "param-label from-source" : "param-label"
    if (entry.full !== undefined) {
      item.classList.add("describable")
      item.tabIndex = 0
      item.setAttribute("role", "button")
      const open = () => {
        this.openDescription = entry.full
        this.syncDescription([entry])
      }
      item.addEventListener("click", open)
      item.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          open()
        }
      })
    }
    const label = document.createElement("span")
    label.className = "param-label-label"
    label.textContent = `${entry.label} `
    item.append(label)
    if (entry.color !== undefined) {
      const swatch = document.createElement("span")
      swatch.className = "param-label-swatch"
      swatch.style.background = entry.color
      item.append(swatch)
    }
    const value = document.createElement("span")
    value.className = "param-label-value"
    value.textContent = entry.unit === "" ? entry.value : `${entry.value} ${entry.unit}`
    item.append(value)
    return item
  }

  private populateInfoPanel(): void {
    const entry = this.entries.find(e => e.src === this.currentSrc)
    this.infoObservationList.innerHTML = ""
    if (entry) {
      // The case always: the strip reads a recording, and a recording does not name its case.
      const caseTitle = this.caseSource && (this.caseSource.json.title ?? this.caseSource.json.id)
      if (caseTitle) {
        this.appendInfoRow(this.infoObservationList, this.messages.case, caseTitle)
      }
      // Date, place and tags only while the strip under the render isn't already stating them —
      // see toggleLabels. The description is never dropped: it is the one thing the strip refuses
      // to carry, because prose doesn't fit on a chip.
      if (!this.labelsShown) {
        const date = this.formatDate(this.plain(entry))
        if (date) {
          this.appendInfoRow(this.infoObservationList, this.messages.date, date,
            this.basisOf(entry, SightingElement.DATE_PATHS))
        }
        const location = this.formatLocation(this.plain(entry))
        if (location) {
          this.appendInfoRow(this.infoObservationList, this.messages.location, location,
            this.basisOf(entry, SightingElement.PLACE_PATHS))
        }
      }
      const description = this.said.read(this.plain(entry).description)
      // Not while the strip shows: its Summary box has the description, opened on a click.
      if (description && !this.labelsShown) {
        this.appendInfoRow(this.infoObservationList, this.messages.description, description)
      }
      // Where the words above can be read as they were given (see RecordingSource).
      for (const source of this.plain(entry).sources ?? []) {
        this.appendInfoSource(this.infoObservationList, this.messages.source, source)
      }
      const tags = this.plain(entry).tags
      if (!this.labelsShown && tags && tags.length > 0) {
        this.appendInfoRow(this.infoObservationList, this.messages.tags,
          tags.map(tag => this.tags.name(tag)).join(", "))
      }
    }

    // The application itself, now that editing this observation has a button of its own.
    this.infoAppLink.href = APP_HOME_URL
    this.infoAppLink.textContent = `UFO@home v${__APP_VERSION__}`

    SceneCredits.fill(this.infoCreditsList, this.sceneElement)
  }

  /** A source as RR0 cites one: title (a link when it has a web address), authors, publisher and
   * date. Only an http(s) address is made a link: a recording is somebody else's file, and a
   * javascript: URL in it must not become a click. */
  private appendInfoSource(list: HTMLElement, label: string, source: RecordingSource): void {
    const dt = document.createElement("dt")
    dt.textContent = label
    const dd = document.createElement("dd")
    const name = source.title ?? source.url ?? ""
    if (source.url && /^https?:\/\//i.test(source.url)) {
      const link = document.createElement("a")
      link.href = source.url
      link.target = "_blank"
      link.rel = "noopener noreferrer"
      link.textContent = name
      dd.appendChild(link)
    } else {
      dd.append(name)
    }
    const details = [
      source.authors?.join(", "), source.publication?.publisher, source.publication?.time, source.index
    ].filter(Boolean)
    if (details.length > 0) dd.append(`, ${details.join(", ")}`)
    list.append(dt, dd)
  }

  /** What the Date line is made of, for its basis — see basisOf. */
  private static readonly DATE_PATHS = ["time", "utcOffsetHours", "timeZone"] as const
  /** And the Location line: the first place, the one it shows. */
  private static readonly PLACE_PATHS = ["place.0"] as const

  private appendInfoRow(list: HTMLElement, label: string, value: string, qualified?: { basis: Basis, rationales: string[] }): void {
    const dt = document.createElement("dt")
    dt.textContent = label
    const dd = document.createElement("dd")
    dd.textContent = value
    if (qualified) {
      // Whether the observer said it, it was worked out, or it was chosen so the replay has a value
      // at all — the question a reader of a reconstruction has to be able to ask of every line.
      const tag = document.createElement("span")
      tag.className = `basis basis-${qualified.basis}`
      tag.textContent = this.messages.basis[qualified.basis]
      if (qualified.rationales.length > 0) tag.title = qualified.rationales.join("\n")
      dd.append(" ", tag)
    }
    list.appendChild(dt)
    list.appendChild(dd)
  }
}

export const SIGHTING_ELEMENT_NAME = "rr0-sighting"

/** Fired by `<rr0-sighting>` whenever the recording on show changes: loaded, set through
 * `sightingData`, or another observer picked. Read `sightingData` back off the element. */
export const OBSERVER_CHANGE_EVENT = "observerchange"

/**
 * What this element was called until 0.41.0, still registered and still working.
 *
 * The name was wrong by then: the element takes several observers and lets a reader move between
 * their points of view, so it is not AN eyeobserver, it is the sighting seen through whichever one
 * you pick — and everything around it already said so (a sighting.json, a ?file= parameter, a
 * `sighting` attribute on <rr0-ufo>). But pages were loading it under the old name before the new
 * one existed, and a rename that breaks them is a rename that punishes the people who used the
 * thing early. Both names, one element, indefinitely.
 */
export const LEGACY_ELEMENT_NAME = "rr0-eyeobserver"

/** Only so that the legacy name has a constructor of its own to be defined with: customElements
 * refuses the same class twice, and there is nothing to add. */
class LegacySightingElement extends SightingElement {
}

export function registerSighting(): void {
  registerScene()
  ShareDialogElement.register()
  if (!customElements.get(SIGHTING_ELEMENT_NAME)) {
    customElements.define(SIGHTING_ELEMENT_NAME, SightingElement)
  }
  if (!customElements.get(LEGACY_ELEMENT_NAME)) {
    customElements.define(LEGACY_ELEMENT_NAME, LegacySightingElement)
  }
}
