import { MODE_CHANGE_EVENT } from "./ReadEditEvents.js"
import { ReadEditSwitch } from "./ReadEditSwitch.js"
import { register as registerInputFile, type InputFileElement, type InputFilePick } from "./InputFileElement.js"
import { RecentFiles, type RecentFile } from "./RecentFiles.js"
import { OpenFiles } from "../engine/net/OpenFiles.js"
import { CaseFile } from "../engine/persistence/caseJson.js"
import { EditorTheme } from "./EditorTheme.js"
import { MessageStyle } from "./MessageStyle.js"
import { CaseTemplates, LocalCaseTemplate, type CaseStart, type CaseTemplate } from "../engine/questionnaire/CaseTemplate.js"
import { SaidTexts } from "../engine/model/SaidText.js"
import { HostLocale, selectLocale } from "../i18n/locale.js"
import { loadUfoAtHomeMessages, UFO_SUPPORTED_LANGUAGES, type UfoLanguage } from "./messages/index.js"
import type { UfoAtHomeMessages } from "./messages/UfoAtHomeMessages.js"

export const UFOATHOME_ELEMENT_NAME = "rr0-ufoathome"

const ICON_NEW = `<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M8 3v10M3 8h10"/></svg>`
const ICON_OPEN = `<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4.5h4l1.5 1.5H14v6.5H2z"/></svg>`

const TEMPLATE = `
<style>
:host { display: block; ${EditorTheme.TOKENS} }
:host([hidden]) { display: none; }
${EditorTheme.HEAD}
${EditorTheme.fields(".open-menu")}
${MessageStyle.CSS}
.bar { display: flex; justify-content: flex-end; align-items: center; gap: 8px; flex-wrap: wrap; margin: 0 0 10px; }
.bar .status { margin-right: auto; }
.status[hidden] { display: none; }
.open-menu { width: min(30em, calc(100vw - 2em)); padding: 14px 16px; border: 1px solid var(--line-strong); border-radius: 12px;
  background: var(--ground-raised); color: var(--ink); box-shadow: 0 8px 28px rgba(0, 0, 0, .25); font: 400 14px/1.4 var(--sans);
  text-transform: none; letter-spacing: normal; text-align: left; }
/* Under its button, its right edge on the button's (see placeMenu): an anchor in CSS is not one every browser keeps for a popover. */
.open-menu:popover-open { position: fixed; inset: auto; margin: 0; }
.open-menu rr0-input-file { display: flex; flex-wrap: wrap; }
.open-menu .hint { margin: 6px 0 0; color: var(--ink-dim); font-size: .78em; line-height: 1.3; }
.open-menu h2 { margin: 14px 0 6px; font: 600 12px/1.3 var(--sans); letter-spacing: .12em; text-transform: uppercase; color: var(--glow-dim); }
/* Room right of the last button: the cross stood against the edge of the list, which scrolls. */
.recent { list-style: none; margin: 0; padding: 0 6px 0 0; display: grid; gap: 2px; max-height: 50vh; overflow-y: auto; }
.recent li { display: flex; align-items: center; gap: 6px; }
.recent .reopen { flex: 1; min-width: 0; display: grid; padding: 6px 8px; border: 0; border-radius: 8px; background: none; color: inherit; font: inherit;
  text-align: left; cursor: pointer; }
.recent .reopen:is(:hover, :focus-visible) { background: var(--neutral-bg); }
.recent .name { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.recent .how { color: var(--ink-dim); font-size: .78em; }
.recent .remove { flex: none; width: 28px; height: 28px; border: 0; border-radius: 6px; background: none; color: var(--ink-dim); cursor: pointer; font-size: 16px; }
.recent .remove:is(:hover, :focus-visible) { background: var(--neutral-bg); color: var(--ink); }
.recent-none { margin: 0; color: var(--ink-dim); font-size: .78em; }
.starts { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; }
.starts button { width: 100%; display: grid; gap: 2px; padding: 8px 10px; border: 1px solid var(--line); border-radius: 8px; background: none; color: inherit;
  font: inherit; text-align: left; cursor: pointer; }
.starts button:is(:hover, :focus-visible) { background: var(--neutral-bg); border-color: var(--line-strong); }
.starts .name { font-weight: 600; }
.starts .what { color: var(--ink-dim); font-size: .78em; }
.template-now { margin: 0 0 6px; }
.template-row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.template-row[hidden], .template-forget[hidden] { display: none; }
</style>
<div class="bar">
  <p id="status" class="status" role="status" hidden></p>
  <button id="new" type="button" class="pill-btn">${ICON_NEW}<span id="label-new"></span></button>
  <div id="new-menu" class="open-menu" popover>
    <h2 id="starts-heading"></h2>
    <ul id="starts" class="starts"></ul>
  </div>
  <button id="open" type="button" class="pill-btn" popovertarget="open-menu">${ICON_OPEN}<span id="label-open"></span></button>
</div>
<div id="open-menu" class="open-menu" popover>
  <rr0-input-file id="open-file" name="open" accept=".json" multiple handles></rr0-input-file>
  <p id="open-together" class="hint"></p>
  <h2 id="recent-heading"></h2>
  <ul id="recent" class="recent"></ul>
  <p id="recent-none" class="recent-none" hidden></p>
  <h2 id="template-heading"></h2>
  <p id="template-now" class="template-now"></p>
  <div class="template-row">
    <rr0-input-file id="template-file" name="template" accept=".json,application/json"></rr0-input-file>
    <button id="template-forget" type="button" class="pill-btn template-forget" hidden></button>
  </div>
  <p id="template-hint" class="hint"></p>
</div>
<slot></slot>
`

