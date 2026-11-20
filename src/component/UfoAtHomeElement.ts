import { MODE_CHANGE_EVENT } from "./ReadEditEvents.js"
import { ReadEditSwitch } from "./ReadEditSwitch.js"
import { register as registerInputFile, type InputFileElement, type InputFilePick } from "./InputFileElement.js"
import { RecentFiles, type RecentFile } from "./RecentFiles.js"
import { OpenFiles } from "../engine/net/OpenFiles.js"
import { CaseFile } from "../engine/persistence/caseJson.js"
import { EditorTheme } from "./EditorTheme.js"
import { MessageStyle } from "./MessageStyle.js"
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
.recent { list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; max-height: 50vh; overflow-y: auto; }
.recent li { display: flex; align-items: center; gap: 6px; }
.recent .reopen { flex: 1; min-width: 0; display: grid; padding: 6px 8px; border: 0; border-radius: 8px; background: none; color: inherit; font: inherit;
  text-align: left; cursor: pointer; }
.recent .reopen:is(:hover, :focus-visible) { background: var(--neutral-bg); }
.recent .name { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.recent .how { color: var(--ink-dim); font-size: .78em; }
.recent .remove { flex: none; width: 28px; height: 28px; border: 0; border-radius: 6px; background: none; color: var(--ink-dim); cursor: pointer; font-size: 16px; }
.recent .remove:is(:hover, :focus-visible) { background: var(--neutral-bg); color: var(--ink); }
.recent-none { margin: 0; color: var(--ink-dim); font-size: .78em; }
</style>
<div class="bar">
  <p id="status" class="status" role="status" hidden></p>
  <button id="new" type="button" class="pill-btn">${ICON_NEW}<span id="label-new"></span></button>
  <button id="open" type="button" class="pill-btn" popovertarget="open-menu">${ICON_OPEN}<span id="label-open"></span></button>
</div>
<div id="open-menu" class="open-menu" popover>
  <rr0-input-file id="open-file" name="open" accept=".json" multiple handles></rr0-input-file>
  <p id="open-together" class="hint"></p>
  <h2 id="recent-heading"></h2>
  <ul id="recent" class="recent"></ul>
  <p id="recent-none" class="recent-none" hidden></p>
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
    this.byId("new").addEventListener("click", () => void this.switcher.startNew())
    this.byId("open").addEventListener("click", () => {
      this.placeMenu()
      void this.showRecent()
    })
    this.byId("open-file").addEventListener("filepick", event => {
      this.closeMenu()
      void this.openPick((event as CustomEvent<InputFilePick>).detail)
    })
  }

  connectedCallback(): void {
    if (this.started) return
    this.started = true
    void this.loadLocale()
    const src = this.getAttribute("src") ?? undefined
    const track = this.getAttribute("track") ?? undefined
    const opened = src && this.getAttribute("mode") !== "edit"
      ? this.switcher.read({ src, ...(track ? { track } : {}) })
      : this.switcher.edit({ ...(src ? { src } : {}), ...(track ? { track } : {}) })
    this.ready = opened.catch(() => this.say(this.messages?.openFailed, "error"))
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
  }

  private byId(id: string): HTMLElement {
    return this.shadow.getElementById(id)!
  }
}

export function register(): void {
  if (!customElements.get(UFOATHOME_ELEMENT_NAME)) customElements.define(UFOATHOME_ELEMENT_NAME, UfoAtHomeElement)
}
