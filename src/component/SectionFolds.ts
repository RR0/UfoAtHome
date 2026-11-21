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
  /** What the index of a group's sections is called, read aloud (see SectionFolds.indexIn). */
  sectionIndex?: string
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

  /** The titles of those sections, first in them or in a head of their own, with `then` after each and `section` on the section. */
  private static titles(then = "", section = ""): string {
    return [`${SectionFolds.TITLED}${section} > .section-title${then}`, `${SectionFolds.TITLED}${section} > .section-head > .section-title${then}`].join(", ")
  }

  private static readonly TITLES = SectionFolds.titles()

  static readonly CSS = `
${SectionFolds.TITLED}:not([data-unfolded]) > :not(.section-title, .section-head) { display: none !important; }
/* A title in a head of its own (beside a choice that is part of what it folds): the head stays, the title alone in it. */
${SectionFolds.TITLED}:not([data-unfolded]) > .section-head > :not(.section-title) { display: none !important; }
/* Folded, a line of a list: as little room under its title as over it. The room over it is the same either way, so that the title stays
   where it is when it opens; only what is under it grows. */
${SectionFolds.TITLED} { padding-top: 10px; }
${SectionFolds.TITLED}:not([data-unfolded]) { padding-bottom: 9px; }
${SectionFolds.TITLES} { display: flex; align-items: center; gap: 8px; margin: 0 0 -2px; cursor: pointer; user-select: none; }
${SectionFolds.titles(":hover")} { color: var(--ink, CanvasText); }
${SectionFolds.titles(":focus-visible")} { outline: 2px solid var(--sky, Highlight); outline-offset: 3px; border-radius: 4px; }
${SectionFolds.titles("::before")} { content: "›"; display: inline-block; width: .6em; font-size: 1.5em; line-height: .7; letter-spacing: 0;
  transition: transform .12s ease; }
${SectionFolds.titles("::before", "[data-unfolded]")} { transform: rotate(90deg); }
@media (prefers-reduced-motion: reduce) { ${SectionFolds.titles("::before")} { transition: none; } }
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
      return title && SectionFolds.sectionOf(title)?.hasAttribute("data-foldable") ? title : undefined
    }
    root.addEventListener("click", event => {
      const title = titleOf(event)
      // Beside an index, a section listed in it is shown whole under its title, which is no fold any more: the index chooses.
      if (title && !this.listedNow(SectionFolds.sectionOf(title)!)) this.unfold(SectionFolds.sectionOf(title)!, !SectionFolds.sectionOf(title)!.hasAttribute("data-unfolded"))
    })
    root.addEventListener("keydown", event => {
      const key = (event as KeyboardEvent).key
      if (key !== "Enter" && key !== " ") return
      const title = titleOf(event)
      if (!title || this.listedNow(SectionFolds.sectionOf(title)!)) return
      event.preventDefault()
      this.unfold(SectionFolds.sectionOf(title)!, !SectionFolds.sectionOf(title)!.hasAttribute("data-unfolded"))
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
    this.refreshIndex()
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
    // Beside an index, the section listed that holds it is the one shown.
    const panel = element.closest<HTMLElement>(".group-panel")
    let outer: HTMLElement | undefined
    for (let section = element.closest<HTMLElement>(".form-section"); section && panel?.contains(section); section = section.parentElement?.closest<HTMLElement>(".form-section") ?? null) {
      if (section.hasAttribute("data-foldable")) outer = section
    }
    if (panel && outer) {
      this.chosen.set(panel, outer)
      this.refreshIndex()
    }
    for (let section = element.closest<HTMLElement>(".form-section"); section; section = section.parentElement?.closest<HTMLElement>(".form-section") ?? null) {
      if (!section.hasAttribute("data-unfolded")) this.unfold(section, true)
    }
    const section = element.closest<HTMLElement>(".form-section")
    if (section && this.toggles.has(section) && !section.hasAttribute("data-open")) this.setOpen(section, true)
  }

  private unfold(section: HTMLElement, open: boolean): void {
    section.toggleAttribute("data-unfolded", open)
    section.querySelector(SectionFolds.TITLE)?.setAttribute("aria-expanded", String(open))
    // What a fold holds back is measured on show: the section's fields have just come out.
    if (open) this.refresh()
  }

  /** Where the index of the open group's sections is drawn, and the group open; none until indexIn. */
  private index?: { nav: HTMLElement, panel: () => HTMLElement | undefined }
  /** The section shown, group by group, beside the index. */
  private readonly chosen = new WeakMap<HTMLElement, HTMLElement>()
  /** The sections listed in the index as it is drawn. */
  private listed: HTMLElement[] = []
  /** Or the parts of the group open (the Sky's, the Phenomenon's), listed in their place: their tabs, which the index clicks. */
  private listedParts: HTMLElement[] = []
  /** What the index was drawn from, to draw it again only when that changes. */
  private indexKey = ""
  private indexFrame?: number

  /**
   * Lists the titles of the open group's sections in `nav`, as links to each (dicté 2026-11-21 : en trois colonnes, le contenu des
   * sous-sections sous le rendu, « IDENTITÉ › » plutôt que « › IDENTITÉ »): where the page shows `nav` (its CSS decides, by the width
   * there is), one section at a time is shown, whole, and the others are left to the index. Where it does not, the titles fold their
   * sections as before. Drawn again whenever what is on show may have changed: a group or a part of one opened, a section shown or hidden.
   *
   * @param nav Where the index is drawn.
   * @param panel The group open.
   */
  indexIn(nav: HTMLElement, panel: () => HTMLElement | undefined): void {
    this.index = { nav, panel }
    nav.addEventListener("click", event => {
      const part = (event.target as Element | null)?.closest?.<HTMLElement>("[data-part]")
      if (part) {
        this.listedParts[Number(part.dataset.part)]?.click()
        this.refreshIndex()
        return
      }
      const link = (event.target as Element | null)?.closest?.<HTMLElement>("[data-section]")
      const section = link ? this.listed[Number(link.dataset.section)] : undefined
      const open = section?.closest<HTMLElement>(".group-panel")
      if (!section || !open) return
      this.chosen.set(open, section)
      this.refreshIndex()
      // Its fields seen from their first line.
      open.scrollTop = 0
    })
    const later = () => {
      if (this.indexFrame !== undefined) return
      this.indexFrame = requestAnimationFrame(() => {
        this.indexFrame = undefined
        this.refreshIndex()
      })
    }
    // Whether the index is shown is the width's doing; what it lists, the groups' and sections' being shown or not.
    if (typeof ResizeObserver !== "undefined") new ResizeObserver(later).observe(nav.parentElement ?? nav)
    if (typeof MutationObserver !== "undefined") {
      new MutationObserver(later).observe(this.root as Node, { subtree: true, attributes: true, attributeFilter: ["hidden"] })
    }
    this.refreshIndex()
  }

  /**
   * What a title says, and only that: not the help of a (?) beside it, whose text came along with it (« Alentour ?Ce qui faisait du bruit
   * autour de l'observateur… » in the index), nor what a button or a mark in it says.
   */
  private static titleText(title: HTMLElement | null): string {
    if (!title) return ""
    const words = title.cloneNode(true) as HTMLElement
    for (const aside of words.querySelectorAll("rr0-hint, button, [aria-hidden='true'], [hidden]")) aside.remove()
    return (words.textContent ?? "").replace(/\s+/g, " ").trim()
  }

  /** Whether the index is on show: the page gives it room. */
  private get indexed(): boolean {
    const nav = this.index?.nav
    return nav !== undefined && nav.isConnected && getComputedStyle(nav).display !== "none"
  }

  /** Whether `section` is one the index shows on its own, now. */
  private listedNow(section: HTMLElement): boolean {
    return this.listed.includes(section) && this.indexed
  }

  /** Lists the open group's sections, and shows the one chosen (the first, until one is) alone. */
  private refreshIndex(): void {
    const index = this.index
    if (!index) return
    const on = this.indexed
    const panel = on ? index.panel() : undefined
    const shown = (element: Element): boolean => {
      for (let node: Element | null = element; node && node !== panel; node = node.parentElement) if ((node as HTMLElement).hidden) return false
      return true
    }
    // A group in parts (the Sky's ten, the Phenomenon's two) lists its parts rather than its sections (dicté 2026-11-21 : « déplacer
    // les sous-groupes en sous-sections dans la colonne de gauche »): the strip of their tabs goes (see INDEXED_CSS), the sections of
    // the part open fold under their titles as before, and what belongs to no part stays at the top of the group.
    const parts = panel ? [...panel.querySelectorAll<HTMLElement>(":scope > .group-tabs > .subgroup-tab, :scope > .subtabs-row > .group-tabs > .subgroup-tab")]
      .filter(tab => !tab.hidden) : []
    const inParts = parts.length > 1
    this.listedParts = inParts ? parts : []
    // The outermost sections a title folds, on show in the group open.
    const sections = panel && !inParts ? [...panel.querySelectorAll<HTMLElement>(SectionFolds.TITLED)]
      .filter(section => shown(section) && !section.parentElement?.closest(`${SectionFolds.TITLED}`)) : []
    let chosen = panel ? this.chosen.get(panel) : undefined
    if (!chosen || !sections.includes(chosen)) chosen = sections[0]
    for (const section of this.listed) if (!sections.includes(section)) {
      section.removeAttribute("data-elsewhere")
      section.removeAttribute("data-chosen")
    }
    for (const section of sections) {
      section.toggleAttribute("data-elsewhere", section !== chosen)
      section.toggleAttribute("data-chosen", section === chosen)
    }
    // Shown whole: unfolded, without going through unfold, whose refresh would come back here.
    if (chosen && !chosen.hasAttribute("data-unfolded")) {
      chosen.setAttribute("data-unfolded", "")
      chosen.querySelector(SectionFolds.TITLE)?.setAttribute("aria-expanded", "true")
    }
    this.listed = sections
    const titles = inParts ? parts.map(tab => SectionFolds.titleText(tab))
      : sections.map(section => SectionFolds.titleText(section.querySelector<HTMLElement>(SectionFolds.TITLE)))
    const current = inParts ? parts.findIndex(tab => tab.getAttribute("aria-expanded") === "true") : chosen ? sections.indexOf(chosen) : -1
    const key = `${inParts ? "parts" : "sections"}\n${titles.join("\n")}\n${current}\n${this.messages?.sectionIndex ?? ""}`
    if (key === this.indexKey) return
    this.indexKey = key
    const nav = index.nav
    if (this.messages?.sectionIndex) nav.setAttribute("aria-label", this.messages.sectionIndex)
    nav.replaceChildren(...titles.map((title, at) => {
      const link = document.createElement("button")
      link.type = "button"
      link.className = "section-link"
      if (inParts) link.dataset.part = String(at)
      else link.dataset.section = String(at)
      link.textContent = title
      if (at === current) link.setAttribute("aria-current", "true")
      return link
    }))
  }

  /** The index of a group's sections: its titles one under the other, each a link to its section, the one shown marked. */
  static readonly INDEX_CSS = `
