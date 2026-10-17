/**
 * The cover picture of a recording, shown in place of the loader for as long as the reader has not asked to play: the scene is
 * prepared behind it, and playing takes it away. Whether the scene is whole by then decides if the loader comes back for the rest of the
 * wait (see SceneElement.applyHold).
 */
export class ScenePoster {
  private shown = false

  /** @param element The picture's element, hidden until there is a picture. @param onChange Called when the poster goes, for the loader to take over. */
  constructor(private readonly element: HTMLImageElement, private readonly onChange: () => void) {
    // A picture that cannot be read is no cover: the loader does as it always did.
    element.addEventListener("error", () => this.release())
  }

  /** Whether the poster stands over the scene. */
  get up(): boolean {
    return this.shown
  }

  /**
   * Puts `image` up, at once, or takes the poster away when there is none.
   *
   * @param image An address, absolute or relative to `base`, or an RR0 path from the site root (as the share card reads it).
   * @param base The address of the file that states it.
   */
  show(image: string | undefined, base?: string): void {
    const url = ScenePoster.resolve(image, base)
    if (!url) {
      this.release()
      return
    }
    this.element.src = url
    this.element.hidden = false
    const was = this.shown
    this.shown = true
    if (!was) this.onChange()
  }

  /** Takes the poster away: the reader asked to play, or there is no cover for the recording now loaded. */
  release(): void {
    if (!this.shown) return
    this.shown = false
    this.element.hidden = true
    this.element.removeAttribute("src")
    this.onChange()
  }

  private static resolve(image: string | undefined, base: string | undefined): string | undefined {
    if (typeof image !== "string" || image.trim() === "") return undefined
    try {
      const url = new URL(image.trim(), base ?? location.href)
      return url.protocol === "https:" || url.protocol === "http:" ? url.href : undefined
    } catch {
      return undefined
    }
  }
}