/**
 * UFO@home, as an element: what the installed app shows, and what a page can hold whole.
 *
 * A file read or edited in place, each half loaded only when it is first asked for (see ReadEditSwitch), and around them what the app
 * adds: a new observation, and opening a file — one of the reader's own (several at once: a case with its observations), or one at an
 * address — with the files opened lately (see RecentFiles). A file opens where the author is: in the reader when reading, in the editor
 * when editing.
 *
 * `<rr0-ufoathome src="case.json">` opens on the file's reader; its pencil turns it into the editor on the same file, which is fetched
 * then and not before: a file that is only read never costs the editor. `mode="edit"`, or no `src` at all, opens on the editor (blank,
 * without `src`), whose Read turns it into the reader. `track` names the recording of a case to open on. Says which is on show, and on
 * what, by MODE_CHANGE_EVENT, for the page to put it in its address.
 *
 * `case-template` is the address of a case template (see CaseTemplate): what New offers to start, the only start taken without asking, and the
 * modules the template names loaded, their scripts run since the page asked for them. The reader may give one of their own instead, from a file
 * of theirs, in the Open menu: kept in this browser until they forget it (see LocalCaseTemplate), its modules loaded without their scripts. Without
 * either, New starts a blank observation. The editor opened blank, with no file, starts as New would under the template.
 *
 * It holds the reader or the editor as children of its own, in the page's light: what the page says of `rr0-case-editor`, `rr0-case` or
 * `rr0-sighting` applies to them here as anywhere.
 */
export class UfoAtHomeElement extends HTMLElement {

  readonly switcher = new ReadEditSwitch(element => this.append(element), undefined,
    mode => this.dispatchEvent(new CustomEvent(MODE_CHANGE_EVENT, { detail: mode, bubbles: true, composed: true })))

  private readonly shadow: ShadowRoot
  private messages?: UfoAtHomeMessages
  private started = false

  constructor() {
    super()
    registerInputFile()
    this.shadow = this.attachShadow({ mode: "open" })
    this.shadow.innerHTML = TEMPLATE
    this.byId("new").addEventListener("click", () => void this.startNew())
    this.byId("open").addEventListener("click", () => {
      this.placeMenu()
      void this.showRecent()
      void this.showTemplate()
    })
    this.byId("open-file").addEventListener("filepick", event => {
      this.closeMenu()
      void this.openPick((event as CustomEvent<InputFilePick>).detail)
    })
    this.byId("template-file").addEventListener("filepick", event => void this.keepTemplate((event as CustomEvent<InputFilePick>).detail))
    this.byId("template-forget").addEventListener("click", () => {
      LocalCaseTemplate.forget()
      void this.showTemplate()
    })
  }

