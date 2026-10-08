/**
 * The whole description, opened from its chip: a panel taking the room of the strip's chips, with a
 * cross at its top right that closes it and shows the chips again. Shared by the player and the
 * editor, which draw their chips differently but open the description the same way.
 */
export class SummaryDescription {
  /**
   * Shows `text` in `strip` in place of its chips, or — with no text — removes the panel and shows the chips again.
   * Called after every redraw of the strip, which drops the panel along with the chips.
   */
  static sync(strip: HTMLElement, text: string | undefined, title: string, closeLabel: string, onClose: () => void): void {
    strip.querySelector(".param-description")?.remove()
    if (text === undefined) {
      strip.removeAttribute("data-describing")
      return
    }
    const panel = document.createElement("div")
    panel.className = "param-description"
    const head = document.createElement("div")
    head.className = "param-description-head"
    const name = document.createElement("span")
    name.className = "param-nest-label"
    name.textContent = title
    const close = document.createElement("button")
    close.type = "button"
    close.className = "param-description-close"
    close.textContent = "×"
    close.title = closeLabel
    close.setAttribute("aria-label", closeLabel)
    close.addEventListener("click", onClose)
    head.append(name, close)
    const body = document.createElement("p")
    body.className = "param-description-text"
    body.textContent = text
    panel.append(head, body)
    panel.addEventListener("keydown", event => {
      if (event.key === "Escape") onClose()
    })
    strip.setAttribute("data-describing", "")
    strip.append(panel)
    close.focus({ preventScroll: true })
  }

  /** The styles both templates carry. */
  static readonly CSS = `
.param-summary[data-describing] > :not(.param-description) {
  display: none;
}
.param-description {
  flex: 1 1 100%;
  box-sizing: border-box;
  border: 1px solid color-mix(in srgb, currentColor 22%, transparent);
  border-radius: 12px;
  padding: 0.4em 0.7em 0.6em;
}
.param-description-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.param-description-close {
  font: inherit;
  font-size: 1.3em;
  line-height: 1;
  color: inherit;
  background: transparent;
  border: 0;
  cursor: pointer;
  padding: 0 0.2em;
  opacity: 0.7;
}
.param-description-close:hover, .param-description-close:focus-visible {
  opacity: 1;
}
.param-description-text {
  margin: 0.4em 0 0;
  /* Scrolls like the info panel does, rather than pushing the page down by a long account. */
  max-height: min(50vh, 20em);
  overflow-y: auto;
  white-space: pre-wrap;
  font-size: 1.1em;
}
.param-chip.describable, .param-label.describable {
  cursor: pointer;
}
`
}
