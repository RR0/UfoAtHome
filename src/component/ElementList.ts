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
  /** Where the row goes: the picker, what acts on the picked element, the removing, then the adding, in that order on one line. */
  header: HTMLElement
  /** What holds the fields of the picked element, under the row: framed, and hidden while none is picked. */
  body?: HTMLElement
  /** The ids of the controls, which others find them by (a summary chip focuses the picker; tests read them). */
  ids: { list: string, remove: string, add: string, kinds?: string, kind?: (value: string) => string }
  /**
   * The picker offers "none" as a choice of its own and stays on show without elements (the individual cloud of a layer: a layer
   * has none until one is added). What acts on the picked element is then disabled, not hidden, while none is picked.
   */
  optional?: boolean
  actions?: ElementListAction[]
  /**
   * Buttons for the previous and next element, and the keys that do the same wherever in `scope` the focus is (Alt and the up and down
   * arrows, which a field being edited does not use): going through the elements one after the other is the common thing, and choosing
   * each one from the picker is a click and a search every time. `onStep` is the editor's, since which is "next" is not always the next
   * of the list (the keyframe after the playhead, where none is picked).
   */
  navigation?: { scope: HTMLElement, onStep: (direction: -1 | 1) => void }
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
 * Every list of every tab is laid out the same, so that a reader who has used one knows them all: no label repeating the tab's name,
 * then on one line (wrapping only where there is no room) the picker, what points at the picked element (🎯), its removal (🗑) and
 * last the adding (+, after the kind to add when there are several); under it, one frame holding all the fields of the picked element.
 * With no element there is nothing to pick, point at or remove: the row says there is none, before the adding, and the frame goes.
 * The lists the editor's template writes by hand take the same classes (see CSS) and the same presence (see showPresence).
 */
export class ElementList {

  /** The layout of every list, put in each shadow root that shows one: the row, the frame under it, and what says there is none. */
  static readonly CSS = `
.element-list-row { display: flex; align-items: center; flex-wrap: wrap; gap: .4em; flex: 1 1 100%; min-width: 0; }
.element-list-picker { flex: 1 1 10em; min-width: 0; display: flex; }
.element-list-picker select { width: 100%; min-width: 0; max-width: 100%; box-sizing: border-box; }
.element-list-empty { opacity: .75; font-style: italic; }
.element-list-add-kind { margin-left: .4em; }
.element-list-body { flex: 1 1 100%; min-width: 0; box-sizing: border-box; border: 1px solid color-mix(in srgb, currentColor 30%, transparent);
  border-radius: 6px; padding: .5em .6em; margin: .1em 0 .3em; display: flex; flex-wrap: wrap; align-items: center; gap: .5em; }
.element-list-row [hidden], .element-list-body[hidden] { display: none !important; }
`

  /**
   * What a list says while it has, or has not, an element: the picker, what acts on the picked one and the frame of its fields are
   * there only while there is one; the row then says there is none, before the adding. `row` holds a list laid out as CSS says:
   * whatever in it is not the adding (`.element-list-add`, `.element-list-add-kind`) nor the saying (`.element-list-empty`) acts on the
   * picked element. A list that is `optional` keeps its picker, and disables what acts on none instead of hiding it. What acts on the
   * picked element is disabled while there is none, and left to the list to enable once there is one.
   */
  static showPresence(row: HTMLElement, body: HTMLElement | undefined, present: boolean, optional = false): void {
    for (const child of row.children as HTMLCollectionOf<HTMLElement>) {
      if (child.matches(".element-list-add, .element-list-add-kind, .add-reason")) continue
      if (child.matches(".element-list-empty")) { child.hidden = present || optional; continue }
      if (child.matches(".element-list-picker")) { child.hidden = !present && !optional; continue }
      child.hidden = !present && !optional
      // Disabled while there is nothing to act on; whether it can act on the one there is stays the list's own to say.
      if (child instanceof HTMLButtonElement && !present) child.disabled = true
    }
    if (body) body.hidden = !present
  }