  connectedCallback(): void {
    window.addEventListener("resize", this.fitHeight)
    this.fitHeight()
    if (this.started) return
    this.started = true
    this.localeLoaded = this.loadLocale()
    const src = this.getAttribute("src") ?? undefined
    const track = this.getAttribute("track") ?? undefined
    const opened = src && this.getAttribute("mode") !== "edit"
      ? this.switcher.read({ src, ...(track ? { track } : {}) })
      : this.switcher.edit({ ...(src ? { src } : {}), ...(track ? { track } : {}) })
    this.ready = opened.catch(() => this.say(this.messages?.openFailed, "error"))
    // A blank start, with no file: as New would under the case template, when there is one.
    if (!src) void this.ready.then(() => this.startUnderTemplate())
    // Again once the page around is laid out: its header may not have been when this was connected.
    void this.ready.then(this.fitHeight)
  }

  disconnectedCallback(): void {
    window.removeEventListener("resize", this.fitHeight)
  }

  /**
   * Tells the editor the height the screen leaves it under what is above it (the page's header, this bar), so that, laid out in two columns
   * (see sightingEditorTemplate), it ends where the screen does rather than a header's height below it.
   */
  private readonly fitHeight = (): void => {
    const top = this.byId("open").closest(".bar")!.getBoundingClientRect().bottom + window.scrollY
    this.style.setProperty("--rr0-editor-height", `calc(100dvh - ${Math.round(top + 12)}px)`)
  }

  /** Settles once the first half to show is there. */
  ready: Promise<void> = Promise.resolve()

  /**
   * Opens files of the reader's own, several at once: held together, under names beside each other (see OpenFiles.localBase), so that a
   * case finds the observations picked with it; the case is the one opened, else the first. What the system hands the app (a file
   * opened with it) comes here too. Kept among the recent files, by its handles when there are, else by a copy.
   */
  async openFiles(files: readonly File[], handles?: readonly FileSystemFileHandle[]): Promise<void> {
    const read = (await Promise.all(files.map(async file => {
      const text = await UfoAtHomeElement.textOf(file)
      try {
        return { name: file.name, text, json: JSON.parse(text) as unknown }
      } catch {
        return undefined
      }
    }))).filter(file => file !== undefined)
    if (read.length === 0) {
      this.say(this.messages?.noJson, "warning")
      return
    }
    const base = OpenFiles.localBase()
    OpenFiles.hold(new Map(read.map(file => [new URL(file.name, base).href, { json: file.json, changed: false, local: true }])))
    const opened = read.find(file => CaseFile.isCase(file.json)) ?? read[0]
    this.say(undefined)
    await this.switcher.open(new URL(opened.name, base).href)
    await RecentFiles.add(handles && handles.length
      ? { kind: "handles", name: opened.name, openedAt: Date.now(), handles }
      : { kind: "copy", name: opened.name, openedAt: Date.now(), copies: read.map(({ name, text }) => ({ name, text })) })
  }

