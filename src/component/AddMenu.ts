/** One kind a "+" can add: what it is called, and why it cannot be added now when it cannot. `hidden` ones are not offered. */
export interface AddMenuKind {
  value: string
  label: string
  hidden?: boolean
  /** Why it cannot be added now: it stays listed, greyed, with this as its tooltip, rather than vanishing. */
  disabledReason?: string
}

/**
 * What a "+" adds when it can add several kinds of thing: pressed, it opens a list of the kinds beside it, and the kind picked is added. A
 * select of the kind before or after the "+" was a second control to set first, which a reader had to find, and whose last choice silently
 * decided what the next "+" made.
 *
 * A popover of buttons, one to a kind, placed under the "+" where the browser can anchor it (and centred where it cannot): it closes when a
 * kind is picked, on Escape, and on a click elsewhere. Its CSS (`AddMenu.CSS`) goes in the shadow root that shows it, as ElementList's does.
 */
export class AddMenu {
  static readonly CSS = `
.add-menu { padding: .3em 0; border: 1px solid color-mix(in srgb, CanvasText 30%, transparent); border-radius: 4px; background: Canvas; color: CanvasText;
  box-shadow: 0 2px 8px rgba(0, 0, 0, .25); max-height: 60vh; overflow-y: auto; font-size: .9em; }
@supports (position-area: bottom span-left) {
  .add-menu:popover-open { inset: auto; position-area: bottom span-left; margin: .2em 0 0 0; }
}
.add-menu-choice { display: block; width: 100%; padding: .25em .9em; border: 0; background: none; color: inherit; font: inherit; text-align: left;
  cursor: pointer; white-space: nowrap; }
.add-menu-choice:hover, .add-menu-choice:focus-visible { background: color-mix(in srgb, CanvasText 12%, transparent); }
.add-menu-choice[aria-disabled="true"] { opacity: .45; cursor: not-allowed; background: none; }
.add-menu-choice[hidden] { display: none; }
`

  readonly panel: HTMLDivElement
  private kinds: AddMenuKind[] = []
  /** The kind last added, which a caller adding "one more of the same" can ask for. */
  private last?: string

  /**
   * @param button The "+": it opens the menu instead of adding.
   * @param id The menu's own id, which the "+" points at.
   * @param onPick Told the kind picked.
   * @param idOf The id of each kind's button, where others find it (tests, labels).
   */
  constructor(private readonly button: HTMLButtonElement, id: string, private readonly onPick: (value: string) => void, private readonly idOf?: (value: string) => string) {
    const panel = this.panel = button.ownerDocument.createElement("div")
    panel.id = id
    panel.className = "add-menu"
    panel.setAttribute("popover", "")
    panel.setAttribute("role", "menu")
    // Anchored to its own "+": each menu names its anchor after its button, as several lists show one at once.
    const anchor = `--add-menu-${id}`
    button.style.setProperty("anchor-name", anchor)
    panel.style.setProperty("position-anchor", anchor)
    button.setAttribute("popovertarget", id)
    button.setAttribute("aria-haspopup", "menu")
    button.after(panel)
  }

  /** The kinds offered, as the reader's language calls them. */
  setKinds(kinds: AddMenuKind[]): void {
    this.kinds = kinds
    const document = this.button.ownerDocument
    this.panel.replaceChildren(...kinds.map(kind => {
      const choice = document.createElement("button")
      choice.type = "button"
      choice.className = "add-menu-choice"
      choice.setAttribute("role", "menuitem")
      if (this.idOf) choice.id = this.idOf(kind.value)
      choice.dataset.value = kind.value
      choice.textContent = kind.label
      choice.hidden = kind.hidden === true
      // aria-disabled and not disabled: a disabled button shows no tooltip, and the reason is the point of keeping it listed.
      if (kind.disabledReason) {
        choice.setAttribute("aria-disabled", "true")
        choice.title = kind.disabledReason
      }
      choice.addEventListener("click", () => {
        if (choice.getAttribute("aria-disabled") === "true") return
        this.close()
        this.last = kind.value
        this.onPick(kind.value)
      })
      return choice
    }))
  }

  /** Says a kind cannot be added now, and why — or that it can again (no reason). */
  setDisabled(value: string, reason: string | undefined): void {
    this.kinds = this.kinds.map(kind => kind.value === value ? { ...kind, disabledReason: reason } : kind)
    const choice = [...this.panel.children].find(child => (child as HTMLElement).dataset.value === value) as HTMLElement | undefined
    if (!choice) return
    if (reason) {
      choice.setAttribute("aria-disabled", "true")
      choice.title = reason
    } else {
      choice.removeAttribute("aria-disabled")
      choice.title = ""
    }
  }

  /** What a kind is called, or the kind itself where it is not one that is known. */
  labelOf(value: string): string {
    return this.kinds.find(kind => kind.value === value)?.label ?? value
  }

  /** The kind last added from the menu, if any. */
  get lastPicked(): string | undefined {
    return this.last
  }

  private close(): void {
    // Not every browser (nor every test's DOM) has popovers: the menu is then a list always there, which a pick leaves as it is.
    if (typeof this.panel.hidePopover !== "function") return
    try {
      if (this.panel.matches(":popover-open")) this.panel.hidePopover()
    } catch {
      // A DOM that does not know the state: there is nothing open to close.
    }
  }
}
