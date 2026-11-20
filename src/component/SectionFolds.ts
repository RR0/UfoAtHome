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
 *
 * Every section with a title, besides, is shown folded to its title until it is unfolded (dicté 2026-11-20 : « par défaut présente
 * chaque sous-section pliée et le user peut déplier celles qu'il veut pour éditer »): a panel opens on the list of what it holds, and
 * the title opens and shuts its section. Kept as it was left, section by section, while the editor stays; a field somebody is sent to
 * opens its section (see reveal). A section held back whole (`data-fold="all"`) is folded by its title as well, its "Show" link gone.
 */
export class SectionFolds {
  /** A section its title folds: marked so (see markTitles), its title saying something. */
  private static readonly TITLED = `.form-section[data-foldable]`

  static readonly CSS = `
${SectionFolds.TITLED}:not([data-unfolded]) > :not(.section-title) { display: none !important; }
${SectionFolds.TITLED}:not([data-unfolded]) { padding-top: 12px; padding-bottom: 12px; }
${SectionFolds.TITLED} > .section-title { display: flex; align-items: center; gap: 8px; margin: 0; cursor: pointer; user-select: none; }
${SectionFolds.TITLED} > .section-title:hover { color: var(--ink, CanvasText); }
${SectionFolds.TITLED} > .section-title:focus-visible { outline: 2px solid var(--sky, Highlight); outline-offset: 3px; border-radius: 4px; }
${SectionFolds.TITLED} > .section-title::before { content: "›"; display: inline-block; width: .6em; font-size: 1.5em; line-height: .7; letter-spacing: 0;
  transition: transform .12s ease; }
${SectionFolds.TITLED}[data-unfolded] > .section-title::before { transform: rotate(90deg); }
@media (prefers-reduced-motion: reduce) { ${SectionFolds.TITLED} > .section-title::before { transition: none; } }
.form-section:not([data-open], [data-fits]) .adv { display: none !important; }
.form-section[data-fold="all"]:not([data-open], [data-foldable]) > :not(.section-title, .more-toggle) { display: none !important; }
/* Folded by its title like every other, a section held back whole needs no second fold under it. */
.form-section[data-fold="all"][data-foldable] > .more-toggle { display: none !important; }
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

  constructor(private readonly root: ParentNode) {
    // The titles fold their sections, those drawn later included: listened to where they all are rather than one by one.
    const titleOf = (event: Event): HTMLElement | undefined => {
      const title = (event.target as Element | null)?.closest?.<HTMLElement>(".section-title")
      const section = title?.parentElement
      return title && section?.hasAttribute("data-foldable") ? title : undefined
    }
    root.addEventListener("click", event => {
      const title = titleOf(event)
      if (title) this.unfold(title.parentElement!, !title.parentElement!.hasAttribute("data-unfolded"))
    })
    root.addEventListener("keydown", event => {
      const key = (event as KeyboardEvent).key
      if (key !== "Enter" && key !== " ") return
      const title = titleOf(event)
      if (!title) return
      event.preventDefault()
      this.unfold(title.parentElement!, !title.parentElement!.hasAttribute("data-unfolded"))
    })
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
    // Whether the fields held back fit the lines a section has depends on its width, and can only be measured while it is on show: each is
    // measured again when it comes into view (its group or its part opened, its first shape added) or its width changes. Not its height,
    // which the measure itself changes.
    if (typeof ResizeObserver !== "undefined") {
      const widths = new Map<Element, number>()
      const observer = new ResizeObserver(entries => {
        let changed = false
        for (const entry of entries) {
          const width = Math.round(entry.contentRect.width)
          if (widths.get(entry.target) === width) continue
          widths.set(entry.target, width)
          changed = true
        }
        if (changed) this.refresh()
      })
      for (const section of this.toggles.keys()) observer.observe(section)
    }
  }

  setMessages(messages: SectionFoldMessages): void {
    this.messages = messages
    this.refresh()
  }

  /** Says again what each fold holds back: what the form shows may have changed since (an instrument picked, a decor kind). */
  refresh(): void {
    this.markTitles()
    const m = this.messages
    if (!m) return
    for (const [section, toggle] of this.toggles) {
      const fits = this.fits(section, toggle)
      section.toggleAttribute("data-fits", fits)
      const open = section.hasAttribute("data-open")
      const whole = section.dataset.fold === "all"
      const n = this.count(section)
      toggle.hidden = (!whole && n === 0) || fits
      const text = whole
        ? (open ? m.hideSettings : n === 0 ? m.showSettingsAny : (n === 1 ? m.showSettingsOne : m.showSettings).replaceAll("{n}", String(n)))
        : (open ? m.lessSettings : m.moreSettings.replaceAll("{n}", String(n)))
      // Written only when it changes: a text set anew is a node inserted anew, at every refresh of every section.
      if (toggle.textContent !== text) toggle.textContent = text
      toggle.setAttribute("aria-expanded", String(open))
    }
  }

  /**
   * Whether the fields a section holds back, shown, leave it no taller than it is folded, its "More settings" line included: then holding
   * them back saves no room (a field beside a button, two pixels taller than it, costs less than the line that would hold it back). Measured on the page, not a section that is not on show (a closed group, a test's DOM): that one
   * keeps its fold. A section held back whole always keeps it: its title alone is what it is folded to.
   */
  private fits(section: HTMLElement, toggle: HTMLButtonElement): boolean {
    if (section.dataset.fold === "all") return false
    const height = () => section.getBoundingClientRect().height
    // Not on show: nothing to measure, and nothing to toggle to measure it.
    if (height() === 0) return false
    const open = section.hasAttribute("data-open")
    const hidden = toggle.hidden
    section.removeAttribute("data-fits")
    toggle.hidden = false
    section.removeAttribute("data-open")
    const folded = height()
    section.setAttribute("data-open", "")
    toggle.hidden = true
    const fits = height() <= folded + 0.5
    section.toggleAttribute("data-open", open)
    toggle.hidden = hidden
    return fits
  }

  /** Opens the section `element` is in, if it is held back there: a field somebody is sent to has to be seen. */
  reveal(element: Element): void {
    for (let section = element.closest<HTMLElement>(".form-section"); section; section = section.parentElement?.closest<HTMLElement>(".form-section") ?? null) {
      if (!section.hasAttribute("data-unfolded")) this.unfold(section, true)
    }
    const section = element.closest<HTMLElement>(".form-section")
    if (section && this.toggles.has(section) && !section.hasAttribute("data-open")) this.setOpen(section, true)
  }

  private unfold(section: HTMLElement, open: boolean): void {
    section.toggleAttribute("data-unfolded", open)
    section.querySelector(":scope > .section-title")?.setAttribute("aria-expanded", String(open))
    // What a fold holds back is measured on show: the section's fields have just come out.
    if (open) this.refresh()
  }

  /**
   * Marks the sections their titles fold, and makes those titles controls a keyboard reaches: those whose title says something (a
   * title left empty, or hidden, would leave a folded section nothing to be opened by), drawn since the last time too.
   */
  private markTitles(): void {
    for (const title of this.root.querySelectorAll<HTMLElement>(".form-section > .section-title")) {
      const section = title.parentElement!
      const folds = !title.hidden && (title.textContent ?? "").trim() !== ""
      if (section.hasAttribute("data-foldable") === folds) continue
      section.toggleAttribute("data-foldable", folds)
      if (folds) {
        title.tabIndex = 0
        title.setAttribute("role", "button")
        title.setAttribute("aria-expanded", String(section.hasAttribute("data-unfolded")))
      } else {
        title.removeAttribute("tabindex")
        title.removeAttribute("role")
        title.removeAttribute("aria-expanded")
      }
    }
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
