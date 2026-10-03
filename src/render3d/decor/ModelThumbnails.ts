import { WebGLRenderer } from "three"
import { ModelSources } from "./ModelSource.js"
import type { ModelSource } from "./ModelSource.js"

/**
 * A small picture of a model, for the window that offers the catalogue's models.
 *
 * Drawn once, by one renderer shared by every model asked for and queued so that the files are
 * fetched and drawn one after another: the page has a limited number of WebGL contexts (the scene
 * and the maps hold some), so a context per thumbnail is not on offer, and a renderer kept for
 * ever would hold one for a window opened once. The renderer is made when the queue starts and
 * given back when it empties. A model that cannot be drawn (no WebGL, a file that does not load)
 * answers undefined, and the window shows its name alone.
 */
export class ModelThumbnails {
  private static readonly SIZE_PX = { width: 192, height: 144 }
  private static readonly cache = new Map<string, Promise<string | undefined>>()
  private static queue: Promise<unknown> = Promise.resolve()
  private static pending = 0
  private static renderer?: WebGLRenderer

  /** The picture as a data URL, seen three-quarters from the front. */
  static of(source: ModelSource): Promise<string | undefined> {
    const key = ModelSources.key(source)
    let picture = this.cache.get(key)
    if (!picture) {
      this.pending++
      picture = this.queue.then(() => this.draw(source)).catch(() => undefined).finally(() => {
        if (--this.pending === 0) this.release()
      })
      this.queue = picture
      this.cache.set(key, picture)
    }
    return picture
  }

  private static async draw(source: ModelSource): Promise<string | undefined> {
    const object = await ModelSources.build(source)
    try {
      const { width, height } = this.SIZE_PX
      const stage = ModelSources.stage(object, width / height)
      if (!stage) return undefined
      const renderer = this.renderer ??= new WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true })
      renderer.setSize(width, height, false)
      renderer.setClearColor(0x000000, 0)
      renderer.render(stage.scene, stage.camera)
      return renderer.domElement.toDataURL("image/png")
    } finally {
      ModelSources.dispose(object)
    }
  }

  private static release(): void {
    this.renderer?.dispose()
    this.renderer?.forceContextLoss()
    this.renderer = undefined
  }
}
