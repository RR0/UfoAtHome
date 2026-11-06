import { HelpPopover } from "./HelpPopover.js"

/**
 * A (?) beside a label, which says what the label leaves out to stay short (what its parts are, what it is a share of): on hover as a
 * tooltip, and pressed (a touch screen has no hover) in a popover. The text is the element's `text`.
 *
 * A label says what a field is in a few words; the details that once stood in its parentheses go here, so that a long label does not
 * push its field aside.
 */
export class HintElement extends HTMLElement {
  static readonly TAG = "rr0-hint"

  static readonly CSS = `
rr0-hint { display: inline-block; position: relative; margin-left: .3em; vertical-align: .05em; }
rr0-hint .hint-button { box-sizing: border-box; width: 1.35em; height: 1.35em; min-width: 0; min-height: 0; padding: 0; border: 1px solid currentColor;
  border-radius: 50%; background: none; color: var(--ink-dim, inherit); font: 600 .72em/1 var(--sans, sans-serif); cursor: help; opacity: .75; }
rr0-hint .hint-button:is(:hover, :focus-visible) { opacity: 1; }
rr0-hint .hint-pop { max-width: 22em; padding: .35em .6em; border-radius: 4px; background: rgba(0, 0, 0, .88); color: #fff; font: 400 .8rem/1.35 var(--sans, sans-serif); white-space: normal; }
${HelpPopover.css("rr0-hint .hint-pop")}
`

  private button?: HTMLButtonElement
  private popup?: HTMLElement
  private said = ""

  /** A (?) saying `text`. */
  static of(text: string): HintElement {
    HintElement.register()
    const hint = document.createElement(HintElement.TAG) as HintElement
    hint.text = text
    return hint
  }

  /** Says `text` in `target`, and `hint`, when there is one, in a (?) after it: a label, worded again in another language. */
  static say(target: HTMLElement, text: string, hint?: string): void {
    target.textContent = text
    if (hint) target.append(HintElement.of(hint))
  }

  static register(): void {
    if (!customElements.get(HintElement.TAG)) customElements.define(HintElement.TAG, HintElement)
  }

  get text(): string {
    return this.said
  }

  set text(text: string) {
    this.said = text
    this.build()
    this.button!.title = text
    this.button!.setAttribute("aria-label", text)
    this.popup!.textContent = text
  }

  connectedCallback(): void {
    this.build()
  }

  private build(): void {
    if (this.button) return
    const button = document.createElement("button")
    button.type = "button"
    button.className = "hint-button"
    button.textContent = "?"
    const popup = document.createElement("span")
    popup.className = "hint-pop"
    popup.setAttribute("role", "tooltip")
    HelpPopover.attach(button, popup)
    button.addEventListener("click", event => {
      // In a label, a press would go to what it labels.
      event.preventDefault()
      event.stopPropagation()
      HelpPopover.show(popup, popup.hidden)
    })
    button.addEventListener("blur", () => HelpPopover.show(popup, false))
    this.append(button, popup)
    this.button = button
    this.popup = popup
  }
}