.section-index { display: none; }
.section-index > .section-link { display: flex; align-items: center; justify-content: space-between; gap: 10px; width: 100%; margin: 0;
  padding: 10px 14px 10px 18px; border: 0; border-radius: 0; background: none; color: var(--ink-dim, inherit); text-align: start;
  font: 600 12px/1.3 var(--sans, inherit); letter-spacing: .1em; text-transform: uppercase; cursor: pointer; }
/* A title longer than the column is wide wraps (see the column's width in the editor's template). */
.section-index > .section-link::after { content: "›"; font-size: 1.5em; line-height: .7; letter-spacing: 0; }
.section-index > .section-link:hover { color: var(--ink, CanvasText); background: color-mix(in srgb, currentColor 6%, transparent); }
.section-index > .section-link[aria-current="true"] { color: var(--ink, CanvasText); background: color-mix(in srgb, currentColor 10%, transparent);
  box-shadow: inset 3px 0 0 var(--glow-solid, var(--sky, Highlight)); }
.section-index > .section-link:focus-visible { outline: 2px solid var(--sky, Highlight); outline-offset: -2px; }
`

  /** What, beside the index (see indexIn), is left to it: the sections not chosen, and the fold of the one that is. */
  static readonly INDEXED_CSS = `
.form-section[data-elsewhere] { display: none !important; }
/* The parts of a group, listed in the index: their strip of tabs goes, what stands beside it (the Phenomenon's view) stays. */
.group-panel > .group-tabs:has(> .subgroup-tab), .group-panel > .subtabs-row > .group-tabs:has(> .subgroup-tab) { display: none !important; }
${SectionFolds.titles("", "[data-chosen]")} { cursor: default; }
${SectionFolds.titles("::before", "[data-chosen]")} { display: none; }
`

  /**
   * Marks the sections their titles fold, and makes those titles controls a keyboard reaches: those whose title says something (a
   * title left empty, or hidden, would leave a folded section nothing to be opened by), drawn since the last time too.
   */
  private markTitles(): void {
    for (const title of this.root.querySelectorAll<HTMLElement>(`.form-section > .section-title, .form-section > .section-head > .section-title`)) {
      const section = SectionFolds.sectionOf(title)!
      const folds = !title.hidden && (title.textContent ?? "").trim() !== ""
      section.toggleAttribute("data-foldable", folds)
      // Asked of the title, not of the section: a section that draws its content again draws a new title, unmarked.
      if (folds === title.hasAttribute("role")) continue
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

  /** Where a section's title is: first in it, or in a head of its own. */
  private static readonly TITLE = ":scope > .section-title, :scope > .section-head > .section-title"

  /** The section a title folds. */
  private static sectionOf(title: HTMLElement): HTMLElement | undefined {
    const parent = title.parentElement
    const section = parent?.classList.contains("section-head") ? parent.parentElement : parent
    return section?.classList.contains("form-section") ? section : undefined
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
