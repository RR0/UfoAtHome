import { ModuleSession } from "../modules/ModuleSession.js"
import { ModuleAddress } from "../modules/ModuleAddress.js"
import type { ModuleState } from "../modules/ModuleSession.js"
import type { LoadedModule } from "../modules/ModuleLoader.js"
import type { ConformanceContext, ConformanceFinding } from "../modules/ModuleConformance.js"
import { MessageStyle } from "./MessageStyle.js"
import { HostLocale } from "../i18n/locale.js"
import type { ModulesPanelMessages } from "./messages/ModulesPanelMessages.js"
import { MODULES_PANEL_MESSAGES } from "./messages/ModulesPanelMessages.js"

export const MODULES_PANEL_ELEMENT_NAME = "rr0-modules-panel"

const STYLE = `
rr0-modules-panel { display: block; }
rr0-modules-panel .mp-add { display: flex; gap: .4em; align-items: center; margin: .4em 0; }
rr0-modules-panel .mp-add input { flex: 1 1 16em; min-width: 0; }
rr0-modules-panel .mp-list { list-style: none; margin: .5em 0; padding: 0; }
rr0-modules-panel .mp-module { padding: .4em 0; border-top: 1px solid color-mix(in srgb, CanvasText 15%, transparent); }
rr0-modules-panel .mp-head { display: flex; gap: .6em; align-items: center; flex-wrap: wrap; }
rr0-modules-panel .mp-name { font-weight: 600; }
rr0-modules-panel .mp-url { overflow-wrap: anywhere; }
rr0-modules-panel .mp-head .mp-remove { margin-left: auto; }
rr0-modules-panel .mp-module p { margin: .2em 0; }
rr0-modules-panel .mp-findings { margin: .3em 0; padding-left: 1.2em; }
rr0-modules-panel .mp-files { display: flex; gap: .6em; flex-wrap: wrap; align-items: center; margin-top: .6em; }
`

/**
 * The modules of the page (see ModuleSession), in the editor: those the person added, which they can turn off, remove, save to a file
 * and load from one; those the recording names, which it can name or stop naming (see SightingRecordingJson.modules). An address is
 * typed to add one.
 *
 * `recordingModules` is what the recording names, as written in it; `base` the recording's address, the one those are relative to. A
 * `recordingmoduleschange` (bubbling) tells the host the person changed what the recording names; `recordingModules` then holds the new
 * list.
 *
 * A module installed can be checked against the contract of what it adds to (see ModuleConformance), on request since that asks its services.
 * `checkContext` is what the host can try it on.
 */
export class ModulesPanelElement extends HTMLElement {
  private session = ModuleSession.shared
  /** Its texts, once they have come: nothing is drawn before, in no language (see setLanguage). */
  private messages!: ModulesPanelMessages
  /** Whether a language was asked for: the page's is taken otherwise (see connectedCallback). */
  private languageAsked = false
  private named: string[] = []
  private recordingBase?: string
  private note?: { text: string, kind: "info" | "error" }
  private languageToken = 0
  /** The address being typed. */
  private draft = ""
  private readonly onChange = (): void => this.render()
  /** What the host can try a module on, read when a check is asked for. */
  checkContext?: () => ConformanceContext
  /** The checks asked for, by address: each holds for the module as it was loaded, and goes when it is loaded again. */
  private readonly checks = new Map<string, { of: LoadedModule, findings?: ConformanceFinding[], crash?: string }>()

  /** Which session it shows: the page's, unless a test says otherwise. */
  set moduleSession(session: ModuleSession) {
    this.session.changes.removeEventListener("change", this.onChange)
    this.session = session
    if (this.isConnected) this.session.changes.addEventListener("change", this.onChange)
    this.render()
  }

  get recordingModules(): string[] {
    return [...this.named]
  }

  set recordingModules(urls: readonly string[] | undefined) {
    this.named = [...(urls ?? [])]
    this.render()
  }

