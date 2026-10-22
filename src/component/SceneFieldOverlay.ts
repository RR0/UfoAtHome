/**
 * What the field being edited sets, drawn over the scene while it is the one edited (see the design handoff, §3.3): where the
 * horizon falls for the tilt, the frame and its angles for the field of view, a measuring circle round the shape for its sizes and
 * distance, an arrow for the wind. The scene shows the rest by itself as it changes (a colour, a halo, the clouds), and the heading
 * has its compass.
 *
 * Laid exactly over the picture (the canvas the shapes are drawn on), in fractions of it, so it stays right whatever the picture's
 * size; and seen, never grabbed: the pointer goes through it to the scene. In the scene's own fixed colours, as the timeline over it.
 */
export class SceneFieldOverlay {
  static readonly CSS = `
.scene-field-overlay { position: absolute; z-index: 3; pointer-events: none; }
.scene-field-overlay[hidden] { display: none; }
.scene-field-overlay > * { position: absolute; }
.sfo-pill {
  padding: 3px 9px; border-radius: 999px; background: rgba(7, 10, 18, .66); -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px);
  color: #f5c451; font: 600 12px/1.4 var(--sans, sans-serif); white-space: nowrap;
}
.sfo-horizon { left: 0; right: 0; height: 0; border-top: 2px dashed #f5c451; }
.sfo-horizon > .sfo-pill { position: absolute; left: 10px; top: 4px; }
.sfo-frame { inset: 0; border: 2px solid #f5c451; box-sizing: border-box; }
.sfo-frame > .sfo-pill { position: absolute; left: 50%; top: 8px; transform: translateX(-50%); }
.sfo-measure { aspect-ratio: 1; border: 2px dashed #f5c451; border-radius: 50%; transform: translate(-50%, -50%); box-sizing: border-box; }
.sfo-measure > .sfo-pill { position: absolute; left: 50%; top: calc(100% + 6px); transform: translateX(-50%); }
.sfo-wind { left: 10px; top: 10px; display: inline-flex; align-items: center; gap: 6px; }
.sfo-wind svg { transition: transform .15s ease; }
`

  private readonly layer: HTMLElement

  /** Over `picture`, in `card`, which holds both and is positioned. */
  constructor(private readonly card: HTMLElement, private readonly picture: () => HTMLElement) {
    this.layer = document.createElement("div")
    this.layer.className = "scene-field-overlay"
    this.layer.hidden = true
    this.layer.setAttribute("aria-hidden", "true")
    card.append(this.layer)
  }

  hide(): void {
    this.layer.hidden = true
    this.layer.replaceChildren()
  }

  /** The horizon, `yFraction` of the picture's height down from its top, and what it is called. */
  horizon(yFraction: number, label: string): void {
    const line = this.element("sfo-horizon")
    line.style.top = `${yFraction * 100}%`
    line.append(this.pill(label))
    this.show(line)
  }

  /** The frame of the picture, which is the field of view, with its angles. */
  frame(label: string): void {
    const frame = this.element("sfo-frame")
    frame.append(this.pill(label))
    this.show(frame)
  }

  /** A circle `widthFraction` of the picture's width across, centred at (`x`, `y`) in fractions of the picture, and what it measures. */
  measure(x: number, y: number, widthFraction: number, label: string): void {
    const circle = this.element("sfo-measure")
    circle.style.left = `${x * 100}%`
    circle.style.top = `${y * 100}%`
    circle.style.width = `${Math.max(widthFraction, 0.02) * 100}%`
    if (label) circle.append(this.pill(label))
    this.show(circle)
  }

  /** The wind, as an arrow turned `bearingDeg` from straight ahead (clockwise), the way it blows, and what it says. */
  wind(bearingDeg: number, label: string): void {
    const pill = this.pill(label)
    pill.classList.add("sfo-wind")
    pill.insertAdjacentHTML("afterbegin", `<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate(${bearingDeg}deg)"><path d="M8 13.5V2.5"/><path d="M4 6.5 8 2.5l4 4"/></svg>`)
    this.show(pill)
  }

  private show(content: HTMLElement): void {
    const card = this.card.getBoundingClientRect()
    const picture = this.picture().getBoundingClientRect()
    Object.assign(this.layer.style, {
      left: `${picture.left - card.left}px`, top: `${picture.top - card.top}px`, width: `${picture.width}px`, height: `${picture.height}px`
    })
    this.layer.replaceChildren(content)
    this.layer.hidden = false
  }

  private element(className: string): HTMLElement {
    const element = document.createElement("div")
    element.className = className
    return element
  }

  private pill(text: string): HTMLElement {
    const pill = this.element("sfo-pill")
    pill.textContent = text
    return pill
  }
}
