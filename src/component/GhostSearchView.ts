import { GhostFinder, type GhostSearch } from "../engine/reference/GhostFinder.js"
import { PictureFetch, PictureFetchError } from "../engine/reference/PictureFetch.js"

/** What the search says, in the reader's language (see SightingLabels). {count} and {scale} are filled in. */
export interface GhostSearchTexts {
  searching: string
  found: string
  foundScaled: string
  low: string
  none: string
  cropped: string
}

/**
 * Looks for the ghosts of the lens in a picture of a recording (see GhostFinder) and says what it found, how many and how sure. What it
 * found is drawn on the picture where it stands over the scene, the largest view there is (see CanvasRenderer.paintGhosts).
 *
 * Loaded only when a reader asks for it, with the finder: nobody pays for either who never looks.
 */
export class GhostSearchView {
  /** The size the picture is read at, at most, pixels on its longer side: enough for a lamp's ghost, quick enough to stay a click. */
  private static readonly ANALYSIS_SIZE = 1600

  constructor(private readonly status: HTMLElement, private readonly texts: GhostSearchTexts) {}

  /** Searches the picture at `src` (an address readable across sites, or a data: URL), says what it found, and gives it. */
  async search(src: string): Promise<GhostSearch | undefined> {
    this.status.textContent = this.texts.searching
    let image: HTMLImageElement
    try {
      image = await GhostSearchView.load(src)
    } catch {
      // Said under the picture's address, and the search is not offered for it (see SightingEditorElement.syncFindGhosts).
      this.status.textContent = ""
      return undefined
    }
    const scale = Math.min(1, GhostSearchView.ANALYSIS_SIZE / Math.max(image.naturalWidth, image.naturalHeight))
    const width = Math.round(image.naturalWidth * scale), height = Math.round(image.naturalHeight * scale)
    const work = document.createElement("canvas")
    work.width = width
    work.height = height
    const context = work.getContext("2d", { willReadFrequently: true })!
    context.drawImage(image, 0, 0, width, height)
    // Read from its own bytes (see load): never a picture of another site the canvas would refuse to give back.
    const pixels = context.getImageData(0, 0, width, height)
    // Let the "searching" sentence show before the work holds the page.
    await new Promise(resolve => setTimeout(resolve, 0))
    const search = GhostFinder.find(pixels)
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

  /** The picture, from its bytes read across sites (see PictureFetch), so that the canvas it is drawn on can be read back. */
  private static async load(src: string): Promise<HTMLImageElement> {
    const url = URL.createObjectURL(await PictureFetch.blob(src))
    try {
      const image = new Image()
      image.src = url
      await image.decode().catch(() => {
        throw new PictureFetchError(src, { kind: "notPicture" })
      })
      return image
    } finally {
      URL.revokeObjectURL(url)
    }
  }
}
