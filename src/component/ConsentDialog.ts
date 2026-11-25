import { ModuleConsent } from "../modules/ModuleConsent.js"
import type { ConsentMessages } from "./messages/ConsentMessages.js"

const STYLE = `
.consent-dialog { width: min(32em, calc(100vw - 2em)); padding: 14px 16px; border: 1px solid var(--line-strong, #888); border-radius: 12px;
  background: var(--ground-raised, Canvas); color: var(--ink, CanvasText); box-shadow: 0 8px 28px rgba(0, 0, 0, .25); font: 400 14px/1.4 var(--sans, sans-serif); }
.consent-dialog:popover-open { position: fixed; inset: 0; margin: auto; height: fit-content; }
.consent-dialog h2 { margin: 0 0 8px; font: 600 12px/1.3 var(--sans, sans-serif); letter-spacing: .12em; text-transform: uppercase; color: var(--glow-dim, inherit); }
.consent-dialog p { margin: 0; }
.consent-dialog ul { margin: 6px 0 10px; padding-left: 1.2em; font-family: var(--mono, monospace); font-size: .85em; overflow-wrap: anywhere; }
.consent-dialog .actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; }
`

/**
 * The one dialog that asks the reader whether to run module code from other sites (a module they add by hand, the modules a case template of theirs
 * names), the app's own and never the browser's: it names the sites, and its answer is kept (see ModuleConsent), so that a site agreed to is not asked
 * about again. Sites agreed to already, and the page's own, are not asked about.
 */
export class ConsentDialog {
  /** Whether the code of `urls` may run: at once when every site is agreed to already; else as the reader answers, in a dialog put in `root`. */
  static async ask(root: ShadowRoot | HTMLElement, messages: ConsentMessages | undefined, urls: readonly string[]): Promise<boolean> {
    const unasked = [...new Set(urls.filter(url => !ModuleConsent.granted(url)).map(url => ModuleConsent.originOf(url)))]
    if (unasked.length === 0) return true
    const doc = (root instanceof ShadowRoot ? root.host : root).ownerDocument
    const dialog = doc.createElement("div") as HTMLDivElement & { showPopover?: () => void, hidePopover?: () => void }
    dialog.className = "consent-dialog"
    dialog.id = "consent"
    dialog.setAttribute("popover", "manual")
    dialog.setAttribute("role", "dialog")
    const style = doc.createElement("style")
    style.textContent = STYLE
    const heading = doc.createElement("h2")
    heading.id = "consent-heading"
    heading.textContent = messages?.consentHeading ?? ""
    dialog.setAttribute("aria-labelledby", heading.id)
    const text = doc.createElement("p")
    text.id = "consent-text"
    text.textContent = messages?.consentText ?? ""
    const origins = doc.createElement("ul")
    origins.id = "consent-origins"
    origins.append(...unasked.map(origin => Object.assign(doc.createElement("li"), { textContent: origin })))
    const actions = doc.createElement("div")
    actions.className = "actions"
    const without = Object.assign(doc.createElement("button"), { type: "button", id: "consent-without", className: "pill-btn", textContent: messages?.consentWithout ?? "" })
    const run = Object.assign(doc.createElement("button"), { type: "button", id: "consent-run", className: "pill-btn primary", textContent: messages?.consentRun ?? "" })
    actions.append(without, run)
    dialog.append(style, heading, text, origins, actions)
    ;(root as ShadowRoot).getElementById?.("consent")?.remove()
    root.append(dialog)
    return new Promise(resolve => {
      const answer = (allowed: boolean) => {
        try {
          dialog.hidePopover?.()
        } catch {
          // Closed already.
        }
        dialog.remove()
        if (allowed) ModuleConsent.grant(urls)
        resolve(allowed)
      }
      run.addEventListener("click", () => answer(true))
      without.addEventListener("click", () => answer(false))
      try {
        dialog.showPopover?.()
      } catch {
        // Shown already.
      }
      without.focus()
    })
  }
}
