import type { ModelSource } from "../render3d/decor/ModelSource.js"

/** What the window says, in the editor's own language. */
export interface ModelPickerMessages {
  title: string
  close: string
  /** The button that opens the window, beside the model now chosen. */
  choose: string
}

/** What the model behind an option is made from, to be drawn as a picture and shown live: undefined
 * for what has nothing to show, which is then shown by its name alone. */
export type ModelSourceOf = (id: string) => Promise<ModelSource | undefined>

/**
 * A window that shows the models on offer as pictures, to choose one — in place of a drop-down of
 * names, which says nothing of what a model looks like.
 *
 * It is made over an existing `<select>`, which keeps being the field the rest of the editor reads
 * and writes: the options of the select ARE the choices (groups included), and picking a card sets
 * the select and fires its own "change", so everything that already reacted to the drop-down reacts
 * to the window. The select itself is hidden, and a button showing the model now chosen takes its
 * place and opens the window.
 *
 * The pictures are drawn on demand (see ModelThumbnails, loaded only when a window opens), and the
 * window never uses a native dialog: it is a layer inside the component's own shadow tree.
 */
export class ModelPicker {
  private static readonly STYLE = `
.model-picker-button { display: inline-flex; align-items: center; gap: .5em; cursor: pointer; max-width: 100%; }
.model-picker-button img { width: 2em; height: 1.5em; object-fit: contain; }
.model-picker-button span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.model-picker-backdrop { position: fixed; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center; background: rgba(0, 0, 0, .55); }
.model-picker { box-sizing: border-box; width: min(56em, 94vw); max-height: 86vh; display: flex; flex-direction: column; background: #fff; color: #222; border-radius: 6px; box-shadow: 0 4px 24px rgba(0, 0, 0, .5); font-size: .95em; }
.model-picker header { display: flex; align-items: center; justify-content: space-between; padding: .6em 1em; border-bottom: 1px solid #ddd; }
.model-picker .model-picker-close { width: 2em; height: 2em; padding: 0; display: inline-flex; align-items: center; justify-content: center; background: #fff; color: #222; border: none; border-radius: 50%; font-size: 1em; line-height: 1; cursor: pointer; }
.model-picker .model-picker-close:hover, .model-picker .model-picker-close:focus-visible { background: #ddd; outline: none; }
.model-picker h2 { margin: 0; font-size: 1.1em; }
.model-picker .model-picker-body { overflow-y: auto; padding: .5em 1em 1em; }
.model-picker h3 { margin: .8em 0 .4em; font-size: .95em; color: #555; }
.model-picker .model-picker-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(10em, 1fr)); gap: .6em; }
.model-picker .model-card { display: flex; flex-direction: column; align-items: center; gap: .25em; padding: .5em; text-align: center; background: #f6f6f8; color: inherit; border: 2px solid transparent; border-radius: 4px; cursor: pointer; font: inherit; }
.model-picker .model-card:hover, .model-picker .model-card:focus-visible { background: #eef; border-color: #99c; outline: none; }
.model-picker .model-card[aria-pressed="true"] { border-color: #46c; }
.model-picker .model-thumb { position: relative; overflow: hidden; width: 100%; aspect-ratio: 4 / 3; display: flex; align-items: center; justify-content: center; background: #e4e4ea; border-radius: 3px; color: #889; }
.model-picker .model-thumb:has(.model-live) > img { visibility: hidden; }
.model-picker .model-thumb img { width: 100%; height: 100%; object-fit: contain; }
.model-picker .model-name { font-weight: 600; }
.model-picker .model-credit { font-size: .8em; color: #666; }
`

  constructor(private readonly root: ShadowRoot | HTMLElement, private readonly messages: () => ModelPickerMessages) {}

  /** The still picture of a source, drawn on demand: the renderer is loaded when first needed. */
  private static async pictureOf(source: ModelSource | undefined): Promise<string | undefined> {
    if (!source) return undefined
    const { ModelThumbnails } = await import("../render3d/decor/ModelThumbnails.js")
    return ModelThumbnails.of(source)
  }

  /** Replaces the drop-down by a button that opens the window over its options. */
  enhance(select: HTMLSelectElement, source: ModelSourceOf): void {
    this.ensureStyle()
    const button = document.createElement("button")
    button.type = "button"
    button.className = "model-picker-button"
    select.after(button)
    select.hidden = true
    let showing = 0
    const show = (): void => {
      // Called again for every change of the options, and each call asks for a picture: only the
      // last one to ask is drawn, so the button never collects the pictures of the earlier calls.
      const asked = ++showing
      const chosen = select.selectedOptions[0]
      button.replaceChildren()
      const name = document.createElement("span")
      name.textContent = `${chosen?.textContent ?? ""} \u2026`
      button.title = this.messages().choose
      button.append(name)
      const id = select.value
      void source(id).then(found => ModelPicker.pictureOf(found)).then(src => {
        if (!src || asked !== showing) return
        const image = new Image()
        image.src = src
        image.alt = ""
        button.prepend(image)
      })
    }
    select.addEventListener("change", show)
    // The options are replaced whenever the catalogue answers or the selection moves on, and the
    // value is set from code, which fires no "change": the button follows the options instead.
    new MutationObserver(show).observe(select, { childList: true, subtree: true })
    button.addEventListener("click", () => void this.open(select, source))
    show()
  }

