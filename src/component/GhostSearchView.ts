import { GhostFinder, type GhostSearch } from "../engine/reference/GhostFinder.js"

/** What the search says, in the reader's language (see SightingLabels). {count} and {scale} are filled in. */
export interface GhostSearchTexts {
  searching: string
  found: string
  foundScaled: string
  low: string
  none: string
  cropped: string
  failed: string
}

/**
 * Looks for the ghosts of the lens in a picture of a recording (see GhostFinder) and shows what it found: the picture with the lights that
 * have a ghost circled (not the others: a lit dome's every window), each ghost ringed and joined to its light by a dotted line through the
 * lens's axis, the axis marked (and the picture's own centre beside it when they differ), and a sentence saying how many and how sure.
 *
 * Loaded only when a reader asks for it, with the finder: nobody pays for either who never looks.
 */
export class GhostSearchView {
  /** The size the picture is read at, at most, pixels on its longer side: enough for a lamp's ghost, quick enough to stay a click. */
  private static readonly ANALYSIS_SIZE = 1600

  constructor(private readonly canvas: HTMLCanvasElement, private readonly status: HTMLElement, private readonly texts: GhostSearchTexts) {}

  /** Searches the picture at `src` (an address readable across sites, or a data: URL) and shows the result. */
  async search(src: string): Promise<GhostSearch | undefined> {
    this.status.textContent = this.texts.searching
    this.canvas.hidden = true
    let image: HTMLImageElement
    try {
      image = await GhostSearchView.load(src)
    } catch {
      this.status.textContent = this.texts.failed
      return undefined
    }
    const scale = Math.min(1, GhostSearchView.ANALYSIS_SIZE / Math.max(image.naturalWidth, image.naturalHeight))
    const width = Math.round(image.naturalWidth * scale), height = Math.round(image.naturalHeight * scale)
    const work = document.createElement("canvas")
    work.width = width
    work.height = height
    const context = work.getContext("2d", { willReadFrequently: true })!
    context.drawImage(image, 0, 0, width, height)
    let pixels: ImageData
    try {
      pixels = context.getImageData(0, 0, width, height)
    } catch {
      // A picture from another site that does not allow being read: drawn, but not readable.
      this.status.textContent = this.texts.failed
      return undefined
    }
    // Let the "searching" sentence show before the work holds the page.
    await new Promise(resolve => setTimeout(resolve, 0))
    const search = GhostFinder.find(pixels)
    this.draw(image, search)
    this.status.textContent = this.sentence(search)
    return search
  }

  private sentence(search: GhostSearch): string {
    const count = String(search.pairs.length)
    if (search.confidence === "none") return this.texts.none
    const found = search.confidence === "low" ? this.texts.low.replace("{count}", count)
      : search.scale === -1 ? this.texts.found.replace("{count}", count)
      : this.texts.foundScaled.replace("{count}", count).replace("{scale}", (search.scale ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 }))
    return search.cropped ? `${found} ${this.texts.cropped}` : found
  }

  /** The picture, as wide as the panel lets it, with what was found drawn over it. */
  private draw(image: HTMLImageElement, search: GhostSearch): void {
    const canvas = this.canvas
    const ratio = window.devicePixelRatio || 1
    const shownWidth = Math.max(200, canvas.parentElement?.clientWidth ?? 320)
    const toShown = shownWidth / search.width
    canvas.style.width = `${shownWidth}px`
    canvas.style.height = `${Math.round(search.height * toShown)}px`
    canvas.width = Math.round(shownWidth * ratio)
    canvas.height = Math.round(search.height * toShown * ratio)
    const context = canvas.getContext("2d")!
    context.setTransform(ratio, 0, 0, ratio, 0, 0)
    context.drawImage(image, 0, 0, shownWidth, search.height * toShown)
    const at = (point: { x: number, y: number }) => [point.x * toShown, point.y * toShown] as const
    // Light strokes on dark ones, legible on any picture.
    const stroke = (draw: () => void, colour: string, width: number, dash: number[] = []) => {
      context.setLineDash(dash)
      context.lineWidth = width + 2
      context.strokeStyle = "rgba(0, 0, 0, 0.6)"
      draw()
      context.lineWidth = width
      context.strokeStyle = colour
      draw()
      context.setLineDash([])
    }
    const circle = (point: { x: number, y: number }, radius: number) => () => {
      const [x, y] = at(point)
      context.beginPath()
      context.arc(x, y, radius, 0, 2 * Math.PI)
      context.stroke()
    }
    for (const pair of search.pairs) {
      stroke(() => {
        const [x1, y1] = at(pair.ghost), [x2, y2] = at(pair.light)
        context.beginPath()
        context.moveTo(x1, y1)
        context.lineTo(x2, y2)
        context.stroke()
      }, "rgba(255, 255, 255, 0.85)", 1, [4, 4])
      stroke(circle(pair.light, 6), "#ffffff", 1.5)
      stroke(circle(pair.ghost, 8), "#ffd23f", 2)
    }
    if (search.centre) {
      const [x, y] = at(search.centre)
      stroke(() => {
        context.beginPath()
        context.moveTo(x - 7, y)
        context.lineTo(x + 7, y)
        context.moveTo(x, y - 7)
        context.lineTo(x, y + 7)
        context.stroke()
      }, "#ffd23f", 2)
      if (search.cropped) {
        const [cx, cy] = at({ x: search.width / 2, y: search.height / 2 })
        stroke(() => {
          context.beginPath()
          context.moveTo(cx - 5, cy - 5)
          context.lineTo(cx + 5, cy + 5)
          context.moveTo(cx + 5, cy - 5)
          context.lineTo(cx - 5, cy + 5)
          context.stroke()
        }, "rgba(255, 255, 255, 0.7)", 1)
      }
    }
    canvas.hidden = false
  }

  /** The picture, readable: asked for across sites, which a data: URL does not need and an address has to allow. */
  private static load(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image()
      if (!src.startsWith("data:")) image.crossOrigin = "anonymous"
      image.onload = () => resolve(image)
      image.onerror = () => reject(new Error(`Could not load ${src}`))
      image.src = src
    })
  }
}