  set base(url: string | undefined) {
    this.recordingBase = url
    this.render()
  }

  async setLanguage(language: string): Promise<void> {
    this.languageAsked = true
    const token = ++this.languageToken
    const messages = await MODULES_PANEL_MESSAGES.load(language)
    if (token !== this.languageToken) return
    this.messages = messages
    this.render()
  }

  connectedCallback(): void {
    // Put in a page by itself, it speaks the page's language (see HostLocale).
    if (!this.languageAsked) void this.setLanguage(HostLocale.preferencesFor(this)[0] ?? "en")
    this.session.changes.addEventListener("change", this.onChange)
    void this.session.start()
    this.render()
  }

  disconnectedCallback(): void {
    this.session.changes.removeEventListener("change", this.onChange)
  }

  /** An address the recording names, absolute, for it to be compared with the session's. */
  private absolute(url: string): string | undefined {
    try {
      return new URL(url, this.recordingBase ?? location.href).href
    } catch {
      return undefined
    }
  }

  private isNamed(url: string): boolean {
    return this.named.some(named => this.absolute(named) === url)
  }

  private setNamed(url: string, named: boolean): void {
    if (named === this.isNamed(url)) return
    this.named = named ? [...this.named, ModuleAddress.of(url, this.recordingBase)] : this.named.filter(candidate => this.absolute(candidate) !== url)
    if (named) void this.session.require([url])
    this.dispatchEvent(new Event("recordingmoduleschange", { bubbles: true }))
    this.render()
  }

  private render(): void {
    const m = this.messages
    if (!this.isConnected || !this.messages) return
    const doc = this.ownerDocument
    const style = doc.createElement("style")
    style.textContent = STYLE

    const intro = doc.createElement("p")
    intro.className = MessageStyle.INFO
    intro.textContent = m.intro

    const add = doc.createElement("form")
    add.className = "mp-add"
    const input = doc.createElement("input")
    input.type = "url"
    input.id = "module-url"
    input.required = true
    input.placeholder = m.urlPlaceholder
    // The list is drawn again as modules load: what is being typed stays.
    input.value = this.draft
    input.addEventListener("input", () => { this.draft = input.value })
    input.setAttribute("aria-label", m.urlPlaceholder)
    const addButton = doc.createElement("button")
    addButton.type = "submit"
    addButton.textContent = m.add
    add.append(input, addButton)
    add.addEventListener("submit", event => {
      event.preventDefault()
      const url = input.value.trim()
      if (!url) return
      this.draft = ""
      void this.session.add(url)
    })
    const warning = doc.createElement("p")
    warning.className = MessageStyle.WARNING
    warning.textContent = m.codeWarning

    // What the recording names that the session does not know yet (a recording just loaded): listed all the same.
    const states = this.session.list()
    const known = new Set(states.map(state => state.url))
    const pending = this.named.map(url => this.absolute(url)).filter((url): url is string => url !== undefined && !known.has(url))
    const list = doc.createElement("ul")
    list.className = "mp-list"
    list.append(...states.map(state => this.item(state)),
      ...pending.map(url => this.item({ url, addedByPerson: false, enabled: true, status: "loading" })))
    const empty = doc.createElement("p")
    empty.className = MessageStyle.INFO
    empty.textContent = m.none
    empty.hidden = list.childElementCount > 0

    const files = doc.createElement("div")
    files.className = "mp-files"
    const exportButton = doc.createElement("button")
    exportButton.type = "button"
    exportButton.id = "modules-export"
    exportButton.textContent = m.exportConfig
    exportButton.disabled = !states.some(state => state.addedByPerson)
    exportButton.addEventListener("click", () => this.download())
    const importInput = doc.createElement("input")
    importInput.type = "file"
    importInput.id = "modules-import"
    importInput.accept = "application/json,.json"
    importInput.hidden = true
    const importButton = doc.createElement("button")
    importButton.type = "button"
    importButton.textContent = m.importConfig
    importButton.addEventListener("click", () => importInput.click())
    importInput.addEventListener("change", () => {
      const file = importInput.files?.[0]
      if (file) void this.importFile(file)
      importInput.value = ""
    })
    files.append(exportButton, importButton, importInput)
    const note = doc.createElement("p")
    note.id = "modules-note"
    note.setAttribute("role", "status")
    MessageStyle.show(note, this.note?.text, this.note?.kind)

    this.replaceChildren(style, intro, add, warning, list, empty, files, note)
  }

