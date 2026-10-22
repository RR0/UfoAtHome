import { Icons } from "./Icons.js"

/**
 * Every window of an editor can be closed the three ways a reader tries first: its ✕, Escape, and a click beside it (see the design
 * handoff, §1.5). A popover and a dialog already close on Escape; this gives each its ✕, and a modal dialog its click beside it (on its
 * backdrop, which is the dialog itself as far as the event can tell).
 */
export class WindowClose {
  static readonly CSS = `
.window-close {
  position: absolute; top: 8px; right: 8px; z-index: 1;
  display: inline-flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; min-width: 32px; min-height: 32px; padding: 0;
  border: 0; border-radius: 8px; background: none; color: inherit; opacity: .7; cursor: pointer;
}
.window-close:hover, .window-close:focus-visible { opacity: 1; background: color-mix(in srgb, currentColor 12%, transparent); }
:is(dialog, [popover], .context-menu):has(> .window-close) { position: relative; padding-right: 44px; }
.context-menu:has(> .window-close) { position: fixed; }
`

  /** The ✕ of `window`, put first in it, labelled `label`, doing `close` when pressed. */
  static button(window: HTMLElement, label: string, close: () => void): HTMLButtonElement {
    const existing = window.querySelector<HTMLButtonElement>(":scope > .window-close")
    if (existing) {
      WindowClose.label(existing, label)
      return existing
    }
    const button = document.createElement("button")
    button.type = "button"
    button.className = "window-close"
    button.innerHTML = Icons.CLOSE
    WindowClose.label(button, label)
    button.addEventListener("click", event => {
      event.stopPropagation()
      close()
    })
    window.prepend(button)
    return button
  }

  /** A popover's ✕: it hides the popover, which keeps its own Escape and click beside it. */
  static popover(panel: HTMLElement, label: string): HTMLButtonElement {
    return WindowClose.button(panel, label, () => {
      if (typeof panel.hidePopover === "function" && panel.matches(":popover-open")) panel.hidePopover()
    })
  }

  /**
   * A modal dialog's ✕ and its click beside it, both answering as `close` does — which should be the answer Escape gives too, the one
   * that changes nothing.
   */
  static dialog(dialog: HTMLDialogElement, label: string, close: () => void): HTMLButtonElement {
    if (!dialog.dataset.closesBeside) {
      dialog.dataset.closesBeside = "true"
      // A press on the backdrop reaches the dialog itself; one inside it reaches what is inside. A press that started inside (selecting
      // text) and ended outside is no click beside it either.
      let downOnBackdrop = false
      dialog.addEventListener("pointerdown", event => (downOnBackdrop = event.target === dialog))
      dialog.addEventListener("click", event => {
        if (event.target === dialog && downOnBackdrop && WindowClose.outside(dialog, event)) close()
      })
    }
    return WindowClose.button(dialog, label, close)
  }

  /** Whether a click on the dialog element landed outside its box: on the backdrop. */
  private static outside(dialog: HTMLElement, event: MouseEvent): boolean {
    const box = dialog.getBoundingClientRect()
    return event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom
  }

  private static label(button: HTMLButtonElement, label: string): void {
    button.title = label
    button.setAttribute("aria-label", label)
  }
}
