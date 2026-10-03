import { WebGLRenderer } from "three"
import type { Group, Object3D, PerspectiveCamera, Scene } from "three"
import { ModelSources } from "./ModelSource.js"
import type { ModelSource } from "./ModelSource.js"

/**
 * A model seen live: it turns by itself, and a drag turns it the way the pointer goes — the surface
 * nearest the eye follows the pointer — so that it can be looked at from every side before it is
 * chosen.
 *
 * One view at a time, on one renderer (the page's WebGL contexts are few), put over the picture of
 * the card it belongs to. The renderer is kept while views come and go, and given back by `release`
 * when the window that shows them closes.
 */
export class ModelViewer {
  private static renderer?: WebGLRenderer
  /** What the view turns by itself, radians a second. */
  private static readonly SPIN_RAD_PER_S = 0.7
  /** What a dragged pixel turns the model by, radians. */
  private static readonly DRAG_RAD_PER_PX = 0.012
  /** How far the pointer may wander and still be a click, canvas pixels. */
  private static readonly CLICK_TOLERANCE_PX = 4
  private static current?: ModelViewer

  private object?: Object3D
  private stage?: { scene: Scene, camera: PerspectiveCamera, pivot: Group }
  private frame = 0
  private stopped = false
  private last = 0
  private dragging?: { x: number, y: number, moved: boolean }
  private draggedPastClick = false
  private readonly canvas: HTMLCanvasElement

  private constructor(private readonly container: HTMLElement, private readonly source: ModelSource) {
    this.canvas = document.createElement("canvas")
    this.canvas.className = "model-live"
    this.canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;touch-action:none;cursor:grab;display:none"
    this.canvas.addEventListener("pointerdown", event => this.press(event))
    this.canvas.addEventListener("pointermove", event => this.move(event))
    this.canvas.addEventListener("pointerup", () => this.release())
    this.canvas.addEventListener("pointercancel", () => this.release())
  }

  /** Shows the source live in the container (which must be positioned), replacing the view that was
   * showing, if any. */
  static show(container: HTMLElement, source: ModelSource): ModelViewer {
    ModelViewer.current?.stop()
    const viewer = new ModelViewer(container, source)
    ModelViewer.current = viewer
    void viewer.start()
    return viewer
  }

  /** Given back when the window closes: the view in place and the renderer under it. */
  static end(): void {
    ModelViewer.current?.stop()
    ModelViewer.current = undefined
    ModelViewer.renderer?.dispose()
    ModelViewer.renderer?.forceContextLoss()
    ModelViewer.renderer = undefined
  }

  /** Whether the pointer was dragged since this was last asked: such a press is a look at the model,
   * not a click that chooses it. Reading it resets it. */
  consumeDrag(): boolean {
    const dragged = this.draggedPastClick
    this.draggedPastClick = false
    return dragged
  }

  /** False once stopped, whoever stopped it. */
  get active(): boolean {
    return !this.stopped
  }

  stop(): void {
    this.stopped = true
    cancelAnimationFrame(this.frame)
    this.canvas.remove()
    if (this.object) ModelSources.dispose(this.object)
    this.object = undefined
    if (ModelViewer.current === this) ModelViewer.current = undefined
  }

  private async start(): Promise<void> {
    try {
      const object = await ModelSources.build(this.source)
      if (this.stopped) {
        ModelSources.dispose(object)
        return
      }
      this.object = object
      const { width, height } = this.container.getBoundingClientRect()
      const aspect = width > 0 && height > 0 ? width / height : 4 / 3
      this.stage = ModelSources.stage(object, aspect)
      if (!this.stage) return
      const renderer = ModelViewer.renderer ??= new WebGLRenderer({ antialias: true, alpha: true })
      renderer.setClearColor(0x000000, 0)
      this.container.append(this.canvas)
      this.canvas.style.display = "block"
      this.last = performance.now()
      this.tick()
    } catch {
      // No WebGL, or a file that does not load: the card keeps its picture.
    }
  }

  private tick = (): void => {
    if (this.stopped || !this.stage) return
    const now = performance.now()
    const seconds = Math.min(0.1, (now - this.last) / 1000)
    this.last = now
    if (!this.dragging) this.stage.pivot.rotation.y += ModelViewer.SPIN_RAD_PER_S * seconds
    const renderer = ModelViewer.renderer!
    const { width, height } = this.canvas.getBoundingClientRect()
    const pixelRatio = Math.min(2, window.devicePixelRatio || 1)
    if (this.canvas.width !== Math.round(width * pixelRatio) || this.canvas.height !== Math.round(height * pixelRatio)) {
      // One renderer, many canvases over time: it draws into its own canvas, copied onto this one.
      renderer.setPixelRatio(pixelRatio)
      renderer.setSize(width, height, false)
      this.canvas.width = Math.round(width * pixelRatio)
      this.canvas.height = Math.round(height * pixelRatio)
      this.stage.camera.aspect = width / Math.max(1, height)
      this.stage.camera.updateProjectionMatrix()
    }
    renderer.render(this.stage.scene, this.stage.camera)
    // Cleared first: the frame has transparent parts, which would not erase the previous poses.
    const context = this.canvas.getContext("2d")
    context?.clearRect(0, 0, this.canvas.width, this.canvas.height)
    context?.drawImage(renderer.domElement, 0, 0, this.canvas.width, this.canvas.height)
    this.frame = requestAnimationFrame(this.tick)
  }

  private press(event: PointerEvent): void {
    this.dragging = { x: event.clientX, y: event.clientY, moved: false }
    this.canvas.setPointerCapture(event.pointerId)
    this.canvas.style.cursor = "grabbing"
  }

  private move(event: PointerEvent): void {
    const drag = this.dragging
    if (!drag || !this.stage) return
    const dx = event.clientX - drag.x
    const dy = event.clientY - drag.y
    if (!drag.moved && Math.hypot(dx, dy) < ModelViewer.CLICK_TOLERANCE_PX) return
    drag.moved = true
    this.draggedPastClick = true
    // The surface nearest the eye follows the pointer, as a ball is turned by a finger laid on it. The
    // eye looks along +Z (a model's nose faces -Z), so its right is -X: a turn about the vertical by
    // +dx takes the near surface towards -X, and a tip about the screen's horizontal axis by -dy takes
    // it down when the pointer goes down. The model is turned about the vertical first and tipped
    // about that fixed axis, so the tip means the same on screen whatever the turn.
    this.stage.pivot.rotation.y += dx * ModelViewer.DRAG_RAD_PER_PX
    this.stage.pivot.rotation.x = Math.max(-1.4, Math.min(1.4, this.stage.pivot.rotation.x - dy * ModelViewer.DRAG_RAD_PER_PX))
    drag.x = event.clientX
    drag.y = event.clientY
  }

  private release(): void {
    this.dragging = undefined
    this.canvas.style.cursor = "grab"
  }
}