  private item(state: ModuleState): HTMLLIElement {
    const m = this.messages
    const doc = this.ownerDocument
    const loaded = state.loaded
    const item = doc.createElement("li")
    item.className = "mp-module"
    item.dataset.url = state.url
    const head = doc.createElement("div")
    head.className = "mp-head"
    if (state.addedByPerson) {
      const label = doc.createElement("label")
      const enabled = doc.createElement("input")
      enabled.type = "checkbox"
      enabled.className = "mp-enabled"
      enabled.checked = state.enabled
      enabled.addEventListener("change", () => void this.session.setEnabled(state.url, enabled.checked))
      label.append(enabled, doc.createTextNode(` ${m.enabled}`))
      head.append(label)
    }
    const name = doc.createElement("span")
    name.className = "mp-name"
    name.textContent = state.loaded?.module.name ?? state.url
    head.append(name)
    const credit = state.loaded?.module.credit
    if (credit) {
      const link = doc.createElement(state.loaded?.module.creditUrl ? "a" : "span")
      link.className = MessageStyle.INFO
      link.textContent = credit
      if (link instanceof HTMLAnchorElement) {
        link.href = state.loaded!.module.creditUrl!
        link.target = "_blank"
        link.rel = "noopener noreferrer"
      }
      head.append(link)
    }
    const action = doc.createElement("button")
    action.type = "button"
    action.className = "mp-remove"
    if (state.addedByPerson) {
      action.textContent = m.remove
      action.addEventListener("click", () => void this.session.remove(state.url))
    } else {
      action.textContent = m.addToMine
      action.addEventListener("click", () => void this.session.add(state.url))
    }
    if (state.status === "installed" && loaded) {
      const checkButton = doc.createElement("button")
      checkButton.type = "button"
      checkButton.className = "mp-check"
      const running = this.checks.get(state.url)
      const inProgress = running?.of === loaded && running.findings === undefined && running.crash === undefined
      checkButton.textContent = inProgress ? m.checking : m.check
      checkButton.disabled = inProgress
      checkButton.addEventListener("click", () => void this.check(state.url, loaded))
      head.append(checkButton)
    }
    head.append(action)

    const url = doc.createElement("p")
    url.className = `${MessageStyle.INFO} mp-url`
    url.textContent = state.url
    const status = doc.createElement("p")
    status.className = "mp-status"
    if (state.status === "loading") MessageStyle.show(status, m.loading)
    else if (state.status === "failed") MessageStyle.show(status, m.failed.replace("{error}", state.error ?? ""), "error")
    else if (state.status === "off") MessageStyle.show(status, m.off)
    else MessageStyle.show(status, this.brings(state))
    const code = doc.createElement("p")
    code.className = "mp-code"
    if (loaded?.scriptRun) MessageStyle.show(code, m.runsCode, "warning")
    else if (loaded?.hasScript) MessageStyle.show(code, m.codeNotRun, "info")
    else code.hidden = true

    const namedLabel = doc.createElement("label")
    namedLabel.title = m.namedByRecordingHint
    const named = doc.createElement("input")
    named.type = "checkbox"
    named.className = "mp-named"
    named.checked = this.isNamed(state.url)
    named.addEventListener("change", () => this.setNamed(state.url, named.checked))
    namedLabel.append(named, doc.createTextNode(` ${m.namedByRecording}`))
    const namedRow = doc.createElement("p")
    namedRow.append(namedLabel)

    item.append(head, url, status, code, namedRow)
    const result = this.checks.get(state.url)
    if (result && result.of === loaded) item.append(...this.checkResult(result))
    return item
  }