  /** What a file holds, as text: by a FileReader, which every browser has (as InputFileElement.bytesOf reads them). */
  private static textOf(file: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(reader.error)
      reader.readAsText(file)
    })
  }

  /** Opens the file at `url`, an address, where the author is (see ReadEditSwitch.open), and keeps it among the recent files. */
  async openAddress(url: string): Promise<void> {
    const absolute = new URL(url, location.href).href
    this.say(undefined)
    await this.switcher.open(absolute)
    await RecentFiles.add({ kind: "address", name: decodeURIComponent(new URL(absolute).pathname.split("/").pop() || absolute), openedAt: Date.now(), url: absolute })
  }

  private async openPick(pick: InputFilePick): Promise<void> {
    try {
      if (pick.url !== undefined) await this.openAddress(pick.url)
      else await this.openFiles(pick.files ?? [pick.file], pick.handles)
    } catch {
      this.say(this.messages?.openFailed, "error")
    }
  }

  private async reopen(file: RecentFile): Promise<void> {
    this.closeMenu()
    try {
      if (file.kind === "address") await this.openAddress(file.url)
      else await this.openFiles((await RecentFiles.files(file))!, file.kind === "handles" ? file.handles : undefined)
    } catch {
      this.say(this.messages?.openFailed, "error")
    }
  }

  /**
   * New: a blank observation without a case template (see `case-template`); with one, its only start, or the menu of its starts. The modules the
   * template names are loaded first, the page having asked for them.
   */
  async startNew(): Promise<void> {
    let template: CaseTemplate | undefined
    try {
      template = await this.template()
    } catch {
      this.say(this.messages?.caseTemplateFailed, "error")
      return
    }
    if (!template) return this.switcher.startNew()
    this.say(undefined)
    await this.offer(template)
  }

  /**
   * The case template in use: the reader's own, kept in this browser, when they gave one; else the page's (its `case-template`); undefined when
   * neither is. An error when the page's cannot be read.
   */
  async template(): Promise<CaseTemplate | undefined> {
    const kept = LocalCaseTemplate.read()
    if (kept) return kept
    const address = this.getAttribute("case-template")
    return address ? CaseTemplates.load(address) : undefined
  }

  /** What `template` offers: its questionnaires known and its modules loaded, then its only start taken, or the menu of its starts opened. */
  private async offer(template: CaseTemplate): Promise<void> {
    await CaseTemplates.install(template)
    const { ModuleSession } = await import("../modules/ModuleSession.js")
    // The page's word runs their scripts; a file of the reader's brings what their manifests state only.
    void ModuleSession.shared.require(template.modules, template.url, template.origin === "page")
    if (template.starts.length === 1) return this.start(template.starts[0], template)
    this.showStarts(template)
  }

  /** The blank start, under the case template when there is one: its only start taken, or its starts offered, in place of a blank observation. */
  private async startUnderTemplate(): Promise<void> {
    let template: CaseTemplate | undefined
    try {
      template = await this.template()
    } catch {
      this.say(this.messages?.caseTemplateFailed, "error")
      return
    }
    if (template) await this.offer(template)
  }

  /** Starts the new observation as `start` says, once the modules it names are there. */
  private async start(start: CaseStart, template?: CaseTemplate): Promise<void> {
    this.closeStarts()
    if (start.modules?.length) {
      const { ModuleSession } = await import("../modules/ModuleSession.js")
      await ModuleSession.shared.require(start.modules, undefined, template?.origin !== "file")
    }
    await this.switcher.startNew(start)
  }

  /** Keeps the case template the reader picked (a file of theirs, or an address read once) in this browser, and says so. */
  private async keepTemplate(pick: InputFilePick): Promise<void> {
    await this.localeLoaded
    const m = this.messages
    try {
      const text = pick.url !== undefined ? await (await fetch(pick.url)).text() : await UfoAtHomeElement.textOf(pick.file)
      const name = pick.url !== undefined ? decodeURIComponent(pick.url.replace(/[?#].*$/, "").replace(/^.*\//, "")) : pick.file.name
      const template = LocalCaseTemplate.keep(text, name)
      const said = new SaidTexts(HostLocale.preferencesFor(this))
      const title = said.read(template.title) ?? template.id
      this.say([m?.templateKept.replace("{title}", title), template.modules?.length ? m?.templateModulesWithoutScripts : undefined].filter(Boolean).join(" "))
    } catch {
      this.say(m?.caseTemplateFailed, "error")
    }
    await this.showTemplate()
  }

  /** Says, in the Open menu, which case template New goes by, and offers to forget the reader's own. */
  private async showTemplate(): Promise<void> {
    await this.localeLoaded
    const m = this.messages
    if (!m) return
    const said = new SaidTexts(HostLocale.preferencesFor(this))
    let template: CaseTemplate | undefined
    try {
      template = await this.template()
    } catch {
      template = undefined
    }
    const title = template ? said.read(template.title) ?? template.id : ""
    this.byId("template-now").textContent = !template ? m.templateNone
      : template.origin === "file" ? m.templateFromFile.replace("{title}", title).replace("{file}", template.fileName ?? "") : m.templateFromPage.replace("{title}", title)
    this.byId("template-forget").hidden = template?.origin !== "file"
  }

  /** Opens the menu of what `template` offers to start, under New. */
  private showStarts(template: CaseTemplate): void {
    const said = new SaidTexts(HostLocale.preferencesFor(this))
    this.byId("starts-heading").textContent = said.read(template.title) ?? ""
    this.byId("starts").replaceChildren(...template.starts.map(start => {
      const item = document.createElement("li")
      const button = document.createElement("button")
      button.type = "button"
      button.dataset.start = start.id
      const name = document.createElement("span")
      name.className = "name"
      name.textContent = said.read(start.title) ?? ""
      button.append(name)
      if (start.description) {
        const what = document.createElement("span")
        what.className = "what"
        what.textContent = said.read(start.description) ?? ""
        button.append(what)
      }
      button.addEventListener("click", () => void this.start(start, template))
      item.append(button)
      return item
    }))
    const menu = this.byId("new-menu") as HTMLElement & { showPopover?: () => void }
    const button = this.byId("new").getBoundingClientRect()
    menu.style.top = `${Math.round(button.bottom + 6)}px`
    menu.style.right = `${Math.max(8, Math.round(window.innerWidth - button.right))}px`
    try {
      menu.showPopover?.()
    } catch {
      // Open already.
    }
  }

  private closeStarts(): void {
    const menu = this.byId("new-menu") as HTMLElement & { hidePopover?: () => void }
    try {
      menu.hidePopover?.()
    } catch {
      // Not open.
    }
  }

  /** Lists the files opened lately, as the menu opens. */
  private async showRecent(): Promise<void> {
    const m = this.messages
    const recent = await RecentFiles.list()
    const list = this.byId("recent")
    list.replaceChildren(...recent.map(file => {
      const item = document.createElement("li")
      const reopen = document.createElement("button")
      reopen.type = "button"
      reopen.className = "reopen"
      const name = document.createElement("span")
      name.className = "name"
      name.textContent = file.name
      const how = document.createElement("span")
      how.className = "how"
      const when = new Date(file.openedAt).toLocaleString(this.language, { dateStyle: "medium", timeStyle: "short" })
      const way = file.kind === "address" ? m?.recentAddress : file.kind === "handles" ? m?.recentHandles : m?.recentCopy
      how.textContent = `${when} · ${way ?? ""}`
      reopen.title = file.kind === "address" ? file.url : file.name
      reopen.append(name, how)
      reopen.addEventListener("click", () => void this.reopen(file))
      const remove = document.createElement("button")
      remove.type = "button"
      remove.className = "remove"
      remove.textContent = "×"
      remove.title = m?.recentRemove ?? ""
      remove.setAttribute("aria-label", m?.recentRemove ?? "")
      remove.addEventListener("click", () => void RecentFiles.remove(file).then(() => this.showRecent()))
      item.append(reopen, remove)
      return item
    }))
    const none = this.byId("recent-none")
    none.hidden = recent.length > 0
  }

  /** Puts the menu under the Open button, its right edge on the button's, within the window. */
  private placeMenu(): void {
    const button = this.byId("open").getBoundingClientRect()
    const menu = this.byId("open-menu")
    menu.style.top = `${Math.round(button.bottom + 6)}px`
    menu.style.right = `${Math.max(8, Math.round(window.innerWidth - button.right))}px`
  }

  private closeMenu(): void {
    const menu = this.byId("open-menu") as HTMLElement & { hidePopover?: () => void }
    try {
      menu.hidePopover?.()
    } catch {
      // Not open.
    }
  }

  private say(text: string | undefined, kind: "info" | "warning" | "error" = "info"): void {
    const status = this.byId("status")
    MessageStyle.show(status, text, kind)
  }

  private language: UfoLanguage = "en"
  /** Its words, loaded: what speaks waits for them. */
  private localeLoaded: Promise<void> = Promise.resolve()

  private async loadLocale(): Promise<void> {
    this.language = selectLocale(HostLocale.preferencesFor(this), UFO_SUPPORTED_LANGUAGES) as UfoLanguage
    const m = this.messages = await loadUfoAtHomeMessages(this.language)
    this.byId("label-new").textContent = m.newFile
    this.byId("new").title = m.newFileHint
    this.byId("label-open").textContent = m.open
    this.byId("open").title = m.openHint
    this.byId("open-together").textContent = m.openTogether
    this.byId("recent-heading").textContent = m.recentHeading
    this.byId("recent-none").textContent = m.recentNone
    ;(this.byId("open-file") as InputFileElement).messages = m
    ;(this.byId("template-file") as InputFileElement).messages = m
    this.byId("template-heading").textContent = m.templateHeading
    this.byId("template-hint").textContent = m.templateLoadHint
    this.byId("template-forget").textContent = m.templateForget
  }

  private byId(id: string): HTMLElement {
    return this.shadow.getElementById(id)!
  }
}

export function register(): void {
  if (!customElements.get(UFOATHOME_ELEMENT_NAME)) customElements.define(UFOATHOME_ELEMENT_NAME, UfoAtHomeElement)
}
