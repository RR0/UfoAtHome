import { MODE_CHANGE_EVENT } from "./ReadEditEvents.js"
import { ReadEditSwitch } from "./ReadEditSwitch.js"

export const UFOATHOME_ELEMENT_NAME = "rr0-ufoathome"

/**
 * UFO@home, as an element: what the installed app shows, and what a page can hold whole.
 *
 * For now, a file read or edited in place, each half loaded only when it is first asked for (see ReadEditSwitch); what the app adds
 * around them (opening a file, the recent ones) comes here too, the reader and the editor staying what they are.
 *
 * `<rr0-ufoathome src="case.json">` opens on the file's reader; its pencil turns it into the editor on the same file, which is fetched
 * then and not before: a file that is only read never costs the editor. `mode="edit"`, or no `src` at all, opens on the editor (blank,
 * without `src`), whose Read turns it into the reader. `track` names the recording of a case to open on. Says which is on show, and on
 * what, by MODE_CHANGE_EVENT, for the page to put it in its address.
 *
 * It holds the one or the other as children of its own, in the page's light: what the page says of `rr0-case-editor`, `rr0-case` or
 * `rr0-sighting` applies to them here as anywhere.
 */
export class UfoAtHomeElement extends HTMLElement {

  readonly switcher = new ReadEditSwitch(element => this.append(element), undefined,
    mode => this.dispatchEvent(new CustomEvent(MODE_CHANGE_EVENT, { detail: mode, bubbles: true, composed: true })))

  private started = false

  connectedCallback(): void {
    if (getComputedStyle(this).display === "inline") this.style.display = "block"
    if (this.started) return
    this.started = true
    const src = this.getAttribute("src") ?? undefined
    const track = this.getAttribute("track") ?? undefined
    const opened = src && this.getAttribute("mode") !== "edit"
      ? this.switcher.read({ src, ...(track ? { track } : {}) })
      : this.switcher.edit({ ...(src ? { src } : {}), ...(track ? { track } : {}) })
    this.ready = opened.catch(error => {
      this.dispatchEvent(new CustomEvent("error", { detail: error }))
    })
  }

  /** Settles once the first half to show is there. */
  ready: Promise<void> = Promise.resolve()
}

export function register(): void {
  if (!customElements.get(UFOATHOME_ELEMENT_NAME)) customElements.define(UFOATHOME_ELEMENT_NAME, UfoAtHomeElement)
}
