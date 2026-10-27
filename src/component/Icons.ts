/**
 * The editors' pictograms: 16 px, drawn with a 1.7 stroke in the text's own colour, so they read on a light panel and a dark one alike
 * and follow a button's state (hover, disabled) as its label does. No emoji: a system draws those in its own colours, at its own size
 * and weight, and two systems never draw one alike (see the design handoff, §1.6).
 *
 * Each icon is markup to put in a button that has an `aria-label` or a `title` of its own: the drawing says nothing to whoever reads
 * the page aloud.
 */
export class Icons {
  private static draw(paths: string, fill = "none"): string {
    return `<svg class="icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="${fill}" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`
  }

  static readonly TRASH = Icons.draw(`<path d="M2.5 4.5h11"/><path d="M6 4.5V3h4v1.5"/><path d="M4 4.5l.7 9h6.6l.7-9"/><path d="M6.8 7v4.5M9.2 7v4.5"/>`)
  /** Turns the view toward what is picked. */
  static readonly TARGET = Icons.draw(`<circle cx="8" cy="8" r="5"/><circle cx="8" cy="8" r="1.6"/><path d="M8 1v2.2M8 12.8V15M1 8h2.2M12.8 8H15"/>`)
  static readonly PLAY = Icons.draw(`<path d="M5 3.2v9.6L12.6 8z"/>`, "currentColor")
  static readonly PAUSE = Icons.draw(`<path d="M5.5 3.5v9M10.5 3.5v9"/>`)
  static readonly RECORD = Icons.draw(`<circle cx="8" cy="8" r="4.2" fill="var(--error, #d93025)" stroke="none"/>`)
  static readonly STOP = Icons.draw(`<rect x="4" y="4" width="8" height="8" rx="1.2"/>`, "currentColor")
  /** To the keyframe or the moment before, or after. */
  static readonly PREVIOUS_MARK = Icons.draw(`<path d="M6.5 4 2.5 8l4 4"/><path d="M11 5.2 13.8 8 11 10.8 8.2 8z"/>`)
  static readonly NEXT_MARK = Icons.draw(`<path d="M9.5 4l4 4-4 4"/><path d="M5 5.2 7.8 8 5 10.8 2.2 8z"/>`)
  static readonly CLOSE = Icons.draw(`<path d="M4 4l8 8M12 4l-8 8"/>`)
  static readonly PLUS = Icons.draw(`<path d="M8 3v10M3 8h10"/>`)
  /** What the sky held at that hour, shown on demand: a meteor, a comet, a new star, a satellite, a fireball. */
  static readonly METEOR = Icons.draw(`<path d="M2.5 2.5l7 7"/><path d="M5.5 2.5l5 5"/><circle cx="11.5" cy="11.5" r="2"/>`)
  static readonly COMET = Icons.draw(`<circle cx="11" cy="11" r="2.4"/><path d="M9.3 9.3 2.5 2.5M9 11.2 3 7M11.2 9 7 3"/>`)
  static readonly STAR = Icons.draw(`<path d="M8 2.2l1.7 3.6 3.9.5-2.9 2.7.8 3.9L8 11l-3.5 1.9.8-3.9-2.9-2.7 3.9-.5z"/>`)
  static readonly SATELLITE = Icons.draw(`<rect x="6.3" y="6.3" width="3.4" height="3.4" transform="rotate(45 8 8)"/><path d="M5.4 5.4 3 3M10.6 10.6 13 13"/><path d="M1.8 4.2 4.2 1.8M11.8 14.2l2.4-2.4"/><path d="M10.5 3.5a3 3 0 0 1 2 2"/>`)
  static readonly FIREBALL = Icons.draw(`<circle cx="10.5" cy="10.5" r="2.6"/><path d="M8.6 8.6 3 3M8 10.6 4.5 8.5M10.6 8 8.5 4.5"/>`)

