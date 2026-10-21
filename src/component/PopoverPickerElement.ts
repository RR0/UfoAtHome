export const POPOVER_PICKER_ELEMENT_NAME = "rr0-popover-picker"

/**
 * One node of the tree a picker offers. A node with `children` is a heading (of any depth) and is
 * not itself chosen; a node without is a choice, identified by its `id`.
 */
export interface PickerNode {
  /** What a choice's value is. Unused on a heading. */
  id?: string
  label: string
  /** Sub-headings and choices, in the order they are listed. */
  children?: PickerNode[]
  /** Why a choice cannot be taken now, when it cannot: shown as its `title` and the choice stays
   * listed, greyed, rather than vanishing — a reader sees what exists and why it is out of reach. */
  disabledReason?: string
  /** A hint for a choice that CAN be taken, shown as its `title`. */
  hint?: string
}

const STYLE = `
rr0-popover-picker { display: inline-block; }
rr0-popover-picker .pp-trigger { anchor-name: --rr0-popover-picker; font-family: inherit; text-align: left; max-width: 100%; cursor: pointer; }
rr0-popover-picker .pp-panel { padding: .3em 0; border: 1px solid light-dark(#ccc, #4a4c52); border-radius: 4px; background: light-dark(#fff, #1e1f22); color: light-dark(#222, #e6e6e6); max-height: 60vh; overflow-y: auto; box-shadow: 0 2px 8px rgba(0, 0, 0, .25); font-size: .9em; }
@supports (position-area: bottom span-right) {
  rr0-popover-picker .pp-panel:popover-open { position-anchor: --rr0-popover-picker; inset: auto; position-area: bottom span-right; margin: .2em 0 0 0; }
}
rr0-popover-picker .pp-heading { margin: .4em 0 .1em; padding: 0 .8em 0 calc(.8em + var(--pp-depth, 0) * 1em); font-weight: 600; opacity: .75; font-size: .85em; text-transform: uppercase; letter-spacing: .03em; }
rr0-popover-picker .pp-choice { display: block; width: 100%; padding: .25em .8em .25em calc(.8em + var(--pp-depth, 0) * 1em); border: 0; background: none; color: inherit; font: inherit; text-align: left; cursor: pointer; white-space: nowrap; }
rr0-popover-picker .pp-choice:hover, rr0-popover-picker .pp-choice:focus-visible { background: light-dark(#e8f0fe, #2c3a55); }
rr0-popover-picker .pp-choice[aria-selected="true"] { font-weight: 600; }
rr0-popover-picker .pp-choice[aria-selected="true"]::before { content: "✓ "; }
rr0-popover-picker .pp-choice[aria-disabled="true"] { opacity: .45; cursor: not-allowed; background: none; }
`

/**
 * A hierarchical choice in a popover: a button showing the current choice, opening a list of
 * headings and choices to one side of it. Native `<select>` cannot nest beyond one level, cannot
 * give a disabled option an explanation people can read, and cannot be styled; this keeps what a
 * select does (a `value`, a bubbling `change` event) so anything that drove one drives this.
 *
 * Configure it with data, never with code: `choices` takes a tree of PickerNode, and `placeholder`
 * says what the button reads while no known choice is selected. A choice with `disabledReason` is
 * listed but cannot be taken, and carries the reason as its `title`; it uses `aria-disabled` rather
 * than `disabled` because a disabled button shows no tooltip in every browser.
 *
 * The value is the choice's `id`. Setting a value the tree does not hold keeps it (the record is
 * the record) and shows it as is, while `change` fires only when a person picks.
 */
export class PopoverPickerElement extends HTMLElement {
  private tree: PickerNode[] = []
  private current = ""
  private trigger?: HTMLButtonElement
  private panel?: HTMLElement
  /** True when the menu drawn in the panel no longer matches `tree`/`current`; redrawn when it opens. */
  private stale = true

