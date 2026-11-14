import { HostLocale, selectLocale } from "../i18n/locale.js"
import { HelpPopover } from "./HelpPopover.js"
import type { CaseReportKind, CaseReportSource } from "./CaseReportExport.js"
import type { CaseExportMessages } from "./messages/CaseExportMessages.js"
import { CASE_EXPORT_MESSAGES, UFO_SUPPORTED_LANGUAGES, type UfoLanguage } from "./messages/index.js"

/**
 * The export of a case's report: a button and its menu, the report as a page (HTML), printed or saved as a PDF by the browser, its data
 * (JSON) and its tables (CSV). One element for the case's player and its editor alike, each giving it what a report is made from through
 * {@link source}.
 *
 * Only this comes with the page: what works the report out and writes it is imported when one is asked for (see CaseReportExport), since
 * most readers of a case never ask.
 *
 * `variant="pill"` shows the button's word beside its icon, as the editor's buttons do; without it, an icon alone, as the player's bar has.
 */
export class CaseExportElement extends HTMLElement {
  static readonly TAG = "rr0-case-export"

  private static readonly ICON = `<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 1.8h5.2L12.5 5v9.2H4z"/><path d="M9 1.8V5h3.5M6 8.2h4.5M6 10.6h4.5M6 12.9h2.5"/></svg>`

  private static readonly CSS = `
:host { display: inline-block; position: relative; }
:host([hidden]) { display: none; }
button.open { display: inline-flex; align-items: center; gap: 6px; font: inherit; color: inherit; cursor: pointer; }
.menu { min-width: 16em; max-width: 22em; padding: 4px; border: 1px solid var(--line, #ccc); border-radius: 10px; background: var(--ground, Canvas);
  color: var(--ink, CanvasText); box-shadow: 0 8px 28px rgba(0, 0, 0, .2); font: 400 13px/1.35 var(--sans, system-ui, sans-serif); }
.menu button { display: block; width: 100%; padding: 6px 10px; border: 0; border-radius: 6px; background: none; color: inherit; font: inherit; text-align: left; cursor: pointer; }
.menu button:is(:hover, :focus-visible) { background: color-mix(in srgb, currentColor 9%, transparent); }
.menu strong { display: block; font-weight: 600; }
.menu small { display: block; opacity: .7; }
.status { padding: 6px 10px; opacity: .8; }
${HelpPopover.css(".menu")}
.menu:popover-open { position-area: bottom span-left; margin: .35em 0 0; }
`

  /** What the report is made from, given by the host: loaded only when a report is asked for. */
  source?: () => Promise<CaseReportSource>

  private messages?: CaseExportMessages
  private language: UfoLanguage = "en"
  private preferences: readonly string[] = ["en"]
  private status?: HTMLElement

  static register(): void {
    if (!customElements.get(CaseExportElement.TAG)) customElements.define(CaseExportElement.TAG, CaseExportElement)
  }

  constructor() {
    super()
    this.attachShadow({ mode: "open" })
  }

  connectedCallback(): void {
    if (!this.messages) void this.loadLocale()
  }

  private async loadLocale(): Promise<void> {
    this.preferences = HostLocale.preferencesFor(this)
    this.language = selectLocale([...this.preferences], UFO_SUPPORTED_LANGUAGES) as UfoLanguage
    this.messages = await CASE_EXPORT_MESSAGES.load(this.language)
    this.draw()
  }

  private draw(): void {
    const m = this.messages!
    const style = document.createElement("style")
    style.textContent = CaseExportElement.CSS
    const open = document.createElement("button")
    open.type = "button"
    open.className = "open"
    open.part.add("button")
    open.title = m.hint
    open.setAttribute("aria-label", m.hint)
    open.setAttribute("aria-haspopup", "menu")
    open.innerHTML = CaseExportElement.ICON
    if (this.getAttribute("variant") === "pill") open.append(Object.assign(document.createElement("span"), { textContent: m.button }))
    const menu = document.createElement("div")
    menu.className = "menu"
    menu.setAttribute("role", "menu")
    HelpPopover.attach(open, menu)
    const items: [CaseReportKind, string, string][] = [["html", m.html, m.htmlHint], ["print", m.print, m.printHint], ["json", m.json, m.jsonHint], ["csv", m.csv, m.csvHint]]
    menu.append(...items.map(([kind, label, hint]) => {
      const item = document.createElement("button")
      item.type = "button"
      item.setAttribute("role", "menuitem")
      item.append(Object.assign(document.createElement("strong"), { textContent: label }), Object.assign(document.createElement("small"), { textContent: hint }))
      item.addEventListener("click", () => void this.export(kind, menu))
      return item
    }))
    this.status = Object.assign(document.createElement("p"), { className: "status", hidden: true })
    this.status.setAttribute("role", "status")
    menu.append(this.status)
    open.addEventListener("click", () => HelpPopover.show(menu, menu.hidden))
    this.shadowRoot!.replaceChildren(style, open, menu)
  }

  private async export(kind: CaseReportKind, menu: HTMLElement): Promise<void> {
    const m = this.messages!
    if (!this.source) return
    this.status!.textContent = m.working
    this.status!.hidden = false
    try {
      const [{ CaseReportExport }, source] = await Promise.all([import("./CaseReportExport.js"), this.source()])
      await CaseReportExport.make(kind, source, this.language, this.preferences)
      this.status!.hidden = true
      HelpPopover.show(menu, false)
    } catch {
      this.status!.textContent = m.failed
    }
  }
}
