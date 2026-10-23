/** What a fold says, by how many settings it holds back. */
export interface SectionFoldMessages {
  /** "More settings ({n})": the advanced fields of a section, held back at its end. */
  moreSettings: string
  lessSettings: string
  /** "Show ({n} settings)" / "Show (1 setting)": a section that is advanced as a whole, held back under its title. */
  showSettings: string
  showSettingsOne: string
  /** A section advanced as a whole whose settings cannot be counted from here (they are drawn by a component of their own). */
  showSettingsAny: string
  hideSettings: string
}

/**
 * The advanced fields of a form, held back where they are rather than behind a mode of the whole editor (see the design handoff,
 * §1.4). A `.form-section` whose fields include some marked `.adv` ends with "› More settings (N)"; one marked `data-fold="all"` is
 * held back whole under its title, with "› Show (N settings)". Each section is opened and closed on its own, and stays as it was left.
 *
 * Counted when asked (see refresh), from what the form shows at that moment: a field hidden for another reason (a camera's settings
 * with the naked eye) is not one held back. And not held back at all where it costs no room: fields that, shown, only fill the lines
 * the section has already (at the width it has now) are shown, and the fold is not offered (see fits).
 */
export class SectionFolds {
  static readonly CSS = `
.form-section:not([data-open], [data-fits]) .adv { display: none !important; }
.form-section[data-fold="all"]:not([data-open]) > :not(.section-title, .more-toggle) { display: none !important; }
.more-toggle {
  grid-column: 1 / -1; justify-self: start; display: inline-flex; align-items: center; gap: 6px;
  min-height: 0; margin: 0; padding: 2px 0; border: 0; background: none; color: var(--sky, LinkText);
  font: 600 13px/1.4 var(--sans, inherit); cursor: pointer;
}
.more-toggle:hover:not(:disabled) { background: none; color: var(--ink, CanvasText); }
.more-toggle::before { content: "›"; display: inline-block; font-size: 1.2em; line-height: 1; transition: transform .12s ease; }
.more-toggle[aria-expanded="true"]::before { transform: rotate(90deg); }
.more-toggle[hidden] { display: none; }
@media (prefers-reduced-motion: reduce) { .more-toggle::before { transition: none; } }
`

  private messages?: SectionFoldMessages
  private readonly toggles = new Map<HTMLElement, HTMLButtonElement>()

  constructor(root: ParentNode, resized?: Element) {
    for (const section of root.querySelectorAll<HTMLElement>(".form-section")) {
      if (section.dataset.fold !== "all" && !section.querySelector(".adv")) continue
      const toggle = document.createElement("button")
      toggle.type = "button"
      toggle.className = "more-toggle"
      toggle.setAttribute("aria-expanded", "false")
      toggle.addEventListener("click", () => this.setOpen(section, !section.hasAttribute("data-open")))
      // Under the title when the whole section is held back; at its end when only some of its fields are.
      const title = section.querySelector(":scope > .section-title")
      if (section.dataset.fold === "all" && title) title.after(toggle)
      else section.append(toggle)
      this.toggles.set(section, toggle)
    }
    // Whether the fields held back fit the lines a section has depends on its width: measured again when that changes.
    if (resized && typeof ResizeObserver !== "undefined") {
      let width = 0
      new ResizeObserver(entries => {
        const now = Math.round(entries[entries.length - 1].contentRect.width)
        if (now === width) return
        width = now
        this.refresh()
      }).observe(resized)
    }
  }

  setMessages(messages: SectionFoldMessages): void {
    this.messages = messages
    this.refresh()
  }

  /** Says again what each fold holds back: what the form shows may have changed since (an instrument picked, a decor kind). */
  refresh(): void {
    const m = this.messages
    if (!m) return
    for (const [section, toggle] of this.toggles) {
      const fits = this.fits(section, toggle)
      section.toggleAttribute("data-fits", fits)
      const open = section.hasAttribute("data-open")
      const whole = section.dataset.fold === "all"
      const n = this.count(section)
      toggle.hidden = (!whole && n === 0) || fits
      toggle.textContent = whole
        ? (open ? m.hideSettings : n === 0 ? m.showSettingsAny : (n === 1 ? m.showSettingsOne : m.showSettings).replaceAll("{n}", String(n)))
        : (open ? m.lessSettings : m.moreSettings.replaceAll("{n}", String(n)))
      toggle.setAttribute("aria-expanded", String(open))
    }
  }

  /**
   * Whether the fields a section holds back, shown, leave it as tall as it is without them: then they only fill lines it has already, and
   * holding them back saves no room. Measured on the page, not a section that is not on show (a closed group, a test's DOM): that one
   * keeps its fold. A section held back whole always keeps it: its title alone is what it is folded to.
   */
  private fits(section: HTMLElement, toggle: HTMLButtonElement): boolean {
    if (section.dataset.fold === "all") return false
    const height = () => section.getBoundingClientRect().height
    const open = section.hasAttribute("data-open")
    const hidden = toggle.hidden
    section.removeAttribute("data-fits")
    toggle.hidden = true
    section.removeAttribute("data-open")
    const folded = height()
    let fits = false
    if (folded > 0) {
      section.setAttribute("data-open", "")
      fits = height() <= folded + 0.5
    }
    section.toggleAttribute("data-open", open)
    toggle.hidden = hidden
    return fits
  }

  /** Opens the section `element` is in, if it is held back there: a field somebody is sent to has to be seen. */
  reveal(element: Element): void {
    const section = element.closest<HTMLElement>(".form-section")
    if (section && this.toggles.has(section) && !section.hasAttribute("data-open")) this.setOpen(section, true)
  }

  private setOpen(section: HTMLElement, open: boolean): void {
    section.toggleAttribute("data-open", open)
    this.refresh()
  }

  /** The fields a fold holds back that the form would otherwise show. */
  private count(section: HTMLElement): number {
    const shown = (element: Element): boolean => {
      for (let node: Element | null = element; node && node !== section; node = node.parentElement) if ((node as HTMLElement).hidden) return false
      return true
    }
    const held = section.dataset.fold === "all"
      ? [...section.querySelectorAll(":scope > label, :scope > .field")]
      : [...section.querySelectorAll(".adv")]
    return held.filter(shown).length
  }
}
