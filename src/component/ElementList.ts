/** One entry of the list: what it is called, and the id the editor knows it by. */
export interface ElementListItem {
  id: string
  label: string
}

/** One kind that can be added; `hidden` ones are not offered but still name what they are (an observer is added from its own button). */
export interface ElementListKind {
  value: string
  label: string
  hidden?: boolean
}

/** A button beside the picker that acts on the selected element: look at it. */
export interface ElementListAction {
  id: string
  glyph: string
  onClick: () => void
}

export interface ElementListOptions {
  /** Where the picker and what acts on the selected element go. */
  header: HTMLElement
  /** Where the adding goes: a row of its own, since what is edited sits between the two. */
  footer: HTMLElement
  /** The ids of the controls, which others find them by (a summary chip focuses the picker; tests read them). */
  ids: { list: string, label: string, remove: string, add: string, kinds?: string, kind?: (value: string) => string }
  actions?: ElementListAction[]
  onSelect: (id: string) => void
  /** `kind` is the one picked beside the button, absent when the list has no kinds. */
  onAdd: (kind: string | undefined) => void
  onRemove: () => void
}

/**
 * The list of the elements of one kind of collection — the decor of a recording, its bodies, its launches — with what is done to it:
 * pick one, add one (of a kind, when there are several), remove the picked one, and the buttons that act on the picked one. The
 * editor says what is in the list and what each is called; what an element IS and what can be set on it are the business of its
 * parameter set (see ParameterForm), and nothing here knows either.
 *
 * With no element there is nothing to pick or remove, so the picker, the actions and the remove button are hidden and only
 * the adding stays: a blank recording does not present a wall of inert controls.
 */
export class ElementList {
  private readonly select: HTMLSelectElement
  private readonly labelText: HTMLSpanElement
  private readonly pickerRow: HTMLLabelElement
  private readonly removeButton: HTMLButtonElement
  private readonly addButton: HTMLButtonElement
  private readonly kindSelect?: HTMLSelectElement
  private readonly actionButtons = new Map<string, HTMLButtonElement>()
  private kinds: ElementListKind[] = []

  constructor(private readonly options: ElementListOptions) {
    this.pickerRow = document.createElement("label")
    this.labelText = document.createElement("span")
    this.labelText.id = options.ids.label
    this.select = document.createElement("select")
    this.select.id = options.ids.list
    this.select.addEventListener("change", () => options.onSelect(this.select.value))
    this.pickerRow.append(this.labelText, " ", this.select)
    options.header.append(this.pickerRow)
    for (const action of options.actions ?? []) {
      const button = this.iconButton(action.id, action.glyph)
      button.addEventListener("click", () => action.onClick())
      this.actionButtons.set(action.id, button)
      options.header.append(button)
    }
    this.removeButton = this.iconButton(options.ids.remove, "🗑")
    this.removeButton.addEventListener("click", () => options.onRemove())
    options.header.append(this.removeButton)

    const row = document.createElement("div")
    row.className = "decor-add-row"
    this.addButton = this.iconButton(options.ids.add, "+")
    this.addButton.addEventListener("click", () => options.onAdd(this.kindSelect?.value))
    row.append(this.addButton)
    if (options.ids.kinds) {
      this.kindSelect = document.createElement("select")
      this.kindSelect.id = options.ids.kinds
      row.append(this.kindSelect)
    }
    options.footer.append(row)
  }

  private iconButton(id: string, glyph: string): HTMLButtonElement {
    const button = document.createElement("button")
    button.type = "button"
    button.className = "icon-btn"
    button.id = id
    button.textContent = glyph
    return button
  }

  /** What the controls say, in the reader's language: the picker's label, and what each button does (its tooltip and accessible name). */
  setLabels(labels: { list: string, remove: string, add: string, actions?: Record<string, string> }): void {
    this.labelText.textContent = labels.list
    for (const [button, text] of [[this.removeButton, labels.remove], [this.addButton, labels.add],
      ...[...this.actionButtons].map(([id, action]) => [action, labels.actions?.[id] ?? ""] as const)] as const) {
      button.title = text
      button.setAttribute("aria-label", text)
    }
  }

  /** The kinds that can be added, as the reader's language calls them; the one picked stays picked. */
  setKinds(kinds: ElementListKind[]): void {
    this.kinds = kinds
    const kindSelect = this.kindSelect
    if (!kindSelect) return
    const picked = kindSelect.value
    kindSelect.replaceChildren(...kinds.map(kind => {
      const option = new Option(kind.label, kind.value)
      if (this.options.ids.kind) option.id = this.options.ids.kind(kind.value)
      option.hidden = kind.hidden === true
      return option
    }))
    if (kinds.some(kind => kind.value === picked && !kind.hidden)) kindSelect.value = picked
  }

  /** What a kind is called, or the kind itself where it is not one that is known. */
  kindLabel(value: string): string {
    return this.kinds.find(kind => kind.value === value)?.label ?? value
  }

  /** The kind picked beside the adding button. */
  get pickedKind(): string | undefined {
    return this.kindSelect?.value
  }

  /** Lists these, with `selected` picked. Nothing to pick hides what acts on it (see the class). */
  setItems(items: readonly ElementListItem[], selected?: string): void {
    this.select.replaceChildren(...items.map(item => new Option(item.label, item.id)))
    if (selected !== undefined) this.select.value = selected
    this.setPresent(items.length > 0)
  }

  /** Renames an entry without redrawing the list, which would take the focus from whatever is being typed. */
  rename(id: string, label: string): void {
    const option = [...this.select.options].find(candidate => candidate.value === id)
    if (option) option.textContent = label
  }

  /** The picker shows this one, without saying it was picked by the reader. */
  show(id: string): void {
    this.select.value = id
  }

  /** What acts on the picked element is shown, and enabled, only while there is one. */
  private setPresent(present: boolean): void {
    this.pickerRow.hidden = !present
    this.removeButton.hidden = !present
    this.removeButton.disabled = !present
    this.select.disabled = !present
    for (const button of this.actionButtons.values()) {
      button.hidden = !present
      button.disabled = !present
    }
  }

  /** Whether the picker is the thing a "focus the field" request lands on. */
  focus(): void {
    this.select.focus()
  }
}
