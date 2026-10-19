/**
 * How a component's messages read, in every component that has some: what it says to inform (a lookup's result, the source of what it found, how
 * things stand), what it warns of, and what went wrong. Three kinds, and one size for all three, smaller than the fields and their labels: a
 * paragraph of information at the size and the colour of the form read as part of the form, and a warning in bold at a larger size stood out
 * more than an error did.
 *
 * - `message-info`: muted, the text colour at about three fifths;
 * - `message-warning`: orange;
 * - `message-error`: red.
 *
 * The colours are drawn from `CanvasText`, as the panels' surfaces are (see the editor's group panels): a message is read against the panel it
 * is in, whatever the page around it says. Mixed with it, the orange and the red come out darker on a light panel and lighter on a dark one.
 *
 * Each shadow root puts `MessageStyle.CSS` in its style, as it does InputFont's: a rule of a page does not cross into it.
 */
export class MessageStyle {
  static readonly INFO = "message-info"
  static readonly WARNING = "message-warning"
  static readonly ERROR = "message-error"

  /** The three rules for the classes alone. */
  static readonly CSS = MessageStyle.rules()

  /**
   * The three rules, for the classes and for what a component already calls its messages (`#scenery-status`, `.place-status`…): those keep
   * their names and are shown as the kind they are, without each saying a size and a colour of its own again.
   */
  static rules(info: readonly string[] = [], warning: readonly string[] = [], error: readonly string[] = []): string {
    const all = (kind: string, more: readonly string[]) => [`.${kind}`, ...more].join(", ")
    return `
/* A component's messages: information muted, warnings orange, errors red, all three at one smaller size (see MessageStyle). */
:is(${all(MessageStyle.INFO, info)}, ${all(MessageStyle.WARNING, warning)}, ${all(MessageStyle.ERROR, error)}) { font-size: var(--rr0-message-font-size, 0.85em); font-weight: normal; opacity: 1; }
:is(${all(MessageStyle.INFO, info)}) { color: color-mix(in srgb, CanvasText 62%, transparent); }
:is(${all(MessageStyle.WARNING, warning)}) { color: color-mix(in srgb, #e48a00 72%, CanvasText); }
:is(${all(MessageStyle.ERROR, error)}) { color: color-mix(in srgb, #e5322d 72%, CanvasText); }
`
  }

  /** Shows `text` on `element` as the kind of message it is, or nothing; the element is hidden when there is nothing to say. */
  static show(element: HTMLElement, text: string | undefined, kind: "info" | "warning" | "error" = "info"): void {
    element.textContent = text ?? ""
    element.hidden = !text
    element.classList.toggle(MessageStyle.INFO, kind === "info")
    element.classList.toggle(MessageStyle.WARNING, kind === "warning")
    element.classList.toggle(MessageStyle.ERROR, kind === "error")
  }
}