  private readonly select: HTMLSelectElement
  private readonly row: HTMLDivElement
  private readonly pickerRow: HTMLLabelElement
  private readonly emptyText: HTMLSpanElement
  private readonly removeButton: HTMLButtonElement
  private readonly addButton: HTMLButtonElement
  /** Why the add button cannot be pressed, beside it — see setAddState. */
  private addReason?: HTMLElement
  private readonly kindSelect?: HTMLSelectElement
  private readonly previousButton?: HTMLButtonElement
  private readonly nextButton?: HTMLButtonElement
  private readonly actionButtons = new Map<string, HTMLButtonElement>()
  private kinds: ElementListKind[] = []
  private items: readonly ElementListItem[] = []
  private noneLabel = "—"
  private addLabel = ""
  private removeEnabled = true

  constructor(private readonly options: ElementListOptions) {
    this.row = document.createElement("div")
    this.row.className = "element-list-row"
    this.pickerRow = document.createElement("label")
    this.pickerRow.className = "element-list-picker"
    this.select = document.createElement("select")
    this.select.id = options.ids.list
    this.select.addEventListener("change", () => options.onSelect(this.select.value))
    this.pickerRow.append(this.select)
    options.header.append(this.row)
    this.row.append(this.pickerRow)
    const navigation = options.navigation
    if (navigation) {
      this.previousButton = this.iconButton(`${options.ids.list}-previous`, "▲")
      this.nextButton = this.iconButton(`${options.ids.list}-next`, "▼")
      this.previousButton.addEventListener("click", () => navigation.onStep(-1))
      this.nextButton.addEventListener("click", () => navigation.onStep(1))
      this.row.append(this.previousButton, this.nextButton)
      navigation.scope.addEventListener("keydown", event => {
        if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || (event.key !== "ArrowUp" && event.key !== "ArrowDown")) return
        // Only while this list is on show: the scope may hold the part of another.
        if (this.pickerRow.closest("[hidden]") || !this.pickerRow.isConnected) return
        event.preventDefault()
        event.stopPropagation()
        const button = event.key === "ArrowUp" ? this.previousButton : this.nextButton
        if (button && !button.disabled) navigation.onStep(event.key === "ArrowUp" ? -1 : 1)
      })
    }
    for (const action of options.actions ?? []) {
      const button = this.iconButton(action.id, action.glyph)
      button.addEventListener("click", () => action.onClick())
      this.actionButtons.set(action.id, button)
      this.row.append(button)
    }
    this.removeButton = this.iconButton(options.ids.remove, "🗑")
    this.removeButton.addEventListener("click", () => options.onRemove())
    this.emptyText = document.createElement("span")
    this.emptyText.className = "element-list-empty"
    this.addButton = this.iconButton(options.ids.add, "+")
    this.addButton.classList.add("element-list-add")
    this.addButton.addEventListener("click", () => options.onAdd(this.kindSelect?.value))
    this.row.append(this.removeButton, this.emptyText)
    if (options.ids.kinds) {
      // What kind to add stands just before the "+" that adds it, set apart from the picker it could be taken for.
      this.kindSelect = document.createElement("select")
      this.kindSelect.id = options.ids.kinds
      this.kindSelect.className = "element-list-add-kind"
      this.row.append(this.kindSelect)
    }
    this.row.append(this.addButton)
    if (options.body) options.body.classList.add("element-list-body")
  }

  private iconButton(id: string, glyph: string): HTMLButtonElement {
    const button = document.createElement("button")
    button.type = "button"
    button.className = "icon-btn"
    button.id = id
    button.textContent = glyph
    return button
  }

  /**
   * What the controls say, in the reader's language: what the picker lists (its accessible name, never shown: the tab says it), what
   * each button does (its tooltip and accessible name), and what the row says while there is none (`empty`).
   */
  setLabels(labels: { list: string, remove: string, add: string, empty?: string, actions?: Record<string, string>, none?: string, previous?: string, next?: string }): void {
    if (this.previousButton && this.nextButton) {
      for (const [button, text, keys] of [[this.previousButton, labels.previous ?? "", "Alt+↑"], [this.nextButton, labels.next ?? "", "Alt+↓"]] as const) {
        const title = text === "" ? keys : `${text} (${keys})`
        button.title = title
        button.setAttribute("aria-label", text || title)
        button.setAttribute("aria-keyshortcuts", keys.replace("↑", "ArrowUp").replace("↓", "ArrowDown"))
      }
    }
    this.select.setAttribute("aria-label", labels.list)
    this.emptyText.textContent = labels.empty ?? ""
    this.noneLabel = labels.none ?? this.noneLabel
    this.addLabel = labels.add
    if (this.kindSelect) this.kindSelect.setAttribute("aria-label", labels.add)
    if (this.options.optional) this.listed(this.items, this.select.value)
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
    this.items = items
    this.listed(items, selected)
  }

  private listed(items: readonly ElementListItem[], selected?: string): void {
    this.select.replaceChildren(...(this.options.optional ? [new Option(this.noneLabel, "")] : []), ...items.map(item => new Option(item.label, item.id)))
    if (selected !== undefined) this.select.value = selected
    // A pick the list no longer holds falls back to the first, or to none.
    if (this.select.selectedIndex < 0) this.select.selectedIndex = 0
    this.setPresent(this.options.optional ? this.select.value !== "" : items.length > 0)
  }

  /** Whether there is an element before and after the one on show to go to; the buttons say so. */
  setStepState(canPrevious: boolean, canNext: boolean): void {
    if (this.previousButton) this.previousButton.disabled = !canPrevious
    if (this.nextButton) this.nextButton.disabled = !canNext
  }

  /** Whether the picked element can be removed (a path keeps two places): the button says so. */
  setRemoveEnabled(enabled: boolean): void {
    this.removeEnabled = enabled
    this.removeButton.disabled = !enabled || this.select.value === "" && this.options.optional === true
  }

  /** The id of the element picked, "" for none. */
  get value(): string {
    return this.select.value
  }

  /** Whether adding is possible, and what the button says then (a hint on where the new element will start); without a text, its usual one. */
  setAddState(enabled: boolean, title?: string): void {
    this.addButton.disabled = !enabled
    const text = title ?? this.addLabel
    this.addButton.title = text
    this.addButton.setAttribute("aria-label", text)
    // A button greyed out with the reason only in its tooltip tells nobody why: a text given for a button that
    // cannot be pressed is also said beside it, in plain sight.
    if (!this.addReason) {
      this.addReason = this.addButton.ownerDocument.createElement("span")
      this.addReason.className = "add-reason"
      this.addReason.style.cssText = "font-size: .85em; opacity: .8; align-self: center;"
      this.row.append(this.addReason)
    }
    this.addReason.textContent = !enabled && title ? title : ""
    this.addReason.hidden = enabled || !title
  }

  /** Renames an entry without redrawing the list, which would take the focus from whatever is being typed. */
  rename(id: string, label: string): void {
    const option = [...this.select.options].find(candidate => candidate.value === id)
    if (option) option.textContent = label
  }

  /** The picker shows this one, without saying it was picked by the reader. */
  show(id: string): void {
    this.select.value = id
    // What acts on the picked element follows the pick, for a list where none can be picked.
    if (this.options.optional) this.setPresent(this.select.value !== "")
  }

  /** What acts on the picked element is shown, and enabled, only while there is one (see showPresence). */
  private setPresent(present: boolean): void {
    const optional = this.options.optional === true
    ElementList.showPresence(this.row, this.options.body, present, optional)
    this.select.disabled = !present && !optional
    if (!present) return
    this.removeButton.disabled = !this.removeEnabled
    for (const button of this.actionButtons.values()) button.disabled = false
  }

  /** Whether the picker is the thing a "focus the field" request lands on. */
  focus(): void {
    this.select.focus()
  }
}