  private async check(url: string, loaded: LoadedModule): Promise<void> {
    const result: { of: LoadedModule, findings?: ConformanceFinding[], crash?: string } = { of: loaded }
    this.checks.set(url, result)
    this.render()
    try {
      // A chunk of its own, as the check itself is rare: a reader who never asks for one never loads it.
      const { ModuleConformance } = await import("../modules/ModuleConformance.js")
      result.findings = await ModuleConformance.check(loaded, this.checkContext?.())
    } catch (error) {
      result.crash = error instanceof Error ? error.message : String(error)
    }
    this.render()
  }

  /** What a check found, what broke the contract first, or that nothing did and what that does not mean. */
  private checkResult(result: { findings?: ConformanceFinding[], crash?: string }): HTMLElement[] {
    const m = this.messages
    const doc = this.ownerDocument
    const say = (text: string, kind: "info" | "error"): HTMLElement => {
      const line = doc.createElement("p")
      line.className = "mp-check-result"
      line.setAttribute("role", "status")
      MessageStyle.show(line, text, kind)
      return line
    }
    if (result.crash !== undefined) return [say(m.checkCrashed.replace("{error}", () => result.crash!), "error")]
    if (!result.findings) return []
    const failed = result.findings.filter(finding => finding.level === "failed")
    const notes = result.findings.filter(finding => finding.level === "note")
    const lines: HTMLElement[] = []
    if (failed.length === 0) lines.push(say(m.checkPassed, "info"))
    if (failed.length + notes.length > 0) {
      const list = doc.createElement("ul")
      list.className = "mp-findings"
      for (const finding of [...failed, ...notes]) {
        const line = doc.createElement("li")
        MessageStyle.show(line, this.finding(finding), finding.level === "failed" ? "error" : "info")
        list.append(line)
      }
      lines.push(list)
    }
    return lines
  }

  /** A finding in words, with the implementation it is about. */
  private finding(finding: ConformanceFinding): string {
    const m = this.messages
    const point = finding.point === undefined ? "" : m.points[finding.point] ?? finding.point
    const text = m.checks[finding.code].replace("{point}", () => finding.point ?? "").replace("{detail}", () => finding.detail ?? "")
    const about = finding.source ?? (finding.code === "unknownPoint" || finding.code === "notAList" ? undefined : point)
    return about ? m.checkAbout.replace("{about}", () => about).replace("{text}", () => text) : text
  }

  /** What a module brings, by point: "imagery (1), 3D models (2)". */
  private brings(state: ModuleState): string {
    const points = Object.entries(state.loaded?.module.contributes ?? {})
      .filter(([, sources]) => Array.isArray(sources) && sources.length > 0)
      .map(([point, sources]) => `${this.messages.points[point] ?? point} (${(sources as unknown[]).length})`)
    return points.length > 0 ? this.messages.brings.replace("{points}", points.join(", ")) : this.messages.bringsNothing
  }

  private download(): void {
    const blob = new Blob([this.session.exportText()], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = this.ownerDocument.createElement("a")
    link.href = url
    link.download = "ufoathome-modules.json"
    link.click()
    URL.revokeObjectURL(url)
  }

  private async importFile(file: Blob): Promise<void> {
    try {
      await this.session.importText(await file.text())
      const count = this.session.list().filter(state => state.addedByPerson).length
      this.note = { text: this.messages.imported.replace("{count}", String(count)), kind: "info" }
    } catch (error) {
      this.note = { text: this.messages.importFailed.replace("{error}", error instanceof Error ? error.message : String(error)), kind: "error" }
    }
    this.render()
  }
}

export function register(): void {
  if (!customElements.get(MODULES_PANEL_ELEMENT_NAME)) customElements.define(MODULES_PANEL_ELEMENT_NAME, ModulesPanelElement)
}
