import type { Shape, ShapeBounds } from "../engine/shape/Shape.js"
import { RESIZE_HANDLE_IDS, ShapeHandles, type HandleId } from "../engine/shape/ShapeHandles.js"

const CORNER_SIZE = 6
const HALF_CORNER_SIZE = CORNER_SIZE / 2
const HALO_BLUR_UNIT = 20

/**
 * Paints shapes onto a Canvas2D context, replacing DrawShape/OvalShape/
 * PolygonShape's AWT paint(Graphics) methods.
 *
 * ctx.ellipse's native rotation parameter handles ovals at any angle in one
 * call, replacing both OvalShape's cardinal-angle special case and its
 * polygon-rotation fallback (which looked non-functional in the original —
 * see UfoAtHome/applets .../OvalShape.java). The halo/glow effect uses
 * ctx.shadowBlur/shadowColor, replacing the original's manual
 * PixelGrabber/MemoryImageSource pixel-masking hack entirely.
 */
export class CanvasRenderer {
  constructor(private readonly ctx: CanvasRenderingContext2D) {
  }

  clear(width: number, height: number): void {
    this.ctx.clearRect(0, 0, width, height)
  }

  paintShape(shape: Shape): void {
    this.ctx.save()
    this.ctx.globalAlpha = 1 - shape.transparency
    if (shape.haloScale > 0) {
      this.paintHalo(shape)
    }
    this.paintBase(shape)
    this.ctx.restore()
    // Painted after restoring globalAlpha: the selection indicator is an editor-only overlay,
    // not part of the sighting itself, so it shouldn't fade out along with a transparent shape.
    if (shape.selected) {
      this.paintSelectionHandles(shape)
    }
  }

  private paintBase(shape: Shape): void {
    this.ctx.fillStyle = shape.color
    this.ctx.beginPath()
    if (shape.kind === "oval") {
      const { x, y, width, height } = shape.bounds
      const rx = width / 2
      const ry = height / 2
      this.ctx.ellipse(x + rx, y + ry, rx, ry, shape.angle, 0, 2 * Math.PI)
    } else {
      const { x, y, width, height } = shape.bounds
      this.ctx.save()
      // Center-pivoted (not corner-pivoted) to match oval rotation (ctx.ellipse's rotation
      // parameter is inherently center-pivoted) and the selection handles below.
      this.ctx.translate(x + width / 2, y + height / 2)
      this.ctx.rotate(shape.angle)
      this.ctx.translate(-width / 2, -height / 2)
      shape.points.forEach((point, index) => {
        if (index === 0) {
          this.ctx.moveTo(point.x, point.y)
        } else {
          this.ctx.lineTo(point.x, point.y)
        }
      })
      this.ctx.closePath()
      this.ctx.restore()
    }
    this.ctx.fill()
  }

  private paintHalo(shape: Shape): void {
    this.ctx.save()
    this.ctx.shadowColor = shape.color
    this.ctx.shadowBlur = HALO_BLUR_UNIT * shape.haloScale
    this.paintBase(shape)
    this.ctx.restore()
  }

  /** Draws from ShapeHandles.handlePointsFor's canvas-space (already-rotated) points — the same
   * source of truth ShapeHandles.hitTestHandle uses — so rendering and hit-testing can never
   * disagree. No ctx.rotate needed here: the outline is a path through the 4 (already-rotated)
   * corner points, and handle squares stay upright at their (rotated) position, matching
   * Figma/PowerPoint-style resize handles rather than rotating into diamonds. */
  private paintSelectionHandles(shape: Shape): void {
    this.paintHandleFrame(ShapeHandles.handlePointsFor(shape), { includeRotate: true })
  }

  /** Thin outline only (no handle squares) — drawn for each individually-selected shape when a
   * multi-selection/group of >1 is active, so the user can see which shapes are included, while
   * the actual resize handles live on the shared group bbox instead (see paintGroupHandles). */
  paintMemberOutline(shape: Shape): void {
    this.paintOutline(ShapeHandles.handlePointsFor(shape))
  }

  /** The shared 8 resize-corner handles + rotate stem/circle + outline for a multi-shape
   * selection's bounding box — see ShapeGroup.resize/rotate for what dragging each does. */
  paintGroupHandles(bounds: ShapeBounds): void {
    this.paintHandleFrame(ShapeHandles.handlePointsFor({ bounds, angle: 0 }), { includeRotate: true })
  }

  private paintOutline(points: Record<HandleId, { x: number; y: number }>): void {
    this.ctx.strokeStyle = "lightgray"
    this.ctx.beginPath()
    this.ctx.moveTo(points.nw.x, points.nw.y)
    this.ctx.lineTo(points.ne.x, points.ne.y)
    this.ctx.lineTo(points.se.x, points.se.y)
    this.ctx.lineTo(points.sw.x, points.sw.y)
    this.ctx.closePath()
    this.ctx.stroke()
  }

  private paintHandleFrame(points: Record<HandleId, { x: number; y: number }>, { includeRotate }: { includeRotate: boolean }): void {
    this.paintOutline(points)
    this.ctx.fillStyle = "lightgray"
    for (const id of RESIZE_HANDLE_IDS) {
      const p = points[id]
      this.ctx.fillRect(p.x - HALF_CORNER_SIZE, p.y - HALF_CORNER_SIZE, CORNER_SIZE, CORNER_SIZE)
    }
    if (!includeRotate) return
    this.ctx.beginPath()
    this.ctx.moveTo(points.n.x, points.n.y)
    this.ctx.lineTo(points.rotate.x, points.rotate.y)
    this.ctx.stroke()
    this.ctx.beginPath()
    this.ctx.ellipse(points.rotate.x, points.rotate.y, HALF_CORNER_SIZE + 1, HALF_CORNER_SIZE + 1, 0, 0, 2 * Math.PI)
    this.ctx.fill()
  }
}