  private ensureStyle(): void {
    const host = this.root instanceof ShadowRoot ? this.root : this.root.getRootNode()
    const container = host instanceof ShadowRoot ? host : document.head
    if (container.querySelector("style[data-model-picker]")) return
    const style = document.createElement("style")
    style.dataset.modelPicker = ""
    style.textContent = ModelPicker.STYLE
    container.append(style)
  }

  private open(select: HTMLSelectElement, source: ModelSourceOf): void {
    const messages = this.messages()
    const backdrop = document.createElement("div")
    backdrop.className = "model-picker-backdrop"
    const dialog = document.createElement("div")
    dialog.className = "model-picker"
    dialog.setAttribute("role", "dialog")
    dialog.setAttribute("aria-modal", "true")
    const heading = document.createElement("h2")
    heading.textContent = messages.title
    const close = document.createElement("button")
    close.type = "button"
    close.className = "model-picker-close"
    close.setAttribute("aria-label", messages.close)
    close.title = messages.close
    close.textContent = "\u2715"
    const header = document.createElement("header")
    header.append(heading, close)
    const body = document.createElement("div")
    body.className = "model-picker-body"
    dialog.append(header, body)
    backdrop.append(dialog)
    const finish = (): void => {
      backdrop.remove()
      document.removeEventListener("keydown", onKey, true)
      void import("../render3d/decor/ModelViewer.js").then(({ ModelViewer }) => ModelViewer.end())
    }
    const onKey = (event: KeyboardEvent): void => {
      if (event.key !== "Escape") return
      event.stopPropagation()
      finish()
    }
    const pick = (value: string): void => {
      finish()
      if (value === select.value) return
      select.value = value
      select.dispatchEvent(new Event("change", { bubbles: true }))
    }
    let grid: HTMLElement | undefined
    const watchers = new Map<HTMLElement, () => void>()
    const card = (option: HTMLOptionElement): HTMLElement => {
      const element = document.createElement("button")
      element.type = "button"
      element.className = "model-card"
      element.setAttribute("aria-pressed", String(option.value === select.value))
      const thumb = document.createElement("div")
      thumb.className = "model-thumb"
      const name = document.createElement("span")
      name.className = "model-name"
      name.textContent = option.textContent
      element.append(thumb, name)
      if (option.title) {
        const credit = document.createElement("span")
        credit.className = "model-credit"
        credit.textContent = option.title
        element.append(credit)
      }
      void source(option.value).then(found => ModelPicker.pictureOf(found)).then(src => {
        if (!src) return
        const image = new Image()
        image.src = src
        image.alt = ""
        thumb.append(image)
      })
      // The model under the pointer (or the keyboard) turns by itself and answers a drag, so it can
      // be looked at all round before it is chosen. One at a time: there is one live renderer.
      let viewer: { stop(): void, consumeDrag(): boolean, readonly active: boolean } | undefined
      let watching = false
      const watch = (): void => {
        // Another card's view replaces this one's: a view that has been stopped is started again.
        if (watching && !(viewer && !viewer.active)) return
        watching = true
        void Promise.all([source(option.value), import("../render3d/decor/ModelViewer.js")]).then(([found, { ModelViewer }]) => {
          if (!found || !watching) return
          viewer = ModelViewer.show(thumb, found)
        }).catch(() => undefined)
      }
      const unwatch = (): void => {
        watching = false
        viewer?.stop()
        viewer = undefined
      }
      watchers.set(element, watch)
      element.addEventListener("pointerenter", watch)
      element.addEventListener("focus", watch)
      element.addEventListener("pointerleave", () => {
        if (document.activeElement !== element) unwatch()
      })
      element.addEventListener("blur", unwatch)
      element.addEventListener("click", event => {
        // A drag on the model is a look at it, not a choice.
        if (viewer?.consumeDrag()) {
          event.preventDefault()
          return
        }
        pick(option.value)
      })
      return element
    }
    const newGrid = (): HTMLElement => {
      grid = document.createElement("div")
      grid.className = "model-picker-grid"
      body.append(grid)
      return grid
    }
    for (const child of Array.from(select.children)) {
      if (child instanceof HTMLOptGroupElement) {
        const label = document.createElement("h3")
        label.textContent = child.label
        body.append(label)
        const group = newGrid()
        for (const option of Array.from(child.children) as HTMLOptionElement[]) group.append(card(option))
        grid = undefined
      } else if (child instanceof HTMLOptionElement) {
        ;(grid ?? newGrid()).append(card(child))
      }
    }
    close.addEventListener("click", finish)
    backdrop.addEventListener("click", event => {
      if (event.target === backdrop) finish()
    })
    document.addEventListener("keydown", onKey, true)
    // Inside the component's own tree, so its styles and its language reach the window.
    this.root.append(backdrop)
    const chosen = dialog.querySelector<HTMLElement>('.model-card[aria-pressed="true"]')
    ;(chosen ?? close).focus()
    // The model now chosen is already turning when the window opens, whether or not the page has the focus.
    if (chosen) watchers.get(chosen)?.()
  }
}
