/**
 * A grip between two columns side by side, the first one's width dragged with it (dicté : « il faut pouvoir resize la colonne ») — the
 * history of a case beside what is open of it, in its reader and in its editor alike.
 *
 * The width is a custom property of `host` (`--rr0-list-width`), for the grid's columns to use in place of their own default; none until
 * the grip is used, or after a double click on it. Remembered under `key` for the next time, as the readings' grouping is.
 */
export class ColumnResize {
  /** Where the width of a case's history is remembered: one for every case, read or edited, as the grouping of its readings is. */
  static readonly CASE_HISTORY_KEY = "rr0-case-list-width"

  /** The property the first column's width is given in. */
  static readonly PROPERTY = "--rr0-list-width"

  /**
   * The grip, laid over the gap on the first column's right edge, as tall as the row it is in; a line shows when the pointer finds it. The
   * grid places it (its column and rows): only the grid knows which.
   */
  static readonly CSS = `
.column-resize { display: none; position: relative; justify-self: end; align-self: stretch; width: 12px; z-index: 3; cursor: col-resize;
  touch-action: none; }
.column-resize::after { content: ""; position: absolute; top: 0; bottom: 0; left: 50%; width: 3px; margin-left: -1.5px; border-radius: 2px;
  background: var(--line-strong, rgba(127, 127, 127, .5)); opacity: 0; transition: opacity .15s ease; }
.column-resize:is(:hover, :focus-visible, .dragging)::after { opacity: 1; }
.column-resize:focus-visible { outline: none; }
`

  /** Narrower, the history's cards no longer say what they are. */
  private static readonly MIN_PX = 200
  /** What is open beside it keeps that much at least. */
  private static readonly OTHER_MIN_PX = 320

  /**
   * @param grip The grip.
   * @param host Where the width is set, and what holds both columns: its width bounds the first one's.
   * @param column The first column, whose width is dragged from.
   * @param key Where the width is remembered.
   */
  constructor(private readonly grip: HTMLElement, private readonly host: HTMLElement, private readonly column: () => HTMLElement,
              private readonly key: string) {
    try {
      const kept = localStorage.getItem(key)
      if (kept && /^\d+px$/.test(kept)) host.style.setProperty(ColumnResize.PROPERTY, kept)
    } catch { /* No storage here (a private window, a preview): the width lasts as long as the page. */ }
    grip.setAttribute("role", "separator")
    grip.setAttribute("aria-orientation", "vertical")
    grip.tabIndex = 0
    grip.addEventListener("pointerdown", event => {
      event.preventDefault()
      const from = event.clientX
      const start = this.column().getBoundingClientRect().width
      grip.setPointerCapture?.(event.pointerId)
      grip.classList.add("dragging")
      const move = (moved: PointerEvent) => this.set(start + moved.clientX - from)
      const end = () => {
        grip.classList.remove("dragging")
        grip.removeEventListener("pointermove", move)
        grip.removeEventListener("pointerup", end)
        grip.removeEventListener("pointercancel", end)
      }
      grip.addEventListener("pointermove", move)
      grip.addEventListener("pointerup", end)
      grip.addEventListener("pointercancel", end)
    })
    grip.addEventListener("keydown", event => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return
      event.preventDefault()
      this.set(this.column().getBoundingClientRect().width + (event.key === "ArrowLeft" ? -20 : 20))
    })
    grip.addEventListener("dblclick", () => this.set(undefined))
  }

  /** Says what the grip does, in the reader's language. */
  label(text: string): void {
    this.grip.title = text
    this.grip.setAttribute("aria-label", text)
  }

  /** Gives the first column `widthPx`, within bounds, or its own width back. */
  set(widthPx: number | undefined): void {
    const host = this.host
    if (widthPx === undefined) host.style.removeProperty(ColumnResize.PROPERTY)
    else {
      const max = Math.max(ColumnResize.MIN_PX, host.getBoundingClientRect().width - ColumnResize.OTHER_MIN_PX)
      host.style.setProperty(ColumnResize.PROPERTY, `${Math.round(Math.min(max, Math.max(ColumnResize.MIN_PX, widthPx)))}px`)
    }
    try {
      if (widthPx === undefined) localStorage.removeItem(this.key)
      else localStorage.setItem(this.key, host.style.getPropertyValue(ColumnResize.PROPERTY))
    } catch { /* As above. */ }
  }
}
