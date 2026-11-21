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
/* The button that folds the column away and back, at the top of the grip, on its line: in the gap between the columns, as wide as the
   gap (18px), so that it stands over neither of them (wider, it covered the kind of the event open). A grid with another gap moves it. */
.column-fold { display: none; position: sticky; top: 2px; z-index: 4; align-self: start; justify-self: end; box-sizing: border-box; width: 18px; height: 18px;
  min-width: 0; min-height: 0; margin: 0 var(--rr0-column-fold-margin, -18px) 0 0; padding: 0; border: 1px solid var(--line-strong, rgba(127, 127, 127, .5));
  border-radius: 50%; background: var(--ground-raised, Canvas); color: var(--ink-dim, inherit); font: 600 13px/1 var(--sans, inherit); cursor: pointer; }
.column-fold::before { content: "‹"; display: block; margin-top: -1px; }
[data-folded] > .column-fold::before { content: "›"; }
.column-fold:hover { color: var(--ink, CanvasText); }
.column-fold:focus-visible { outline: 2px solid var(--sky, Highlight); outline-offset: 2px; }
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
   * @param property The property the width is given in: another than the case's history, for a grid held inside it (a custom property is
   * inherited through every element and shadow root under the one it is set on).
   * @param minPx Narrower than that, the column says nothing any more.
   */
  constructor(private readonly grip: HTMLElement, private readonly host: HTMLElement, private readonly column: () => HTMLElement,
              private readonly key: string, private readonly property = ColumnResize.PROPERTY, private readonly minPx = ColumnResize.MIN_PX) {
    try {
      const kept = localStorage.getItem(key)
      if (kept && /^\d+px$/.test(kept)) host.style.setProperty(property, kept)
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

  private fold?: { button: HTMLButtonElement, fold: string, unfold: string }

  /**
   * Lets `button` fold the column away, to the button alone, and back (dicté 2026-11-21 : « en plus de resize il faut pouvoir
   * replier/déplier la colonne de gauche »): `data-folded` on the host, for its grid to lay out; remembered beside the width.
   */
  foldWith(button: HTMLButtonElement): void {
    this.fold = { button, fold: "", unfold: "" }
    let folded = false
    try { folded = localStorage.getItem(`${this.key}-folded`) === "true" } catch { /* As above. */ }
    this.setFolded(folded)
    button.addEventListener("click", () => this.setFolded(!this.folded))
  }

  /** Words the fold button: what it does folded and unfolded. */
  foldLabels(fold: string, unfold: string): void {
    if (!this.fold) return
    this.fold.fold = fold
    this.fold.unfold = unfold
    this.setFolded(this.folded)
  }

  /** Whether the column is folded away. */
  get folded(): boolean {
    return this.host.hasAttribute("data-folded")
  }

  setFolded(folded: boolean): void {
    this.host.toggleAttribute("data-folded", folded)
    const fold = this.fold
    if (fold) {
      const text = folded ? fold.unfold : fold.fold
      fold.button.title = text
      fold.button.setAttribute("aria-label", text)
      fold.button.setAttribute("aria-expanded", String(!folded))
    }
    try {
      if (folded) localStorage.setItem(`${this.key}-folded`, "true")
      else localStorage.removeItem(`${this.key}-folded`)
    } catch { /* As above. */ }
  }

  /** Gives the first column `widthPx`, within bounds, or its own width back. */
  set(widthPx: number | undefined): void {
    const host = this.host
    if (widthPx === undefined) host.style.removeProperty(this.property)
    else {
      const max = Math.max(this.minPx, host.getBoundingClientRect().width - ColumnResize.OTHER_MIN_PX)
      host.style.setProperty(this.property, `${Math.round(Math.min(max, Math.max(this.minPx, widthPx)))}px`)
    }
    try {
      if (widthPx === undefined) localStorage.removeItem(this.key)
      else localStorage.setItem(this.key, host.style.getPropertyValue(this.property))
    } catch { /* As above. */ }
  }
}