  /** The editor's groups, one each, on their tabs: what a tab still says when it has no room left for its name. */
  static readonly SUMMARY = Icons.draw(`<rect x="3" y="2" width="10" height="12" rx="1.5"/><path d="M5.5 5.5h5M5.5 8h5M5.5 10.5h3"/>`)
  static readonly WITNESS = Icons.draw(`<circle cx="8" cy="5" r="2.6"/><path d="M2.8 14c.6-3 2.6-4.6 5.2-4.6s4.6 1.6 5.2 4.6"/>`)
  static readonly LOCATION = Icons.draw(`<path d="M8 14.3s4.5-4.3 4.5-7.8a4.5 4.5 0 0 0-9 0c0 3.5 4.5 7.8 4.5 7.8z"/><circle cx="8" cy="6.5" r="1.6"/>`)
  static readonly DATE = Icons.draw(`<rect x="2.3" y="3.3" width="11.4" height="10.4" rx="1.5"/><path d="M2.3 6.6h11.4M5.3 1.8v2.8M10.7 1.8v2.8"/>`)
  static readonly ENVIRONMENT = Icons.draw(`<path d="M1.5 14h13"/><path d="M2.8 14V8.3L6.3 5.5l3.5 2.8V14"/><path d="M12.2 14V9.4"/><circle cx="12.2" cy="7.4" r="2.1"/>`)
  static readonly SKY = Icons.draw(`<path d="M4.6 12.5h7a2.6 2.6 0 0 0 .3-5.2 3.8 3.8 0 0 0-7.3-.6 2.9 2.9 0 0 0 0 5.8z"/>`)
  static readonly PHENOMENON = Icons.draw(`<ellipse cx="8" cy="9" rx="6.3" ry="2.1"/><path d="M4.6 7.8a3.4 3.4 0 0 1 6.8 0"/><path d="M5 13.4l.6-1.4M11 13.4l-.6-1.4M8 14v-1.4"/>`)
  static readonly SOUND = Icons.draw(`<path d="M2.5 6.2h2.3L8 3.5v9L4.8 9.8H2.5z"/><path d="M10.5 6a2.8 2.8 0 0 1 0 4M12.3 4.2a5.4 5.4 0 0 1 0 7.6"/>`)
  static readonly PICTURES = Icons.draw(`<rect x="2" y="3" width="12" height="10" rx="1.5"/><circle cx="5.8" cy="6.4" r="1.2"/><path d="M2.5 12l3.8-3.6 2.4 2.2 2.2-1.8 2.6 2.5"/>`)
  static readonly FILES = Icons.draw(`<path d="M4 1.8h5.2L12.5 5v9.2H4z"/><path d="M9 1.8V5.2h3.5"/>`)

  /** The pictogram an emoji used to stand for, where there is one. */
  private static readonly BY_GLYPH: Readonly<Record<string, string>> = {
    "🗑": Icons.TRASH, "🎯": Icons.TARGET, "+": Icons.PLUS, "✕": Icons.CLOSE, "▶": Icons.PLAY, "⏸": Icons.PAUSE, "⏺": Icons.RECORD, "⏹": Icons.STOP
  }

  /**
   * Puts in `element` the pictogram `glyph` stands for, or `glyph` itself as text when it stands for none. The glyph stays on the
   * element as `data-icon`, so what it shows can still be asked of it.
   */
  static show(element: HTMLElement, glyph: string): void {
    // Shown already: left as it is. Some are set on every frame of a replay (Play/Pause), and an icon written again under the
    // pointer between its press and its release takes the click away (the element pressed is no longer there to be clicked).
    if (element.dataset.icon === glyph && element.firstChild) return
    const icon = Icons.BY_GLYPH[glyph]
    if (icon) element.innerHTML = icon
    else element.textContent = glyph
    element.dataset.icon = glyph
  }

  /** Lays the pictograms out within the buttons that hold them, in a shadow root's style. */
  static readonly CSS = `
.icon { display: block; flex: none; }
button:has(> .icon:only-child) { display: inline-flex; align-items: center; justify-content: center; }
`
}