  /** Makes the controls, once. */
  build(): void {
    if (this.trigger) return
    const doc = this.ownerDocument
    const style = doc.createElement("style")
    style.textContent = STYLE
    const trigger = doc.createElement("button")
    trigger.type = "button"
    // Drawn as every select is, its arrow included (see InputFont.PICKER).
    trigger.className = "pp-trigger rr0-select"
    const panel = doc.createElement("div")
    panel.className = "pp-panel"
    panel.setAttribute("popover", "")
    panel.setAttribute("role", "listbox")
    const panelId = `${this.id || "rr0-popover-picker"}-panel`
    panel.id = panelId
    trigger.setAttribute("popovertarget", panelId)
    trigger.setAttribute("aria-haspopup", "listbox")
    this.trigger = trigger
    this.panel = panel
    panel.addEventListener("beforetoggle", event => {
      if ((event as ToggleEvent).newState === "open") this.drawMenu()
    })
    this.append(style, trigger, panel)
    this.render()
  }

  connectedCallback(): void {
    this.build()
  }

  /** The tree on offer. Redrawn at once, the selection kept. */
  set choices(tree: PickerNode[]) {
    this.tree = tree
    this.build()
    this.render()
  }

  get choices(): PickerNode[] {
    return this.tree
  }

  /** What the button reads when the value is empty or unknown to the tree. */
  get placeholder(): string {
    return this.getAttribute("placeholder") ?? ""
  }

  set placeholder(text: string) {
    this.setAttribute("placeholder", text)
    this.render()
  }

  get value(): string {
    return this.current
  }

  /** Sets what is selected, telling nobody. */
  set value(id: string) {
    this.current = id
    this.build()
    this.render()
  }

  /** The label of the selected choice, or undefined when the tree does not hold it. */
  get selectedLabel(): string | undefined {
    return PopoverPickerElement.find(this.tree, this.current)?.label
  }

  private static find(nodes: PickerNode[], id: string): PickerNode | undefined {
    for (const node of nodes) {
      if (node.children) {
        const found = PopoverPickerElement.find(node.children, id)
        if (found) return found
      } else if (node.id === id) return node
    }
    return undefined
  }

  private pick(node: PickerNode): void {
    if (node.disabledReason !== undefined || node.id === undefined) return
    this.panel?.hidePopover?.()
    if (node.id === this.current) return
    this.current = node.id
    this.render()
    this.dispatchEvent(new Event("change", { bubbles: true }))
  }

  private render(): void {
    if (!this.trigger || !this.panel) return
    this.trigger.textContent = this.selectedLabel ?? (this.current || this.placeholder)
    this.stale = true
    let open = false
    try { open = this.panel.matches(":popover-open") } catch { /* no popover support: drawn on demand */ }
    if (open) this.drawMenu()
  }

  /**
   * Draws the menu. Done when the popover opens, not on every change of the tree: a menu of a few hundred
   * nodes is costly to build and most pickers are never opened. Public so a caller (or a test) can read
   * the choices without opening it.
   */
  drawMenu(): void {
    if (!this.panel || !this.stale) return
    this.stale = false
    const doc = this.ownerDocument
    const draw = (nodes: PickerNode[], depth: number): HTMLElement[] =>
      nodes.flatMap(node => {
        if (node.children) {
          const heading = doc.createElement("div")
          heading.className = "pp-heading"
          heading.setAttribute("role", "presentation")
          heading.style.setProperty("--pp-depth", String(depth))
          heading.textContent = node.label
          return [heading, ...draw(node.children, depth + 1)]
        }
        const choice = doc.createElement("button")
        choice.type = "button"
        choice.className = "pp-choice"
        choice.dataset.id = node.id
        choice.setAttribute("role", "option")
        choice.setAttribute("aria-selected", String(node.id === this.current))
        choice.style.setProperty("--pp-depth", String(depth))
        choice.textContent = node.label
        const title = node.disabledReason ?? node.hint
        if (title) choice.title = title
        if (node.disabledReason !== undefined) choice.setAttribute("aria-disabled", "true")
        choice.addEventListener("click", () => this.pick(node))
        return [choice]
      })
    this.panel.replaceChildren(...draw(this.tree, 0))
  }
}

export function register(): void {
  if (!customElements.get(POPOVER_PICKER_ELEMENT_NAME)) customElements.define(POPOVER_PICKER_ELEMENT_NAME, PopoverPickerElement)
}
