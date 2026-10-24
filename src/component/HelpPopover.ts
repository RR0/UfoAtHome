/**
 * The syntax a field's text takes, opened by the (?) in its corner (see DateInputElement, DurationInputElement): a popover, so that a panel that
 * scrolls, which clips what overflows it, does not cut it off; anchored above its (?), or under it where there is no room above. Shown and hidden
 * by its field, which closes it on Escape or a press elsewhere, and which reads `hidden` for whether it is open: a page without popovers (a test's
 * DOM) still shows and hides it, in place.
 */
export class HelpPopover {
  private static count = 0

  /** Where the popover stands when open, for the selector of its element (`rr0-date-input .edtf-helppop`). */
  static css(selector: string): string {
    return `${selector}:popover-open { position: fixed; inset: auto; margin: 0 0 .35em; border: 0; position-area: top span-right; position-try-fallbacks: flip-block, flip-inline, flip-block flip-inline; }`
  }

  /** Makes `popup` the popover of `button`, closed. */
  static attach(button: HTMLElement, popup: HTMLElement): void {
    const anchor = `--rr0-help-${++HelpPopover.count}`
    button.style.setProperty("anchor-name", anchor)
    popup.style.setProperty("position-anchor", anchor)
    popup.setAttribute("popover", "manual")
    popup.hidden = true
  }

  /** Opens or closes `popup`. */
  static show(popup: HTMLElement, open: boolean): void {
    popup.hidden = !open
    if (typeof popup.showPopover !== "function" || !popup.isConnected) return
    if (open && !popup.matches(":popover-open")) popup.showPopover()
    else if (!open && popup.matches(":popover-open")) popup.hidePopover()
  }
}
